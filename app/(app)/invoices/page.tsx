import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/auth";
import { formatDate, formatMoney, INVOICE_STATUS_LABELS } from "@/lib/format";
import { Badge, Empty } from "@/components/ui";

const FILTERS = ["all", "draft", "sent", "partial", "paid", "overdue"] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const [settings, supabase] = await Promise.all([getSettings(), createClient()]);

  let query = supabase
    .from("invoices")
    .select("id, invoice_number, status, invoice_date, grand_total, balance_due, customers(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status !== "all") query = query.eq("status", status);
  const { data: invoices } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Invoices</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/invoices" : `/invoices?status=${f}`}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              status === f ? "border-navy-700 bg-navy-700 text-white" : "border-[#D6DEE6] bg-white text-muted hover:border-navy-700"
            }`}
          >
            {f === "all" ? "All" : INVOICE_STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      {!invoices?.length ? (
        <Empty>No invoices yet. Complete a repair order and tap “Create Invoice”.</Empty>
      ) : (
        <div className="card divide-y divide-[#EDF1F5]">
          {invoices.map((inv) => {
            const cust = inv.customers as { first_name?: string; last_name?: string } | null;
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface/60">
                <div className="min-w-0">
                  <div className="text-sm font-bold">{inv.invoice_number}</div>
                  <div className="truncate text-xs text-muted">
                    {cust?.first_name} {cust?.last_name} · {formatDate(inv.invoice_date)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums">{formatMoney(inv.grand_total, settings.currency)}</div>
                    {Number(inv.balance_due) > 0 && Number(inv.balance_due) < Number(inv.grand_total) && (
                      <div className="text-[11px] font-semibold text-amber-700 tabular-nums">
                        {formatMoney(inv.balance_due, settings.currency)} due
                      </div>
                    )}
                  </div>
                  <Badge tone={inv.status}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
