import type { Metadata } from "next";
import { container } from "@/components/ui/styles";
import { OrderLookup } from "@/components/orders/OrderLookup";

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng",
  description: "Tra cứu trạng thái đơn hàng võ phục bằng mã đơn và số điện thoại đặt hàng.",
  alternates: { canonical: "/orders" },
};

export default function OrdersPage() {
  return (
    <div className={container}>
      <OrderLookup />
    </div>
  );
}
