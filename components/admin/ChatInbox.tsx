"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeftIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  EnvelopeSimpleIcon,
  PaperPlaneRightIcon,
  PhoneIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { chatTime, lastSeq, mergeMessages, type ChatConversation, type ChatMessage } from "@/lib/chat";
import { cx } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass, inputClass } from "@/components/ui/styles";

const LIST_POLL_MS = 5000;
const THREAD_POLL_MS = 3000;
const UNREAD_POLL_MS = 15000;

type Filter = "all" | "unread" | "open" | "closed";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "open", label: "Đang mở" },
  { id: "closed", label: "Đã đóng" },
];

/** Số tin khách gửi chưa đọc, hiện badge trên tab "Tin nhắn". */
export function useChatUnread(token: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!token) return;
    const load = () => {
      if (document.hidden) return;
      apiRequest<{ conversations: number; messages: number }>("/api/v1/admin/chat/unread", { token })
        .then((d) => setCount(d.messages))
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, UNREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [token]);
  return count;
}

/** Hộp thư chat với khách: danh sách hội thoại bên trái, nội dung bên phải (mobile: lần lượt từng màn). */
export function ChatInbox({ token }: { token: string }) {
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [conversations, setConversations] = useState<ChatConversation[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  // Danh sách hội thoại
  const loadList = useCallback(
    (signal?: AbortSignal) =>
      apiRequest<ChatConversation[]>(`/api/v1/admin/chat/conversations?status=${filter}`, { token, signal })
        .then((data) => {
          setConversations(data);
          setListError(null);
        })
        .catch((err) => {
          if (signal?.aborted) return;
          setListError(err instanceof ApiError ? err.message : "Không tải được hội thoại");
        }),
    [filter, token]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    loadList(ctrl.signal);
    const id = window.setInterval(() => !document.hidden && loadList(), LIST_POLL_MS);
    return () => {
      ctrl.abort();
      window.clearInterval(id);
    };
  }, [loadList]);

  // Nội dung hội thoại đang chọn: tải đầu rồi polling tin mới
  useEffect(() => {
    if (!selectedId) return;
    const ctrl = new AbortController();
    const base = `/api/v1/admin/chat/conversations/${selectedId}`;
    apiRequest<ChatMessage[]>(`${base}/messages`, { token, signal: ctrl.signal })
      .then((data) => {
        setMessages(data);
        setThreadLoading(false);
      })
      .catch(() => setThreadLoading(false));

    const id = window.setInterval(() => {
      if (document.hidden) return;
      apiRequest<ChatMessage[]>(`${base}/messages?after_seq=${lastSeq(messagesRef.current)}`, { token })
        .then((data) => data.length && setMessages((prev) => mergeMessages(prev, data)))
        .catch(() => {});
    }, THREAD_POLL_MS);
    return () => {
      ctrl.abort();
      window.clearInterval(id);
    };
  }, [selectedId, token]);

  // Đang mở hội thoại có tin chưa đọc thì đánh dấu đã đọc
  const selectedUnread = selected?.unread_for_staff ?? 0;
  useEffect(() => {
    if (!selectedId || selectedUnread === 0) return;
    apiRequest(`/api/v1/admin/chat/conversations/${selectedId}/read`, { method: "POST", token })
      .then(() => setConversations((list) => list?.map((c) => (c.id === selectedId ? { ...c, unread_for_staff: 0 } : c)) ?? list))
      .catch(() => {});
  }, [selectedId, selectedUnread, token]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, selectedId]);

  const select = (id: string) => {
    if (id === selectedId) return;
    setMessages([]);
    setDraft("");
    setThreadLoading(true);
    setSelectedId(id);
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const msg = await apiRequest<ChatMessage>(`/api/v1/admin/chat/conversations/${selectedId}/messages`, { method: "POST", token, body: { body } });
      setMessages((prev) => mergeMessages(prev, [msg]));
      setDraft("");
      loadList();
    } catch (err) {
      notify({ tone: "error", title: err instanceof ApiError ? err.message : "Chưa gửi được tin nhắn" });
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

  const toggleStatus = async () => {
    if (!selected) return;
    const next = selected.status === "open" ? "closed" : "open";
    try {
      const updated = await apiRequest<ChatConversation>(`/api/v1/admin/chat/conversations/${selected.id}`, { method: "PATCH", token, body: { status: next } });
      setConversations((list) => list?.map((c) => (c.id === updated.id ? updated : c)) ?? list);
      notify({ tone: "success", title: next === "closed" ? "Đã đóng hội thoại" : "Đã mở lại hội thoại" });
    } catch (err) {
      notify({ tone: "error", title: err instanceof ApiError ? err.message : "Không cập nhật được" });
    }
  };

  return (
    <section className="grid h-[calc(100dvh-12rem)] min-h-[520px] overflow-hidden rounded-md border border-line bg-surface md:grid-cols-[320px_1fr]">
      {/* Danh sách */}
      <div className={cx("flex min-h-0 flex-col border-line md:border-r", selectedId && "max-md:hidden")}>
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Tin nhắn khách hàng</h2>
          <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cx("h-8 shrink-0 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer", filter === f.id ? "bg-navy text-on-navy" : "bg-muted text-ink-2 hover:text-ink")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {conversations === null ? (
            [0, 1, 2, 3].map((i) => (
              <li key={i} className="px-4 py-3">
                <Skeleton className="h-10" />
              </li>
            ))
          ) : listError && conversations.length === 0 ? (
            <li className="px-4 py-6 text-sm text-ink-2">{listError}</li>
          ) : conversations.length === 0 ? (
            <li className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-ink-3">
              <ChatCircleDotsIcon className="size-8" />
              Chưa có hội thoại nào
            </li>
          ) : (
            conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select(c.id)}
                  aria-current={c.id === selectedId ? "true" : undefined}
                  className={cx("flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors cursor-pointer", c.id === selectedId ? "bg-muted" : "hover:bg-muted/60")}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy/10 text-sm font-semibold text-ink">{c.customer_name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cx("truncate text-sm text-ink", c.unread_for_staff > 0 ? "font-semibold" : "font-medium")}>{c.customer_name}</span>
                      <span className="shrink-0 text-[11px] text-ink-3 tabular">{chatTime(c.last_message_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cx("truncate text-[13px]", c.unread_for_staff > 0 ? "text-ink" : "text-ink-3")}>
                        {c.last_sender_role === "staff" && "Bạn: "}
                        {c.last_message_preview}
                      </span>
                      {c.unread_for_staff > 0 && (
                        <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent tabular">{c.unread_for_staff}</span>
                      )}
                    </span>
                    <span className="mt-1 flex gap-1.5 text-[11px]">
                      {c.is_guest && <span className="rounded bg-muted px-1.5 py-px text-ink-2">Khách vãng lai</span>}
                      {c.status === "closed" && <span className="rounded bg-success-soft px-1.5 py-px text-success">Đã đóng</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Nội dung */}
      <div className={cx("flex min-h-0 flex-col", !selectedId && "max-md:hidden")}>
        {!selected ? (
          <div className="grid flex-1 place-items-center px-6 text-center text-sm text-ink-3">
            <div className="flex flex-col items-center gap-2">
              <ChatCircleDotsIcon className="size-10" />
              Chọn một hội thoại để trả lời khách
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button type="button" onClick={() => setSelectedId(null)} className="grid size-8 place-items-center rounded-md hover:bg-muted md:hidden cursor-pointer" aria-label="Quay lại danh sách">
                <ArrowLeftIcon className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{selected.customer_name}</p>
                <p className="flex flex-wrap gap-x-3 text-xs text-ink-2">
                  {selected.customer_phone && (
                    <a href={`tel:${selected.customer_phone}`} className="inline-flex items-center gap-1 hover:text-ink tabular">
                      <PhoneIcon className="size-3.5" /> {selected.customer_phone}
                    </a>
                  )}
                  {selected.customer_email && (
                    <a href={`mailto:${selected.customer_email}`} className="inline-flex items-center gap-1 truncate hover:text-ink">
                      <EnvelopeSimpleIcon className="size-3.5" /> {selected.customer_email}
                    </a>
                  )}
                  {!selected.customer_phone && !selected.customer_email && <span>{selected.is_guest ? "Khách vãng lai" : "Khách hàng"}</span>}
                </p>
              </div>
              <button type="button" onClick={toggleStatus} className={buttonClass("secondary", "sm")}>
                {selected.status === "open" ? (
                  <>
                    <CheckCircleIcon className="size-4" /> <span className="max-sm:sr-only">Đóng hội thoại</span>
                  </>
                ) : (
                  <>
                    <ArrowCounterClockwiseIcon className="size-4" /> <span className="max-sm:sr-only">Mở lại</span>
                  </>
                )}
              </button>
            </div>

            <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-muted/40 px-4 py-4" aria-live="polite">
              {threadLoading ? (
                <div className="grid flex-1 place-items-center text-ink-3">
                  <CircleNotchIcon className="size-6 animate-spin" />
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_role === "staff";
                  return (
                    <div key={m.seq} className={cx("flex max-w-[75%] flex-col gap-0.5", mine ? "self-end items-end" : "self-start items-start")}>
                      <span className="px-1 text-[11px] text-ink-3">
                        {m.sender_name} · <span className="tabular">{chatTime(m.created_at)}</span>
                      </span>
                      <div className={cx("rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words", mine ? "rounded-br-sm bg-navy text-on-navy" : "rounded-bl-sm bg-surface text-ink shadow-soft")}>
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Trả lời khách… (Enter để gửi, Shift+Enter xuống dòng)"
                aria-label="Tin nhắn trả lời"
                className={cx(inputClass, "h-auto max-h-40 min-h-11 resize-none py-2.5 text-sm [field-sizing:content]")}
              />
              <button type="submit" disabled={sending || !draft.trim()} className={buttonClass("primary", "md", "shrink-0")}>
                {sending ? <CircleNotchIcon className="size-4 animate-spin" /> : <PaperPlaneRightIcon weight="fill" className="size-4" />}
                Gửi
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
