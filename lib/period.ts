import type { Period } from "@/lib/reporting";

export function resolvePeriod(searchParams: { preset?: string; from?: string; to?: string }): Period & { label: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const preset = searchParams.preset ?? "month";

  if (preset === "custom" && searchParams.from && searchParams.to) {
    return { from: searchParams.from, to: searchParams.to, label: `${searchParams.from} → ${searchParams.to}` };
  }
  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    const to = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { from: iso(from), to: iso(to), label: `Q${q + 1} ${now.getFullYear()}` };
  }
  if (preset === "year") {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31`, label: String(now.getFullYear()) };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: iso(from), to: iso(to),
    label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}
