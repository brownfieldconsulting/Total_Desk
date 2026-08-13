"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const repairSchema = z.object({
  customer_id: z.string().uuid("Pick a customer"),
  vehicle_id: z.string().uuid("Pick a vehicle"),
  customer_concern: z.string().optional(),
  diagnosis: z.string().optional(),
  repairs_performed: z.string().optional(),
  mechanic_notes: z.string().optional(),
});

export async function createRepairOrder(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const profile = await requireRole("owner", "employee");
  const parsed = repairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repair_orders")
    .insert({ ...parsed.data, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/repairs");
  return { ok: true, id: data.id };
}

export async function updateRepairOrder(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner", "employee");
  const fields = {
    customer_concern: String(formData.get("customer_concern") ?? ""),
    diagnosis: String(formData.get("diagnosis") ?? ""),
    repairs_performed: String(formData.get("repairs_performed") ?? ""),
    mechanic_notes: String(formData.get("mechanic_notes") ?? ""),
  };
  const supabase = await createClient();
  const { error } = await supabase.from("repair_orders").update(fields).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/repairs/${id}`);
  return { ok: true };
}

const STATUSES = ["open", "waiting_parts", "in_progress", "completed", "invoiced"] as const;

export async function setRepairStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner", "employee");
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false, error: "Invalid status" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("repair_orders")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/repairs/${id}`);
  revalidatePath("/repairs");
  return { ok: true };
}

export async function addLabourLine(repairOrderId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner", "employee");
  const schema = z.object({
    description: z.string().min(1, "Description required"),
    hours: z.coerce.number().min(0),
    hourly_rate: z.coerce.number().min(0),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("repair_order_labour").insert({ repair_order_id: repairOrderId, ...parsed.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/repairs/${repairOrderId}`);
  return { ok: true };
}

export async function removeLabourLine(id: string, repairOrderId: string) {
  await requireRole("owner", "employee");
  const supabase = await createClient();
  await supabase.from("repair_order_labour").delete().eq("id", id);
  revalidatePath(`/repairs/${repairOrderId}`);
}

export async function addPartLine(repairOrderId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("owner", "employee");
  const schema = z.object({
    inventory_id: z.string().optional(),
    part_number: z.string().optional(),
    description: z.string().min(1, "Description required"),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    cost_price: z.coerce.number().min(0),
    selling_price: z.coerce.number().min(0),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { inventory_id, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("repair_order_parts")
    .insert({ repair_order_id: repairOrderId, inventory_id: inventory_id || null, ...rest });
  if (error) return { ok: false, error: error.message };

  // Decrement stock when the part came from inventory
  if (inventory_id) {
    const { data: item } = await supabase.from("inventory").select("quantity").eq("id", inventory_id).single();
    if (item) {
      const after = Number(item.quantity) - parsed.data.quantity;
      await supabase.from("inventory").update({ quantity: after }).eq("id", inventory_id);
      await supabase.from("inventory_transactions").insert({
        inventory_id,
        txn_type: "repair_use",
        quantity_change: -parsed.data.quantity,
        quantity_after: after,
        reference: `RO ${repairOrderId.slice(0, 8)}`,
        created_by: profile.id,
      });
    }
  }
  revalidatePath(`/repairs/${repairOrderId}`);
  return { ok: true };
}

export async function removePartLine(id: string, repairOrderId: string) {
  await requireRole("owner", "employee");
  const supabase = await createClient();
  await supabase.from("repair_order_parts").delete().eq("id", id);
  revalidatePath(`/repairs/${repairOrderId}`);
}
