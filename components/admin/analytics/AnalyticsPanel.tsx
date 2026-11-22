"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon, ArrowsClockwiseIcon, LightbulbIcon, MinusIcon, WarningIcon } from "@phosphor-icons/react";
import { CATEGORIES, MARTIAL_ARTS, SHARED_ART, categoryLabel, martialArtLabel } from "@/lib/catalog";
import { cx, formatVND } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdminApi } from "@/components/admin/useAdminApi";
import {
  CATEGORY_COLOR,
  ChartCard,
  ColumnChart,
  DataTable,
  EmptyChart,
  HBarChart,
  Heatmap,
  Legend,
  SINGLE,
  ScatterChart,
  StackedColumnChart,
  TimeLineChart,
} from "@/components/admin/analytics/charts";
import type { AnalyticsData, Granularity, Metric, ProductRow, Scope } from "@/components/admin/analytics/types";

const fmtInt = (n: number) => Math.round(n).toLocaleString("vi-VN");
const fmtPct = (n: number) => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

const CATEGORY_ORDER = ["vo_phuc", "dai", "bao_ho", "tui_dung", "phu_kien"];
const CATEGORY_NAME: Record<string, string> = { ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])), khac: "Khác" };

/* ----------------------------- Bộ lọc ----------------------------- */

const PRESETS = [
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
  { id: "90d", label: "90 ngày" },
  { id: "mtd", label: "Tháng này" },
  { id: "ytd", label: "Năm nay" },
  { id: "custom", label: "Tùy chọn" },
] as const;
type PresetId = (typeof PRESETS)[number]["id"];

const vnDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
const shiftDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function presetRange(id: PresetId): { start: string; end: string } {
  const end = vnDate(new Date());
  switch (id) {
    case "7d":
      return { start: shiftDays(end, -6), end };
    case "90d":
      return { start: shiftDays(end, -89), end };
    case "mtd":
      return { start: `${end.slice(0, 8)}01`, end };
    case "ytd":
      return { start: `${end.slice(0, 4)}-01-01`, end };
    default:
      return { start: shiftDays(end, -29), end };
  }
}

interface Filters {
  preset: PresetId;
  start: string;
  end: string;
  granularity: "" | Granularity;
  scope: Scope;
  category: string;
  martial_art: string;
  channel: string;
  payment_method: string;
}

