import type { ReactElement } from "react";
import { getApiUrl } from "@/lib/api";
import { buttonClass } from "@/components/ui/styles";

type Provider = "google" | "facebook";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className="size-5 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className="size-5 shrink-0" aria-hidden="true">
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
      <path fill="#fff" d="m16.67 15.56.53-3.49h-3.33V9.82c0-.96.47-1.89 1.96-1.89h1.51V4.96s-1.37-.24-2.68-.24c-2.74 0-4.53 1.67-4.53 4.69v2.66H7.08v3.49h3.05V24a12.1 12.1 0 0 0 3.74 0v-8.44h2.8Z" />
    </svg>
  );
}

const LABELS: Record<Provider, { label: string; Logo: () => ReactElement }> = {
  google: { label: "Google", Logo: GoogleLogo },
  facebook: { label: "Facebook", Logo: FacebookLogo },
};

/**
 * Nút đăng nhập Google/Facebook, luôn hiện đủ 2 nút. Chuyển cả trang sang backend (luồng OAuth phía server).
 * Provider nào chưa cấu hình thì backend trả về /login?oauth_error=... và form hiện thông báo lỗi.
 */
export function SocialLogin({ next }: { next?: string | null }) {
  const hrefFor = (p: Provider) => {
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
    const qs = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";
    return getApiUrl(`/api/v1/auth/oauth/${p}/start${qs}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 text-xs text-ink-3">
        <span className="h-px flex-1 bg-line" />
        hoặc tiếp tục với
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["google", "facebook"] as const).map((p) => {
          const { label, Logo } = LABELS[p];
          return (
            <a key={p} href={hrefFor(p)} className={buttonClass("secondary", "lg", "min-w-0 px-4")}>
              <Logo />
              <span className="min-w-0 truncate">{label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
