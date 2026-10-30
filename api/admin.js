/*
 * /api/admin?a=<action> — everything the admin panel does.
 *
 *   GET  status            setup check and who is signed in
 *   POST login             { username, password }
 *   POST logout
 *   GET  content           settings + site content, with version ids for safe saving
 *   POST publish           { config?, data?, shas } -> one commit, the site republishes
 *   POST upload            { name, dataUrl } -> photo saved to assets/img/properties/, video to assets/video/properties/
 *   GET  enquiries         inbox (decrypted)
 *   POST enquiry           { id, status? | note? | delete? }
 *
 * POST requests must carry the header "X-TLP-Admin: 1" (with the SameSite=Strict cookie this
 * blocks cross-site requests).
 */
"use strict";

const crypto = require("crypto");
const { send, fail, readJson, clientIp, limited } = require("./_lib/http");
const auth = require("./_lib/auth");
const storage = require("./_lib/store");
const content = require("./_lib/content");
const enquiries = require("./_lib/enquiries");
const supa = require("./_lib/supabase");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadContent() {
  if (supa.configured()) return supa.readContent();
  const s = storage.store();
  const [c, d] = await Promise.all([s.read(content.FILES.config), s.read(content.FILES.data)]);
  if (!c || !d) throw Object.assign(new Error("Could not find the content files in the repository"), { status: 500 });
  return { config: content.parse("config", c.text), data: content.parse("data", d.text), shas: { config: c.sha, data: d.sha } };
}

