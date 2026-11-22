"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { apiRequest } from "@/lib/api";
import { listRecentOrders } from "@/lib/recent-orders";
import type { AuthUser } from "@/lib/types";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_info";
const CHANGE_EVENT = "auth:change";

interface RegisterInput {
  full_name: string;
  phone: string;
  password: string;
  email?: string;
  role?: "customer" | "coach";
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  /** Hoàn tất đăng nhập Google/Facebook: backend trả JWT qua URL, lấy hồ sơ bằng /auth/me rồi lưu phiên. */
  loginWithToken: (token: string) => Promise<AuthUser>;
  /** Cập nhật thông tin phiên sau khi khách sửa hồ sơ (họ tên, SĐT). */
  updateUser: (patch: Partial<Pick<AuthUser, "full_name" | "phone" | "email">>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* Phiên đăng nhập lưu trong localStorage (giữ khóa cũ access_token / user_info), đọc qua useSyncExternalStore
   để đồng bộ giữa các tab và không lệch dữ liệu khi hydrate. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readSession(): string {
  try {
    return `${localStorage.getItem(TOKEN_KEY) ?? ""}\n${localStorage.getItem(USER_KEY) ?? ""}`;
  } catch {
    return "\n";
  }
}

const noopSubscribe = () => () => {};

// Mỗi phiên đăng nhập chỉ gắn đơn một lần (tránh gọi lại mỗi lần render / đổi trang)
const claimedForToken = new Set<string>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribe, readSession, () => "\n");
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const user = useMemo<AuthUser | null>(() => {
    const [token, saved] = session.split("\n");
    if (!token || !saved) return null;
    try {
      return { ...JSON.parse(saved), access_token: token };
    } catch {
      return null;
    }
  }, [session]);

  const persist = useCallback((next: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, next.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      // Bộ nhớ trình duyệt không khả dụng (chế độ riêng tư)
    }
    // Phát auth:login trước để giỏ hàng bắt đầu gộp trước khi các thành phần render lại với token mới
    window.dispatchEvent(new CustomEvent("auth:login", { detail: next }));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      const data = await apiRequest<AuthUser>("/api/v1/auth/login", { method: "POST", body: { phone, password } });
      persist(data);
      return data;
    },
    [persist]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const data = await apiRequest<AuthUser>("/api/v1/auth/register", {
        method: "POST",
        body: { ...input, email: input.email || undefined, role: input.role ?? "customer" },
      });
      persist(data);
      return data;
    },
    [persist]
  );

  const loginWithToken = useCallback(
    async (token: string) => {
      const me = await apiRequest<{ id: string; full_name: string; role: string; phone?: string | null; email?: string | null }>(
        "/api/v1/auth/me",
        { token }
      );
      const data: AuthUser = {
        access_token: token,
        token_type: "bearer",
        user_id: me.id,
        full_name: me.full_name,
        role: me.role,
        phone: me.phone ?? undefined,
        email: me.email ?? null,
      };
      persist(data);
      return data;
    },
    [persist]
  );

  const updateUser = useCallback(
    (patch: Partial<Pick<AuthUser, "full_name" | "phone" | "email">>) => {
      if (!user) return;
      persist({ ...user, ...patch });
    },
    [user, persist]
  );

  // Đăng nhập xong: gắn các đơn đã đặt khi chưa đăng nhập trên máy này (mã đơn + SĐT) vào tài khoản
  const token = user?.access_token ?? null;
  useEffect(() => {
    if (!token || claimedForToken.has(token)) return;
    claimedForToken.add(token);
    const orders = listRecentOrders().map((o) => ({ code: o.code, phone: o.phone }));
    if (orders.length === 0) return;
    apiRequest<{ claimed: string[] }>("/api/v1/account/claim-orders", { method: "POST", token, body: { orders: orders.slice(0, 20) } })
      .then((res) => {
        if (res.claimed.length) window.dispatchEvent(new CustomEvent("orders:claimed", { detail: res.claimed }));
      })
      .catch(() => claimedForToken.delete(token));
  }, [token]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // bỏ qua
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, ready, login, register, loginWithToken, updateUser, logout }),
    [user, token, ready, login, register, loginWithToken, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong AuthProvider");
  return ctx;
}

export const isStaffRole = (role?: string) => role === "admin" || role === "staff";
