import type { Metadata } from "next";
import { Suspense } from "react";
import { getStoreInfo } from "@/lib/server-data";
import { JsonLd, storeJsonLd } from "@/lib/seo";
import { HeroFallback, HeroSlides } from "@/components/home/HeroSlides";
import { CategoryCircles } from "@/components/home/CategoryCircles";
import { BeltGrid } from "@/components/home/BeltGrid";
import { ShopByCategory, ShopByCategorySkeleton } from "@/components/home/ShopByCategory";
import { CompleteTheLook, CompleteTheLookSkeleton } from "@/components/home/CompleteTheLook";
import { TodayDeals, TodayDealsSkeleton } from "@/components/home/TodayDeals";
import { NewCollection, NewCollectionSkeleton } from "@/components/home/NewCollection";
import { NewsSection, NewsSectionSkeleton } from "@/components/home/NewsSection";

/**
 * Trang chủ theo bố cục cửa hàng thể thao đa danh mục:
 * banner chạy, danh mục tròn, cấp đai, mua theo môn võ (2 lượt), bộ trang bị, ưu đãi, bộ sưu tập mới, cẩm nang.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Thông tin cửa hàng + ô tìm kiếm trên site cho Google (lấy từ cài đặt cửa hàng admin sửa được). */
async function StoreStructuredData() {
  return <JsonLd data={storeJsonLd(await getStoreInfo())} />;
}

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">VÕ SPORT, cửa hàng võ phục Vovinam, Taekwondo, Karate và Võ cổ truyền</h1>
      <Suspense fallback={null}>
        <StoreStructuredData />
      </Suspense>
      <Suspense fallback={<HeroFallback />}>
        <HeroSlides />
      </Suspense>

      <CategoryCircles />

      <Suspense fallback={null}>
        <BeltGrid />
      </Suspense>

      <Suspense fallback={<ShopByCategorySkeleton title="Mua sắm theo môn võ" />}>
        <ShopByCategory arts={["vovinam", "taekwondo"]} title="Mua sắm theo môn võ" />
      </Suspense>

      <Suspense fallback={<ShopByCategorySkeleton />}>
        <ShopByCategory arts={["karate", "vo_co_truyen"]} />
      </Suspense>

      <Suspense fallback={<CompleteTheLookSkeleton />}>
        <CompleteTheLook />
      </Suspense>

      <Suspense fallback={<TodayDealsSkeleton />}>
        <TodayDeals />
      </Suspense>

      <Suspense fallback={<NewCollectionSkeleton />}>
        <NewCollection />
      </Suspense>

      <Suspense fallback={<NewsSectionSkeleton />}>
        <NewsSection />
      </Suspense>
    </>
  );
}
