import { requireRole, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStartISO } from "@/lib/format";
import { FinanceClient } from "@/components/finance-client";

export default async function IncomePage() {
  const profile = await requireRole("owner", "accountant");
  const settings = await getSettings();
  const supabase = await createClient();

  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase
      .from("income")
      .select("id, income_date, description, amount, income_categories(name)")
      .order("income_date", { ascending: false })
      .limit(200),
    supabase.from("income_categories").select("id, name").order("name"),
  ]);

  const monthStart = monthStartISO();
  const total = (rows ?? [])
    .filter((r) => r.income_date >= monthStart)
    .reduce((s, r) => s + Number(r.amount), 0);

  const entries = (rows ?? []).map((r) => ({
    id: r.id,
    date: r.income_date,
    category: (r.income_categories as { name?: string } | null)?.name ?? "—",
    description: r.description,
    amount: Number(r.amount),
  }));

  return (
    <FinanceClient kind="income" entries={entries} categories={categories ?? []} currency={settings.currency} role={profile.role} total={total} />
  );
}
