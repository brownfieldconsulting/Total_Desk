"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

const settingsSchema = z.object({
  company_name: z.string().min(1),
  company_address: z.string().min(1),
  company_phone: z.string().min(1),
  company_email: z.string().email(),
  tax_rate: z.coerce.number().min(0).max(100),
  labour_rate: z.coerce.number().min(0),
  currency: z.enum(["AUD", "CAD", "USD"]),
  invoice_prefix: z.string().min(1).max(8),
});

export async function updateSettings(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner");
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const userSchema = z.object({
  full_name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["owner", "employee", "accountant"]),
});

export async function inviteUser(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner");
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { full_name, email, password, role } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return { ok: false, error: error.message };

  const { error: profileErr } = await admin.from("users").insert({
    id: data.user.id,
    full_name,
    email,
    role,
  });
  if (profileErr) return { ok: false, error: profileErr.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function setUserRole(userId: string, role: string): Promise<{ ok: boolean; error?: string }> {
  const me = await requireRole("owner");
  if (userId === me.id) return { ok: false, error: "You can't change your own role" };
  if (!["owner", "employee", "accountant"].includes(role)) return { ok: false, error: "Invalid role" };
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleUserActive(userId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const me = await requireRole("owner");
  if (userId === me.id) return { ok: false, error: "You can't deactivate yourself" };
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
