/* The Copper Kitchen — Restaurant Management System
   Tables, orders, menu management and billing. Data persists in localStorage.
   Pure billing logic is kept separate at the top so it can be unit-tested in Node. */

'use strict';

/* ================= Pure logic (unit-tested) ================= */

var TAX_RATE = 0.05; // 5%

function roundRs(n) { return Math.round(n); }

function lineTotal(line) { return line.price * line.qty; }

function orderSubtotal(lines) {
  return lines.reduce(function (sum, l) { return sum + lineTotal(l); }, 0);
}

/* lines: [{name, price, qty}] -> full bill breakdown */
function computeBill(lines, discountPct) {
  var pct = Math.min(100, Math.max(0, Number(discountPct) || 0));
  var subtotal = orderSubtotal(lines);
  var discount = roundRs(subtotal * pct / 100);
  var taxable = subtotal - discount;
  var tax = roundRs(taxable * TAX_RATE);
  return {
    subtotal: subtotal,
    discountPct: pct,
    discount: discount,
    tax: tax,
    total: taxable + tax,
    itemCount: lines.reduce(function (s, l) { return s + l.qty; }, 0)
  };
}

/* bills -> [{name, qty}] most ordered first */
function popularItems(bills) {
  var counts = {};
  bills.forEach(function (b) {
    b.lines.forEach(function (l) { counts[l.name] = (counts[l.name] || 0) + l.qty; });
  });
  return Object.keys(counts)
    .map(function (name) { return { name: name, qty: counts[name] }; })
    .sort(function (a, b) { return b.qty - a.qty; });
}

function billsOn(bills, date) {
  var key = date.toDateString();
  return bills.filter(function (b) { return new Date(b.closedAt).toDateString() === key; });
}

function formatRs(n) { return 'Rs ' + Number(n).toLocaleString('en-PK'); }

/* ================= Seed data ================= */

var SEED_MENU = [
  { id: 'm1', name: 'Chicken Tikka (Leg Quarter)', category: 'Starters', price: 420, available: true },
  { id: 'm2', name: 'Seekh Kebab (4 pcs)', category: 'Starters', price: 550, available: true },
  { id: 'm3', name: 'Loaded Fries', category: 'Starters', price: 380, available: true },
  { id: 'm4', name: 'Chicken Karahi (Half)', category: 'Mains', price: 1450, available: true },
  { id: 'm5', name: 'Mutton Pulao', category: 'Mains', price: 780, available: true },
  { id: 'm6', name: 'Chicken Biryani (Single)', category: 'Mains', price: 350, available: true },
  { id: 'm7', name: 'Daal Mash Fry', category: 'Mains', price: 480, available: true },
  { id: 'm8', name: 'Grilled Fish Fillet', category: 'Mains', price: 1250, available: true },
  { id: 'm9', name: 'Roghni Naan', category: 'Breads & Rice', price: 90, available: true },
  { id: 'm10', name: 'Garlic Naan', category: 'Breads & Rice', price: 110, available: true },
  { id: 'm11', name: 'Zeera Rice', category: 'Breads & Rice', price: 260, available: true },
  { id: 'm12', name: 'Mint Margarita', category: 'Drinks', price: 250, available: true },
  { id: 'm13', name: 'Fresh Lime Soda', category: 'Drinks', price: 180, available: true },
  { id: 'm14', name: 'Soft Drink (Can)', category: 'Drinks', price: 120, available: true },
  { id: 'm15', name: 'Mineral Water (1.5L)', category: 'Drinks', price: 150, available: true },
  { id: 'm16', name: 'Shahi Kheer', category: 'Desserts', price: 220, available: true },
  { id: 'm17', name: 'Gulab Jamun (2 pcs)', category: 'Desserts', price: 200, available: true },
  { id: 'm18', name: 'Kulfa Falooda', category: 'Desserts', price: 420, available: true }
];

