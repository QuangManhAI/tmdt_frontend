import type { MetadataRoute } from "next";
import { SITE_BASE_URL } from "@/lib/api";
import { MARTIAL_ARTS } from "@/lib/catalog";
import { getBlogPosts, getProducts } from "@/lib/server-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([getProducts({ sort: "newest", limit: 100 }), getBlogPosts()]);

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_BASE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
    // Trang đích theo môn võ (từ khóa "võ phục vovinam", "võ phục taekwondo"...)
    ...MARTIAL_ARTS.map((m) => ({ url: `${SITE_BASE_URL}/products?martial_art=${m.id}`, changeFrequency: "daily" as const, priority: 0.9 })),
    { url: `${SITE_BASE_URL}/size-guide`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_BASE_URL}/dojos`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_BASE_URL}/policies`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const productPages: MetadataRoute.Sitemap = products.ok
    ? products.data.items.map((p) => ({ url: `${SITE_BASE_URL}/products/${p.slug}`, changeFrequency: "weekly", priority: 0.8 }))
    : [];
  const postPages: MetadataRoute.Sitemap = posts.ok
    ? posts.data.map((p) => ({ url: `${SITE_BASE_URL}/blog/${p.slug}`, changeFrequency: "monthly", priority: 0.5 }))
    : [];

  return [...pages, ...productPages, ...postPages];
}
