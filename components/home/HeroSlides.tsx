import Image from "next/image";
import Link from "next/link";
import { PlayIcon } from "@phosphor-icons/react/ssr";
import { DOJO_TIERS } from "@/lib/catalog";
import { formatVND } from "@/lib/format";
import { getActiveVouchers } from "@/lib/server-data";
import type { ActiveVoucher } from "@/lib/types";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import teamImage from "@/public/vovi.jpg";
import uniformImage from "@/public/mau_1.jpg";

const slideBase = "relative h-[460px] overflow-hidden sm:h-[500px] lg:h-[560px]";

function ShopButton({ href, label = "Mua ngay" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-sm bg-surface px-7 py-4 text-xl font-bold tracking-wide text-navy uppercase shadow-lift transition-transform duration-300 ease-out-soft hover:-translate-y-0.5 sm:text-2xl"
    >
      {label}
      <PlayIcon weight="fill" className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}

function TeamSlide() {
  return (
    <div className={slideBase}>
      <Image src={teamImage} alt="Đội tuyển Vovinam trong võ phục xanh, đai vàng, cầm cờ Việt Nam" fill preload placeholder="blur" sizes="100vw" className="object-cover object-[70%_center]" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/55 to-transparent" />
      <div className="relative mx-auto flex h-full max-w-[1360px] flex-col justify-center px-6 sm:px-10 lg:px-16">
        <p className="w-fit rounded-sm bg-accent px-3 py-1 text-sm font-bold tracking-widest text-on-accent uppercase">Mùa tập mới</p>
        <h2 className="mt-5 max-w-[14ch] text-5xl leading-[0.95] font-bold text-on-navy uppercase italic sm:text-6xl lg:text-7xl">Võ phục chuẩn liên đoàn</h2>
        <p className="mt-5 max-w-md text-lg text-on-navy/85">Vovinam, Taekwondo, Karate, Võ cổ truyền. Tư vấn size miễn phí, thêu tên theo yêu cầu.</p>
        <div className="mt-8">
          <ShopButton href="/products?category=vo_phuc" />
        </div>
      </div>
    </div>
  );
}

function VoucherSlide({ voucher }: { voucher: ActiveVoucher }) {
  const amount = voucher.discount_type === "PERCENT" ? `${voucher.discount_value}%` : formatVND(voucher.discount_value);
  return (
    <div className={`${slideBase} grid-paper`}>
      <div className="relative mx-auto grid h-full max-w-[1360px] items-center gap-6 px-6 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:px-16">
        <div>
          <p className="w-fit bg-navy px-4 py-2 text-xl font-bold tracking-wide text-on-navy uppercase italic sm:text-2xl">Ưu đãi độc quyền website</p>
          <div className="mt-6 flex flex-wrap items-stretch gap-3">
            <div className="bg-surface px-5 py-3 shadow-soft">
              <p className="text-xl font-bold text-navy">Giảm</p>
              <p className="text-6xl leading-none font-bold text-accent sm:text-7xl lg:text-8xl">{amount}</p>
            </div>
            <div className="flex flex-col justify-center bg-accent px-5 py-3 text-on-accent shadow-soft">
              <p className="text-sm font-semibold tracking-wide uppercase">Nhập mã</p>
              <p className="text-3xl font-bold tracking-wider sm:text-4xl">{voucher.code}</p>
            </div>
          </div>
          <p className="mt-5 text-lg text-ink-2">
            Áp dụng cho đơn từ <span className="font-semibold text-ink">{formatVND(voucher.min_order_amount)}</span>. Nhập mã ở bước thanh toán.
          </p>
          <div className="mt-7">
            <ShopButton href="/products?sort=discount" />
          </div>
        </div>
        <div className="relative hidden h-[80%] lg:block">
          <div className="absolute inset-y-0 right-6 w-[78%] -rotate-3 bg-surface p-3 shadow-lift">
            <Image src={uniformImage} alt="Võ phục Vovinam xanh kèm đai đỏ" fill sizes="40vw" className="object-cover p-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DojoSlide() {
  const best = DOJO_TIERS[DOJO_TIERS.length - 1];
  return (
    <div className={`${slideBase} bg-accent`}>
      <div className="absolute inset-y-0 right-0 hidden w-[52%] [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)] lg:block">
        <Image src={teamImage} alt="" fill sizes="52vw" className="object-cover object-center" />
      </div>
      <div className="relative mx-auto flex h-full max-w-[1360px] flex-col justify-center px-6 sm:px-10 lg:px-16">
        <h2 className="max-w-[12ch] text-5xl leading-[0.95] font-bold text-on-accent uppercase italic sm:text-6xl lg:text-7xl">Đồng phục cả võ đường</h2>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div className="bg-surface px-5 py-3">
            <p className="text-lg font-bold text-navy">Giảm đến</p>
            <p className="text-6xl leading-none font-bold text-navy sm:text-7xl">{best.discount}%</p>
          </div>
          <p className="max-w-[16rem] pb-2 text-lg font-semibold text-on-accent">Giá sỉ theo số lượng, phụ huynh tự đặt size qua link riêng.</p>
        </div>
        <div className="mt-8">
          <ShopButton href="/dojos" label="Đăng ký" />
        </div>
      </div>
    </div>
  );
}

export async function HeroSlides() {
  const vouchers = await getActiveVouchers();
  const voucher = vouchers.ok ? vouchers.data[0] : undefined;
  return (
    <HeroCarousel>
      <TeamSlide />
      {voucher && <VoucherSlide voucher={voucher} />}
      <DojoSlide />
    </HeroCarousel>
  );
}

export function HeroFallback() {
  return (
    <HeroCarousel>
      <TeamSlide />
      <DojoSlide />
    </HeroCarousel>
  );
}
