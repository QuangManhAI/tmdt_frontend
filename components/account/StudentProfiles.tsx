"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CircleNotchIcon, PencilSimpleIcon, PlusIcon, TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { MARTIAL_ARTS, martialArtLabel } from "@/lib/catalog";
import { cx, formatDate } from "@/lib/format";
import type { SizeRecommendation, StudentProfile } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass, inputClass, labelClass } from "@/components/ui/styles";

interface Draft {
  student_name: string;
  birth_year: string;
  martial_art: string;
  height_cm: string;
  weight_kg: string;
}

const EMPTY: Draft = { student_name: "", birth_year: "", martial_art: "vovinam", height_cm: "", weight_kg: "" };
const THIS_YEAR = new Date().getFullYear();

/** Tính size gợi ý từ số đo (dùng chung API tư vấn size); trẻ dưới 16 tuổi mua rộng 1 size vì đang lớn. */
async function recommend(d: Draft): Promise<string | undefined> {
  const age = d.birth_year ? THIS_YEAR - Number(d.birth_year) : undefined;
  try {
    const r = await apiRequest<SizeRecommendation>("/api/v1/size-advisor/recommend", {
      method: "POST",
      body: {
        martial_art: d.martial_art,
        height_cm: Number(d.height_cm),
        weight_kg: Number(d.weight_kg),
        age: age && age >= 3 && age <= 100 ? age : undefined,
        child_buffer: age !== undefined && age < 16,
      },
    });
    return r.recommended_size;
  } catch {
    return undefined;
  }
}

function validate(d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.student_name.trim().length < 2) e.student_name = "Nhập tên gọi của bé";
  const y = Number(d.birth_year);
  if (d.birth_year && (Number.isNaN(y) || y < 1950 || y > THIS_YEAR)) e.birth_year = `Năm sinh từ 1950 đến ${THIS_YEAR}`;
  const h = Number(d.height_cm);
  if (!d.height_cm || Number.isNaN(h) || h < 60 || h > 240) e.height_cm = "Chiều cao 60 – 240 cm";
  const w = Number(d.weight_kg);
  if (!d.weight_kg || Number.isNaN(w) || w < 10 || w > 160) e.weight_kg = "Cân nặng 10 – 160 kg";
  return e;
}

function ProfileForm({ initial, saving, onSubmit, onCancel }: { initial: Draft; saving: boolean; onSubmit: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate(d);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(d);
  };

  const field = (k: keyof Draft, label: string, props: Record<string, unknown> = {}) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`sp-${k}`} className={labelClass}>
        {label}
      </label>
      <input id={`sp-${k}`} value={d[k]} onChange={set(k)} aria-invalid={!!errors[k] || undefined} className={inputClass} {...props} />
      {errors[k] && <p className="text-[13px] text-accent-text">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-md border border-line bg-surface p-5 sm:grid-cols-2">
      {field("student_name", "Tên gọi", { placeholder: "Ví dụ: Bé Na", maxLength: 100 })}
      {field("birth_year", "Năm sinh (không bắt buộc)", { inputMode: "numeric", placeholder: "2016" })}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sp-martial_art" className={labelClass}>
          Môn võ
        </label>
        <select id="sp-martial_art" value={d.martial_art} onChange={set("martial_art")} className={cx(inputClass, "cursor-pointer")}>
          {MARTIAL_ARTS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("height_cm", "Chiều cao (cm)", { inputMode: "decimal" })}
        {field("weight_kg", "Cân nặng (kg)", { inputMode: "decimal" })}
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={saving} className={buttonClass("dark", "md")}>
          {saving && <CircleNotchIcon className="size-4 animate-spin" />}
          Lưu hồ sơ
        </button>
        <button type="button" onClick={onCancel} className={buttonClass("ghost", "md")}>
          Hủy
        </button>
      </div>
    </form>
  );
}

