/* The Copper Kitchen — shared back-of-house helpers.
   Loaded by every staff page after store.js + auth.js. Enforces the
   page's session requirement (body[data-requires]), renders the staff
   identity chip into #staff-slot, provides toast(), and keeps the
   pending-bookings nav badge current. */

'use strict';

/* Session guard: data-requires="manager" pages are manager-only;
   data-requires="staff" pages accept any signed-in role. */
(function guard() {
  var need = document.body && document.body.dataset ? document.body.dataset.requires : null;
  if (!need || typeof requireRole !== 'function') return;
  if (need === 'manager') requireRole(['manager']);
  else requireRole([]);
})();

(function sessionChip() {
  var slot = document.getElementById('staff-slot');
  if (!slot || typeof getSession !== 'function') return;
  var s = getSession();
  if (s) wireStaffChip(s, slot);
})();

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
