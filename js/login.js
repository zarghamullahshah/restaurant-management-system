/* The Copper Kitchen — staff login page logic */

'use strict';

var pickedRole = null;
var grid = document.getElementById('role-grid');
var errorBox = document.getElementById('login-error');

/* Already signed in? Go straight to your workspace. */
var existing = getSession();
if (existing) window.location.replace(ROLES[existing.role].home);

grid.addEventListener('click', function (e) {
  var card = e.target.closest('[data-role]');
  if (!card) return;
  pickedRole = card.dataset.role;
  grid.querySelectorAll('.role-card').forEach(function (c) {
    c.classList.toggle('is-on', c.dataset.role === pickedRole);
  });
  errorBox.classList.remove('show');
  document.getElementById('staff-pin').focus();
});

document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var name = document.getElementById('staff-name').value;
  var pin = document.getElementById('staff-pin').value;
  var res = staffLogin(pickedRole, name, pin);
  if (!res.ok) {
    errorBox.textContent = res.error;
    errorBox.classList.remove('show');
    void errorBox.offsetWidth; // restart the shake animation
    errorBox.classList.add('show');
    return;
  }
  window.location.href = ROLES[res.session.role].home;
});
