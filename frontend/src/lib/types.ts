export type UnitStatus = "available" | "reserved" | "sold";
export type LeadStage = "new" | "contacted" | "viewing" | "reserved" | "won" | "lost";
export type LeadSource = "website" | "explorer" | "brochure" | "contact" | "referral" | "portal" | "walk_in";

export const UNIT_STATUSES: UnitStatus[] = ["available", "reserved", "sold"];
export const LEAD_STAGES: LeadStage[] = ["new", "contacted", "viewing", "reserved", "won", "lost"];
export const LEAD_SOURCES: LeadSource[] = ["website", "explorer", "brochure", "contact", "referral", "portal", "walk_in"];

export interface Building {
  id: string;
  project_id: string;
  code: string;
  name: string;
  floors: number;
  units_per_floor: number;
  description: string;
  position: { x: number; z: number };
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  summary: string;
  description?: string;
  hero_image: string | null;
  gallery: string[];
  amenities: string[];
  completion: string;
  status: "launching" | "selling" | "sold_out";
  currency: string;
  published: boolean;
  unit_counts?: Record<UnitStatus, number>;
  price_from?: number | null;
  buildings?: Building[];
}

export interface Room {
  name: string;
  kind: "living" | "bed" | "bath" | "kitchen" | "hall" | "study" | "terrace";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Plan {
  type: string;
  label: string;
  beds: number;
  baths: number;
  width: number;
  depth: number;
  internal_sqm: number;
  terrace_sqm: number;
  rooms: Room[];
}

export interface Unit {
  id: string;
  project_id: string;
  building_id: string;
  code: string;
  floor: number;
  position: number;
  beds: number;
  baths: number;
  area_sqm: number;
  terrace_sqm: number;
  price: number;
  status: UnitStatus;
  orientation: string;
  plan_type: string;
  features: string[];
  updated_at?: string;
  price_history?: { price: number; at: string }[];
}

export interface UnitDetail extends Unit {
  plan: Plan | null;
  building: { code: string; name: string } | null;
  project: { slug: string; name: string; currency: string };
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body?: string;
  cover: string | null;
  author: string;
  published: boolean;
  published_at: string | null;
  updated_at?: string;
}

export interface UnitRef {
  unit_id: string;
  code: string;
  at?: string;
}

export interface Note {
  id: string;
  body: string;
  author: string;
  at: string;
  system?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: LeadSource;
  stage: LeadStage;
  unit_interest: UnitRef[];
  units_viewed: UnitRef[];
  notes: Note[];
  assignee: string;
  created_at: string;
  updated_at: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "agent";
}

export interface Stats {
  range_days: number;
  leads_total: number;
  leads_in_range: number;
  leads_per_day: { date: string; count: number }[];
  pipeline: Record<LeadStage, number>;
  sources: Record<string, number>;
  conversion_rate: number;
  win_rate: number;
  units_by_status: Record<UnitStatus, number>;
  units_by_building: Record<string, Record<UnitStatus, number>>;
  inventory_value: number;
  sold_value: number;
}
