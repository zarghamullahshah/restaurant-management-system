/* The Copper Kitchen — shared manager helpers: toast + bookings badge.
   Loaded by every manager page after store.js. */

'use strict';

function toast(msg) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
}

(function bookingBadge() {
  var badge = document.querySelector('[data-booking-badge]');
  if (!badge) return;
  try {
    var s = loadState();
    var pending = s.bookings.filter(function (b) { return b.status === 'pending'; }).length;
    if (pending > 0) { badge.textContent = pending; badge.hidden = false; }
  } catch (e) { /* badge is decorative */ }
})();
