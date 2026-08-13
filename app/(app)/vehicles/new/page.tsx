import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { VehicleForm } from "@/components/vehicle-form";

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  await requireRole("owner", "employee");
  const { customer } = await searchParams;
  if (!customer) redirect("/customers");
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Add Vehicle</h1>
      <VehicleForm customerId={customer} />
    </div>
  );
}
