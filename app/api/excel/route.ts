import { NextResponse } from "next/server";
import type { Row } from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { computePnL, computeSales, computeBalanceSheet } from "@/lib/reporting";
import { getProfile } from "@/lib/auth";

export const runtime = "nodejs";

const NAVY = "FF16324F";
const ORANGE = "FFF25C05";

function styleHeader(row: Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle" };
  });
  row.height = 20;
}

export async function GET(request: Request) {
  const profile = await getProfile();
  const url = new URL(request.url);
  const report = url.searchParams.get("report") ?? "pnl";
  const from = url.searchParams.get("from") ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const financial = ["pnl", "balance", "sales", "expenses"].includes(report);
  if (financial && !["owner", "accountant"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Norwich Auto Repairs";
  const supabase = await createClient();

  if (report === "pnl") {
    const pnl = await computePnL({ from, to });
    const ws = wb.addWorksheet("Profit & Loss");
    ws.columns = [{ width: 36 }, { width: 16 }];
    ws.addRow(["Norwich Auto Repairs — Profit & Loss"]).font = { bold: true, size: 14 };
    ws.addRow([`Period: ${from} to ${to}`]).font = { color: { argb: "FF5A6B7A" } };
    ws.addRow([]);
    styleHeader(ws.addRow(["Revenue", "Amount"]));
    ws.addRow(["Labour Revenue", pnl.labourRevenue]);
    ws.addRow(["Parts Revenue", pnl.partsRevenue]);
    ws.addRow(["Other Revenue", pnl.otherRevenue]);
    ws.addRow(["Total Revenue", pnl.totalRevenue]).font = { bold: true };
    ws.addRow([]);
    styleHeader(ws.addRow(["Cost of Goods", ""]));
    ws.addRow(["Parts Cost (COGS)", pnl.partsCost]);
    ws.addRow(["Gross Profit", pnl.grossProfit]).font = { bold: true };
    ws.addRow([]);
    styleHeader(ws.addRow(["Operating Expenses", ""]));
    for (const e of pnl.expensesByCategory) ws.addRow([e.category, e.amount]);
    ws.addRow(["Total Expenses", pnl.totalExpenses]).font = { bold: true };
    ws.addRow([]);
    const net = ws.addRow(["NET PROFIT", pnl.netProfit]);
    net.font = { bold: true, size: 12, color: { argb: ORANGE } };
    ws.getColumn(2).numFmt = "#,##0.00";
  } else if (report === "balance") {
    const bs = await computeBalanceSheet();
    const ws = wb.addWorksheet("Balance Sheet");
    ws.columns = [{ width: 36 }, { width: 16 }];
    ws.addRow(["Norwich Auto Repairs — Balance Sheet"]).font = { bold: true, size: 14 };
    ws.addRow([`As at ${new Date().toISOString().slice(0, 10)}`]).font = { color: { argb: "FF5A6B7A" } };
    ws.addRow([]);
    styleHeader(ws.addRow(["Assets", "Amount"]));
    ws.addRow(["Cash", bs.cash]);
    ws.addRow(["Accounts Receivable", bs.accountsReceivable]);
    ws.addRow(["Inventory", bs.inventoryValue]);
    ws.addRow(["Total Assets", bs.totalAssets]).font = { bold: true };
    ws.addRow([]);
    styleHeader(ws.addRow(["Liabilities", ""]));
    ws.addRow(["Accounts Payable", bs.accountsPayable]);
    ws.addRow(["Loans", bs.loans]);
    ws.addRow(["Total Liabilities", bs.totalLiabilities]).font = { bold: true };
    ws.addRow([]);
    styleHeader(ws.addRow(["Equity", ""]));
    ws.addRow(["Owner Equity + Retained Earnings", bs.equity]).font = { bold: true };
    ws.getColumn(2).numFmt = "#,##0.00";
  } else if (report === "sales") {
    const g = (url.searchParams.get("g") ?? "day") as "day" | "week" | "month" | "year";
    const rows = await computeSales({ from, to }, g);
    const ws = wb.addWorksheet("Sales");
    ws.columns = [{ width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }];
    ws.addRow(["Norwich Auto Repairs — Sales Report"]).font = { bold: true, size: 14 };
    ws.addRow([`Period: ${from} to ${to} (${g})`]).font = { color: { argb: "FF5A6B7A" } };
    ws.addRow([]);
    styleHeader(ws.addRow(["Period", "Revenue", "Cost", "Gross Profit"]));
    for (const r of rows) ws.addRow([r.bucket, r.revenue, r.cost, r.grossProfit]);
    const t = rows.reduce((a, r) => ({ r: a.r + r.revenue, c: a.c + r.cost, g: a.g + r.grossProfit }), { r: 0, c: 0, g: 0 });
    ws.addRow(["Total", t.r, t.c, t.g]).font = { bold: true };
    [2, 3, 4].forEach((c) => (ws.getColumn(c).numFmt = "#,##0.00"));
  } else if (report === "expenses") {
    const { data } = await supabase
      .from("expenses")
      .select("expense_date, vendor, description, amount, expense_categories(name)")
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date");
    const ws = wb.addWorksheet("Expenses");
    ws.columns = [{ width: 12 }, { width: 20 }, { width: 20 }, { width: 30 }, { width: 12 }];
    ws.addRow(["Norwich Auto Repairs — Expenses"]).font = { bold: true, size: 14 };
    ws.addRow([`Period: ${from} to ${to}`]).font = { color: { argb: "FF5A6B7A" } };
    ws.addRow([]);
    styleHeader(ws.addRow(["Date", "Category", "Vendor", "Description", "Amount"]));
    for (const e of data ?? []) {
      ws.addRow([
        e.expense_date,
        (e.expense_categories as { name?: string } | null)?.name ?? "",
        e.vendor ?? "",
        e.description ?? "",
        Number(e.amount),
      ]);
    }
    ws.addRow(["", "", "", "Total", (data ?? []).reduce((s, e) => s + Number(e.amount), 0)]).font = { bold: true };
    ws.getColumn(5).numFmt = "#,##0.00";
  } else if (report === "inventory") {
    const { data } = await supabase.from("inventory").select("*").eq("is_active", true).order("part_number");
    const ws = wb.addWorksheet("Inventory");
    ws.columns = [{ width: 16 }, { width: 34 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }];
    ws.addRow(["Norwich Auto Repairs — Inventory"]).font = { bold: true, size: 14 };
    ws.addRow([`As at ${new Date().toISOString().slice(0, 10)}`]).font = { color: { argb: "FF5A6B7A" } };
    ws.addRow([]);
    styleHeader(ws.addRow(["Part #", "Description", "Qty", "Cost", "Price", "Reorder", "Stock Value"]));
    for (const i of data ?? []) {
      const row = ws.addRow([
        i.part_number, i.description, Number(i.quantity), Number(i.cost_price),
        Number(i.selling_price), Number(i.reorder_level), Number(i.quantity) * Number(i.cost_price),
      ]);
      if (Number(i.quantity) <= Number(i.reorder_level)) row.getCell(3).font = { bold: true, color: { argb: "FFDC2626" } };
    }
    [4, 5, 7].forEach((c) => (ws.getColumn(c).numFmt = "#,##0.00"));
  } else {
    return NextResponse.json({ error: "Unknown report" }, { status: 400 });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="norwich-${report}-${to}.xlsx"`,
    },
  });
}
