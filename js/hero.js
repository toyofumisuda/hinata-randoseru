/* Hinata — scroll-driven 3D randoseru story (Three.js + GSAP ScrollTrigger) */
import * as THREE from 'three';
import { setupEnvironment, makeGlowTexture } from './core.js';
import { createRandoseru } from './models.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

async function init() {
  const canvas = document.getElementById('hero-canvas');
  const section = document.getElementById('hero3d');
  if (!canvas || !gsap || !ScrollTrigger) throw new Error('missing deps');
  gsap.registerPlugin(ScrollTrigger);
  try { await document.fonts.ready; } catch (_) { /* ignore */ }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  setupEnvironment(renderer, scene);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  /* lights: soft key + warm orange / pink rims + a moving sweep for glints */
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  const rimL = new THREE.DirectionalLight(0xff9a4d, 4.5);
  rimL.position.set(-4, 1.5, -3);
  const rimR = new THREE.DirectionalLight(0xff5c8a, 2.4);
  rimR.position.set(4, -1, -3);
  const sweep = new THREE.PointLight(0xffffff, 8, 6, 1.5);
  sweep.position.set(-3, 1, 2);
  scene.add(key, rimL, rimR, sweep);

  /* glow behind the product */
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ map: makeGlowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })
  );
  glow.position.z = -2.5;
  scene.add(glow);

  /* hierarchy: rig (scroll) > intro (load animation) > bag (idle float) */
  const bag = createRandoseru({ color: 'red' });
  const phone = bag.group;
  const apply = bag.apply;
  const intro = new THREE.Group();
  const rig = new THREE.Group();
  intro.add(phone);
  rig.add(intro);
  scene.add(rig);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = camera.aspect < 0.75 ? 6.2 : 5;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* intro on load */
  intro.scale.setScalar(0.55);
  intro.rotation.y = -Math.PI * 1.25;
  gsap.to(intro.scale, { x: 1, y: 1, z: 1, duration: 2.4, ease: 'expo.out', delay: 0.15 });
  gsap.to(intro.rotation, { y: 0, duration: 2.8, ease: 'expo.out', delay: 0.15 });
  gsap.from('.hero-intro > *', { opacity: 0, y: 30, duration: 1.4, stagger: 0.12, ease: 'power3.out', delay: 0.35 });
  gsap.from(glow.material, { opacity: 0, duration: 2.5, ease: 'power2.out' });

  /* scroll timeline — built per breakpoint */
  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, (ctx) => {
    const { desk } = ctx.conditions;
    gsap.set(rig.position, { x: 0, y: desk ? -0.42 : -0.32, z: 0 });
    gsap.set(rig.rotation, { x: 0.16, y: -0.5, z: 0.03 });
    gsap.set(rig.scale, { x: desk ? 0.74 : 0.66, y: desk ? 0.74 : 0.66, z: desk ? 0.74 : 0.66 });

    const S = (v) => ({ x: v, y: v, z: v });
    const capIn = { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' };
    const capOut = { autoAlpha: 0, y: -40, duration: 0.3, ease: 'power2.in' };

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 1 },
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1.4 },
    });

    /* A — 背中側：肩ベルトと背カン */
    tl.to('.hero-intro', { autoAlpha: 0, y: -70, duration: 0.45, ease: 'power1.in' }, 0)
      .to('.scroll-hint', { autoAlpha: 0, duration: 0.2 }, 0)
      .to(rig.rotation, { x: 0.1, y: Math.PI - 0.55, z: 0 }, 0)
      .to(rig.position, { x: desk ? 0.62 : 0, y: desk ? 0 : 0.32 }, 0)
      .to(rig.scale, S(desk ? 1.0 : 0.7), 0)
      .to(sweep.position, { x: 3 }, 0)
      .fromTo('.cap-a', { autoAlpha: 0, y: 40 }, capIn, 0.6)
      .to('.cap-a', capOut, 1.3)

    /* B — 真横：軽さ */
      .to(rig.rotation, { x: 0.02, y: Math.PI * 1.5, z: 0 }, 1.25)
      .to(rig.position, { x: desk ? -0.55 : 0, y: desk ? 0 : 0.34 }, 1.25)
      .to(rig.scale, S(desk ? 1.05 : 0.78), 1.25)
      .to(sweep.position, { x: -3, y: -1 }, 1.25)
      .fromTo('.cap-b', { autoAlpha: 0, y: 40 }, capIn, 1.85)
      .to('.cap-b', capOut, 2.55)

    /* C — 正面・ふたが開く：収納 */
      .to(rig.rotation, { x: 0.42, y: Math.PI * 2 - 0.4, z: 0 }, 2.5)
      .to(rig.position, { x: desk ? 0.6 : 0, y: desk ? -0.32 : 0.08 }, 2.5)
      .to(rig.scale, S(desk ? 0.88 : 0.62), 2.5)
      .to(bag.state, { open: 1, duration: 0.9, onUpdate: apply }, 2.75)
      .to(sweep.position, { x: 2.5, y: 1.5 }, 2.5)
      .fromTo('.cap-c', { autoAlpha: 0, y: 40 }, capIn, 3.1)
      .to('.cap-c', capOut, 3.8)

    /* D — まわりに仕様 */
      .to(bag.state, { open: 0, duration: 0.8, onUpdate: apply }, 3.75)
      .to(rig.rotation, { x: 0.12, y: Math.PI * 2 - 0.55, z: -0.02 }, 3.75)
      .to(rig.position, { x: 0, y: desk ? 0 : 0.5 }, 3.75)
      .to(rig.scale, S(desk ? 0.86 : 0.56), 3.75)
      .fromTo('.spec', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.08, ease: 'power2.out' }, 4.3)
      .to('.spec', { autoAlpha: 0, y: -30, duration: 0.25, stagger: 0.04, ease: 'power2.in' }, 5.05)

    /* E — フィナーレ */
      .to(rig.rotation, { x: 0.14, y: Math.PI * 4 - 0.5, z: 0.02, duration: 1.3 }, 5.1)
      .to(rig.position, { x: 0, y: desk ? 0.34 : 0.48, duration: 1.3 }, 5.1)
      .to(rig.scale, { ...S(desk ? 0.62 : 0.54), duration: 1.3 }, 5.1)
      .to(glow.material, { opacity: 0.8, duration: 1.3 }, 5.1)
      .fromTo('.cap-e', { autoAlpha: 0, y: 40 }, { ...capIn, duration: 0.45 }, 5.9)
      .to({}, { duration: 0.6 });

    return () => tl.kill();
  });

  /* render loop — only while the hero is on screen */
  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(section);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    phone.position.y = Math.sin(t * 0.9) * 0.02;
    phone.rotation.y = Math.sin(t * 0.45) * 0.05;
    phone.rotation.x = Math.sin(t * 0.6) * 0.015;
    renderer.render(scene, camera);
  });
}

init().catch((err) => {
  console.warn('3D hero disabled:', err);
  document.documentElement.classList.add('no-webgl');
});
