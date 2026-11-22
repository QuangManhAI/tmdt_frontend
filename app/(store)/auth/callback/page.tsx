import type { Metadata } from "next";
import { cx } from "@/lib/format";
import { container } from "@/components/ui/styles";
import { OAuthCallback } from "@/components/auth/OAuthCallback";

export const metadata: Metadata = {
  title: "Đang đăng nhập",
  robots: { index: false },
};

export default function OAuthCallbackPage() {
  return (
    <div className={cx(container, "py-16 lg:py-24")}>
      <div className="mx-auto w-full max-w-md text-center">
        <OAuthCallback />
      </div>
    </div>
  );
}
