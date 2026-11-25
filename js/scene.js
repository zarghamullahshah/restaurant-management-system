/* The Copper Kitchen — the living scene (WebGL)
   Igloo's grammar is not CSS tricks: it is ONE continuous 3D world
   behind the whole page, and scrolling moves the CAMERA through it.
   This module builds that world with Three.js: a copper serving cloche
   (lathe-turned geometry, real metal reflections), embers rising from
   the grill, warm fog — and a camera that dollies and orbits as the
   visitor travels down the page. Content floats above it on sheets.

   Graceful by design: if WebGL or the CDN is unavailable, the page
   keeps its photographic design untouched (body.webgl is only added
   once the scene is actually running). prefers-reduced-motion gets a
   single still frame. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

var canvas = document.getElementById('gl');
var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail() {
  if (canvas) canvas.style.display = 'none';
}

try { init(); } catch (e) { fail(); }

function init() {
  if (!canvas) return;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0a07);
  scene.fog = new THREE.FogExp2(0x0d0a07, 0.045);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.4, 10);

  /* ---- Lights: warm key, copper rim ---- */
  scene.add(new THREE.AmbientLight(0x2a1f14, 1.2));
  var key = new THREE.DirectionalLight(0xffe3b3, 2.2);
  key.position.set(4, 6, 6);
  scene.add(key);
  var rim = new THREE.PointLight(0xb26a2b, 60, 30);
  rim.position.set(-5, 2, -3);
  scene.add(rim);

  /* ---- The cloche: lathe-turned profile, polished copper ---- */
  var pts = [];
  pts.push(new THREE.Vector2(0.0, 0.02));
  pts.push(new THREE.Vector2(1.55, 0.02));
  pts.push(new THREE.Vector2(1.62, 0.10));
  pts.push(new THREE.Vector2(1.60, 0.20));
  pts.push(new THREE.Vector2(1.38, 0.62));
  pts.push(new THREE.Vector2(1.02, 0.98));
  pts.push(new THREE.Vector2(0.62, 1.18));
  pts.push(new THREE.Vector2(0.30, 1.28));
  pts.push(new THREE.Vector2(0.16, 1.34));
  pts.push(new THREE.Vector2(0.17, 1.46));
  pts.push(new THREE.Vector2(0.10, 1.54));
  pts.push(new THREE.Vector2(0.0, 1.56));
  var clocheGeo = new THREE.LatheGeometry(pts, 72);
  var copper = new THREE.MeshStandardMaterial({
    color: 0xc47b3a, metalness: 1.0, roughness: 0.28
  });
  var cloche = new THREE.Mesh(clocheGeo, copper);
  cloche.position.set(2.1, -0.9, -1.2);
  cloche.scale.setScalar(1.35);
  scene.add(cloche);

  /* Serving plate under the cloche */
  var plate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.95, 2.05, 0.09, 72),
    new THREE.MeshStandardMaterial({ color: 0x8a5a28, metalness: 1.0, roughness: 0.4 })
  );
  plate.position.set(2.1, -0.98, -1.2);
  plate.scale.setScalar(1.35);
  scene.add(plate);

  /* ---- Embers: points with a soft radial sprite ---- */
  function emberTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,220,170,1)');
    grad.addColorStop(0.35, 'rgba(232,163,92,0.75)');
    grad.addColorStop(1, 'rgba(232,163,92,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var COUNT = 420;
  var pos = new Float32Array(COUNT * 3);
  var speed = new Float32Array(COUNT);
  for (var i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = Math.random() * 12 - 3;
    pos[i * 3 + 2] = -Math.random() * 9 + 1;
    speed[i] = 0.25 + Math.random() * 0.85;
  }
  var emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    map: emberTexture(), color: 0xe8a35c, size: 0.16, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(embers);

  document.body.classList.add('webgl');

  var maxScroll = function () {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };
  var smoothP = 0; // lerped scroll progress — the camera never snaps
  var mouseX = 0, mouseY = 0, smX = 0, smY = 0;
  if (window.matchMedia('(pointer: fine)').matches && !reduced) {
    window.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
  }

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    var t = clock.getElapsedTime();
    var targetP = Math.min(1, Math.max(0, (window.scrollY || 0) / maxScroll()));
    smoothP += (targetP - smoothP) * 0.06;
    smX += (mouseX - smX) * 0.04;
    smY += (mouseY - smY) * 0.04;
    var p = smoothP;

    /* Camera travel: dolly in, gentle orbit, mouse parallax on top */
    camera.position.x = Math.sin(p * Math.PI * 0.55) * -2.4 + smX * 0.7;
    camera.position.y = 0.4 - p * 1.1 - smY * 0.5;
    camera.position.z = 10 - p * 4.2;
    camera.lookAt(0.6, -0.2, -1);

    /* The cloche turns with the journey and breathes when idle */
    cloche.rotation.y = p * Math.PI * 1.6 + t * 0.05;
    plate.rotation.y = cloche.rotation.y;
    var drift = 2.1 - p * 3.4;
    cloche.position.x = drift;
    plate.position.x = drift;
    cloche.position.y = -0.9 + Math.sin(t * 0.6) * 0.07;
    plate.position.y = -0.98 + Math.sin(t * 0.6) * 0.07;

    /* Embers rise forever, swaying like heat over a grill */
    var arr = emberGeo.attributes.position.array;
    for (var j = 0; j < COUNT; j++) {
      arr[j * 3 + 1] += speed[j] * 0.011;
      arr[j * 3] += Math.sin(t * 0.7 + j) * 0.0016;
      if (arr[j * 3 + 1] > 9) {
        arr[j * 3 + 1] = -3;
        arr[j * 3] = (Math.random() - 0.5) * 22;
      }
    }
    emberGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  if (reduced) {
    renderer.render(scene, camera); // one still frame, no journey
  } else {
    frame();
  }
}
