// Decorados con detalle para las escenas de caricatura: texturas dibujadas por código (ladrillo,
// baldosa, parquet, empapelado, pasto, adoquín), superficies que RECIBEN sombra, fachadas, árboles,
// nubes, cuadros... y la luz con sombras que sigue a la cámara. Medido contra @WeirdLittleFactsydk:
// sus fondos nunca son un color liso; siempre hay textura suave, sombras largas y objetos alrededor.
import * as THREE from 'three';
import { rng } from '/lib/kit.js';
import { flat, outlined, block } from '/lib/toon.js';

const INK = '#1e1428';
export const ink = new THREE.MeshBasicMaterial({ color: 0x1e1428 });

function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function texOf(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const shade = (hex, k) => { const c = new THREE.Color(hex).multiplyScalar(k); return `#${c.getHexString()}`; };

/** Texturas que se repiten. Cada una devuelve un canvas; `tex.x(...)` lo convierte con su repetición. */
export const draw = {
  bricks: ({ base = '#d9c7a3', mortar = '#b9a585', seed = 3, rows = 8, cols = 4 } = {}) => canvas(512, 512, (g, w, h) => {
    const r = rng(seed); g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    const bh = h / rows, bw = w / cols;
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      g.fillStyle = shade(base, 0.92 + r() * 0.14); const x = i * bw + (j % 2 ? bw / 2 : 0);
      g.fillRect(x + 3, j * bh + 3, bw - 6, bh - 6); if (x + bw > w) g.fillRect(x - w + 3, j * bh + 3, bw - 6, bh - 6);
    }
  }),
  tiles: ({ base = '#efe3c8', line = '#cdbd9b', seed = 5, n = 4 } = {}) => canvas(512, 512, (g, w) => {
    const r = rng(seed), s = w / n; g.fillStyle = line; g.fillRect(0, 0, w, w);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { g.fillStyle = shade(base, 0.93 + r() * 0.12); g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); }
  }),
  planks: ({ base = '#b9783f', line = '#8a5527', seed = 7, n = 6 } = {}) => canvas(512, 512, (g, w) => {
    const r = rng(seed), s = w / n; g.fillStyle = line; g.fillRect(0, 0, w, w);
    for (let i = 0; i < n; i++) { const off = r() * w; for (const y of [off - w, off]) { g.fillStyle = shade(base, 0.9 + r() * 0.18); g.fillRect(i * s + 2, y + 2, s - 4, w - 4); }
      g.strokeStyle = shade(base, 0.82); g.lineWidth = 2; for (let k = 0; k < 3; k++) { const x = i * s + 8 + r() * (s - 16); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 8, w); g.stroke(); } }
  }),
  stripes: ({ a = '#f3e3c2', b = '#ead5ab', dot = '#d9bd84', n = 6 } = {}) => canvas(512, 512, (g, w) => {
    const s = w / n; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * s, 0, s, w); }
    g.fillStyle = dot; for (let i = 0; i < n; i += 2) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(i * s + s / 2, j * w / 4 + w / 8, 7, 0, 7); g.fill(); }
  }),
  grass: ({ base = '#7fc24f', blade = '#5fa238', light = '#9bd86a', seed = 11 } = {}) => canvas(512, 512, (g, w) => {
    const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * w; g.strokeStyle = r() < 0.5 ? blade : light; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y - 8 - r() * 10); g.stroke(); }
  }),
  cobble: ({ base = '#d8cfb6', line = '#b3a88a', seed = 13, rows = 7, cols = 5 } = {}) => canvas(512, 512, (g, w, h) => {
    const r = rng(seed); g.fillStyle = line; g.fillRect(0, 0, w, h); const bh = h / rows, bw = w / cols;
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      g.fillStyle = shade(base, 0.9 + r() * 0.16); const x = i * bw + (j % 2 ? bw / 2 : 0);
      for (const xx of [x, x - w]) { g.beginPath(); g.roundRect(xx + 5, j * bh + 5, bw - 10, bh - 10, 16); g.fill(); }
    }
  }),
};
export const tex = Object.fromEntries(Object.entries(draw).map(([k, f]) => [k, (opts, rx = 1, ry = 1) => texOf(f(opts), rx, ry)]));

