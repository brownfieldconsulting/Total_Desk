import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { Empty } from "@/components/ui";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [profile, settings, supabase] = await Promise.all([getProfile(), getSettings(), createClient()]);

  let query = supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email, vehicles(count), invoices(amount_paid)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data: customers } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Customers</h1>
        {profile.role !== "accountant" && (
          <Link href="/customers/new" className="btn-primary">
            <Plus size={16} /> Add Customer
          </Link>
        )}
      </div>

      <form className="max-w-md">
        <input name="q" defaultValue={q} placeholder="Search name or phone…" className="input" />
      </form>

      {!customers?.length ? (
        <Empty>No customers found. Add your first customer to get started.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">Vehicles</th>
                {profile.role === "owner" && <th className="th text-right">Total Spent</th>}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const spent = (c.invoices as { amount_paid: number }[] | null)?.reduce(
                  (s, i) => s + Number(i.amount_paid ?? 0),
                  0
                );
                const vehicleCount = (c.vehicles as { count: number }[] | null)?.[0]?.count ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-surface/60">
                    <td className="td font-semibold">
                      <Link href={`/customers/${c.id}`} className="block">
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="td text-muted">{c.phone ?? "—"}</td>
                    <td className="td">{vehicleCount}</td>
                    {profile.role === "owner" && (
                      <td className="td text-right font-semibold tabular-nums">{formatMoney(spent, settings.currency)}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
