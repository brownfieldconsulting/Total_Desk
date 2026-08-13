"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Result = { group: string; id: string; title: string; subtitle: string; href: string };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          setResults(await res.json());
          setOpen(true);
        }
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  let lastGroup = "";

  return (
    <div ref={boxRef} className="relative w-full max-w-[430px]">
      <div className="flex items-center gap-2 rounded-[10px] border border-[#DDE5EC] bg-surface px-3.5 py-2 text-[13.5px] text-muted focus-within:border-brand">
        <Search size={15} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search customers, plates, invoices, parts…"
          className="w-full bg-transparent outline-none placeholder:text-muted/70"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[380px] overflow-y-auto rounded-xl border border-[#E3E9EF] bg-white py-1 shadow-2xl">
          {results.map((r) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <div key={`${r.group}-${r.id}`}>
                {header && (
                  <div className="px-3.5 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-widest text-muted">{header}</div>
                )}
                <button
                  className="block w-full px-3.5 py-2 text-left hover:bg-surface"
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    router.push(r.href);
                  }}
                >
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-xs text-muted">{r.subtitle}</div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
