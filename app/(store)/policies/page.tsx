import type { Metadata } from "next";
import Link from "next/link";
import { cx } from "@/lib/format";
import { container } from "@/components/ui/styles";
import { getStoreInfo } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Chính sách",
  description: "Chính sách đổi size, thanh toán, giao hàng, bảo mật thông tin và điều khoản mua hàng tại VÕ SPORT.",
  alternates: { canonical: "/policies" },
};

const SECTIONS = [
  {
    id: "doi-tra",
    title: "Đổi size và đổi trả",
    items: [
      "Đổi size miễn phí trong 7 ngày kể từ khi đơn hàng được giao thành công.",
      "Sản phẩm thêu tên theo yêu cầu không áp dụng đổi size hay đổi trả.",
      "Gửi yêu cầu đổi size qua hotline kèm mã đơn hàng. Đơn đổi mới được tạo sau khi yêu cầu được duyệt.",
    ],
  },
  {
    id: "thanh-toan",
    title: "Thanh toán và giao hàng",
    items: [
      "Thanh toán khi nhận hàng (COD) hoặc qua ví MoMo.",
      "Đơn có sản phẩm thêu tên cần thanh toán trước qua MoMo. Đơn MoMo chưa thanh toán sau 15 phút được hủy tự động.",
      "Miễn phí giao hàng cho đơn từ 500.000₫. Phí giao nội thành TP. Hồ Chí Minh 25.000₫, các tỉnh thành khác 40.000₫.",
      "Có thể hủy đơn trước khi đơn chuyển sang trạng thái đang giao.",
    ],
  },
  {
    id: "bao-mat",
    title: "Bảo mật thông tin",
    items: [
      "Họ tên, số điện thoại và địa chỉ chỉ được dùng để giao hàng và chăm sóc đơn hàng.",
      "Mật khẩu được mã hóa một chiều, nhân viên không xem được mật khẩu của bạn.",
      "Khách chưa đăng nhập cần nhập đúng số điện thoại đặt hàng để xem hoặc hủy đơn.",
    ],
  },
  {
    id: "dieu-khoan",
    title: "Điều khoản sử dụng",
    items: [
      "Giá bán và mã giảm giá được kiểm tra lại khi đặt hàng. Giá hiển thị trên đơn hàng là giá cuối cùng.",
      "Website là sản phẩm đồ án môn học. Sản phẩm, giá bán và tồn kho là dữ liệu mẫu để minh họa.",
    ],
  },
];

export default async function PoliciesPage() {
  const store = await getStoreInfo();
  return (
    <div className={cx(container, "grid gap-12 py-8 lg:grid-cols-[220px_1fr] lg:gap-16 lg:py-12")}>
      <nav aria-label="Mục lục chính sách" className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-muted hover:text-ink">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="max-w-[68ch]">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">Chính sách mua hàng</h1>
        <div className="mt-10 flex flex-col gap-12">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-tight text-ink">{s.title}</h2>
              <ul className="mt-4 flex list-disc flex-col gap-2.5 pl-5 leading-relaxed text-ink-2 marker:text-ink-3">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-sm text-ink-2">
          Cần hỗ trợ thêm? Gọi hotline {store.hotline} hoặc{" "}
          <Link href="/orders" className="font-medium text-ink underline underline-offset-4">
            tra cứu đơn hàng
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
