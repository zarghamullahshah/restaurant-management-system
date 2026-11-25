/* The Copper Kitchen — kitchen display system (chef).
   Live tickets from every table: new -> preparing -> ready. Waiters see
   the same statuses on the floor; when food is served the ticket rests
   until the bill closes. Syncs across tabs via the storage event. */

'use strict';

var session = requireRole([]); // any signed-in staff may view the pass
var canCook = session && (session.role === 'chef' || session.role === 'manager');
var state = loadState();

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function ageText(iso) {
  if (!iso) return '—';
  var mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min';
  return mins + ' mins';
}

function ticketsByStatus() {
  var groups = { new: [], preparing: [], ready: [] };
  state.tables.forEach(function (t) {
    if (!orderLines(state, t.id).length) return;
    var ticket = ticketFor(state, t.id) || { status: 'new', placedAt: null, byName: '' };
    if (ticket.status === 'served') return;
    groups[ticket.status === 'preparing' ? 'preparing' : ticket.status === 'ready' ? 'ready' : 'new']
      .push({ table: t, ticket: ticket });
  });
  Object.keys(groups).forEach(function (k) {
    groups[k].sort(function (a, b) {
      return new Date(a.ticket.placedAt || 0) - new Date(b.ticket.placedAt || 0);
    });
  });
  return groups;
}

function ticketCard(entry) {
  var t = entry.table, ticket = entry.ticket;
  var lines = pricedLines(state, t.id).map(function (l) {
    return '<li><span>' + esc(l.name) + '</span><span class="q">× ' + l.qty + '</span></li>';
  }).join('');
  var late = ticket.placedAt && ticket.status !== 'ready' &&
    (Date.now() - new Date(ticket.placedAt).getTime() > 15 * 60000);
  var action = '';
  if (canCook) {
    if (ticket.status === 'new') action = '<button class="btn btn-primary" data-act="preparing" data-table="' + t.id + '">Start preparing</button>';
    else if (ticket.status === 'preparing') action = '<button class="btn btn-green" data-act="ready" data-table="' + t.id + '">Mark ready</button>';
    else action = '<p class="empty" style="padding:0">Ready — waiting for the waiter to serve.</p>';
  } else {
    action = '<p class="empty" style="padding:0">View only — the chef runs the pass.</p>';
  }
  return '<article class="ticket is-' + ticket.status + '">' +
    '<div class="ticket-head"><span class="tt">' + esc(t.name) + '</span>' +
    '<span class="age' + (late ? ' late' : '') + '">' + ageText(ticket.placedAt) + (late ? ' · running late' : '') + '</span></div>' +
    '<ul>' + lines + '</ul>' +
    (ticket.byName ? '<p class="by">Order taken by ' + esc(ticket.byName) + '</p>' : '') +
    action + '</article>';
}

function render() {
  var groups = ticketsByStatus();
  var served = state.tables.filter(function (t) {
    var tk = ticketFor(state, t.id);
    return tk && tk.status === 'served' && orderLines(state, t.id).length;
  }).length;
  document.getElementById('kt-served').textContent =
    served ? served + (served === 1 ? ' table' : ' tables') + ' served — waiting on bills' : '';
  document.getElementById('kt-note').textContent = canCook
    ? 'Tickets appear the moment a waiter adds a dish. Work left to right: new, preparing, ready.'
    : 'You are signed in as ' + session.name + ' (' + ROLES[session.role].label + ') — view only. The chef moves tickets along.';
  var cols = [
    ['new', 'New tickets', groups.new],
    ['preparing', 'Preparing', groups.preparing],
    ['ready', 'Ready to serve', groups.ready]
  ];
  document.getElementById('kds-board').innerHTML = cols.map(function (c) {
    return '<section class="kds-col kds-col-' + (c[0] === 'new' ? 'new' : c[0] === 'preparing' ? 'prep' : 'ready') + '">' +
      '<h2>' + c[1] + ' <span class="cnt">' + c[2].length + '</span></h2>' +
      (c[2].length ? c[2].map(ticketCard).join('') : '<div class="kds-empty">Nothing here.<br>All clear.</div>') +
      '</section>';
  }).join('');
}

document.getElementById('kds-board').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-act]');
  if (!btn || !canCook) return;
  var tableId = btn.dataset.table;
  openTicket(state, tableId, ''); // creates a ticket for legacy orders
  setTicketStatus(state, tableId, btn.dataset.act);
  saveState(state);
  render();
  var t = tableById(state, tableId);
  toast(t.name + (btn.dataset.act === 'ready' ? ' is READY to serve' : ' — now preparing'));
});

/* Live clock */
function tickClock() {
  var d = new Date();
  document.getElementById('kt-clock').textContent =
    d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
}
tickClock();
setInterval(tickClock, 1000);

/* Cross-tab sync: a waiter's new order appears without a refresh */
window.addEventListener('storage', function (e) {
  if (e.key === STORE_KEY) { state = loadState(); render(); }
});
setInterval(function () { render(); }, 20000); // keep ages honest

render();
