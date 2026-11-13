/* Hinata Air page — interactive 3D viewer with colour picker and flap toggle */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupEnvironment, makeGlowTexture, COLORS } from './core.js';
import { createRandoseru } from './models.js';

async function init() {
  const box = document.getElementById('viewer');
  if (!box) return;
  try { await document.fonts.ready; } catch (_) { /* ignore */ }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  box.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  setupEnvironment(renderer, scene);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(0xff9a4d, 4.2);
  rim.position.set(-4, 2, -3);
  const rim2 = new THREE.DirectionalLight(0xff5c8a, 3);
  rim2.position.set(4, -1, -3);
  scene.add(key, rim, rim2);

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ map: makeGlowTexture(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.z = -2;
  scene.add(glow);

  const bag = createRandoseru({ color: 'red' });
  bag.group.rotation.set(0.1, -0.55, 0);
  bag.group.position.y = -0.2;
  scene.add(bag.group);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.maxPolarAngle = Math.PI * 0.6;

  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const d = camera.aspect < 0.8 ? 6.4 : 5.2;
    camera.position.set(0, d * 0.22, d);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(box);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  });

  const gsap = window.gsap;
  if (gsap) {
    gsap.from(bag.group.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 2, ease: 'expo.out' });
    gsap.from(bag.group.rotation, { y: -Math.PI * 1.5, duration: 2.4, ease: 'expo.out' });
  }

  const label = document.getElementById('swatch-name');
  document.querySelectorAll('.swatch').forEach((b) => {
    b.addEventListener('click', () => {
      const c = COLORS[b.dataset.color];
      document.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      bag.setColor(b.dataset.color, gsap);
      if (label) label.textContent = c.name;
    });
  });

  const flapBtn = document.getElementById('flap-toggle');
  if (flapBtn) {
    flapBtn.addEventListener('click', () => {
      const open = bag.state.open < 0.5;
      flapBtn.setAttribute('aria-pressed', String(open));
      flapBtn.textContent = open ? 'ふたを閉じる' : 'ふたを開けて中を見る';
      if (gsap) gsap.to(bag.state, { open: open ? 1 : 0, duration: 1.2, ease: 'power2.inOut', onUpdate: bag.apply });
      else { bag.state.open = open ? 1 : 0; bag.apply(); }
    });
  }
}

init().catch((err) => {
  console.warn('3D viewer disabled:', err);
  const fb = document.getElementById('viewer-fallback');
  if (fb) fb.hidden = false;
});
