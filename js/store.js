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

function ymd(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/* bills -> last `days` days ending on endDateStr (YYYY-MM-DD, default
   today): [{date, total, count}] oldest first; days with no bills read 0. */
function revenueByDay(bills, days, endDateStr) {
  var end = new Date((endDateStr || todayStr()) + 'T00:00:00');
  var out = [];
  for (var i = days - 1; i >= 0; i--) {
    var d = new Date(end);
    d.setDate(d.getDate() - i);
    var dayBills = billsOn(bills, d);
    out.push({
      date: ymd(d),
      total: dayBills.reduce(function (s, b) { return s + b.total; }, 0),
      count: dayBills.length
    });
  }
  return out;
}

/* bills + menu -> [{category, total, qty}] best first. Bill lines are
   matched to menu items by name; lines from dishes since removed from
   the menu fall under 'Other'. */
function revenueByCategory(bills, menu) {
  var byName = {};
  menu.forEach(function (m) { byName[m.name] = m.category; });
  var totals = {};
  bills.forEach(function (b) {
    b.lines.forEach(function (l) {
      var cat = byName[l.name] || 'Other';
      if (!totals[cat]) totals[cat] = { category: cat, total: 0, qty: 0 };
      totals[cat].total += l.price * l.qty;
      totals[cat].qty += l.qty;
    });
  });
  return Object.keys(totals).map(function (k) { return totals[k]; })
    .sort(function (a, b) { return b.total - a.total; });
}

/* Average bill value across a set of bills; 0 when there are none. */
function averageOrderValue(bills) {
  if (!bills.length) return 0;
  return Math.round(bills.reduce(function (s, b) { return s + b.total; }, 0) / bills.length);
}

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function addDaysStr(dateStr, n) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/* ---- Staff rota ----
   staff: { id, name, role } — the team on the rota.
   shifts: { id, staffId, date (YYYY-MM-DD), start/end (HH:MM) } */
var SEED_STAFF = [
  { id: 'st1', name: 'Ali Raza', role: 'Waiter' },
  { id: 'st2', name: 'Bilal Ahmed', role: 'Waiter' },
  { id: 'st3', name: 'Sana Malik', role: 'Chef' },
  { id: 'st4', name: 'Usman Tariq', role: 'Chef' },
  { id: 'st5', name: 'Ayesha Noor', role: 'Cashier' },
  { id: 'st6', name: 'Hassan Raza', role: 'Waiter' }
];

function hhmmToMin(hhmm) {
  var p = String(hhmm || '').split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

/* Minutes in one shift; 0 when the end is not after the start. */
function shiftMinutes(shift) {
  var mins = hhmmToMin(shift.end) - hhmmToMin(shift.start);
  return mins > 0 ? mins : 0;
}

/* True when the new shift would overlap one the same person already
   works that day (back-to-back shifts are fine). */
function hasShiftConflict(shifts, staffId, date, start, end) {
  var s = hhmmToMin(start), e = hhmmToMin(end);
  return shifts.some(function (sh) {
    return sh.staffId === staffId && sh.date === date &&
      s < hhmmToMin(sh.end) && hhmmToMin(sh.start) < e;
  });
}

/* One day's shifts, earliest start first. */
function shiftsOn(shifts, date) {
  return shifts.filter(function (sh) { return sh.date === date; })
    .sort(function (a, b) { return hhmmToMin(a.start) - hhmmToMin(b.start); });
}

/* Monday (YYYY-MM-DD) of the week containing dateStr. */
function weekStartStr(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
}

/* Hours one person is rostered Monday to Sunday of the week starting
   weekStart, to one decimal place. */
function staffWeekHours(shifts, staffId, weekStart) {
  var end = addDaysStr(weekStart, 6);
  var mins = shifts.reduce(function (sum, sh) {
    if (sh.staffId === staffId && sh.date >= weekStart && sh.date <= end) return sum + shiftMinutes(sh);
    return sum;
  }, 0);
  return Math.round(mins / 60 * 10) / 10;
}

function staffById(state, id) { return state.staff.find(function (s) { return s.id === id; }); }

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
    bookings: [],    // { id, ref, name, phone, guests, date, time, area, notes, status, tableId }
    kitchen: {},     // tableId -> { status: new|preparing|ready|served, placedAt, byName }
    onlineOrders: [], // { id, ref, name, phone, type, tableId, lines, notes, status, placedAt, kitchenKey }
    staff: JSON.parse(JSON.stringify(SEED_STAFF)),
    shifts: [        // { id, staffId, date, start, end } — the staff rota
      { id: 'sh1', staffId: 'st1', date: todayStr(), start: '10:00', end: '18:00' },
      { id: 'sh2', staffId: 'st3', date: todayStr(), start: '12:00', end: '22:00' },
      { id: 'sh3', staffId: 'st2', date: addDaysStr(todayStr(), 1), start: '10:00', end: '18:00' }
    ]
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
        if (!s.kitchen) s.kitchen = {};
        if (!Array.isArray(s.onlineOrders)) s.onlineOrders = [];
        if (!Array.isArray(s.staff)) s.staff = JSON.parse(JSON.stringify(SEED_STAFF));
        if (!Array.isArray(s.shifts)) s.shifts = [];
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

/* ---- Kitchen tickets: the link between waiters and the chef ----
   A ticket opens when the first dish lands on a table, moves
   new -> preparing -> ready (chef) -> served (waiter), and closes
   with the bill. */
function ticketFor(state, tableId) { return (state.kitchen || {})[tableId] || null; }

function openTicket(state, tableId, byName) {
  if (!state.kitchen) state.kitchen = {};
  var t = state.kitchen[tableId];
  if (!t || t.status === 'served') {
    t = { status: 'new', placedAt: new Date().toISOString(), byName: byName || '' };
    state.kitchen[tableId] = t;
  }
  return t;
}

function setTicketStatus(state, tableId, status) {
  var t = ticketFor(state, tableId);
  if (t) t.status = status;
  return t;
}

function clearTicket(state, tableId) {
  if (state.kitchen) delete state.kitchen[tableId];
}

/* ---- Guest online orders ----
   A guest builds a cart on the menu page and places an order. Staff
   accept it from the waiter floor: dine-in orders merge into the
   table's running order; takeaway orders get their own kitchen
   ticket under the key 'tk-<orderId>'. */
function newOrderRef(existing) {
  var ref;
  do { ref = 'ORD-' + Math.floor(1000 + Math.random() * 9000); }
  while (existing.some(function (o) { return o.ref === ref; }));
  return ref;
}

function priceOrderLines(state, lines) {
  return (lines || []).map(function (l) {
    var item = menuItem(state, l.itemId);
    return { name: item ? item.name : '(removed dish)', price: item ? item.price : 0, qty: l.qty };
  });
}

function onlineOrderTotal(state, order) {
  return computeBill(priceOrderLines(state, order.lines), 0).total;
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
    revenueByDay: revenueByDay, revenueByCategory: revenueByCategory,
    averageOrderValue: averageOrderValue, SEED_STAFF: SEED_STAFF,
    hhmmToMin: hhmmToMin, shiftMinutes: shiftMinutes,
    hasShiftConflict: hasShiftConflict, shiftsOn: shiftsOn,
    addDaysStr: addDaysStr, weekStartStr: weekStartStr,
    staffWeekHours: staffWeekHours, staffById: staffById,
    seedState: seedState, pricedLines: pricedLines, orderTotal: orderTotal,
    tableStatus: tableStatus, ticketFor: ticketFor, openTicket: openTicket,
    setTicketStatus: setTicketStatus, clearTicket: clearTicket,
    newOrderRef: newOrderRef, priceOrderLines: priceOrderLines,
    onlineOrderTotal: onlineOrderTotal
  };
}
