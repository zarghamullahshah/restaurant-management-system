/* The Copper Kitchen — sales history page (manager). */

'use strict';

var state = loadState();
var filterDate = todayStr();
var dateInput = document.getElementById('sales-date');
dateInput.value = filterDate;

function visibleBills() {
  if (!filterDate) return state.bills.slice();
  return billsOn(state.bills, new Date(filterDate + 'T00:00:00'));
}

function renderSales() {
  var bills = visibleBills();
  document.getElementById('sales-empty').hidden = bills.length > 0;
  document.getElementById('sales-body').innerHTML = bills.slice().reverse().map(function (b) {
    var when = new Date(b.closedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return '<tr><td>#' + b.id + '</td><td>' + when + '</td>' +
      '<td>' + b.tableName + '</td><td>' + b.itemCount + '</td>' +
      '<td>' + (b.discountPct ? b.discountPct + '%' : '—') + '</td>' +
      '<td><strong>' + formatRs(b.total) + '</strong></td></tr>';
  }).join('');
  var total = bills.reduce(function (s, b) { return s + b.total; }, 0);
  document.getElementById('sales-total').textContent = formatRs(total);
}

dateInput.addEventListener('change', function () { filterDate = dateInput.value; renderSales(); });
document.getElementById('show-all').addEventListener('click', function () {
  filterDate = ''; dateInput.value = ''; renderSales();
});

document.getElementById('export-csv').addEventListener('click', function () {
  var rows = [['Bill', 'Closed at', 'Table', 'Items', 'Subtotal', 'Discount %', 'Discount', 'Tax', 'Total']];
  visibleBills().forEach(function (b) {
    rows.push([b.id, b.closedAt, b.tableName, b.itemCount, b.subtotal, b.discountPct, b.discount, b.tax, b.total]);
  });
  var csv = rows.map(function (r) { return r.join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'copper-kitchen-sales-' + (filterDate || 'all') + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV downloaded');
});

renderSales();
