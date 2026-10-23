import { useEffect, useState, type FormEvent } from "react";
import { api, downloadAuthed } from "../lib/api";
import { dateShort, SOURCE_LABEL, STAGE_LABEL } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import { LEAD_SOURCES, LEAD_STAGES, type Lead, type LeadSource, type LeadStage, type Paged } from "../lib/types";
import { LeadDrawer } from "./LeadDrawer";
import { Btn, ErrorNote, Field, inputCls, PageHeader, Toast } from "./ui";

const STAGE_DOT: Record<LeadStage, string> = {
  new: "bg-bone",
  contacted: "bg-stone-400",
  viewing: "bg-gold",
  reserved: "bg-reserved",
  won: "bg-available",
  lost: "bg-stone-500",
};

export function StagePill({ stage }: { stage: LeadStage }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-stone-300">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[stage]}`} />
      {STAGE_LABEL[stage]}
    </span>
  );
}

export default function Leads() {
  useDocumentTitle("Leads · Back panel");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [stage, setStage] = useState<LeadStage | "">("");
  const [source, setSource] = useState<LeadSource | "">("");
  const [sort, setSort] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const query = { q: debounced, stage, source, sort, page, page_size: pageSize };
  const { data, error, reload } = useApi<Paged<Lead>>("/admin/leads", { auth: true, query });
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const sortHeader = (field: string, label: string) => {
    const active = sort.replace("-", "") === field;
    const desc = sort.startsWith("-");
    return (
      <th scope="col" aria-sort={active ? (desc ? "descending" : "ascending") : "none"} className="px-3 py-2.5 font-medium">
        <button className="inline-flex items-center gap-1 hover:text-bone" onClick={() => setSort(active && desc ? field : `-${field}`)}>
          {label}
          <span aria-hidden="true" className="text-[0.6rem]">{active ? (desc ? "▼" : "▲") : ""}</span>
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle={data ? `${data.total} matching` : " "}
        actions={
          <>
            <Btn onClick={() => void downloadAuthed("/admin/leads/export.csv", { q: debounced, stage, source }, `leads-${new Date().toISOString().slice(0, 10)}.csv`)}>
              Export CSV
            </Btn>
            <Btn variant="primary" onClick={() => setCreating(true)}>New lead</Btn>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <label className="block">
          <span className="sr-only">Search leads</span>
          <input type="search" placeholder="Search name, email, phone or unit…" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="block">
          <span className="sr-only">Stage</span>
          <select className={inputCls} value={stage} onChange={(e) => { setStage(e.target.value as LeadStage | ""); setPage(1); }}>
            <option value="">All stages</option>
            {LEAD_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Source</span>
          <select className={inputCls} value={source} onChange={(e) => { setSource(e.target.value as LeadSource | ""); setPage(1); }}>
            <option value="">All sources</option>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      <ErrorNote error={error} />
      {creating && <NewLead onCancel={() => setCreating(false)} onCreated={(lead) => { setCreating(false); reload(); flash(`${lead.name} added`); setOpenId(lead.id); }} />}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-ink-900 text-xs text-stone-400">
            <tr>
              {sortHeader("name", "Name")}
              <th scope="col" className="px-3 py-2.5 font-medium">Contact</th>
              {sortHeader("stage", "Stage")}
              {sortHeader("source", "Source")}
              <th scope="col" className="px-3 py-2.5 font-medium">Interest</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Viewed</th>
              {sortHeader("created_at", "Created")}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((l) => (
              <tr key={l.id} className="border-t border-line/70 hover:bg-ink-900">
                <td className="px-3 py-2.5">
                  <button className="text-left font-medium text-bone hover:text-gold-soft" onClick={() => setOpenId(l.id)}>{l.name}</button>
                </td>
                <td className="px-3 py-2.5 text-stone-300">{l.email}<span className="block text-xs text-stone-500">{l.phone}</span></td>
                <td className="px-3 py-2.5"><StagePill stage={l.stage} /></td>
                <td className="px-3 py-2.5 text-stone-300">{SOURCE_LABEL[l.source]}</td>
                <td className="px-3 py-2.5 text-stone-300">{l.unit_interest.map((u) => u.code).join(", ") || "—"}</td>
                <td className="px-3 py-2.5 tabular-nums text-stone-300">{new Set(l.units_viewed.map((u) => u.code)).size}</td>
                <td className="px-3 py-2.5 text-stone-300">{dateShort(l.created_at)}</td>
              </tr>
            ))}
            {data && !data.items.length && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-stone-400">No leads match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-stone-400">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Btn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Btn>
          <Btn disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Btn>
        </div>
      </nav>
      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} onChanged={() => reload()} />
      <Toast message={toast} />
    </div>
  );
}

function NewLead({ onCancel, onCreated }: { onCancel: () => void; onCreated: (lead: Lead) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "walk_in" as LeadSource, message: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      onCreated(await api<Lead>("/admin/leads", { method: "POST", body: form, auth: true }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-line bg-ink-900 p-5 sm:grid-cols-2">
      <Field label="Name"><input required minLength={2} maxLength={80} className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Phone"><input className={inputCls} maxLength={32} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Source">
        <select className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}>
          {LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2"><Field label="Message"><textarea rows={2} maxLength={2000} className={inputCls} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field></div>
      <div className="sm:col-span-2"><ErrorNote error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <Btn type="submit" variant="primary" disabled={busy}>Create lead</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>
    </form>
  );
}
