/**
 * Cấu hình URL kết nối Backend API (Railway / Localhost).
 * Tự động chuẩn hóa dấu gạch chéo cuối để tránh lỗi double-slash khi ghép endpoint.
 */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const SITE_BASE_URL = rawSiteUrl.replace(/\/+$/, "");

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Chuyển các dạng lỗi của FastAPI (detail chuỗi, mảng lỗi validate, AppException) thành một câu dễ đọc. */
function readErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === "string") return b.detail;
    if (Array.isArray(b.detail) && b.detail.length > 0) {
      const first = b.detail[0] as { msg?: string; loc?: unknown[] };
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
      return field ? `Trường "${field}" không hợp lệ: ${first.msg ?? ""}` : first.msg ?? "Dữ liệu không hợp lệ";
    }
    if (typeof b.message === "string" && b.message) return b.message;
  }
  if (status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
  if (status >= 500) return "Máy chủ đang bận. Vui lòng thử lại sau.";
  return "Không thể xử lý yêu cầu. Vui lòng thử lại.";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  sessionId?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Gọi API từ trình duyệt, tự gắn token / mã phiên giỏ hàng và bóc lớp {success, message, data}. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.sessionId) headers["X-Session-ID"] = options.sessionId;
  if (options.headers) Object.assign(headers, options.headers);

  let res: Response;
  try {
    res = await fetch(getApiUrl(path), {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.", 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(readErrorMessage(body, res.status), res.status);
  if (body && typeof body === "object" && "success" in body && body.success === false) {
    throw new ApiError(readErrorMessage(body, res.status), res.status);
  }
  return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
}
