// Episodio: las piedras que se mueven solas en Racetrack Playa (Valle de la Muerte), resuelto en 2014.
// Dos decorados uno al lado del otro: la PLAYA (x = 0: lago seco agrietado, montañas, las piedras con sus
// surcos, después el agua, el hielo y las placas) y el CAMPAMENTO de los científicos (x = 40). El cielo
// cambia con la hora (atardecer, noche, amanecer, mediodía, atardecer) y nada queda quieto: estrellas
// que titilan, nubes, viento, polvo, placas de hielo que se deslizan y surcos que se dibujan.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { surface, picture } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('piedras', { sky: '#262553', light: { ambient: 1.4, sun: 1.5 } });
const { scene, c, at, END, sfx, tag, BIG } = k;
const CX = 40;                                             // campamento

// ---------------- tiempos (palabras de la voz) ----------------
const solasT = at('solas'), nadieT = at('nadie') - 0.15;
const playaT = at('racetrack', c[1]) - 0.2, cincoT = at('cinco', c[1]) - 0.25, grietaT = at('agrietado', c[1]) - 0.3;
const kilosT = at('trescientos', c[2]) - 0.25, surcosT = at('surcos', c[2]) - 0.3;
const vientoT = at('viento', c[3]) - 0.3, chicaT = at('piedra', c[3]) - 0.2, huracanT = at('huracan', c[3]) - 0.35;
const hieloT = at('hielo', c[4]) - 0.3, bromasT = at('bromas', c[4]) - 0.3, aliensT = at('extraterrestres', c[4]) - 0.35;
const onceT = at('dos', c[5]) - 0.2, cientT = at('cientificos', c[5]) - 0.3, gpsT = at('gps', c[5]) - 0.3, quinceT = at('quince', c[5]) - 0.2, esperaT = at('espera', c[5]) - 0.3;
const anosT = at('anos', c[6]) - 0.3;
const dicT = at('diciembre', c[7]) - 0.2, lagoT = at('lago', c[7]) - 0.2, aguaT = at('agua', c[7]), nocheT = at('noche', c[7]) - 0.2, congelaT = at('congela', c[7]) - 0.3;
const crujeT = at('cruje', c[8]) - 0.2, parteT = at('parte', c[8]) - 0.2, placasT = at('placas', c[8]) - 0.3, vidrioT = at('vidrio', c[8]) - 0.2;
const brisaT = at('brisa', c[9]) - 0.2, empujanT = at('empujan', c[9]) - 0.3, metrosT = at('metros', c[9]) - 0.3;
const sesentaT = at('sesenta', c[10]) - 0.3;
const derriteT = at('derrite', c[11]) - 0.3, secaT = at('seca', c[11]) - 0.3, fsurcosT = at('surcos', c[11]) - 0.3;
const tStop = derriteT + 0.5;                              // las placas frenan cuando empieza a derretirse

// ---------------- cielo y luz según la hora ----------------
const PAL = {
  dusk:   { sky: ['#262553', '#6b4a86', '#e0866a', '#f6c38a'], amb: [1.45, '#d4c4ff'], sun: [1.5, '#ffc89a'], mtn: '#d6aac0', star: 0.55, cloud: '#f3c6d0', ice: '#d8e4ff' },
  night:  { sky: ['#0b0f2c', '#1d2a5c', '#3a4a86', '#5d62a0'], amb: [1.35, '#b4c2ff'], sun: [1.1, '#c8d6ff'], mtn: '#7a7aaa', star: 1, cloud: '#6a72a0', ice: '#b8ccf0' },
  dawn:   { sky: ['#3b4a8c', '#9a7fb0', '#f0a888', '#ffe0a8'], amb: [1.6, '#ffe6da'], sun: [1.75, '#ffd8a8'], mtn: '#ecbcb6', star: 0.12, cloud: '#ffdccc', ice: '#eaf6ff' },
  day:    { sky: ['#4f93d6', '#8cc4ec', '#cfe6f4', '#f6ead2'], amb: [1.72, '#e9e0ff'], sun: [2.05, '#fff0d6'], mtn: '#ffffff', star: 0, cloud: '#ffffff', ice: '#eefaff' },
  sunset: { sky: ['#2b2a62', '#a25a8a', '#f0905e', '#ffd08a'], amb: [1.5, '#ffd8cc'], sun: [1.65, '#ffb080'], mtn: '#dea4a8', star: 0.35, cloud: '#f8b8a8', ice: '#f0e8ff' },
};
const F7 = c[6];
const SKYK = [[0, 'dusk'], [c[3] - 0.7, 'dusk'], [c[3] + 0.5, 'night'], [c[5] - 0.01, 'night'], [c[5], 'dawn'], [c[5] + 1.4, 'dawn'], [c[5] + 2.8, 'day'],
  [F7, 'day'], [F7 + 0.7, 'night'], [F7 + 1.4, 'day'], [F7 + 2.1, 'night'], [c[7] - 0.01, 'night'], [c[7], 'night'],
  [c[8] - 0.2, 'night'], [c[8] + 0.7, 'day'], [c[11] + 0.2, 'day'], [c[11] + 2.4, 'sunset']];
function palAt(t) {
  let i = 0; while (i < SKYK.length - 1 && SKYK[i + 1][0] <= t) i++;
  const a = SKYK[i], b = SKYK[Math.min(i + 1, SKYK.length - 1)];
  if (a[1] === b[1] || b === a) return [a[1], a[1], 0];
  return [a[1], b[1], prog(t, a[0], b[0])];
}
const skyCv = document.createElement('canvas'); skyCv.width = 4; skyCv.height = 512;
const skyTex = new THREE.CanvasTexture(skyCv); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
const amb = scene.children.find(o => o.isAmbientLight), sunL = k.light.sun;
const ca = new THREE.Color(), cb = new THREE.Color(), cc = new THREE.Color();
const mix = (x, y, kk) => ca.set(x).lerp(cb.set(y), kk);
const SKY = { star: 0, day: 1, sunset: 0, night: 0, ice: new THREE.Color(), mtn: new THREE.Color(), cloud: new THREE.Color() };
function applySky(t) {
  const [an, bn, kk] = palAt(t), A = PAL[an], B = PAL[bn];
  const g = skyCv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  [0, 0.45, 0.8, 1].forEach((s, i) => gr.addColorStop(s, '#' + mix(A.sky[i], B.sky[i], kk).getHexString()));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); skyTex.needsUpdate = true;
  amb.intensity = lerp(A.amb[0], B.amb[0], kk); amb.color.copy(mix(A.amb[1], B.amb[1], kk));
  sunL.intensity = lerp(A.sun[0], B.sun[0], kk); sunL.color.copy(mix(A.sun[1], B.sun[1], kk));
  SKY.mtn.copy(mix(A.mtn, B.mtn, kk)); SKY.cloud.copy(mix(A.cloud, B.cloud, kk)); SKY.ice.copy(mix(A.ice, B.ice, kk));
  SKY.star = lerp(A.star, B.star, kk);
  const w = n => (an === n ? 1 - kk : 0) + (bn === n ? kk : 0);
  SKY.sunset = w('sunset'); SKY.night = w('night'); SKY.day = w('day') + w('dawn') * 0.6 + w('sunset') * 0.8;
}

