"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createVehicle, updateVehicle } from "@/lib/actions/customers";
import { SubmitButton, useToast } from "@/components/ui";

interface Vehicle {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
  license_plate: string | null;
  mileage: number | null;
  engine_type: string | null;
  colour: string | null;
  notes: string | null;
}

export function VehicleForm({ customerId, vehicle }: { customerId: string; vehicle?: Vehicle }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string>();

  async function action(formData: FormData) {
    const res = vehicle ? await updateVehicle(vehicle.id, formData) : await createVehicle(formData);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast(vehicle ? "Vehicle updated" : "Vehicle added");
    router.push(vehicle ? `/vehicles/${vehicle.id}` : `/customers/${customerId}`);
  }

  return (
    <form action={action} className="card max-w-lg space-y-4 p-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <input type="hidden" name="customer_id" value={customerId} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Make *</label>
          <input name="make" required defaultValue={vehicle?.make} className="input" placeholder="Toyota" />
        </div>
        <div>
          <label className="label">Model *</label>
          <input name="model" required defaultValue={vehicle?.model} className="input" placeholder="Hilux" />
        </div>
        <div>
          <label className="label">Year</label>
          <input name="year" type="number" inputMode="numeric" defaultValue={vehicle?.year ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Colour</label>
          <input name="colour" defaultValue={vehicle?.colour ?? ""} className="input" />
        </div>
        <div>
          <label className="label">License Plate</label>
          <input name="license_plate" defaultValue={vehicle?.license_plate ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Mileage (km)</label>
          <input name="mileage" type="number" inputMode="numeric" defaultValue={vehicle?.mileage ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label">VIN</label>
        <input name="vin" defaultValue={vehicle?.vin ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Engine Type</label>
        <input name="engine_type" defaultValue={vehicle?.engine_type ?? ""} className="input" placeholder="2.8L Diesel" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={2} defaultValue={vehicle?.notes ?? ""} className="input" />
      </div>
      <SubmitButton>{vehicle ? "Save Changes" : "Add Vehicle"}</SubmitButton>
    </form>
  );
}
