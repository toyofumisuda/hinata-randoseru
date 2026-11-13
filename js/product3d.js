/* Hinata — renders a live 3D model into every [data-model] element. */
import * as THREE from 'three';
import { setupEnvironment, makeGlowTexture } from './core.js';
import { createRandoseru, createTrio, createPencase, createBuzzer } from './models.js';

const gsap = window.gsap;

const BUILDERS = {
  randoseru: (el) => {
    const r = createRandoseru({ color: el.dataset.color || 'red', classic: el.dataset.variant === 'classic' });
    const back = el.dataset.view === 'back';
    const open = el.dataset.open === '1';
    return {
      group: r.group, elev: 0.2, yaw: back ? Math.PI - 0.6 : -0.55, fit: 0.95,
      setFinal() { r.state.open = open ? 1 : 0; r.apply(); },
      setStart() { r.state.open = 0; r.apply(); },
      intro(g) {
        g.from(r.group.rotation, { y: -Math.PI * 1.2, duration: 2.4, ease: 'expo.out' });
        const tl = g.timeline({ delay: 1.0, onUpdate: r.apply });
        tl.to(r.state, { open: 1, duration: 1.3, ease: 'power2.inOut' });
        if (!open) tl.to(r.state, { open: 0, duration: 1.2, ease: 'power2.inOut' }, '+=0.9');
      },
    };
  },
  trio: () => createTrio(),
  pencase: () => createPencase(),
  buzzer: () => createBuzzer(),
};

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(60,25,10,.55)');
  r.addColorStop(0.5, 'rgba(60,25,10,.18)');
  r.addColorStop(1, 'rgba(60,25,10,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mount(el) {
  const build = BUILDERS[el.dataset.model];
  if (!build) return;
  const dark = el.dataset.theme === 'dark';

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 1.05 : 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  setupEnvironment(renderer, scene);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);

  if (dark) {
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5);
    const r1 = new THREE.DirectionalLight(0xff9a4d, 4.2); r1.position.set(-4, 1.5, -3);
    const r2 = new THREE.DirectionalLight(0xff5c8a, 3.2); r2.position.set(4, -1, -3);
    scene.add(key, r1, r2);
  } else {
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4);
    const fill = new THREE.DirectionalLight(0xfff1e6, 0.8); fill.position.set(-4, 2, 3);
    const rim = new THREE.DirectionalLight(0xffb27a, 1.8); rim.position.set(-3, 2, -4);
    scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0xf4e8e0, 0.6));
  }

  const model = build(el);
  /* fit: measure the finished pose, then centre it */
  model.setFinal();
  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  spin.add(model.group);
  pivot.add(spin);
  scene.add(pivot);
  const box = new THREE.Box3().setFromObject(model.group);
  const center = box.getCenter(new THREE.Vector3());
  model.group.position.sub(center);
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.62;

  if (dark) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 5, radius * 5),
      new THREE.MeshBasicMaterial({ map: makeGlowTexture(), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.z = -radius * 1.6;
    scene.add(glow);
  } else {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.5, Math.max(size.z, size.x * 0.5) * 1.6),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = -size.y / 2 - 0.02;
    pivot.add(sh);
  }

  const fov = THREE.MathUtils.degToRad(camera.fov);
  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const hf = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
    const dist = (radius / Math.sin(Math.min(fov, hf) / 2)) * (model.fit || 1) * parseFloat(el.dataset.zoom || 1);
    const e = model.elev || 0;
    camera.position.set(0, Math.sin(e) * dist, Math.cos(e) * dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  el.appendChild(renderer.domElement);
  const fallback = el.querySelector('img');
  if (fallback) fallback.hidden = true;
  resize();
  new ResizeObserver(resize).observe(el);

  /* interaction: drag to turn, gentle pointer tilt */
  let drag = null, yawOff = 0, vel = 0, tiltX = 0, tiltY = 0, tx = 0, ty = 0;
  el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX }; vel = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    tx = ((e.clientY - r.top) / r.height - 0.5) * 0.12;
    ty = ((e.clientX - r.left) / r.width - 0.5) * 0.2;
    if (!drag) return;
    const dx = (e.clientX - drag.x) / r.width * 4;
    drag.x = e.clientX; yawOff += dx; vel = dx;
  });
  const end = () => { drag = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  /* intro when first seen */
  let started = false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (gsap && !reduce) model.setStart();

  const clock = new THREE.Clock();
  const sway = model.sway ?? 0.28;
  renderer.setAnimationLoop(() => {
    const rc = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rc.bottom < 0 || rc.top > vh || !rc.width) return;
    if (!started && rc.top < vh * 0.8) {
      started = true;
      if (gsap && !reduce) model.intro(gsap);
    }
    const t = clock.getElapsedTime();
    if (!drag) { yawOff += vel; vel *= 0.92; }
    tiltX += (tx - tiltX) * 0.06; tiltY += (ty - tiltY) * 0.06;
    spin.rotation.y = (model.yaw || 0) + Math.sin(t * 0.35) * sway + yawOff + tiltY;
    pivot.rotation.x = tiltX;
    pivot.position.y = Math.sin(t * 0.9) * radius * 0.012;
    scene.updateMatrixWorld();
    if (model.update) model.update(t);
    renderer.render(scene, camera);
  });
}

document.querySelectorAll('[data-model]').forEach((el) => {
  try { mount(el); } catch (err) { console.warn('3D model disabled:', err); }
});
