/** Thông tin cửa hàng (admin sửa ở tab Tổng quan, backend: GET/PUT /api/v1/settings/store). */
export interface StoreInfo {
  store_name: string;
  tagline: string;
  address: string;
  hotline: string;
  support_hours: string;
  email: string;
  zalo?: string | null;
  facebook_url?: string | null;
  map_url?: string | null;
}

/** Giá trị dự phòng khi chưa gọi được backend, trùng giá trị mặc định ở backend. */
export const DEFAULT_STORE_INFO: StoreInfo = {
  store_name: "VÕ SPORT",
  tagline: "Võ phục và trang bị võ thuật",
  address: "Số 123 Võ Văn Tần, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh",
  hotline: "1900 6868",
  support_hours: "8:00 - 21:00",
  email: "lienhe@vosport.vn",
  zalo: null,
  facebook_url: null,
  map_url: null,
};

/** "1900 6868" -> "tel:19006868" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