var SEED_TABLES = [
  { id: 't1', name: 'Table 1', seats: 2 }, { id: 't2', name: 'Table 2', seats: 2 },
  { id: 't3', name: 'Table 3', seats: 4 }, { id: 't4', name: 'Table 4', seats: 4 },
  { id: 't5', name: 'Table 5', seats: 6 }, { id: 't6', name: 'Table 6', seats: 4 },
  { id: 't7', name: 'Family Hall A', seats: 10 }, { id: 't8', name: 'Family Hall B', seats: 8 }
];

/* ================= State ================= */

var STORAGE_KEY = 'copper-kitchen-v1';
var state = loadState();
var selectedTableId = null;
var menuFilter = 'All';
var billSeq = state.bills.length + 1;

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.menu && parsed.tables) return parsed; }
  } catch (e) { /* fall through to seed */ }
  return { menu: SEED_MENU.slice(), tables: SEED_TABLES.slice(), orders: {}, bills: [] };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
}

function menuItem(id) { return state.menu.find(function (m) { return m.id === id; }); }
function tableById(id) { return state.tables.find(function (t) { return t.id === id; }); }
function orderLines(tableId) { return state.orders[tableId] || []; }
function pricedLines(tableId) {
  return orderLines(tableId).map(function (l) {
    var item = menuItem(l.itemId);
    return { name: item ? item.name : '(removed dish)', price: item ? item.price : 0, qty: l.qty };
  });
}

/* ================= Small UI helpers ================= */

function $(sel) { return document.querySelector(sel); }
function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
var toastTimer = null;
function toast(msg) {
  var t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}
