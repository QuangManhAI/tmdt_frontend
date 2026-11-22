import { getProductDetail } from "@/lib/server-data";
import type { Product } from "@/lib/types";
import { sectionTitle } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { BundleCard } from "@/components/home/BundleCard";
import { ScrollRail } from "@/components/home/ScrollRail";
import { railItem3 } from "@/components/home/rail-sizes";

/** Các bộ trang bị gợi ý, ghép từ sản phẩm có thật trong dữ liệu mẫu. Món đầu tiên là ảnh chính. */
const BUNDLES = [
  { title: "Bộ võ sinh Vovinam", ids: ["prod-vp-vov", "prod-dai-vov-lam", "prod-bh-vov-giap", "prod-tui-balo"] },
  { title: "Bộ thi đấu Taekwondo", ids: ["prod-vp-tkd", "prod-bh-tkd-mu", "prod-bh-tkd-taychan", "prod-tui-thethao"] },
  { title: "Bộ thi đấu Karate", ids: ["prod-vp-kar", "prod-bh-kar-gang", "prod-bh-kar-ongdong", "prod-pk-bangquan"] },
  { title: "Bộ tập luyện Võ cổ truyền", ids: ["prod-vp-vct", "prod-dai-vct-do", "prod-pk-connhi", "prod-tui-vophuc"] },
];

export async function CompleteTheLook() {
  const resolved = await Promise.all(
    BUNDLES.map(async (bundle) => {
      const details = await Promise.all(bundle.ids.map((id) => getProductDetail(id)));
      const items = details.flatMap((d) => (d.ok && d.data.product.is_active ? [d.data.product] : []));
      return { title: bundle.title, items, hasMain: details[0]?.ok ?? false };
    })
  );
  const bundles = resolved.filter((b): b is { title: string; items: Product[]; hasMain: true } => b.hasMain && b.items.length >= 2);
  if (bundles.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20" aria-labelledby="hoan-thien">
      <h2 id="hoan-thien" className={`${sectionTitle} mb-8`}>
        Hoàn thiện bộ trang bị
      </h2>
      <ScrollRail label="Bộ trang bị gợi ý" arrowTop="50%">
        {bundles.map((b) => (
          <div key={b.title} className={railItem3}>
            <BundleCard title={b.title} items={b.items} />
            <p className="mt-3 text-[15px] font-semibold text-ink">{b.title}</p>
          </div>
        ))}
      </ScrollRail>
    </section>
  );
}

export function CompleteTheLookSkeleton() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20" aria-hidden>
      <Skeleton className="mb-8 h-9 w-80" />
      <div className="flex gap-5 overflow-hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className={`${railItem3} h-[460px] rounded-none lg:h-[520px]`} />
        ))}
      </div>
    </section>
  );
}
