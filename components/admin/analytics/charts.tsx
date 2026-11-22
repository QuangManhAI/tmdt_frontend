"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx, formatVND, formatVNDShort } from "@/lib/format";

/*
  Bộ biểu đồ SVG/HTML tự viết cho trang phân tích (không phụ thuộc thư viện).
  Quy ước: nét mảnh, đầu cột bo 4px bám đường gốc, khe 2px màu nền giữa các khối,
  lưới mờ, một trục y duy nhất, mọi giá trị đều có tooltip khi rê chuột / focus bàn phím.
  Màu lấy từ token --series-* trong globals.css; chữ luôn dùng màu chữ, không dùng màu series.
*/

export const CATEGORY_COLOR: Record<string, string> = {
  vo_phuc: "var(--series-1)",
  dai: "var(--series-2)",
  bao_ho: "var(--series-3)",
  tui_dung: "var(--series-4)",
  phu_kien: "var(--series-5)",
  khac: "var(--series-other)",
};
export const SINGLE = "var(--series-single)";

const fmtInt = (n: number) => Math.round(n).toLocaleString("vi-VN");

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

/** Cột bo 4px ở đầu (phía xa đường gốc), góc sát đường gốc vuông. */
function topRoundedRect(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0 || w <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/* ------------------------------------------------------------------ */
/* Khung dùng chung                                                    */
/* ------------------------------------------------------------------ */

export function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const tipW = 220;
  const left = Math.max(0, Math.min(x + 14, width - tipW));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-[220px] rounded-md border border-line bg-surface px-3 py-2.5 text-[13px] shadow-lift"
      style={{ left, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  );
}

export function TipRow({ color, dashed, label, value }: { color?: string; dashed?: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {color && (
        <svg width="14" height="4" aria-hidden className="shrink-0">
          <line x1="0" y1="2" x2="14" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "3 2" : undefined} strokeLinecap="round" />
        </svg>
      )}
      <span className="font-semibold text-ink tabular">{value}</span>
      <span className="truncate text-ink-3">{label}</span>
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string; shape?: "rect" | "line" | "dashed" | "dot" | "ring" }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <svg width="14" height="10" aria-hidden>
            {it.shape === "line" || it.shape === "dashed" ? (
              <line x1="0" y1="5" x2="14" y2="5" stroke={it.color} strokeWidth="2" strokeDasharray={it.shape === "dashed" ? "3 2" : undefined} />
            ) : it.shape === "dot" ? (
              <circle cx="7" cy="5" r="4" fill={it.color} />
            ) : it.shape === "ring" ? (
              <circle cx="7" cy="5" r="3.5" fill="none" stroke={it.color} strokeWidth="1.5" />
            ) : (
              <rect x="1" y="0" width="12" height="10" rx="2" fill={it.color} />
            )}
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** Thẻ biểu đồ có nút chuyển sang bảng số liệu (để đọc được mà không cần màu / tooltip). */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  table?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={cx("flex min-w-0 flex-col rounded-md border border-line bg-surface", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
        </div>
        {table && (
          <div className="flex shrink-0 rounded-sm border border-line p-0.5 text-xs font-medium" role="group" aria-label="Kiểu hiển thị">
            {(["Biểu đồ", "Bảng"] as const).map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={showTable === (i === 1)}
                onClick={() => setShowTable(i === 1)}
                className={cx("rounded-[3px] px-2 py-1 cursor-pointer", showTable === (i === 1) ? "bg-navy text-on-navy" : "text-ink-2 hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>
      {legend && !showTable && <div className="px-5 pt-3">{legend}</div>}
      <div className="min-w-0 flex-1 px-5 pt-3 pb-5">{showTable && table ? table : children}</div>
    </section>
  );
}

export function DataTable({ columns, rows }: { columns: Array<{ label: string; align?: "right" }>; rows: Array<Array<ReactNode>> }) {
  return (
    <div className="max-h-[320px] overflow-auto">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line text-left text-ink-3">
            {columns.map((c) => (
              <th key={c.label} className={cx("py-2 pr-3 font-medium", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={cx("py-2 pr-3 text-ink", columns[j]?.align === "right" && "text-right tabular")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyChart({ height = 220, message = "Chưa có dữ liệu trong khoảng đã chọn" }: { height?: number; message?: string }) {
  return (
    <div className="grid place-items-center rounded-sm bg-muted/60 text-center text-[13px] text-ink-3" style={{ height }}>
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Đường theo thời gian: kỳ này vs kỳ trước, có crosshair              */
/* ------------------------------------------------------------------ */

export interface LinePoint {
  label: string;
  value: number;
  compare: number;
  extra?: Array<{ label: string; value: string }>;
}

export function TimeLineChart({ points, height = 260, valueLabel, compareLabel }: { points: LinePoint[]; height?: number; valueLabel: string; compareLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const m = { top: 20, right: 12, bottom: 28, left: 52 };
  const innerW = Math.max(0, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const max = niceMax(Math.max(...points.map((p) => Math.max(p.value, p.compare)), 0));
  const n = points.length;
  const x = (i: number) => m.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => m.top + innerH - (v / max) * innerH;
  const path = (key: "value" | "compare") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
  const peak = points.reduce((best, p, i) => (p.value > (points[best]?.value ?? -1) ? i : best), 0);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 64))));

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - m.left;
    setActive(Math.max(0, Math.min(n - 1, Math.round(n <= 1 ? 0 : (rel / innerW) * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    if (e.key === "Escape") setActive(null);
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Biểu đồ đường ${valueLabel} so với ${compareLabel}`}>
          {ticks(max).map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} strokeWidth="1" />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--chart-muted)] text-[11px] tabular">
                {formatVNDShort(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[var(--chart-muted)] text-[11px] tabular">
                {p.label}
              </text>
            ) : null
          )}
          <path d={path("compare")} fill="none" stroke="var(--series-compare)" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" />
          <path d={`${path("value")}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill="var(--series-1)" opacity="0.08" />
          <path d={path("value")} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points[peak]?.value > 0 && (
            <g>
              <circle cx={x(peak)} cy={y(points[peak].value)} r="4.5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
              <text
                x={Math.min(Math.max(x(peak), m.left + 40), width - m.right - 40)}
                y={y(points[peak].value) - 10}
                textAnchor="middle"
                className="fill-[var(--ink)] text-[11px] font-semibold"
              >
                Cao nhất {formatVNDShort(points[peak].value)}
              </text>
            </g>
          )}
          {active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={m.top} y2={m.top + innerH} stroke="var(--chart-axis)" strokeWidth="1" />
              <circle cx={x(active)} cy={y(points[active].compare)} r="4" fill="var(--series-compare)" stroke="var(--surface)" strokeWidth="2" />
              <circle cx={x(active)} cy={y(points[active].value)} r="4.5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
            </g>
          )}
          <rect
            x={m.left}
            y={m.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            tabIndex={0}
            aria-label="Rê chuột hoặc dùng phím mũi tên để xem từng mốc thời gian"
            className="outline-none focus-visible:stroke-[var(--accent)]"
            onPointerMove={(e) => pick(e.clientX, e.currentTarget.ownerSVGElement!.getBoundingClientRect())}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((a) => a ?? n - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={onKey}
          />
        </svg>
      )}
      {active !== null && points[active] && (
        <Tooltip x={x(active)} y={m.top} width={width}>
          <p className="mb-1 font-medium text-ink-2">{points[active].label}</p>
          <TipRow color="var(--series-1)" label={valueLabel} value={formatVND(points[active].value)} />
          <TipRow color="var(--series-compare)" dashed label={compareLabel} value={formatVND(points[active].compare)} />
          {points[active].extra?.map((e) => (
            <TipRow key={e.label} label={e.label} value={e.value} />
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cột chồng theo thời gian (lượt bán theo nhóm sản phẩm)              */
/* ------------------------------------------------------------------ */

export function StackedColumnChart({
  labels,
  series,
  height = 260,
  unit = "sp",
}: {
  labels: string[];
  series: Array<{ id: string; name: string; color: string; values: number[] }>;
  height?: number;
  unit?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const m = { top: 12, right: 8, bottom: 28, left: 40 };
  const innerW = Math.max(0, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const totals = labels.map((_, i) => series.reduce((s, se) => s + (se.values[i] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const slot = labels.length ? innerW / labels.length : 0;
  const barW = Math.max(2, Math.min(36, slot * 0.68));
  const y = (v: number) => (v / max) * innerH;
  const labelEvery = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(innerW / 64))));

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Biểu đồ cột chồng số sản phẩm bán ra theo nhóm">
          {ticks(max).map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={m.top + innerH - y(t)} y2={m.top + innerH - y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
              <text x={m.left - 8} y={m.top + innerH - y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--chart-muted)] text-[11px] tabular">
                {fmtInt(t)}
              </text>
            </g>
          ))}
          {labels.map((label, i) => {
            const cx0 = m.left + slot * i + (slot - barW) / 2;
            let acc = 0;
            const segs = series.filter((s) => (s.values[i] ?? 0) > 0);
            return (
              <g
                key={label + i}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                tabIndex={totals[i] > 0 ? 0 : -1}
                aria-label={`${label}: ${fmtInt(totals[i])} ${unit}`}
                className="outline-none"
              >
                <rect x={m.left + slot * i} y={m.top} width={slot} height={innerH} fill={active === i ? "var(--chart-grid)" : "transparent"} opacity="0.45" />
                {segs.map((s, k) => {
                  const h = y(s.values[i]);
                  const top = m.top + innerH - acc - h;
                  acc += h;
                  const isTop = k === segs.length - 1;
                  // khe 2px màu nền giữa các khối chồng
                  const gap = k > 0 ? 2 : 0;
                  return isTop ? (
                    <path key={s.id} d={topRoundedRect(cx0, top, barW, Math.max(0, h - gap))} fill={s.color} />
                  ) : (
                    <rect key={s.id} x={cx0} y={top} width={barW} height={Math.max(0, h - gap)} fill={s.color} />
                  );
                })}
                {i % labelEvery === 0 && (
                  <text x={cx0 + barW / 2} y={height - 8} textAnchor="middle" className="fill-[var(--chart-muted)] text-[11px] tabular">
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && (
        <Tooltip x={m.left + slot * active + slot / 2} y={m.top} width={width}>
          <p className="mb-1 font-medium text-ink-2">
            {labels[active]}: {fmtInt(totals[active])} {unit}
          </p>
          {series.map((s) => (
            <TipRow key={s.id} color={s.color} label={s.name} value={fmtInt(s.values[active] ?? 0)} />
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thanh ngang xếp hạng (nhóm sản phẩm, môn võ, tỉnh thành...)         */
/* ------------------------------------------------------------------ */

export interface BarRow {
  id: string;
  label: string;
  value: number;
  display: string;
  color?: string;
  detail?: Array<{ label: string; value: string }>;
  critical?: boolean;
}

export function HBarChart({
  rows,
  onSelect,
  selectedId,
  emptyMessage,
}: {
  rows: BarRow[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  emptyMessage?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0 || max === 0) return <EmptyChart height={160} message={emptyMessage} />;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const dim = selectedId && selectedId !== r.id;
        const Tag = onSelect ? "button" : "div";
        return (
          <li key={r.id} className="relative">
            <Tag
              {...(onSelect ? { type: "button" as const, onClick: () => onSelect(r.id), "aria-pressed": selectedId === r.id } : { tabIndex: 0 })}
              onPointerEnter={() => setHover(r.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(r.id)}
              onBlur={() => setHover(null)}
              className={cx("group block w-full text-left outline-none", onSelect && "cursor-pointer", dim && "opacity-45")}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-ink">
                  {r.critical && <span className="font-bold text-[var(--chart-critical)]" aria-hidden>!</span>}
                  {r.label}
                </span>
                <span className="shrink-0 font-semibold text-ink tabular">{r.display}</span>
              </div>
              <div className="h-2.5 rounded-r-[4px] bg-muted">
                <div
                  className={cx("h-full rounded-r-[4px] transition-[width,filter] duration-500 ease-out-soft", hover === r.id && "brightness-110")}
                  style={{ width: `${Math.max(r.value > 0 ? 1.5 : 0, (r.value / max) * 100)}%`, background: r.critical ? "var(--chart-critical)" : r.color ?? SINGLE }}
                />
              </div>
            </Tag>
            {hover === r.id && r.detail && (
              <div role="status" className="pointer-events-none absolute top-full right-0 z-10 mt-1 w-[220px] rounded-md border border-line bg-surface px-3 py-2.5 text-[13px] shadow-lift">
                <p className="mb-1 font-medium text-ink-2">{r.label}</p>
                {r.detail.map((d) => (
                  <TipRow key={d.label} label={d.label} value={d.value} />
                ))}
                {onSelect && <p className="mt-1 text-xs text-ink-3">{selectedId === r.id ? "Bấm để bỏ lọc" : "Bấm để lọc theo mục này"}</p>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Cột dọc (phân bố size)                                              */
/* ------------------------------------------------------------------ */

export function ColumnChart({ rows, height = 220, unit = "sp" }: { rows: Array<{ id: string; label: string; value: number; detail?: string }>; height?: number; unit?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const m = { top: 22, right: 4, bottom: 26, left: 4 };
  const innerW = Math.max(0, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const maxVal = Math.max(...rows.map((r) => r.value), 0);
  const max = niceMax(maxVal);
  const slot = rows.length ? innerW / rows.length : 0;
  const barW = Math.max(4, Math.min(44, slot - 2));
  const peak = rows.findIndex((r) => r.value === maxVal && maxVal > 0);

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Biểu đồ cột">
          <line x1={m.left} x2={width - m.right} y1={m.top + innerH} y2={m.top + innerH} stroke="var(--chart-axis)" />
          {rows.map((r, i) => {
            const h = (r.value / max) * innerH;
            const x0 = m.left + slot * i + (slot - barW) / 2;
            return (
              <g
                key={r.id}
                tabIndex={0}
                className="outline-none"
                aria-label={`${r.label}: ${fmtInt(r.value)} ${unit}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <rect x={m.left + slot * i} y={m.top} width={slot} height={innerH} fill="transparent" />
                <path d={topRoundedRect(x0, m.top + innerH - h, barW, h)} fill={SINGLE} opacity={active === null || active === i ? 1 : 0.55} />
                {i === peak && (
                  <text x={x0 + barW / 2} y={m.top + innerH - h - 6} textAnchor="middle" className="fill-[var(--ink)] text-[11px] font-semibold tabular">
                    {fmtInt(r.value)}
                  </text>
                )}
                <text x={x0 + barW / 2} y={height - 8} textAnchor="middle" className="fill-[var(--chart-muted)] text-[11px]">
                  {r.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && rows[active] && (
        <Tooltip x={m.left + slot * active + slot / 2} y={m.top} width={width}>
          <TipRow label={`${rows[active].label} (${unit})`} value={fmtInt(rows[active].value)} />
          {rows[active].detail && <p className="text-ink-3">{rows[active].detail}</p>}
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phân tán: giá bán vs lượt bán của từng sản phẩm                     */
/* ------------------------------------------------------------------ */

export interface ScatterPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  hollow?: boolean;
  detail: Array<{ label: string; value: string }>;
}

export function ScatterChart({ points, height = 300, xLabel, yLabel, annotate = [] }: { points: ScatterPoint[]; height?: number; xLabel: string; yLabel: string; annotate?: string[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<string | null>(null);
  const m = { top: 16, right: 16, bottom: 40, left: 44 };
  const innerW = Math.max(0, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const maxX = niceMax(Math.max(...points.map((p) => p.x), 0));
  const maxY = niceMax(Math.max(...points.map((p) => p.y), 0));
  const sx = (v: number) => m.left + (v / maxX) * innerW;
  const sy = (v: number) => m.top + innerH - (v / maxY) * innerH;
  const avgY = points.length ? points.reduce((s, p) => s + p.y, 0) / points.length : 0;
  const act = points.find((p) => p.id === active);

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Biểu đồ phân tán ${yLabel} theo ${xLabel}`}>
          {ticks(maxY).map((t) => (
            <g key={`y${t}`}>
              <line x1={m.left} x2={width - m.right} y1={sy(t)} y2={sy(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} />
              <text x={m.left - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-[var(--chart-muted)] text-[11px] tabular">
                {fmtInt(t)}
              </text>
            </g>
          ))}
          {ticks(maxX).map((t) => (
            <text key={`x${t}`} x={sx(t)} y={m.top + innerH + 16} textAnchor="middle" className="fill-[var(--chart-muted)] text-[11px] tabular">
              {formatVNDShort(t)}
            </text>
          ))}
          <text x={m.left + innerW / 2} y={height - 4} textAnchor="middle" className="fill-[var(--chart-muted)] text-[11px]">
            {xLabel}
          </text>
          {avgY > 0 && (
            <g>
              <line x1={m.left} x2={width - m.right} y1={sy(avgY)} y2={sy(avgY)} stroke="var(--chart-muted)" strokeDasharray="4 3" />
              <text x={width - m.right} y={sy(avgY) - 5} textAnchor="end" className="fill-[var(--chart-muted)] text-[11px]">
                Trung bình {avgY.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
              </text>
            </g>
          )}
          {points.map((p) => (
            <g
              key={p.id}
              tabIndex={0}
              className="outline-none"
              aria-label={`${p.label}: ${p.detail.map((d) => `${d.label} ${d.value}`).join(", ")}`}
              onPointerEnter={() => setActive(p.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(p.id)}
              onBlur={() => setActive(null)}
            >
              <circle cx={sx(p.x)} cy={sy(p.y)} r="12" fill="transparent" />
              <circle
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={active === p.id ? 6 : 4.5}
                fill={p.hollow ? "var(--surface)" : p.color}
                stroke={p.hollow ? p.color : "var(--surface)"}
                strokeWidth="2"
              />
            </g>
          ))}
          {points
            .filter((p) => annotate.includes(p.id))
            .map((p) => {
              const right = sx(p.x) > m.left + innerW * 0.7;
              return (
                <text
                  key={`l${p.id}`}
                  x={sx(p.x) + (right ? -9 : 9)}
                  y={sy(p.y)}
                  dy="0.32em"
                  textAnchor={right ? "end" : "start"}
                  className="pointer-events-none fill-[var(--ink)] text-[11px] font-medium"
                >
                  {p.label.length > 26 ? `${p.label.slice(0, 25)}…` : p.label}
                </text>
              );
            })}
        </svg>
      )}
      {act && (
        <Tooltip x={sx(act.x)} y={sy(act.y)} width={width}>
          <p className="mb-1 font-medium text-ink">{act.label}</p>
          {act.detail.map((d) => (
            <TipRow key={d.label} label={d.label} value={d.value} />
          ))}
        </Tooltip>
      )}
      <p className="sr-only">Trục dọc: {yLabel}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bản đồ nhiệt: thứ trong tuần × giờ đặt hàng                         */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const SEQ = ["var(--seq-0)", "var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)"];

export function Heatmap({ cells }: { cells: Array<{ weekday: number; hour: number; orders: number }> }) {
  const [active, setActive] = useState<{ w: number; h: number } | null>(null);
  const grid = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c.orders]));
  const max = Math.max(...cells.map((c) => c.orders), 0);
  const step = (v: number) => (v <= 0 ? 0 : Math.min(5, Math.ceil((v / max) * 5)));
  const value = active ? grid.get(`${active.w}-${active.h}`) ?? 0 : 0;

  if (max === 0) return <EmptyChart height={200} />;
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] gap-[2px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }}>
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center text-[10px] text-ink-3 tabular">
              {h % 3 === 0 ? `${h}h` : ""}
            </span>
          ))}
          {WEEKDAYS.map((d, w) => (
            <div key={d} className="contents">
              <span className="self-center text-[11px] text-ink-3">{d}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const v = grid.get(`${w}-${h}`) ?? 0;
                return (
                  <span
                    key={h}
                    tabIndex={v > 0 ? 0 : -1}
                    aria-label={`${d}, ${h} giờ: ${v} đơn`}
                    onPointerEnter={() => setActive({ w, h })}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive({ w, h })}
                    onBlur={() => setActive(null)}
                    className={cx("h-6 rounded-[3px] outline-none", active?.w === w && active?.h === h && "ring-2 ring-ink")}
                    style={{ background: SEQ[step(v)] }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-3">
        <span className="min-h-5 text-ink" role="status">
          {active ? (
            <>
              <span className="font-semibold tabular">{value} đơn</span> <span className="text-ink-3">{WEEKDAYS[active.w]}, {active.h}:00 - {active.h}:59</span>
            </>
          ) : (
            "Rê chuột lên ô để xem số đơn"
          )}
        </span>
        <span className="flex items-center gap-1.5">
          Ít
          {SEQ.slice(1).map((c) => (
            <span key={c} className="size-3 rounded-[2px]" style={{ background: c }} />
          ))}
          Nhiều (tối đa {max})
        </span>
      </div>
    </div>
  );
}
