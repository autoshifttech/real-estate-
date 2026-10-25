/*
 * Properties page: region chips, type / budget / sort filters and search,
 * kept in sync with the URL (?region=tenkasi&type=farm&budget=u10&q=…&sort=…).
 */
(function () {
  "use strict";

  var TLP = window.TLP, U = TLP.util, DATA = window.TLP_DATA;
  var qs = U.qs, esc = U.esc;

  var chips = qs("#region-chips"), q = qs("#f-q"), typeSel = qs("#f-type"), budgetSel = qs("#f-budget"), sortSel = qs("#f-sort");
  var results = qs("#results"), empty = qs("#empty"), count = qs("#results-count"), clear = qs("#f-clear");
  if (!results) return;

  var params = new URLSearchParams(window.location.search);
  var state = {
    region: params.get("region") || "",
    type: params.get("type") || "",
    budget: params.get("budget") || "",
    q: params.get("q") || "",
    sort: params.get("sort") || "featured"
  };

  chips.innerHTML = '<button class="chip" type="button" data-region="">All regions</button>' + DATA.regions.map(function (r) {
    return '<button class="chip" type="button" data-region="' + r.id + '">' + esc(r.name) + "</button>";
  }).join("");
  typeSel.innerHTML = '<option value="">Any type</option>' + DATA.types.map(function (t) { return '<option value="' + t.id + '">' + esc(t.label) + "</option>"; }).join("");
  budgetSel.innerHTML = '<option value="">Any budget</option>' + DATA.budgets.map(function (b) { return '<option value="' + b.id + '">' + esc(b.label) + "</option>"; }).join("");

  function sync() {
    Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", String(c.dataset.region === state.region)); });
    typeSel.value = state.type; budgetSel.value = state.budget; sortSel.value = state.sort; q.value = state.q;
    TLP.refreshSelects();
  }

  function matches(p) {
    if (state.region && p.region !== state.region) return false;
    if (state.type && p.type !== state.type) return false;
    if (state.budget) {
      var b = DATA.budgets.filter(function (x) { return x.id === state.budget; })[0];
      if (b && (p.price < b.min || (b.max != null && p.price >= b.max))) return false;
    }
    if (state.q) {
      var r = U.region(p.region), hay = [p.title, p.location, p.summary, r && r.name, r && r.ta].join(" ").toLowerCase();
      var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }

  function render() {
    var list = DATA.properties.filter(matches);
    list.sort(function (a, b) {
      if (state.sort === "price-asc") return a.price - b.price;
      if (state.sort === "price-desc") return b.price - a.price;
      // featured first, sold last
      return (a.status === "sold") - (b.status === "sold") || (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
    results.innerHTML = list.map(TLP.card).join("");
    results.hidden = !list.length;
    empty.hidden = !!list.length;
    var r = U.region(state.region);
    count.innerHTML = "Showing <b>" + list.length + "</b> " + (list.length === 1 ? "property" : "properties") + (r ? " in " + esc(r.name) : "");
    var active = state.region || state.type || state.budget || state.q;
    clear.disabled = !active;
    TLP.observe(results);

    var p = new URLSearchParams();
    ["region", "type", "budget", "q"].forEach(function (k) { if (state[k]) p.set(k, state[k]); });
    if (state.sort !== "featured") p.set("sort", state.sort);
    var url = window.location.pathname + (p.toString() ? "?" + p.toString() : "");
    try { window.history.replaceState(null, "", url); } catch (e) { /* file:// in some browsers */ }
  }

  chips.addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    state.region = b.dataset.region; sync(); render();
  });
  typeSel.addEventListener("change", function () { state.type = typeSel.value; render(); });
  budgetSel.addEventListener("change", function () { state.budget = budgetSel.value; render(); });
  sortSel.addEventListener("change", function () { state.sort = sortSel.value; render(); });
  var t = 0;
  q.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { state.q = q.value.trim(); render(); }, 160); });
  function reset() { state = { region: "", type: "", budget: "", q: "", sort: state.sort }; sync(); render(); }
  clear.addEventListener("click", reset);
  U.qsa("[data-clear]").forEach(function (b) { b.addEventListener("click", reset); });

  sync();
  render();
})();
