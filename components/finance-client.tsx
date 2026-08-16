"use client";

import { useState } from "react";
import { Plus, Trash2, Paperclip } from "lucide-react";
import { addIncome, deleteIncome, addExpense, deleteExpense, getReceiptUrl, addCategory } from "@/lib/actions/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { Modal, SubmitButton, useToast } from "@/components/ui";

interface Category { id: string; name: string }
interface Entry {
  id: string;
  date: string;
  category: string;
  vendor?: string | null;
  description: string | null;
  amount: number;
  hasReceipt?: boolean;
}

export function FinanceClient({
  kind, entries, categories, currency, role, total,
}: {
  kind: "income" | "expense";
  entries: Entry[];
  categories: Category[];
  currency: string;
  role: string;
  total: number;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [cats, setCats] = useState<Category[]>(categories);
  const [categoryId, setCategoryId] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [catError, setCatError] = useState<string>();
  const fmt = (n: number | string) => formatMoney(Number(n), currency);
  const isOwner = role === "owner";
  const title = kind === "income" ? "Income" : "Expenses";

  async function saveNewCategory() {
    const name = newCategoryName.trim();
    if (!name) { setCatError("Enter a category name"); return; }
    const res = await addCategory(kind, name);
    if (!res.ok || !res.id) { setCatError(res.error ?? "Could not add category"); return; }
    setCats((prev) => (prev.some((c) => c.id === res.id) ? prev : [...prev, { id: res.id!, name }]));
    setCategoryId(res.id);
    setNewCategoryName("");
    setAddingCategory(false);
    setCatError(undefined);
  }

  async function openReceipt(id: string) {
    const res = await getReceiptUrl(id);
    if (res.ok && res.url) window.open(res.url, "_blank");
    else toast(res.error ?? "No receipt", true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-muted">This month: <b className="tabular-nums">{fmt(total)}</b></p>
        </div>
        {isOwner && (
          <button
            onClick={() => {
              setCategoryId("");
              setAddingCategory(false);
              setNewCategoryName("");
              setCatError(undefined);
              setOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Add {kind === "income" ? "Income" : "Expense"}
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="th">Date</th>
              <th className="th">Category</th>
              {kind === "expense" && <th className="th">Vendor</th>}
              <th className="th">Description</th>
              <th className="th text-right">Amount</th>
              <th className="th text-right"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-surface/60">
                <td className="td whitespace-nowrap">{formatDate(e.date)}</td>
                <td className="td"><span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-navy-700">{e.category}</span></td>
                {kind === "expense" && <td className="td text-muted">{e.vendor ?? "—"}</td>}
                <td className="td text-muted">{e.description ?? "—"}</td>
                <td className="td text-right font-bold tabular-nums">{fmt(e.amount)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {kind === "expense" && e.hasReceipt && (
                      <button onClick={() => openReceipt(e.id)} title="View receipt" className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-navy-700">
                        <Paperclip size={14} />
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this entry?")) return;
                          await (kind === "income" ? deleteIncome(e.id) : deleteExpense(e.id));
                          toast("Deleted");
                        }}
                        className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!entries.length && (
              <tr><td colSpan={6} className="td py-10 text-center text-muted">No {kind} entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Add ${kind === "income" ? "Income" : "Expense"}`}>
        <form
          action={async (fd) => {
            const res = kind === "income" ? await addIncome(fd) : await addExpense(fd);
            if (!res.ok) { setError(res.error); return; }
            setError(undefined);
            setOpen(false);
            toast("Saved");
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input name={kind === "income" ? "income_date" : "expense_date"} type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            </div>
            <div>
              <label className="label">Amount *</label>
              <input name="amount" type="number" step="0.01" min="0" required inputMode="decimal" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Category *</label>
            {!addingCategory ? (
              <div className="flex gap-2">
                <select
                  name="category_id"
                  required
                  className="input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="" disabled>Select…</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setAddingCategory(true); setCatError(undefined); }}
                  className="btn-ghost whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {catError && <p className="text-xs font-semibold text-red-700">{catError}</p>}
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="input"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); saveNewCategory(); }
                    }}
                  />
                  <button type="button" onClick={saveNewCategory} className="btn-primary whitespace-nowrap">Add</button>
                  <button type="button" onClick={() => { setAddingCategory(false); setCatError(undefined); }} className="btn-ghost">Cancel</button>
                </div>
              </div>
            )}
            {/* Hidden input keeps category_id in the form when the picker above is a plain <select> with no name during "adding" mode */}
            {addingCategory && <input type="hidden" name="category_id" value={categoryId} />}
          </div>
          {kind === "expense" && (
            <div>
              <label className="label">Vendor</label>
              <input name="vendor" className="input" />
            </div>
          )}
          <div>
            <label className="label">Description</label>
            <input name="description" className="input" />
          </div>
          {kind === "expense" && (
            <div>
              <label className="label">Receipt (photo or PDF)</label>
              <input name="receipt" type="file" accept="image/*,application/pdf" capture="environment" className="input" />
            </div>
          )}
          <SubmitButton>Save</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
