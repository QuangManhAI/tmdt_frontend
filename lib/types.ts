/** Kiểu dữ liệu khớp với phản hồi của backend FastAPI (/api/v1). */

export interface ProductVariant {
  sku: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  in_stock: boolean;
  is_low_stock: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  martial_art_id: string;
  category_id: string;
  belt_rank?: string | null;
  price: number;
  original_price?: number | null;
  discount_percent: number;
  thumbnail: string;
  images: string[];
  material: string;
  description: string;
  is_customizable: boolean;
  rating: number;
  review_count: number;
  is_active: boolean;
  variants: ProductVariant[];
  total_stock: number;
  in_stock: boolean;
  created_at?: string | null;
}

export interface ProductList {
  total: number;
  items: Product[];
}

export interface SizeChartRow {
  size: string;
  height_min_cm: number;
  height_max_cm: number;
  weight_min_kg: number;
  weight_max_kg: number;
  age_range?: string | null;
  fit_note?: string | null;
}

export interface ProductDetail {
  product: Product;
  size_chart: SizeChartRow[];
}

export interface FacetOption {
  id: string;
  name: string;
  description?: string;
  count: number;
}

export interface CatalogFacets {
  total: number;
  martial_arts: FacetOption[];
  categories: FacetOption[];
  belt_ranks: Record<string, number>;
  price_min: number;
  price_max: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  thumbnail: string;
  category: string;
  created_at?: string | null;
}

export interface Review {
  id: string;
  product_id: string;
  user_name: string;
  rating: number;
  comment: string;
  size_fit: "tight" | "fit" | "loose" | string;
  bought_size: string;
  verified_purchase?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Sản phẩm khách đã nhận hàng, kèm đánh giá của khách nếu đã viết (GET /reviews/me). */
export interface ReviewableItem {
  product_id: string;
  product_name: string;
  product_slug?: string | null;
  image?: string | null;
  size: string;
  order_code: string;
  delivered_at?: string | null;
  review: (Review & { is_hidden?: boolean }) | null;
}

export interface DefaultAddress {
  recipient_name: string;
  phone: string;
  street_address: string;
  ward: string;
  district: string;
  city_province: string;
}

export interface AccountProfile {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  role: string;
  default_address?: DefaultAddress | null;
  linked_google: boolean;
  linked_facebook: boolean;
  created_at?: string | null;
}

/** Hồ sơ số đo võ sinh (GET /size-advisor/profiles). */
export interface StudentProfile {
  id: string;
  student_name: string;
  birth_year?: number | null;
  martial_art: string;
  height_cm: number;
  weight_kg: number;
  recommended_size?: string | null;
  measured_date: string;
  days_since_measured: number;
  needs_remeasure: boolean;
  remeasure_alert?: string | null;
}

export interface CartItem {
  product_id: string;
  sku: string;
  product_name: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  thumbnail?: string | null;
  is_embroidered: boolean;
  embroidery_name?: string | null;
  embroidery_fee: number;
}

export interface Cart {
  items: CartItem[];
  total_items: number;
  subtotal: number;
  embroidery_total: number;
  has_embroidery: boolean;
  shipping_fee: number;
  grand_total: number;
}

export interface OrderStatusHistoryItem {
  old_status?: string | null;
  new_status: string;
  changed_by: string;
  timestamp: string;
  note?: string | null;
}

export interface OrderItem {
  product_id: string;
  sku: string;
  product_name: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  is_embroidered: boolean;
  embroidery_name?: string | null;
  embroidery_fee: number;
}

export interface Order {
  id: string;
  order_code: string;
  user_id?: string | null;
  channel: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  shipping_address_full: string;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  voucher_code?: string | null;
  embroidery_total: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  items: OrderItem[];
  tracking_code?: string | null;
  /** MockShipping hoặc GHN */
  carrier?: string | null;
  shipment?: Shipment | null;
  status_history: OrderStatusHistoryItem[];
  created_at: string;
}

export interface Shipment {
  status: string;
  status_label?: string | null;
  expected_delivery_time?: string | null;
  tracking_url?: string | null;
  events: { status: string; status_label?: string | null; time: string }[];
}

export interface SizeRecommendation {
  recommended_size: string;
  backup_size?: string | null;
  fit_note: string;
  is_out_of_range: boolean;
  size_specs: Record<string, unknown>;
  free_exchange_guarantee: string;
}

export interface AuthUser {
  access_token: string;
  token_type?: string;
  user_id?: string;
  id?: string;
  full_name: string;
  phone?: string;
  email?: string | null;
  role: "admin" | "staff" | "coach" | "customer" | string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface DojoCampaign {
  id: string;
  campaign_code: string;
  club_id: string;
  club_name: string;
  campaign_title: string;
  applicable_product_ids: string[];
  target_quantity: number;
  discount_percent: number;
  deadline: string;
  has_custom_logo: boolean;
  allow_club_consolidated_payment: boolean;
  campaign_url: string;
  qr_code_url: string;
  status: string;
  total_ordered: number;
  total_amount: number;
}

export interface ActiveVoucher {
  code: string;
  discount_type: "PERCENT" | "FIXED" | string;
  discount_value: number;
  min_order_amount: number;
}
