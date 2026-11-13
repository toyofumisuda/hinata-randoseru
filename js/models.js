/* Hinata — procedural 3D models: ランドセル / 3色のランドセル / ふでばこ / 防犯ブザー
   すべての形と模様をコードで生成しています（外部モデル・写真は不使用） */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  COLORS, roundedRect, cornerRect, shapePlane, canvasTex, makeEmblemTexture, makeStrap, drawSun,
} from './core.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);

const goldMat = () => new THREE.MeshPhysicalMaterial({
  color: 0xd9b26a, metalness: 1, roughness: 0.22, clearcoat: 0.4, envMapIntensity: 1.3,
});
const emblemMat = (color = 0xe2bd72) => new THREE.MeshPhysicalMaterial({
  map: makeEmblemTexture(), transparent: true, alphaTest: 0.4, metalness: 1, roughness: 0.18, color,
});

/* ---------- textures ---------- */
function stitchTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.setLineDash([22, 14]);
  g.beginPath();
  g.moveTo(26, 16); g.lineTo(26, 998);
  g.lineTo(486, 998);
  g.lineTo(486, 16);
  g.stroke();
  return canvasTex(c);
}

function liningTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 1024);
  for (let y = 0; y < 1024; y += 96) {
    for (let x = 0; x < 512; x += 96) {
      const ox = (y / 96) % 2 ? 48 : 0;
      if ((x + y) % 192 === 0) drawSun(g, x + ox + 24, y + 30, 20, 'rgba(0,0,0,.13)');
      else { g.fillStyle = 'rgba(0,0,0,.1)'; g.beginPath(); g.arc(x + ox + 24, y + 30, 6, 0, Math.PI * 2); g.fill(); }
    }
  }
  return canvasTex(c);
}

/* =========================================================
   ランドセル
   正面（かぶせ）が +z、背中側が -z
   ========================================================= */
