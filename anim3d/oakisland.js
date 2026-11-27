// Episodio: el pozo del dinero de Oak Island (Canadá, 1795 → hoy). Misterios: atardecer/noche, niebla y mar.
// Cuatro decorados en x: ISLA (0, el hallazgo), CORTE (40, el pozo visto en corte como un hormiguero, con las
// capas de troncos, la piedra y el agua que sube), MÁQUINAS (80, bombas, vapor, grúa y la búsqueda de 1909)
// y HOY (120, excavadora y perforadora; al final la cámara se mete bajo tierra).
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, clamp01, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('oakisland', { sky: [[0, '#2c3672'], [0.45, '#6e5398'], [0.78, '#d9808a'], [1, '#f9c08a']], light: { ambient: 1.95, sun: 2.0 } });
const { scene, camera, c, at, END, sfx, tag, BIG } = k;
scene.fog = new THREE.Fog(0x7a62a0, 26, 90);

const X0 = 0, X = 40, M = 80, H = 120;
// ---------- tiempos (palabras) ----------
const pozoT = at('pozo', 0), escT = at('todavia', 0);
const danT = at('daniel', c[1]), hundT = at('hundimiento', c[1]), robleT = at('roble', c[1]);
const relT = at('segun', c[2]), ramaT = at('rama', c[2]), poleaT = at('polea', c[2]), asiT = at('asi', c[2]), cavarT = at('cavar', c[2]);
const lajasT = at('lajas', c[3]), tresT = at('tres', c[3]), capaT = at('capa', c[3]);
const ciaT = at('compania', c[4]), bajT = at('bajando', c[4]), aparT = at('aparecen', c[4]);
const veinT = at('veintisiete', c[5]), piedraT = at('piedra', c[5]), millT = at('dos', c[5] + 3), perdT = at('perdio', c[5]);
const aguaT = at('agua', c[6]);
const bombT = at('bombas', c[7]), vapT = at('maquinas', c[7]), gruT = at('gruas', c[7]), seisT = at('seis', c[7]);
const frT = at('franklin', c[8]), busqT = at('busqueda', c[8]), presT = at('presidente', c[8]);
const hoyT = at('hoy', c[9]), siglosT = at('siglos', c[9]), excT = at('siguen', c[9]), tesT = at('tesoro', c[9]);
const geoT = at('geologos', c[10]), natT = at('hueco', c[10]), entT = at('entonces', c[10]), abajoT = at('hay', c[10] + 1);

// ---------- utilidades ----------
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), Yup = V(0, 1, 0), Ydn = V(0, -1, 0);
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
}
/** Palo con contorno entre dos puntos (patas, caños, sogas). */
function stick(parent, a, b, r, color, w = 0.012) {
  const m = outlined(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), flat(color)), w); parent.add(m); setStick(m, a, b); return m;
}
function setStick(m, a, b) { tmp.copy(b).sub(a); const d = tmp.length() || 1e-4; m.position.copy(a).addScaledVector(tmp, 0.5); m.scale.set(1, d, 1); m.quaternion.setFromUnitVectors(Yup, tmp.multiplyScalar(1 / d)); }
const glowTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(0.35, 'rgba(255,200,110,.55)'); gr.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
const glows = [];
/** Resplandor que siempre mira a la cámara y titila. */
function glow(parent, r, x, y, z, color = 0xffffff, k0 = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, depthWrite: false, opacity: 0.8, fog: false }));
  m.position.set(x, y, z); parent.add(m); m.userData.k0 = k0; glows.push(m); return m;
}
const mistTex = canvasTex(256, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(235,225,255,.9)'); gr.addColorStop(1, 'rgba(235,225,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const mists = [];
function mist(cx, n, zr = [-3, -9]) {
  const r = rng(cx + 7);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5 + r() * 4, 1.4 + r() * 0.8), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0.32, depthWrite: false }));
    m.position.set(cx - 10 + r() * 20, 0.35 + r() * 0.6, lerp(zr[0], zr[1], r())); m.userData = { x0: m.position.x - cx, cx, sp: 0.15 + r() * 0.2 }; scene.add(m); mists.push(m);
  }
}
/** Farol de mano: base, vidrio que brilla, tapa y asa. */
function lantern(parent, s = 1) {
  const g = new THREE.Group(); parent.add(g);
  block(g, 0x2b2f3a, -0.07 * s, 0.07 * s, 0, 0.03 * s, 0.07 * s, -0.07 * s, 0.01);
  const gl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 0.14 * s, 10), new THREE.MeshBasicMaterial({ color: 0xffd98a })), 0.012); gl.position.y = 0.1 * s; g.add(gl);
  const cap = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.08 * s, 0.07 * s, 10), flat(0x2b2f3a)), 0.01); cap.position.y = 0.2 * s; g.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04 * s, 0.008 * s, 6, 14), INK); ring.position.y = 0.26 * s; g.add(ring);
  g.userData.glow = glow(g, 0.55 * s, 0, 0.1 * s, 0.05, 0xffe0a0, parent.children.length);
  return g;
}

// ---------- mar, islas, cielo ----------
const seaMap = canvasTex(256, 256, (g, w) => {
  const r = rng(4); g.fillStyle = '#2c4f7c'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * w, l = 20 + r() * 30; g.strokeStyle = r() < 0.6 ? '#3f6c9c' : '#8fb5d6'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 8, x + l, y); g.stroke(); }
}, 60, 60);
{ const seaMat = new THREE.MeshLambertMaterial({ map: seaMap });            // el mar no pasa por delante del corte (x = 40)
  for (const [x0, x1, z0, z1] of [[-200, 300, -250, 0.3], [-200, X - 8, 0.3, 60], [X + 8, 300, 0.3, 60]]) {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), seaMat); sea.rotation.x = -PI / 2; sea.position.set((x0 + x1) / 2, -0.08, (z0 + z1) / 2); sea.receiveShadow = true; scene.add(sea); } }
const grassMap = tex.grass({ base: '#5f9c52', blade: '#477e40', light: '#7fbd68', seed: 21 }, 0.5, 0.5);
const foams = [];
function island(cx, cz, r, shape = null) {
  const geo = shape ? new THREE.ShapeGeometry(shape, 40) : new THREE.CircleGeometry(r, 60);
  const isl = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: grassMap })); isl.rotation.x = -PI / 2; isl.position.set(cx, 0, cz); isl.receiveShadow = true; scene.add(isl);
  if (!shape) {
    // UV de CircleGeometry va de 0 a 1: se repite el pasto
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r, uv.getY(i) * r);
    const sand = new THREE.Mesh(new THREE.RingGeometry(r - 0.05, r + 0.8, 60), new THREE.MeshLambertMaterial({ color: 0xc9ad7a })); sand.rotation.x = -PI / 2; sand.position.set(cx, -0.03, cz); sand.receiveShadow = true; scene.add(sand);
    const foam = new THREE.Mesh(new THREE.RingGeometry(r + 0.75, r + 1.15, 60), new THREE.MeshBasicMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.6 })); foam.rotation.x = -PI / 2; foam.position.set(cx, -0.05, cz); scene.add(foam); foams.push(foam);
  }
  return isl;
}
const starMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false });
const stars = [];
function sky(cx) {
  const r = rng(cx + 3);
  for (let i = 0; i < 34; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.09 + r() * 0.09, 6), starMat); s.position.set(cx - 22 + r() * 44, 12 + r() * 26, -62); s.userData.k = r() * 6; scene.add(s); stars.push(s); }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), new THREE.MeshBasicMaterial({ color: 0xfff0c4, fog: false })); moon.position.set(cx + 7, 19, -61); scene.add(moon);
  for (const [dx, dy, rr] of [[-0.6, 0.4, 0.4], [0.5, -0.5, 0.3], [0.2, 0.8, 0.2]]) { const cr = new THREE.Mesh(new THREE.CircleGeometry(rr, 18), new THREE.MeshBasicMaterial({ color: 0xe6d6a8, fog: false })); cr.position.set(cx + 7 + dx, 19 + dy, -60.9); scene.add(cr); }
  glow(scene, 6, cx + 7, 19, -61.5, 0xffe7b0, 3).material.opacity = 0.5;
  // otras islas lejanas
  for (const [dx, rr, col] of [[-14, 7, 0x3a3560], [-5, 5, 0x453c6a], [12, 8, 0x3a3560]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(rr, 40), new THREE.MeshBasicMaterial({ color: col })); h.scale.y = 0.35; h.position.set(cx + dx, -0.1, -48); scene.add(h); }
  k.cloud(cx - 6, 9, -30, 1.6).children.forEach(m => { m.material = m.material.clone(); m.material.color.set(0x9a86b8); });
  k.cloud(cx + 3, 11, -32, 1.3).children.forEach(m => { m.material = m.material.clone(); m.material.color.set(0x8a78aa); });
}
for (const cx of [X0, X, M, H]) sky(cx);
k.birds([[X0, 3.9, 0], [X0, 4.6, 5], [X0, 3.4, 10], [X, 4.2, 3], [M, 4.4, 2], [M, 5.1, 8], [H, 4.6, 6], [H, 3.9, 12]], -6);
function bigOak(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  block(g, 0x6b4426, -0.2 * s, 0.2 * s, 0, 2.6 * s, 0.2 * s, -0.2 * s, 0.022);
  block(g, 0x6b4426, -0.32 * s, 0.32 * s, 0, 0.3 * s, 0.26 * s, -0.26 * s, 0.02);
  const crown = new THREE.Group(); crown.position.y = 2.6 * s; g.add(crown);
  for (const [dx, dy, r, col] of [[0, 0.75, 1.0, 0x3f6e3a], [-0.8, 0.35, 0.75, 0x4a7d40], [0.75, 0.45, 0.7, 0x3a6635], [-0.25, 1.35, 0.7, 0x4a7d40], [0.45, 1.15, 0.6, 0x3f6e3a]]) {
    const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(r * s, 18, 14), flat(col)), 0.024); m.position.set(dx * s, dy * s, 0); crown.add(m);
  }
  // la rama larga hacia la derecha (de la que colgaba la polea)
  const br = block(g, 0x6b4426, 0.1 * s, 1.95 * s, 2.3 * s, 2.46 * s, 0.08 * s, -0.08 * s, 0.02); br.rotation.z = 0.06;
  const tip = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 14, 10), flat(0x4a7d40)), 0.02); tip.position.set(1.95 * s, 2.55 * s, 0); g.add(tip);
  g.userData.crown = crown; oaks.push(g); return g;
}
const oaks = [];

// =====================================================================================
// ISLA (x = 0): el hallazgo de 1795
// =====================================================================================
island(X0, -3, 10);
const oak = bigOak(X0 - 0.6, -1.6);
for (const [x, z, h] of [[-4.2, -4.5, 2.6], [-6, -2.5, 2.2], [4.6, -4, 2.8], [6.2, -6, 2.4], [-2.4, -7, 3], [2.4, -8, 2.6], [7.5, -2.2, 2], [-7.8, -5.5, 2.6]]) k.tree(X0 + x, z, { pine: true, h, leaf: 0x2f5f45 });
for (const [x, z] of [[-2.3, -2.6], [3.6, -2.2], [-3.4, 0.8], [4.4, 0.6]]) { const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), flat(0x3d6b3a)), 0.02); b.scale.y = 0.7; b.position.set(X0 + x, 0.15, z); scene.add(b); }
const HOLE = V(X0 + 1.3, 0, -0.9);
{ // el hundimiento: un círculo hundido con borde de tierra
  const rim = new THREE.Mesh(new THREE.CircleGeometry(0.9, 36), new THREE.MeshLambertMaterial({ color: 0x5a4630 })); rim.rotation.x = -PI / 2; rim.scale.y = 0.75; rim.position.set(HOLE.x, 0.01, HOLE.z); rim.receiveShadow = true; scene.add(rim);
  const pit = new THREE.Mesh(new THREE.CircleGeometry(0.68, 36), new THREE.MeshBasicMaterial({ color: 0x2a1e18 })); pit.rotation.x = -PI / 2; pit.scale.y = 0.75; pit.position.set(HOLE.x, 0.015, HOLE.z); scene.add(pit);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.72, 36), INK); ring.rotation.x = -PI / 2; ring.scale.y = 0.75; ring.position.set(HOLE.x, 0.02, HOLE.z); scene.add(ring);
}
// polea colgada de la rama
const pulley = new THREE.Group(); pulley.position.set(X0 + 1.3, 2.32, -1.6); scene.add(pulley);
{ stick(pulley, V(0, 0.1, 0), V(0, -0.35, 0), 0.012, 0xc9a26a, 0.006);
  block(pulley, 0x7a4b2a, -0.09, 0.09, -0.62, -0.35, 0.05, -0.05, 0.012);
  const wh = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), basic(0xb9bec8)); wh.position.set(0, -0.47, 0.052); pulley.add(wh);
  const ax = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), INK); ax.position.set(0, -0.47, 0.055); pulley.add(ax);
  stick(pulley, V(0.06, -0.47, 0), V(0.06, -1.15, 0), 0.01, 0xc9a26a, 0.005); stick(pulley, V(-0.06, -0.47, 0), V(-0.06, -0.9, 0), 0.01, 0xc9a26a, 0.005);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, PI * 1.5), INK); hook.position.set(0.06, -1.19, 0); pulley.add(hook); }
