/*
 * Supabase: database for the site content and enquiries, storage for photos and videos.
 *
 *   SUPABASE_URL          https://<project>.supabase.co
 *   SUPABASE_SECRET_KEY   the project's secret key (sb_secret_…) — or the legacy service_role key
 *                         (SUPABASE_SERVICE_ROLE_KEY). Server only: never put it in the website.
 *
 * Run supabase/setup.sql once in the Supabase SQL editor to create the tables and the bucket.
 * Tables have row-level security on with no public policies, so only this server can read or
 * write them; the "media" bucket is public to read (photos and videos on the website).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BUCKET = "media";

function base() { return String(process.env.SUPABASE_URL || "").replace(/\/+$/, ""); }
function key() { return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""; }
function configured() { return !!(base() && key()); }
function configError() {
  if (!base() && !key()) return null;   // not using Supabase
  if (!base()) return "Missing setting in Vercel: SUPABASE_URL";
  if (!key()) return "Missing setting in Vercel: SUPABASE_SECRET_KEY";
  const role = keyRole(key());
  if (role === "publishable" || role === "anon") return "SUPABASE_SECRET_KEY holds the " + (role === "anon" ? "anon" : "publishable") + " key. Use the secret key (sb_secret_…) or the service_role key from Supabase → Project Settings → API Keys, then redeploy";
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(base()) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base())) return "SUPABASE_URL should look like https://abcd1234.supabase.co";
  return null;
}

/* which kind of key this is: new keys say so in their prefix, legacy keys are JWTs with a role */
function keyRole(k) {
  if (/^sb_publishable_/.test(k)) return "publishable";
  if (/^sb_secret_/.test(k)) return "secret";
  try { return JSON.parse(Buffer.from(String(k).split(".")[1], "base64url").toString("utf8")).role || ""; } catch (e) { return ""; }
}

function headers(extra) {
  const k = key(), h = { apikey: k, "Content-Type": "application/json" };
  if (!/^sb_/.test(k)) h.Authorization = "Bearer " + k;   // legacy JWT keys also go in Authorization
  return Object.assign(h, extra || {});
}

async function call(method, url, body, extra, timeoutMs) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), timeoutMs || 10000);
  let res;
  try {
    res = await fetch(base() + url, { method, headers: headers(extra), body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    throw Object.assign(new Error(e.name === "AbortError" ? "Supabase did not answer in time" : "Could not reach Supabase"), { status: 502 });
  } finally { clearTimeout(t); }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const msg = data && (data.message || data.error_description || data.error || data.hint) || res.status;
    const hint = /relation .* does not exist|schema cache/i.test(String(msg)) ? " — run supabase/setup.sql in the Supabase SQL editor"
      : /permission denied/i.test(String(msg)) ? " — check that SUPABASE_SECRET_KEY is the secret (sb_secret_…) or service_role key, and run the latest supabase/setup.sql again" : "";
    throw Object.assign(new Error("Supabase: " + msg + hint), { status: res.status === 401 || res.status === 403 ? 502 : res.status >= 500 ? 502 : res.status });
  }
  return data;
}

/* ---------- site content: rows "config" and "data" in site_content ---------- */

/* the content files shipped with the site seed the database the first time */
function bundled(kind) {
  const file = path.join(__dirname, "..", "..", "assets", "js", kind + ".js");
  const text = fs.readFileSync(file, "utf8"), marker = "window." + (kind === "config" ? "TLP_CONFIG" : "TLP_DATA") + " =";
  const at = text.indexOf(marker);
  return JSON.parse(text.slice(at + marker.length, text.lastIndexOf(";")));
}

async function readContent(timeoutMs) {
  const rows = await call("GET", "/rest/v1/site_content?select=key,value,version&key=in.(config,data)", undefined, undefined, timeoutMs);
  const by = {};
  (rows || []).forEach((r) => { by[r.key] = r; });
  const missing = ["config", "data"].filter((k) => !by[k]);
  if (missing.length) {
    const seed = missing.map((k) => ({ key: k, value: bundled(k), version: 1 }));
    await call("POST", "/rest/v1/site_content", seed, { Prefer: "resolution=ignore-duplicates,return=minimal" }, timeoutMs);
    seed.forEach((r) => { by[r.key] = r; });
  }
  return { config: by.config.value, data: by.data.value, shas: { config: String(by.config.version), data: String(by.data.version) } };
}

