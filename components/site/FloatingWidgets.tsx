"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CaretUpIcon } from "@phosphor-icons/react";
import { cx } from "@/lib/format";
import { ChatWidget } from "@/components/chat/ChatWidget";

/**
 * Nút nổi: chat với cửa hàng (góc trái), lên đầu trang (góc phải, chỉ hiện khi đã cuộn khỏi đầu trang)
 * và thẻ dọc "Mã giảm giá" ở mép phải. Phát hiện cuộn bằng IntersectionObserver, không nghe sự kiện scroll.
 */
export function FloatingWidgets() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("dau-trang");
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setShowTop(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <ChatWidget />

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
        className={cx(
          "fixed right-5 bottom-5 z-30 hidden size-12 place-items-center sm:grid rounded-full bg-navy text-on-navy shadow-lift transition-[opacity,transform] duration-300 ease-out-soft hover:scale-105 cursor-pointer",
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
        aria-label="Lên đầu trang"
        tabIndex={showTop ? 0 : -1}
      >
        <CaretUpIcon weight="bold" className="size-6" />
      </button>

      <Link
        href="/#uu-dai"
        className="fixed top-1/2 right-0 z-30 hidden -translate-y-1/2 rounded-l-xl bg-navy px-2.5 py-4 text-[13px] font-bold tracking-[0.2em] text-on-navy uppercase shadow-lift transition-colors [writing-mode:vertical-rl] hover:bg-accent md:block"
      >
        Mã giảm giá
      </Link>
    </>
  );
}
