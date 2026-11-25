/* The Copper Kitchen — landing page motion
   Igloo-grade grammar in vanilla JS: a loader entry, inertia smooth
   scrolling, masked-word headline reveals, a scroll-driven horizontal
   gallery and a chapter rail — all fed by ONE rAF loop that lerps every
   value, so nothing ever snaps. Transform + opacity only.
   prefers-reduced-motion turns the whole engine off. */

'use strict';

var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var finePointer = window.matchMedia('(pointer: fine)').matches;

/* ================= Loader ================= */
var loaderDone = false;
(function loader() {
  var el = document.getElementById('loader');
  var pct = document.getElementById('loader-pct');
  if (!el) { loaderDone = true; return; }
  if (reduced || sessionStorage.getItem('ck-intro')) {
    el.style.display = 'none'; loaderDone = true; return;
  }
  document.body.classList.add('loading');
  var start = null, DUR = 1050;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min(1, (ts - start) / DUR);
    var eased = 1 - Math.pow(1 - p, 3);
    if (pct) pct.textContent = Math.round(eased * 100);
    if (p < 1) { requestAnimationFrame(step); return; }
    sessionStorage.setItem('ck-intro', '1');
    el.classList.add('done');
    document.body.classList.remove('loading');
    loaderDone = true;
    setTimeout(function () { el.style.display = 'none'; }, 950);
  }
  requestAnimationFrame(step);
  el.addEventListener('click', function () {
    sessionStorage.setItem('ck-intro', '1');
    el.classList.add('done');
    document.body.classList.remove('loading');
    loaderDone = true;
    setTimeout(function () { el.style.display = 'none'; }, 950);
  });
})();

/* ================= Hero title — word cascade ================= */
(function heroSplit() {
  var h = document.getElementById('hero-title');
  if (!h || reduced) return;
  var i = 0;
  function wrapWord(text) {
    var s = document.createElement('span');
    s.className = 'w';
    s.textContent = text;
    s.style.setProperty('--i', i);
    s.style.animationDelay = (1020 + i * 78) + 'ms'; // plays as the curtain lifts
    i++;
    return s;
  }
  Array.prototype.slice.call(h.childNodes).forEach(function (node) {
    if (node.nodeType === 3) {
      var frag = document.createDocumentFragment();
      node.textContent.split(/\s+/).filter(Boolean).forEach(function (w) {
        frag.appendChild(wrapWord(w));
        frag.appendChild(document.createTextNode(' '));
      });
      h.replaceChild(frag, node);
    } else if (node.nodeType === 1) {
      var s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', i);
      s.style.animationDelay = (1020 + i * 78) + 'ms';
      i++;
      node.parentNode.insertBefore(s, node);
      s.appendChild(node);
    }
  });
})();

/* ================= Masked-word reveals (section headlines) ============ */
(function splitHeads() {
  var heads = document.querySelectorAll('h2[data-split]');
  if (reduced || !('IntersectionObserver' in window)) return;
  heads.forEach(function (h) {
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach(function (w, idx) {
      var mask = document.createElement('span'); mask.className = 'wm';
      var inner = document.createElement('span'); inner.className = 'wi';
      inner.textContent = w;
      inner.style.transitionDelay = (idx * 42) + 'ms';
      mask.appendChild(inner);
      h.appendChild(mask);
      h.appendChild(document.createTextNode(' '));
    });
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('split-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.35 });
  heads.forEach(function (h) { io.observe(h); });
})();

/* ================= Inertia smooth scroll ================= */
var smooth = null;
(function smoothScroll() {
  if (reduced || !finePointer) return;
  document.documentElement.style.scrollBehavior = 'auto';
  var max = function () { return document.documentElement.scrollHeight - window.innerHeight; };
  smooth = { target: window.scrollY || 0, current: window.scrollY || 0, self: false };
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return; // pinch-zoom gesture
    if (document.body.classList.contains('loading')) return;
    e.preventDefault();
    var d = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1);
    smooth.target = Math.max(0, Math.min(max(), smooth.target + d));
  }, { passive: false });
  window.addEventListener('scroll', function () {
    if (!smooth.self) { // keyboard / scrollbar / native jump — adopt it
      smooth.target = window.scrollY; smooth.current = window.scrollY;
    }
    smooth.self = false;
  }, { passive: true });
  window.addEventListener('resize', function () {
    smooth.target = Math.max(0, Math.min(max(), smooth.target));
  });
  smooth.goTo = function (y) { smooth.target = Math.max(0, Math.min(max(), y)); };
})();

