"use client";

import { useState, type FormEvent } from "react";
import { CircleNotchIcon, MapPinIcon, PhoneIcon, EnvelopeSimpleIcon, StorefrontIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { cx } from "@/lib/format";
import type { StoreInfo } from "@/lib/store-info";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass, inputClass } from "@/components/ui/styles";
import { useAdminApi } from "@/components/admin/useAdminApi";
import { refreshStorefront } from "@/app/admin/actions";

const FIELDS: Array<{ key: keyof StoreInfo; label: string; hint?: string; type?: string; wide?: boolean; optional?: boolean }> = [
  { key: "store_name", label: "Tên cửa hàng" },
  { key: "tagline", label: "Mô tả ngắn", hint: "Hiện cạnh tên ở chân trang" },
  { key: "address", label: "Địa chỉ cửa hàng", wide: true },
  { key: "hotline", label: "Hotline hỗ trợ", hint: "Hiện ở đầu trang, chân trang và nút gọi nổi" },
  { key: "support_hours", label: "Giờ hỗ trợ", hint: "Ví dụ: 8:00 - 21:00" },
  { key: "email", label: "Email liên hệ", type: "email" },
  { key: "zalo", label: "Số Zalo", optional: true },
  { key: "facebook_url", label: "Link fanpage Facebook", optional: true, hint: "Bắt đầu bằng https://" },
  { key: "map_url", label: "Link Google Maps", optional: true, hint: "Bấm vào địa chỉ ở chân trang sẽ mở bản đồ" },
];

/** Thông tin cửa hàng ở tab Tổng quan: admin sửa được, nhân viên chỉ xem. */
export function StoreSettingsPanel({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const { notify } = useToast();
  const settings = useAdminApi<StoreInfo>("/api/v1/settings/store", token);
  const [draft, setDraft] = useState<StoreInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const form = draft ?? settings.data;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(settings.data);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    setErrors(null);
    try {
      const saved = await apiRequest<StoreInfo>("/api/v1/settings/store", { method: "PUT", token, body: draft });
      settings.setData(saved);
      setDraft(null);
      const refreshed = await refreshStorefront(token, ["settings"]).catch(() => false);
      notify({
        tone: "success",
        title: "Đã lưu thông tin cửa hàng",
        description: refreshed ? "Website đã cập nhật." : "Website sẽ cập nhật trong vài phút.",
      });
    } catch (err) {
      setErrors(err instanceof ApiError ? err.message : "Không lưu được, thử lại sau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <StorefrontIcon className="size-4" aria-hidden /> Thông tin cửa hàng
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-3">Hiển thị trên toàn website: đầu trang, chân trang, nút gọi và trang chính sách.</p>
        </div>
        {form && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-1.5"><PhoneIcon className="size-3.5" aria-hidden /> {form.hotline}</span>
            <span className="inline-flex items-center gap-1.5"><EnvelopeSimpleIcon className="size-3.5" aria-hidden /> {form.email}</span>
            <span className="inline-flex max-w-[360px] items-center gap-1.5 truncate"><MapPinIcon className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{form.address}</span></span>
          </div>
        )}
      </div>

      {settings.error && !form ? (
        <p className="px-5 py-6 text-sm text-ink-2">
          {settings.error}.{" "}
          <button type="button" onClick={settings.reload} className="font-medium text-ink underline underline-offset-4 cursor-pointer">Thử lại</button>
        </p>
      ) : !form ? (
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <form onSubmit={save} className="p-5">
          <fieldset disabled={!isAdmin || saving} className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className={cx("flex flex-col gap-1.5", f.wide && "md:col-span-2")}>
                <span className="text-sm font-medium text-ink">
                  {f.label}
                  {f.optional && <span className="font-normal text-ink-3"> (không bắt buộc)</span>}
                </span>
                <input
                  type={f.type ?? "text"}
                  value={(form[f.key] as string | null | undefined) ?? ""}
                  onChange={(e) => setDraft({ ...form, [f.key]: e.target.value })}
                  required={!f.optional}
                  className={cx(inputClass, "h-10 text-sm disabled:bg-muted disabled:text-ink-2")}
                />
                {f.hint && <span className="text-xs text-ink-3">{f.hint}</span>}
              </label>
            ))}
          </fieldset>
          {errors && <p role="alert" className="mt-4 rounded-sm bg-accent-soft px-3 py-2 text-sm text-accent-text">{errors}</p>}
          {isAdmin ? (
            <div className="mt-5 flex items-center justify-end gap-3">
              {dirty && (
                <button type="button" onClick={() => setDraft(null)} className={buttonClass("ghost", "sm")}>
                  Hủy thay đổi
                </button>
              )}
              <button type="submit" disabled={!dirty || saving} className={buttonClass("dark", "sm")}>
                {saving && <CircleNotchIcon className="size-4 animate-spin" />} Lưu thông tin
              </button>
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-ink-3">Chỉ quản trị viên được sửa thông tin cửa hàng.</p>
          )}
        </form>
      )}
    </section>
  );
}
