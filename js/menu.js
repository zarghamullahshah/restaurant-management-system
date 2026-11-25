/* The Copper Kitchen — guest menu + online ordering
   The menu renders LIVE from the shared store (sold-out dishes vanish,
   price edits appear instantly). Guests build a cart, choose dine-in or
   takeaway, and place a real order: it lands in the staff system, where
   the waiter accepts it and the kitchen cooks it. Guests track it here
   by phone number. */

'use strict';

var DESCRIPTIONS = {
  'Chicken Tikka (Leg Quarter)': 'Charcoal-kissed and marinated overnight — the starter that starts arguments.',
  'Seekh Kebab (4 pcs)': 'Hand-minced, charcoal-grilled, served with mint chutney and onion rings.',
  'Loaded Fries': 'Crisp fries under cheese sauce, chicken chunks and jalapenos.',
  'Crispy Samosa (2 pcs)': 'Flaky pastry, spiced potato filling, tamarind and mint chutneys.',
  'Chicken Karahi (Half)': 'Wok-tossed with tomato, green chilli and ginger — the dish the house is known for.',
  'Mutton Pulao': 'Slow-cooked yakhni rice with tender mutton and whole spices.',
  'Chicken Biryani (Single)': 'Layered dum biryani with raita and salad — the lunch rush in a plate.',
  'Daal Mash Fry': 'White lentils tempered with garlic, butter and green chilli.',
  'Grilled Fish Fillet': 'Grilled in a light ajwain marinade, lemon on the side.',
  'Roghni Naan': 'Sesame-topped, brushed with butter straight from the tandoor.',
  'Garlic Naan': 'Garlic and coriander, blistered in the clay oven.',
  'Zeera Rice': 'Basmati tossed with cumin and desi ghee.',
  'Mint Margarita': 'Mint, lemon and soda over crushed ice — the karahi\u2019s best friend.',
  'Fresh Lime Soda': 'Sweet, salted, or mixed — made to order.',
  'Soft Drink (Can)': 'Chilled, your pick at the table.',
  'Mineral Water (1.5L)': 'Large bottle, chilled.',
  'Shahi Kheer': 'Rice pudding set in a clay bowl, silver leaf on top.',
  'Gulab Jamun (2 pcs)': 'Warm, soft, and soaked just right.',
  'Kulfa Falooda': 'Dense kulfa over rose falooda with basil seeds and pistachio.'
};

var state = loadState();
var activeCategory = 'All';
var orderType = 'dine-in';

/* ---------- Cart (persisted so a refresh never loses it) ---------- */
var CART_KEY = 'ck-cart';
var cart = {};
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (e) { cart = {}; }

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ }
}
function cartCount() {
  return Object.keys(cart).reduce(function (s, k) { return s + cart[k]; }, 0);
}
function cartLines() {
  return Object.keys(cart).map(function (id) { return { itemId: id, qty: cart[id] }; })
    .filter(function (l) { return l.qty > 0 && menuItem(state, l.itemId); });
}
function setQty(id, qty) {
  if (qty <= 0) delete cart[id]; else cart[id] = qty;
  saveCart();
  renderDishes(); renderCart();
}

/* ---------- Menu rendering ---------- */
function initials(name) {
  return name.split(' ').filter(function (w) { return /[A-Za-z]/.test(w[0]); })
    .slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
}

function renderChips() {
  var cats = ['All'].concat(CATEGORIES);
  document.getElementById('chips').innerHTML = cats.map(function (c) {
    return '<button class="chip' + (c === activeCategory ? ' is-on' : '') +
      '" data-cat="' + c + '">' + c + '</button>';
  }).join('');
}

