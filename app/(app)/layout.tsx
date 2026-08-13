import { Shell } from "@/components/shell";
import { ToastProvider } from "@/components/ui";
import { getProfile, getSettings } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  return (
    <ToastProvider>
      <Shell role={profile.role} name={profile.full_name} currency={settings.currency}>
        {children}
      </Shell>
    </ToastProvider>
  );
}
