"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircleIcon, CircleNotchIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { cx } from "@/lib/format";
import { useAuth } from "@/components/providers/AuthProvider";
import { buttonClass, inputClass } from "@/components/ui/styles";

/** Lưu kết quả tư vấn size thành hồ sơ võ sinh (cần đăng nhập). */
export function SaveStudentProfile({ martialArt, height, weight, age, size }: { martialArt: string; height: number; weight: number; age?: number; size: string }) {
  const { user, token } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !token) {
    return (
      <p className="mt-4 border-t border-line pt-4 text-sm text-ink-2">
        <Link href="/login?next=/account?tab=students" className="font-medium text-ink underline underline-offset-4">
          Đăng nhập
        </Link>{" "}
        để lưu số đo cho bé, lần sau chọn size không cần đo lại.
      </p>
    );
  }

  if (saved) {
    return (
      <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm text-ink-2">
        <CheckCircleIcon weight="fill" className="size-5 text-success" /> Đã lưu hồ sơ của {name.trim()}.{" "}
        <Link href="/account?tab=students" className="font-medium text-ink underline underline-offset-4">
          Xem hồ sơ võ sinh
        </Link>
      </p>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Nhập tên gọi của bé");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiRequest("/api/v1/size-advisor/profiles", {
        method: "POST",
        token,
        body: {
          student_name: name.trim(),
          birth_year: age ? new Date().getFullYear() - age : null,
          martial_art: martialArt,
          height_cm: height,
          weight_kg: weight,
          recommended_size: size,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chưa lưu được hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
      <p className="text-sm font-medium text-ink">Lưu số đo này cho bé</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên gọi, ví dụ: Bé Na"
          maxLength={100}
          aria-label="Tên gọi của bé"
          className={cx(inputClass, "h-10 text-sm")}
        />
        <button type="submit" disabled={saving} className={buttonClass("secondary", "md", "h-10 shrink-0")}>
          {saving ? <CircleNotchIcon className="size-4 animate-spin" /> : <FloppyDiskIcon className="size-4" />}
          Lưu
        </button>
      </div>
      {error && <p className="text-[13px] text-accent-text">{error}</p>}
    </form>
  );
}
