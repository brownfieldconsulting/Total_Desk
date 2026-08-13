import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/auth";
import { InvoiceDetail } from "@/components/invoice-detail";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, settings, supabase] = await Promise.all([getProfile(), getSettings(), createClient()]);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(first_name, last_name, phone, email), vehicles(year, make, model, license_plate)")
    .eq("id", id)
    .single();
  if (!invoice) notFound();

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Invoice</h1>
      <InvoiceDetail
        invoice={invoice}
        items={items ?? []}
        payments={payments ?? []}
        customer={invoice.customers as never}
        vehicle={invoice.vehicles as never}
        settings={settings}
        role={profile.role}
      />
    </div>
  );
}
