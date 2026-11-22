import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SITE_BASE_URL } from "@/lib/api";
import { MARTIAL_ARTS, beltLabel, categoryLabel, martialArtLabel, productImageSrc } from "@/lib/catalog";
import { cx } from "@/lib/format";
import { getProductDetail, getReviews } from "@/lib/server-data";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { container } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { ProductImage } from "@/components/product/ProductImage";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { SizeChartTable } from "@/components/product/SizeChartTable";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ApiUnavailable, ProductGrid, ProductGridSkeleton } from "@/components/home/ProductSections";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductDetail(slug);
  if (!result.ok) return { title: "Sản phẩm" };
  const p = result.data.product;
  const image = productImageSrc(p);
  return {
    title: p.name,
    description: p.description || `${p.name}, ${martialArtLabel(p.martial_art_id)}. ${p.material}.`,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, images: image ? [{ url: image }] : undefined },
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-6 text-2xl font-bold tracking-wide text-heading uppercase">{children}</h2>;
}

async function ProductContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProductDetail(slug);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <div className="py-16">
        <ApiUnavailable message="Chưa tải được thông tin sản phẩm. Vui lòng tải lại trang sau ít giây." />
      </div>
    );
  }

  const { product, size_chart } = result.data;
  const art = martialArtLabel(product.martial_art_id);
  const meta = [art, beltLabel(product.belt_rank) || categoryLabel(product.category_id)].filter(Boolean).join(" · ");
  const image = productImageSrc(product);
  // Điểm sao trong dữ liệu cho Google chỉ lấy từ đánh giá thật của người mua (không dùng số liệu mẫu)
  const reviews = await getReviews(product.id);
  const realReviews = reviews.ok ? reviews.data : [];
  const avgRating = realReviews.length ? realReviews.reduce((sum, r) => sum + r.rating, 0) / realReviews.length : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.id,
    description: product.description,
    image: image ? [absoluteUrl(image)] : undefined,
    brand: { "@type": "Brand", name: "VÕ SPORT" },
    category: [art, categoryLabel(product.category_id)].filter(Boolean).join(" > ") || undefined,
    aggregateRating: realReviews.length
      ? { "@type": "AggregateRating", ratingValue: Math.round(avgRating * 10) / 10, reviewCount: realReviews.length, bestRating: 5, worstRating: 1 }
      : undefined,
    review: realReviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      author: { "@type": "Person", name: r.user_name || "Khách hàng" },
      reviewBody: r.comment || undefined,
      datePublished: r.created_at || undefined,
    })),
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_BASE_URL}/products/${product.slug}`,
      seller: { "@id": `${SITE_BASE_URL}/#store` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "VN" },
        shippingRate: { "@type": "MonetaryAmount", value: product.price >= 500000 ? 0 : 30000, currency: "VND" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 5, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "VN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };
  const breadcrumb = breadcrumbJsonLd([
    ["Trang chủ", "/"],
    ...(MARTIAL_ARTS.some((m) => m.id === product.martial_art_id) ? [[`Võ phục ${art}`, `/products?martial_art=${product.martial_art_id}`] as [string, string]] : [["Sản phẩm", "/products"] as [string, string]]),
    [product.name, `/products/${product.slug}`],
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumb} />

      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-x-2 pt-6 pb-6 text-[13px] text-ink-3 lg:pt-8">
        <Link href="/" className="hover:text-ink">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href={`/products?martial_art=${product.martial_art_id}`} className="hover:text-ink">
          {art}
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-ink-2">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductImage product={product} preload sizes="(min-width: 1024px) 52vw, 100vw" className="aspect-[4/5] w-full rounded-md sm:aspect-square" />
        </div>

        <div className="flex flex-col">
          <p className="text-sm text-ink-3">{meta}</p>
          <h1 className="mt-2 text-3xl leading-tight font-bold text-heading md:text-4xl">{product.name}</h1>
          <Rating value={product.rating} count={product.review_count} className="mt-3" />
          <Price price={product.price} originalPrice={product.original_price} size="lg" className="mt-6" />
          {product.original_price && product.original_price > product.price && (
            <p className="mt-1 text-sm text-ink-2">Tiết kiệm {(product.original_price - product.price).toLocaleString("vi-VN")}₫ so với giá niêm yết</p>
          )}
          <div className="mt-8">
            <PurchasePanel product={product} />
          </div>
        </div>
      </div>

      <div className="mt-20 grid gap-16 lg:mt-24">
        <section className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-14">
          <div>
            <SectionTitle>Thông tin sản phẩm</SectionTitle>
            <p className="max-w-[65ch] leading-relaxed text-ink-2">{product.description}</p>
          </div>
          <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-md border border-line bg-line">
            {[
              ["Chất liệu", product.material],
              ["Môn võ", art],
              ["Loại", categoryLabel(product.category_id)],
              ["Cấp đai", beltLabel(product.belt_rank) || "Mọi cấp đai"],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface p-4">
                <dt className="text-[13px] text-ink-3">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {product.category_id === "vo_phuc" && (
          <section id="bang-size" className="scroll-mt-24">
            <SectionTitle>Bảng size {art}</SectionTitle>
            <SizeChartTable rows={size_chart} />
            <p className="mt-3 text-[13px] text-ink-3">Nằm giữa hai size, nên chọn size lớn hơn. Trẻ đang lớn có thể mua rộng thêm 1 size.</p>
          </section>
        )}

        <section>
          <SectionTitle>Đánh giá từ võ sinh</SectionTitle>
          <Suspense fallback={<Skeleton className="h-40 rounded-md" />}>
            <ProductReviews productId={product.id} rating={product.rating} reviewCount={product.review_count} />
          </Suspense>
        </section>

        <section>
          <SectionTitle>Cùng môn {art}</SectionTitle>
          <Suspense fallback={<ProductGridSkeleton count={4} />}>
            <ProductGrid query={{ martial_art: product.martial_art_id, exclude_id: product.id, sort: "popular", limit: 4 }} />
          </Suspense>
        </section>
      </div>
    </>
  );
}

function ProductSkeleton() {
  return (
    <>
      <Skeleton className="mt-6 mb-6 h-3 w-48 lg:mt-8" />
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <Skeleton className="aspect-[4/5] w-full rounded-md sm:aspect-square" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-11/12" />
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-16" />
            ))}
          </div>
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </>
  );
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <div className={cx(container, "pb-8")}>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}
