/*
 * Contact page: buy / sell tabs, form options and the office map.
 */
(function () {
  "use strict";

  var TLP = window.TLP, U = TLP.util, DATA = window.TLP_DATA, CFG = window.TLP_CONFIG;
  var qs = U.qs, qsa = U.qsa, esc = U.esc;
  var form = qs("#contact-form");
  if (!form) return;

  form.elements.region[0].innerHTML = TLP.regionOptions();
  qs("#cf-type").innerHTML = '<option value="">Any type</option>' + DATA.types.map(function (t) { return '<option value="' + esc(t.label) + '">' + esc(t.label) + "</option>"; }).join("");
  qs("#cf-budget").innerHTML = '<option value="">Any budget</option>' + DATA.budgets.map(function (b) { return '<option value="' + esc(b.label) + '">' + esc(b.label) + "</option>"; }).join("");

  var tabs = qsa('[role="tab"]', form), panel = qs("#contact-fields");
  var copy = {
    buy: ["Book a site visit", "Tell us what you're looking for and we'll send matching videos.", "Any type"],
    sell: ["List your property", "Share the location and we'll arrange a visit and a video walkthrough.", "Type of land"]
  };

  function setIntent(intent, focus) {
    tabs.forEach(function (t) {
      var on = t.dataset.intent === intent;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) { panel.setAttribute("aria-labelledby", t.id); if (focus) t.focus(); }
    });
    form.elements.intent.value = intent;
    qsa("[data-for]", form).forEach(function (f) {
      var on = f.dataset.for === intent;
      f.hidden = !on;
      qsa("input, select, textarea", f).forEach(function (el) { el.disabled = !on; });
    });
    qs("#contact-title").textContent = copy[intent][0];
    qs("#contact-sub").textContent = copy[intent][1];
    qs("#cf-type").options[0].textContent = copy[intent][2];
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { setIntent(t.dataset.intent); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      setIntent(tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length].dataset.intent, true);
    });
  });

  setIntent(new URLSearchParams(window.location.search).get("tab") === "sell" ? "sell" : "buy");
  TLP.bindForm(form);

  var map = qs("#contact-map");
  if (map) map.innerHTML = '<iframe title="Map of ' + esc(CFG.address) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + encodeURIComponent(CFG.mapQuery || CFG.address) + '&z=12&output=embed"></iframe>';
})();
