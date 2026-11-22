"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EyeSlashIcon, StarIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ReviewableItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass } from "@/components/ui/styles";
import { ReviewForm } from "@/components/reviews/ReviewForm";

/** Sản phẩm đã nhận hàng: chờ đánh giá trước, đã đánh giá sau (sửa được). */
export function MyReviews({ token }: { token: string }) {
  const [items, setItems] = useState<ReviewableItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<ReviewableItem[]>("/api/v1/reviews/me", { token })
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được danh sách"));
  }, [token]);

  if (error) return <p className="text-sm text-accent-text">{error}</p>;
  if (!items)
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-20 rounded-md" />
      </div>
    );
  if (items.length === 0)
    return (
      <div className="flex flex-col items-start gap-3 rounded-md bg-muted p-6">
        <p className="text-ink-2">Sau khi nhận hàng, sản phẩm sẽ hiện ở đây để bạn đánh giá size và chất lượng.</p>
        <Link href="/products" className={buttonClass("dark")}>
          Mua sắm ngay
        </Link>
      </div>
    );

  const sorted = [...items].sort((a, b) => Number(!!a.review) - Number(!!b.review));

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((it) => (
        <li key={it.product_id}>
          {editing === it.product_id ? (
            <ReviewForm
              token={token}
              productId={it.product_id}
              productName={it.product_name}
              size={it.size}
              existing={it.review}
              onCancel={() => setEditing(null)}
              onSaved={(review) => {
                setItems((list) => list?.map((x) => (x.product_id === it.product_id ? { ...x, review: { ...review, is_hidden: x.review?.is_hidden } } : x)) ?? list);
                setEditing(null);
              }}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                {it.product_slug ? (
                  <Link href={`/products/${it.product_slug}`} className="font-medium text-ink hover:underline underline-offset-4">
                    {it.product_name}
                  </Link>
                ) : (
                  <p className="font-medium text-ink">{it.product_name}</p>
                )}
                <p className="text-[13px] text-ink-3">
                  Size {it.size || "—"} · đơn {it.order_code}
                  {it.delivered_at ? ` · ${formatDate(it.delivered_at)}` : ""}
                </p>
                {it.review && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
                    <span className="inline-flex items-center gap-0.5 text-ink">
                      <StarIcon weight="fill" className="size-4 text-warning" aria-hidden /> {it.review.rating}/5
                    </span>
                    <span className="line-clamp-1">{it.review.comment}</span>
                    {it.review.is_hidden && (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-px text-[12px] text-ink-3">
                        <EyeSlashIcon className="size-3.5" /> Đang bị ẩn
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setEditing(it.product_id)} className={buttonClass(it.review ? "ghost" : "primary", "sm")}>
                {it.review ? "Sửa đánh giá" : "Viết đánh giá"}
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
