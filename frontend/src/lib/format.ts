const formatters = new Map<string, Intl.NumberFormat>();

export function money(value: number, currency = "EUR", compact = false): string {
  const key = `${currency}:${compact}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 2 : 0,
      notation: compact ? "compact" : "standard",
    });
    formatters.set(key, f);
  }
  return f.format(value);
}

export const sqm = (value: number) => `${Math.round(value)} m²`;

export const floorLabel = (floor: number) => (floor === 0 ? "Ground" : `Floor ${floor}`);

export const STATUS_LABEL = { available: "Available", reserved: "Reserved", sold: "Sold" } as const;

export const STAGE_LABEL = {
  new: "New",
  contacted: "Contacted",
  viewing: "Viewing",
  reserved: "Reserved",
  won: "Won",
  lost: "Lost",
} as const;

export const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  explorer: "Explorer",
  brochure: "Brochure",
  contact: "Contact form",
  referral: "Referral",
  portal: "Property portal",
  walk_in: "Walk-in",
};

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diff < 60) return "just now";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  return rtf.format(-Math.round(diff / 86400), "day");
}
