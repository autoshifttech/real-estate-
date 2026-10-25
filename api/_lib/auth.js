/*
 * Admin sign-in: one username and password from environment variables, and a signed,
 * HttpOnly session cookie.
 *
 *   ADMIN_USERNAME   the admin username
 *   ADMIN_PASSWORD   the admin password (at least 10 characters)
 *   SESSION_SECRET   long random string (at least 32 characters) used to sign sessions
 *                    and to encrypt enquiries — do not change it once enquiries exist
 */
"use strict";

const crypto = require("crypto");
const { parseCookies, isHttps } = require("./http");

const COOKIE = "tlp_admin";
const TTL = 12 * 60 * 60 * 1000; // 12 hours

function configError() {
  const missing = [];
  if (!process.env.ADMIN_USERNAME) missing.push("ADMIN_USERNAME");
  if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");
  if (missing.length) return "Missing settings in Vercel: " + missing.join(", ");
  if (process.env.ADMIN_PASSWORD.length < 10) return "ADMIN_PASSWORD must be at least 10 characters";
  if (process.env.SESSION_SECRET.length < 32) return "SESSION_SECRET must be at least 32 characters";
  return null;
}

function sameText(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function checkLogin(username, password) {
  // evaluate both so timing doesn't reveal which one was wrong
  const u = sameText(username || "", process.env.ADMIN_USERNAME);
  const p = sameText(password || "", process.env.ADMIN_PASSWORD);
  return u && p;
}

function sign(payload) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url");
}

function sessionCookie(req, username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + TTL })).toString("base64url");
  const value = payload + "." + sign(payload);
  return COOKIE + "=" + value + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + TTL / 1000 + (isHttps(req) ? "; Secure" : "");
}

function clearCookie(req) {
  return COOKIE + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + (isHttps(req) ? "; Secure" : "");
}

/* Returns the signed-in username, or null. */
function currentUser(req) {
  if (configError()) return null;
  const raw = parseCookies(req)[COOKIE];
  if (!raw || raw.indexOf(".") < 0) return null;
  const [payload, sig] = raw.split(".");
  const expect = sign(payload);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now() || data.u !== process.env.ADMIN_USERNAME) return null;
    return data.u;
  } catch (e) {
    return null;
  }
}

module.exports = { configError, checkLogin, sessionCookie, clearCookie, currentUser };
