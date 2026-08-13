import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Archive, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/auth";
import { formatDate, formatMoney, REPAIR_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/lib/format";
import { Badge } from "@/components/ui";
import { archiveCustomer } from "@/lib/actions/customers";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, settings, supabase] = await Promise.all([getProfile(), getSettings(), createClient()]);

  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();
  if (!customer) notFound();

  const [{ data: vehicles }, { data: repairs }, { data: invoices }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("customer_id", id).order("created_at"),
    supabase
      .from("repair_orders")
      .select("id, ro_number, status, customer_concern, created_at, vehicles(make, model)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, invoice_date, grand_total, amount_paid")
      .eq("customer_id", id)
      .order("invoice_date", { ascending: false })
      .limit(20),
  ]);

  const totalSpent = invoices?.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0) ?? 0;
  const canEdit = profile.role !== "accountant";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-sm text-muted">
            {customer.phone ?? "no phone"} · {customer.email ?? "no email"}
          </p>
          {customer.notes && <p className="mt-1 text-sm text-muted">📝 {customer.notes}</p>}
        </div>
        <div className="flex gap-2">
          {profile.role === "owner" && (
            <div className="card px-4 py-2 text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Spending</div>
              <div className="text-lg font-extrabold tabular-nums">{formatMoney(totalSpent, settings.currency)}</div>
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/repairs/new?customer=${id}`} className="btn-primary">
            <Plus size={16} /> New Repair Order
          </Link>
          <Link href={`/customers/${id}/edit`} className="btn-ghost">
            <Pencil size={15} /> Edit
          </Link>
          <form action={archiveCustomer.bind(null, id)}>
            <button className="btn-ghost text-red-600">
              <Archive size={15} /> Archive
            </button>
          </form>
        </div>
      )}

      {/* Vehicles */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="sec-label">Vehicles</h2>
          {canEdit && (
            <Link href={`/vehicles/new?customer=${id}`} className="text-sm font-bold text-brand">
              ＋ Add vehicle
            </Link>
          )}
        </div>
        {!vehicles?.length ? (
          <p className="text-sm text-muted">No vehicles yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <Link key={v.id} href={`/vehicles/${v.id}`} className="card p-4 transition hover:shadow-lg">
                <div className="font-bold">
                  {v.year} {v.make} {v.model}
                </div>
                <div className="text-sm text-muted">
                  {v.license_plate ?? "no plate"} · {v.mileage ? `${Number(v.mileage).toLocaleString()} km` : "—"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Repairs */}
      <section className="space-y-2.5">
        <h2 className="sec-label">Repair History</h2>
        {!repairs?.length ? (
          <p className="text-sm text-muted">No repairs yet.</p>
        ) : (
          <div className="card divide-y divide-[#EDF1F5]">
            {repairs.map((r) => (
              <Link key={r.id} href={`/repairs/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface/60">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    RO #{r.ro_number} · {(r.vehicles as { make?: string; model?: string } | null)?.make}{" "}
                    {(r.vehicles as { make?: string; model?: string } | null)?.model}
                  </div>
                  <div className="truncate text-xs text-muted">{r.customer_concern ?? "—"} · {formatDate(r.created_at)}</div>
                </div>
                <Badge tone={r.status}>{REPAIR_STATUS_LABELS[r.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Invoices */}
      <section className="space-y-2.5">
        <h2 className="sec-label">Invoice History</h2>
        {!invoices?.length ? (
          <p className="text-sm text-muted">No invoices yet.</p>
        ) : (
          <div className="card divide-y divide-[#EDF1F5]">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface/60">
                <div>
                  <div className="text-sm font-semibold">{inv.invoice_number}</div>
                  <div className="text-xs text-muted">{formatDate(inv.invoice_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">{formatMoney(inv.grand_total, settings.currency)}</span>
                  <Badge tone={inv.status}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
