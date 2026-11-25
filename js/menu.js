/* The Copper Kitchen — guest menu page
   Renders the LIVE menu from the shared store: dishes the manager marks
   sold out disappear here, price changes show up immediately. */

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
    return '<article class="dish-card" style="animation-delay:' + (i * 60) + 'ms">' + media +
      '<div class="dish-body"><span class="dish-cat">' + d.category + '</span><h3>' + d.name + '</h3>' +
      '<p class="dish-desc">' + (DESCRIPTIONS[d.name] || 'Made fresh to order.') + '</p>' +
      '<span class="dish-price">' + formatRs(d.price) + '</span></div></article>';
  }).join('');
}

document.getElementById('chips').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-cat]');
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  renderChips(); renderDishes();
});

renderChips();
renderDishes();
