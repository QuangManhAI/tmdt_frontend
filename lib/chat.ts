/** Kiểu dữ liệu chat trực tuyến (backend: /api/v1/chat/me, /api/v1/admin/chat). */
export interface ChatMessage {
  id: string;
  seq: number;
  sender_role: "customer" | "staff";
  sender_name: string;
  body: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  is_guest: boolean;
  status: "open" | "closed";
  message_count: number;
  last_message_preview?: string | null;
  last_sender_role?: "customer" | "staff" | null;
  last_message_at?: string | null;
  unread_for_staff: number;
  unread_for_customer: number;
  created_at: string;
}

export interface MyChat {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  guest_token?: string | null;
}

/** Gộp tin mới vào danh sách theo seq, bỏ trùng (polling và phản hồi gửi tin có thể trả cùng một tin). */
export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev;
  const bySeq = new Map(prev.map((m) => [m.seq, m]));
  for (const m of incoming) bySeq.set(m.seq, m);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

export const lastSeq = (messages: ChatMessage[]) => (messages.length ? messages[messages.length - 1].seq : 0);

/** Giờ ngắn gọn: "14:05" nếu trong hôm nay, ngược lại "22/11 14:05". */
export function chatTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return time;
  return `${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} ${time}`;
}
