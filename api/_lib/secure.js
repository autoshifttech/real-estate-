/* AES-256-GCM encryption for enquiries (names and phone numbers), keyed from SESSION_SECRET. */
"use strict";

const crypto = require("crypto");

function key() {
  return Buffer.from(crypto.hkdfSync("sha256", process.env.SESSION_SECRET, "tenkasi-land-promoters", "enquiries-v1", 32));
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") };
}

function decrypt(box) {
  const d = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(box.iv, "base64"));
  d.setAuthTag(Buffer.from(box.tag, "base64"));
  const out = Buffer.concat([d.update(Buffer.from(box.data, "base64")), d.final()]);
  return JSON.parse(out.toString("utf8"));
}

module.exports = { encrypt, decrypt };
