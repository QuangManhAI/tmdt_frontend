"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatCircleTextIcon, IdentificationCardIcon, PackageIcon, RulerIcon, SignOutIcon } from "@phosphor-icons/react";
import { cx } from "@/lib/format";
import { useAuth } from "@/components/providers/AuthProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass } from "@/components/ui/styles";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { MyOrders } from "@/components/orders/OrderLookup";
import { StudentProfiles } from "@/components/account/StudentProfiles";
import { MyReviews } from "@/components/account/MyReviews";
import { AccountInfo } from "@/components/account/AccountInfo";

const TABS = [
  { id: "orders", label: "Đơn hàng", Icon: PackageIcon },
  { id: "students", label: "Hồ sơ võ sinh", Icon: RulerIcon },
  { id: "reviews", label: "Đánh giá", Icon: ChatCircleTextIcon },
  { id: "info", label: "Thông tin", Icon: IdentificationCardIcon },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Trang tài khoản khách hàng: đơn hàng, hồ sơ số đo võ sinh, đánh giá, thông tin cá nhân. Tab lưu trên URL (?tab=). */
export function AccountView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, ready, logout } = useAuth();
  const raw = searchParams.get("tab");
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "orders";

  if (!ready) return <Skeleton className="h-40 rounded-md" />;

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <LoginPrompt
          next={`/account${raw ? `?tab=${raw}` : ""}`}
          title="Đăng nhập để vào tài khoản"
          description="Xem mọi đơn hàng, lưu số đo cho từng bé và đánh giá sản phẩm đã mua."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
      <aside className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-ink-3">Xin chào</p>
          <p className="truncate text-lg font-semibold text-ink">{user.full_name}</p>
        </div>
        <nav aria-label="Tài khoản" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => router.replace(`/account?tab=${id}`, { scroll: false })}
              aria-current={tab === id ? "page" : undefined}
              className={cx(
                "flex h-10 shrink-0 items-center gap-2.5 rounded-sm px-3 text-sm font-medium transition-colors cursor-pointer",
                tab === id ? "bg-navy text-on-navy" : "text-ink-2 hover:bg-muted hover:text-ink"
              )}
            >
              <Icon className="size-[18px]" aria-hidden /> {label}
            </button>
          ))}
        </nav>
        <button type="button" onClick={logout} className={buttonClass("ghost", "sm", "hidden self-start lg:inline-flex")}>
          <SignOutIcon className="size-4" /> Đăng xuất
        </button>
      </aside>

      <section aria-label={TABS.find((t) => t.id === tab)?.label} className="min-w-0">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">{TABS.find((t) => t.id === tab)?.label}</h1>
        {tab === "orders" && (
          <div className="flex flex-col gap-4">
            <MyOrders token={token} />
            <p className="text-sm text-ink-3">
              Không thấy đơn đặt khi chưa đăng nhập? Mở đơn đó bằng{" "}
              <Link href="/orders" className="font-medium text-ink underline underline-offset-4">
                mã đơn + SĐT
              </Link>{" "}
              trên máy này, đơn sẽ tự được lưu vào tài khoản.
            </p>
          </div>
        )}
        {tab === "students" && <StudentProfiles token={token} />}
        {tab === "reviews" && <MyReviews token={token} />}
        {tab === "info" && <AccountInfo token={token} />}
      </section>
    </div>
  );
}
