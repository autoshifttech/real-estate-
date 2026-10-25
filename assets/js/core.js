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
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    chevDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>',
    plot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/></svg>',
    farm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 21V11M12 11C12 7 9 5 5 5c0 4 3 6 7 6zM12 14c0-4 3-6 7-6 0 4-3 6-7 6z"/></svg>',
    estate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 20l6.5-11 4 6.5 3-4.5 5.5 9z"/></svg>',
    commercial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-6h6v6"/></svg>',
    house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14.5 8.5l2 2"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.5"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 14l2 2 4-4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></svg>',
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
    mark: '<svg class="brand-mark" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M2 25 L12 11 L17 17.5 L23.5 7 L38 25"/><path pathLength="1" d="M7 31 L20 27 L33 31 L20 35 Z"/></svg>'
  };
  TLP.icons = I;

  var SOCIAL_NAMES = { instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", x: "X (Twitter)", linkedin: "LinkedIn", telegram: "Telegram", pinterest: "Pinterest", whatsapp: "WhatsApp channel", threads: "Threads", website: "Website" };
  I.s_facebook = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z"/></svg>';
  I.s_x = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3.5h3l-6.6 7.5 7.8 9.5h-6.1l-4.8-5.9-5.4 5.9H2.6l7-7.9L2.2 3.5h6.2l4.3 5.4zm-1 15.2h1.7L7.3 5.2H5.5z"/></svg>';
  I.s_linkedin = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.9 8.8H3.7V20h3.2zM5.3 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM20.3 13.6c0-3-1.6-5-4.3-5-1.4 0-2.4.8-2.8 1.5V8.8H10V20h3.2v-5.6c0-1.5.3-2.9 2.1-2.9s1.8 1.7 1.8 3V20h3.2z"/></svg>';
  I.s_telegram = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M21 4L3 11l6 2.2L18 7l-7 7.5V20l3.3-3.7L18 19z"/></svg>';
  I.s_pinterest = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.2 2.5C6.9 2.5 4.2 6.2 4.2 9.3c0 1.9.7 3.5 2.2 4.1.3.1.5 0 .6-.3l.2-.9c.1-.3 0-.4-.2-.7a3.9 3.9 0 0 1-.9-2.7c0-3.5 2.6-6.6 6.8-6.6 3.7 0 5.7 2.3 5.7 5.3 0 4-1.8 7.4-4.4 7.4-1.4 0-2.5-1.2-2.2-2.6.4-1.8 1.2-3.7 1.2-4.9 0-1.1-.6-2.1-1.9-2.1-1.5 0-2.7 1.5-2.7 3.6 0 1.3.4 2.2.4 2.2l-1.8 7.5c-.5 2.2-.1 4.9 0 5.2 0 .1.2.2.3.1.1-.2 1.6-2 2.1-3.9l.8-3.2c.4.8 1.6 1.4 2.9 1.4 3.8 0 6.4-3.5 6.4-8.1 0-3.5-3-6.8-7.5-6.8z"/></svg>';
  I.s_website = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/></svg>';
  I.s_whatsapp = I.whatsapp;

  /* ---------- header, menu, footer, chat ---------- */

  /* The main menu: four dropdowns and a plain Contact link. */
  function navModel() {
    var live = function (k, v) { return DATA.properties.filter(function (p) { return p[k] === v && p.status !== "sold"; }).length; };
    var typeInfo = {
      plot: ["plot", "Approved layouts, ready to build"],
      farm: ["farm", "Coconut, mango and open farmland"],
      estate: ["estate", "Kodaikanal and Ooty hill land"],
      commercial: ["commercial", "Highway and town frontage"],
      house: ["house", "Ready-to-move homes"]
    };
    var featured = DATA.properties.filter(function (p) { return p.featured && p.status !== "sold"; })[0];
    return [
      {
        id: "properties", label: "Properties", pages: ["properties"], wide: true, feature: featured,
        links: DATA.types.map(function (t) { return { href: "properties.html?type=" + t.id, icon: (typeInfo[t.id] || [])[0], title: t.label, text: (typeInfo[t.id] || [])[1], meta: live("type", t.id) }; }),
        foot: { href: "properties.html", label: "All properties", note: DATA.properties.length + " listings" }
      },
      {
        id: "locations", label: "Locations", grid: true,
        links: DATA.regions.map(function (r) { return { href: "properties.html?region=" + r.id, title: r.name, ta: r.ta, meta: live("region", r.id) }; }),
        foot: { href: "index.html#regions", label: "Explore the map", note: "Tamil Nadu & Kerala" }
      },
      {
        id: "services", label: "Services",
        links: [
          { href: "properties.html", icon: "key", title: "Buy land", text: "Plots, farms and estates, all on video" },
          { href: "contact.html?tab=sell#enquiry", icon: "tag", title: "Sell your land", text: "We film it and bring genuine buyers" },
          { href: "contact.html#enquiry", icon: "pin", title: "Site visits", text: "Walk the boundary with our team" },
          { href: "index.html#watch", icon: "video", title: "Video walkthroughs", text: "See the land before you travel" },
          { href: "index.html#how", icon: "doc", title: "Document checks", text: "Patta, chitta, EC and approvals up front" }
        ]
      },
      {
        id: "company", label: "Company", pages: ["about"],
        links: [
          { href: "about.html", icon: "users", title: "About us", text: "Rooted in Tenkasi" },
          { href: "index.html#how", icon: "route", title: "How it works", text: "From first call to registration" },
          { href: "index.html#faqs", icon: "help", title: "FAQs", text: "Good to know before you buy" },
          { href: CFG.instagram, icon: "instagram", title: "Instagram", text: (CFG.stats && CFG.stats.followers ? CFG.stats.followers + " followers" : "Follow us"), ext: true },
          { href: CFG.youtube, icon: "youtube", title: "YouTube", text: "Property walkthrough videos", ext: true }
        ]
      }
    ];
  }

  function menuLink(l) {
    return '<li><a class="menu-link" href="' + esc(l.href) + '"' + (l.ext ? ' target="_blank" rel="noopener"' : "") + ">" +
      (l.icon ? '<span class="menu-ico">' + I[l.icon] + "</span>" : "") +
      '<span class="menu-text"><b>' + esc(l.title) + (l.ext ? I.ext + '<span class="sr-only"> (opens in a new tab)</span>' : "") + "</b>" +
      (l.text ? "<small>" + esc(l.text) + "</small>" : "") + (l.ta ? '<small lang="ta">' + esc(l.ta) + "</small>" : "") + "</span>" +
      (l.meta != null ? '<span class="menu-meta">' + l.meta + '<span class="sr-only"> ' + (l.meta === 1 ? "listing" : "listings") + "</span></span>" : "") +
      "</a></li>";
  }

  function menuPanel(m) {
    var html = '<ul class="menu-list">' + m.links.map(menuLink).join("") + "</ul>";
    if (m.feature) {
      var f = m.feature, r = region(f.region);
      html += '<a class="menu-feature" href="property.html?id=' + encodeURIComponent(f.id) + '"><span class="menu-feature-art" data-feature="' + esc(f.id) + '"></span>' +
        '<span class="menu-feature-body"><small>Featured</small><b>' + esc(f.title) + "</b><span>" + formatPrice(f.price) + (f.priceNote === "onwards" ? " onwards" : "") + " · " + esc(r ? r.name : "") + "</span></span></a>";
    }
    if (m.foot) html += '<div class="menu-foot"><a href="' + esc(m.foot.href) + '">' + esc(m.foot.label) + I.arrow + "</a><span>" + esc(m.foot.note || "") + "</span></div>";
    return html;
  }

  function brand() {
    return '<a class="brand" href="index.html" aria-label="' + esc(CFG.name) + ' — home"><span class="brand-badge">' + I.mark + "</span>" +
      '<span class="brand-word"><strong>' + esc(CFG.shortName || "Tenkasi") + "</strong><small>" + esc(CFG.tagline || "Land Promoters") + "</small></span></a>";
  }

  function renderChrome() {
    var page = document.body.getAttribute("data-page") || "";
    var model = navModel();
    var contactCurrent = page === "contact" ? ' aria-current="page"' : "";
    var nav = model.map(function (m) {
      var current = (m.pages || []).indexOf(page) >= 0;
      return '<li class="nav-item has-menu' + (current ? " is-current" : "") + '">' +
        '<button class="nav-trigger" type="button" aria-expanded="false" aria-controls="menu-' + m.id + '">' + m.label +
        (current ? '<span class="sr-only"> (current section)</span>' : "") + I.chevDown + "</button>" +
        '<div class="nav-menu' + (m.wide ? " nav-menu--wide" : "") + (m.grid ? " nav-menu--grid" : "") + '" id="menu-' + m.id + '">' + menuPanel(m) + "</div></li>";
    }).join("") + '<li class="nav-item"><a class="nav-link" href="contact.html"' + contactCurrent + ">Contact</a></li>";

    var mobile = model.map(function (m) {
      return '<details class="m-group"><summary>' + m.label + I.chevDown + "</summary>" +
        '<ul class="menu-list">' + m.links.map(menuLink).join("") + (m.foot ? '<li><a class="m-foot" href="' + esc(m.foot.href) + '">' + esc(m.foot.label) + I.arrow + "</a></li>" : "") + "</ul></details>";
    }).join("") + '<a class="m-link" href="contact.html"' + contactCurrent + ">Contact</a>";

    var header =
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-header" id="site-header"><div class="nav-shell">' + brand() +
      '<nav class="nav" aria-label="Main"><ul class="nav-list">' + nav + "</ul></nav>" +
      '<div class="nav-actions"><a class="btn btn-primary" href="contact.html#enquiry">Book a site visit</a>' +
      '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span><span></span></button></div>' +
      "</div></header>" +
      '<div class="menu-backdrop" aria-hidden="true"></div>' +
      '<div class="mobile-menu" id="mobile-menu"><nav aria-label="Main (mobile)">' + mobile + "</nav>" +
      '<div class="mobile-cta"><a class="btn btn-primary" href="contact.html#enquiry">Book a site visit</a>' +
      '<a class="btn btn-light" href="' + waLink("Hi! I'd like to know more about your properties.") + '" target="_blank" rel="noopener">' + I.whatsapp + "WhatsApp us</a></div>" +
      '<p class="tamil-line" lang="ta">' + esc(CFG.taglineTamil) + "</p></div>";

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
      (CFG.socials || []).filter(function (s) { return /^https:\/\//.test(s.url || ""); }).map(function (s) {
        var name = s.label || SOCIAL_NAMES[s.platform] || "Website";
        return '<a class="icon-btn" href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + esc(name) + '" title="' + esc(name) + '">' + (I["s_" + s.platform] || I[s.platform] || I.s_website) + "</a>";
      }).join("") +
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
      '<p class="footer-big" aria-hidden="true">' + (CFG.shortName || "Tenkasi").split("").map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") + "</p>" +
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
      header.classList.toggle("is-solid", y > 20);
      var goingDown = y > lastY + 4, goingUp = y < lastY - 4;
      if (y > end + 300 && goingDown && !document.body.classList.contains("menu-open") && !qs(".nav-item.is-open", header)) header.classList.add("is-hidden");
      else if (goingUp || y <= end + 300) header.classList.remove("is-hidden");
      lastY = y;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();

    initDropdowns(header);

    // mobile panel
    var toggle = qs(".menu-toggle"), menu = qs("#mobile-menu"), backdrop = qs(".menu-backdrop");
    function setMenu(open, refocus) {
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) header.classList.remove("is-hidden");
      if (!open && refocus) toggle.focus();
    }
    toggle.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    backdrop.addEventListener("click", function () { setMenu(false); });
    qsa("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false, true); });
    window.matchMedia("(min-width: 1080px)").addEventListener("change", function (e) { if (e.matches) setMenu(false); });
  }

  /* Desktop dropdowns: hover (mouse) or click opens, Escape closes, arrow keys move between links. */
  function initDropdowns(header) {
    var items = qsa(".nav-item.has-menu", header), openItem = null, openedAt = 0, timer = 0;
    var hover = window.matchMedia("(hover: hover) and (pointer: fine)");

    function links(item) { return qsa(".nav-menu a", item); }
    function open(item, focusFirst) {
      clearTimeout(timer);
      if (openItem && openItem !== item) close(openItem);
      if (openItem !== item) openedAt = Date.now();
      item.classList.add("is-open");
      qs(".nav-trigger", item).setAttribute("aria-expanded", "true");
      var slot = qs("[data-feature]:empty", item);
      if (slot) { var p = property(slot.getAttribute("data-feature")); if (p) slot.innerHTML = art(p, { decorative: true }); }
      openItem = item;
      if (focusFirst) { var l = links(item)[0]; if (l) l.focus(); }
    }
    function close(item) {
      item.classList.remove("is-open");
      qs(".nav-trigger", item).setAttribute("aria-expanded", "false");
      if (openItem === item) openItem = null;
    }

    items.forEach(function (item) {
      var trigger = qs(".nav-trigger", item);
      trigger.addEventListener("click", function () {
        // a hover just opened it: keep it open instead of toggling straight back
        if (item.classList.contains("is-open") && Date.now() - openedAt > 400) close(item); else open(item);
      });
      item.addEventListener("mouseenter", function () { if (hover.matches) open(item); });
      item.addEventListener("mouseleave", function () { if (hover.matches) timer = setTimeout(function () { close(item); }, 180); });
      item.addEventListener("focusout", function (e) { if (!item.contains(e.relatedTarget)) close(item); });
      item.addEventListener("keydown", function (e) {
        var ls = links(item), i = ls.indexOf(document.activeElement);
        if (e.key === "Escape" && item.classList.contains("is-open")) { e.preventDefault(); close(item); trigger.focus(); }
        else if (e.key === "ArrowDown" && e.target === trigger) { e.preventDefault(); open(item, true); }
        else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && i >= 0) {
          e.preventDefault();
          ls[(i + (e.key === "ArrowDown" ? 1 : -1) + ls.length) % ls.length].focus();
        }
        else if ((e.key === "Home" || e.key === "End") && i >= 0) { e.preventDefault(); ls[e.key === "Home" ? 0 : ls.length - 1].focus(); }
      });
    });
    document.addEventListener("click", function (e) { if (openItem && !openItem.contains(e.target)) close(openItem); });
    window.addEventListener("scroll", function () { if (openItem && header.classList.contains("is-hidden")) close(openItem); }, { passive: true });
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

  /* A rendered golden-hour scene (assets/img/scenes) with its gold boundary overlay. */
  function photo(scene, alt, o) {
    o = o || {};
    var meta = (window.TLP_SCENES || {})[scene] || {};
    var gold = (meta.gold || []).map(function (d) {
      return '<path class="gold-halo" d="' + d + '" pathLength="1"/><path class="gold-glow" d="' + d + '" pathLength="1"/><path class="gold-core" d="' + d + '" pathLength="1"/>';
    }).join("");
    return '<div class="photo"><img src="assets/img/scenes/' + scene + '.webp" alt="' + esc(alt || "") + '"' +
      (o.eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" width="1920" height="1200">' +
      (gold && !o.noGold ? '<svg class="art-svg photo-gold" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><g class="gold">' + gold +
        '<circle class="gold-spark" r="7" cx="-99" cy="-99"/></g></svg>' : "") + "</div>";
  }
  TLP.photo = photo;

  function art(p, extra) {
    if (p.image) return '<div class="photo"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" decoding="async"></div>';
    if (p.scene) return photo(p.scene, extra && extra.decorative ? "" : "Aerial view illustrating " + p.title, extra);
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

  var STATUS = { available: "Available", few: "Few plots left", sold: "Sold out" };
  TLP.card = function (p) {
    var t = type(p.type), r = region(p.region), url = "property.html?id=" + encodeURIComponent(p.id);
    var kind = t ? t.label.replace(/s$/, "") : "Property";
    var unit = p.priceNote === "onwards" ? "onwards" : "total price";
    var facts = [
      ["area", p.area],
      ["doc", p.approval.split(" · ")[0]],
      ["route", p.road]
    ];
    return '<article class="card' + (p.status === "sold" ? " card--sold" : "") + '">' +
      '<div class="card-media">' + art(p, { decorative: true }) +
      '<span class="card-status is-' + esc(p.status) + '">' + esc(STATUS[p.status] || "Available") + "</span>" +
      '<span class="card-kind">' + esc(kind) + "</span>" +
      '<button class="card-share" type="button" data-share="' + esc(url) + '" data-title="' + esc(p.title) + '" aria-label="Share ' + esc(p.title) + '">' + I.share + "</button></div>" +
      '<div class="card-body">' +
      '<p class="card-loc">' + I.pin + esc(p.location) + "</p>" +
      '<h3 class="card-title"><a href="' + url + '">' + esc(p.title) + "</a></h3>" +
      '<ul class="card-facts">' + facts.map(function (f) { return "<li>" + I[f[0]] + "<span>" + esc(f[1]) + "</span></li>"; }).join("") + "</ul>" +
      '<div class="card-foot"><p class="card-price">' + formatPrice(p.price) + "<small>" + unit + "</small></p>" +
      '<div class="card-actions"><a class="card-wa" href="' + waLink("Hi! I'm interested in " + p.title + " (" + p.location + ").") + '" target="_blank" rel="noopener" aria-label="WhatsApp about ' + esc(p.title) + '">' + I.whatsapp + "</a>" +
      '<span class="card-go" aria-hidden="true">View' + I.arrow + "</span></div></div>" +
      "</div></article>";
  };

  /* share buttons on cards: native share sheet, or copy the link */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-share]");
    if (!b) return;
    var url = new URL(b.getAttribute("data-share"), window.location.href).href, title = b.getAttribute("data-title");
    var done = function (msg) { b.setAttribute("aria-label", msg); b.classList.add("is-done"); setTimeout(function () { b.classList.remove("is-done"); b.setAttribute("aria-label", "Share " + title); }, 1800); };
    if (navigator.share) navigator.share({ title: title, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { done("Link copied"); }, function () { window.prompt("Copy this link", url); });
    else window.prompt("Copy this link", url);
  });

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

      // save the enquiry for the admin inbox (works on the live site; the WhatsApp step below still runs)
      if (/^https?:$/.test(window.location.protocol)) {
        var rec = { intent: intent, property: ctx.property || "", page: window.location.pathname };
        ["name", "phone", "plot", "region", "type", "budget", "area", "date", "message", "website"].forEach(function (k) { if (data[k]) rec[k] = data[k]; });
        // when the backend is not set up yet (demo), keep the enquiry in this browser for the demo inbox
        var keepLocal = function () {
          try {
            var now = new Date(), list = JSON.parse(window.localStorage.getItem("tlp-demo-enquiries") || "[]");
            list.unshift(Object.assign({ id: now.toISOString().slice(0, 7) + "-" + now.getTime().toString(36), at: now.toISOString(), status: "new" }, rec));
            window.localStorage.setItem("tlp-demo-enquiries", JSON.stringify(list.slice(0, 200)));
          } catch (e) { /* storage unavailable */ }
        };
        try {
          fetch("/api/enquiry", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(rec) })
            .then(function (r) { if ([404, 405, 501, 503].indexOf(r.status) >= 0) keepLocal(); }, keepLocal);
        } catch (e) { keepLocal(); }
      }

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
    qsa("[data-scene]").forEach(function (el) { el.innerHTML = photo(el.dataset.scene, "", { noGold: el.dataset.gold === "0" }); });
    qsa("[data-art]").forEach(function (el) {
      var d = el.dataset;
      el.innerHTML = TLP.Art.render(d.art, { seed: +d.seed || 1, decorative: true, focus: d.focus === "1", tea: d.tea === "1", trees: d.trees, annotate: d.annotate === "1" });
    });
  }

  /* ---------- custom dropdowns ----------
   * Replaces the look of every <select class> inside .field with a styled list (select-only
   * combobox pattern). The native <select> stays in the form, hidden, and holds the value,
   * so form code keeps reading/writing it. Options added later are picked up automatically;
   * after setting select.value in code, call TLP.refreshSelects().
   */
  var selN = 0, openSel = null, header = null;
  function enhanceSelect(sel) {
    if (sel.dataset.enhanced) return;
    sel.dataset.enhanced = "1";
    var id = sel.id || "sel" + (++selN);
    var wrap = document.createElement("div");
    wrap.className = "select";
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");
    sel.classList.add("select-native");

    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "select-btn"; btn.id = id + "-combo";
    btn.setAttribute("role", "combobox");
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", id + "-list");
    btn.innerHTML = '<span class="select-value"></span>' + I.chevDown;
    var list = document.createElement("ul");
    list.className = "select-list"; list.id = id + "-list";
    list.setAttribute("role", "listbox"); list.tabIndex = -1;
    var lab = sel.id && qs('label[for="' + sel.id + '"]');
    if (lab) {
      lab.id = lab.id || id + "-label";
      lab.htmlFor = btn.id;
      btn.setAttribute("aria-labelledby", lab.id + " " + btn.id);
      list.setAttribute("aria-labelledby", lab.id);
    }
    wrap.appendChild(btn); wrap.appendChild(list);
    var valueEl = qs(".select-value", btn), active = -1, typed = "", typedAt = 0;

    function opts() { return Array.prototype.slice.call(sel.options); }
    function render() {
      list.innerHTML = opts().map(function (o, i) {
        return '<li role="option" id="' + id + "-o" + i + '" data-i="' + i + '" aria-selected="' + (i === sel.selectedIndex) + '"' +
          (o.disabled ? ' aria-disabled="true"' : "") + ">" + esc(o.textContent) + I.check + "</li>";
      }).join("");
      sync();
    }
    function sync() {
      var o = sel.options[sel.selectedIndex];
      valueEl.textContent = o ? o.textContent : "";
      wrap.classList.toggle("is-empty", !o || o.value === "");
      btn.disabled = sel.disabled;
      qsa("[role=option]", list).forEach(function (li, i) { li.setAttribute("aria-selected", String(i === sel.selectedIndex)); });
    }
    function setActive(i, scroll) {
      var items = qsa("[role=option]", list);
      if (!items.length) return;
      active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach(function (li, k) { li.classList.toggle("is-active", k === active); });
      btn.setAttribute("aria-activedescendant", items[active].id);
      if (scroll) items[active].scrollIntoView({ block: "nearest" });
    }
    function open() {
      if (btn.disabled || wrap.classList.contains("is-open")) return;
      if (openSel && openSel !== close) openSel();
      var r = btn.getBoundingClientRect(), below = window.innerHeight - r.bottom;
      var need = Math.min(list.scrollHeight, 300) + 16;
      wrap.classList.toggle("is-up", below < need && r.top - (header ? header.getBoundingClientRect().bottom : 0) > need);
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      setActive(Math.max(0, sel.selectedIndex), true);
      openSel = close;
    }
    function close() {
      wrap.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      btn.removeAttribute("aria-activedescendant");
      if (openSel === close) openSel = null;
    }
    function choose(i) {
      var o = sel.options[i];
      if (!o || o.disabled) return;
      var changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      sync(); close(); btn.focus();
      if (changed) { sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); }
    }

    btn.addEventListener("click", function () { if (wrap.classList.contains("is-open")) close(); else open(); });
    btn.addEventListener("keydown", function (e) {
      var isOpen = wrap.classList.contains("is-open"), k = e.key, n = sel.options.length;
      if (!isOpen) {
        if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") { e.preventDefault(); open(); }
        else if (k === "Home" || k === "End") { e.preventDefault(); open(); setActive(k === "Home" ? 0 : n - 1, true); }
        else if (k.length === 1 && /\S/.test(k)) { open(); }
        else return;
        if (!(k.length === 1 && /\S/.test(k))) return;
      }
      if (k === "ArrowDown") { e.preventDefault(); setActive(active + 1, true); }
      else if (k === "ArrowUp") { e.preventDefault(); if (e.altKey) choose(active); else setActive(active - 1, true); }
      else if (k === "Home" || k === "PageUp") { e.preventDefault(); setActive(0, true); }
      else if (k === "End" || k === "PageDown") { e.preventDefault(); setActive(n - 1, true); }
      else if (k === "Enter" || k === " ") { e.preventDefault(); choose(active); }
      else if (k === "Escape") { e.preventDefault(); close(); }
      else if (k === "Tab") { close(); }
      else if (k.length === 1 && /\S/.test(k)) {
        // type-ahead: jump to the next option starting with the typed letters
        var now = Date.now(); typed = (now - typedAt > 700 ? "" : typed) + k.toLowerCase(); typedAt = now;
        var all = opts(), start = typed.length > 1 ? active : active + 1;
        for (var j = 0; j < n; j++) { var x = (start + j) % n; if (all[x].textContent.trim().toLowerCase().indexOf(typed) === 0) { setActive(x, true); break; } }
      }
    });
    list.addEventListener("mousedown", function (e) { e.preventDefault(); });
    list.addEventListener("click", function (e) { var li = e.target.closest("[role=option]"); if (li) choose(+li.dataset.i); });
    list.addEventListener("mousemove", function (e) { var li = e.target.closest("[role=option]"); if (li && +li.dataset.i !== active) setActive(+li.dataset.i); });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) close(); });
    btn.addEventListener("blur", function () { setTimeout(function () { if (!wrap.contains(document.activeElement)) close(); }, 0); });
    sel.addEventListener("change", sync);
    new MutationObserver(render).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["disabled"] });
    if (sel.form) sel.form.addEventListener("reset", function () { setTimeout(sync, 0); });
    sel._tlpSync = sync;
    render();
  }
  function enhanceSelects(root) { qsa(".field select", root).forEach(enhanceSelect); }
  TLP.refreshSelects = function () { qsa(".select-native").forEach(function (s) { if (s._tlpSync) s._tlpSync(); }); };

  renderChrome();
  arts();
  bindConfig();
  initHeader();
  initChat();
  grain();
  loader();
  header = qs("#site-header");
  enhanceSelects();
  document.addEventListener("DOMContentLoaded", function () { observe(); });
  if (document.readyState !== "loading") observe();
})();
