import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { money, STATUS_LABEL } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import { UNIT_STATUSES, type Building, type Project, type Unit, type UnitStatus } from "../lib/types";
import { useAuth } from "./auth";
import { Btn, Card, ErrorNote, Field, inputCls, PageHeader, Toast } from "./ui";

export default function Inventory() {
  useDocumentTitle("Inventory · Back panel");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: projects } = useApi<Project[]>("/admin/projects", { auth: true });
  const [projectId, setProjectId] = useState<string>("");
  useEffect(() => {
    if (!projectId && projects?.length) setProjectId(projects[0].id);
  }, [projects, projectId]);
  const { data: buildings } = useApi<Building[]>(projectId ? "/admin/buildings" : null, { auth: true, query: { project_id: projectId } });
  const [buildingId, setBuildingId] = useState("");
  const [status, setStatus] = useState<UnitStatus | "">("");
  const { data: units, error, reload, setData } = useApi<Unit[]>(projectId ? "/admin/units" : null, {
    auth: true,
    query: { project_id: projectId, building_id: buildingId, status },
  });
  const [toast, setToast] = useState<string | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const currency = projects?.find((p) => p.id === projectId)?.currency ?? "EUR";
  const buildingName = useMemo(() => new Map(buildings?.map((b) => [b.id, b.code]) ?? []), [buildings]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  async function save(unit: Unit, changes: Partial<Unit>) {
    setFailure(null);
    try {
      const updated = await api<Unit>(`/admin/units/${unit.id}`, { method: "PATCH", body: changes, auth: true });
      setData(units?.map((u) => (u.id === unit.id ? updated : u)));
      flash(`${unit.code} saved`);
    } catch (e) {
      setFailure(e);
    }
  }

  async function remove(unit: Unit) {
    if (!window.confirm(`Delete ${unit.code}?`)) return;
    try {
      await api(`/admin/units/${unit.id}`, { method: "DELETE", auth: true });
      reload();
    } catch (e) {
      setFailure(e);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory & pricing" subtitle="Changes go live on the explorer, brochures and project pages immediately." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Project">
          <select className={inputCls} value={projectId} onChange={(e) => { setProjectId(e.target.value); setBuildingId(""); }}>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Building">
          <select className={inputCls} value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            <option value="">All buildings</option>
            {buildings?.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as UnitStatus | "")}>
            <option value="">All statuses</option>
            {UNIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
      </div>
      {isAdmin && projectId && buildings && (
        <BulkPrice projectId={projectId} buildings={buildings} onDone={(n) => { reload(); flash(`${n} prices updated`); }} />
      )}
      <ErrorNote error={error ?? failure} />
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-ink-900 text-xs text-stone-400">
            <tr>
              {["Unit", "Bldg", "Floor", "Type", "Beds", "Area", "Status", "Price", ""].map((h) => (
                <th key={h || "actions"} scope="col" className="px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units?.map((u) => (
              <UnitRow key={u.id} unit={u} building={buildingName.get(u.building_id) ?? ""} currency={currency} isAdmin={isAdmin}
                onSave={(c) => void save(u, c)} onDelete={() => void remove(u)} />
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin && buildings && buildings.length > 0 && <NewUnit buildings={buildings} onCreated={() => { reload(); flash("Unit added"); }} />}
      <Toast message={toast} />
    </div>
  );
}

function UnitRow({ unit, building, currency, isAdmin, onSave, onDelete }: { unit: Unit; building: string; currency: string; isAdmin: boolean; onSave: (c: Partial<Unit>) => void; onDelete: () => void }) {
  const [price, setPrice] = useState(String(unit.price));
  useEffect(() => setPrice(String(unit.price)), [unit.price]);
  const dirty = Number(price) !== unit.price;
  return (
    <tr className="border-t border-line/70">
      <th scope="row" className="px-3 py-2 font-medium text-bone">{unit.code}</th>
      <td className="px-3 py-2 text-stone-300">{building}</td>
      <td className="px-3 py-2 tabular-nums text-stone-300">{unit.floor}</td>
      <td className="px-3 py-2 text-stone-300">{unit.plan_type}</td>
      <td className="px-3 py-2 tabular-nums text-stone-300">{unit.beds}</td>
      <td className="px-3 py-2 tabular-nums text-stone-300">{unit.area_sqm} m²</td>
      <td className="px-3 py-2">
        <label className="sr-only" htmlFor={`st-${unit.id}`}>Status of {unit.code}</label>
        <select id={`st-${unit.id}`} className={`${inputCls} !w-32 !py-1`} value={unit.status} onChange={(e) => onSave({ status: e.target.value as UnitStatus })}>
          {UNIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        {isAdmin ? (
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (dirty && Number(price) > 0) onSave({ price: Math.round(Number(price)) }); }}>
            <label className="sr-only" htmlFor={`pr-${unit.id}`}>Price of {unit.code}</label>
            <input id={`pr-${unit.id}`} inputMode="numeric" className={`${inputCls} !w-32 !py-1 tabular-nums`} value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} />
            {dirty && <Btn type="submit" variant="primary" className="!min-h-8 !px-2">Save</Btn>}
          </form>
        ) : (
          <span className="tabular-nums">{money(unit.price, currency)}</span>
        )}
        {unit.price_history?.length ? (
          <span className="mt-0.5 block text-xs text-stone-500">was {money(unit.price_history[unit.price_history.length - 1].price, currency)}</span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-right">{isAdmin && <Btn variant="ghost" onClick={onDelete} aria-label={`Delete ${unit.code}`}>Delete</Btn>}</td>
    </tr>
  );
}

function BulkPrice({ projectId, buildings, onDone }: { projectId: string; buildings: Building[]; onDone: (n: number) => void }) {
  const [buildingId, setBuildingId] = useState("");
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("3");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return;
    if (!window.confirm(`Apply ${mode === "percent" ? `${n}%` : n} to ${buildingId ? "this building" : "all buildings"}?`)) return;
    try {
      const res = await api<{ updated: number }>("/admin/units/bulk-price", {
        method: "POST",
        auth: true,
        body: { project_id: projectId, building_id: buildingId || null, only_status: onlyAvailable ? "available" : null, [mode]: n, round_to: 1000 },
      });
      onDone(res.updated);
    } catch (err) {
      setError(err);
    }
  }
  return (
    <Card>
      <h2 className="font-sans text-sm font-semibold">Bulk price change</h2>
      <form onSubmit={submit} className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_140px_120px_auto_auto]">
        <Field label="Building">
          <select className={inputCls} value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            <option value="">All buildings</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
          </select>
        </Field>
        <Field label="Adjust by">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as "percent" | "amount")}>
            <option value="percent">Percent</option>
            <option value="amount">Amount</option>
          </select>
        </Field>
        <Field label={mode === "percent" ? "%" : "Amount"}>
          <input className={inputCls} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <label className="flex min-h-9 items-center gap-2 text-sm text-stone-300">
          <input type="checkbox" className="accent-[var(--color-gold)]" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Available only
        </label>
        <Btn type="submit" variant="primary">Apply</Btn>
      </form>
      <div className="mt-3"><ErrorNote error={error} /></div>
    </Card>
  );
}

