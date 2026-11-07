"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CircleNotchIcon, LockKeyIcon, MoneyIcon, TagIcon, WalletIcon } from "@phosphor-icons/react";
import { apiRequest, ApiError } from "@/lib/api";
import { cx, formatVND, isValidVNPhone, normalizePhone } from "@/lib/format";
import { PROVINCES } from "@/lib/provinces";
import { saveRecentOrder } from "@/lib/recent-orders";
import type { AuthUser, Order } from "@/lib/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClass, container, inputClass, labelClass } from "@/components/ui/styles";
import { ProductImage } from "@/components/product/ProductImage";

const SHIPPING_KEY = "checkout_shipping";

interface ShippingForm {
  recipient_name: string;
  phone: string;
  email: string;
  city_province: string;
  ward: string;
  street_address: string;
  note: string;
}

const EMPTY_FORM: ShippingForm = { recipient_name: "", phone: "", email: "", city_province: "", ward: "", street_address: "", note: "" };

type Errors = Partial<Record<keyof ShippingForm, string>>;

function validate(form: ShippingForm): Errors {
  const e: Errors = {};
  if (form.recipient_name.trim().length < 2) e.recipient_name = "Nhập họ tên người nhận";
  if (!isValidVNPhone(form.phone)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email chưa đúng định dạng";
  if (!form.city_province) e.city_province = "Chọn tỉnh, thành phố";
  if (form.ward.trim().length < 2) e.ward = "Nhập phường, xã";
  if (form.street_address.trim().length < 3) e.street_address = "Nhập số nhà, tên đường";
  return e;
}

/** Thông tin giao hàng lần trước (lưu trên trình duyệt) hoặc từ tài khoản đang đăng nhập. */
function initialForm(user: AuthUser | null): ShippingForm {
  let saved: Partial<ShippingForm> = {};
  try {
    saved = JSON.parse(localStorage.getItem(SHIPPING_KEY) ?? "{}");
  } catch {
    // bỏ qua
  }
  return {
    ...EMPTY_FORM,
    ...saved,
    recipient_name: saved.recipient_name || user?.full_name || "",
    phone: saved.phone || user?.phone || "",
    email: saved.email || user?.email || "",
    note: "",
  };
}

export function CheckoutView() {
  const { user, ready: authReady } = useAuth();
  const { cart, ready } = useCart();
  const [placing, setPlacing] = useState(false);

  if (!ready || !authReady) {
    return (
      <div className={cx(container, "grid gap-10 py-10 lg:grid-cols-[1fr_400px]")}>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-64 rounded-md" />
        </div>
        <Skeleton className="h-80 rounded-md" />
      </div>
    );
  }

  if (cart.items.length === 0 && !placing) {
    return (
      <div className={cx(container, "flex flex-col items-center gap-4 py-24 text-center")}>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Giỏ hàng đang trống</h1>
        <p className="text-ink-2">Thêm sản phẩm vào giỏ trước khi thanh toán.</p>
        <Link href="/products" className={buttonClass("dark", "lg")}>
          Xem sản phẩm
        </Link>
      </div>
    );
  }

  // Chỉ gắn biểu mẫu ở trình duyệt sau khi giỏ đã tải, nên có thể đọc thông tin đã lưu ngay khi khởi tạo state
  return <CheckoutForm key={user?.user_id ?? "guest"} user={user} onPlacing={setPlacing} />;
}

function CheckoutForm({ user, onPlacing }: { user: AuthUser | null; onPlacing: (placing: boolean) => void }) {
  const router = useRouter();
  const { token } = useAuth();
  const { cart, clear } = useCart();
  const { notify } = useToast();

  const [form, setForm] = useState<ShippingForm>(() => initialForm(user));
  const [errors, setErrors] = useState<Errors>({});
  const [payment, setPayment] = useState<"COD" | "MoMo">("COD");
  const [quote, setQuote] = useState<{ key: string; fee: number } | null>(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherState, setVoucher] = useState<{ code: string; discount: number; subtotal: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mustPrepay = cart.has_embroidery;
  const method = mustPrepay ? "MoMo" : payment;
  // Mã giảm giá chỉ còn hiệu lực khi giỏ hàng chưa đổi so với lúc kiểm tra
  const voucher = voucherState && voucherState.subtotal === cart.subtotal ? voucherState : null;
  const quoteKey = form.city_province && cart.subtotal > 0 ? `${form.city_province}|${cart.subtotal}` : null;
  const shippingFee = quote && quote.key === quoteKey ? quote.fee : null;

  // Báo phí giao hàng theo tỉnh, cùng công thức với lúc tạo đơn
  useEffect(() => {
    if (!quoteKey) return;
    const controller = new AbortController();
    const [city, subtotal] = quoteKey.split("|");
    const params = new URLSearchParams({ city_province: city, subtotal });
    apiRequest<{ shipping_fee: number }>(`/api/v1/orders/shipping-quote?${params}`, { signal: controller.signal })
      .then((d) => setQuote({ key: quoteKey, fee: d.shipping_fee }))
      .catch(() => {
        // Không báo được phí thì hiển thị "chọn tỉnh, thành"; phí thật vẫn tính khi tạo đơn
      });
    return () => controller.abort();
  }, [quoteKey]);

  const set = (key: keyof ShippingForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const applyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    setVoucherLoading(true);
    setVoucherError(null);
    try {
      const data = await apiRequest<{ code: string; discount_amount: number }>("/api/v1/promotions/validate", {
        method: "POST",
        body: { code, order_amount: cart.subtotal },
      });
      setVoucher({ code: data.code, discount: data.discount_amount, subtotal: cart.subtotal });
      setVoucherInput("");
    } catch (err) {
      setVoucher(null);
      setVoucherError(err instanceof ApiError ? err.message : "Không áp dụng được mã này");
    } finally {
      setVoucherLoading(false);
    }
  };

  const discount = voucher?.discount ?? 0;
  const total = cart.subtotal + cart.embroidery_total + (shippingFee ?? 0) - discount;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      document.getElementById(`checkout-${first}`)?.focus();
      return;
    }

    setSubmitting(true);
    onPlacing(true);
    setSubmitError(null);
    try {
      localStorage.setItem(SHIPPING_KEY, JSON.stringify({ ...form, note: "" }));
    } catch {
      // bỏ qua
    }

    try {
      const order = await apiRequest<Order>("/api/v1/orders", {
        method: "POST",
        token,
        body: {
          customer_name: form.recipient_name.trim(),
          customer_phone: normalizePhone(form.phone),
          customer_email: form.email.trim() || undefined,
          shipping_address: {
            recipient_name: form.recipient_name.trim(),
            phone: normalizePhone(form.phone),
            street_address: form.street_address.trim(),
            ward: form.ward.trim(),
            district: "",
            city_province: form.city_province,
          },
          payment_method: method,
          voucher_code: voucher?.code,
          note: form.note.trim() || undefined,
          items: cart.items.map((it) => ({
            product_id: it.product_id,
            sku: it.sku,
            quantity: it.quantity,
            is_embroidered: it.is_embroidered,
            embroidery_name: it.embroidery_name ?? undefined,
          })),
        },
      });

      saveRecentOrder(order.order_code, order.customer_phone);

      if (method === "MoMo") {
        // Đơn đã tạo xong: lỗi ở bước này không được để khách đặt lại thành đơn thứ hai
        await clear();
        try {
          const payment = await apiRequest<{ pay_url: string }>("/api/v1/payments/momo/create", {
            method: "POST",
            token,
            body: { order_code: order.order_code },
          });
          window.location.assign(payment.pay_url);
        } catch (err) {
          notify({
            tone: "error",
            title: "Chưa mở được trang thanh toán MoMo",
            description: err instanceof ApiError ? err.message : "Bạn có thể thanh toán lại trong trang đơn hàng.",
          });
          router.push(`/orders/${order.order_code}?placed=1`);
        }
        return;
      }

      await clear();
      router.push(`/orders/${order.order_code}?placed=1`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Chưa đặt được hàng. Vui lòng thử lại.");
      notify({ tone: "error", title: "Đặt hàng chưa thành công" });
      setSubmitting(false);
      onPlacing(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={cx(container, "grid gap-10 py-8 lg:grid-cols-[1fr_400px] lg:gap-14 lg:py-12")}>
      <div className="flex flex-col gap-10">
        <div>
          <Link href="/cart" className="text-sm text-ink-3 hover:text-ink">
            Quay lại giỏ hàng
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">Thanh toán</h1>
          {!user && (
            <p className="mt-2 text-sm text-ink-2">
              Đã có tài khoản?{" "}
              <Link href="/login?next=/checkout" className="font-medium text-accent-text underline-offset-4 hover:underline">
                Đăng nhập
              </Link>{" "}
              để theo dõi đơn dễ hơn.
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-5 text-lg font-semibold text-ink">Thông tin nhận hàng</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="checkout-recipient_name" label="Họ tên người nhận" value={form.recipient_name} onChange={(e) => set("recipient_name")(e.target.value)} autoComplete="name" error={errors.recipient_name} />
            <Field id="checkout-phone" label="Số điện thoại" value={form.phone} onChange={(e) => set("phone")(e.target.value)} autoComplete="tel" inputMode="tel" error={errors.phone} />
          </div>
          <Field id="checkout-email" label="Email" optional type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" hint="Nhận xác nhận đơn hàng qua email" error={errors.email} />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="checkout-city_province" className={labelClass}>
                Tỉnh, thành phố
              </label>
              <select
                id="checkout-city_province"
                value={form.city_province}
                onChange={(e) => set("city_province")(e.target.value)}
                aria-invalid={!!errors.city_province || undefined}
                className={cx(inputClass, "cursor-pointer")}
                autoComplete="address-level1"
              >
                <option value="">Chọn tỉnh, thành phố</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.city_province && <p className="text-sm text-accent-text">{errors.city_province}</p>}
            </div>
            <Field id="checkout-ward" label="Phường, xã" value={form.ward} onChange={(e) => set("ward")(e.target.value)} autoComplete="address-level2" error={errors.ward} />
          </div>
          <Field id="checkout-street_address" label="Số nhà, tên đường" value={form.street_address} onChange={(e) => set("street_address")(e.target.value)} autoComplete="street-address" error={errors.street_address} />
          <div className="flex flex-col gap-2">
            <label htmlFor="checkout-note" className={labelClass}>
              Ghi chú <span className="font-normal text-ink-3">(không bắt buộc)</span>
            </label>
            <textarea
              id="checkout-note"
              value={form.note}
              onChange={(e) => set("note")(e.target.value)}
              rows={3}
              className={cx(inputClass, "h-auto py-3")}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-lg font-semibold text-ink">Phương thức thanh toán</legend>
          {mustPrepay && <p className="mb-4 text-sm text-ink-2">Đơn có sản phẩm thêu tên riêng nên cần thanh toán trước qua MoMo.</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { id: "COD" as const, title: "Thanh toán khi nhận hàng", body: "Trả tiền mặt cho shipper", icon: MoneyIcon, disabled: mustPrepay },
              { id: "MoMo" as const, title: "Ví MoMo", body: "Quét mã hoặc mở ứng dụng MoMo", icon: WalletIcon, disabled: false },
            ].map((opt) => (
              <label
                key={opt.id}
                className={cx(
                  "relative flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-[border-color,box-shadow] duration-200",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  method === opt.id ? "border-ink shadow-[0_0_0_1px_var(--ink)]" : "border-line hover:border-line-strong",
                  opt.disabled && "pointer-events-none opacity-50"
                )}
              >
                <input type="radio" name="payment" value={opt.id} checked={method === opt.id} disabled={opt.disabled} onChange={() => setPayment(opt.id)} className="sr-only" />
                <opt.icon weight="light" className="size-6 shrink-0 text-ink-2" aria-hidden />
                <span>
                  <span className="block text-sm font-medium text-ink">{opt.title}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-3">{opt.disabled ? "Không áp dụng cho hàng thêu tên" : opt.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-5 rounded-md border border-line bg-surface p-6">
          <h2 className="font-semibold text-ink">Đơn hàng ({cart.total_items})</h2>
          <ul className="flex max-h-72 flex-col gap-4 overflow-y-auto pr-1">
            {cart.items.map((it) => {
              const slug = it.thumbnail?.match(/\/images\/products\/([^/]+)\.jpg$/)?.[1] ?? "";
              return (
                <li key={`${it.sku}|${it.embroidery_name ?? ""}`} className="flex gap-3">
                  <div className="relative shrink-0">
                    <ProductImage product={{ thumbnail: it.thumbnail ?? "", slug, name: it.product_name, category_id: "vo_phuc", martial_art_id: "" }} sizes="64px" compact className="size-16 rounded-sm" />
                    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-md bg-ink text-[11px] font-semibold text-bg tabular">{it.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-2 font-medium text-ink">{it.product_name}</p>
                    <p className="text-[13px] text-ink-3">
                      {it.size}
                      {it.is_embroidered ? `, thêu "${it.embroidery_name}"` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-ink tabular">{formatVND((it.price + (it.is_embroidered ? it.embroidery_fee : 0)) * it.quantity)}</p>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line pt-5">
            {voucher ? (
              <div className="flex items-center justify-between rounded-lg bg-success-soft px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-medium text-success">
                  <TagIcon className="size-4" aria-hidden /> {voucher.code}
                </span>
                <button type="button" onClick={() => setVoucher(null)} className="text-[13px] text-ink-2 underline underline-offset-4 cursor-pointer">
                  Bỏ mã
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label htmlFor="voucher" className="text-sm font-medium text-ink">
                  Mã giảm giá
                </label>
                <div className="flex gap-2">
                  <input
                    id="voucher"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value);
                      setVoucherError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyVoucher();
                      }
                    }}
                    aria-invalid={!!voucherError || undefined}
                    className={cx(inputClass, "uppercase placeholder:normal-case")}
                    placeholder="VD: VOVINAM10"
                    autoComplete="off"
                  />
                  <button type="button" onClick={applyVoucher} disabled={voucherLoading || !voucherInput.trim()} className={buttonClass("secondary", "md")}>
                    {voucherLoading ? <CircleNotchIcon className="size-4 animate-spin" /> : "Áp dụng"}
                  </button>
                </div>
                {voucherError && <p className="text-[13px] text-accent-text">{voucherError}</p>}
              </div>
            )}
          </div>

          <dl className="flex flex-col gap-2.5 border-t border-line pt-5 text-sm">
            <div className="flex justify-between text-ink-2">
              <dt>Tạm tính</dt>
              <dd className="text-ink tabular">{formatVND(cart.subtotal)}</dd>
            </div>
            {cart.embroidery_total > 0 && (
              <div className="flex justify-between text-ink-2">
                <dt>Phí thêu tên</dt>
                <dd className="text-ink tabular">{formatVND(cart.embroidery_total)}</dd>
              </div>
            )}
            <div className="flex justify-between text-ink-2">
              <dt>Giao hàng</dt>
              <dd className="text-ink tabular">{shippingFee === null ? "Chọn tỉnh, thành" : shippingFee === 0 ? "Miễn phí" : formatVND(shippingFee)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>Giảm giá</dt>
                <dd className="tabular">-{formatVND(discount)}</dd>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
              <dt className="font-medium text-ink">Tổng cộng</dt>
              <dd className="text-2xl font-semibold text-ink tabular">{formatVND(Math.max(total, 0))}</dd>
            </div>
          </dl>

          {submitError && (
            <p role="alert" className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm text-accent-text">
              {submitError}
            </p>
          )}

          <button type="submit" disabled={submitting} className={buttonClass("primary", "lg", "w-full")}>
            {submitting && <CircleNotchIcon className="size-5 animate-spin" />}
            {method === "MoMo" ? "Đặt hàng và thanh toán MoMo" : "Đặt hàng"}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-ink-3">
            <LockKeyIcon className="size-3.5 shrink-0" aria-hidden /> Giá và mã giảm giá được kiểm tra lại khi đặt hàng
          </p>
        </div>
      </aside>
    </form>
  );
}
