import { SealCheckIcon, StarIcon } from "@phosphor-icons/react/ssr";
import { cx, formatDate } from "@/lib/format";
import { getReviews } from "@/lib/server-data";

const FIT_LABEL: Record<string, string> = { tight: "Hơi chật", fit: "Vừa vặn", loose: "Hơi rộng" };

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} trên 5 sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} weight="fill" className={cx("size-3.5", i < Math.round(value) ? "text-warning" : "text-line-strong")} aria-hidden />
      ))}
    </span>
  );
}

export async function ProductReviews({ productId, rating, reviewCount }: { productId: string; rating: number; reviewCount: number }) {
  const result = await getReviews(productId);
  const reviews = result.ok ? result.data : [];
  const fitCounts = reviews.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.size_fit]: (acc[r.size_fit] ?? 0) + 1 }), {});

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
      <div>
        <p className="text-5xl font-semibold tracking-tight text-ink tabular">{rating.toLocaleString("vi-VN", { minimumFractionDigits: 1 })}</p>
        <div className="mt-2 flex items-center gap-2">
          <Stars value={rating} />
          <span className="text-sm text-ink-3">{reviewCount} đánh giá</span>
        </div>
        {reviews.length > 0 && (
          <dl className="mt-6 flex flex-col gap-2 text-sm">
            {Object.entries(FIT_LABEL).map(([key, label]) => (
              <div key={key} className="flex justify-between text-ink-2">
                <dt>{label}</dt>
                <dd className="text-ink tabular">{fitCounts[key] ?? 0}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-md bg-muted px-6 py-8 text-sm text-ink-2">
          Chưa có nhận xét chi tiết cho sản phẩm này. Sau khi nhận hàng, bạn có thể đánh giá trong trang chi tiết đơn hoặc mục Tài khoản → Đánh giá để giúp võ sinh khác chọn đúng size.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {reviews.slice(0, 8).map((r) => (
            <li key={r.id} className="py-5 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-ink">{r.user_name}</span>
                <Stars value={r.rating} />
                <span className="text-[13px] text-ink-3">{formatDate(r.created_at)}</span>
                {r.verified_purchase && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-[12px] font-medium text-success">
                    <SealCheckIcon weight="fill" className="size-3.5" aria-hidden /> Đã mua hàng
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-ink-3">
                Đã mua {r.bought_size}, {FIT_LABEL[r.size_fit] ?? r.size_fit}
              </p>
              <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-2">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
