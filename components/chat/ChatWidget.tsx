"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ChatCircleDotsIcon, CircleNotchIcon, PaperPlaneRightIcon, PhoneIcon, XIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { chatTime, lastSeq, mergeMessages, type ChatConversation, type ChatMessage, type MyChat } from "@/lib/chat";
import { cx } from "@/lib/format";
import { telHref } from "@/lib/store-info";
import { useAuth } from "@/components/providers/AuthProvider";
import { useStoreInfo } from "@/components/providers/StoreInfoProvider";
import { inputClass } from "@/components/ui/styles";

const GUEST_TOKEN_KEY = "chat_guest_token";
const POLL_OPEN_MS = 4000;
const POLL_CLOSED_MS = 30000;

function readGuestToken(): string | null {
  try {
    return localStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeGuestToken(value: string | null) {
  try {
    if (value) localStorage.setItem(GUEST_TOKEN_KEY, value);
    else localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    // chế độ riêng tư: chỉ giữ trong phiên hiện tại
  }
}

/** Nút chat nổi (góc trái dưới) + khung trò chuyện với cửa hàng. Khách chưa đăng nhập vẫn chat được. */
export function ChatWidget() {
  const { user, token, ready } = useAuth();
  const { hotline, support_hours } = useStoreInfo();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guestToken = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const headers = useCallback((): Record<string, string> => {
    const t = guestToken.current;
    return t ? { "X-Chat-Token": t } : {};
  }, []);

  const apply = useCallback((data: MyChat) => {
    if (data.guest_token) {
      guestToken.current = data.guest_token;
      writeGuestToken(data.guest_token);
    }
    // Hội thoại đã gắn vào tài khoản thì token khách không còn tác dụng
    if (data.conversation && !data.conversation.is_guest && guestToken.current) {
      guestToken.current = null;
      writeGuestToken(null);
    }
    setConversation(data.conversation);
    if (data.messages.length) setMessages((prev) => mergeMessages(prev, data.messages));
  }, []);

  // Đổi tài khoản (đăng nhập / đăng xuất): tải lại từ đầu
  useEffect(() => {
    if (!ready) return;
    guestToken.current = readGuestToken();
    const ctrl = new AbortController();
    apiRequest<MyChat>("/api/v1/chat/me?limit=50", { token, headers: headers(), signal: ctrl.signal })
      .then((data) => {
        setMessages([]);
        apply(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => ctrl.abort();
  }, [ready, token, apply, headers]);

  // Polling: khung mở thì lấy tin mới mỗi 4 giây, khung đóng thì chỉ hỏi số tin chưa đọc mỗi 30 giây
  const hasConversation = conversation !== null;
  useEffect(() => {
    if (!loaded || !hasConversation) return;
    const tick = () => {
      if (document.hidden) return;
      const path = open ? `/api/v1/chat/me?after_seq=${lastSeq(messagesRef.current)}` : "/api/v1/chat/me?limit=0";
      apiRequest<MyChat>(path, { token, headers: headers() }).then(apply).catch(() => {});
    };
    const id = window.setInterval(tick, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    return () => window.clearInterval(id);
  }, [loaded, hasConversation, open, token, apply, headers]);

  // Đang mở khung mà có tin cửa hàng chưa đọc: đánh dấu đã đọc
  const unread = conversation?.unread_for_customer ?? 0;
  useEffect(() => {
    if (!open || unread === 0) return;
    apiRequest("/api/v1/chat/me/read", { method: "POST", token, headers: headers() })
      .then(() => setConversation((c) => (c ? { ...c, unread_for_customer: 0 } : c)))
      .catch(() => {});
  }, [open, unread, token, headers]);

  // Cuộn xuống tin mới nhất
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  // Esc để đóng
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const needsName = !user && !conversation;

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    if (needsName && name.trim().length < 2) {
      setError("Bạn vui lòng nhập tên để cửa hàng tiện xưng hô.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const data = await apiRequest<MyChat>("/api/v1/chat/me/messages", {
        method: "POST",
        token,
        headers: headers(),
        body: { body, ...(needsName ? { name: name.trim(), phone: phone.trim() || undefined } : {}) },
      });
      apply(data);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chưa gửi được tin nhắn. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "fixed bottom-4 left-4 z-40 grid size-14 place-items-center rounded-full bg-navy text-on-navy shadow-lift transition-[transform,bottom] duration-300 ease-out-soft hover:scale-105 cursor-pointer sm:bottom-5 sm:left-5",
          // Trang sản phẩm (dưới lg) hiện thanh "Thêm vào giỏ" dính đáy: đẩy nút chat lên trên thanh đó
          "max-lg:[body:has([data-mobile-buybar])_&]:bottom-24"
        )}
        aria-label={open ? "Đóng khung chat" : "Chat với cửa hàng"}
        aria-expanded={open}
        aria-controls="chat-panel"
      >
        {open ? <XIcon weight="bold" className="size-6" /> : <ChatCircleDotsIcon weight="fill" className="size-7" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent tabular">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          id="chat-panel"
          aria-label="Trò chuyện với cửa hàng"
          className={cx(
            "fixed z-40 flex flex-col overflow-hidden bg-surface shadow-lift",
            "inset-x-0 bottom-0 top-16 rounded-t-2xl border-t border-line",
            "sm:inset-auto sm:bottom-24 sm:left-5 sm:h-[540px] sm:max-h-[calc(100dvh-8rem)] sm:w-[380px] sm:rounded-2xl sm:border"
          )}
        >
          <header className="flex items-center gap-3 bg-navy px-4 py-3 text-on-navy">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-on-navy/10">
              <ChatCircleDotsIcon weight="fill" className="size-5" />
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-navy bg-success" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Chat với cửa hàng</p>
              <p className="truncate text-xs text-on-navy/70">Thường trả lời trong vài phút · {support_hours}</p>
            </div>
            <a href={telHref(hotline)} className="grid size-9 place-items-center rounded-full hover:bg-on-navy/10" aria-label={`Gọi hotline ${hotline}`} title={`Hotline ${hotline}`}>
              <PhoneIcon weight="fill" className="size-5" />
            </a>
            <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-on-navy/10 cursor-pointer" aria-label="Đóng">
              <XIcon weight="bold" className="size-5" />
            </button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto bg-muted/50 px-4 py-4" aria-live="polite">
            {!loaded ? (
              <div className="grid flex-1 place-items-center text-ink-3">
                <CircleNotchIcon className="size-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft">
                  Xin chào{user ? ` ${user.full_name}` : ""}! Bạn cần tư vấn size, mẫu võ phục hay đơn hàng? Cứ nhắn, cửa hàng sẽ trả lời ngay.
                </div>
                {messages.map((m) => {
                  const mine = m.sender_role === "customer";
                  return (
                    <div key={m.seq} className={cx("flex max-w-[85%] flex-col gap-0.5", mine ? "self-end items-end" : "self-start items-start")}>
                      {!mine && <span className="px-1 text-[11px] text-ink-3">{m.sender_name}</span>}
                      <div
                        className={cx(
                          "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
                          mine ? "rounded-br-sm bg-navy text-on-navy" : "rounded-bl-sm bg-surface text-ink shadow-soft"
                        )}
                      >
                        {m.body}
                      </div>
                      <span className="px-1 text-[11px] text-ink-3 tabular">{chatTime(m.created_at)}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <form onSubmit={send} className="flex flex-col gap-2 border-t border-line p-3">
            {needsName && (
              <div className="grid grid-cols-2 gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên của bạn *" autoComplete="name" maxLength={100} className={cx(inputClass, "h-9 text-sm")} aria-label="Tên của bạn" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="SĐT (không bắt buộc)" autoComplete="tel" inputMode="tel" maxLength={20} className={cx(inputClass, "h-9 text-sm")} aria-label="Số điện thoại" />
              </div>
            )}
            {error && (
              <p role="alert" className="text-xs text-accent-text">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Nhập tin nhắn…"
                aria-label="Tin nhắn"
                className={cx(inputClass, "h-auto max-h-32 min-h-11 resize-none py-2.5 text-sm [field-sizing:content]")}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-opacity disabled:opacity-40 cursor-pointer"
                aria-label="Gửi"
              >
                {sending ? <CircleNotchIcon className="size-5 animate-spin" /> : <PaperPlaneRightIcon weight="fill" className="size-5" />}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
