import type { PaymentMethod } from "@/types";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH", "UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "WALLET",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  DEBIT_CARD: "Debit Card",
  CREDIT_CARD: "Credit Card",
  NET_BANKING: "Net Banking",
  WALLET: "Wallet",
};

/** Years for a month/year selector: a fixed window around the current year, so it doesn't go stale. */
export function selectableYears(spanBack = 3, spanForward = 2): string[] {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current - spanBack; y <= current + spanForward; y++) {
    years.push(String(y));
  }
  return years;
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatINRCompact(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Today's date as YYYY-MM-DD in the *local* timezone. `toISOString()` returns
 * the UTC date, which is the wrong calendar day for part of the evening in
 * IST (UTC+5:30) — anything logged between midnight and 5:30am local time
 * would otherwise be dated "yesterday".
 */
export function todayLocalDateString(): string {
  return new Date().toLocaleDateString("en-CA"); // en-CA formats as YYYY-MM-DD
}
