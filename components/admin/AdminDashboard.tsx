"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowSquareOutIcon,
  CircleNotchIcon,
  DownloadSimpleIcon,
  PrinterIcon,
  SignOutIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { apiRequest, ApiError, getApiUrl } from "@/lib/api";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/catalog";
import { cx, formatDate, formatDateTime, formatVND } from "@/lib/format";
import type { Order, Product, ProductList } from "@/lib/types";
import { isStaffRole, useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass, container, inputClass } from "@/components/ui/styles";
import { Logo } from "@/components/site/Logo";
import { useAdminApi } from "@/components/admin/useAdminApi";
import { AnalyticsPanel } from "@/components/admin/analytics/AnalyticsPanel";
import { StoreSettingsPanel } from "@/components/admin/StoreSettingsPanel";
import { PricePanel } from "@/components/admin/PricePanel";
import { ChatInbox, useChatUnread } from "@/components/admin/ChatInbox";
import { ReviewsPanel } from "@/components/admin/ReviewsPanel";

/** Luồng chuyển trạng thái hợp lệ, khớp VALID_TRANSITIONS ở backend (Mục 6). */
const NEXT_STATUS: Record<string, string[]> = {
  pending_payment: ["paid", "cancelled"],
  confirmed: ["processing", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: ["completed"],
  return_requested: ["returned", "completed"],
};

interface Kpi {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  total_returns: number;
  size_exchange_rate: string;
  active_dojo_campaigns: number;
  low_stock_alerts: Array<{ product_name: string; sku: string; size: string; remaining: number; threshold: number }>;
}

interface ReturnRequest {
  id: string;
  order_code: string;
  product_name: string;
  sku: string;
  current_size: string;
  desired_size: string;
  reason: string;
  status: string;
  review_note?: string | null;
  exchange_order_code?: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  actor: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  timestamp: string;
}

interface PackingSlip {
  order_code: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  tracking_code?: string | null;
  carrier: string;
  items: Array<{ product_name?: string; sku?: string; size?: string; quantity?: number; embroidery_name?: string | null }>;
  total_quantity: number;
  notes?: string | null;
}

type Tab = "overview" | "analytics" | "orders" | "chat" | "reviews" | "prices" | "returns" | "inventory" | "logs";

const TONE_CLASS = {
  neutral: "bg-muted text-ink-2",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-accent-soft text-accent-text",
};

function StatusBadge({ status }: { status: string }) {
  const tone = ORDER_STATUS[status]?.tone ?? "neutral";
  return <span className={cx("inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE_CLASS[tone])}>{orderStatusLabel(status)}</span>;
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-md border border-line bg-surface", className)}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ErrorRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-6 text-sm text-ink-2">
      <span className="flex items-center gap-2">
        <WarningIcon className="size-4 text-accent" aria-hidden /> {message}
      </span>
      <button type="button" onClick={onRetry} className="font-medium text-ink underline underline-offset-4 cursor-pointer">
        Thử lại
      </button>
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>
  );
}

function Overview({ token, isAdmin, onGoOrders }: { token: string; isAdmin: boolean; onGoOrders: () => void }) {
  const kpi = useAdminApi<Kpi>("/api/v1/admin/dashboard/kpi", token);
  const orders = useAdminApi<Order[]>("/api/v1/orders", token);

  const tiles = kpi.data
    ? [
        { label: "Doanh thu đã ghi nhận", value: formatVND(kpi.data.total_revenue) },
        { label: "Tổng đơn hàng", value: kpi.data.total_orders.toLocaleString("vi-VN") },
        { label: "Đơn chờ xử lý", value: kpi.data.pending_orders.toLocaleString("vi-VN") },
        { label: "Tỷ lệ đổi size", value: kpi.data.size_exchange_rate },
        { label: "Đợt võ đường đang mở", value: kpi.data.active_dojo_campaigns.toLocaleString("vi-VN") },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {kpi.error ? (
        <Panel title="Chỉ số">
          <ErrorRow message={kpi.error} onRetry={kpi.reload} />
        </Panel>
      ) : (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3 xl:grid-cols-5">
          {(kpi.loading && !kpi.data ? Array.from({ length: 5 }, () => null) : tiles).map((tile, i) => (
            <div key={i} className="bg-surface p-5">
              {tile ? (
                <>
                  <dt className="text-[13px] text-ink-3">{tile.label}</dt>
                  <dd className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular">{tile.value}</dd>
                </>
              ) : (
                <>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-7 w-28" />
                </>
              )}
            </div>
          ))}
        </dl>
      )}

      <StoreSettingsPanel token={token} isAdmin={isAdmin} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Đơn hàng mới nhất"
          action={
            <button type="button" onClick={onGoOrders} className="text-[13px] font-medium text-accent-text cursor-pointer">
              Xem tất cả
            </button>
          }
        >
          {orders.error ? (
            <ErrorRow message={orders.error} onRetry={orders.reload} />
          ) : orders.loading && !orders.data ? (
            <TableSkeleton rows={4} />
          ) : orders.data && orders.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {orders.data.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink tabular">{o.order_code}</p>
                    <p className="truncate text-[13px] text-ink-3">
                      {o.customer_name}, {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium text-ink tabular">{formatVND(o.total_amount)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-ink-2">Chưa có đơn hàng nào. Đơn mới từ cửa hàng sẽ hiện tại đây.</p>
          )}
        </Panel>

        <Panel title="Cảnh báo tồn kho thấp">
          {kpi.loading && !kpi.data ? (
            <TableSkeleton rows={3} />
          ) : kpi.data && kpi.data.low_stock_alerts.length > 0 ? (
            <ul className="divide-y divide-line">
              {kpi.data.low_stock_alerts.map((a) => (
                <li key={a.sku} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{a.product_name}</p>
                    <p className="text-[13px] text-ink-3">
                      {a.sku}, {a.size}
                    </p>
                  </div>
                  <span className={cx("shrink-0 text-sm font-semibold tabular", a.remaining === 0 ? "text-accent-text" : "text-warning")}>
                    Còn {a.remaining}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-ink-2">Mọi biến thể đều trên ngưỡng tồn kho tối thiểu.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Orders({ token }: { token: string }) {
  const { notify } = useToast();
  const orders = useAdminApi<Order[]>("/api/v1/orders", token);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [slip, setSlip] = useState<PackingSlip | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders.data ?? []).filter(
      (o) =>
        (status === "all" || o.status === status) &&
        (!q || o.order_code.toLowerCase().includes(q) || o.customer_phone.includes(q) || o.customer_name.toLowerCase().includes(q))
    );
  }, [orders.data, status, query]);

  const changeStatus = async (order: Order, next: string) => {
    setBusy(order.order_code);
    try {
      const updated = await apiRequest<Order>(`/api/v1/orders/${order.order_code}/status`, {
        method: "PATCH",
        token,
        body: { new_status: next, note: "Cập nhật từ trang quản trị" },
      });
      orders.setData((prev) => prev?.map((o) => (o.order_code === updated.order_code ? updated : o)) ?? prev);
      notify({ tone: "success", title: `${order.order_code}: ${orderStatusLabel(next)}` });
    } catch (err) {
      notify({ tone: "error", title: "Không đổi được trạng thái", description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const openSlip = async (order: Order) => {
    setSlip(null);
    setSlipOpen(true);
    try {
      setSlip(await apiRequest<PackingSlip>(`/api/v1/admin/orders/${order.order_code}/packing-slip`, { token }));
    } catch (err) {
      setSlipOpen(false);
      notify({ tone: "error", title: "Không tải được phiếu đóng gói", description: err instanceof ApiError ? err.message : undefined });
    }
  };

  return (
    <Panel
      title={`Đơn hàng${orders.data ? ` (${filtered.length})` : ""}`}
      action={
        <div className="flex items-center gap-2">
          <label htmlFor="order-search" className="sr-only">
            Tìm đơn hàng
          </label>
          <input
            id="order-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mã đơn, tên, SĐT"
            className={cx(inputClass, "h-9 w-44 text-sm sm:w-56")}
          />
          <label htmlFor="order-status" className="sr-only">
            Lọc trạng thái
          </label>
          <select id="order-status" value={status} onChange={(e) => setStatus(e.target.value)} className={cx(inputClass, "h-9 w-auto cursor-pointer text-sm")}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(ORDER_STATUS).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {orders.error ? (
        <ErrorRow message={orders.error} onRetry={orders.reload} />
      ) : orders.loading && !orders.data ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-2">Không có đơn hàng khớp bộ lọc.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-[13px] text-ink-3">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Mã đơn</th>
                <th className="px-3 py-3 font-medium">Khách hàng</th>
                <th className="px-3 py-3 font-medium">Thanh toán</th>
                <th className="px-3 py-3 text-right font-medium">Tổng tiền</th>
                <th className="px-3 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((o) => (
                <tr key={o.id} className="align-middle transition-colors hover:bg-bg">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink tabular">{o.order_code}</p>
                    <p className="text-[13px] text-ink-3">{formatDateTime(o.created_at)}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="text-ink">{o.customer_name}</p>
                    <p className="text-[13px] text-ink-3 tabular">{o.customer_phone}</p>
                  </td>
                  <td className="px-3 py-3.5 text-ink-2">
                    {o.payment_method}
                    {o.items.some((it) => it.is_embroidered) && <span className="ml-1.5 text-[13px] text-ink-3">(có thêu)</span>}
                  </td>
                  <td className="px-3 py-3.5 text-right font-medium text-ink tabular">{formatVND(o.total_amount)}</td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status={o.status} />
                    {o.shipment && <p className="mt-1 text-[12px] text-ink-3 tabular">{o.carrier} {o.tracking_code}: {o.shipment.status_label}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {busy === o.order_code && <CircleNotchIcon className="size-4 animate-spin text-ink-3" />}
                      {(NEXT_STATUS[o.status] ?? []).map((next) => (
                        <button
                          key={next}
                          type="button"
                          disabled={busy === o.order_code}
                          onClick={() => changeStatus(o, next)}
                          className={cx(
                            buttonClass(next === "cancelled" ? "ghost" : "secondary", "sm", "h-8 px-2.5 text-[13px]"),
                            next === "cancelled" && "text-accent-text hover:text-accent-text"
                          )}
                        >
                          {next === "cancelled" ? "Hủy" : orderStatusLabel(next)}
                        </button>
                      ))}
                      <button type="button" onClick={() => openSlip(o)} className={buttonClass("ghost", "sm", "h-8 px-2")} aria-label={`Phiếu đóng gói ${o.order_code}`}>
                        <PrinterIcon className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        title="Phiếu đóng gói"
        footer={
          slip && (
            <button type="button" onClick={() => window.print()} className={buttonClass("dark", "lg", "w-full")}>
              <PrinterIcon className="size-5" /> In phiếu
            </button>
          )
        }
      >
        {!slip ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="flex flex-col gap-5 p-5 text-sm">
            <div>
              <p className="text-lg font-semibold text-ink tabular">{slip.order_code}</p>
              <p className="text-ink-3">
                {formatDateTime(slip.created_at)}, {slip.carrier} {slip.tracking_code ?? ""}
              </p>
            </div>
            <div className="rounded-sm bg-muted p-4">
              <p className="font-medium text-ink">{slip.customer_name}</p>
              <p className="text-ink-2 tabular">{slip.customer_phone}</p>
              <p className="mt-1 text-ink-2">{slip.shipping_address}</p>
            </div>
            <ul className="divide-y divide-line">
              {slip.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="text-ink">{it.product_name}</p>
                    <p className="text-[13px] text-ink-3">
                      {it.sku}, {it.size}
                      {it.embroidery_name ? `, thêu: ${it.embroidery_name}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-ink tabular">x{it.quantity}</span>
                </li>
              ))}
            </ul>
            <p className="text-ink-2">
              Tổng số món: <span className="font-semibold text-ink">{slip.total_quantity}</span>
            </p>
            {slip.notes && <p className="rounded-lg bg-warning-soft px-3 py-2 text-warning">{slip.notes}</p>}
          </div>
        )}
      </Drawer>
    </Panel>
  );
}

function Returns({ token }: { token: string }) {
  const { notify } = useToast();
  const returns = useAdminApi<ReturnRequest[]>("/api/v1/admin/returns", token);
  const [busy, setBusy] = useState<string | null>(null);

  const review = async (item: ReturnRequest, action: "approve" | "reject") => {
    setBusy(item.id);
    try {
      const updated = await apiRequest<ReturnRequest>(`/api/v1/admin/returns/${item.id}/review`, {
        method: "PATCH",
        token,
        body: { action, note: action === "approve" ? "Đồng ý đổi size" : "Không đủ điều kiện đổi size" },
      });
      returns.setData((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? prev);
      notify({ tone: "success", title: action === "approve" ? "Đã duyệt đổi size" : "Đã từ chối yêu cầu" });
    } catch (err) {
      notify({ tone: "error", title: "Không xử lý được yêu cầu", description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const statusLabel: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", completed: "Hoàn tất" };

  return (
    <Panel title="Yêu cầu đổi size">
      {returns.error ? (
        <ErrorRow message={returns.error} onRetry={returns.reload} />
      ) : returns.loading && !returns.data ? (
        <TableSkeleton rows={3} />
      ) : !returns.data || returns.data.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-2">Chưa có yêu cầu đổi size nào.</p>
      ) : (
        <ul className="divide-y divide-line">
          {returns.data.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {r.product_name} <span className="font-normal text-ink-3">({r.order_code})</span>
                </p>
                <p className="mt-0.5 text-[13px] text-ink-2">
                  Đổi từ <span className="font-medium text-ink">{r.current_size}</span> sang <span className="font-medium text-ink">{r.desired_size}</span>. {r.reason}
                </p>
                {r.exchange_order_code && <p className="mt-0.5 text-[13px] text-ink-3">Đơn đổi: {r.exchange_order_code}</p>}
              </div>
              {r.status === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy === r.id} onClick={() => review(r, "reject")} className={buttonClass("secondary", "sm")}>
                    Từ chối
                  </button>
                  <button type="button" disabled={busy === r.id} onClick={() => review(r, "approve")} className={buttonClass("dark", "sm")}>
                    {busy === r.id && <CircleNotchIcon className="size-4 animate-spin" />}
                    Duyệt đổi
                  </button>
                </div>
              ) : (
                <span className={cx("shrink-0 self-start rounded-md px-2 py-0.5 text-xs font-medium md:self-auto", r.status === "rejected" ? TONE_CLASS.danger : TONE_CLASS.success)}>
                  {statusLabel[r.status] ?? r.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Inventory({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const { notify } = useToast();
  const products = useAdminApi<ProductList>("/api/v1/products?limit=100&sort_by=newest", token);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [onlyLow, setOnlyLow] = useState(false);

  const adjust = async (product: Product, sku: string) => {
    const change = Number(amounts[sku]);
    if (!change || !Number.isInteger(change)) {
      notify({ tone: "error", title: "Nhập số lượng nguyên, dương để nhập kho hoặc âm để xuất kho" });
      return;
    }
    setAdjusting(sku);
    try {
      const params = new URLSearchParams({ product_id: product.id, sku, quantity_change: String(change), reason: "Điều chỉnh từ trang quản trị" });
      await apiRequest(`/api/v1/orders/inventory/adjust?${params}`, { method: "POST", token });
      products.setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((p) =>
                p.id === product.id
                  ? { ...p, variants: p.variants.map((v) => (v.sku === sku ? { ...v, stock: v.stock + change, is_low_stock: v.stock + change <= v.low_stock_threshold } : v)) }
                  : p
              ),
            }
          : prev
      );
      setAmounts((prev) => ({ ...prev, [sku]: "" }));
      notify({ tone: "success", title: `Đã cập nhật tồn kho ${sku}` });
    } catch (err) {
      notify({ tone: "error", title: "Không điều chỉnh được tồn kho", description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setAdjusting(null);
    }
  };

  const downloadCsv = async () => {
    try {
      const res = await fetch(getApiUrl("/api/v1/admin/reports/export-csv"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-doanh-thu-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notify({ tone: "error", title: "Không xuất được báo cáo CSV" });
    }
  };

  const rows = (products.data?.items ?? []).flatMap((p) =>
    p.variants.filter((v) => !onlyLow || v.stock <= v.low_stock_threshold).map((v) => ({ product: p, variant: v }))
  );

  return (
    <Panel
      title="Tồn kho theo biến thể"
      action={
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="size-4 accent-accent" />
            Chỉ tồn thấp
          </label>
          {isAdmin && (
            <button type="button" onClick={downloadCsv} className={buttonClass("secondary", "sm")}>
              <DownloadSimpleIcon className="size-4" /> Xuất CSV doanh thu
            </button>
          )}
        </div>
      }
    >
      {products.error ? (
        <ErrorRow message={products.error} onRetry={products.reload} />
      ) : products.loading && !products.data ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-2">Không có biến thể nào dưới ngưỡng tồn kho.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[13px] text-ink-3">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Sản phẩm</th>
                <th className="px-3 py-3 font-medium">SKU</th>
                <th className="px-3 py-3 text-right font-medium">Tồn kho</th>
                <th className="px-5 py-3 text-right font-medium">Nhập (+) / xuất (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ product, variant }) => {
                const low = variant.stock <= variant.low_stock_threshold;
                return (
                  <tr key={variant.sku} className="hover:bg-bg">
                    <td className="px-5 py-3">
                      <p className="text-ink">{product.name}</p>
                      <p className="text-[13px] text-ink-3">
                        {variant.size}, {variant.color}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-ink-2 tabular">{variant.sku}</td>
                    <td className={cx("px-3 py-3 text-right font-semibold tabular", variant.stock === 0 ? "text-accent-text" : low ? "text-warning" : "text-ink")}>
                      {variant.stock}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <label htmlFor={`adj-${variant.sku}`} className="sr-only">
                          Số lượng điều chỉnh cho {variant.sku}
                        </label>
                        <input
                          id={`adj-${variant.sku}`}
                          inputMode="numeric"
                          value={amounts[variant.sku] ?? ""}
                          onChange={(e) => setAmounts((prev) => ({ ...prev, [variant.sku]: e.target.value.replace(/[^\d-]/g, "") }))}
                          placeholder="+10"
                          className={cx(inputClass, "h-8 w-20 text-right text-sm tabular")}
                        />
                        <button type="button" disabled={adjusting === variant.sku} onClick={() => adjust(product, variant.sku)} className={buttonClass("secondary", "sm", "h-8")}>
                          {adjusting === variant.sku ? <CircleNotchIcon className="size-4 animate-spin" /> : "Lưu"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Logs({ token }: { token: string }) {
  const logs = useAdminApi<ActivityLog[]>("/api/v1/admin/activity-logs?limit=100", token);
  return (
    <Panel title="Nhật ký thao tác quản trị">
      {logs.error ? (
        <ErrorRow message={logs.error} onRetry={logs.reload} />
      ) : logs.loading && !logs.data ? (
        <TableSkeleton />
      ) : !logs.data || logs.data.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-2">Chưa có thao tác nào được ghi nhận.</p>
      ) : (
        <ul className="divide-y divide-line">
          {logs.data.map((log) => (
            <li key={log.id} className="grid gap-1 px-5 py-3 text-sm md:grid-cols-[180px_160px_1fr] md:gap-4">
              <span className="text-ink-3 tabular">{formatDateTime(log.timestamp)}</span>
              <span className="text-ink">
                {log.actor} <span className="text-ink-3">({log.actor_role})</span>
              </span>
              <span className="text-ink-2">
                <span className="font-medium text-ink">{log.action}</span> trên {log.target_type}
                {log.target_id ? ` ${log.target_id}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function AdminDashboard() {
  const { user, token, ready, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const chatUnread = useChatUnread(user && isStaffRole(user.role) ? token : null);

  if (!ready) {
    return (
      <div className={cx(container, "py-16")}>
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  if (!user || !token || !isStaffRole(user.role)) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="w-full max-w-sm text-center">
          <Logo className="justify-center" />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Trang quản trị</h1>
          <p className="mt-2 text-sm text-ink-2">
            {user ? "Tài khoản của bạn không có quyền truy cập khu vực này." : "Đăng nhập bằng tài khoản quản trị viên hoặc nhân viên để tiếp tục."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/login?next=/admin" className={buttonClass("dark", "lg")}>
              {user ? "Đăng nhập tài khoản khác" : "Đăng nhập"}
            </Link>
            <Link href="/" className={buttonClass("ghost", "lg")}>
              Về cửa hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Tổng quan" },
    ...(isAdmin ? [{ id: "analytics" as Tab, label: "Phân tích" }] : []),
    { id: "orders", label: "Đơn hàng" },
    { id: "chat", label: "Tin nhắn" },
    { id: "reviews", label: "Đánh giá" },
    { id: "prices", label: "Giá sản phẩm" },
    { id: "returns", label: "Đổi size" },
    { id: "inventory", label: "Tồn kho" },
    ...(isAdmin ? [{ id: "logs" as Tab, label: "Nhật ký" }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className={cx(container, "flex h-16 items-center gap-4")}>
          <Logo />
          <span className="hidden rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-ink-2 sm:inline">Quản trị</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden text-sm text-ink-2 md:inline">
              {user.full_name} <span className="text-ink-3">({isAdmin ? "Quản trị viên" : "Nhân viên"})</span>
            </span>
            <Link href="/" className={buttonClass("ghost", "sm")}>
              <ArrowSquareOutIcon className="size-4" /> <span className="max-sm:sr-only">Cửa hàng</span>
            </Link>
            <button type="button" onClick={logout} className={buttonClass("ghost", "sm")}>
              <SignOutIcon className="size-4" /> <span className="max-sm:sr-only">Đăng xuất</span>
            </button>
          </div>
        </div>
        <nav aria-label="Khu vực quản trị" className={cx(container, "no-scrollbar flex gap-1 overflow-x-auto")}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cx(
                "relative h-11 shrink-0 px-3 text-sm font-medium transition-colors cursor-pointer",
                tab === t.id ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent" : "text-ink-2 hover:text-ink"
              )}
            >
              {t.label}
              {t.id === "chat" && chatUnread > 0 && (
                <span className="ml-1.5 inline-grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent tabular">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className={cx(container, "py-8")}>
        <h1 className="sr-only">Trang quản trị VÕ SPORT</h1>
        {tab === "overview" && <Overview token={token} isAdmin={isAdmin} onGoOrders={() => setTab("orders")} />}
        {tab === "analytics" && isAdmin && <AnalyticsPanel token={token} />}
        {tab === "orders" && <Orders token={token} />}
        {tab === "chat" && <ChatInbox token={token} />}
        {tab === "reviews" && <ReviewsPanel token={token} />}
        {tab === "prices" && <PricePanel token={token} />}
        {tab === "returns" && <Returns token={token} />}
        {tab === "inventory" && <Inventory token={token} isAdmin={isAdmin} />}
        {tab === "logs" && isAdmin && <Logs token={token} />}
      </main>
    </div>
  );
}
