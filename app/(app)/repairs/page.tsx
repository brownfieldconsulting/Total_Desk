import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { formatDate, REPAIR_STATUS_LABELS } from "@/lib/format";
import { Badge, Empty } from "@/components/ui";

const FILTERS = ["all", "open", "waiting_parts", "in_progress", "completed", "invoiced"] as const;

export default async function RepairsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  let query = supabase
    .from("repair_orders")
    .select("id, ro_number, status, customer_concern, created_at, customers(first_name, last_name), vehicles(make, model, license_plate)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status !== "all") query = query.eq("status", status);
  const { data: repairs } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Repair Orders</h1>
        {profile.role !== "accountant" && (
          <Link href="/repairs/new" className="btn-primary">
            <Plus size={16} /> New Repair Order
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/repairs" : `/repairs?status=${f}`}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              status === f ? "border-navy-700 bg-navy-700 text-white" : "border-[#D6DEE6] bg-white text-muted hover:border-navy-700"
            }`}
          >
            {f === "all" ? "All" : REPAIR_STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      {!repairs?.length ? (
        <Empty>No repair orders {status !== "all" ? `with status "${REPAIR_STATUS_LABELS[status] ?? status}"` : "yet"}.</Empty>
      ) : (
        <div className="card divide-y divide-[#EDF1F5]">
          {repairs.map((r) => {
            const cust = r.customers as { first_name?: string; last_name?: string } | null;
            const veh = r.vehicles as { make?: string; model?: string; license_plate?: string } | null;
            return (
              <Link key={r.id} href={`/repairs/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface/60">
                <div className="min-w-0">
                  <div className="text-sm font-bold">
                    RO #{r.ro_number} · {veh?.make} {veh?.model}
                    {veh?.license_plate && <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[11px] font-bold text-navy-700">{veh.license_plate}</span>}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {cust?.first_name} {cust?.last_name} · {r.customer_concern ?? "—"} · {formatDate(r.created_at)}
                  </div>
                </div>
                <Badge tone={r.status}>{REPAIR_STATUS_LABELS[r.status]}</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
