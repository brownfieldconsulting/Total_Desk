export function BarChart({
  title, sub, data, color,
}: {
  title: string;
  sub: string;
  data: { label: string; value: number }[];
  color: "navy" | "silver" | "orange";
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fills = {
    navy: "fill-navy-700",
    silver: "fill-silver",
    orange: "fill-brand",
  } as const;
  return (
    <div className="card p-4">
      <h4 className="text-[13px] font-bold">{title}</h4>
      <div className="mb-3 text-[11.5px] text-muted">{sub}</div>
      <svg viewBox="0 0 240 110" className="w-full" role="img" aria-label={title}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 96, d.value > 0 ? 4 : 1.5);
          const w = 240 / data.length - 4;
          return (
            <g key={d.label}>
              <rect
                x={i * (240 / data.length) + 2}
                y={100 - h}
                width={w}
                height={h}
                rx={2.5}
                className={`${fills[color]} ${i === data.length - 1 ? "opacity-100" : "opacity-75"}`}
              >
                <title>{`${d.label}: ${d.value.toFixed(0)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
