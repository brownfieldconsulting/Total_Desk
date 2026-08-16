"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Ban } from "lucide-react";
import {
  setRepairStatus, updateRepairOrder, addLabourLine, removeLabourLine, addPartLine, removePartLine, cancelRepairOrder,
} from "@/lib/actions/repairs";
import { createInvoiceFromRepair } from "@/lib/actions/invoices";
import { formatDate, formatMoney, REPAIR_STATUS_LABELS } from "@/lib/format";
import { Modal, SubmitButton, useToast } from "@/components/ui";

interface Labour { id: string; description: string; hours: number; hourly_rate: number; total: number }
interface Part {
  id: string; part_number: string | null; description: string; quantity: number;
  cost_price: number; selling_price: number; revenue: number; cost: number;
}
interface InventoryOpt { id: string; part_number: string; description: string; cost_price: number; selling_price: number; quantity: number }

export function RepairDetail({
  repair, labour, parts, inventory, role, currency, taxRate, labourRate, invoiceId,
}: {
  repair: {
    id: string; ro_number: number; status: string;
    customer_concern: string | null; diagnosis: string | null; repairs_performed: string | null; mechanic_notes: string | null;
    cancellation_reason?: string | null; cancelled_at?: string | null;
  };
  labour: Labour[];
  parts: Part[];
  inventory: InventoryOpt[];
  role: string;
  currency: string;
  taxRate: number;
  labourRate: number;
  invoiceId?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [labourOpen, setLabourOpen] = useState(false);
  const [partOpen, setPartOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string>();
  const [error, setError] = useState<string>();
  const isCancelled = repair.status === "cancelled";
  const canEdit = role !== "accountant" && repair.status !== "invoiced" && !isCancelled;
  const isOwner = role === "owner";
  const canCancel = role !== "accountant" && repair.status !== "invoiced" && !isCancelled;

  async function confirmCancel() {
    const res = await cancelRepairOrder(repair.id, cancelReason);
    if (!res.ok) { setCancelError(res.error); return; }
    setCancelError(undefined);
    setCancelOpen(false);
    toast("Repair order cancelled");
  }

  const totals = useMemo(() => {
    const labourRev = labour.reduce((s, l) => s + Number(l.total), 0);
    const partsRev = parts.reduce((s, p) => s + Number(p.revenue), 0);
    const cost = parts.reduce((s, p) => s + Number(p.cost), 0);
    const subtotal = labourRev + partsRev;
    const tax = subtotal * (taxRate / 100);
    return { labourRev, partsRev, subtotal, cost, profit: subtotal - cost, tax, grand: subtotal + tax };
  }, [labour, parts, taxRate]);

  const fmt = (n: number) => formatMoney(n, currency);

  async function changeStatus(s: string) {
    const res = await setRepairStatus(repair.id, s);
    if (!res.ok) toast(res.error ?? "Failed", true);
  }

  async function makeInvoice() {
    const res = await createInvoiceFromRepair(repair.id);
    if (!res.ok) {
      toast(res.error ?? "Could not create invoice", true);
      return;
    }
    toast("Invoice created");
    router.push(`/invoices/${res.id}`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {isCancelled && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-bold">Cancelled</span>
            {repair.cancelled_at ? ` on ${formatDate(repair.cancelled_at)}` : ""}
            {repair.cancellation_reason ? ` — ${repair.cancellation_reason}` : ""}
          </div>
        )}
        {/* Status */}
        <div className="card p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="sec-label">Status</div>
            {canCancel && (
              <button
                onClick={() => { setCancelReason(""); setCancelError(undefined); setCancelOpen(true); }}
                className="flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700"
              >
                <Ban size={14} /> Cancel Repair Order
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(REPAIR_STATUS_LABELS)
              .filter(([key]) => key !== "cancelled" || repair.status === "cancelled")
              .map(([key, lbl]) => (
              <button
                key={key}
                disabled={!canEdit && key !== repair.status}
                onClick={() => canEdit && changeStatus(key)}
                className={`rounded-full border-[1.5px] px-3.5 py-2 text-[12.5px] font-semibold transition ${
                  repair.status === key
                    ? "border-blue-600 bg-blue-600 text-white shadow-[0_3px_10px_rgba(37,99,235,.3)]"
                    : "border-[#D6DEE6] bg-white text-muted hover:border-navy-700 disabled:opacity-40"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <form
          action={async (fd) => {
            const res = await updateRepairOrder(repair.id, fd);
            toast(res.ok ? "Saved" : res.error ?? "Failed", !res.ok);
          }}
          className="card space-y-4 p-4"
        >
          <div className="sec-label">Details</div>
          {(
            [
              ["customer_concern", "Customer Concern"],
              ["diagnosis", "Diagnosis"],
              ["repairs_performed", "Repairs Performed"],
              ["mechanic_notes", "Mechanic Notes"],
            ] as const
          ).map(([name, label]) => (
            <div key={name}>
              <label className="label">{label}</label>
              <textarea
                name={name}
                rows={2}
                defaultValue={(repair as unknown as Record<string, string | null>)[name] ?? ""}
                className="input"
                disabled={!canEdit}
              />
            </div>
          ))}
          {canEdit && <SubmitButton className="btn-ghost">Save Details</SubmitButton>}
        </form>

        {/* Labour */}
        <div className="card p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="sec-label">Labour — {fmt(totals.labourRev)}</div>
            {canEdit && (
              <button onClick={() => setLabourOpen(true)} className="text-sm font-bold text-brand">＋ Add labour</button>
            )}
          </div>
          {!labour.length ? (
            <p className="text-sm text-muted">No labour lines.</p>
          ) : (
            labour.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 border-b border-dashed border-[#E4EAF0] py-2 text-sm last:border-0">
                <div>
                  <div className="font-medium">{l.description}</div>
                  <div className="text-xs text-muted">
                    {l.hours} hrs × {fmt(l.hourly_rate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">{fmt(l.total)}</span>
                  {canEdit && (
                    <button onClick={() => removeLabourLine(l.id, repair.id)} className="p-1 text-muted hover:text-red-600" aria-label="Remove">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Parts */}
        <div className="card p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="sec-label">Parts — {fmt(totals.partsRev)}</div>
            {canEdit && (
              <button onClick={() => setPartOpen(true)} className="text-sm font-bold text-brand">＋ Add part</button>
            )}
          </div>
          {!parts.length ? (
            <p className="text-sm text-muted">No parts.</p>
          ) : (
            parts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-b border-dashed border-[#E4EAF0] py-2 text-sm last:border-0">
                <div>
                  <div className="font-medium">{p.description}</div>
                  <div className="text-xs text-muted">
                    {p.part_number ? `${p.part_number} · ` : ""}
                    {p.quantity} × {fmt(p.selling_price)}
                    {isOwner ? ` · profit ${fmt(p.revenue - p.cost)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">{fmt(p.revenue)}</span>
                  {canEdit && (
                    <button onClick={() => removePartLine(p.id, repair.id)} className="p-1 text-muted hover:text-red-600" aria-label="Remove">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Totals panel */}
      <div className="space-y-4">
        <div className="rounded-card bg-navy-800 p-5 text-white shadow-card">
          <Row label="Labour Revenue" value={fmt(totals.labourRev)} />
          <Row label="Parts Revenue" value={fmt(totals.partsRev)} />
          <Row label="Total Revenue" value={fmt(totals.subtotal)} />
          {isOwner && <Row label="Total Cost" value={fmt(totals.cost)} />}
          {isOwner && <Row label="Gross Profit" value={fmt(totals.profit)} accent="text-green-300" />}
          <Row label={`Tax ${taxRate}%`} value={fmt(totals.tax)} />
          <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2.5 text-lg font-extrabold">
            <span>Grand Total</span>
            <span className="tabular-nums">{fmt(totals.grand)}</span>
          </div>
        </div>

        {repair.status === "invoiced" && invoiceId ? (
          <a href={`/invoices/${invoiceId}`} className="btn-ghost w-full">View Invoice →</a>
        ) : (
          role !== "accountant" && (
            <button
              onClick={makeInvoice}
              disabled={totals.subtotal === 0}
              className="btn-primary w-full"
              title={totals.subtotal === 0 ? "Add labour or parts first" : ""}
            >
              ✓ Create Invoice
            </button>
          )
        )}
      </div>

      {/* Add labour modal */}
      <Modal open={labourOpen} onClose={() => setLabourOpen(false)} title="Add Labour">
        <LabourForm
          rate={labourRate}
          currency={currency}
          error={error}
          onSubmit={async (fd) => {
            const res = await addLabourLine(repair.id, fd);
            if (!res.ok) { setError(res.error); return; }
            setError(undefined);
            setLabourOpen(false);
            toast("Labour added");
          }}
        />
      </Modal>

      {/* Add part modal */}
      <Modal open={partOpen} onClose={() => setPartOpen(false)} title="Add Part">
        <PartForm
          inventory={inventory}
          currency={currency}
          error={error}
          onSubmit={async (fd) => {
            const res = await addPartLine(repair.id, fd);
            if (!res.ok) { setError(res.error); return; }
            setError(undefined);
            setPartOpen(false);
            toast("Part added");
          }}
        />
      </Modal>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Repair Order">
        <div className="space-y-4">
          {cancelError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{cancelError}</p>}
          <p className="text-sm text-muted">
            This marks <strong>RO #{repair.ro_number}</strong> as cancelled. This cannot be undone from here.
          </p>
          <div>
            <label className="label">Reason / Comment *</label>
            <textarea
              rows={3}
              required
              className="input"
              placeholder="Why is this repair order being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCancelOpen(false)} className="btn-ghost">Back</button>
            <button type="button" onClick={confirmCancel} className="btn-primary bg-red-600 hover:bg-red-700">
              Confirm Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`flex items-center justify-between py-1 text-[13.5px] ${accent ?? "text-silver"}`}>
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function LabourForm({
  rate, currency, error, onSubmit,
}: { rate: number; currency: string; error?: string; onSubmit: (fd: FormData) => Promise<void> }) {
  const [hours, setHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState(String(rate));
  const live = (Number(hours) || 0) * (Number(hourlyRate) || 0);
  return (
    <form action={onSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div>
        <label className="label">Description *</label>
        <input name="description" required className="input" placeholder="Front brake pad replacement" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Hours *</label>
          <input name="hours" type="number" step="0.25" min="0" required inputMode="decimal" className="input" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div>
          <label className="label">Hourly Rate *</label>
          <input name="hourly_rate" type="number" step="0.01" min="0" required inputMode="decimal" className="input" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg bg-surface px-3 py-2 text-sm font-bold">
        Line total: <span className="tabular-nums">{formatMoney(live, currency)}</span>
      </div>
      <SubmitButton>Add Labour</SubmitButton>
    </form>
  );
}

function PartForm({
  inventory, currency, error, onSubmit,
}: { inventory: InventoryOpt[]; currency: string; error?: string; onSubmit: (fd: FormData) => Promise<void> }) {
  const [invId, setInvId] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("0");
  const [price, setPrice] = useState("0");

  function pickInventory(id: string) {
    setInvId(id);
    const item = inventory.find((i) => i.id === id);
    if (item) {
      setPartNumber(item.part_number);
      setDescription(item.description);
      setCost(String(item.cost_price));
      setPrice(String(item.selling_price));
    }
  }

  const revenue = (Number(qty) || 0) * (Number(price) || 0);
  const profit = revenue - (Number(qty) || 0) * (Number(cost) || 0);

  return (
    <form action={onSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div>
        <label className="label">From Inventory (optional)</label>
        <select className="input" value={invId} onChange={(e) => pickInventory(e.target.value)}>
          <option value="">— free-type part —</option>
          {inventory.map((i) => (
            <option key={i.id} value={i.id}>
              {i.part_number} · {i.description} ({i.quantity} in stock)
            </option>
          ))}
        </select>
        <input type="hidden" name="inventory_id" value={invId} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Part Number</label>
          <input name="part_number" className="input" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
        </div>
        <div>
          <label className="label">Quantity *</label>
          <input name="quantity" type="number" step="1" min="1" required inputMode="numeric" className="input" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Description *</label>
        <input name="description" required className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Cost Price</label>
          <input name="cost_price" type="number" step="0.01" min="0" inputMode="decimal" className="input" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div>
          <label className="label">Selling Price *</label>
          <input name="selling_price" type="number" step="0.01" min="0" required inputMode="decimal" className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg bg-surface px-3 py-2 text-sm font-bold">
        Revenue: <span className="tabular-nums">{formatMoney(revenue, currency)}</span>
        <span className="ml-3 text-green-700">Profit: <span className="tabular-nums">{formatMoney(profit, currency)}</span></span>
      </div>
      <SubmitButton>Add Part</SubmitButton>
    </form>
  );
}