// ---------------- suelo agrietado (celdas casi hexagonales, Voronoi periódico) ----------------
function crackCanvas(seed) {
  const S = 512, N = 6, R = rng(seed), pts = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pts.push([(i + (j % 2) * 0.5 + (R() - 0.5) * 0.42) / N, (j + 0.5 + (R() - 0.5) * 0.42) / N, 0.9 + R() * 0.16]);
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const base = [222, 205, 170], crack = [120, 96, 72];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, ci = Math.floor(u * N), cj = Math.floor(v * N);
    let d1 = 9, d2 = 9, id = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -2; di <= 2; di++) {
      const jj = cj + dj, ii = ci + di, jm = ((jj % N) + N) % N, im = ((ii % N) + N) % N, p = pts[jm * N + im];
      const px = p[0] + Math.floor(ii / N), py = p[1] + Math.floor(jj / N);
      const dd = Math.hypot(u - px, v - py);
      if (dd < d1) { d2 = d1; d1 = dd; id = jm * N + im; } else if (dd < d2) d2 = dd;
    }
    const e = d2 - d1, o = (y * S + x) * 4, sh = pts[id][2] * (1 - 0.06 * Math.min(d1 * N * 1.4, 1));
    let col;
    if (e < 0.011) col = crack;
    else if (e < 0.024) col = base.map(q => Math.min(255, q * sh * 1.07));          // borde curvado, más claro
    else col = base.map(q => q * sh);
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 500; i++) { const v = R() < 0.5 ? 90 : 250; g.fillStyle = `rgba(${v},${v - 10},${v - 30},0.10)`; g.fillRect(R() * S, R() * S, 2 + R() * 4, 2 + R() * 4); }
  return cv;
}
const crackTex = (rx, ry) => { const t = new THREE.CanvasTexture(crackCanvas(21)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
surface(scene, crackTex(38, 27), 64, 46, 0, 0, -8, true);
surface(scene, crackTex(38, 27), 64, 46, CX, 0, -8, true);

// ---------------- montañas, estrellas, luna, sol, nubes ----------------
function ridge(seed, base, dark, light, hi, lo) {
  return (g, W, H) => {
    const R = rng(seed), n = 70, ys = [];
    for (let i = 0; i <= n; i++) ys.push(H * (hi + (lo - hi) * (0.5 + 0.5 * Math.sin(i * 0.31 + seed)) * (0.55 + 0.45 * Math.sin(i * 0.11 + seed * 2)) + (R() - 0.5) * 0.06));
    const path = () => { g.beginPath(); g.moveTo(0, H); ys.forEach((y, i) => g.lineTo(i * W / n, y)); g.lineTo(W, H); g.closePath(); };
    path(); g.fillStyle = base; g.fill();
    g.save(); path(); g.clip();
    g.strokeStyle = light; g.lineWidth = 5;
    for (let s = 0; s < 6; s++) { g.beginPath(); for (let i = 0; i <= n; i++) { const x = i * W / n, y = H * (0.55 + s * 0.08) + 7 * Math.sin(i * 0.45 + s * 1.7); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.strokeStyle = dark; g.lineWidth = 6;
    g.lineWidth = 4; for (let i = 1; i < n; i++) if (R() < 0.3) { const x = i * W / n, y = ys[i]; g.beginPath(); g.moveTo(x, y + 3); g.quadraticCurveTo(x + (R() - 0.5) * 30, y + (H - y) * 0.3, x + (R() - 0.5) * 40, y + (H - y) * 0.55); g.stroke(); }
    g.restore();
    g.strokeStyle = '#1e1428'; g.lineWidth = 7; g.beginPath(); ys.forEach((y, i) => i ? g.lineTo(i * W / n, y) : g.moveTo(0, y)); g.stroke();
  };
}
const mountains = [];
for (const x of [0, CX]) {
  mountains.push(picture(scene, 120, 9, x, 3.2, -30, ridge(3 + x, '#9a86b8', '#8a78aa', '#ab9ac4', 0.1, 0.55), 2048));
  mountains.push(picture(scene, 100, 4.2, x + 4, 1.1, -21, ridge(7 + x, '#b07e66', '#9a6a58', '#c29478', 0.15, 0.6), 2048));
}
// "The Grandstand": la isla de roca oscura en medio de la playa
const rockGeo = (r, seed, flatY = 0.62) => {
  const g = new THREE.DodecahedronGeometry(r, 1), R = rng(seed), p = g.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.86 + R() * 0.26);
    const s = seen.get(key); p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * flatY, p.getZ(i) * s);
  }
  g.computeVertexNormals(); return g;
};
for (const [x, z, r, s] of [[7.5, -13.5, 1.5, 1], [9.0, -13.0, 1.1, 2], [6.3, -13.2, 0.9, 3], [8.2, -12.4, 0.7, 4]]) {
  const m = outlined(new THREE.Mesh(rockGeo(r, s, 0.9), flat(0x6a5560, { flatShading: true })), 0.03); m.position.set(x, r * 0.45, z); m.receiveShadow = true; scene.add(m);
}
const starSets = [];
function starField(cx, seed) {
  const R = rng(seed), mats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, depthWrite: false })), list = [];
  for (let i = 0; i < 170; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.05 + R() * 0.13, 6), mats[i % 3]);
    m.position.set(cx - 28 + R() * 56, 2 + R() * 30, -36); scene.add(m); list.push(m);
  }
  const big = [0, 1, 2, 3, 4, 5].map(i => { const g = k.glyph('✦', '#fff6c8', 0.7); g.userData.p = V(cx - 6 + R() * 12, 9 + R() * 14, -35); return g; });
  starSets.push({ mats, list, big });
}
starField(0, 5); starField(CX, 9);
const disc = (r, color, z = 0, op = 1) => new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
function makeMoon() {
  const g = new THREE.Group(); const m = disc(1.3, 0xfff3c4); g.add(m);
  for (const [x, y, r] of [[-0.4, 0.3, 0.25], [0.35, -0.2, 0.32], [0.1, 0.55, 0.14], [-0.2, -0.55, 0.18]]) { const cr = disc(r, 0xe8d79c); cr.position.set(x, y, 0.01); g.add(cr); }
  const glow = disc(2.4, 0xfff3c4, -0.01, 0.15); g.add(glow); scene.add(g); return g;
}
function makeSun() {
  const g = new THREE.Group(); g.add(disc(1.6, 0xfff4c8)); const glow = disc(3.2, 0xfff0b0, -0.01, 0.25); g.add(glow); const glow2 = disc(5.2, 0xfff0b0, -0.02, 0.12); g.add(glow2); scene.add(g); return g;
}
const moonP = makeMoon(), sunP = makeSun(), moonC = makeMoon(), sunC = makeSun();
const clouds = [[-6, 12, -27, 1.3], [3, 14, -27, 1.0], [10, 11, -27, 1.2], [-1, 16.5, -27, 0.8], [CX - 6, 12.5, -27, 1.2], [CX + 4, 14.5, -27, 1.0], [CX + 9, 11, -27, 0.9]].map(([x, y, z, s]) => k.cloud(x, y, z, s));
k.birds([[CX, 6.5, 0], [CX, 7.3, 5], [CX, 6.0, 10]], -9);

// arbustos (jarilla) que se mecen
const bushes = [];
function bush(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  for (const [dx, dy, r, col] of [[0, 0.28, 0.3, 0x6f8a4a], [-0.25, 0.18, 0.22, 0x5f7a40], [0.26, 0.2, 0.22, 0x7d9a52], [0.05, 0.48, 0.2, 0x7d9a52]]) {
    const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), flat(col)), 0.018); m.position.set(dx, dy, 0); g.add(m);
  }
  bushes.push(g); return g;
}
for (const [x, z, s] of [[-6.2, 0.4, 1], [-5.4, -1.8, 0.8], [-7.0, -3.2, 1.1], [-5.9, 2.6, 0.7], [-8.0, 1.2, 0.9], [-4.6, -4.0, 0.8],
  [CX - 3.4, 0.9, 1], [CX - 4.6, -0.8, 0.8], [CX + 3.6, 1.4, 0.9], [CX - 1.6, 2.4, 0.6], [CX + 4.8, -0.4, 0.8], [CX - 5.4, 2.0, 1.1]]) bush(x, z, s);

// ---------------- surcos (cintas en el piso que se dibujan) ----------------
function ribbon(pts, w, color, y) {
  const n = pts.length, pos = new Float32Array((n - 1) * 18), L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const ww = w / 2 * (i === 0 ? 0.55 : 1);
    L.push([pts[i][0] - dz * ww, pts[i][1] + dx * ww]); Rr.push([pts[i][0] + dz * ww, pts[i][1] - dx * ww]);
  }
  let o = 0; const put = p => { pos[o++] = p[0]; pos[o++] = y; pos[o++] = p[1]; };
  for (let i = 0; i < n - 1; i++) { put(L[i]); put(L[i + 1]); put(Rr[i]); put(Rr[i]); put(L[i + 1]); put(Rr[i + 1]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; m.userData.n = n - 1; scene.add(m); return m;
}
const setRange = (m, f) => m.geometry.setDrawRange(0, Math.max(0, Math.floor(m.userData.n * Math.min(Math.max(f, 0), 1))) * 6);
const GROOVE = 0x9c8462, LIP = 0xefe4c8;

// ---------------- placas de hielo (rejilla irregular que se parte) ----------------
const PC = 1.3, PX0 = -3.0, PZ0 = -10.0, NI = 10, NJ = 10;
const gp = [], Rp = rng(77);
for (let j = 0; j <= NJ; j++) { gp.push([]); for (let i = 0; i <= NI; i++) { const e = i === 0 || j === 0 || i === NI || j === NJ; gp[j].push([PX0 + i * PC + (e ? 0 : (Rp() - 0.5) * 0.62 * PC), PZ0 + j * PC + (e ? 0 : (Rp() - 0.5) * 0.62 * PC)]); } }
const panels = [];
function addPanel(corners) {
  const cx = corners.reduce((s, p) => s + p[0], 0) / corners.length, cz = corners.reduce((s, p) => s + p[1], 0) / corners.length;
  const holder = new THREE.Group(); holder.position.set(cx, 0.05, cz); scene.add(holder);
  const G = new THREE.Group(); G.rotation.x = -PI / 2; holder.add(G);
  const pts = corners.map(p => [p[0] - cx, -(p[1] - cz)]);
  const mat = new THREE.MeshBasicMaterial({ color: 0xeefaff, transparent: true, opacity: 0, depthWrite: false });
  G.add(new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(...p)))), mat));
  const edges = new THREE.Group(); G.add(edges); k.stroke(edges, pts, 0.04, true, 0.004);
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.045), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  glint.position.set((Rp() - 0.5) * 0.3, (Rp() - 0.5) * 0.3, 0.003); glint.rotation.z = 0.75; G.add(glint);
  const glint2 = glint.clone(); glint2.material = glint.material; glint2.scale.set(0.5, 1, 1); glint2.position.x += 0.14; glint2.position.y -= 0.1; G.add(glint2);
  const P = { cx, cz, holder, mat, edges, glint, v: 0.42 + Rp() * 0.22, A: -0.16 + Rp() * 0.14, rot: (Rp() - 0.5) * 0.08, t0: brisaT + Rp() * 0.5,
    crack: crujeT + 0.05 + Math.hypot(cx - 0.8, cz + 1.2) * 0.075, freeze: nocheT + (cz - PZ0) * 0.04, s: 0 };
  panels.push(P); return P;
}
for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
  const a = gp[j][i], b = gp[j][i + 1], cq = gp[j + 1][i + 1], d = gp[j + 1][i];
  if (Rp() < 0.35) { addPanel([a, b, cq]); addPanel([a, cq, d]); } else addPanel([a, b, cq, d]);
}
/** Distancia recorrida por una placa hasta t (arranque y frenada suaves). */
function sAt(P, t) {
  const t1 = Math.min(t, tStop); if (t1 <= P.t0) return 0;
  let s = 0; const dt = 0.05;
  for (let u = P.t0; u < t1; u += dt) s += P.v * prog(u, P.t0, P.t0 + 0.9) * (1 - prog(u, tStop - 1.0, tStop)) * Math.min(dt, t1 - u);
  return s;
}
const Yax = V(0, 1, 0), tv = V(0, 0, 0);
/** Dónde lleva la placa P a un punto (x, z) del hielo después de recorrer s. */
function carry(P, x, z, s, out) {
  const th = P.rot * s, dx = x - P.cx, dz = z - P.cz;
  out.set(P.cx + s * Math.cos(P.A) + dx * Math.cos(th) + dz * Math.sin(th), 0, P.cz + s * Math.sin(P.A) - dx * Math.sin(th) + dz * Math.cos(th));
  return out;
}

