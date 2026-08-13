"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Wrench, Users, FileText, Package, TrendingUp, TrendingDown,
  BarChart3, Settings, Menu, X, LogOut, MoreHorizontal,
} from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import type { Role } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "employee", "accountant"] },
  { href: "/repairs", label: "Repairs", icon: Wrench, roles: ["owner", "employee", "accountant"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["owner", "employee", "accountant"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["owner", "employee", "accountant"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["owner", "employee", "accountant"] },
  { href: "/income", label: "Income", icon: TrendingUp, roles: ["owner", "accountant"] },
  { href: "/expenses", label: "Expenses", icon: TrendingDown, roles: ["owner", "accountant"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["owner", "accountant"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["owner"] },
];

export function Shell({
  role,
  name,
  currency,
  children,
}: {
  role: Role;
  name: string;
  currency: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const nav = NAV.filter((n) => n.roles.includes(role));
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-gradient-to-b from-navy-700 to-navy-900 text-silver">
      <div className="flex justify-center border-b border-white/10 px-4 py-5">
        <Link href="/dashboard" onClick={() => setDrawer(false)}>
          <Image src="/branding/logo-transparent.png" alt="Norwich Auto Repairs" width={148} height={148} priority />
        </Link>
      </div>
      <nav className="flex flex-col gap-0.5 p-2.5 text-sm">
        {nav.map((n) => {
          const active = pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setDrawer(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition ${
                active
                  ? "bg-brand/15 text-white font-semibold shadow-[inset_3px_0_0_#F25C05]"
                  : "text-silver hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={17} className="shrink-0 opacity-90" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 px-4 py-4 text-xs text-[#7E93A8]">
        v1.0 · {currency} · {role}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[216px] shrink-0">
        <div className="fixed h-full w-[216px]">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/60" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full w-[260px] shadow-2xl">{sidebar}</div>
          <button
            className="absolute left-[270px] top-4 rounded-lg bg-white/10 p-2 text-white"
            onClick={() => setDrawer(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#E3E9EF] bg-white px-4 py-2.5 lg:px-6">
          <button className="rounded-lg p-2 text-navy-700 hover:bg-surface lg:hidden" onClick={() => setDrawer(true)} aria-label="Menu">
            <Menu size={22} />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-[13px] text-muted">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" })}
            </span>
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-navy-700 text-[13px] font-bold text-white" title={name}>
              {initials}
            </div>
            <form action="/logout" method="post">
              <button className="rounded-lg p-2 text-muted hover:bg-surface hover:text-red-600" title="Sign out">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-8">{children}</main>

        {/* Mobile bottom tabs */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[#E3E9EF] bg-white pb-5 pt-2 lg:hidden">
          {[
            { href: "/dashboard", label: "Home", icon: LayoutDashboard },
            { href: "/repairs", label: "Repairs", icon: Wrench },
            { href: "/invoices", label: "Invoices", icon: FileText },
            { href: "/customers", label: "More", icon: MoreHorizontal },
          ].map((t) => {
            const Icon = t.icon;
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center gap-0.5 px-4 text-[10.5px] font-semibold ${active ? "text-brand" : "text-muted"}`}
              >
                <Icon size={20} />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
