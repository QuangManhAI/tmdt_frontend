"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { ApiError } from "@/lib/api";
import { isStaffRole, useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { buttonClass } from "@/components/ui/styles";

/** Backend chuyển về /auth/callback#token=...&next=... sau khi Google/Facebook xác thực xong. */
export function OAuthCallback() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const { notify } = useToast();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");
    const next = params.get("next");
    // Xóa token khỏi thanh địa chỉ / lịch sử trình duyệt ngay lập tức
    window.history.replaceState(null, "", window.location.pathname);

    (token ? loginWithToken(token) : Promise.reject(new ApiError("Không nhận được thông tin đăng nhập. Vui lòng thử lại.", 0)))
      .then((user) => {
        notify({ tone: "success", title: `Xin chào, ${user.full_name}` });
        const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
        router.replace(safeNext ?? (isStaffRole(user.role) ? "/admin" : "/"));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Đăng nhập thất bại. Vui lòng thử lại."));
  }, [loginWithToken, notify, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6">
        <p role="alert" className="w-full rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text">
          {error}
        </p>
        <Link href="/login" className={buttonClass("dark", "lg")}>
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-ink-2" role="status">
      <CircleNotchIcon className="size-8 animate-spin text-ink" />
      Đang hoàn tất đăng nhập…
    </div>
  );
}
