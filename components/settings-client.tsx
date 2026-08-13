"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { updateSettings, inviteUser, setUserRole, toggleUserActive } from "@/lib/actions/settings";
import { Modal, SubmitButton, useToast } from "@/components/ui";

interface Settings {
  company_name: string; company_address: string; company_phone: string; company_email: string;
  tax_rate: number; labour_rate: number; currency: string; invoice_prefix: string;
}
interface User { id: string; full_name: string; email: string; role: string; is_active: boolean }

export function SettingsClient({ settings, users, meId }: { settings: Settings; users: User[]; meId: string }) {
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Company settings */}
      <form
        action={async (fd) => {
          const res = await updateSettings(fd);
          toast(res.ok ? "Settings saved" : res.error ?? "Failed", !res.ok);
        }}
        className="card max-w-2xl space-y-4 p-6"
      >
        <div className="sec-label">Company</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Company Name</label>
            <input name="company_name" required defaultValue={settings.company_name} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input name="company_address" required defaultValue={settings.company_address} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="company_phone" required defaultValue={settings.company_phone} className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="company_email" type="email" required defaultValue={settings.company_email} className="input" />
          </div>
          <div>
            <label className="label">Tax Rate (%)</label>
            <input name="tax_rate" type="number" step="0.01" min="0" max="100" required defaultValue={Number(settings.tax_rate)} className="input" />
          </div>
          <div>
            <label className="label">Default Labour Rate</label>
            <input name="labour_rate" type="number" step="0.01" min="0" required defaultValue={Number(settings.labour_rate)} className="input" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select name="currency" defaultValue={settings.currency} className="input">
              <option value="AUD">AUD — Australian Dollar</option>
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
          <div>
            <label className="label">Invoice Prefix</label>
            <input name="invoice_prefix" required maxLength={8} defaultValue={settings.invoice_prefix} className="input" />
            <p className="mt-1 text-xs text-muted">Format: {settings.invoice_prefix}-YYYY-MM-DD-0001</p>
          </div>
        </div>
        <SubmitButton className="btn-primary">Save Settings</SubmitButton>
      </form>

      {/* Users */}
      <section className="max-w-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="sec-label">Users</h2>
          <button onClick={() => setInviteOpen(true)} className="btn-ghost !py-2 text-[13px]">
            <Plus size={14} /> Add User
          </button>
        </div>
        <div className="card divide-y divide-[#EDF1F5]">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-bold">
                  {u.full_name} {u.id === meId && <span className="text-xs font-semibold text-muted">(you)</span>}
                  {!u.is_active && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">INACTIVE</span>}
                </div>
                <div className="truncate text-xs text-muted">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  defaultValue={u.role}
                  disabled={u.id === meId}
                  onChange={async (e) => {
                    const res = await setUserRole(u.id, e.target.value);
                    toast(res.ok ? "Role updated" : res.error ?? "Failed", !res.ok);
                  }}
                  className="input !w-auto !py-1.5 text-[13px]"
                >
                  <option value="owner">Owner</option>
                  <option value="employee">Employee</option>
                  <option value="accountant">Accountant</option>
                </select>
                {u.id !== meId && (
                  <button
                    onClick={async () => {
                      const res = await toggleUserActive(u.id, !u.is_active);
                      toast(res.ok ? (u.is_active ? "User deactivated" : "User reactivated") : res.error ?? "Failed", !res.ok);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${u.is_active ? "text-red-600 hover:bg-red-50" : "text-green-700 hover:bg-green-50"}`}
                  >
                    {u.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">
          Roles — <b>Owner</b>: everything · <b>Employee</b>: repairs, customers, invoices (no financials) · <b>Accountant</b>: read-only reports
        </p>
      </section>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Add User">
        <form
          action={async (fd) => {
            const res = await inviteUser(fd);
            if (!res.ok) { setError(res.error); return; }
            setError(undefined);
            setInviteOpen(false);
            toast("User created — share their password securely");
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <div>
            <label className="label">Full Name *</label>
            <input name="full_name" required className="input" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Temporary Password *</label>
            <input name="password" type="text" required minLength={8} className="input" placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="label">Role *</label>
            <select name="role" defaultValue="employee" className="input">
              <option value="employee">Employee</option>
              <option value="accountant">Accountant</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <SubmitButton>Create User</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
