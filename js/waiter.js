/* The Copper Kitchen — waiter floor system.
   Tables, order-taking and ready alerts. Adding a dish opens a kitchen
   ticket instantly; the chef's statuses flow back here live (including
   across tabs, via the storage event). Closing the bill frees the table
   and files the sale for the manager. */

'use strict';

var session = requireRole([]); // any signed-in staff
var canServe = session && (session.role === 'waiter' || session.role === 'manager');
var state = loadState();
var selectedTableId = null;

document.getElementById('waiter-title').textContent =
  session ? session.name.split(' ')[0] + "'s floor" : 'My floor';

function kitchenPill(tableId) {
  var tk = ticketFor(state, tableId);
  if (!tk || !orderLines(state, tableId).length) return '';
  var map = {
    new: ['pill-kitchen-new', 'In kitchen'],
    preparing: ['pill-kitchen-preparing', 'Preparing'],
    ready: ['pill-kitchen-ready', 'Ready!'],
    served: ['pill-kitchen-served', 'Served']
  };
  var m = map[tk.status] || map.new;
  return '<span class="pill ' + m[0] + '" style="float:none;margin-left:8px">' + m[1] + '</span>';
}

function renderTables() {
  var grid = document.getElementById('tables-grid');
  grid.innerHTML = state.tables.map(function (t) {
    var has = tableStatus(state, t.id) === 'occupied';
    return '<button class="table-card' + (has ? ' is-occupied' : '') +
      (selectedTableId === t.id ? ' is-selected' : '') + '" data-table="' + t.id + '">' +
      '<span class="pill ' + (has ? 'pill-busy' : 'pill-free') + '">' + (has ? 'Occupied' : 'Free') + '</span>' +
      '<span class="tname">' + t.name + '</span>' + kitchenPill(t.id) +
      '<span class="tseats">' + t.seats + ' seats</span>' +
      (has ? '<span class="ttotal">' + formatRs(orderTotal(state, t.id)) + ' running</span>' : '') +
      '</button>';
  }).join('');
}

