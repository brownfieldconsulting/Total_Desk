import Link from "next/link";
import { Plus, UserPlus, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/auth";
import { formatMoney, todayISO, monthStartISO } from "@/lib/format";
import { monthlyTrend } from "@/lib/reporting";
import { BarChart } from "@/components/bar-chart";

export default async function DashboardPage() {
  const [profile, settings, supabase] = await Promise.all([getProfile(), getSettings(), createClient()]);
  const today = todayISO();
  const monthStart = monthStartISO();
  const isFinancial = profile.role !== "employee";

  const [
    { count: completedToday },
    { count: openRepairs },
    { data: invToday },
    { data: incToday },
    { data: expToday },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from("repair_orders").select("id", { count: "exact", head: true }).in("status", ["completed", "invoiced"]).gte("updated_at", `${today}T00:00:00`),
    supabase.from("repair_orders").select("id", { count: "exact", head: true }).in("status", ["open", "waiting_parts", "in_progress"]),
    isFinancial ? supabase.from("invoices").select("subtotal").eq("invoice_date", today).neq("status", "draft") : Promise.resolve({ data: [] }),
    isFinancial ? supabase.from("income").select("amount").eq("income_date", today) : Promise.resolve({ data: [] }),
    isFinancial ? supabase.from("expenses").select("amount").eq("expense_date", today) : Promise.resolve({ data: [] }),
    supabase.from("inventory").select("part_number, description, quantity, reorder_level").eq("is_active", true),
  ]);

  const revenueToday =
    (invToday ?? []).reduce((s, i) => s + Number(i.subtotal), 0) +
    (incToday ?? []).reduce((s, i) => s + Number(i.amount), 0);
  const expensesToday = (expToday ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const low = (lowStock ?? []).filter((i) => Number(i.quantity) <= Number(i.reorder_level));

  // Month figures
  let month = { revenue: 0, expenses: 0, gross: 0, net: 0 };
  let trend: Awaited<ReturnType<typeof monthlyTrend>> = [];
  if (isFinancial) {
    const [{ data: invMonth }, { data: incMonth }, { data: expMonth }] = await Promise.all([
      supabase.from("invoices").select("subtotal, repair_order_id").gte("invoice_date", monthStart).neq("status", "draft"),
      supabase.from("income").select("amount").gte("income_date", monthStart),
      supabase.from("expenses").select("amount").gte("expense_date", monthStart),
    ]);
    const revenue =
      (invMonth ?? []).reduce((s, i) => s + Number(i.subtotal), 0) +
      (incMonth ?? []).reduce((s, i) => s + Number(i.amount), 0);
    const expenses = (expMonth ?? []).reduce((s, e) => s + Number(e.amount), 0);

    let partsCost = 0;
    const roIds = (invMonth ?? []).map((i) => i.repair_order_id).filter(Boolean) as string[];
    if (roIds.length) {
      const { data: parts } = await supabase.from("repair_order_parts").select("cost").in("repair_order_id", roIds);
      partsCost = (parts ?? []).reduce((s, p) => s + Number(p.cost), 0);
    }
    month = { revenue, expenses, gross: revenue - partsCost, net: revenue - expenses };
    trend = await monthlyTrend();
  }

  const fmt = (n: number) => formatMoney(n, settings.currency);
  const canCreate = profile.role !== "accountant";

  return (
    <div className="space-y-6">
      {low.length > 0 && (
        <Link href="/inventory" className="flex items-center gap-2.5 rounded-[10px] border border-[#F8CBA4] border-l-4 border-l-brand bg-[#FEF3E8] px-4 py-2.5 text-[13.5px]">
          ⚠️ <span><b className="text-[#B44705]">Low stock:</b> {low.map((i) => `${i.description} (${Number(i.quantity)} left)`).join(" · ")}</span>
        </Link>
      )}

      <section>
        <h2 className="sec-label mb-2.5">Today</h2>
        <div className={`grid grid-cols-2 gap-3 ${isFinancial ? "lg:grid-cols-5" : "lg:grid-cols-2"}`}>
          <Stat label="Repairs Completed" value={String(completedToday ?? 0)} />
          <Stat label="Open Repairs" value={String(openRepairs ?? 0)} />
          {isFinancial && <Stat label="Revenue Today" value={fmt(revenueToday)} />}
          {isFinancial && <Stat label="Expenses Today" value={fmt(expensesToday)} tone="text-[#C2410C]" />}
          {isFinancial && <Stat label="Profit Today" value={fmt(revenueToday - expensesToday)} tone="text-green-700" />}
        </div>
      </section>

      {isFinancial && (
        <section>
          <h2 className="sec-label mb-2.5">
            This Month · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue" value={fmt(month.revenue)} />
            <Stat label="Expenses" value={fmt(month.expenses)} tone="text-[#C2410C]" />
            <Stat label="Gross Profit" value={fmt(month.gross)} />
            <Stat label="Net Profit" value={fmt(month.net)} tone="text-green-700" />
          </div>
        </section>
      )}

      {canCreate && (
        <section>
          <h2 className="sec-label mb-2.5">Quick Actions</h2>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/repairs/new" className="btn-primary"><Plus size={16} /> New Repair Order</Link>
            <Link href="/customers/new" className="btn-ghost"><UserPlus size={15} /> Add Customer</Link>
            <Link href="/repairs?status=completed" className="btn-ghost"><FileText size={15} /> Create Invoice</Link>
            {profile.role === "owner" && <Link href="/expenses" className="btn-ghost"><TrendingDown size={15} /> Add Expense</Link>}
            {profile.role === "owner" && <Link href="/income" className="btn-ghost"><TrendingUp size={15} /> Add Income</Link>}
          </div>
        </section>
      )}

      {isFinancial && trend.length > 0 && (
        <section className="grid gap-3 lg:grid-cols-3">
          <BarChart
            title="Monthly Revenue" sub="Last 12 months" color="navy"
            data={trend.map((t) => ({ label: t.month, value: t.revenue }))}
          />
          <BarChart
            title="Monthly Expenses" sub="Last 12 months" color="silver"
            data={trend.map((t) => ({ label: t.month, value: t.expenses }))}
          />
          <BarChart
            title="Monthly Profit" sub="Last 12 months" color="orange"
            data={trend.map((t) => ({ label: t.month, value: Math.max(t.profit, 0) }))}
          />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="mb-1 text-[12px] font-semibold text-muted">{label}</div>
      <div className={`text-[21px] font-extrabold tracking-tight tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
