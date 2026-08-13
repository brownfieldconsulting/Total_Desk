"use client";

import { useState } from "react";
import { PackagePlus, SlidersHorizontal, Plus, History } from "lucide-react";
import { addInventoryItem, updateInventoryItem, receiveStock, adjustStock } from "@/lib/actions/inventory";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge, Modal, SubmitButton, useToast } from "@/components/ui";

export interface Item {
  id: string; part_number: string; description: string; quantity: number;
  cost_price: number; selling_price: number; reorder_level: number;
}
export interface Txn {
  id: string; inventory_id: string; txn_type: string; quantity_change: number;
  quantity_after: number; reference: string | null; created_at: string;
}

export function InventoryClient({ items, txns, role, currency }: { items: Item[]; txns: Txn[]; role: string; currency: string }) {
  const toast = useToast();
  const [modal, setModal] = useState<{ type: "add" | "edit" | "receive" | "adjust" | "history"; item?: Item } | null>(null);
  const [error, setError] = useState<string>();
  const fmt = (n: number | string) => formatMoney(Number(n), currency);
  const canEdit = role !== "accountant";
  const low = items.filter((i) => Number(i.quantity) <= Number(i.reorder_level));

  function close() {
    setModal(null);
    setError(undefined);
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    const res = await fn();
    if (!res.ok) { setError(res.error); return; }
    close();
    toast(success);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Inventory</h1>
        {canEdit && (
          <button onClick={() => setModal({ type: "add" })} className="btn-primary">
            <Plus size={16} /> Add Item
          </button>
        )}
      </div>

      {low.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-[10px] border border-[#F8CBA4] border-l-4 border-l-brand bg-[#FEF3E8] px-4 py-2.5 text-[13.5px]">
          ⚠️ <span><b className="text-[#B44705]">Low stock:</b>{" "}
          {low.map((i) => `${i.description} (${Number(i.quantity)} left, reorder at ${Number(i.reorder_level)})`).join(" · ")}</span>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr>
              <th className="th">Part #</th>
              <th className="th">Description</th>
              <th className="th text-right">Qty</th>
              <th className="th text-right">Cost</th>
              <th className="th text-right">Price</th>
              <th className="th text-right">Margin</th>
              {canEdit && <th className="th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const isLow = Number(i.quantity) <= Number(i.reorder_level);
              const margin = Number(i.selling_price) > 0
                ? Math.round(((Number(i.selling_price) - Number(i.cost_price)) / Number(i.selling_price)) * 100)
                : 0;
              return (
                <tr key={i.id} className="hover:bg-surface/60">
                  <td className="td font-mono text-[12.5px] font-semibold">{i.part_number}</td>
                  <td className="td">{i.description}</td>
                  <td className="td text-right">
                    <span className="font-bold tabular-nums">{Number(i.quantity)}</span>{" "}
                    {isLow && <Badge tone="low">LOW</Badge>}
                  </td>
                  <td className="td text-right tabular-nums">{fmt(i.cost_price)}</td>
                  <td className="td text-right tabular-nums">{fmt(i.selling_price)}</td>
                  <td className="td text-right tabular-nums">{margin}%</td>
                  {canEdit && (
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <IconBtn title="Receive stock" onClick={() => setModal({ type: "receive", item: i })}><PackagePlus size={15} /></IconBtn>
                        <IconBtn title="Adjust" onClick={() => setModal({ type: "adjust", item: i })}><SlidersHorizontal size={15} /></IconBtn>
                        <IconBtn title="History" onClick={() => setModal({ type: "history", item: i })}><History size={15} /></IconBtn>
                        {role === "owner" && (
                          <button onClick={() => setModal({ type: "edit", item: i })} className="rounded-md px-2 py-1 text-xs font-bold text-navy-700 hover:bg-surface">
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {!items.length && (
              <tr><td colSpan={7} className="td py-10 text-center text-muted">No inventory yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit */}
      <Modal open={modal?.type === "add" || modal?.type === "edit"} onClose={close} title={modal?.type === "edit" ? "Edit Item" : "Add Inventory Item"}>
        <form
          action={(fd) =>
            run(
              () => (modal?.type === "edit" && modal.item ? updateInventoryItem(modal.item.id, fd) : addInventoryItem(fd)),
              modal?.type === "edit" ? "Item updated" : "Item added"
            )
          }
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Part Number *</label>
              <input name="part_number" required defaultValue={modal?.item?.part_number} className="input" />
            </div>
            {modal?.type === "add" && (
              <div>
                <label className="label">Initial Qty</label>
                <input name="quantity" type="number" step="1" min="0" defaultValue={0} className="input" />
              </div>
            )}
          </div>
          <div>
            <label className="label">Description *</label>
            <input name="description" required defaultValue={modal?.item?.description} className="input" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Cost Price</label>
              <input name="cost_price" type="number" step="0.01" min="0" defaultValue={modal?.item?.cost_price ?? 0} className="input" />
            </div>
            <div>
              <label className="label">Selling Price</label>
              <input name="selling_price" type="number" step="0.01" min="0" defaultValue={modal?.item?.selling_price ?? 0} className="input" />
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input name="reorder_level" type="number" step="1" min="0" defaultValue={modal?.item?.reorder_level ?? 0} className="input" />
            </div>
          </div>
          <SubmitButton>{modal?.type === "edit" ? "Save" : "Add Item"}</SubmitButton>
        </form>
      </Modal>

      {/* Receive */}
      <Modal open={modal?.type === "receive"} onClose={close} title={`Receive — ${modal?.item?.description ?? ""}`}>
        <form action={(fd) => run(() => receiveStock(modal!.item!.id, fd), "Stock received")} className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <div>
            <label className="label">Quantity received *</label>
            <input name="quantity" type="number" step="1" min="1" required inputMode="numeric" className="input" autoFocus />
          </div>
          <div>
            <label className="label">Reference (PO #, supplier)</label>
            <input name="reference" className="input" />
          </div>
          <SubmitButton>Receive Stock</SubmitButton>
        </form>
      </Modal>

      {/* Adjust */}
      <Modal open={modal?.type === "adjust"} onClose={close} title={`Adjust — ${modal?.item?.description ?? ""}`}>
        <form action={(fd) => run(() => adjustStock(modal!.item!.id, fd), "Stock adjusted")} className="space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <p className="text-sm text-muted">Current: <b>{Number(modal?.item?.quantity ?? 0)}</b>. Use negative numbers to remove stock (e.g. -2).</p>
          <div>
            <label className="label">Adjustment *</label>
            <input name="quantity" type="number" step="1" required inputMode="numeric" className="input" autoFocus />
          </div>
          <div>
            <label className="label">Reason *</label>
            <input name="reference" required className="input" placeholder="Stocktake correction, damaged, etc." />
          </div>
          <SubmitButton>Apply Adjustment</SubmitButton>
        </form>
      </Modal>

      {/* History */}
      <Modal open={modal?.type === "history"} onClose={close} title={`History — ${modal?.item?.description ?? ""}`}>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {txns.filter((t) => t.inventory_id === modal?.item?.id).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
              <div>
                <span className="font-semibold capitalize">{t.txn_type.replace("_", " ")}</span>
                <span className="text-muted"> · {t.reference ?? "—"}</span>
                <div className="text-xs text-muted">{formatDate(t.created_at)}</div>
              </div>
              <div className="text-right tabular-nums">
                <span className={`font-bold ${Number(t.quantity_change) < 0 ? "text-red-600" : "text-green-700"}`}>
                  {Number(t.quantity_change) > 0 ? "+" : ""}{Number(t.quantity_change)}
                </span>
                <div className="text-xs text-muted">→ {Number(t.quantity_after)}</div>
              </div>
            </div>
          ))}
          {!txns.filter((t) => t.inventory_id === modal?.item?.id).length && (
            <p className="py-6 text-center text-sm text-muted">No movements recorded.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className="rounded-md p-1.5 text-muted transition hover:bg-surface hover:text-navy-700">
      {children}
    </button>
  );
}
