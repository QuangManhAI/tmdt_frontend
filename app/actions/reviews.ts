"use server";

import { updateTag } from "next/cache";
import { getApiUrl } from "@/lib/api";

/** Làm mới cache đánh giá trên trang sản phẩm ngay sau khi khách gửi đánh giá (xác minh khách đã đăng nhập). */
export async function refreshReviews(token: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl("/api/v1/auth/me"), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  updateTag("reviews");
  return true;
}
