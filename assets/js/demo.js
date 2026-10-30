/*
 * Before the database is connected, the admin panel saves its changes in this browser
 * (localStorage). Load them here so this browser shows the edited site; other visitors never
 * see them. Once /api/site serves live content (window.TLP_LIVE) this does nothing.
 */
(function () {
  "use strict";
  if (window.TLP_LIVE) return;   // the database is connected: everyone sees the published content
  try {
    var raw = window.localStorage.getItem("tlp-demo-content");
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d.config) window.TLP_CONFIG = d.config;
    if (d.data) window.TLP_DATA = d.data;
    window.TLP_DEMO = true;
  } catch (e) { /* no storage: show the normal site */ }
})();
