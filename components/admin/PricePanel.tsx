"use client";

import { useMemo, useState } from "react";
import { ArrowCounterClockwiseIcon, CircleNotchIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { CATEGORIES, categoryLabel, martialArtLabel } from "@/lib/catalog";
import { cx, formatVND } from "@/lib/format";
import type { Product, ProductList } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { useAdminApi } from "@/components/admin/useAdminApi";
import { refreshStorefront } from "@/app/admin/actions";

/** Ô nhập tiền: chỉ nhận số, hiển thị có dấu chấm ngăn cách nghìn. */
function MoneyInput({ value, onChange, label, changed, placeholder }: { value: string; onChange: (v: string) => void; label: string; changed?: boolean; placeholder?: string }) {
  const shown = value ? Number(value).toLocaleString("vi-VN") : "";
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        aria-label={label}
        value={shown}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9))}
        className={cx(inputClass, "h-9 pr-6 text-right text-sm tabular", changed && "border-warning bg-warning-soft")}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-ink-3">₫</span>
    </div>
  );
}

interface Draft {
  prices: Record<string, string>;
  original: string;
}

function initialDraft(p: Product): Draft {
  return {
    prices: Object.fromEntries(p.variants.map((v) => [v.sku, String(v.price)])),
    original: p.original_price ? String(p.original_price) : "",
  };
}