function renderDishes() {
  var dishes = state.menu.filter(function (d) {
    return d.available && (activeCategory === 'All' || d.category === activeCategory);
  });
  var grid = document.getElementById('dish-grid');
  document.getElementById('empty').hidden = dishes.length > 0;
  grid.innerHTML = dishes.map(function (d, i) {
    var media = d.photo
      ? '<div class="ph"><img src="' + d.photo + '" alt="' + d.name + '" loading="lazy"></div>'
      : '<div class="ph"><div class="ph-fallback">' + initials(d.name) + '</div></div>';
    var q = cart[d.id] || 0;
    var ctl = q === 0
      ? '<button class="add-btn" data-add="' + d.id + '">Add +</button>'
      : '<span class="qty-mini"><button data-dec="' + d.id + '" aria-label="One less">−</button><span>' + q + '</span><button data-inc="' + d.id + '" aria-label="One more">+</button></span>';
    return '<article class="dish-card" style="animation-delay:' + (i * 60) + 'ms">' + media +
      '<div class="dish-body"><span class="dish-cat">' + d.category + '</span><h3>' + d.name + '</h3>' +
      '<p class="dish-desc">' + (DESCRIPTIONS[d.name] || 'Made fresh to order.') + '</p>' +
      '<div class="dish-foot"><span class="dish-price">' + formatRs(d.price) + '</span>' + ctl + '</div></div></article>';
  }).join('');
}

document.getElementById('chips').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-cat]');
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  renderChips(); renderDishes();
});

document.getElementById('dish-grid').addEventListener('click', function (e) {
  var add = e.target.closest('[data-add]');
  var inc = e.target.closest('[data-inc]');
  var dec = e.target.closest('[data-dec]');
  if (add) setQty(add.dataset.add, 1);
  else if (inc) setQty(inc.dataset.inc, (cart[inc.dataset.inc] || 0) + 1);
  else if (dec) setQty(dec.dataset.dec, (cart[dec.dataset.dec] || 0) - 1);
});

/* ---------- Cart panel ---------- */
function renderCart() {
  var lines = cartLines();
  var bar = document.getElementById('cart-bar');
  var panel = document.getElementById('order-panel');
  var bill = computeBill(priceOrderLines(state, lines), 0);
  bar.hidden = lines.length === 0;
  panel.hidden = lines.length === 0;
  if (!lines.length) return;
  document.getElementById('cart-bar-text').textContent =
    bill.itemCount + (bill.itemCount === 1 ? ' dish' : ' dishes');
  document.getElementById('cart-bar-total').textContent = formatRs(bill.total);
  document.getElementById('cart-lines').innerHTML = lines.map(function (l) {
    var item = menuItem(state, l.itemId);
    return '<div class="cart-line"><span class="cl-name">' + item.name + '</span>' +
      '<span class="qty-mini"><button data-cdec="' + l.itemId + '">−</button><span>' + l.qty + '</span><button data-cinc="' + l.itemId + '">+</button></span>' +
      '<span class="cl-total">' + formatRs(item.price * l.qty) + '</span></div>';
  }).join('');
  document.getElementById('cart-totals').innerHTML =
    '<div><span>Subtotal</span><span>' + formatRs(bill.subtotal) + '</span></div>' +
    '<div><span>Tax (5%)</span><span>' + formatRs(bill.tax) + '</span></div>' +
    '<div class="grand"><span>Total</span><span>' + formatRs(bill.total) + '</span></div>';
  var sel = document.getElementById('ord-table');
  if (!sel.options.length) {
    sel.innerHTML = state.tables.map(function (t) {
      return '<option value="' + t.id + '">' + t.name + ' (' + t.seats + ' seats)</option>';
    }).join('');
  }
}

document.getElementById('cart-lines').addEventListener('click', function (e) {
  var inc = e.target.closest('[data-cinc]');
  var dec = e.target.closest('[data-cdec]');
  if (inc) setQty(inc.dataset.cinc, (cart[inc.dataset.cinc] || 0) + 1);
  else if (dec) setQty(dec.dataset.cdec, (cart[dec.dataset.cdec] || 0) - 1);
});

document.getElementById('cart-bar').addEventListener('click', function () {
  document.getElementById('order-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('type-toggle').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-type]');
  if (!btn) return;
  orderType = btn.dataset.type;
  this.querySelectorAll('.chip').forEach(function (c) {
    c.classList.toggle('is-on', c.dataset.type === orderType);
  });
  document.getElementById('table-field').hidden = orderType !== 'dine-in';
});