export function createRandoseru({ color = 'red', classic = false } = {}) {
  const C = COLORS[color] || COLORS.red;
  const W = 1.0, H = 1.18, D = 0.66, RC = 0.2;
  const group = new THREE.Group();

  const leather = new THREE.MeshPhysicalMaterial({
    color: C.hex, roughness: classic ? 0.55 : 0.42, metalness: 0,
    clearcoat: classic ? 0.3 : 0.7, clearcoatRoughness: classic ? 0.4 : 0.25,
    envMapIntensity: 0.32, specularIntensity: 0.55, side: THREE.DoubleSide,
  });
  const sideMat = leather.clone(); sideMat.side = THREE.FrontSide;
  const stitchMat = new THREE.MeshStandardMaterial({ map: stitchTexture(), transparent: true, alphaTest: 0.12, color: C.stitch, roughness: 0.7 });
  const liningMat = new THREE.MeshStandardMaterial({ map: liningTexture(), color: C.lining, roughness: 0.85, side: THREE.DoubleSide });
  const pipingMat = new THREE.MeshPhysicalMaterial({ color: classic ? C.stitch : C.hex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
  const padColor = new THREE.Color(C.hex).multiplyScalar(0.55);
  const padMat = new THREE.MeshStandardMaterial({ color: padColor, roughness: 0.92 });
  const gold = goldMat();

  /* --- 本体：横から見た形を x 方向に押し出す --- */
  const BV = 0.03;
  const prof = cornerRect(D - 2 * BV, H - 2 * BV, [0.06, 0.09, RC - BV, 0.08]);
  const bodyGeo = new THREE.ExtrudeGeometry(prof, {
    depth: W - 2 * BV, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 5, curveSegments: 28,
  });
  bodyGeo.rotateY(-Math.PI / 2);          // 形の横軸 → z、押し出し → -x
  bodyGeo.translate((W - 2 * BV) / 2, 0, 0);
  group.add(new THREE.Mesh(bodyGeo, sideMat));

  /* ふたの下に見える口（暗い板） */
  const mouth = new THREE.Mesh(shapePlane(roundedRect(W - 0.12, 0.42, 0.05)), new THREE.MeshStandardMaterial({ color: 0x1a1414, roughness: 1 }));
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.set(0, H / 2 + 0.002, -0.06);
  group.add(mouth);

  /* 教科書・ノート（ふたが開くとせり上がる） */
  const books = new THREE.Group();
  const bookList = [
    { z: -0.21, t: 0.05, h: 0.86, w: 0.8, c: 0x3d8bff },  // A4フラットファイル
    { z: -0.14, t: 0.06, h: 0.8, w: 0.74, c: 0x46c27a },  // 教科書
    { z: -0.065, t: 0.05, h: 0.74, w: 0.7, c: 0xffcf33 }, // ノート
    { z: 0.01, t: 0.045, h: 0.82, w: 0.76, c: 0xff7a59 }, // れんらく帳ファイル
  ];
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xfbf8f1, roughness: 0.9 });
  bookList.forEach((b) => {
    const cover = new THREE.Mesh(new RoundedBoxGeometry(b.w, b.h, b.t, 2, 0.01),
      new THREE.MeshPhysicalMaterial({ color: b.c, roughness: 0.4, clearcoat: 0.5 }));
    const y = H / 2 - 0.03 - b.h / 2;
    cover.position.set(0, y, b.z);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(b.w - 0.03, b.h - 0.015, b.t * 0.7), pageMat);
    pages.position.set(0.02, y + 0.004, b.z);
    books.add(cover, pages);
  });
  group.add(books);

  /* --- かぶせ（ふた）：通り道 path に沿って曲げた板 --- */
  const G = 0.008, T = 0.024;
  const ZH = -D / 2 + 0.12;              // ふたの付け根
  const YEND = -H / 2 + 0.16;            // ふたの先
  const L1 = (D / 2 - RC) - ZH;
  const L2 = (RC + G) * Math.PI / 2;
  const L3 = (H / 2 - RC) - YEND;
  const L = L1 + L2 + L3;
  function pathAt(s) {
    if (s <= L1) return { y: H / 2 + G, z: ZH + s, ny: 1, nz: 0 };
    if (s <= L1 + L2) {
      const a = (s - L1) / (RC + G);
      return { y: H / 2 - RC + Math.cos(a) * (RC + G), z: D / 2 - RC + Math.sin(a) * (RC + G), ny: Math.cos(a), nz: Math.sin(a) };
    }
    return { y: H / 2 - RC - (s - L1 - L2), z: D / 2 + G, ny: 0, nz: 1 };
  }
  const HW = W / 2 + 0.006, RB = 0.22;
  const halfAt = (s) => (s > L - RB ? HW - RB + Math.sqrt(Math.max(0, RB * RB - (s - (L - RB)) ** 2)) : HW);
  const P0 = pathAt(0);
  function sheet(off, NX = 24, NS = 140) {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= NS; j++) {
      const s = (j / NS) * L, p = pathAt(s), half = halfAt(s);
      for (let i = 0; i <= NX; i++) {
        const u = i / NX;
        pos.push((u - 0.5) * 2 * half, p.y + p.ny * off - P0.y, p.z + p.nz * off - P0.z);
        uv.push(u, 1 - j / NS);
      }
    }
    for (let j = 0; j < NS; j++) {
      for (let i = 0; i < NX; i++) {
        const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  const flap = new THREE.Group();
  flap.position.set(0, P0.y, P0.z);
  group.add(flap);
  flap.add(new THREE.Mesh(sheet(T), leather));
  flap.add(new THREE.Mesh(sheet(T + 0.0016), stitchMat));
  flap.add(new THREE.Mesh(sheet(0.001), liningMat));

  /* ふちのパイピング */
  const loop = [];
  const N = 120;
  const at = (s, side, off = T / 2) => {
    const p = pathAt(s);
    return new THREE.Vector3(side * halfAt(s), p.y + p.ny * off - P0.y, p.z + p.nz * off - P0.z);
  };
  for (let j = 0; j <= N; j++) loop.push(at((j / N) * L, -1));
  for (let i = 1; i < 10; i++) { const p = at(L, -1); p.x = -(HW - RB) + (i / 10) * 2 * (HW - RB); loop.push(p); }
  for (let j = N; j >= 0; j--) loop.push(at((j / N) * L, 1));
  for (let i = 9; i > 0; i--) { const p = at(0, -1); p.x = -HW + (i / 10) * 2 * HW; loop.push(p); }
  const pipe = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true, 'centripetal'), 700, 0.0165, 8, true),
    pipingMat,
  );
  flap.add(pipe);

  /* エンブレム（太陽） */
  const em = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), emblemMat(classic ? 0xe8c98a : 0xe2bd72));
  const ep = pathAt(L1 + L2 + 0.17);
  em.position.set(0, ep.y - P0.y, ep.z + T + 0.003 - P0.z);
  flap.add(em);

  /* ふたの先のベロ */
  const tongue = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.12, 0.016, 3, 0.007), leather);
  tongue.position.set(0, YEND - 0.035 - P0.y, D / 2 + G + T / 2 + 0.004 - P0.z);
  flap.add(tongue);
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 24), gold);
  rivet.rotation.x = Math.PI / 2;
  rivet.position.set(0, YEND - 0.06 - P0.y, D / 2 + G + T + 0.008 - P0.z);
  flap.add(rivet);

  /* 錠前（本体側） */
  const lock = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.1, 0.03, 3, 0.012), gold);
  lock.position.set(0, YEND - 0.07, D / 2 + 0.01);
  group.add(lock);

  /* 背中側：クッション・背カン・肩ベルト */
  const pad = new THREE.Mesh(new RoundedBoxGeometry(W - 0.18, H - 0.28, 0.04, 4, 0.018), padMat);
  pad.position.set(0, -0.03, -D / 2 - 0.012);
  group.add(pad);
  [0.24, -0.04, -0.3].forEach((y) => {
    const q = new THREE.Mesh(new RoundedBoxGeometry(W - 0.3, 0.2, 0.05, 4, 0.024), padMat);
    q.position.set(0, y, -D / 2 - 0.03);
    group.add(q);
  });
  const kan = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.1, 0.08, 3, 0.03),
    new THREE.MeshPhysicalMaterial({ color: 0x2a2a30, roughness: 0.35, clearcoat: 0.6 }));
  kan.position.set(0, H / 2 - 0.06, -D / 2 - 0.05);
  group.add(kan);
  [-1, 1].forEach((sd) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sd * 0.11, H / 2 - 0.06, -D / 2 - 0.08),
      new THREE.Vector3(sd * 0.17, H / 2 - 0.22, -D / 2 - 0.2),
      new THREE.Vector3(sd * 0.25, 0.05, -D / 2 - 0.27),
      new THREE.Vector3(sd * 0.32, -0.32, -D / 2 - 0.2),
      new THREE.Vector3(sd * 0.36, -H / 2 + 0.12, -D / 2 - 0.05),
    ]);
    group.add(new THREE.Mesh(makeStrap(curve.getPoints(70), 0.15, 0.035), leather));
    const buckle = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.06, 0.02, 2, 0.008), gold);
    const bp = curve.getPoint(0.82);
    buckle.position.copy(bp);
    buckle.position.z -= 0.012;
    buckle.rotation.x = -0.6;
    group.add(buckle);
  });

  /* 持ち手・ナスカン・反射材 */
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 12, 40, Math.PI), leather);
  handle.position.set(0, H / 2 - 0.01, -D / 2 + 0.065);
  group.add(handle);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 10, 28), gold);
  hook.rotation.y = Math.PI / 2;
  hook.position.set(W / 2 + 0.016, -0.08, 0.02);
  group.add(hook);
  const hookBase = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.08, 0.1, 2, 0.008), gold);
  hookBase.position.set(W / 2 + 0.006, -0.02, 0.02);
  group.add(hookBase);
  const refl = new THREE.MeshStandardMaterial({ color: 0xe6ebf1, metalness: 0.7, roughness: 0.22 });
  [-1, 1].forEach((sd) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5), refl);
    r.rotation.y = sd * Math.PI / 2;
    r.position.set(sd * (W / 2 + 0.0015), -0.1, D / 2 - 0.09);
    group.add(r);
  });

  /* --- 開閉 --- */
  const OPEN = 1.95;
  const state = { open: 0 };
  function apply() {
    flap.rotation.x = -OPEN * smooth(clamp01(state.open));
    books.position.y = smooth(clamp01((state.open - 0.25) / 0.75)) * 0.24;
  }
  apply();

  const tint = [leather, sideMat];
  function setColor(key, gsap) {
    const c = COLORS[key];
    if (!c) return;
    const to = (m, hex) => {
      const t = new THREE.Color(hex);
      if (gsap) gsap.to(m.color, { r: t.r, g: t.g, b: t.b, duration: 0.9, ease: 'power2.inOut' });
      else m.color.copy(t);
    };
    tint.forEach((m) => to(m, c.hex));
    if (!classic) to(pipingMat, c.hex); else to(pipingMat, c.stitch);
    to(stitchMat, c.stitch);
    to(liningMat, c.lining);
    to(padMat, new THREE.Color(c.hex).multiplyScalar(0.55).getHex());
  }

  return { group, state, apply, setColor };
}

