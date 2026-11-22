"use server";

import { updateTag } from "next/cache";
import { getApiUrl } from "@/lib/api";

const ALLOWED_TAGS = ["settings", "products"] as const;
type StorefrontTag = (typeof ALLOWED_TAGS)[number];

/**
 * Làm mới cache trang bán hàng ngay sau khi quản trị sửa thông tin cửa hàng / giá,
 * thay vì chờ cache vài phút hết hạn. Xác minh token với backend trước khi xóa cache.
 */
export async function refreshStorefront(token: string, tags: StorefrontTag[]): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl("/api/v1/auth/me"), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const body = await res.json();
    const role = body?.data?.role;
    if (role !== "admin" && role !== "staff") return false;
  } catch {
    return false;
  }
  for (const tag of tags) if ((ALLOWED_TAGS as readonly string[]).includes(tag)) updateTag(tag);
  return true;
}
