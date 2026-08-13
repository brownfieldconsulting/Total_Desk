import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Period {
  from: string; // inclusive ISO date
  to: string;   // inclusive ISO date
}

export interface PnL {
  labourRevenue: number;
  partsRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  partsCost: number;
  expensesByCategory: { category: string; amount: number }[];
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

/** Accrual P&L: revenue = invoices issued in period + manual income; expenses = expense entries. */
export async function computePnL(period: Period): Promise<PnL> {
  const supabase = await createClient();
  const [{ data: invoices }, { data: income }, { data: expenses }] = await Promise.all([
    supabase
      .from("invoices")
      .select("labour_total, parts_total, repair_order_id")
      .gte("invoice_date", period.from)
      .lte("invoice_date", period.to)
      .neq("status", "draft"),
    supabase
      .from("income")
      .select("amount")
      .gte("income_date", period.from)
      .lte("income_date", period.to),
    supabase
      .from("expenses")
      .select("amount, expense_categories(name)")
      .gte("expense_date", period.from)
      .lte("expense_date", period.to),
  ]);

  const labourRevenue = (invoices ?? []).reduce((s, i) => s + Number(i.labour_total), 0);
  const partsRevenue = (invoices ?? []).reduce((s, i) => s + Number(i.parts_total), 0);
  const otherRevenue = (income ?? []).reduce((s, i) => s + Number(i.amount), 0);
  const totalRevenue = labourRevenue + partsRevenue + otherRevenue;

  const byCat = new Map<string, number>();
  for (const e of expenses ?? []) {
    const name = (e.expense_categories as { name?: string } | null)?.name ?? "Other";
    byCat.set(name, (byCat.get(name) ?? 0) + Number(e.amount));
  }
  const expensesByCategory = [...byCat.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const totalExpenses = expensesByCategory.reduce((s, e) => s + e.amount, 0);

  // Parts COGS: cost of parts on repair orders invoiced in the period
  let partsCost = 0;
  const roIds = (invoices ?? []).map((i) => i.repair_order_id).filter(Boolean) as string[];
  if (roIds.length) {
    const { data: parts } = await supabase
      .from("repair_order_parts")
      .select("cost")
      .in("repair_order_id", roIds);
    partsCost = (parts ?? []).reduce((s, p) => s + Number(p.cost), 0);
  }

  return {
    labourRevenue, partsRevenue, otherRevenue, totalRevenue, partsCost,
    expensesByCategory, totalExpenses,
    grossProfit: totalRevenue - partsCost,
    netProfit: totalRevenue - totalExpenses,
  };
}

export interface SalesRow {
  bucket: string;
  revenue: number;
  cost: number;
  grossProfit: number;
}

export async function computeSales(period: Period, granularity: "day" | "week" | "month" | "year"): Promise<SalesRow[]> {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("invoice_date, subtotal, repair_order_id")
    .gte("invoice_date", period.from)
    .lte("invoice_date", period.to)
    .neq("status", "draft");

  const roIds = (invoices ?? []).map((i) => i.repair_order_id).filter(Boolean) as string[];
  const costs = new Map<string, number>();
  if (roIds.length) {
    const { data: parts } = await supabase
      .from("repair_order_parts")
      .select("repair_order_id, cost")
      .in("repair_order_id", roIds);
    for (const p of parts ?? []) {
      costs.set(p.repair_order_id, (costs.get(p.repair_order_id) ?? 0) + Number(p.cost));
    }
  }

  function bucketOf(dateStr: string) {
    const d = new Date(dateStr);
    if (granularity === "day") return dateStr;
    if (granularity === "month") return dateStr.slice(0, 7);
    if (granularity === "year") return dateStr.slice(0, 4);
    // ISO week
    const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = day.getUTCDay() || 7;
    day.setUTCDate(day.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  const rows = new Map<string, SalesRow>();
  for (const inv of invoices ?? []) {
    const b = bucketOf(inv.invoice_date);
    const row = rows.get(b) ?? { bucket: b, revenue: 0, cost: 0, grossProfit: 0 };
    row.revenue += Number(inv.subtotal);
    row.cost += inv.repair_order_id ? costs.get(inv.repair_order_id) ?? 0 : 0;
    row.grossProfit = row.revenue - row.cost;
    rows.set(b, row);
  }
  return [...rows.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export interface BalanceSheet {
  cash: number;
  accountsReceivable: number;
  inventoryValue: number;
  totalAssets: number;
  accountsPayable: number;
  loans: number;
  totalLiabilities: number;
  equity: number;
}

export async function computeBalanceSheet(): Promise<BalanceSheet> {
  const supabase = await createClient();
  const [{ data: payments }, { data: expenses }, { data: invoices }, { data: inventory }] = await Promise.all([
    supabase.from("payments").select("amount"),
    supabase.from("expenses").select("amount"),
    supabase.from("invoices").select("balance_due, status").in("status", ["sent", "partial", "overdue"]),
    supabase.from("inventory").select("quantity, cost_price").eq("is_active", true),
  ]);

  const cash =
    (payments ?? []).reduce((s, p) => s + Number(p.amount), 0) -
    (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const accountsReceivable = (invoices ?? []).reduce((s, i) => s + Number(i.balance_due), 0);
  const inventoryValue = (inventory ?? []).reduce((s, i) => s + Number(i.quantity) * Number(i.cost_price), 0);
  const totalAssets = cash + accountsReceivable + inventoryValue;
  const accountsPayable = 0;
  const loans = 0;
  const totalLiabilities = accountsPayable + loans;
  return {
    cash, accountsReceivable, inventoryValue, totalAssets,
    accountsPayable, loans, totalLiabilities,
    equity: totalAssets - totalLiabilities,
  };
}

/** Last 12 months of revenue/expense/profit for dashboard charts. */
export async function monthlyTrend(): Promise<{ month: string; revenue: number; expenses: number; profit: number }[]> {
  const supabase = await createClient();
  const start = new Date();
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);
  const from = start.toISOString().slice(0, 10);

  const [{ data: invoices }, { data: income }, { data: expenses }] = await Promise.all([
    supabase.from("invoices").select("invoice_date, subtotal").gte("invoice_date", from).neq("status", "draft"),
    supabase.from("income").select("income_date, amount").gte("income_date", from),
    supabase.from("expenses").select("expense_date, amount").gte("expense_date", from),
  ]);

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const rev = new Map<string, number>();
  const exp = new Map<string, number>();
  for (const i of invoices ?? []) rev.set(i.invoice_date.slice(0, 7), (rev.get(i.invoice_date.slice(0, 7)) ?? 0) + Number(i.subtotal));
  for (const i of income ?? []) rev.set(i.income_date.slice(0, 7), (rev.get(i.income_date.slice(0, 7)) ?? 0) + Number(i.amount));
  for (const e of expenses ?? []) exp.set(e.expense_date.slice(0, 7), (exp.get(e.expense_date.slice(0, 7)) ?? 0) + Number(e.amount));

  return months.map((m) => {
    const revenue = rev.get(m) ?? 0;
    const expensesV = exp.get(m) ?? 0;
    return { month: m, revenue, expenses: expensesV, profit: revenue - expensesV };
  });
}
