/*
 * Admin panel for Tenkasi Land Promoters.
 * Talks to /api/admin. Edits are kept here as a draft until "Publish" sends them in one save.
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var S = { user: null, config: null, data: null, shas: null, scenes: [], dirty: { config: false, data: false }, view: "dashboard", edit: null, enquiries: null, filter: { q: "", region: "", status: "" }, enqTab: "new", previews: {} };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, root) { return (root || app).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || app).querySelectorAll(sel)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function price(n) {
    n = Number(n) || 0;
    var t = function (x) { return String(parseFloat(x.toFixed(2))); };
    if (n >= 1e7) return "₹" + t(n / 1e7) + " Cr";
    if (n >= 1e5) return "₹" + t(n / 1e5) + " L";
    return "₹" + n.toLocaleString("en-IN");
  }
  function slugify(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 86400 * 7) return Math.floor(s / 86400) + " d ago";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function region(id) { return (S.data.regions.filter(function (r) { return r.id === id; })[0] || {}); }
  function typeLabel(id) { var t = S.data.types.filter(function (x) { return x.id === id; })[0]; return t ? t.label : id; }
  var STATUS = { available: "Available", few: "Few left", sold: "Sold out" };
  var BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  /* src attribute for a property's cover: uploaded photo or the illustration */
  function coverAttr(p) {
    var c = (p.images && p.images[0]) || p.image;
    return c ? mediaAttr(c) : 'src="../assets/img/scenes/' + esc(p.scene || "plots") + '.webp"';
  }

  var ICON = {
    paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
    list: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
    inbox: '<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
    map: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H4"/>',
    up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    back: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2 1.8 3.5 3.8 4.2l1.2-1.1 2 .9-.4 1.6c-3.6.4-7.8-3.5-7.5-7.3l1.6-.4.9 2z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + "</svg>"; }
  var MARK = '<span class="brand-badge"><svg class="brand-mark" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 25 L12 11 L17 17.5 L23.5 7 L38 25"/><path d="M7 31 L20 27 L33 31 L20 35 Z"/></svg></span>';

  function toast(msg, isErr) {
    var t = document.createElement("div");
    t.className = "toast" + (isErr ? " is-error" : "");
    t.textContent = msg;
    document.getElementById("toasts").appendChild(t);
    setTimeout(function () { t.remove(); }, isErr ? 7000 : 4000);
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (resolve) {
      var back = document.createElement("div");
      back.className = "modal-back";
      back.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-t"><h2 id="m-t">' + esc(title) + "</h2><p>" + esc(text) + '</p><div class="actions-row"><button class="btn btn-light" data-r="0">Cancel</button><button class="btn ' + (danger ? "btn-danger" : "btn-primary") + '" data-r="1">' + esc(okLabel || "OK") + "</button></div></div>";
      document.body.appendChild(back);
      var prev = document.activeElement;
      back.querySelector('[data-r="1"]').focus();
      function done(v) { back.remove(); document.removeEventListener("keydown", key); if (prev) prev.focus(); resolve(v); }
      function key(e) { if (e.key === "Escape") done(false); }
      document.addEventListener("keydown", key);
      back.addEventListener("click", function (e) { if (e.target === back) done(false); var b = e.target.closest("[data-r]"); if (b) done(b.dataset.r === "1"); });
    });
  }

  /* ---------- demo mode ----------
   * Used while the real admin is not set up (no Vercel settings yet): sign in with the demo
   * account and every change is kept in THIS browser only (localStorage), where the public site
   * also picks it up — enough to present the site to a client. Nothing reaches other visitors.
   * The demo password is stored only as a SHA-256 hash.
   */
  var DEMO = { on: false, user: "admin", hash: "7676aaafb027c825bd9abab78b234070e702752f625b752e55e55b48e607e358", key: "tlp-demo-content", enq: "tlp-demo-enquiries" };
  var SCENES = ["plots", "plots-b", "plots-close", "house", "ghats", "farm", "farm-b", "mango", "river", "coast", "plains", "highway", "hills", "tea"];
  function sha256(text) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }
  function readJsPayload(url, name) {
    return fetch(url, { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
      var m = "window." + name + " =", i = t.indexOf(m);
      return JSON.parse(t.slice(i + m.length, t.lastIndexOf(";")));
    });
  }
  function lsGet(k, fallback) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { throw new Error("Storage is full. Remove some uploaded photos and try again."); }
  }
  function demoApi(action, body) {
    var wait = function (v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 250); }); };
    if (action === "login") {
      return sha256(body.password || "").then(function (h) {
        if (body.username !== DEMO.user || h !== DEMO.hash) return new Promise(function (_, rej) { setTimeout(function () { rej(new Error("Wrong username or password")); }, 700); });
        try { sessionStorage.setItem("tlp-demo-auth", "1"); } catch (e) { /* session only */ }
        return { ok: true, user: DEMO.user };
      });
    }
    if (action === "logout") { try { sessionStorage.removeItem("tlp-demo-auth"); } catch (e) {} return wait({ ok: true }); }
    if (action === "content") {
      var saved = lsGet(DEMO.key, {});
      return Promise.all([
        saved.config ? saved.config : readJsPayload("../assets/js/config.js", "TLP_CONFIG"),
        saved.data ? saved.data : readJsPayload("../assets/js/data.js", "TLP_DATA")
      ]).then(function (r) { return { ok: true, config: r[0], data: r[1], shas: {}, scenes: SCENES }; });
    }
    if (action === "publish") {
      var cur = lsGet(DEMO.key, {});
      if (body.config) cur.config = body.config;
      if (body.data) cur.data = body.data;
      try { lsSet(DEMO.key, cur); } catch (e) { return Promise.reject(e); }
      return wait({ ok: true, shas: {} });
    }
    if (action === "enquiries") return wait({ ok: true, items: lsGet(DEMO.enq, []) });
    if (action === "enquiry") {
      var items = lsGet(DEMO.enq, []);
      items = body.delete ? items.filter(function (x) { return x.id !== body.id; }) : items.map(function (x) { if (x.id === body.id && body.status) x.status = body.status; return x; });
      lsSet(DEMO.enq, items);
      return wait({ ok: true });
    }
    return Promise.reject(new Error("This action is not available yet"));
  }
  function startDemo() {
    DEMO.on = true;
    var signed = false;
    try { signed = sessionStorage.getItem("tlp-demo-auth") === "1"; } catch (e) {}
    if (!signed) return renderLogin();
    S.user = DEMO.user;
    return loadContent().then(renderShell);
  }

  function api(action, body) {
    if (DEMO.on) return demoApi(action, body);
    var opts = { method: body ? "POST" : "GET", credentials: "same-origin", headers: { Accept: "application/json" } };
    if (body) { opts.headers["Content-Type"] = "application/json"; opts.headers["X-TLP-Admin"] = "1"; opts.body = JSON.stringify(body); }
    return fetch("/api/admin?a=" + action, opts).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: "The server returned an unexpected response (" + r.status + ")." }; }).then(function (d) {
        if (r.status === 401 && d.signedOut && action !== "login") { S.user = null; renderLogin("Your session ended. Please sign in again."); }
        if (!r.ok || !d.ok) throw Object.assign(new Error(d.error || "Request failed"), { status: r.status, data: d });
        return d;
      });
    }, function () { throw new Error("Could not reach the server. Check your connection."); });
  }

  /* ---------- start ---------- */
  function boot() {
    fetch("/api/admin?a=status", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (st) {
      if (!st.configured) return startDemo();
      S.storage = st.storage;
      if (!st.user) return renderLogin();
      S.user = st.user;
      return loadContent().then(renderShell);
    }).catch(function () { startDemo(); });
  }

  function loadContent() {
    return api("content").then(function (d) {
      S.config = d.config; S.data = d.data; S.shas = d.shas; S.scenes = d.scenes;
      S.dirty = { config: false, data: false };
    });
  }

  function renderSetup(problems) {
    app.innerHTML = '<main class="auth"><div class="auth-card" style="width:min(640px,100%)"><a class="brand" href="../index.html">' + MARK + '<span class="brand-word"><strong>Tenkasi</strong><small>Admin setup</small></span></a>' +
      "<h1>Finish setting up the admin</h1><p>Add these settings in Vercel, then redeploy.</p>" +
      problems.map(function (p) { return '<p class="alert">' + esc(p) + "</p>"; }).join("") +
      '<ol class="setup-list">' +
      "<li>Open <b>vercel.com → your project → Settings → Environment Variables</b>.</li>" +
      "<li>Add <code>ADMIN_USERNAME</code> — the name you will sign in with.</li>" +
      "<li>Add <code>ADMIN_PASSWORD</code> — at least 8 characters.</li>" +
      "<li>Add <code>SESSION_SECRET</code> — a long random string (32+ characters). Never change it later: it also unlocks saved enquiries.</li>" +
      "<li>Add <code>GITHUB_TOKEN</code> — a GitHub fine-grained token for this repository with <b>Contents: Read and write</b>.</li>" +
      "<li>Go to <b>Deployments → ⋯ → Redeploy</b>, then reload this page.</li></ol></div></main>";
  }

  function renderLogin(msg) {
    app.innerHTML = '<main class="auth"><div class="auth-card"><a class="brand" href="../index.html">' + MARK + '<span class="brand-word"><strong>Tenkasi</strong><small>Admin</small></span></a>' +
      "<h1>Sign in</h1><p>Manage properties, enquiries and website content.</p>" +
      '<form id="login" novalidate>' + (msg ? '<p class="alert is-info">' + esc(msg) + "</p>" : "") +
      '<div class="field"><label for="u">Username</label><input id="u" name="username" autocomplete="username" required></div>' +
      '<div class="field"><label for="p">Password</label><div class="pw-wrap"><input id="p" name="password" type="password" autocomplete="current-password" required><button type="button" class="pw-toggle" aria-pressed="false">Show</button></div></div>' +
      '<p class="alert" id="login-err" hidden></p>' +
      '<button class="btn btn-primary" type="submit">Sign in</button></form></div></main>';
    var f = $("#login"), err = $("#login-err"), tg = $(".pw-toggle");
    $("#u").focus();
    tg.addEventListener("click", function () { var p = $("#p"), on = p.type === "password"; p.type = on ? "text" : "password"; tg.textContent = on ? "Hide" : "Show"; tg.setAttribute("aria-pressed", String(on)); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("button[type=submit]", f);
      if (!f.username.value.trim() || !f.password.value) { err.hidden = false; err.textContent = "Enter your username and password."; return; }
      btn.disabled = true; btn.classList.add("is-loading"); err.hidden = true;
      api("login", { username: f.username.value.trim(), password: f.password.value }).then(function (d) {
        S.user = d.user;
        return loadContent().then(renderShell);
      }).catch(function (e2) {
        err.hidden = false; err.textContent = e2.message;
        btn.disabled = false; btn.classList.remove("is-loading");
        f.password.select();
      });
    });
  }

  /* ---------- shell ---------- */
  /* The website now sends every visitor to WhatsApp, so the enquiries inbox is switched off.
     Set to true to bring back the Enquiries tab and the dashboard panels (the code is kept). */
  var SHOW_ENQUIRIES = false;
  var NAV = [
    ["dashboard", "Dashboard", "home"], ["properties", "Properties", "list"], ["enquiries", "Enquiries", "inbox"],
    ["regions", "Regions", "map"], ["content", "Steps & FAQs", "help"], ["settings", "Settings", "cog"]
  ];
  var TITLES = { dashboard: "Dashboard", properties: "Properties", enquiries: "Enquiries", regions: "Regions", content: "Steps & FAQs", settings: "Site settings", editor: "Edit property" };

  function renderShell() {
    app.innerHTML = '<div class="shell"><header class="gbar"><div class="gbar-inner glass">' +
      '<a class="brand" href="../index.html" target="_blank" rel="noopener" aria-label="Tenkasi admin — open the website">' + MARK + '<span class="brand-word"><strong>Tenkasi</strong><small>Admin</small></span></a>' +
      '<nav class="gtabs" aria-label="Admin"><span class="gtab-pill" aria-hidden="true"></span>' + NAV.filter(function (n) { return SHOW_ENQUIRIES || n[0] !== "enquiries"; }).map(function (n) { return '<button type="button" class="gtab" data-view="' + n[0] + '">' + n[1] + (n[0] === "enquiries" ? '<span class="count" id="new-count" hidden></span>' : "") + "</button>"; }).join("") + "</nav>" +
      '<div class="gbar-end"><a class="gbtn" href="../index.html" target="_blank" rel="noopener" aria-label="View website" title="View website">' + icon("ext") + '</a><button type="button" class="gbtn" id="logout" aria-label="Sign out (' + esc(S.user) + ')" title="Sign out">' + icon("out") + "</button></div>" +
      "</div></header>" +
      '<div class="main"><div class="pagehead"><h1 id="title"></h1><div class="publish" id="publish"></div></div><main class="content" id="view"></main></div></div>';
    $$(".gtabs [data-view]").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.view); }); });
    window.addEventListener("resize", movePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
    liquidGlass($(".gbar-inner"));
    $("#logout").addEventListener("click", function () {
      var leave = function () { api("logout", {}).then(function () { S.user = null; renderLogin("You have signed out."); }); };
      if (isDirty()) confirmBox("Sign out?", "You have unpublished changes. They will be lost.", "Sign out", true).then(function (ok) { if (ok) leave(); });
      else leave();
    });
    go(S.view === "editor" || (!SHOW_ENQUIRIES && S.view === "enquiries") ? "properties" : S.view);
    if (SHOW_ENQUIRIES) refreshEnquiryCount();
  }

  /* the glass droplet glides to the current tab, stretching a little as it moves */
  var pillAt = null;
  function movePill() {
    var pill = app.querySelector(".gtab-pill"), cur = app.querySelector('.gtabs [aria-current="page"]');
    if (!pill || !cur) return;
    pill.style.width = cur.offsetWidth + "px";
    pill.style.transform = "translateX(" + cur.offsetLeft + "px)";
    if (pillAt !== null && pillAt !== cur.offsetLeft && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pill.classList.remove("is-moving"); void pill.offsetWidth; pill.classList.add("is-moving");
    }
    pillAt = cur.offsetLeft;
    pill.classList.add("is-on");
  }

  /* ---------- liquid glass ----------
   * Like iOS: the backdrop is refracted near the rim of the glass (an SVG displacement map
   * built for the element's exact size and corner radius), with a slight colour split at the
   * edge. Chromium can run SVG filters on the backdrop; other browsers keep the frosted look.
   */
  var LG_OK = /Chrome\//.test(navigator.userAgent) && window.CSS && CSS.supports("backdrop-filter", "blur(1px)");
  function lensMap(w, h, r, band) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    var bx = w / 2 - r, by = h / 2 - r;
    function sd(x, y) {   // signed distance to the rounded rectangle (negative inside)
      var qx = Math.abs(x - w / 2) - bx, qy = Math.abs(y - h / 2) - by;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4, px = x + 0.5, py = y + 0.5, dist = -sd(px, py), dx = 0, dy = 0;
        if (dist < band && dist > -1) {
          var nx = sd(px + 1, py) - sd(px - 1, py), ny = sd(px, py + 1) - sd(px, py - 1), len = Math.hypot(nx, ny) || 1;
          var t = 1 - Math.max(dist, 0) / band, m = t * t * (3 - 2 * t);   // smooth, strongest at the rim
          dx = -nx / len * m; dy = -ny / len * m;   // sample from further inside: the rim bends the view inward
        }
        d[i] = 128 + dx * 127; d[i + 1] = 128 + dy * 127; d[i + 2] = 128; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }
  var lgCount = 0;
  function liquidGlass(el) {
    if (!el || !LG_OK) return;
    var id = "lg-" + (++lgCount), NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    document.body.appendChild(svg);
    var last = "";
    function build() {
      var w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h || last === w + "x" + h) return;
      last = w + "x" + h;
      var r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2), band = Math.min(22, h / 2.4), s = 46;
      var map = lensMap(w, h, r, band);
      var ch = function (k, scale, matrix) {
        return '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + scale + '" xChannelSelector="R" yChannelSelector="G" result="d' + k + '"/>' +
          '<feColorMatrix in="d' + k + '" type="matrix" values="' + matrix + '" result="c' + k + '"/>';
      };
      svg.innerHTML = '<filter id="' + id + '" x="0" y="0" width="' + w + '" height="' + h + '" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
        '<feImage href="' + map + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="map"/>' +
        ch("r", s * 1.1, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0") +
        ch("g", s, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0") +
        ch("b", s * 0.9, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0") +
        '<feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen" result="rgb"/>' +
        '<feGaussianBlur in="rgb" stdDeviation="0.6"/></filter>';
      el.style.setProperty("--lg-filter", "url(#" + id + ")");
      el.classList.add("is-liquid");
    }
    build();
    if (window.ResizeObserver) new ResizeObserver(build).observe(el); else window.addEventListener("resize", build);
  }

  function go(view) {
    if (view === "enquiries" && !SHOW_ENQUIRIES) view = "dashboard";
    S.view = view;
    $$(".gtabs [data-view]").forEach(function (b) { if (b.dataset.view === (view === "editor" ? "properties" : view)) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    movePill();
    var cur = $('.gtabs [aria-current="page"]'), nav = $(".gtabs");
    if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2, behavior: "smooth" });
    $("#title").textContent = view === "editor" && S.edit && S.edit.index == null ? "Add property" : TITLES[view] || "";
    var v = $("#view");
    ({ dashboard: viewDashboard, properties: viewProperties, enquiries: viewEnquiries, regions: viewRegions, content: viewContent, settings: viewSettings, editor: viewEditor })[view](v);
    renderPublish();
    window.scrollTo(0, 0);
  }

  /* ---------- publishing ---------- */
  function isDirty() { return S.dirty.config || S.dirty.data; }
  function markDirty(which) { S.dirty[which] = true; renderPublish(); }
  function renderPublish(note) {
    var el = $("#publish");
    if (!el) return;
    if (isDirty()) {
      el.innerHTML = '<span class="publish-state is-dirty">Unpublished changes</span><button class="btn btn-light btn-sm" id="discard">Discard</button><button class="btn btn-primary btn-sm" id="do-publish">Publish to website</button>';
      $("#discard").addEventListener("click", function () {
        confirmBox("Discard changes?", "Your unpublished edits will be thrown away.", "Discard", true).then(function (ok) {
          if (ok) loadContent().then(function () { S.edit = null; go(S.view === "editor" ? "properties" : S.view); toast("Changes discarded"); });
        });
      });
      $("#do-publish").addEventListener("click", publish);
    } else {
      el.innerHTML = '<span class="publish-state">' + esc(note || "Everything is published") + "</span>";
    }
  }
  function publish() {
    if (S.view === "editor") { toast("Save or cancel the property you are editing first.", true); return; }
    var btn = $("#do-publish");
    btn.disabled = true; btn.classList.add("is-loading");
    api("publish", { config: S.dirty.config ? S.config : undefined, data: S.dirty.data ? S.data : undefined, shas: S.shas }).then(function (d) {
      S.shas = d.shas; S.dirty = { config: false, data: false };
      var soon = DEMO.on || S.storage === "Supabase";
      renderPublish(soon ? "Published" : "Published · the website updates in about a minute");
      toast(DEMO.on ? "Published. The website shows the changes now." : soon ? "Published. The website shows the changes within a few seconds." : "Published. The website will show the changes in about a minute.");
    }).catch(function (e) {
      btn.disabled = false; btn.classList.remove("is-loading");
      if (e.status === 409) {
        confirmBox("Content changed elsewhere", e.message + " Your unpublished edits will be lost.", "Reload latest").then(function (ok) { if (ok) loadContent().then(function () { go(S.view); }); });
      } else toast(e.message, true);
    });
  }
  window.addEventListener("beforeunload", function (e) { if (S.user && isDirty()) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- dashboard ---------- */
  function viewDashboard(v) {
    var P = S.data.properties;
    var count = function (f) { return P.filter(f).length; };
    v.innerHTML = '<div class="conn" id="conn" hidden></div><div class="kpis">' +
      kpi(P.length, "Properties listed") + kpi(count(function (p) { return p.status !== "sold"; }), "Available now") +
      kpi(count(function (p) { return p.featured; }), "Featured on home page") + (SHOW_ENQUIRIES ? kpi('<span id="kpi-new">…</span>', "New enquiries") : kpi(count(function (p) { return p.status === "sold"; }), "Sold out")) + "</div>" +
      '<section class="panel"><h2>Quick actions</h2><p class="hint">Changes are saved as a draft. Press <b>Publish to website</b> at the top when you are ready.</p><div class="quick">' +
      '<button class="btn btn-primary" data-act="add">' + icon("plus") + "Add a property</button>" +
      (SHOW_ENQUIRIES ? '<button class="btn btn-light" data-go="enquiries">' + icon("inbox") + "Open enquiries</button>" : "") +
      '<button class="btn btn-light" data-go="settings">' + icon("cog") + "Phone, WhatsApp & links</button>" +
      '<a class="btn btn-light" href="../index.html" target="_blank" rel="noopener">' + icon("ext") + "View website</a></div></section>" +
      (!DEMO.on && S.storage === "Supabase" && browserData() ? '<section class="panel move-panel" id="move"><h2>Move what you saved in this browser</h2><p class="hint">Before the database was connected, your changes and photos were kept in this browser only. Move them to the database so everyone sees them.</p><div class="quick"><button class="btn btn-primary" id="move-go">Move to the database</button><button class="btn btn-light" id="move-skip">Not now</button></div><p class="media-status" id="move-st" aria-live="polite"></p></section>' : "") +
      (SHOW_ENQUIRIES ? '<section class="panel"><div class="panel-head"><h2>Latest enquiries</h2><button class="btn btn-light btn-sm" data-go="enquiries">See all</button></div><div id="dash-enq" class="rows"><p class="muted">Loading…</p></div></section>' : "");
    $$("[data-go]", v).forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.go); }); });
    $("[data-act=add]", v).addEventListener("click", function () { openEditor(null); });
    connection();
    if ($("#move", v)) {
      $("#move-skip").addEventListener("click", function () { $("#move").remove(); });
      $("#move-go").addEventListener("click", moveBrowserData);
    }
    if (SHOW_ENQUIRIES) getEnquiries(true).then(function (items) {
      var box = $("#dash-enq");
      if (!box) return;
      var latest = items.slice(0, 5);
      box.innerHTML = latest.length ? latest.map(enquiryCard).join("") : '<div class="empty-box">No enquiries yet. Form submissions from the website appear here.</div>';
      bindEnquiryCards(box);
    }).catch(function (e) { var box = $("#dash-enq"); if (box) box.innerHTML = '<p class="alert">' + esc(e.message) + "</p>"; });
  }
  function kpi(n, label) { return '<div class="kpi"><b>' + n + "</b><span>" + esc(label) + "</span></div>"; }

  /* ---------- is the database really connected? (dashboard) ---------- */
  function connection() {
    var box = $("#conn");
    if (!box) return;
    var show = function (kind, title, text) {
      box.hidden = false; box.className = "conn is-" + kind;
      box.innerHTML = "<b>" + esc(title) + "</b><span>" + text + "</span>";
    };
    if (DEMO.on) return show("warn", "Not connected to the database", "Changes are saved in this browser only, so other visitors still see the original website. Add <code>SUPABASE_URL</code>, <code>SUPABASE_SECRET_KEY</code>, <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code> in Vercel (Settings → Environments → Production), then redeploy.");
    fetch("/api/admin?a=status", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (st) {
      if (st.storage !== "Supabase") return show("warn", "Saving to " + st.storage, "Supabase is not set up in Vercel, so changes are saved to " + esc(st.storage) + ".");
      if (st.database === "connected") return show("ok", "Connected to Supabase", "Everything you publish shows on the website for everyone within a few seconds.");
      show("bad", "Supabase is not answering", esc(st.databaseError || "Unknown problem") + ". The website is showing its built-in copy until this is fixed.");
    }).catch(function () {});
  }

  /* ---------- moving browser-only data into the database ---------- */
  function browserData() {
    var c = lsGet(DEMO.key, null), e = lsGet(DEMO.enq, []);
    if (!(c && (c.config || c.data)) && !(e && e.length)) return null;
    return { content: c, enq: e && e.length ? e : null };
  }
  function moveBrowserData() {
    var b = browserData();
    if (!b) return;
    confirmBox("Move to the database?", "What you published in this browser replaces the content on the website.", "Move").then(function (ok) {
      if (!ok) return;
      transfer(b, $("#move-st"), $("#move-go"), function () {
        try { localStorage.removeItem(DEMO.key); localStorage.removeItem(DEMO.enq); } catch (e) {}
        if (window.TLP_MEDIA) TLP_MEDIA.clear();
      }, "Moved. Everyone now sees this content on the website.");
    });
  }

  /* Publish saved content to the database: photos / videos that live in this browser ("local:")
     or inside a backup file ("data:") are uploaded to Supabase Storage first.
     b = { content: { config, data }, enq: [..] | null, media: { "local:id": "data:…" } | null } */
  function transfer(b, st, btn, after, doneMsg) {
    btn.disabled = true; btn.classList.add("is-loading");
    var data = b.content && b.content.data ? clone(b.content.data) : null, jobs = [], media = b.media || {};
    (data ? data.properties : []).forEach(function (p) {
      ["images", "videos"].forEach(function (k) {
        (p[k] || []).forEach(function (src, i) { jobs.push({ p: p, k: k, i: i, src: src }); });
      });
      if (p.image && (!p.images || p.images.indexOf(p.image) < 0)) jobs.push({ p: p, k: "image", src: p.image });
    });
    jobs = jobs.filter(function (j) { return /^(local:|data:)/.test(j.src); });
    var done = 0, cache = {};
    function blobOf(src) {
      if (media[src]) return Promise.resolve(dataUrlBlob(media[src]));
      if (/^local:/.test(src)) return window.TLP_MEDIA ? TLP_MEDIA.get(src).catch(function () { return null; }) : Promise.resolve(null);
      return Promise.resolve(dataUrlBlob(src));
    }
    var chain = jobs.reduce(function (c, j) {
      return c.then(function () {
        st.textContent = "Uploading photos and videos… " + (done + 1) + " of " + jobs.length;
        var up = cache[j.src] || (cache[j.src] = blobOf(j.src).then(function (blob) {
          return blob ? direct(blob, (j.p.id || "file") + (j.k === "videos" ? "-video" : "")) : null;
        }));
        return up.then(function (url) {
          done++;
          if (!url) return;
          if (j.k === "image") j.p.image = url; else j.p[j.k][j.i] = url;
        });
      });
    }, Promise.resolve());
    return chain.then(function () {
      if (data) data.properties.forEach(function (p) {
        ["images", "videos"].forEach(function (k) { if (p[k]) p[k] = p[k].filter(function (x) { return !/^(local:|data:)/.test(x); }); });
        if (p.images && p.images.length) p.image = p.images[0]; else if (p.image && /^(local:|data:)/.test(p.image)) delete p.image;
      });
      if (!(b.content && (b.content.config || data))) return;
      st.textContent = "Publishing…";
      return api("publish", { config: b.content.config || undefined, data: data || undefined, shas: S.shas }).then(function (d) { S.shas = d.shas; });
    }).then(function () {
      if (!b.enq || !b.enq.length) return;
      st.textContent = "Saving enquiries…";
      return api("import", { items: b.enq }).then(function () { S.enquiries = null; });
    }).then(function () {
      if (after) after();
      return loadContent();
    }).then(function () {
      toast(doneMsg);
      go(S.view === "settings" ? "settings" : "dashboard");
    }).catch(function (e) {
      btn.disabled = false; btn.classList.remove("is-loading"); st.textContent = "";
      toast(e.message + " Nothing was removed, so you can try again.", true);
    });
  }

  /* ---------- backup: download everything as one file, restore it anywhere ---------- */
  function readAsDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error("Could not read a photo or video")); };
      r.readAsDataURL(blob);
    });
  }
  function downloadBackup(btn) {
    btn.disabled = true; btn.classList.add("is-loading");
    var media = {}, refs = [];
    (S.data.properties || []).forEach(function (p) {
      (p.images || []).concat(p.videos || [], p.image ? [p.image] : []).forEach(function (x) { if (/^local:/.test(x) && refs.indexOf(x) < 0) refs.push(x); });
    });
    refs.reduce(function (c, ref) {
      return c.then(function () {
        return TLP_MEDIA.get(ref).then(function (blob) { return blob ? readAsDataUrl(blob).then(function (u) { media[ref] = u; }) : null; }).catch(function () {});
      });
    }, Promise.resolve()).then(function () {
      var backup = { app: "tenkasi-admin-backup", version: 1, savedAt: new Date().toISOString(), config: S.config, data: S.data, media: media, enquiries: DEMO.on ? lsGet(DEMO.enq, []) : [] };
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
      a.download = "tenkasi-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      toast("Backup downloaded (" + S.data.properties.length + " properties" + (refs.length ? ", " + refs.length + " photos / videos" : "") + ").");
    }).catch(function (e) { toast(e.message, true); }).then(function () { btn.disabled = false; btn.classList.remove("is-loading"); });
  }
  function restoreBackup(file, btn, st) {
    if (!file) return;
    file.text().then(function (t) {
      var b = JSON.parse(t);
      if (!b || b.app !== "tenkasi-admin-backup" || !b.data || !b.config) throw new Error("That file is not a Tenkasi admin backup.");
      return confirmBox("Restore this backup?", "The website will show the " + b.data.properties.length + " properties and the settings from this file (saved " + new Date(b.savedAt).toLocaleDateString("en-IN") + "). What is on the website now is replaced.", "Restore").then(function (ok) {
        if (ok) return transfer({ content: { config: b.config, data: b.data }, enq: b.enquiries || [], media: b.media || {} }, st, btn, null, "Backup restored. Everyone now sees this content on the website.");
      });
    }).catch(function (e) { toast(e instanceof SyntaxError ? "That file could not be read as a backup." : e.message, true); });
  }

  /* ---------- properties ---------- */
  /* the example listings the site shipped with (ids from assets/js/data.js) */
  var SAMPLE_IDS = ["courtallam-meadows", "ilanji-coconut-grove", "sengottai-foothill-farm", "madurai-highway-frontage", "melagaram-ready-house", "palayamkottai-garden-plots", "gangaikondan-palmyra-land", "rajapalayam-mango-orchard", "virudhunagar-nagar-plots", "tiruchendur-road-plots", "poombarai-valley-estate", "ketti-valley-tea-plot", "punalur-riverside-land"];
  function samples() { return S.data.properties.filter(function (p) { return SAMPLE_IDS.indexOf(p.id) >= 0 && !p.caption; }); }

  function viewProperties(v) {
    var f = S.filter, demo = samples();
    v.innerHTML = '<div class="toolbar"><input type="search" id="pq" placeholder="Search properties" aria-label="Search properties" value="' + esc(f.q) + '">' +
      '<select id="pr" aria-label="Filter by region"><option value="">All regions</option>' + S.data.regions.map(function (r) { return '<option value="' + esc(r.id) + '"' + (f.region === r.id ? " selected" : "") + ">" + esc(r.name) + "</option>"; }).join("") + "</select>" +
      '<select id="ps" aria-label="Filter by status"><option value="">Any status</option>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (f.status === k ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select>" +
      '<button class="btn btn-primary" id="padd">' + icon("plus") + "Add property</button></div>" +
      (demo.length ? '<section class="panel sample-panel"><div><h2>Example properties</h2><p class="hint">' + demo.length + " of these listings are examples that came with the website. Remove them before adding your real properties.</p></div>" +
        '<button class="btn btn-danger btn-sm" id="rm-samples">' + icon("trash") + "Remove " + demo.length + " example " + (demo.length === 1 ? "property" : "properties") + "</button></section>" : "") +
      '<p class="muted" style="margin:0;font-size:var(--text-sm)">Order here is the order on the website. Star = featured on the home page.</p><div class="plist" id="plist"></div>';
    $("#pq").addEventListener("input", function (e) { f.q = e.target.value; drawList(); });
    $("#pr").addEventListener("change", function (e) { f.region = e.target.value; drawList(); });
    $("#ps").addEventListener("change", function (e) { f.status = e.target.value; drawList(); });
    $("#padd").addEventListener("click", function () { openEditor(null); });
    var rm = $("#rm-samples");
    if (rm) rm.addEventListener("click", function () {
      confirmBox("Remove the example properties?", demo.length + " example listings will be removed from the website when you publish. Properties you added stay.", "Remove", true).then(function (ok) {
        if (!ok) return;
        S.data.properties = S.data.properties.filter(function (p) { return demo.indexOf(p) < 0; });
        markDirty("data");
        toast("Examples removed. Press Publish to website to update the site.");
        go("properties");
      });
    });
    drawList();
  }
  function drawList() {
    var f = S.filter, P = S.data.properties, box = $("#plist");
    var q = f.q.trim().toLowerCase();
    var shown = P.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) {
      var p = x.p;
      return (!f.region || p.region === f.region) && (!f.status || p.status === f.status) && (!q || (p.title + " " + p.location + " " + (p.caption || "")).toLowerCase().indexOf(q) >= 0);
    });
    var filtered = f.q || f.region || f.status;
    box.innerHTML = shown.length ? shown.map(function (x) {
      var p = x.p, i = x.i;
      return '<div class="prow" data-i="' + i + '"><div class="thumb"><img ' + coverAttr(p) + ' alt="" loading="lazy"></div>' +
        '<div class="prow-main"><b>' + esc(p.title) + "</b><span>" + esc(p.location) + " · " + esc(typeLabel(p.type)) + "</span></div>" +
        '<span class="price">' + (p.price == null ? "On request" : price(p.price) + (p.priceNote === "onwards" ? "+" : p.priceNote && p.priceNote !== "total" ? " " + p.priceNote : "")) + "</span>" +
        '<button type="button" class="pill pill-btn is-' + esc(p.status) + '" data-a="status" title="Change status" aria-label="Status: ' + STATUS[p.status] + '. Change status">' + STATUS[p.status] + "</button>" +
        '<div class="prow-actions">' +
        '<button class="icon-only' + (p.featured ? " is-on" : "") + '" data-a="star" aria-pressed="' + !!p.featured + '" aria-label="Featured on home page" title="Featured on home page">' + icon("star") + "</button>" +
        '<button class="icon-only" data-a="up" aria-label="Move up" title="Move up"' + (i === 0 || filtered ? " disabled" : "") + ">" + icon("up") + "</button>" +
        '<button class="icon-only" data-a="down" aria-label="Move down" title="Move down"' + (i === P.length - 1 || filtered ? " disabled" : "") + ">" + icon("down") + "</button>" +
        '<button class="icon-only" data-a="copy" aria-label="Duplicate" title="Duplicate">' + icon("copy") + "</button>" +
        '<button class="icon-only" data-a="del" aria-label="Delete" title="Delete">' + icon("trash") + "</button>" +
        '<button class="icon-only keep" data-a="edit" aria-label="Edit ' + esc(p.title) + '" title="Edit">' + icon("edit") + "</button></div></div>";
    }).join("") : '<div class="empty-box">' + (P.length ? "No properties match these filters." : "No properties yet. Add your first one.") + "</div>";
    $$(".prow", box).forEach(function (row) {
      var i = +row.dataset.i;
      row.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]");
        var a = b ? b.dataset.a : "edit";
        if (b && b.disabled) return;
        if (a === "edit") return openEditor(i);
        if (a === "status") { var order = ["available", "few", "sold"]; P[i].status = order[(order.indexOf(P[i].status) + 1) % 3]; markDirty("data"); drawList(); var sb = $('.prow[data-i="' + i + '"] [data-a="status"]'); if (sb) sb.focus(); return; }
        if (a === "star") { P[i].featured = !P[i].featured; markDirty("data"); return drawList(); }
        if (a === "up" || a === "down") { var j = a === "up" ? i - 1 : i + 1; var t = P[i]; P[i] = P[j]; P[j] = t; markDirty("data"); drawList(); var nb = $('.prow[data-i="' + j + '"] [data-a="' + a + '"]'); if (nb && !nb.disabled) nb.focus(); return; }
        if (a === "copy") {
          var c = clone(P[i]); c.title += " (copy)"; c.id = uniqueId(slugify(c.title)); c.featured = false;
          P.splice(i + 1, 0, c); markDirty("data"); toast("Duplicated. Edit the copy to change its details."); return drawList();
        }
        if (a === "del") {
          confirmBox("Delete this property?", '"' + P[i].title + '" will be removed from the website when you publish.', "Delete", true).then(function (ok) {
            if (ok) { P.splice(i, 1); markDirty("data"); drawList(); toast("Deleted. Publish to remove it from the website."); }
          });
        }
      });
    });
  }
  function uniqueId(base) {
    base = base || "property";
    var ids = S.data.properties.map(function (p) { return p.id; }), id = base, n = 2;
    while (ids.indexOf(id) >= 0) id = base + "-" + n++;
    return id;
  }

  /* ---------- property editor ----------
   * Only photos, videos and the caption posted on social media. Everything the website shows
   * (title, place, region, type, price, size…) is read from the caption by assets/js/caption.js.
   */
  var TYPE_SCENE = { plot: "plots", farm: "farm", estate: "hills", commercial: "highway", house: "house" };
  var TYPE_ART = { plot: "plan", farm: "farm", estate: "hills", commercial: "highway", house: "plan" };
  var MAX_PHOTOS = 20, MAX_VIDEOS = 3;

  /* a caption for properties added before captions existed, so they can be edited the same way */
  function captionFrom(p) {
    var L = [p.title, ""];
    if (p.location) L.push("📍 Location: " + p.location, "");
    if (p.summary) L.push(p.summary, "");
    if (p.description) L.push(p.description, "");
    if (p.highlights && p.highlights.length) L.push("✨ Highlights:", "", p.highlights.map(function (h) { return "✅ " + h; }).join("\n"), "");
    if (p.area) L.push("📐 Area: " + p.area);
    if (p.approval) L.push("📄 Approval: " + p.approval);
    if (p.road) L.push("🛣️ Road: " + p.road);
    if (p.price != null && p.price !== "") L.push("💰 Price: " + price(p.price).replace(/ L$/, " Lakhs") + (p.priceNote && p.priceNote !== "total" ? " " + p.priceNote : ""));
    return L.join("\n").trim();
  }

  var PASTE_KEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘V" : "Ctrl+V";
  document.addEventListener("paste", function (e) { if (S.view === "editor" && S.onPaste) S.onPaste(e); });

  function openEditor(index) {
    var p = index == null ? { status: "available", featured: false } : clone(S.data.properties[index]);
    p.images = (p.images && p.images.slice()) || (p.image ? [p.image] : []);
    p.videos = (p.videos && p.videos.slice()) || [];
    if (p.caption == null) p.caption = index == null ? "" : captionFrom(p);
    S.edit = { index: index, p: p };
    go("editor");
  }

  function mediaAttr(path, isVideo) {
    if (window.TLP_MEDIA && TLP_MEDIA.isLocal(path)) return (isVideo ? "" : 'src="' + BLANK + '" ') + 'data-local="' + esc(path) + '"';
    return 'src="' + esc(S.previews[path] || (/^(data:|blob:|https?:)/.test(path) ? path : "../" + path)) + '"';
  }

  function viewEditor(v) {
    var E = S.edit, p = E.p, isNew = E.index == null;
    v.innerHTML =
      '<div class="editor-head"><button class="back" type="button" id="e-back">' + icon("back") + 'Back to properties</button><div class="actions-row"><button class="btn btn-light" id="e-cancel">Cancel</button><button class="btn btn-primary" id="e-save">' + (isNew ? "Add property" : "Save changes") + "</button></div></div>" +
      '<p class="alert" id="e-err" hidden></p>' +
      '<div class="post-editor"><div class="post-col">' +
      '<section class="panel drop-zone" id="ph-zone"><div class="panel-head"><h2>Photos</h2><button type="button" class="btn btn-light btn-sm" id="ph-paste">' + icon("paste") + 'Paste photo</button></div><p class="hint">Drag and drop the photos you posted, paste them (' + PASTE_KEY + '), or click to upload. The first photo is the cover on the website — drag photos to change the order.</p>' +
      '<div class="media-grid" id="ph-grid"></div><input type="file" id="ph-file" accept="image/jpeg,image/png,image/webp" multiple hidden><p class="media-status" id="ph-status" aria-live="polite"></p></section>' +
      '<section class="panel drop-zone" id="vd-zone"><h2>Video <span class="optional">Optional</span></h2><p class="hint">Drag and drop the reel or walkthrough video (MP4, MOV or WebM), paste a copied video file (' + PASTE_KEY + '), or click to upload. You can skip this.</p>' +
      '<div class="media-grid is-video" id="vd-grid"></div><input type="file" id="vd-file" accept="video/mp4,video/quicktime,video/webm" multiple hidden><p class="media-status" id="vd-status" aria-live="polite"></p></section>' +
      '<section class="panel"><div class="field"><div class="cap-row"><label for="f-caption" class="h2-label">Caption <span class="req">*</span></label><span class="counter" id="cap-c"></span><button type="button" class="btn btn-light btn-sm" id="cap-paste">' + icon("paste") + "Paste caption</button></div>" +
      '<small style="margin:0 0 var(--space-5)">Paste the same caption you posted on Instagram or Facebook — English, தமிழ் or both. The title, place, price and land size are taken from it.</small>' +
      '<textarea id="f-caption" rows="16" maxlength="5000" placeholder="🌴 Beautiful land for sale near Tenkasi!&#10;&#10;📍 Location: Courtallam Road, Tenkasi&#10;&#10;✅ 10 cents onwards&#10;✅ Tar road access&#10;&#10;💰 Price: ₹1,80,000 per cent">' + esc(p.caption) + "</textarea></div></section>" +
      '</div><aside class="panel post-preview" aria-labelledby="pv-h"><h2 id="pv-h">On the website</h2><div id="pv"></div></aside></div>';

    var err = $("#e-err"), cap = $("#f-caption");
    v.addEventListener("input", function () { err.hidden = true; });

    /* live preview of what the caption becomes */
    function parsed() { return TLP_CAPTION.parse(cap.value, S.data.regions, S.data.types); }
    function drawPreview() {
      var d = parsed(), box = $("#pv");
      $("#cap-c").textContent = cap.value.length + "/5000";
      if (!d.title) { box.innerHTML = '<p class="muted pv-empty">Paste the caption to see how the property will look on the website.</p>'; return; }
      var cov = p.images[0];
      var row = function (k, val, miss) { return "<div><dt>" + k + "</dt><dd" + (val ? "" : ' class="is-miss"') + ">" + esc(val || miss) + "</dd></div>"; };
      box.innerHTML =
        '<div class="pv-card"><div class="pv-media">' + (cov ? "<img " + mediaAttr(cov) + ' alt="">' : '<img src="../assets/img/scenes/' + (TYPE_SCENE[d.type] || "plots") + '.webp" alt="">') +
        (p.videos.length ? '<span class="pill is-plain">' + p.videos.length + (p.videos.length === 1 ? " video" : " videos") + "</span>" : "") + "</div>" +
        '<div class="pv-body"><p class="pv-loc">' + icon("map") + esc(d.location || region(d.region).name || "") + "</p><b class=\"pv-title\">" + esc(d.title) + "</b>" +
        '<p class="pv-price">' + (d.price != null ? price(d.price) + (d.priceNote !== "total" ? " <small>" + esc(d.priceNote) + "</small>" : "") : "Price on request") + "</p></div></div>" +
        '<dl class="pv-facts">' + row("Region", region(d.region).name, "—") + row("Type", typeLabel(d.type).replace(/s$/, ""), "—") + row("Land size", d.area, "Not in caption") +
        row("Road", d.road, "Not in caption") + row("Approval", d.approval, "Not in caption") + "</dl>" +
        '<p class="pv-tip">Something not right? Mention it in the caption — the place (e.g. <i>Location: Aryankavu, Kerala</i>), the price with ₹ (e.g. <i>₹77 Lakhs</i>) or the size in cents or acres.</p>';
    }
    cap.addEventListener("input", drawPreview);

    /* photos */
    function drawPhotos() {
      var g = $("#ph-grid");
      g.innerHTML = p.images.map(function (src, i) {
        return '<div class="media-tile" draggable="true" data-i="' + i + '"><img ' + mediaAttr(src) + ' alt="Photo ' + (i + 1) + '" draggable="false">' + (i === 0 ? '<span class="media-badge">Cover</span>' : "") +
          '<div class="media-tools">' + (i ? '<button type="button" class="icon-only" data-cover="' + i + '" aria-label="Make photo ' + (i + 1) + ' the cover" title="Make cover">' + icon("star") + "</button>" : "") +
          '<button type="button" class="icon-only" data-rm="' + i + '" aria-label="Remove photo ' + (i + 1) + '" title="Remove">' + icon("trash") + "</button></div></div>";
      }).join("") + (p.images.length < MAX_PHOTOS ? '<label class="media-add" for="ph-file">' + icon("plus") + "<span>" + (p.images.length ? "Add more photos" : "Upload photos") + "</span></label>" : "");
      drawPreview();
    }
    $("#ph-grid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm],[data-cover]");
      if (!b) return;
      if (b.dataset.rm != null) { p.images.splice(+b.dataset.rm, 1); $("#ph-status").textContent = ""; }
      else p.images.unshift(p.images.splice(+b.dataset.cover, 1)[0]);
      drawPhotos();
    });
    $("#ph-file").addEventListener("change", function (e) { addPhotos(e.target.files); e.target.value = ""; });
    function addPhotos(list) {
      var all = Array.prototype.slice.call(list), st = $("#ph-status");
      var files = all.filter(function (f) { return /^image\//.test(f.type); }).slice(0, MAX_PHOTOS - p.images.length);
      if (!files.length) { if (all.length) toast(p.images.length >= MAX_PHOTOS ? "You can add up to " + MAX_PHOTOS + " photos." : "Drop JPG, PNG or WebP photos here.", true); return; }
      var done = 0;
      files.reduce(function (chain, file) {
        return chain.then(function () {
          st.textContent = "Uploading photo " + (done + 1) + " of " + files.length + "…";
          return uploadPhoto(file).then(function (path) { p.images.push(path); done++; drawPhotos(); });
        });
      }, Promise.resolve()).then(function () {
        st.textContent = done ? (done === 1 ? "Photo added." : done + " photos added.") + " Save, then publish, to show them on the website." : "";
      }).catch(function (er) { st.textContent = ""; toast(er.message, true); });
    }

    /* drag a photo onto another to reorder */
    var dragFrom = null;
    var phGrid = $("#ph-grid");
    phGrid.addEventListener("dragstart", function (e) {
      var t = e.target.closest(".media-tile");
      if (!t) return;
      dragFrom = +t.dataset.i; t.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(dragFrom));
    });
    phGrid.addEventListener("dragend", function () { dragFrom = null; $$(".media-tile", phGrid).forEach(function (t) { t.classList.remove("is-dragging", "is-target"); }); });
    phGrid.addEventListener("dragover", function (e) {
      if (dragFrom == null) return;
      var t = e.target.closest(".media-tile");
      e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move";
      $$(".media-tile", phGrid).forEach(function (x) { x.classList.toggle("is-target", x === t && +x.dataset.i !== dragFrom); });
    });
    phGrid.addEventListener("drop", function (e) {
      if (dragFrom == null) return;
      e.preventDefault(); e.stopPropagation();
      var t = e.target.closest(".media-tile"), to = t ? +t.dataset.i : p.images.length - 1;
      if (to !== dragFrom) p.images.splice(to, 0, p.images.splice(dragFrom, 1)[0]);
      dragFrom = null; drawPhotos();
    });

    /* drop files from the computer onto the Photos or Video panel */
    function dropZone(zone, onFiles) {
      var depth = 0;
      zone.addEventListener("dragenter", function (e) { if (dragFrom != null || !hasFiles(e)) return; e.preventDefault(); depth++; zone.classList.add("is-over"); });
      zone.addEventListener("dragleave", function () { if (depth && !--depth) zone.classList.remove("is-over"); });
      zone.addEventListener("dragover", function (e) { if (dragFrom != null || !hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
      zone.addEventListener("drop", function (e) {
        if (dragFrom != null || !hasFiles(e)) return;
        e.preventDefault(); depth = 0; zone.classList.remove("is-over");
        onFiles(e.dataTransfer.files);
      });
    }
    function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") >= 0; }
    dropZone($("#ph-zone"), addPhotos);
    dropZone($("#vd-zone"), function (files) {
      var vids = Array.prototype.filter.call(files, function (f) { return /^video\//.test(f.type); });
      if (!vids.length) return toast("Drop an MP4, MOV or WebM video here.", true);
      addVideos(vids);
    });

    /* paste: Ctrl+V / ⌘V anywhere in the form, or the Paste buttons */
    S.onPaste = function (e) {
      var cd = e.clipboardData;
      if (!cd) return;
      var files = Array.prototype.slice.call(cd.files || []);
      if (!files.length) Array.prototype.forEach.call(cd.items || [], function (it) { if (it.kind === "file") { var f = it.getAsFile(); if (f) files.push(f); } });
      var imgs = files.filter(function (f) { return /^image\//.test(f.type); }), vids = files.filter(function (f) { return /^video\//.test(f.type); });
      if (imgs.length || vids.length) {
        e.preventDefault();
        if (imgs.length) addPhotos(imgs.map(named));
        if (vids.length) addVideos(vids);
        return;
      }
      var t = e.target, inField = t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT");
      var text = cd.getData("text/plain");
      if (!inField && text && text.trim()) { e.preventDefault(); putCaption(text); }
    };
    function named(f) {   // screenshots arrive as "image.png"; give them a useful name
      return f.name && f.name !== "image.png" ? f : new File([f], "pasted-photo-" + Date.now() + "." + (f.type.split("/")[1] || "png"), { type: f.type });
    }
    function putCaption(text) {
      var put = function () { cap.value = text.slice(0, 5000); cap.dispatchEvent(new Event("input", { bubbles: true })); cap.focus(); toast("Caption pasted"); };
      if (cap.value.trim() && cap.value.trim() !== text.trim()) confirmBox("Replace the caption?", "The caption already has text. Replace it with what you copied?", "Replace").then(function (ok) { if (ok) put(); });
      else put();
    }
    $("#cap-paste").addEventListener("click", function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { cap.focus(); toast("Press " + PASTE_KEY + " to paste the caption.", true); return; }
      navigator.clipboard.readText().then(function (text) {
        if (!text || !text.trim()) return toast("Nothing to paste. Copy the caption from Instagram or Facebook first.", true);
        putCaption(text);
      }).catch(function () { cap.focus(); toast("Allow clipboard access, or press " + PASTE_KEY + " in the caption box.", true); });
    });
    $("#ph-paste").addEventListener("click", function () {
      if (!navigator.clipboard || !navigator.clipboard.read) { toast("Press " + PASTE_KEY + " to paste a copied photo.", true); return; }
      navigator.clipboard.read().then(function (items) {
        var jobs = [];
        items.forEach(function (it) {
          var type = it.types.filter(function (t) { return /^image\/(png|jpeg|webp)$/.test(t); })[0];
          if (type) jobs.push(it.getType(type).then(function (blob) { return named(new File([blob], "image.png", { type: type })); }));
        });
        if (!jobs.length) return toast("No photo on the clipboard. Copy a photo first.", true);
        return Promise.all(jobs).then(addPhotos);
      }).catch(function () { toast("Allow clipboard access, or press " + PASTE_KEY + " to paste the photo.", true); });
    });

    /* videos */
    function drawVideos() {
      var g = $("#vd-grid");
      g.innerHTML = p.videos.map(function (src, i) {
        return '<div class="media-tile is-video"><video ' + mediaAttr(src, true) + ' controls playsinline preload="metadata"></video>' +
          '<div class="media-tools"><button type="button" class="icon-only" data-rm="' + i + '" aria-label="Remove video ' + (i + 1) + '" title="Remove">' + icon("trash") + "</button></div></div>";
      }).join("") + (p.videos.length < MAX_VIDEOS ? '<label class="media-add" for="vd-file">' + icon("plus") + "<span>" + (p.videos.length ? "Add another video" : "Upload video") + "</span></label>" : "");
      drawPreview();
    }
    $("#vd-grid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm]");
      if (b) { p.videos.splice(+b.dataset.rm, 1); $("#vd-status").textContent = ""; drawVideos(); }
    });
    $("#vd-file").addEventListener("change", function (e) { addVideos(e.target.files); e.target.value = ""; });
    function addVideos(list) {
      var files = Array.prototype.slice.call(list, 0, MAX_VIDEOS - p.videos.length), st = $("#vd-status"), done = 0;
      if (!files.length) { if (list.length) toast("You can add up to " + MAX_VIDEOS + " videos.", true); return; }
      files.reduce(function (chain, file) {
        return chain.then(function () {
          st.textContent = "Uploading video" + (files.length > 1 ? " " + (done + 1) + " of " + files.length : "") + "…";
          return uploadVideo(file).then(function (path) { p.videos.push(path); done++; drawVideos(); });
        });
      }, Promise.resolve()).then(function () {
        st.textContent = done ? (done === 1 ? "Video added." : done + " videos added.") + " Save, then publish, to show it on the website." : "";
      }).catch(function (er) { st.textContent = ""; toast(er.message, true); });
    }
    /* stop a file dropped just outside the panels from opening in the tab */
    if (!window.__tlpDropGuard) {
      window.__tlpDropGuard = true;
      ["dragover", "drop"].forEach(function (t) { window.addEventListener(t, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") >= 0) e.preventDefault(); }); });
    }

    drawPhotos(); drawVideos();

    /* save / cancel */
    function close() { S.edit = null; go("properties"); }
    var cancel = function () {
      confirmBox("Leave without saving?", "Changes to this property will be lost.", "Leave", true).then(function (ok) { if (ok) close(); });
    };
    $("#e-back").addEventListener("click", cancel);
    $("#e-cancel").addEventListener("click", cancel);
    $("#e-save").addEventListener("click", function () {
      var d = parsed();
      if (!d.title) {
        err.hidden = false; err.innerHTML = "<b>Please add the caption.</b> The website takes the property title and details from it.";
        cap.focus(); return;
      }
      var out = clone(p);
      ["caption", "title", "location", "region", "type", "price", "priceNote", "area", "approval", "road", "summary", "highlights"].forEach(function (k) { out[k] = d[k]; });
      if (!out.location) out.location = region(out.region).name || "";
      out.description = "";
      if (out.images.length) out.image = out.images[0]; else delete out.image;
      if (!out.videos.length) delete out.videos;
      if (!out.images.length) delete out.images;
      if (isNew || !out.image) out.scene = TYPE_SCENE[out.type] || "plots";
      out.art = Object.assign({ seed: 1 + Math.floor(Math.random() * 40) }, out.art || {}, { kind: TYPE_ART[out.type] || "plan" });
      if (isNew) {
        out.id = uniqueId(slugify(out.title) || slugify(out.region + " " + out.type));
        out.nearby = []; out.status = "available"; out.featured = false;
      }
      if (isNew) S.data.properties.unshift(out); else S.data.properties[E.index] = out;
      markDirty("data");
      toast(isNew ? "Property added. Publish to put it on the website." : "Saved. Publish to update the website.");
      close();
    });
  }

  /* uploads: on the server they go to the repository; without one they stay in this browser (media.js) */
  function dataUrlBlob(u) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(u), bin = atob(m[2]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: m[1] });
  }
  function uploadPhoto(file) {
    return resize(file).then(function (dataUrl) {
      if (DEMO.on) {
        var blob = dataUrlBlob(dataUrl);
        return TLP_MEDIA.put(blob).then(function (path) { TLP_MEDIA.remember(path, blob); return path; });
      }
      if (S.storage === "Supabase") { var b = dataUrlBlob(dataUrl); return direct(b, file.name || "photo").then(function (url) { S.previews[url] = dataUrl; return url; }); }
      return api("upload", { name: slugify(file.name) || "photo", dataUrl: dataUrl }).then(function (r) { S.previews[r.path] = dataUrl; return r.path; });
    });
  }
  /* Supabase: ask the server for a one-time upload link, then send the file straight to Storage */
  function direct(blob, name, onProgress) {
    return api("sign", { name: slugify(name) || "file", type: blob.type, size: blob.size }).then(function (d) {
      return new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest(), fd = new FormData();
        fd.append("cacheControl", "31536000");
        fd.append("", blob, name);
        x.open("PUT", d.uploadUrl);
        x.setRequestHeader("x-upsert", "false");
        if (onProgress && x.upload) x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
        x.onload = function () { if (x.status >= 200 && x.status < 300) resolve(d.url); else reject(new Error("Upload failed (" + x.status + "). Try again.")); };
        x.onerror = function () { reject(new Error("Upload failed. Check your connection and try again.")); };
        x.send(fd);
      });
    });
  }
  var VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
  function uploadVideo(file) {
    if (VIDEO_TYPES.indexOf(file.type) < 0) return Promise.reject(new Error("Choose an MP4, MOV or WebM video."));
    if (DEMO.on) {
      if (file.size > 300 * 1024 * 1024) return Promise.reject(new Error("That video is larger than 300 MB. Export a shorter or smaller version and try again."));
      return TLP_MEDIA.put(file).then(function (path) { TLP_MEDIA.remember(path, file); return path; });
    }
    if (S.storage === "Supabase") {
      if (file.size > 50 * 1024 * 1024) return Promise.reject(new Error("That video is larger than 50 MB. Export a shorter or smaller version (720p works well) and try again."));
      var st = document.getElementById("vd-status");
      return direct(file, file.name || "video", function (f) { if (st) st.textContent = "Uploading video… " + Math.round(f * 100) + "%"; })
        .then(function (url) { S.previews[url] = URL.createObjectURL(file); return url; });
    }
    if (file.size > 3 * 1024 * 1024) return Promise.reject(new Error("That video is larger than 3 MB, the most the website can take at the moment. Upload a shorter clip."));
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error("Could not read that video.")); };
      r.readAsDataURL(file);
    }).then(function (dataUrl) {
      return api("upload", { name: slugify(file.name) || "video", dataUrl: dataUrl }).then(function (r) { S.previews[r.path] = URL.createObjectURL(file); return r.path; });
    });
  }
  /* shrink photos in the browser before upload: max 2000 px, WebP (JPEG where WebP is unsupported) */
  function resize(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error("Choose a JPG, PNG or WebP photo."));
      if (file.size > 25 * 1024 * 1024) return reject(new Error("That photo is larger than 25 MB."));
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = DEMO.on ? 1280 : 2000, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var out = c.toDataURL("image/webp", DEMO.on ? 0.72 : 0.82);
        if (out.indexOf("data:image/webp") !== 0) out = c.toDataURL("image/jpeg", 0.85);
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
      img.src = url;
    });
  }

  /* ---------- enquiries ---------- */
  function getEnquiries(force) {
    if (S.enquiries && !force) return Promise.resolve(S.enquiries);
    return api("enquiries").then(function (d) { S.enquiries = d.items; refreshEnquiryCount(); return d.items; });
  }
  function refreshEnquiryCount() {
    getEnquiries().then(function (items) {
      var n = items.filter(function (x) { return x.status === "new"; }).length;
      var c = document.getElementById("new-count"); if (c) { c.hidden = !n; c.textContent = n; }
      var k = document.getElementById("kpi-new"); if (k) k.textContent = n;
    }).catch(function () {});
  }
  function viewEnquiries(v) {
    v.innerHTML = '<div class="toolbar"><div class="tabs-row" role="group" aria-label="Show">' +
      [["new", "New"], ["contacted", "Contacted"], ["closed", "Closed"], ["all", "All"]].map(function (t) { return '<button class="tab-btn" data-tab="' + t[0] + '" aria-pressed="' + (S.enqTab === t[0]) + '">' + t[1] + "</button>"; }).join("") + "</div>" +
      '<input type="search" id="eq" placeholder="Search name, phone, property" aria-label="Search enquiries">' +
      '<div class="toolbar-btns"><button class="btn btn-light btn-sm" id="e-refresh">' + icon("refresh") + 'Refresh</button><button class="btn btn-light btn-sm" id="e-csv">' + icon("download") + "Export CSV</button></div></div>" +
      '<div class="rows" id="elist"><p class="muted">Loading…</p></div>';
    var draw = function () {
      getEnquiries().then(function (items) {
        var q = ($("#eq") ? $("#eq").value : "").toLowerCase();
        var shown = items.filter(function (x) { return (S.enqTab === "all" || x.status === S.enqTab) && (!q || JSON.stringify(x).toLowerCase().indexOf(q) >= 0); });
        var box = $("#elist");
        if (!box) return;
        box.innerHTML = shown.length ? shown.map(enquiryCard).join("") : '<div class="empty-box">' + (items.length ? "Nothing here." : "No enquiries yet. When someone sends a form on the website, it appears here.") + "</div>";
        bindEnquiryCards(box, draw);
      }).catch(function (e) { var box = $("#elist"); if (box) box.innerHTML = '<p class="alert">' + esc(e.message) + "</p>"; });
    };
    $$("[data-tab]", v).forEach(function (b) { b.addEventListener("click", function () { S.enqTab = b.dataset.tab; $$("[data-tab]", v).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); draw(); }); });
    $("#eq").addEventListener("input", draw);
    $("#e-refresh").addEventListener("click", function () { $("#elist").innerHTML = '<p class="muted">Loading…</p>'; getEnquiries(true).then(draw).catch(function (e) { toast(e.message, true); }); });
    $("#e-csv").addEventListener("click", function () {
      getEnquiries().then(function (items) {
        var cols = ["at", "status", "intent", "name", "phone", "property", "plot", "region", "type", "budget", "area", "date", "message", "note"];
        var csv = [cols.join(",")].concat(items.map(function (x) { return cols.map(function (c) { return '"' + String(x[c] == null ? "" : x[c]).replace(/"/g, '""') + '"'; }).join(","); })).join("\n");
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
        a.download = "enquiries-" + new Date().toISOString().slice(0, 10) + ".csv";
        a.click();
      });
    });
    getEnquiries(true).then(draw, draw);   // always fresh when the inbox is opened
  }
  function enquiryCard(x) {
    var wa = "https://wa.me/" + String(x.phone || "").replace(/\D/g, "").replace(/^(\d{10})$/, "91$1") + "?text=" + encodeURIComponent("Hello " + x.name + ", this is Tenkasi Land Promoters about your enquiry.");
    var meta = [["Property", x.property], ["Plot", x.plot], ["Region", x.region], ["Type", x.type], ["Budget", x.budget], ["Area", x.area], ["Visit date", x.date]].filter(function (m) { return m[1]; });
    return '<article class="enq' + (x.status === "new" ? " is-new" : "") + '" data-id="' + esc(x.id) + '"><div class="enq-head"><div><b>' + esc(x.name) + '</b> <span class="pill is-plain">' + (x.intent === "sell" ? "Wants to sell" : "Wants to buy") + "</span><time datetime=\"" + esc(x.at) + '">' + esc(ago(x.at)) + "</time></div>" +
      '<span class="pill is-' + esc(x.status) + '">' + esc(x.status[0].toUpperCase() + x.status.slice(1)) + "</span></div>" +
      (meta.length ? '<dl class="enq-meta">' + meta.map(function (m) { return "<div><dt>" + m[0] + ":</dt><dd>" + esc(m[1]) + "</dd></div>"; }).join("") + "</dl>" : "") +
      (x.message ? '<p class="enq-msg">' + esc(x.message) + "</p>" : "") +
      '<div class="enq-actions"><a class="btn btn-primary btn-sm" href="tel:' + esc(String(x.phone).replace(/[^\d+]/g, "")) + '">' + icon("phone") + esc(x.phone) + "</a>" +
      '<a class="btn btn-light btn-sm" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon("wa") + "WhatsApp</a>" +
      '<select aria-label="Status" data-status><option value="new"' + (x.status === "new" ? " selected" : "") + '>New</option><option value="contacted"' + (x.status === "contacted" ? " selected" : "") + '>Contacted</option><option value="closed"' + (x.status === "closed" ? " selected" : "") + ">Closed</option></select>" +
      '<button class="icon-only" data-del aria-label="Delete enquiry from ' + esc(x.name) + '">' + icon("trash") + "</button></div></article>";
  }
  function bindEnquiryCards(box, redraw) {
    $$(".enq", box).forEach(function (card) {
      var id = card.dataset.id, item = S.enquiries.filter(function (x) { return x.id === id; })[0];
      $("[data-status]", card).addEventListener("change", function (e) {
        var s = e.target.value, prev = item.status;
        item.status = s;
        api("enquiry", { id: id, status: s }).then(function () { toast("Marked as " + s); refreshEnquiryCount(); if (redraw) redraw(); })
          .catch(function (err) { item.status = prev; e.target.value = prev; toast(err.message, true); });
      });
      $("[data-del]", card).addEventListener("click", function () {
        confirmBox("Delete this enquiry?", "The enquiry from " + item.name + " will be removed permanently.", "Delete", true).then(function (ok) {
          if (!ok) return;
          api("enquiry", { id: id, delete: true }).then(function () {
            S.enquiries = S.enquiries.filter(function (x) { return x.id !== id; });
            card.remove(); refreshEnquiryCount(); toast("Enquiry deleted");
          }).catch(function (err) { toast(err.message, true); });
        });
      });
    });
  }

  /* ---------- regions ---------- */
  function viewRegions(v) {
    var R = S.data.regions;
    v.innerHTML = '<p class="muted" style="margin:0;font-size:var(--text-sm)">Regions appear in the menu, the filters, the regions explorer and the footer. Latitude and longitude place the dot on the mini map.</p><div class="rows" id="rlist"></div><button class="btn btn-light add-row" id="r-add">' + icon("plus") + "Add region</button>";
    function draw() {
      $("#rlist").innerHTML = R.map(function (r, i) {
        var used = S.data.properties.filter(function (p) { return p.region === r.id; }).length;
        return '<div class="item-card" data-i="' + i + '"><div class="item-card-head"><b>' + esc(r.name || "New region") + '</b><span class="pill is-plain">' + used + " " + (used === 1 ? "property" : "properties") + "</span>" +
          '<button class="icon-only" data-a="up" aria-label="Move up"' + (i ? "" : " disabled") + ">" + icon("up") + '</button><button class="icon-only" data-a="down" aria-label="Move down"' + (i < R.length - 1 ? "" : " disabled") + ">" + icon("down") + '</button><button class="icon-only" data-a="del" aria-label="Delete region"' + (used ? ' disabled title="Move or delete its properties first"' : "") + ">" + icon("trash") + "</button></div>" +
          '<div class="grid-3">' + inl(i, "name", "Name", r.name, 40) + inl(i, "ta", "Tamil name", r.ta, 60) + inl(i, "id", "Id (used in links)", r.id, 40, used ? "Fixed while properties use it" : "") +
          '<div class="field span-2"><label for="r' + i + '-blurb">Description</label><textarea id="r' + i + '-blurb" data-k="blurb" maxlength="300">' + esc(r.blurb) + "</textarea></div>" +
          '<div class="field"><label for="r' + i + '-scene">Image</label><div class="region-scene"><img src="../assets/img/scenes/' + esc(r.scene || "plots") + '.webp" alt=""><select id="r' + i + '-scene" data-k="scene">' + S.scenes.map(function (s) { return '<option value="' + s + '"' + (r.scene === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div></div>" +
          inl(i, "lat", "Latitude", r.lat, 12, "", "number") + inl(i, "lng", "Longitude", r.lng, 12, "", "number") + "</div></div>";
      }).join("");
      $$(".item-card", $("#rlist")).forEach(function (card) {
        var i = +card.dataset.i, r = R[i], used = S.data.properties.some(function (p) { return p.region === r.id; });
        if (used) $('[data-k="id"]', card).disabled = true;
        $$("[data-k]", card).forEach(function (inp) {
          inp.addEventListener("input", function () {
            var k = inp.dataset.k, val = inp.type === "number" ? Number(inp.value) : inp.value;
            if (k === "id") val = slugify(inp.value);
            r[k] = val; markDirty("data");
            if (k === "scene") $(".region-scene img", card).src = "../assets/img/scenes/" + val + ".webp";
            if (k === "name") $(".item-card-head b", card).textContent = val || "New region";
          });
        });
        card.addEventListener("click", function (e) {
          var b = e.target.closest("[data-a]");
          if (!b || b.disabled) return;
          if (b.dataset.a === "del") return confirmBox("Delete " + (r.name || "this region") + "?", "It will be removed from the website when you publish.", "Delete", true).then(function (ok) { if (ok) { R.splice(i, 1); markDirty("data"); draw(); } });
          var j = b.dataset.a === "up" ? i - 1 : i + 1, t = R[i]; R[i] = R[j]; R[j] = t; markDirty("data"); draw();
        });
      });
    }
    $("#r-add").addEventListener("click", function () {
      var id = "region", n = 2; while (R.some(function (r) { return r.id === id; })) id = "region-" + n++;
      R.push({ id: id, name: "", ta: "", lat: 8.96, lng: 77.31, blurb: "", scene: "farm", art: { kind: "farm", seed: 3 } });
      markDirty("data"); draw();
      var cards = $$(".item-card"); $('[data-k="name"]', cards[cards.length - 1]).focus();
    });
    draw();
  }
  function inl(i, k, label, value, max, hint, type) {
    return '<div class="field"><label for="r' + i + "-" + k + '">' + esc(label) + '</label><input id="r' + i + "-" + k + '" data-k="' + k + '" type="' + (type || "text") + '"' + (type === "number" ? ' step="any"' : ' maxlength="' + max + '"') + ' value="' + esc(value == null ? "" : value) + '">' + (hint ? "<small>" + esc(hint) + "</small>" : "") + "</div>";
  }

  /* ---------- steps & FAQs ---------- */
  function viewContent(v) {
    v.innerHTML = '<section class="panel"><h2>How it works (steps)</h2><p class="hint">The five-step line on the home page.</p><div class="rows" id="steps"></div><button class="btn btn-light btn-sm add-row" id="st-add" style="margin-top:var(--space-5)">' + icon("plus") + "Add step</button></section>" +
      '<section class="panel"><h2>Frequently asked questions</h2><p class="hint">The "Good to know" section on the home page.</p><div class="rows" id="faqs"></div><button class="btn btn-light btn-sm add-row" id="fq-add" style="margin-top:var(--space-5)">' + icon("plus") + "Add question</button></section>";
    pairEditor($("#steps"), $("#st-add"), S.data.process, "title", "text", "Step", "Title", "Description", 60, 300, 10);
    pairEditor($("#faqs"), $("#fq-add"), S.data.faqs, "q", "a", "Question", "Question", "Answer", 160, 1200, 30);
  }
  function pairEditor(box, add, arr, k1, k2, noun, l1, l2, m1, m2, maxItems) {
    function draw() {
      box.innerHTML = arr.map(function (x, i) {
        return '<div class="item-card" data-i="' + i + '"><div class="item-card-head"><b>' + noun + " " + (i + 1) + "</b>" +
          '<button class="icon-only" data-a="up" aria-label="Move up"' + (i ? "" : " disabled") + ">" + icon("up") + '</button><button class="icon-only" data-a="down" aria-label="Move down"' + (i < arr.length - 1 ? "" : " disabled") + ">" + icon("down") + '</button><button class="icon-only" data-a="del" aria-label="Delete">' + icon("trash") + "</button></div>" +
          '<div class="field"><label for="' + k1 + i + '">' + l1 + '</label><input id="' + k1 + i + '" data-k="' + k1 + '" maxlength="' + m1 + '" value="' + esc(x[k1]) + '"></div><div class="field"><label for="' + k2 + i + '">' + l2 + '</label><textarea id="' + k2 + i + '" data-k="' + k2 + '" maxlength="' + m2 + '">' + esc(x[k2]) + "</textarea></div></div>";
      }).join("") || '<div class="empty-box">None yet.</div>';
      $$(".item-card", box).forEach(function (card) {
        var i = +card.dataset.i;
        $$("[data-k]", card).forEach(function (inp) { inp.addEventListener("input", function () { arr[i][inp.dataset.k] = inp.value; markDirty("data"); }); });
        card.addEventListener("click", function (e) {
          var b = e.target.closest("[data-a]");
          if (!b || b.disabled) return;
          if (b.dataset.a === "del") return confirmBox("Delete " + noun.toLowerCase() + " " + (i + 1) + "?", "It will be removed when you publish.", "Delete", true).then(function (ok) { if (ok) { arr.splice(i, 1); markDirty("data"); draw(); } });
          var j = b.dataset.a === "up" ? i - 1 : i + 1, t = arr[i]; arr[i] = arr[j]; arr[j] = t; markDirty("data"); draw();
        });
      });
      add.disabled = arr.length >= maxItems;
    }
    add.addEventListener("click", function () { var o = {}; o[k1] = ""; o[k2] = ""; arr.push(o); markDirty("data"); draw(); var cards = $$(".item-card", box); $("input", cards[cards.length - 1]).focus(); });
    draw();
  }

  /* ---------- settings ---------- */
  function viewSettings(v) {
    var C = S.config;
    var f = function (path, label, hint, type) {
      var parts = path.split("."), val = parts.length > 1 ? C[parts[0]][parts[1]] : C[path];
      return '<div class="field"><label for="s-' + path.replace(".", "-") + '">' + esc(label) + '</label><input id="s-' + path.replace(".", "-") + '" data-p="' + path + '" type="' + (type || "text") + '" value="' + esc(val) + '">' + (hint ? "<small>" + esc(hint) + "</small>" : "") + "</div>";
    };
    v.innerHTML = '<section class="panel wa-panel"><h2>' + icon("wa") + 'WhatsApp</h2><p class="hint">Every WhatsApp button on the website opens a chat with this number.</p><div class="grid-2">' +
      '<div class="field"><label for="s-whatsapp">WhatsApp number</label><input id="s-whatsapp" data-p="whatsapp" type="tel" inputmode="tel" placeholder="+91 98765 43210" value="' + esc(C.whatsapp) + '"><small id="wa-check"></small></div>' +
      '<div class="field"><label for="s-whatsappMessage">First message</label><textarea id="s-whatsappMessage" data-p="whatsappMessage" rows="3" maxlength="300" placeholder="Hi! I would like to know more about your properties.">' + esc(C.whatsappMessage || "") + '</textarea><small>Typed in for the customer when they open the chat. They can change it before sending. Property buttons add the property name.</small></div>' +
      '</div><div class="quick" style="margin-top:var(--space-7)"><a class="btn btn-light btn-sm" id="wa-test" target="_blank" rel="noopener">' + icon("wa") + "Test the WhatsApp button</a></div></section>" +
      '<section class="panel"><h2>Contact</h2><p class="hint">Used in the header, footer, contact page and chat button.</p><div class="grid-2">' +
      f("phone", "Phone number", "Shown on the website, e.g. +91 98765 43210", "tel") +
      f("email", "Email", "", "email") + f("hours", "Opening hours", "e.g. Every day, 9:00 AM – 7:00 PM") +
      f("address", "Office address", "") + f("mapQuery", "Map location", "What Google Maps should search for, e.g. Tenkasi, Tamil Nadu") + "</div></section>" +
      '<section class="panel"><h2>Brand</h2><div class="grid-2">' + f("name", "Business name") + f("shortName", "Short name", "Big word in the logo and footer") + f("tagline", "Tagline", "Small text under the logo") + f("taglineTamil", "Tamil tagline") + "</div></section>" +
      '<section class="panel"><h2>Social links</h2><p class="hint">Main accounts, shown in the menu and footer.</p><div class="grid-3">' + f("instagram", "Instagram", "https://…", "url") + f("youtube", "YouTube", "https://…", "url") + f("threads", "Threads", "https://…", "url") + "</div>" +
      '<h3 class="sub-h">More accounts</h3><p class="hint">Extra pages or a second account. Each one appears as an icon in the website footer.</p><div class="rows" id="socials"></div>' +
      '<button class="btn btn-light btn-sm add-row" id="social-add" style="margin-top:var(--space-5)">' + icon("plus") + "Add account</button></section>" +
      '<section class="panel"><h2>Backup</h2><p class="hint">' + (DEMO.on ? "Your content, photos and videos are saved in this browser only. Download a backup to keep them safe or to move them to the live website." : "Download all content, settings and photo links as one file. Restore a backup (for example one downloaded from the old website address) to publish it here.") + '</p><div class="quick">' +
        '<button class="btn btn-light btn-sm" id="bk-down">' + icon("download") + "Download backup</button>" +
        (!DEMO.on && S.storage === "Supabase" ? '<label class="btn btn-light btn-sm" for="bk-file" style="cursor:pointer">' + icon("up") + 'Restore from backup</label><input type="file" id="bk-file" accept="application/json,.json" hidden>' : "") +
        '</div><p class="media-status" id="bk-st" aria-live="polite"></p></section>' +
      (DEMO.on ? '<section class="panel"><h2>Restore original content</h2><p class="hint">Undo every published change and remove uploaded photos and enquiries.</p><button class="btn btn-danger btn-sm" id="demo-reset">Restore original</button></section>' : "") +
      '<section class="panel"><h2>Numbers on the website</h2><div class="grid-3">' + f("stats.followers", "Followers", "e.g. 3L+") + f("stats.videos", "Posts & videos", "e.g. 1,350+") + f("stats.regions", "Regions", "e.g. 7") + "</div></section>";
    // more social accounts
    C.socials = C.socials || [];
    var PLATFORMS = [["instagram", "Instagram"], ["youtube", "YouTube"], ["facebook", "Facebook"], ["x", "X (Twitter)"], ["linkedin", "LinkedIn"], ["telegram", "Telegram"], ["pinterest", "Pinterest"], ["whatsapp", "WhatsApp channel"], ["threads", "Threads"], ["website", "Other website"]];
    var sbox = $("#socials", v);
    function drawSocials() {
      sbox.innerHTML = C.socials.map(function (s, i) {
        return '<div class="row-edit acct-row" data-i="' + i + '">' +
          '<select aria-label="Platform for account ' + (i + 1) + '" data-k="platform">' + PLATFORMS.map(function (p) { return '<option value="' + p[0] + '"' + (s.platform === p[0] ? " selected" : "") + ">" + p[1] + "</option>"; }).join("") + "</select>" +
          '<input aria-label="Link for account ' + (i + 1) + '" data-k="url" type="url" placeholder="https://…" value="' + esc(s.url) + '">' +
          '<input aria-label="Name for account ' + (i + 1) + '" data-k="label" maxlength="40" placeholder="Name (optional), e.g. Rentals page" value="' + esc(s.label || "") + '">' +
          '<button class="icon-only" data-del aria-label="Remove account ' + (i + 1) + '">' + icon("trash") + "</button></div>";
      }).join("") || '<p class="muted" style="margin:0;font-size:var(--text-sm)">No extra accounts yet.</p>';
      $$(".acct-row", sbox).forEach(function (row) {
        var i = +row.dataset.i;
        $$("[data-k]", row).forEach(function (el) { el.addEventListener(el.tagName === "SELECT" ? "change" : "input", function () { C.socials[i][el.dataset.k] = el.value; markDirty("config"); }); });
        $("[data-del]", row).addEventListener("click", function () { C.socials.splice(i, 1); markDirty("config"); drawSocials(); });
      });
      $("#social-add", v).disabled = C.socials.length >= 12;
    }
    $("#social-add", v).addEventListener("click", function () {
      C.socials.push({ platform: "instagram", url: "", label: "" }); markDirty("config"); drawSocials();
      var rows = $$(".acct-row", sbox); $('[data-k="url"]', rows[rows.length - 1]).focus();
    });
    drawSocials();

    $("#bk-down", v).addEventListener("click", function () { downloadBackup(this); });
    var bf = $("#bk-file", v);
    if (bf) bf.addEventListener("change", function (e) { var f = e.target.files[0]; e.target.value = ""; restoreBackup(f, $("label[for=bk-file]"), $("#bk-st")); });
    var dr = $("#demo-reset", v);
    if (dr) dr.addEventListener("click", function () {
      confirmBox("Restore the original content?", "All published changes, uploaded photos and enquiries will be removed.", "Restore", true).then(function (ok) {
        if (!ok) return;
        try { localStorage.removeItem(DEMO.key); localStorage.removeItem(DEMO.enq); } catch (e) {}
        if (window.TLP_MEDIA) TLP_MEDIA.clear();
        S.enquiries = null;
        loadContent().then(function () { go("settings"); toast("Original content restored"); });
      });
    });
    $$("[data-p]", v).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var parts = inp.dataset.p.split(".");
        var val = parts[0] === "whatsapp" ? inp.value.replace(/\D/g, "") : inp.value;   // the site needs digits only
        if (parts.length > 1) C[parts[0]][parts[1]] = val; else C[parts[0]] = val;
        markDirty("config");
        if (parts[0] === "whatsapp" || parts[0] === "whatsappMessage") waCheck();
      });
    });
    // WhatsApp: check the number and keep the test link current
    function waCheck() {
      var d = String(C.whatsapp || "").replace(/\D/g, ""), ok = d.length >= 11 && d.length <= 15 && !/^9?1?0+$/.test(d);
      var note = $("#wa-check"), test = $("#wa-test");
      if (!d || /^9?1?0+$/.test(d)) { note.textContent = "Not set yet: add your WhatsApp number with the country code."; note.className = "is-warn"; }
      else if (d.length === 10) { note.textContent = "Add the country code in front, e.g. 91 " + d; note.className = "is-warn"; }
      else if (!ok) { note.textContent = "That doesn't look like a full number with country code."; note.className = "is-warn"; }
      else { note.textContent = "Opens chats with +" + d.replace(/^91(\d{5})(\d{5})$/, "91 $1 $2"); note.className = "is-ok"; }
      test.href = "https://wa.me/" + d + (C.whatsappMessage ? "?text=" + encodeURIComponent(C.whatsappMessage) : "");
      test.toggleAttribute("aria-disabled", !ok);
      test.classList.toggle("is-off", !ok);
    }
    $("#wa-test").addEventListener("click", function (e) { if (this.classList.contains("is-off")) { e.preventDefault(); $("#s-whatsapp").focus(); } });
    waCheck();
  }

  boot();
})();
