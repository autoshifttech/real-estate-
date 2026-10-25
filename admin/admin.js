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
  function imgFor(p) {
    if (p.image) return S.previews[p.image] || (p.image.indexOf("data:") === 0 ? p.image : "../" + p.image);
    return "../assets/img/scenes/" + (p.scene || "plots") + ".webp";
  }

  var ICON = {
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
    if (action === "upload") return wait({ ok: true, path: body.dataUrl });   // the photo itself is kept in the demo content
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
  var NAV = [
    ["dashboard", "Dashboard", "home"], ["properties", "Properties", "list"], ["enquiries", "Enquiries", "inbox"],
    ["regions", "Regions", "map"], ["content", "Steps & FAQs", "help"], ["settings", "Settings", "cog"]
  ];
  var TITLES = { dashboard: "Dashboard", properties: "Properties", enquiries: "Enquiries", regions: "Regions", content: "Steps & FAQs", settings: "Site settings", editor: "Edit property" };

  function renderShell() {
    app.innerHTML = '<div class="shell"><div class="mbar"><button type="button" class="mbar-menu" aria-label="Open menu" aria-expanded="false" aria-controls="side">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '<span class="mbar-title" id="mtitle"></span><a class="mbar-site" href="../index.html" target="_blank" rel="noopener" aria-label="View website">' + icon("ext") + "</a></div>" +
      '<div class="side-back" hidden></div><aside class="side" id="side"><a class="brand" href="../index.html" target="_blank" rel="noopener">' + MARK + '<span class="brand-word"><strong>Tenkasi</strong><small>Admin</small></span></a>' +
      '<nav aria-label="Admin">' + NAV.map(function (n) { return '<button type="button" data-view="' + n[0] + '">' + icon(n[2]) + n[1] + (n[0] === "enquiries" ? '<span class="count" id="new-count" hidden></span>' : "") + "</button>"; }).join("") + "</nav>" +
      '<div class="side-foot"><p class="who">Signed in as <b>' + esc(S.user) + '</b></p><a href="../index.html" target="_blank" rel="noopener">' + icon("ext") + '<span>View website</span></a><button type="button" id="logout">' + icon("out") + "<span>Sign out</span></button></div></aside>" +
      '<div class="main"><header class="topbar"><h1 id="title"></h1><span class="topbar-gap"></span><div class="publish" id="publish"></div></header><main class="content" id="view"></main></div></div>';
    var menuBtn = $(".mbar-menu"), back = $(".side-back");
    function drawer(open) {
      app.querySelector(".shell").classList.toggle("is-menu", open);
      menuBtn.setAttribute("aria-expanded", String(open)); menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      back.hidden = !open;
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) { var cur = $('.side nav [aria-current="page"]') || $(".side nav button"); cur.focus(); } else menuBtn.focus();
    }
    menuBtn.addEventListener("click", function () { drawer(!app.querySelector(".shell").classList.contains("is-menu")); });
    back.addEventListener("click", function () { drawer(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && app.querySelector(".shell.is-menu")) drawer(false); });
    $$(".side nav [data-view]").forEach(function (b) { b.addEventListener("click", function () { if (app.querySelector(".shell.is-menu")) { app.querySelector(".shell").classList.remove("is-menu"); back.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); document.documentElement.style.overflow = ""; } go(b.dataset.view); }); });
    $("#logout").addEventListener("click", function () {
      var leave = function () { api("logout", {}).then(function () { S.user = null; renderLogin("You have signed out."); }); };
      if (isDirty()) confirmBox("Sign out?", "You have unpublished changes. They will be lost.", "Sign out", true).then(function (ok) { if (ok) leave(); });
      else leave();
    });
    go(S.view === "editor" ? "properties" : S.view);
    refreshEnquiryCount();
  }

  function go(view) {
    S.view = view;
    $$(".side nav [data-view]").forEach(function (b) { if (b.dataset.view === (view === "editor" ? "properties" : view)) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    $("#title").textContent = TITLES[view] || "";
    $("#mtitle").textContent = TITLES[view] || "";
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
      renderPublish(DEMO.on ? "Published" : "Published · the website updates in about a minute");
      toast(DEMO.on ? "Published. The website shows the changes now." : "Published. The website will show the changes in about a minute.");
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
    v.innerHTML = '<div class="kpis">' +
      kpi(P.length, "Properties listed") + kpi(count(function (p) { return p.status !== "sold"; }), "Available now") +
      kpi(count(function (p) { return p.featured; }), "Featured on home page") + kpi('<span id="kpi-new">…</span>', "New enquiries") + "</div>" +
      '<section class="panel"><h2>Quick actions</h2><p class="hint">Changes are saved as a draft. Press <b>Publish to website</b> at the top when you are ready.</p><div class="quick">' +
      '<button class="btn btn-primary" data-act="add">' + icon("plus") + "Add a property</button>" +
      '<button class="btn btn-light" data-go="enquiries">' + icon("inbox") + "Open enquiries</button>" +
      '<button class="btn btn-light" data-go="settings">' + icon("cog") + "Phone, WhatsApp & links</button>" +
      '<a class="btn btn-light" href="../index.html" target="_blank" rel="noopener">' + icon("ext") + "View website</a></div></section>" +
      '<section class="panel"><div class="panel-head"><h2>Latest enquiries</h2><button class="btn btn-light btn-sm" data-go="enquiries">See all</button></div><div id="dash-enq" class="rows"><p class="muted">Loading…</p></div></section>';
    $$("[data-go]", v).forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.go); }); });
    $("[data-act=add]", v).addEventListener("click", function () { openEditor(null); });
    getEnquiries().then(function (items) {
      var box = $("#dash-enq");
      if (!box) return;
      var latest = items.slice(0, 5);
      box.innerHTML = latest.length ? latest.map(enquiryCard).join("") : '<div class="empty-box">No enquiries yet. Form submissions from the website appear here.</div>';
      bindEnquiryCards(box);
    }).catch(function (e) { var box = $("#dash-enq"); if (box) box.innerHTML = '<p class="alert">' + esc(e.message) + "</p>"; });
  }
  function kpi(n, label) { return '<div class="kpi"><b>' + n + "</b><span>" + esc(label) + "</span></div>"; }

  /* ---------- properties ---------- */
  function viewProperties(v) {
    var f = S.filter;
    v.innerHTML = '<div class="toolbar"><input type="search" id="pq" placeholder="Search properties" aria-label="Search properties" value="' + esc(f.q) + '">' +
      '<select id="pr" aria-label="Filter by region"><option value="">All regions</option>' + S.data.regions.map(function (r) { return '<option value="' + esc(r.id) + '"' + (f.region === r.id ? " selected" : "") + ">" + esc(r.name) + "</option>"; }).join("") + "</select>" +
      '<select id="ps" aria-label="Filter by status"><option value="">Any status</option>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (f.status === k ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select>" +
      '<button class="btn btn-primary" id="padd">' + icon("plus") + "Add property</button></div>" +
      '<p class="muted" style="margin:0;font-size:var(--text-sm)">Order here is the order on the website. Star = featured on the home page.</p><div class="plist" id="plist"></div>';
    $("#pq").addEventListener("input", function (e) { f.q = e.target.value; drawList(); });
    $("#pr").addEventListener("change", function (e) { f.region = e.target.value; drawList(); });
    $("#ps").addEventListener("change", function (e) { f.status = e.target.value; drawList(); });
    $("#padd").addEventListener("click", function () { openEditor(null); });
    drawList();
  }
  function drawList() {
    var f = S.filter, P = S.data.properties, box = $("#plist");
    var q = f.q.trim().toLowerCase();
    var shown = P.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) {
      var p = x.p;
      return (!f.region || p.region === f.region) && (!f.status || p.status === f.status) && (!q || (p.title + " " + p.location).toLowerCase().indexOf(q) >= 0);
    });
    var filtered = f.q || f.region || f.status;
    box.innerHTML = shown.length ? shown.map(function (x) {
      var p = x.p, i = x.i;
      return '<div class="prow" data-i="' + i + '"><div class="thumb"><img src="' + esc(imgFor(p)) + '" alt="" loading="lazy"></div>' +
        '<div class="prow-main"><b>' + esc(p.title) + "</b><span>" + esc(p.location) + " · " + esc(typeLabel(p.type)) + "</span></div>" +
        '<span class="price">' + price(p.price) + (p.priceNote === "onwards" ? "+" : "") + "</span>" +
        '<span class="pill is-' + esc(p.status) + '">' + STATUS[p.status] + "</span>" +
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

  /* ---------- property editor ---------- */
  var TYPE_SCENE = { plot: "plots", farm: "farm", estate: "hills", commercial: "highway", house: "house" };
  var TYPE_ART = { plot: "plan", farm: "farm", estate: "hills", commercial: "highway", house: "plan" };

  function openEditor(index) {
    var p;
    if (index == null) {
      var t = S.data.types[0].id;
      p = { id: "", title: "", region: S.data.regions[0].id, type: t, location: "", price: "", priceNote: "total", area: "", approval: "", facing: "", road: "",
        status: "available", featured: false, summary: "", description: "", highlights: [], nearby: [], scene: TYPE_SCENE[t], art: { kind: TYPE_ART[t], seed: 1 + Math.floor(Math.random() * 40) } };
    } else p = clone(S.data.properties[index]);
    p.highlights = p.highlights || []; p.nearby = p.nearby || [];
    S.edit = { index: index, p: p, autoId: index == null };
    go("editor");
  }

  function viewEditor(v) {
    var E = S.edit, p = E.p;
    var opt = function (list, val) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join(""); };
    var L = p.layout;
    v.innerHTML =
      '<div class="editor-head"><button class="back" type="button" id="e-back">' + icon("back") + 'Back to properties</button><div class="actions-row"><button class="btn btn-light" id="e-cancel">Cancel</button><button class="btn btn-primary" id="e-save">' + (E.index == null ? "Add property" : "Save changes") + "</button></div></div>" +
      '<p class="alert" id="e-err" hidden></p>' +
      '<section class="panel"><h2>Basic details</h2><p class="hint">Fields marked <span class="req">*</span> are required.</p><div class="grid-2">' +
      fld("title", "Title", p.title, { req: 1, span: 1, max: 80 }) +
      fld("id", "Web address", p.id, { req: 1, hint: "Used in the link: property.html?id=…  Lowercase letters, numbers and dashes." }) +
      fld("location", "Location", p.location, { req: 1, hint: "Example: Courtallam Road, Tenkasi" }) +
      sel("region", "Region", opt(S.data.regions.map(function (r) { return [r.id, r.name]; }), p.region), 1) +
      sel("type", "Type", opt(S.data.types.map(function (t) { return [t.id, t.label.replace(/s$/, "")]; }), p.type), 1) +
      sel("status", "Status", opt([["available", "Available"], ["few", "Few left"], ["sold", "Sold out"]], p.status)) +
      '<div class="field"><span class="label-like" style="font-family:var(--font-display);font-size:var(--text-sm);font-weight:500">Home page</span><label class="switch"><input type="checkbox" id="f-featured"' + (p.featured ? " checked" : "") + "> Show in Featured</label></div>" +
      "</div></section>" +
      '<section class="panel"><h2>Price & size</h2><div class="grid-3">' +
      fld("price", "Price (₹)", p.price, { req: 1, type: "number", hint: '<span class="price-preview" id="price-prev">' + (p.price !== "" ? price(p.price) : "") + "</span>" }) +
      sel("priceNote", "Price shown as", opt([["total", "Total price"], ["onwards", "Onwards (from)"], ["per cent", "Per cent"], ["per acre", "Per acre"], ["per sq.ft", "Per sq.ft"]], p.priceNote)) +
      fld("area", "Area", p.area, { req: 1, hint: "Example: 1,200 – 2,400 sq.ft or 2.5 acres" }) +
      fld("approval", "Approval / title", p.approval, { req: 1, hint: "Example: DTCP approved, Patta land · clear title" }) +
      fld("facing", "Facing", p.facing, {}) +
      fld("road", "Road access", p.road, { hint: "Example: 30 ft blacktop" }) +
      "</div></section>" +
      '<section class="panel"><h2>Photo</h2><p class="hint">Upload a real photo (it replaces the illustration), or choose one of the illustrations.</p><div class="media-row">' +
      '<div><div class="media-preview"><img id="m-img" src="' + esc(imgFor(p)) + '" alt="Preview"><span class="pill is-plain tag" id="m-tag">' + (p.image ? "Photo" : "Illustration") + "</span></div>" +
      '<div class="upload-row" style="margin-top:var(--space-5)"><label class="btn btn-primary btn-sm" for="m-file" style="cursor:pointer">Upload photo</label><input type="file" id="m-file" accept="image/jpeg,image/png,image/webp" hidden>' +
      '<button class="btn btn-light btn-sm" id="m-remove"' + (p.image ? "" : " hidden") + ">Remove photo</button></div><p class=\"muted\" id=\"m-status\" style=\"font-size:var(--text-xs);margin:var(--space-3) 0 0\"></p></div>" +
      '<div><b style="font-family:var(--font-display);font-size:var(--text-sm)">Illustration</b><div class="scene-grid">' + S.scenes.map(function (s) {
        return '<button type="button" class="scene-opt" data-scene="' + s + '" aria-pressed="' + (p.scene === s) + '" aria-label="Illustration ' + s + '"><img src="../assets/img/scenes/' + s + '.webp" alt="" loading="lazy"><span>' + s + "</span></button>";
      }).join("") + "</div></div></div></section>" +
      '<section class="panel"><h2>Description</h2><div class="grid-2">' +
      '<div class="field span-2"><label for="f-summary">Short summary <span class="req">*</span><span class="counter" id="sum-c"></span></label><input id="f-summary" maxlength="220" value="' + esc(p.summary) + '"><small>One sentence shown on cards and search results.</small></div>' +
      '<div class="field span-2"><label for="f-description">Full description</label><textarea id="f-description" rows="6" maxlength="3000">' + esc(p.description) + "</textarea></div>" +
      "</div></section>" +
      '<section class="panel"><h2>Highlights</h2><p class="hint">Short points with ticks on the property page.</p><div class="rows" id="hl"></div><button class="btn btn-light btn-sm add-row" id="hl-add" style="margin-top:var(--space-5)">' + icon("plus") + "Add highlight</button></section>" +
      '<section class="panel"><h2>Location & video</h2><p class="hint">Nearby places and the map pin on the property page.</p><div class="rows" id="nb"></div><button class="btn btn-light btn-sm add-row" id="nb-add" style="margin:var(--space-5) 0 var(--space-9)">' + icon("plus") + "Add nearby place</button>" +
      '<div class="grid-3">' + fld("lat", "Map latitude", p.coords ? p.coords[0] : "", { type: "number", step: "any", hint: "Example: 8.94" }) + fld("lng", "Map longitude", p.coords ? p.coords[1] : "", { type: "number", step: "any", hint: "Example: 77.28" }) +
      fld("video", "Video link", p.video || "", { hint: "Instagram or YouTube walkthrough (https://…)" }) + "</div></section>" +
      '<section class="panel"><h2>Plot layout</h2><p class="hint">For layouts with plots: buyers pick a plot on the property page. Click a plot to switch Available → Booked → Sold.</p>' +
      '<label class="switch"><input type="checkbox" id="lay-on"' + (L ? " checked" : "") + "> This property has a plot layout</label>" +
      '<div id="lay"' + (L ? "" : " hidden") + ' style="margin-top:var(--space-7)"><div class="grid-3">' +
      fld("rows", "Rows", L ? L.rows : 4, { type: "number" }) + fld("cols", "Plots per row", L ? L.cols : 8, { type: "number" }) + fld("plotSize", "Plot size", L ? L.plotSize : "30 × 40 ft", {}) +
      '</div><div class="quick" style="margin-top:var(--space-5)"><button class="btn btn-light btn-sm" id="lay-free">All available</button><button class="btn btn-light btn-sm" id="lay-sold">All sold</button></div><div class="plot-grid" id="lay-grid"></div><div class="plot-legend" id="lay-legend"></div></div></section>';

    // inputs
    var val = function (id) { var el = $("#f-" + id); return el ? el.value : ""; };
    v.addEventListener("input", function () { var er = $("#e-err"); if (er) er.hidden = true; });
    $("#f-title").addEventListener("input", function () { if (E.autoId) $("#f-id").value = uniqueId(slugify(val("title"))); });
    $("#f-id").addEventListener("input", function () { E.autoId = false; });
    $("#f-price").addEventListener("input", function () { $("#price-prev").textContent = val("price") !== "" ? price(val("price")) : ""; });
    var sumC = function () { $("#sum-c").textContent = val("summary").length + "/220"; };
    $("#f-summary").addEventListener("input", sumC); sumC();
    $("#f-type").addEventListener("change", function () { if (!p.image && E.index == null) setScene(TYPE_SCENE[val("type")]); });

    // media
    function setScene(s) { p.scene = s; $$(".scene-opt").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.scene === s)); }); if (!p.image) $("#m-img").src = imgFor(p); }
    $$(".scene-opt").forEach(function (b) { b.addEventListener("click", function () { setScene(b.dataset.scene); }); });
    $("#m-remove").addEventListener("click", function (e) { e.preventDefault(); delete p.image; $("#m-img").src = imgFor(p); $("#m-tag").textContent = "Illustration"; e.target.hidden = true; });
    $("#m-file").addEventListener("change", function (e) {
      var file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      var st = $("#m-status");
      st.textContent = "Preparing photo…";
      resize(file).then(function (dataUrl) {
        st.textContent = "Uploading…";
        return api("upload", { name: val("id") || slugify(val("title")) || file.name, dataUrl: dataUrl }).then(function (d) {
          S.previews[d.path] = dataUrl;
          p.image = d.path;
          $("#m-img").src = dataUrl; $("#m-tag").textContent = "Photo"; $("#m-remove").hidden = false;
          st.textContent = "Photo uploaded. It shows on the website after you publish.";
        });
      }).catch(function (err) { st.textContent = ""; toast(err.message, true); });
    });

    // list editors
    listEditor($("#hl"), $("#hl-add"), p.highlights, function (h, i) { return '<div class="row-edit"><input aria-label="Highlight ' + (i + 1) + '" maxlength="140" value="' + esc(h) + '"><button class="icon-only" data-del aria-label="Remove">' + icon("trash") + "</button></div>"; },
      function (row) { return $("input", row).value; }, "");
    listEditor($("#nb"), $("#nb-add"), p.nearby, function (n, i) {
      return '<div class="row-edit two"><input aria-label="Nearby place ' + (i + 1) + '" placeholder="Place, e.g. Tenkasi bus stand" maxlength="80" value="' + esc(n.name) + '"><input aria-label="Distance ' + (i + 1) + '" placeholder="Distance, e.g. 5 km" maxlength="30" value="' + esc(n.dist) + '"><button class="icon-only" data-del aria-label="Remove">' + icon("trash") + "</button></div>";
    }, function (row) { var x = $$("input", row); return { name: x[0].value, dist: x[1].value }; }, { name: "", dist: "" });

    // layout
    var lay = L ? clone(L) : { rows: 4, cols: 8, plotSize: "30 × 40 ft", sold: [], booked: [] };
    if (lay.sold === "all") { lay.sold = []; for (var k = 0; k < lay.rows * lay.cols; k++) lay.sold.push(k); }
    function drawGrid() {
      var rows = Math.max(1, Math.min(20, +val("rows") || 1)), cols = Math.max(1, Math.min(30, +val("cols") || 1)), n = rows * cols;
      lay.sold = lay.sold.filter(function (x) { return x < n; }); lay.booked = lay.booked.filter(function (x) { return x < n; });
      var g = $("#lay-grid");
      g.style.gridTemplateColumns = "repeat(" + cols + ", minmax(34px, 1fr))";
      var html = "";
      for (var i = 0; i < n; i++) {
        var s = lay.sold.indexOf(i) >= 0 ? "sold" : lay.booked.indexOf(i) >= 0 ? "booked" : "available";
        html += '<button type="button" class="plot-cell is-' + s + '" data-i="' + i + '" aria-label="Plot ' + (i + 1) + ", " + s + '">' + (i + 1) + "</button>";
      }
      g.innerHTML = html;
      $("#lay-legend").innerHTML = "<span><b>" + (n - lay.sold.length - lay.booked.length) + "</b> available</span><span><b>" + lay.booked.length + "</b> booked</span><span><b>" + lay.sold.length + "</b> sold</span>";
    }
    $("#lay-grid").addEventListener("click", function (e) {
      var c = e.target.closest(".plot-cell");
      if (!c) return;
      var i = +c.dataset.i;
      if (lay.sold.indexOf(i) >= 0) lay.sold.splice(lay.sold.indexOf(i), 1);
      else if (lay.booked.indexOf(i) >= 0) { lay.booked.splice(lay.booked.indexOf(i), 1); lay.sold.push(i); }
      else lay.booked.push(i);
      drawGrid();
      var nb = $('.plot-cell[data-i="' + i + '"]'); if (nb) nb.focus();
    });
    ["rows", "cols"].forEach(function (k) { $("#f-" + k).addEventListener("input", drawGrid); });
    $("#lay-free").addEventListener("click", function (e) { e.preventDefault(); lay.sold = []; lay.booked = []; drawGrid(); });
    $("#lay-sold").addEventListener("click", function (e) { e.preventDefault(); var n = (+val("rows") || 1) * (+val("cols") || 1); lay.booked = []; lay.sold = []; for (var i = 0; i < n; i++) lay.sold.push(i); drawGrid(); });
    $("#lay-on").addEventListener("change", function (e) { $("#lay").hidden = !e.target.checked; });
    drawGrid();

    // save / cancel
    function close() { S.edit = null; go("properties"); }
    var cancel = function () {
      confirmBox("Leave without saving?", "Changes to this property will be lost.", "Leave", true).then(function (ok) { if (ok) close(); });
    };
    $("#e-back").addEventListener("click", cancel);
    $("#e-cancel").addEventListener("click", cancel);
    $("#e-save").addEventListener("click", function () {
      var err = $("#e-err"), out = clone(p);
      ["title", "id", "location", "region", "type", "status", "priceNote", "area", "approval", "facing", "road", "summary", "description", "video"].forEach(function (k) { out[k] = val(k).trim(); });
      out.featured = $("#f-featured").checked;
      out.price = val("price") === "" ? "" : Number(val("price"));
      out.highlights = (p.highlights || []).map(function (h) { return String(h).trim(); }).filter(Boolean);
      out.nearby = (p.nearby || []).filter(function (n) { return n.name.trim(); });
      if (val("lat") !== "" && val("lng") !== "") out.coords = [Number(val("lat")), Number(val("lng"))]; else delete out.coords;
      if (!out.video) delete out.video;
      if ($("#lay-on").checked) out.layout = { rows: +val("rows"), cols: +val("cols"), plotSize: val("plotSize").trim(), sold: lay.sold.slice().sort(function (a, b) { return a - b; }), booked: lay.booked.slice().sort(function (a, b) { return a - b; }) };
      else delete out.layout;
      out.art = Object.assign({}, out.art || {}, { kind: TYPE_ART[out.type] || "plan" });

      var problems = [];
      if (!out.title) problems.push("Title");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(out.id)) problems.push("Web address (lowercase letters, numbers and dashes)");
      else if (S.data.properties.some(function (x, i) { return x.id === out.id && i !== E.index; })) problems.push("Web address is already used by another property");
      if (!out.location) problems.push("Location");
      if (out.price === "" || !(out.price >= 0)) problems.push("Price");
      if (!out.area) problems.push("Area");
      if (!out.approval) problems.push("Approval / title");
      if (!out.summary) problems.push("Short summary");
      if (out.video && !/^https:\/\//.test(out.video)) problems.push("Video link must start with https://");
      if (out.layout && (!out.layout.plotSize || !(out.layout.rows >= 1 && out.layout.rows <= 20) || !(out.layout.cols >= 1 && out.layout.cols <= 30))) problems.push("Plot layout: rows 1–20, plots per row 1–30 and a plot size");
      if (problems.length) {
        err.hidden = false;
        err.innerHTML = "<b>Please check:</b> " + problems.map(esc).join(", ") + ".";
        err.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (E.index == null) S.data.properties.unshift(out); else S.data.properties[E.index] = out;
      markDirty("data");
      toast(E.index == null ? "Property added. Publish to put it on the website." : "Saved. Publish to update the website.");
      close();
    });
  }
  function fld(k, label, value, o) {
    o = o || {};
    return '<div class="field' + (o.span ? " span-2" : "") + '"><label for="f-' + k + '">' + esc(label) + (o.req ? ' <span class="req">*</span>' : "") + "</label>" +
      '<input id="f-' + k + '" type="' + (o.type || "text") + '"' + (o.step ? ' step="' + o.step + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + ' value="' + esc(value == null ? "" : value) + '">' +
      (o.hint ? "<small>" + o.hint + "</small>" : "") + "</div>";
  }
  function sel(k, label, options, req) {
    return '<div class="field"><label for="f-' + k + '">' + esc(label) + (req ? ' <span class="req">*</span>' : "") + '</label><select id="f-' + k + '">' + options + "</select></div>";
  }
  /* rows of inputs bound to an array */
  function listEditor(box, addBtn, arr, rowHtml, read, blank) {
    function draw() {
      box.innerHTML = arr.map(rowHtml).join("") || '<p class="muted" style="margin:0;font-size:var(--text-sm)">None yet.</p>';
      $$(".row-edit", box).forEach(function (row, i) {
        $$("input", row).forEach(function (inp) { inp.addEventListener("input", function () { arr[i] = read(row); }); });
        $("[data-del]", row).addEventListener("click", function (e) { e.preventDefault(); arr.splice(i, 1); draw(); });
      });
    }
    addBtn.addEventListener("click", function (e) { e.preventDefault(); arr.push(clone(blank)); draw(); var ins = $$("input", box); if (ins.length) ins[ins.length - (typeof blank === "string" ? 1 : 2)].focus(); });
    draw();
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
    draw();
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
    v.innerHTML = '<section class="panel"><h2>Contact</h2><p class="hint">Used in the header, footer, contact page, chat button and every enquiry form.</p><div class="grid-2">' +
      f("phone", "Phone number", "Shown on the website, e.g. +91 98765 43210", "tel") + f("whatsapp", "WhatsApp number", "Country code + number, digits only, e.g. 919876543210", "tel") +
      f("email", "Email", "", "email") + f("hours", "Opening hours", "e.g. Every day, 9:00 AM – 7:00 PM") +
      f("address", "Office address", "") + f("mapQuery", "Map location", "What Google Maps should search for, e.g. Tenkasi, Tamil Nadu") + "</div></section>" +
      '<section class="panel"><h2>Brand</h2><div class="grid-2">' + f("name", "Business name") + f("shortName", "Short name", "Big word in the logo and footer") + f("tagline", "Tagline", "Small text under the logo") + f("taglineTamil", "Tamil tagline") + "</div></section>" +
      '<section class="panel"><h2>Social links</h2><p class="hint">Main accounts, shown in the menu and footer.</p><div class="grid-3">' + f("instagram", "Instagram", "https://…", "url") + f("youtube", "YouTube", "https://…", "url") + f("threads", "Threads", "https://…", "url") + "</div>" +
      '<h3 class="sub-h">More accounts</h3><p class="hint">Extra pages or a second account. Each one appears as an icon in the website footer.</p><div class="rows" id="socials"></div>' +
      '<button class="btn btn-light btn-sm add-row" id="social-add" style="margin-top:var(--space-5)">' + icon("plus") + "Add account</button></section>" +
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

    var dr = $("#demo-reset", v);
    if (dr) dr.addEventListener("click", function () {
      confirmBox("Restore the original content?", "All published changes, uploaded photos and enquiries will be removed.", "Restore", true).then(function (ok) {
        if (!ok) return;
        try { localStorage.removeItem(DEMO.key); localStorage.removeItem(DEMO.enq); } catch (e) {}
        S.enquiries = null;
        loadContent().then(function () { go("settings"); toast("Original content restored"); });
      });
    });
    $$("[data-p]", v).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var parts = inp.dataset.p.split(".");
        if (parts.length > 1) C[parts[0]][parts[1]] = inp.value; else C[parts[0]] = inp.value;
        markDirty("config");
      });
    });
  }

  boot();
})();
