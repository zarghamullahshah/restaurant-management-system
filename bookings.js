/* The Copper Kitchen — manager bookings inbox.
   Guests create bookings on booking.html; both sides share the store, so
   confirming, seating or cancelling here updates the guest's live status. */

'use strict';

var state = loadState();
var filter = 'all';
var seatingBookingId = null;

var FILTERS = [
  { key: 'all', label: 'All' }, { key: 'pending', label: 'Waiting' },
  { key: 'confirmed', label: 'Confirmed' }, { key: 'seated', label: 'Seated' },
  { key: 'cancelled', label: 'Cancelled' }
];

function prettyDate(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderChips() {
  document.getElementById('filter-chips').innerHTML = FILTERS.map(function (f) {
    var n = f.key === 'all' ? state.bookings.length
      : state.bookings.filter(function (b) { return b.status === f.key; }).length;
    return '<button class="chip' + (filter === f.key ? ' is-on' : '') +
      '" data-filter="' + f.key + '">' + f.label + ' (' + n + ')</button>';
  }).join('');
}

function actionsFor(b) {
  var btns = '';
  if (b.status === 'pending') {
    btns += '<button class="btn btn-green btn-sm" data-act="confirm" data-id="' + b.id + '">Confirm</button>';
  }
  if (b.status === 'pending' || b.status === 'confirmed') {
    btns += '<button class="btn btn-primary btn-sm" data-act="seat" data-id="' + b.id + '">Seat at a table</button>';
    btns += '<button class="btn btn-danger btn-sm" data-act="cancel" data-id="' + b.id + '">Cancel</button>';
  }
  if (b.status === 'seated') {
    btns += '<span class="empty" style="padding:0">Seated — run their order from Tables &amp; Orders.</span>';
  }
  return btns;
}

function renderList() {
  var list = state.bookings
    .filter(function (b) { return filter === 'all' || b.status === filter; })
    .sort(function (a, b) {
      var ka = a.date + '|' + a.time, kb = b.date + '|' + b.time;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  var box = document.getElementById('booking-list');
  if (!list.length) {
    box.innerHTML = '<div class="card"><p class="empty">No ' +
      (filter === 'all' ? '' : filter + ' ') +
      'bookings. When a guest books from the website, the request appears here instantly.</p></div>';
    return;
  }
  box.innerHTML = list.map(function (b, i) {
    var tableNote = b.tableId
      ? ' · Table: ' + (tableById(state, b.tableId) || {}).name
      : '';
    return '<article class="booking-card" style="animation-delay:' + (i * 60) + 'ms"><div>' +
      '<h3>' + b.name + ' <span class="ref">' + b.ref + '</span> ' +
      '<span class="status status-' + b.status + '">' + b.status + '</span></h3>' +
      '<p class="booking-meta">' + b.guests + ' guests · ' + b.area + tableNote + '<br>' +
      prettyDate(b.date) + ' at ' + b.time + ' · ' + b.phone +
      (b.notes ? '<br>Note: ' + b.notes : '') + '</p></div>' +
      '<div class="booking-actions">' + actionsFor(b) + '</div></article>';
  }).join('');
}

function renderAll() { renderChips(); renderList(); }

document.getElementById('filter-chips').addEventListener('click', function (e) {
  var chip = e.target.closest('[data-filter]');
  if (!chip) return;
  filter = chip.dataset.filter;
  renderAll();
});

document.getElementById('booking-list').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-act]');
  if (!btn) return;
  var b = state.bookings.find(function (x) { return x.id === btn.dataset.id; });
  if (!b) return;
  if (btn.dataset.act === 'confirm') {
    b.status = 'confirmed'; saveState(state); renderAll();
    toast(b.ref + ' confirmed — the guest sees it live');
  }
  if (btn.dataset.act === 'cancel') {
    b.status = 'cancelled'; b.tableId = null; saveState(state); renderAll();
    toast(b.ref + ' cancelled');
  }
  if (btn.dataset.act === 'seat') {
    seatingBookingId = b.id;
    var free = state.tables.filter(function (t) {
      return tableStatus(state, t.id) === 'free' && t.seats >= Math.min(b.guests, 12);
    });
    var anyFree = state.tables.filter(function (t) { return tableStatus(state, t.id) === 'free'; });
    var options = (free.length ? free : anyFree);
    document.getElementById('seat-table').innerHTML = options.map(function (t) {
      return '<option value="' + t.id + '">' + t.name + ' — ' + t.seats + ' seats</option>';
    }).join('');
    document.getElementById('seat-note').textContent = options.length
      ? 'Party of ' + b.guests + '. Seating marks the booking as seated; open the order from Tables & Orders.'
      : 'No free tables right now — close a bill first, then seat this party.';
    document.getElementById('seat-confirm').disabled = !options.length;
    document.getElementById('seat-modal').classList.add('open');
  }
});

document.getElementById('seat-cancel').addEventListener('click', function () {
  document.getElementById('seat-modal').classList.remove('open');
});
document.getElementById('seat-confirm').addEventListener('click', function () {
  var b = state.bookings.find(function (x) { return x.id === seatingBookingId; });
  if (!b) return;
  b.tableId = document.getElementById('seat-table').value;
  b.status = 'seated';
  saveState(state);
  document.getElementById('seat-modal').classList.remove('open');
  renderAll();
  toast(b.ref + ' seated — open their order from Tables & Orders');
});

renderAll();