// marcas en la rama
const marks = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.12), INK); m.position.set(X0 + 1.18 + i * 0.12, 2.38, -1.5); m.rotation.z = 0.4; scene.add(m); return m; });
mist(X0, 7);
// primer plano: piedras, matas y el bote en la orilla
for (const [x, z, r, col] of [[2.9, 3.2, 0.32, 0x77727c], [-2.7, 2.4, 0.26, 0x8f8a90], [3.4, 3.5, 0.18, 0x8f8a90], [-1.0, 4.2, 0.22, 0x77727c]]) { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), flat(col)), 0.018); m.scale.y = 0.6; m.position.set(X0 + x, r * 0.3, z); scene.add(m); }
for (const [x, z] of [[-1.8, 3.2], [1.6, 4.4], [4.2, 2.2], [-3.6, 4.6]]) for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.3 + 0.1 * (i % 3), 5), flat(0x5a9a48)); b.position.set(X0 + x + (i - 2) * 0.06, 0.15, z + 0.02 * i); b.rotation.z = (i - 2) * 0.2; scene.add(b); }
const boat = new THREE.Group(); boat.position.set(X0 - 3.2, 0.05, 7.1); boat.rotation.y = 0.35; scene.add(boat);
{ block(boat, 0x8a5a33, -0.9, 0.9, 0, 0.3, 0.35, -0.35, 0.02); block(boat, 0xc8443a, -0.92, 0.92, 0.22, 0.32, 0.37, -0.37, 0.016); block(boat, 0x6b4426, -0.1, 0.1, 0.3, 0.36, 0.33, -0.33, 0.012);
  stick(boat, V(-0.2, 0.35, 0.2), V(0.9, 0.12, 0.7), 0.025, 0x9a6638, 0.01); }
const groundLantern = lantern(scene);

// =====================================================================================
// CORTE (x = 40): el pozo visto en corte, como un hormiguero
// =====================================================================================
const SW = 1.3, ZF = 0.3, ZB = -0.9, LEV = 2.6;        // medio ancho del pozo, frente, fondo, 3 m entre capas
const LAYERS = [[0, '#3b2a1f'], [0.3, '#6b4a30'], [2.1, '#835a3a'], [4.4, '#9c6e47'], [7, '#7a5843'], [9.3, '#a8845a'], [12, '#867566'], [15, '#6f6a72'], [18, '#78624f'], [21, '#5e5868'], [24, '#4c4859'], [27, '#3f3b4d']];
function paintStrata(g, W, Hh, x0, x1, depth, dark = 1, seed = 1) {
  const r = rng(seed), sc = Hh / depth, px = xw => (xw - x0) / (x1 - x0) * W, edge = (xw, yd) => (yd + 0.18 * Math.sin(xw * 1.1 + yd * 0.7) + 0.08 * Math.sin(xw * 3.3 + yd)) * sc;
  for (let i = 0; i < LAYERS.length; i++) {
    const [y0, col] = LAYERS[i], y1 = i + 1 < LAYERS.length ? LAYERS[i + 1][0] : depth + 2;
    g.fillStyle = col; g.beginPath(); g.moveTo(0, edge(x0, y0));
    for (let s = 0; s <= 30; s++) { const xw = lerp(x0, x1, s / 30); g.lineTo(px(xw), edge(xw, y0)); }
    for (let s = 30; s >= 0; s--) { const xw = lerp(x0, x1, s / 30); g.lineTo(px(xw), edge(xw, y1)); }
    g.fill();
    g.strokeStyle = 'rgba(30,20,40,.45)'; g.lineWidth = 3; g.beginPath(); for (let s = 0; s <= 30; s++) { const xw = lerp(x0, x1, s / 30); s ? g.lineTo(px(xw), edge(xw, y0)) : g.moveTo(px(xw), edge(xw, y0)); } g.stroke();
  }
  for (let i = 0; i < 160; i++) {                       // piedritas
    const x = r() * W, y = (0.4 + r() * (depth - 0.4)) * sc, rr = 3 + r() * 9;
    g.fillStyle = r() < 0.5 ? 'rgba(40,28,40,.35)' : 'rgba(255,240,215,.22)'; g.beginPath(); g.ellipse(x, y, rr * 1.4, rr, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 9; i++) {                         // piedras grandes con borde
    const x = r() * W, y = (3 + r() * (depth - 4)) * sc, rr = 12 + r() * 16;
    g.fillStyle = ['#8f8a90', '#77727c', '#a39a8a'][i % 3]; g.beginPath(); g.ellipse(x, y, rr * 1.3, rr, r(), 0, 7); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 4; g.stroke();
  }
  g.strokeStyle = '#2a1a12'; g.lineWidth = 3;           // raíces arriba
  for (let i = 0; i < 14; i++) { let x = r() * W, y = 0.25 * sc; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (r() - 0.5) * 18; y += (0.15 + r() * 0.25) * sc; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 6; i++) {                         // caracolitos
    const x = r() * W, y = (6 + r() * (depth - 8)) * sc; g.strokeStyle = 'rgba(240,225,200,.55)'; g.lineWidth = 3; g.beginPath(); for (let a = 0; a < 12; a += 0.3) g.lineTo(x + Math.cos(a) * a * 0.9, y + Math.sin(a) * a * 0.9); g.stroke();
  }
  g.fillStyle = '#3d6b33'; g.fillRect(0, 0, W, 0.12 * sc);   // pasto arriba
  g.strokeStyle = '#5a9a48'; g.lineWidth = 3; for (let i = 0; i < 70; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, 0.12 * sc); g.lineTo(x + (r() - 0.5) * 8, -2); g.stroke(); }
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, `rgba(14,8,30,${0.15 * (1 - dark)})`); gr.addColorStop(1, `rgba(14,8,30,${0.18 + 0.2 * (1 - dark)})`); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
}
const ringTex = canvasTex(64, 64, (g, w) => { g.fillStyle = '#c99a62'; g.fillRect(0, 0, w, w); g.strokeStyle = '#8a5f33'; g.lineWidth = 3; for (const r of [8, 16, 24]) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, 7); g.stroke(); } g.fillStyle = '#6b4426'; g.beginPath(); g.arc(w / 2, w / 2, 3, 0, 7); g.fill(); });
const fillTex = canvasTex(160, 2048, (g, w, h) => {
  const r = rng(77), top = x => 14 + 5 * Math.sin(x * 0.09) + 3 * Math.sin(x * 0.23 + 1);
  g.fillStyle = '#8a6444'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 2) g.lineTo(x, top(x)); g.lineTo(w, h); g.fill();
  for (let i = 0; i < 420; i++) { g.fillStyle = r() < 0.5 ? 'rgba(50,30,20,.35)' : 'rgba(255,230,190,.22)'; g.beginPath(); g.ellipse(r() * w, 30 + r() * h, 2 + r() * 5, 2 + r() * 3, 0, 0, 7); g.fill(); }
  g.strokeStyle = '#1e1428'; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= w; x += 2) g.lineTo(x, top(x)); g.stroke();
});
fillTex.wrapS = fillTex.wrapT = THREE.ClampToEdgeWrapping;
const waveTex = canvasTex(256, 32, (g, w, h) => { g.fillStyle = 'rgba(190,230,255,.95)'; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 4) g.lineTo(x, h / 2 + 7 * Math.sin(x / w * PI * 6)); g.lineTo(w, h); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, h / 2 + 7 * Math.sin(x / w * PI * 6)); g.stroke(); }, 1, 1);
waveTex.wrapT = THREE.ClampToEdgeWrapping;

/** Corte de un pozo con capas de tierra, plataformas de troncos y relleno/agua. Devuelve piezas para animar. */
function buildCut(cx, depth, { ground = true, levels = 9, seed = 1 } = {}) {
  const out = { cx, logs: [], marks: [] };
  const sideW = 7 - SW;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? cx - 7 : cx + SW, x1 = s < 0 ? cx - SW : cx + 7;
    const p = picture(scene, sideW, depth, (x0 + x1) / 2, -depth / 2, ZF, (g, W, Hh) => paintStrata(g, W, Hh, x0, x1, depth, 1, seed + s), 300);
    p.material.transparent = false;
    const wall = picture(scene, ZF - ZB, depth, cx + s * SW, -depth / 2, (ZF + ZB) / 2, (g, W, Hh) => paintStrata(g, W, Hh, x0, x0 + 1.2, depth, 0.65, seed + 5 + s), 64);
    wall.rotation.y = -s * PI / 2; wall.material.transparent = false;
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.07, depth), INK); edge.position.set(cx + s * SW, -depth / 2, ZF + 0.005); scene.add(edge);
  }
  const bw = picture(scene, SW * 2, depth, cx, -depth / 2, ZB, (g, W, Hh) => paintStrata(g, W, Hh, cx - SW, cx + SW, depth, 0.55, seed + 9), 128); bw.material.transparent = false;
  if (ground) { const top = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.07), INK); top.position.set(cx, 0, ZF + 0.006); scene.add(top); }
  if (ground) {                                          // la isla, cortada al frente y con el agujero del pozo
    const sh = new THREE.Shape(); sh.moveTo(-9, -ZF); sh.lineTo(-SW, -ZF); sh.lineTo(-SW, -ZB); sh.lineTo(SW, -ZB); sh.lineTo(SW, -ZF); sh.lineTo(9, -ZF);
    for (let a = 0; a <= 24; a++) { const ang = (a / 24) * PI; sh.lineTo(9 * Math.cos(ang), -ZF + 10 * Math.sin(ang)); }
    island(cx, 0, 0, sh);
  }
  // plataformas de troncos cada 3 m (la última, a 27 m, es donde aparece la piedra)
  const logMat = flat(0x7a5232), endMat = new THREE.MeshBasicMaterial({ map: ringTex });
  for (let L = 1; L <= levels; L++) {
    const y = -LEV * L, g = new THREE.Group(); g.position.set(cx, y, 0); scene.add(g); g.userData.y = y;
    if (L < 9) for (let i = 0; i < 7; i++) {
      const lx = -1.1 + i * 2.2 / 6;
      const lg = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.55, 14), logMat), 0.018); lg.rotation.x = PI / 2; lg.position.set(lx, 0.17, -0.62); g.add(lg);
      const e = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), endMat); e.position.set(lx, 0.17, -0.34); g.add(e);
    }
    out.logs.push(g);
    const mk = new THREE.Group(); mk.position.set(cx - 2.25, y + 0.25, ZF + 0.02); scene.add(mk);
    mk.add(k.sign(`${L * 3} m`, 0.78, 0.36, { bg: L === 9 ? '#ff8a5a' : '#ffd23a' }));
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.05), INK); tick.position.set(0.66, -0.07, 0); mk.add(tick);
    out.marks.push(mk);
  }
  out.fill = new THREE.Mesh(new THREE.PlaneGeometry(SW * 2 - 0.02, 32), new THREE.MeshBasicMaterial({ map: fillTex, transparent: true })); out.fill.position.set(cx, -16, 0.2); scene.add(out.fill);
  out.water = new THREE.Mesh(new THREE.PlaneGeometry(SW * 2 - 0.02, 1), new THREE.MeshBasicMaterial({ color: 0x3f86c8, transparent: true, opacity: 0.62, depthWrite: false })); out.water.position.z = 0.16; scene.add(out.water);
  out.wave = new THREE.Mesh(new THREE.PlaneGeometry(SW * 2 - 0.02, 0.24), new THREE.MeshBasicMaterial({ map: waveTex.clone(), transparent: true, depthWrite: false })); out.wave.position.z = 0.17; out.wave.material.map.needsUpdate = true; scene.add(out.wave);
  out.bubbles = Array.from({ length: 16 }, (_, i) => { const b = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.9, depthWrite: false })); b.position.z = 0.18; b.userData = { x: -1.1 + (i * 0.71) % 2.2, sp: 0.8 + (i % 4) * 0.3, off: i * 0.37 }; scene.add(b); return b; });
  out.water.visible = out.wave.visible = false; out.bubbles.forEach(b => { b.visible = false; });
  /** Pone el fondo del pozo en D y el agua en W (W = null: sin agua). */
  out.set = (t, D, W, reveal = true) => {
    out.fill.position.y = D + 0.02 - 16;
    out.logs.forEach((g, i) => { const s = reveal ? back(clamp01((D < g.userData.y + 0.05 ? 1 : 0) * 1)) : 1; g.visible = D < g.userData.y + 0.05; g.scale.setScalar(1); });
    out.marks.forEach(m => { m.visible = D < m.position.y - 0.2; });
    const wet = W !== null && W > D - 0.5;
    out.water.visible = out.wave.visible = wet;
    out.bubbles.forEach(b => { b.visible = wet; });
    if (!wet) return;
    const hgt = Math.max(W - (D - 0.3), 0.01); out.water.scale.y = hgt; out.water.position.set(cx, D - 0.3 + hgt / 2, 0.16);
    out.wave.position.set(cx, W + 0.06, 0.17); out.wave.material.map.offset.x = t * 0.35;
    out.bubbles.forEach(b => { const d = b.userData, u = ((t * d.sp + d.off) % 1.6) / 1.6; b.position.set(cx + d.x + 0.06 * Math.sin(t * 5 + d.off * 9), lerp(D - 0.1, W - 0.05, u), 0.18); b.scale.setScalar(0.6 + u); b.material.opacity = 0.9 * (1 - u * 0.6); });
  };
  return out;
}
const cut = buildCut(X, 30, { seed: 2 });
// arriba del corte: roble, trípode con polea, soga y balde, farol
bigOak(X - 3.6, -2.6, 0.85);
for (const [x, z, h] of [[-6, -5, 2.6], [4.2, -4, 2.8], [6, -2.5, 2.2], [2.5, -7, 3]]) k.tree(X + x, z, { pine: true, h, leaf: 0x2f5f45 });
const APEX = V(X + 0.1, 2.7, -0.3);
stick(scene, V(X - 1.55, 0, 0.1), APEX, 0.04, 0x7a4b2a, 0.014); stick(scene, V(X + 1.65, 0, 0.1), APEX, 0.04, 0x7a4b2a, 0.014); stick(scene, V(X + 0.1, 0, -1.8), APEX, 0.04, 0x7a4b2a, 0.014);
const apexWheel = k.wheel(scene, APEX.x, APEX.y - 0.12, APEX.z + 0.08, 0.14);
const rope = stick(scene, APEX, V(X, -1, -0.3), 0.012, 0xc9a26a, 0.005);
const rope2 = stick(scene, APEX, V(X + 1, 0, -0.3), 0.012, 0xc9a26a, 0.005);
const bucket = new THREE.Group(); scene.add(bucket);
{ const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.28, 16), flat(0x8a6a4a)), 0.016); b.position.y = -0.2; bucket.add(b);
  for (const y of [-0.1, -0.3]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.19 - (y + 0.1) * 0.1, 0.012, 6, 20), INK); h.rotation.x = PI / 2; h.position.y = y; bucket.add(h); }
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.01, 6, 16, PI), INK); hd.position.y = -0.06; bucket.add(hd);
  const dirt = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), flat(0x7a5a3a)), 0.012); dirt.scale.y = 0.45; dirt.position.y = -0.07; bucket.add(dirt); }