/* =========================================================
   3色のランドセル
   ========================================================= */
export function createTrio(keys = ['sakura', 'red', 'navy']) {
  const group = new THREE.Group();
  const layout = [
    { x: -1.12, z: -0.5, ry: 0.42 },
    { x: 0, z: 0.25, ry: 0 },
    { x: 1.12, z: -0.5, ry: -0.42 },
  ];
  const bags = keys.map((k, i) => {
    const r = createRandoseru({ color: k });
    r.group.scale.setScalar(0.92);
    group.add(r.group);
    return { r, s: layout[i] };
  });
  const finalPose = () => bags.forEach(({ r, s }) => {
    r.group.position.set(s.x, 0, s.z);
    r.group.rotation.set(0, s.ry, 0);
    r.state.open = 0; r.apply();
  });
  return {
    group, elev: 0.16, yaw: 0, fit: 0.74, sway: 0.12,
    setFinal: finalPose,
    setStart() { bags.forEach(({ r, s }) => { r.group.position.set(0, 0, s.z); r.group.rotation.set(0, s.ry * 0.3, 0); }); },
    intro(gsap) {
      bags.forEach(({ r, s }, i) => {
        gsap.to(r.group.position, { x: s.x, duration: 1.8, ease: 'expo.out', delay: 0.1 + i * 0.06 });
        gsap.to(r.group.rotation, { y: s.ry, duration: 1.8, ease: 'expo.out', delay: 0.1 + i * 0.06 });
      });
      const mid = bags[1].r;
      gsap.timeline({ delay: 1.2, onUpdate: mid.apply })
        .to(mid.state, { open: 0.85, duration: 1.1, ease: 'power2.inOut' })
        .to(mid.state, { open: 0, duration: 1.1, ease: 'power2.inOut' }, '+=0.8');
    },
  };
}

