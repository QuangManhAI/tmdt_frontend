import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowsVerticalIcon, BabyIcon, ScalesIcon } from "@phosphor-icons/react/ssr";
import { MARTIAL_ARTS } from "@/lib/catalog";
import { cx } from "@/lib/format";
import { getSizeChart } from "@/lib/server-data";
import { container } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { SizeAdvisorForm } from "@/components/size/SizeAdvisorForm";
import { SizeChartTabs } from "@/components/size/SizeChartTabs";

export const metadata: Metadata = {
  title: "Tư vấn size võ phục",
  description: "Tính size võ phục Vovinam, Taekwondo, Karate, Võ cổ truyền theo chiều cao và cân nặng. Bảng size chuẩn và cách đo cho trẻ em, người lớn.",
  alternates: { canonical: "/size-guide" },
};

const TIPS = [
  { icon: ArrowsVerticalIcon, title: "Đo chiều cao", body: "Đứng thẳng, không mang giày, lưng và gót chân sát tường. Đo từ sàn đến đỉnh đầu." },
  { icon: ScalesIcon, title: "Cân nặng", body: "Cân vào buổi sáng, mặc đồ mỏng. Vóc dáng đậm người nên chọn thêm tùy chọn \"Đậm người\"." },
  { icon: BabyIcon, title: "Trẻ đang lớn", body: "Trẻ dưới 12 tuổi lớn nhanh, nên mua rộng 1 size để mặc được lâu hơn." },
];

async function Charts() {
  const results = await Promise.all(MARTIAL_ARTS.map((m) => getSizeChart(m.id)));
  const charts = Object.fromEntries(MARTIAL_ARTS.map((m, i) => [m.id, results[i].ok ? results[i].data : []]));
  return <SizeChartTabs charts={charts} />;
}

export default function SizeGuidePage() {
  return (
    <div className={cx(container, "py-8 lg:py-12")}>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-5xl">Tư vấn size võ phục</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-2">Nhập số đo của võ sinh để nhận size đề xuất theo bảng chuẩn của từng môn võ.</p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="rounded-md border border-line bg-surface p-5 sm:p-7">
          <SizeAdvisorForm />
        </div>
        <ul className="flex flex-col gap-6">
          {TIPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-sm bg-muted text-ink-2">
                <Icon weight="light" className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-ink">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p>
              </div>
            </li>
          ))}
          <li className="rounded-md bg-muted p-5 text-sm leading-relaxed text-ink-2">
            Mặc không vừa? Đổi size miễn phí trong 7 ngày kể từ khi nhận hàng (áp dụng cho sản phẩm không thêu tên).
          </li>
        </ul>
      </div>

      <section className="mt-20">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Bảng size chuẩn</h2>
        <Suspense fallback={<Skeleton className="h-96 rounded-md" />}>
          <Charts />
        </Suspense>
      </section>
    </div>
  );
}
