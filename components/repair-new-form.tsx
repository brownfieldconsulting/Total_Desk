"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createRepairOrder } from "@/lib/actions/repairs";
import { SubmitButton, useToast } from "@/components/ui";

interface CustomerOpt {
  id: string;
  first_name: string;
  last_name: string;
  vehicles: { id: string; make: string; model: string; year: number | null; license_plate: string | null }[];
}

export function RepairNewForm({
  customers,
  presetCustomer,
  presetVehicle,
}: {
  customers: CustomerOpt[];
  presetCustomer?: string;
  presetVehicle?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [customerId, setCustomerId] = useState(presetCustomer ?? "");
  const vehicles = useMemo(() => customers.find((c) => c.id === customerId)?.vehicles ?? [], [customers, customerId]);

  async function action(formData: FormData) {
    const res = await createRepairOrder(formData);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast("Repair order created");
    router.push(`/repairs/${res.id}`);
  }

  return (
    <form action={action} className="card max-w-lg space-y-4 p-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div>
        <label className="label">Customer *</label>
        <select name="customer_id" required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
          <option value="">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
        <a href="/customers/new" className="mt-1 inline-block text-xs font-bold text-brand">＋ Add new customer</a>
      </div>
      <div>
        <label className="label">Vehicle *</label>
        <select name="vehicle_id" required defaultValue={presetVehicle ?? ""} className="input" disabled={!customerId}>
          <option value="">Select vehicle…</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.year} {v.make} {v.model} {v.license_plate ? `(${v.license_plate})` : ""}
            </option>
          ))}
        </select>
        {customerId && (
          <a href={`/vehicles/new?customer=${customerId}`} className="mt-1 inline-block text-xs font-bold text-brand">
            ＋ Add new vehicle
          </a>
        )}
      </div>
      <div>
        <label className="label">Customer Concern</label>
        <textarea name="customer_concern" rows={3} className="input" placeholder="What did the customer report?" />
      </div>
      <SubmitButton>Create Repair Order</SubmitButton>
    </form>
  );
}
