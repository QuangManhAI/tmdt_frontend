import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { SITE_BASE_URL } from "@/lib/api";
import { Providers } from "./providers";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  title: {
    default: "VÕ SPORT | Võ phục & phụ kiện võ thuật chính hãng",
    template: "%s | VÕ SPORT",
  },
  description:
    "Võ phục Vovinam, Taekwondo, Karate, Võ cổ truyền đúng quy cách liên đoàn. Tư vấn size theo chiều cao, cân nặng, thêu tên theo yêu cầu và đặt đồng phục cho võ đường.",
  keywords: ["võ phục vovinam", "võ phục taekwondo", "võ phục karate", "võ phục cổ truyền", "đai võ thuật", "tư vấn size võ phục"],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "VÕ SPORT",
    images: [{ url: "/banner-bieu-dien.jpg", width: 1432, height: 593, alt: "Võ sinh Vovinam biểu diễn trong võ phục xanh" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#15213d",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-dvh bg-bg font-sans text-ink antialiased">
        <a
          href="#noi-dung"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-bg"
        >
          Bỏ qua đến nội dung chính
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
