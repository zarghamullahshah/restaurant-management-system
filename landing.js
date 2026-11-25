/* The Copper Kitchen — landing page motion
   Scroll reveals (IntersectionObserver, one-shot), animated counters,
   3D hero tilt with parallax float cards, sticky nav, scroll progress.
   Vanilla JS, respects prefers-reduced-motion. */

'use strict';

var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Scroll reveals ---------- */
(function reveals() {
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(function (n) { setFinal(n); });
    return;
  }
  items.forEach(function (n, i) {
    n.classList.add('pre');
    n.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        e.target.classList.remove('pre');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (n) { io.observe(n); });

  function setFinal(n) { n.classList.remove('pre'); n.classList.add('in'); }
})();

/* ---------- Animated counters ---------- */
(function counters() {
  var nums = document.querySelectorAll('.count');
  function run(node) {
    var target = Number(node.dataset.count) || 0;
    if (reduced) { node.textContent = target.toLocaleString('en-PK'); return; }
    var start = null, dur = 1500;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
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

/* ---------- 3D hero tilt + parallax float cards ---------- */
(function tilt() {
  var stage = document.getElementById('hero-stage');
  var card = document.getElementById('tilt');
  if (!stage || !card || reduced) return;
  var raf = null;
  stage.addEventListener('mousemove', function (e) {
    var r = stage.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5;
    var y = (e.clientY - r.top) / r.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      card.style.transform = 'rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 9) + 'deg)';
      card.querySelectorAll('.float-card').forEach(function (f) {
        var d = Number(f.dataset.depth) || 20;
        f.style.translate = (x * d * 0.6) + 'px ' + (y * d * 0.6) + 'px';
      });
    });
  });
  stage.addEventListener('mouseleave', function () {
    card.style.transform = 'rotateY(0deg) rotateX(0deg)';
    card.querySelectorAll('.float-card').forEach(function (f) { f.style.translate = '0px 0px'; });
  });

  /* Gentle idle sway until the visitor first touches it */
  var idle = true;
  stage.addEventListener('pointerdown', function () { idle = false; }, { once: true });
  var t0 = null;
  function sway(ts) {
    if (!idle) return;
    if (!t0) t0 = ts;
    var t = (ts - t0) / 1000;
    card.style.transform = 'rotateY(' + Math.sin(t * 0.6) * 4 + 'deg) rotateX(' + Math.cos(t * 0.5) * 3 + 'deg)';
    requestAnimationFrame(sway);
  }
  requestAnimationFrame(sway);
  stage.addEventListener('mouseenter', function () { idle = false; }, { once: true });
})();

/* ---------- Feature card micro-tilt ---------- */
(function cardTilt() {
  if (reduced) return;
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

/* ---------- Scroll parallax on photography ---------- */
(function parallax() {
  if (reduced) return;
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (!nodes.length) return;
  var ticking = false;
  function update() {
    var vh = window.innerHeight;
    nodes.forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var speed = Number(n.dataset.parallax) || 0.05;
      var centre = (r.top + r.height / 2 - vh / 2) / vh; // -0.5 .. 0.5
      n.style.transform = 'scale(1.12) translateY(' + (centre * speed * -220) + 'px)';
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ---------- Film band controls ---------- */
(function film() {
  var video = document.getElementById('film');
  var btn = document.getElementById('film-toggle');
  if (!video) return;
  if (reduced) { video.removeAttribute('autoplay'); video.pause(); if (btn) btn.textContent = 'Play'; }
  if (btn) btn.addEventListener('click', function () {
    if (video.paused) { video.play(); btn.textContent = 'Pause'; }
    else { video.pause(); btn.textContent = 'Play'; }
  });
})();

/* ---------- Sticky nav + scroll progress ---------- */
(function navAndProgress() {
  var nav = document.getElementById('nav');
  var bar = document.getElementById('scroll-progress');
  var ticking = false;
  function update() {
    var y = window.scrollY || 0;
    nav.classList.toggle('is-stuck', y > 24);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* ---------- Hero headline — word-by-word entrance ---------- */
(function heroTitle() {
  var h = document.getElementById('hero-title');
  if (!h || reduced) return;
  var i = 0;
  function wrapWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part;
          frag.appendChild(s);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        wrapWords(child);
      } else if (child.nodeType === 1 && child.tagName === 'BR') {
        // keep line break
      }
    });
  }
  wrapWords(h);
})();

/* ---------- Header — hide on scroll down, show on scroll up + scrollspy + mobile menu ---------- */
(function headerMotion() {
  var nav = document.getElementById('nav');
  if (!nav) return;
  var lastY = 0, ticking = false;
  function update() {
    var y = window.scrollY || 0;
    if (y > 420 && y > lastY + 6) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y <= 420) nav.classList.remove('is-hidden');
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  var burger = document.getElementById('nav-burger');
  var menu = document.getElementById('mobile-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('is-open'); burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var links = Array.prototype.slice.call(document.querySelectorAll('[data-spy]'));
  if ('IntersectionObserver' in window && links.length) {
    var byId = {};
    links.forEach(function (l) { byId[l.dataset.spy] = l; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          if (byId[e.target.id]) byId[e.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-38% 0px -55% 0px' });
    links.forEach(function (l) {
      var sec = document.getElementById(l.dataset.spy);
      if (sec) spy.observe(sec);
    });
  }
})();

/* ---------- Hero — photo parallax on scroll + magnetic buttons ---------- */
(function heroMotion() {
  if (reduced) return;
  var photo = document.getElementById('hero-photo');
  var ticking = false;
  function update() {
    var y = window.scrollY || 0;
    if (photo && y < window.innerHeight * 1.2) photo.style.translate = '0 ' + (y * 0.22) + 'px';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  document.querySelectorAll('.btn-magnetic').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      btn.style.transform = 'translate(' + (x * 7) + 'px,' + (y * 6 - 2) + 'px)';
    });
    btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
  });
})();
