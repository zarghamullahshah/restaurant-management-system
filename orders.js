/* The Copper Kitchen — tables & orders page (manager).
   Pick a table, build its order from the live menu, discount before tax,
   close the bill into sales history and free the table. */

'use strict';

var state = loadState();
var selectedTableId = null;

function renderTables() {
  var grid = document.getElementById('tables-grid');
  grid.innerHTML = state.tables.map(function (t) {
    var has = tableStatus(state, t.id) === 'occupied';
    return '<button class="table-card' + (has ? ' is-occupied' : '') +
      (selectedTableId === t.id ? ' is-selected' : '') + '" data-table="' + t.id + '">' +
      '<span class="pill ' + (has ? 'pill-busy' : 'pill-free') + '">' + (has ? 'Occupied' : 'Free') + '</span>' +
      '<span class="tname">' + t.name + '</span>' +
      '<span class="tseats">' + t.seats + ' seats</span>' +
      (has ? '<span class="ttotal">' + formatRs(orderTotal(state, t.id)) + ' running</span>' : '') +
      '</button>';
  }).join('');
}

function renderOrder() {
  var panel = document.getElementById('order-panel');
  if (!selectedTableId) {
    panel.innerHTML = '<h2>No table selected</h2>' +
      '<p class="empty">Choose a table on the left to start an order, add dishes from the menu, and close the bill when the guests are ready.</p>';
    return;
  }
  var table = tableById(state, selectedTableId);
  var raw = orderLines(state, selectedTableId);
  var lines = pricedLines(state, selectedTableId);
  var discountPct = state.discounts[selectedTableId] || 0;
  var bill = computeBill(lines, discountPct);
  var available = state.menu.filter(function (d) { return d.available; });

  var linesHtml = raw.length ? raw.map(function (l) {
    var item = menuItem(state, l.itemId);
    var name = item ? item.name : '(removed dish)';
    var price = item ? item.price : 0;
    return '<div class="order-line"><div><span class="nm">' + name + '</span><br>' +
      '<span class="pr">' + formatRs(price) + ' each</span></div>' +
      '<span class="qty-ctl"><button data-dec="' + l.itemId + '" aria-label="One less">−</button>' +
      '<span class="q">' + l.qty + '</span>' +
      '<button data-inc="' + l.itemId + '" aria-label="One more">+</button></span>' +
      '<span class="line-total">' + formatRs(price * l.qty) + '</span></div>';
  }).join('') : '<p class="empty">No dishes yet — add the first one below.</p>';

  panel.innerHTML =
    '<h2>' + table.name + ' <span style="color:var(--ink-soft);font-size:14px">· ' + table.seats + ' seats</span></h2>' +
    linesHtml +
    '<div class="add-dish-bar"><select id="dish-picker">' +
    available.map(function (d) {
      return '<option value="' + d.id + '">' + d.name + ' — ' + formatRs(d.price) + '</option>';
    }).join('') +
    '</select><button class="btn btn-primary" id="add-dish">Add dish</button></div>' +
    '<div class="discount-row"><label for="discount" style="margin:0">Discount %</label>' +
    '<input type="number" id="discount" min="0" max="100" value="' + discountPct + '">' +
    '<span style="color:var(--ink-soft);font-weight:400">applied before the 5% tax</span></div>' +
    '<div class="bill-box">' +
    '<div class="bill-row2"><span>Subtotal</span><span>' + formatRs(bill.subtotal) + '</span></div>' +
    '<div class="bill-row2"><span>Discount</span><span>− ' + formatRs(bill.discount) + '</span></div>' +
    '<div class="bill-row2"><span>Tax (5%)</span><span>' + formatRs(bill.tax) + '</span></div>' +
    '<div class="bill-row2 grand"><span>Total</span><span>' + formatRs(bill.total) + '</span></div></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">' +
    '<button class="btn btn-green" id="close-bill" ' + (raw.length ? '' : 'disabled style="opacity:.5"') + '>Close bill &amp; free table</button>' +
    '<button class="btn btn-danger" id="clear-order">Clear order</button></div>';
}

function renderAll() { renderTables(); renderOrder(); }

document.getElementById('tables-grid').addEventListener('click', function (e) {
  var card = e.target.closest('[data-table]');
  if (!card) return;
  selectedTableId = card.dataset.table;
  renderAll();
});

document.getElementById('order-panel').addEventListener('click', function (e) {
  if (!selectedTableId) return;
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
    saveState(state); renderAll();
    toast(dish.name + ' added to ' + tableById(state, selectedTableId).name);
  }
  if (e.target.id === 'clear-order') {
    if (!orderLines(state, selectedTableId).length) return;
    if (confirm('Clear this order without billing?')) {
      state.orders[selectedTableId] = [];
      state.discounts[selectedTableId] = 0;
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
    saveState(state); renderAll();
    toast('Bill closed — ' + formatRs(bill.total) + ' · ' + table.name + ' is free');
  }
});

document.getElementById('order-panel').addEventListener('change', function (e) {
  if (e.target.id === 'discount' && selectedTableId) {
    state.discounts[selectedTableId] = Math.min(100, Math.max(0, Number(e.target.value) || 0));
    saveState(state); renderAll();
  }
});

renderAll();
