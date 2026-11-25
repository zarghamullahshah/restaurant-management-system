/* The Copper Kitchen — menu editor page (manager).
   Add, edit, delete and toggle dishes. Changes write to the shared store,
   so the guest menu (menu.html) reflects them immediately. */

'use strict';

var state = loadState();
var activeCategory = 'All';
var searchTerm = '';
var editingId = null;

function renderChips() {
  var cats = ['All'].concat(CATEGORIES);
  document.getElementById('menu-chips').innerHTML = cats.map(function (c) {
    return '<button class="chip' + (c === activeCategory ? ' is-on' : '') +
      '" data-cat="' + c + '">' + c + '</button>';
  }).join('');
}

function renderMenu() {
  var rows = state.menu.filter(function (d) {
    var catOk = activeCategory === 'All' || d.category === activeCategory;
    var searchOk = d.name.toLowerCase().indexOf(searchTerm) !== -1;
    return catOk && searchOk;
  });
  document.getElementById('menu-empty').hidden = rows.length > 0;
  document.getElementById('menu-body').innerHTML = rows.map(function (d) {
    return '<tr><td><strong>' + d.name + '</strong>' + (d.photo ? ' <span class="status status-confirmed">Photo</span>' : '') + '</td>' +
      '<td>' + d.category + '</td><td>' + formatRs(d.price) + '</td>' +
      '<td><label class="switch"><input type="checkbox" data-toggle="' + d.id + '"' +
      (d.available ? ' checked' : '') + '><span class="track"></span></label></td>' +
      '<td style="white-space:nowrap;text-align:right">' +
      '<button class="btn btn-ghost btn-sm" data-edit="' + d.id + '">Edit</button> ' +
      '<button class="btn btn-danger btn-sm" data-delete="' + d.id + '">Delete</button></td></tr>';
  }).join('');
}

function openModal(dish) {
  editingId = dish ? dish.id : null;
  document.getElementById('modal-title').textContent = dish ? 'Edit dish' : 'Add a dish';
  document.getElementById('dish-name').value = dish ? dish.name : '';
  document.getElementById('dish-price').value = dish ? dish.price : '';
  var sel = document.getElementById('dish-category');
  sel.innerHTML = CATEGORIES.map(function (c) { return '<option>' + c + '</option>'; }).join('');
  if (dish) sel.value = dish.category;
  document.getElementById('dish-modal').classList.add('open');
}
function closeModal() { document.getElementById('dish-modal').classList.remove('open'); }

document.getElementById('open-add').addEventListener('click', function () { openModal(null); });
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('dish-modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
document.getElementById('modal-save').addEventListener('click', function () {
  var name = document.getElementById('dish-name').value.trim();
  var price = Number(document.getElementById('dish-price').value);
  var category = document.getElementById('dish-category').value;
  if (name.length < 2) { toast('Give the dish a name first'); return; }
  if (!price || price < 1) { toast('Enter a price above zero'); return; }
  if (editingId) {
    var dish = state.menu.find(function (d) { return d.id === editingId; });
    dish.name = name; dish.price = price; dish.category = category;
    toast('Dish updated — live on the guest menu');
  } else {
    state.menu.push({ id: 'm' + Date.now().toString(36), name: name, category: category, price: price, available: true });
    toast('Dish added — live on the guest menu');
  }
  saveState(state); closeModal(); renderMenu();
});

document.getElementById('menu-chips').addEventListener('click', function (e) {
  var chip = e.target.closest('[data-cat]');
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  renderChips(); renderMenu();
});
document.getElementById('menu-search').addEventListener('input', function (e) {
  searchTerm = e.target.value.trim().toLowerCase();
  renderMenu();
});
document.getElementById('menu-body').addEventListener('click', function (e) {
  var editBtn = e.target.closest('[data-edit]');
  var delBtn = e.target.closest('[data-delete]');
  if (editBtn) openModal(state.menu.find(function (d) { return d.id === editBtn.dataset.edit; }));
  if (delBtn) {
    var dish = state.menu.find(function (d) { return d.id === delBtn.dataset.delete; });
    if (dish && confirm('Delete "' + dish.name + '" from the menu?')) {
      state.menu = state.menu.filter(function (d) { return d.id !== dish.id; });
      saveState(state); renderMenu();
      toast('Dish deleted');
    }
  }
});
document.getElementById('menu-body').addEventListener('change', function (e) {
  var toggle = e.target.closest('[data-toggle]');
  if (!toggle) return;
  var dish = state.menu.find(function (d) { return d.id === toggle.dataset.toggle; });
  if (dish) {
    dish.available = toggle.checked;
    saveState(state);
    toast(dish.name + (dish.available ? ' is available again' : ' marked sold out — hidden from guests'));
  }
});

renderChips();
renderMenu();
