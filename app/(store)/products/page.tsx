import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react/ssr";
import { BELT_RANKS, CATEGORIES, PRICE_RANGES, SORT_OPTIONS, categoryLabel, martialArtLabel } from "@/lib/catalog";
import { cx } from "@/lib/format";
import { getFacets, getProducts, parseCatalogQuery, type CatalogQuery } from "@/lib/server-data";
import { container } from "@/components/ui/styles";
import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/components/product/ProductCard";
import { ApiUnavailable } from "@/components/home/ProductSections";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { MobileFilters, SortSelect } from "@/components/catalog/CatalogControls";
import { catalogHref, hasActiveFilters } from "@/components/catalog/catalog-url";

export const metadata: Metadata = {
  title: "Sản phẩm",
  description: "Võ phục, đai, đồ bảo hộ và phụ kiện cho Vovinam, Taekwondo, Karate, Võ cổ truyền. Lọc theo môn võ, cấp đai và khoảng giá.",
};

const PAGE_SIZE = 12;

function catalogTitle(q: CatalogQuery): string {
  if (q.search) return `Kết quả cho “${q.search}”`;
  const category = categoryLabel(q.category);
  const art = martialArtLabel(q.martial_art);
  if (category && art) return `${category} ${art}`;
  if (category) return category;
  if (art) return `Sản phẩm ${art}`;
  return "Tất cả sản phẩm";
}

function ActiveChips({ q }: { q: CatalogQuery }) {
  const chips = [
    q.search && { key: "search", label: `“${q.search}”` },
    q.martial_art && { key: "martial_art", label: martialArtLabel(q.martial_art) || q.martial_art },
    q.category && { key: "category", label: CATEGORIES.find((c) => c.id === q.category)?.label ?? q.category },
    q.belt_rank && { key: "belt_rank", label: BELT_RANKS.find((b) => b.id === q.belt_rank)?.label ?? q.belt_rank },
    q.price && { key: "price", label: PRICE_RANGES.find((p) => p.id === q.price)?.label ?? q.price },
  ].filter(Boolean) as Array<{ key: keyof CatalogQuery; label: string }>;

  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={catalogHref(q, { [chip.key]: undefined })}
            scroll={false}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface pr-2 pl-3 text-[13px] font-medium text-ink transition-colors hover:border-line-strong"
            aria-label={`Bỏ lọc ${chip.label}`}
          >
            {chip.label}
            <XIcon className="size-3.5 text-ink-3" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Pagination({ q, total }: { q: CatalogQuery; total: number }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const page = Math.min(q.page ?? 1, pages);
  const item = "grid size-10 place-items-center rounded-lg text-sm font-medium tabular transition-colors";

  return (
    <nav aria-label="Phân trang" className="mt-14 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={catalogHref(q, { page: page - 1 })} className={cx(item, "text-ink-2 hover:bg-muted")} aria-label="Trang trước">
          <CaretLeftIcon className="size-4" />
        </Link>
      ) : (
        <span className={cx(item, "text-ink-3 opacity-40")} aria-hidden>
          <CaretLeftIcon className="size-4" />
        </span>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={catalogHref(q, { page: n })}
          aria-current={n === page ? "page" : undefined}
          className={cx(item, n === page ? "bg-ink text-bg" : "text-ink-2 hover:bg-muted")}
        >
          {n}
        </Link>
      ))}
      {page < pages ? (
        <Link href={catalogHref(q, { page: page + 1 })} className={cx(item, "text-ink-2 hover:bg-muted")} aria-label="Trang sau">
          <CaretRightIcon className="size-4" />
        </Link>
      ) : (
        <span className={cx(item, "text-ink-3 opacity-40")} aria-hidden>
          <CaretRightIcon className="size-4" />
        </span>
      )}
    </nav>
  );
}

async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = parseCatalogQuery(await searchParams);
  const [facetsResult, productsResult] = await Promise.all([getFacets(), getProducts({ ...q, limit: PAGE_SIZE })]);
  const facets = facetsResult.ok ? facetsResult.data : null;
  const activeCount = [q.martial_art, q.category, q.belt_rank, q.price].filter(Boolean).length;
  const sortHrefs = Object.fromEntries(SORT_OPTIONS.map((opt) => [opt.id, catalogHref(q, { sort: opt.id })]));

  return (
    <>
      <div className="flex flex-col gap-2 pt-6 pb-8 lg:pt-10">
        <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
          <Link href="/" className="hover:text-ink">
            Trang chủ
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-2">Sản phẩm</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-wide text-heading uppercase md:text-4xl">{catalogTitle(q)}</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[232px_1fr] lg:gap-12">
        <aside className="hidden lg:block" aria-label="Bộ lọc sản phẩm">
          <div className="sticky top-24">
            <FilterPanel query={q} facets={facets} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex flex-col gap-4 border-b border-line pb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-2 tabular" aria-live="polite">
                {productsResult.ok ? `${productsResult.data.total} sản phẩm` : ""}
              </p>
              <div className="flex items-center gap-2">
                <MobileFilters activeCount={activeCount}>
                  <FilterPanel query={q} facets={facets} />
                </MobileFilters>
                <SortSelect value={q.sort ?? "popular"} hrefFor={sortHrefs} />
              </div>
            </div>
            <ActiveChips q={q} />
          </div>

          {!productsResult.ok ? (
            <ApiUnavailable />
          ) : productsResult.data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-line px-6 py-16 text-center">
              <MagnifyingGlassIcon weight="light" className="size-10 text-ink-3" aria-hidden />
              <div>
                <p className="font-medium text-ink">Không có sản phẩm phù hợp</p>
                <p className="mt-1 text-sm text-ink-2">Thử bỏ bớt bộ lọc hoặc tìm với từ khóa ngắn hơn, ví dụ “đai” hoặc “giáp”.</p>
              </div>
              {hasActiveFilters(q) && (
                <Link href="/products" className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
                  Xem tất cả sản phẩm
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-5">
                {productsResult.data.items.map((product, i) => (
                  <ProductCard key={product.id} product={product} preload={i < 3} sizes="(min-width: 1280px) 20vw, (min-width: 768px) 31vw, 46vw" />
                ))}
              </div>
              <Pagination q={q} total={productsResult.data.total} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function CatalogSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3 pt-6 pb-8 lg:pt-10">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[232px_1fr] lg:gap-12">
        <div className="hidden flex-col gap-3 lg:flex">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        <div>
          <Skeleton className="mb-6 h-10 w-full" />
          <ProductGridSkeleton count={6} columns="md:grid-cols-3" />
        </div>
      </div>
    </>
  );
}

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <div className={container}>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
