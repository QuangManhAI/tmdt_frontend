import { SITE_BASE_URL } from "@/lib/api";
import type { StoreInfo } from "@/lib/store-info";

/** URL tuyệt đối trên domain chính (canonical, JSON-LD). */
export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

/** Chèn dữ liệu có cấu trúc schema.org; escape "<" để chuỗi trong dữ liệu không đóng được thẻ script. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Thông tin cửa hàng (Google dùng cho khung thông tin bên phải khi tìm tên shop) + ô tìm kiếm trên site. */
export function storeJsonLd(store: StoreInfo) {
  const sameAs = [store.facebook_url, store.zalo ? `https://zalo.me/${store.zalo.replace(/\D/g, "")}` : null, store.map_url].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": `${SITE_BASE_URL}/#store`,
        name: store.store_name,
        description: store.tagline,
        url: `${SITE_BASE_URL}/`,
        logo: absoluteUrl("/logo.png"),
        image: absoluteUrl("/banner-bieu-dien.jpg"),
        telephone: store.hotline.replace(/[^\d+]/g, ""),
        email: store.email,
        address: { "@type": "PostalAddress", streetAddress: store.address, addressCountry: "VN" },
        priceRange: "100.000đ - 1.500.000đ",
        currenciesAccepted: "VND",
        paymentAccepted: "Tiền mặt (COD), Ví MoMo",
        hasMap: store.map_url || undefined,
        sameAs: sameAs.length ? sameAs : undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_BASE_URL}/#website`,
        name: store.store_name,
        alternateName: ["VÕ SPORT", "Cửa hàng võ phục", "cuahangvophuc"],
        url: `${SITE_BASE_URL}/`,
        inLanguage: "vi-VN",
        publisher: { "@id": `${SITE_BASE_URL}/#store` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_BASE_URL}/products?search={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** Đường dẫn breadcrumb: [["Trang chủ", "/"], ["Sản phẩm", "/products"], ...] */
export function breadcrumbJsonLd(items: Array<[name: string, path: string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absoluteUrl(path) })),
  };
}
