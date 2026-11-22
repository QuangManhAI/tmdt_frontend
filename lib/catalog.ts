import type { Product } from "@/lib/types";

/** Nhãn hiển thị cho các mã danh mục mà backend trả về. */

export const MARTIAL_ARTS: Array<{ id: string; label: string; short: string }> = [
  { id: "vovinam", label: "Vovinam", short: "Vovinam" },
  { id: "taekwondo", label: "Taekwondo", short: "Taekwondo" },
  { id: "karate", label: "Karate", short: "Karate" },
  { id: "vo_co_truyen", label: "Võ cổ truyền", short: "Cổ truyền" },
];

/** Mã môn võ cho phụ kiện dùng được mọi môn (túi, balo, băng quấn tay). Không nằm trong menu theo môn. */
export const SHARED_ART = { id: "chung", label: "Dùng chung", short: "Dùng chung" };

export const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: "vo_phuc", label: "Võ phục" },
  { id: "dai", label: "Đai võ thuật" },
  { id: "bao_ho", label: "Bảo hộ & giáp" },
  { id: "tui_dung", label: "Túi & balo" },
  { id: "phu_kien", label: "Phụ kiện tập luyện" },
];

export const BELT_RANKS: Array<{ id: string; label: string }> = [
  { id: "dai_trang", label: "Đai trắng" },
  { id: "lam_dai", label: "Lam đai" },
  { id: "hoang_dai", label: "Hoàng đai" },
  { id: "dai_vang", label: "Đai vàng" },
  { id: "dai_do", label: "Đai đỏ" },
  { id: "dai_den", label: "Đai đen" },
];

export const PRICE_RANGES: Array<{ id: string; label: string; min?: number; max?: number }> = [
  { id: "under-50k", label: "Dưới 50.000₫", max: 49999 },
  { id: "50k-100k", label: "50.000₫ - 100.000₫", min: 50000, max: 100000 },
  { id: "100k-200k", label: "100.000₫ - 200.000₫", min: 100001, max: 200000 },
  { id: "over-200k", label: "Trên 200.000₫", min: 200001 },
];

export const SORT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "popular", label: "Bán chạy" },
  { id: "newest", label: "Mới nhất" },
  { id: "discount", label: "Giảm nhiều" },
  { id: "price_asc", label: "Giá thấp đến cao" },
  { id: "price_desc", label: "Giá cao đến thấp" },
];

const lookup = (list: Array<{ id: string; label: string }>, id?: string | null) =>
  list.find((item) => item.id === id)?.label ?? "";

export const martialArtLabel = (id?: string | null) => lookup([...MARTIAL_ARTS, SHARED_ART], id);
export const categoryLabel = (id?: string | null) => lookup(CATEGORIES, id);
export const beltLabel = (id?: string | null) => lookup(BELT_RANKS, id);

export const FREESHIP_THRESHOLD = 500000;
export const EMBROIDERY_FEE = 30000;
export const EMBROIDERY_MAX_LENGTH = 20;

/**
 * Ảnh sản phẩm: dùng URL tuyệt đối (do quản trị nhập) hoặc đường dẫn trong /public.
 * Seed mặc định trỏ tới /images/products/{slug}.jpg; nếu file chưa có, ProductImage tự hiện ô thay thế.
 */
export function productImageSrc(product: Pick<Product, "thumbnail" | "slug">): string | null {
  const src = product.thumbnail?.trim();
  if (src && (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/"))) return src;
  return product.slug ? `/images/products/${product.slug}.jpg` : null;
}

export function discountPercent(product: Pick<Product, "price" | "original_price" | "discount_percent">): number {
  if (product.original_price && product.original_price > product.price) {
    return Math.round(((product.original_price - product.price) / product.original_price) * 100);
  }
  return product.discount_percent || 0;
}

export const ORDER_STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  pending_payment: { label: "Chờ thanh toán", tone: "warning" },
  confirmed: { label: "Đã xác nhận", tone: "neutral" },
  paid: { label: "Đã thanh toán", tone: "success" },
  processing: { label: "Đang chuẩn bị hàng", tone: "neutral" },
  shipping: { label: "Đang giao", tone: "neutral" },
  delivered: { label: "Đã giao", tone: "success" },
  completed: { label: "Hoàn tất", tone: "success" },
  return_requested: { label: "Yêu cầu đổi size", tone: "warning" },
  returned: { label: "Đã đổi trả", tone: "neutral" },
  cancelled: { label: "Đã hủy", tone: "danger" },
};

export const orderStatusLabel = (status: string) => ORDER_STATUS[status]?.label ?? status;

/** Bậc chiết khấu đặt theo võ đường, khớp _calculate_discount_tier ở backend. */
export const DOJO_TIERS = [
  { min: 10, label: "10 - 29 bộ", discount: 10 },
  { min: 30, label: "30 - 49 bộ", discount: 15 },
  { min: 50, label: "50 - 99 bộ", discount: 20 },
  { min: 100, label: "Từ 100 bộ", discount: 25 },
];
