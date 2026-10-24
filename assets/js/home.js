/*
 * Home page: the scroll story, featured rail, regions explorer, categories, process line and FAQ.
 */
(function () {
  "use strict";

  var TLP = window.TLP, U = TLP.util, I = TLP.icons, DATA = window.TLP_DATA;
  var qs = U.qs, qsa = U.qsa, esc = U.esc;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- story ---------- */

  function story() {
    var root = qs(".story");
    if (!root) return;
    var stage = qs(".story-stage", root), host = qs(".story-scenes", root);
    var captions = qsa(".caption", root), N = captions.length;
    var dotsEl = qs(".story-dots", root), countEl = qs(".story-count b", root), nameEl = qs(".story-count span", root);
    var prev = qs(".story-arrow--prev", root), next = qs(".story-arrow--next", root), spec = qs(".story-spec", root);
    var header = qs("#site-header");
    var still = U.reduced();

    // split the display lines into letters for the reveal
    captions.forEach(function (c) {
      var h = qs(".display", c), prefix = qs(".sr-only", h), n = 0;
      var lines = qsa(".ln", h).map(function (l) { return { cls: l.className, text: l.textContent.trim() }; });
      if (!lines.length) lines = [{ cls: "", text: (h.getAttribute("data-text") || h.textContent).trim() }];
      var spoken = (prefix ? prefix.textContent : "") + lines.map(function (l) { return l.text; }).join(" ");
      var split = function (text) {
        return text.split(" ").map(function (w) {
          return '<span class="w">' + w.split("").map(function (ch) { return '<span class="ch" style="--i:' + (n++) + '">' + esc(ch) + "</span>"; }).join("") + "</span>";
        }).join(" ");
      };
      h.innerHTML = '<span class="sr-only">' + esc(spoken) + '</span><span aria-hidden="true">' + lines.map(function (l) {
        return l.cls ? '<span class="' + l.cls + '">' + split(l.text) + "</span>" : split(l.text);
      }).join("") + "</span>";
      c.classList.remove("is-active");
      qsa(".eyebrow, .ad-loc, .caption-ta, .caption-sub, .caption-actions", c).forEach(function (el) { el.classList.add("fade"); });
    });

    // build scenes from each caption's data attributes
    var layoutOf = function (id) { var p = U.property(id); return p && p.layout; };
    var scenes = captions.map(function (c) {
      var d = c.dataset, el = document.createElement("div");
      el.className = "scene";
      var opts = { seed: +d.seed || 1, focus: d.focus === "1", tea: d.tea === "1", shift: d.shift ? +d.shift : undefined, focusX: +d.focusX || 0, focusY: +d.focusY || 0 };
      if (d.highlight) opts.highlight = +d.highlight;
      if (d.layout) opts.layout = layoutOf(d.layout);
      // rendered golden-hour scene: one layer, slow push-in, gold line overlay
      if (d.shot) {
        var ph = document.createElement("div");
        ph.className = "scene-layer scene-photo";
        ph.dataset.depth = 1;
        ph.innerHTML = TLP.photo(d.shot, "", { eager: !host.children.length });
        el.appendChild(ph);
      } else TLP.Art.layers(d.kind, opts).forEach(function (l) {
        var div = document.createElement("div");
        div.className = "scene-layer";
        div.dataset.depth = l.depth;
        div.innerHTML = l.svg;
        el.appendChild(div);
      });
      host.appendChild(el);
      var core = qsa(".gold-core", el);
      return {
        el: el,
        layers: qsa(".scene-layer", el).map(function (l) { return { el: l, depth: +l.dataset.depth }; }),
        gold: qsa(".gold path", el),
        core: core[0],
        len: 0,
        spark: qs(".gold-spark", el),
        name: d.name || ""
      };
    });

    // dots
    dotsEl.innerHTML = scenes.map(function (s, i) {
      return '<button type="button" aria-label="Scene ' + (i + 1) + ": " + esc(s.name) + '"' + (i === 0 ? ' aria-current="true"' : "") + "></button>";
    }).join("");
    var dots = qsa("button", dotsEl);

    var unitPx = 1, top = 0, active = -1, raf = 0, ready = false;
    function measure() {
      unitPx = window.innerHeight * 0.95;
      root.style.height = (N - 1) * unitPx + window.innerHeight + "px";
      top = root.getBoundingClientRect().top + window.scrollY;
      scenes.forEach(function (s) { s.len = s.core ? s.core.getTotalLength() : 0; });
    }

    function go(i) {
      i = clamp(i, 0, N - 1);
      window.scrollTo({ top: top + i * unitPx + 2, behavior: still ? "auto" : "smooth" });
    }

    function setActive(i) {
      if (!ready || i === active) return;
      active = i;
      captions.forEach(function (c, k) { c.classList.toggle("is-active", k === i); c.setAttribute("aria-hidden", String(k !== i)); });
      dots.forEach(function (d, k) { if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
      if (countEl) countEl.textContent = String(i + 1).padStart(2, "0");
      if (nameEl) nameEl.textContent = "/ " + String(N).padStart(2, "0") + " · " + scenes[i].name;
      if (spec) spec.classList.toggle("is-active", i === N - 1);
      prev.disabled = i === 0;
      next.disabled = i === N - 1;
    }

    function frame() {
      raf = 0;
      var p = clamp((window.scrollY - top) / unitPx, 0, N - 1);
      root.classList.toggle("is-scrolled", p > 0.05);
      scenes.forEach(function (s, i) {
        var t = p - i, a = Math.abs(t);
        var op = clamp(1 - (a - 0.3) / 0.4, 0, 1);
        s.el.style.opacity = op;
        s.el.style.visibility = op > 0 ? "visible" : "hidden";
        if (op === 0) return;
        if (!still) {
          s.layers.forEach(function (l) {
            var sc = 1.12 + t * 0.1 * (0.25 + l.depth);
            l.el.style.transform = (l.depth === 0 ? "translate3d(" + (-t * 1.5).toFixed(3) + "%,0,0) " : "") + "scale(" + sc.toFixed(4) + ")";
          });
        }
        var draw = still ? 1 : clamp((t + 0.55) / 0.85, 0, 1);
        for (var k = 0; k < s.gold.length; k++) s.gold[k].style.strokeDashoffset = (1 - draw).toFixed(4);
        if (s.spark && s.core && s.len) {
          var on = draw > 0.01 && draw < 0.99;
          s.spark.style.opacity = on ? 1 : 0;
          if (on) {
            var pt = s.core.getPointAtLength(s.len * draw);
            s.spark.setAttribute("cx", pt.x.toFixed(1));
            s.spark.setAttribute("cy", pt.y.toFixed(1));
          }
        }
      });
      setActive(Math.round(p));
      // the header follows the stage's light while it is over the story
      if (header) header.classList.toggle("is-inverse", stage.classList.contains("t-dusk"));
    }
    function request() { if (!raf) raf = requestAnimationFrame(frame); }

    prev.addEventListener("click", function () { go(active - 1); });
    next.addEventListener("click", function () { go(active + 1); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i); }); });
    stage.addEventListener("keydown", function (e) {
      if (e.target.closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") { go(active + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(active - 1); e.preventDefault(); }
    });

    // dawn / dusk
    var timeBtns = qsa(".story-time button", root);
    function setTime(t, save) {
      stage.classList.toggle("t-dusk", t === "dusk");
      stage.classList.toggle("t-dawn", t !== "dusk");
      timeBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.time === t)); });
      if (save) U.store("tlp-time", t);
      request();
    }
    timeBtns.forEach(function (b) { b.addEventListener("click", function () { setTime(b.dataset.time, true); }); });
    setTime(U.store("tlp-time") === "dusk" ? "dusk" : "dawn");

    measure();
    frame();
    // let the letters animate in once the page (and the loader, if shown) is out of the way
    var loading = qs("#loader:not(.is-done)");
    setTimeout(function () { ready = true; frame(); }, loading ? 1500 : 120);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", function () { measure(); request(); });
    window.addEventListener("load", function () { measure(); request(); });
  }

  /* ---------- featured rail ---------- */

  function featured() {
    var rail = qs("#featured-rail");
    if (!rail) return;
    rail.innerHTML = DATA.properties.filter(function (p) { return p.featured; }).map(TLP.card).join("");
    TLP.observe(rail);
    qsa("[data-rail]").forEach(function (b) {
      b.addEventListener("click", function () {
        var card = qs(".card", rail), step = card ? card.getBoundingClientRect().width + 24 : 320;
        rail.scrollBy({ left: (b.dataset.rail === "next" ? 1 : -1) * step, behavior: U.reduced() ? "auto" : "smooth" });
      });
    });
  }

  /* ---------- regions explorer ---------- */

  function regions() {
    var list = qs("#region-list"), artHost = qs("#region-art"), info = qs("#region-info"), mapHost = qs("#region-map");
    if (!list) return;
    var R = DATA.regions;
    var count = function (id) { return DATA.properties.filter(function (p) { return p.region === id && p.status !== "sold"; }).length; };

    list.setAttribute("role", "tablist");
    list.innerHTML = R.map(function (r, i) {
      var n = count(r.id);
      return '<button class="region-btn" type="button" role="tab" id="rtab-' + r.id + '" aria-controls="region-panel" aria-selected="' + (i === 0) + '" data-id="' + r.id + '">' +
        '<span class="num">0' + (i + 1) + '</span><span class="name">' + esc(r.name) + '<small lang="ta">' + esc(r.ta) + "</small></span>" +
        '<span class="count">' + n + (n === 1 ? " listing" : " listings") + "</span></button>";
    }).join("");

    artHost.insertAdjacentHTML("afterbegin", R.map(function (r, i) {
      var o = {}; for (var k in r.art) o[k] = r.art[k];
      o.label = "Illustration of " + r.name;
      return '<div class="art-wrap' + (i === 0 ? " is-active" : "") + '" data-id="' + r.id + '">' + (r.scene ? TLP.photo(r.scene, "Aerial view illustrating " + r.name) : TLP.Art.render(r.art.kind, o)) + "</div>";
    }).join(""));

    // survey chart: every region placed by latitude / longitude, linked to Tenkasi
    var lat0 = 8.45, lat1 = 11.75, lng0 = 76.4, lng1 = 78.55, w = 150, h = 200, pad = 14;
    function xy(r) { return [pad + (r.lng - lng0) / (lng1 - lng0) * (w - pad * 2), pad + (lat1 - r.lat) / (lat1 - lat0) * (h - pad * 2)]; }
    var hub = xy(R[0]), svg = '<svg viewBox="0 0 ' + w + " " + h + '" aria-hidden="true">';
    for (var g = 0; g <= 4; g++) {
      svg += '<path class="gl" d="M' + (pad + g * (w - pad * 2) / 4) + "," + pad + " V" + (h - pad) + '"/>';
      svg += '<path class="gl" d="M' + pad + "," + (pad + g * (h - pad * 2) / 4) + " H" + (w - pad) + '"/>';
    }
    R.forEach(function (r, i) { if (i) { var p = xy(r); svg += '<path class="ln" d="M' + hub[0].toFixed(1) + "," + hub[1].toFixed(1) + " L" + p[0].toFixed(1) + "," + p[1].toFixed(1) + '"/>'; } });
    // label placement keeps the southern cluster readable: [dx, dy, anchor]
    var labelAt = { tenkasi: [0, -7, "middle"], kerala: [-5, 2.5, "end"], tirunelveli: [0, 11, "middle"], thoothukudi: [0, -7, "middle"] };
    R.forEach(function (r) {
      var p = xy(r), l = labelAt[r.id] || (r.lng < 77.6 ? [6, 2.5, "start"] : [-6, 2.5, "end"]);
      svg += '<g data-id="' + r.id + '"><circle class="pulse" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" style="display:none"/>' +
        '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.6"/>' +
        '<text x="' + (p[0] + l[0]).toFixed(1) + '" y="' + (p[1] + l[1]).toFixed(1) + '" text-anchor="' + l[2] + '">' + esc(r.name) + "</text></g>";
    });
    mapHost.innerHTML = svg + "</svg>";

    var btns = qsa(".region-btn", list);
    function select(id, focus) {
      var r = U.region(id);
      btns.forEach(function (b) { var on = b.dataset.id === id; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      qsa(".art-wrap", artHost).forEach(function (a) { a.classList.toggle("is-active", a.dataset.id === id); });
      qsa("g[data-id]", mapHost).forEach(function (gr) {
        var on = gr.dataset.id === id;
        qs(".dot", gr).classList.toggle("is-active", on);
        qs("text", gr).classList.toggle("is-active", on);
        qs(".pulse", gr).style.display = on ? "" : "none";
      });
      var n = count(id);
      info.innerHTML = '<div><h3>' + esc(r.name) + ' <span class="tamil-line" lang="ta">' + esc(r.ta) + "</span></h3><p>" + esc(r.blurb) + "</p></div>" +
        '<a class="link-arrow" href="properties.html?region=' + r.id + '"><span>' + (n ? "View " + n + (n === 1 ? " property" : " properties") : "Ask about this region") + "</span>" + I.arrow + "</a>";
      qs("#region-panel").setAttribute("aria-labelledby", "rtab-" + id);
    }
    // hover previews a region, but only on real pointer movement: scrolling under a resting
    // cursor (e.g. after arrow-key navigation) must not steal the selection
    var last = null, canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
    list.addEventListener("pointermove", function (e) {
      if (!canHover || e.pointerType !== "mouse") return;
      if (last && last[0] === e.screenX && last[1] === e.screenY) return;
      last = [e.screenX, e.screenY];
      var b = e.target.closest(".region-btn");
      if (b && b.getAttribute("aria-selected") !== "true") select(b.dataset.id);
    });
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b.dataset.id); });
      b.addEventListener("keydown", function (e) {
        var k = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!k) return;
        e.preventDefault();
        select(btns[(i + k + btns.length) % btns.length].dataset.id, true);
      });
    });
    select(R[0].id);
  }

  /* ---------- categories ---------- */

  function categories() {
    var host = qs("#cat-list");
    if (!host) return;
    var blurbs = {
      plot: "Approved layouts with roads, drainage and street lights, ready to build on.",
      farm: "Coconut groves, mango orchards and open farmland with water and power.",
      estate: "Hill land in Kodaikanal and Ooty for cottages, homestays and retreats.",
      commercial: "Highway frontage and town-centre land for business.",
      house: "Ready-to-move independent houses in settled neighbourhoods."
    };
    var sceneFor = { plot: "plots-b", farm: "farm", estate: "tea", commercial: "highway", house: "house" };
    var artFor = { plot: { kind: "plan", seed: 21 }, farm: { kind: "farm", seed: 3 }, estate: { kind: "hills", seed: 5 }, commercial: { kind: "highway", seed: 2 }, house: { kind: "plan", seed: 15, house: true, focus: true } };
    host.innerHTML = DATA.types.map(function (t, i) {
      var n = DATA.properties.filter(function (p) { return p.type === t.id && p.status !== "sold"; }).length;
      return '<a class="cat-row" href="properties.html?type=' + t.id + '" data-reveal style="--d:' + (i * 0.06) + 's">' +
        '<span class="num">0' + (i + 1) + "</span><h3>" + esc(t.label) + "</h3><p>" + esc(blurbs[t.id] || "") + "</p>" +
        '<span class="count">' + n + (n === 1 ? " listing" : " listings") + "</span>" + I.arrow +
        '<span class="cat-thumb" aria-hidden="true">' + TLP.photo(sceneFor[t.id], "", { noGold: true }) + "</span></a>";
    }).join("");
    TLP.observe(host);
  }

  /* ---------- process line ---------- */

  function processLine() {
    var host = qs("#process");
    if (!host) return;
    host.innerHTML = '<svg class="process-line" aria-hidden="true" preserveAspectRatio="none"><path class="base" pathLength="1"/><path class="glow" pathLength="1"/><path class="core" pathLength="1"/></svg>' +
      DATA.process.map(function (s, i) {
        return '<div class="step" data-reveal style="--d:' + (i * 0.08) + 's"><span class="step-dot"></span><span class="num">Step 0' + (i + 1) + "</span><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
      }).join("");
    var svg = qs(".process-line", host), paths = qsa("path", svg), steps = qsa(".step", host);
    function shape() {
      var r = svg.getBoundingClientRect(), vertical = r.height > r.width;
      var d = vertical ? "M2,0 L2," + r.height : "M0,12 L" + r.width + ",12";
      svg.setAttribute("viewBox", "0 0 " + Math.max(1, r.width) + " " + Math.max(1, r.height));
      paths.forEach(function (p) { p.setAttribute("d", d); });
      return vertical;
    }
    var vertical = shape(), raf = 0;
    function update() {
      raf = 0;
      var r = host.getBoundingClientRect(), vh = window.innerHeight;
      var p = U.reduced() ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      svg.style.setProperty("--draw", p.toFixed(3));
      steps.forEach(function (s, i) {
        var at = vertical ? (s.offsetTop + 8) / host.offsetHeight : (s.offsetLeft + 6) / host.offsetWidth;
        s.classList.toggle("is-lit", p >= at - 0.001);
      });
    }
    window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", function () { vertical = shape(); update(); });
    update();
    TLP.observe(host);
  }

  /* ---------- watch reels, FAQ, form ---------- */

  function reels() {
    qsa(".reel[data-reel]").forEach(function (el) { el.insertAdjacentHTML("afterbegin", TLP.photo(el.dataset.reel, "", { noGold: true })); });
    qsa(".reel[data-kind]").forEach(function (el) {
      el.insertAdjacentHTML("afterbegin", TLP.Art.render(el.dataset.kind, { seed: +el.dataset.seed || 1, tea: el.dataset.tea === "1", trees: el.dataset.trees, decorative: true }));
    });
  }

  function faq() {
    var host = qs("#faq");
    if (!host) return;
    host.innerHTML = DATA.faqs.map(function (f) {
      return "<details><summary>" + esc(f.q) + "<i aria-hidden=\"true\"></i></summary><p>" + esc(f.a) + "</p></details>";
    }).join("");
  }

  function form() {
    var f = qs("#home-form");
    if (!f) return;
    f.elements.region.innerHTML = TLP.regionOptions();
    f.elements.budget.innerHTML = '<option value="">Any budget</option>' + DATA.budgets.map(function (b) { return '<option value="' + esc(b.label) + '">' + esc(b.label) + "</option>"; }).join("");
    TLP.bindForm(f);
  }

  story();
  featured();
  regions();
  categories();
  processLine();
  reels();
  faq();
  form();
  TLP.observe();
})();
