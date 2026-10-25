/*
 * Demo preview: while the real admin backend is not connected, the admin panel saves its
 * changes in this browser (localStorage). Load them here so this browser shows the edited site.
 * Other visitors never see them.
 */
(function () {
  "use strict";
  try {
    var raw = window.localStorage.getItem("tlp-demo-content");
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d.config) window.TLP_CONFIG = d.config;
    if (d.data) window.TLP_DATA = d.data;
    window.TLP_DEMO = true;
  } catch (e) { /* no storage: show the normal site */ }
})();