/* Anchor links ride the smooth scroll when it is active */
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    var y = el.getBoundingClientRect().top + window.scrollY - 80;
    if (smooth) smooth.goTo(y); else window.scrollTo({ top: y, behavior: 'smooth' });
    var menu = document.getElementById('mobile-menu');
    var burger = document.getElementById('nav-burger');
    if (menu && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open'); burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
});

/* Rail clicks */
document.querySelectorAll('#rail a').forEach(function (a) {
  a.addEventListener('click', function () {
    var key = a.dataset.chapter;
    var el = key === 'top' ? document.querySelector('.hero') : document.getElementById(key);
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - 70;
    if (smooth) smooth.goTo(y); else window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

/* ================= Mobile menu ================= */
(function burger() {
  var b = document.getElementById('nav-burger');
  var m = document.getElementById('mobile-menu');
  if (!b || !m) return;
  b.addEventListener('click', function () {
    var open = m.classList.toggle('is-open');
    b.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

/* ================= Magnetic buttons ================= */
(function magnetic() {
  if (reduced || !finePointer) return;
  document.querySelectorAll('.btn-magnetic').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) / r.width;
      var y = (e.clientY - r.top - r.height / 2) / r.height;
      btn.style.transform = 'translate(' + (x * 7) + 'px,' + (y * 6 - 2) + 'px)';
    });
    btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
  });
})();

/* ================= Scroll reveals ================= */
(function reveals() {
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'))
    .filter(function (n) { return !n.hasAttribute('data-split'); });
  if (reduced || !('IntersectionObserver' in window)) return;
  items.forEach(function (n) {
    var siblings = Array.prototype.filter.call(
      n.parentNode.children,
      function (c) { return c.classList && c.classList.contains('reveal'); }
    );
    var idx = Math.min(siblings.indexOf(n), 3);
    n.style.transitionDelay = (idx * 65) + 'ms';
    n.classList.add('pre');
    n.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'transform') {
        n.style.transitionDelay = '0ms';
        n.removeEventListener('transitionend', handler);
      }
    });
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        e.target.classList.remove('pre');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (n) { io.observe(n); });
})();

/* ================= Counters ================= */
(function counters() {
  var nums = document.querySelectorAll('.count');
  function run(node) {
    var target = Number(node.dataset.count) || 0;
    if (reduced) { node.textContent = target.toLocaleString('en-PK'); return; }
    var start = null, dur = 1800;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      node.textContent = Math.round(target * eased).toLocaleString('en-PK');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  nums.forEach(function (n) { io.observe(n); });
})();

/* ================= Chapter spy (rail + nav) ================= */
(function spy() {
  if (!('IntersectionObserver' in window)) return;
  var map = [
    ['top', document.querySelector('.hero')],
    ['film', document.getElementById('film')],
    ['features', document.getElementById('features')],
    ['experience', document.getElementById('experience')],
    ['showcase', document.getElementById('showcase')],
    ['reviews', document.getElementById('reviews')]
  ].filter(function (p) { return p[1]; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var pair = map.filter(function (p) { return p[1] === e.target; })[0];
      if (!pair) return;
      document.querySelectorAll('#rail a').forEach(function (a) {
        a.classList.toggle('is-on', a.dataset.chapter === pair[0]);
      });
      document.querySelectorAll('.nav-links a[data-spy]').forEach(function (a) {
        a.classList.toggle('is-active', a.dataset.spy === pair[0]);
      });
    });
  }, { rootMargin: '-42% 0px -50% 0px' });
  map.forEach(function (p) { io.observe(p[1]); });
})();

