/*
 * Enquiries from the website forms, stored encrypted in monthly files
 * (enquiries/2026-10.json) on the "admin-data" branch.
 */
"use strict";

const crypto = require("crypto");
const { store, DATA_BRANCH } = require("./store");
const { encrypt, decrypt } = require("./secure");

const STATUSES = ["new", "contacted", "closed"];

function monthOf(id) { return String(id).slice(0, 7); }   // ids start with YYYY-MM
function fileOf(month) { return "enquiries/" + month + ".json"; }

async function readMonth(month) {
  const f = await store().read(fileOf(month), DATA_BRANCH);
  if (!f) return { items: [], sha: null };
  return { items: decrypt(JSON.parse(f.text)), sha: f.sha };
}

/* read-modify-write with a retry when two saves race */
async function updateMonth(month, change, message) {
  await store().ensureBranch(DATA_BRANCH);
  for (let attempt = 0; attempt < 4; attempt++) {
    const cur = await readMonth(month);
    const next = change(cur.items.slice());
    if (next === null) return false;
    try {
      await store().commit([{ path: fileOf(month), content: JSON.stringify(encrypt(next)) }], message,
        { branch: DATA_BRANCH, expect: { [fileOf(month)]: cur.sha } });
      return true;
    } catch (e) {
      if (e.status !== 409 || attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));
    }
  }
}

async function add(fields) {
  const now = new Date();
  const id = now.toISOString().slice(0, 7) + "-" + now.getTime().toString(36) + crypto.randomBytes(3).toString("hex");
  const item = Object.assign({ id, at: now.toISOString(), status: "new" }, fields);
  await updateMonth(monthOf(id), (items) => { items.push(item); return items; }, "New enquiry");
  return id;
}

async function all(months) {
  const names = await store().list("enquiries", DATA_BRANCH);
  const recent = names.filter((n) => /^\d{4}-\d{2}\.json$/.test(n)).sort().reverse().slice(0, months || 12);
  const out = [];
  for (const n of recent) out.push.apply(out, (await readMonth(n.slice(0, 7))).items);
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

async function update(id, change) {
  if (!/^\d{4}-\d{2}-[a-z0-9]+$/.test(String(id))) throw Object.assign(new Error("Unknown enquiry"), { status: 400 });
  let found = false;
  await updateMonth(monthOf(id), (items) => {
    const i = items.findIndex((x) => x.id === id);
    if (i < 0) return null;
    found = true;
    if (change.delete) items.splice(i, 1);
    else {
      if (change.status) items[i].status = change.status;
      if (change.note != null) items[i].note = String(change.note).slice(0, 1000);
    }
    return items;
  }, change.delete ? "Delete enquiry" : "Update enquiry");
  if (!found) throw Object.assign(new Error("Enquiry not found"), { status: 404 });
}

const supa = require("./supabase");
module.exports = {
  add: (fields) => (supa.configured() ? supa.addEnquiry(fields) : add(fields)),
  all: (months) => (supa.configured() ? supa.allEnquiries() : all(months)),
  update: (id, change) => {
    if (!/^\d{4}-\d{2}-[a-z0-9]+$/.test(String(id))) throw Object.assign(new Error("Unknown enquiry"), { status: 400 });
    return supa.configured() ? supa.updateEnquiry(id, change) : update(id, change);
  },
  STATUSES
};
