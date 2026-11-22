import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { cx } from "@/lib/format";
import { container } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { AuthForms } from "@/components/auth/AuthForms";
import teamImage from "@/public/vovi.jpg";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập để theo dõi đơn hàng, lưu số đo võ sinh và đặt đồng phục cho võ đường.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className={cx(container, "grid gap-12 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16")}>
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Chào mừng trở lại</h1>
        <p className="mt-2 text-ink-2">Theo dõi đơn hàng, lưu số đo cho con và nhận ưu đãi dành cho võ sinh.</p>
        <div className="mt-8">
          <Suspense
            fallback={
              <div className="flex flex-col gap-5">
                <Skeleton className="h-12" />
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
              </div>
            }
          >
            <AuthForms />
          </Suspense>
        </div>
      </div>
      <div className="relative hidden h-[620px] overflow-hidden rounded-md bg-muted lg:sticky lg:top-24 lg:block lg:self-start">
        <Image src={teamImage} alt="" fill sizes="50vw" placeholder="blur" className="object-cover" />
      </div>
    </div>
  );
}
