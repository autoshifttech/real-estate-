/*
 * Social-media captions -> property details.
 * The admin pastes the same caption it posts on Instagram / Facebook (English, Tamil or both).
 * parse() reads the title, place, region, type, price, size, approval and road from it;
 * render() turns the caption into safe HTML for the property page.
 */
(function (root) {
  "use strict";

  var EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  var BULLET = /^\s*(?:[*•▪◦●\-–]\s+|[✅✔☑✓]️?\s*)/;
  var NUM = "(\\d[\\d,]*(?:\\.\\d+)?)";

  function noEmoji(s) { return String(s || "").replace(EMOJI, "").replace(/\s+/g, " ").trim(); }
  function clip(s, max) {
    s = String(s || "");
    if (s.length <= max) return s;
    var cut = s.slice(0, max), sp = cut.lastIndexOf(" ");
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–-]+$/, "") + "…";
  }
  function n(x) { return parseFloat(String(x).replace(/,/g, "")); }

  /* Trim what is not part of the caption: Instagram comments pasted along with it, extra blank lines. */
  function clean(text) {
    var lines = String(text || "").replace(/\r\n?/g, "\n").split("\n"), out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/\s+$/, "");
      if (/^\s*\d+\s*(?:s|m|h|d|w|min|mins|hr|hrs)\s*$/i.test(l) || /instagram\.com\/p\//i.test(l)) break;
      out.push(l);
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 5000);
  }

  var REGION_WORDS = {
    tenkasi: ["tenkasi", "தென்காசி", "courtallam", "kutralam", "குற்றாலம்", "sengottai", "shencottah", "செங்கோட்டை", "kadayanallur", "கடையநல்லூர்"],
    tirunelveli: ["tirunelveli", "nellai", "திருநெல்வேலி", "நெல்லை", "ambasamudram", "அம்பாசமுத்திரம்", "alangulam", "ஆலங்குளம்"],
    virudhunagar: ["virudhunagar", "விருதுநகர்", "sivakasi", "சிவகாசி", "rajapalayam", "ராஜபாளையம்", "srivilliputhur", "ஸ்ரீவில்லிபுத்தூர்"],
    thoothukudi: ["thoothukudi", "tuticorin", "தூத்துக்குடி", "tiruchendur", "திருச்செந்தூர்", "kovilpatti", "கோவில்பட்டி"],
    kodaikanal: ["kodaikanal", "kodai", "கொடைக்கானல்"],
    ooty: ["ooty", "udhagamandalam", "ஊட்டி", "nilgiris", "நீலகிரி", "coonoor", "குன்னூர்", "kotagiri", "கோத்தகிரி"],
    kerala: ["kerala", "கேரள", "aryankavu", "ஆரியங்காவு", "punalur", "புனலூர்", "thenmala", "தென்மலை", "kollam", "கொல்லம்", "munnar", "மூணார்"]
  };
  function findRegion(texts, regions) {
    for (var t = 0; t < texts.length; t++) {
      var hay = String(texts[t] || "").toLowerCase(), best = null, at = Infinity;
      if (!hay) continue;
      regions.forEach(function (r) {
        var words = (REGION_WORDS[r.id] || []).concat([r.name, r.ta, r.id]);
        words.forEach(function (w) {
          if (!w) return;
          var i = hay.indexOf(String(w).toLowerCase());
          if (i >= 0 && i < at) { at = i; best = r.id; }
        });
      });
      if (best) return best;
    }
    return null;
  }

  function findType(title, body, typeIds) {
    var has = function (id) { return typeIds.indexOf(id) >= 0 ? id : null; };
    var t = title.toLowerCase();
    if (/\b(house|home|villa|bungalow|cottage)\b|வீடு|பங்களா/.test(t)) return has("house");
    if (/commercial|\bshop|godown|warehouse|கமர்ஷியல்|வணிக/.test(t)) return has("commercial");
    if (/estate|\btea\b|coffee|எஸ்டேட்|தேயிலை|காபி/.test(t)) return has("estate");
    if (/farm|agri|garden|plantation|grove|தோட்ட|விவசாய|பண்ணை/.test(t)) return has("farm");
    if (/plot|layout|மனை|சைட்/.test(t)) return has("plot");
    if (/\bacres?\b|ஏக்கர்/.test(body.toLowerCase())) return has("farm");
    return has("plot");
  }

  var UNIT = "(cents?|acres?|ac\\b|sq\\.?\\s?ft|sqft|square\\s+feet|grounds?|சென்ட்|சென்டு|ஏக்கர்|சதுர\\s?அடி|சதுரடி)";
  function unitName(u, val) {
    u = u.toLowerCase();
    if (/^(cent|சென்ட்|சென்டு)/.test(u)) return val === 1 ? "cent" : "cents";
    if (/^(acre|ac|ஏக்கர்)/.test(u)) return val === 1 ? "acre" : "acres";
    if (/^ground/.test(u)) return val === 1 ? "ground" : "grounds";
    return "sq.ft";
  }
  function areaIn(line) {
    var re = new RegExp(NUM + "\\s*" + UNIT, "gi"), m, found = [];
    while ((m = re.exec(line))) found.push({ v: n(m[1]), raw: m[1], u: unitName(m[2], n(m[1])) });
    if (!found.length) return "";
    var a = found[0];
    var b = found[1] && found[1].u.replace(/s$/, "") === a.u.replace(/s$/, "") && /\bto\b|–|-|முதல்|வரை/i.test(line) ? found[1] : null;
    if (b) return a.raw + " – " + b.raw + " " + unitName(b.u, 2);
    return a.raw + " " + a.u + (/onwards|\bfrom\b|starting|முதல்/i.test(line) ? " onwards" : "");
  }
  function findArea(lines) {
    var labelled = /land area|total land|total area|plot size|extent|\barea\b|பரப்ப|மொத்தம்|நிலம்/i, land = /cent|acre|ground|சென்ட்|ஏக்கர்/i;
    var i, a;
    for (i = 0; i < lines.length; i++) if (labelled.test(lines[i]) && land.test(lines[i]) && (a = areaIn(lines[i]))) return a;
    for (i = 0; i < lines.length; i++) if (land.test(lines[i]) && !/₹|price|விலை/i.test(lines[i]) && (a = areaIn(lines[i]))) return a;
    for (i = 0; i < lines.length; i++) if (land.test(lines[i]) && (a = areaIn(lines[i]))) return a;
    for (i = 0; i < lines.length; i++) if ((a = areaIn(lines[i]))) return a;
    return "";
  }

  var MULT = [[/^(lakhs?|lacs?|l|லட்சம்|லட்சங்கள்|லட்ச)$/i, 1e5], [/^(crores?|cr|கோடி)$/i, 1e7]];
  var SCALE = "\\s*(lakhs?|lacs?|l\\b|லட்சம்|லட்சங்கள்|லட்ச|crores?|cr\\b|கோடி)";
  /* "₹1,80,000", "Rs. 77 lakhs" or, after a price word, "77 lakhs" (a bare number is not a price) */
  function amountIn(line, rupeeOnly) {
    var m = new RegExp("(?:₹|rs\\.?|inr)\\s*" + NUM + "(?:" + SCALE + ")?", "i").exec(line);
    if (!m && !rupeeOnly) m = new RegExp(NUM + SCALE, "i").exec(line);
    if (!m) return null;
    var k = 1;
    MULT.forEach(function (x) { if (m[2] && x[0].test(m[2])) k = x[1]; });
    var v = Math.round(n(m[1]) * k);
    return v > 0 ? v : null;
  }
  function priceNote(line) {
    if (/per\s*cent|\/\s*cent|ஒரு\s*சென்ட்|சென்ட்\s*(?:விலை|க்கு)|சென்டுக்கு|சென்டிற்கு/i.test(line)) return "per cent";
    if (/per\s*acre|\/\s*acre|ஒரு\s*ஏக்கர்|ஏக்கருக்கு|ஏக்கர்\s*விலை/i.test(line)) return "per acre";
    if (/per\s*sq|\/\s*sq|சதுர\s?அடிக்கு|சதுரடிக்கு/i.test(line)) return "per sq.ft";
    if (/total|மொத்த/i.test(line)) return "total";
    if (/onwards|starting|\bfrom\b|முதல்/i.test(line)) return "onwards";
    return "total";
  }
  function findPrice(lines) {
    var tries = [
      function (l) { return /total\s*price|total\s*cost|மொத்த\s*விலை/i.test(l) && amountIn(l, false); },
      function (l) { return /price|rate|cost|விலை|மதிப்பு/i.test(l) && amountIn(l, false); },
      function (l) { return amountIn(l, true); }
    ];
    for (var t = 0; t < tries.length; t++) {
      for (var i = 0; i < lines.length; i++) {
        var v = tries[t](lines[i]);
        if (v) return { price: v, priceNote: priceNote(lines[i]) };
      }
    }
    return { price: null, priceNote: "total" };
  }

  function findLocation(lines) {
    for (var i = 0; i < lines.length; i++) {
      var m = /(?:location|address|place|இடம்|முகவரி)\s*[:：]\s*(.+)$/i.exec(noEmoji(lines[i]));
      if (!m) continue;
      var parts = m[1].split(/\s+[–—-]\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
      var keep = parts.filter(function (s) { return !/^near\b|\bnear\b|அருகே|அருகில்|அருகிலுள்ள|அருகாமை/i.test(s); });
      return clip((keep.length ? keep : parts).join(", ").replace(/[!.]+$/, ""), 120);
    }
    return "";
  }

  function findApproval(text) {
    var out = [];
    if (/\bdtcp\b/i.test(text)) out.push("DTCP approved");
    if (/\brera\b/i.test(text)) out.push("RERA registered");
    if (/\bpatta\b|பட்டா/i.test(text)) out.push("Patta land");
    if (/clear title|clean title|வில்லங்கம்\s*இல்லா/i.test(text)) out.push("Clear title");
    if (/direct\s*owner|owner\s*direct|நேரடி\s*(?:உரிமையாளர்|ஓனர்)|no\s*brokers?|தரகர்கள்\s*இன்றி/i.test(text)) out.push("Direct owner");
    return out.join(" · ");
  }
  function findRoad(text) {
    var out = [], m = new RegExp(NUM + "\\s*(?:ft|feet|அடி)\\s*(?:wide\\s*)?(?:road|ரோடு|ரோட்|சாலை)", "i").exec(text);
    if (m) out.push(m[1] + " ft road");
    if (/highway|ஹைவே|நெடுஞ்சாலை|\bnh\s?\d/i.test(text)) out.push("On highway");
    if (/tar\s*road|black\s*top|தார்\s*(?:சாலை|ரோடு|ரோட்)/i.test(text)) out.push("Tar road");
    return out.slice(0, 2).join(" · ");
  }

  function parse(text, regions, types) {
    var caption = clean(text);
    var lines = caption.split("\n").filter(function (l) { return noEmoji(l); });
    var title = clip(noEmoji(lines[0] || "").replace(/^[\s:–—-]+|[\s!:–—-]+$/g, ""), 80);
    var location = findLocation(lines);
    var typeIds = (types || []).map(function (t) { return t.id; });
    regions = regions || [];
    var region = findRegion([location, title, caption], regions) || (regions[0] && regions[0].id) || "";
    var regionName = (regions.filter(function (r) { return r.id === region; })[0] || {}).name || "";
    if (!location) {
      var near = /([^\s,!–-]+)\s+(?:அருகே|அருகில்)/.exec(title) || /\bnear\s+([A-Z][\w]+)/.exec(title);
      location = near && near[1].toLowerCase() !== regionName.toLowerCase() ? near[1] + ", " + regionName : regionName;
    }
    var pr = findPrice(lines);
    var summary = "", highlights = [];
    lines.slice(1).forEach(function (l) {
      var plain = noEmoji(l);
      if (BULLET.test(l)) { if (highlights.length < 12) highlights.push(clip(noEmoji(l.replace(BULLET, "")).replace(/[.]$/, ""), 140)); return; }
      if (!summary && plain.length >= 40 && !/[:：]$/.test(plain) && !/(?:location|இடம்)\s*[:：]/i.test(plain)) summary = plain;
    });
    return {
      caption: caption,
      title: title,
      location: location,
      region: region,
      type: findType(title, caption, typeIds) || typeIds[0] || "",
      price: pr.price,
      priceNote: pr.priceNote,
      area: findArea(lines),
      approval: findApproval(caption),
      road: findRoad(caption),
      summary: clip(summary || title, 220),
      highlights: highlights.filter(Boolean)
    };
  }

  /* ---------- caption -> HTML ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function inline(s) {
    return esc(s).replace(/(\+?\d[\d\s-]{8,}\d)/g, function (m) {
      var d = m.replace(/[^\d+]/g, "");
      return d.replace(/\D/g, "").length >= 10 && d.replace(/\D/g, "").length <= 13 ? '<a href="tel:' + d + '">' + m + "</a>" : m;
    });
  }
  /* o.skipTitle drops the first line when the page already shows it as the heading */
  function render(text, o) {
    var lines = clean(text).split("\n"), html = "", list = null, para = [];
    if (o && o.skipTitle) lines = lines.slice(lines.findIndex(function (l) { return noEmoji(l); }) + 1);
    function flushPara() { if (para.length) { html += "<p>" + para.join("<br>") + "</p>"; para = []; } }
    function flushList() { if (list) { html += "<ul>" + list.join("") + "</ul>"; list = null; } }
    lines.forEach(function (l) {
      if (!l.trim()) { flushPara(); flushList(); return; }
      if (BULLET.test(l)) {
        flushPara();
        var mark = /^\s*[✅✔☑✓]/.test(l) ? "" : ' class="dot"';
        (list = list || []).push("<li" + mark + ">" + inline(l.replace(BULLET, "")) + "</li>");
        return;
      }
      flushList();
      if (/[:：]\s*$/.test(noEmoji(l)) && noEmoji(l).length < 80) { flushPara(); html += '<p class="cap-head">' + inline(l.trim()) + "</p>"; return; }
      para.push(inline(l.trim()));
    });
    flushPara(); flushList();
    return html;
  }

  var api = { parse: parse, render: render, clean: clean, noEmoji: noEmoji };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TLP_CAPTION = api;
})(typeof window !== "undefined" ? window : this);
