import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Role = "owner" | "employee" | "accountant";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
}

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("users").select("id, full_name, email, role").eq("id", user.id).single();
  if (!data) redirect("/login");
  return data as Profile;
}

/** Redirects to /dashboard when the current user's role is not allowed. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

export async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  return (
    data ?? {
      company_name: "Norwich Auto Repairs",
      company_address: "Thomas Town, Melbourne, Victoria",
      company_phone: "1800-CALLMEDADA",
      company_email: "norwichautorepairs@gmail.com",
      tax_rate: 15,
      labour_rate: 50,
      currency: "AUD",
      invoice_prefix: "NOR",
    }
  );
}
