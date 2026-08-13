import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RepairNewForm } from "@/components/repair-new-form";

export default async function NewRepairPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; vehicle?: string }>;
}) {
  await requireRole("owner", "employee");
  const { customer, vehicle } = await searchParams;
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, first_name, last_name, vehicles(id, make, model, year, license_plate)")
    .eq("is_archived", false)
    .order("first_name")
    .limit(500);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">New Repair Order</h1>
      <RepairNewForm
        customers={(customers ?? []) as never}
        presetCustomer={customer}
        presetVehicle={vehicle}
      />
    </div>
  );
}