// ---------------- piedras ----------------
const ROCK_COLS = [0x6f6470, 0x7d7068, 0x5f5a66, 0x8a7a6a, 0x6a6058, 0x74707e];
const rocks = [];
function makeGps() {
  const g = new THREE.Group();
  block(g, 0xffd23a, -0.08, 0.08, 0, 0.075, 0.06, -0.06, 0.012);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), basic(0x1e1428)); ant.position.set(0.05, 0.17, 0); g.add(ant);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), basic(0xff3a3a)); led.position.set(-0.04, 0.085, 0.045); g.add(led); g.userData.led = led;
  scene.add(g); return g;
}
function addRock({ x, z, r, A = 0.33, L = 3, curv = 0.02, gag = null, gps = false, seed }) {
  const mesh = outlined(new THREE.Mesh(rockGeo(r, seed), flat(ROCK_COLS[seed % ROCK_COLS.length], { flatShading: true })), 0.022);
  mesh.receiveShadow = true; scene.add(mesh);
  const oldPts = [], N = 40;
  for (let i = 0; i <= N; i++) { const b = L * (1 - i / N); oldPts.push([x - Math.cos(A) * b - Math.sin(A) * curv * b * b, z - Math.sin(A) * b + Math.cos(A) * curv * b * b]); }
  const R = { x, z, r, A, L, curv, gag, mesh, y: r * 0.62 * 0.62, seed,
    oldLip: ribbon(oldPts, r * 1.9, LIP, 0.006), oldGroove: ribbon(oldPts, r * 1.35, GROOVE, 0.009), gps: gps ? makeGps() : null, pos: V(x, 0, z) };
  // panel que la empuja: el de centro más cercano
  let best = 0, bd = 1e9; panels.forEach((P, i) => { const d = Math.hypot(P.cx - x, P.cz - z); if (d < bd) { bd = d; best = i; } });
  R.P = panels[best];
  const sMax = sAt(R.P, END + 1), newPts = [];
  for (let i = 0; i <= N; i++) { carry(R.P, x, z, sMax * i / N, tv); newPts.push([tv.x, tv.z]); }
  R.sMax = sMax; R.newLip = ribbon(newPts, r * 1.9, LIP, 0.006); R.newGroove = ribbon(newPts, r * 1.35, GROOVE, 0.009);
  rocks.push(R); return R;
}
const hero = addRock({ x: 1.0, z: -0.6, r: 0.37, A: 0.36, L: 10, curv: 0.022, gag: [0.45, 2.7, 0.75], seed: 1 });
const prank = addRock({ x: 3.0, z: -0.25, r: 0.26, A: 0.3, L: 2.5, curv: -0.03, gag: [bromasT, aliensT + 0.1, 0.5], seed: 2 });
{
  const R = rng(31), keep = [[0.3, -0.45, 0.8], [-0.6, 0.25, 1.0], [0.15, 0.5, 0.7], [2.1, -0.2, 0.8], [-0.75, 0.35, 0.9], [1.0, -0.6, 1.1], [3.0, -0.25, 0.9]];
  let tries = 0, n = 0;
  while (n < 34 && tries++ < 3000) {
    const x = -2.4 + R() * 11.4, z = -9.4 + R() * 11.0;
    if (keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
    if (rocks.some(o => Math.hypot(o.x - x, o.z - z) < 1.05)) continue;
    addRock({ x, z, r: 0.14 + R() * 0.2, A: 0.22 + R() * 0.24, L: 1.0 + R() * 3, curv: (R() - 0.5) * 0.06, gps: n % 6 === 2, seed: 3 + n });
    n++;
  }
}
const smallRock = outlined(new THREE.Mesh(rockGeo(0.12, 99), flat(0x7d7068, { flatShading: true })), 0.015); smallRock.position.set(0.15, 0.05, 0.5); scene.add(smallRock);
const oldPt = (R, s, out) => { const b = R.L - s; return out.set(R.x - Math.cos(R.A) * b - Math.sin(R.A) * R.curv * b * b, 0, R.z - Math.sin(R.A) * b + Math.cos(R.A) * R.curv * b * b); };
/** Dónde está la piedra en t (antes del lago: sobre su surco viejo; después: llevada por su placa). */
function rockAt(R, t, out) {
  if (t < c[7]) { const g = R.gag ? R.gag[2] * (1 - prog(t, R.gag[0], R.gag[1])) : 0; return oldPt(R, R.L - g, out); }
  return carry(R.P, R.x, R.z, sAt(R.P, t), out);
}
const heroAt = t => rockAt(hero, t, V(0, 0, 0));

// ---------------- agua del lago ----------------
const waterCv = document.createElement('canvas'); waterCv.width = waterCv.height = 256;
{ const g = waterCv.getContext('2d'), R = rng(4); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(160,200,235,0.9)'; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) { const x = R() * 256, y = R() * 256, w = 20 + R() * 50; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 5, x + w, y); g.stroke(); } }
const waterTex = new THREE.CanvasTexture(waterCv); waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(5, 4); waterTex.colorSpace = THREE.SRGBColorSpace;
const WX0 = -3.3, WX1 = 16, WZ0 = -10.6, WZ1 = 2.9;
const waterGeo = new THREE.PlaneGeometry(WX1 - WX0, WZ1 - WZ0); waterGeo.translate(0, -(WZ1 - WZ0) / 2, 0);
const water = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({ color: 0x6aa8d8, map: waterTex, transparent: true, opacity: 0, depthWrite: false }));
water.rotation.x = -PI / 2; water.position.set((WX0 + WX1) / 2, 0.035, WZ0); water.receiveShadow = true; scene.add(water);

// ---------------- personajes ----------------
const tourist = makeToon({ shirt: 0xe8743a, hair: 0x3a2a1e, hat: { type: 'boater', color: 0xf0d78a, band: 0xc8443a }, detail: ['collar', 'buttons'], trim: 0xfff3dc }); scene.add(tourist.root);
const geo = makeToon({ shirt: 0xc9a86a, hair: 0x6b5a4a, hat: { type: 'fedora', color: 0x7a5a3a, band: 0x3a2a1e }, mustache: true, detail: ['buttons', 'belt'] }); scene.add(geo.root);
const student = makeToon({ shirt: 0x6a4fb0, hair: 0xd9a040, detail: ['collar', 'stripes'], trim: 0xffd23a }); scene.add(student.root);
const rich = makeToon({ shirt: 0x3f8fae, hair: 0x5a4a3a, hat: { type: 'boater', color: 0xe8d8a8, band: 0x3f6ea8 }, mustache: true, detail: ['collar', 'buttons'], trim: 0xf4f1e8 }); scene.add(rich.root);
const jim = makeToon({ shirt: 0xc8603a, hair: 0xb8bcc4, detail: ['collar', 'belt'], trim: 0xf4f1e8 }); scene.add(jim.root);
const H = { t: V(0, 0, 0), g: V(0, 0, 0), s: V(0, 0, 0), r: V(0, 0, 0), j: V(0, 0, 0) }, tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), tmp3 = V(0, 0, 0);

