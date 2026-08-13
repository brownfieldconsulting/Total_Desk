import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: invoice }, { data: settings }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(first_name, last_name, phone, email), vehicles(year, make, model, license_plate)")
      .eq("id", id)
      .single(),
    supabase.from("settings").select("*").eq("id", 1).single(),
  ]);
  if (!invoice || !settings) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date"),
  ]);

  const pdf = await buildInvoicePdf({
    settings,
    invoice,
    customer: invoice.customers as never,
    vehicle: invoice.vehicles as never,
    items: items ?? [],
    payments: payments ?? [],
  });

  const url = new URL(request.url);
  const download = url.searchParams.get("download");

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
