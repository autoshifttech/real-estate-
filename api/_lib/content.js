/*
 * Reading, checking and writing the two content files the public site loads:
 *   assets/js/config.js  ->  window.TLP_CONFIG = {...};
 *   assets/js/data.js    ->  window.TLP_DATA = {...};
 * Everything coming from the admin panel is rebuilt field by field here, so a bad value
 * can never break the site or inject markup.
 */
"use strict";

const FILES = { config: "assets/js/config.js", data: "assets/js/data.js" };
const VARS = { config: "TLP_CONFIG", data: "TLP_DATA" };
const HEADERS = {
  config: "/* Business details — managed by the admin panel (/admin). Strict JSON after the \"=\"; edit with care. */\n",
  data: "/* Site content: regions, types, budgets, properties, steps and FAQs — managed by the admin panel (/admin). Strict JSON after the \"=\"; edit with care. */\n"
};
const SCENES = ["plots", "plots-b", "plots-close", "house", "ghats", "farm", "farm-b", "mango", "river", "coast", "plains", "highway", "hills", "tea"];
const ART_KINDS = ["plan", "ghats", "farm", "hills", "river", "coast", "plains", "highway"];
const STATUSES = ["available", "few", "sold"];
const SOCIALS = ["instagram", "youtube", "facebook", "x", "linkedin", "telegram", "pinterest", "whatsapp", "threads", "website"];

function bad(msg) { return Object.assign(new Error(msg), { status: 400 }); }

function parse(kind, text) {
  const marker = "window." + VARS[kind] + " =";
  const at = text.indexOf(marker);
  const start = at < 0 ? -1 : at + marker.length - 1;
  const end = text.lastIndexOf(";");
  if (start < 0 || end < start) throw new Error(FILES[kind] + " is not in the expected format");
  return JSON.parse(text.slice(start + 1, end));
}
function serialize(kind, obj) {
  return HEADERS[kind] + "window." + VARS[kind] + " = " + JSON.stringify(obj, null, 2) + ";\n";
}

/* ---------- field helpers ---------- */
function str(v, max, field, required) {
  const s = v == null ? "" : String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (required && !s) throw bad(field + " is required");
  if (s.length > max) throw bad(field + " is too long (max " + max + " characters)");
  return s;
}
function num(v, field, min, max) {
  const n = Number(v);
  if (!isFinite(n) || n < min || n > max) throw bad(field + " must be a number between " + min + " and " + max);
  return n;
}
function url(v, field) {
  const s = str(v, 400, field);
  if (s && !/^https:\/\/[^\s"'<>]+$/i.test(s)) throw bad(field + " must be a full https:// link");
  return s;
}
function slug(v, field) {
  const s = str(v, 60, field, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) throw bad(field + " may only use lowercase letters, numbers and dashes");
  return s;
}
function list(v, field, max) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw bad(field + " must be a list");
  if (v.length > max) throw bad(field + ": at most " + max + " items");
  return v;
}
function ints(v, field, limit) {
  return list(v, field, 1000).map((x) => num(x, field, 0, limit - 1) | 0).filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => a - b);
}

/* ---------- config ---------- */
function cleanConfig(c) {
  if (!c || typeof c !== "object") throw bad("Settings are missing");
  const whatsapp = str(c.whatsapp, 20, "WhatsApp number").replace(/\D/g, "");
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) throw bad("WhatsApp number must include the country code, e.g. 919876543210");
  const email = str(c.email, 120, "Email");
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) throw bad("Email address is not valid");
  const stats = c.stats || {};
  return {
    name: str(c.name, 80, "Business name", true),
    shortName: str(c.shortName, 30, "Short name", true),
    tagline: str(c.tagline, 60, "Tagline"),
    taglineTamil: str(c.taglineTamil, 120, "Tamil tagline"),
    phone: str(c.phone, 30, "Phone"),
    whatsapp,
    email,
    address: str(c.address, 200, "Address"),
    mapQuery: str(c.mapQuery, 200, "Map location"),
    hours: str(c.hours, 100, "Opening hours"),
    instagram: url(c.instagram, "Instagram link"),
    youtube: url(c.youtube, "YouTube link"),
    threads: url(c.threads, "Threads link"),
    socials: list(c.socials, "More accounts", 12).map(function (x, i) {
      x = x || {};
      const f = "Account " + (i + 1);
      const platform = SOCIALS.indexOf(x.platform) >= 0 ? x.platform : "website";
      const link = url(x.url, f + " link");
      if (!link) throw bad(f + ": add the link or remove the account");
      const out = { platform, url: link };
      const label = str(x.label, 40, f + " name");
      if (label) out.label = label;
      return out;
    }),
    stats: {
      followers: str(stats.followers, 20, "Followers"),
      videos: str(stats.videos, 20, "Videos"),
      regions: str(stats.regions, 20, "Regions")
    },
    formEndpoint: url(c.formEndpoint, "Form endpoint")
  };
}

/* ---------- data ---------- */
function cleanArt(a, fallbackKind) {
  a = a && typeof a === "object" ? a : {};
  const out = { kind: ART_KINDS.indexOf(a.kind) >= 0 ? a.kind : fallbackKind, seed: num(a.seed == null ? 1 : a.seed, "Art seed", 1, 9999) | 0 };
  if (a.trees === "mango") out.trees = "mango";
  if (a.tea === true) out.tea = true;
  if (a.house === true) out.house = true;
  if (a.highlight != null) out.highlight = num(a.highlight, "Art highlight", 0, 999) | 0;
  return out;
}
function cleanScene(v, field) {
  const s = str(v, 30, field);
  if (s && SCENES.indexOf(s) < 0) throw bad(field + " is not a known image");
  return s;
}

