import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/auth";
import { RepairDetail } from "@/components/repair-detail";

export default async function RepairPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, settings, supabase] = await Promise.all([getProfile(), getSettings(), createClient()]);

  const { data: repair } = await supabase
    .from("repair_orders")
    .select("*, customers(id, first_name, last_name, phone), vehicles(id, make, model, year, license_plate, mileage)")
    .eq("id", id)
    .single();
  if (!repair) notFound();

  const [{ data: labour }, { data: parts }, { data: inventory }, { data: invoice }] = await Promise.all([
    supabase.from("repair_order_labour").select("*").eq("repair_order_id", id).order("created_at"),
    supabase.from("repair_order_parts").select("*").eq("repair_order_id", id).order("created_at"),
    supabase.from("inventory").select("id, part_number, description, cost_price, selling_price, quantity").eq("is_active", true).order("part_number"),
    supabase.from("invoices").select("id").eq("repair_order_id", id).maybeSingle(),
  ]);

  const cust = repair.customers as { id: string; first_name: string; last_name: string; phone: string | null };
  const veh = repair.vehicles as { id: string; make: string; model: string; year: number | null; license_plate: string | null; mileage: number | null };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">
          RO #{repair.ro_number}
          {veh.license_plate && <span className="ml-2 rounded bg-navy-700 px-2 py-0.5 text-xs font-bold text-white align-middle">{veh.license_plate}</span>}
        </h1>
        <p className="text-sm text-muted">
          <Link href={`/customers/${cust.id}`} className="font-semibold text-navy-700 hover:underline">
            {cust.first_name} {cust.last_name}
          </Link>
          {" · "}
          <Link href={`/vehicles/${veh.id}`} className="hover:underline">
            {veh.year} {veh.make} {veh.model}
          </Link>
          {veh.mileage ? ` · ${Number(veh.mileage).toLocaleString()} km` : ""}
        </p>
      </div>

      <RepairDetail
        repair={repair}
        labour={labour ?? []}
        parts={parts ?? []}
        inventory={inventory ?? []}
        role={profile.role}
        currency={settings.currency}
        taxRate={Number(settings.tax_rate)}
        labourRate={Number(settings.labour_rate)}
        invoiceId={invoice?.id}
      />
    </div>
  );
}