const IMAGE_TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const VIDEO_TYPES = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
function videoOk(buf, ext) {
  if (ext === "webm") return buf.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return buf.slice(4, 8).toString("latin1") === "ftyp" || buf.slice(4, 8).toString("latin1") === "moov";
}
function imageOk(buf, ext) {
  if (ext === "webp") return buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP";
  if (ext === "jpg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === "png") return buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

const actions = {
  async status(req, res) {
    const problems = [auth.configError(), storage.configError()].filter(Boolean);
    send(res, 200, { ok: true, configured: !problems.length, problems, user: auth.currentUser(req), storage: supa.configured() ? "Supabase" : process.env.TLP_STORAGE === "fs" ? "local files" : "GitHub" });
  },

  async login(req, res, body) {
    const problem = auth.configError();
    if (problem) return fail(res, 503, problem);
    const ip = clientIp(req);
    if (limited("login:" + ip, 8, 15 * 60 * 1000)) return fail(res, 429, "Too many attempts. Wait 15 minutes and try again.");
    if (!auth.checkLogin(body.username, body.password)) {
      await sleep(700 + Math.random() * 500);
      return fail(res, 401, "Wrong username or password");
    }
    send(res, 200, { ok: true, user: process.env.ADMIN_USERNAME }, { "Set-Cookie": auth.sessionCookie(req, process.env.ADMIN_USERNAME) });
  },

  async logout(req, res) {
    send(res, 200, { ok: true }, { "Set-Cookie": auth.clearCookie(req) });
  },

  async content(req, res) {
    const c = await loadContent();
    send(res, 200, Object.assign({ ok: true, scenes: content.SCENES }, c));
  },

  async publish(req, res, body) {
    const current = await loadContent();
    const files = [], expect = {}, what = [];
    if (body.config) {
      files.push({ path: content.FILES.config, content: content.serialize("config", content.cleanConfig(body.config)) });
      expect[content.FILES.config] = body.shas && body.shas.config;
      what.push("settings");
    }
    if (body.data) {
      files.push({ path: content.FILES.data, content: content.serialize("data", content.cleanData(body.data, current.data)) });
      expect[content.FILES.data] = body.shas && body.shas.data;
      what.push("content");
    }
    if (!files.length) return fail(res, 400, "Nothing to publish");
    if (supa.configured()) {
      const shas = Object.assign({}, current.shas);
      // check both versions before writing either, so a conflict never half-saves
      ["config", "data"].forEach((k) => { if (body[k] && String(body.shas && body.shas[k]) !== current.shas[k]) throw Object.assign(new Error("Someone else published changes since you opened the admin panel."), { status: 409 }); });
      for (const f of files) {
        const k = f.path === content.FILES.config ? "config" : "data";
        shas[k] = await supa.saveContent(k, content.parse(k, f.content), current.shas[k]);
      }
      return send(res, 200, { ok: true, shas });
    }
    const message = "Admin: update " + what.join(" and ") + (body.note ? " — " + String(body.note).slice(0, 120) : "");
    const commit = await storage.store().commit(files, message, { expect });
    const fresh = await loadContent();
    send(res, 200, { ok: true, commit, shas: fresh.shas });
  },

  /* Supabase: a one-time link the browser uploads the file to directly (videos are too big for this API) */
  async sign(req, res, body) {
    if (!supa.configured()) return fail(res, 400, "Uploads go through the upload action here");
    send(res, 200, Object.assign({ ok: true }, await supa.signUpload(body.name, body.type, Number(body.size))));
  },

  /* move enquiries kept in a browser (before the database was connected) into the inbox */
  async import(req, res, body) {
    const items = Array.isArray(body.items) ? body.items.slice(0, 500) : [];
    const F = { name: 80, phone: 30, intent: 10, property: 160, plot: 60, region: 120, type: 60, budget: 60, area: 80, date: 20, message: 1500, page: 200, note: 1000 };
    let n = 0;
    for (const x of items) {
      if (!x || typeof x !== "object" || !x.name || !x.phone) continue;
      const rec = {};
      Object.keys(F).forEach((k) => { if (x[k]) rec[k] = String(x[k]).trim().slice(0, F[k]); });
      rec.status = enquiries.STATUSES.indexOf(x.status) >= 0 ? x.status : "new";
      const at = Date.parse(x.at);
      if (supa.configured()) await supa.addEnquiry(rec, isFinite(at) ? at : undefined); else await enquiries.add(rec);
      n++;
    }
    send(res, 200, { ok: true, count: n });
  },

  async upload(req, res, body) {
    const v = /^data:(video\/(?:mp4|quicktime|webm));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl || ""));
    const m = v || /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl || ""));
    if (!m) return fail(res, 400, "Upload a JPG, PNG or WebP photo, or an MP4, MOV or WebM video");
    const ext = v ? VIDEO_TYPES[m[1]] : IMAGE_TYPES[m[1]], buf = Buffer.from(m[2], "base64");
    if (buf.length > 3 * 1024 * 1024) return fail(res, 413, v ? "Video is too large (max 3 MB)" : "Photo is too large (max 3 MB after resizing)");
    if (!(v ? videoOk(buf, ext) : imageOk(buf, ext))) return fail(res, 400, v ? "That file is not a valid video" : "That file is not a valid image");
    const base = String(body.name || (v ? "video" : "photo")).toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || (v ? "video" : "photo");
    const file = (v ? "assets/video/properties/" : "assets/img/properties/") + base + "-" + crypto.randomBytes(3).toString("hex") + "." + ext;
    await storage.store().commit([{ path: file, content: buf }], "Admin: add " + (v ? "video " : "photo ") + file.split("/").pop());
    send(res, 200, { ok: true, path: file });
  },

  async enquiries(req, res) {
    send(res, 200, { ok: true, items: await enquiries.all(12) });
  },

  async enquiry(req, res, body) {
    const change = {};
    if (body.delete) change.delete = true;
    if (body.status) {
      if (enquiries.STATUSES.indexOf(body.status) < 0) return fail(res, 400, "Unknown status");
      change.status = body.status;
    }
    if (body.note != null) change.note = body.note;
    await enquiries.update(body.id, change);
    send(res, 200, { ok: true });
  }
};

const PUBLIC = { status: "GET", login: "POST" };
const METHOD = { logout: "POST", content: "GET", publish: "POST", upload: "POST", sign: "POST", import: "POST", enquiries: "GET", enquiry: "POST" };

module.exports = async function (req, res) {
  const a = new URL(req.url, "http://x").searchParams.get("a") || "";
  const method = PUBLIC[a] || METHOD[a];
  if (!method) return fail(res, 404, "Unknown action");
  if (req.method !== method) return fail(res, 405, "Method not allowed");
  if (method === "POST" && req.headers["x-tlp-admin"] !== "1") return fail(res, 403, "Forbidden");
  if (!PUBLIC[a]) {
    const problem = auth.configError() || storage.configError();
    if (problem) return fail(res, 503, problem);
    if (!auth.currentUser(req)) return fail(res, 401, "Please sign in again", { signedOut: true });
  }
  try {
    const body = method === "POST" ? await readJson(req) : {};
    await actions[a](req, res, body || {});
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    if (status >= 500) console.error("admin", a, e);
    fail(res, status, status === 500 ? "Something went wrong: " + e.message : e.message);
  }
};
