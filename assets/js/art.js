/*
 * Generated landscape art.
 *
 * Every illustration on the site is drawn here as SVG from a seed, so the site needs no
 * stock photography. Colours come from CSS variables (see "Art palette" in style.css), which
 * lets the dawn / dusk toggle cross-fade every scene.
 *
 *   TLP.Art.render(kind, opts)  -> one <svg> string (cards, galleries)
 *   TLP.Art.layers(kind, opts)  -> [{ depth, svg, gold }] for the parallax story on the home page
 *
 * kinds: plan, ghats, farm, hills, river, coast, plains, highway
 */
(function () {
  "use strict";

  var W = 1600, H = 1000, TAU = Math.PI * 2;
  var uidN = 0;

  /* ---------- small helpers ---------- */

  function rng(seed) {
    var a = (seed || 1) * 2654435761 >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function n1(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return n1(p[0]) + "," + n1(p[1]); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function polyD(points) { return "M" + points.map(pt).join(" L") + " Z"; }
  function lineD(points) { return "M" + points.map(pt).join(" L"); }
  function path(d, cls, extra) { return '<path class="' + cls + '" d="' + d + '"' + (extra || "") + "/>"; }

  function smoothD(pts) {
    var d = "M" + pt(pts[0]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += " C" + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) +
        " " + pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + " " + pt(p2);
    }
    return d;
  }

  function vgrad(id, stops, horizontal) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (horizontal ? 1 : 0) + '" y2="' + (horizontal ? 0 : 1) + '">' +
      stops.map(function (s) {
        return '<stop offset="' + s[0] + '" class="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>";
      }).join("") + "</linearGradient>";
  }
  function rgrad(id, stops) {
    return '<radialGradient id="' + id + '">' + stops.map(function (s) {
      return '<stop offset="' + s[0] + '" class="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>";
    }).join("") + "</radialGradient>";
  }

  /* A ridge line: layered sines with a seeded phase. Returns the fill path and a height lookup. */
  function ridge(r, o) {
    var steps = o.steps || 60, x0 = -60, x1 = W + 60, fr = o.freq || 1;
    var ph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU, r() * TAU];
    var rough = o.rough == null ? 0.05 : o.rough;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var x = x0 + (x1 - x0) * i / steps, t = x / W;
      var n = 0.5 * Math.sin(t * 3.4 * fr + ph[0]) + 0.28 * Math.sin(t * 8.1 * fr + ph[1]) +
        0.14 * Math.sin(t * 17.3 * fr + ph[2]) + rough * Math.sin(t * 61 * fr + ph[3]) +
        rough * 0.6 * Math.sin(t * 137 * fr + ph[4]);
      n = clamp((n + 0.92 + rough * 1.6) / (1.84 + rough * 3.2), 0, 1);
      if (o.peak) n = Math.pow(n, 1 + o.peak);
      var env = o.env ? o.env(t) : 1;
      pts.push([x, o.y - o.amp * n * env]);
    }
    var top = smoothD(pts);
    return {
      pts: pts,
      top: top,
      fill: top + " L" + (x1) + "," + (H + 400) + " L" + x0 + "," + (H + 400) + " Z",
      yAt: function (x) {
        var f = (x - x0) / (x1 - x0) * steps, i = clamp(Math.floor(f), 0, steps - 1);
        return lerp(pts[i][1], pts[i + 1][1], f - i);
      }
    };
  }

  /* Perspective ground projection: world (X sideways, Z distance) -> screen */
  function projector(hy, F, cam, cx) {
    cx = cx == null ? W / 2 : cx;
    return function (X, Z) { return [cx + X * F / Z, hy + cam * F / Z]; };
  }

  /* ---------- shared scene pieces ---------- */

  function skyDefs(id) {
    return vgrad(id + "-sky", [[0, "s-sky0"], [0.55, "s-sky1"], [1, "s-sky2"]]) +
      rgrad(id + "-sun", [[0, "s-sun", 1], [0.18, "s-sun", 0.9], [0.4, "s-sun", 0.28], [1, "s-sun", 0]]) +
      rgrad(id + "-cloud", [[0, "s-cloud", 0.75], [1, "s-cloud", 0]]) +
      vgrad(id + "-mist", [[0, "s-haze", 0], [0.5, "s-haze", 0.85], [1, "s-haze", 0]]);
  }

  function sky(id, r, sun, horizonY) {
    var s = '<rect class="sky" x="-200" y="-200" width="' + (W + 400) + '" height="' + (horizonY + 600) + '" fill="url(#' + id + '-sky)"/>';
    if (sun) {
      s += '<circle class="sun-glow" cx="' + n1(sun[0]) + '" cy="' + n1(sun[1]) + '" r="' + (sun[2] * 7) + '" fill="url(#' + id + '-sun)"/>';
      s += '<circle class="f-sun" cx="' + n1(sun[0]) + '" cy="' + n1(sun[1]) + '" r="' + sun[2] + '"/>';
    }
    var clouds = "";
    for (var i = 0; i < 5; i++) {
      var cx = r() * W, cy = 120 + r() * (horizonY * 0.45), rx = 160 + r() * 260;
      clouds += '<ellipse cx="' + n1(cx) + '" cy="' + n1(cy) + '" rx="' + n1(rx) + '" ry="' + n1(rx * (0.07 + r() * 0.06)) + '" fill="url(#' + id + '-cloud)"/>';
    }
    s += '<g class="clouds">' + clouds + "</g>";
    return s;
  }

  function birds(r, n, area) {
    var d = "";
    for (var i = 0; i < n; i++) {
      var x = area[0] + r() * area[2], y = area[1] + r() * area[3], s = 4 + r() * 6;
      d += "M" + n1(x - s) + "," + n1(y - s * 0.4) + " Q" + n1(x - s * 0.4) + "," + n1(y - s * 0.7) + " " + n1(x) + "," + n1(y) +
        " Q" + n1(x + s * 0.4) + "," + n1(y - s * 0.7) + " " + n1(x + s) + "," + n1(y - s * 0.4) + " ";
    }
    return '<path class="birds" d="' + d + '"/>';
  }

  function mist(id, y, h, opacity) {
    return '<rect class="mist" x="-200" y="' + n1(y - h / 2) + '" width="' + (W + 400) + '" height="' + n1(h) + '" fill="url(#' + id + '-mist)" opacity="' + (opacity || 1) + '"/>';
  }

  function ridgeFill(id, key, rd) {
    return path(rd.fill, "ridge", ' fill="url(#' + id + "-" + key + ')"');
  }
  function ridgeGrad(id, key, cls, hazeAt) {
    return vgrad(id + "-" + key, [[0, "s-" + cls], [hazeAt == null ? 0.55 : hazeAt, "s-" + cls], [1, "s-haze"]]);
  }

  /* Coconut palm. Small palms are simple leaf shapes, large ones get feathered fronds. */
  function palm(r, x, y, h, lean, cls) {
    var tx = x + lean, ty = y - h, tw = Math.max(1, h * 0.017);
    var bend = lean * 0.15 + (r() - 0.5) * h * 0.06;
    var trunk = "M" + pt([x - tw, y]) + " Q" + pt([x + bend - tw * 0.8, y - h * 0.55]) + " " + pt([tx - tw * 0.55, ty]) +
      " L" + pt([tx + tw * 0.55, ty]) + " Q" + pt([x + bend + tw * 0.8, y - h * 0.55]) + " " + pt([x + tw, y]) + " Z";
    var n = 10 + Math.floor(r() * 3), L = h * (0.36 + r() * 0.08);
    var leaves = "", feather = h > 220, ribs = "";
    for (var i = 0; i < n; i++) {
      var a = -Math.PI - 0.5 + (i / (n - 1)) * (Math.PI + 1.0) + (r() - 0.5) * 0.22;
      var len = L * (0.7 + r() * 0.4);
      var c = Math.cos(a), s = Math.sin(a);
      var droop = len * 0.5 * Math.pow(Math.abs(c), 1.3);
      var ex = tx + c * len, ey = ty + s * len * 0.5 + droop + (s > 0 ? len * 0.25 : 0);
      var mx = tx + c * len * 0.55, my = ty + s * len * 0.55 - len * 0.16;
      if (!feather) {
        var w = len * 0.11;
        leaves += "M" + pt([tx, ty]) + " Q" + pt([mx, my - w]) + " " + pt([ex, ey]) + " Q" + pt([mx, my + w]) + " " + pt([tx, ty]) + " Z ";
      } else {
        ribs += "M" + pt([tx, ty]) + " Q" + pt([mx, my]) + " " + pt([ex, ey]) + " ";
        var k = 22;
        for (var j = 2; j < k; j++) {
          var t = j / k, it = 1 - t;
          var bx = it * it * tx + 2 * it * t * mx + t * t * ex, by = it * it * ty + 2 * it * t * my + t * t * ey;
          var dx = 2 * it * (mx - tx) + 2 * t * (ex - mx), dy = 2 * it * (my - ty) + 2 * t * (ey - my);
          var dl = Math.sqrt(dx * dx + dy * dy) || 1; dx /= dl; dy /= dl;
          var ll = len * 0.17 * (1 - t * 0.6);
          for (var sgn = -1; sgn <= 1; sgn += 2) {
            var nx = -dy * sgn, ny = dx * sgn;
            var lx = bx + (nx * 0.55 + dx * 0.45) * ll, ly = by + (ny * 0.55 + dy * 0.45) * ll + ll * 0.8;
            ribs += "M" + pt([bx, by]) + " L" + pt([lx, ly]) + " ";
          }
        }
      }
    }
    var out = '<g class="palm ' + cls + '">' + path(trunk, "trunk");
    if (feather) {
      out += '<path class="fronds" d="' + ribs + '" stroke-width="' + n1(Math.max(1.5, h * 0.006)) + '"/>';
      out += '<circle cx="' + n1(tx) + '" cy="' + n1(ty + 4) + '" r="' + n1(h * 0.025) + '"/>';
    } else {
      out += path(leaves, "crown");
    }
    return out + "</g>";
  }

  /* Palmyra (Borassus) — straight trunk, round fan crown. The tree of the southern plains. */
  function palmyra(r, x, y, h, cls) {
    var tw = Math.max(1, h * 0.022), cx = x + (r() - 0.5) * h * 0.04, cy = y - h;
    if (h > 300) return palmyraFans(r, x, y, h, cls, tw, cx, cy);
    var trunk = "M" + pt([x - tw * 1.3, y]) + " L" + pt([cx - tw * 0.8, cy]) + " L" + pt([cx + tw * 0.8, cy]) + " L" + pt([x + tw * 1.3, y]) + " Z";
    var R = h * 0.17, k = 44, crown = [];
    for (var i = 0; i < k; i++) {
      var a = (i / k) * TAU, rr = R * (i % 2 ? 0.84 : 1) * (0.9 + r() * 0.18);
      crown.push([cx + Math.cos(a) * rr * 1.15, cy + Math.sin(a) * rr * 0.8 - R * 0.1]);
    }
    var skirt = "M" + pt([cx - R * 0.45, cy + R * 0.35]) + " L" + pt([cx - R * 0.2, cy + R * 1.1]) + " L" + pt([cx + R * 0.25, cy + R * 1.0]) + " L" + pt([cx + R * 0.45, cy + R * 0.35]) + " Z";
    return '<g class="palm ' + cls + '">' + path(trunk, "trunk") + path(skirt, "trunk") + path(polyD(crown), "crown") + "</g>";
  }

  function palmyraFans(r, x, y, h, cls, tw, cx, cy) {
    var trunk = "M" + pt([x - tw * 1.4, y]) + " L" + pt([cx - tw * 0.8, cy]) + " L" + pt([cx + tw * 0.8, cy]) + " L" + pt([x + tw * 1.4, y]) + " Z";
    var R = h * 0.2, fans = "", stems = "";
    for (var i = 0; i < 26; i++) {
      var a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.9;
      var c = Math.cos(a), s = Math.sin(a), d = R * (0.35 + r() * 0.2);
      var bx = cx + c * d * 1.1, by = cy + s * d * 0.8 + (s > 0 ? d * 0.4 : 0);
      stems += "M" + pt([cx, cy]) + " L" + pt([bx, by]) + " ";
      var fr = R * (0.45 + r() * 0.25), spread = 0.9 + r() * 0.5, seg = 11, f = "M" + pt([bx, by]);
      for (var k = 0; k <= seg; k++) {
        var aa = a - spread / 2 + spread * k / seg, rr = fr * (k % 2 ? 0.78 : 1);
        f += " L" + pt([bx + Math.cos(aa) * rr, by + Math.sin(aa) * rr + fr * 0.15]);
      }
      fans += f + " Z ";
    }
    return '<g class="palm ' + cls + '">' + path(trunk, "trunk") + '<path class="fronds" d="' + stems + '" stroke-width="' + n1(h * 0.006) + '"/>' + path(fans, "crown") + "</g>";
  }

  /* Mango / orchard tree — a dense rounded canopy. */
  function roundTree(r, x, y, h, cls, lit) {
    var cr = h * 0.42, cy = y - h + cr, out = '<g class="tree ' + cls + '">';
    out += path("M" + pt([x - h * 0.03, y]) + " L" + pt([x - h * 0.02, cy]) + " L" + pt([x + h * 0.02, cy]) + " L" + pt([x + h * 0.03, y]) + " Z", "trunk");
    var blobs = '<ellipse cx="' + n1(x) + '" cy="' + n1(cy) + '" rx="' + n1(cr * 1.05) + '" ry="' + n1(cr * 0.75) + '"/>', lights = "";
    for (var i = 0; i < 16; i++) {
      var a = (i / 16) * TAU + r() * 0.3, d = cr * (0.75 + r() * 0.2);
      blobs += '<circle cx="' + n1(x + Math.cos(a) * d * 1.15) + '" cy="' + n1(cy + Math.sin(a) * d * 0.72) + '" r="' + n1(cr * (0.22 + r() * 0.12)) + '"/>';
      if (lit && Math.sin(a) < -0.2 && Math.cos(a) < 0.5) lights += '<circle cx="' + n1(x + Math.cos(a) * d * 0.95) + '" cy="' + n1(cy + Math.sin(a) * d * 0.6) + '" r="' + n1(cr * (0.16 + r() * 0.1)) + '"/>';
    }
    out += '<g class="canopy">' + blobs + "</g>";
    if (lit) out += '<g class="canopy-lit">' + lights + "</g>";
    return out + "</g>";
  }

  /* Hill pine — stacked tiers. */
  function pine(r, x, y, h, cls, slim) {
    var tiers = 6 + Math.floor(r() * 3), d = "", w = h * (slim ? 0.1 : 0.2);
    for (var i = 0; i < tiers; i++) {
      var t = i / tiers, ty = y - h * 0.1 - (h * 0.9) * t, tw = w * (1 - t * 0.8);
      d += "M" + pt([x - tw, ty]) + " L" + pt([x, ty - h * 0.22]) + " L" + pt([x + tw, ty]) + " Z ";
    }
    return '<g class="tree ' + cls + '">' + path("M" + pt([x - 2, y]) + " L" + pt([x - 1, y - h]) + " L" + pt([x + 1, y - h]) + " L" + pt([x + 2, y]) + " Z", "trunk") + path(d, "canopy-path") + "</g>";
  }

  /* Silver oak / eucalyptus — tall and airy. */
  function tallTree(r, x, y, h, cls) {
    var d = "", bl = "";
    d = "M" + pt([x - h * 0.012, y]) + " L" + pt([x, y - h]) + " L" + pt([x + h * 0.012, y]) + " Z";
    for (var i = 0; i < 14; i++) {
      var t = 0.4 + r() * 0.58, bx = x + (r() - 0.5) * h * 0.16 * (1.2 - t), by = y - h * t;
      bl += '<ellipse cx="' + n1(bx) + '" cy="' + n1(by) + '" rx="' + n1(h * (0.012 + r() * 0.02)) + '" ry="' + n1(h * (0.03 + r() * 0.035)) + '"/>';
    }
    return '<g class="tree ' + cls + '">' + path(d, "trunk") + '<g class="canopy">' + bl + "</g></g>";
  }

  function turbine(r, x, y, h, cls) {
    var hub = [x, y - h], b = h * 0.48;
    var tower = "M" + pt([x - h * 0.018, y]) + " L" + pt([x - h * 0.008, y - h]) + " L" + pt([x + h * 0.008, y - h]) + " L" + pt([x + h * 0.018, y]) + " Z";
    var blades = "";
    for (var i = 0; i < 3; i++) {
      var a = i * TAU / 3 - Math.PI / 2, c = Math.cos(a), s = Math.sin(a), px = -s, py = c, w = h * 0.018;
      blades += "M" + pt([hub[0] + px * w, hub[1] + py * w]) + " L" + pt([hub[0] + c * b, hub[1] + s * b]) + " L" + pt([hub[0] - px * w * 0.4 + c * b * 0.15, hub[1] - py * w * 0.4 + s * b * 0.15]) + " Z ";
    }
    var dur = (5 + r() * 4).toFixed(1);
    return '<g class="turbine ' + cls + '">' + path(tower, "tower") +
      '<g class="blades" style="transform-origin:' + n1(hub[0]) + "px " + n1(hub[1]) + "px;animation-duration:" + dur + 's">' + path(blades, "blade") + "</g>" +
      '<circle cx="' + n1(hub[0]) + '" cy="' + n1(hub[1]) + '" r="' + n1(h * 0.016) + '" class="hub"/></g>';
  }

  function grass(r, n, y0, y1, cls) {
    var d = "";
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = lerp(y0, y1, r()), h = 8 + (y - y0) / (y1 - y0 + 1) * 34 * (0.5 + r());
      for (var j = 0; j < 4; j++) {
        var lx = x + (j - 1.5) * 3 + (r() - 0.5) * h * 0.8;
        d += "M" + pt([x + j * 2, y]) + " Q" + pt([x + j * 2 + (lx - x) * 0.3, y - h * 0.6]) + " " + pt([lx, y - h]) + " ";
      }
    }
    return '<path class="grass ' + cls + '" d="' + d + '"/>';
  }

  /* A road between a far point and the bottom of the frame, following a centre curve. */
  function road(centre, hy, k) {
    var left = [], right = [], N = centre.length;
    for (var i = 0; i < N; i++) {
      var p = centre[i], q = centre[Math.min(i + 1, N - 1)], o = centre[Math.max(i - 1, 0)];
      var dx = q[0] - o[0], dy = q[1] - o[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      var w = Math.max(1.5, (p[1] - hy) * k) / 2;
      left.push([p[0] - dy / l * w, p[1] + dx / l * w]);
      right.push([p[0] + dy / l * w, p[1] - dx / l * w]);
    }
    return polyD(left.concat(right.reverse()));
  }
  function bezierPts(p0, c1, c2, p3, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, it = 1 - t;
      out.push([
        it * it * it * p0[0] + 3 * it * it * t * c1[0] + 3 * it * t * t * c2[0] + t * t * t * p3[0],
        it * it * it * p0[1] + 3 * it * it * t * c1[1] + 3 * it * t * t * c2[1] + t * t * t * p3[1]
      ]);
    }
    return out;
  }

  /* ---------- scenes ---------- */

  var scenes = {};

  /* Tenkasi: the Western Ghats at dawn, Courtallam falls, a red-earth road through the fields. */
  scenes.ghats = function (r, id) {
    var hy = 700;
    var defs = skyDefs(id) + ridgeGrad(id, "l1", "l1", 0.5) + ridgeGrad(id, "l2", "l2", 0.55) + ridgeGrad(id, "l3", "l3", 0.7) +
      vgrad(id + "-ground", [[0, "s-g1"], [1, "s-g2"]]) + vgrad(id + "-fall", [[0, "s-fall", 0.95], [1, "s-fall", 0]]);
    var sun = [560 + r() * 380, 300 + r() * 60, 34];
    var r1 = ridge(r, { y: 600, amp: 420, freq: 0.95, peak: 0.8, steps: 90, rough: 0.04 });
    var r2 = ridge(r, { y: 660, amp: 300, freq: 1.3, peak: 0.55, steps: 120, rough: 0.05 });
    var r3 = ridge(r, { y: hy + 4, amp: 120, freq: 2.2, peak: 0.15, steps: 260, rough: 0.14 });

    // Courtallam-style falls: a bright thread down the steepest face of the middle ridge
    var fx = 0, best = -1;
    for (var x = 380; x < 1220; x += 20) { var s = Math.abs(r2.yAt(x + 20) - r2.yAt(x - 20)); if (s > best && r2.yAt(x) < 560) { best = s; fx = x; } }
    var ft = r2.yAt(fx) + 14, fb = r3.yAt(fx) + 30;
    var fall = '<path class="fall" d="M' + pt([fx - 3, ft]) + " L" + pt([fx + 3, ft]) + " L" + pt([fx + 9, fb]) + " L" + pt([fx - 9, fb]) + ' Z" fill="url(#' + id + '-fall)"/>' +
      '<path class="fall-shimmer" d="M' + pt([fx, ft]) + " L" + pt([fx, fb]) + '"/>' +
      '<ellipse class="spray" cx="' + n1(fx) + '" cy="' + n1(fb - 18) + '" rx="70" ry="22" fill="url(#' + id + '-cloud)"/>';

    // fields in perspective and the road
    var P = projector(hy, 900, 1.6, 800);
    var fields = "";
    var xs = [-60, -24, -11, -5, -1.4, 1.4, 5, 11, 24, 60], zs = [2.2, 4, 7, 12, 22, 45, 140];
    for (var i = 0; i < xs.length - 1; i++) {
      for (var j = 0; j < zs.length - 1; j++) {
        if (i === 4) continue;
        var cls = ["f-g1", "f-g2", "f-crop", "f-g1", "f-crop2"][Math.floor(r() * 5)];
        fields += path(polyD([P(xs[i], zs[j]), P(xs[i + 1], zs[j]), P(xs[i + 1], zs[j + 1]), P(xs[i], zs[j + 1])]), cls + " field");
      }
    }
    var bunds = "";
    zs.forEach(function (z) { bunds += "M" + pt(P(-60, z)) + " L" + pt(P(60, z)) + " "; });
    xs.forEach(function (x) { bunds += "M" + pt(P(x, 2.2)) + " L" + pt(P(x, 140)) + " "; });

    var centre = bezierPts([760, H + 60], [930, 880], [700, 780], [812, hy + 4], 40);
    var roadD = road(centre, hy, 0.5);
    var gold = smoothD(centre.filter(function (_, k) { return k % 2 === 0; }));

    // palm lines along the field bunds at mid distance
    var midPalms = "";
    [45, 30, 20].forEach(function (z) {
      for (var X = -46; X < 46; X += 3 + r() * 6) {
        if (Math.abs(X) < 4 || r() < 0.25) continue;
        var b = P(X, z), hh = 9 * 900 / z * 0.36;
        midPalms += palm(r, b[0], b[1], hh, (r() - 0.5) * hh * 0.3, z > 25 ? "far" : "mid");
      }
    });

    var near = palm(r, 1480, H + 30, 700, -110, "near") + palm(r, 1580, H + 40, 560, -20, "near") + grass(r, 70, 940, 1010, "near");

    return {
      defs: defs,
      layers: [
        { depth: 0, html: sky(id, r, sun, hy) + birds(r, 6, [300, 160, 600, 140]) },
        { depth: 0.12, html: ridgeFill(id, "l1", r1) + mist(id, 520, 120, 0.7) },
        { depth: 0.25, html: ridgeFill(id, "l2", r2) + fall + mist(id, 640, 110, 0.9) },
        { depth: 0.4, html: ridgeFill(id, "l3", r3) + mist(id, hy - 6, 40, 0.8) },
        { depth: 0.7, html: '<rect x="-200" y="' + (hy - 2) + '" width="' + (W + 400) + '" height="' + (H - hy + 400) + '" fill="url(#' + id + '-ground)"/>' + fields + '<path class="bunds" d="' + bunds + '"/>' + path(roadD, "f-soil road") + midPalms },
        { depth: 1, html: near }
      ],
      gold: [gold],
      goldDepth: 0.7
    };
  };

  /* Farm land: a coconut (or mango) grove at golden hour, with one parcel traced in gold. */
  scenes.farm = function (r, id, o) {
    var hy = 640, mango = o.trees === "mango";
    var defs = skyDefs(id) + ridgeGrad(id, "l1", "l1", 0.6) + ridgeGrad(id, "l2", "l3", 0.8) + vgrad(id + "-ground", [[0, "s-g1"], [1, "s-g2"]]);
    var sun = [1100 + r() * 200, 470 + r() * 40, 40];
    var r1 = ridge(r, { y: hy - 10, amp: 190, freq: 1.1, peak: 0.5, steps: 80 });
    var r2 = ridge(r, { y: hy + 4, amp: 34, freq: 3, steps: 240, rough: 0.3 });
    var P = projector(hy, 900, 2, 800);

    var fields = "", furrows = "";
    var xs = [-90, -30, -14, -6, 1.5, 4, 30, 90], zs = [3, 7, 22, 40, 80, 300];
    for (var i = 0; i < xs.length - 1; i++) {
      for (var j = 0; j < zs.length - 1; j++) {
        var cls = i >= 4 ? "f-g2" : ["f-g1", "f-crop", "f-crop2", "f-g1"][Math.floor(r() * 4)];
        fields += path(polyD([P(xs[i], zs[j]), P(xs[i + 1], zs[j]), P(xs[i + 1], zs[j + 1]), P(xs[i], zs[j + 1])]), cls + " field");
        if (i < 4 && r() > 0.35) {
          for (var fx = xs[i]; fx < xs[i + 1]; fx += (xs[i + 1] - xs[i]) / 9) furrows += "M" + pt(P(fx, zs[j])) + " L" + pt(P(fx, zs[j + 1])) + " ";
        }
      }
    }

    // the grove: rows receding to the right
    var trees = [];
    for (var z = 15; z < 90; z *= 1.22) {
      for (var X = 5; X < 46; X += mango ? 3.8 : 3.6) {
        var b = P(X + (r() - 0.5) * 0.8, z), hh = (mango ? 4 : 5.6) * 900 / z;
        trees.push({ z: z, html: mango ? roundTree(r, b[0], b[1], hh, z > 30 ? "far" : "mid", z < 16) : palm(r, b[0], b[1], hh, (r() - 0.5) * hh * 0.25, z > 30 ? "far" : "mid") });
      }
    }
    trees.sort(function (a, b) { return b.z - a.z; });

    var parcel = [P(-6, 7), P(1.5, 7), P(1.5, 22), P(-6, 22)];
    var gold = lineD([parcel[0], parcel[1], parcel[2], parcel[3], parcel[0]]);
    var stones = parcel.map(function (p) { return '<circle class="boundary-stone" cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="5"/>'; }).join("");

    var near = mango
      ? roundTree(r, 90, H + 40, 640, "near") + roundTree(r, -60, H + 10, 520, "near")
      : palm(r, 70, H + 30, 700, -40, "near") + palm(r, -40, H + 20, 520, 120, "near");

    return {
      defs: defs,
      layers: [
        { depth: 0, html: sky(id, r, sun, hy) + birds(r, 5, [600, 260, 500, 140]) },
        { depth: 0.15, html: ridgeFill(id, "l1", r1) + mist(id, hy - 30, 90, 0.9) },
        { depth: 0.3, html: ridgeFill(id, "l2", r2) },
        { depth: 0.65, html: '<rect x="-200" y="' + (hy - 2) + '" width="' + (W + 400) + '" height="' + (H - hy + 400) + '" fill="url(#' + id + '-ground)"/>' + fields + '<path class="furrows" d="' + furrows + '"/>' + stones + trees.map(function (t) { return t.html; }).join("") },
        { depth: 1, html: near + grass(r, 60, 950, 1010, "near") }
      ],
      gold: [gold],
      goldDepth: 0.65
    };
  };

  /* Kodaikanal / Ooty: layered blue hills, valley mist, terraced slope (tea rows for Ooty). */
  scenes.hills = function (r, id, o) {
    var defs = skyDefs(id) + ridgeGrad(id, "l1", "l1", 0.45) + ridgeGrad(id, "l2", "l2", 0.5) + ridgeGrad(id, "l3", "l3", 0.55) + ridgeGrad(id, "l4", "l4", 0.65) +
      vgrad(id + "-slope", [[0, "s-tea"], [1, "s-g2"]]);
    var valley = function (k) { return function (t) { return 0.35 + k * Math.pow(Math.abs(t - 0.45), 1.4) * 2.4; }; };
    var sun = [700 + r() * 300, 250, 30];
    var r1 = ridge(r, { y: 470, amp: 260, freq: 0.9, peak: 0.3, steps: 80, env: valley(0.8) });
    var r2 = ridge(r, { y: 560, amp: 280, freq: 1.2, peak: 0.25, steps: 90, env: valley(1) });
    var r3 = ridge(r, { y: 660, amp: 300, freq: 1.5, peak: 0.2, steps: 120, rough: 0.08, env: valley(1.1) });
    var r4 = ridge(r, { y: 780, amp: 300, freq: 1.8, peak: 0.1, steps: 200, rough: 0.12, env: valley(1.2) });

    // the near slope, rising to the right
    var top = bezierPts([560, H + 80], [820, 760], [1180, 560], [1700, 470], 60);
    var slope = smoothD(top) + " L1800," + (H + 400) + " L560," + (H + 400) + " Z";
    var rows = "", goldRow = null, k = 0;
    for (var off = 18; off < 640; off += 12 + off * 0.09) {
      var row = top.map(function (p, i) { return [p[0] + off * 0.35, p[1] + off * (0.95 + 0.25 * Math.sin(i * 0.2 + off * 0.01))]; });
      var d = smoothD(row);
      rows += '<path class="tea-row" d="' + d + '" stroke-width="' + n1(2 + off * 0.03) + '"/>';
      if (k++ === 3) goldRow = d;
    }
    var clipId = id + "-slopeclip";
    defs += '<clipPath id="' + clipId + '"><path d="' + slope + '"/></clipPath>';

    var trees = "";
    if (o.tea) {
      for (var i = 0; i < 9; i++) {
        var tx = 760 + r() * 900, ty = H + 40;
        var ti = clamp(Math.floor((tx - 560) / 1140 * 60), 0, 60);
        ty = top[ti][1] + 40 + r() * 300;
        trees += pine(r, tx, ty, 120 + (ty - 500) * 0.45, "mid", true);
      }
    } else {
      for (var p = 0; p < 26; p++) {
        var px = r() * 560, py = r4.yAt(px) + 10;
        trees += pine(r, px, py + 30, 60 + r() * 60, "mid");
      }
    }
    var near = "";
    for (var q = 0; q < (o.tea ? 3 : 5); q++) near += o.tea ? pine(r, -20 + q * 110 + r() * 30, H + 40, 640 + r() * 260, "near", true) : pine(r, -30 + q * 80 + r() * 30, H + 40, 520 + r() * 300, "near");

    return {
      defs: defs,
      layers: [
        { depth: 0, html: sky(id, r, sun, 500) + birds(r, 4, [800, 200, 400, 120]) },
        { depth: 0.1, html: ridgeFill(id, "l1", r1) + mist(id, 470, 140, 0.9) },
        { depth: 0.2, html: ridgeFill(id, "l2", r2) + mist(id, 600, 160, 1) },
        { depth: 0.35, html: ridgeFill(id, "l3", r3) + mist(id, 720, 160, 1) },
        { depth: 0.5, html: ridgeFill(id, "l4", r4) + (o.tea ? "" : trees) },
        { depth: 0.75, html: path(slope, "slope", ' fill="url(#' + id + '-slope)"') + '<g clip-path="url(#' + clipId + ')">' + rows + "</g>" + (o.tea ? trees : "") },
        { depth: 1, html: near }
      ],
      gold: [goldRow],
      goldDepth: 0.75
    };
  };

  /* Kerala: a river between palm-lined banks, green hills behind. */
  scenes.river = function (r, id) {
    var hy = 600;
    var defs = skyDefs(id) + ridgeGrad(id, "l1", "l2", 0.5) + ridgeGrad(id, "l2", "l3", 0.6) + vgrad(id + "-ground", [[0, "s-g1"], [1, "s-g2"]]) +
      vgrad(id + "-water", [[0, "s-water"], [1, "s-water2"]]);
    var sun = [420 + r() * 300, 330, 30];
    var r1 = ridge(r, { y: hy - 10, amp: 230, freq: 1.2, peak: 0.3, steps: 90 });
    var r2 = ridge(r, { y: hy + 4, amp: 70, freq: 2.6, steps: 240, rough: 0.25 });

    var lb = bezierPts([760, hy + 2], [700, 700], [420, 760], [-80, H + 60], 40);
    var rb = bezierPts([840, hy + 2], [930, 690], [1240, 820], [1180, H + 60], 40);
    var river = polyD(lb.concat(rb.slice().reverse()));
    var clipId = id + "-river";
    defs += '<clipPath id="' + clipId + '"><path d="' + river + '"/></clipPath>';

    var bankPalms = [], refl = "";
    function bank(pts, side) {
      for (var i = 2; i < pts.length; i += 2 + Math.floor(r() * 3)) {
        var p = pts[i], depth = (p[1] - hy) / (H - hy), hh = (40 + depth * 480) * (0.7 + r() * 0.5);
        if (side > 0 && i > 12) continue;
        var x = p[0] + side * (10 + r() * 60) * (0.3 + depth), y = p[1] + 6;
        var lean = -side * hh * (0.04 + r() * 0.2);
        bankPalms.push({ y: y, html: palm(r, x, y, hh, lean, depth > 0.5 ? "near" : depth > 0.15 ? "mid" : "far") });
        if (depth < 0.7) refl += '<g transform="translate(0 ' + n1(2 * y) + ') scale(1 -1)" opacity=".22">' + palm(r, x, y, hh, lean, "far") + "</g>";
      }
    }
    bank(lb, -1); bank(rb, 1);
    for (var k = 0; k < 30; k++) {
      var x = 400 + r() * 1000, y = 440 + r() * 260;
      bankPalms.push({ y: hy + 2, html: palm(r, x, hy + 6, 30 + r() * 30, (r() - 0.5) * 10, "far") });
    }
    bankPalms.sort(function (a, b) { return a.y - b.y; });
    var ripples = "";
    for (var q = 0; q < 50; q++) {
      var ry = hy + 10 + Math.pow(r(), 1.5) * (H - hy), rx = 300 + r() * 1000, rw = 8 + (ry - hy) * 0.18;
      ripples += "M" + n1(rx) + "," + n1(ry) + " h" + n1(rw) + " ";
    }

    // the plot: along the right bank, then inland
    var b0 = rb[16], b1 = rb[30];
    var gold = smoothD(rb.slice(16, 31)) + " L" + pt([b1[0] + 300, b1[1] - 40]) + " L" + pt([b0[0] + 260, b0[1] - 30]) + " Z";

    return {
      defs: defs,
      layers: [
        { depth: 0, html: sky(id, r, sun, hy) + birds(r, 5, [500, 200, 500, 120]) },
        { depth: 0.15, html: ridgeFill(id, "l1", r1) + mist(id, hy - 40, 120, 0.9) },
        { depth: 0.3, html: ridgeFill(id, "l2", r2) },
        {
          depth: 0.7, html: '<rect x="-200" y="' + (hy - 2) + '" width="' + (W + 400) + '" height="' + (H - hy + 400) + '" fill="url(#' + id + '-ground)"/>' +
            path(river, "water", ' fill="url(#' + id + '-water)"') + '<g clip-path="url(#' + clipId + ')">' + refl + '<path class="ripples" d="' + ripples + '"/></g>' +
            bankPalms.map(function (b) { return b.html; }).join("")
        },
        { depth: 1, html: palm(r, 60, H + 40, 760, 220, "near") + grass(r, 40, 960, 1010, "near") }
      ],
      gold: [gold],
      goldDepth: 0.7
    };
  };

  /* Thoothukudi: sunrise over the Gulf of Mannar, salt pans, palms and a coastal plot. */
  scenes.coast = function (r, id) {
    var hy = 560;
    var defs = skyDefs(id) + vgrad(id + "-sea", [[0, "s-water"], [1, "s-water2"]]) + vgrad(id + "-ground", [[0, "s-sand"], [1, "s-g2"]]);
    var sun = [980 + r() * 200, hy - 40, 44];
    var shore = bezierPts([-80, 700], [400, 680], [1000, 720], [1700, 690], 30);
    var sea = '<rect x="-200" y="' + hy + '" width="' + (W + 400) + '" height="300" fill="url(#' + id + '-sea)"/>';
    var glint = "";
    for (var i = 0; i < 46; i++) {
      var gy = hy + 4 + Math.pow(i / 46, 1.4) * 140, gw = 10 + (gy - hy) * 0.9 * r();
      glint += "M" + n1(sun[0] - gw / 2 + (r() - 0.5) * (gy - hy) * 0.8) + "," + n1(gy) + " h" + n1(gw) + " ";
    }
    var ship = '<path class="f-l1" d="M1340,' + (hy - 1) + " l90,0 l-8,-8 l-30,0 l0,-10 l-12,0 l0,10 l-34,0 z" + '"/>';
    var land = path(smoothD(shore) + " L1800," + (H + 400) + " L-200," + (H + 400) + " Z", "land", ' fill="url(#' + id + '-ground)"');

    var P = projector(hy, 900, 2.2, 800);
    var pans = "";
    for (var x = -40; x < -5; x += 3.5) {
      for (var z = 6.5; z < 13; z *= 1.18) {
        pans += path(polyD([P(x + 0.25, z * 1.02), P(x + 3.25, z * 1.02), P(x + 3.25, z * 1.16), P(x + 0.25, z * 1.16)]), "f-salt pan");
      }
    }
    var palms = [];
    for (var k = 0; k < 30; k++) {
      var X = 5 + r() * 26, Z = 5 + r() * 9, b = P(X, Z), hh = 5 * 900 / Z * (0.6 + r() * 0.5);
      if (b[1] < 700) continue;
      palms.push({ z: Z, html: r() > 0.4 ? palm(r, b[0], b[1], hh, (r() - 0.5) * hh * 0.4, Z > 14 ? "far" : "mid") : palmyra(r, b[0], b[1], hh * 1.1, Z > 14 ? "far" : "mid") });
    }
    palms.sort(function (a, b) { return b.z - a.z; });

    var plot = [P(-2, 7.5), P(4, 7.5), P(4, 15), P(-2, 15)];
    var gold = lineD([plot[0], plot[1], plot[2], plot[3], plot[0]]);

    return {
      defs: defs,
      layers: [
        { depth: 0, html: sky(id, r, sun, hy) + birds(r, 7, [300, 220, 700, 160]) },
        { depth: 0.2, html: sea + '<path class="glint" d="' + glint + '"/>' + ship + mist(id, hy, 30, 0.6) },
        { depth: 0.6, html: land + pans + palms.map(function (p) { return p.html; }).join("") },
        { depth: 1, html: palm(r, 1500, H + 40, 780, -160, "near") + grass(r, 60, 950, 1010, "near") }
      ],
      gold: [gold],
      goldDepth: 0.6
    };
  };

  /* Tirunelveli plains: palmyra trees, wind turbines, a low line of hills. */
  scenes.plains = function (r, id) {
    var hy = 650;
    var defs = skyDefs(id) + ridgeGrad(id, "l1", "l1", 0.6) + vgrad(id + "-ground", [[0, "s-g1"], [1, "s-g2"]]);
    var sun = [400 + r() * 300, 380, 36];
    var r1 = ridge(r, { y: hy - 4, amp: 120, freq: 1.4, peak: 0.6, steps: 100 });
    var P = projector(hy, 900, 1.8, 800);
    var fields = "";
    var xs = [-90, -26, -9, -2, 2, 12, 34, 90], zs = [2.5, 6, 14, 30, 70, 300];
    for (var i = 0; i < xs.length - 1; i++) for (var j = 0; j < zs.length - 1; j++) {
      fields += path(polyD([P(xs[i], zs[j]), P(xs[i + 1], zs[j]), P(xs[i + 1], zs[j + 1]), P(xs[i], zs[j + 1])]), ["f-g1", "f-dry", "f-g2", "f-dry"][Math.floor(r() * 4)] + " field");
    }
    var turbines = [];
    [[-30, 60], [-12, 80], [10, 55], [26, 70], [44, 90], [-50, 110]].forEach(function (t) {
      var b = P(t[0], t[1]); turbines.push({ z: t[1], html: turbine(r, b[0], b[1], 80 * 900 / t[1] * 0.3, "far") });
    });
    var palms = [];
    for (var k = 0; k < 40; k++) {
      var X = (r() - 0.5) * 80, Z = 5 + Math.pow(r(), 1.5) * 60, b = P(X, Z);
      if (Math.abs(X) < 3) continue;
      palms.push({ z: Z, html: palmyra(r, b[0], b[1], 10 * 900 / Z * 0.6, Z > 20 ? "far" : "mid") });
    }
    var items = turbines.concat(palms).sort(function (a, b) { return b.z - a.z; });
    var centre = bezierPts([700, H + 60], [760, 860], [860, 720], [800, hy + 2], 30);
    var roadD = road(centre, hy, 0.45);
    var plot = [P(2.5, 6.5), P(7.5, 6.5), P(7.5, 12), P(2.5, 12)];
    var gold = lineD([plot[0], plot[1], plot[2], plot[3], plot[0]]);

    return {
      defs: defs,
      layers: [
        { depth: 0, html: sky(id, r, sun, hy) + birds(r, 6, [700, 200, 600, 160]) },
        { depth: 0.15, html: ridgeFill(id, "l1", r1) + mist(id, hy - 10, 50, 0.8) },
        { depth: 0.6, html: '<rect x="-200" y="' + (hy - 2) + '" width="' + (W + 400) + '" height="' + (H - hy + 400) + '" fill="url(#' + id + '-ground)"/>' + fields + path(roadD, "f-soil road") + items.map(function (t) { return t.html; }).join("") },
        { depth: 1, html: palmyra(r, 140, H + 30, 760, "near") + grass(r, 70, 950, 1010, "near") }
      ],
      gold: [gold],
      goldDepth: 0.6
    };
  };

  /* Commercial: highway frontage with the plot traced alongside the road. */
  scenes.highway = function (r, id) {
    var hy = 640;
    var defs = skyDefs(id) + ridgeGrad(id, "l1", "l1", 0.6) + vgrad(id + "-ground", [[0, "s-g1"], [1, "s-g2"]]);
    var sun = [1100, 360, 34];
    var r1 = ridge(r, { y: hy - 4, amp: 150, freq: 1.2, peak: 0.6, steps: 100 });
    var P = projector(hy, 900, 1.7, 800);
    var asphalt = path(polyD([P(-3.5, 2), P(3.5, 2), P(3.5, 400), P(-3.5, 400)]), "f-asphalt");
    var marks = "";
    for (var z = 2.4; z < 120; z *= 1.28) marks += path(polyD([P(-0.08, z), P(0.08, z), P(0.08, z * 1.12), P(-0.08, z * 1.12)]), "f-mark");
    var edges = "M" + pt(P(-3.2, 2)) + " L" + pt(P(-3.2, 400)) + " M" + pt(P(3.2, 2)) + " L" + pt(P(3.2, 400));
    var poles = "";
    for (var pz = 4; pz < 120; pz *= 1.35) {
      var b = P(-5, pz), hh = 9 * 900 / pz * 0.5;
      poles += "M" + pt(b) + " L" + pt([b[0], b[1] - hh]) + " M" + pt([b[0] - hh * 0.12, b[1] - hh * 0.92]) + " L" + pt([b[0] + hh * 0.12, b[1] - hh * 0.92]) + " ";
    }
    var bldg = "";
    for (var k = 0; k < 7; k++) {
      var X = -9 - r() * 30, Z = 30 + r() * 70, a = P(X, Z), w = 4 * 900 / Z, h = (2 + r() * 4) * 900 / Z * 0.6;
      bldg += path(polyD([[a[0], a[1]], [a[0] + w, a[1]], [a[0] + w, a[1] - h], [a[0], a[1] - h]]), "f-bldg");
    }
    var trees = "";
    for (var t = 0; t < 18; t++) {
      var tx = 6 + r() * 40, tz = 18 + r() * 60, tb = P(tx, tz);
      trees += r() > 0.5 ? palmyra(r, tb[0], tb[1], 9 * 900 / tz * 0.6, "far") : roundTree(r, tb[0], tb[1], 5 * 900 / tz * 0.6, "far");
    }
    var plot = [P(4, 6.5), P(10, 6.5), P(10, 13), P(4, 13)];
    var gold = lineD([plot[0], plot[3], plot[2], plot[1], plot[0]]);
    return {
      defs: defs,
      layers: [
        { depth: 0, html: sky(id, r, sun, hy) },
        { depth: 0.15, html: ridgeFill(id, "l1", r1) + mist(id, hy - 10, 50, 0.8) },
        { depth: 0.6, html: '<rect x="-200" y="' + (hy - 2) + '" width="' + (W + 400) + '" height="' + (H - hy + 400) + '" fill="url(#' + id + '-ground)"/>' + bldg + trees + asphalt + '<path class="lane" d="' + edges + '"/>' + marks + '<path class="poles" d="' + poles + '"/>' },
        { depth: 1, html: grass(r, 60, 950, 1010, "near") }
      ],
      gold: [gold],
      goldDepth: 0.6
    };
  };

  /* Site plan: an isometric layout on drafting paper with one plot traced in gold. */
  scenes.plan = function (r, id, o) {
    var rows = (o.layout && o.layout.rows) || 4, cols = (o.layout && o.layout.cols) || 9;
    var pw = 1, pd = 1.4, rw = 0.75;
    var rowY = [], y = rw;
    for (var i = 0; i < rows; i++) { rowY.push(y); y += pd; if (i % 2 === 1 && i < rows - 1) y += rw; }
    var depthY = y + rw * 0.6;
    var cross = Math.floor(cols / 2), crossW = 0.7;
    function colX(c) { return c * pw + (c >= cross ? crossW : 0); }
    var widthX = colX(cols) + 2.6; // room for the park
    var s = Math.min(1300 / ((widthX + depthY) * 0.866), 780 / ((widthX + depthY) * 0.5));
    var ox = W / 2 - (widthX - depthY) * s * 0.866 / 2, oy = H / 2 - (widthX + depthY) * s * 0.5 / 2 + (o.shift == null ? 40 : o.shift);
    function P(x, yy, z) { return [ox + (x - yy) * s * 0.866, oy + (x + yy) * s * 0.5 - (z || 0) * s]; }
    function quad(x0, y0, x1, y1, z) { return [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)]; }

    var defs = '<radialGradient id="' + id + '-fade" cx=".5" cy=".5" r=".6"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>' +
      '<mask id="' + id + '-m"><rect x="-200" y="-200" width="' + (W + 400) + '" height="' + (H + 400) + '" fill="url(#' + id + '-fade)"/></mask>';

    // drafting grid
    var grid = "";
    for (var g = -12; g <= widthX + 12; g++) grid += "M" + pt(P(g, -12)) + " L" + pt(P(g, depthY + 12)) + " ";
    for (var h = -12; h <= depthY + 12; h++) grid += "M" + pt(P(-12, h)) + " L" + pt(P(widthX + 12, h)) + " ";

    var base = path(polyD(quad(-0.3, -0.3, widthX + 0.3, depthY + 0.3)), "f-site site");
    var roads = path(polyD(quad(-0.3, 0, widthX + 0.3, rw)), "f-road");
    rowY.forEach(function (ry, i) { if (i % 2 === 1 && i < rows - 1) roads += path(polyD(quad(-0.3, ry + pd, colX(cols), ry + pd + rw)), "f-road"); });
    roads += path(polyD(quad(colX(cross) - crossW, 0, colX(cross), depthY)), "f-road");
    var dash = "M" + pt(P(-0.3, rw / 2)) + " L" + pt(P(widthX + 0.3, rw / 2));

    var plots = "", objs = [], hl = o.highlight, total = rows * cols;
    if (hl == null) hl = Math.min(total - 1, 2 * cols + cross + (r() > 0.5 ? 0 : -2));
    var hlQuad = null, idx = 0, built = o.house ? 0.45 : 0.3;
    for (var ri = 0; ri < rows; ri++) {
      for (var c = 0; c < cols; c++, idx++) {
        var x0 = colX(c), y0 = rowY[ri], q = quad(x0 + 0.04, y0 + 0.04, x0 + pw - 0.04, y0 + pd - 0.04);
        plots += path(polyD(q), "f-plot plot");
        if (idx === hl) { hlQuad = q; if (!o.house) continue; }
        var front = ri % 2 === 0 ? y0 + 0.25 : y0 + pd - 1.05;
        if (idx === hl || r() < built) {
          var hz = 0.45 + r() * 0.4;
          objs.push({ k: x0 + front + 1, html: house(x0 + 0.18, front, x0 + pw - 0.18, front + 0.8, hz, idx === hl) });
        } else if (r() < 0.35) {
          var tx = x0 + 0.3 + r() * 0.4, ty = y0 + 0.3 + r() * (pd - 0.6);
          objs.push({ k: tx + ty, html: isoTree(tx, ty, 0.2 + r() * 0.12) });
        }
      }
    }
    // park beside the layout
    var parkX = colX(cols) + 0.4;
    var park = path(polyD(quad(parkX, rw + 0.2, widthX, depthY - 0.2)), "f-park");
    for (var pk = 0; pk < 16; pk++) {
      var px = parkX + 0.3 + r() * (widthX - parkX - 0.6), py = rw + 0.5 + r() * (depthY - rw - 1);
      objs.push({ k: px + py, html: isoTree(px, py, 0.22 + r() * 0.16) });
    }
    // trees along the main road
    for (var rt = 0; rt < widthX; rt += 1.6) objs.push({ k: rt - 0.2, html: isoTree(rt + 0.3, -0.25, 0.18) });
    objs.sort(function (a, b) { return a.k - b.k; });

    function house(x0, y0, x1, y1, z, lit) {
      var sh = path(polyD([P(x1, y0), P(x1 + z * 0.9, y0 + z * 0.3), P(x1 + z * 0.9, y1 + z * 0.3), P(x0 + z * 0.9, y1 + z * 0.3), P(x0, y1), P(x1, y1)]), "f-shadow");
      var top = quad(x0, y0, x1, y1, z), right = [P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, z), P(x1, y0, z)], left = [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, z), P(x0, y1, z)];
      var win = "";
      for (var w = 0; w < 2; w++) {
        var wx = lerp(x0, x1, 0.22 + w * 0.42);
        win += path(polyD([P(wx, y1, z * 0.3), P(wx + 0.16, y1, z * 0.3), P(wx + 0.16, y1, z * 0.68), P(wx, y1, z * 0.68)]), "f-win" + (lit ? " lit" : ""));
      }
      var wy = lerp(y0, y1, 0.35);
      win += path(polyD([P(x1, wy, z * 0.3), P(x1, wy + 0.2, z * 0.3), P(x1, wy + 0.2, z * 0.68), P(x1, wy, z * 0.68)]), "f-win" + (lit ? " lit" : ""));
      var parapet = quad(x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05, z);
      return sh + path(polyD(left), "f-wall") + path(polyD(right), "f-wall2") + path(polyD(top), "f-roof") + path(polyD(parapet), "f-parapet") + win;
    }
    function isoTree(x, yy, rad) {
      var b = P(x, yy), c = P(x, yy, rad * 2.2), rr = rad * s;
      return '<ellipse class="f-shadow" cx="' + n1(b[0] + rr * 0.6) + '" cy="' + n1(b[1] + rr * 0.15) + '" rx="' + n1(rr * 1.1) + '" ry="' + n1(rr * 0.5) + '"/>' +
        '<path class="f-trunk" d="M' + pt(b) + " L" + pt(c) + '" />' +
        '<circle class="f-canopy" cx="' + n1(c[0]) + '" cy="' + n1(c[1]) + '" r="' + n1(rr) + '"/>' +
        '<circle class="f-canopy-lit" cx="' + n1(c[0] - rr * 0.3) + '" cy="' + n1(c[1] - rr * 0.3) + '" r="' + n1(rr * 0.5) + '"/>';
    }

    // highlighted plot: soft fill, dimensions and a label pin
    var hlx = Math.floor(hl % cols), hly = Math.floor(hl / cols);
    var hx0 = colX(hlx), hy0 = rowY[hly];
    var hq = quad(hx0, hy0, hx0 + pw, hy0 + pd);
    var hlFill = path(polyD(hq), "f-goldfill");
    var gold = lineD([hq[0], hq[1], hq[2], hq[3], hq[0]]);
    var dim = "", off = 0.32;
    var a1 = P(hx0, hy0 + pd + off), a2 = P(hx0 + pw, hy0 + pd + off);
    var b1 = P(hx0 + pw + off, hy0), b2 = P(hx0 + pw + off, hy0 + pd);
    dim += '<path class="dim" d="M' + pt(a1) + " L" + pt(a2) + " M" + pt(b1) + " L" + pt(b2) + '"/>';
    var am = [(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2], bm = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2];
    var size = (o.layout && o.layout.plotSize || "30 × 40 ft").replace(/\s*ft/, "").split("×");
    dim += '<text class="dim-t" x="' + n1(am[0] - 10) + '" y="' + n1(am[1] + 22) + '" transform="rotate(30 ' + n1(am[0] - 10) + " " + n1(am[1] + 22) + ')">' + (size[0] || "30").trim() + "′</text>";
    dim += '<text class="dim-t" x="' + n1(bm[0] + 14) + '" y="' + n1(bm[1] + 14) + '" transform="rotate(-30 ' + n1(bm[0] + 14) + " " + n1(bm[1] + 14) + ')">' + (size[1] || "40").trim() + "′</text>";
    var cen = P(hx0 + pw / 2, hy0 + pd / 2, o.house ? 1.3 : 0.1), tip = [cen[0], cen[1] - 120];
    var pin = '<g class="pin"><path class="pin-line" d="M' + pt(cen) + " L" + pt(tip) + '"/><circle class="pin-dot" cx="' + n1(cen[0]) + '" cy="' + n1(cen[1]) + '" r="5"/>' +
      '<text class="pin-t" x="' + n1(tip[0]) + '" y="' + n1(tip[1] - 14) + '" text-anchor="middle">Plot ' + String(hl + 1).padStart(2, "0") + "</text></g>";

    // compass + scale bar
    var cmp = '<g class="compass" transform="translate(' + (W - 170) + ' 300)"><circle r="34"/><path d="M0,-28 L8,6 L0,0 L-8,6 Z"/><text y="-42" text-anchor="middle">N</text></g>' +
      '<g class="scalebar" transform="translate(' + (W - 260) + ' 400)"><path d="M0,0 h180 M0,-6 v12 M60,-4 v8 M120,-4 v8 M180,-6 v12"/><text y="-14">0</text><text x="180" y="-14" text-anchor="end">30 m</text></g>';

    var vb = null;
    if (o.focus) {
      var xsF = hq.map(function (p) { return p[0]; }), ysF = hq.map(function (p) { return p[1]; });
      var fx = (Math.min.apply(null, xsF) + Math.max.apply(null, xsF)) / 2, fy = (Math.min.apply(null, ysF) + Math.max.apply(null, ysF)) / 2 - 30;
      var z = o.zoom || 2.1;
      vb = [fx - W / z / 2 + (o.focusX || 0) * W / z, fy - H / z / 2 + (o.focusY || 0) * H / z, W / z, H / z];
    }

    return {
      defs: defs,
      viewBox: vb,
      layers: [
        { depth: 0, html: '<rect class="paper" x="-400" y="-400" width="' + (W + 800) + '" height="' + (H + 800) + '"/><path class="grid" d="' + grid + '" mask="url(#' + id + '-m)"/>' + (o.annotate ? cmp : "") },
        { depth: 0.5, html: base + roads + '<path class="road-dash" d="' + dash + '"/>' + park + plots + hlFill + objs.map(function (ob) { return ob.html; }).join("") + dim },
        { depth: 0.6, html: pin }
      ],
      gold: [gold],
      goldDepth: 0.55
    };
  };

  /* ---------- public API ---------- */

  var LABELS = {
    plan: "Illustrated site plan with one plot traced in gold",
    ghats: "Illustration of the Western Ghats at dawn with a road through the fields",
    farm: "Illustration of farmland and a grove with a parcel traced in gold",
    hills: "Illustration of misty hills with terraced slopes",
    river: "Illustration of a palm-lined river in Kerala",
    coast: "Illustration of the coast at sunrise with salt pans and palms",
    plains: "Illustration of palmyra plains with wind turbines",
    highway: "Illustration of a highway with a frontage plot traced in gold"
  };

  function build(kind, o) {
    o = o || {};
    var fn = scenes[kind] || scenes.ghats;
    var id = "a" + (++uidN);
    var sc = fn(rng(o.seed || 1), id, o);
    sc.id = id;
    sc.kind = kind;
    return sc;
  }

  function goldMarkup(sc) {
    return '<g class="gold">' + sc.gold.filter(Boolean).map(function (d) {
      return '<path class="gold-halo" d="' + d + '" pathLength="1"/><path class="gold-glow" d="' + d + '" pathLength="1"/><path class="gold-core" d="' + d + '" pathLength="1"/>';
    }).join("") + '<circle class="gold-spark" r="7" cx="-99" cy="-99"/></g>';
  }

  function svgOpen(sc, o, extraClass) {
    var vb = sc.viewBox ? sc.viewBox.map(n1).join(" ") : "0 0 " + W + " " + H;
    return '<svg class="art-svg k-' + sc.kind + (extraClass ? " " + extraClass : "") + '" viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice" ' +
      (o.decorative ? 'aria-hidden="true"' : 'role="img" aria-label="' + (o.label || LABELS[sc.kind]) + '"') + ' focusable="false">';
  }

  function render(kind, o) {
    o = o || {};
    var sc = build(kind, o);
    return svgOpen(sc, o) + "<defs>" + sc.defs + "</defs>" + sc.layers.map(function (l) { return l.html; }).join("") + goldMarkup(sc) + "</svg>";
  }

  function layers(kind, o) {
    o = o || {};
    o.decorative = true;
    var sc = build(kind, o), out = [];
    sc.layers.forEach(function (l, i) {
      out.push({ depth: l.depth, svg: svgOpen(sc, o) + (i === 0 ? "<defs>" + sc.defs + "</defs>" : "") + l.html + "</svg>" });
      var next = sc.layers[i + 1];
      if (sc.goldDepth >= l.depth && (!next || sc.goldDepth < next.depth)) {
        out.push({ depth: sc.goldDepth, gold: true, svg: svgOpen(sc, o, "gold-layer") + goldMarkup(sc) + "</svg>" });
      }
    });
    return out;
  }

  window.TLP = window.TLP || {};
  window.TLP.Art = { render: render, layers: layers, kinds: Object.keys(scenes) };
})();