const ladder = new THREE.Group(); ladder.position.set(X - 0.95, 0, -0.55); scene.add(ladder);
for (const s of [-1, 1]) stick(ladder, V(s * 0.2, 0.4, 0), V(s * 0.2, -26, 0), 0.03, 0x9a6638, 0.012);
for (let y = 0.2; y > -26; y -= 0.34) stick(ladder, V(-0.2, y, 0), V(0.2, y, 0), 0.022, 0x9a6638, 0.01);
const shaftLantern = lantern(scene, 1.2);
const lajas = [];
for (let i = 0; i < 4; i++) { const b = block(scene, [0x8f8f96, 0x7d7c86, 0x9a98a0, 0x86858f][i], X - 1.25 + i * 0.64, X - 0.68 + i * 0.64, -0.62, -0.5, -0.4, -0.88, 0.014); lajas.push(b); }
const stone = new THREE.Group(); scene.add(stone);
{ block(stone, 0x6f6a72, -0.3, 0.3, -0.2, 0.2, 0.07, -0.07, 0.018);
  const sy = picture(stone, 0.52, 0.32, 0, 0, 0.075, (g, W, Hh) => { const r = rng(9); g.strokeStyle = '#1e1428'; g.lineWidth = 7; g.lineCap = 'round';
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) { const x = 22 + i * (W - 44) / 5, y = Hh * (0.3 + row * 0.42), q = r(); g.beginPath();
      if (q < 0.25) g.arc(x, y, 12, 0, 7); else if (q < 0.5) { g.moveTo(x - 12, y + 12); g.lineTo(x, y - 12); g.lineTo(x + 12, y + 12); g.closePath(); }
      else if (q < 0.75) { g.moveTo(x - 12, y - 12); g.lineTo(x + 12, y + 12); g.moveTo(x + 12, y - 12); g.lineTo(x - 12, y + 12); } else { g.rect(x - 10, y - 10, 20, 20); g.moveTo(x, y - 10); g.lineTo(x, y + 10); }
      g.stroke(); } }); sy.material.transparent = true; }
mist(X, 5, [-4, -10]);

// =====================================================================================
// MÁQUINAS (x = 80): bombas, vapor y grúas. Y la búsqueda de 1909 (a la derecha, x = 86)
// =====================================================================================
island(M, -3, 10.5);
for (const [x, z, h] of [[-5.5, -5, 2.6], [-7.5, -2, 2.2], [9, -4, 2.8], [3.2, -7.5, 3], [-2.8, -8, 2.6], [10.5, -1.5, 2.4]]) k.tree(M + x, z, { pine: true, h, leaf: 0x2f5f45 });
const ZM = -0.8;
{ // boca del pozo con brocal de madera
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), basic(0x17101c)); hole.rotation.x = -PI / 2; hole.position.set(M, 0.012, ZM); scene.add(hole);
  block(scene, 0x7a4b2a, M - 0.8, M + 0.8, 0, 0.22, ZM + 0.62, ZM + 0.48, 0.016); block(scene, 0x7a4b2a, M - 0.8, M + 0.8, 0, 0.22, ZM - 0.48, ZM - 0.62, 0.016);
  block(scene, 0x6b4426, M - 0.8, M - 0.66, 0, 0.22, ZM + 0.5, ZM - 0.5, 0.016); block(scene, 0x6b4426, M + 0.66, M + 0.8, 0, 0.22, ZM + 0.5, ZM - 0.5, 0.016);
}
// máquina de vapor
const ENG = V(M - 2.5, 0, -0.9);
const flywheel = new THREE.Group(); flywheel.position.set(ENG.x + 0.95, 0.62, ENG.z + 0.42); scene.add(flywheel);
{ block(scene, 0x3a3f4d, ENG.x - 0.85, ENG.x + 0.85, 0, 0.18, ENG.z + 0.4, ENG.z - 0.4, 0.016);
  const boiler = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.5, 22), flat(0x8a3f30)), 0.022); boiler.rotation.z = PI / 2; boiler.position.set(ENG.x, 0.62, ENG.z); scene.add(boiler);
  for (const dx of [-0.5, 0, 0.5]) { const rr = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.014, 6, 28), INK); rr.rotation.y = PI / 2; rr.position.set(ENG.x + dx, 0.62, ENG.z); scene.add(rr); }
  const chim = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.3, 14), flat(0x2b2f3a)), 0.016); chim.position.set(ENG.x - 0.5, 1.55, ENG.z); scene.add(chim);
  const lip = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 14), flat(0x2b2f3a)), 0.012); lip.position.set(ENG.x - 0.5, 2.2, ENG.z); scene.add(lip);
  for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.98), INK); sp.rotation.z = i * PI / 6; flywheel.add(sp); }
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.52, 30), INK); flywheel.add(rim);
  const rim2 = new THREE.Mesh(new THREE.RingGeometry(0.455, 0.505, 30), basic(0x6a6f7a)); rim2.position.z = 0.003; flywheel.add(rim2);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), basic(0xb9bec8)); hub.position.z = 0.005; flywheel.add(hub);
}
const fireDoor = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), new THREE.MeshBasicMaterial({ color: 0xff9a3a })); fireDoor.position.set(ENG.x - 0.35, 0.55, ENG.z + 0.43); scene.add(fireDoor);
{ const fr = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 16), INK); fr.position.set(ENG.x - 0.35, 0.55, ENG.z + 0.432); scene.add(fr); }
const fireGlow = glow(scene, 0.6, ENG.x - 0.35, 0.55, ENG.z + 0.5, 0xffa040, 1);
const piston = stick(scene, V(0, 0, 0), V(1, 0, 0), 0.025, 0xb9bec8, 0.01);
stick(scene, V(ENG.x + 0.7, 0.3, ENG.z + 0.1), V(M - 0.75, 0.15, ZM + 0.1), 0.05, 0x3a3f4d, 0.014);     // caño de la máquina al pozo
const smoke = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), new THREE.MeshBasicMaterial({ color: 0xd9d2e6, transparent: true })); scene.add(m); return m; });
// bomba con caño que escupe agua al mar
const PUMP = V(M + 2.0, 0, -0.5);
block(scene, 0x4f6a8a, PUMP.x - 0.25, PUMP.x + 0.25, 0, 0.9, PUMP.z + 0.22, PUMP.z - 0.22, 0.018);
block(scene, 0x3a4f6a, PUMP.x - 0.3, PUMP.x + 0.3, 0.9, 1.0, PUMP.z + 0.26, PUMP.z - 0.26, 0.016);
stick(scene, V(M + 0.75, 0.15, ZM + 0.1), V(PUMP.x - 0.25, 0.3, PUMP.z), 0.05, 0x3a3f4d, 0.014);
stick(scene, V(PUMP.x + 0.25, 0.75, PUMP.z), V(PUMP.x + 1.1, 0.75, PUMP.z), 0.06, 0x3a3f4d, 0.016);
const lever = stick(scene, V(0, 0, 0), V(1, 0, 0), 0.03, 0x7a4b2a, 0.012);
const drops = Array.from({ length: 14 }, (_, i) => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), flat(0x6fb5ea)), 0.01); m.userData.off = i / 14; scene.add(m); return m; });
// grúa (atrás)
const CR = V(M + 0.4, 0, -3.4);
block(scene, 0x3a3f4d, CR.x - 0.6, CR.x + 0.6, 0, 0.35, CR.z + 0.5, CR.z - 0.5, 0.018);
const crane = new THREE.Group(); crane.position.set(CR.x, 0.35, CR.z); scene.add(crane);
{ block(crane, 0xd9a441, -0.35, 0.35, 0, 0.5, 0.35, -0.35, 0.016); block(crane, 0x2b2f3a, -0.25, 0.05, 0.5, 0.85, 0.3, -0.3, 0.014);
  const boom = new THREE.Group(); boom.position.set(0.2, 0.45, 0); boom.rotation.z = -0.42; crane.add(boom);
  for (const z of [-0.12, 0.12]) { stick(boom, V(0, 0, z), V(0, 4.2, z), 0.035, 0xd9a441, 0.012); }
  for (let y = 0.3; y < 4.1; y += 0.45) { stick(boom, V(0, y, -0.12), V(0, y + 0.42, 0.12), 0.015, 0xd9a441, 0.008); }
  crane.userData.boom = boom; }
