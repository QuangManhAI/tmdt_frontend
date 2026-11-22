import Link from "next/link";
import {
  BackpackIcon,
  CoatHangerIcon,
  HandFistIcon,
  MedalIcon,
  PercentIcon,
  PersonSimpleTaiChiIcon,
  PersonSimpleThrowIcon,
  RulerIcon,
  ShieldCheckIcon,
  SparkleIcon,
  SwordIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";
import { cx } from "@/lib/format";
import { sectionTitle } from "@/components/ui/styles";

const ITEMS = [
  { label: "Vovinam", href: "/products?martial_art=vovinam", icon: PersonSimpleTaiChiIcon },
  { label: "Taekwondo", href: "/products?martial_art=taekwondo", icon: PersonSimpleThrowIcon },
  { label: "Karate", href: "/products?martial_art=karate", icon: HandFistIcon },
  { label: "Võ cổ truyền", href: "/products?martial_art=vo_co_truyen", icon: SwordIcon },
  { label: "Võ phục", href: "/products?category=vo_phuc", icon: CoatHangerIcon },
  { label: "Đai các cấp", href: "/products?category=dai", icon: MedalIcon },
  { label: "Bảo hộ & giáp", href: "/products?category=bao_ho", icon: ShieldCheckIcon },
  { label: "Túi & balo", href: "/products?category=tui_dung", icon: BackpackIcon },
  { label: "Phụ kiện", href: "/products?category=phu_kien", icon: SparkleIcon },
  { label: "Đang giảm giá", href: "/products?sort=discount", icon: PercentIcon },
  { label: "Tư vấn size", href: "/size-guide", icon: RulerIcon },
  { label: "Võ đường", href: "/dojos", icon: UsersThreeIcon },
];

/** "Danh mục sản phẩm": ô tròn lớn kèm huy hiệu biểu tượng ở góc, 6 ô mỗi hàng trên desktop. */
export function CategoryCircles() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20" aria-labelledby="danh-muc">
      <h2 id="danh-muc" className={sectionTitle}>
        Danh mục sản phẩm
      </h2>
      <ul className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-8 lg:gap-y-12">
        {ITEMS.map(({ label, href, icon: Icon }, i) => (
          <li key={label}>
            <Link href={href} className="group flex flex-col items-center gap-4 text-center">
              <span className="relative block aspect-square w-full max-w-[200px]">
                <span
                  className={cx(
                    "grid size-full place-items-center rounded-full transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]",
                    i % 3 === 0 ? "bg-navy text-on-navy" : i % 3 === 1 ? "bg-muted text-navy dark:text-ink" : "bg-accent-soft text-accent-text"
                  )}
                >
                  <Icon weight="thin" className="size-[46%]" aria-hidden />
                </span>
                <span className="absolute top-[4%] right-[4%] grid size-[30%] place-items-center rounded-full border-[3px] border-surface bg-navy text-accent-on-navy shadow-soft transition-transform duration-500 ease-out-soft group-hover:rotate-12">
                  <Icon weight="bold" className="size-[48%]" aria-hidden />
                </span>
              </span>
              <span className="text-sm font-semibold tracking-wide text-heading uppercase transition-colors group-hover:text-accent-text sm:text-base">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