/* ================= The engine: one loop, everything lerped ============ */
(function engine() {
  var stage = document.getElementById('hero-stage');
  var card = document.getElementById('tilt');
  var nav = document.getElementById('nav');
  var bar = document.getElementById('scroll-progress');
  var floats = card ? Array.prototype.slice.call(card.querySelectorAll('.float-card')) : [];
  var pxNodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var hgal = document.getElementById('gallery');
  var htrack = document.getElementById('hgal-track');
  var hgalOn = hgal && htrack && !reduced && window.innerWidth > 760;
  if (hgalOn) {
    var setH = function () {
      hgal.style.height = (htrack.scrollWidth - window.innerWidth + window.innerHeight) + 'px';
    };
    setH();
    window.addEventListener('resize', setH);
  }

  var tRX = 0, tRY = 0, cRX = 0, cRY = 0, hovering = false, swayT = 0;
  var fTX = 0, fTY = 0, fCX = 0, fCY = 0;
  if (stage && card && finePointer && !reduced) {
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      tRY = x * 10; tRX = -y * 9; fTX = x; fTY = y; hovering = true;
    });
    stage.addEventListener('mouseleave', function () {
      hovering = false; tRX = 0; tRY = 0; fTX = 0; fTY = 0;
    });
  }

  var lastY = -1, lastDirY = 0;
  function frame() {
    /* Smooth scroll step */
    if (smooth) {
      var diff = smooth.target - smooth.current;
      if (Math.abs(diff) > 0.05) {
        smooth.current += diff * 0.085;
        smooth.self = true;
        window.scrollTo(0, smooth.current);
      } else if (Math.abs(diff) > 0) {
        smooth.current = smooth.target;
        smooth.self = true;
        window.scrollTo(0, smooth.current);
      }
    }

    /* Hero tilt */
    if (card && !reduced) {
      if (!hovering) {
        swayT += 0.008;
        tRY = Math.sin(swayT) * 3.6;
        tRX = Math.cos(swayT * 0.85) * 2.6;
      }
      cRX += (tRX - cRX) * 0.065;
      cRY += (tRY - cRY) * 0.065;
      fCX += (fTX - fCX) * 0.05;
      fCY += (fTY - fCY) * 0.05;
      card.style.transform = 'rotateY(' + cRY.toFixed(3) + 'deg) rotateX(' + cRX.toFixed(3) + 'deg)';
      floats.forEach(function (f) {
        var d = Number(f.dataset.depth) || 20;
        f.style.translate = (fCX * d * 0.6).toFixed(2) + 'px ' + (fCY * d * 0.6).toFixed(2) + 'px';
      });
    }

    var y = window.scrollY || 0;
    if (y !== lastY) {
      if (nav) {
        nav.classList.toggle('is-stuck', y > 24);
        if (y > lastDirY + 5 && y > 520) nav.classList.add('is-hidden');
        else if (y < lastDirY - 5) nav.classList.remove('is-hidden');
        if (Math.abs(y - lastDirY) > 5) lastDirY = y;
      }
      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (h > 0 ? (y / h).toFixed(4) : 0) + ')';
      }
      var vh = window.innerHeight;
      pxNodes.forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        var speed = Number(n.dataset.parallax) || 0.05;
        var centre = (r.top + r.height / 2 - vh / 2) / vh;
        n._pxTarget = centre * speed * -220;
        if (n._pxCur === undefined) n._pxCur = n._pxTarget;
      });
      /* Horizontal gallery progress */
      if (hgalOn) {
        var r2 = hgal.getBoundingClientRect();
        var total = hgal.offsetHeight - vh;
        var p = total > 0 ? Math.max(0, Math.min(1, -r2.top / total)) : 0;
        var maxShift = htrack.scrollWidth - window.innerWidth + window.innerWidth * 0.10;
        htrack._hxTarget = -p * maxShift;
        if (htrack._hxCur === undefined) htrack._hxCur = htrack._hxTarget;
      }
      lastY = y;
    }
    pxNodes.forEach(function (n) {
      if (n._pxTarget === undefined || reduced) return;
      n._pxCur += (n._pxTarget - n._pxCur) * 0.075;
      n.style.transform = 'scale(1.12) translateY(' + n._pxCur.toFixed(2) + 'px)';
    });
    if (hgalOn && htrack._hxTarget !== undefined) {
      htrack._hxCur += (htrack._hxTarget - htrack._hxCur) * 0.09;
      htrack.style.transform = 'translate3d(' + htrack._hxCur.toFixed(1) + 'px,0,0)';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ================= Feature card micro-tilt ================= */
(function cardTilt() {
  if (reduced || !finePointer) return;
  document.querySelectorAll('[data-tilt-card]').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(800px) rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', function () { card.style.transform = ''; });
  });
})();

/* ================= Film band ================= */
(function film() {
  var video = document.getElementById('film-video');
  var btn = document.getElementById('film-toggle');
  if (!video) return;
  if (reduced) { video.removeAttribute('autoplay'); video.pause(); if (btn) btn.textContent = 'Play'; }
  if (btn) btn.addEventListener('click', function () {
    if (video.paused) { video.play(); btn.textContent = 'Pause'; }
    else { video.pause(); btn.textContent = 'Play'; }
  });
})();