const craneCable = stick(scene, V(0, 0, 0), V(1, 0, 0), 0.012, 0x2b2f3a, 0.005);
const craneBucket = new THREE.Group(); scene.add(craneBucket);
{ block(craneBucket, 0x5a5f6a, -0.25, 0.25, -0.35, 0, 0.22, -0.22, 0.016); const d = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), flat(0x7a5a3a)), 0.012); d.scale.set(1.2, 0.4, 1); craneBucket.add(d); }
// velas por los que murieron (sin nada gráfico)
const candles = Array.from({ length: 6 }, (_, i) => {
  const g = new THREE.Group(); g.position.set(M - 1.25 + i * 0.5, 0, 1.7); scene.add(g);
  const c0 = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 10), flat(0xf4efe0)), 0.01); c0.position.y = 0.12; g.add(c0);
  const fl = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb347 })), 0.008); fl.scale.y = 1.7; fl.position.y = 0.31; g.add(fl);
  g.userData.fl = fl; g.userData.gl = glow(g, 0.3, 0, 0.31, 0.03, 0xffc070, i); return g;
});
// lámparas en postes
for (const x of [-3.9, 3.6, 7.7]) { const g = new THREE.Group(); g.position.set(M + x, 0, -1.2); scene.add(g); block(g, 0x4a3222, -0.04, 0.04, 0, 1.9, 0.04, -0.04, 0.012); block(g, 0x4a3222, -0.04, 0.25, 1.86, 1.92, 0.04, -0.04, 0.01); const l = lantern(g, 1.1); l.position.set(0.22, 1.5, 0); }
// 1909: torre de perforación de madera
const DR = V(M + 6.4, 0, -1.3);
{ stick(scene, V(DR.x - 1.0, 0, DR.z + 0.6), V(DR.x, 3.3, DR.z), 0.045, 0x8a5a33, 0.014); stick(scene, V(DR.x + 1.0, 0, DR.z + 0.6), V(DR.x, 3.3, DR.z), 0.045, 0x8a5a33, 0.014); stick(scene, V(DR.x, 0, DR.z - 1.0), V(DR.x, 3.3, DR.z), 0.045, 0x8a5a33, 0.014);
  for (const y of [0.9, 1.8]) { const w = 1.0 * (1 - y / 3.3); stick(scene, V(DR.x - w, y, DR.z + 0.6 * (1 - y / 3.3)), V(DR.x + w, y, DR.z + 0.6 * (1 - y / 3.3)), 0.025, 0x8a5a33, 0.01); }
  block(scene, 0x5a4632, DR.x - 0.5, DR.x + 0.5, 0, 0.12, DR.z + 0.5, DR.z - 0.5, 0.014); }
const drillWheel = k.wheel(scene, DR.x, 3.15, DR.z + 0.08, 0.16);
const drillRod = stick(scene, V(0, 0, 0), V(1, 0, 0), 0.03, 0x6a6f7a, 0.01);
const flag = new THREE.Group(); scene.add(flag);
{ stick(flag, V(0, -0.1, 0), V(0, 0.75, 0), 0.015, 0x7a4b2a, 0.006);
  const f = picture(flag, 0.46, 0.3, 0.24, 0.6, 0.01, (g, W, Hh) => { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8443a'; g.fillRect(0, i * Hh / 7, W, Hh / 7 + 1); } g.fillStyle = '#2f4a8a'; g.fillRect(0, 0, W * 0.42, Hh * 0.55); g.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(14 + (i % 4) * 24, 14 + Math.floor(i / 4) * 22, 4, 0, 7); g.fill(); } g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(0, 0, W, Hh); });
  flag.userData.f = f; }
mist(M, 7);

// =====================================================================================
// HOY (x = 120): excavadora, perforadora, reflectores. Debajo, el pozo inundado.
// =====================================================================================
island(H, -3, 10.5);
for (const [x, z, h] of [[-6, -5.5, 2.6], [-8, -2.2, 2.2], [7.8, -5, 2.8], [3.5, -8, 3], [-3, -8.5, 2.6]]) k.tree(H + x, z, { pine: true, h, leaf: 0x2f5f45 });
const PIT = V(H + 0.4, 0, -0.5);
{ const hole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), basic(0x120c18)); hole.rotation.x = -PI / 2; hole.position.set(PIT.x, 0.012, PIT.z); scene.add(hole);
  const casing = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.3, 28, 1, true), flat(0x7d838f, { side: THREE.DoubleSide })), 0.018); casing.position.set(PIT.x, 0.15, PIT.z); scene.add(casing);
  for (const [dx, dz, r] of [[-1.1, 0.4, 0.5], [1.0, 0.7, 0.4], [-0.3, 1.1, 0.35]]) { const mud = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshLambertMaterial({ color: 0x5a4630 })); mud.rotation.x = -PI / 2; mud.scale.y = 0.6; mud.position.set(PIT.x + dx, 0.008, PIT.z + dz); mud.receiveShadow = true; scene.add(mud); }
  const pile = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 12), flat(0x7a5a3a)), 0.02); pile.scale.y = 0.45; pile.position.set(H - 4.2, 0, -1.8); scene.add(pile); }
// excavadora
const EX = V(H - 2.1, 0, -0.7);
const exc = new THREE.Group(); exc.position.copy(EX); scene.add(exc);
const exArm = { boom: new THREE.Group(), stick: new THREE.Group(), bucket: new THREE.Group() };
{ block(exc, 0x2b2f3a, -0.95, 0.95, 0, 0.36, 0.55, 0.2, 0.016); block(exc, 0x2b2f3a, -0.95, 0.95, 0, 0.36, -0.2, -0.55, 0.016);
  exc.userData.wheels = [-0.7, -0.23, 0.23, 0.7].map(x => k.wheel(exc, x, 0.18, 0.56, 0.14));
  const body = new THREE.Group(); body.position.y = 0.36; exc.add(body); exc.userData.body = body;
  block(body, 0xf2b632, -0.9, 0.7, 0, 0.62, 0.45, -0.45, 0.02); block(body, 0x3a3f4d, -1.0, -0.6, 0.05, 0.55, 0.4, -0.4, 0.016);
  block(body, 0xf2b632, 0.0, 0.62, 0.62, 1.32, 0.42, -0.1, 0.018);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.5), basic(0x9fd0ea)); win.position.set(0.31, 1.0, 0.425); body.add(win);
  const ref = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.5), basic(0xd9f0ff)); ref.position.set(0.22, 1.0, 0.428); ref.rotation.z = 0.5; body.add(ref);
  const pipe = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10), flat(0x2b2f3a)), 0.01); pipe.position.set(-0.55, 0.85, -0.2); body.add(pipe);
  // brazo: pluma, balancín y cuchara
  exArm.boom.position.set(0.6, 0.45, 0.05); body.add(exArm.boom);
  block(exArm.boom, 0xf2b632, -0.09, 0.09, 0, 1.7, 0.1, -0.1, 0.016);
  exArm.stick.position.y = 1.7; exArm.boom.add(exArm.stick);
  block(exArm.stick, 0xe0a428, -0.07, 0.07, -1.2, 0, 0.08, -0.08, 0.014);
  exArm.bucket.position.y = -1.2; exArm.stick.add(exArm.bucket);
  block(exArm.bucket, 0x5a5f6a, -0.05, 0.38, -0.32, 0, 0.2, -0.2, 0.014);
  for (const x of [0.08, 0.2, 0.32]) { const tth = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 6), flat(0xb9bec8)), 0.008); tth.rotation.z = PI; tth.position.set(x, -0.36, 0); exArm.bucket.add(tth); }
  const ld = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), flat(0x7a5a3a)), 0.012); ld.scale.set(1.1, 0.5, 1); ld.position.set(0.17, -0.06, 0); exArm.bucket.add(ld); exArm.load = ld;
}
// perforadora
const RIG = V(H + 3.2, 0, -2.4);
{ block(scene, 0x3a3f4d, RIG.x - 0.8, RIG.x + 0.8, 0, 0.4, RIG.z + 0.6, RIG.z - 0.6, 0.018);
  for (const dx of [-0.25, 0.25]) block(scene, 0xc8443a, RIG.x + dx - 0.05, RIG.x + dx + 0.05, 0.4, 4.6, RIG.z + 0.05, RIG.z - 0.05, 0.014);
  for (let y = 0.8; y < 4.5; y += 0.5) stick(scene, V(RIG.x - 0.25, y, RIG.z + 0.06), V(RIG.x + 0.25, y + 0.45, RIG.z + 0.06), 0.015, 0xf4f1e8, 0.006);
  block(scene, 0xc8443a, RIG.x - 0.4, RIG.x + 0.4, 4.6, 4.75, RIG.z + 0.12, RIG.z - 0.12, 0.014);
  block(scene, 0xf2b632, RIG.x + 0.35, RIG.x + 0.85, 0.4, 0.95, RIG.z + 0.45, RIG.z - 0.25, 0.016); }
const rigPipe = new THREE.Group(); rigPipe.position.set(RIG.x, 0.4, RIG.z + 0.22); scene.add(rigPipe);
{ const p = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 12), flat(0x9aa0a8)), 0.01); p.position.y = 1.7; rigPipe.add(p);
  for (let y = 0.3; y < 3.4; y += 0.4) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.125), INK); s.position.set(0.055, y, 0); rigPipe.add(s); } }
const rigPuffs = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xcfc8dc, transparent: true })); scene.add(m); return m; });
// reflectores
const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
for (const [x, z, dir] of [[-4.6, -1.6, 1], [5.2, -1.0, -1]]) {
  const g = new THREE.Group(); g.position.set(H + x, 0, z); scene.add(g);
  block(g, 0x2b2f3a, -0.05, 0.05, 0, 3.0, 0.05, -0.05, 0.014);
  block(g, 0x2b2f3a, -0.3, 0.3, 3.0, 3.35, 0.12, -0.12, 0.014);
  for (const dx of [-0.15, 0.15]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), basic(0xfff6d0)); l.position.set(dx, 3.17, 0.125); g.add(l); glow(g, 0.7, dx, 3.17, 0.2, 0xfff0b0, dx * 9); }
  const beam = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.2, 3.1), new THREE.Vector2(0.2, 3.1), new THREE.Vector2(dir * 3.4 + 1.1, 0), new THREE.Vector2(dir * 3.4 - 1.1, 0)])), beamMat); beam.position.z = 0.05; g.add(beam);
}
// el pozo de hoy, en corte, debajo de todo
const cutH = buildCut(PIT.x, 18, { ground: false, levels: 6, seed: 6 });
const deepQ = k.glyph('?', '#ffd23a', 1.4);
const deepRock = new THREE.Group(); deepRock.position.set(PIT.x, -15.75, -0.2); scene.add(deepRock);
{ const rk = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), flat(0x3a3040)), 0.02); rk.scale.set(1.5, 0.75, 0.7); rk.position.y = 0.2; deepRock.add(rk); }
const deepGlints = [0, 1, 2, 3].map(() => k.glyph('✦', '#fff1a8', 0.3));
mist(H, 6);

// ---------- partículas ----------
const sparks = [0, 1, 2, 3, 4].map(() => k.glyph('✦', '#fff1a8', 0.32));
const qMark = k.glyph('?', '#ffd23a', 0.6), qMark2 = k.glyph('?', '#ffd23a', 0.55), bang = k.glyph('!', '#ffd23a', 0.6), bang2 = k.glyph('!', '#ffd23a', 0.55), qMark3 = k.glyph('?', '#ffd23a', 0.6);
const coinG = [0, 1, 2, 3, 4, 5].map(() => k.glyph('£', '#ffd23a', 0.3));
const puffA = k.puffs(5), puffB = k.puffs(5), puffC = k.puffs(4);
const jets = Array.from({ length: 16 }, (_, i) => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), flat(0x6fb5ea)), 0.01); m.visible = false; m.userData.i = i; scene.add(m); return m; });
function makeClods(n = 4) { return Array.from({ length: n }, () => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), flat(0x6b4a30)), 0.01); m.visible = false; scene.add(m); return m; }); }
function clods(pool, t, x, y, z, s, kk, speed, on) {
  const ph = t * speed + kk, tau = (((ph - PI / 2) % (2 * PI)) + 2 * PI) % (2 * PI) / speed;
  pool.forEach((m, i) => { const tt = tau - i * 0.04; m.visible = on && tt > 0 && tt < 0.6; if (!m.visible) return;
    m.position.set(x + s * (0.75 + (1.0 + 0.35 * i) * tt), y + 0.1 + (2.3 + 0.5 * (i % 2)) * tt - 4.9 * tt * tt, z + 0.35 + 0.06 * i); m.rotation.set(tt * 8, tt * 5, 0); });
}

