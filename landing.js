/* The Copper Kitchen — landing page motion
   Built for smoothness: one shared rAF loop drives the tilt, parallax and
   scroll progress with lerp (exponential) smoothing, so nothing ever snaps
   or jitters. Reveals use a long easeOutExpo-style curve with small
   per-group staggers. Transform + opacity only; prefers-reduced-motion
   turns the whole engine off. */

'use strict';

var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Scroll reveals ---------- */
(function reveals() {
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduced || !('IntersectionObserver' in window)) return; // visible by default

  /* Stagger by position among reveal-siblings, never by global index —
     a section deep in the page should not inherit a long delay. */
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
        n.style.willChange = 'auto';
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

/* ---------- Animated counters (easeOutExpo, gentle landing) ---------- */
(function counters() {
  var nums = document.querySelectorAll('.count');
  function run(node) {
    var target = Number(node.dataset.count) || 0;
    if (reduced) { node.textContent = target.toLocaleString('en-PK'); return; }
    var start = null, dur = 1800;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
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

/* ---------- The smooth engine: tilt + parallax + progress, one loop --- */
(function engine() {
  if (reduced) {
    var nav0 = document.getElementById('nav');
    if (nav0) nav0.classList.add('is-stuck');
    return;
  }

  var stage = document.getElementById('hero-stage');
  var card = document.getElementById('tilt');
  var nav = document.getElementById('nav');
  var bar = document.getElementById('scroll-progress');
  var floats = card ? Array.prototype.slice.call(card.querySelectorAll('.float-card')) : [];
  var pxNodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));

  /* Tilt state: target vs current, lerped every frame. */
  var tRX = 0, tRY = 0, cRX = 0, cRY = 0, hovering = false, swayT = 0;
  var fTX = 0, fTY = 0, fCX = 0, fCY = 0;
  if (stage && card) {
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

  var lastScroll = -1;
  function frame() {
    /* Hero tilt with idle sway that hands over smoothly to the mouse. */
    if (card) {
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

    /* Scroll-driven work, only when the scroll position actually changed. */
    var y = window.scrollY || 0;
    if (y !== lastScroll) {
      lastScroll = y;
      if (nav) nav.classList.toggle('is-stuck', y > 24);
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
        /* Target stored on the node; the lerp below eases toward it. */
        n._pxTarget = centre * speed * -220;
        if (n._pxCur === undefined) n._pxCur = n._pxTarget;
      });
    }
    /* Parallax easing runs every frame so motion settles like silk. */
    pxNodes.forEach(function (n) {
      if (n._pxTarget === undefined) return;
      n._pxCur += (n._pxTarget - n._pxCur) * 0.075;
      n.style.transform = 'scale(1.12) translateY(' + n._pxCur.toFixed(2) + 'px)';
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------- Feature card micro-tilt (lerped via CSS transition) ------ */
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
