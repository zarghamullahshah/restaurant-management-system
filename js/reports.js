/* The Copper Kitchen — reports page (manager).
   Revenue by day, by category and best sellers, all from closed bills. */

'use strict';

var state = loadState();
var DAYS = 14;

function prettyDay(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderReports() {
  var days = revenueByDay(state.bills, DAYS);
  var total = days.reduce(function (s, d) { return s + d.total; }, 0);
  var count = days.reduce(function (s, d) { return s + d.count; }, 0);
  var best = days.slice().sort(function (a, b) { return b.total - a.total; })[0];
  var cats = revenueByCategory(state.bills, state.menu);
  var top = popularItems(state.bills).slice(0, 5);

  document.getElementById('rp-revenue').textContent = formatRs(total);
  document.getElementById('rp-revenue-n').textContent = count + ' bills closed';
  document.getElementById('rp-avg').textContent = formatRs(averageOrderValue(state.bills));
  document.getElementById('rp-best').textContent = best && best.total ? formatRs(best.total) : '—';
  document.getElementById('rp-best-n').textContent = best && best.total
    ? prettyDay(best.date) + ' · ' + best.count + ' bills' : 'in the last 14 days';
  document.getElementById('rp-cat').textContent = cats.length ? cats[0].category : '—';
  document.getElementById('rp-cat-n').textContent = cats.length
    ? formatRs(cats[0].total) + ' · ' + cats[0].qty + ' dishes' : 'by revenue';

  var max = Math.max.apply(null, days.map(function (d) { return d.total; }).concat([1]));
  document.getElementById('rp-bars').innerHTML = days.map(function (d) {
    var h = Math.max(2, Math.round(d.total / max * 100));
    var label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return '<div class="bar-col" title="' + prettyDay(d.date) + ' — ' + formatRs(d.total) + ' (' + d.count + ' bills)">' +
      '<span class="bar-val">' + (d.total ? formatRs(d.total) : '') + '</span>' +
      '<div class="bar" style="height:' + h + '%"></div>' +
      '<span class="bar-label">' + label + '</span></div>';
  }).join('');

  document.getElementById('rp-cat-empty').hidden = cats.length > 0;
  document.getElementById('rp-cat-body').innerHTML = cats.map(function (c) {
    var share = total ? Math.round(c.total / total * 100) : 0;
    return '<tr><td><strong>' + c.category + '</strong></td><td>' + c.qty + '</td>' +
      '<td>' + formatRs(c.total) + '</td><td>' + share + '%</td></tr>';
  }).join('');

  document.getElementById('rp-top-empty').hidden = top.length > 0;
  document.getElementById('rp-top').innerHTML = top.map(function (t) {
    return '<li><span>' + t.name + '</span><strong>' + t.qty + ' ×</strong></li>';
  }).join('');
}

document.getElementById('export-csv').addEventListener('click', function () {
  var days = revenueByDay(state.bills, DAYS);
  var rows = [['Date', 'Bills', 'Revenue']];
  days.forEach(function (d) { rows.push([d.date, d.count, d.total]); });
  var csv = rows.map(function (r) { return r.join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'copper-kitchen-report-14day.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Report downloaded');
});

renderReports();