function animateCount(node, to, isMoney) {
  var start = null, dur = 700;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min(1, (ts - start) / dur);
    var eased = 1 - Math.pow(1 - p, 3);
    var val = Math.round(to * eased);
    node.textContent = isMoney ? formatRs(val) : String(val);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ================= Views ================= */

function switchView(name) {
  document.querySelectorAll('.nav-item').forEach(function (b) {
    b.classList.toggle('is-active', b.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach(function (v) {
    v.classList.toggle('is-active', v.id === 'view-' + name);
  });
  render();
}

function render() {
  renderDashboard();
  renderTables();
  renderOrderPanel();
  renderMenu();
  renderHistory();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  var today = billsOn(state.bills, new Date());
  var revenue = today.reduce(function (s, b) { return s + b.total; }, 0);
  var occupied = state.tables.filter(function (t) { return orderLines(t.id).length > 0; }).length;
  animateCount($('#stat-revenue'), revenue, true);
  animateCount($('#stat-bills'), today.length, false);
  animateCount($('#stat-tables'), occupied, false);
  animateCount($('#stat-average'), today.length ? Math.round(revenue / today.length) : 0, true);
  $('#stat-revenue-hint').textContent = today.length ? 'from ' + today.length + ' bill' + (today.length === 1 ? '' : 's') : 'no bills yet today';
  $('#stat-tables-hint').textContent = 'of ' + state.tables.length + ' tables';
  $('#today-line').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  var pop = popularItems(today).slice(0, 5);
  var popList = $('#popular-list');
  popList.innerHTML = '';
  pop.forEach(function (p, i) {
    var li = el('li');
    var left = el('span', 'rank-name');
    left.appendChild(el('span', 'rank-no', String(i + 1)));
    left.appendChild(el('span', null, p.name));
    li.appendChild(left);
    li.appendChild(el('span', 'rank-count', p.qty + ' ordered'));
    popList.appendChild(li);
  });
  $('#popular-empty').style.display = pop.length ? 'none' : 'block';

  var recent = state.bills.slice(-5).reverse();
  var recList = $('#recent-list');
  recList.innerHTML = '';
  recent.forEach(function (b) {
    var li = el('li');
    li.appendChild(el('span', null, b.tableName + ' — ' + b.itemCount + ' items'));
    var meta = el('span', 'recent-meta', formatRs(b.total));
    li.appendChild(meta);
    recList.appendChild(li);
  });
  $('#recent-empty').style.display = recent.length ? 'none' : 'block';
}

/* ---------- Tables & order panel ---------- */
function renderTables() {
  var grid = $('#tables-grid');
  grid.innerHTML = '';
  state.tables.forEach(function (t, idx) {
    var lines = pricedLines(t.id);
    var busy = lines.length > 0;
    var card = el('button', 'table-card' + (t.id === selectedTableId ? ' is-selected' : ''));
    card.style.animationDelay = (idx * 0.05) + 's';
    card.appendChild(el('h3', null, t.name));
    card.appendChild(el('span', 'table-seats', t.seats + ' seats'));
    var stateRow = el('div', 'table-state');
    stateRow.appendChild(el('span', 'pill ' + (busy ? 'occupied' : 'free'), busy ? 'Occupied' : 'Free'));
    if (busy) stateRow.appendChild(el('span', 'table-total', formatRs(computeBill(lines, 0).total)));
    card.appendChild(stateRow);
    card.addEventListener('click', function () { selectedTableId = t.id; render(); });
    grid.appendChild(card);
  });
}

function renderOrderPanel() {
  var hasTable = !!selectedTableId;
  var table = hasTable ? tableById(selectedTableId) : null;
  $('#order-title').textContent = table ? table.name : 'No table selected';
  var lines = hasTable ? pricedLines(selectedTableId) : [];
  var status = $('#order-status');
  status.textContent = table ? (lines.length ? 'Occupied' : 'Free') : '—';
  status.className = 'pill ' + (lines.length ? 'occupied' : 'free');
  $('#order-empty').hidden = hasTable;
  $('#order-body').hidden = !hasTable;
  if (!hasTable) return;

  var list = $('#order-lines');
  list.innerHTML = '';
  orderLines(selectedTableId).forEach(function (l) {
    var item = menuItem(l.itemId);
    if (!item) return;
    var li = el('li');
    var name = el('span', 'line-name', item.name);
    name.appendChild(el('small', null, formatRs(item.price) + ' each'));
    li.appendChild(name);
    var qty = el('span', 'qty');
    var minus = el('button', null, '−');
    minus.setAttribute('aria-label', 'Decrease quantity');
    minus.addEventListener('click', function () { changeQty(l.itemId, -1); });
    var plus = el('button', null, '+');
    plus.setAttribute('aria-label', 'Increase quantity');
    plus.addEventListener('click', function () { changeQty(l.itemId, 1); });
    qty.appendChild(minus);
    qty.appendChild(el('span', null, String(l.qty)));
    qty.appendChild(plus);
    li.appendChild(qty);
    li.appendChild(el('span', 'line-total', formatRs(lineTotal({ price: item.price, qty: l.qty }))));
    var rm = el('button', 'line-remove', '×');
    rm.setAttribute('aria-label', 'Remove ' + item.name);
    rm.addEventListener('click', function () { removeLine(l.itemId); });
    li.appendChild(rm);
    list.appendChild(li);
  });
  if (!orderLines(selectedTableId).length) {
    list.appendChild(el('li', null, 'No dishes yet — add the first one below.'));
  }

  var picker = $('#menu-picker');
  var current = picker.value;
  picker.innerHTML = '';
  state.menu.filter(function (m) { return m.available; }).forEach(function (m) {
    var opt = el('option', null, m.name + ' — ' + formatRs(m.price));
    opt.value = m.id;
    picker.appendChild(opt);
  });
  if (current) picker.value = current;

  var discount = Number($('#discount-input').value) || 0;
  var bill = computeBill(lines, discount);
  $('#bill-subtotal').textContent = formatRs(bill.subtotal);
  $('#bill-tax').textContent = formatRs(bill.tax);
  $('#bill-total').textContent = formatRs(bill.total);
}

function changeQty(itemId, delta) {
  var lines = orderLines(selectedTableId);
  var line = lines.find(function (l) { return l.itemId === itemId; });
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.orders[selectedTableId] = lines.filter(function (l) { return l.itemId !== itemId; });
  saveState(); render();
}
function removeLine(itemId) {
  state.orders[selectedTableId] = orderLines(selectedTableId).filter(function (l) { return l.itemId !== itemId; });
  saveState(); render();
}

/* ---------- Menu ---------- */
function renderMenu() {
  var cats = ['All'].concat(SEED_MENU.map(function (m) { return m.category; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
  var chips = $('#category-chips');
  chips.innerHTML = '';
  cats.forEach(function (c) {
    var chip = el('button', 'chip' + (menuFilter === c ? ' is-active' : ''), c);
    chip.addEventListener('click', function () { menuFilter = c; renderMenu(); });
    chips.appendChild(chip);
  });

  var q = ($('#menu-search').value || '').toLowerCase();
  var grid = $('#menu-grid');
  grid.innerHTML = '';
  state.menu
    .filter(function (m) { return (menuFilter === 'All' || m.category === menuFilter) && m.name.toLowerCase().indexOf(q) !== -1; })
    .forEach(function (m, idx) {
      var card = el('article', 'dish-card' + (m.available ? '' : ' is-off'));
      card.style.animationDelay = (idx * 0.04) + 's';
      var top = el('div', 'dish-top');
      var left = el('div');
      left.appendChild(el('span', 'dish-cat', m.category));
      left.appendChild(el('h3', null, m.name));
      top.appendChild(left);
      top.appendChild(el('span', 'dish-price', formatRs(m.price)));
      card.appendChild(top);
      var actions = el('div', 'dish-actions');
      var toggle = el('button', 'btn btn-ghost', m.available ? 'Mark unavailable' : 'Mark available');
      toggle.addEventListener('click', function () { m.available = !m.available; saveState(); render(); toast(m.name + (m.available ? ' is available again.' : ' marked unavailable.')); });
      var edit = el('button', 'btn btn-secondary', 'Edit');
      edit.addEventListener('click', function () { openItemModal(m); });
      var del = el('button', 'btn btn-danger', 'Delete');
      del.addEventListener('click', function () {
        if (confirm('Delete "' + m.name + '" from the menu?')) {
          state.menu = state.menu.filter(function (x) { return x.id !== m.id; });
          saveState(); render(); toast('Dish deleted.');
        }
      });
      actions.appendChild(toggle); actions.appendChild(edit); actions.appendChild(del);
      card.appendChild(actions);
      grid.appendChild(card);
    });
  if (!grid.children.length) grid.appendChild(el('p', 'empty-note', 'No dishes match. Try another search or category.'));
}

/* ---------- History ---------- */
function renderHistory() {
  var body = $('#history-body');
  body.innerHTML = '';
  var all = state.bills.slice().reverse();
  all.forEach(function (b) {
    var tr = el('tr');
    [('#' + b.id), new Date(b.closedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), b.tableName, String(b.itemCount), b.discountPct ? b.discountPct + '%' : '—', formatRs(b.total)]
      .forEach(function (v) { tr.appendChild(el('td', null, v)); });
    body.appendChild(tr);
  });
  $('#history-empty').style.display = all.length ? 'none' : 'block';
  var total = all.reduce(function (s, b) { return s + b.total; }, 0);
  $('#history-summary').textContent = all.length ? all.length + ' bills closed · ' + formatRs(total) + ' all time' : 'Completed bills will be listed here.';
}

/* ================= Wiring ================= */

function openItemModal(item) {
  $('#item-modal').hidden = false;
  $('#item-modal-title').textContent = item ? 'Edit dish' : 'Add dish';
  $('#item-id').value = item ? item.id : '';
  $('#item-name').value = item ? item.name : '';
  $('#item-category').value = item ? item.category : 'Mains';
  $('#item-price').value = item ? item.price : '';
  $('#item-available').checked = item ? item.available : true;
  setTimeout(function () { $('#item-name').focus(); }, 60);
}
function closeItemModal() { $('#item-modal').hidden = true; }

function init() {
  document.querySelectorAll('.nav-item').forEach(function (b) {
    b.addEventListener('click', function () { switchView(b.dataset.view); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { switchView(b.dataset.goto); });
  });
  $('#add-line-btn').addEventListener('click', function () {
    var id = $('#menu-picker').value;
    if (!id || !selectedTableId) return;
    var lines = orderLines(selectedTableId);
    var line = lines.find(function (l) { return l.itemId === id; });
    if (line) line.qty += 1; else lines.push({ itemId: id, qty: 1 });
    state.orders[selectedTableId] = lines;
    saveState(); render();
    toast(menuItem(id).name + ' added to ' + tableById(selectedTableId).name + '.');
  });
  $('#discount-input').addEventListener('input', renderOrderPanel);
  $('#clear-order-btn').addEventListener('click', function () {
    if (!orderLines(selectedTableId).length) return;
    if (confirm('Clear this order without billing?')) {
      state.orders[selectedTableId] = [];
      saveState(); render(); toast('Order cleared.');
    }
  });
  $('#checkout-btn').addEventListener('click', function () {
    var raw = orderLines(selectedTableId);
    if (!raw.length) { toast('Add at least one dish before closing the bill.'); return; }
    var lines = pricedLines(selectedTableId);
    var bill = computeBill(lines, Number($('#discount-input').value) || 0);
    state.bills.push({
      id: billSeq++, tableName: tableById(selectedTableId).name,
      lines: lines, subtotal: bill.subtotal, discountPct: bill.discountPct,
      discount: bill.discount, tax: bill.tax, total: bill.total,
      itemCount: bill.itemCount, closedAt: new Date().toISOString()
    });
    state.orders[selectedTableId] = [];
    $('#discount-input').value = 0;
    saveState(); render();
    toast('Bill closed — ' + formatRs(bill.total) + '. Table is free.');
  });
  $('#new-item-btn').addEventListener('click', function () { openItemModal(null); });
  document.querySelectorAll('[data-close-modal]').forEach(function (b) {
    b.addEventListener('click', closeItemModal);
  });
  $('#item-modal').addEventListener('click', function (e) { if (e.target === this) closeItemModal(); });
  $('#item-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('#item-id').value;
    var data = {
      name: $('#item-name').value.trim(),
      category: $('#item-category').value,
      price: Math.max(1, Number($('#item-price').value) || 0),
      available: $('#item-available').checked
    };
    if (!data.name) return;
    if (id) { var m = menuItem(id); Object.assign(m, data); toast('Dish updated.'); }
    else { data.id = 'm' + Date.now(); state.menu.push(data); toast('Dish added to the menu.'); }
    saveState(); closeItemModal(); render();
  });
  $('#menu-search').addEventListener('input', renderMenu);
  $('#export-btn').addEventListener('click', function () {
    if (!state.bills.length) { toast('No bills to export yet.'); return; }
    var rows = [['Bill', 'Closed at', 'Table', 'Items', 'Subtotal', 'Discount %', 'Tax', 'Total']];
    state.bills.forEach(function (b) {
      rows.push([b.id, b.closedAt, b.tableName, b.itemCount, b.subtotal, b.discountPct, b.tax, b.total]);
    });
    var csv = rows.map(function (r) { return r.join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'copper-kitchen-sales.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  render();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

/* Node export for unit tests */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TAX_RATE: TAX_RATE, computeBill: computeBill, orderSubtotal: orderSubtotal, lineTotal: lineTotal, popularItems: popularItems, billsOn: billsOn, formatRs: formatRs };
}
