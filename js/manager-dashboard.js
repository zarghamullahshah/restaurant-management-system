/* The Copper Kitchen — manager dashboard page. */

'use strict';

var state = loadState();
var todaysBills = billsOn(state.bills, new Date());
var revenue = todaysBills.reduce(function (s, b) { return s + b.total; }, 0);
var occupied = state.tables.filter(function (t) { return tableStatus(state, t.id) === 'occupied'; }).length;
var pending = state.bookings.filter(function (b) { return b.status === 'pending'; }).length;

var hour = new Date().getHours();
document.getElementById('dash-title').textContent =
  (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good service, tonight') + ' — here is today';
document.getElementById('dash-date').textContent =
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

document.getElementById('st-revenue').textContent = formatRs(revenue);
document.getElementById('st-bills').textContent = todaysBills.length;
document.getElementById('st-tables').textContent = occupied;
document.getElementById('st-tables-n').textContent = 'of ' + state.tables.length + ' tables';
document.getElementById('st-bookings').textContent = pending;
if (pending > 0) document.getElementById('st-booking-card').classList.add('is-alert');

var pop = popularItems(todaysBills).slice(0, 5);
document.getElementById('popular-list').innerHTML = pop.length
  ? pop.map(function (p) {
      return '<div class="pop-row"><span>' + p.name + '</span><span class="qty">× ' + p.qty + '</span></div>';
    }).join('')
  : '<p class="empty">No completed bills yet today. Finished orders will appear here.</p>';

var recent = state.bills.slice(-5).reverse();
document.getElementById('recent-list').innerHTML = recent.length
  ? recent.map(function (b) {
      var when = new Date(b.closedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      return '<div class="bill-row"><span>' + b.tableName +
        ' <span class="when">· ' + when + '</span></span>' +
        '<span class="amt">' + formatRs(b.total) + '</span></div>';
    }).join('')
  : '<p class="empty">Nothing here yet — close a bill from a table to see it.</p>';
