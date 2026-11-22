import type { Metadata } from "next";
import Image from "next/image";
import { QrCodeIcon, StorefrontIcon, TruckIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import { DOJO_TIERS } from "@/lib/catalog";
import { cx } from "@/lib/format";
import { container } from "@/components/ui/styles";
import { CampaignLookup, ClubRegisterForm } from "@/components/dojo/DojoForms";
import studentsImage from "@/public/vo-sinh-vovinam.jpg";

export const metadata: Metadata = {
  title: "Đồng phục võ đường",
  description: "Đặt đồng phục võ phục cho câu lạc bộ, võ đường với giá sỉ theo số lượng. Phụ huynh tự đặt size qua đường dẫn, giao tận võ đường.",
  alternates: { canonical: "/dojos" },
};

const FLOW = [
  { icon: StorefrontIcon, title: "Đăng ký võ đường", body: "Gửi thông tin câu lạc bộ ở biểu mẫu bên dưới để quản trị viên xét duyệt." },
  { icon: UsersThreeIcon, title: "Mở đợt đặt đồng phục", body: "Chọn mẫu võ phục, số lượng dự kiến và hạn chốt. Mức giá sỉ tính theo số lượng." },
  { icon: QrCodeIcon, title: "Gửi link cho phụ huynh", body: "Mỗi đợt có đường dẫn và mã QR riêng. Phụ huynh tự nhập size, tên thêu cho con." },
  { icon: TruckIcon, title: "Giao tận võ đường", body: "Hàng được đóng gói theo tên từng võ sinh và giao một lần cho cả lớp." },
];

export default function DojosPage() {
  return (
    <div className={cx(container, "py-8 lg:py-12")}>
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <h1 className="max-w-[16ch] text-3xl font-semibold tracking-tight text-ink md:text-5xl">Đồng phục cho cả võ đường</h1>
          <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-ink-2">
            Huấn luyện viên mở một đợt đặt hàng, phụ huynh tự chọn size cho con. Giảm đến 25% khi đặt từ 100 bộ.
          </p>
          <div className="mt-8 max-w-md rounded-md bg-muted p-5">
            <p className="mb-3 text-sm text-ink-2">Phụ huynh đã có mã đợt từ huấn luyện viên?</p>
            <CampaignLookup />
          </div>
        </div>
        <div className="overflow-hidden rounded-md bg-muted">
          <Image src={studentsImage} alt="Võ sinh Vovinam mặc võ phục xanh xếp hàng tại hội thao" placeholder="blur" sizes="(min-width: 1024px) 46vw, 100vw" className="aspect-[4/3] h-auto w-full object-cover" />
        </div>
      </section>

      <section className="mt-20 lg:mt-28">
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Giá sỉ theo số lượng dự kiến</h2>
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
          {DOJO_TIERS.map((tier, i) => (
            <div key={tier.min} className={cx("p-6", i === DOJO_TIERS.length - 1 ? "bg-accent-soft" : "bg-surface")}>
              <dt className="text-sm text-ink-2">{tier.label}</dt>
              <dd className="mt-2 text-4xl font-semibold tracking-tight text-ink tabular">-{tier.discount}%</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] text-ink-3">Áp dụng trên giá niêm yết của võ phục trong đợt. Phí thêu tên tính riêng 30.000₫ mỗi bộ.</p>
      </section>

      <section className="mt-20 lg:mt-28">
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Cách hoạt động</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-3 border-t border-line pt-5">
              <Icon weight="light" className="size-7 text-accent" aria-hidden />
              <p className="font-medium text-ink">{title}</p>
              <p className="text-sm leading-relaxed text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="dang-ky" className="mt-20 grid scroll-mt-24 gap-10 lg:mt-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Đăng ký võ đường</h2>
          <p className="mt-3 max-w-[42ch] leading-relaxed text-ink-2">
            Điền thông tin câu lạc bộ. Sau khi được duyệt, tài khoản huấn luyện viên có thể mở đợt đặt đồng phục.
          </p>
        </div>
        <ClubRegisterForm />
      </section>
    </div>
  );
}
