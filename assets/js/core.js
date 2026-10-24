/*
 * Shared site behaviour: header, footer, menu, chat button, reveal-on-scroll,
 * listing cards, price formatting and enquiry forms.
 */
(function () {
  "use strict";

  var TLP = (window.TLP = window.TLP || {});
  var CFG = window.TLP_CONFIG || {};
  var DATA = window.TLP_DATA || { regions: [], types: [], properties: [] };
  document.documentElement.classList.add("js");

  /* ---------- utils ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function trimNum(n) { return String(parseFloat(n.toFixed(2))); }
  function formatPrice(n) {
    if (n >= 1e7) return "₹" + trimNum(n / 1e7) + " Cr";
    if (n >= 1e5) return "₹" + trimNum(n / 1e5) + " L";
    return "₹" + Number(n).toLocaleString("en-IN");
  }
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function waLink(text) {
    return "https://wa.me/" + String(CFG.whatsapp || "").replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function telLink() { return "tel:" + String(CFG.phone || "").replace(/[^\d+]/g, ""); }
  function region(id) { return DATA.regions.filter(function (r) { return r.id === id; })[0]; }
  function type(id) { return DATA.types.filter(function (t) { return t.id === id; })[0]; }
  function property(id) { return DATA.properties.filter(function (p) { return p.id === id; })[0]; }
  function reduced() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

  /* ---------- icons ---------- */

  var I = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>',
    chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M15 4l-8 8 8 8"/></svg>',
    chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.7-.3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3L10 15z"/></svg>',
    threads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M16.5 11.2c-.3-2.6-2-3.9-4.4-3.9-2 0-3.3 1-3.8 2.4M16.6 11.3c-3.8-.9-7.6-.2-7.4 2.6.2 2.4 4.2 2.6 5.6.4.9-1.4 1-3.6.4-5.7M12 21c-5 0-8-3.3-8-9s3-9 8-9c4.1 0 6.8 2.1 7.6 5.6M19.5 14.6c-.4 3.9-3 6.4-7.5 6.4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    bubble: '<svg class="bubble" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 18.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3.5z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    close: '<svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mark: '<svg class="brand-mark" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M2 25 L12 11 L17 17.5 L23.5 7 L38 25"/><path pathLength="1" d="M7 31 L20 27 L33 31 L20 35 Z"/></svg>'
  };
  TLP.icons = I;

  /* ---------- header, menu, footer, chat ---------- */

  var NAV = [
    { href: "index.html", label: "Home", page: "home" },
    { href: "properties.html", label: "Properties", page: "properties" },
    { href: "index.html#regions", label: "Locations", page: "locations" },
    { href: "about.html", label: "About", page: "about" },
    { href: "contact.html", label: "Contact", page: "contact" }
  ];

  function brand() {
    return '<a class="brand" href="index.html" aria-label="' + esc(CFG.name) + ' — home">' + I.mark +
      '<span class="brand-word"><strong>' + esc(CFG.shortName || "Tenkasi") + "</strong><small>" + esc(CFG.tagline || "Land Promoters") + "</small></span></a>";
  }

  function renderChrome() {
    var page = document.body.getAttribute("data-page") || "";
    var nav = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + (n.page === page ? ' aria-current="page"' : "") + ">" + n.label + "</a>";
    }).join("");
    var header =
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-header" id="site-header"><div class="wrap">' + brand() +
      '<nav class="nav" aria-label="Main">' + nav + "</nav>" +
      '<div class="nav-actions"><a class="nav-sell" href="contact.html?tab=sell#enquiry">Sell your land</a>' +
      '<a class="btn btn-primary" href="contact.html#enquiry">Book a site visit</a>' +
      '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span><span></span></button></div>' +
      "</div></header>" +
      '<div class="mobile-menu" id="mobile-menu" aria-hidden="true"><nav aria-label="Mobile">' +
      NAV.map(function (n, i) { return '<a href="' + n.href + '">' + n.label + "<small>0" + (i + 1) + "</small></a>"; }).join("") +
      '<a href="contact.html?tab=sell#enquiry">Sell your land<small>06</small></a></nav>' +
      '<div><div class="mobile-cta"><a class="btn btn-primary" href="contact.html#enquiry">Book a site visit</a>' +
      '<a class="btn btn-ghost" href="' + waLink("Hi! I'd like to know more about your properties.") + '" target="_blank" rel="noopener">' + I.whatsapp + "WhatsApp us</a></div>" +
      '<p class="tamil-line" lang="ta">' + esc(CFG.taglineTamil) + "</p></div></div>";

    var regionLinks = DATA.regions.map(function (r) { return '<li><a href="properties.html?region=' + r.id + '">' + esc(r.name) + "</a></li>"; }).join("");
    var footer =
      '<footer class="site-footer"><div class="wrap">' +
      '<div class="footer-top"><div class="footer-brand">' + brand() +
      "<p>Plots, farm land and hill estates across South Tamil Nadu and Kerala — every one walked, filmed and checked before it reaches you.</p>" +
      '<p class="tamil-line" lang="ta">' + esc(CFG.taglineTamil) + "</p>" +
      '<div class="footer-social">' +
      '<a class="icon-btn" href="' + esc(CFG.instagram) + '" target="_blank" rel="noopener" aria-label="Instagram">' + I.instagram + "</a>" +
      '<a class="icon-btn" href="' + esc(CFG.youtube) + '" target="_blank" rel="noopener" aria-label="YouTube">' + I.youtube + "</a>" +
      '<a class="icon-btn" href="' + esc(CFG.threads) + '" target="_blank" rel="noopener" aria-label="Threads">' + I.threads + "</a>" +
      '<a class="icon-btn" href="' + waLink() + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + I.whatsapp + "</a>" +
      "</div></div>" +
      '<div class="footer-col"><h2>Explore</h2><ul>' +
      '<li><a href="properties.html">All properties</a></li><li><a href="properties.html?type=plot">Residential plots</a></li>' +
      '<li><a href="properties.html?type=farm">Farm land</a></li><li><a href="properties.html?type=estate">Hill estates</a></li>' +
      '<li><a href="about.html">About us</a></li><li><a href="contact.html?tab=sell#enquiry">Sell your land</a></li></ul></div>' +
      '<div class="footer-col"><h2>Regions</h2><ul>' + regionLinks + "</ul></div>" +
      '<div class="footer-col"><h2>Contact</h2><ul>' +
      '<li><a href="' + telLink() + '">' + esc(CFG.phone) + "</a></li>" +
      '<li><a href="' + waLink() + '" target="_blank" rel="noopener">WhatsApp</a></li>' +
      '<li><a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + "</a></li>" +
      "<li>" + esc(CFG.address) + "</li><li>" + esc(CFG.hours) + "</li></ul></div>" +
      "</div>" +
      '<p class="footer-big" aria-hidden="true">' + esc(CFG.shortName || "Tenkasi") + "</p>" +
      '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + " " + esc(CFG.name) + ". All rights reserved.</span>" +
      "<span>Prices and availability are indicative and may change. Please verify all documents before purchase.</span></div>" +
      "</div></footer>";

    var chat =
      '<div class="chat" id="chat"><div class="chat-panel" id="chat-panel" role="dialog" aria-label="Contact us">' +
      "<h3>Talk to us</h3><p>Ask about a property, a video walkthrough or a site visit. We usually reply within the hour.</p>" +
      '<a class="btn btn-primary" href="' + waLink("Hi! I'd like to know more about your properties.") + '" target="_blank" rel="noopener">' + I.whatsapp + "WhatsApp</a>" +
      '<a class="btn btn-ghost" href="' + telLink() + '">' + I.phone + "Call " + esc(CFG.phone) + "</a></div>" +
      '<button class="chat-btn" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Contact us">' + I.bubble + I.close + "</button></div>";

    document.body.insertAdjacentHTML("afterbegin", header);
    document.body.insertAdjacentHTML("beforeend", footer + chat);
  }

  function initHeader() {
    var header = qs("#site-header");
    if (!header) return;
    var lastY = window.scrollY, ticking = false;
    var heroEnd = function () {
      var story = qs(".story");
      if (story) return story.offsetTop + story.offsetHeight - window.innerHeight * 0.6;
      return 20;
    };
    function update() {
      ticking = false;
      var y = window.scrollY, end = heroEnd();
      header.classList.toggle("is-solid", y > end);
      var goingDown = y > lastY + 4, goingUp = y < lastY - 4;
      if (y > end + 300 && goingDown && !document.body.classList.contains("menu-open")) header.classList.add("is-hidden");
      else if (goingUp || y <= end + 300) header.classList.remove("is-hidden");
      lastY = y;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();

    var toggle = qs(".menu-toggle"), menu = qs("#mobile-menu");
    function setMenu(open) {
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("aria-hidden", String(!open));
      document.documentElement.style.overflow = open ? "hidden" : "";
    }
    toggle.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    qsa("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setMenu(false); toggle.focus(); } });
  }

  function initChat() {
    var chat = qs("#chat");
    if (!chat) return;
    var btn = qs(".chat-btn", chat);
    function set(open) { chat.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open)); btn.setAttribute("aria-label", open ? "Close contact options" : "Contact us"); }
    btn.addEventListener("click", function () { set(!chat.classList.contains("is-open")); });
    document.addEventListener("click", function (e) { if (!chat.contains(e.target)) set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && chat.classList.contains("is-open")) { set(false); btn.focus(); } });
  }

  /* ---------- reveal on scroll ---------- */

  var io = null;
  function observe(root) {
    var els = qsa("[data-reveal]:not(.is-in), .card:not(.is-in)", root);
    if (!("IntersectionObserver" in window) || reduced()) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    els.forEach(function (el) { io.observe(el); });
  }
  TLP.observe = observe;

  /* ---------- film grain ---------- */

  function grain() {
    try {
      var c = document.createElement("canvas"); c.width = c.height = 160;
      var g = c.getContext("2d"), img = g.createImageData(160, 160);
      for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 40; }
      g.putImageData(img, 0, 0);
      document.documentElement.style.setProperty("--grain", "url(" + c.toDataURL() + ")");
    } catch (e) { /* decorative only */ }
  }

  /* ---------- loader (home, once per session) ---------- */

  function loader() {
    var el = qs("#loader");
    if (!el) return;
    var seen = false;
    try { seen = window.sessionStorage.getItem("tlp-seen") === "1"; window.sessionStorage.setItem("tlp-seen", "1"); } catch (e) { /* ignore */ }
    if (seen || reduced()) { el.classList.add("is-done"); return; }
    var start = Date.now(), done = false;
    function finish() { if (done) return; done = true; setTimeout(function () { el.classList.add("is-done"); }, Math.max(0, 1500 - (Date.now() - start))); }
    if (document.readyState === "complete") finish(); else window.addEventListener("load", finish);
    setTimeout(finish, 2600);
  }

  /* ---------- cards ---------- */

  function art(p, extra) {
    if (p.image) return '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy">';
    var o = {}; for (var k in p.art) o[k] = p.art[k];
    o.layout = p.layout; o.label = "Illustration of " + p.title;
    if (p.art.kind === "plan" && o.focus == null) { o.focus = true; o.zoom = 1.45; o.focusY = 0.04; }
    if (extra) for (var e in extra) o[e] = extra[e];
    return TLP.Art.render(p.art.kind, o);
  }
  TLP.propertyArt = art;

  function statusBadge(p) {
    if (p.status === "sold") return '<span class="badge badge--sold">Sold out</span>';
    if (p.status === "few") return '<span class="badge badge--few">Few left</span>';
    return '<span class="badge">Available</span>';
  }
  TLP.statusBadge = statusBadge;

  function priceNote(p) { return p.priceNote && p.priceNote !== "total" ? "<small>" + esc(p.priceNote) + "</small>" : ""; }
  TLP.priceNote = priceNote;

  TLP.card = function (p) {
    var t = type(p.type), r = region(p.region);
    return '<article class="card' + (p.status === "sold" ? " card--sold" : "") + '">' +
      '<div class="card-media">' + art(p) + statusBadge(p) + '<span class="badge badge-type">' + esc(t ? t.label.replace(/s$/, "") : "") + "</span></div>" +
      '<div class="card-body"><p class="card-loc">' + esc(p.location) + "</p>" +
      '<h3 class="card-title"><a href="property.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.title) + "</a></h3>" +
      '<dl class="card-meta"><div><dt>Area</dt><dd>' + esc(p.area) + "</dd></div><div><dt>Region</dt><dd>" + esc(r ? r.name : "") + "</dd></div></dl>" +
      '<div class="card-foot"><p class="price">' + formatPrice(p.price) + priceNote(p) + "</p>" +
      '<span class="card-go" aria-hidden="true">' + I.arrow + "</span></div></div></article>";
  };

  /* ---------- enquiry forms ---------- */

  function fieldErr(input, msg) {
    var wrap = input.closest(".field"), err = wrap && qs(".err", wrap);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg || "";
  }

  TLP.bindForm = function (form, context) {
    if (!form) return;
    var status = qs(".form-status", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, data = {};
      qsa("input, select, textarea", form).forEach(function (el) { if (el.name && !el.disabled) data[el.name] = el.value.trim(); });
      var name = form.elements.name, phone = form.elements.phone;
      if (name) { fieldErr(name, data.name ? "" : "Please tell us your name."); ok = ok && !!data.name; }
      if (phone) {
        var digits = (data.phone || "").replace(/\D/g, "");
        var bad = digits.length < 10 ? "Please enter a valid phone number." : "";
        fieldErr(phone, bad); ok = ok && !bad;
      }
      if (!ok) { var first = qs('[aria-invalid="true"]', form); if (first) first.focus(); return; }

      var ctx = typeof context === "function" ? context() : (context || {});
      var intent = data.intent || ctx.intent || "buy";
      var lines = [intent === "sell" ? "Hi! I'd like to sell my property." : "Hi! I'd like to book a site visit."];
      if (ctx.property) lines.push("Property: " + ctx.property);
      if (data.plot) lines.push("Plot: " + data.plot);
      lines.push("Name: " + data.name, "Phone: " + data.phone);
      if (data.region) lines.push((intent === "sell" ? "Location: " : "Region: ") + data.region);
      if (data.type) lines.push("Type: " + data.type);
      if (data.budget) lines.push("Budget: " + data.budget);
      if (data.area) lines.push("Area: " + data.area);
      if (data.date) lines.push("Preferred date: " + data.date);
      if (data.message) lines.push("Message: " + data.message);
      var text = lines.join("\n");

      function show(msg, isErr) {
        if (!status) return;
        status.textContent = msg; status.classList.add("is-shown"); status.classList.toggle("is-error", !!isErr);
      }
      if (CFG.formEndpoint) {
        var btn = qs('[type="submit"]', form);
        if (btn) { btn.disabled = true; btn.classList.add("is-loading"); btn.setAttribute("aria-busy", "true"); }
        fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ message: text, data: data, context: ctx }) })
          .then(function (res) { if (!res.ok) throw new Error(res.status); show("Thank you — we have your details and will call you shortly."); form.reset(); })
          .catch(function () { show("We couldn't send the form. Opening WhatsApp instead…", true); window.open(waLink(text), "_blank", "noopener"); })
          .then(function () { if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); btn.removeAttribute("aria-busy"); } });
      } else {
        window.open(waLink(text), "_blank", "noopener");
        show("Opening WhatsApp with your message. Just press send — we'll reply shortly.");
      }
    });
  };

  TLP.regionOptions = function (selected) {
    return '<option value="">Any region</option>' + DATA.regions.map(function (r) {
      return '<option value="' + esc(r.name) + '"' + (selected === r.id ? " selected" : "") + ">" + esc(r.name) + "</option>";
    }).join("");
  };

  /* ---------- config bindings ----------
   * data-cfg="phone|email|address|hours|stats.followers…"  -> sets the element's text
   * data-href="phone|whatsapp|email|instagram|youtube|threads" -> sets a link's href
   *   (WhatsApp links can carry a pre-filled message in data-text)
   */
  function bindConfig(root) {
    qsa("[data-cfg]", root).forEach(function (el) {
      var k = el.getAttribute("data-cfg");
      var v = k.indexOf("stats.") === 0 ? (CFG.stats || {})[k.slice(6)] : CFG[k];
      if (v != null) el.textContent = v;
    });
    qsa("[data-href]", root).forEach(function (el) {
      var k = el.getAttribute("data-href");
      if (k === "phone") el.href = telLink();
      else if (k === "whatsapp") el.href = waLink(el.getAttribute("data-text") || "");
      else if (k === "email") el.href = "mailto:" + CFG.email;
      else if (CFG[k]) el.href = CFG[k];
    });
  }
  TLP.bindConfig = bindConfig;

  TLP.util = { esc: esc, qs: qs, qsa: qsa, formatPrice: formatPrice, waLink: waLink, telLink: telLink, region: region, type: type, property: property, store: store, reduced: reduced };

  /* decorative art blocks: <div data-art="ghats" data-seed="4" data-tea="1" data-focus="1"> */
  function arts() {
    qsa("[data-art]").forEach(function (el) {
      var d = el.dataset;
      el.innerHTML = TLP.Art.render(d.art, { seed: +d.seed || 1, decorative: true, focus: d.focus === "1", tea: d.tea === "1", trees: d.trees, annotate: d.annotate === "1" });
    });
  }

  renderChrome();
  arts();
  bindConfig();
  initHeader();
  initChat();
  grain();
  loader();
  document.addEventListener("DOMContentLoaded", function () { observe(); });
  if (document.readyState !== "loading") observe();
})();