/* =========================================================
   ふでばこ（ふたの裏に時間割）
   ========================================================= */
function timetableTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = '#fffdf7'; g.fillRect(0, 0, 1024, 360);
  g.fillStyle = '#ff7a45'; g.font = '700 34px "Noto Sans JP", sans-serif';
  g.fillText('じかんわり', 36, 52);
  drawSun(g, 970, 40, 26, '#ffb547');
  const days = ['げつ', 'か', 'すい', 'もく', 'きん'];
  const cols = ['#ff8a80', '#ffd166', '#7dd3a8', '#7cc4ff', '#c3a6ff'];
  const x0 = 120, y0 = 80, cw = 176, rh = 52;
  g.font = '700 26px "Noto Sans JP", sans-serif';
  g.textAlign = 'center';
  days.forEach((d, i) => {
    g.fillStyle = cols[i];
    g.beginPath(); g.roundRect(x0 + i * cw + 6, y0, cw - 12, 42, 12); g.fill();
    g.fillStyle = '#fff'; g.fillText(d, x0 + i * cw + cw / 2, y0 + 31);
  });
  g.fillStyle = '#9a8f80';
  for (let r = 0; r < 5; r++) {
    g.fillText(String(r + 1), 70, y0 + 92 + r * rh);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(0,0,0,.06)';
      g.beginPath(); g.roundRect(x0 + i * cw + 6, y0 + 56 + r * rh, cw - 12, rh - 10, 8); g.fill();
      g.fillStyle = '#9a8f80';
    }
  }
  return canvasTex(c);
}

