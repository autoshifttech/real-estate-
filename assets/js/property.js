/*
 * Property page: property.html?id=<id>
 * Hero, spec bar, description, plot chooser (for layouts), nearby places, map, enquiry and similar listings.
 */
(function () {
  "use strict";

  var TLP = window.TLP, U = TLP.util, I = TLP.icons, DATA = window.TLP_DATA, CFG = window.TLP_CONFIG;
  var qs = U.qs, qsa = U.qsa, esc = U.esc;

  var id = new URLSearchParams(window.location.search).get("id");
  var p = U.property(id);
  var hero = qs("#prop-hero"), main = qs("#prop-main"), specBar = qs("#spec-bar"), form = qs("#prop-form");

  if (!p) {
    document.title = "Property not found — " + CFG.name;
    qs("#prop-found").hidden = true;
    qs("#prop-missing").hidden = false;
    return;
  }

  var region = U.region(p.region), type = U.type(p.type);
  document.title = p.title + " — " + p.location + " | " + CFG.name;
  var desc = qs('meta[name="description"]');
  if (desc) desc.setAttribute("content", p.summary);

  /* hero */
  // site plans read best as a night blueprint behind white type
  if (p.art.kind === "plan" && !p.image) {
    hero.classList.add("t-dusk");
    var hdr = qs("#site-header"); if (hdr) hdr.classList.add("is-inverse");
  }
  hero.insertAdjacentHTML("afterbegin", TLP.propertyArt(p, p.art.kind === "plan" ? { focus: false, zoom: null, annotate: true, shift: -20 } : { annotate: true }));
  hero.querySelector(".wrap").innerHTML =
    '<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="properties.html">Properties</a><span aria-hidden="true">/</span>' +
    '<a href="properties.html?region=' + p.region + '">' + esc(region.name) + '</a><span aria-hidden="true">/</span><span aria-current="page">' + esc(p.title) + "</span></nav>" +
    TLP.statusBadge(p) +
    '<h1 class="display">' + esc(p.title) + "</h1>" +
    '<p class="loc">' + I.pin + esc(p.location) + "</p>" +
    '<div class="prop-hero-actions on-dark"><a class="btn btn-primary" href="#enquire">' + (p.status === "sold" ? "Ask about similar land" : "Book a site visit") + "</a>" +
    '<a class="btn btn-ghost" href="' + U.waLink("Hi! I'm interested in " + p.title + " (" + p.location + ").") + '" target="_blank" rel="noopener">' + I.whatsapp + "WhatsApp</a></div>";

  /* spec bar */
  var specs = [["Price", U.formatPrice(p.price) + (p.priceNote && p.priceNote !== "total" ? " " + p.priceNote : "")], ["Area", p.area], ["Type", type ? type.label.replace(/s$/, "") : ""], ["Approval", p.approval], ["Road", p.road]];
  specBar.innerHTML = specs.map(function (s) { return "<div><dt>" + esc(s[0]) + "</dt><dd>" + esc(s[1]) + "</dd></div>"; }).join("");

  /* main column */
  var html = "";
  html += '<section aria-labelledby="h-about"><p class="eyebrow">' + esc(region.name) + ' · <span lang="ta">' + esc(region.ta) + "</span></p>" +
    '<h2 id="h-about">About this property</h2><p class="lede">' + esc(p.summary) + "</p><p>" + esc(p.description) + "</p></section>";
  html += '<section aria-labelledby="h-high"><h2 id="h-high">Highlights</h2><ul class="ticks">' +
    p.highlights.map(function (h) { return "<li>" + I.check + "<span>" + esc(h) + "</span></li>"; }).join("") + "</ul></section>";
  if (p.layout) html += '<section aria-labelledby="h-plots"><h2 id="h-plots">Choose your plot</h2><div class="plots" id="plots"></div></section>';
  html += '<section aria-labelledby="h-near"><h2 id="h-near">Location</h2><ul class="nearby">' +
    p.nearby.map(function (n) { return "<li><span>" + esc(n.name) + "</span><span>" + esc(n.dist) + "</span></li>"; }).join("") + "</ul>" +
    '<div class="map-embed"><iframe title="Map of ' + esc(p.location) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' +
    encodeURIComponent(p.coords ? p.coords.join(",") : p.location) + '&z=13&output=embed"></iframe></div></section>';
  html += '<section aria-labelledby="h-video"><h2 id="h-video">Watch the walkthrough</h2><p>We film every property before it is listed — the approach road, the boundary stones, the water and the view.</p>' +
    '<div class="actions-row"><a class="btn btn-primary" href="' + esc(p.video || CFG.instagram) + '" target="_blank" rel="noopener">' + I.play + (p.video ? "Watch the video" : "Walkthroughs on Instagram") + "</a>" +
    '<a class="btn btn-light" href="' + esc(CFG.youtube) + '" target="_blank" rel="noopener">' + I.youtube + "YouTube channel</a></div></section>";
  main.innerHTML = html;

  /* enquiry form */
  var sold = p.status === "sold";
  qs("#aside-price").innerHTML = '<p class="price">' + U.formatPrice(p.price) + TLP.priceNote(p) + "</p>" + TLP.statusBadge(p);
  qs("#aside-title").textContent = sold ? "Ask about similar land" : "Book a site visit";
  qs("#aside-quick").innerHTML =
    '<a class="btn btn-light" href="' + U.waLink("Hi! I'm interested in " + p.title + ".") + '" target="_blank" rel="noopener">' + I.whatsapp + "WhatsApp</a>" +
    '<a class="btn btn-light" href="' + U.telLink() + '">' + I.phone + "Call</a>";
  if (!p.layout) qs("#pf-plot-field").hidden = true;
  try { qs("#pf-date").min = new Date().toISOString().slice(0, 10); } catch (e) { /* optional */ }
  TLP.bindForm(form, function () { return { property: p.title + " (" + p.location + ")" }; });

  /* plot chooser */
  if (p.layout) plots(p);

  /* similar */
  var similar = DATA.properties.filter(function (x) { return x.id !== p.id && (x.region === p.region || x.type === p.type); })
    .sort(function (a, b) { return (b.region === p.region) - (a.region === p.region) || (a.status === "sold") - (b.status === "sold"); }).slice(0, 6);
  var sim = qs("#similar");
  if (similar.length) { sim.innerHTML = similar.map(TLP.card).join(""); TLP.observe(sim); }
  else qs("#similar-wrap").hidden = true;

  /* ---------- plot chooser ---------- */

  function plots(p) {
    var L = p.layout, host = qs("#plots"), total = L.rows * L.cols;
    var sold = L.sold === "all" ? Array.apply(null, Array(total)).map(function (_, i) { return i; }) : (L.sold || []);
    var booked = L.booked || [];
    var W = 52, Hh = 68, road = 30, pad = 8, cols = L.cols;
    var width = cols * W + pad * 2, y = road + pad, rowY = [];
    for (var r = 0; r < L.rows; r++) { rowY.push(y); y += Hh; if (r % 2 === 1 && r < L.rows - 1) y += road; }
    var height = y + pad;
    var svg = '<svg viewBox="0 0 ' + width + " " + height + '" role="group" aria-label="Plot layout of ' + esc(p.title) + '">' +
      '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#FFFFFF"/><rect width="2" height="6" fill="#A0A0A0"/></pattern></defs>' +
      '<rect class="road" x="0" y="0" width="' + width + '" height="' + road + '"/><text class="road-label" x="' + width / 2 + '" y="' + (road / 2 + 3) + '" text-anchor="middle">' + esc(p.road || "Main road") + "</text>";
    rowY.forEach(function (ry, r) {
      if (r % 2 === 1 && r < L.rows - 1) svg += '<rect class="road" x="0" y="' + (ry + Hh) + '" width="' + width + '" height="' + road + '"/><text class="road-label" x="' + width / 2 + '" y="' + (ry + Hh + road / 2 + 3) + '" text-anchor="middle">Internal road</text>';
    });
    for (var i = 0; i < total; i++) {
      var row = Math.floor(i / cols), col = i % cols, x = pad + col * W, yy = rowY[row];
      var st = sold.indexOf(i) >= 0 ? "sold" : booked.indexOf(i) >= 0 ? "booked" : "available";
      var label = "Plot " + (i + 1) + ", " + (st === "available" ? "available" : st) + ", " + L.plotSize;
      svg += '<g class="plot is-' + st + '" data-i="' + i + '" tabindex="-1" role="button" aria-label="' + label + '"' + (st === "available" ? ' aria-pressed="false"' : ' aria-disabled="true"') + ">" +
        '<rect x="' + x + '" y="' + yy + '" width="' + W + '" height="' + Hh + '"/>' +
        '<text x="' + (x + W / 2) + '" y="' + (yy + Hh / 2 + 4) + '" text-anchor="middle">' + String(i + 1).padStart(2, "0") + "</text></g>";
    }
    svg += "</svg>";
    var avail = total - sold.length - booked.length;
    host.innerHTML = svg +
      '<div class="plots-legend"><span><i></i>Available</span><span><i class="b"></i>Booked</span><span><i class="s"></i>Sold</span><span><i class="sel"></i>Your choice</span></div>' +
      '<p class="plots-pick" id="plots-pick" aria-live="polite">' + (avail ? "<b>" + avail + "</b> of " + total + " plots available · each " + esc(L.plotSize) + ". Choose one to add it to your enquiry." : "All plots in this layout have been sold.") + "</p>";

    var nodes = qsa(".plot", host), current = 0, firstAvail = nodes.filter(function (n) { return n.classList.contains("is-available"); })[0];
    var plotInput = form.elements.plot;
    if (firstAvail) { firstAvail.tabIndex = 0; current = +firstAvail.dataset.i; } else nodes[0].tabIndex = 0;

    function focusAt(i) {
      i = Math.max(0, Math.min(total - 1, i));
      nodes[current].tabIndex = -1; current = i; nodes[i].tabIndex = 0; nodes[i].focus();
    }
    function choose(n) {
      if (!n.classList.contains("is-available")) return;
      nodes.forEach(function (o) { o.classList.remove("is-selected"); if (o.classList.contains("is-available")) o.setAttribute("aria-pressed", "false"); });
      n.classList.add("is-selected"); n.setAttribute("aria-pressed", "true");
      var name = "Plot " + String(+n.dataset.i + 1).padStart(2, "0");
      plotInput.value = name + " (" + L.plotSize + ")";
      qs("#plots-pick").innerHTML = "Selected <b>" + name + "</b> · " + esc(L.plotSize) + ". It's in your enquiry form.";
    }
    host.addEventListener("click", function (e) { var n = e.target.closest(".plot"); if (n) { focusAt(+n.dataset.i); choose(n); } });
    host.addEventListener("keydown", function (e) {
      var n = e.target.closest(".plot");
      if (!n) return;
      var k = e.key, i = +n.dataset.i;
      if (k === "Enter" || k === " ") { e.preventDefault(); choose(n); }
      else if (k === "ArrowRight") { e.preventDefault(); focusAt(i + 1); }
      else if (k === "ArrowLeft") { e.preventDefault(); focusAt(i - 1); }
      else if (k === "ArrowDown") { e.preventDefault(); focusAt(i + cols); }
      else if (k === "ArrowUp") { e.preventDefault(); focusAt(i - cols); }
      else if (k === "Home") { e.preventDefault(); focusAt(0); }
      else if (k === "End") { e.preventDefault(); focusAt(total - 1); }
    });
  }
})();
