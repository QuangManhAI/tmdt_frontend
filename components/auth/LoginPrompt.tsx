"use client";

import Link from "next/link";
import { UserCircleIcon } from "@phosphor-icons/react";
import { cx } from "@/lib/format";
import { SocialLogin } from "@/components/auth/SocialLogin";

/**
 * Lời mời đăng nhập / tạo tài khoản cho khách vãng lai: đăng nhập xong các đơn đã đặt trên máy này
 * tự được lưu vào tài khoản (AuthProvider gọi /account/claim-orders).
 */
export function LoginPrompt({ next, title, description, className }: { next: string; title: string; description: string; className?: string }) {
  const q = `next=${encodeURIComponent(next)}`;
  return (
    <section className={cx("rounded-md border border-line bg-surface p-5 sm:p-6", className)}>
      <div className="flex items-start gap-3">
        <UserCircleIcon weight="duotone" className="size-8 shrink-0 text-accent" aria-hidden />
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <SocialLogin next={next} divider={false} />
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href={`/login?${q}`} className="font-medium text-ink underline-offset-4 hover:underline">
            Đăng nhập bằng số điện thoại
          </Link>
          <Link href={`/login?tab=register&${q}`} className="font-medium text-accent-text underline-offset-4 hover:underline">
            Tạo tài khoản mới
          </Link>
        </div>
      </div>
    </section>
  );
}
