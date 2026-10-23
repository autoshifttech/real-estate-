import type { Building, Unit, UnitStatus } from "../lib/types";

export interface Filters {
  building: string | null;
  beds: number[];
  priceMin: number | null;
  priceMax: number | null;
  floorMin: number | null;
  floorMax: number | null;
  statuses: UnitStatus[];
}

export const DEFAULT_FILTERS: Filters = {
  building: null,
  beds: [],
  priceMin: null,
  priceMax: null,
  floorMin: null,
  floorMax: null,
  statuses: ["available", "reserved", "sold"],
};

export function applyFilters(units: Unit[], buildings: Building[], f: Filters): Unit[] {
  const buildingId = f.building ? buildings.find((b) => b.code === f.building)?.id : null;
  return units.filter(
    (u) =>
      (!f.building || u.building_id === buildingId) &&
      (f.beds.length === 0 || f.beds.includes(u.beds)) &&
      (f.priceMin === null || u.price >= f.priceMin) &&
      (f.priceMax === null || u.price <= f.priceMax) &&
      (f.floorMin === null || u.floor >= f.floorMin) &&
      (f.floorMax === null || u.floor <= f.floorMax) &&
      f.statuses.includes(u.status),
  );
}

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.beds.length) n++;
  if (f.priceMin !== null || f.priceMax !== null) n++;
  if (f.floorMin !== null || f.floorMax !== null) n++;
  if (f.statuses.length !== 3) n++;
  return n;
}

/** Nice round price steps for the min/max selects, spanning the inventory. */
export function priceSteps(units: Unit[]): number[] {
  if (!units.length) return [];
  const min = Math.min(...units.map((u) => u.price));
  const max = Math.max(...units.map((u) => u.price));
  const step = max - min > 2_000_000 ? 250_000 : 100_000;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step; v += step) out.push(v);
  return out;
}