// ---------- herramientas ----------
function makeTool(kind) {
  const g = new THREE.Group(); scene.add(g);
  const h = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.05, 8), flat(0x9a6638)), 0.01); h.position.y = -0.42; g.add(h);
  if (kind === 'shovel') { const b = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.025), flat(0xa9aeb8)), 0.012); b.position.y = -1.04; g.add(b); }
  else { const b = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.05), flat(0xa9aeb8)), 0.012); b.position.y = -0.93; g.add(b); }
  g.visible = false; return g;
}
function holdTool(tool, a, b, on = true) { tool.visible = on; if (!on) return; tool.position.copy(a); tmp2.copy(b).sub(a).normalize(); tool.quaternion.setFromUnitVectors(Ydn, tmp2); }
/** Cavar con pico o pala: s = lado de la herramienta (-1 izquierda, 1 derecha). */
function dig(t, x, y, z, s, kk, speed = 5.6) {
  const u = 0.5 + 0.5 * Math.sin(t * speed + kk);
  const a = V(x + s * 0.3, y + lerp(1.32, 0.95, u), z + 0.3), b = V(x + s * 0.56, y + lerp(1.02, 0.55, u), z + 0.36);
  return { a, b, pose: { x, y, z, face: s * 0.5, lean: 0.2 * u, crouch: 0.22 * u, handR: s > 0 ? a : b, handL: s > 0 ? b : a, wR: 1, wL: 1, look: V(x + s * 0.7, y + 0.9, z + 2.6) } };
}
function helmet(toon, color = 0xf2c232) {
  const g = new THREE.Group(); g.position.y = 0.07; g.rotation.x = -0.12; toon.head.add(g);
  g.add(outlined(new THREE.Mesh(new THREE.SphereGeometry(0.33, 22, 12, 0, PI * 2, 0, PI / 2), flat(color)), 0.02));
  const brim = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.03, 24), flat(color)), 0.012); g.add(brim);
  const ridge = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.62), flat(color)), 0.01); ridge.position.y = 0.3; ridge.rotation.x = 0; g.add(ridge);
}
const popScale = (toon, s) => { toon.root.scale.multiplyScalar(Math.max(s, 0.001)); toon.root.updateMatrixWorld(true); };

// ---------- personajes ----------
const T = o => { const t = makeToon(o); scene.add(t.root); return t; };
const daniel = T({ shirt: 0x3b6fb0, hair: 0x8a4a22, detail: ['collar', 'belt'], trim: 0xf4f1e8 });
const john = T({ shirt: 0xc8553d, hair: 0x2b2118, hat: { type: 'bowler', color: 0x4a3222, band: 0x1e1428 }, detail: ['buttons'] });
const anthony = T({ shirt: 0x4f8f5a, hair: 0xe0b050, detail: ['belt', 'collar'], trim: 0xf0e0b0 });
const w1 = T({ shirt: 0x8a6bbf, hair: 0x3a2a1e, hat: { type: 'bowler', color: 0x2b2f3a }, mustache: true, detail: ['buttons', 'belt'] });
const w2 = T({ shirt: 0xd9a441, hair: 0x6b4a2a, hat: { type: 'fedora', color: 0x5a4632, band: 0x2b2118 }, detail: ['apron'], trim: 0xe9e4d6 });
const w3 = T({ shirt: 0x3b82c4, hair: 0x9aa0a8, mustache: true, detail: ['belt'] });
const m1 = T({ shirt: 0x5d6772, hair: 0x2b2118, hat: { type: 'kepi', color: 0x2b2f3a }, detail: ['apron'], trim: 0x8a6a4a });
const m2 = T({ shirt: 0xb5654a, hair: 0xc98a3a, detail: ['buttons', 'belt'] });
const m3 = T({ shirt: 0x6a8fd0, hair: 0x23262d, hat: { type: 'fedora', color: 0x3a3f4d, band: 0x8f2433 }, mustache: true, detail: ['collar'] });
const fdr = T({ shirt: 0xe9e4d6, hair: 0x3a2a1e, hat: { type: 'boater', color: 0xf0d78a, band: 0x2f4a8a }, detail: ['collar', 'tie'], trim: 0xffffff });
const bowdoin = T({ shirt: 0x2f4a8a, hair: 0x9aa0a8, hat: { type: 'top', color: 0x23262d, band: 0x8f2433 }, mustache: true, detail: ['buttons', 'belt'] });
const h1 = T({ shirt: 0xf08a24, hair: 0x2b2118, detail: ['belt', 'badge'] }); helmet(h1);
const geo = T({ shirt: 0x6a8f5a, hair: 0xb9bec8, mustache: true, detail: ['collar', 'buttons'], trim: 0xf4f1e8 });
k.walker({ toon: { shirt: 0x8a6a4a, hair: 0x2b2118, hat: { type: 'bowler', color: 0x3a3f4d } }, cx: M - 1, z: -4.6, speed: 0.75, off: 2, dir: 1 });
helmet(k.walker({ toon: { shirt: 0xf08a24, hair: 0x6b4a2a, detail: ['belt'] }, cx: H, z: -4.0, speed: 0.8, off: 5, dir: -1 }), 0xf4f1e8);
const tools = { dan: makeTool('shovel'), john: makeTool('pick'), w1: makeTool('pick'), w2: makeTool('shovel'), m1: makeTool('shovel'), h1: makeTool('shovel') };
const cl = { dan: makeClods(), john: makeClods(), w1: makeClods(), w2: makeClods(), m1: makeClods(3), h1: makeClods() };
const handLantern = lantern(scene), poleLantern = lantern(scene, 1.1);
const magn = new THREE.Group(); scene.add(magn);
{ const r = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 22), INK); magn.add(r); const gl = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.55 })); magn.add(gl); stick(magn, V(0, -0.11, 0), V(0, -0.34, 0), 0.02, 0x7a4b2a, 0.008); }
const head = {}, headT = {}; const hp = n => head[n] || (head[n] = V(0, 0, 0)); const hpT = n => headT[n] || (headT[n] = V(0, 0, 0));
const pose = (toon, name, p, t, kk) => { toon.root.visible = true; toon.pose(alive({ blink: blinkAt(t, kk), ...p }, t, kk)); toon.head.getWorldPosition(hp(name)); toon.headTop(hpT(name)); };
const hide = (...ts) => ts.forEach(x => { x.root.visible = false; });

// profundidad del pozo en el corte
const D = t => t < lajasT - 0.1 ? -0.3 - 0.35 * prog(t, c[3], lajasT - 0.1)
  : t < c[4] ? lerp(-0.65, -LEV - 0.02, prog(t, lajasT + 0.5, capaT)) : t < c[5] ? lerp(-LEV - 0.02, -LEV * 8 - 0.02, prog(t, ciaT - 0.1, c[5] - 0.1)) : lerp(-LEV * 8 - 0.02, -LEV * 9, prog(t, c[5], veinT + 0.5));
const climbT0 = c[6] + 0.25;
const Wt = t => t < c[6] + 0.15 ? null : lerp(-LEV * 9 - 0.4, -13.4, prog(t, c[6] + 0.15, c[7]));

// =====================================================================================
// POSES
// =====================================================================================
function poseIsla(t) {
  if (t >= c[3]) { hide(daniel, john, anthony); return false; }
  // Daniel: espera de lejos con el farol, se acerca, descubre, mira la rama, cava
  let p;
  const x0 = -1.5, x1 = 0.15, z = -0.3;
  if (t < c[1]) p = { x: x0, z, face: 0.5, look: V(HOLE.x, 0.2, HOLE.z + 1.5), ...moodAt(t, [[0, 'neutral'], [pozoT, 'surprised'], [escT + 0.4, 'worried']]), y: hop(t, pozoT, 0.12), squash: settle(t, pozoT + 0.4, 0.1) * breathe(t) };
  else if (t < c[1] + 1.1) p = { ...go(t, c[1], c[1] + 1.0, x0, x1), z, mood: 'neutral' };
  else if (t < cavarT - 0.1) {
    const up = win(t, ramaT - 0.2, asiT, 0.25);
    p = { x: x1, z, face: lerp(0.15, 0.55, prog(t, hundT - 0.2, hundT + 0.2)), squash: settle(t, c[1] + 1.0) * settle(t, hundT + 0.35, 0.12) * breathe(t), y: hop(t, hundT, 0.16),
      look: t < hundT - 0.1 ? V(x1, 1.5, 9) : t < ramaT - 0.2 ? V(HOLE.x, 0.4, HOLE.z + 2) : t < asiT ? V(HOLE.x, 2.6, 1.2) : V(4, 1.3, 2.6), tilt: 0.12 * up,
      handR: up > 0 ? V(x1 + 0.4, 1.75, z + 0.3) : talk(t, x1, z, 1, 2), wR: Math.max(up, win(t, c[1] + 1.1, hundT - 0.2, 0.2) * 0.85, win(t, asiT + 0.1, cavarT, 0.2) * 0.85),
      ...moodAt(t, [[0, 'happy'], [hundT - 0.1, 'surprised'], [robleT, 'neutral'], [ramaT - 0.1, 'surprised'], [asiT, 'happy']]) };
  } else { const d = dig(t, x1, 0, z - 0.25, 1, 0); p = { ...d.pose, mood: 'happy' }; holdTool(tools.dan, d.a, d.b); clods(cl.dan, t, x1, 0, z - 0.25, 1, 0, 5.6, true); }
  if (t < cavarT - 0.1) { p.handL = V(p.x - 0.32, 0.95 + 0.02 * Math.sin(t * 3), (p.z || 0) + 0.25); p.wL = 1; tools.dan.visible = false; cl.dan.forEach(m => { m.visible = false; }); }
  pose(daniel, 'dan', p, t, 0);
  if (t < cavarT - 0.1) { daniel.hand(0, handLantern.position); handLantern.position.y -= 0.3; handLantern.visible = true; groundLantern.visible = false; }
  else { handLantern.visible = false; groundLantern.visible = true; groundLantern.position.set(X0 - 0.55, 0, -0.1); }
  // amigos
  if (t >= asiT) {
    const jx = HOLE.x + 1.05, ax = HOLE.x + 2.0;
    if (t < cavarT - 0.1) { pose(john, 'john', { ...go(t, asiT, cavarT - 0.15, X0 + 5.5, jx), z: -0.75, mood: 'happy' }, t, 1); tools.john.visible = false; }
    else { const d = dig(t, jx, 0, -0.75, -1, 1.7); pose(john, 'john', { ...d.pose, mood: 'neutral' }, t, 1); holdTool(tools.john, d.a, d.b); clods(cl.john, t, jx, 0, -0.75, -1, 1.7, 5.6, true); }
    const ap = t < cavarT ? { ...go(t, asiT + 0.1, cavarT, X0 + 6.4, ax), z: -0.2 } : { x: ax, z: -0.2, face: -0.4, look: V(HOLE.x, 0.8, 2.4), squash: settle(t, cavarT) * breathe(t, 2), mood: 'happy' };
    ap.handR = V(ax + 0.28, 1.72, 0.1); ap.wR = 1; if (t >= cavarT) { ap.handL = talk(t, ax, -0.2, -1, 1); ap.wL = 0.85; }
    pose(anthony, 'ant', ap, t, 2); anthony.hand(1, poleLantern.position); poleLantern.position.y -= 0.3; poleLantern.visible = true;
  } else { hide(john, anthony); tools.john.visible = false; poleLantern.visible = false; cl.john.forEach(m => { m.visible = false; }); }
  // polea que se mece; marcas que aparecen
  pulley.rotation.z = 0.08 * Math.sin(t * 1.6);
  marks.forEach((m, i) => { const s = back(lin(t, poleaT - 0.3 + i * 0.12, poleaT + i * 0.12)); m.visible = s > 0.01; m.scale.setScalar(Math.max(s, 0.001)); });
  return true;
}