function cleanRegion(r, i) {
  const f = "Region " + (i + 1);
  const out = {
    id: slug(r.id, f + " id"),
    name: str(r.name, 40, f + " name", true),
    ta: str(r.ta, 60, f + " Tamil name"),
    lat: num(r.lat, f + " latitude", 5, 15),
    lng: num(r.lng, f + " longitude", 72, 82),
    blurb: str(r.blurb, 300, f + " description"),
    art: cleanArt(r.art, "ghats")
  };
  const scene = cleanScene(r.scene, f + " image");
  if (scene) out.scene = scene;
  return out;
}

const TYPE_ART = { plot: "plan", farm: "farm", estate: "hills", commercial: "highway", house: "plan" };

function cleanProperty(p, i, regionIds, typeIds) {
  const f = (p && p.title ? '"' + String(p.title).slice(0, 40) + '"' : "Property " + (i + 1));
  if (!p || typeof p !== "object") throw bad(f + " is not valid");
  const out = {
    id: slug(p.id, f + ": web address (id)"),
    title: str(p.title, 80, f + ": title", true),
    region: str(p.region, 40, f + ": region", true),
    type: str(p.type, 30, f + ": type", true),
    location: str(p.location, 120, f + ": location", true),
    price: num(p.price, f + ": price", 0, 1e11),
    priceNote: ["onwards", "total", "per cent", "per acre", "per sq.ft"].indexOf(p.priceNote) >= 0 ? p.priceNote : "total",
    area: str(p.area, 80, f + ": area", true),
    approval: str(p.approval, 80, f + ": approval", true),
    facing: str(p.facing, 60, f + ": facing"),
    road: str(p.road, 80, f + ": road access"),
    status: STATUSES.indexOf(p.status) >= 0 ? p.status : "available",
    featured: !!p.featured,
    summary: str(p.summary, 220, f + ": short summary", true),
    description: str(p.description, 3000, f + ": description"),
    highlights: list(p.highlights, f + ": highlights", 12).map((h) => str(h, 140, f + ": highlight")).filter(Boolean),
    nearby: list(p.nearby, f + ": nearby places", 12).map((n) => ({ name: str(n && n.name, 80, f + ": nearby place"), dist: str(n && n.dist, 30, f + ": distance") })).filter((n) => n.name),
    art: cleanArt(p.art, TYPE_ART[p.type] || "plan")
  };
  if (regionIds.indexOf(out.region) < 0) throw bad(f + ": unknown region");
  if (typeIds.indexOf(out.type) < 0) throw bad(f + ": unknown type");
  const scene = cleanScene(p.scene, f + ": image");
  if (scene) out.scene = scene;
  const image = str(p.image, 200, f + ": photo");
  if (image) {
    if (!/^assets\/img\/properties\/[a-z0-9-]+\.(webp|jpg|jpeg|png)$/.test(image)) throw bad(f + ": photo path is not valid");
    out.image = image;
  }
  const video = url(p.video, f + ": video link");
  if (video) out.video = video;
  if (p.coords && (p.coords[0] !== "" && p.coords[0] != null)) out.coords = [num(p.coords[0], f + ": latitude", -90, 90), num(p.coords[1], f + ": longitude", -180, 180)];
  if (p.layout) {
    const L = p.layout, rows = num(L.rows, f + ": layout rows", 1, 20) | 0, cols = num(L.cols, f + ": layout columns", 1, 30) | 0, n = rows * cols;
    out.layout = {
      rows, cols,
      plotSize: str(L.plotSize, 30, f + ": plot size", true),
      sold: L.sold === "all" ? "all" : ints(L.sold, f + ": sold plots", n),
      booked: ints(L.booked, f + ": booked plots", n)
    };
  }
  return out;
}

/* current: the data file as stored now (types and budgets are kept from it) */
function cleanData(d, current) {
  if (!d || typeof d !== "object") throw bad("Content is missing");
  const regions = list(d.regions, "Regions", 30).map(cleanRegion);
  if (!regions.length) throw bad("Keep at least one region");
  const regionIds = regions.map((r) => r.id);
  if (new Set(regionIds).size !== regionIds.length) throw bad("Two regions have the same id");
  const types = current.types, typeIds = types.map((t) => t.id);
  const properties = list(d.properties, "Properties", 500).map((p, i) => cleanProperty(p, i, regionIds, typeIds));
  const ids = properties.map((p) => p.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw bad('Two properties use the web address "' + dup + '"');
  return {
    regions,
    types,
    budgets: current.budgets,
    properties,
    process: list(d.process, "Steps", 10).map((s, i) => ({ title: str(s && s.title, 60, "Step " + (i + 1) + " title", true), text: str(s && s.text, 300, "Step " + (i + 1) + " text") })),
    faqs: list(d.faqs, "FAQs", 30).map((q, i) => ({ q: str(q && q.q, 160, "Question " + (i + 1), true), a: str(q && q.a, 1200, "Answer " + (i + 1), true) }))
  };
}

module.exports = { FILES, SCENES, parse, serialize, cleanConfig, cleanData, bad };