/** Hồ sơ số đo võ sinh (con 1, con 2…) để chọn size nhanh mỗi lần mua. */
export function StudentProfiles({ token }: { token: string }) {
  const { notify } = useToast();
  const [profiles, setProfiles] = useState<StudentProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      apiRequest<StudentProfile[]>("/api/v1/size-advisor/profiles", { token })
        .then((data) => {
          setProfiles(data);
          setError(null);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được hồ sơ")),
    [token]
  );

  useEffect(() => {
    load();
  }, [load]);

  const save = async (d: Draft, id?: string) => {
    setSaving(true);
    try {
      const body = {
        student_name: d.student_name.trim(),
        birth_year: d.birth_year ? Number(d.birth_year) : null,
        martial_art: d.martial_art,
        height_cm: Number(d.height_cm),
        weight_kg: Number(d.weight_kg),
        recommended_size: await recommend(d),
      };
      await apiRequest(id ? `/api/v1/size-advisor/profiles/${id}` : "/api/v1/size-advisor/profiles", { method: id ? "PUT" : "POST", token, body });
      notify({ tone: "success", title: id ? "Đã cập nhật số đo" : "Đã lưu hồ sơ võ sinh" });
      setEditing(null);
      await load();
    } catch (err) {
      notify({ tone: "error", title: err instanceof ApiError ? err.message : "Chưa lưu được hồ sơ" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: StudentProfile) => {
    if (!window.confirm(`Xóa hồ sơ của ${p.student_name}?`)) return;
    try {
      await apiRequest(`/api/v1/size-advisor/profiles/${p.id}`, { method: "DELETE", token });
      setProfiles((list) => list?.filter((x) => x.id !== p.id) ?? list);
    } catch (err) {
      notify({ tone: "error", title: err instanceof ApiError ? err.message : "Không xóa được" });
    }
  };

  if (error) return <p className="text-sm text-accent-text">{error}</p>;
  if (!profiles)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-md" />
        <Skeleton className="h-32 rounded-md" />
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-2">Lưu số đo của từng bé để lần sau chọn size ngay, hệ thống nhắc đo lại sau 6 tháng vì trẻ lớn nhanh.</p>

      {profiles.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {profiles.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="sm:col-span-2">
                <ProfileForm
                  initial={{ student_name: p.student_name, birth_year: p.birth_year ? String(p.birth_year) : "", martial_art: p.martial_art, height_cm: String(p.height_cm), weight_kg: String(p.weight_kg) }}
                  saving={saving}
                  onSubmit={(d) => save(d, p.id)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={p.id} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{p.student_name}</p>
                    <p className="text-[13px] text-ink-3">
                      {martialArtLabel(p.martial_art)}
                      {p.birth_year ? ` · sinh năm ${p.birth_year}` : ""}
                    </p>
                  </div>
                  {p.recommended_size && (
                    <span className="rounded-md bg-navy px-2.5 py-1 text-sm font-semibold text-on-navy">Size {p.recommended_size}</span>
                  )}
                </div>
                <p className="text-sm text-ink-2 tabular">
                  {p.height_cm} cm · {p.weight_kg} kg · đo ngày {formatDate(p.measured_date)}
                </p>
                {p.needs_remeasure && (
                  <p className="flex items-start gap-1.5 text-[13px] text-warning">
                    <WarningCircleIcon weight="fill" className="mt-0.5 size-4 shrink-0" /> {p.remeasure_alert ?? "Đã lâu chưa đo lại, bé có thể đã lớn hơn"}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-1">
                  <Link href={`/products?martial_art=${p.martial_art}`} className={buttonClass("secondary", "sm")}>
                    Xem võ phục {martialArtLabel(p.martial_art)}
                  </Link>
                  <button type="button" onClick={() => setEditing(p.id)} className={buttonClass("ghost", "sm")}>
                    <PencilSimpleIcon className="size-4" /> Đo lại
                  </button>
                  <button type="button" onClick={() => remove(p)} className={buttonClass("ghost", "sm")} aria-label={`Xóa hồ sơ ${p.student_name}`}>
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {editing === "new" ? (
        <ProfileForm initial={EMPTY} saving={saving} onSubmit={(d) => save(d)} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={buttonClass(profiles.length ? "secondary" : "dark", "md", "self-start")}>
          <PlusIcon className="size-4" /> {profiles.length ? "Thêm võ sinh" : "Tạo hồ sơ võ sinh đầu tiên"}
        </button>
      )}
    </div>
  );
}
