import { cacheLife, cacheTag } from "next/cache";
import { getApiUrl } from "@/lib/api";
import { PRICE_RANGES } from "@/lib/catalog";
import { DEFAULT_STORE_INFO, type StoreInfo } from "@/lib/store-info";
import type { ActiveVoucher, BlogPost, CatalogFacets, ProductDetail, ProductList, Review, SizeChartRow } from "@/lib/types";

/**
 * Lớp đọc dữ liệu phía server (Server Components) có cache theo Cache Components của Next 16.
 * Thành công: cache vài phút để trang tĩnh nạp tức thì. Lỗi (backend ngủ/không truy cập được):
 * dùng hồ sơ "retry" (next.config.ts) làm mới sau 30 giây, tránh "đóng băng" trang trống trong nhiều giờ
 * mà vẫn cho phép build hoàn tất khi backend chưa chạy.
 */

export type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function readApi<T>(path: string): Promise<Result<T>> {
  try {
    const res = await fetch(getApiUrl(path), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = body && typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: detail };
    }
    return { ok: true, data: (body?.data ?? body) as T };
  } catch {
    return { ok: false, status: 0, error: "Không kết nối được máy chủ" };
  }
}

export interface CatalogQuery {
  martial_art?: string;
  category?: string;
  belt_rank?: string;
  price?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  exclude_id?: string;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** Chuẩn hóa searchParams của URL /products thành truy vấn catalog. */
export function parseCatalogQuery(params: Record<string, string | string[] | undefined>): CatalogQuery {
  const page = Number(first(params.page) ?? 1);
  return {
    martial_art: first(params.martial_art),
    category: first(params.category),
    belt_rank: first(params.belt_rank),
    price: first(params.price),
    search: first(params.search)?.trim() || undefined,
    sort: first(params.sort) ?? "popular",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function toApiQuery(q: CatalogQuery): string {
  const sp = new URLSearchParams();
  if (q.martial_art) sp.set("martial_art", q.martial_art);
  if (q.category) sp.set("category", q.category);
  if (q.belt_rank) sp.set("belt_rank", q.belt_rank);
  if (q.search) sp.set("search", q.search);
  if (q.exclude_id) sp.set("exclude_id", q.exclude_id);
  const range = PRICE_RANGES.find((r) => r.id === q.price);
  if (range?.min !== undefined) sp.set("min_price", String(range.min));
  if (range?.max !== undefined) sp.set("max_price", String(range.max));
  sp.set("sort_by", q.sort ?? "popular");
  sp.set("page", String(q.page ?? 1));
  sp.set("limit", String(q.limit ?? 12));
  return sp.toString();
}

export async function getProducts(query: CatalogQuery): Promise<Result<ProductList>> {
  "use cache";
  cacheTag("products");
  const result = await readApi<ProductList>(`/api/v1/products?${toApiQuery(query)}`);
  if (result.ok) cacheLife("minutes");
  else cacheLife("retry");
  return result;
}

export async function getProductDetail(slug: string): Promise<Result<ProductDetail>> {
  "use cache";
  cacheTag("products", `product-${slug}`);
  const result = await readApi<ProductDetail>(`/api/v1/products/${encodeURIComponent(slug)}`);
  if (result.ok || result.status === 404) cacheLife("minutes");
  else cacheLife("retry");
  return result;
}

export async function getFacets(): Promise<Result<CatalogFacets>> {
  "use cache";
  cacheTag("products");
  const result = await readApi<CatalogFacets>("/api/v1/products/meta/facets");
  if (result.ok) cacheLife("hours");
  else cacheLife("retry");
  return result;
}

export async function getReviews(productId: string): Promise<Result<Review[]>> {
  "use cache";
  cacheTag("reviews");
  const result = await readApi<Review[]>(`/api/v1/reviews?product_id=${encodeURIComponent(productId)}`);
  if (result.ok) cacheLife("minutes");
  else cacheLife("retry");
  return result;
}

export async function getBlogPosts(): Promise<Result<BlogPost[]>> {
  "use cache";
  cacheTag("blog");
  const result = await readApi<BlogPost[]>("/api/v1/blog");
  if (result.ok) cacheLife("hours");
  else cacheLife("retry");
  return result;
}

export async function getBlogPost(slug: string): Promise<Result<BlogPost>> {
  "use cache";
  cacheTag("blog", `post-${slug}`);
  const result = await readApi<BlogPost>(`/api/v1/blog/${encodeURIComponent(slug)}`);
  if (result.ok || result.status === 404) cacheLife("hours");
  else cacheLife("retry");
  return result;
}

export async function getSizeChart(martialArt: string): Promise<Result<SizeChartRow[]>> {
  "use cache";
  cacheTag("size-charts");
  const result = await readApi<Array<SizeChartRow & { note?: string | null; age_min?: number; age_max?: number }>>(
    `/api/v1/size-advisor/chart?martial_art=${encodeURIComponent(martialArt)}`
  );
  if (!result.ok) {
    cacheLife("retry");
    return result;
  }
  cacheLife("days");
  return { ok: true, data: result.data.map((row) => ({ ...row, fit_note: row.note ?? row.fit_note })) };
}

export async function getActiveVouchers(): Promise<Result<ActiveVoucher[]>> {
  "use cache";
  cacheTag("vouchers");
  const result = await readApi<ActiveVoucher[]>("/api/v1/promotions/active");
  if (result.ok) cacheLife("minutes");
  else cacheLife("retry");
  return result;
}

/** Thông tin cửa hàng cho header / footer. Lỗi thì dùng giá trị mặc định để trang không vỡ. */
export async function getStoreInfo(): Promise<StoreInfo> {
  "use cache";
  cacheTag("settings");
  const result = await readApi<StoreInfo>("/api/v1/settings/store");
  if (result.ok) {
    cacheLife("minutes");
    return { ...DEFAULT_STORE_INFO, ...result.data };
  }
  cacheLife("retry");
  return DEFAULT_STORE_INFO;
}
