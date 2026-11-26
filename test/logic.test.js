const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TAX_RATE, computeBill, orderSubtotal, lineTotal, popularItems, billsOn, formatRs,
  seedState, ticketFor, openTicket, setTicketStatus, clearTicket,
  newOrderRef, onlineOrderTotal, priceOrderLines,
  revenueByDay, revenueByCategory, averageOrderValue } = require('../js/store.js');

test('lineTotal multiplies price by quantity', () => {
  assert.equal(lineTotal({ price: 350, qty: 3 }), 1050);
  assert.equal(lineTotal({ price: 120, qty: 1 }), 120);
});

test('orderSubtotal sums line totals', () => {
  assert.equal(orderSubtotal([{ price: 100, qty: 2 }, { price: 50, qty: 4 }]), 400);
  assert.equal(orderSubtotal([]), 0);
});

test('computeBill applies 5% tax with no discount', () => {
  const bill = computeBill([{ name: 'Biryani', price: 350, qty: 2 }], 0);
  assert.equal(bill.subtotal, 700);
  assert.equal(bill.discount, 0);
  assert.equal(bill.tax, 35);
  assert.equal(bill.total, 735);
  assert.equal(bill.itemCount, 2);
});

test('computeBill applies discount before tax', () => {
  const bill = computeBill([{ name: 'Karahi', price: 1000, qty: 1 }], 10);
  assert.equal(bill.subtotal, 1000);
  assert.equal(bill.discount, 100);
  assert.equal(bill.tax, 45); // 5% of 900
  assert.equal(bill.total, 945);
});

test('computeBill clamps discount to 0-100 and handles empty orders', () => {
  const over = computeBill([{ name: 'X', price: 200, qty: 1 }], 250);
  assert.equal(over.discountPct, 100);
  assert.equal(over.total, 0);
  const empty = computeBill([], 0);
  assert.deepEqual([empty.subtotal, empty.tax, empty.total, empty.itemCount], [0, 0, 0, 0]);
});

test('computeBill counts items across lines', () => {
  const bill = computeBill([{ price: 10, qty: 2 }, { price: 20, qty: 3 }], 0);
  assert.equal(bill.itemCount, 5);
});

test('tax rate is 5%', () => {
  assert.equal(TAX_RATE, 0.05);
});

test('popularItems ranks dishes by quantity ordered', () => {
  const bills = [
    { lines: [{ name: 'Biryani', qty: 2 }, { name: 'Naan', qty: 4 }] },
    { lines: [{ name: 'Biryani', qty: 1 }, { name: 'Kheer', qty: 1 }] },
  ];
  assert.deepEqual(popularItems(bills), [
    { name: 'Naan', qty: 4 },
    { name: 'Biryani', qty: 3 },
    { name: 'Kheer', qty: 1 },
  ]);
  assert.deepEqual(popularItems([]), []);
});

test('billsOn filters by calendar day', () => {
  const day = new Date(2026, 10, 25, 12, 0);
  const bills = [
    { closedAt: new Date(2026, 10, 25, 9, 15).toISOString() },
    { closedAt: new Date(2026, 10, 24, 21, 40).toISOString() },
    { closedAt: new Date(2026, 10, 25, 23, 59).toISOString() },
  ];
  assert.equal(billsOn(bills, day).length, 2);
});

test('formatRs formats with Rs prefix and thousands separators', () => {
  assert.equal(formatRs(735), 'Rs 735');
  assert.equal(formatRs(12500), 'Rs 12,500');
});

test('kitchen ticket opens as new and keeps its placedAt on reopen', () => {
  const s = seedState();
  assert.equal(ticketFor(s, 't1'), null);
  const t = openTicket(s, 't1', 'Ali Raza');
  assert.equal(t.status, 'new');
  assert.equal(t.byName, 'Ali Raza');
  assert.ok(t.placedAt);
  const again = openTicket(s, 't1', 'Someone Else');
  assert.equal(again.placedAt, t.placedAt);
  assert.equal(again.byName, 'Ali Raza');
});

test('kitchen ticket flows new -> preparing -> ready -> served, then reopens fresh', () => {
  const s = seedState();
  openTicket(s, 't2', 'Waiter');
  setTicketStatus(s, 't2', 'preparing');
  assert.equal(ticketFor(s, 't2').status, 'preparing');
  setTicketStatus(s, 't2', 'ready');
  setTicketStatus(s, 't2', 'served');
  const fresh = openTicket(s, 't2', 'Waiter');
  assert.equal(fresh.status, 'new');
});

test('clearTicket removes the ticket (bill closed / order cleared)', () => {
  const s = seedState();
  openTicket(s, 't3', 'Waiter');
  clearTicket(s, 't3');
  assert.equal(ticketFor(s, 't3'), null);
  clearTicket(s, 't3'); // clearing twice is a no-op, not an error
});

test('online order refs are ORD-#### and unique against existing orders', () => {
  const existing = [{ ref: 'ORD-1234' }];
  for (let i = 0; i < 40; i++) {
    const ref = newOrderRef(existing);
    assert.match(ref, /^ORD-\d{4}$/);
    assert.notEqual(ref, 'ORD-1234');
    existing.push({ ref });
  }
});

test('online order total prices lines from the live menu plus 5% tax', () => {
  const s = seedState();
  const biryani = s.menu.find((m) => m.name === 'Chicken Biryani (Single)');
  const order = { lines: [{ itemId: biryani.id, qty: 2 }] };
  // 2 x 350 = 700 subtotal, tax = 35, total 735
  assert.equal(onlineOrderTotal(s, order), 735);
  assert.equal(priceOrderLines(s, order.lines)[0].name, 'Chicken Biryani (Single)');
});

test('revenueByDay returns every day in the range, oldest first', () => {
  const bills = [
    { closedAt: '2026-11-26T12:00:00.000Z', total: 1000, lines: [] },
    { closedAt: '2026-11-26T19:00:00.000Z', total: 500, lines: [] },
    { closedAt: '2026-11-24T12:00:00.000Z', total: 700, lines: [] }
  ];
  const days = revenueByDay(bills, 3, '2026-11-26');
  assert.deepEqual(days.map((d) => d.date), ['2026-11-24', '2026-11-25', '2026-11-26']);
  assert.deepEqual(days.map((d) => d.total), [700, 0, 1500]);
  assert.deepEqual(days.map((d) => d.count), [1, 0, 2]);
});

test('revenueByCategory groups by menu category, removed dishes go to Other', () => {
  const menu = [
    { name: 'Chicken Biryani (Single)', category: 'Mains' },
    { name: 'Mint Margarita', category: 'Drinks' }
  ];
  const bills = [{
    total: 1000,
    lines: [
      { name: 'Chicken Biryani (Single)', price: 350, qty: 2 },
      { name: 'Mint Margarita', price: 250, qty: 1 },
      { name: 'Old Dish (gone)', price: 100, qty: 1 }
    ]
  }];
  const cats = revenueByCategory(bills, menu);
  assert.equal(cats[0].category, 'Mains');
  assert.equal(cats[0].total, 700);
  assert.equal(cats[0].qty, 2);
  assert.equal(cats.find((c) => c.category === 'Other').total, 100);
  assert.deepEqual(revenueByCategory([], menu), []);
});

test('averageOrderValue rounds and returns 0 with no bills', () => {
  assert.equal(averageOrderValue([{ total: 100 }, { total: 101 }]), 101); // 100.5 -> 101
  assert.equal(averageOrderValue([]), 0);
});
