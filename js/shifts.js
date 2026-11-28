/* The Copper Kitchen — staff rota page (manager).
   Assign shifts per day, see who is on, and keep the week's hours
   fair across the team. All rota logic lives in js/store.js. */

'use strict';

var state = loadState();
var rotaDate = todayStr();

var dateEl = document.getElementById('rota-date');
dateEl.value = rotaDate;
dateEl.addEventListener('change', function () {
  rotaDate = dateEl.value || todayStr();
  render();
});

document.getElementById('rota-today').addEventListener('click', function () {
  rotaDate = todayStr();
  dateEl.value = rotaDate;
  render();
});

document.getElementById('rota-prev').addEventListener('click', function () { stepDay(-1); });
document.getElementById('rota-next').addEventListener('click', function () { stepDay(1); });

function stepDay(n) {
  rotaDate = addDaysStr(rotaDate, n);
  dateEl.value = rotaDate;
  render();
}

function fmtHours(mins) {
  var h = Math.floor(mins / 60), m = mins % 60;
  return m ? h + ' h ' + m + ' min' : h + ' h';
}

function prettyDay(dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function render() {
  var dayShifts = shiftsOn(state.shifts, rotaDate);
  var weekStart = weekStartStr(rotaDate);
  var dayMins = dayShifts.reduce(function (s, sh) { return s + shiftMinutes(sh); }, 0);
  var weekMins = state.shifts.reduce(function (s, sh) {
    return (sh.date >= weekStart && sh.date <= addDaysStr(weekStart, 6)) ? s + shiftMinutes(sh) : s;
  }, 0);
  var onShift = {};
  dayShifts.forEach(function (sh) { onShift[sh.staffId] = true; });

  document.getElementById('rt-count').textContent = Object.keys(onShift).length;
  document.getElementById('rt-count-n').textContent = prettyDay(rotaDate);
  document.getElementById('rt-hours').textContent = fmtHours(dayMins);
  document.getElementById('rt-hours-n').textContent = 'rostered ' + prettyDay(rotaDate);
  document.getElementById('rt-off').textContent = state.staff.length - Object.keys(onShift).length;
  document.getElementById('rt-off-n').textContent = 'staff with no shift ' + prettyDay(rotaDate);
  document.getElementById('rt-week').textContent = fmtHours(weekMins);
  document.getElementById('rt-week-n').textContent =
    'week of ' + new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  document.getElementById('rt-empty').hidden = dayShifts.length > 0;
  var body = document.getElementById('rt-body');
  body.innerHTML = dayShifts.map(function (sh) {
    var person = staffById(state, sh.staffId);
    return '<tr><td><strong>' + (person ? person.name : '—') + '</strong></td>' +
      '<td>' + (person ? person.role : '—') + '</td>' +
      '<td>' + sh.start + ' – ' + sh.end + '</td>' +
      '<td>' + fmtHours(shiftMinutes(sh)) + '</td>' +
      '<td><button class="btn btn-danger btn-sm" data-remove="' + sh.id + '">Remove</button></td></tr>';
  }).join('');
  body.querySelectorAll('[data-remove]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.shifts = state.shifts.filter(function (sh) { return sh.id !== btn.dataset.remove; });
      saveState(state);
      render();
      toast('Shift removed');
    });
  });

  var maxHrs = 44; // a full-time week, used to scale the bars
  document.getElementById('rt-week-label').textContent =
    'Hours per person, week of ' + new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + '.';
  document.getElementById('rt-week-list').innerHTML = state.staff.map(function (person) {
    var hrs = staffWeekHours(state.shifts, person.id, weekStart);
    var pct = Math.min(100, Math.round(hrs / maxHrs * 100));
    return '<div class="week-row"><div class="who"><span><b>' + person.name + '</b> · ' + person.role +
      '</span><span><b>' + hrs + ' h</b></span></div>' +
      '<div class="week-bar"><span style="width:' + pct + '%"></span></div></div>';
  }).join('');
}

/* Assign-shift form */
var staffEl = document.getElementById('shift-staff');
staffEl.innerHTML = state.staff.map(function (s) {
  return '<option value="' + s.id + '">' + s.name + ' — ' + s.role + '</option>';
}).join('');

document.getElementById('shift-form').addEventListener('submit', function (ev) {
  ev.preventDefault();
  var err = document.getElementById('shift-error');
  err.textContent = '';
  err.classList.remove('error');
  var staffId = staffEl.value;
  var start = document.getElementById('shift-start').value;
  var end = document.getElementById('shift-end').value;
  var person = staffById(state, staffId);
  if (!start || !end || hhmmToMin(end) <= hhmmToMin(start)) {
    err.textContent = 'The shift must end after it starts.';
    err.classList.add('error');
    return;
  }
  if (hasShiftConflict(state.shifts, staffId, rotaDate, start, end)) {
    err.textContent = (person ? person.name : 'This person') + ' already works ' + prettyDay(rotaDate) + ' at that time.';
    err.classList.add('error');
    return;
  }
  state.shifts.push({ id: 'sh' + Date.now(), staffId: staffId, date: rotaDate, start: start, end: end });
  saveState(state);
  render();
  toast((person ? person.name : 'Shift') + ' rostered ' + start + '–' + end);
});

render();