export function createPencase({ color = 0x4fb0e8 } = {}) {
  const W = 1.15, D = 0.4, HB = 0.11, HL = 0.06;
  const group = new THREE.Group();
  const plastic = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.45 });
  const tray = new THREE.MeshStandardMaterial({ color: 0xfff1df, roughness: 0.8, envMapIntensity: 0.5 });

  const bGeo = new THREE.ExtrudeGeometry(roundedRect(W, D, 0.1), {
    depth: HB - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 4, curveSegments: 28,
  });
  bGeo.rotateX(-Math.PI / 2);
  bGeo.translate(0, 0.01, 0);
  group.add(new THREE.Mesh(bGeo, plastic));
  const tr = new THREE.Mesh(shapePlane(roundedRect(W - 0.07, D - 0.07, 0.07)), tray);
  tr.rotation.x = -Math.PI / 2;
  tr.position.y = HB + 0.001;
  group.add(tr);

  /* えんぴつ */
  const wood = new THREE.MeshStandardMaterial({ color: 0xf0cf9c, roughness: 0.8 });
  const lead = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 });
  [[-0.115, 0xff5a5f], [-0.045, 0x3d8bff], [0.025, 0x46c27a]].forEach(([z, c], i) => {
    const p = new THREE.Group();
    const R = 0.022, len = 0.66;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 6), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 0.8 }));
    body.rotation.z = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(R, 0.09, 6), wood);
    tip.rotation.z = -Math.PI / 2; tip.position.x = len / 2 + 0.045;
    const lt = new THREE.Mesh(new THREE.ConeGeometry(R * 0.32, 0.028, 8), lead);
    lt.rotation.z = -Math.PI / 2; lt.position.x = len / 2 + 0.076;
    p.add(body, tip, lt);
    p.position.set(-0.1 + i * 0.02, HB + R, z);
    group.add(p);
  });
  const eraser = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.055, 0.075, 2, 0.012), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
  eraser.position.set(-0.3, HB + 0.028, 0.11);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.058, 0.078), new THREE.MeshStandardMaterial({ color: 0x3d8bff, roughness: 0.5 }));
  sleeve.position.set(-0.27, HB + 0.028, 0.11);
  const ruler = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.008, 0.07, 2, 0.003),
    new THREE.MeshPhysicalMaterial({ color: 0xffe082, roughness: 0.15, transmission: 0.4, thickness: 0.02, clearcoat: 1 }));
  ruler.position.set(0.17, HB + 0.006, 0.12);
  group.add(eraser, sleeve, ruler);
  const band = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), roughness: 0.8 });
  [-0.22, 0.12].forEach((x) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.012, D - 0.12, 2, 0.005), band);
    b.position.set(x, HB + 0.046, -0.04);
    group.add(b);
  });

  /* ふた（後ろの辺で開く） */
  const lid = new THREE.Group();
  lid.position.set(0, HB + 0.004, -D / 2);
  group.add(lid);
  const lGeo = new THREE.ExtrudeGeometry(roundedRect(W, D, 0.1), {
    depth: HL - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 4, curveSegments: 28,
  });
  lGeo.rotateX(-Math.PI / 2);
  lGeo.translate(0, 0.01, D / 2);
  lid.add(new THREE.Mesh(lGeo, plastic));
  const tt = new THREE.Mesh(shapePlane(roundedRect(W - 0.1, D - 0.09, 0.06)), new THREE.MeshStandardMaterial({ map: timetableTexture(), roughness: 0.7, envMapIntensity: 0.5 }));
  tt.rotation.x = Math.PI / 2;
  tt.rotation.z = Math.PI;
  tt.position.set(0, -0.0015, D / 2);
  lid.add(tt);
  const em = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), emblemMat(0xffffff));
  em.material.metalness = 0.2;
  em.rotation.x = -Math.PI / 2;
  em.position.set(0.38, HL + 0.001, D / 2);
  lid.add(em);
  const latch = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.05, 0.03, 2, 0.012), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1 }));
  latch.position.set(0, HL / 2, D + 0.008);
  lid.add(latch);

  const OPEN = 1.85;
  const state = { open: 1 };
  const apply = () => { lid.rotation.x = -OPEN * smooth(clamp01(state.open)); };
  apply();
  return {
    group, elev: 0.5, yaw: -0.35, fit: 0.8,
    setFinal() { state.open = 1; apply(); },
    setStart() { state.open = 0; apply(); },
    intro(gsap) { gsap.to(state, { open: 1, duration: 1.8, ease: 'power3.inOut', delay: 0.5, onUpdate: apply }); },
  };
}

