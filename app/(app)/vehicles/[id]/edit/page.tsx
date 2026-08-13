import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { VehicleForm } from "@/components/vehicle-form";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("owner", "employee");
  const { id } = await params;
  const supabase = await createClient();
  const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", id).single();
  if (!vehicle) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Edit Vehicle</h1>
      <VehicleForm customerId={vehicle.customer_id} vehicle={vehicle} />
    </div>
  );
}