// celular del turista
const phone = new THREE.Group(); scene.add(phone);
block(phone, 0x23262d, -0.04, 0.04, -0.07, 0.07, 0.01, -0.01, 0.01);
// libreta del geólogo
const notebook = new THREE.Group(); scene.add(notebook);
block(notebook, 0xf4f1e8, -0.08, 0.08, -0.1, 0.1, 0.012, -0.012, 0.01); block(notebook, 0xc8443a, -0.085, -0.06, -0.1, 0.1, 0.016, -0.016, 0.008);
// tablet con el mapa de los GPS
const tablet = new THREE.Group(); scene.add(tablet);
block(tablet, 0x23262d, -0.2, 0.2, -0.14, 0.14, 0.015, -0.015, 0.012);
const screen = picture(tablet, 0.36, 0.25, 0, 0, 0.018, (g, W, Hh) => { g.fillStyle = '#163a2a'; g.fillRect(0, 0, W, Hh); }, 256);
const scrCv = screen.material.map.image;
const gpsRocks = () => rocks.filter(R => R.gps);
function drawScreen(t) {
  const g = scrCv.getContext('2d'), W = scrCv.width, Hh = scrCv.height;
  g.fillStyle = '#123224'; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = 'rgba(120,230,150,0.25)'; g.lineWidth = 2; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * W / 8, 0); g.lineTo(i * W / 8, Hh); g.stroke(); } for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, i * Hh / 6); g.lineTo(W, i * Hh / 6); g.stroke(); }
  const mx = x => (x + 3.5) / 15 * W, mz = z => (z + 10.5) / 13 * Hh;
  for (const R of gpsRocks()) {
    g.strokeStyle = '#ffd23a'; g.lineWidth = 4; g.beginPath(); g.moveTo(mx(R.x), mz(R.z));
    const s = sAt(R.P, t); for (let i = 1; i <= 12; i++) { carry(R.P, R.x, R.z, s * i / 12, tmp3); g.lineTo(mx(tmp3.x), mz(tmp3.z)); } g.stroke();
    carry(R.P, R.x, R.z, s, tmp3); g.fillStyle = Math.sin(t * 12) > 0 ? '#ff4a4a' : '#ffffff'; g.beginPath(); g.arc(mx(tmp3.x), mz(tmp3.z), 8, 0, 7); g.fill();
  }
  g.fillStyle = '#7dffa0'; g.font = '800 26px Montserrat'; g.fillText('GPS', 12, 32);
  screen.material.map.needsUpdate = true;
}
drawScreen(0);

// cubo de hielo (teoría), platillo volador (teoría), planta rodadora
const iceCube = new THREE.Group(); scene.add(iceCube);
{ const m = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), flat(0xbfe6f7, { transparent: true, opacity: 0.92 })), 0.02); iceCube.add(m);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.04), basic(0xffffff)); sh.position.set(-0.04, 0.08, 0.175); sh.rotation.z = 0.7; iceCube.add(sh); }
const ufo = new THREE.Group(); scene.add(ufo);
const ufoLights = [];
{ const body = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.75, 28, 14), flat(0xaeb6c4)), 0.03); body.scale.set(1, 0.24, 1); ufo.add(body);
  const rim = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 32), flat(0x6a7282)), 0.015); rim.rotation.x = PI / 2; ufo.add(rim);
  const dome = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, PI * 2, 0, PI / 2), flat(0x9fe6ff, { transparent: true, opacity: 0.8 })), 0.02); dome.position.y = 0.1; ufo.add(dome);
  const alien = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), flat(0x7ed957)), 0.012); alien.position.set(0, 0.24, 0.05); ufo.add(alien);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), basic(0x1e1428)); e.scale.y = 1.4; e.position.set(s * 0.055, 0.27, 0.19); ufo.add(e); const w = new THREE.Mesh(new THREE.CircleGeometry(0.014, 8), basic(0xffffff)); w.position.set(s * 0.055 + 0.012, 0.29, 0.195); ufo.add(w); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), basic([0xffd23a, 0xff5a5a, 0x7dffa0][i % 3])); l.position.set(Math.cos(a) * 0.62, -0.03, Math.sin(a) * 0.62); ufo.add(l); ufoLights.push(l); } }
const beam = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.8, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0x9dff8a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })); scene.add(beam);
const beamSpot = disc(0.75, 0x9dff8a, 0, 0.35); beamSpot.rotation.x = -PI / 2; scene.add(beamSpot);
const weed = new THREE.Group(); scene.add(weed);
{ const m1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshBasicMaterial({ color: 0x7a5a32, wireframe: true })); weed.add(m1);
  const m2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: 0xa8844a, wireframe: true })); m2.rotation.set(0.5, 0.3, 0.2); weed.add(m2);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8a6a3a, transparent: true, opacity: 0.5 })); weed.add(core); }

// ---------------- campamento ----------------
// carpa
{ const tent = outlined(new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 12, 0, PI * 2, 0, PI / 2), flat(0xe0773a)), 0.03); tent.scale.set(1.2, 0.9, 1); tent.position.set(CX - 2.7, 0, -2.6); scene.add(tent);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.4, 3), basic(0x3a2030)); door.rotation.z = PI / 2; door.scale.set(1, 0.7, 1); door.position.set(CX - 2.7, 0.3, -1.62); scene.add(door);
  for (const a of [0.6, 1.6, 2.6]) { const s = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.012, 4, 24, PI), basic(0x1e1428)); s.scale.set(1.2, 0.9, 1); s.rotation.y = a; s.position.set(CX - 2.7, 0, -2.6); scene.add(s); } }
// camioneta
{ const truck = new THREE.Group(); truck.position.set(CX - 4.6, 0, -1.2); scene.add(truck);
  block(truck, 0xe8e2d0, -1.3, 1.3, 0.3, 0.85, 0.5, -0.5); block(truck, 0xe8e2d0, -1.3, 0.1, 0.85, 1.4, 0.48, -0.48);
  const win1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), basic(0x9fd0ea)); win1.position.set(-0.85, 1.12, 0.49); truck.add(win1);
  const win2 = win1.clone(); win2.position.x = -0.25; truck.add(win2);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.08), basic(0x3f8f6b)); stripe.position.set(0, 0.6, 0.505); truck.add(stripe);
  for (const x of [-0.8, 0.85]) k.wheel(truck, x, 0.3, 0.52, 0.27); }
// estación meteorológica (con anemómetro que gira) y cámara de intervalos en trípode
const anemos = [];
function station(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  block(g, 0xb9bec8, -0.03, 0.03, 0, 2.5, 0.03, -0.03, 0.012);
  block(g, 0xf4f1e8, -0.14, 0.14, 1.0, 1.3, 0.1, -0.1, 0.014);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), basic(0x2a3a6a)); panel.position.set(0, 1.75, 0.06); panel.rotation.x = -0.5; g.add(panel);
  const a = new THREE.Group(); a.position.y = 2.55; g.add(a);
  for (let i = 0; i < 3; i++) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 5), basic(0x1e1428)); arm.rotation.z = PI / 2; const piv = new THREE.Group(); piv.rotation.y = i * PI * 2 / 3; arm.position.x = 0.15; piv.add(arm);
    const cup = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8, 0, PI), flat(0xffffff)), 0.01); cup.position.set(0.3, 0, 0); piv.add(cup); a.add(piv); }
  anemos.push(a);
  const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), basic(0xc8443a)); vane.position.set(-0.2, 2.35, 0); g.add(vane); block(g, 0x1e1428, -0.35, 0, 2.33, 2.37, 0.01, -0.01, 0.004);
  return g;
}
station(CX - 1.6, -1.2); station(-5.7, -0.8);
function tripod(x, z, face = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = face; scene.add(g);
  for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.25, 5), basic(0x1e1428)); l.position.set(Math.sin(a) * 0.18, 0.6, Math.cos(a) * 0.18); l.rotation.set(Math.cos(a) * 0.28, 0, -Math.sin(a) * 0.28); g.add(l); }
  block(g, 0x2b2f3a, -0.12, 0.12, 1.18, 1.38, 0.1, -0.1, 0.012);
  const lens = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 14), flat(0x23262d)), 0.01); lens.rotation.x = PI / 2; lens.position.set(0, 1.28, 0.14); g.add(lens);
  const rec = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), basic(0xff3a3a)); rec.position.set(0.08, 1.35, 0.105); g.add(rec); g.userData.rec = rec;
  return g;
}
const tripods = [tripod(CX + 3.2, -0.6, -0.5), tripod(-5.2, 1.7, 0.9)];
// banquitos, cajón con el almanaque
const stoolR = new THREE.Group(), stoolJ = new THREE.Group(); scene.add(stoolR, stoolJ);
for (const s of [stoolR, stoolJ]) { block(s, 0x3f6ea8, -0.2, 0.2, 0.3, 0.36, 0.17, -0.17, 0.012); for (const [x, z] of [[-0.15, 0.12], [0.15, 0.12], [-0.15, -0.12], [0.15, -0.12]]) block(s, 0x1e1428, x - 0.015, x + 0.015, 0, 0.3, z + 0.015, z - 0.015, 0.004); }
stoolR.position.set(CX - 0.25, 0, 0.3); stoolJ.position.set(CX + 1.35, 0, 0.3);
block(scene, 0x9a6638, CX + 0.3, CX + 0.8, 0, 0.45, -0.8, -1.2, 0.016);
const calPages = ['2013', '2012', '2011'].map((y, i) => {
  const piv = new THREE.Group(); piv.position.set(CX + 0.55, 1.1, -0.98 + i * 0.006); scene.add(piv);
  const pg = k.sign(y, 0.46, 0.4, { bg: '#ffffff', fg: '#c8443a' }); pg.position.y = -0.22; piv.add(pg);
  return piv;
});
{ const back2 = k.sign('', 0.5, 0.66, { bg: '#2b2f3a' }); back2.position.set(CX + 0.55, 0.78, -1.0); scene.add(back2);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), basic(0x1e1428)); top.position.set(CX + 0.55, 1.1, -0.97); scene.add(top); }
// piedras con GPS del campamento (la primera la pone Richard)
const campRocks = [[0.2, 1.3, 0.26], [1.9, -1.3, 0.22], [3.0, -2.1, 0.25], [2.2, -3.3, 0.2], [4.2, -2.8, 0.24], [3.4, -4.5, 0.2], [5.4, -3.9, 0.23],
  [4.6, -5.7, 0.2], [6.4, -5.0, 0.22], [5.8, -7.1, 0.2], [7.6, -6.4, 0.22], [2.9, -6.3, 0.2], [7.1, -8.4, 0.2], [1.4, -4.9, 0.2], [8.4, -4.2, 0.22]].map(([x, z, r], i) => {
  const m = outlined(new THREE.Mesh(rockGeo(r, 50 + i), flat(ROCK_COLS[(i + 2) % ROCK_COLS.length], { flatShading: true })), 0.02);
  m.position.set(CX + x, r * 0.62 * 0.62, z); m.receiveShadow = true; scene.add(m);
  const b = makeGps(); b.position.set(CX + x, r * 0.62 * 0.62 + r * 0.55, z); return { m, b, r };
});

