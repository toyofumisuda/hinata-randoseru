/* Hinata — shared 3D helpers (all geometry & textures are generated in code) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ランドセルのカラー（架空） */
export const COLORS = {
  red:      { hex: 0xc8182f, stitch: 0xf6e7c8, lining: 0xf3d9c4, name: 'ひなたレッド' },
  sakura:   { hex: 0xf2a2b6, stitch: 0xffffff, lining: 0xfff1f4, name: 'さくらピンク' },
  lavender: { hex: 0xa48fdc, stitch: 0xffffff, lining: 0xf1ecff, name: 'ラベンダー' },
  mint:     { hex: 0x74c9b2, stitch: 0xffffff, lining: 0xe8f8f2, name: 'ミントグリーン' },
  navy:     { hex: 0x1e2b55, stitch: 0xe0b860, lining: 0xdde6f5, name: 'よぞらネイビー' },
  cocoa:    { hex: 0x6e4330, stitch: 0xecd3a4, lining: 0xf3e3cf, name: 'ココアブラウン' },
};

export function roundedRect(w, h, r) {
  return cornerRect(w, h, [r, r, r, r]);
}

/* 角ごとに半径を変えられる角丸長方形  r = [左下, 右下, 右上, 左上] */
export function cornerRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r[0], y);
  s.lineTo(x + w - r[1], y);
  s.absarc(x + w - r[1], y + r[1], r[1], -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r[2]);
  s.absarc(x + w - r[2], y + h - r[2], r[2], 0, Math.PI / 2, false);
  s.lineTo(x + r[3], y + h);
  s.absarc(x + r[3], y + h - r[3], r[3], Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r[0]);
  s.absarc(x + r[0], y + r[0], r[0], Math.PI, Math.PI * 1.5, false);
  return s;
}

export function shapePlane(shape, seg = 32) {
  const g = new THREE.ShapeGeometry(shape, seg);
  g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - min.x) / (max.x - min.x), (pos.getY(i) - min.y) / (max.y - min.y));
  }
  uv.needsUpdate = true;
  return g;
}

export function canvasTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ひなたのエンブレム（太陽） */
export function drawSun(g, cx, cy, r, color = '#fff') {
  g.save();
  g.fillStyle = color;
  g.beginPath(); g.arc(cx, cy, r * 0.48, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save();
    g.translate(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
    g.rotate(a + Math.PI / 2);
    g.beginPath(); g.roundRect(-r * 0.07, -r * 0.17, r * 0.14, r * 0.34, r * 0.07); g.fill();
    g.restore();
  }
  g.restore();
}

export function makeEmblemTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  drawSun(g, 128, 128, 118);
  return canvasTex(c);
}

/* 背後のぼんやりした光（あたたかい色） */
export function makeGlowTexture(inner = 'rgba(255,150,70,0.9)', mid = 'rgba(255,70,110,0.25)') {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  r.addColorStop(0, inner);
  r.addColorStop(0.4, mid);
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 512, 512);
  return canvasTex(c);
}

export function setupEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
}

/* 帯（ベルト）を曲線に沿って作る。幅は x 方向 */
export function makeStrap(points, w, th) {
  const prof = [];
  const r = th / 2, seg = 6;
  for (let i = 0; i <= seg; i++) { const a = Math.PI / 2 + (i / seg) * Math.PI; prof.push([-w / 2 + r + Math.cos(a) * r, Math.sin(a) * r]); }
  for (let i = 0; i <= seg; i++) { const a = -Math.PI / 2 + (i / seg) * Math.PI; prof.push([w / 2 - r + Math.cos(a) * r, Math.sin(a) * r]); }
  const P = prof.length, n = points.length;
  const pos = [], idx = [];
  const X = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    const T = b.clone().sub(a).normalize();
    const N = new THREE.Vector3(0, -T.z, T.y).normalize();
    prof.forEach(([u, v]) => {
      const p = points[i].clone().addScaledVector(X, u).addScaledVector(N, v);
      pos.push(p.x, p.y, p.z);
    });
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < P; j++) {
      const a = i * P + j, b = i * P + ((j + 1) % P), c = (i + 1) * P + j, d = (i + 1) * P + ((j + 1) % P);
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
