import type { Metadata } from "next";
import { Suspense } from "react";
import { cx } from "@/lib/format";
import { container } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = {
  title: "Tài khoản của tôi",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div className={cx(container, "py-8 lg:py-12")}>
      {/* Đọc ?tab= qua useSearchParams nên phải nằm trong Suspense (Cache Components) */}
      <Suspense fallback={<Skeleton className="h-40 rounded-md" />}>
        <AccountView />
      </Suspense>
    </div>
  );
}
