"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const preset = params.get("preset") ?? "month";

  function setPreset(p: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("preset", p);
    sp.delete("from");
    sp.delete("to");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function setCustom(key: "from" | "to", value: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("preset", "custom");
    sp.set(key, value);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        ["month", "This Month"],
        ["quarter", "This Quarter"],
        ["year", "This Year"],
        ["custom", "Custom"],
      ].map(([key, label]) => (
        <button
          key={key}
          onClick={() => setPreset(key)}
          className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
            preset === key ? "border-navy-700 bg-navy-700 text-white" : "border-[#D6DEE6] bg-white text-muted hover:border-navy-700"
          }`}
        >
          {label}
        </button>
      ))}
      {preset === "custom" && (
        <span className="flex items-center gap-2">
          <input type="date" className="input !w-auto !py-1.5" defaultValue={params.get("from") ?? ""} onChange={(e) => setCustom("from", e.target.value)} />
          <span className="text-muted">→</span>
          <input type="date" className="input !w-auto !py-1.5" defaultValue={params.get("to") ?? ""} onChange={(e) => setCustom("to", e.target.value)} />
        </span>
      )}
    </div>
  );
}
