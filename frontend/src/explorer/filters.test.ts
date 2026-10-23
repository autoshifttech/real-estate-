import { describe, expect, it } from "vitest";
import type { Building, Unit } from "../lib/types";
import { activeFilterCount, applyFilters, DEFAULT_FILTERS, priceSteps } from "./filters";

const buildings = [
  { id: "a", code: "A" },
  { id: "b", code: "B" },
] as Building[];

function unit(over: Partial<Unit>): Unit {
  return {
    id: Math.random().toString(36),
    project_id: "p",
    building_id: "a",
    code: "A-101",
    floor: 1,
    position: 1,
    beds: 2,
    baths: 2,
    area_sqm: 96,
    terrace_sqm: 30,
    price: 900_000,
    status: "available",
    orientation: "South",
    plan_type: "B2",
    features: [],
    ...over,
  };
}

const units = [
  unit({ code: "A-101", beds: 1, price: 600_000 }),
  unit({ code: "A-501", beds: 4, floor: 5, price: 2_500_000, status: "reserved" }),
  unit({ code: "B-201", building_id: "b", floor: 2, beds: 3, price: 1_400_000, status: "sold" }),
];

describe("applyFilters", () => {
  it("returns everything by default", () => {
    expect(applyFilters(units, buildings, DEFAULT_FILTERS)).toHaveLength(3);
  });
  it("filters by building, beds, price, floor and status", () => {
    expect(applyFilters(units, buildings, { ...DEFAULT_FILTERS, building: "B" }).map((u) => u.code)).toEqual(["B-201"]);
    expect(applyFilters(units, buildings, { ...DEFAULT_FILTERS, beds: [1, 4] })).toHaveLength(2);
    expect(applyFilters(units, buildings, { ...DEFAULT_FILTERS, priceMax: 1_500_000 })).toHaveLength(2);
    expect(applyFilters(units, buildings, { ...DEFAULT_FILTERS, priceMin: 1_000_000, priceMax: 2_000_000 })).toHaveLength(1);
    expect(applyFilters(units, buildings, { ...DEFAULT_FILTERS, floorMin: 2 })).toHaveLength(2);
    expect(applyFilters(units, buildings, { ...DEFAULT_FILTERS, statuses: ["available"] })).toHaveLength(1);
  });
  it("counts active filters", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, beds: [2], priceMax: 1 })).toBe(2);
  });
  it("builds price steps that cover the range", () => {
    const steps = priceSteps(units);
    expect(steps[0]).toBeLessThanOrEqual(600_000);
    expect(steps[steps.length - 1]).toBeGreaterThanOrEqual(2_500_000);
  });
});
