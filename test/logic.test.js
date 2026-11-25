const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TAX_RATE, computeBill, orderSubtotal, lineTotal, popularItems, billsOn, formatRs } = require('../app.js');

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
