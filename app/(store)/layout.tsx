import type { ReactNode } from "react";
import { CartProvider } from "@/components/providers/CartProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { FloatingWidgets } from "@/components/site/FloatingWidgets";
import { StoreInfoProvider } from "@/components/providers/StoreInfoProvider";
import { getStoreInfo } from "@/lib/server-data";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const store = await getStoreInfo();
  return (
    <StoreInfoProvider value={store}>
    <CartProvider>
      <div id="dau-trang" aria-hidden />
      <SiteHeader />
      <main id="noi-dung" className="min-h-[60dvh]">
        {children}
      </main>
      <SiteFooter store={store} />
      <CartDrawer />
      <FloatingWidgets />
    </CartProvider>
    </StoreInfoProvider>
  );
}
