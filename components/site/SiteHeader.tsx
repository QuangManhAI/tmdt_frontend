"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  HandbagSimpleIcon,
  ListIcon,
  MagnifyingGlassIcon,
  NeedleIcon,
  PackageIcon,
  PhoneIcon,
  SignOutIcon,
  SquaresFourIcon,
  TruckIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { cx } from "@/lib/format";
import { Drawer } from "@/components/ui/Drawer";
import { Logo } from "@/components/site/Logo";
import { MegaNav } from "@/components/site/MegaNav";
import { PromoBar } from "@/components/site/PromoBar";
import { SearchForm } from "@/components/site/SearchForm";
import { NAV_ITEMS, USP_ITEMS } from "@/components/site/nav";
import { telHref } from "@/lib/store-info";
import { useStoreInfo } from "@/components/providers/StoreInfoProvider";
import { isStaffRole, useAuth } from "@/components/providers/AuthProvider";
import { useCart } from "@/components/providers/CartProvider";

const iconButton = "relative inline-flex size-10 items-center justify-center rounded-sm text-on-navy transition-colors hover:bg-navy-2 cursor-pointer";

function AccountMenu() {
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !user) {
    return (
      <Link href="/login" className={cx(iconButton, "hidden sm:inline-flex")} aria-label="Đăng nhập" title="Đăng nhập">
        <UserIcon className="size-6" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" className={iconButton} aria-label={`Tài khoản ${user.full_name}`}>
        <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">{user.full_name.trim().charAt(0).toUpperCase()}</span>
      </button>
      {open && (
        <div role="menu" className="fade-in absolute right-0 mt-2 w-60 overflow-hidden rounded-sm border border-line bg-surface p-1.5 text-ink shadow-lift">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user.full_name}</p>
            <p className="text-[13px] text-ink-3">{user.phone ?? "Thành viên"}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/orders" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm text-ink-2 hover:bg-muted hover:text-ink">
            <PackageIcon className="size-[18px]" aria-hidden /> Đơn hàng của tôi
          </Link>
          {isStaffRole(user.role) && (
            <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm text-ink-2 hover:bg-muted hover:text-ink">
              <SquaresFourIcon className="size-[18px]" aria-hidden /> Trang quản trị
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm text-ink-2 hover:bg-muted hover:text-ink cursor-pointer"
          >
            <SignOutIcon className="size-[18px]" aria-hidden /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function CartButton() {
  const { cart, open, ready } = useCart();
  const count = cart.total_items;
  return (
    <button type="button" onClick={open} className={iconButton} aria-label={`Giỏ hàng, ${count} sản phẩm`} title="Giỏ hàng">
      <HandbagSimpleIcon className="size-6" aria-hidden />
      {ready && count > 0 && (
        <span className="absolute top-0.5 right-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent tabular">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

const USP_ICON = { ship: TruckIcon, exchange: ArrowsClockwiseIcon, embroidery: NeedleIcon, dojo: UsersThreeIcon } as const;

export function UspStrip() {
  return (
    <div className="border-b border-line bg-band">
      <ul className="no-scrollbar mx-auto flex h-11 max-w-[1360px] items-center justify-between gap-8 overflow-x-auto px-4 text-[14px] text-ink-2 sm:px-6 lg:px-8">
        {USP_ITEMS.map((item) => {
          const Icon = USP_ICON[item.key];
          return (
            <li key={item.key} className="flex shrink-0 items-center gap-2.5">
              <Icon weight="light" className="size-5 text-ink" aria-hidden />
              {item.title}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFirst, setSearchFirst] = useState(false);
  const { user, logout } = useAuth();
  const { hotline } = useStoreInfo();

  const openMenu = (search: boolean) => {
    setSearchFirst(search);
    setMenuOpen(true);
  };

  return (
    <>
      <PromoBar />

      <header className="sticky top-0 z-30 bg-navy text-on-navy shadow-[0_1px_0_rgb(0_0_0/0.2)]">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-2 px-4 sm:px-6 lg:gap-4 lg:px-8">
          <button type="button" onClick={() => openMenu(false)} className={cx(iconButton, "-ml-2 lg:hidden")} aria-label="Mở menu" aria-expanded={menuOpen}>
            <ListIcon className="size-6" />
          </button>

          <Logo inverse className="mr-2 xl:mr-4" />
          <MegaNav />

          <div className="ml-auto flex items-center gap-1">
            <SearchForm onNavy className="mr-2 hidden w-56 md:block xl:w-72" />
            <button type="button" onClick={() => openMenu(true)} className={cx(iconButton, "md:hidden")} aria-label="Tìm sản phẩm">
              <MagnifyingGlassIcon className="size-6" />
            </button>
            <Link href="/orders" className={cx(iconButton, "hidden sm:inline-flex")} aria-label="Tra cứu đơn hàng" title="Tra cứu đơn hàng">
              <PackageIcon className="size-6" />
            </Link>
            <AccountMenu />
            <CartButton />
          </div>
        </div>
      </header>

      <UspStrip />

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Danh mục" side="left">
        <div className="flex flex-col gap-5 p-5">
          {menuOpen && <SearchForm key={String(searchFirst)} autoFocus={searchFirst} onSubmitted={() => setMenuOpen(false)} />}
          <nav aria-label="Điều hướng di động" className="flex flex-col divide-y divide-line border-y border-line">
            {NAV_ITEMS.map((item) =>
              item.columns ? (
                <details key={item.label} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[15px] font-semibold text-heading uppercase [&::-webkit-details-marker]:hidden">
                    {item.label}
                    <CaretDownIcon className="size-4 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="flex flex-col gap-4 pb-4">
                    {item.columns.map((col) => (
                      <div key={col.title}>
                        <p className="text-[13px] font-semibold text-ink-3 uppercase">{col.title}</p>
                        <ul className="mt-2 flex flex-col gap-2">
                          {col.links.map((link) => (
                            <li key={link.href + link.label}>
                              <Link href={link.href} onClick={() => setMenuOpen(false)} className="text-[15px] text-ink-2 hover:text-accent-text">
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cx("py-3.5 text-[15px] font-semibold uppercase", item.highlight ? "text-accent-text" : "text-heading")}
                >
                  {item.label}
                </Link>
              )
            )}
            <Link href="/blog" onClick={() => setMenuOpen(false)} className="py-3.5 text-[15px] font-semibold text-heading uppercase">
              Cẩm nang
            </Link>
            <Link href="/orders" onClick={() => setMenuOpen(false)} className="py-3.5 text-[15px] font-semibold text-heading uppercase">
              Tra cứu đơn hàng
            </Link>
          </nav>
          <div className="rounded-sm bg-muted p-4">
            {user ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-2">
                  Đang đăng nhập: <span className="font-semibold text-ink">{user.full_name}</span>
                </p>
                {isStaffRole(user.role) && (
                  <Link href="/admin" className="text-sm font-semibold text-accent-text">
                    Vào trang quản trị
                  </Link>
                )}
                <button type="button" onClick={logout} className="self-start text-sm font-semibold text-ink underline underline-offset-4 cursor-pointer">
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-ink">
                Đăng nhập hoặc tạo tài khoản
              </Link>
            )}
          </div>
          <a href={telHref(hotline)} className="inline-flex items-center gap-2 text-sm text-ink-2">
            <PhoneIcon className="size-4" aria-hidden /> Hotline {hotline}
          </a>
        </div>
      </Drawer>
    </>
  );
}
