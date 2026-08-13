"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const incomeSchema = z.object({
  income_date: z.string().min(1),
  category_id: z.string().uuid("Pick a category"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be ≥ 0"),
});

export async function addIncome(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("owner");
  const parsed = incomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("income").insert({ ...parsed.data, created_by: profile.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/income");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteIncome(id: string) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase.from("income").delete().eq("id", id);
  revalidatePath("/income");
}

const expenseSchema = z.object({
  expense_date: z.string().min(1),
  category_id: z.string().uuid("Pick a category"),
  vendor: z.string().optional(),
  description: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be ≥ 0"),
});

export async function addExpense(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const profile = await requireRole("owner");
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").insert({ ...parsed.data, created_by: profile.id }).select("id").single();
  if (error) return { ok: false, error: error.message };

  // Optional receipt upload
  const receipt = formData.get("receipt") as File | null;
  if (receipt && receipt.size > 0) {
    const ext = receipt.name.split(".").pop() ?? "bin";
    const storagePath = `${new Date().getFullYear()}/${data.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(storagePath, receipt, {
      contentType: receipt.type,
      upsert: true,
    });
    if (!upErr) {
      await supabase.from("receipts").insert({
        expense_id: data.id,
        storage_path: storagePath,
        file_name: receipt.name,
        mime_type: receipt.type || "application/octet-stream",
        uploaded_by: profile.id,
      });
    }
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

export async function deleteExpense(id: string) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/expenses");
}

export async function addCategory(kind: "income" | "expense", name: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole("owner");
  if (!name.trim()) return { ok: false, error: "Name required" };
  const supabase = await createClient();
  const table = kind === "income" ? "income_categories" : "expense_categories";
  const { error } = await supabase.from(table).insert({ name: name.trim() });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/${kind === "income" ? "income" : "expenses"}`);
  revalidatePath("/settings");
  return { ok: true };
}

export async function getReceiptUrl(expenseId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireRole("owner", "accountant");
  const supabase = await createClient();
  const { data: receipt } = await supabase.from("receipts").select("storage_path").eq("expense_id", expenseId).maybeSingle();
  if (!receipt) return { ok: false, error: "No receipt attached" };
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(receipt.storage_path, 3600);
  if (error || !data) return { ok: false, error: error?.message ?? "Could not sign URL" };
  return { ok: true, url: data.signedUrl };
}