// ---------------- partículas ----------------
const qT = k.glyph('?', '#ffd23a', 0.55), qG = k.glyph('?', '#ffd23a', 0.55), bangR = k.glyph('!', '#ffd23a', 0.6), bangJ = k.glyph('!', '#ffd23a', 0.6), bangS = k.glyph('!', '#ffd23a', 0.6), bangG = k.glyph('!', '#ffd23a', 0.6);
const okR = k.glyph('✓', '#59c36a', 0.6), zzz = [0, 1, 2].map(() => k.glyph('z', '#ffffff', 0.3));
const frost = Array.from({ length: 8 }, () => k.glyph('✦', '#e8f8ff', 0.4));
const sparks = Array.from({ length: 4 }, () => k.glyph('✦', '#fff1a8', 0.34));
const puffA = k.puffs(4), puffB = k.puffs(4), puffC = k.puffs(5), puffD = k.puffs(4), puffE = k.puffs(4);
const streaks = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.025), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); scene.add(m); return m; });
const sweat = [0, 1, 2].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const ripples = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -PI / 2; scene.add(m); return m; });

// ---------------- poses ----------------
function poseTourist(t) {
  const vis = t < c[3]; tourist.root.visible = vis; phone.visible = false; if (!vis) return;
  let p;
  if (t < c[1] + 0.3) {                                  // selfie: atrás la piedra se mueve; se da vuelta y ya está quieta
    const x = -0.6, z = 0.25, turned = prog(t, nadieT, nadieT + 0.3);
    p = { x, z, face: lerp(0.2, 0.45, turned), y: hop(t, nadieT + 0.05, 0.16), squash: settle(t, nadieT + 0.45, 0.12) * breathe(t),
      look: turned < 0.5 ? V(x + 0.3, 1.62, z + 0.8) : V(1.2, 0.9, 1.4),
      handR: V(x + 0.3, 1.5, z + 0.48), wR: 1 - turned * 0.9, handL: t > nadieT ? V(x - 0.2, 1.62, z + 0.3) : null, wL: prog(t, nadieT + 0.1, nadieT + 0.4),
      ...moodAt(t, [[0, 'happy'], [nadieT, 'surprised']]) };
  } else if (t < c[2]) {                                 // camina hasta la piedra mirando el suelo
    const t0 = c[1] + 0.3, t1 = c[1] + 2.2;
    p = { ...go(t, t0, t1, -0.6, 0.3), z:lerp(0.25, -0.45, lin(t, t0, t1)), mood: 'neutral' };
    if (t > t1) { p.face = 0.5; p.look = V(-0.5, 0, 0.6); p.handL = talk(t, 0.3, -0.45, -1); p.wL = 0.7; }
  } else {                                               // la empuja: no se mueve ni un poco
    const give = prog(t, surcosT, surcosT + 0.3), push = 1 - give;
    p = { x: 0.3, z: -0.45, face: 1.15, lean: 0.32 * push, crouch: 0.38 * push, squash: (1 + 0.035 * Math.sin(t * 13) * push) * settle(t, surcosT + 0.3, 0.1),
      handL: V(0.66, 0.46, -0.42), wL: push, handR: V(0.68, 0.32, -0.7), wR: push,
      look: give > 0.5 ? V(-3, 0.4, -4) : V(0.7, 1.3, 4), ...moodAt(t, [[0, 'effort'], [surcosT, 'worried']]) };
  }
  tourist.pose(alive({ blink: blinkAt(t, 0.3), ...p }, t, 0)); tourist.head.getWorldPosition(H.t);
  if (t < nadieT + 0.3) { phone.visible = true; tourist.hand(1, phone.position); phone.rotation.set(0, 0.4, 0); }
}
function poseGeo(t) {
  const vis = t >= c[3] - 0.1 && t < c[5]; geo.root.visible = vis; notebook.visible = vis; if (!vis) return;
  const t1 = c[3] + 1.05, x1 = -0.75, z = 0.35;
  let p;
  if (t < t1 + 0.1) p = { ...go(t, c[3] - 0.1, t1, -2.7, x1), z, mood: 'neutral' };
  else {
    const wind = win(t, c[3] + 0.6, c[4] + 0.6, 0.4), ufo1 = prog(t, aliensT + 0.4, aliensT + 0.7);
    p = { x: x1, z, face: lerp(-0.55, 0.25, ufo1), lean: 0.2 * wind, squash: breathe(t) * settle(t, t1), y: hop(t, aliensT + 0.45, 0.2),
      look: ufo1 > 0.5 ? V(1.0, 3.6, -0.6) : t > hieloT && t < bromasT + 0.3 ? V(-0.1, 2.2, 0.4) : V(-0.4, 1.4, 4.5),
      handR: V(x1 - 0.02, 1.86, z + 0.06), wR: wind * (1 - ufo1),
      ...moodAt(t, [[0, 'neutral'], [chicaT, 'worried'], [huracanT, 'effort'], [c[4], 'neutral'], [hieloT + 0.1, 'surprised'], [hieloT + 0.6, 'neutral'], [aliensT + 0.4, 'surprised']]) };
    p.tilt = -0.12 * wind;
  }
  p.handL = V(p.x - 0.28, 1.0, z + 0.3); p.wL = 0.9;
  geo.pose(alive({ blink: blinkAt(t, 1.1), ...p }, t, 2)); geo.head.getWorldPosition(H.g);
  geo.hand(0, notebook.position); notebook.rotation.set(-0.4, 0.3, 0.2);
}
function poseStudent(t) {
  const vis = t >= bromasT - 0.5 && t < c[5]; student.root.visible = vis; if (!vis) return;
  const rx = 2.5 + 0.5 * prog(t, bromasT, aliensT + 0.1), x = rx - 0.62, z = -0.2, look = prog(t, aliensT + 0.35, aliensT + 0.6);
  const w = go(t, bromasT, aliensT + 0.1, 1.88, 2.38, 0.28);
  const p = { x, z, face: lerp(1.2, 0.1, look), walk: w.walk * (1 - look), phase: w.phase, stride: 0.28, lean: 0.34 * (1 - look), crouch: 0.32 * (1 - look),
    handL: V(rx - 0.25, 0.42, -0.05), wL: 1 - look, handR: V(rx - 0.22, 0.3, -0.36), wR: 1 - look, y: hop(t, aliensT + 0.4, 0.22),
    squash: settle(t, aliensT + 0.8, 0.12) * breathe(t, 1), look: look > 0.5 ? V(1.0, 3.6, -0.6) : V(x, 1.3, 4.5),
    ...moodAt(t, [[0, 'sly'], [aliensT + 0.35, 'surprised']]) };
  student.pose(alive({ blink: blinkAt(t, 0.7), ...p }, t, 3)); student.head.getWorldPosition(H.s);
}
function poseScientists(t) {
  const vis = t >= c[5]; rich.root.visible = jim.root.visible = vis; tablet.visible = false; if (!vis) return;
  let pr, pj;
  if (t < c[7]) {                                        // campamento
    const sit = prog(t, esperaT, esperaT + 0.4), bored = t > c[6];
    if (t < c[5] + 1.2) pr = { ...go(t, c[5], c[5] + 1.15, CX - 2.3, CX - 0.25), z: 0.6 };
    else {
      const place = win(t, gpsT - 0.1, gpsT + 0.7, 0.2);
      pr = { x: CX - 0.25, z: 0.6, face: lerp(0.45, 0.35, sit), crouch: lerp(0.55, 1, sit), lean: 0.25 * (1 - sit),
        squash: breathe(t) * settle(t, gpsT + 0.45, 0.08), handR: V(CX + 0.1, 0.5, 1.2), wR: place,
        look: t < cientT ? V(CX + 0.2, 0.3, 1.3) : t < gpsT ? V(CX + 0.2, 1.3, 4.5) : t < quinceT ? V(CX + 0.2, 0.3, 1.3) : t < esperaT ? V(CX + 1.4, 1.2, 4.5) : V(CX + 0.4, 1.0, 4),
        tilt: bored ? 0.12 * Math.sin(t * 1.6) : 0,
        ...moodAt(t, [[0, 'neutral'], [cientT, 'happy'], [gpsT, 'effort'], [gpsT + 0.6, 'happy'], [c[6], 'neutral'], [anosT, 'worried']]) };
      if (sit > 0.5) { pr.handL = V(CX - 0.42, 0.62, 0.85); pr.wL = 0.8; pr.handR = V(CX - 0.08, 0.62, 0.85); pr.wR = 0.8; }
    }
    if (t < c[5] + 1.4) pj = { ...go(t, c[5] + 0.25, c[5] + 1.35, CX + 3.3, CX + 1.35), z: 0.6 };
    else pj = { x: CX + 1.35, z: 0.6, face: lerp(-0.45, -0.35, sit), crouch: sit, squash: breathe(t, 1),
      look: t < quinceT ? V(CX + 0.2, 0.5, 1.3) : t < esperaT ? V(CX + 1.6, 1.2, 4.5) : bored ? V(CX + 0.55, 0.9, -0.3) : V(CX + 0.9, 1.0, 4),
      tilt: bored ? -0.1 * Math.sin(t * 1.3 + 1) : 0,
      ...moodAt(t, [[0, 'neutral'], [quinceT, 'happy'], [c[6], 'neutral'], [anosT + 0.3, 'worried']]) };
    if (!pj.walk) { pj.handL = V(CX + 1.22, 1.0, 0.92); pj.handR = V(CX + 1.5, 1.0, 0.92); pj.wL = pj.wR = 1 - 0.3 * sit; }
  } else {                                               // en la orilla del lago
    const RX = -4.4, RZ = 1.1, JX = -3.4, JZ = 1.6, walk1 = secaT + 0.1;
    const surpr = t > crujeT, cheer = win(t, sesentaT, sesentaT + 1.4, 0.2);
    if (t < walk1) {
      pr = { x: RX, z: RZ, face: 0.55, y: hop(t, crujeT + 0.05, 0.2) + hop(t, sesentaT + 0.1, 0.18), squash: settle(t, crujeT + 0.5, 0.14) * breathe(t),
        look: t < crujeT ? V(0, 0.3, -2) : t < placasT ? V(-4.1, 1.4, 4.5) : V(0.5, 0.3, -1.5),
        handR: cheer > 0 ? V(RX + 0.35, 1.85, RZ + 0.1) : V(RX + 0.6, 1.25, RZ + 0.1), wR: Math.max(win(t, placasT, c[10], 0.25), cheer),
        handL: cheer > 0 ? V(RX - 0.35, 1.85, RZ + 0.1) : null, wL: cheer,
        ...moodAt(t, [[0, 'neutral'], [crujeT, 'surprised'], [placasT + 0.3, 'happy']]) };
      pj = { x: JX, z: JZ, face: -0.35, y: hop(t, crujeT + 0.15, 0.16) + hop(t, sesentaT + 0.2, 0.18), squash: settle(t, crujeT + 0.6, 0.12) * breathe(t, 2),
        look: t < crujeT ? V(0, 0.3, -2) : t > brisaT && t < metrosT ? V(JX, 1.0, JZ + 0.4) : V(JX - 0.1, 1.4, 4.5),
        handL: V(JX - 0.13, 0.98, JZ + 0.32), handR: V(JX + 0.13, 0.98, JZ + 0.32),
        ...moodAt(t, [[0, 'neutral'], [crujeT + 0.1, 'surprised'], [metrosT, 'happy']]) };
      if (!surpr) { pr.tilt = 0.05 * Math.sin(t * 1.2); }
    } else {                                             // caminan sobre la playa seca, entre los surcos
      pr = { ...go(t, walk1, walk1 + 1.4, RX, -2.3), z: RZ, mood: 'happy' };
      if (t > walk1 + 1.4) { pr.face = 0.6; pr.look = V(0, 0.2, -1.5); pr.handR = V(-1.8, 1.3, RZ); pr.wR = back(lin(t, walk1 + 1.4, walk1 + 1.7)); }
      pj = { ...go(t, walk1 + 0.15, walk1 + 1.6, JX, -1.25), z: JZ, mood: 'happy' };
      if (t > walk1 + 1.6) { pj.face = -0.3; pj.look = V(-1.6, 1.4, 4.5); }
      pj.handL = V(pj.x - 0.13, 1.08, JZ + 0.32); pj.handR = V(pj.x + 0.13, 1.08, JZ + 0.32);
    }
  }
  rich.pose(alive({ blink: blinkAt(t, 0.2), ...pr }, t, 4)); rich.head.getWorldPosition(H.r);
  jim.pose(alive({ blink: blinkAt(t, 1.4), ...pj }, t, 6)); jim.head.getWorldPosition(H.j);
  if (pj.handL && pj.handR) {
    tablet.visible = true; jim.hand(0, tmp); jim.hand(1, tmp2); tablet.position.copy(tmp).add(tmp2).multiplyScalar(0.5); tablet.position.y += 0.02; tablet.position.z += 0.05;
    tablet.rotation.set(-0.35, 0.15, 0);
  }
}

