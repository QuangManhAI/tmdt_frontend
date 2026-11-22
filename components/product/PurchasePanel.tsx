"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowsClockwiseIcon, CaretDownIcon, CircleNotchIcon, NeedleIcon, RulerIcon, TruckIcon } from "@phosphor-icons/react";
import { EMBROIDERY_FEE, EMBROIDERY_MAX_LENGTH, FREESHIP_THRESHOLD } from "@/lib/catalog";
import { cx, formatVND } from "@/lib/format";
import type { Product, SizeRecommendation } from "@/lib/types";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { buttonClass, chipClass, inputClass } from "@/components/ui/styles";
import { SizeAdvisorForm } from "@/components/size/SizeAdvisorForm";

export function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { add, pendingLine } = useCart();
  const { notify } = useToast();
  const variants = product.variants;
  const singleVariant = variants.length === 1;

  const [sku, setSku] = useState<string | null>(singleVariant && variants[0].in_stock ? variants[0].sku : null);
  const [quantity, setQuantity] = useState(1);
  const [embroider, setEmbroider] = useState(false);
  const [embName, setEmbName] = useState("");
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [errors, setErrors] = useState<{ size?: string; emb?: string }>({});
  const [buying, setBuying] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const selected = variants.find((v) => v.sku === sku) ?? null;
  const unitPrice = (selected?.price ?? product.price) + (embroider ? EMBROIDERY_FEE : 0);
  const busy = buying || (!!pendingLine && !!sku && pendingLine.startsWith(`${sku}|`));

  // Hiện thanh "Thêm vào giỏ" dính đáy màn hình trên di động khi nút chính đã cuộn khuất
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const validate = () => {
    const next: typeof errors = {};
    if (!selected) next.size = "Vui lòng chọn size";
    if (embroider && !embName.trim()) next.emb = "Nhập tên võ sinh cần thêu";
    setErrors(next);
    if (next.size) document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return Object.keys(next).length === 0;
  };

  const addToCart = async (goCheckout: boolean) => {
    if (!validate() || !selected) return;
    if (goCheckout) setBuying(true);
    const ok = await add(
      { product_id: product.id, sku: selected.sku, quantity, is_embroidered: embroider, embroidery_name: embName.trim(), productName: product.name },
      { openDrawer: !goCheckout }
    );
    if (ok && goCheckout) router.push("/checkout");
    else setBuying(false);
  };

  const onAdvisorResult = (result: SizeRecommendation) => {
    const match = variants.find((v) => v.size === result.recommended_size || v.size.startsWith(`${result.recommended_size} `));
    if (match?.in_stock) {
      setSku(match.sku);
      setErrors((e) => ({ ...e, size: undefined }));
      notify({ tone: "success", title: `Đã chọn ${match.size}`, description: "Theo số đo bạn vừa nhập" });
    } else if (match) {
      notify({ tone: "info", title: `${result.recommended_size} đang tạm hết hàng`, description: "Thử size dự phòng hoặc gọi hotline để đặt trước." });
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <div id="size-picker" className="scroll-mt-28">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">
            {singleVariant ? "Kích cỡ" : "Chọn size"}
            {selected && !singleVariant && <span className="ml-2 font-normal text-ink-2">{selected.size}</span>}
          </p>
          {product.category_id === "vo_phuc" && (
            <button
              type="button"
              onClick={() => setAdvisorOpen((v) => !v)}
              aria-expanded={advisorOpen}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text cursor-pointer"
            >
              <RulerIcon className="size-4" aria-hidden />
              Tư vấn size
              <CaretDownIcon className={cx("size-3.5 transition-transform", advisorOpen && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kích cỡ" aria-invalid={!!errors.size || undefined}>
          {variants.map((v) => (
            <button
              key={v.sku}
              type="button"
              role="radio"
              aria-checked={sku === v.sku}
              disabled={!v.in_stock}
              onClick={() => {
                setSku(v.sku);
                setErrors((e) => ({ ...e, size: undefined }));
              }}
              className={chipClass(sku === v.sku, !v.in_stock)}
            >
              {v.size}
            </button>
          ))}
        </div>
        {errors.size ? (
          <p className="mt-2 text-sm text-accent-text">{errors.size}</p>
        ) : selected?.is_low_stock ? (
          <p className="mt-2 text-sm text-warning">Chỉ còn {selected.stock} sản phẩm size này</p>
        ) : null}

        {advisorOpen && (
          <div className="fade-in mt-4 rounded-md border border-line bg-bg p-5">
            <SizeAdvisorForm defaultMartialArt={product.martial_art_id} lockMartialArt showShopLink={false} onResult={onAdvisorResult} />
          </div>
        )}
      </div>

      {product.is_customizable && (
        <div className="rounded-md border border-line p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={embroider}
              onChange={(e) => {
                setEmbroider(e.target.checked);
                setErrors((er) => ({ ...er, emb: undefined }));
              }}
              className="mt-0.5 size-4 accent-accent"
            />
            <span className="text-sm">
              <span className="font-medium text-ink">Thêu tên võ sinh</span>
              <span className="text-ink-2"> (+{formatVND(EMBROIDERY_FEE)})</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">Đơn có thêu tên cần thanh toán trước qua MoMo và không áp dụng đổi size.</span>
            </span>
          </label>
          {embroider && (
            <div className="fade-in mt-4 flex flex-col gap-2 pl-7">
              <label htmlFor="emb-name" className="text-sm font-medium text-ink">
                Tên cần thêu
              </label>
              <input
                id="emb-name"
                value={embName}
                maxLength={EMBROIDERY_MAX_LENGTH}
                onChange={(e) => {
                  setEmbName(e.target.value);
                  setErrors((er) => ({ ...er, emb: undefined }));
                }}
                aria-invalid={!!errors.emb || undefined}
                className={inputClass}
                autoComplete="off"
              />
              <p className={cx("text-[13px]", errors.emb ? "text-accent-text" : "text-ink-3")}>
                {errors.emb ?? `Có dấu, tối đa ${EMBROIDERY_MAX_LENGTH} ký tự (${embName.length}/${EMBROIDERY_MAX_LENGTH})`}
              </p>
            </div>
          )}
        </div>
      )}

      <div ref={ctaRef} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, Math.min(selected?.stock ?? 10, 20))} />
          <button type="button" onClick={() => addToCart(false)} disabled={busy || !product.in_stock} className={buttonClass("primary", "lg", "h-11 flex-1")}>
            {busy && !buying ? <CircleNotchIcon className="size-5 animate-spin" /> : null}
            {product.in_stock ? `Thêm vào giỏ, ${formatVND(unitPrice * quantity)}` : "Tạm hết hàng"}
          </button>
        </div>
        {product.in_stock && (
          <button type="button" onClick={() => addToCart(true)} disabled={busy} className={buttonClass("dark", "lg", "h-11")}>
            {buying && <CircleNotchIcon className="size-5 animate-spin" />}
            Mua ngay
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-2">
        <li className="flex items-start gap-3">
          <ArrowsClockwiseIcon className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />
          Đổi size miễn phí trong 7 ngày nếu mặc không vừa (không áp dụng hàng thêu tên)
        </li>
        <li className="flex items-start gap-3">
          <TruckIcon className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />
          Miễn phí giao hàng cho đơn từ {formatVND(FREESHIP_THRESHOLD)}, nội thành TP.HCM 25.000₫
        </li>
        {product.is_customizable && (
          <li className="flex items-start gap-3">
            <NeedleIcon className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />
            Nhận thêu tên có dấu, tối đa {EMBROIDERY_MAX_LENGTH} ký tự
          </li>
        )}
      </ul>

      <div
        className={cx(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur-md transition-transform duration-300 ease-out-soft lg:hidden",
          showSticky ? "translate-y-0" : "translate-y-full"
        )}
        inert={!showSticky}
        data-mobile-buybar={showSticky ? "" : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-ink-2">{selected ? selected.size : "Chưa chọn size"}</p>
            <p className="font-semibold text-ink tabular">{formatVND(unitPrice * quantity)}</p>
          </div>
          <button type="button" onClick={() => addToCart(false)} disabled={busy || !product.in_stock} className={buttonClass("primary", "md")}>
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}