function poseCorte(t) {
  const on = t >= c[3] && t < c[7];
  if (!on) { hide(w1, w2, w3); tools.w1.visible = tools.w2.visible = false; shaftLantern.visible = bucket.visible = false; [...cl.w1, ...cl.w2].forEach(m => { m.visible = false; }); stone.visible = false; return; }
  const d = D(t), w = Wt(t), boys = t < c[4], z = -0.2;
  cut.set(t, d, w);
  lajas.forEach((b, i) => { const s = back(lin(t, lajasT - 0.1 + i * 0.08, lajasT + 0.2 + i * 0.08)); b.visible = s > 0.01; b.scale.setScalar(Math.max(s, 0.001)); });
  cut.logs.forEach((g, i) => { const tr = i === 0 ? capaT - 0.2 : null; if (tr !== null && t < tr + 0.4) { const s = back(lin(t, tr, tr + 0.3)); g.visible = s > 0.01; g.scale.setScalar(Math.max(s, 0.001)); } });
  const A = boys ? daniel : w1, B = boys ? john : w2, nA = boys ? 'dan' : 'w1', nB = boys ? 'john' : 'w2';
  const tA = boys ? tools.dan : tools.w1, tB = boys ? tools.john : tools.w2, cA = boys ? cl.dan : cl.w1, cB = boys ? cl.john : cl.w2;
  hide(boys ? w1 : daniel, boys ? w2 : john); (boys ? tools.w1 : tools.dan).visible = false; (boys ? tools.w2 : tools.john).visible = false;
  [...(boys ? cl.w1 : cl.dan), ...(boys ? cl.w2 : cl.john)].forEach(m => { m.visible = false; });
  const xa = X - 0.42, xb = X + 0.42, enter = boys ? 1 : back(lin(t, c[4] + 0.05, c[4] + 0.35));
  const digging = t < piedraT - 0.15;
  stone.visible = false;
  if (digging) {
    const da = dig(t, xa, d, z, -1, 0.4), db = dig(t, xb, d, z, 1, 2.3);
    pose(A, nA, { ...da.pose, mood: boys ? 'happy' : 'neutral' }, t, 0); holdTool(tA, da.a, da.b); clods(cA, t, xa, d, z, -1, 0.4, 5.6, true);
    pose(B, nB, { ...db.pose, ...moodAt(t, [[0, 'neutral'], [lajasT, 'surprised'], [lajasT + 0.6, 'neutral'], [capaT - 0.2, 'surprised'], [capaT + 0.6, 'neutral']]) }, t, 1.3); holdTool(tB, db.a, db.b); clods(cB, t, xb, d, z, 1, 2.3, 5.6, true);
  } else if (t < climbT0) {                           // la piedra: B la levanta, A mira
    cA.forEach(m => { m.visible = false; }); cB.forEach(m => { m.visible = false; });
    const lift = prog(t, piedraT + 0.15, piedraT + 0.6), lost = prog(t, perdT - 0.15, perdT + 0.15);
    const pa = { x: xa, y: d + hop(t, millT, 0.18), z, face: 0.55, look: V(xb, d + 1.0, z + 1.5), squash: breathe(t) * settle(t, millT + 0.4, 0.12), handL: V(xa - 0.35, d + 0.4, z + 0.2), wL: 0.6,
      handR: t > millT && t < perdT ? V(xa + 0.3, d + 1.75, z + 0.3) : talk(t, xa, z, 1, 1), wR: 0.85, ...moodAt(t, [[0, 'neutral'], [piedraT, 'surprised'], [millT, 'happy'], [perdT - 0.1, 'worried']]) };
    pose(A, nA, pa, t, 0);
    holdTool(tA, V(xa - 0.35, d + 0.95, z - 0.25), V(xa - 0.45, d + 0.5, z - 0.3), true);
    stone.position.set(lerp(xb + 0.15, xb, lift), lerp(d + 0.22, d + 1.02, lift), z + 0.45); stone.rotation.z = 0.05 * Math.sin(t * 3); stone.visible = lost < 1;
    stone.scale.setScalar(Math.max(1 - lost, 0.001) * (1 + 0.08 * win(t, millT, millT + 0.4, 0.1)));
    const pb = { x: xb, y: d, z, face: -0.1, crouch: 0.5 * (1 - lift), lean: 0.25 * (1 - lift), squash: breathe(t, 1), look: t < millT ? V(xb, d + 1.0, z + 1.5) : V(xb, d + 1.4, z + 6),
      handL: V(xb - 0.28, stone.position.y, z + 0.42), handR: V(xb + 0.28, stone.position.y, z + 0.42), wL: 1 - lost, wR: 1 - lost, ...moodAt(t, [[0, 'surprised'], [millT, 'happy'], [perdT - 0.1, 'surprised'], [perdT + 0.3, 'worried']]) };
    pose(B, nB, pb, t, 1.3);
    tB.visible = true; holdTool(tB, V(xb + 0.45, d + 0.95, z - 0.25), V(xb + 0.5, d + 0.5, z - 0.3), true);
  } else {                                            // el agua: uno sube por la escalera, el otro se cuelga de la soga
    const k1 = prog(t, c[6] + 0.1, c[7]), ya = lerp(d, -12.4, k1), yb = lerp(d, -11.6, prog(t, c[6] + 0.25, c[7])), rung = Math.sin(t * 12);
    tA.visible = tB.visible = false; cA.forEach(m => { m.visible = false; }); cB.forEach(m => { m.visible = false; });
    pose(A, nA, { x: X - 0.95, y: ya + hop(t, c[6] + 0.2, 0.25), z: -0.25, face: 0.25, squash: settle(t, c[6] + 0.6, 0.15), look: V(X, ya + 0.3, 3), handL: V(X - 1.15, ya + 1.55 + 0.12 * rung, -0.5), handR: V(X - 0.75, ya + 1.55 - 0.12 * rung, -0.5), wL: k1 > 0 ? 1 : 0, wR: k1 > 0 ? 1 : 0,
      ...moodAt(t, [[0, 'surprised'], [aguaT, 'worried']]) }, t, 0);
    pose(B, nB, { x: X + 0.45, y: yb + hop(t, c[6] + 0.3, 0.25), z: -0.25, face: -0.3, squash: settle(t, c[6] + 0.7, 0.15), look: V(X + 0.4, yb + 0.6, 3), handL: V(X + 0.12, yb + 1.85, -0.3), handR: V(X + 0.12, yb + 1.55, -0.3), wL: 1, wR: 1, tilt: 0.1 * Math.sin(t * 6),
      ...moodAt(t, [[0, 'surprised'], [aguaT, 'worried']]) }, t, 1.3);
  }
  if (!boys) { popScale(A, enter); popScale(B, enter); }
  // el de arriba tira de la soga
  const top = boys ? anthony : w3, nTop = boys ? 'ant' : 'w3';
  if (!boys) hide(anthony); else hide(w3);
  const pull = Math.sin(t * 4);
  pose(top, nTop, { x: X + 2.0, y: 0, z: -0.35, face: -0.6, lean: -0.15 + 0.1 * pull, crouch: 0.15 + 0.1 * pull, squash: breathe(t, 3), look: V(X, d + 1, 2), handL: V(X + 1.7, 1.05 + 0.15 * pull, -0.2), handR: V(X + 1.75, 0.85 + 0.15 * pull, -0.15), wL: 1, wR: 1, mood: t > c[6] ? 'surprised' : 'neutral' }, t, 3);
  if (!boys) popScale(top, enter);
  if (boys) poleLantern.visible = false;
  // soga, balde y farol del pozo
  const by = t < climbT0 ? lerp(d + 0.35, -0.4, 0.5 + 0.5 * Math.sin(t * 1.4)) : Math.max(lerp(d + 0.35, -1.0, prog(t, climbT0, c[7])), -14);
  bucket.position.set(X + 0.1, by, -0.3); bucket.rotation.z = 0.08 * Math.sin(t * 2.3); bucket.visible = t < climbT0 + 0.4;
  if (t < climbT0 + 0.4) setStick(rope, APEX, bucket.position); else { B.hand(0, tmp2); setStick(rope, APEX, tmp2); }
  top.hand(0, tmp2); setStick(rope2, APEX, tmp2);
  apexWheel.rotation.z = t * 3;
  shaftLantern.position.set(X - 0.05, Math.max(d, -23.4) + 2.05, -0.82); shaftLantern.visible = true;
}

function poseMaq(t) {
  const on = t >= c[7] && t < c[9];
  if (!on) { hide(m1, m2, m3, fdr, bowdoin); tools.m1.visible = false; cl.m1.forEach(m => { m.visible = false; }); flag.visible = false; return; }
  const sad = t > seisT - 0.1;
  // fogonero
  const mx1 = ENG.x + 0.95, z1 = 0.35;
  if (!sad) { const d = dig(t, mx1, 0, z1, -1, 0.7, 5); pose(m1, 'm1', { ...d.pose, mood: 'neutral' }, t, 4); holdTool(tools.m1, d.a, d.b); clods(cl.m1, t, mx1, 0, z1, -1, 0.7, 5, false); }
  else { pose(m1, 'm1', { x: mx1, z: z1, face: 0.2, squash: breathe(t), look: V(M, 0.3, 2), lean: 0.12, mood: 'worried', handL: V(mx1 - 0.18, 1.25, z1 + 0.32), handR: V(mx1 + 0.18, 1.25, z1 + 0.32), wL: prog(t, seisT, seisT + 0.3), wR: prog(t, seisT, seisT + 0.3) }, t, 4); tools.m1.visible = false; }
  // bombero de palanca
  const lv = Math.sin(t * 5.5), mx2 = PUMP.x - 0.75, LP = V(PUMP.x - 0.05, 1.02, PUMP.z + 0.3), LE = V(PUMP.x - 0.55, 1.02 + 0.32 * lv, PUMP.z + 0.45);
  setStick(lever, LP, LE);
  pose(m2, 'm2', { x: mx2, z: 0.3, face: 0.6, crouch: 0.12 * (1 - lv), squash: breathe(t, 1), look: V(mx2 + 0.3, 1.2, 3), handR: LE, handL: tmp.copy(LE).add(V(-0.1, -0.06, 0)), wR: sad ? 1 - prog(t, seisT, seisT + 0.3) : 1, wL: sad ? 1 - prog(t, seisT, seisT + 0.3) : 1, mood: sad ? 'worried' : 'neutral' }, t, 5);
  // el que guía la grúa
  const mx3 = M + 0.0;
  pose(m3, 'm3', { x: mx3, z: 0.9, face: -0.25, squash: breathe(t, 2), look: sad ? V(mx3, 0.6, 3) : V(CR.x + 2, 3.2, -1), handR: sad ? null : V(mx3 + 0.35 + 0.1 * Math.sin(t * 7), 1.75, 1.1), wR: sad ? 0 : 1, handL: talk(t, mx3, 0.9, -1, 3), wL: sad ? 0 : 0.85, mood: sad ? 'worried' : 'neutral' }, t, 6);
  // 1909: Roosevelt llega y saluda; Bowdoin señala la torre
  if (t >= c[8] - 0.3) {
    const fx = DR.x + 0.45;
    let pf;
    if (t < frT - 0.1) pf = { ...go(t, c[8] + 0.1, frT - 0.2, DR.x + 3.6, fx), z: 0.55, mood: 'happy' };
    else pf = { x: fx, z: 0.55, face: -0.15, y: hop(t, frT, 0.14) + hop(t, presT, 0.22), squash: settle(t, frT - 0.2) * settle(t, presT + 0.45, 0.14) * breathe(t, 3), look: t < busqT ? V(fx, 1.5, 9) : t < presT - 0.1 ? V(DR.x - 1, 1.6, 2) : V(fx, 1.6, 9),
      handR: t > presT - 0.15 ? V(fx + 0.32, 1.72, 0.85) : V(fx + 0.34 + 0.08 * Math.sin(t * 9), 1.7, 0.8), wR: t < busqT || t > presT - 0.15 ? 1 : 0, handL: talk(t, fx, 0.55, -1, 4), wL: 0.85,
      ...moodAt(t, [[0, 'happy'], [busqT, 'neutral'], [presT - 0.1, 'surprised'], [presT + 0.3, 'happy']]) };
    pose(fdr, 'fdr', pf, t, 7);
    const bx = DR.x - 1.0;
    pose(bowdoin, 'bow', { x: bx, z: 0.35, face: 0.35, squash: breathe(t, 4), look: V(head.fdr ? head.fdr.x : fx, 1.45, 2.4), handR: V(bx + 0.45, 1.55, 0.3), wR: win(t, busqT - 0.6, presT - 0.2, 0.25), handL: talk(t, bx, 0.35, -1, 5), wL: 0.85, ...moodAt(t, [[0, 'neutral'], [busqT, 'happy']]) }, t, 8);
    flag.visible = t > presT - 0.15; if (flag.visible) { fdr.hand(1, flag.position); flag.scale.setScalar(Math.max(back(lin(t, presT - 0.15, presT + 0.15)), 0.001)); flag.userData.f.rotation.y = 0.15 * Math.sin(t * 6); }
  } else { hide(fdr, bowdoin); flag.visible = false; }
}

