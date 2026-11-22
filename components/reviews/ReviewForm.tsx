"use client";

import { useState, type FormEvent } from "react";
import { CircleNotchIcon, StarIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { cx } from "@/lib/format";
import type { Review } from "@/lib/types";
import { refreshReviews } from "@/app/actions/reviews";
import { useToast } from "@/components/ui/Toast";
import { buttonClass, inputClass, labelClass } from "@/components/ui/styles";

const FITS = [
  { id: "tight", label: "Hơi chật" },
  { id: "fit", label: "Vừa vặn" },
  { id: "loose", label: "Hơi rộng" },
] as const;

const RATING_LABEL = ["", "Rất tệ", "Chưa hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];

/** Viết hoặc sửa đánh giá cho một sản phẩm đã nhận hàng. Backend kiểm tra lại quyền (đã mua + đã giao). */
export function ReviewForm({
  token,
  productId,
  productName,
  size,
  existing,
  onSaved,
  onCancel,
}: {
  token: string;
  productId: string;
  productName: string;
  size: string;
  existing?: Review | null;
  onSaved: (review: Review) => void;
  onCancel?: () => void;
}) {
  const { notify } = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [hover, setHover] = useState<number | null>(null);
  const [fit, setFit] = useState<string>(existing?.size_fit ?? "fit");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Chia sẻ vài dòng về chất vải, đường may hoặc độ vừa vặn nhé");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await apiRequest<Review>("/api/v1/reviews", {
        method: "POST",
        token,
        body: { product_id: productId, rating, size_fit: fit, comment: comment.trim(), bought_size: size || undefined },
      });
      refreshReviews(token).catch(() => false);
      notify({ tone: "success", title: existing ? "Đã cập nhật đánh giá" : "Cảm ơn bạn đã đánh giá" });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chưa gửi được đánh giá. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const shown = hover ?? rating;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4 sm:p-5">
      <div>
        <p className="text-sm font-medium text-ink">{productName}</p>
        {size && <p className="text-[13px] text-ink-3">Size đã mua: {size}</p>}
      </div>

      <fieldset>
        <legend className={labelClass}>Chất lượng sản phẩm</legend>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex" onMouseLeave={() => setHover(null)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} sao`}
                aria-pressed={rating === n}
                className="p-0.5 cursor-pointer"
              >
                <StarIcon weight="fill" className={cx("size-7 transition-colors", n <= shown ? "text-warning" : "text-line-strong")} />
              </button>
            ))}
          </div>
          <span className="text-sm text-ink-2">{RATING_LABEL[shown]}</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Độ vừa vặn của size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FITS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFit(f.id)}
              aria-pressed={fit === f.id}
              className={cx(
                "h-9 rounded-sm border px-3.5 text-sm font-medium transition-colors cursor-pointer",
                fit === f.id ? "border-navy bg-navy text-on-navy" : "border-line bg-surface text-ink hover:border-line-strong"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`review-${productId}`} className={labelClass}>
          Nhận xét
        </label>
        <textarea
          id={`review-${productId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Chất vải, đường may, màu sắc, bé mặc có thoải mái không…"
          className={cx(inputClass, "h-auto resize-y py-2.5 text-sm")}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-accent-text">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={buttonClass("dark", "md")}>
          {saving && <CircleNotchIcon className="size-4 animate-spin" />}
          {existing ? "Cập nhật đánh giá" : "Gửi đánh giá"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonClass("ghost", "md")}>
            Để sau
          </button>
        )}
      </div>
    </form>
  );
}
