"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRightIcon, CircleNotchIcon, RulerIcon, WarningIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { MARTIAL_ARTS, martialArtLabel } from "@/lib/catalog";
import { cx } from "@/lib/format";
import type { SizeRecommendation } from "@/lib/types";
import { buttonClass, inputClass, labelClass } from "@/components/ui/styles";
import { SaveStudentProfile } from "@/components/size/SaveStudentProfile";

const BUILDS = [
  { id: "lean", label: "Gầy" },
  { id: "standard", label: "Cân đối" },
  { id: "bulky", label: "Đậm người" },
] as const;

interface SizeAdvisorFormProps {
  defaultMartialArt?: string;
  lockMartialArt?: boolean;
  /** Gọi khi có kết quả; trang chi tiết sản phẩm dùng để tự chọn size tương ứng. */
  onResult?: (result: SizeRecommendation) => void;
  showShopLink?: boolean;
  className?: string;
}

export function SizeAdvisorForm({ defaultMartialArt = "vovinam", lockMartialArt, onResult, showShopLink = true, className }: SizeAdvisorFormProps) {
  const [martialArt, setMartialArt] = useState(defaultMartialArt);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [build, setBuild] = useState<(typeof BUILDS)[number]["id"]>("standard");
  const [childBuffer, setChildBuffer] = useState(false);
  const [errors, setErrors] = useState<{ height?: string; weight?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SizeRecommendation | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const h = Number(height);
    const w = Number(weight);
    const nextErrors: typeof errors = {};
    if (!height || Number.isNaN(h) || h < 60 || h > 240) nextErrors.height = "Nhập chiều cao từ 60 đến 240 cm";
    if (!weight || Number.isNaN(w) || w < 10 || w > 160) nextErrors.weight = "Nhập cân nặng từ 10 đến 160 kg";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const data = await apiRequest<SizeRecommendation>("/api/v1/size-advisor/recommend", {
        method: "POST",
        body: {
          martial_art: martialArt,
          height_cm: h,
          weight_kg: w,
          age: age ? Number(age) : undefined,
          body_build: build,
          child_buffer: childBuffer,
        },
      });
      setResult(data);
      onResult?.(data);
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : "Chưa tính được size. Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cx("flex flex-col gap-5", className)}>
      <form onSubmit={submit} noValidate className="grid grid-cols-2 gap-4">
        {!lockMartialArt && (
          <div className="col-span-2 flex flex-col gap-2">
            <label htmlFor="advisor-martial" className={labelClass}>
              Môn võ
            </label>
            <select id="advisor-martial" value={martialArt} onChange={(e) => setMartialArt(e.target.value)} className={cx(inputClass, "cursor-pointer")}>
              {MARTIAL_ARTS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="advisor-height" className={labelClass}>
            Chiều cao (cm)
          </label>
          <input
            id="advisor-height"
            inputMode="numeric"
            value={height}
            onChange={(e) => setHeight(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={!!errors.height || undefined}
            aria-describedby={errors.height ? "advisor-height-error" : undefined}
            className={inputClass}
          />
          {errors.height && (
            <p id="advisor-height-error" className="text-[13px] text-accent-text">
              {errors.height}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="advisor-weight" className={labelClass}>
            Cân nặng (kg)
          </label>
          <input
            id="advisor-weight"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={!!errors.weight || undefined}
            aria-describedby={errors.weight ? "advisor-weight-error" : undefined}
            className={inputClass}
          />
          {errors.weight && (
            <p id="advisor-weight-error" className="text-[13px] text-accent-text">
              {errors.weight}
            </p>
          )}
        </div>

        <fieldset className="col-span-2 flex flex-col gap-2">
          <legend className={cx(labelClass, "mb-2")}>Vóc dáng</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {BUILDS.map((b) => (
              <label
                key={b.id}
                className={cx(
                  "flex h-9 cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-[background-color,color,box-shadow] duration-200",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  build === b.id ? "bg-surface text-ink shadow-soft" : "text-ink-2 hover:text-ink"
                )}
              >
                <input type="radio" name="advisor-build" value={b.id} checked={build === b.id} onChange={() => setBuild(b.id)} className="sr-only" />
                {b.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="advisor-age" className={labelClass}>
            Tuổi <span className="font-normal text-ink-3">(không bắt buộc)</span>
          </label>
          <input id="advisor-age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} className={inputClass} />
        </div>

        <label className="flex cursor-pointer items-end gap-2.5 pb-3 text-sm text-ink-2">
          <input type="checkbox" checked={childBuffer} onChange={(e) => setChildBuffer(e.target.checked)} className="size-4 accent-accent" />
          Trẻ đang lớn, mua rộng 1 size
        </label>

        {errors.form && (
          <p role="alert" className="col-span-2 text-sm text-accent-text">
            {errors.form}
          </p>
        )}

        <button type="submit" disabled={loading} className={buttonClass("dark", "lg", "col-span-2")}>
          {loading ? <CircleNotchIcon className="size-5 animate-spin" /> : <RulerIcon className="size-5" />}
          {loading ? "Đang tính size..." : "Tính size phù hợp"}
        </button>
      </form>

      {result && (
        <div aria-live="polite" className="fade-in rounded-md border border-line bg-surface p-5">
          {result.is_out_of_range && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[13px] text-warning">
              <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              Số đo nằm ngoài bảng size chuẩn. Nên gọi hotline để được may đo riêng.
            </p>
          )}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-ink-2">Size đề xuất cho {martialArtLabel(martialArt)}</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-ink">{result.recommended_size}</p>
            </div>
            {result.backup_size && (
              <p className="text-right text-sm text-ink-2">
                Size dự phòng
                <span className="block text-lg font-semibold text-ink">{result.backup_size}</span>
              </p>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">{result.fit_note}</p>
          <p className="mt-3 text-[13px] text-ink-3">{result.free_exchange_guarantee}</p>
          {showShopLink && (
            <Link
              href={`/products?martial_art=${martialArt}&category=vo_phuc`}
              className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text"
            >
              Xem võ phục {martialArtLabel(martialArt)}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
          <SaveStudentProfile
            key={`${martialArt}-${height}-${weight}-${result.recommended_size}`}
            martialArt={martialArt}
            height={Number(height)}
            weight={Number(weight)}
            age={age ? Number(age) : undefined}
            size={result.recommended_size}
          />
        </div>
      )}
    </div>
  );
}
