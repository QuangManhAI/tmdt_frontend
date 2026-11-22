"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon, SealCheckIcon, StarIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { cx, formatDateTime } from "@/lib/format";
import type { Review } from "@/lib/types";
import { refreshStorefront } from "@/app/admin/actions";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass } from "@/components/ui/styles";
import { useAdminApi } from "@/components/admin/useAdminApi";

type AdminReview = Review & { is_hidden: boolean; product_name: string; order_code?: string | null };
type Filter = "all" | "visible" | "hidden";

const FIT_LABEL: Record<string, string> = { tight: "Hơi chật", fit: "Vừa vặn", loose: "Hơi rộng" };

/** Đánh giá của khách: hiện ngay khi gửi, nhân viên ẩn/hiện được (đánh giá spam, ngôn từ xấu). */
export function ReviewsPanel({ token }: { token: string }) {
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const reviews = useAdminApi<AdminReview[]>(`/api/v1/reviews/admin/list?visibility=${filter}`, token);

  const toggle = async (r: AdminReview) => {
    setBusy(r.id);
    try {
      await apiRequest(`/api/v1/reviews/${r.id}/visibility`, { method: "PATCH", token, body: { hidden: !r.is_hidden } });
      reviews.setData((list) => (filter === "all" ? (list?.map((x) => (x.id === r.id ? { ...x, is_hidden: !r.is_hidden } : x)) ?? list) : (list?.filter((x) => x.id !== r.id) ?? list)));
      const refreshed = await refreshStorefront(token, ["reviews"]).catch(() => false);
      notify({ tone: "success", title: r.is_hidden ? "Đã hiện lại đánh giá" : "Đã ẩn đánh giá", description: refreshed ? undefined : "Trang sản phẩm sẽ cập nhật trong vài phút." });
    } catch (err) {
      notify({ tone: "error", title: err instanceof ApiError ? err.message : "Không cập nhật được" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">Đánh giá sản phẩm</h2>
        <div className="flex gap-1">
          {(
            [
              ["all", "Tất cả"],
              ["visible", "Đang hiện"],
              ["hidden", "Đã ẩn"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={cx("h-8 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer", filter === id ? "bg-navy text-on-navy" : "bg-muted text-ink-2 hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {reviews.loading && !reviews.data ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : reviews.error && !reviews.data ? (
        <p className="px-5 py-6 text-sm text-accent-text">{reviews.error}</p>
      ) : !reviews.data?.length ? (
        <p className="px-5 py-10 text-center text-sm text-ink-3">Chưa có đánh giá nào</p>
      ) : (
        <ul className="divide-y divide-line">
          {reviews.data.map((r) => (
            <li key={r.id} className={cx("flex flex-wrap items-start gap-4 px-5 py-4", r.is_hidden && "bg-muted/50")}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-ink">{r.user_name}</span>
                  <span className="inline-flex items-center gap-0.5 text-sm text-ink">
                    <StarIcon weight="fill" className="size-4 text-warning" aria-hidden /> {r.rating}/5
                  </span>
                  {r.verified_purchase && (
                    <span className="inline-flex items-center gap-1 text-[12px] text-success">
                      <SealCheckIcon weight="fill" className="size-3.5" /> Đã mua{r.order_code ? ` · ${r.order_code}` : ""}
                    </span>
                  )}
                  {r.is_hidden && <span className="rounded bg-accent-soft px-1.5 py-px text-[12px] font-medium text-accent-text">Đã ẩn</span>}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {r.product_name || r.product_id} · size {r.bought_size || "—"}, {FIT_LABEL[r.size_fit] ?? r.size_fit} · {formatDateTime(r.created_at)}
                </p>
                <p className={cx("mt-1.5 max-w-[75ch] text-sm whitespace-pre-wrap", r.is_hidden ? "text-ink-3" : "text-ink-2")}>{r.comment}</p>
              </div>
              <button type="button" onClick={() => toggle(r)} disabled={busy === r.id} className={buttonClass("secondary", "sm")}>
                {r.is_hidden ? <EyeIcon className="size-4" /> : <EyeSlashIcon className="size-4" />}
                {r.is_hidden ? "Hiện lại" : "Ẩn"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
