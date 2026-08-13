"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const customerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createCustomer(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const profile = await requireRole("owner", "employee");
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, email: parsed.data.email || null, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  return { ok: true, id: data.id };
}

export async function updateCustomer(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner", "employee");
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ ...parsed.data, email: parsed.data.email || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true };
}

export async function archiveCustomer(id: string) {
  await requireRole("owner", "employee");
  const supabase = await createClient();
  await supabase.from("customers").update({ is_archived: true }).eq("id", id);
  revalidatePath("/customers");
  redirect("/customers");
}

const vehicleSchema = z.object({
  customer_id: z.string().uuid(),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal("")),
  vin: z.string().optional(),
  license_plate: z.string().optional(),
  mileage: z.coerce.number().int().min(0).optional().or(z.literal("")),
  engine_type: z.string().optional(),
  colour: z.string().optional(),
  notes: z.string().optional(),
});

export async function createVehicle(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireRole("owner", "employee");
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...v, year: v.year === "" ? null : v.year, mileage: v.mileage === "" ? null : v.mileage })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/customers/${v.customer_id}`);
  return { ok: true, id: data.id };
}

export async function updateVehicle(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner", "employee");
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ ...v, year: v.year === "" ? null : v.year, mileage: v.mileage === "" ? null : v.mileage })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/vehicles/${id}`);
  return { ok: true };
}