/* save only if nobody else saved since we loaded (version check), else 409 */
async function saveContent(kind, value, expectVersion) {
  const v = parseInt(expectVersion, 10);
  if (!(v >= 1)) throw Object.assign(new Error("Reload the admin panel and try again"), { status: 409 });
  const rows = await call("PATCH", "/rest/v1/site_content?key=eq." + kind + "&version=eq." + v,
    { value, version: v + 1, updated_at: new Date().toISOString() }, { Prefer: "return=representation" });
  if (!rows || !rows.length) throw Object.assign(new Error("Someone else published changes since you opened the admin panel."), { status: 409 });
  return String(v + 1);
}

/* ---------- enquiries ---------- */

function toItem(r) { return Object.assign({}, r.data || {}, { id: r.id, at: r.created_at, status: r.status, note: r.note || undefined }); }

async function addEnquiry(fields, at) {
  const now = at ? new Date(at) : new Date();
  const id = now.toISOString().slice(0, 7) + "-" + now.getTime().toString(36) + crypto.randomBytes(3).toString("hex");
  const row = { id, created_at: now.toISOString(), status: fields.status || "new", data: Object.assign({}, fields) };
  if (fields.note) row.note = String(fields.note).slice(0, 1000);
  delete row.data.status; delete row.data.note;
  await call("POST", "/rest/v1/enquiries", row, { Prefer: "return=minimal" });
  return id;
}
async function allEnquiries() {
  const rows = await call("GET", "/rest/v1/enquiries?select=id,created_at,status,note,data&order=created_at.desc&limit=5000");
  return (rows || []).map(toItem);
}
async function updateEnquiry(id, change) {
  const q = "/rest/v1/enquiries?id=eq." + encodeURIComponent(id);
  let rows;
  if (change.delete) rows = await call("DELETE", q, undefined, { Prefer: "return=representation" });
  else {
    const patch = {};
    if (change.status) patch.status = change.status;
    if (change.note != null) patch.note = String(change.note).slice(0, 1000);
    rows = await call("PATCH", q, patch, { Prefer: "return=representation" });
  }
  if (!rows || !rows.length) throw Object.assign(new Error("Enquiry not found"), { status: 404 });
}

/* ---------- photos and videos: the browser uploads straight to Storage with a signed URL ---------- */

const MEDIA = {
  "image/webp": ["webp", 8], "image/jpeg": ["jpg", 8], "image/png": ["png", 8],
  "video/mp4": ["mp4", 50], "video/quicktime": ["mov", 50], "video/webm": ["webm", 50]
};
function publicPrefix() { return base() + "/storage/v1/object/public/" + BUCKET + "/"; }

async function signUpload(name, type, size) {
  const m = MEDIA[type];
  if (!m) throw Object.assign(new Error("Upload a JPG, PNG or WebP photo, or an MP4, MOV or WebM video"), { status: 400 });
  if (!(size > 0) || size > m[1] * 1024 * 1024) throw Object.assign(new Error((m[1] === 50 ? "Video" : "Photo") + " is too large (max " + m[1] + " MB)"), { status: 413 });
  const stem = String(name || "file").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "file";
  const file = "properties/" + stem + "-" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex") + "." + m[0];
  const d = await call("POST", "/storage/v1/object/upload/sign/" + BUCKET + "/" + file, {});
  if (!d || !d.url) throw Object.assign(new Error("Supabase did not return an upload link"), { status: 502 });
  return { uploadUrl: base() + "/storage/v1" + d.url, url: publicPrefix() + file };
}

module.exports = { configured, configError, readContent, saveContent, addEnquiry, allEnquiries, updateEnquiry, signUpload, publicPrefix, BUCKET };
