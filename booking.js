/* The Copper Kitchen — guest booking page
   A reservation written here appears in the manager's bookings inbox
   (bookings.html) because both sides share the same store. Guests track
   the live status (pending → confirmed → seated) by phone number. */

'use strict';

var state = loadState();
var form = document.getElementById('book-form');
var errorBox = document.getElementById('form-error');

var dateInput = document.getElementById('f-date');
dateInput.min = todayStr();
dateInput.value = todayStr();

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('show');
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function prettyDate(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  errorBox.classList.remove('show');
  var name = document.getElementById('f-name').value.trim();
  var phone = document.getElementById('f-phone').value.trim();
  var guests = Number(document.getElementById('f-guests').value);
  var area = document.getElementById('f-area').value;
  var date = dateInput.value;
  var time = document.getElementById('f-time').value;
  var notes = document.getElementById('f-notes').value.trim();

  if (name.length < 2) return showError('Please enter your name so we can hold the table under it.');
  if (!/^[0-9+\s-]{10,15}$/.test(phone)) return showError('Please enter a valid mobile number — the manager confirms by phone.');
  if (!date) return showError('Please pick a date.');
  if (date < todayStr()) return showError('That date has already passed — pick a day from today onwards.');

  var booking = {
    id: 'b' + Date.now().toString(36),
    ref: newBookingRef(state.bookings),
    name: name, phone: phone, guests: guests, area: area,
    date: date, time: time, notes: notes,
    status: 'pending', tableId: null
  };
  state.bookings.push(booking);
  saveState(state);

  document.getElementById('book-panel').innerHTML =
    '<div class="success"><div class="tick">✓</div>' +
    '<h2>Request received, ' + name.split(' ')[0] + '</h2>' +
    '<p class="sub">Your booking reference is</p><p class="ref">' + booking.ref + '</p>' +
    '<p class="sub">' + guests + ' guests · ' + area + '<br>' + prettyDate(date) + ' at ' + time + '</p>' +
    '<p class="sub">The manager reviews requests in the bookings inbox and confirms by phone. ' +
    'You can watch the status live on this page with your mobile number.</p>' +
    '<a class="btn btn-outline" href="menu.html">Browse the menu meanwhile</a></div>';

  document.getElementById('lookup-phone').value = phone;
  renderLookup(phone);
});

function bookingRow(b) {
  return '<div class="booking-row"><div class="line1"><strong>' + b.ref + ' · ' + b.name + '</strong>' +
    '<span class="status status-' + b.status + '">' + b.status + '</span></div>' +
    '<p class="meta">' + b.guests + ' guests · ' + b.area + '<br>' + prettyDate(b.date) + ' at ' + b.time +
    (b.notes ? '<br>' + b.notes : '') + '</p></div>';
}

function renderLookup(phone) {
  var box = document.getElementById('lookup-results');
  var mine = state.bookings.filter(function (b) { return b.phone === phone; })
    .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
  box.innerHTML = mine.length
    ? mine.map(bookingRow).join('')
    : '<p class="empty-note">No bookings found for that number yet.</p>';
}

document.getElementById('lookup-btn').addEventListener('click', function () {
  var phone = document.getElementById('lookup-phone').value.trim();
  if (phone) renderLookup(phone);
});
