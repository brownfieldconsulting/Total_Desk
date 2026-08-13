import { requireRole, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { monthStartISO } from "@/lib/format";
import { FinanceClient } from "@/components/finance-client";

export default async function ExpensesPage() {
  const profile = await requireRole("owner", "accountant");
  const settings = await getSettings();
  const supabase = await createClient();

  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, expense_date, vendor, description, amount, expense_categories(name), receipts(id)")
      .order("expense_date", { ascending: false })
      .limit(200),
    supabase.from("expense_categories").select("id, name").order("name"),
  ]);

  const monthStart = monthStartISO();
  const total = (rows ?? [])
    .filter((r) => r.expense_date >= monthStart)
    .reduce((s, r) => s + Number(r.amount), 0);

  const entries = (rows ?? []).map((r) => ({
    id: r.id,
    date: r.expense_date,
    category: (r.expense_categories as { name?: string } | null)?.name ?? "—",
    vendor: r.vendor,
    description: r.description,
    amount: Number(r.amount),
    hasReceipt: ((r.receipts as { id: string }[] | null)?.length ?? 0) > 0,
  }));

  return (
    <FinanceClient kind="expense" entries={entries} categories={categories ?? []} currency={settings.currency} role={profile.role} total={total} />
  );
}
