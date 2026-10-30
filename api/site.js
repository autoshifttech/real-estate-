/*
 * GET /api/site — the live site content as a script:
 *   window.TLP_CONFIG = {...}; window.TLP_DATA = {...}; window.TLP_LIVE = true;
 * Every page loads it right after the built-in copy (assets/js/config.js, data.js), so what the
 * admin publishes to Supabase shows on the site within seconds. Vercel's CDN caches it briefly.
 * Without Supabase (or if it can't be reached) it returns an empty script and the built-in copy is used.
 */
"use strict";

const supa = require("./_lib/supabase");

function js(v) {   // JSON that is safe inside a script
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

module.exports = async function (req, res) {
  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!supa.configured() || supa.configError()) {
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.end("/* built-in content */\n");
  }
  try {
    const c = await supa.readContent(4000);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=5, stale-while-revalidate=30");
    res.end("window.TLP_CONFIG = " + js(c.config) + ";\nwindow.TLP_DATA = " + js(c.data) + ";\nwindow.TLP_LIVE = true;\n");
  } catch (e) {
    console.error("site", e);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=5");
    res.end("/* live content unavailable, using the built-in copy */\n");
  }
};
