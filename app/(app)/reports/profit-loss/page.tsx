import { Suspense } from "react";
import { Download } from "lucide-react";
import { requireRole, getSettings } from "@/lib/auth";
import { computePnL } from "@/lib/reporting";
import { resolvePeriod } from "@/lib/period";
import { formatMoney } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";

export default async function PnLPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await requireRole("owner", "accountant");
  const sp = await searchParams;
  const settings = await getSettings();
  const period = resolvePeriod(sp);
  const pnl = await computePnL(period);
  const fmt = (n: number) => formatMoney(n, settings.currency);
  const exportQs = `from=${period.from}&to=${period.to}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Profit &amp; Loss</h1>
          <p className="text-sm text-muted">{period.label}</p>
        </div>
        <a href={`/api/excel?report=pnl&${exportQs}`} className="btn-ghost"><Download size={15} /> Excel</a>
      </div>

      <Suspense><PeriodPicker /></Suspense>

      <div className="card max-w-2xl divide-y divide-[#EDF1F5]">
        <Section title="Revenue">
          <Row label="Labour Revenue" value={fmt(pnl.labourRevenue)} />
          <Row label="Parts Revenue" value={fmt(pnl.partsRevenue)} />
          <Row label="Other Revenue" value={fmt(pnl.otherRevenue)} />
          <Row label="Total Revenue" value={fmt(pnl.totalRevenue)} bold />
        </Section>
        <Section title="Cost of Goods">
          <Row label="Parts Cost (COGS)" value={fmt(pnl.partsCost)} />
          <Row label="Gross Profit" value={fmt(pnl.grossProfit)} bold tone="text-green-700" />
        </Section>
        <Section title="Operating Expenses">
          {pnl.expensesByCategory.map((e) => (
            <Row key={e.category} label={e.category} value={fmt(e.amount)} />
          ))}
          {!pnl.expensesByCategory.length && <p className="px-5 py-2 text-sm text-muted">No expenses in this period.</p>}
          <Row label="Total Expenses" value={fmt(pnl.totalExpenses)} bold />
        </Section>
        <div className="flex items-center justify-between bg-navy-800 px-5 py-4 text-white">
          <span className="text-[15px] font-extrabold">Net Profit</span>
          <span className={`text-lg font-extrabold tabular-nums ${pnl.netProfit >= 0 ? "text-green-300" : "text-red-300"}`}>
            {fmt(pnl.netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="px-5 pb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-brand">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 py-1.5 text-sm ${bold ? "font-bold" : "text-muted"} ${tone ?? ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
