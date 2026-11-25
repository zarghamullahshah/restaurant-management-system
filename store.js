/* The Copper Kitchen — shared data layer
   Used by BOTH systems: the customer pages (menu, booking) and the manager
   pages (dashboard, orders, menu editor, bookings, sales) all read and write
   the same store, so a booking a guest makes shows up in the manager's inbox
   and a dish the manager edits is what the guest sees.

   Storage: localStorage on this device (key copper-kitchen-v1).
   Billing logic is pure and unit tested (test/logic.test.js). */

'use strict';

/* ================= Pure logic (unit-tested) ================= */

var TAX_RATE = 0.05; // 5% — discount is applied BEFORE tax

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

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function newBookingRef(existing) {
  var ref;
  do { ref = 'CK-' + Math.floor(1000 + Math.random() * 9000); }
  while (existing.some(function (b) { return b.ref === ref; }));
  return ref;
}

/* ================= Seed data ================= */

var CATEGORIES = ['Starters', 'Mains', 'Breads & Rice', 'Drinks', 'Desserts'];

/* Photos live in assets/ — only dishes with real photography carry one. */
var SEED_MENU = [
  { id: 'm1', name: 'Chicken Tikka (Leg Quarter)', category: 'Starters', price: 420, available: true },
  { id: 'm2', name: 'Seekh Kebab (4 pcs)', category: 'Starters', price: 550, available: true, photo: 'assets/dish-grill.jpg' },
  { id: 'm3', name: 'Loaded Fries', category: 'Starters', price: 380, available: true },
  { id: 'm19', name: 'Crispy Samosa (2 pcs)', category: 'Starters', price: 150, available: true, photo: 'assets/dish-samosa.jpg' },
  { id: 'm4', name: 'Chicken Karahi (Half)', category: 'Mains', price: 1450, available: true, photo: 'assets/dish-karahi.jpg' },
  { id: 'm5', name: 'Mutton Pulao', category: 'Mains', price: 780, available: true },
  { id: 'm6', name: 'Chicken Biryani (Single)', category: 'Mains', price: 350, available: true, photo: 'assets/dish-biryani.jpg' },
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

var STORE_KEY = 'copper-kitchen-v1';

function seedState() {
  return {
    menu: JSON.parse(JSON.stringify(SEED_MENU)),
    tables: JSON.parse(JSON.stringify(SEED_TABLES)),
    orders: {},      // tableId -> [{ itemId, qty }]
    discounts: {},   // tableId -> discount %
    bills: [],       // { id, tableName, lines, subtotal, discountPct, discount, tax, total, itemCount, closedAt }
    bookings: []     // { id, ref, name, phone, guests, date, time, area, notes, status, tableId }
  };
}

function loadState() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      var s = JSON.parse(raw);
      if (s && s.menu && s.tables) {
        if (!s.orders) s.orders = {};
        if (!s.discounts) s.discounts = {};
        if (!Array.isArray(s.bills)) s.bills = [];
        if (!Array.isArray(s.bookings)) s.bookings = [];
        return s;
      }
    }
  } catch (e) { /* fall through to seed */ }
  return seedState();
}

function saveState(state) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
}

function menuItem(state, id) { return state.menu.find(function (m) { return m.id === id; }); }
function tableById(state, id) { return state.tables.find(function (t) { return t.id === id; }); }
function orderLines(state, tableId) { return state.orders[tableId] || []; }

function pricedLines(state, tableId) {
  return orderLines(state, tableId).map(function (l) {
    var item = menuItem(state, l.itemId);
    return { name: item ? item.name : '(removed dish)', price: item ? item.price : 0, qty: l.qty };
  });
}

function tableStatus(state, tableId) {
  return orderLines(state, tableId).length ? 'occupied' : 'free';
}

function orderTotal(state, tableId) {
  return computeBill(pricedLines(state, tableId), state.discounts[tableId] || 0).total;
}

/* Node export for the logic tests; harmless in the browser. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TAX_RATE: TAX_RATE, SEED_MENU: SEED_MENU, SEED_TABLES: SEED_TABLES,
    CATEGORIES: CATEGORIES, lineTotal: lineTotal, orderSubtotal: orderSubtotal,
    computeBill: computeBill, popularItems: popularItems, billsOn: billsOn,
    formatRs: formatRs, todayStr: todayStr, newBookingRef: newBookingRef,
    seedState: seedState, pricedLines: pricedLines, orderTotal: orderTotal,
    tableStatus: tableStatus
  };
}
