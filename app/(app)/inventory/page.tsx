import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/auth";
import { InventoryClient } from "@/components/inventory-client";

export default async function InventoryPage() {
  const [profile, settings, supabase] = await Promise.all([getProfile(), getSettings(), createClient()]);
  const [{ data: items }, { data: txns }] = await Promise.all([
    supabase.from("inventory").select("*").eq("is_active", true).order("part_number"),
    supabase.from("inventory_transactions").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  return <InventoryClient items={items ?? []} txns={txns ?? []} role={profile.role} currency={settings.currency} />;
}
