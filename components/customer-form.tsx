"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { SubmitButton, useToast } from "@/components/ui";

export function CustomerForm({
  customer,
}: {
  customer?: { id: string; first_name: string; last_name: string; phone: string | null; email: string | null; notes: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string>();

  async function action(formData: FormData) {
    const res = customer ? await updateCustomer(customer.id, formData) : await createCustomer(formData);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast(customer ? "Customer updated" : "Customer added");
    router.push(customer ? `/customers/${customer.id}` : `/customers/${(res as { id?: string }).id}`);
  }

  return (
    <form action={action} className="card max-w-lg space-y-4 p-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">First Name *</label>
          <input name="first_name" required defaultValue={customer?.first_name} className="input" />
        </div>
        <div>
          <label className="label">Last Name *</label>
          <input name="last_name" required defaultValue={customer?.last_name} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" type="tel" inputMode="tel" defaultValue={customer?.phone ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" defaultValue={customer?.email ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" rows={3} defaultValue={customer?.notes ?? ""} className="input" />
      </div>
      <SubmitButton>{customer ? "Save Changes" : "Add Customer"}</SubmitButton>
    </form>
  );
}