// ---------------- cámara ----------------
const hA = heroAt(empujanT + 0.6), hB = heroAt(c[11] + 0.3);
k.shots([
  { t: 0, pos: [-0.15, 1.9, 8.6], look: [-0.1, 1.15, -0.3] },
  { t: solasT - 0.35, pos: [0.5, 1.0, 3.7], look: [0.55, 0.35, -0.6] },
  { t: nadieT, pos: [0.15, 1.45, 6.6], look: [0.15, 1.05, -0.3] },
  { t: playaT, pos: [0.3, 4.2, 12], look: [1.2, 0.6, -4] },
  { t: cincoT + 0.9, pos: [1.6, 10.5, 17], look: [2.6, 0.4, -8], glide: true },
  { t: grietaT, pos: [-0.75, 2.1, 2.3], look: [-0.75, 0, -0.15] },
  { t: c[2], pos: [0.7, 1.35, 5.0], look: [0.7, 0.95, -0.5] },
  { t: surcosT, pos: [1.6, 2.2, 3.4], look: [-1.6, 0.1, -4.5] },
  { t: c[3] - 0.05, pos: [-0.6, 2.4, 1.6], look: [-5.5, 0, -4.8], glide: true },
  { t: c[3] + 0.25, pos: [-0.45, 1.6, 5.8], look: [-0.45, 1.15, 0.2] },
  { t: chicaT, pos: [0.0, 0.85, 2.8], look: [0.05, 0.35, 0.5] },
  { t: huracanT, pos: [-0.7, 1.55, 3.9], look: [-0.65, 1.35, 0.3] },
  { t: c[4], pos: [-0.35, 1.85, 5.6], look: [-0.3, 1.55, 0.2] },
  { t: bromasT, pos: [2.15, 1.35, 4.4], look: [2.3, 0.9, -0.2] },
  { t: aliensT, pos: [0.6, 2.3, 8.6], look: [0.85, 2.2, -0.8] },
  { t: c[5], pos: [CX, 1.9, 8.8], look: [CX + 0.3, 1.2, -1], cut: true },
  { t: cientT, pos: [CX + 0.5, 1.5, 5.4], look: [CX + 0.5, 1.15, 0] },
  { t: gpsT, pos: [CX + 0.0, 1.2, 4.4], look: [CX + 0.0, 0.75, 0.8] },
  { t: quinceT, pos: [CX + 1.3, 2.7, 6.8], look: [CX + 3.0, 0.3, -3] },
  { t: esperaT, pos: [CX + 0.55, 1.6, 7.0], look: [CX + 0.55, 1.0, 0] },
  { t: c[6], pos: [CX + 0.55, 1.3, 6.0], look: [CX + 0.55, 0.9, 0] },
  { t: anosT + 0.1, pos: [CX + 0.5, 1.15, 5.7], look: [CX + 0.5, 0.85, 0] },
  { t: c[7], pos: [1.6, 5.6, 11], look: [2.1, 0, -3], cut: true },
  { t: aguaT + 0.3, pos: [2.2, 3.8, 8.2], look: [2.4, 0, -3.4], glide: true },
  { t: congelaT, pos: [0.55, 1.05, 3.3], look: [0.9, 0.15, -0.6] },
  { t: c[8], pos: [-3.85, 1.6, 6.0], look: [-3.85, 1.25, 0.6] },
  { t: crujeT, pos: [-4.15, 1.6, 3.9], look: [-4.15, 1.4, 1.0] },
  { t: placasT, pos: [0.8, 3.6, 5.6], look: [1.0, 0, -1.8] },
  { t: c[9], pos: [0.5, 1.5, 4.6], look: [1.2, 0.25, -0.6] },
  { t: empujanT + 0.6, pos: [hA.x + 0.2, 1.4, hA.z + 4.6], look: [hA.x + 0.3, 0.25, hA.z], glide: true },
  { t: metrosT, pos: [-3.3, 1.45, 3.7], look: [-3.35, 1.3, 1.6] },
  { t: c[10], pos: [2.6, 8.5, 11.5], look: [3.0, 0, -3.6] },
  { t: c[11], pos: [3.4, 6.6, 9.4], look: [3.6, 0, -3.8], glide: true },
  { t: c[11] + 0.05, pos: [hB.x - 0.2, 1.7, hB.z + 4.4], look: [hB.x, 0.3, hB.z] },
  { t: secaT, pos: [-2.0, 1.6, 5.6], look: [-1.7, 1.15, 0.6] },
  { t: fsurcosT, pos: [2.4, 6.4, 8.6], look: [3.2, 0, -3.5] },
]);

