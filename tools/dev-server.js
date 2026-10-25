/*
 * Local preview of the site and the admin API (no Vercel needed).
 *
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=change-me-now SESSION_SECRET=$(openssl rand -hex 32) node tools/dev-server.js
 *
 * Saves go straight to the files in this folder (TLP_STORAGE=fs); enquiries go to .data/.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

process.env.TLP_STORAGE = process.env.TLP_STORAGE || "fs";
process.env.GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const ROOT = path.resolve(__dirname, "..");
const PORT = +process.env.PORT || 8000;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/admin" || url.pathname === "/api/enquiry") {
    const mod = path.join(ROOT, "api", url.pathname.slice(5) + ".js");
    delete require.cache[require.resolve(mod)];
    return require(mod)(req, res);
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT) || file.includes(path.sep + ".")) { res.statusCode = 404; return res.end("Not found"); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(fs.readFileSync(path.join(ROOT, "404.html"))); }
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log("Site: http://localhost:" + PORT + "   Admin: http://localhost:" + PORT + "/admin/"));
