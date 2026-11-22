import Link from "next/link";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { BELT_RANKS, CATEGORIES, MARTIAL_ARTS, PRICE_RANGES, SHARED_ART } from "@/lib/catalog";
import { cx } from "@/lib/format";
import type { CatalogQuery } from "@/lib/server-data";
import type { CatalogFacets } from "@/lib/types";
import { catalogHref, hasActiveFilters } from "@/components/catalog/catalog-url";

interface Option {
  id: string;
  label: string;
  count?: number;
}

function FilterGroup({ title, param, options, query }: { title: string; param: keyof CatalogQuery; options: Option[]; query: CatalogQuery }) {
  const activeValue = query[param];
  const headingId = `filter-${param}`;
  return (
    <div role="group" aria-labelledby={headingId} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 id={headingId} className="mb-3 text-sm font-semibold text-ink">
        {title}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {options.map((opt) => {
          const active = activeValue === opt.id;
          return (
            <li key={opt.id}>
              <Link
                href={catalogHref(query, { [param]: active ? undefined : opt.id })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cx(
                  "group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors -mx-2",
                  active ? "font-medium text-ink" : "text-ink-2 hover:bg-muted hover:text-ink"
                )}
              >
                <span
                  className={cx(
                    "grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors",
                    active ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface group-hover:border-ink-3"
                  )}
                  aria-hidden
                >
                  {active && <CheckIcon weight="bold" className="size-2.5" />}
                </span>
                <span className="flex-1">{opt.label}</span>
                {opt.count !== undefined && <span className="text-[13px] text-ink-3 tabular">{opt.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FilterPanel({ query, facets }: { query: CatalogQuery; facets: CatalogFacets | null }) {
  const martialCounts = new Map(facets?.martial_arts.map((m) => [m.id, m.count]));
  const categoryCounts = new Map(facets?.categories.map((c) => [c.id, c.count]));
  const beltCounts = facets?.belt_ranks ?? {};

  return (
    <div className="flex flex-col gap-5">
      {hasActiveFilters(query) && (
        <Link href={catalogHref({ sort: query.sort })} scroll={false} className="self-start text-sm font-medium text-accent-text underline-offset-4 hover:underline">
          Xóa tất cả bộ lọc
        </Link>
      )}
      <FilterGroup
        title="Môn võ"
        param="martial_art"
        query={query}
        options={[...MARTIAL_ARTS, SHARED_ART].map((m) => ({ id: m.id, label: m.label, count: martialCounts.get(m.id) }))}
      />
      <FilterGroup
        title="Loại sản phẩm"
        param="category"
        query={query}
        options={CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: categoryCounts.get(c.id) }))}
      />
      <FilterGroup
        title="Cấp đai"
        param="belt_rank"
        query={query}
        options={BELT_RANKS.filter((b) => !facets || beltCounts[b.id]).map((b) => ({ id: b.id, label: b.label, count: beltCounts[b.id] }))}
      />
      <FilterGroup title="Khoảng giá" param="price" query={query} options={PRICE_RANGES.map((p) => ({ id: p.id, label: p.label }))} />
    </div>
  );
}