// ---------------- carteles ----------------
const rockTop = R => () => tmp3.set(R.pos.x, R.y + R.r * 0.6, R.pos.z);
tag({ text: 'Valle de la Muerte', big: true, off: BIG, from: 0.15, to: nadieT });
tag({ text: 'Nadie las vio', big: true, off: BIG, from: nadieT + 0.1, to: c[1] });
tag({ text: 'Racetrack Playa', big: true, off: BIG, from: playaT + 0.1, to: cincoT });
tag({ text: 'Casi 5 km', big: true, off: [540, 400], from: cincoT, to: grietaT });
tag({ text: 'Barro seco y agrietado', at: () => tmp2.set(-0.75, 0, 0.2), off: [180, -330], from: grietaT + 0.35, to: c[2] });
tag({ text: 'Hasta 320 kg', big: true, off: BIG, from: kilosT, to: surcosT });
tag({ text: 'Cientos de metros', big: true, off: BIG, from: surcosT + 0.2, to: c[3] });
tag({ text: '¿El viento?', at: () => H.g, off: [230, -280], from: vientoT, to: chicaT });
tag({ text: 'Piedra chica', at: () => smallRock.position, off: [200, -260], from: chicaT + 0.1, to: huracanT });
tag({ text: '¡Un huracán!', big: true, off: BIG, from: huracanT, to: c[4] });
tag({ text: '¿Hielo?', at: () => iceCube.position, off: [230, -170], from: hieloT + 0.15, to: bromasT });
tag({ text: '¿Bromas?', at: () => H.s, off: [-260, -250], from: bromasT + 0.2, to: aliensT });
tag({ text: '¿Aliens?', big: true, off: BIG, from: aliensT + 0.15, to: c[5] });
tag({ text: '2011', big: true, off: BIG, from: onceT, to: cientT + 0.2 });
tag({ text: 'Richard Norris', at: () => H.r, off: [-60, -300], from: cientT + 0.25, to: gpsT });
tag({ text: 'GPS', at: () => campRocks[0].b.position, off: [200, -220], from: gpsT + 0.5, to: quinceT });
tag({ text: '15 piedras con GPS', big: true, off: BIG, from: quinceT, to: esperaT + 0.4 });
tag({ text: 'Y esperan…', big: true, off: BIG, from: esperaT + 0.4, to: c[6] });
tag({ text: '¿5 o 10 años?', big: true, off: BIG, from: anosT - 0.1, to: c[7] });
tag({ text: 'Diciembre 2013', big: true, off: BIG, from: dicT, to: lagoT + 0.6 });
tag({ text: 'Unos 7 cm de agua', at: () => tmp2.set(3, 0.04, -2), off: [0, -360], from: aguaT - 0.3, to: nocheT });
tag({ text: '¡Se congela!', big: true, off: BIG, from: congelaT, to: c[8] });
tag({ text: 'Mediodía', big: true, off: BIG, from: c[8] + 0.1, to: crujeT });
tag({ text: '“¡Es esto!”', at: () => H.r, off: [220, -260], from: crujeT + 0.3, to: placasT });
tag({ text: 'Hielo de 3 a 6 mm', big: true, off: BIG, from: placasT, to: c[9] });
tag({ text: 'Brisa suave', at: () => tmp2.set(hA.x - 1.2, 0.9, hA.z), off: [-120, -300], from: brisaT + 0.2, to: empujanT });
tag({ text: 'Placa de hielo', at: () => tmp2.set(hero.pos.x - 0.6, 0.06, hero.pos.z + 0.5), off: [200, -380], from: empujanT, to: metrosT });
tag({ text: '2 a 5 m por minuto', big: true, off: BIG, from: metrosT, to: c[10] });
tag({ text: '+60 piedras a la vez', big: true, off: BIG, from: sesentaT, to: c[11] });
tag({ text: 'El hielo se derrite', at: rockTop(hero), off: [40, -380], from: derriteT + 0.1, to: secaT });
tag({ text: 'Misterio resuelto', big: true, off: BIG, from: fsurcosT, to: END + 1 });

// ---------------- sonidos ----------------
sfx(0, 'boom', 0.5); sfx(0.5, 'roll', 0.5); sfx(nadieT + 0.05, 'pop', 0.7);
sfx(kilosT + 0.1, 'thud', 0.8); sfx(vientoT, 'hiss', 0.35);
for (const hit of [aliensT + 0.5, placasT + 0.3, sesentaT + 0.3, fsurcosT + 0.3]) { sfx(hit - 1.2, 'riser_to', 1); sfx(hit, 'boom', 0.45); }
sfx(gpsT + 0.45, 'tap', 0.8); for (let i = 0; i < 6; i++) sfx(quinceT + 0.05 + i * 0.16, 'tap', 0.45);
sfx(lagoT + 0.1, 'splash', 0.6);
for (let i = 0; i < 6; i++) sfx(crujeT + 0.05 + i * 0.13, 'tap', 0.55);
sfx(brisaT, 'hiss', 0.3);

