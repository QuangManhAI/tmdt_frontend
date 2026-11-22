"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cx } from "@/lib/format";

const INTERVAL_MS = 5000;
const SLIDE_MS = 600;

/**
 * Băng chuyền banner chạy vòng tròn: tự chuyển mỗi 5 giây, slide mới đi vào từ phải sang trái.
 * Dãy slide được kẹp thêm bản sao [slide cuối, ...slides, slide đầu]; khi trượt tới bản sao thì
 * nhảy tức thời (không hiệu ứng) về slide thật tương ứng, nên từ slide cuối sang slide đầu vẫn
 * trượt tiếp một bước thay vì tua ngược qua mọi slide.
 * Dừng khi rê chuột / focus / tab ẩn; vuốt trên di động; tắt hiệu ứng khi bật giảm chuyển động.
 */
export function HeroCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  // pos là vị trí trong dãy có bản sao: 0 = bản sao slide cuối, 1..count = slide thật, count + 1 = bản sao slide đầu
  const [pos, setPos] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const touchX = useRef<number | null>(null);

  const index = (((pos - 1) % count) + count) % count;
  const atClone = pos === 0 || pos === count + 1;

  // Tới bản sao: chờ hiệu ứng trượt xong rồi nhảy về slide thật, không có hiệu ứng
  useEffect(() => {
    if (!atClone) return;
    const id = window.setTimeout(
      () => {
        setAnimate(false);
        setPos(pos === 0 ? count : 1);
      },
      SLIDE_MS
    );
    return () => window.clearTimeout(id);
  }, [atClone, pos, count]);

  // Bật lại hiệu ứng sau khi trình duyệt đã vẽ vị trí mới (2 khung hình)
  useEffect(() => {
    if (animate) return;
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [animate]);

  const go = useCallback(
    (delta: number) => {
      setPos((p) => {
        // Đang ở bản sao (chưa kịp nhảy về) thì bỏ qua để không trượt ra ngoài dãy
        if (p === 0 || p === count + 1) return p;
        return p + delta;
      });
    },
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
      if (!document.hidden) go(1);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, count, go, timerKey]);

  if (count === 0) return null;

  const track = count > 1 ? [slides[count - 1], ...slides, slides[0]] : slides;
  const offset = count > 1 ? pos : 0;
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
        className={cx("flex", animate && "transition-transform ease-out-soft motion-reduce:transition-none")}
        style={{ transform: `translateX(-${offset * 100}%)`, transitionDuration: `${SLIDE_MS}ms` }}
      >
        {track.map((slide, i) => {
          const isClone = count > 1 && (i === 0 || i === count + 1);
          const active = !isClone && i === (count > 1 ? index + 1 : 0);
          return (
            <div
              key={isClone ? `clone-${i}` : `slide-${i}`}
              className="w-full shrink-0"
              aria-roledescription={isClone ? undefined : "slide"}
              aria-label={isClone ? undefined : `${(count > 1 ? i - 1 : i) + 1} / ${count}`}
              aria-hidden={!active}
              inert={!active}
            >
              {slide}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => manual(() => go(-1))} className={cx(arrow, "left-5 opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100")} aria-label="Banner trước">
            <CaretLeftIcon className="size-5" />
          </button>
          <button type="button" onClick={() => manual(() => go(1))} className={cx(arrow, "right-5 opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100")} aria-label="Banner tiếp theo">
            <CaretRightIcon className="size-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => manual(() => setPos(i + 1))}
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
