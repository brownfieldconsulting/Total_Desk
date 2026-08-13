const CURRENCY_LOCALE: Record<string, string> = {
  AUD: "en-AU",
  CAD: "en-CA",
  USD: "en-US",
};

export function formatMoney(amount: number | string | null | undefined, currency = "AUD") {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? "en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartISO(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

export const REPAIR_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  waiting_parts: "Waiting Parts",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  partial: "Partial Payment",
  overdue: "Overdue",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  debit: "Debit",
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};
