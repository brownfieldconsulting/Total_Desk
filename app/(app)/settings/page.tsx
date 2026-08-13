import { requireRole, getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const profile = await requireRole("owner");
  const settings = await getSettings();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, role, is_active")
    .order("created_at");

  return <SettingsClient settings={settings} users={users ?? []} meId={profile.id} />;
}