function ProductPriceRow({ product, token, onSaved }: { product: Product; token: string; onSaved: (p: Product) => void }) {
  const { notify } = useToast();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(product));
  const [bulk, setBulk] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changedSkus = product.variants.filter((v) => Number(draft.prices[v.sku] || 0) !== v.price).map((v) => v.sku);
  const originalChanged = (Number(draft.original) || 0) !== (product.original_price || 0);
  const dirty = changedSkus.length > 0 || originalChanged;
  const minPrice = Math.min(...product.variants.map((v) => Number(draft.prices[v.sku] || 0)));
  const discount = draft.original && Number(draft.original) > minPrice ? Math.round(((Number(draft.original) - minPrice) / Number(draft.original)) * 100) : 0;

  const save = async () => {
    if (product.variants.some((v) => Number(draft.prices[v.sku] || 0) < 1000)) {
      setError("Giá mỗi size phải từ 1.000₫ trở lên");
      return;
    }
    if (draft.original && Number(draft.original) <= minPrice) {
      setError("Giá gốc phải cao hơn giá bán thấp nhất (hoặc để trống)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const prices = Object.fromEntries(changedSkus.map((sku) => [sku, Number(draft.prices[sku])]));
      const updated = await apiRequest<Product>(`/api/v1/products/${product.id}/prices`, {
        method: "PATCH",
        token,
        body: { prices: Object.keys(prices).length ? prices : { [product.variants[0].sku]: Number(draft.prices[product.variants[0].sku]) }, ...(originalChanged ? { original_price: Number(draft.original) || 0 } : {}) },
      });
      onSaved(updated);
      setDraft(initialDraft(updated));
      const refreshed = await refreshStorefront(token, ["products"]).catch(() => false);
      notify({ tone: "success", title: `Đã cập nhật giá ${product.name}`, description: refreshed ? "Website đã hiển thị giá mới." : "Website sẽ cập nhật trong vài phút." });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được giá");
    } finally {
      setSaving(false);
    }
  };

  const multi = product.variants.length > 1;

  return (
    <li className={cx("px-5 py-4", dirty && "bg-warning-soft/40")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{product.name}</p>
          <p className="text-[13px] text-ink-3">
            {martialArtLabel(product.martial_art_id) || "Khác"} · Giá đang bán từ {formatVND(product.price)}
            {product.original_price ? ` (gốc ${formatVND(product.original_price)}, -${product.discount_percent}%)` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button type="button" onClick={() => { setDraft(initialDraft(product)); setError(null); }} className={buttonClass("ghost", "sm")} aria-label={`Hoàn tác giá ${product.name}`}>
              <ArrowCounterClockwiseIcon className="size-4" /> Hoàn tác
            </button>
          )}
          <button type="button" onClick={save} disabled={!dirty || saving} className={buttonClass("dark", "sm")}>
            {saving && <CircleNotchIcon className="size-4 animate-spin" />} Lưu giá
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className={cx("grid flex-1 gap-2", multi ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" : "max-w-[200px] grid-cols-1")}>
          {product.variants.map((v) => (
            <label key={v.sku} className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-ink-3">{v.size === "Freesize" ? "Giá bán" : v.size}</span>
              <MoneyInput
                label={`Giá ${product.name} ${v.size}`}
                value={draft.prices[v.sku] ?? ""}
                changed={changedSkus.includes(v.sku)}
                onChange={(val) => setDraft((d) => ({ ...d, prices: { ...d.prices, [v.sku]: val } }))}
              />
            </label>
          ))}
        </div>
        {multi && (
          <div className="flex items-end gap-2">
            <label className="flex w-[140px] flex-col gap-1">
              <span className="text-xs text-ink-3">Đặt cùng giá mọi size</span>
              <MoneyInput label="Giá áp dụng cho mọi size" value={bulk} onChange={setBulk} placeholder="VD 180.000" />
            </label>
            <button
              type="button"
              disabled={!bulk}
              onClick={() => {
                setDraft((d) => ({ ...d, prices: Object.fromEntries(product.variants.map((v) => [v.sku, bulk])) }));
                setBulk("");
              }}
              className={buttonClass("secondary", "sm", "h-9")}
            >
              Áp dụng
            </button>
          </div>
        )}
        <label className="flex w-[160px] flex-col gap-1">
          <span className="text-xs text-ink-3">Giá gốc (để hiện giảm giá)</span>
          <MoneyInput label={`Giá gốc ${product.name}`} value={draft.original} changed={originalChanged} onChange={(val) => setDraft((d) => ({ ...d, original: val }))} placeholder="Không giảm" />
        </label>
        {discount > 0 && <span className="mb-2 rounded-sm bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">-{discount}%</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-accent-text">{error}</p>}
    </li>
  );
}

/** Tab "Giá sản phẩm": sửa giá từng size, đặt giá gốc để hiện % giảm. Chỉ đổi giá, không đụng tồn kho. */
export function PricePanel({ token }: { token: string }) {
  const products = useAdminApi<ProductList>("/api/v1/products?limit=100&sort_by=newest", token);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = (products.data?.items ?? []).filter((p) => (!category || p.category_id === category) && (!q || p.name.toLowerCase().includes(q)));
    return CATEGORIES.map((c) => ({ ...c, items: items.filter((p) => p.category_id === c.id) }))
      .concat([{ id: "khac", label: "Khác", items: items.filter((p) => !CATEGORIES.some((c) => c.id === p.category_id)) }])
      .filter((g) => g.items.length > 0);
  }, [products.data, query, category]);

  const replace = (updated: Product) =>
    products.setData((prev) => (prev ? { ...prev, items: prev.items.map((p) => (p.id === updated.id ? updated : p)) } : prev));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="relative flex-1 sm:max-w-xs">
          <span className="sr-only">Tìm sản phẩm</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm sản phẩm" className={cx(inputClass, "h-10 pl-9 text-sm")} />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo nhóm">
          {[{ id: "", label: "Tất cả" }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cx("h-10 rounded-sm border px-3 text-sm font-medium cursor-pointer", category === c.id ? "border-navy bg-navy text-on-navy" : "border-line bg-surface text-ink-2 hover:border-line-strong")}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="w-full text-[13px] text-ink-3">
          Ô đổi màu là giá chưa lưu. Giá hiển thị của sản phẩm là giá size rẻ nhất. Mọi lần đổi giá được ghi vào Nhật ký.
        </p>
      </div>

      {products.error && !products.data ? (
        <p className="rounded-md border border-line bg-surface px-5 py-6 text-sm text-ink-2">
          {products.error}.{" "}
          <button type="button" onClick={products.reload} className="font-medium text-ink underline underline-offset-4 cursor-pointer">Thử lại</button>
        </p>
      ) : !products.data ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : groups.length === 0 ? (
        <p className="rounded-md border border-line bg-surface px-5 py-10 text-center text-sm text-ink-2">Không có sản phẩm phù hợp.</p>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="rounded-md border border-line bg-surface">
            <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-ink">
              {g.id === "khac" ? g.label : categoryLabel(g.id)} <span className="font-normal text-ink-3">({g.items.length})</span>
            </h2>
            <ul className="divide-y divide-line">
              {g.items.map((p) => (
                <ProductPriceRow key={p.id} product={p} token={token} onSaved={replace} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