/** Superficie con textura que recibe sombra. ground = acostada en el piso. */
export function surface(parent, map, w, h, x, y, z, ground = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map }));
  if (ground) m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); return m;
}
/** Imagen plana dibujada en un canvas (cuadros, ventanas, fachadas, carteles): no recibe luz. */
export function picture(parent, w, h, x, y, z, paint, px = 256) {
  const c = canvas(px, Math.round(px * h / w), paint), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(x, y, z); parent.add(m); return m;
}
const frame = (g, w, h, color, lw = 10) => { g.strokeStyle = INK; g.lineWidth = lw + 8; g.strokeRect(lw / 2 + 2, lw / 2 + 2, w - lw - 4, h - lw - 4); g.strokeStyle = color; g.lineWidth = lw; g.strokeRect(lw / 2 + 4, lw / 2 + 4, w - lw - 8, h - lw - 8); };

/** Fachada de edificio parisino: ventanas con postigos, balcones, techo de pizarra y local abajo. */
export function facade(parent, x0, x1, hgt, z, { wall = '#f1dcb4', roof = '#6d7890', shutter = '#4f8f6b', awning = '#c8443a', seed = 1 } = {}) {
  const w = x1 - x0;
  return picture(parent, w, hgt, (x0 + x1) / 2, hgt / 2, z, (g, W, H) => {
    const r = rng(seed), roofH = H * 0.15;
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    g.fillStyle = shade(wall, 0.93); for (let i = 0; i < 40; i++) g.fillRect(r() * W, roofH + r() * (H - roofH), 26, 7);
    g.fillStyle = roof; g.beginPath(); g.moveTo(0, roofH); g.lineTo(W * 0.06, 0); g.lineTo(W * 0.94, 0); g.lineTo(W, roofH); g.fill();
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(0, roofH); g.lineTo(W, roofH); g.stroke();
    const cols = Math.max(2, Math.round(w / 0.62)), rows = Math.max(2, Math.round((hgt - 1.1) / 0.75)), cw = W / cols, shopH = H * (0.95 / hgt), rh = (H - roofH - shopH) / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const cx = i * cw + cw / 2, y = roofH + j * rh + rh * 0.16, ww = cw * 0.34, wh = rh * 0.62;
      g.fillStyle = shutter; g.fillRect(cx - ww / 2 - ww * 0.5, y, ww * 0.5, wh); g.fillRect(cx + ww / 2, y, ww * 0.5, wh);
      g.fillStyle = r() < 0.3 ? '#ffe9a3' : '#5b7fa8'; g.fillRect(cx - ww / 2, y, ww, wh);
      g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(cx - ww / 2 - ww * 0.5, y, ww * 2, wh); g.strokeRect(cx - ww / 2, y, ww, wh);
      g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + wh); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(cx - ww, y + wh + 6); g.lineTo(cx + ww, y + wh + 6); g.stroke();
    }
    const sy = H - shopH; g.fillStyle = shade(wall, 0.8); g.fillRect(0, sy, W, shopH);
    g.fillStyle = '#3c4660'; g.fillRect(W * 0.1, sy + shopH * 0.3, W * 0.5, shopH * 0.7); g.fillStyle = '#7a4b2a'; g.fillRect(W * 0.68, sy + shopH * 0.25, W * 0.2, shopH * 0.75);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : awning; g.fillRect(W * 0.06 + i * W * 0.11 / 1, sy, W * 0.11, shopH * 0.26); }
    g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(W * 0.06, sy, W * 0.88, shopH * 0.26); g.strokeRect(W * 0.1, sy + shopH * 0.3, W * 0.5, shopH * 0.7); g.strokeRect(W * 0.68, sy + shopH * 0.25, W * 0.2, shopH * 0.75);
    g.lineWidth = 10; g.strokeRect(0, 0, W, H);
  }, 384);
}
/** Cuadro con marco dorado: paisaje simple. */
export function painting(parent, w, h, x, y, z, seed = 1) {
  return picture(parent, w, h, x, y, z, (g, W, H) => {
    const r = rng(seed); g.fillStyle = ['#9fd0ea', '#f3c9a0', '#bcd7c0'][seed % 3]; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f7e08a'; g.beginPath(); g.arc(W * (0.3 + r() * 0.4), H * 0.35, H * 0.12, 0, 7); g.fill();
    for (const [c, yy] of [['#6fa86a', 0.62], ['#4d8a55', 0.75]]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let i = 0; i <= 8; i++) g.lineTo(i * W / 8, H * (yy + 0.1 * Math.sin(i * 1.3 + seed + yy * 9))); g.lineTo(W, H); g.fill(); }
    frame(g, W, H, '#d9a441', 18);
  });
}
/** Ventana con cortinas. */
export function windowPic(parent, w, h, x, y, z, { sky = '#9fd0ea', curtain = '#a83246' } = {}) {
  return picture(parent, w, h, x, y, z, (g, W, H) => {
    g.fillStyle = sky; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(W * 0.6, H * 0.3, W * 0.22, H * 0.06, 0, 0, 7); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.fillStyle = curtain; for (const s of [0, 1]) { g.beginPath(); g.moveTo(s ? W : 0, 0); g.lineTo(s ? W * 0.62 : W * 0.38, 0); g.quadraticCurveTo(s ? W * 0.72 : W * 0.28, H * 0.5, s ? W * 0.9 : W * 0.1, H); g.lineTo(s ? W : 0, H); g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke(); }
    frame(g, W, H, '#ffffff', 14);
  });
}
/** Nube esponjosa (varios círculos). */
export function cloud(parent, x, y, z, s = 1) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [dx, dy, r] of [[-0.7, 0, 0.45], [-0.2, 0.18, 0.6], [0.4, 0.1, 0.5], [0.85, -0.05, 0.36], [0.1, -0.12, 0.55]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 22), m); c.position.set(dx, dy, 0); g.add(c); }
  g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g); return g;
}
/** Árbol redondo o pino, con contorno; proyecta sombra. */
export function tree(parent, x, z, { h = 2.2, pine = false, leaf = 0x5fae4d } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  block(g, 0x8a5a33, -0.07, 0.07, 0, h * 0.5, 0.07, -0.07, 0.016);
  if (pine) for (let i = 0; i < 3; i++) { const c = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.62 - i * 0.14, 0.8, 12), flat(leaf)), 0.022); c.position.y = h * 0.42 + i * 0.5; g.add(c); }
  else for (const [dx, dy, r] of [[0, 0, 0.55], [-0.38, -0.12, 0.38], [0.38, -0.1, 0.4], [0.05, 0.38, 0.4]]) { const c = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), flat(leaf)), 0.022); c.position.set(dx, h * 0.78 + dy, 0); g.add(c); }
  return g;
}
/** Farol de calle. */
export function lamp(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  block(g, 0x2b2f3a, -0.04, 0.04, 0, 2.3, 0.04, -0.04, 0.014); block(g, 0x2b2f3a, -0.12, 0.12, 0, 0.14, 0.12, -0.12, 0.014);
  const head = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a3 })), 0.02); head.position.y = 2.45; g.add(head);
  block(g, 0x2b2f3a, -0.19, 0.19, 2.6, 2.66, 0.19, -0.19, 0.014);
  return g;
}
/** Colinas de fondo, en capas. */
export function hills(parent, x, z, list) {
  for (const [dx, r, color] of list) { const h = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color })); h.scale.y = 0.5; h.position.set(x + dx, 0, z); parent.add(h); }
}

/** Luz con sombras: una luz de ambiente algo violeta (da color a la sombra) y un sol cálido de costado que
 *  proyecta sombras largas. `follow(punto)` cada cuadro: la sombra solo se calcula alrededor de donde mira la cámara. */
export function makeLight(scene, { dir = [-4.5, 6, 4.5], ambient = 1.72, sun = 2.05 } = {}) {
  scene.add(new THREE.AmbientLight(0xe9e0ff, ambient));
  const s = new THREE.DirectionalLight(0xfff0d6, sun); s.castShadow = true;
  s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 40 });
  s.shadow.bias = -0.0012; s.shadow.normalBias = 0.03; s.shadow.radius = 5;
  scene.add(s, s.target);
  const off = new THREE.Vector3(...dir).multiplyScalar(1.6);
  return { sun: s, follow(p) { s.target.position.set(p.x, 0, 0); s.position.set(p.x + off.x, off.y, off.z); s.target.updateMatrixWorld(); } };
}