function poseHoy(t) {
  const on = t >= c[9];
  if (!on) { hide(h1, geo); tools.h1.visible = false; cl.h1.forEach(m => { m.visible = false; }); magn.visible = false; return; }
  const shrug = t > tesT - 0.15, hx = PIT.x + 1.05, z = 0.35;
  if (!shrug || t > c[10] + 0.6) { const d = dig(t, hx, 0, z, -1, 1.1); pose(h1, 'h1', { ...d.pose, mood: 'neutral' }, t, 9); holdTool(tools.h1, d.a, d.b); clods(cl.h1, t, hx, 0, z, -1, 1.1, 5.6, true); }
  else { const s = back(lin(t, tesT - 0.1, tesT + 0.2)); pose(h1, 'h1', { x: hx, z, face: 0, squash: breathe(t), look: V(hx, 1.5, 9), y: hop(t, tesT - 0.1, 0.1), handL: V(hx - 0.48, 1.25, z + 0.3), handR: V(hx + 0.48, 1.25, z + 0.3), wL: s, wR: s, tilt: 0.15, mood: 'worried' }, t, 9); tools.h1.visible = false; cl.h1.forEach(m => { m.visible = false; }); }
  if (t >= c[10] - 0.1) {
    const gx = PIT.x + 2.25;
    let pg;
    if (t < geoT + 0.6) pg = { ...go(t, c[10] - 0.1, geoT + 0.5, H + 5.6, gx), z: 0.75, mood: 'neutral' };
    else pg = { x: gx, z: 0.75, face: -0.2, squash: settle(t, geoT + 0.5) * breathe(t, 2), look: t < natT ? V(PIT.x, 0.2, 1.5) : V(gx, 1.5, 9), y: hop(t, natT, 0.12),
      handL: talk(t, gx, 0.75, -1, 6), wL: 0.85, tilt: 0.1 * win(t, natT - 0.3, entT, 0.2), ...moodAt(t, [[0, 'neutral'], [natT - 0.1, 'sly'], [entT, 'surprised']]) };
    pg.handR = t < geoT + 0.6 ? V(gx + 0.3, 1.0, 1.05) : t < natT ? V(gx - 0.28, 1.25, 1.15) : V(gx + 0.32, 1.45, 1.1); pg.wR = 1;
    pose(geo, 'geo', pg, t, 10); geo.hand(1, magn.position); magn.position.y += 0.22; magn.visible = true; magn.rotation.z = 0.2 * Math.sin(t * 2);
  } else { hide(geo); magn.visible = false; }
}

// =====================================================================================
// CÁMARA
// =====================================================================================
k.shots([
  { t: 0, pos: [X0 + 0.6, 2.9, 13.5], look: [X0 + 0.6, 1.4, -2] },
  { t: pozoT - 0.15, pos: [X0 + 0.9, 1.9, 5.6], look: [X0 + 0.9, 0.55, -0.9] },
  { t: escT, pos: [X0 + 0.4, 2.0, 8.4], look: [X0 + 0.4, 1.5, -1] },
  { t: c[1], pos: [X0 - 0.9, 1.45, 6.4], look: [X0 - 0.9, 1.2, 0] },
  { t: danT + 0.7, pos: [X0 + 0.1, 1.42, 4.6], look: [X0 + 0.1, 1.28, 0], glide: true },
  { t: at('anos', c[1]) - 0.1, pos: [X0 + 0.15, 1.45, 3.4], look: [X0 + 0.15, 1.35, 0] },
  { t: hundT - 0.05, pos: [X0 + 0.8, 2.0, 5.4], look: [X0 + 0.9, 0.7, -0.6] },
  { t: robleT - 0.1, pos: [X0 + 0.1, 2.5, 8.6], look: [X0 + 0.1, 2.3, -1.4] },
  { t: ramaT - 0.25, pos: [X0 + 0.7, 2.3, 6.2], look: [X0 + 0.7, 1.9, -1.4] },
  { t: poleaT - 0.1, pos: [X0 + 0.9, 2.2, 5.0], look: [X0 + 0.9, 1.85, -1.4] },
  { t: asiT - 0.1, pos: [X0 + 1.6, 1.8, 8.6], look: [X0 + 1.6, 1.2, -0.6] },
  { t: cavarT - 0.15, pos: [X0 + 1.5, 1.7, 7.4], look: [X0 + 1.5, 0.9, -0.7] },
  { t: c[3], pos: [X, 0.9, 7.4], look: [X, 0.0, 0], cut: true },
  { t: lajasT - 0.1, pos: [X, 0.6, 6.6], look: [X, -0.2, 0] },
  { t: tresT - 0.1, pos: [X, 0.3, 6.0], look: [X, -0.7, 0] },
  { t: capaT + 0.2, pos: [X, -2.0, 6.0], look: [X, -2.2, 0], glide: true },
  { t: c[4], pos: [X + 0.6, -0.6, 10.8], look: [X + 0.6, -1.3, 0] },
  { t: ciaT - 0.1, pos: [X, -1.5, 6.6], look: [X, -1.7, 0] },
  { t: (ciaT + c[5]) / 2 - 0.1, pos: [X + 0.3, -10.8, 9.8], look: [X + 0.3, -11.0, 0], glide: true },
  { t: c[5] - 0.1, pos: [X, -LEV * 8 + 1.1, 6.4], look: [X, -LEV * 8 + 0.9, 0], glide: true },
  { t: veinT - 0.05, pos: [X, -LEV * 9 + 1.3, 6.6], look: [X, -LEV * 9 + 0.8, 0] },
  { t: piedraT - 0.1, pos: [X + 0.35, -LEV * 9 + 1.15, 4.4], look: [X + 0.35, -LEV * 9 + 0.95, 0] },
  { t: piedraT + 1.1, pos: [X - 0.2, -LEV * 9 + 1.3, 6.4], look: [X - 0.2, -LEV * 9 + 1.1, 0] },
  { t: millT - 0.2, pos: [X, -LEV * 9 + 1.2, 5.8], look: [X, -LEV * 9 + 1.1, 0] },
  { t: millT + 0.9, pos: [X + 0.42, -LEV * 9 + 1.25, 4.2], look: [X + 0.42, -LEV * 9 + 1.15, 0] },
  { t: perdT - 0.2, pos: [X + 0.4, -LEV * 9 + 1.1, 4.6], look: [X + 0.4, -LEV * 9 + 1.0, 0] },
  { t: c[6], pos: [X, -LEV * 9 + 1.5, 7.6], look: [X, -LEV * 9 + 1.1, 0] },
  { t: c[7] - 0.05, pos: [X, -10.9, 7.4], look: [X, -11.3, 0], glide: true },
  { t: c[7], pos: [M + 0.3, 2.4, 10.5], look: [M + 0.3, 1.6, 0], cut: true },
  { t: bombT - 0.1, pos: [M + 2.6, 1.3, 5.6], look: [M + 2.6, 0.85, 0] },
  { t: vapT - 0.1, pos: [M - 1.9, 1.5, 5.6], look: [M - 1.9, 1.15, 0] },
  { t: gruT - 0.1, pos: [M + 1.3, 2.4, 8.2], look: [M + 1.5, 2.5, -2] },
  { t: seisT - 0.25, pos: [M - 0.3, 1.25, 6.2], look: [M - 0.3, 0.85, 0.5] },
  { t: c[8], pos: [M + 5.2, 2.0, 9.6], look: [M + 5.2, 1.8, 0] },
  { t: frT - 0.1, pos: [DR.x + 0.4, 1.45, 4.9], look: [DR.x + 0.4, 1.3, 0] },
  { t: busqT - 0.15, pos: [DR.x - 0.3, 2.1, 7.6], look: [DR.x - 0.3, 1.9, 0] },
  { t: presT - 0.2, pos: [DR.x + 0.5, 1.5, 4.4], look: [DR.x + 0.5, 1.4, 0] },
  { t: c[9], pos: [H - 0.2, 2.6, 11.5], look: [H - 0.2, 1.9, 0], cut: true },
  { t: excT - 0.1, pos: [H - 1.1, 1.8, 7.2], look: [H - 1.1, 1.3, 0] },
  { t: tesT - 0.15, pos: [PIT.x + 0.7, 1.5, 5.4], look: [PIT.x + 0.7, 1.2, 0] },
  { t: c[10], pos: [PIT.x + 1.7, 1.55, 6.8], look: [PIT.x + 1.7, 1.25, 0] },
  { t: natT - 0.15, pos: [PIT.x + 2.1, 1.45, 4.8], look: [PIT.x + 2.1, 1.35, 0] },
  { t: entT - 0.05, pos: [PIT.x + 0.8, 1.6, 7.6], look: [PIT.x + 0.6, 0.6, 0] },
  { t: abajoT - 0.2, pos: [PIT.x, -12.2, 10.5], look: [PIT.x, -13.2, 0], glide: true },
  { t: abajoT + 0.4, pos: [PIT.x, -12.9, 8.6], look: [PIT.x, -13.6, 0] },
], { move: 0.24 });

// =====================================================================================
// CARTELES Y SONIDO
// =====================================================================================
tag({ text: 'Oak Island, 1795', big: true, off: BIG, from: 0.15, to: pozoT - 0.15 });
tag({ text: 'Canadá', at: () => tmp.set(X0 + 3.5, 0.2, -6), off: [120, -120], from: at('canada', 0) - 0.2, to: escT });
tag({ text: '¿Qué esconde?', big: true, off: BIG, from: escT + 0.3, to: c[1] });
tag({ text: 'Daniel McGinnis · 16 años', at: () => hpT('dan'), off: [160, -200], from: danT + 0.6, to: hundT - 0.1 });
tag({ text: 'Hundimiento', at: () => HOLE, off: [200, 160], from: hundT + 0.25, to: robleT });
tag({ text: 'Roble', at: () => tmp.set(X0 - 0.8, 3.4, -1.6), off: [-140, -160], from: robleT + 0.1, to: ramaT - 0.25 });
tag({ text: 'Según los relatos', big: true, off: BIG, from: relT, to: ramaT });
tag({ text: 'Marcas de polea', at: () => tmp.set(X0 + 1.3, 1.85, -1.6), off: [-220, 260], from: poleaT - 0.1, to: asiT });
tag({ text: '+ 2 amigos', big: true, off: BIG, from: at('amigos', c[2]) - 0.2, to: c[3] });
tag({ text: 'Lajas de piedra', at: () => tmp.set(X - 0.6, -0.55, -0.6), off: [-170, 230], from: lajasT + 0.15, to: tresT - 0.1 });
tag({ text: '3 m', big: true, off: BIG, from: tresT, to: c[4] });
tag({ text: 'Troncos', at: () => tmp.set(X + 0.9, -LEV + 0.2, -0.4), off: [140, 200], from: capaT, to: c[4] });
tag({ text: 'Años después', big: true, off: BIG, from: c[4] + 0.05, to: ciaT + 0.1 });
tag({ text: 'Otra compañía', at: () => hpT('w3'), off: [-60, -170], from: ciaT - 0.1, to: bajT + 0.5 });
tag({ text: 'Troncos cada 3 m', big: true, off: BIG, from: aparT, to: c[5] });
tag({ text: '27 m', big: true, off: BIG, from: veinT, to: piedraT });
tag({ text: 'Piedra con símbolos', at: () => stone.position, off: [-60, 330], from: piedraT + 0.5, to: millT - 0.2 });
tag({ text: '“2.000.000 de libras”', big: true, off: [540, 420], from: millT, to: perdT - 0.3 });
tag({ text: 'Se perdió', big: true, off: BIG, from: perdT - 0.1, to: c[6] });
tag({ text: '¡Agua de mar!', big: true, off: BIG, from: aguaT - 0.3, to: c[7] });
tag({ text: 'Bombas', at: () => tmp.set(PUMP.x + 1.05, 0.75, PUMP.z), off: [-60, -330], from: bombT, to: vapT - 0.1 });
tag({ text: 'Máquina de vapor', at: () => tmp.set(ENG.x - 0.5, 2.0, ENG.z), off: [200, -180], from: vapT + 0.05, to: gruT - 0.1 });
tag({ text: 'Grúa', at: () => craneBucket.position, off: [-200, -160], from: gruT, to: seisT - 0.25 });
tag({ text: 'Al menos 6 muertes', big: true, off: BIG, from: seisT, to: c[8] });
tag({ text: '1909', big: true, off: BIG, from: c[8] + 0.1, to: frT - 0.1 });
tag({ text: 'Franklin D. Roosevelt', at: () => hpT('fdr'), off: [-120, -200], from: frT + 0.3, to: busqT });
tag({ text: 'Old Gold Salvage', at: () => tmp.set(DR.x, 2.6, DR.z), off: [-230, -280], from: busqT - 0.1, to: presT - 0.2 });
tag({ text: '→ Presidente de EE. UU.', big: false, at: () => hpT('fdr'), off: [-60, -200], from: presT, to: c[9] });
tag({ text: 'Hoy', big: true, off: BIG, from: hoyT, to: siglosT - 0.3 });
tag({ text: '+200 años', big: true, off: BIG, from: siglosT - 0.3, to: excT });
tag({ text: 'Siguen excavando', at: () => tmp.set(EX.x + 0.9, 2.6, EX.z), off: [-120, -300], from: excT + 0.1, to: tesT - 0.2 });
tag({ text: 'Ni rastro del tesoro', big: true, off: [540, 330], from: tesT + 0.1, to: c[10] });
tag({ text: 'Geólogos', at: () => hpT('geo'), off: [-170, -190], from: geoT + 0.4, to: natT });
tag({ text: '¿Un hueco natural?', big: true, off: BIG, from: natT, to: entT });
tag({ text: '¿Hay algo abajo?', big: true, off: BIG, from: abajoT - 0.2, to: END + 1 });