/* ---------- Placing the order ---------- */
function digits(s) { return String(s || '').replace(/\D/g, ''); }

document.getElementById('place-order').addEventListener('click', function () {
  var err = document.getElementById('ord-error');
  function fail(msg) { err.textContent = msg; err.hidden = false; }
  err.hidden = true;
  state = loadState(); // pick up any menu changes before pricing the order
  var lines = cartLines();
  if (!lines.length) return fail('Your cart is empty — add a dish first.');
  var name = document.getElementById('ord-name').value.trim();
  var phone = document.getElementById('ord-phone').value.trim();
  if (name.length < 3) return fail('Please add your name so we can call the order out.');
  if (digits(phone).length < 10) return fail('Please add a valid phone number — it is how you track the order.');
  var order = {
    id: 'o' + Date.now().toString(36),
    ref: newOrderRef(state.onlineOrders),
    name: name,
    phone: phone,
    type: orderType,
    tableId: orderType === 'dine-in' ? document.getElementById('ord-table').value : null,
    lines: lines,
    notes: document.getElementById('ord-notes').value.trim(),
    status: 'placed',
    placedAt: new Date().toISOString(),
    kitchenKey: null
  };
  state.onlineOrders.push(order);
  saveState(state);
  cart = {}; saveCart();
  renderDishes(); renderCart();
  var success = document.getElementById('order-success');
  success.hidden = false;
  document.getElementById('success-text').innerHTML =
    'Reference <strong>' + order.ref + '</strong> — ' +
    (order.type === 'dine-in'
      ? 'your order is with our team for <strong>' + (tableById(state, order.tableId) || {}).name + '</strong>. A waiter will confirm it in a moment.'
      : 'your takeaway is with our team. We will have it ready at the counter.');
  success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('track-phone').value = phone;
  renderTracking(phone);
});

/* ---------- Tracking ---------- */
function statusChip(order) {
  if (order.status === 'cancelled') return '<span class="status-chip st-cancelled">Cancelled</span>';
  if (order.status === 'completed') return '<span class="status-chip st-done">Completed</span>';
  if (order.status === 'placed') return '<span class="status-chip st-placed">Placed — waiting for the waiter</span>';
  var tk = order.kitchenKey ? ticketFor(state, order.kitchenKey) : null;
  if (tk && tk.status === 'ready') return '<span class="status-chip st-ready">Ready!</span>';
  if (tk && tk.status === 'served') return '<span class="status-chip st-done">Served</span>';
  return '<span class="status-chip st-kitchen">In the kitchen</span>';
}

function renderTracking(phone) {
  state = loadState();
  var mine = state.onlineOrders.filter(function (o) {
    return digits(o.phone) === digits(phone);
  }).slice().reverse();
  var box = document.getElementById('track-results');
  if (!digits(phone)) { box.innerHTML = ''; return; }
  if (!mine.length) {
    box.innerHTML = '<p class="empty-note" style="margin-top:14px">No orders found for that number yet.</p>';
    return;
  }
  box.innerHTML = mine.map(function (o) {
    var items = priceOrderLines(state, o.lines).map(function (l) {
      return l.name + ' × ' + l.qty;
    }).join(' · ');
    return '<div class="track-order"><div class="track-head"><strong>' + o.ref + '</strong>' +
      statusChip(o) + '</div>' +
      '<p>' + items + '</p>' +
      '<p class="track-meta">' + (o.type === 'dine-in' ? 'Dine-in' : 'Takeaway') +
      ' · ' + formatRs(onlineOrderTotal(state, o)) +
      ' · ' + new Date(o.placedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) + '</p></div>';
  }).join('');
}

document.getElementById('track-btn').addEventListener('click', function () {
  renderTracking(document.getElementById('track-phone').value);
});

/* Live updates while the guest watches (same-device tabs) */
window.addEventListener('storage', function (e) {
  if (e.key === STORE_KEY) {
    state = loadState();
    renderDishes(); renderCart();
    var p = document.getElementById('track-phone').value;
    if (digits(p)) renderTracking(p);
  }
});

renderChips();
renderDishes();
renderCart();
