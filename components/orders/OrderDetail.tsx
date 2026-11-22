"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowSquareOutIcon, CheckCircleIcon, CheckIcon, CircleNotchIcon, CopyIcon, StarIcon, TruckIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/catalog";
import { cx, formatDate, formatDateTime, formatVND, isValidVNPhone, normalizePhone } from "@/lib/format";
import { getOrderPhone, saveRecentOrder } from "@/lib/recent-orders";
import type { Order, ReviewableItem } from "@/lib/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass } from "@/components/ui/styles";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { ReviewForm } from "@/components/reviews/ReviewForm";

const FLOW_COD = ["confirmed", "processing", "shipping", "delivered", "completed"];
const FLOW_PREPAID = ["pending_payment", "paid", "processing", "shipping", "delivered", "completed"];
const CANCELLABLE = ["pending_payment", "confirmed", "paid", "processing"];
const REVIEWABLE = ["delivered", "completed", "return_requested", "returned"];

/** Đơn đã giao của chính tài khoản: mỗi sản phẩm có nút viết / sửa đánh giá. */
function OrderReviews({ order, token }: { order: Order; token: string }) {
  const [items, setItems] = useState<ReviewableItem[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<ReviewableItem[]>("/api/v1/reviews/me", { token })
      .then(setItems)
      .catch(() => setItems([]));
  }, [token]);

  const productIds = [...new Set(order.items.map((it) => it.product_id))];
  const rows = (items ?? []).filter((it) => productIds.includes(it.product_id));
  if (!items || rows.length === 0) return null;
  const pending = rows.filter((r) => !r.review).length;

  return (
    <section className="rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="font-semibold text-ink">Đánh giá sản phẩm</h2>
        {pending > 0 && <span className="text-sm text-ink-2">Còn {pending} sản phẩm chưa đánh giá</span>}
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.product_id} className="px-5 py-4">
            {editing === r.product_id ? (
              <ReviewForm
                token={token}
                productId={r.product_id}
                productName={r.product_name}
                size={r.size}
                existing={r.review}
                onCancel={() => setEditing(null)}
                onSaved={(review) => {
                  setItems((list) => list?.map((x) => (x.product_id === r.product_id ? { ...x, review } : x)) ?? list);
                  setEditing(null);
                }}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{r.product_name}</p>
                  {r.review ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-2">
                      <StarIcon weight="fill" className="size-3.5 text-warning" aria-hidden /> {r.review.rating}/5 · {r.review.comment.slice(0, 60)}
                      {r.review.comment.length > 60 ? "…" : ""}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[13px] text-ink-3">Giúp võ sinh khác chọn đúng size bằng vài dòng nhận xét</p>
                  )}
                </div>
                <button type="button" onClick={() => setEditing(r.product_id)} className={buttonClass(r.review ? "ghost" : "primary", "sm")}>
                  {r.review ? "Sửa đánh giá" : "Viết đánh giá"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Timeline({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-md bg-accent-soft p-5 text-accent-text">
        <XCircleIcon weight="fill" className="size-6 shrink-0" aria-hidden />
        <p className="text-sm font-medium">Đơn hàng đã được hủy. Tồn kho đã được hoàn lại.</p>
      </div>
    );
  }
  const flow = order.payment_method.toUpperCase() === "COD" ? FLOW_COD : FLOW_PREPAID;
  const currentIndex = Math.max(flow.indexOf(order.status), 0);
  const timeOf = (status: string) => order.status_history.find((h) => h.new_status === status)?.timestamp;

  return (
    <ol className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))] sm:gap-2">
      {flow.map((status, i) => {
        const done = i <= currentIndex;
        return (
          <li key={status} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <div className="flex items-center gap-2 sm:w-full">
              <span className={cx("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold", done ? "bg-ink text-bg" : "bg-muted text-ink-3")}>
                {done ? <CheckIcon weight="bold" className="size-3.5" /> : i + 1}
              </span>
              {i < flow.length - 1 && <span className={cx("hidden h-px flex-1 sm:block", i < currentIndex ? "bg-ink" : "bg-line")} />}
            </div>
            <div>
              <p className={cx("text-sm font-medium", done ? "text-ink" : "text-ink-3")}>{orderStatusLabel(status)}</p>
              {timeOf(status) && <p className="text-[13px] text-ink-3">{formatDateTime(timeOf(status))}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetail({ code, justPlaced }: { code: string; justPlaced: boolean }) {
  const { user, token, ready } = useAuth();
  const { notify } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [triedPhone, setTriedPhone] = useState(false);
  const [busy, setBusy] = useState<"cancel" | "pay" | null>(null);

  // SĐT chỉ được ghi nhận sau khi máy chủ xác nhận khớp với đơn (dùng lại cho thao tác hủy đơn)
  const load = useCallback(
    (withPhone: string | null) => {
      const query = withPhone ? `?phone=${encodeURIComponent(withPhone)}` : "";
      return apiRequest<Order>(`/api/v1/orders/${encodeURIComponent(code)}${query}`, { token })
        .then((data) => {
          setOrder(data);
          setError(null);
          setPhone(withPhone);
          if (withPhone) saveRecentOrder(code, withPhone);
        })
        .catch((err) => {
          setError({ status: err instanceof ApiError ? err.status : 0, message: err instanceof ApiError ? err.message : "Không tải được đơn hàng" });
        });
    },
    [code, token]
  );

  useEffect(() => {
    if (ready) load(getOrderPhone(code));
  }, [ready, code, load]);

  // Vừa đăng nhập và đơn này được gắn vào tài khoản: tải lại để hiện mục đánh giá / đúng chủ đơn
  useEffect(() => {
    const onClaimed = (e: Event) => {
      if ((e as CustomEvent<string[]>).detail?.includes(code)) load(getOrderPhone(code));
    };
    window.addEventListener("orders:claimed", onClaimed);
    return () => window.removeEventListener("orders:claimed", onClaimed);
  }, [code, load]);

  const submitPhone = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidVNPhone(phoneInput)) {
      setPhoneError("Số điện thoại gồm 10 số, bắt đầu bằng 0");
      return;
    }
    setTriedPhone(true);
    load(normalizePhone(phoneInput));
  };

  const cancel = async () => {
    if (!order || !window.confirm(`Hủy đơn ${order.order_code}?`)) return;
    setBusy("cancel");
    try {
      const query = phone ? `?phone=${encodeURIComponent(phone)}` : "";
      setOrder(await apiRequest<Order>(`/api/v1/orders/${order.order_code}/cancel${query}`, { method: "POST", token }));
      notify({ tone: "success", title: "Đã hủy đơn hàng" });
    } catch (err) {
      notify({ tone: "error", title: "Không hủy được đơn", description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const payAgain = async () => {
    if (!order) return;
    setBusy("pay");
    try {
      const payment = await apiRequest<{ pay_url: string }>("/api/v1/payments/momo/create", { method: "POST", token, body: { order_code: order.order_code } });
      if (payment.pay_url) window.location.assign(payment.pay_url);
    } catch (err) {
      notify({ tone: "error", title: "Không tạo được thanh toán", description: err instanceof ApiError ? err.message : undefined });
      setBusy(null);
    }
  };

  if (error && (error.status === 401 || error.status === 403) && !order) {
    return (
      <div className="mx-auto max-w-md py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Xác minh đơn hàng {code}</h1>
        <p className="mt-2 text-sm text-ink-2">Nhập số điện thoại đã dùng khi đặt hàng để xem chi tiết đơn.</p>
        <form onSubmit={submitPhone} noValidate className="mt-6 flex flex-col gap-4">
          <Field
            label="Số điện thoại đặt hàng"
            inputMode="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={(e) => {
              setPhoneInput(e.target.value);
              setPhoneError(null);
            }}
            error={phoneError ?? (error.status === 403 && triedPhone ? "Số điện thoại không khớp với đơn hàng" : null)}
          />
          <button type="submit" className={buttonClass("dark", "lg")}>
            Xem đơn hàng
          </button>
        </form>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{error.status === 404 ? "Không tìm thấy đơn hàng" : "Chưa tải được đơn hàng"}</h1>
        <p className="text-ink-2">{error.status === 404 ? `Mã đơn ${code} không tồn tại. Kiểm tra lại mã trong tin nhắn xác nhận.` : error.message}</p>
        <Link href="/orders" className={buttonClass("secondary", "lg")}>
          Tra cứu đơn khác
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col gap-4 py-10">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    );
  }

  const tone = ORDER_STATUS[order.status]?.tone ?? "neutral";
  const isGuest = ready && !user;
  const ownsOrder = !!user && !!order.user_id && order.user_id === (user.user_id ?? user.id);

  return (
    <div className="flex flex-col gap-8 py-8 lg:py-12">
      {justPlaced && order.status !== "cancelled" && (
        <div className="fade-in flex items-start gap-4 rounded-md border border-line bg-surface p-5 sm:p-6">
          <CheckCircleIcon weight="fill" className="size-8 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-lg font-semibold text-ink">Đặt hàng thành công</p>
            <p className="mt-1 text-sm text-ink-2">
              {order.payment_method.toUpperCase() === "COD"
                ? "Chúng tôi sẽ gọi xác nhận và giao hàng trong 2 đến 4 ngày. Bạn thanh toán khi nhận hàng."
                : order.payment_status === "paid"
                  ? "Thanh toán MoMo đã được ghi nhận. Đơn hàng đang được chuẩn bị."
                  : "Đơn hàng đang chờ thanh toán MoMo. Đơn tự hủy nếu chưa thanh toán sau 15 phút."}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-3">Đặt lúc {formatDateTime(order.created_at)}</p>
          <h1 className="mt-1 flex items-center gap-3 text-3xl font-semibold tracking-tight text-ink tabular">
            {order.order_code}
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(order.order_code).then(() => notify({ tone: "info", title: "Đã sao chép mã đơn" }))}
              className="rounded-md p-1 text-ink-3 hover:text-ink cursor-pointer"
              aria-label="Sao chép mã đơn"
            >
              <CopyIcon className="size-5" />
            </button>
          </h1>
        </div>
        <span
          className={cx(
            "self-start rounded-md px-2.5 py-1 text-sm font-medium sm:self-auto",
            tone === "success" && "bg-success-soft text-success",
            tone === "warning" && "bg-warning-soft text-warning",
            tone === "danger" && "bg-accent-soft text-accent-text",
            tone === "neutral" && "bg-muted text-ink-2"
          )}
        >
          {orderStatusLabel(order.status)}
        </span>
      </div>

      {isGuest && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning-soft p-5 sm:p-6">
            <WarningCircleIcon weight="fill" className="size-7 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0">
              <h2 className="font-semibold text-ink">Hãy lưu lại mã đơn hàng</h2>
              <p className="mt-1 text-sm text-ink-2">
                Khi chưa đăng nhập, bạn cần <strong className="text-ink">mã đơn + số điện thoại đặt hàng</strong> để tra cứu. Mất mã đơn sẽ không xem lại được đơn này.
              </p>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(order.order_code).then(() => notify({ tone: "info", title: `Đã sao chép mã ${order.order_code}` }))}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-sm border border-line bg-surface px-3.5 text-sm font-semibold text-ink tabular hover:border-line-strong cursor-pointer"
              >
                <CopyIcon className="size-4" /> {order.order_code}
              </button>
            </div>
          </section>
          <LoginPrompt
            next={`/orders/${order.order_code}`}
            title="Lưu đơn vào tài khoản"
            description="Đăng nhập hoặc tạo tài khoản để không cần nhớ mã đơn, theo dõi mọi đơn ở một nơi và đánh giá sản phẩm sau khi nhận hàng."
          />
        </div>
      )}

      <section className="rounded-md border border-line bg-surface p-5 sm:p-6">
        <h2 className="sr-only">Tiến trình đơn hàng</h2>
        <Timeline order={order} />
      </section>

      {ownsOrder && token && REVIEWABLE.includes(order.status) && <OrderReviews order={order} token={token} />}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-md border border-line bg-surface">
          <h2 className="border-b border-line px-5 py-4 font-semibold text-ink">Sản phẩm</h2>
          <ul className="divide-y divide-line">
            {order.items.map((it, i) => (
              <li key={`${it.sku}-${i}`} className="flex justify-between gap-4 px-5 py-4 text-sm">
                <div>
                  <p className="font-medium text-ink">{it.product_name}</p>
                  <p className="text-[13px] text-ink-3">
                    {it.size}
                    {it.color ? `, ${it.color}` : ""}, số lượng {it.quantity}
                  </p>
                  {it.is_embroidered && <p className="text-[13px] text-ink-2">Thêu tên: {it.embroidery_name}</p>}
                </div>
                <p className="shrink-0 font-medium text-ink tabular">{formatVND((it.price + (it.is_embroidered ? it.embroidery_fee : 0)) * it.quantity)}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Thanh toán</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between text-ink-2">
                <dt>Tạm tính</dt>
                <dd className="text-ink tabular">{formatVND(order.subtotal)}</dd>
              </div>
              {order.embroidery_total > 0 && (
                <div className="flex justify-between text-ink-2">
                  <dt>Phí thêu tên</dt>
                  <dd className="text-ink tabular">{formatVND(order.embroidery_total)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-2">
                <dt>Giao hàng</dt>
                <dd className="text-ink tabular">{order.shipping_fee === 0 ? "Miễn phí" : formatVND(order.shipping_fee)}</dd>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Giảm giá {order.voucher_code ? `(${order.voucher_code})` : ""}</dt>
                  <dd className="tabular">-{formatVND(order.discount_amount)}</dd>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-medium text-ink">Tổng cộng</dt>
                <dd className="text-xl font-semibold text-ink tabular">{formatVND(order.total_amount)}</dd>
              </div>
              <div className="flex justify-between text-ink-2">
                <dt>Hình thức</dt>
                <dd className="text-ink">
                  {order.payment_method.toUpperCase() === "COD" ? "Thanh toán khi nhận hàng" : "Ví MoMo"}, {order.payment_status === "paid" ? "đã thanh toán" : "chưa thanh toán"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-line bg-surface p-5 text-sm">
            <h2 className="font-semibold text-ink">Giao đến</h2>
            <p className="mt-3 font-medium text-ink">{order.customer_name}</p>
            <p className="text-ink-2 tabular">{order.customer_phone}</p>
            <p className="mt-1 text-ink-2">{order.shipping_address_full}</p>
            {order.tracking_code && !order.shipment && (
              <p className="mt-3 text-ink-2">
                Mã vận đơn: <span className="font-medium text-ink tabular">{order.tracking_code}</span>
              </p>
            )}
          </section>

          {order.shipment && order.tracking_code && <ShipmentCard order={order} />}

          <div className="flex flex-col gap-2">
            {order.status === "pending_payment" && order.payment_method.toUpperCase() !== "COD" && (
              <button type="button" onClick={payAgain} disabled={busy !== null} className={buttonClass("primary", "lg")}>
                {busy === "pay" && <CircleNotchIcon className="size-5 animate-spin" />}
                Thanh toán MoMo
              </button>
            )}
            {CANCELLABLE.includes(order.status) && (
              <button type="button" onClick={cancel} disabled={busy !== null} className={buttonClass("secondary", "lg")}>
                {busy === "cancel" && <CircleNotchIcon className="size-5 animate-spin" />}
                Hủy đơn hàng
              </button>
            )}
            <Link href="/products" className={buttonClass("ghost", "lg")}>
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const CARRIER_NAME: Record<string, string> = { GHN: "Giao Hàng Nhanh", MockShipping: "Đơn vị vận chuyển" };

/** Hành trình vận đơn: trạng thái mới nhất từ đơn vị vận chuyển, ngày giao dự kiến, link tra cứu. */
function ShipmentCard({ order }: { order: Order }) {
  const shipment = order.shipment!;
  const events = [...shipment.events].reverse();
  const delivered = shipment.status === "delivered";
  return (
    <section className="rounded-md border border-line bg-surface p-5 text-sm">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <TruckIcon className="size-5 text-ink-3" aria-hidden /> Vận chuyển
      </h2>
      <p className="mt-3 text-ink-2">
        {CARRIER_NAME[order.carrier ?? ""] ?? order.carrier}, mã vận đơn <span className="font-medium text-ink tabular">{order.tracking_code}</span>
      </p>
      <p className={cx("mt-2 font-medium", delivered ? "text-success" : "text-ink")}>{shipment.status_label ?? shipment.status}</p>
      {!delivered && shipment.expected_delivery_time && formatDate(shipment.expected_delivery_time) && (
        <p className="text-ink-2">Dự kiến giao: {formatDate(shipment.expected_delivery_time)}</p>
      )}
      {events.length > 1 && (
        <ol className="mt-3 flex flex-col gap-1.5 border-l border-line pl-3">
          {events.map((e, i) => (
            <li key={`${e.status}-${i}`} className={i === 0 ? "text-ink" : "text-ink-3"}>
              {e.status_label ?? e.status} <span className="text-[13px] text-ink-3">· {formatDateTime(e.time)}</span>
            </li>
          ))}
        </ol>
      )}
      {shipment.tracking_url && (
        <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm", "mt-4")}>
          Xem hành trình chi tiết <ArrowSquareOutIcon className="size-4" />
        </a>
      )}
    </section>
  );
}
