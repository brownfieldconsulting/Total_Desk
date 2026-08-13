import { Download } from "lucide-react";
import { requireRole, getSettings } from "@/lib/auth";
import { computeBalanceSheet } from "@/lib/reporting";
import { formatMoney, formatDate } from "@/lib/format";

export default async function BalanceSheetPage() {
  await requireRole("owner", "accountant");
  const settings = await getSettings();
  const bs = await computeBalanceSheet();
  const fmt = (n: number) => formatMoney(n, settings.currency);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Balance Sheet</h1>
          <p className="text-sm text-muted">As at {formatDate(new Date())}</p>
        </div>
        <a href="/api/excel?report=balance" className="btn-ghost"><Download size={15} /> Excel</a>
      </div>

      <div className="card max-w-2xl divide-y divide-[#EDF1F5]">
        <Group title="Assets">
          <Row label="Cash" value={fmt(bs.cash)} />
          <Row label="Accounts Receivable" value={fmt(bs.accountsReceivable)} />
          <Row label="Inventory (at cost)" value={fmt(bs.inventoryValue)} />
          <Row label="Total Assets" value={fmt(bs.totalAssets)} bold />
        </Group>
        <Group title="Liabilities">
          <Row label="Accounts Payable" value={fmt(bs.accountsPayable)} />
          <Row label="Loans" value={fmt(bs.loans)} />
          <Row label="Total Liabilities" value={fmt(bs.totalLiabilities)} bold />
        </Group>
        <Group title="Equity">
          <Row label="Owner Equity + Retained Earnings" value={fmt(bs.equity)} bold tone="text-green-700" />
        </Group>
        <div className="flex items-center justify-between bg-navy-800 px-5 py-4 text-white">
          <span className="text-[15px] font-extrabold">Liabilities + Equity</span>
          <span className="text-lg font-extrabold tabular-nums">{fmt(bs.totalLiabilities + bs.equity)}</span>
        </div>
      </div>
      <p className="max-w-2xl text-xs text-muted">
        Cash = payments received − expenses paid. Accounts receivable = unpaid invoice balances. Inventory valued at cost.
        Accounts payable and loans can be tracked when needed — kept at zero for simplicity.
      </p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
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
