import { StarIcon } from "@phosphor-icons/react/ssr";
import { cx } from "@/lib/format";

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (count === 0) return <p className={cx("text-[13px] text-ink-3", className)}>Chưa có đánh giá</p>;
  return (
    <div className={cx("flex items-center gap-1 text-[13px] text-ink-2 tabular", className)}>
      <StarIcon weight="fill" className="size-3.5 text-warning" aria-hidden />
      <span className="font-medium text-ink">{value.toLocaleString("vi-VN", { minimumFractionDigits: 1 })}</span>
      {count !== undefined && <span className="text-ink-3">({count} đánh giá)</span>}
    </div>
  );
}
