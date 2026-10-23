import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, ButtonLink } from "../components/ui/Button";
import { EnquiryForm } from "../components/ui/EnquiryForm";
import { Modal } from "../components/ui/Modal";
import { StatusBadge } from "../components/ui/StatusBadge";
import { brand } from "../config/brand";
import { apiUrl } from "../lib/api";
import { floorLabel, money, sqm, STATUS_LABEL } from "../lib/format";
import { useApi, useDocumentTitle, useMediaQuery, useOnline, useReducedMotion } from "../lib/hooks";
import { UNIT_STATUSES, type Plan, type Project, type Unit } from "../lib/types";
import { trackUnitView } from "../lib/visitor";
import NotFound from "../pages/NotFound";
import { BuildingScene, webglAvailable } from "./BuildingScene";
import { activeFilterCount, applyFilters, DEFAULT_FILTERS, priceSteps, type Filters } from "./filters";
import { FloorPlan } from "./FloorPlan";

const KIOSK_IDLE_MS = 120_000;
const MAX_COMPARE = 3;

export default function ExplorerPage() {
  const { slug = brand.demoProjectSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const kiosk = params.get("kiosk") === "1";
  const selectedId = params.get("unit");

  const { data: project, error: projectError } = useApi<Project>(`/projects/${slug}`);
  const { data: units, reload: reloadUnits } = useApi<Unit[]>(`/projects/${slug}/units`);
  const { data: plans } = useApi<Record<string, Plan>>("/plans");
  useDocumentTitle(project ? `Explorer · ${project.name} · ${brand.name}` : undefined);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [compare, setCompare] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [dialog, setDialog] = useState<null | "enquire" | "compare" | "brochure">(null);
  const [enquiryUnits, setEnquiryUnits] = useState<string[]>([]);
  const [view, setView] = useState<"3d" | "list">("3d");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const reduced = useReducedMotion();
  const online = useOnline();

  const buildings = useMemo(() => project?.buildings ?? [], [project]);
  const unitList = useMemo(() => units ?? [], [units]);
  const filtered = useMemo(() => applyFilters(unitList, buildings, filters), [unitList, buildings, filters]);
  const byId = useMemo(() => new Map(unitList.map((u) => [u.id, u])), [unitList]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const currency = project?.currency ?? "EUR";

  const select = useCallback(
    (id: string | null) => {
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          if (id) next.set("unit", id);
          else next.delete("unit");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  useEffect(() => {
    if (selected) trackUnitView(selected.id);
  }, [selected]);

  // Live inventory: refresh statuses every 60 s while online.
  useEffect(() => {
    if (!online) return;
    const t = window.setInterval(reloadUnits, 60_000);
    return () => window.clearInterval(t);
  }, [online, reloadUnits]);

  // Kiosk: reset to the attract state after inactivity.
  useEffect(() => {
    if (!kiosk) return;
    let timer = window.setTimeout(reset, KIOSK_IDLE_MS);
    function reset() {
      setFilters(DEFAULT_FILTERS);
      setCompare([]);
      setFloor(null);
      setDialog(null);
      select(null);
    }
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, KIOSK_IDLE_MS);
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [kiosk, select]);

  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_COMPARE ? c : [...c, id]));

  const enquire = (ids: string[]) => {
    setEnquiryUnits(ids);
    setDialog("enquire");
  };

  if (projectError && !project) return <NotFound />;

  const wrapper = kiosk ? "fixed inset-0 z-[55] bg-ink-950" : "pt-[72px]";

  return (
    <div className={wrapper}>
      <h1 className="sr-only">{project ? `${project.name} unit explorer` : "Unit explorer"}</h1>
      <div className="flex h-[calc(100svh-72px)] flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_430px]" style={kiosk ? { height: "100svh" } : undefined}>
        {/* ---------- Scene ---------- */}
        <div className={`relative min-h-0 flex-1 ${view === "list" && !isDesktop ? "hidden" : ""}`}>
          <SceneView
            project={project}
            units={unitList}
            matches={filtered}
            selectedId={selected?.id ?? null}
            buildingFocus={filters.building}
            floor={floor}
            reduced={reduced}
            onSelect={select}
            onHover={setHovered}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
            <div className="pointer-events-auto rounded-sm border border-line/70 bg-ink-950/75 px-4 py-3 backdrop-blur">
              <p className="eyebrow !text-[0.62rem]">{project?.location ?? " "}</p>
              <p className="font-display text-2xl leading-tight">{project?.name ?? "Loading…"}</p>
            </div>
            <div className="pointer-events-auto flex gap-2">
              <BuildingTabs
                buildings={buildings.map((b) => ({ code: b.code, name: b.name }))}
                value={filters.building}
                onChange={(code) => {
                  setFilters((f) => ({ ...f, building: code }));
                  setFloor(null);
                }}
              />
            </div>
          </div>
          <FloorStepper
            floors={Math.max(0, ...buildings.map((b) => b.floors))}
            value={floor}
            onChange={setFloor}
          />
          <Legend />
          {hovered && byId.get(hovered) && isDesktop && (
            <HoverCard unit={byId.get(hovered)!} currency={currency} />
          )}
          {kiosk && (
            <div className="absolute bottom-6 left-6 flex gap-3">
              <Button variant="ghost" onClick={() => void document.documentElement.requestFullscreen?.()}>
                Full screen
              </Button>
              <ButtonLink to={`/explorer/${slug}`} variant="quiet">
                Exit kiosk
              </ButtonLink>
            </div>
          )}
        </div>

        {/* ---------- Panel ---------- */}
        <aside
          aria-label="Residences"
          className={`flex min-h-0 flex-col border-line bg-ink-950 lg:border-l ${view === "3d" && !isDesktop ? "max-h-[46svh] border-t" : "flex-1 lg:flex-none"}`}
        >
          {!isDesktop && (
            <div className="flex border-b border-line" role="tablist" aria-label="View">
              {(["3d", "list"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`min-h-11 flex-1 text-xs uppercase tracking-[0.18em] ${view === v ? "bg-ink-850 text-gold-soft" : "text-stone-400"}`}
                >
                  {v === "3d" ? "3D model" : "List"}
                </button>
              ))}
            </div>
          )}
          {selected ? (
            <UnitDetailPanel
              unit={selected}
              plan={plans?.[selected.plan_type] ?? null}
              buildingName={buildings.find((b) => b.id === selected.building_id)?.name ?? ""}
              currency={currency}
              inCompare={compare.includes(selected.id)}
              compareFull={compare.length >= MAX_COMPARE}
              onBack={() => select(null)}
              onCompare={() => toggleCompare(selected.id)}
              onEnquire={() => enquire([selected.id])}
              onBrochure={() => setDialog("brochure")}
            />
          ) : (
            <UnitListPanel
              units={filtered}
              total={unitList.length}
              currency={currency}
              filters={filters}
              allUnits={unitList}
              compare={compare}
              onFilters={setFilters}
              onSelect={select}
              onHover={setHovered}
              onToggleCompare={toggleCompare}
            />
          )}
          {compare.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-line bg-ink-900 px-5 py-3">
              <p className="text-sm text-stone-300">
                Comparing <span className="text-gold-soft">{compare.map((id) => byId.get(id)?.code).join(", ")}</span>
              </p>
              <div className="flex gap-2">
                <button className="min-h-11 px-3 text-xs uppercase tracking-[0.16em] text-stone-400 hover:text-bone" onClick={() => setCompare([])}>
                  Clear
                </button>
                <Button className="!px-5 !py-2.5" onClick={() => setDialog("compare")} disabled={compare.length < 2}>
                  Compare
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <Modal open={dialog === "enquire"} onClose={() => setDialog(null)} title="Reserve or enquire">
        <EnquiryForm
          compact
          source="explorer"
          unitIds={enquiryUnits}
          unitLabels={enquiryUnits.map((id) => byId.get(id)?.code ?? "")}
          submitLabel="Send to sales team"
          defaultMessage={enquiryUnits.length ? "I'd like to reserve or arrange a viewing." : ""}
        />
      </Modal>
      <Modal open={dialog === "brochure"} onClose={() => setDialog(null)} title="Your brochure">
        {selected && <BrochureForm unit={selected} />}
      </Modal>
      <Modal open={dialog === "compare"} onClose={() => setDialog(null)} title="Compare residences" wide>
        <CompareTable
          units={compare.map((id) => byId.get(id)).filter((u): u is Unit => !!u)}
          plans={plans}
          currency={currency}
          onEnquire={() => enquire(compare)}
          onRemove={toggleCompare}
        />
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SceneView(props: {
  project: Project | undefined;
  units: Unit[];
  matches: Unit[];
  selectedId: string | null;
  buildingFocus: string | null;
  floor: number | null;
  reduced: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BuildingScene | null>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const [failed, setFailed] = useState(false);
  const handlers = useRef({ onSelect: props.onSelect, onHover: props.onHover });
  handlers.current = { onSelect: props.onSelect, onHover: props.onHover };
  const { project, units, matches, selectedId, buildingFocus, floor, reduced } = props;
  const dataKey = units.map((u) => u.id).join();

  useEffect(() => {
    if (!host.current) return;
    if (!webglAvailable()) {
      setFailed(true);
      return;
    }
    try {
      sceneRef.current = new BuildingScene(host.current, {
        reducedMotion: reduced,
        onSelect: (id) => id && handlers.current.onSelect(id),
        onHover: (id) => handlers.current.onHover(id),
      });
    } catch {
      setFailed(true);
    }
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !project?.buildings || !units.length) return;
    scene.setData(project.buildings, units);
    labelRefs.current.forEach((el, code) => scene.attachLabel(code, el));
    // Only rebuild geometry when the set of units changes; statuses update in place below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, dataKey, reduced]);

  useEffect(() => sceneRef.current?.updateUnits(units), [units]);
  useEffect(() => sceneRef.current?.setMatches(new Set(matches.map((u) => u.id))), [matches]);
  useEffect(() => sceneRef.current?.setSelected(selectedId), [selectedId]);
  useEffect(() => sceneRef.current?.focusBuilding(buildingFocus), [buildingFocus]);
  useEffect(() => sceneRef.current?.isolateFloor(buildingFocus, floor), [buildingFocus, floor]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-stone-300">
        <p>3D isn't available on this device. Every residence is listed alongside, with plans, prices and status.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={host}
        role="img"
        aria-label="Interactive 3D model of the development. Drag to orbit, tap a residence to see details. The list of residences offers the same information."
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />
      {project?.buildings?.map((b) => (
        <div
          key={b.code}
          ref={(el) => {
            if (el) labelRefs.current.set(b.code, el);
            else labelRefs.current.delete(b.code);
            sceneRef.current?.attachLabel(b.code, el);
          }}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-center"
        >
          <span className="block font-display text-xl text-bone">{b.name}</span>
          <span className="block text-[0.62rem] uppercase tracking-[0.2em] text-gold">Building {b.code}</span>
        </div>
      ))}
    </div>
  );
}

function BuildingTabs({ buildings, value, onChange }: { buildings: { code: string; name: string }[]; value: string | null; onChange: (code: string | null) => void }) {
  const options = [{ code: null as string | null, name: "All" }, ...buildings];
  return (
    <div role="radiogroup" aria-label="Building" className="flex rounded-full border border-line/70 bg-ink-950/75 p-1 backdrop-blur">
      {options.map((o) => (
        <button
          key={o.code ?? "all"}
          role="radio"
          aria-checked={value === o.code}
          onClick={() => onChange(o.code)}
          className={`min-h-9 rounded-full px-4 text-xs uppercase tracking-[0.16em] transition-colors ${value === o.code ? "bg-gold text-ink-950" : "text-stone-300 hover:text-bone"}`}
        >
          {o.code ? <><span className="hidden sm:inline">{o.name}</span><span className="sm:hidden">{o.code}</span></> : "All"}
        </button>
      ))}
    </div>
  );
}

function FloorStepper({ floors, value, onChange }: { floors: number; value: number | null; onChange: (f: number | null) => void }) {
  if (!floors) return null;
  const list = Array.from({ length: floors }, (_, i) => floors - i);
  return (
    <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-line/70 bg-ink-950/75 p-1 backdrop-blur sm:flex sm:right-6" role="group" aria-label="Step through floors">
      <button aria-label="Floor up" className="flex h-9 w-9 items-center justify-center text-stone-300 hover:text-gold-soft disabled:opacity-30"
        disabled={value === null} onClick={() => onChange(value === null || value >= floors ? null : value + 1)}>
        <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3"><path d="M2 8l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
      {list.map((f) => (
        <button key={f} aria-pressed={value === f} onClick={() => onChange(value === f ? null : f)}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs tabular-nums ${value === f ? "bg-gold text-ink-950" : "text-stone-300 hover:text-bone"}`}>
          <span className="sr-only">Floor </span>{f}
        </button>
      ))}
      <button aria-label="Floor down" className="flex h-9 w-9 items-center justify-center text-stone-300 hover:text-gold-soft disabled:opacity-30"
        disabled={value === 1} onClick={() => onChange(value === null ? floors : Math.max(1, value - 1))}>
        <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
      <button onClick={() => onChange(null)} aria-pressed={value === null} className={`mt-1 h-9 w-9 rounded-full text-[0.6rem] uppercase ${value === null ? "text-gold-soft" : "text-stone-400"}`}>
        All
      </button>
    </div>
  );
}

function Legend() {
  return (
    <ul aria-label="Status colours" className="pointer-events-none absolute bottom-4 right-4 hidden gap-4 rounded-full border border-line/70 bg-ink-950/75 px-4 py-2 backdrop-blur sm:flex">
      {UNIT_STATUSES.map((s) => (
        <li key={s}>
          <StatusBadge status={s} className="!text-[0.62rem]" />
        </li>
      ))}
    </ul>
  );
}

function HoverCard({ unit, currency }: { unit: Unit; currency: string }) {
  return (
    <div className="pointer-events-none absolute bottom-16 left-6 rounded-sm border border-line/70 bg-ink-950/85 px-5 py-4 backdrop-blur">
      <p className="font-display text-2xl">{unit.code}</p>
      <p className="mt-1 text-sm text-stone-300">
        {unit.beds} bed · {sqm(unit.area_sqm)} · {floorLabel(unit.floor)}
      </p>
      <div className="mt-2 flex items-center gap-4">
        <StatusBadge status={unit.status} />
        {unit.status === "available" && <span className="text-sm text-gold-soft">{money(unit.price, currency)}</span>}
      </div>
    </div>
  );
}

function UnitListPanel(props: {
  units: Unit[];
  allUnits: Unit[];
  total: number;
  currency: string;
  filters: Filters;
  compare: string[];
  onFilters: (f: Filters) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onToggleCompare: (id: string) => void;
}) {
  const { units, total, currency, filters, compare, onFilters, onSelect, onHover, onToggleCompare, allUnits } = props;
  const [showFilters, setShowFilters] = useState(false);
  const steps = useMemo(() => priceSteps(allUnits), [allUnits]);
  const floors = useMemo(() => [...new Set(allUnits.map((u) => u.floor))].sort((a, b) => a - b), [allUnits]);
  const bedOptions = useMemo(() => [...new Set(allUnits.map((u) => u.beds))].sort((a, b) => a - b), [allUnits]);
  const count = activeFilterCount(filters);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onFilters({ ...filters, [k]: v });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-stone-300" aria-live="polite">
            <span className="font-display text-2xl text-bone">{units.length}</span> of {total} residences
          </p>
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="explorer-filters"
            onClick={() => setShowFilters((s) => !s)}
            className="min-h-11 text-xs uppercase tracking-[0.16em] text-gold-soft"
          >
            Filters{count ? ` (${count})` : ""}
          </button>
        </div>
        <div id="explorer-filters" hidden={!showFilters} className="mt-4 space-y-5">
          <fieldset>
            <legend className="text-xs uppercase tracking-[0.16em] text-stone-400">Bedrooms</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {bedOptions.map((b) => {
                const on = filters.beds.includes(b);
                return (
                  <button key={b} type="button" aria-pressed={on}
                    onClick={() => set("beds", on ? filters.beds.filter((x) => x !== b) : [...filters.beds, b])}
                    className={`min-h-10 min-w-10 rounded-full border px-4 text-sm ${on ? "border-gold bg-gold text-ink-950" : "border-line text-stone-300 hover:border-stone-400"}`}>
                    {b}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Min price" value={filters.priceMin} options={steps} onChange={(v) => set("priceMin", v)} format={(v) => money(v, currency, true)} />
            <SelectField label="Max price" value={filters.priceMax} options={steps} onChange={(v) => set("priceMax", v)} format={(v) => money(v, currency, true)} />
            <SelectField label="From floor" value={filters.floorMin} options={floors} onChange={(v) => set("floorMin", v)} format={String} />
            <SelectField label="To floor" value={filters.floorMax} options={floors} onChange={(v) => set("floorMax", v)} format={String} />
          </div>
          <fieldset>
            <legend className="text-xs uppercase tracking-[0.16em] text-stone-400">Status</legend>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {UNIT_STATUSES.map((s) => (
                <label key={s} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-stone-300">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--color-gold)]" checked={filters.statuses.includes(s)}
                    onChange={(e) => set("statuses", e.target.checked ? [...filters.statuses, s] : filters.statuses.filter((x) => x !== s))} />
                  {STATUS_LABEL[s]}
                </label>
              ))}
            </div>
          </fieldset>
          {count > 0 && (
            <button type="button" className="min-h-10 text-xs uppercase tracking-[0.16em] text-stone-400 hover:text-bone"
              onClick={() => onFilters({ ...DEFAULT_FILTERS, building: filters.building })}>
              Reset filters
            </button>
          )}
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {units.map((u) => (
          <li key={u.id} className="flex items-stretch border-b border-line/60" onMouseEnter={() => onHover(u.id)} onMouseLeave={() => onHover(null)}>
            <button type="button" onClick={() => onSelect(u.id)} className="grid flex-1 grid-cols-[4.5rem_1fr_auto] items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-ink-850 focus-visible:bg-ink-850">
              <span className="font-display text-xl">{u.code}</span>
              <span className="text-sm text-stone-300">
                {u.beds === 0 ? "Studio" : `${u.beds} bed`} · {sqm(u.area_sqm)}
                <span className="mt-1 block"><StatusBadge status={u.status} className="!text-[0.62rem]" /></span>
              </span>
              <span className="text-right text-sm tabular-nums text-bone">{u.status === "sold" ? "—" : money(u.price, currency, true)}</span>
            </button>
            <label className="flex w-14 cursor-pointer items-center justify-center border-l border-line/60" title="Add to compare">
              <span className="sr-only">Compare {u.code}</span>
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-gold)]" checked={compare.includes(u.id)}
                disabled={!compare.includes(u.id) && compare.length >= MAX_COMPARE} onChange={() => onToggleCompare(u.id)} />
            </label>
          </li>
        ))}
        {!units.length && (
          <li className="px-5 py-10 text-center text-stone-300">
            No residences match these filters.
            <br />
            <button className="mt-3 min-h-11 text-gold-soft underline underline-offset-4" onClick={() => onFilters(DEFAULT_FILTERS)}>Reset filters</button>
          </li>
        )}
      </ul>
    </div>
  );
}

function SelectField({ label, value, options, onChange, format }: { label: string; value: number | null; options: number[]; onChange: (v: number | null) => void; format: (v: number) => string }) {
  return (
    <label className="block text-xs uppercase tracking-[0.16em] text-stone-400">
      {label}
      <select className="field mt-1 !py-2 text-sm normal-case tracking-normal [&>option]:bg-ink-900" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
        <option value="">Any</option>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </label>
  );
}

function UnitDetailPanel(props: {
  unit: Unit;
  plan: Plan | null;
  buildingName: string;
  currency: string;
  inCompare: boolean;
  compareFull: boolean;
  onBack: () => void;
  onCompare: () => void;
  onEnquire: () => void;
  onBrochure: () => void;
}) {
  const { unit, plan, buildingName, currency, inCompare, compareFull, onBack, onCompare, onEnquire, onBrochure } = props;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [unit.id]);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
      <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.16em] text-stone-400 hover:text-bone">
        <svg aria-hidden="true" viewBox="0 0 18 10" className="h-2.5 w-4 rotate-180"><path d="M0 5h16M12 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
        All residences
      </button>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{buildingName} · {floorLabel(unit.floor)}</p>
          <h2 ref={heading} tabIndex={-1} className="mt-2 text-5xl outline-none">Residence {unit.code}</h2>
          <p className="mt-1 font-display text-xl italic text-stone-300">{plan?.label}</p>
        </div>
        <StatusBadge status={unit.status} className="mt-2 flex-none" />
      </div>
      <p className="mt-6 font-display text-4xl text-gold-soft">
        {unit.status === "sold" ? "Sold" : money(unit.price, currency)}
      </p>
      {unit.status === "reserved" && <p className="mt-1 text-sm text-stone-400">Reserved: join the waiting list in case it returns.</p>}
      <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line text-center">
        {[
          ["Bedrooms", String(unit.beds)],
          ["Bathrooms", String(unit.baths)],
          ["Interior", sqm(unit.area_sqm)],
          ["Terrace", sqm(unit.terrace_sqm)],
          ["Floor", String(unit.floor)],
          ["Aspect", unit.orientation.split(" · ")[0]],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col-reverse bg-ink-950 px-2 py-4">
            <dt className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-stone-400">{k}</dt>
            <dd className="text-lg">{v}</dd>
          </div>
        ))}
      </dl>
      {plan && <FloorPlan plan={plan} className="mt-8" />}
      {unit.features.length > 0 && (
        <ul className="mt-6 space-y-2 text-sm text-stone-300">
          {unit.features.map((f) => (
            <li key={f} className="flex gap-3"><span aria-hidden="true" className="mt-2 h-px w-3 flex-none bg-gold" />{f}</li>
          ))}
        </ul>
      )}
      <div className="sticky bottom-0 -mx-5 mt-8 grid gap-3 border-t border-line bg-ink-950/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:px-7">
        <Button arrow onClick={onEnquire} disabled={unit.status === "sold"}>
          {unit.status === "available" ? "Reserve / enquire" : unit.status === "reserved" ? "Join waiting list" : "Sold"}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={onBrochure} className="!px-3">Brochure PDF</Button>
          <Button variant="ghost" onClick={onCompare} disabled={!inCompare && compareFull} aria-pressed={inCompare} className="!px-3">
            {inCompare ? "In compare ✓" : "Compare"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BrochureForm({ unit }: { unit: Unit }) {
  const [name, setName] = useState("");
  const href = apiUrl(`/units/${unit.id}/brochure.pdf`, { name: name.trim().slice(0, 80) });
  return (
    <div className="space-y-6">
      <p className="text-stone-300">A personalised brochure for Residence {unit.code} with its floor plan and today's live price.</p>
      <label className="block text-xs uppercase tracking-[0.16em] text-stone-400">
        Prepared for (optional)
        <input className="field mt-1 normal-case tracking-normal" maxLength={80} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
      </label>
      <ButtonLink to={href} target="_blank" rel="noopener" arrow className="w-full">
        Generate PDF
      </ButtonLink>
    </div>
  );
}

function CompareTable({ units, plans, currency, onEnquire, onRemove }: { units: Unit[]; plans: Record<string, Plan> | undefined; currency: string; onEnquire: () => void; onRemove: (id: string) => void }) {
  const rows: [string, (u: Unit) => ReactNode][] = [
    ["Price", (u) => (u.status === "sold" ? "—" : money(u.price, currency))],
    ["Status", (u) => <StatusBadge status={u.status} />],
    ["Type", (u) => plans?.[u.plan_type]?.label ?? u.plan_type],
    ["Bedrooms", (u) => u.beds],
    ["Bathrooms", (u) => u.baths],
    ["Interior", (u) => sqm(u.area_sqm)],
    ["Terrace", (u) => sqm(u.terrace_sqm)],
    ["Price / m²", (u) => (u.status === "sold" ? "—" : money(Math.round(u.price / u.area_sqm), currency))],
    ["Floor", (u) => u.floor],
    ["Aspect", (u) => u.orientation],
  ];
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Side-by-side comparison of selected residences</caption>
          <thead>
            <tr>
              <th scope="col" className="w-36 pb-4"><span className="sr-only">Attribute</span></th>
              {units.map((u) => (
                <th key={u.id} scope="col" className="pb-4 align-top font-normal">
                  <span className="font-display text-3xl">{u.code}</span>
                  <button className="ml-3 text-xs text-stone-400 hover:text-bone" onClick={() => onRemove(u.id)} aria-label={`Remove ${u.code} from comparison`}>Remove</button>
                  {plans?.[u.plan_type] && <FloorPlan plan={plans[u.plan_type]} className="mt-3 max-w-[220px]" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, render]) => (
              <tr key={label} className="border-t border-line/70">
                <th scope="row" className="py-3 text-xs font-normal uppercase tracking-[0.14em] text-stone-400">{label}</th>
                {units.map((u) => <td key={u.id} className="py-3 text-bone">{render(u)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button arrow onClick={onEnquire}>Enquire about these</Button>
        <Link to="/contact" className="min-h-11 px-3 py-3 text-xs uppercase tracking-[0.16em] text-stone-400 hover:text-bone">Talk to sales</Link>
      </div>
    </div>
  );
}
