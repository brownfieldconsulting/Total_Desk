"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getSettings } from "@/lib/auth";

export async function createInvoiceFromRepair(repairOrderId: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const profile = await requireRole("owner", "employee");
  const settings = await getSettings();
  const supabase = await createClient();

  const { data: repair } = await supabase
    .from("repair_orders")
    .select("id, customer_id, vehicle_id, status")
    .eq("id", repairOrderId)
    .single();
  if (!repair) return { ok: false, error: "Repair order not found" };

  const { data: existing } = await supabase.from("invoices").select("id").eq("repair_order_id", repairOrderId).maybeSingle();
  if (existing) return { ok: true, id: existing.id };

  const [{ data: labour }, { data: parts }] = await Promise.all([
    supabase.from("repair_order_labour").select("*").eq("repair_order_id", repairOrderId),
    supabase.from("repair_order_parts").select("*").eq("repair_order_id", repairOrderId),
  ]);

  const labourTotal = (labour ?? []).reduce((s, l) => s + Number(l.total), 0);
  const partsTotal = (parts ?? []).reduce((s, p) => s + Number(p.revenue), 0);
  const subtotal = labourTotal + partsTotal;
  if (subtotal <= 0) return { ok: false, error: "Add labour or parts before invoicing" };
  const taxRate = Number(settings.tax_rate);
  const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
  const grand = Number((subtotal + taxAmount).toFixed(2));

  const due = new Date();
  due.setDate(due.getDate() + 14);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      customer_id: repair.customer_id,
      vehicle_id: repair.vehicle_id,
      repair_order_id: repairOrderId,
      status: "draft",
      due_date: due.toISOString().slice(0, 10),
      labour_total: labourTotal,
      parts_total: partsTotal,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      grand_total: grand,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const items = [
    ...(labour ?? []).map((l, i) => ({
      invoice_id: invoice.id,
      item_type: "labour",
      description: `${l.description} (${l.hours} hrs)`,
      quantity: 1,
      unit_price: Number(l.total),
      sort_order: i,
    })),
    ...(parts ?? []).map((p, i) => ({
      invoice_id: invoice.id,
      item_type: "part",
      description: p.part_number ? `${p.description} (${p.part_number})` : p.description,
      quantity: Number(p.quantity),
      unit_price: Number(p.selling_price),
      sort_order: 100 + i,
    })),
  ];
  if (items.length) await supabase.from("invoice_items").insert(items);

  await supabase.from("repair_orders").update({ status: "invoiced" }).eq("id", repairOrderId);

  revalidatePath("/invoices");
  revalidatePath(`/repairs/${repairOrderId}`);
  return { ok: true, id: invoice.id };
}

export async function setInvoiceStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner", "employee");
  if (!["draft", "sent", "overdue"].includes(status)) return { ok: false, error: "Invalid status" };
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  return { ok: true };
}

const paymentSchema = z.object({
  payment_date: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["cash", "debit", "credit_card", "bank_transfer", "cheque"]),
  notes: z.string().optional(),
});

export async function recordPayment(invoiceId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("owner", "employee");
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({ invoice_id: invoiceId, created_by: profile.id, ...parsed.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePayment(id: string, invoiceId: string) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", id);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function cancelInvoice(id: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("owner");
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "A cancellation comment is required" };
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("status, amount_paid").eq("id", id).single();
  if (!invoice) return { ok: false, error: "Invoice not found" };
  if (invoice.status === "cancelled") return { ok: false, error: "Already cancelled" };
  if (Number(invoice.amount_paid) > 0) {
    return { ok: false, error: "Cannot cancel an invoice with payments recorded — delete the payments first" };
  }
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "cancelled",
      cancellation_reason: trimmed,
      cancelled_at: new Date().toISOString(),
      cancelled_by: profile.id,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  return { ok: true };
}
