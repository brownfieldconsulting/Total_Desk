import { Suspense } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireRole, getSettings } from "@/lib/auth";
import { computeSales, computePnL } from "@/lib/reporting";
import { resolvePeriod } from "@/lib/period";
import { formatMoney } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";

const GRANULARITIES = ["day", "week", "month", "year"] as const;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; g?: string }>;
}) {
  await requireRole("owner", "accountant");
  const sp = await searchParams;
  const settings = await getSettings();
  const period = resolvePeriod(sp);
  const g = (GRANULARITIES.includes(sp.g as never) ? sp.g : "day") as (typeof GRANULARITIES)[number];
  const [rows, pnl] = await Promise.all([computeSales(period, g), computePnL(period)]);
  const fmt = (n: number) => formatMoney(n, settings.currency);
  const totals = rows.reduce(
    (a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, gross: a.gross + r.grossProfit }),
    { revenue: 0, cost: 0, gross: 0 }
  );

  const qs = (extra: string) =>
    `?preset=${sp.preset ?? "month"}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}${extra}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sales Report</h1>
          <p className="text-sm text-muted">{period.label}</p>
        </div>
        <a href={`/api/excel?report=sales&from=${period.from}&to=${period.to}&g=${g}`} className="btn-ghost">
          <Download size={15} /> Excel
        </a>
      </div>

      <Suspense><PeriodPicker /></Suspense>

      <div className="flex flex-wrap gap-2">
        {GRANULARITIES.map((gr) => (
          <Link
            key={gr}
            href={`/reports/sales${qs(`&g=${gr}`)}`}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition ${
              g === gr ? "border-navy-700 bg-navy-700 text-white" : "border-[#D6DEE6] bg-white text-muted hover:border-navy-700"
            }`}
          >
            {gr === "day" ? "Daily" : gr === "week" ? "Weekly" : gr === "month" ? "Monthly" : "Yearly"}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className="th">Period</th>
              <th className="th text-right">Revenue</th>
              <th className="th text-right">Cost</th>
              <th className="th text-right">Gross Profit</th>
              <th className="th text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.bucket} className="hover:bg-surface/60">
                <td className="td font-semibold">{r.bucket}</td>
                <td className="td text-right tabular-nums">{fmt(r.revenue)}</td>
                <td className="td text-right tabular-nums">{fmt(r.cost)}</td>
                <td className="td text-right font-semibold tabular-nums">{fmt(r.grossProfit)}</td>
                <td className="td text-right tabular-nums">
                  {r.revenue > 0 ? Math.round((r.grossProfit / r.revenue) * 100) : 0}%
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="td py-10 text-center text-muted">No invoiced sales in this period.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-surface font-bold">
                <td className="td">Total</td>
                <td className="td text-right tabular-nums">{fmt(totals.revenue)}</td>
                <td className="td text-right tabular-nums">{fmt(totals.cost)}</td>
                <td className="td text-right tabular-nums">{fmt(totals.gross)}</td>
                <td className="td text-right tabular-nums">
                  {totals.revenue > 0 ? Math.round((totals.gross / totals.revenue) * 100) : 0}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-sm text-muted">
        Net profit for {period.label}: <b className="tabular-nums">{fmt(pnl.netProfit)}</b> (after {fmt(pnl.totalExpenses)} operating expenses)
      </p>
    </div>
  );
}