const selectClass =
  "h-9 rounded-sm border border-line bg-surface px-2.5 text-sm text-ink hover:border-line-strong focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10 cursor-pointer";

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }> }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-3">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterBar({ filters, setFilters, loading, onReload }: { filters: Filters; setFilters: (f: Filters) => void; loading: boolean; onReload: () => void }) {
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const activeCount = [filters.category, filters.martial_art, filters.channel, filters.payment_method].filter(Boolean).length + (filters.scope === "all" ? 1 : 0);
  return (
    <div className="sticky top-[108px] z-20 -mx-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-md sm:border sm:px-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-3">Khoảng thời gian</span>
          <div className="flex flex-wrap rounded-sm border border-line bg-surface p-0.5" role="group" aria-label="Khoảng thời gian">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={filters.preset === p.id}
                onClick={() => (p.id === "custom" ? set({ preset: "custom" }) : set({ preset: p.id, ...presetRange(p.id) }))}
                className={cx(
                  "h-8 rounded-[3px] px-3 text-[13px] font-medium cursor-pointer",
                  filters.preset === p.id ? "bg-navy text-on-navy" : "text-ink-2 hover:bg-muted hover:text-ink"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {filters.preset === "custom" && (
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-3">Từ ngày</span>
              <input type="date" value={filters.start} max={filters.end} onChange={(e) => e.target.value && set({ start: e.target.value })} className={selectClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-3">Đến ngày</span>
              <input type="date" value={filters.end} min={filters.start} onChange={(e) => e.target.value && set({ end: e.target.value })} className={selectClass} />
            </label>
          </div>
        )}
        <Select
          label="Gom theo"
          value={filters.granularity}
          onChange={(v) => set({ granularity: v as Filters["granularity"] })}
          options={[
            { id: "", label: "Tự động" },
            { id: "day", label: "Ngày" },
            { id: "week", label: "Tuần" },
            { id: "month", label: "Tháng" },
          ]}
        />
        <Select label="Nhóm sản phẩm" value={filters.category} onChange={(v) => set({ category: v })} options={[{ id: "", label: "Tất cả" }, ...CATEGORIES]} />
        <Select label="Môn võ" value={filters.martial_art} onChange={(v) => set({ martial_art: v })} options={[{ id: "", label: "Tất cả" }, ...MARTIAL_ARTS, SHARED_ART]} />
        <Select
          label="Kênh"
          value={filters.channel}
          onChange={(v) => set({ channel: v })}
          options={[
            { id: "", label: "Tất cả" },
            { id: "retail", label: "Bán lẻ" },
            { id: "club", label: "Võ đường" },
          ]}
        />
        <Select
          label="Thanh toán"
          value={filters.payment_method}
          onChange={(v) => set({ payment_method: v })}
          options={[
            { id: "", label: "Tất cả" },
            { id: "COD", label: "COD" },
            { id: "MOMO", label: "MoMo" },
          ]}
        />
        <Select
          label="Tính doanh thu"
          value={filters.scope}
          onChange={(v) => set({ scope: v as Scope })}
          options={[
            { id: "realized", label: "Đơn đã ghi nhận" },
            { id: "all", label: "Mọi đơn chưa hủy" },
          ]}
        />
        <div className="ml-auto flex items-center gap-3">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => set({ category: "", martial_art: "", channel: "", payment_method: "", scope: "realized" })}
              className="text-[13px] font-medium text-accent-text underline-offset-4 hover:underline cursor-pointer"
            >
              Bỏ {activeCount} bộ lọc
            </button>
          )}
          <button
            type="button"
            onClick={onReload}
            aria-label="Tải lại dữ liệu"
            className="grid size-9 place-items-center rounded-sm border border-line bg-surface text-ink-2 hover:text-ink cursor-pointer"
          >
            <ArrowsClockwiseIcon className={cx("size-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Thẻ chỉ số --------------------------- */

function Delta({ metric, invert, suffix = "%" }: { metric: Metric; invert?: boolean; suffix?: string }) {
  if (metric.change_pct === null) {
    return <span className="text-[13px] text-ink-3">{metric.value > 0 ? "Mới phát sinh trong kỳ" : "Chưa có dữ liệu kỳ trước"}</span>;
  }
  const up = metric.change_pct > 0;
  const flat = metric.change_pct === 0;
  const good = flat ? null : invert ? !up : up;
  const Icon = flat ? MinusIcon : up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={cx("inline-flex items-center gap-1 text-[13px] font-medium", good === null ? "text-ink-3" : good ? "text-success" : "text-accent-text")}>
      <Icon weight="bold" className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {metric.change_pct.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
      {suffix}
      <span className="font-normal text-ink-3">so với kỳ trước</span>
    </span>
  );
}

function StatTiles({ data }: { data: AnalyticsData }) {
  const s = data.summary;
  const tiles: Array<{ label: string; value: string; metric: Metric; invert?: boolean; hero?: boolean }> = [
    { label: "Doanh thu bán hàng", value: formatVND(s.revenue.value), metric: s.revenue, hero: true },
    { label: "Đơn hàng", value: fmtInt(s.orders.value), metric: s.orders },
    { label: "Sản phẩm bán ra", value: fmtInt(s.units.value), metric: s.units },
    { label: "Giá trị TB / đơn", value: formatVND(s.avg_order_value.value), metric: s.avg_order_value },
    { label: "Khách hàng", value: fmtInt(s.customers.value), metric: s.customers },
    { label: "Tỷ lệ hủy đơn", value: fmtPct(s.cancel_rate.value), metric: s.cancel_rate, invert: true },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className={cx("flex flex-col gap-1.5 p-5", t.hero ? "bg-navy text-on-navy" : "bg-surface")}>
          <dt className={cx("text-[13px]", t.hero ? "text-on-navy-2" : "text-ink-3")}>{t.label}</dt>
          <dd className={cx("text-2xl font-semibold tracking-tight", t.hero ? "text-on-navy" : "text-ink")}>{t.value}</dd>
          <dd className={cx(t.hero && "[&_*]:!text-on-navy-2")}>
            <Delta metric={t.metric} invert={t.invert} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------- Điểm nổi bật --------------------------- */

const WEEKDAY_NAME = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function Insights({ data }: { data: AnalyticsData }) {
  const items: Array<{ text: ReactNode; warn?: boolean }> = [];
  const sold = data.products.filter((p) => p.units > 0);
  const top = sold[0];
  if (top) items.push({ text: <>Bán chạy nhất: <b>{top.name}</b>, {fmtInt(top.units)} sản phẩm, {formatVND(top.revenue)}.</> });
  const cat = data.by_category.find((c) => c.revenue > 0);
  if (cat) items.push({ text: <>Nhóm <b>{cat.name}</b> chiếm <b>{fmtPct(cat.share)}</b> doanh thu.</> });
  const peakBucket = data.timeseries.reduce<AnalyticsData["timeseries"][number] | null>((b, p) => (!b || p.revenue > b.revenue ? p : b), null);
  if (peakBucket && peakBucket.revenue > 0) items.push({ text: <>Doanh thu cao nhất vào <b>{peakBucket.label}</b>: {formatVND(peakBucket.revenue)}.</> });
  const hot = data.heatmap.reduce<AnalyticsData["heatmap"][number] | null>((b, c) => (!b || c.orders > b.orders ? c : b), null);
  if (hot) items.push({ text: <>Khung giờ đặt nhiều nhất: <b>{WEEKDAY_NAME[hot.weekday]}, {hot.hour}h</b> ({hot.orders} đơn).</> });
  const size = [...data.sizes].sort((a, b) => b.count - a.count)[0];
  if (size) items.push({ text: <>Size võ phục bán nhiều nhất: <b>{size.name}</b> ({fmtInt(size.count)} bộ).</> });
  const unsold = data.products.filter((p) => p.units === 0 && p.stock > 0);
  if (unsold.length && sold.length) items.push({ warn: true, text: <><b>{unsold.length} sản phẩm</b> chưa bán được trong kỳ, đang tồn {fmtInt(unsold.reduce((s, p) => s + p.stock, 0))} cái.</> });
  const outOfStock = data.products.filter((p) => p.stock === 0 && p.units > 0);
  if (outOfStock.length) items.push({ warn: true, text: <>Hết hàng nhưng đang có nhu cầu: <b>{outOfStock.map((p) => p.name).join(", ")}</b>.</> });
  if (data.summary.cancel_rate.value >= 15) items.push({ warn: true, text: <>Tỷ lệ hủy đơn cao: <b>{fmtPct(data.summary.cancel_rate.value)}</b>.</> });

  if (items.length === 0) return null;
  return (
    <section className="rounded-md border border-line bg-band px-5 py-4" aria-labelledby="insight-title">
      <h3 id="insight-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <LightbulbIcon weight="fill" className="size-4 text-warning" aria-hidden /> Điểm nổi bật trong kỳ
      </h3>
      <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-ink-2 md:grid-cols-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            {it.warn ? (
              <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0 text-accent" aria-label="Cần chú ý" />
            ) : (
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-3" aria-hidden />
            )}
            <span className="[&_b]:font-semibold [&_b]:text-ink">{it.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------- Bảng sản phẩm -------------------------- */

type SortKey = "revenue" | "units" | "avg_price" | "stock" | "sell_through";

function ProductTable({ products }: { products: ProductRow[] }) {
  const [sort, setSort] = useState<SortKey>("revenue");
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      products
        .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => b[sort] - a[sort]),
    [products, sort, query]
  );
  const maxRevenue = Math.max(...products.map((p) => p.revenue), 1);
  const topIds = new Set(products.filter((p) => p.revenue > 0).slice(0, 3).map((p) => p.product_id));
  const head = (key: SortKey, label: string) => (
    <th className="py-2.5 pr-3 text-right font-medium">
      <button type="button" onClick={() => setSort(key)} className={cx("cursor-pointer", sort === key ? "text-ink" : "hover:text-ink")} aria-pressed={sort === key}>
        {label}
        {sort === key ? " ↓" : ""}
      </button>
    </th>
  );

  return (
    <section className="rounded-md border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Hiệu quả từng sản phẩm</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">Bấm tiêu đề cột để sắp xếp. Tỷ lệ bán hết = đã bán / (đã bán + tồn kho).</p>
        </div>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm sản phẩm" className={cx(selectClass, "w-56 cursor-text")} aria-label="Tìm sản phẩm" />
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-ink-3">
              <th className="py-2.5 pr-3 pl-5 font-medium">Sản phẩm</th>
              <th className="py-2.5 pr-3 font-medium">Nhóm</th>
              {head("units", "Đã bán")}
              {head("revenue", "Doanh thu")}
              {head("avg_price", "Giá bán TB")}
              {head("stock", "Tồn kho")}
              {head("sell_through", "Tỷ lệ bán hết")}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.product_id} className={cx(topIds.has(p.product_id) && "bg-muted/60")}>
                <td className="py-2.5 pr-3 pl-5">
                  <div className="flex items-center gap-2">
                    {topIds.has(p.product_id) && <span className="rounded-sm bg-navy px-1.5 py-0.5 text-[10px] font-bold text-on-navy uppercase">Top</span>}
                    <span className="font-medium text-ink">{p.name}</span>
                  </div>
                  <span className="text-xs text-ink-3">{martialArtLabel(p.martial_art_id) || "Khác"}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1.5 text-ink-2">
                    <span className="size-2.5 rounded-[2px]" style={{ background: CATEGORY_COLOR[p.category_id] ?? CATEGORY_COLOR.khac }} aria-hidden />
                    {categoryLabel(p.category_id) || "Khác"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right text-ink tabular">{fmtInt(p.units)}</td>
                <td className="py-2.5 pr-3 text-right tabular">
                  <div className="flex items-center justify-end gap-2">
                    <span className="hidden h-1.5 w-16 rounded-r-[3px] bg-muted sm:block" aria-hidden>
                      <span className="block h-full rounded-r-[3px]" style={{ width: `${(p.revenue / maxRevenue) * 100}%`, background: SINGLE }} />
                    </span>
                    <span className="font-medium text-ink">{formatVND(p.revenue)}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right text-ink-2 tabular">{formatVND(p.avg_price)}</td>
                <td className={cx("py-2.5 pr-3 text-right tabular", p.stock === 0 ? "font-semibold text-accent-text" : "text-ink-2")}>
                  {p.stock === 0 ? "Hết hàng" : fmtInt(p.stock)}
                </td>
                <td className="py-2.5 pr-5 text-right tabular text-ink-2">{fmtPct(p.sell_through)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-ink-3">
                  Không có sản phẩm phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ----------------------------- Trang ----------------------------- */

function buildPath(f: Filters): string {
  const params = new URLSearchParams({ start: f.start, end: f.end, scope: f.scope });
  if (f.granularity) params.set("granularity", f.granularity);
  if (f.category) params.set("category", f.category);
  if (f.martial_art) params.set("martial_art", f.martial_art);
  if (f.channel) params.set("channel", f.channel);
  if (f.payment_method) params.set("payment_method", f.payment_method);
  return `/api/v1/analytics/dashboard?${params.toString()}`;
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton className="h-[120px]" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[340px] lg:col-span-2" />
        <Skeleton className="h-[340px]" />
      </div>
      <Skeleton className="h-[320px]" />
    </div>
  );
}

export function AnalyticsPanel({ token }: { token: string }) {
  const [filters, setFilters] = useState<Filters>(() => ({
    preset: "30d",
    ...presetRange("30d"),
    granularity: "",
    scope: "realized",
    category: "",
    martial_art: "",
    channel: "",
    payment_method: "",
  }));
  const { data, error, loading, reload } = useAdminApi<AnalyticsData>(buildPath(filters), token);
  const toggle = (key: "category" | "martial_art") => (id: string) => setFilters({ ...filters, [key]: filters[key] === id ? "" : id });

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <FilterBar filters={filters} setFilters={setFilters} loading={loading} onReload={reload} />
        {error ? (
          <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface px-5 py-6 text-sm text-ink-2">
            <span className="flex items-center gap-2">
              <WarningIcon className="size-4 text-accent" aria-hidden /> {error}
            </span>
            <button type="button" onClick={reload} className="font-medium text-ink underline underline-offset-4 cursor-pointer">
              Thử lại
            </button>
          </div>
        ) : (
          <LoadingState />
        )}
      </div>
    );
  }

  const ts = data.timeseries;
  const periodText = `${data.filters.start.split("-").reverse().join("/")} - ${data.filters.end.split("-").reverse().join("/")}`;
  const gLabel = { day: "ngày", week: "tuần", month: "tháng" }[data.filters.granularity];
  const presentCats = [...CATEGORY_ORDER, "khac"].filter((id) => ts.some((p) => (p.units_by_category[id] ?? 0) > 0));
  const stackSeries = presentCats.map((id) => ({ id, name: CATEGORY_NAME[id] ?? id, color: CATEGORY_COLOR[id], values: ts.map((p) => p.units_by_category[id] ?? 0) }));
  const hasSales = data.summary.orders.value > 0;
  const scatterPoints = data.products.map((p) => ({
    id: p.product_id,
    label: p.name,
    x: p.avg_price,
    y: p.units,
    color: CATEGORY_COLOR[p.category_id] ?? CATEGORY_COLOR.khac,
    hollow: p.units === 0,
    detail: [
      { label: "giá bán TB", value: formatVND(p.avg_price) },
      { label: "đã bán", value: fmtInt(p.units) },
      { label: "doanh thu", value: formatVND(p.revenue) },
      { label: "tồn kho", value: fmtInt(p.stock) },
    ],
  }));
  // Phân tán tối đa 3 màu nhóm (giới hạn phân biệt màu); nhiều hơn thì dùng một màu, nhóm xem ở tooltip
  const scatterCats = [...new Set(data.products.map((p) => p.category_id))];
  const scatterSingle = scatterCats.length > 3;
  const scatter = scatterSingle ? scatterPoints.map((p) => ({ ...p, color: SINGLE })) : scatterPoints;
  const annotate = data.products.filter((p) => p.units > 0).slice(0, 3).map((p) => p.product_id);
  const cancelled = data.statuses.find((s) => s.id === "cancelled");

  return (
    <div className="flex flex-col gap-6">
      <FilterBar filters={filters} setFilters={setFilters} loading={loading} onReload={reload} />
      {error && (
        <p className="flex items-center gap-2 text-sm text-accent-text" role="alert">
          <WarningIcon className="size-4" aria-hidden /> {error}. Đang hiển thị dữ liệu lần tải trước.
        </p>
      )}

      {/* Khi tải lại: giữ khung cũ, làm mờ thay vì nhấp nháy */}
      <div className={cx("flex flex-col gap-6 transition-opacity duration-300", loading && "opacity-55")} aria-busy={loading}>
        <p className="text-[13px] text-ink-3">
          Kỳ phân tích {periodText}, so với cùng số ngày liền trước. Doanh thu bán hàng = tiền hàng + phí thêu, chưa gồm phí ship và giảm giá.
        </p>
        <StatTiles data={data} />
        {hasSales ? <Insights data={data} /> : (
          <div className="rounded-md border border-dashed border-line-strong bg-surface px-5 py-6 text-sm text-ink-2">
            Chưa có đơn hàng {data.filters.scope === "realized" ? "đã ghi nhận doanh thu " : ""}trong khoảng đã chọn. Thử mở rộng thời gian hoặc chọn &quot;Mọi đơn chưa hủy&quot;.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <ChartCard
            className="lg:col-span-2"
            title="Doanh thu theo thời gian"
            subtitle={`Theo ${gLabel}, đường nét đứt là kỳ trước cùng độ dài`}
            legend={<Legend items={[{ label: "Kỳ này", color: "var(--series-1)", shape: "line" }, { label: "Kỳ trước", color: "var(--series-compare)", shape: "dashed" }]} />}
            table={
              <DataTable
                columns={[{ label: "Kỳ" }, { label: "Doanh thu", align: "right" }, { label: "Kỳ trước", align: "right" }, { label: "Đơn", align: "right" }, { label: "Sản phẩm", align: "right" }]}
                rows={ts.map((p) => [p.label, formatVND(p.revenue), formatVND(p.previous_revenue), fmtInt(p.orders), fmtInt(p.units)])}
              />
            }
          >
            <TimeLineChart
              valueLabel="kỳ này"
              compareLabel="kỳ trước"
              points={ts.map((p) => ({
                label: p.label,
                value: p.revenue,
                compare: p.previous_revenue,
                extra: [
                  { label: "đơn hàng", value: fmtInt(p.orders) },
                  { label: "sản phẩm", value: fmtInt(p.units) },
                ],
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Doanh thu theo nhóm sản phẩm"
            subtitle="Bấm một nhóm để lọc toàn trang"
            table={
              <DataTable
                columns={[{ label: "Nhóm" }, { label: "Doanh thu", align: "right" }, { label: "Tỷ trọng", align: "right" }, { label: "Đã bán", align: "right" }]}
                rows={data.by_category.map((c) => [c.name, formatVND(c.revenue), fmtPct(c.share), fmtInt(c.units)])}
              />
            }
          >
            <HBarChart
              selectedId={filters.category || null}
              onSelect={toggle("category")}
              rows={data.by_category.map((c) => ({
                id: c.id,
                label: c.name,
                value: c.revenue,
                display: c.revenue > 0 ? `${formatVND(c.revenue)} · ${fmtPct(c.share)}` : "0₫",
                color: CATEGORY_COLOR[c.id] ?? CATEGORY_COLOR.khac,
                detail: [
                  { label: "doanh thu", value: formatVND(c.revenue) },
                  { label: "sản phẩm bán ra", value: fmtInt(c.units) },
                  { label: "đơn có nhóm này", value: fmtInt(c.orders) },
                ],
              }))}
            />
          </ChartCard>
        </div>

        <ChartCard
          title="Lượt bán theo nhóm sản phẩm"
          subtitle={`Số sản phẩm bán ra mỗi ${gLabel}, cột chồng theo nhóm`}
          legend={stackSeries.length > 0 ? <Legend items={stackSeries.map((s) => ({ label: s.name, color: s.color }))} /> : undefined}
          table={
            <DataTable
              columns={[{ label: "Kỳ" }, ...stackSeries.map((s) => ({ label: s.name, align: "right" as const })), { label: "Tổng", align: "right" }]}
              rows={ts.map((p, i) => [p.label, ...stackSeries.map((s) => fmtInt(s.values[i])), fmtInt(p.units)])}
            />
          }
        >
          {stackSeries.length ? <StackedColumnChart labels={ts.map((p) => p.label)} series={stackSeries} /> : <EmptyChart height={260} />}
        </ChartCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Giá bán và lượt bán từng sản phẩm"
            subtitle="Mỗi chấm là một sản phẩm; chấm rỗng là chưa bán được. Nằm trên đường trung bình = bán tốt."
            legend={
              <Legend
                items={[
                  ...(scatterSingle
                    ? [{ label: "Sản phẩm đã bán", color: SINGLE, shape: "dot" as const }]
                    : scatterCats.map((c) => ({ label: CATEGORY_NAME[c] ?? c, color: CATEGORY_COLOR[c] ?? CATEGORY_COLOR.khac, shape: "dot" as const }))),
                  { label: "Chưa bán", color: "var(--chart-muted)", shape: "ring" as const },
                ]}
              />
            }
            table={
              <DataTable
                columns={[{ label: "Sản phẩm" }, { label: "Giá TB", align: "right" }, { label: "Đã bán", align: "right" }]}
                rows={data.products.map((p) => [p.name, formatVND(p.avg_price), fmtInt(p.units)])}
              />
            }
          >
            {scatter.length ? <ScatterChart points={scatter} annotate={annotate} xLabel="Giá bán trung bình" yLabel="Số lượng đã bán" /> : <EmptyChart height={300} />}
          </ChartCard>

          <ChartCard
            title="Doanh thu theo môn võ"
            subtitle="Bấm một môn để lọc toàn trang"
            table={
              <DataTable
                columns={[{ label: "Môn võ" }, { label: "Doanh thu", align: "right" }, { label: "Tỷ trọng", align: "right" }, { label: "Đơn", align: "right" }]}
                rows={data.by_martial_art.map((r) => [r.name, formatVND(r.revenue), fmtPct(r.share), fmtInt(r.orders)])}
              />
            }
          >
            <HBarChart
              selectedId={filters.martial_art || null}
              onSelect={toggle("martial_art")}
              rows={data.by_martial_art.map((r) => ({
                id: r.id,
                label: r.name,
                value: r.revenue,
                display: r.revenue > 0 ? `${formatVND(r.revenue)} · ${fmtPct(r.share)}` : "0₫",
                detail: [
                  { label: "doanh thu", value: formatVND(r.revenue) },
                  { label: "sản phẩm bán ra", value: fmtInt(r.units) },
                  { label: "đơn hàng", value: fmtInt(r.orders) },
                ],
              }))}
            />
          </ChartCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ChartCard
            title="Size võ phục bán ra"
            subtitle="Giúp lên kế hoạch nhập hàng theo size"
            table={<DataTable columns={[{ label: "Size" }, { label: "Số bộ", align: "right" }, { label: "Doanh thu", align: "right" }]} rows={data.sizes.map((s) => [s.name, fmtInt(s.count), formatVND(s.revenue)])} />}
          >
            {data.sizes.length ? (
              <ColumnChart unit="bộ" rows={data.sizes.map((s) => ({ id: s.id, label: s.name.replace("Size ", "S"), value: s.count, detail: formatVND(s.revenue) }))} />
            ) : (
              <EmptyChart height={220} message="Chưa bán võ phục trong kỳ" />
            )}
          </ChartCard>

          <ChartCard
            title="Trạng thái đơn hàng"
            subtitle={cancelled ? `${fmtInt(cancelled.count)} đơn bị hủy trong kỳ` : "Mọi đơn tạo trong kỳ"}
            table={<DataTable columns={[{ label: "Trạng thái" }, { label: "Số đơn", align: "right" }]} rows={data.statuses.map((s) => [s.name, fmtInt(s.count)])} />}
          >
            <HBarChart
              emptyMessage="Chưa có đơn trong kỳ"
              rows={data.statuses.map((s) => ({
                id: s.id,
                label: s.id === "cancelled" ? `${s.name} (cần xem lại)` : s.name,
                value: s.count,
                display: `${fmtInt(s.count)} đơn`,
                critical: s.id === "cancelled",
                detail: [{ label: "giá trị hàng", value: formatVND(s.revenue) }],
              }))}
            />
          </ChartCard>

          <ChartCard
            title="Thanh toán & khu vực"
            subtitle="Theo số đơn đã ghi nhận"
            table={
              <DataTable
                columns={[{ label: "Mục" }, { label: "Đơn", align: "right" }, { label: "Doanh thu", align: "right" }]}
                rows={[...data.payment_methods, ...data.provinces].map((r) => [r.name, fmtInt(r.count), formatVND(r.revenue)])}
              />
            }
          >
            <div className="flex flex-col gap-6">
              <HBarChart
                emptyMessage="Chưa có đơn"
                rows={data.payment_methods.map((r) => ({ id: r.id, label: r.name, value: r.count, display: `${fmtInt(r.count)} đơn`, detail: [{ label: "doanh thu", value: formatVND(r.revenue) }] }))}
              />
              {data.provinces.length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs font-medium text-ink-3 uppercase">Tỉnh / thành nhiều đơn nhất</p>
                  <HBarChart
                    rows={data.provinces.slice(0, 5).map((r) => ({ id: r.id, label: r.name, value: r.revenue, display: formatVND(r.revenue), detail: [{ label: "đơn hàng", value: fmtInt(r.count) }] }))}
                  />
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        <ChartCard title="Giờ đặt hàng trong tuần" subtitle="Ô càng đậm càng nhiều đơn; dùng để chọn giờ chạy khuyến mãi, trực tư vấn">
          <Heatmap cells={data.heatmap} />
        </ChartCard>

        <ProductTable products={data.products} />
      </div>
    </div>
  );
}
