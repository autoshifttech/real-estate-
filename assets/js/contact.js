/*
 * Contact page: WhatsApp buttons (buy / sell) and the office map.
 * contact.html?tab=sell puts "sell" first.
 */
(function () {
  "use strict";

  var TLP = window.TLP, U = TLP.util, CFG = window.TLP_CONFIG;
  var qs = U.qs, esc = U.esc;

  if (new URLSearchParams(window.location.search).get("tab") === "sell") {
    var buy = qs('#contact-wa [data-intent="buy"]'), sell = qs('#contact-wa [data-intent="sell"]');
    if (buy && sell) {
      buy.parentNode.insertBefore(sell, buy);
      sell.classList.remove("wa-btn--alt"); buy.classList.add("wa-btn--alt");
    }
  }

  var map = qs("#contact-map");
  if (map) map.innerHTML = '<iframe title="Map of ' + esc(CFG.address) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + encodeURIComponent(CFG.mapQuery || CFG.address) + '&z=12&output=embed"></iframe>';
})();
