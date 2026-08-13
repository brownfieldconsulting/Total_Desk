"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const itemSchema = z.object({
  part_number: z.string().min(1, "Part number required"),
  description: z.string().min(1, "Description required"),
  quantity: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  reorder_level: z.coerce.number().min(0),
});

export async function addInventoryItem(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("owner", "employee");
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: error.message };
  if (parsed.data.quantity > 0) {
    await supabase.from("inventory_transactions").insert({
      inventory_id: data.id,
      txn_type: "receive",
      quantity_change: parsed.data.quantity,
      quantity_after: parsed.data.quantity,
      reference: "Initial stock",
      created_by: profile.id,
    });
  }
  revalidatePath("/inventory");
  return { ok: true };
}

export async function updateInventoryItem(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner");
  const schema = itemSchema.omit({ quantity: true });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("inventory").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventory");
  return { ok: true };
}

export async function receiveStock(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("owner", "employee");
  const qty = Number(formData.get("quantity"));
  const reference = String(formData.get("reference") ?? "");
  if (!qty || qty <= 0) return { ok: false, error: "Enter a positive quantity" };
  const supabase = await createClient();
  const { data: item } = await supabase.from("inventory").select("quantity").eq("id", id).single();
  if (!item) return { ok: false, error: "Item not found" };
  const after = Number(item.quantity) + qty;
  const { error } = await supabase.from("inventory").update({ quantity: after }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("inventory_transactions").insert({
    inventory_id: id, txn_type: "receive", quantity_change: qty, quantity_after: after,
    reference: reference || "Stock received", created_by: profile.id,
  });
  revalidatePath("/inventory");
  return { ok: true };
}

export async function adjustStock(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("owner", "employee");
  const qty = Number(formData.get("quantity"));
  const reference = String(formData.get("reference") ?? "");
  if (!qty || Number.isNaN(qty)) return { ok: false, error: "Enter an adjustment (e.g. -2 or 5)" };
  if (!reference) return { ok: false, error: "A reason is required for adjustments" };
  const supabase = await createClient();
  const { data: item } = await supabase.from("inventory").select("quantity").eq("id", id).single();
  if (!item) return { ok: false, error: "Item not found" };
  const after = Number(item.quantity) + qty;
  if (after < 0) return { ok: false, error: "Stock cannot go negative" };
  const { error } = await supabase.from("inventory").update({ quantity: after }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("inventory_transactions").insert({
    inventory_id: id, txn_type: "adjustment", quantity_change: qty, quantity_after: after,
    reference, created_by: profile.id,
  });
  revalidatePath("/inventory");
  return { ok: true };
}
