"use client";

import { useEffect, useRef, useState, createContext, useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";

/* ---------- Badge ---------- */
const badgeColors: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  waiting_parts: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  invoiced: "bg-navy-700 text-white",
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-700",
  low: "bg-red-100 text-red-700",
};

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeColors[tone] ?? "bg-slate-100 text-slate-700"}`}>
      {children}
    </span>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/60 p-0 sm:p-6" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
type Toast = { id: number; message: string; error?: boolean };
const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  function push(message: string, error = false) {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-20 sm:bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${t.error ? "bg-red-600" : "bg-navy-800"}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ children }: { children: ReactNode }) {
  return <div className="card p-10 text-center text-sm text-muted">{children}</div>;
}

/* ---------- Submit button with pending spinner ---------- */
export function SubmitButton({ children, className = "btn-primary w-full" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Saving…" : children}
    </button>
  );
}
