import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/auth";
import { formatDate, formatMoney, REPAIR_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/lib/format";
import { Badge } from "@/components/ui";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, settings, supabase] = await Promise.all([getProfile(), getSettings(), createClient()]);

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*, customers(id, first_name, last_name)")
    .eq("id", id)
    .single();
  if (!vehicle) notFound();
  const customer = vehicle.customers as { id: string; first_name: string; last_name: string };

  const [{ data: repairs }, { data: invoices }] = await Promise.all([
    supabase
      .from("repair_orders")
      .select("id, ro_number, status, customer_concern, created_at")
      .eq("vehicle_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, invoice_date, grand_total")
      .eq("vehicle_id", id)
      .order("invoice_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-sm text-muted">
            <Link href={`/customers/${customer.id}`} className="font-semibold text-navy-700 hover:underline">
              {customer.first_name} {customer.last_name}
            </Link>
            {" · "}
            {vehicle.license_plate ?? "no plate"} · {vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : "—"}
          </p>
        </div>
        {profile.role !== "accountant" && (
          <div className="flex gap-2">
            <Link href={`/repairs/new?customer=${customer.id}&vehicle=${id}`} className="btn-primary">
              <Plus size={16} /> New Repair
            </Link>
            <Link href={`/vehicles/${id}/edit`} className="btn-ghost">
              <Pencil size={15} /> Edit
            </Link>
          </div>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div><div className="label !mb-0.5">VIN</div><div className="text-sm font-semibold break-all">{vehicle.vin ?? "—"}</div></div>
        <div><div className="label !mb-0.5">Engine</div><div className="text-sm font-semibold">{vehicle.engine_type ?? "—"}</div></div>
        <div><div className="label !mb-0.5">Colour</div><div className="text-sm font-semibold">{vehicle.colour ?? "—"}</div></div>
        <div><div className="label !mb-0.5">Notes</div><div className="text-sm">{vehicle.notes ?? "—"}</div></div>
      </div>

      <section className="space-y-2.5">
        <h2 className="sec-label">Repairs</h2>
        {!repairs?.length ? (
          <p className="text-sm text-muted">No repairs recorded for this vehicle.</p>
        ) : (
          <div className="card divide-y divide-[#EDF1F5]">
            {repairs.map((r) => (
              <Link key={r.id} href={`/repairs/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface/60">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">RO #{r.ro_number}</div>
                  <div className="truncate text-xs text-muted">{r.customer_concern ?? "—"} · {formatDate(r.created_at)}</div>
                </div>
                <Badge tone={r.status}>{REPAIR_STATUS_LABELS[r.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2.5">
        <h2 className="sec-label">Invoices</h2>
        {!invoices?.length ? (
          <p className="text-sm text-muted">No invoices for this vehicle.</p>
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
