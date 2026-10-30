/*
 * Photos and videos added in the admin panel while the site runs without a database are kept
 * in this browser's IndexedDB (localStorage is far too small for video). Content refers to them
 * as "local:<id>"; elements carrying data-local="local:<id>" get their src filled in here.
 */
(function () {
  "use strict";

  var DB = "tlp-media", STORE = "files", urls = {}, dbp = null;
  function db() {
    if (!dbp) dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("This browser cannot store files"));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error("Storage is not available")); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE, mode), req = fn(t.objectStore(STORE));
        t.oncomplete = function () { resolve(req && req.result); };
        t.onerror = t.onabort = function () {
          var e = t.error || (req && req.error);
          reject(e && e.name === "QuotaExceededError" ? new Error("Storage is full. Remove some photos or videos and try again.") : e || new Error("Could not save the file"));
        };
      });
    });
  }

  var M = {
    isLocal: function (p) { return /^local:/.test(String(p || "")); },
    put: function (blob) {
      var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      return tx("readwrite", function (s) { return s.put(blob, id); }).then(function () { return "local:" + id; });
    },
    get: function (path) { return tx("readonly", function (s) { return s.get(String(path).slice(6)); }); },
    url: function (path) {
      if (urls[path]) return Promise.resolve(urls[path]);
      return M.get(path).then(function (blob) { return blob ? (urls[path] = URL.createObjectURL(blob)) : null; });
    },
    remember: function (path, blob) { urls[path] = URL.createObjectURL(blob); return urls[path]; },
    clear: function () { return tx("readwrite", function (s) { return s.clear(); }).catch(function () {}); },
    hydrate: function (root) {
      var els = (root || document).querySelectorAll ? (root || document).querySelectorAll("[data-local]") : [];
      Array.prototype.forEach.call(els, function (el) {
        var p = el.getAttribute("data-local");
        el.removeAttribute("data-local");
        M.url(p).then(function (u) { if (u) el.src = u; }).catch(function () {});
      });
    }
  };
  window.TLP_MEDIA = M;

  function watch() {
    M.hydrate(document);
    if (!window.MutationObserver) return;
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list[i].addedNodes.length; j++) {
          var n = list[i].addedNodes[j];
          if (n.nodeType !== 1) continue;
          if (n.hasAttribute("data-local")) M.hydrate(n.parentNode);
          else if (n.querySelector("[data-local]")) M.hydrate(n);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch); else watch();
})();
