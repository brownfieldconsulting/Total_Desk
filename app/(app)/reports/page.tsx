import Link from "next/link";
import { BarChart3, Scale, LineChart } from "lucide-react";
import { requireRole } from "@/lib/auth";

export default async function ReportsPage() {
  await requireRole("owner", "accountant");
  const reports = [
    { href: "/reports/profit-loss", title: "Profit & Loss", desc: "Revenue, expenses and net profit for any period", icon: BarChart3 },
    { href: "/reports/balance-sheet", title: "Balance Sheet", desc: "Assets, liabilities and equity — auto-calculated", icon: Scale },
    { href: "/reports/sales", title: "Sales Report", desc: "Daily, weekly, monthly or yearly sales with margins", icon: LineChart },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Reports</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href} className="card p-6 transition hover:shadow-lg">
              <Icon className="mb-3 text-brand" size={26} />
              <div className="text-[15px] font-bold">{r.title}</div>
              <div className="mt-1 text-sm text-muted">{r.desc}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
