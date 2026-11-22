"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cx } from "@/lib/format";

const INTERVAL_MS = 5000;
const SLIDE_MS = 600;

/**
 * Băng chuyền banner kiểu đi tới – đi lui: tự chuyển mỗi 5 giây, tới slide cuối thì trượt ngược dần
 * về slide đầu rồi lại đi tới (không xoay vòng, không có slide nhân bản hay cú nhảy ngầm).
 * Nút trước/sau dừng ở hai đầu. Dừng khi rê chuột / focus / tab ẩn; vuốt trên di động;
 * tắt hiệu ứng khi bật giảm chuyển động.
 */
export function HeroCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  // Hướng tự chạy: 1 = sang phải, -1 = quay lại; đổi chiều khi chạm đầu/cuối
  const dir = useRef(1);
  const indexRef = useRef(0);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(count - 1, Math.max(0, i + delta))),
    [count]
  );

  // Bấm nút / vuốt / chấm thì đếm lại 5 giây từ đầu
  const manual = (fn: () => void) => {
    fn();
    setTimerKey((k) => k + 1);
  };

  useEffect(() => {
    // Giảm chuyển động: không tự chuyển, chỉ chuyển khi người dùng bấm
    if (paused || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      // Tính ngoài updater của setState (StrictMode gọi updater 2 lần sẽ lật chiều 2 lần)
      const i = indexRef.current;
      if (i + dir.current > count - 1 || i + dir.current < 0) dir.current = -dir.current;
      setIndex(i + dir.current);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, count, timerKey]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  if (count === 0) return null;

  const arrow =
    "absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-soft backdrop-blur transition-[background-color,opacity] duration-200 hover:bg-surface md:grid cursor-pointer";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Chương trình nổi bật"
      className="group/hero relative overflow-hidden bg-navy"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) manual(() => go(dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div
        className="flex transition-transform ease-out-soft motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)`, transitionDuration: `${SLIDE_MS}ms` }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => manual(() => go(-1))} disabled={index === 0} className={cx(arrow, "left-5 opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 disabled:!opacity-0")} aria-label="Banner trước">
            <CaretLeftIcon className="size-5" />
          </button>
          <button type="button" onClick={() => manual(() => go(1))} disabled={index === count - 1} className={cx(arrow, "right-5 opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 disabled:!opacity-0")} aria-label="Banner tiếp theo">
            <CaretRightIcon className="size-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => manual(() => setIndex(i))}
                aria-label={`Xem banner ${i + 1}`}
                aria-current={i === index}
                className={cx("size-2.5 rounded-full shadow-[0_0_0_1px_rgb(21_33_61/0.35)] transition-[transform,background-color] duration-300 cursor-pointer", i === index ? "scale-125 bg-on-navy" : "bg-on-navy/45 hover:bg-on-navy/70")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
