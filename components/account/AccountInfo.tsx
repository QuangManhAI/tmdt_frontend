"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircleIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { cx, isValidVNPhone, normalizePhone } from "@/lib/format";
import { PROVINCES } from "@/lib/provinces";
import type { AccountProfile, DefaultAddress } from "@/lib/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass, inputClass, labelClass } from "@/components/ui/styles";

const EMPTY_ADDRESS: DefaultAddress = { recipient_name: "", phone: "", street_address: "", ward: "", district: "", city_province: "" };

/** Họ tên, số điện thoại (tài khoản Google/Facebook bổ sung sau) và địa chỉ giao hàng mặc định để checkout tự điền. */
export function AccountInfo({ token }: { token: string }) {
  const { updateUser } = useAuth();
  const { notify } = useToast();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<DefaultAddress>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<AccountProfile>("/api/v1/account/profile", { token })
      .then((p) => {
        setProfile(p);
        setFullName(p.full_name);
        setPhone(p.phone ?? "");
        setAddr({ ...EMPTY_ADDRESS, ...(p.default_address ?? {}) });
      })
      .catch(() => notify({ tone: "error", title: "Không tải được thông tin tài khoản" }));
  }, [token, notify]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = "Nhập họ và tên";
    if (phone && !isValidVNPhone(phone)) next.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
    if (addr.phone && !isValidVNPhone(addr.phone)) next.addrPhone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const saved = await apiRequest<AccountProfile>("/api/v1/account/profile", {
        method: "PATCH",
        token,
        body: {
          full_name: fullName.trim(),
          ...(phone || profile?.phone ? { phone: phone ? normalizePhone(phone) : "" } : {}),
          default_address: { ...addr, phone: addr.phone ? normalizePhone(addr.phone) : "" },
        },
      });
      setProfile(saved);
      updateUser({ full_name: saved.full_name, phone: saved.phone ?? undefined });
      notify({ tone: "success", title: "Đã lưu thông tin" });
    } catch (err) {
      notify({ tone: "error", title: err instanceof ApiError ? err.message : "Chưa lưu được thông tin" });
    } finally {
      setSaving(false);
    }
  };

  if (!profile)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-40" />
      </div>
    );

  const input = (id: string, label: string, value: string, onChange: (v: string) => void, props: Record<string, unknown> = {}, error?: string, wide = false) => (
    <div className={cx("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} className={inputClass} {...props} />
      {error && <p className="text-[13px] text-accent-text">{error}</p>}
    </div>
  );
  const setA = (k: keyof DefaultAddress) => (v: string) => setAddr((a) => ({ ...a, [k]: v }));

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold text-ink sm:col-span-2">Thông tin cá nhân</h2>
        {input("acc-name", "Họ và tên", fullName, setFullName, { autoComplete: "name", maxLength: 100 }, errors.fullName)}
        {input("acc-phone", profile.phone ? "Số điện thoại" : "Số điện thoại (nên bổ sung)", phone, setPhone, { autoComplete: "tel", inputMode: "tel" }, errors.phone)}
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Email</span>
          <p className="flex h-11 items-center text-[15px] text-ink-2">{profile.email || "Chưa có"}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Đăng nhập nhanh</span>
          <p className="flex h-11 flex-wrap items-center gap-2 text-sm">
            {profile.linked_google && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-ink-2">
                <CheckCircleIcon weight="fill" className="size-4 text-success" /> Google
              </span>
            )}
            {profile.linked_facebook && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-ink-2">
                <CheckCircleIcon weight="fill" className="size-4 text-success" /> Facebook
              </span>
            )}
            {!profile.linked_google && !profile.linked_facebook && <span className="text-ink-3">Chưa liên kết</span>}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="font-semibold text-ink">Địa chỉ giao hàng mặc định</h2>
          <p className="mt-1 text-sm text-ink-2">Tự điền ở trang thanh toán cho lần mua sau.</p>
        </div>
        {input("addr-name", "Người nhận", addr.recipient_name, setA("recipient_name"), { autoComplete: "name" })}
        {input("addr-phone", "SĐT người nhận", addr.phone, setA("phone"), { autoComplete: "tel", inputMode: "tel" }, errors.addrPhone)}
        {input("addr-street", "Số nhà, tên đường", addr.street_address, setA("street_address"), { autoComplete: "street-address" }, undefined, true)}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="addr-city" className={labelClass}>
            Tỉnh / Thành phố
          </label>
          <select id="addr-city" value={addr.city_province} onChange={(e) => setA("city_province")(e.target.value)} className={cx(inputClass, "cursor-pointer")}>
            <option value="">Chọn tỉnh, thành phố</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {input("addr-ward", "Phường / Xã", addr.ward, setA("ward"))}
      </section>

      <button type="submit" disabled={saving} className={buttonClass("dark", "lg", "self-start")}>
        {saving && <CircleNotchIcon className="size-5 animate-spin" />}
        Lưu thay đổi
      </button>
    </form>
  );
}