/* =========================================================
   防犯ブザー（ライトが点滅する）
   ========================================================= */
function grilleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfbf7'; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a3a40';
  for (let r = 40; r < 200; r += 34) {
    const n = Math.round((Math.PI * 2 * r) / 34);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.beginPath(); g.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 7, 0, Math.PI * 2); g.fill();
    }
  }
  drawSun(g, 256, 256, 26, '#ffb547');
  g.fillStyle = '#ff7a45'; g.font = '800 38px Inter, sans-serif'; g.textAlign = 'center';
  g.fillText('SOS', 256, 470);
  return canvasTex(c);
}

export function createBuzzer({ color = 0xffb400 } = {}) {
  const group = new THREE.Group();
  const BW = 0.52, BH = 0.72, BD = 0.12, BV = 0.06;
  const FRONT = BD / 2 + BV;
  const plastic = new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 0.45 });
  const bGeo = new THREE.ExtrudeGeometry(roundedRect(BW, BH, 0.24), {
    depth: BD, bevelEnabled: true, bevelThickness: BV, bevelSize: 0.05, bevelSegments: 10, curveSegments: 48,
  });
  bGeo.translate(0, 0, -BD / 2);
  group.add(new THREE.Mesh(bGeo, plastic));

  const grille = new THREE.Mesh(new THREE.CircleGeometry(0.2, 64), new THREE.MeshPhysicalMaterial({ map: grilleTexture(), roughness: 0.5, clearcoat: 0.6 }));
  grille.position.set(0, -0.06, FRONT + 0.001);
  group.add(grille);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.014, 12, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1 }));
  ring.position.set(0, -0.06, FRONT);
  group.add(ring);

  const ledMat = new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xff2a2a, emissiveIntensity: 0.4, roughness: 0.15 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 32, 16), ledMat);
  led.scale.z = 0.5;
  led.position.set(0, 0.24, FRONT);
  group.add(led);

  /* ひもとリング */
  const pin = new THREE.Group();
  pin.position.set(0, BH / 2 + 0.04, 0);
  group.add(pin);
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 24), new THREE.MeshPhysicalMaterial({ color: 0x33333a, roughness: 0.4, clearcoat: 0.6 }));
  stub.position.y = 0.04;
  pin.add(stub);
  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0.03, 0.2, 0.02), new THREE.Vector3(-0.02, 0.3, 0), new THREE.Vector3(0, 0.36, 0),
  ]);
  pin.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 40, 0.012, 8), new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.7 })));
  const pull = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 16, 48), new THREE.MeshPhysicalMaterial({ color: 0xff7a45, roughness: 0.3, clearcoat: 1 }));
  pull.position.y = 0.47;
  pin.add(pull);

  const clip = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.42, 0.04, 3, 0.018), new THREE.MeshPhysicalMaterial({ color: 0x33333a, roughness: 0.4 }));
  clip.position.set(0, 0.02, -FRONT - 0.03);
  group.add(clip);

  return {
    group, elev: 0.1, yaw: -0.5, fit: 0.95,
    setFinal() { pin.rotation.z = 0; },
    setStart() { pin.rotation.z = 0.7; },
    intro(gsap) { gsap.to(pin.rotation, { z: 0, duration: 2.2, ease: 'elastic.out(1, 0.35)', delay: 0.3 }); },
    update(t) { ledMat.emissiveIntensity = (t % 1.2) < 0.18 ? 3.2 : 0.35; },
  };
}