// ---------------- cuadro ----------------
const UFO_AT = V(1.0, 3.4, -0.6);
k.run(t => {
  applySky(t);
  // cielo: estrellas, luna, sol, nubes, montañas
  for (const S of starSets) {
    S.mats.forEach((m, j) => { m.opacity = SKY.star * (0.55 + 0.45 * Math.sin(t * (2.2 + j) + j * 2)); });
    S.big.forEach((g, i) => k.glyphAt(g, g.userData.p, 0, 0, SKY.star > 0.3 ? SKY.star * (0.5 + 0.5 * Math.sin(t * 2.5 + i * 1.7)) : 0, t * 0.6 + i));
  }
  const inF7 = t >= F7 && t < c[7];
  { const th = inF7 ? (t - F7) / 1.4 * PI * 2 : -0.9;
    sunC.position.set(CX + 9 * Math.sin(th), 3 + 11 * Math.cos(th), -34); moonC.position.set(CX + 9 * Math.sin(th + PI), 3 + 11 * Math.cos(th + PI), -34.5);
    sunC.visible = sunC.position.y > -1; moonC.visible = inF7 && moonC.position.y > -1; }
  moonP.position.set(-5, 15.5, -34); moonP.children.forEach(m => { m.material.opacity = (m === moonP.children[moonP.children.length - 1] ? 0.15 : 1) * Math.min(1, SKY.star * 1.4); }); moonP.visible = SKY.star > 0.05;
  sunP.position.set(lerp(8, 5, SKY.sunset), lerp(15, 4.2, SKY.sunset), -34.5); sunP.visible = SKY.day > 0.05; sunP.children[0].material.opacity = Math.min(1, SKY.day);
  clouds.forEach(g => g.children[0].material.color.copy(SKY.cloud));
  mountains.forEach((m, i) => { m.material.color.copy(SKY.mtn); if (i % 2 === 0) m.material.color.multiplyScalar(0.92); });
  bushes.forEach((g, i) => { g.rotation.z = (0.04 + 0.05 * win(t, c[3], c[5], 0.5)) * Math.sin(t * 2.1 + i * 1.3); });
  anemos.forEach((a, i) => { a.rotation.y = t * (6 + 9 * win(t, c[3], c[5], 0.5) + 3 * (t > brisaT ? 1 : 0)) + i; });
  tripods.forEach(g => { g.userData.rec.visible = Math.sin(t * 6) > 0; });

  // piedras y surcos
  const pre = t < c[7];
  for (const P of panels) P.s = sAt(P, t);
  for (const R of rocks) {
    rockAt(R, t, R.pos);
    const moving = pre ? (R.gag ? win(t, R.gag[0], R.gag[1], 0.2) : 0) : (R.P.s > 0 && t < tStop ? 1 : 0);
    R.mesh.position.set(R.pos.x, R.y, R.pos.z); R.mesh.rotation.set(0.04 * Math.sin(t * 15 + R.seed) * moving, R.seed + (pre ? 0 : R.P.s * 0.25), 0.03 * Math.sin(t * 13 + R.seed) * moving);
    const oldOn = pre; R.oldLip.visible = R.oldGroove.visible = oldOn;
    if (oldOn) { const f = R.gag ? (R.L - R.gag[2] * (1 - prog(t, R.gag[0], R.gag[1]))) / R.L : 1; setRange(R.oldLip, f); setRange(R.oldGroove, f); }
    const nf = pre || R.sMax < 1e-3 ? 0 : R.P.s / R.sMax; R.newLip.visible = R.newGroove.visible = nf > 0.005; setRange(R.newLip, nf); setRange(R.newGroove, nf);
    if (R.gps) { R.gps.position.set(R.pos.x, R.y + R.r * 0.55, R.pos.z); R.gps.rotation.y = R.mesh.rotation.y; R.gps.userData.led.visible = Math.sin(t * 7 + R.seed) > 0; }
  }
  smallRock.visible = pre; smallRock.rotation.set(0, 0.4, 0.06 * Math.sin(t * 22) * win(t, c[3] + 0.6, c[4], 0.3));
  puffA(t, 0.55, hero.pos.x - 0.35, hero.pos.z, -1, 0.08); puffA(t, 1.6, hero.pos.x - 0.35, hero.pos.z, -1, 0.08);
  puffB(t, bromasT + 0.2, prank.pos.x - 0.3, prank.pos.z, -1, 0.08); puffB(t, bromasT + 0.9, prank.pos.x - 0.3, prank.pos.z, -1, 0.08);
  for (let i = 0; i < 4; i++) puffC(t, c[3] + 0.4 + i * 0.75, -2.0 + i * 0.6, 0.9 - i * 0.3, 1, 0.08);
  puffD(t, secaT + 0.1, -4.4, 1.1, -1); puffE(t, secaT + 0.25, -3.4, 1.6, -1);

  // agua e hielo
  const wOn = t >= c[7];
  water.visible = wOn;
  if (wOn) {
    const fill = prog(t, lagoT - 0.1, aguaT + 0.9), dry = prog(t, secaT - 0.2, secaT + 1.1);
    water.scale.set(1, Math.max(fill, 0.01) * lerp(1, 0.5, dry), 1); water.material.opacity = 0.55 * Math.min(1, fill * 1.5) * (1 - dry);
    waterTex.offset.set(t * 0.03, t * 0.01);
  }
  for (const P of panels) {
    const op = !wOn ? 0 : 0.62 * prog(t, P.freeze, P.freeze + 0.6) * (1 - prog(t, derriteT, derriteT + 1.4));
    P.holder.visible = op > 0.01; if (!P.holder.visible) continue;
    P.mat.opacity = op; P.mat.color.copy(SKY.ice); P.glint.material.opacity = op * (0.6 + 0.4 * Math.sin(t * 3 + P.cx));
    P.edges.visible = t > P.crack;
    const gap = 1 - 0.05 * prog(t, parteT, parteT + 0.6), melt = lerp(1, 0.55, prog(t, derriteT, derriteT + 1.4));
    carry(P, P.cx, P.cz, P.s, tv); P.holder.position.set(tv.x, 0.05, tv.z); P.holder.rotation.y = P.rot * P.s; P.holder.scale.setScalar(gap * melt);
  }
  frost.forEach((g, i) => { const tt = (t - nocheT - i * 0.18); const kk = wOn && tt > 0 && t < c[8] + 0.3 ? Math.max(0, Math.sin(Math.min(tt, 1.2) / 1.2 * PI)) * (0.7 + 0.3 * Math.sin(t * 9 + i)) : 0;
    k.glyphAt(g, tmp.set(-0.4 + (i % 4) * 0.7, 0.12, -0.2 - Math.floor(i / 4) * 0.8), 0, 0, kk, t + i); });
  ripples.forEach((m, i) => { const R = rocks[(i * 5) % rocks.length], u = ((t - lagoT) * 0.7 + i * 0.37) % 1;
    m.visible = wOn && t > lagoT + 0.5 && t < nocheT + 0.4; if (!m.visible) return; m.position.set(R.pos.x, 0.045, R.pos.z); m.scale.setScalar(R.r * 2 + u * 1.4); m.material.opacity = 0.6 * (1 - u); });

  // viento (geólogo) y brisa (placas)
  const wind = win(t, c[3] + 0.3, c[4] + 0.5, 0.4), breeze = wOn ? win(t, brisaT, tStop, 0.5) * 0.6 : 0, wAmt = Math.max(wind, breeze);
  streaks.forEach((m, i) => { const u = ((t * (wind > 0 ? 1.4 : 0.6) + i * 0.137) % 1), base = wind > 0 ? -0.75 : hero.pos.x;
    m.visible = wAmt > 0.02; if (!m.visible) return;
    m.position.set(base - 3 + u * 6, wind > 0 ? (i % 2 ? 0.2 + (i % 6) * 0.12 : 0.6 + (i % 6) * 0.45) : 0.2 + (i % 6) * 0.3, wind > 0 ? (i % 2 ? 1.1 : -0.9) - (i % 3) * 0.3 : hero.pos.z + 1.2 - (i % 3) * 0.7); m.scale.x = wind > 0 ? 1.4 : 0.8;
    m.material.opacity = wAmt * 0.65 * Math.sin(PI * u); });
  { const u = lin(t, c[3] + 0.4, c[4] + 0.9), u2 = lin(t, F7 - 0.2, c[7]);
    weed.visible = (u > 0 && u < 1) || (u2 > 0 && u2 < 1);
    const x = u > 0 && u < 1 ? lerp(-3.6, 3.4, u) : lerp(CX - 3.5, CX + 3.6, u2), z = u > 0 && u < 1 ? 1.4 : 1.6;
    weed.position.set(x, 0.28 + Math.abs(Math.sin(x * 2.2)) * 0.22, z); weed.rotation.set(0.3, 0, -x / 0.28); }

  // personajes
  poseTourist(t); poseGeo(t); poseStudent(t); poseScientists(t);
  k.glyphAt(qT, H.t, 0.08, 0.62, popIn(t, nadieT + 0.15, c[1] + 0.3), 0.12 * Math.sin(t * 6));
  sweat.forEach((m, i) => { const on = t > c[2] + 0.4 && t < surcosT, u = (t * 1.7 + i / 3) % 1, s = i % 2 ? 1 : -1; m.visible = on; if (!on) return;
    m.position.set(H.t.x + s * (0.3 + 0.25 * u), H.t.y + 0.22 + 0.3 * u - 0.6 * u * u, H.t.z + 0.25); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
  k.glyphAt(qG, H.g, 0.05, 0.66, popIn(t, hieloT + 0.1, bromasT + 0.2), 0.12 * Math.sin(t * 6));
  k.glyphAt(bangG, H.g, 0.05, 0.68, popIn(t, aliensT + 0.45, c[5]));
  k.glyphAt(bangS, H.s, 0.05, 0.68, popIn(t, aliensT + 0.45, c[5]));
  k.glyphAt(bangR, H.r, 0.05, 0.66, popIn(t, crujeT + 0.05, placasT + 0.2));
  k.glyphAt(bangJ, H.j, 0.05, 0.66, popIn(t, crujeT + 0.15, placasT + 0.2));
  k.glyphAt(okR, H.r, 0.05, 0.66, popIn(t, fsurcosT, END + 1));
  zzz.forEach((g, i) => { const u = ((t - anosT) * 0.8 + i / 3) % 1; k.glyphAt(g, H.j, 0.25 + 0.2 * u, 0.4 + 0.5 * u, t > anosT && t < c[7] ? Math.sin(PI * u) : 0, 0.3); });

  // teorías: cubo de hielo y platillo
  { const s = popIn(t, hieloT, bromasT + 0.3); iceCube.visible = s > 0.01; iceCube.scale.setScalar(Math.max(s, 0.001));
    iceCube.position.set(-0.05, 2.2 + 0.06 * Math.sin(t * 3), 0.4); iceCube.rotation.set(0.4, t * 1.5, 0.2); }
  { const a = back(lin(t, aliensT, aliensT + 0.6)), vis = t >= aliensT && t < c[5];
    ufo.visible = vis; beam.visible = beamSpot.visible = vis && t > aliensT + 0.5;
    if (vis) {
      ufo.position.set(lerp(5, UFO_AT.x, a), lerp(7, UFO_AT.y, a) + 0.08 * Math.sin(t * 4), UFO_AT.z); ufo.rotation.set(0.12 * Math.sin(t * 3), t * 2, 0.08);
      ufoLights.forEach((l, i) => { l.visible = Math.sin(t * 10 + i * 1.2) > -0.2; });
      const bk = prog(t, aliensT + 0.5, aliensT + 0.75);
      beam.position.set(ufo.position.x, ufo.position.y - 1.45, UFO_AT.z); beam.scale.set(bk, 1, bk); beam.material.opacity = 0.25 + 0.08 * Math.sin(t * 14);
      beamSpot.position.set(hero.pos.x, 0.02, hero.pos.z); beamSpot.scale.setScalar(Math.max(bk, 0.01));
    }
  }
  // campamento: la caja del primer GPS va de la mano a la piedra; después se prenden las otras 14
  campRocks.forEach((R, i) => {
    if (i === 0) {
      const placed = t > gpsT + 0.45;
      if (!placed && t >= c[5]) { rich.hand(1, R.b.position); R.b.position.y -= 0.03; } else R.b.position.set(CX + 0.2, R.m.position.y + R.r * 0.55, 1.3);
      R.b.visible = t >= gpsT - 0.1; R.b.scale.setScalar(placed ? settle(t, gpsT + 0.45, 0.2) : 1);
    } else { const s = popIn(t, quinceT + (i - 1) * 0.07, END + 5); R.b.visible = s > 0.01; R.b.scale.setScalar(Math.max(s, 0.001)); }
    R.b.userData.led.visible = Math.sin(t * 7 + i) > 0;
  });
  // almanaque: se dan vuelta las hojas
  calPages.forEach((pv, i) => { if (i === 0) return; const tf = i === 2 ? F7 + 0.55 : F7 + 1.3, f = prog(t, tf, tf + 0.3); pv.rotation.x = -f * 2.6; pv.visible = f < 0.95; });
  sparks.forEach((m, i) => { const kk = popIn(t, fsurcosT, END + 1) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6));
    k.glyphAt(m, tmp.set(hero.pos.x, 0.1, hero.pos.z), [-1.4, 1.2, -0.6, 0.9][i], [0.4, 0.6, 1.0, 1.1][i], Math.max(kk, 0), t * 1.5 + i); });
  if (t >= metrosT - 0.5 && t < c[10] + 0.5 || t >= brisaT && t < c[11]) drawScreen(t);
});
k.follow(t => t < c[3] ? H.t : t < c[5] ? H.g : H.r);
