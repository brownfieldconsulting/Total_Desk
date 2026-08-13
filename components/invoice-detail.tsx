"use client";

import { useState } from "react";
import { Printer, Download, Mail, DollarSign, Send, Trash2 } from "lucide-react";
import { recordPayment, deletePayment, setInvoiceStatus } from "@/lib/actions/invoices";
import { formatDate, formatMoney, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/format";
import { Badge, Modal, SubmitButton, useToast } from "@/components/ui";

interface Item { id: string; item_type: string; description: string; quantity: number; unit_price: number; line_total: number }
interface Payment { id: string; payment_date: string; amount: number; method: string; notes: string | null }

export function InvoiceDetail({
  invoice, items, payments, customer, vehicle, settings, role,
}: {
  invoice: {
    id: string; invoice_number: string; status: string; invoice_date: string; due_date: string | null;
    subtotal: number; tax_rate: number; tax_amount: number; grand_total: number; amount_paid: number; balance_due: number;
  };
  items: Item[];
  payments: Payment[];
  customer: { first_name: string; last_name: string; phone: string | null; email: string | null };
  vehicle: { year: number | null; make: string; model: string; license_plate: string | null } | null;
  settings: { currency: string; company_name: string; company_address: string; company_phone: string; company_email: string };
  role: string;
}) {
  const toast = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [error, setError] = useState<string>();
  const fmt = (n: number | string) => formatMoney(Number(n), settings.currency);
  const canEdit = role !== "accountant";
  const labourItems = items.filter((i) => i.item_type === "labour");
  const partItems = items.filter((i) => i.item_type !== "labour");

  async function sendEmail() {
    if (!customer.email) {
      toast("Customer has no email address", true);
      return;
    }
    setEmailing(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invoice", invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      toast(`Invoice emailed to ${customer.email}`);
      if (invoice.status === "draft") await setInvoiceStatus(invoice.id, "sent");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Send failed", true);
    } finally {
      setEmailing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Paper */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-navy-700 to-navy-900 px-6 py-6 text-white">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/logo-transparent.png" alt="" className="w-[92px]" />
            <div className="text-xs leading-relaxed text-silver">
              {settings.company_address}<br />
              {settings.company_phone}<br />
              {settings.company_email}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold">{invoice.invoice_number}</div>
            <div className="text-[13px] text-silver">
              {formatDate(invoice.invoice_date)}
              {invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ""}
            </div>
            <div className="mt-2">
              <Badge tone={invoice.status}>{INVOICE_STATUS_LABELS[invoice.status].toUpperCase()}</Badge>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-wrap gap-8">
            <div>
              <div className="label">Billed To</div>
              <div className="font-bold">{customer.first_name} {customer.last_name}</div>
              <div className="text-sm text-muted">{customer.phone ?? ""}</div>
              <div className="text-sm text-muted">{customer.email ?? ""}</div>
            </div>
            {vehicle && (
              <div>
                <div className="label">Vehicle</div>
                <div className="font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                <div className="text-sm text-muted">{vehicle.license_plate ? `Plate ${vehicle.license_plate}` : ""}</div>
              </div>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Description</th>
                <th className="th text-right">Qty</th>
                <th className="th text-right">Price</th>
                <th className="th text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {labourItems.length > 0 && (
                <tr><td colSpan={4} className="px-3 pb-1 pt-4 text-[11px] font-extrabold uppercase tracking-widest text-brand">Labour</td></tr>
              )}
              {labourItems.map((i) => (
                <tr key={i.id}>
                  <td className="td">{i.description}</td>
                  <td className="td text-right tabular-nums">{Number(i.quantity)}</td>
                  <td className="td text-right tabular-nums">{fmt(i.unit_price)}</td>
                  <td className="td text-right font-semibold tabular-nums">{fmt(i.line_total)}</td>
                </tr>
              ))}
              {partItems.length > 0 && (
                <tr><td colSpan={4} className="px-3 pb-1 pt-4 text-[11px] font-extrabold uppercase tracking-widest text-brand">Parts</td></tr>
              )}
              {partItems.map((i) => (
                <tr key={i.id}>
                  <td className="td">{i.description}</td>
                  <td className="td text-right tabular-nums">{Number(i.quantity)}</td>
                  <td className="td text-right tabular-nums">{fmt(i.unit_price)}</td>
                  <td className="td text-right font-semibold tabular-nums">{fmt(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-5 w-full max-w-[300px] space-y-1 text-sm">
            <div className="flex justify-between px-2 text-muted"><span>Subtotal</span><span className="tabular-nums">{fmt(invoice.subtotal)}</span></div>
            <div className="flex justify-between px-2 text-muted"><span>Tax ({Number(invoice.tax_rate)}%)</span><span className="tabular-nums">{fmt(invoice.tax_amount)}</span></div>
            <div className="flex justify-between rounded-lg bg-navy-800 px-3 py-2.5 font-extrabold text-white"><span>Total Due</span><span className="tabular-nums">{fmt(invoice.grand_total)}</span></div>
            {Number(invoice.amount_paid) > 0 && (
              <>
                <div className="flex justify-between px-2 text-muted"><span>Paid</span><span className="tabular-nums">−{fmt(invoice.amount_paid)}</span></div>
                <div className="flex justify-between px-2 font-bold text-orange-700"><span>Balance</span><span className="tabular-nums">{fmt(invoice.balance_due)}</span></div>
              </>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF1F5] pt-4 text-xs text-muted">
            <span>Thank you for your business · {settings.company_name} · {settings.company_address} · {settings.company_phone}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2.5">
        {canEdit && Number(invoice.balance_due) > 0 && (
          <button onClick={() => setPayOpen(true)} className="btn-primary">
            <DollarSign size={16} /> Record Payment
          </button>
        )}
        <a href={`/api/pdf/invoice/${invoice.id}`} target="_blank" className="btn-ghost">
          <Printer size={15} /> Print
        </a>
        <a href={`/api/pdf/invoice/${invoice.id}?download=1`} className="btn-ghost">
          <Download size={15} /> Download PDF
        </a>
        {canEdit && (
          <button onClick={sendEmail} disabled={emailing} className="btn-ghost">
            <Mail size={15} /> {emailing ? "Sending…" : "Email PDF"}
          </button>
        )}
        {canEdit && invoice.status === "draft" && (
          <button
            onClick={async () => {
              const res = await setInvoiceStatus(invoice.id, "sent");
              toast(res.ok ? "Marked as sent" : res.error ?? "Failed", !res.ok);
            }}
            className="btn-ghost"
          >
            <Send size={15} /> Mark Sent
          </button>
        )}
      </div>

      {/* Payments */}
      <section className="space-y-2.5">
        <h2 className="sec-label">Payments</h2>
        {!payments.length ? (
          <p className="text-sm text-muted">No payments recorded.</p>
        ) : (
          <div className="card divide-y divide-[#EDF1F5]">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">
                    {fmt(p.amount)} · {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                  </div>
                  <div className="text-xs text-muted">{formatDate(p.payment_date)}{p.notes ? ` · ${p.notes}` : ""}</div>
                </div>
                {role === "owner" && (
                  <button
                    onClick={() => deletePayment(p.id, invoice.id)}
                    className="p-1.5 text-muted hover:text-red-600"
                    aria-label="Delete payment"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment">
        <form
          action={async (fd) => {
            const res = await recordPayment(invoice.id, fd);
            if (!res.ok) { setError(res.error); return; }
            setError(undefined);
            setPayOpen(false);
            toast("Payment recorded");
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input name="payment_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            </div>
            <div>
              <label className="label">Amount *</label>
              <input
                name="amount" type="number" step="0.01" min="0.01" required inputMode="decimal"
                defaultValue={Number(invoice.balance_due).toFixed(2)} className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Method *</label>
            <select name="method" required className="input" defaultValue="cash">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input name="notes" className="input" placeholder="Optional" />
          </div>
          <SubmitButton>Record Payment</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