function renderReadyAlert() {
  var ready = state.tables.filter(function (t) {
    var tk = ticketFor(state, t.id);
    return tk && tk.status === 'ready' && orderLines(state, t.id).length;
  });
  var box = document.getElementById('ready-alert');
  if (!ready.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = '<strong style="color:var(--green)">Ready to serve:</strong> ' +
    ready.map(function (t) { return t.name; }).join(' · ') +
    ' — the food is on the pass.';
}

function renderOrder() {
  var panel = document.getElementById('order-panel');
  if (!selectedTableId) {
    panel.innerHTML = '<h2>No table selected</h2>' +
      '<p class="empty">Choose one of your tables to take its order. Dishes you add go straight to the kitchen display.</p>';
    return;
  }
  var table = tableById(state, selectedTableId);
  var raw = orderLines(state, selectedTableId);
  var lines = pricedLines(state, selectedTableId);
  var discountPct = state.discounts[selectedTableId] || 0;
  var bill = computeBill(lines, discountPct);
  var available = state.menu.filter(function (d) { return d.available; });
  var tk = ticketFor(state, selectedTableId);

  var linesHtml = raw.length ? raw.map(function (l) {
    var item = menuItem(state, l.itemId);
    var name = item ? item.name : '(removed dish)';
    var price = item ? item.price : 0;
    return '<div class="order-line"><div><span class="nm">' + name + '</span><br>' +
      '<span class="pr">' + formatRs(price) + ' each</span></div>' +
      '<span class="qty-ctl"><button data-dec="' + l.itemId + '" aria-label="One less" ' + (canServe ? '' : 'disabled') + '>−</button>' +
      '<span class="q">' + l.qty + '</span>' +
      '<button data-inc="' + l.itemId + '" aria-label="One more" ' + (canServe ? '' : 'disabled') + '>+</button></span>' +
      '<span class="line-total">' + formatRs(price * l.qty) + '</span></div>';
  }).join('') : '<p class="empty">No dishes yet — add the first one below and it lands in the kitchen.</p>';

  var kitchenRow = '';
  if (tk && raw.length) {
    var label = { new: 'In the kitchen queue', preparing: 'The kitchen is preparing this', ready: 'READY — collect from the pass', served: 'Served to the table' }[tk.status];
    kitchenRow = '<div class="kitchen-row"><span>Kitchen:</span>' + kitchenPill(selectedTableId) +
      '<span>' + label + '</span>' +
      (tk.status === 'ready' && canServe ? '<button class="btn btn-green btn-sm" id="mark-served">Mark served</button>' : '') +
      '</div>';
  }

  panel.innerHTML =
    '<h2>' + table.name + ' <span style="color:var(--ink-soft);font-size:14px">· ' + table.seats + ' seats</span></h2>' +
    kitchenRow + linesHtml +
    (canServe ?
      '<div class="add-dish-bar"><select id="dish-picker">' +
      available.map(function (d) {
        return '<option value="' + d.id + '">' + d.name + ' — ' + formatRs(d.price) + '</option>';
      }).join('') +
      '</select><button class="btn btn-primary" id="add-dish">Add dish</button></div>' +
      '<div class="discount-row"><label for="discount" style="margin:0">Discount %</label>' +
      '<input type="number" id="discount" min="0" max="100" value="' + discountPct + '">' +
      '<span style="color:var(--ink-soft);font-weight:400">applied before the 5% tax</span></div>'
      : '<p class="empty">View only — waiters and the manager take orders.</p>') +
    '<div class="bill-box">' +
    '<div class="bill-row2"><span>Subtotal</span><span>' + formatRs(bill.subtotal) + '</span></div>' +
    '<div class="bill-row2"><span>Discount</span><span>− ' + formatRs(bill.discount) + '</span></div>' +
    '<div class="bill-row2"><span>Tax (5%)</span><span>' + formatRs(bill.tax) + '</span></div>' +
    '<div class="bill-row2 grand"><span>Total</span><span>' + formatRs(bill.total) + '</span></div></div>' +
    (canServe ?
      '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">' +
      '<button class="btn btn-green" id="close-bill" ' + (raw.length ? '' : 'disabled style="opacity:.5"') + '>Close bill &amp; free table</button>' +
      '<button class="btn btn-danger" id="clear-order">Clear order</button></div>' : '');
}

function renderAll() { renderTables(); renderReadyAlert(); renderOrder(); }

function touchTicket() {
  if (orderLines(state, selectedTableId).length) {
    openTicket(state, selectedTableId, session ? session.name : '');
  }
}

document.getElementById('tables-grid').addEventListener('click', function (e) {
  var card = e.target.closest('[data-table]');
  if (!card) return;
  selectedTableId = card.dataset.table;
  renderAll();
});

document.getElementById('order-panel').addEventListener('click', function (e) {
  if (!selectedTableId || !canServe) return;
  var inc = e.target.closest('[data-inc]');
  var dec = e.target.closest('[data-dec]');
  if (inc || dec) {
    var id = (inc || dec).dataset.inc || (inc || dec).dataset.dec;
    var lines = orderLines(state, selectedTableId).slice();
    var line = lines.find(function (l) { return l.itemId === id; });
    if (line) {
      line.qty += inc ? 1 : -1;
      if (line.qty <= 0) lines = lines.filter(function (l) { return l.itemId !== id; });
      state.orders[selectedTableId] = lines;
      if (!lines.length) clearTicket(state, selectedTableId); else touchTicket();
      saveState(state); renderAll();
    }
    return;
  }
  if (e.target.id === 'add-dish') {
    var dishId = document.getElementById('dish-picker').value;
    var dish = menuItem(state, dishId);
    if (!dish) return;
    var lines2 = orderLines(state, selectedTableId).slice();
    var existing = lines2.find(function (l) { return l.itemId === dishId; });
    if (existing) existing.qty += 1; else lines2.push({ itemId: dishId, qty: 1 });
    state.orders[selectedTableId] = lines2;
    touchTicket();
    saveState(state); renderAll();
    toast(dish.name + ' added — sent to the kitchen');
  }
  if (e.target.id === 'mark-served') {
    setTicketStatus(state, selectedTableId, 'served');
    saveState(state); renderAll();
    toast(tableById(state, selectedTableId).name + ' served');
  }
  if (e.target.id === 'clear-order') {
    if (!orderLines(state, selectedTableId).length) return;
    if (confirm('Clear this order without billing?')) {
      state.orders[selectedTableId] = [];
      state.discounts[selectedTableId] = 0;
      clearTicket(state, selectedTableId);
      saveState(state); renderAll();
      toast('Order cleared');
    }
  }
  if (e.target.id === 'close-bill') {
    var raw = orderLines(state, selectedTableId);
    if (!raw.length) return;
    var lines3 = pricedLines(state, selectedTableId);
    var bill = computeBill(lines3, state.discounts[selectedTableId] || 0);
    var table = tableById(state, selectedTableId);
    state.bills.push({
      id: state.bills.length + 1, tableName: table.name,
      lines: lines3, subtotal: bill.subtotal, discountPct: bill.discountPct,
      discount: bill.discount, tax: bill.tax, total: bill.total,
      itemCount: bill.itemCount, closedAt: new Date().toISOString()
    });
    state.orders[selectedTableId] = [];
    state.discounts[selectedTableId] = 0;
    clearTicket(state, selectedTableId);
    saveState(state); renderAll();
    toast('Bill closed — ' + formatRs(bill.total) + ' · ' + table.name + ' is free');
  }
});

document.getElementById('order-panel').addEventListener('change', function (e) {
  if (e.target.id === 'discount' && selectedTableId && canServe) {
    state.discounts[selectedTableId] = Math.min(100, Math.max(0, Number(e.target.value) || 0));
    saveState(state); renderAll();
  }
});

/* Cross-tab sync: the chef marking a dish ready lights this floor up */
window.addEventListener('storage', function (e) {
  if (e.key === STORE_KEY) { state = loadState(); renderAll(); }
});

renderAll();
