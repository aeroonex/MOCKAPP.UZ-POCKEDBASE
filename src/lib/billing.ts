/**
 * Billing (obuna): admin belgilagan summa/rekvizit, chek yuborish, obuna holati.
 */
import { api, type AuthUser } from "@/lib/api";

export interface BillingSettings {
  amount: number;
  card_number: string;
  card_holder: string;
  /** To'lov QR havolasi (Paynet/Click/Payme). Bo'sh bo'lsa karta raqami ko'rsatiladi. */
  qr_url: string;
  period_days: number;
  remind_days: number;
  note: string;
}

export interface Access {
  active: boolean;
  blocked: boolean;
  expired: boolean;
  days_left: number | null;
  paid_until: string | null;
  remind?: boolean;
}

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  receipt_url: string;
  note: string;
  status: PaymentStatus;
  admin_note: string;
  reviewed_at: string | null;
  paid_until_after: string | null;
  created: string;
  user?: { email: string; username: string; name: string; paid_until: string | null };
}

export interface BillingInfo {
  settings: BillingSettings;
  access: Access;
  pending: Payment | null;
  history: Payment[];
}

export const billingApi = {
  info: () => api.get<BillingInfo>("/api/billing"),
  submit: (receipt: File, note: string, onProgress?: (l: number, t: number) => void) => {
    const form = new FormData();
    form.append("note", note);
    form.append("receipt", receipt);
    return api.upload<Payment>("/api/billing/payments", form, onProgress);
  },
  // admin
  adminSettings: () => api.get<BillingSettings>("/api/admin/billing/settings"),
  saveAdminSettings: (patch: Partial<BillingSettings>) => api.put<BillingSettings>("/api/admin/billing/settings", patch),
  adminPayments: (status?: PaymentStatus) => api.get<Payment[]>(`/api/admin/payments${status ? `?status=${status}` : ""}`),
  review: (id: string, status: "approved" | "rejected", admin_note = "") => api.patch<Payment>(`/api/admin/payments/${id}`, { status, admin_note }),
  setAccess: (userId: string, patch: { paid_until?: string | null; add_days?: number }) => api.patch<AuthUser>(`/api/admin/users/${userId}/access`, patch),
};

/** Mijoz tomonida obuna holati (server bilan bir xil qoida): developer — doim faol */
export function getAccess(user: AuthUser | null | undefined, remindDays = 5): Access {
  if (!user) return { active: true, blocked: false, expired: false, days_left: null, paid_until: null };
  if (user.role === "developer") return { active: true, blocked: false, expired: false, days_left: null, paid_until: null };
  const until = user.paid_until ? new Date(user.paid_until) : null;
  const msLeft = until ? until.getTime() - Date.now() : -1;
  const daysLeft = until ? Math.ceil(msLeft / 86_400_000) : null;
  const expired = !until || msLeft <= 0;
  return {
    active: !user.blocked && !expired,
    blocked: !!user.blocked,
    expired,
    days_left: daysLeft,
    paid_until: user.paid_until ?? null,
    remind: !expired && daysLeft !== null && daysLeft <= remindDays,
  };
}

export const formatSum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const formatCard = (card: string) => card.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
