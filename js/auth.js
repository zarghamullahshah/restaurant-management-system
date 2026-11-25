/* The Copper Kitchen — staff sessions
   Demo-grade front-end login: three roles, each with its own workspace.
   A session lives in localStorage ('ck-session'); every staff page checks
   it on load and bounces to login.html when it is missing or the role
   does not belong there. (A demo lock for a demo system — the PINs are
   printed on the login page on purpose.) */

'use strict';

var ROLES = {
  manager: { label: 'Manager', pin: '1234', home: 'manager.html', blurb: 'Dashboard, orders, bookings, menu & sales' },
  chef:    { label: 'Chef',    pin: '2345', home: 'chef.html',    blurb: 'Kitchen display — tickets as they land' },
  waiter:  { label: 'Waiter',  pin: '3456', home: 'waiter.html',  blurb: 'Your tables, orders & ready alerts' }
};

var SESSION_KEY = 'ck-session';

function getSession() {
  try {
    var s = JSON.parse(localStorage.getItem(SESSION_KEY));
    return s && ROLES[s.role] ? s : null;
  } catch (e) { return null; }
}

function staffLogin(role, name, pin) {
  var r = ROLES[role];
  if (!r) return { ok: false, error: 'Pick your role first.' };
  if (String(pin) !== r.pin) return { ok: false, error: 'Wrong PIN for the ' + r.label + ' login. Try again.' };
  var session = {
    role: role,
    name: (name || '').trim() || r.label,
    at: new Date().toISOString()
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
  return { ok: true, session: session };
}

function staffLogout() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  window.location.href = 'login.html';
}

/* Guard for staff pages. allowedRoles: array; empty = any signed-in staff.
   Returns the session, or redirects to the login page. */
function requireRole(allowedRoles) {
  var s = getSession();
  if (!s || (allowedRoles && allowedRoles.length && allowedRoles.indexOf(s.role) === -1)) {
    window.location.replace('login.html');
    return null;
  }
  return s;
}

/* Small identity chip + logout, dropped into sidebars / top bars. */
function staffChipHTML(session) {
  var r = ROLES[session.role];
  return '<div class="staff-chip"><span class="staff-avatar">' +
    session.name.split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase() +
    '</span><span class="staff-meta"><strong>' + session.name + '</strong><small>' + r.label + '</small></span>' +
    '<button class="staff-logout" id="staff-logout" type="button">Log out</button></div>';
}

function wireStaffChip(session, container) {
  if (!container || !session) return;
  container.innerHTML = staffChipHTML(session);
  var btn = document.getElementById('staff-logout');
  if (btn) btn.addEventListener('click', staffLogout);
}
