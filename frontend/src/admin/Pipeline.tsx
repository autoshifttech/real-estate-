import { useState, type DragEvent } from "react";
import { api } from "../lib/api";
import { relativeTime, SOURCE_LABEL, STAGE_LABEL } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import { LEAD_STAGES, type Lead, type LeadStage, type Paged } from "../lib/types";
import { LeadDrawer } from "./LeadDrawer";
import { ErrorNote, PageHeader, Toast } from "./ui";

/** Kanban: drag cards between stages, or use each card's "Move to" menu (keyboard/touch). */
export default function Pipeline() {
  useDocumentTitle("Pipeline · Back panel");
  const { data, error, setData, reload } = useApi<Paged<Lead>>("/admin/leads", { auth: true, query: { page_size: 500, sort: "-updated_at" } });
  const [dragOver, setDragOver] = useState<LeadStage | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  async function move(id: string, stage: LeadStage) {
    if (!data) return;
    const before = data;
    const lead = data.items.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    setData({ ...data, items: data.items.map((l) => (l.id === id ? { ...l, stage } : l)) });
    try {
      await api(`/admin/leads/${id}`, { method: "PATCH", body: { stage }, auth: true });
      setToast(`${lead.name} → ${STAGE_LABEL[stage]}`);
      setTimeout(() => setToast(null), 2200);
    } catch (e) {
      setData(before);
      setFailure(e);
    }
  }

  const onDrop = (stage: LeadStage) => (e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/lead-id");
    if (id) void move(id, stage);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pipeline" subtitle="New → Contacted → Viewing → Reserved → Won / Lost" />
      <ErrorNote error={error ?? failure} />
      <div className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => {
          const items = data?.items.filter((l) => l.stage === stage) ?? [];
          return (
            <section
              key={stage}
              aria-labelledby={`col-${stage}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(stage);
              }}
              onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
              onDrop={onDrop(stage)}
              className={`flex min-h-[60vh] flex-col rounded-lg border bg-ink-900 ${dragOver === stage ? "border-gold" : "border-line"}`}
            >
              <h2 id={`col-${stage}`} className="flex items-center justify-between border-b border-line px-3 py-2.5 font-sans text-sm font-semibold">
                {STAGE_LABEL[stage]}
                <span className="rounded-full bg-ink-800 px-2 text-xs font-normal tabular-nums text-stone-300">{items.length}</span>
              </h2>
              <ul className="flex-1 space-y-2 p-2">
                {items.map((l) => (
                  <li
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/lead-id", l.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="cursor-grab rounded-md border border-line bg-ink-950 p-3 active:cursor-grabbing"
                  >
                    <button className="text-left text-sm font-medium text-bone hover:text-gold-soft" onClick={() => setOpenId(l.id)}>
                      {l.name}
                    </button>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {SOURCE_LABEL[l.source]} · {relativeTime(l.updated_at)}
                    </p>
                    {l.unit_interest.length > 0 && (
                      <p className="mt-2 text-xs text-gold-soft">{l.unit_interest.map((u) => u.code).join(", ")}</p>
                    )}
                    <label className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                      Move to
                      <select
                        className="rounded border border-line bg-ink-900 px-1.5 py-1 text-xs text-bone"
                        value={l.stage}
                        onChange={(e) => void move(l.id, e.target.value as LeadStage)}
                        aria-label={`Move ${l.name} to stage`}
                      >
                        {LEAD_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <LeadDrawer leadId={openId} onClose={() => setOpenId(null)} onChanged={() => reload()} />
      <Toast message={toast} />
    </div>
  );
}
