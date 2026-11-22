"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRightIcon, PackageIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/catalog";
import { cx, formatDate, formatVND, isValidVNPhone, normalizePhone } from "@/lib/format";
import { listRecentOrders, saveRecentOrder } from "@/lib/recent-orders";
import type { Order } from "@/lib/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass } from "@/components/ui/styles";
import { LoginPrompt } from "@/components/auth/LoginPrompt";

const TONE = {
  neutral: "bg-muted text-ink-2",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-accent-soft text-accent-text",
};

/** Danh sách đơn đã đặt trên thiết bị này (đọc từ localStorage, rỗng khi render phía server). */
function useRecentOrders() {
  const raw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => JSON.stringify(listRecentOrders().map((o) => o.code)),
    () => "[]"
  );
  return useMemo(() => (JSON.parse(raw) as string[]).map((code) => ({ code })), [raw]);
}

export function MyOrders({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      apiRequest<Order[]>("/api/v1/orders", { token })
        .then(setOrders)
        .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được đơn hàng"));
    load();
    // Đơn đặt khi chưa đăng nhập vừa được gắn vào tài khoản (AuthProvider) thì tải lại danh sách
    window.addEventListener("orders:claimed", load);
    return () => window.removeEventListener("orders:claimed", load);
  }, [token]);

  if (error) return <p className="text-sm text-accent-text">{error}</p>;
  if (!orders)
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
      </div>
    );
  if (orders.length === 0)
    return (
      <div className="flex flex-col items-start gap-3 rounded-md bg-muted p-6">
        <p className="text-ink-2">Bạn chưa có đơn hàng nào.</p>
        <Link href="/products" className={buttonClass("dark")}>
          Bắt đầu mua sắm
        </Link>
      </div>
    );

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.order_code}`} className="group flex items-center gap-4 rounded-md border border-line bg-surface p-4 transition-[border-color,transform] duration-200 hover:border-line-strong sm:p-5">
            <PackageIcon weight="light" className="size-7 shrink-0 text-ink-3" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink tabular">{o.order_code}</p>
              <p className="truncate text-[13px] text-ink-3">
                {formatDate(o.created_at)}, {o.items.length} sản phẩm, {formatVND(o.total_amount)}
              </p>
            </div>
            <span className={cx("hidden rounded-md px-2 py-0.5 text-xs font-medium sm:inline", TONE[ORDER_STATUS[o.status]?.tone ?? "neutral"])}>{orderStatusLabel(o.status)}</span>
            <ArrowRightIcon className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OrderLookup() {
  const router = useRouter();
  const { user, token, ready } = useAuth();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ code?: string; phone?: string }>({});
  const recent = useRecentOrders();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z]{2}-\d{8}-[A-Z0-9]{3,}$/.test(cleanCode)) next.code = "Mã đơn có dạng DT-20261026-AB12";
    if (!isValidVNPhone(phone)) next.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
    setErrors(next);
    if (Object.keys(next).length) return;
    saveRecentOrder(cleanCode, normalizePhone(phone));
    router.push(`/orders/${cleanCode}`);
  };

  return (
    <div className="grid gap-12 py-8 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">Tra cứu đơn hàng</h1>
        <p className="mt-2 max-w-[48ch] text-ink-2">Nhập mã đơn trong tin nhắn xác nhận và số điện thoại đã dùng khi đặt hàng.</p>
        <form onSubmit={submit} noValidate className="mt-8 flex max-w-md flex-col gap-5">
          <Field label="Mã đơn hàng" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" className="[&_input]:uppercase" error={errors.code} />
          <Field label="Số điện thoại đặt hàng" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" error={errors.phone} />
          <button type="submit" className={buttonClass("dark", "lg")}>
            Xem đơn hàng
          </button>
        </form>
        {recent.length > 0 && !user && (
          <div className="mt-10">
            <p className="text-sm font-medium text-ink">Đơn đã đặt trên thiết bị này</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {recent.map((o) => (
                <li key={o.code}>
                  <Link href={`/orders/${o.code}`} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-sm text-ink tabular hover:border-line-strong">
                    {o.code}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Đơn hàng của tôi</h2>
        <div className="mt-4">
          {!ready ? (
            <Skeleton className="h-20 rounded-md" />
          ) : user && token ? (
            <MyOrders token={token} />
          ) : (
            <LoginPrompt
              next="/orders"
              title="Không lo quên mã đơn"
              description="Đăng nhập hoặc tạo tài khoản: các đơn đã đặt trên máy này tự được lưu vào tài khoản, lần sau xem lại mọi đơn mà không cần mã đơn."
            />
          )}
        </div>
      </div>
    </div>
  );
}
