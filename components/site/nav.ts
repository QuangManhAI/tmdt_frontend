import { BELT_RANKS, CATEGORIES, MARTIAL_ARTS } from "@/lib/catalog";

/* Hotline, địa chỉ, email: lấy từ thông tin cửa hàng (lib/store-info.ts), admin sửa ở trang quản trị. */

export interface NavColumn {
  title: string;
  href?: string;
  links: Array<{ href: string; label: string }>;
}

export interface NavItem {
  label: string;
  href: string;
  highlight?: boolean;
  columns?: NavColumn[];
}

/** Menu chính kiểu cửa hàng thể thao: mỗi mục mở bảng menu lớn (mega menu) theo cột. */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Môn võ",
    href: "/products",
    columns: MARTIAL_ARTS.map((m) => ({
      title: m.label,
      href: `/products?martial_art=${m.id}`,
      links: [
        { href: `/products?martial_art=${m.id}&category=vo_phuc`, label: `Võ phục ${m.label}` },
        { href: `/products?martial_art=${m.id}&category=dai`, label: "Đai các cấp" },
        { href: `/products?martial_art=${m.id}&category=bao_ho`, label: "Bảo hộ & giáp" },
        { href: `/products?martial_art=${m.id}`, label: `Tất cả ${m.label}` },
      ],
    })),
  },
  {
    label: "Sản phẩm",
    href: "/products",
    columns: [
      {
        title: "Loại sản phẩm",
        links: [...CATEGORIES.map((c) => ({ href: `/products?category=${c.id}`, label: c.label })), { href: "/products", label: "Tất cả sản phẩm" }],
      },
      {
        title: "Sắp xếp nhanh",
        links: [
          { href: "/products?sort=popular", label: "Bán chạy nhất" },
          { href: "/products?sort=newest", label: "Hàng mới về" },
          { href: "/products?sort=price_asc", label: "Giá tốt cho người mới tập" },
        ],
      },
    ],
  },
  {
    label: "Cấp đai",
    href: "/products?category=dai",
    columns: [
      {
        title: "Theo cấp đai",
        links: BELT_RANKS.map((b) => ({ href: `/products?belt_rank=${b.id}`, label: b.label })),
      },
    ],
  },
  {
    label: "Ưu đãi",
    href: "/products?sort=discount",
    columns: [
      {
        title: "Ưu đãi",
        links: [
          { href: "/products?sort=discount", label: "Giảm giá nhiều nhất" },
          { href: "/#uu-dai", label: "Mã giảm giá hôm nay" },
          { href: "/dojos", label: "Giá sỉ cho võ đường" },
        ],
      },
    ],
  },
  { label: "Võ đường", href: "/dojos" },
  { label: "Tư vấn size", href: "/size-guide", highlight: true },
];

export const USP_ITEMS = [
  { key: "ship", title: "Miễn phí giao hàng đơn từ 500.000₫" },
  { key: "exchange", title: "Đổi size miễn phí trong 7 ngày" },
  { key: "embroidery", title: "Thêu tên võ sinh theo yêu cầu" },
  { key: "dojo", title: "Giá sỉ đến 25% cho võ đường" },
] as const;
