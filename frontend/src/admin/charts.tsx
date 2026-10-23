/**
 * Small, dependency-free SVG charts for the dashboard.
 * Specs follow the dataviz method: thin marks, 4px rounded data-ends, 2px surface gaps,
 * recessive hairline grid, hover tooltips, legends for ≥2 series, and a table view.
 */
import { useId, useState } from "react";

const SURFACE = "var(--color-ink-900)";
const GRID = "#2a2722";
const AXIS_TEXT = "#b3ab9f";

/** Path for a bar with a 4px rounded top and a square baseline. */
function roundedTopBar(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Path for a horizontal bar with a 4px rounded right end. */
function roundedRightBar(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export function TableToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={shown} className="rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-ink-800 hover:text-bone">
      {shown ? "Show chart" : "Show table"}
    </button>
  );
}

/** Single-series column chart (e.g. leads per day). No legend: the title names the series. */
export function ColumnChart({ data, label, color = "var(--color-gold)" }: { data: { key: string; label: string; value: number }[]; label: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const m = { top: 12, right: 8, bottom: 26, left: 30 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const band = iw / data.length;
  const bw = Math.min(24, band - 2); // cap thickness; leftover band is air
  const ticks = [0, max / 2, max];
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => {
          const y = m.top + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={m.left} x2={W - m.right} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={m.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular-nums">
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bh = (d.value / max) * ih;
          const x = m.left + i * band + (band - bw) / 2;
          const y = m.top + ih - bh;
          return (
            <g key={d.key}>
              {bh > 0 && <path d={roundedTopBar(x, y, bw, bh)} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />}
              {/* Hit target: the whole band, taller than the mark. */}
              <rect x={m.left + i * band} y={m.top} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.label}: ${d.value}`} />
            </g>
          );
        })}
        {data.map((d, i) =>
          i % 7 === 0 || i === data.length - 1 ? (
            <text key={d.key} x={m.left + i * band + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-line bg-ink-800 px-3 py-2 text-xs shadow-xl"
          style={{ left: `${((m.left + hover * band + band / 2) / W) * 100}%` }}
        >
          <p className="text-stone-400">{h.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-bone">{h.value} {h.value === 1 ? "lead" : "leads"}</p>
        </div>
      )}
    </div>
  );
}

export interface StackSeries {
  key: string;
  label: string;
  color: string;
}

/** Horizontal stacked bars (e.g. units by status per building) with legend and tooltips. */
export function StackedBars({ rows, series, label }: { rows: { label: string; values: Record<string, number> }[]; series: StackSeries[]; label: string }) {
  const id = useId();
  const [hover, setHover] = useState<{ row: number; key: string } | null>(null);
  const W = 640;
  const rowH = 22;
  const gapY = 30;
  const labelW = 150;
  const H = rows.length * (rowH + gapY);
  const max = Math.max(1, ...rows.map((r) => series.reduce((s, x) => s + (r.values[x.key] ?? 0), 0)));
  const iw = W - labelW - 40;

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-4 text-xs text-stone-300" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setHover(null)}>
          <title id={`${id}-t`}>{label}</title>
          {rows.map((r, ri) => {
            const y = ri * (rowH + gapY) + 6;
            let x = labelW;
            const total = series.reduce((s, x2) => s + (r.values[x2.key] ?? 0), 0);
            const visible = series.filter((s) => (r.values[s.key] ?? 0) > 0);
            return (
              <g key={r.label}>
                <text x={0} y={y + rowH / 2 + 4} fontSize={12} fill="#cfc7ba">{r.label}</text>
                {visible.map((s, si) => {
                  const v = r.values[s.key] ?? 0;
                  const w = (v / max) * iw;
                  const last = si === visible.length - 1;
                  const segW = Math.max(0, w - (last ? 0 : 2)); // 2px surface gap between segments
                  const d = last ? roundedRightBar(x, y, segW, rowH) : `M${x},${y}h${segW}v${rowH}h${-segW}Z`;
                  const seg = (
                    <g key={s.key}>
                      <path d={d} fill={s.color} opacity={!hover || (hover.row === ri && hover.key === s.key) ? 1 : 0.5} />
                      <rect x={x} y={y - 4} width={w} height={rowH + 8} fill="transparent" tabIndex={0}
                        aria-label={`${r.label}, ${s.label}: ${v}`}
                        onMouseEnter={() => setHover({ row: ri, key: s.key })} onFocus={() => setHover({ row: ri, key: s.key })} onBlur={() => setHover(null)} />
                    </g>
                  );
                  x += w;
                  return seg;
                })}
                <text x={x + 8} y={y + rowH / 2 + 4} fontSize={12} fill="#f3eee6" className="tabular-nums">{total}</text>
                <rect x={labelW} y={y + rowH + 6} width={iw} height={1} fill={GRID} />
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute right-0 top-0 rounded-md border border-line bg-ink-800 px-3 py-2 text-xs shadow-xl">
            <p className="text-stone-400">{rows[hover.row].label}</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-bone">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: series.find((s) => s.key === hover.key)?.color }} />
              {series.find((s) => s.key === hover.key)?.label}: {rows[hover.row].values[hover.key] ?? 0}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Single-hue horizontal bars with the value at the tip (e.g. pipeline stages). */
export function HBarList({ items, color = "var(--color-gold)" }: { items: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm" title={`${it.label}: ${it.value}`}>
          <span className="text-stone-300">{it.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-4 rounded-r" style={{ width: `${(it.value / max) * 85}%`, minWidth: it.value ? 4 : 0, background: color }} />
            <span className="tabular-nums text-bone">{it.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export { SURFACE };
