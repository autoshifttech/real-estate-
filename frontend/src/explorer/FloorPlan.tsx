import type { Plan } from "../lib/types";

const FILL: Record<string, string> = {
  terrace: "#2a251e",
  living: "#1f1c18",
  bed: "#1c1a16",
  bath: "#1a1d1f",
  kitchen: "#1f1c17",
  hall: "#1b1915",
  study: "#1c1a16",
};

/** Vector floor plan drawn from the same room data the PDF uses. */
export function FloorPlan({ plan, className = "" }: { plan: Plan; className?: string }) {
  const pad = 0.6;
  const vb = `${-pad} ${-pad} ${plan.width + pad * 2} ${plan.depth + pad * 2 + 1.4}`;
  const roomList = plan.rooms.map((r) => `${r.name} ${r.w.toFixed(1)} by ${r.h.toFixed(1)} metres`).join(", ");
  return (
    <figure className={className}>
      <svg viewBox={vb} role="img" aria-label={`Floor plan, ${plan.label}: ${roomList}`} className="h-auto w-full">
        {plan.rooms.map((r) => {
          const terrace = r.kind === "terrace";
          const small = r.w < 3;
          return (
            <g key={`${r.name}-${r.x}-${r.y}`}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={FILL[r.kind] ?? "#1c1a16"}
                stroke={terrace ? "#8f877b" : "#e2c896"}
                strokeWidth={terrace ? 0.04 : 0.09}
                strokeDasharray={terrace ? "0.25 0.18" : undefined}
              />
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 - (small ? 0 : 0.1)} textAnchor="middle" fontSize={small ? 0.36 : 0.46} fill="#f3eee6" fontFamily="Inter Variable, sans-serif">
                {r.name}
              </text>
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 0.55} textAnchor="middle" fontSize={0.32} fill="#b3ab9f" fontFamily="Inter Variable, sans-serif">
                {r.w.toFixed(1)} × {r.h.toFixed(1)}
              </text>
            </g>
          );
        })}
        <g transform={`translate(0 ${plan.depth + 0.9})`} fill="#b3ab9f" fontSize={0.32} fontFamily="Inter Variable, sans-serif">
          <line x1={0} x2={2} y1={0} y2={0} stroke="#b3ab9f" strokeWidth={0.05} />
          <line x1={0} x2={0} y1={-0.15} y2={0.15} stroke="#b3ab9f" strokeWidth={0.05} />
          <line x1={2} x2={2} y1={-0.15} y2={0.15} stroke="#b3ab9f" strokeWidth={0.05} />
          <text x={2.3} y={0.11}>2 m</text>
          <text x={plan.width} y={0.11} textAnchor="end">N ↑ · indicative</text>
        </g>
      </svg>
    </figure>
  );
}