sfx(0, 'boom', 0.45); sfx(0, 'splash', 0.25);
sfx(hundT, 'riser_to', 0.9); sfx(hundT + 0.05, 'pop', 0.6);
sfx(cavarT, 'thud', 0.6); sfx(lajasT, 'clang', 0.5); sfx(capaT, 'thud', 0.6);
sfx(piedraT + 0.15, 'riser_to', 1); sfx(piedraT + 0.15, 'boom', 0.45);
sfx(millT, 'riser_to', 0.9); sfx(millT, 'boom', 0.4); sfx(perdT, 'puff', 0.7);
sfx(c[6] + 0.15, 'splash', 0.8); sfx(aguaT, 'splash', 0.6);
sfx(vapT, 'hiss', 0.6); sfx(seisT, 'thud', 0.5);
sfx(presT - 0.1, 'riser_to', 0.9); sfx(presT, 'boom', 0.4);
sfx(excT, 'drill', 0.5); sfx(tesT, 'thud', 0.5);
sfx(abajoT - 0.1, 'riser_to', 1); sfx(abajoT + 0.2, 'boom', 0.55);

// =====================================================================================
// CUADRO
// =====================================================================================
k.follow(t => t < c[3] ? hp('dan') : t < c[7] ? (head.w2 || hp('john')) : t < c[8] ? hp('m2') : t < c[9] ? hp('fdr') : t < c[10] ? hp('h1') : hp('geo'));
const camQ = new THREE.Quaternion();
k.run(t => {
  poseIsla(t); poseCorte(t); poseMaq(t); poseHoy(t);
  // agua del pozo de hoy (siempre llena) y lo que hay abajo
  cutH.set(t, -16, -9, false);
  const dq = popIn(t, abajoT - 0.1, END + 2);
  k.glyphAt(deepQ, tmp.set(PIT.x, -13.4 + 0.08 * Math.sin(t * 3), -0.2), 0, 0, dq * (1 + 0.06 * Math.sin(t * 6)), 0.1 * Math.sin(t * 2));
  deepGlints.forEach((m, i) => k.glyphAt(m, tmp.set(PIT.x, -15.6, -0.1), [-0.7, 0.75, -0.35, 0.5][i], [0.2, 0.35, 0.7, 0.75][i], Math.max(0, (0.55 + 0.45 * Math.sin(t * 7 + i * 1.7)) * (t > entT ? 1 : 0)), t + i));
  // mar, espuma, niebla, estrellas, faroles
  seaMap.offset.set(t * 0.012, 0.004 * Math.sin(t * 0.8));
  foams.forEach((f, i) => { f.scale.setScalar(1 + 0.012 * Math.sin(t * 1.8 + i)); f.material.opacity = 0.45 + 0.25 * Math.sin(t * 2.2 + i); });
  mists.forEach(m => { const d = m.userData; m.position.x = d.cx + ((d.x0 + 10 + t * d.sp) % 20) - 10; });
  stars.forEach(s => s.scale.setScalar(0.7 + 0.4 * Math.sin(t * 3 + s.userData.k)));
  camQ.copy(camera.quaternion);
  glows.forEach(g => { g.quaternion.copy(camQ); if (g.parent && g.parent !== scene) { g.parent.updateMatrixWorld(); const pq = new THREE.Quaternion(); g.parent.getWorldQuaternion(pq); g.quaternion.premultiply(pq.invert()); } g.material.opacity = 0.62 + 0.18 * Math.sin(t * 9 + g.userData.k0 * 2.3) + 0.08 * Math.sin(t * 23 + g.userData.k0); });
  oaks.forEach((o, i) => { o.userData.crown.rotation.z = 0.03 * Math.sin(t * 1.3 + i); });
  // máquinas
  flywheel.rotation.z = -t * 4;
  setStick(piston, V(ENG.x + 0.55, 0.62, ENG.z + 0.43), V(flywheel.position.x + 0.3 * Math.cos(-t * 4), 0.62 + 0.3 * Math.sin(-t * 4), ENG.z + 0.44));
  fireDoor.material.color.setHSL(0.07 + 0.02 * Math.sin(t * 13), 1, 0.55 + 0.08 * Math.sin(t * 17));
  smoke.forEach((m, i) => { const u = (t * 0.7 + i / 7) % 1; m.position.set(ENG.x - 0.5 + 0.9 * u + 0.1 * Math.sin(t * 2 + i), 2.3 + 2.4 * u, ENG.z - 0.3 * u); m.scale.setScalar(0.6 + 2.2 * u); m.material.opacity = 0.85 * (1 - u); });
  drops.forEach((m, i) => { const u = (t * 1.1 + m.userData.off) % 1, tt = u * 0.75; m.position.set(PUMP.x + 1.15 + 1.1 * tt, 0.75 + 0.5 * tt - 3.9 * tt * tt, PUMP.z + 0.05 * Math.sin(i * 3)); m.scale.setScalar(1.3); m.visible = m.position.y > -0.05; });
  const sw = 0.35 * Math.sin(t * 0.5); crane.rotation.y = sw;
  { const tip = V(0, 4.2, 0); crane.userData.boom.localToWorld(tip); const bk = V(tip.x + 0.15 * Math.sin(t * 1.7), 2.6 + 0.4 * Math.sin(t * 0.9), tip.z); craneBucket.position.copy(bk); craneBucket.rotation.y = sw; setStick(craneCable, tip, bk.clone().add(V(0, 0.02, 0))); }
  candles.forEach((g, i) => { const s = back(lin(t, seisT + i * 0.1, seisT + 0.3 + i * 0.1)) * (t < c[8] + 0.3 ? 1 : 0); g.visible = s > 0.01; g.scale.setScalar(Math.max(s, 0.001)); g.userData.fl.scale.set(1, 1.7 + 0.3 * Math.sin(t * 14 + i), 1); });
  drillWheel.rotation.z = t * 5; setStick(drillRod, V(DR.x, 3.05, DR.z + 0.08), V(DR.x, 0.1 + 0.25 * Math.abs(Math.sin(t * 3)), DR.z + 0.08));
  // excavadora y perforadora
  { const cyc = (t - c[9]) * 1.1, a = Math.sin(cyc), empty = t > tesT - 0.15 && t < c[10] + 0.5;
    const lift = empty ? back(lin(t, tesT - 0.15, tesT + 0.4)) : 0;
    exArm.boom.rotation.z = lerp(-0.55 + 0.25 * a, 0.15, lift); exArm.stick.rotation.z = lerp(-1.4 + 0.45 * a, -0.6, lift); exArm.bucket.rotation.z = lerp(-0.3 - 0.6 * a, 0.9, lift);
    exArm.load.visible = !empty && a > 0; exc.userData.body.rotation.y = 0.06 * Math.sin(t * 0.7); exc.position.y = 0.01 * Math.sin(t * 25);
    exc.userData.wheels.forEach(w => { w.rotation.z = t * 2; }); }
  rigPipe.rotation.y = t * 6; rigPipe.position.y = 0.4 - 0.15 * ((t * 0.4) % 1);
  rigPuffs.forEach((m, i) => { const u = (t * 0.9 + i / 5) % 1; m.position.set(RIG.x + 0.7 + 0.3 * u, 1.0 + 1.6 * u, RIG.z + 0.1); m.scale.setScalar(0.5 + 1.8 * u); m.material.opacity = 0.75 * (1 - u); });
  // signos y partículas
  k.glyphAt(qMark, hp('dan'), 0.05, 0.62, t < c[3] ? popIn(t, hundT, robleT) : 0, 0.12 * Math.sin(t * 6));
  k.glyphAt(bang, hp('dan'), 0.05, 0.64, t < c[3] ? popIn(t, ramaT, asiT) : 0);
  k.glyphAt(bang2, hp(t < c[4] ? 'john' : 'w2'), 0.05, 0.64, t >= c[3] && t < c[7] ? popIn(t, piedraT + 0.1, millT - 0.2) + popIn(t, c[6] + 0.1, c[7]) : 0);
  k.glyphAt(qMark2, hp('w2'), 0.5, 0.35, t >= c[5] && t < c[6] + 0.05 ? popIn(t, perdT, c[6] + 0.05) : 0, 0.12 * Math.sin(t * 6));
  k.glyphAt(qMark3, hp('h1'), 0.05, 0.62, t >= c[9] ? popIn(t, tesT + 0.1, c[10] + 0.3) : 0, 0.12 * Math.sin(t * 6));
  coinG.forEach((m, i) => { const u = lin(t, millT + i * 0.12, millT + 1.0 + i * 0.12); k.glyphAt(m, stone.position, (0.45 + 0.2 * (i % 3) + 0.35 * u), -0.15 + 0.25 * (i % 3) * 0.5 + 0.2 * u, t < perdT && u > 0 && u < 1 ? back(u * 3) * (1 - prog(u, 0.7, 1)) : 0, 0.2 * Math.sin(t * 4 + i)); });
  sparks.forEach((m, i) => {
    let base = null, kk = 0;
    if (t >= c[8] && t < c[9]) { base = hp('fdr'); kk = popIn(t, presT, c[9]); }
    else if (t >= c[5] && t < c[6]) { base = stone.position; kk = popIn(t, piedraT + 0.5, perdT); }
    else if (t < c[1]) { base = tmp.set(HOLE.x, 0.3, HOLE.z); kk = popIn(t, pozoT, c[1]); }
    k.glyphAt(m, base || tmp, (base === stone.position ? 0.75 : 0) + [-0.55, 0.6, -0.4, 0.5, 0][i] * (base === stone.position ? 0.5 : 1), [0.25, 0.4, -0.25, -0.2, 0.7][i], base ? Math.max(kk * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)), 0) : 0, t * 1.5 + i);
  });
  puffA(t, perdT - 0.1, stone.position.x - 0.3, 0.45 - 0.2, 1, stone.position.y - 0.2);
  puffB(t, lajasT - 0.1, X - 0.9, -0.2, 1, -0.6); puffB(t, cavarT, HOLE.x - 0.6, -0.6, 1, 0.05);
  puffC(t, tesT - 0.1, PIT.x - 0.5, -0.2, 1, 0.2);
  // chorros de agua de las paredes cuando se inunda
  jets.forEach((m, i) => { const t0 = c[6] + 0.1 + (i % 8) * 0.12, u = t - t0, s = i < 8 ? 1 : -1, y0 = -LEV * 9 + 0.6 + (i % 4) * 0.5;
    m.visible = t >= c[6] && t < c[7] && u > 0 && u < 1.6; if (!m.visible) return; const tt = (u % 0.5);
    m.position.set(X - s * SW + s * 1.1 * tt, y0 + 0.5 * tt - 3 * tt * tt, -0.1 + 0.05 * (i % 3)); });
});
