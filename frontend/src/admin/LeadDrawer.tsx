import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../lib/api";
import { dateTime, relativeTime, SOURCE_LABEL, STAGE_LABEL } from "../lib/format";
import { LEAD_SOURCES, LEAD_STAGES, type Lead, type LeadStage } from "../lib/types";
import { Btn, ErrorNote, Field, inputCls } from "./ui";

/** Side drawer with full lead detail: stage, units viewed, notes. */
export function LeadDrawer({ leadId, onClose, onChanged }: { leadId: string | null; onClose: () => void; onChanged: (lead: Lead | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (leadId && !d.open) d.showModal();
    if (!leadId && d.open) d.close();
    if (!leadId) return;
    setLead(null);
    setError(null);
    api<Lead>(`/admin/leads/${leadId}`, { auth: true }).then(setLead).catch(setError);
  }, [leadId]);

  async function patch(body: Partial<Pick<Lead, "stage" | "source" | "assignee" | "phone" | "name">>) {
    if (!lead) return;
    setBusy(true);
    try {
      const updated = await api<Lead>(`/admin/leads/${lead.id}`, { method: "PATCH", body, auth: true });
      setLead(updated);
      onChanged(updated);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!lead || !note.trim()) return;
    setBusy(true);
    try {
      await api(`/admin/leads/${lead.id}/notes`, { method: "POST", body: { body: note.trim() }, auth: true });
      const updated = await api<Lead>(`/admin/leads/${lead.id}`, { auth: true });
      setLead(updated);
      onChanged(updated);
      setNote("");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!lead || !window.confirm(`Delete ${lead.name}? This cannot be undone.`)) return;
    await api(`/admin/leads/${lead.id}`, { method: "DELETE", auth: true });
    onChanged(null);
    onClose();
  }

  const viewed = lead ? [...new Map(lead.units_viewed.map((u) => [u.code, u])).values()] : [];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={lead ? `Lead: ${lead.name}` : "Lead"}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl overflow-y-auto border-l border-line bg-ink-900 p-0 text-bone backdrop:bg-ink-950/70"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-sans text-lg font-semibold">{lead?.name ?? "Lead"}</h2>
        <Btn variant="ghost" onClick={onClose} aria-label="Close">✕</Btn>
      </div>
      <div className="space-y-6 px-6 py-6">
        <ErrorNote error={error} />
        {lead && (
          <>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-stone-400">Email</dt><dd><a className="text-gold-soft hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a></dd></div>
              <div><dt className="text-stone-400">Phone</dt><dd>{lead.phone ? <a className="hover:underline" href={`tel:${lead.phone.replace(/\s/g, "")}`}>{lead.phone}</a> : "—"}</dd></div>
              <div><dt className="text-stone-400">Created</dt><dd>{dateTime(lead.created_at)}</dd></div>
              <div><dt className="text-stone-400">Updated</dt><dd>{relativeTime(lead.updated_at)}</dd></div>
            </dl>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Stage">
                <select className={inputCls} value={lead.stage} disabled={busy} onChange={(e) => void patch({ stage: e.target.value as LeadStage })}>
                  {LEAD_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Source">
                <select className={inputCls} value={lead.source} disabled={busy} onChange={(e) => void patch({ source: e.target.value as Lead["source"] })}>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Assignee">
                <input className={inputCls} defaultValue={lead.assignee} maxLength={80} onBlur={(e) => e.target.value !== lead.assignee && void patch({ assignee: e.target.value })} />
              </Field>
            </div>
            {lead.message && (
              <div>
                <h3 className="text-xs font-medium text-stone-400">Message</h3>
                <p className="mt-1 whitespace-pre-line rounded-md border border-line bg-ink-950 p-3 text-sm text-stone-300">{lead.message}</p>
              </div>
            )}
            <div>
              <h3 className="text-xs font-medium text-stone-400">Units of interest</h3>
              <p className="mt-2 flex flex-wrap gap-2">
                {lead.unit_interest.length ? lead.unit_interest.map((u) => <Chip key={u.unit_id}>{u.code}</Chip>) : <span className="text-sm text-stone-500">None</span>}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-stone-400">Units viewed in the explorer ({viewed.length})</h3>
              <p className="mt-2 flex flex-wrap gap-2">
                {viewed.length ? viewed.map((u) => <Chip key={u.code} muted>{u.code}</Chip>) : <span className="text-sm text-stone-500">No tracked views</span>}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-stone-400">Notes</h3>
              <form onSubmit={addNote} className="mt-2 space-y-2">
                <label className="sr-only" htmlFor="new-note">Add a note</label>
                <textarea id="new-note" rows={3} maxLength={4000} className={inputCls} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
                <Btn type="submit" variant="primary" disabled={busy || !note.trim()}>Add note</Btn>
              </form>
              <ol className="mt-5 space-y-4">
                {[...lead.notes].reverse().map((n) => (
                  <li key={n.id} className={`border-l-2 pl-4 ${n.system ? "border-line" : "border-gold"}`}>
                    <p className={`whitespace-pre-line text-sm ${n.system ? "text-stone-400" : "text-bone"}`}>{n.body}</p>
                    <p className="mt-1 text-xs text-stone-500">{n.author} · {dateTime(n.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="border-t border-line pt-6">
              <Btn variant="danger" onClick={() => void remove()}>Delete lead</Btn>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function Chip({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs ${muted ? "border-line text-stone-300" : "border-gold/50 text-gold-soft"}`}>{children}</span>;
}
