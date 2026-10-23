import { useState } from "react";
import { Link } from "react-router-dom";
import { money, SOURCE_LABEL, STAGE_LABEL, STATUS_LABEL } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import { LEAD_STAGES, UNIT_STATUSES, type Stats } from "../lib/types";
import { ColumnChart, HBarList, StackedBars, TableToggle } from "./charts";
import { Card, ErrorNote, PageHeader } from "./ui";

const STATUS_SERIES = UNIT_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], color: `var(--color-${s})` }));

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function Dashboard() {
  useDocumentTitle("Dashboard · Back panel");
  const [days, setDays] = useState(30);
  const { data: s, error } = useApi<Stats>("/admin/stats", { auth: true, query: { days } });
  const [tables, setTables] = useState({ leads: false, units: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Leads, conversion and live inventory"
        actions={
          <div role="radiogroup" aria-label="Date range" className="flex rounded-md border border-line p-0.5">
            {[7, 30, 90].map((d) => (
              <button key={d} role="radio" aria-checked={days === d} onClick={() => setDays(d)}
                className={`rounded px-3 py-1.5 text-sm ${days === d ? "bg-ink-800 text-bone" : "text-stone-400 hover:text-bone"}`}>
                {d} days
              </button>
            ))}
          </div>
        }
      />
      <ErrorNote error={error} />
      {s && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label={`Leads, last ${days} days`} value={String(s.leads_in_range)} note={`${s.leads_total} all time`} />
            <Tile label="Conversion rate" value={pct(s.conversion_rate)} note="Won ÷ all leads" />
            <Tile label="Win rate" value={pct(s.win_rate)} note="Won ÷ (won + lost)" />
            <Tile label="Sold value" value={money(s.sold_value, "EUR", true)} note={`of ${money(s.inventory_value, "EUR", true)} inventory`} />
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-sm font-semibold">Leads per day</h2>
              <TableToggle shown={tables.leads} onToggle={() => setTables((t) => ({ ...t, leads: !t.leads }))} />
            </div>
            {tables.leads ? (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-stone-400"><th scope="col" className="py-1 font-normal">Date</th><th scope="col" className="py-1 text-right font-normal">Leads</th></tr></thead>
                  <tbody>
                    {s.leads_per_day.map((d) => (
                      <tr key={d.date} className="border-t border-line/60"><td className="py-1">{d.date}</td><td className="py-1 text-right tabular-nums">{d.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ColumnChart
                label={`Leads per day over the last ${days} days`}
                data={s.leads_per_day.map((d) => ({
                  key: d.date,
                  value: d.count,
                  label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                }))}
              />
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-sans text-sm font-semibold">Units by status</h2>
                <TableToggle shown={tables.units} onToggle={() => setTables((t) => ({ ...t, units: !t.units }))} />
              </div>
              {tables.units ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-stone-400">
                      <th scope="col" className="py-1 font-normal">Building</th>
                      {UNIT_STATUSES.map((st) => <th key={st} scope="col" className="py-1 text-right font-normal">{STATUS_LABEL[st]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(s.units_by_building).map(([b, v]) => (
                      <tr key={b} className="border-t border-line/60">
                        <th scope="row" className="py-1.5 text-left font-normal">{b}</th>
                        {UNIT_STATUSES.map((st) => <td key={st} className="py-1.5 text-right tabular-nums">{v[st]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <StackedBars
                  label="Units by status, per building"
                  series={STATUS_SERIES}
                  rows={[
                    ...Object.entries(s.units_by_building).map(([label, values]) => ({ label, values })),
                    { label: "All buildings", values: s.units_by_status },
                  ]}
                />
              )}
            </Card>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-sans text-sm font-semibold">Pipeline</h2>
                <Link to="/admin/pipeline" className="text-xs text-gold-soft hover:underline">Open board</Link>
              </div>
              <HBarList items={LEAD_STAGES.map((st) => ({ label: STAGE_LABEL[st], value: s.pipeline[st] }))} />
              <h2 className="mb-3 mt-8 font-sans text-sm font-semibold">Lead sources</h2>
              <HBarList color="var(--color-stone-400)" items={Object.entries(s.sources).map(([k, v]) => ({ label: SOURCE_LABEL[k] ?? k, value: v }))} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <p className="text-sm text-stone-400">{label}</p>
      <p className="mt-2 font-sans text-4xl font-semibold tracking-tight text-bone">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{note}</p>
    </Card>
  );
}
