/*
 * POST /api/enquiry — called by the website forms (they still open WhatsApp as well).
 * Saves the enquiry, encrypted, for the admin panel's inbox.
 */
"use strict";

const { send, fail, readJson, clientIp, limited } = require("./_lib/http");
const auth = require("./_lib/auth");
const storage = require("./_lib/store");
const enquiries = require("./_lib/enquiries");

const FIELDS = { intent: 10, property: 160, plot: 60, region: 120, type: 60, budget: 60, area: 80, date: 20, message: 1500, page: 200 };

module.exports = async function (req, res) {
  if (req.method !== "POST") return fail(res, 405, "Method not allowed");
  if (auth.configError() || storage.configError()) return fail(res, 503, "Enquiries are not set up");
  if (limited("enq:" + clientIp(req), 6, 10 * 60 * 1000)) return fail(res, 429, "Too many enquiries, please try again later");
  let b;
  try { b = await readJson(req); } catch (e) { return fail(res, 400, "Bad request"); }
  if (!b || typeof b !== "object") return fail(res, 400, "Bad request");
  if (b.website) return send(res, 200, { ok: true });   // honeypot field: bots fill it, people never see it
  const name = String(b.name || "").trim().slice(0, 80);
  const phone = String(b.phone || "").trim().slice(0, 30);
  if (!name || phone.replace(/\D/g, "").length < 10) return fail(res, 400, "Name and a valid phone number are required");
  const rec = { name, phone };
  Object.keys(FIELDS).forEach((k) => { if (b[k]) rec[k] = String(b[k]).trim().slice(0, FIELDS[k]); });
  if (rec.intent !== "sell") rec.intent = "buy";
  try {
    await enquiries.add(rec);
    send(res, 200, { ok: true });
  } catch (e) {
    console.error("enquiry", e);
    fail(res, 500, "Could not save the enquiry");
  }
};