function NewUnit({ buildings, onCreated }: { buildings: Building[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ building_id: buildings[0].id, code: "", floor: "1", position: "1", beds: "2", baths: "2", area_sqm: "96", terrace_sqm: "30", price: "", plan_type: "B2", orientation: "" });
  const [error, setError] = useState<unknown>(null);
  if (!open) return <Btn onClick={() => setOpen(true)}>Add unit</Btn>;
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/units", {
        method: "POST",
        auth: true,
        body: {
          ...f,
          code: f.code.toUpperCase(),
          floor: Number(f.floor), position: Number(f.position), beds: Number(f.beds), baths: Number(f.baths),
          area_sqm: Number(f.area_sqm), terrace_sqm: Number(f.terrace_sqm), price: Number(f.price),
        },
      });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err);
    }
  }
  const input = (k: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label}><input className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /></Field>
  );
  return (
    <Card>
      <h2 className="font-sans text-sm font-semibold">New unit</h2>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-4">
        <Field label="Building">
          <select className={inputCls} value={f.building_id} onChange={(e) => setF({ ...f, building_id: e.target.value })}>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
          </select>
        </Field>
        {input("code", "Code", { required: true, placeholder: "A-601", pattern: "[A-Za-z0-9-]{1,12}" })}
        {input("floor", "Floor", { inputMode: "numeric" })}
        {input("position", "Position on floor", { inputMode: "numeric" })}
        {input("beds", "Beds", { inputMode: "numeric" })}
        {input("baths", "Baths", { inputMode: "numeric" })}
        {input("area_sqm", "Interior m²", { inputMode: "decimal" })}
        {input("terrace_sqm", "Terrace m²", { inputMode: "decimal" })}
        {input("price", "Price", { required: true, inputMode: "numeric" })}
        <Field label="Plan type">
          <select className={inputCls} value={f.plan_type} onChange={(e) => setF({ ...f, plan_type: e.target.value })}>
            {["A1", "B2", "C3", "P4"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        {input("orientation", "Orientation")}
        <div className="sm:col-span-4"><ErrorNote error={error} /></div>
        <div className="flex gap-2 sm:col-span-4">
          <Btn type="submit" variant="primary">Create</Btn>
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
        </div>
      </form>
    </Card>
  );
}
