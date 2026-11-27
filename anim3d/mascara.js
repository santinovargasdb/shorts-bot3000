// Episodio (misterios): el hombre de la máscara de hierro. Preso de Luis XIV desde 1669 hasta su muerte en la
// Bastilla en 1703, siempre custodiado por Saint-Mars. Decorados lado a lado en x:
//   0 FORTALEZA (Pignerol, torre con ventana)   40 PALACIO (Luis XIV)   80 OFICINA + CELDA
//   120 PASILLO DE PUERTAS   160 CAMINO DE NOCHE (silla tapada)   200 ESTUDIO (Voltaire y Dumas)
//   240 BASTILLA + CEMENTERIO
// Paleta de noche: cielo oscuro, luna, antorchas con resplandor, niebla que avanza, murciélagos.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { draw, surface, picture, painting } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('mascara', { sky: [[0, '#0b0f2a'], [0.5, '#232457'], [1, '#4a3a6c']], light: { ambient: 1.45, sun: 1.45 } });
const { scene, c, at, END, sfx, tag, BIG } = k;
k.light.sun.color.set(0xd2d9ff);                                   // luz de luna, fría
const AX = 0, BX = 40, CX = 80, DX = CX + 7.6, EX = 160, FX = 200, GX = 240, QX = GX + 15;

// ---------------- tiempos ----------------
const T = {
  encierra: at('encierra'), treinta: at('treinta'), nadie: at('nadie'),
  orden1: at('orden', c[1]), rey: at('rey', c[1]), luis: at('luis', c[1]),
  figura: at('figura', c[2]), eustache: at('eustache', c[2]), casi: at('casi', c[2]),
  carcelero: at('carcelero', c[3]), orden2: at('orden', c[3]), habla: at('habla', c[3]), matar: at('matar', c[3]),
  varias: at('varias', c[4]), detras: at('detras', c[4]), otra: at('otra', c[4]), escuche: at('escuche', c[4]),
  prision: at('prision', c[5]), escondido: at('escondido', c[5]), silla: at('silla', c[5]),
  hierro: at('hierro', c[6]), terciopelo: at('terciopelo', c[6]), del: at('del', c[6]), voltaire: at('voltaire', c[6]), dumas: at('dumas', c[6]),
  bastilla: at('bastilla', c[7]), muere: at('muere', c[7]), sete: at('setecientos', c[7]),
  otro: at('otro', c[8]), queman: at('queman', c[8]), raspan: at('raspan', c[8]),
  hermano: at('hermano', c[9]), otros: at('otros', c[9]), sirviente: at('sirviente', c[9]), vio: at('vio', c[9]), debia: at('debia', c[9]),
  tres: at('trescientos', c[10]), nadie2: at('nadie', c[10]),
};
const CUT_STUDY = T.del - 0.2, CB = c[4] + 0.12;

// ---------------- texturas y piezas comunes ----------------
const cvCache = new Map();
function texW(kind, opts, w, h, S, ox = 0, oy = 0) {
  const key = kind + JSON.stringify(opts);
  if (!cvCache.has(key)) cvCache.set(key, draw[kind](opts));
  const t = new THREE.CanvasTexture(cvCache.get(key)); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / S, h / S); t.offset.set(ox / S, oy / S); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const STONE = { base: '#7a7a9e', mortar: '#45435e', rows: 8, cols: 4, seed: 3 };
const STONE_IN = { base: '#6f6c86', mortar: '#3e3a52', rows: 7, cols: 3, seed: 8 };
/** Pared de piedra con los ladrillos alineados en el mundo (así varios pedazos empalman). */
function wallRect(x0, x1, y0, y1, z, opts = STONE, S = 1.4) { return surface(scene, texW('bricks', opts, x1 - x0, y1 - y0, S, x0, y0), x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, z); }
function floor(kind, opts, cx, w = 30, d = 24, S = 1.2) { return surface(scene, texW(kind, opts, w, d, S), w, d, cx, 0.001, 0, true); }
function canvasTex(w, h, paint) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; paint(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
function glowMesh(color, size, op = 0.6) {
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
}

// fuego: antorchas, velas, faroles (todo titila)
const flames = [];
function flame(parent, s = 1, { light = 0, glow = 0.8, color = 0xffa040 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const gl = glowMesh(0xffa050, 1.5 * s * glow, 0.55); gl.position.set(0, 0.08 * s, 0.03); g.add(gl);
  const fo = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.075 * s, 0.26 * s, 10), basic(0xff7a22)), 0.012 * s); fo.position.y = 0.13 * s; g.add(fo);
  const fi = new THREE.Mesh(new THREE.ConeGeometry(0.042 * s, 0.16 * s, 10), basic(0xffe48a)); fi.position.set(0, 0.1 * s, 0.035 * s); g.add(fi);
  let pl = null; if (light) { pl = new THREE.PointLight(color, light, 7, 1.3); pl.position.set(0, 0.25, 0.5); g.add(pl); }
  const f = { g, gl, fo, fi, pl, base: light, k: flames.length * 1.37, s, on: 1 }; flames.push(f); return f;
}
function torch(x, y, z, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  block(g, 0x2b2f3a, -0.02, 0.02, -0.12, 0.02, 0.0, -0.12, 0.01);              // soporte a la pared
  block(g, 0x4a3222, -0.03, 0.03, -0.38, 0.0, 0.03, -0.03, 0.012);
  block(g, 0x2b2f3a, -0.06, 0.06, -0.06, 0.02, 0.06, -0.06, 0.012);
  return flame(g, 1, opts);
}
function candle(x, y, z, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const w = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.16, 12), flat(0xf3ead2)), 0.01); w.position.y = 0.08; g.add(w);
  const dish = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 16), flat(0xc9a24a)), 0.01); g.add(dish);
  const f = flame(g, 0.45, { glow: 1.6, ...opts }); f.g.position.y = 0.16; return f;
}

// niebla: bancos semitransparentes que avanzan sin cortes (textura que se desliza)
const fogs = [];
const fogCanvas = seed => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d'), r = rng(seed);
  for (let i = 0; i < 30; i++) { const x = r() * 512, y = 128 + (r() - 0.5) * 110, rad = 45 + r() * 75;
    for (const dx of [-512, 0, 512]) { const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, rad); gr.addColorStop(0, 'rgba(235,238,255,0.55)'); gr.addColorStop(1, 'rgba(235,238,255,0)'); g.fillStyle = gr; g.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2); } }
  return cv; };
function fogBank(x, y, z, w, h, op, speed, seed = 1) {
  const t = new THREE.CanvasTexture(fogCanvas(seed)); t.wrapS = THREE.RepeatWrapping; t.repeat.set(w / 7, 1); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: 0xc9cfff, transparent: true, opacity: op, depthWrite: false }));
  m.position.set(x, y, z); m.renderOrder = 2; scene.add(m); fogs.push({ m, t, speed, x0: x, k: fogs.length }); return m;
}
// murciélagos
const bats = [];
const WING = [[0, 0.02], [0.1, 0.07], [0.22, 0.08], [0.33, 0.03], [0.3, -0.02], [0.24, -0.01], [0.2, -0.07], [0.14, -0.03], [0.08, -0.07], [0.03, -0.03]];
function bat(cx, cy, z, off, rx = 2.2, ry = 0.6, s = 1) {
  const g = new THREE.Group(); g.scale.setScalar(s); scene.add(g);
  const m = new THREE.MeshBasicMaterial({ color: 0x0f0a16, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), m); body.scale.set(1, 1.3, 0.8); g.add(body);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), m); e.position.set(sx * 0.025, 0.085, 0); g.add(e); }
  const mk = sx => { const w = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(WING.map(([x, y]) => new THREE.Vector2(sx * x, y)))), m); g.add(w); return w; };
  bats.push({ g, wl: mk(-1), wr: mk(1), cx, cy, z, off, rx, ry });
}
function moon(x, y, z, r) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const gl = glowMesh(0xaab6ff, r * 7, 0.5); gl.position.z = -0.05; g.add(gl);
  g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(0xf6efcf)));
  for (const [dx, dy, rr] of [[-0.3, 0.2, 0.18], [0.25, -0.15, 0.24], [0.1, 0.38, 0.1], [-0.2, -0.35, 0.12]]) { const cr = new THREE.Mesh(new THREE.CircleGeometry(r * rr, 20), basic(0xddd3ad)); cr.position.set(dx * r, dy * r, 0.01); g.add(cr); }
  return g;
}
// partículas: polvo, chispas, motas
const puffA = k.puffs(5), puffB = k.puffs(5), puffC = k.puffs(5), puffD = k.puffs(5);
const sparks = Array.from({ length: 6 }, () => k.glyph('✦', '#fff1a8', 0.26));
const qMarks = Array.from({ length: 3 }, () => k.glyph('?', '#ffd23a', 0.42));
const xMark = k.glyph('✗', '#ff4a4a', 0.7), bang = k.glyph('!', '#ffd23a', 0.5), eqMark = k.glyph('=', '#ffd23a', 0.5);

// ---------------- personajes ----------------
/** Máscara sobre la cabeza de un toon: terciopelo negro (la real) o de hierro (la leyenda). Tapa la cara del toon y
 *  pone sus propios ojos, que miran y parpadean. */
function makeMask(head) {
  const R = 0.33, Zf = V(0, 0, 1), root = new THREE.Group(); head.add(root);
  const seat = (parent, m, x, y, lift) => { const p = V(x, y, Math.sqrt(Math.max(R * R - x * x - y * y, 1e-4))).normalize(); m.quaternion.setFromUnitVectors(Zf, p); m.position.copy(p).multiplyScalar(R + lift); parent.add(m); return m; };
  const shell = (r, mat, dp = 0, dt = 0, th0 = 0.64, thl = 1.72) => new THREE.Mesh(new THREE.SphereGeometry(r, 40, 26, PI / 2 - 1.22 - dp, 2.44 + 2 * dp, th0 - dt, thl + 2 * dt), mat);
  const ell = (rx, ry, mat) => { const d = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mat); d.scale.set(rx, ry, 1); return d; };
  const WH = basic(0xffffff);
  const eyeSet = parent => [-1, 1].map(s => {
    const g = new THREE.Group(); seat(parent, g, s * 0.112, 0.03, 0.004);
    const rim = ell(0.074, 0.056, INK), wh = ell(0.06, 0.044, WH); wh.position.z = 0.002;
    const pu = ell(0.026, 0.028, INK); pu.position.z = 0.004; const hl = ell(0.009, 0.009, WH); hl.position.z = 0.006;
    g.add(rim, wh, pu, hl); return { g, pu, hl };
  });
  const velvet = new THREE.Group(); root.add(velvet);
  velvet.add(shell(R - 0.006, basic(0x1e1428), 0.06, 0.06, 0.74, 1.1));
  velvet.add(shell(R, flat(0x1d1730, { side: THREE.DoubleSide }), 0, 0, 0.74, 1.1));
  for (const s of [-1, 1]) { const nb = ell(0.03, 0.02, basic(0x1e1428)); seat(velvet, nb, s * 0.03, -0.085, 0.002); }
  { const sh = ell(0.07, 0.035, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 })); seat(velvet, sh, -0.13, 0.16, 0.003); sh.rotation.z += 0.5; }
  { const sh = ell(0.05, 0.02, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })); seat(velvet, sh, 0.13, -0.02, 0.003); }
  for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.275; seat(velvet, ell(0.007, 0.007, basic(0x7a6a96)), 0.27 * Math.sin(a), -0.065 + 0.02 * Math.cos(a * 1.2), 0.004); }   // costura del borde
  for (const s of [-1, 1]) {                                     // cintas atadas atrás
    const st = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.34, 6), flat(0x1d1730)), 0.006); st.position.set(s * 0.26, 0.09, -0.17); st.rotation.set(PI / 2, 0, -s * 0.55); velvet.add(st);
  }
  { const kn = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), flat(0x1d1730)), 0.01); kn.position.set(0, 0.1, -0.33); velvet.add(kn); }
  const eyesV = eyeSet(velvet);
  const iron = new THREE.Group(); root.add(iron); iron.visible = false;
  iron.add(shell(R - 0.006, basic(0x1e1428), 0.05, 0.05));
  iron.add(shell(R + 0.002, flat(0x6c7891, { side: THREE.DoubleSide })));
  for (let a = 0; a < 2 * PI - 0.01; a += PI / 7) { const x = 0.26 * Math.sin(a), y = 0.02 + 0.215 * Math.cos(a); const rv = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), flat(0x5d6474)), 0.006); seat(iron, rv, x, y, 0.004); }
  for (let i = 0; i < 4; i++) seat(iron, ell(0.075, 0.009, INK), 0, -0.12 - i * 0.03, 0.005);        // rejilla de la boca
  seat(iron, ell(0.2, 0.012, basic(0x6a7282)), 0, 0.12, 0.004);
  { const sh = ell(0.06, 0.03, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); seat(iron, sh, -0.14, 0.15, 0.006); sh.rotation.z += 0.5; }
  const eyesI = eyeSet(iron);
  return {
    velvet, iron, root,
    update(t, k0 = 0, blink = 0, gx = null, gy = null) {
      const x = gx ?? 0.012 * Math.sin(t * 1.3 + k0) + 0.008 * Math.sin(t * 3.1 + k0), y = gy ?? 0.006 * Math.sin(t * 1.7 + k0);
      for (const e of [...eyesV, ...eyesI]) { e.pu.position.set(x, y, 0.004); e.hl.position.set(x + 0.008, y + 0.01, 0.006); e.g.scale.y = Math.max(1 - 0.92 * blink, 0.08); }
    },
  };
}
function curls(head, color, list) {
  for (const [x, y, z, r] of list) { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat(color)), 0.014); m.position.set(x, y, z); head.add(m); }
}
const WIG = [];
for (const s of [-1, 1]) for (let i = 0; i < 4; i++) WIG.push([s * (0.27 + 0.012 * i), 0.1 - i * 0.135, -0.07 - 0.02 * i, 0.105 - 0.008 * i], [s * 0.13, 0.0 - i * 0.13, -0.24, 0.11]);
WIG.push([-0.15, 0.24, -0.03, 0.15], [0.15, 0.24, -0.03, 0.15], [0, 0.27, -0.12, 0.16]);
function royal(o = {}) {
  const t = makeToon({ shirt: 0x2a3f9a, hair: 0x3a2414, detail: ['buttons', 'collar', 'belt'], trim: 0xf4f1e8, ...o }); scene.add(t.root);
  curls(t.head, 0x3a2414, WIG);
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.78, 22, 1, true, PI - 1.35, 2.7), flat(0xb02a3a, { side: THREE.DoubleSide })); cape.position.y = 0.78; cape.castShadow = true; t.root.add(cape);
  const erm = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), flat(0xf4f1e8)), 0.01); erm.rotation.x = PI / 2; erm.position.y = 1.14; t.root.add(erm);
  for (let a = 0; a < 2 * PI; a += PI / 4) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), INK); d.position.set(0.2 * Math.sin(a), 1.17, 0.2 * Math.cos(a)); t.root.add(d); }
  return t;
}
function crown(head) {
  const g = new THREE.Group(); g.position.y = 0.33; head.add(g);
  g.add(outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.09, 22, 1, true), flat(0xe8b830, { side: THREE.DoubleSide })), 0.012));
  for (let a = 0; a < 2 * PI - 0.01; a += 2 * PI / 6) { const p = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), flat(0xe8b830)), 0.008); p.position.set(0.145 * Math.sin(a), 0.08, 0.145 * Math.cos(a)); g.add(p); }
  const j = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), flat(0xd63c3c)), 0.008); j.position.set(0, 0.0, 0.15); g.add(j);
}
const prisoner = makeToon({ shirt: 0x7d6b52, hair: 0x3a2a1e, detail: ['collar', 'belt', 'buttons'], trim: 0xcfc3a8 }); scene.add(prisoner.root);
const pMask = makeMask(prisoner.head);
const king = royal(); crown(king.head);
const twin = royal(); const tMask = makeMask(twin.head);
const saintMars = makeToon({ shirt: 0x2a4a7a, hair: 0x4a3222, hat: { type: 'fedora', color: 0x23262d, band: 0xd9a441 }, mustache: true, detail: ['buttons', 'belt', 'collar'], trim: 0xf4f1e8 }); scene.add(saintMars.root);
{ const f = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), flat(0xf4f1e8)), 0.012); f.scale.set(0.45, 2.1, 0.3); f.position.set(-0.2, 0.52, -0.06); f.rotation.z = 0.7; saintMars.head.add(f); }
const guardOpts = shirt => ({ shirt, hair: 0x2b2118, hat: { type: 'fedora', color: 0x2b2f3a, band: 0x8f2433 }, detail: ['buttons', 'belt'] });
const g1 = makeToon(guardOpts(0x7a2f3e)), g2 = makeToon({ ...guardOpts(0x6a3550), mustache: true }); scene.add(g1.root, g2.root);
const porter1 = makeToon({ shirt: 0x8a6a4a, hair: 0x6b4a2a, detail: ['belt', 'collar'], trim: 0xd9c7a3 }), porter2 = makeToon({ shirt: 0x5f7a5a, hair: 0x23262d, mustache: true, detail: ['belt'] });
scene.add(porter1.root, porter2.root);
const voltaire = makeToon({ shirt: 0x7a4a8a, hair: 0xece8e0, detail: ['buttons', 'collar'], trim: 0xf4f1e8 }); scene.add(voltaire.root);
curls(voltaire.head, 0xece8e0, [[-0.27, 0.02, -0.08, 0.09], [0.27, 0.02, -0.08, 0.09], [-0.28, -0.12, -0.1, 0.08], [0.28, -0.12, -0.1, 0.08], [0, 0.0, -0.28, 0.1]]);
const dumas = makeToon({ shirt: 0x2f6b4f, skin: 0xc8946a, hair: 0x1b1410, mustache: true, detail: ['collar', 'tie', 'buttons'] }); scene.add(dumas.root);
curls(dumas.head, 0x1b1410, [[-0.16, 0.25, 0.02, 0.1], [0, 0.29, 0.0, 0.11], [0.16, 0.25, 0.02, 0.1], [-0.25, 0.12, -0.05, 0.08], [0.25, 0.12, -0.05, 0.08]]);
const servant = makeToon({ shirt: 0x23262d, hair: 0x6b4a2a, detail: ['apron', 'collar'], trim: 0xffffff }); scene.add(servant.root);
const royalGuard = makeToon(guardOpts(0x2a3f9a)); scene.add(royalGuard.root);
const ALL = [prisoner, king, twin, saintMars, g1, g2, porter1, porter2, voltaire, dumas, servant, royalGuard];

// utilería que acompaña a los personajes
function makePike() {
  const g = new THREE.Group(); scene.add(g);
  block(g, 0x6b4a2a, -0.018, 0.018, -0.9, 1.25, 0.018, -0.018, 0.01);
  const tip = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 8), flat(0xc9ced8)), 0.01); tip.position.y = 1.36; g.add(tip);
  block(g, 0xc9ced8, 0.018, 0.15, 1.0, 1.2, 0.01, -0.01, 0.01);
  return g;
}
const pikes = Array.from({ length: 6 }, makePike);
const hv = V(0, 0, 0), hv2 = V(0, 0, 0), tmp = V(0, 0, 0), tmp2 = V(0, 0, 0);
function holdPike(pk, toon, side = 1, sw = 0) { if (!toon) { pk.visible = false; return; } pk.visible = toon.root.visible; toon.hand(side, hv); pk.position.copy(hv); pk.rotation.z = sw; }
const keyring = new THREE.Group(); scene.add(keyring);
{ const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 6, 18), basic(0x3a3f4d)); keyring.add(ring);
  [-0.5, 0, 0.5].forEach((a, i) => { const kk = new THREE.Group(); kk.rotation.z = a; kk.position.y = -0.04; keyring.add(kk);
    block(kk, 0xc9a24a, -0.008, 0.008, -0.16, 0, 0.006, -0.006, 0.006); block(kk, 0xc9a24a, 0.008, 0.04, -0.16, -0.12 + i * 0.01, 0.006, -0.006, 0.006);
    const bow = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.007, 6, 12), flat(0xc9a24a)), 0.004); bow.position.y = -0.005; kk.add(bow); }); }
const lantern = new THREE.Group(); scene.add(lantern);
{ block(lantern, 0x23262d, -0.07, 0.07, -0.3, -0.26, 0.07, -0.07, 0.01); block(lantern, 0x23262d, -0.06, 0.06, -0.06, -0.02, 0.06, -0.06, 0.01);
  const gls = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), basic(0xffd98a)); gls.position.y = -0.16; lantern.add(gls); outlined(gls, 0.012);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12, PI), basic(0x23262d)); hd.position.y = -0.01; lantern.add(hd); }
const lanternFlame = flame(lantern, 0.4, { light: 7, glow: 3.2 }); lanternFlame.g.position.y = -0.22; lanternFlame.fo.visible = lanternFlame.fi.visible = false;

// =====================================================================================
// FORTALEZA (x = 0): torre con una ventana iluminada, muralla con almenas, portón con antorchas
// =====================================================================================
floor('cobble', { base: '#5e5a72', line: '#3c384e', rows: 7, cols: 5 }, AX, 30, 24, 1.3);
k.plane(scene, 0x1a1838, 60, 14, AX, 3, -16);
for (const [dx, r, col] of [[-6, 6, 0x22214a], [2, 7.5, 0x1c1b40], [9, 5.5, 0x24224c]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(col)); h.scale.y = 0.45; h.position.set(AX + dx, 0, -12); scene.add(h); }
moon(AX + 2.4, 8.6, -14, 0.9);
for (const [x, y, s] of [[-2.5, 9.5, 0.7], [3.6, 10.6, 0.5], [0.4, 11.5, 0.6], [-3.8, 7.6, 0.4], [4.8, 7.2, 0.45], [1.2, 6.8, 0.35]]) { const st = k.glyph('✦', '#fff6d0', 0.16 * s * 2); st.position.set(AX + x, y, -13.5); st.visible = true; st.material.depthTest = true; st.userData.tw = x * 3; }
function rampart(x0, x1, h, z) {
  wallRect(x0, x1, 0, h, z);
  block(scene, flat(0x56546f), x0, x1, h - 0.05, h + 0.05, z, z - 0.8, 0.015);
  for (let x = x0 + 0.15; x < x1 - 0.3; x += 0.7) block(scene, flat(0x67658a), x, x + 0.42, h, h + 0.42, z + 0.04, z - 0.22, 0.016);
}
rampart(AX - 10, AX + 10, 4.0, -3.5);
function roundTower(x, z, r, h, { gap = null, roof = 0x3a3558, flag = false } = {}) {
  const C = 2 * PI * r, S = 1.4;
  const seg = (y0, y1, th0 = 0, thl = 2 * PI) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 48, 1, true, th0, thl), new THREE.MeshLambertMaterial({ map: texW('bricks', STONE, C * thl / (2 * PI), y1 - y0, S, 0, y0), side: THREE.DoubleSide }));
    m.position.set(x, (y0 + y1) / 2, z); m.receiveShadow = m.castShadow = true; scene.add(m);
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.03, y1 - y0, 48, 1, true, th0, thl), new THREE.MeshBasicMaterial({ color: 0x1e1428, side: THREE.BackSide })); hull.position.copy(m.position); scene.add(hull);
  };
  if (gap) { seg(0, gap[0]); seg(gap[0], gap[1], gap[2], 2 * PI - 2 * gap[2]); seg(gap[1], h); } else seg(0, h);
  const ring = outlined(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.12, r + 0.1, 0.3, 48), flat(0x5c5a7a)), 0.02); ring.position.set(x, h + 0.1, z); scene.add(ring);
  for (let a = -PI; a < PI - 0.01; a += PI / 6) block(scene, flat(0x67658a), x + (r + 0.04) * Math.sin(a) - 0.12, x + (r + 0.04) * Math.sin(a) + 0.12, h + 0.25, h + 0.6, z + (r + 0.04) * Math.cos(a) + 0.12, z + (r + 0.04) * Math.cos(a) - 0.12, 0.014);
  if (roof !== null) { const cone = outlined(new THREE.Mesh(new THREE.ConeGeometry(r + 0.25, r * 1.6, 40), flat(roof)), 0.025); cone.position.set(x, h + 0.25 + r * 0.8, z); scene.add(cone); }
  // saeteras
  for (const y of [1.4, h - 1.0]) if (!gap || Math.abs(y - (gap[0] + gap[1]) / 2) > 0.8) k.plane(scene, 0x120c1c, 0.1, 0.45, x, y, z + r + 0.012);
  let fl = null;
  if (flag) { const py = h + 0.25 + r * 1.6; block(scene, 0x23262d, x - 0.02, x + 0.02, py - 0.2, py + 0.9, z + 0.02, z - 0.02, 0.01);
    fl = new THREE.Group(); fl.position.set(x + 0.02, py + 0.7, z); scene.add(fl);
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), flat(i % 2 ? 0x2a3f9a : 0x2f4aa8, { side: THREE.DoubleSide })); p.position.x = 0.05 + i * 0.1; fl.add(p); }
    fl.userData.parts = fl.children.slice(); }
  return fl;
}
const TWX = AX + 1.3, TWZ = -3.0, TWR = 1.25, WIN = [2.95, 3.9, 0.32], WIN_Y = 3.42, WIN_Z = TWZ + TWR;
const flag = roundTower(TWX, TWZ, TWR, 6.0, { gap: WIN, flag: true });
roundTower(AX - 5.2, -3.6, 0.9, 5.2);
k.plane(scene, 0x150e20, 2.2, 1.2, TWX, WIN_Y, TWZ - 0.4);                         // interior oscuro de la torre
const towerGlow = glowMesh(0xffb060, 1.6, 0.55); towerGlow.position.set(TWX - 0.25, WIN_Y - 0.1, TWZ + 0.5); scene.add(towerGlow);
const towerLight = new THREE.PointLight(0xffb468, 5, 4, 1.3); towerLight.position.set(TWX, WIN_Y, WIN_Z + 0.6); scene.add(towerLight);
block(scene, flat(0x5c5a7a), TWX - 0.42, TWX + 0.42, WIN[0] - 0.08, WIN[0], WIN_Z + 0.12, WIN_Z - 0.2, 0.012);    // alféizar
const winBars = new THREE.Group(); winBars.position.set(TWX, 0, WIN_Z + 0.06); scene.add(winBars);
for (const x of [-0.21, 0.21]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.98, 8), INK); b.position.set(x, WIN_Y, 0); winBars.add(b); }
{ const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.05), INK); b.position.set(0, WIN[1] - 0.08, 0); winBars.add(b); }
// portón
const GATEX = AX - 1.25;
picture(scene, 1.5, 2.3, GATEX, 1.15, -3.48, (g, W, H) => {
  g.fillStyle = '#4a4864'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2a1a14'; g.beginPath(); g.moveTo(W * 0.14, H); g.lineTo(W * 0.14, H * 0.4); g.arc(W / 2, H * 0.4, W * 0.36, PI, 0); g.lineTo(W * 0.86, H); g.fill();
  g.fillStyle = '#5a3a22'; for (let i = 0; i < 6; i++) { g.fillRect(W * (0.16 + i * 0.115), H * 0.12, W * 0.1, H * 0.88); }
  g.strokeStyle = '#1e1428'; g.lineWidth = 7; g.beginPath(); g.moveTo(W * 0.14, H); g.lineTo(W * 0.14, H * 0.4); g.arc(W / 2, H * 0.4, W * 0.36, PI, 0); g.lineTo(W * 0.86, H); g.stroke();
  g.lineWidth = 5; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(W * (0.14 + i * 0.144), H * 0.06); g.lineTo(W * (0.14 + i * 0.144), H); g.stroke(); }
  for (let j = 0; j < 6; j++) { g.beginPath(); g.moveTo(W * 0.14, H * (0.45 + j * 0.1)); g.lineTo(W * 0.86, H * (0.45 + j * 0.1)); g.stroke(); }
  g.fillStyle = '#8a8fa0'; for (let j = 0; j < 6; j++) for (let i = 1; i < 5; i++) { g.beginPath(); g.arc(W * (0.14 + i * 0.144), H * (0.45 + j * 0.1), 6, 0, 7); g.fill(); }
  g.strokeStyle = '#2e2c44'; g.lineWidth = 8; for (let a = 0; a <= 8; a++) { const an = PI + a * PI / 8; g.beginPath(); g.moveTo(W / 2 + Math.cos(an) * W * 0.36, H * 0.4 + Math.sin(an) * W * 0.36); g.lineTo(W / 2 + Math.cos(an) * W * 0.47, H * 0.4 + Math.sin(an) * W * 0.47); g.stroke(); }
});
torch(GATEX - 0.95, 2.15, -3.35); torch(GATEX + 0.95, 2.15, -3.35, { light: 6 });
fogBank(AX, 0.45, 0.8, 18, 1.4, 0.42, 0.22, 2); fogBank(AX, 1.0, -2.2, 18, 2.2, 0.3, -0.15, 5); fogBank(AX, 2.4, -7, 22, 3.5, 0.35, 0.1, 9);
bat(TWX, 7.6, -2.5, 0, 2.4, 0.5); bat(TWX - 0.5, 8.4, -4, 2.2, 2.0, 0.6, 0.8); bat(TWX + 0.6, 6.9, -2, 4.1, 2.8, 0.4, 0.9);
// gente de fondo: guardia de ronda abajo y otro arriba de la muralla
const wA1 = k.walker({ toon: guardOpts(0x7a2f3e), cx: AX, z: -0.9, speed: 0.62, off: 3, dir: 1, pose: (t, px) => ({ handR: V(px + 0.05, 1.0, -0.9 - 0.25), wR: 1 }) });
const wA2 = k.walker({ toon: guardOpts(0x6a3550), cx: AX, z: -3.95, speed: 0.5, off: 9, dir: -1, pose: (t, px) => ({ y: 4.05, handR: V(px - 0.05, 5.0, -3.95 - 0.25), wR: 1 }) });

// =====================================================================================
// PALACIO (x = 40): Luis XIV firma la orden; después, las teorías
// =====================================================================================
floor('tiles', { base: '#c9c2b0', line: '#3a3450', n: 4, seed: 4 }, BX, 30, 24, 1.0);
{ const t = canvasTex(256, 256, (g, W) => { g.fillStyle = '#5a1c2e'; g.fillRect(0, 0, W, W); g.strokeStyle = '#7a2a3e'; g.lineWidth = 6;
    for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i * 64 + 256, 0); g.lineTo(i * 64, 256); g.stroke(); }
    g.fillStyle = '#d9a441'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const x = i * 64 + 32, y = j * 64; g.beginPath(); g.ellipse(x, y + 10, 7, 14, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x - 10, y + 16, 5, 9, -0.7, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 10, y + 16, 5, 9, 0.7, 0, 7); g.fill(); g.fillRect(x - 11, y + 22, 22, 4); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 6); surface(scene, t, 40, 12, BX, 6, -2.5); }
surface(scene, texW('planks', { base: '#5a3420', line: '#3a2010', n: 8 }, 40, 1, 1), 40, 1.0, BX, 0.5, -2.49);
k.plane(scene, 0xd9a441, 40, 0.06, BX, 1.02, -2.48);
const curtains = [];
for (const x of [-2.1, 1.6, 3.4]) {
  const cu = picture(scene, 0.9, 3.4, BX + x, 1.75, -2.4, (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, 0); for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, i % 2 ? '#8f1f32' : '#b8303f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d9a441'; g.fillRect(0, 0, W, H * 0.06); for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(i * W / 7, H * 0.07, 10, 0, PI); g.fill(); }
    g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6); });
  curtains.push(cu);
}
picture(scene, 1.0, 1.4, BX + 2.5, 2.3, -2.45, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0f1436'); gr.addColorStop(1, '#3a3266'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f6efcf'; g.beginPath(); g.arc(W * 0.65, H * 0.28, 22, 0, 7); g.fill(); g.fillStyle = '#fff6d0'; for (let i = 0; i < 9; i++) g.fillRect((i * 53) % W, (i * 37) % (H * 0.6), 4, 4);
  g.strokeStyle = '#d9a441'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); });
painting(scene, 0.75, 0.95, BX - 1.0, 2.5, -2.45, 2); painting(scene, 0.6, 0.5, BX + 0.75, 2.8, -2.45, 4);
// trono
block(scene, 0xd9a441, BX - 0.45, BX + 0.45, 0, 1.9, -1.75, -2.05); block(scene, 0xa82838, BX - 0.33, BX + 0.33, 0.55, 1.75, -1.7, -1.76, 0.01);
block(scene, 0xd9a441, BX - 0.5, BX + 0.5, 0, 0.55, -1.2, -1.8); block(scene, 0xa82838, BX - 0.42, BX + 0.42, 0.55, 0.65, -1.25, -1.75, 0.012);
{ const cr = k.glyph('♛', '#ffd23a', 0.36); cr.visible = true; cr.material.depthTest = true; cr.position.set(BX, 2.1, -1.74); }
// escritorio de la firma
const desk = new THREE.Group(); scene.add(desk);
block(desk, 0x6a3a1e, BX - 0.35, BX + 1.15, 0, 0.76, 0.45, -0.02); block(desk, 0xd9a441, BX - 0.4, BX + 1.2, 0.76, 0.82, 0.5, -0.07);
const order = k.sign('DE PAR LE ROY', 0.46, 0.32, { bg: '#f3e6c4' }); scene.add(order);
const orderSeal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 18), basic(0xc8283a)); orderSeal.position.set(0.12, -0.08, 0.004); order.add(orderSeal);
for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.3 - i * 0.06, 0.012), basic(0x8a7a60)); l.position.set(-0.04, -0.02 - i * 0.035, 0.003); order.add(l); }
const quill = new THREE.Group(); scene.add(quill);
{ const f = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), flat(0xf4f1e8)), 0.01); f.scale.set(0.3, 1.5, 0.15); f.position.y = 0.13; quill.add(f); block(quill, 0x23262d, -0.006, 0.006, -0.02, 0.06, 0.006, -0.006, 0.004); quill.rotation.z = -0.35; }
const deskCandle = candle(BX + 1.0, 0.82, 0.2, { light: 6 });
{ const ink = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.07, 12), flat(0x23262d)), 0.01); ink.position.set(BX + 0.8, 0.86, 0.28); desk.add(ink); }
candle(BX - 1.65, 1.35, -1.5); candle(BX + 1.65, 1.35, -1.5);
for (const x of [-1.65, 1.65]) { block(scene, 0xd9a441, BX + x - 0.03, BX + x + 0.03, 0, 1.35, -1.47, -1.53, 0.01); block(scene, 0xd9a441, BX + x - 0.12, BX + x + 0.12, 0, 0.05, -1.38, -1.62, 0.01); }
// cortina del sirviente (teoría 2)
const peekCurtain = picture(scene, 0.85, 2.4, BX + 2.95, 1.2, -0.9, (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, 0); for (let i = 0; i <= 5; i++) gr.addColorStop(i / 5, i % 2 ? '#8f1f32' : '#b8303f'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.strokeStyle = '#1e1428'; g.lineWidth = 7; g.strokeRect(3, 3, W - 6, H - 6); g.fillStyle = '#d9a441'; g.fillRect(0, H * 0.45, W, 14); });
block(scene, 0xd9a441, BX + 2.4, BX + 3.5, 2.4, 2.46, -0.85, -0.95, 0.01);

// =====================================================================================
// OFICINA + CELDA (x = 80)
// =====================================================================================
floor('tiles', { base: '#5f5a72', line: '#35304a', n: 3, seed: 6 }, CX, 30, 24, 1.1);
wallRect(CX - 12, CX + 3.6, 0, 6, -1.8, STONE_IN, 1.2);
k.plane(scene, 0x1e1428, 15.6, 0.06, CX - 4.2, 0.03, -1.79);
// oficina
const sDesk = new THREE.Group(); scene.add(sDesk);
block(sDesk, 0x5a3420, CX - 2.1, CX - 0.75, 0, 0.74, 0.45, -0.05); block(sDesk, 0x7a4b2a, CX - 2.15, CX - 0.7, 0.74, 0.8, 0.5, -0.1);
const ledCv = document.createElement('canvas'); ledCv.width = 512; ledCv.height = 340; const ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace; ledTex.anisotropy = 8;
let ledK = -1;
function drawLedger(kk) {
  if (Math.abs(kk - ledK) < 0.003) return; ledK = kk; const g = ledCv.getContext('2d'), W = 512, H = 340;
  g.fillStyle = '#3a1e14'; g.fillRect(0, 0, W, H); g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, 6);
  g.fillStyle = '#efe2c0'; g.fillRect(16, 14, 232, H - 28); g.fillRect(264, 14, 232, H - 28);
  g.fillStyle = '#d8c79f'; g.fillRect(238, 14, 10, H - 28); g.fillRect(264, 14, 10, H - 28);
  g.strokeStyle = '#c9b48a'; g.lineWidth = 2; for (let y = 150; y < H - 24; y += 30) { g.beginPath(); g.moveTo(30, y); g.lineTo(232, y); g.moveTo(280, y); g.lineTo(484, y); g.stroke(); }
  g.fillStyle = '#5a3a22'; g.font = '800 30px Montserrat'; g.textAlign = 'center'; g.fillText('REGISTRE', 130, 60); g.fillText('1669', 130, 104);
  g.font = '600 26px Montserrat'; g.fillText('Prisonnier :', 380, 60);
  const name = 'Eustache Dauger', n = Math.floor(kk * name.length + 0.001);
  g.font = 'italic 700 46px Georgia, "Times New Roman", serif'; g.fillStyle = '#1e1428'; g.textAlign = 'left';
  const full = g.measureText(name).width, x0 = 380 - full / 2; g.fillText(name.slice(0, n), x0, 120);
  ledgerTip.x = x0 + g.measureText(name.slice(0, n)).width;
  g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  ledTex.needsUpdate = true;
}
const ledgerTip = { x: 0 };
const ledger = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.345), new THREE.MeshBasicMaterial({ map: ledTex })); ledger.position.set(CX - 1.45, 0.83, 0.2); ledger.rotation.x = -1.0; scene.add(ledger);
drawLedger(0);
const sQuill = quill.clone(); scene.add(sQuill);
const officeCandle = candle(CX - 0.95, 0.8, 0.05, { light: 6 });
{ const ink = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.07, 12), flat(0x23262d)), 0.01); ink.position.set(CX - 1.95, 0.84, 0.25); scene.add(ink); }
const order2 = k.sign('ORDRE · LOUVOIS', 0.36, 0.26, { bg: '#f3e6c4' }); scene.add(order2);
for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.24 - i * 0.05, 0.01), basic(0x8a7a60)); l.position.set(-0.02, -0.06 - i * 0.03, 0.003); order2.add(l); }
picture(scene, 1.1, 0.7, CX - 1.4, 2.35, -1.77, (g, W, H) => { g.fillStyle = '#5a3420'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2010'; g.fillRect(10, H * 0.48, W - 20, 10);
  const r = rng(4); for (let s = 0; s < 2; s++) for (let i = 0; i < 11; i++) { g.fillStyle = ['#8f2433', '#3f6ea8', '#c9a24a', '#4f8f6b', '#e9dcc0'][Math.floor(r() * 5)]; const bh = 40 + r() * 20; g.fillRect(16 + i * 22, s * H * 0.5 + H * 0.46 - bh, 18, bh); }
  g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8); });
picture(scene, 0.7, 0.5, CX - 0.4, 2.0, -1.77, (g, W, H) => { g.fillStyle = '#4a3222'; g.fillRect(0, 0, W, H); g.fillStyle = '#c9a24a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(28 + i * 48, 40, 9, 0, 7); g.fill(); g.fillRect(25 + i * 48, 40, 6, 60 + (i % 2) * 14); g.fillRect(31 + i * 48, 80 + (i % 2) * 14, 12, 6); } g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8); });
torch(CX - 2.6, 2.1, -1.68, { light: 4 });
// celda: rejas de costado (corte de maqueta), cama de paja, ventanita con luna
const CELL = CX + 1.55;
for (let z = -1.75; z <= 0.85; z += 0.29) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), INK); b.position.set(CX + 0.45, 1.3, z); scene.add(b); }
for (const y of [0.15, 2.55]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 2.7), INK); b.position.set(CX + 0.45, y, -0.45); scene.add(b); }
block(scene, 0xc9a24a, CX + 0.6, CX + 1.75, 0, 0.28, -0.85, -1.7); block(scene, 0x8a6a4a, CX + 0.65, CX + 1.45, 0.28, 0.34, -0.9, -1.65, 0.012);
{ const st = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.26, 14), flat(0x6a5a48)), 0.014); st.position.set(CX + 3.15, 0.13, -0.9); scene.add(st); }
{ const stool = new THREE.Group(); stool.position.set(CX + 2.35, 0, 0.15); scene.add(stool); block(stool, 0x7a4b2a, -0.16, 0.16, 0.42, 0.48, 0.16, -0.16, 0.012); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) block(stool, 0x5a3420, a * 0.12 - 0.02, a * 0.12 + 0.02, 0, 0.42, b * 0.12 + 0.02, b * 0.12 - 0.02, 0.008); }
const cellCandle = candle(CX + 2.35, 0.48, 0.15, { light: 7 });
picture(scene, 0.62, 0.52, CELL + 0.25, 2.55, -1.77, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#141a44'); gr.addColorStop(1, '#3a3270'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f6efcf'; g.beginPath(); g.arc(W * 0.7, H * 0.35, 20, 0, 7); g.fill(); g.fillStyle = '#1e1428'; for (let i = 1; i < 4; i++) g.fillRect(i * W / 4 - 6, 0, 12, H); g.lineWidth = 18; g.strokeStyle = '#3e3a52'; g.strokeRect(0, 0, W, H); });
{ const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.4), new THREE.MeshBasicMaterial({ color: 0xc8d4ff, transparent: true, opacity: 0.13, depthWrite: false })); ray.position.set(CELL + 0.7, 1.3, -1.2); ray.rotation.z = 0.5; scene.add(ray); }
for (const x of [CX + 2.25]) { for (let i = 0; i < 6; i++) { const l = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), flat(0x5d6474)), 0.005); l.position.set(x, 1.9 - i * 0.065, -1.76); l.rotation.y = i % 2 ? PI / 2 : 0; scene.add(l); } }
const motes = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); m.userData = { off: i * 0.73 }; scene.add(m); return m; });
const rat = new THREE.Group(); scene.add(rat);
{ const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), flat(0x8c8f99)), 0.012); b.scale.set(1.6, 0.9, 0.9); b.position.y = 0.08; rat.add(b);
  const ear = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), flat(0xd9a0a8)), 0.007); ear.position.set(-0.09, 0.15, 0.03); rat.add(ear);
  const e = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), INK); e.position.set(-0.11, 0.1, 0.075); rat.add(e);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.015), INK); tail.position.set(0.22, 0.07, 0); rat.add(tail); }
// braserito y pared raspada (escena de después de la muerte)
const brazier = new THREE.Group(); brazier.position.set(QX, 0, 0.15); scene.add(brazier);
{ const bowl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.2, 16), flat(0x3a3f4d)), 0.016); bowl.position.y = 0.62; brazier.add(bowl);
  for (const a of [0, 2.1, 4.2]) block(brazier, 0x23262d, Math.sin(a) * 0.14 - 0.02, Math.sin(a) * 0.14 + 0.02, 0, 0.55, Math.cos(a) * 0.14 + 0.02, Math.cos(a) * 0.14 - 0.02, 0.008); }
const fire = [0, 1, 2].map(i => { const f = flame(brazier, 1.4 - i * 0.3, { light: i ? 0 : 5, glow: 1.2 }); f.g.position.set((i - 1) * 0.11, 0.7, 0.02 * i); return f; });
const embers = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), basic(0xffb040)); m.userData.off = i / 8; scene.add(m); return m; });
const bundle = new THREE.Group(); scene.add(bundle);
{ const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), flat(0xb5a27a)), 0.014); b.scale.set(1.3, 0.8, 1); bundle.add(b); const kn = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), flat(0xb5a27a)), 0.01); kn.position.y = 0.11; bundle.add(kn); }
const PATCH = V(QX + 1.25, 1.35, -1.785);
const patch = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), new THREE.MeshBasicMaterial({ color: 0xe9e4f4, transparent: true, opacity: 0.85 })); patch.position.copy(PATCH); scene.add(patch);
const scraper = new THREE.Group(); scene.add(scraper);
block(scraper, 0x6b4a2a, -0.015, 0.015, -0.25, 0.05, 0.015, -0.015, 0.008); block(scraper, 0xc9ced8, -0.07, 0.07, 0.05, 0.1, 0.01, -0.01, 0.008);
const scrapDust = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), new THREE.MeshBasicMaterial({ color: 0xd8d4e8, transparent: true })); m.userData.off = i / 8; scene.add(m); return m; });

// =====================================================================================
// PASILLO DE PUERTAS (x = 120): tres puertas, una detrás de otra
// =====================================================================================
const DOOR_Z = [-0.4, -1.8, -3.2], DOOR_W = 0.92, DOOR_H = 1.98, HINGE = DX - DOOR_W / 2;
const doors = DOOR_Z.map((z, i) => {
  wallRect(DX - 4, DX - DOOR_W / 2 - 0.05, 0, 6, z, STONE_IN, 1.2); wallRect(DX + DOOR_W / 2 + 0.05, DX + 4, 0, 6, z, STONE_IN, 1.2); wallRect(DX - DOOR_W / 2 - 0.05, DX + DOOR_W / 2 + 0.05, DOOR_H + 0.04, 6, z, STONE_IN, 1.2);
  const dim = k.plane(scene, new THREE.MeshBasicMaterial({ color: 0x0a0614, transparent: true, opacity: 0.12 + 0.12 * i, depthWrite: false }), 8, 6, DX, 3, z + 0.02);
  for (const [x0, x1, y0, y1] of [[-DOOR_W / 2 - 0.12, -DOOR_W / 2 - 0.02, 0, DOOR_H + 0.12], [DOOR_W / 2 + 0.02, DOOR_W / 2 + 0.12, 0, DOOR_H + 0.12], [-DOOR_W / 2 - 0.12, DOOR_W / 2 + 0.12, DOOR_H + 0.02, DOOR_H + 0.14]]) block(scene, flat(0x56546f), DX + x0, DX + x1, y0, y1, z + 0.08, z - 0.08, 0.014);
  const pivot = new THREE.Group(); pivot.position.set(HINGE, 0, z - 0.02); scene.add(pivot);
  block(pivot, 0x6a3f22, 0.01, DOOR_W - 0.01, 0.01, DOOR_H, 0.04, -0.04, 0.016);
  for (const y of [0.35, 1.0, 1.65]) block(pivot, 0x3a3f4d, 0.02, DOOR_W - 0.02, y - 0.05, y + 0.05, 0.05, -0.05, 0.008);
  for (let x = 0.15; x < DOOR_W - 0.1; x += 0.2) for (const y of [0.35, 1.0, 1.65]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), basic(0x9aa1ad)); s.position.set(x, y, 0.06); pivot.add(s); }
  block(pivot, 0x23262d, DOOR_W - 0.18, DOOR_W - 0.08, 0.9, 1.08, 0.07, 0.04, 0.008);
  return pivot;
});
wallRect(DX - 4, DX + 4, 0, 6, -4.7, STONE_IN, 1.2);
const dCandle = candle(DX + 0.55, 0.55, -4.3, { light: 5 });
block(scene, 0x7a4b2a, DX + 0.4, DX + 0.7, 0, 0.55, -4.15, -4.45, 0.012);
torch(DX + 1.25, 2.05, -0.3, { light: 6 }); torch(DX - 1.2, 2.05, -1.7);

// =====================================================================================
// CAMINO DE NOCHE (x = 160): la silla tapada viaja entre prisiones
// =====================================================================================
floor('cobble', { base: '#4f4a5e', line: '#332f42', rows: 6, cols: 4 }, EX, 34, 24, 1.4);
{ const road = surface(scene, texW('cobble', { base: '#7a6a5a', line: '#4f4236', rows: 5, cols: 6, seed: 21 }, 34, 1.6, 1.0), 34, 1.6, EX, 0.004, 0.1, true); road.material.color.set(0xbbbbbb); }
k.plane(scene, 0x1a1838, 70, 14, EX, 3, -18);
moon(EX + 2.5, 8.4, -16, 1.0);
function mountains(z, col, cap, list, seed) {
  for (const [dx, w, h] of list) {
    k.poly(scene, [[-w, 0], [-w * 0.15, h], [0, h * 1.04], [w * 0.2, h * 0.95], [w, 0]].map(([x, y]) => [EX + dx + x, y - 0.2]), col, 0.05).position.z = z;
    k.poly(scene, [[-w * 0.3, h * 0.7], [-w * 0.15, h], [0, h * 1.04], [w * 0.2, h * 0.95], [w * 0.3, h * 0.68], [w * 0.1, h * 0.75], [-w * 0.05, h * 0.66], [-w * 0.18, h * 0.76]].map(([x, y]) => [EX + dx + x, y - 0.2]), cap, 0.04).position.z = z + 0.01;
  }
}
mountains(-13, 0x2b2c5e, 0xc8cfee, [[-6, 5, 6.5], [0, 6, 8], [7, 5.5, 6.8], [13, 5, 6]], 1);
mountains(-9, 0x36356e, 0xd6dcf4, [[-3.5, 3.5, 4.2], [3.5, 4, 4.8], [10, 3.6, 4.0]], 2);
for (const [x, z, h] of [[-5, -3.5, 2.6], [-2.6, -4.2, 3.0], [-0.8, -3.0, 2.3], [1.6, -4.4, 2.8], [3.4, -3.2, 2.5], [5.6, -4.0, 3.0], [7.4, -3.4, 2.4], [-4, -2.2, 2.0], [6.3, -2.4, 2.1]]) k.tree(EX + x, z, { h, pine: true, leaf: 0x214a48 });
for (const [x, z, s] of [[-3.3, -1.0, 0.35], [2.2, -1.2, 0.28], [4.6, -0.9, 0.3]]) { const r = outlined(new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), flat(0x5a5874)), 0.016); r.position.set(EX + x, s * 0.6, z); r.scale.y = 0.7; scene.add(r); }
{ const sp = new THREE.Group(); sp.position.set(EX + 1.05, 0, -1.15); scene.add(sp); block(sp, 0x6b4a2a, -0.04, 0.04, 0, 1.7, 0.04, -0.04, 0.012);
  const s1 = k.sign('EXILLES →', 0.72, 0.22, { bg: '#e9d9b0' }); s1.position.set(0.2, 1.55, 0.05); s1.rotation.z = -0.05; sp.add(s1);
  const s2 = k.sign('← PIGNEROL', 0.72, 0.22, { bg: '#e9d9b0' }); s2.position.set(-0.2, 1.25, 0.05); s2.rotation.z = 0.05; sp.add(s2); }
fogBank(EX, 0.5, 1.2, 26, 1.5, 0.4, 0.3, 3); fogBank(EX, 1.3, -2.6, 26, 2.4, 0.32, -0.2, 7); fogBank(EX, 3.0, -8, 30, 3.5, 0.3, 0.12, 11);
bat(EX - 1, 4.6, -3, 1, 3.5, 0.6, 0.9); bat(EX + 3, 5.2, -4, 3, 3.0, 0.5, 0.8); bat(EX + 6, 4.4, -2.5, 5, 3.2, 0.7);
// la silla
const chair = new THREE.Group(); chair.position.x = EX - 3; scene.add(chair);
{ const OIL = 0x4d5a44;
  block(chair, OIL, -0.42, 0.42, 0.45, 1.45, 0.36, -0.36, 0.022);
  const roof = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.76, 22, 1, false, -PI / 2, PI), flat(0x3d4836)), 0.022); roof.rotation.x = -PI / 2; roof.position.y = 1.45; roof.scale.set(1, 1, 0.55);
  chair.add(roof);
  for (const x of [-0.3, -0.12, 0.25, 0.36]) k.stroke(chair, [[x, 0.5], [x + 0.03, 1.4]], 0.015, false, 0.37);
  block(chair, 0x23262d, -0.45, 0.45, 0.42, 0.5, 0.39, -0.39, 0.012);
  for (const z of [0.42, -0.42]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.7, 8), flat(0x6b4a2a)); p.rotation.z = PI / 2; p.position.set(0, 0.92, z); outlined(p, 0.01); chair.add(p); }
  k.plane(chair, 0x0c0814, 0.34, 0.3, 0.06, 1.05, 0.364);
  k.stroke(chair, [[-0.11, 0.9], [0.23, 0.9], [0.23, 1.2], [-0.11, 1.2]], 0.03, true, 0.366); }
const chairEyes = new THREE.Group(); chairEyes.position.set(0.06, 1.06, 0.37); chair.add(chairEyes);
const chairPupils = [-1, 1].map(s => { const e = new THREE.Group(); e.position.x = s * 0.055; chairEyes.add(e); const w = new THREE.Mesh(new THREE.CircleGeometry(1, 20), basic(0xffffff)); w.scale.set(0.034, 0.026, 1); e.add(w); const p = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), INK); p.position.z = 0.002; e.add(p); return p; });
const chairCurtain = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), flat(0x7a3040, { side: THREE.DoubleSide })); chairCurtain.position.set(0.06, 1.05, 0.372); chair.add(chairCurtain);
for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.3), INK); f.position.set(-0.08 + i * 0.08, 0, 0.002); chairCurtain.add(f); }
const STOP = c[6] - 0.3, chairX = t => lerp(EX - 3.1, EX + 2.4, lin(t, c[5] - 0.2, STOP)), PX = EX + 2.4 + 0.15, PZ = 0.95;

// =====================================================================================
// ESTUDIO (x = 200): Voltaire y Dumas
// =====================================================================================
floor('planks', { base: '#7a4b2a', line: '#4a2a14', n: 7, seed: 2 }, FX, 30, 24, 1.4);
surface(scene, texW('stripes', { a: '#2e4a3e', b: '#284236', dot: '#3f6050', n: 6 }, 30, 12, 1.2), 30, 12, FX, 6, -2.2);
k.plane(scene, 0x1e1428, 30, 0.06, FX, 1.0, -2.19);
picture(scene, 1.4, 1.8, FX - 1.6, 1.6, -2.15, (g, W, H) => { g.fillStyle = '#4a2a14'; g.fillRect(0, 0, W, H); const r = rng(7);
  for (let s = 0; s < 4; s++) { g.fillStyle = '#2a1608'; g.fillRect(8, (s + 1) * H / 4 - 10, W - 16, 10); for (let x = 14; x < W - 20;) { const bw = 10 + r() * 12, bh = H / 4 - 24 - r() * 16; g.fillStyle = ['#8f2433', '#3f6ea8', '#c9a24a', '#4f8f6b', '#e9dcc0', '#6a4a8a'][Math.floor(r() * 6)]; g.fillRect(x, (s + 1) * H / 4 - 10 - bh, bw, bh); x += bw + 2; } }
  g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10); });
picture(scene, 0.9, 1.2, FX + 1.6, 2.1, -2.15, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0f1436'); gr.addColorStop(1, '#3a3266'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#f6efcf'; g.beginPath(); g.arc(W * 0.4, H * 0.3, 20, 0, 7); g.fill();
  g.strokeStyle = '#e9dcc0'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); });
painting(scene, 0.6, 0.5, FX, 2.6, -2.15, 1);
const VX = FX - 0.72, DUX = FX + 0.72;
for (const x of [VX, DUX]) { block(scene, 0x5a3420, x - 0.42, x + 0.42, 0, 0.72, 0.45, 0.0); block(scene, 0x7a4b2a, x - 0.46, x + 0.46, 0.72, 0.78, 0.5, -0.05); }
candle(VX + 0.36, 0.78, 0.25, { light: 4 }); candle(DUX - 0.36, 0.78, 0.25);
for (const x of [VX - 0.3, DUX + 0.3]) { const st = new THREE.Group(); st.position.set(x, 0.78, 0.25); scene.add(st); [0, 1, 2].forEach(i => block(st, [0x8f2433, 0x3f6ea8, 0x4f8f6b][i], -0.1, 0.1, i * 0.05, i * 0.05 + 0.045, 0.07, -0.07, 0.008)); }
function bookCover(title, year) {
  const g = new THREE.Group(); scene.add(g);
  g.add(picture(g, 0.34, 0.42, 0, 0, 0, (cx, W, H) => { cx.fillStyle = '#6a1c2a'; cx.fillRect(0, 0, W, H); cx.strokeStyle = '#d9a441'; cx.lineWidth = 8; cx.strokeRect(12, 12, W - 24, H - 24);
    cx.fillStyle = '#9aa2b2'; cx.beginPath(); cx.ellipse(W / 2, H * 0.42, W * 0.22, H * 0.2, 0, 0, 7); cx.fill(); cx.fillStyle = '#1e1428'; cx.beginPath(); cx.ellipse(W * 0.41, H * 0.39, 12, 8, 0, 0, 7); cx.ellipse(W * 0.59, H * 0.39, 12, 8, 0, 0, 7); cx.fill();
    for (let i = 0; i < 3; i++) cx.fillRect(W * 0.4, H * (0.48 + i * 0.03), W * 0.2, 4);
    cx.fillStyle = '#ffd23a'; cx.font = '800 26px Montserrat'; cx.textAlign = 'center'; cx.fillText(title, W / 2, H * 0.78); cx.font = '600 22px Montserrat'; cx.fillText(year, W / 2, H * 0.88); }, 256));
  return g;
}
const bookV = bookCover('HIERRO', '1771'), bookD = bookCover('HIERRO', '1850');
const quillV = quill.clone(), quillD = quill.clone(); scene.add(quillV, quillD);

// =====================================================================================
// BASTILLA + CEMENTERIO (x = 240)
// =====================================================================================
floor('cobble', { base: '#55506a', line: '#363148', rows: 7, cols: 5, seed: 31 }, GX + 4, 36, 24, 1.3);
k.plane(scene, 0x1a1838, 70, 14, GX, 3, -18);
moon(GX - 2.6, 9.6, -16, 1.0);
for (const [x0, x1, seed, wall] of [[-7.2, -4.9, 1, '#4a4a6e'], [-4.9, -3.2, 2, '#55506e'], [3.2, 5.0, 3, '#4e4a6a'], [5.0, 7.4, 4, '#47466a']]) {
  picture(scene, x1 - x0, 3.6, GX + (x0 + x1) / 2, 1.8, -5.6, (g, W, H) => { const r = rng(seed); g.fillStyle = wall; g.fillRect(0, 0, W, H); g.fillStyle = '#2a2f48'; g.beginPath(); g.moveTo(0, H * 0.16); g.lineTo(W * 0.08, 0); g.lineTo(W * 0.92, 0); g.lineTo(W, H * 0.16); g.fill();
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = r() < 0.35 ? '#ffd98a' : '#24243e'; g.fillRect(W * (0.1 + i * 0.22), H * (0.24 + j * 0.18), W * 0.12, H * 0.1); g.strokeStyle = '#1e1428'; g.lineWidth = 4; g.strokeRect(W * (0.1 + i * 0.22), H * (0.24 + j * 0.18), W * 0.12, H * 0.1); }
    g.lineWidth = 8; g.strokeRect(0, 0, W, H); }, 256);
}
const BTX = [GX - 2.65, GX - 1.2, GX + 1.2, GX + 2.65], BZ = -4.5;
wallRect(GX - 3.2, GX + 3.2, 0, 5.0, -4.6);
block(scene, flat(0x56546f), GX - 3.2, GX + 3.2, 4.95, 5.05, -4.6, -5.4, 0.015);
for (let x = GX - 3.1; x < GX + 3.0; x += 0.6) block(scene, flat(0x67658a), x, x + 0.36, 5.0, 5.38, -4.56, -4.8, 0.016);
for (const x of BTX) roundTower(x, BZ, 0.66, 6.0, { roof: null });
const bWin = picture(scene, 0.36, 0.5, BTX[1], 4.25, BZ + 0.67, (g, W, H) => { g.fillStyle = '#ffd98a'; g.fillRect(0, 0, W, H); g.fillStyle = '#2a2036'; g.beginPath(); g.arc(W / 2, H * 0.62, W * 0.3, 0, 7); g.fill(); g.fillRect(W * 0.12, H * 0.82, W * 0.76, H * 0.2);
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(W * 0.4, H * 0.6, 7, 5, 0, 0, 7); g.ellipse(W * 0.6, H * 0.6, 7, 5, 0, 0, 7); g.fill(); g.fillStyle = '#1e1428'; g.fillRect(W * 0.48, 0, W * 0.04, H); g.lineWidth = 10; g.strokeStyle = '#1e1428'; g.strokeRect(0, 0, W, H); });
const bWinDark = k.plane(scene, new THREE.MeshBasicMaterial({ color: 0x120c1c, transparent: true, opacity: 0 }), 0.37, 0.51, BTX[1], 4.25, BZ + 0.675);
const bGlow = glowMesh(0xffb060, 1.3, 0.6); bGlow.position.set(BTX[1], 4.25, BZ + 0.8); scene.add(bGlow);
picture(scene, 1.0, 1.7, GX, 0.85, -4.58, (g, W, H) => { g.fillStyle = '#2a1a14'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.35); g.arc(W / 2, H * 0.35, W / 2, PI, 0); g.lineTo(W, H); g.fill(); g.fillStyle = '#5a3a22'; for (let i = 0; i < 5; i++) g.fillRect(W * (0.06 + i * 0.19), H * 0.15, W * 0.15, H * 0.85); g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.35); g.arc(W / 2, H * 0.35, W / 2, PI, 0); g.lineTo(W, H); g.stroke(); });
{ const water = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.7), new THREE.MeshLambertMaterial({ color: 0x1c2450 })); water.rotation.x = -PI / 2; water.position.set(GX, 0.02, -3.05); water.receiveShadow = true; scene.add(water); }
const glints = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.035), new THREE.MeshBasicMaterial({ color: 0xdfe4ff, transparent: true, opacity: 0.7 })); m.rotation.x = -PI / 2; m.position.set(GX - 2.4 + i * 0.3, 0.03, -2.4 - (i % 3) * 0.3); m.userData.x0 = m.position.x; scene.add(m); return m; });
surface(scene, texW('planks', { base: '#6a4a2a', line: '#3a2414', n: 5 }, 1.0, 2.0, 1), 1.0, 2.0, GX, 0.06, -3.2, true);
torch(GX, 2.25, -4.45, { light: 7 });
fogBank(GX, 0.5, 0.5, 22, 1.5, 0.4, 0.25, 4); fogBank(GX, 1.4, -2.0, 22, 2.4, 0.3, -0.17, 8); fogBank(GX, 3, -7.5, 30, 3.5, 0.3, 0.1, 12);
bat(GX, 7.0, -3.6, 0.5, 3, 0.5); bat(GX - 1, 7.8, -4.4, 2.5, 2.4, 0.6, 0.8); bat(GX + 1.5, 6.4, -3.2, 4.4, 2.6, 0.5, 0.9); bat(GX + 9, 4.0, -2.5, 1.7, 2.2, 0.5, 0.8);
const wG = k.walker({ toon: guardOpts(0x7a2f3e), cx: GX, z: -5.0, speed: 0.55, off: 4, dir: 1, span: 9, pose: (t, px) => ({ y: 5.05, handR: V(px + 0.05, 6.0, -5.25), wR: 1 }) });
// cementerio
const CMX = GX + 9;
for (let x = CMX - 3.2; x <= CMX + 3.2; x += 0.22) k.plane(scene, 0x15101c, 0.03, 1.0, x, 0.5, -2.2);
k.plane(scene, 0x15101c, 6.6, 0.04, CMX, 0.95, -2.19); k.plane(scene, 0x15101c, 6.6, 0.04, CMX, 0.25, -2.19);
for (let x = CMX - 3.2; x <= CMX + 3.2; x += 0.22) { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), basic(0x15101c)); tip.position.set(x, 1.04, -2.2); scene.add(tip); }
function stone(x, z, w, h, text = '', seed = 1) {
  return picture(scene, w, h, x, h / 2, z, (g, W, H) => { g.fillStyle = '#8f8faa'; g.beginPath(); g.moveTo(8, H); g.lineTo(8, W / 2); g.arc(W / 2, W / 2, W / 2 - 8, PI, 0); g.lineTo(W - 8, H); g.fill();
    g.fillStyle = '#76769a'; const r = rng(seed); for (let i = 0; i < 10; i++) g.fillRect(16 + r() * (W - 40), W * 0.5 + r() * (H - W * 0.6), 12, 5);
    g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.beginPath(); g.moveTo(8, H); g.lineTo(8, W / 2); g.arc(W / 2, W / 2, W / 2 - 8, PI, 0); g.lineTo(W - 8, H); g.stroke();
    if (text) { g.fillStyle = '#2a2440'; g.font = `800 ${Math.round(W / (text.length * 0.95))}px Montserrat`; g.textAlign = 'center'; g.fillText(text, W / 2, H * 0.52); g.font = '600 26px Montserrat'; g.fillText('1703', W / 2, H * 0.66); g.fillRect(W / 2 - 4, H * 0.18, 8, H * 0.2); g.fillRect(W / 2 - 22, H * 0.24, 44, 8); } }, 256);
}
for (const [dx, z, w, h, s] of [[-2.4, -1.7, 0.45, 0.7, 2], [-1.6, -1.5, 0.4, 0.6, 3], [1.4, -1.6, 0.48, 0.75, 4], [2.3, -1.4, 0.42, 0.62, 5], [-0.9, -1.9, 0.36, 0.55, 6]]) stone(CMX + dx, z, w, h, '', s);
for (const [dx, z] of [[-2.0, -1.0], [1.9, -0.95]]) { block(scene, 0x5d5a78, CMX + dx - 0.03, CMX + dx + 0.03, 0, 0.75, z + 0.03, z - 0.03, 0.012); block(scene, 0x5d5a78, CMX + dx - 0.2, CMX + dx + 0.2, 0.5, 0.56, z + 0.03, z - 0.03, 0.012); }
const newStone = stone(CMX + 0.1, -1.2, 0.62, 0.95, 'MARCHIOLY', 9);
{ const mound = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 10, 0, 2 * PI, 0, PI / 2), flat(0x4a3a2e)), 0.016); mound.scale.set(1, 0.32, 0.6); mound.position.set(CMX + 0.1, 0, -0.65); scene.add(mound); }
{ const tr = new THREE.Group(); tr.position.set(CMX + 2.8, 0, -2.6); scene.add(tr); block(tr, 0x2a2030, -0.07, 0.07, 0, 2.2, 0.07, -0.07, 0.014);
  for (const [a, l, y] of [[0.7, 0.8, 1.6], [-0.8, 0.7, 1.9], [0.4, 0.6, 2.1], [-0.4, 0.55, 1.3]]) { const b = block(tr, 0x2a2030, -0.025, 0.025, 0, l, 0.025, -0.025, 0.01); b.position.y = y; b.rotation.z = a; b.geometry.translate(0, l / 2, 0); } }
const shovel = new THREE.Group(); scene.add(shovel);
block(shovel, 0x6b4a2a, -0.016, 0.016, 0, 0.9, 0.016, -0.016, 0.008); block(shovel, 0x9aa1ad, -0.09, 0.09, -0.2, 0.0, 0.012, -0.012, 0.01);
const graveLantern = new THREE.Group(); graveLantern.position.set(CMX - 0.75, 0, -0.5); scene.add(graveLantern);
block(graveLantern, 0x23262d, -0.07, 0.07, 0, 0.04, 0.07, -0.07, 0.01); { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.1), basic(0xffd98a)); gl.position.y = 0.13; outlined(gl, 0.012); graveLantern.add(gl); }
const graveFlame = flame(graveLantern, 0.4, { light: 5, glow: 3 }); graveFlame.g.position.y = 0.1; graveFlame.fo.visible = graveFlame.fi.visible = false;
// celda vacía de la Bastilla, pegada al cementerio (la cámara viaja de uno a otra sin cortar)
wallRect(QX - 3, QX + 4, 0, 6, -1.8, STONE_IN, 1.2);
surface(scene, texW('tiles', { base: '#5f5a72', line: '#35304a', n: 3, seed: 6 }, 7, 5, 1.1), 7, 5, QX + 0.5, 0.004, 0.6, true);
block(scene, flat(0x56546f), QX - 3.35, QX - 3.0, 0, 6, 1.2, -1.8, 0.02);
k.plane(scene, 0x1e1428, 7, 0.06, QX + 0.5, 0.03, -1.79);
picture(scene, 0.62, 0.52, QX - 0.9, 2.6, -1.77, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#141a44'); gr.addColorStop(1, '#3a3270'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f6efcf'; g.beginPath(); g.arc(W * 0.3, H * 0.35, 18, 0, 7); g.fill(); g.fillStyle = '#1e1428'; for (let i = 1; i < 4; i++) g.fillRect(i * W / 4 - 6, 0, 12, H); g.lineWidth = 18; g.strokeStyle = '#3e3a52'; g.strokeRect(0, 0, W, H); });
{ const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.4), new THREE.MeshBasicMaterial({ color: 0xc8d4ff, transparent: true, opacity: 0.12, depthWrite: false })); ray.position.set(QX - 0.5, 1.3, -1.2); ray.rotation.z = 0.5; scene.add(ray); }
block(scene, 0xc9a24a, QX + 2.1, QX + 3.4, 0, 0.26, -0.8, -1.7); block(scene, 0x8a6a4a, QX + 2.2, QX + 3.0, 0.26, 0.32, -0.85, -1.65, 0.012);
for (let i = 0; i < 6; i++) { const l = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), flat(0x5d6474)), 0.005); l.position.set(QX + 2.7, 1.9 - i * 0.065, -1.76); l.rotation.y = i % 2 ? PI / 2 : 0; scene.add(l); }
torch(QX - 2.0, 2.1, -1.68);

// =====================================================================================
// POSES
// =====================================================================================
const head = { pr: V(0, 0, 0), sm: V(0, 0, 0), k: V(0, 0, 0), tw: V(0, 0, 0), sv: V(0, 0, 0), vo: V(0, 0, 0), du: V(0, 0, 0), g1: V(0, 0, 0), g2: V(0, 0, 0) };
const show = (toon, p, t, kk) => { toon.root.visible = true; toon.pose(alive({ blink: blinkAt(t, kk * 0.7), ...p }, t, kk)); };
const toCam = (x, y = 1.35) => V(x, y, 3);
function walkZ(t, t0, t1, z0, z1, x, stride = 0.46) {          // caminar hacia la cámara (o alejándose)
  const z = lerp(z0, z1, lin(t, t0, t1));
  return { x, z, phase: Math.abs(z - z0) / (2 * stride), walk: win(t, t0 - 0.02, t1 + 0.14, 0.12), stride, face: z1 > z0 ? 0 : PI, squash: settle(t, t1) };
}

function frame(t) {
  for (const a of ALL) a.root.visible = false;
  let pk = 0;
  pikes.forEach(p => { p.visible = false; });
  keyring.visible = lantern.visible = false;
  holdPike(pikes[pk++], wA1.root ? wA1 : null); holdPike(pikes[pk++], wA2); holdPike(pikes[pk++], wG);
  pMask.velvet.visible = true; pMask.iron.visible = false;
  quill.visible = sQuill.visible = quillV.visible = quillD.visible = false;
  order.visible = order2.visible = false; desk.visible = true; bundle.visible = false; scraper.visible = false;

  // ---------------- FORTALEZA ----------------
  if (t < c[1]) {
    const grab = back(lin(t, T.encierra + 0.25, T.encierra + 0.55));
    show(prisoner, { x: TWX, y: WIN_Y - 1.38, z: WIN_Z - 0.32, face: 0, look: toCam(TWX, WIN_Y), squash: settle(t, T.encierra, 0.08) * breathe(t),
      handL: V(TWX - 0.21, WIN[0] + 0.15, WIN_Z + 0.02), handR: V(TWX + 0.21, WIN[0] + 0.15, WIN_Z + 0.02), wL: grab, wR: grab, tilt: 0.06 * Math.sin(t * 1.3), ...moodAt(t, [[0, 'neutral'], [T.encierra + 0.1, 'worried']]) }, t, 0);
    pMask.update(t, 0, blinkAt(t, 0.4), t > T.nadie ? 0.016 * Math.sin(t * 6) : null);
    show(g1, { x: GATEX - 0.55, z: -2.75, face: 0.25, look: toCam(GATEX - 0.4), handR: V(GATEX - 0.55 + 0.4, 1.0, -2.6), wR: 1 }, t, 2);
    show(g2, { x: GATEX + 0.55, z: -2.75, face: -0.25, look: toCam(GATEX + 0.4), handR: V(GATEX + 0.55 + 0.38, 1.0, -2.85), wR: 1 }, t, 3);
    holdPike(pikes[pk++], g1); holdPike(pikes[pk++], g2);
  }
  const fall = lin(t, T.encierra - 0.18, T.encierra);
  winBars.position.y = (1 - fall * fall) * 1.3 + (t > T.encierra ? 0.06 * Math.exp(-7 * (t - T.encierra)) * Math.abs(Math.cos(16 * (t - T.encierra))) : 0);
  winBars.visible = t > T.encierra - 0.18 || t > c[1];
  if (flag) flag.userData.parts.forEach((p, i) => { p.position.z = 0.06 * Math.sin(t * 5 - i * 0.9) * (i / 5); p.rotation.y = 0.3 * Math.sin(t * 5 - i * 0.9); });

  // ---------------- PALACIO: la orden ----------------
  if (t >= c[1] && t < c[2]) {
    const KX = BX + 0.3, KZ = -0.4;
    const writing = t < T.orden1 - 0.05, lift = back(lin(t, T.rey - 0.05, T.rey + 0.3));
    order.visible = true;
    const ORD = V(BX + 0.55, 0.86, 0.18);
    order.position.copy(ORD).lerp(tmp.set(KX + 0.45, 1.08, 0.15), lift); order.rotation.set(lerp(-1.05, -0.1, lift), 0, lerp(0.1, -0.08, lift));
    orderSeal.visible = t > T.orden1 + 0.1; orderSeal.scale.setScalar(back(lin(t, T.orden1 + 0.1, T.orden1 + 0.35)));
    const pen = tmp2.set(ORD.x - 0.12 + 0.18 * ((t * 1.1) % 1) + 0.01 * Math.sin(t * 40), 0.95 + 0.02 * Math.sin(t * 26), ORD.z + 0.02);
    const stamp = win(t, T.orden1 - 0.15, T.orden1 + 0.35, 0.1), down = win(t, T.orden1 - 0.02, T.orden1 + 0.15, 0.06);
    show(king, { x: KX, z: KZ, face: 0.15, squash: breathe(t) * settle(t, T.orden1 + 0.1, 0.06), y: hop(t, T.rey, 0.08),
      look: writing ? V(ORD.x, 0.86, ORD.z + 0.4) : t < T.rey ? V(ORD.x, 0.9, 1.2) : toCam(KX, 1.4),
      handR: lift > 0.01 ? V(KX + 0.5, 1.02, 0.1) : stamp > 0.01 ? V(ORD.x + 0.12, 0.98 - 0.08 * down, ORD.z - 0.02) : pen, wR: 1,
      handL: lift > 0.01 ? V(KX + 0.25, 1.02, 0.12) : talk(t, KX, KZ, -1), wL: lift > 0.01 ? lift : 0.7,
      ...moodAt(t, [[0, 'neutral'], [T.orden1, 'angry'], [T.rey, 'sly']]) }, t, 4);
    king.hand(1, hv); quill.visible = writing; quill.position.copy(hv).add(tmp.set(0, -0.02, 0.02));
    show(royalGuard, { x: BX - 1.15, z: -1.0, face: 0.35, look: toCam(BX - 1.0), handR: V(BX - 1.15 + 0.4, 1.0, -0.9), wR: 1 }, t, 5);
    holdPike(pikes[pk++], royalGuard);
    king.head.getWorldPosition(head.k);
  }

  // ---------------- OFICINA / CELDA ----------------
  if (t >= c[2] && t < CB) {
    const SX = CX - 1.45, SZ = -0.25;
    const wk = lin(t, T.figura + 0.05, T.figura + 1.35); drawLedger(wk);
    const writing = t > T.figura - 0.1 && t < T.figura + 1.45;
    ledger.updateMatrixWorld();
    const tipW = ledger.localToWorld(tmp2.set(-0.26 + 0.52 * ledgerTip.x / 512 + 0.005 * Math.sin(t * 45), 0.345 / 2 - 0.345 * 112 / 340 + 0.006 * Math.sin(t * 31), 0.03));
    const readK = back(lin(t, T.orden2 - 0.15, T.orden2 + 0.2)), angry = t > T.matar - 0.3;
    const p = { x: SX, z: SZ, face: t < c[3] ? 0 : lerp(0, 0.5, prog(t, T.habla - 0.2, T.habla + 0.2)) * (1 - prog(t, T.matar - 0.4, T.matar - 0.1)) + 0.1,
      squash: breathe(t) * settle(t, T.matar, 0.1), y: hop(t, T.carcelero + 0.1, 0.08) + hop(t, T.matar - 0.05, 0.12),
      look: writing ? V(tipW.x, 0.8, 0.6) : t < T.orden2 ? toCam(SX) : t < T.habla - 0.2 ? V(SX + 0.3, 1.2, 1.5) : t < T.matar - 0.4 ? V(CELL, 1.4, 0) : toCam(SX, 1.45),
      handR: writing ? tipW.clone().add(tmp.set(0.06, -0.03, 0.09)) : readK > 0.01 ? V(SX + 0.3, 1.22, 0.3) : talk(t, SX, SZ, 1, 1), wR: writing ? 1 : readK > 0.01 ? readK : 0.6,
      handL: angry ? V(SX - 0.32, 1.45 + 0.05 * Math.sin(t * 14), 0.1) : V(SX - 0.3, 0.95, 0.15), wL: angry ? back(lin(t, T.matar - 0.3, T.matar)) : 0.7,
      ...moodAt(t, [[0, 'neutral'], [T.carcelero, 'neutral'], [T.orden2, 'surprised'], [T.habla, 'sly'], [T.matar - 0.3, 'angry']]) };
    show(saintMars, p, t, 6);
    if (writing) { saintMars.hand(1, hv); sQuill.visible = true; sQuill.position.copy(hv).add(tmp.set(0.005, 0.0, 0.0)); sQuill.scale.setScalar(0.6); sQuill.rotation.set(-0.5, 0, -0.8); }
    if (readK > 0.01 && !writing) { saintMars.hand(1, hv); order2.visible = true; order2.position.copy(hv).add(tmp.set(-0.05, 0.08, 0.04)); order2.rotation.set(-0.15, 0, 0.06 * Math.sin(t * 3)); }
    saintMars.hand(0, hv); keyring.visible = true; keyring.position.copy(hv).add(tmp.set(0, -0.04, 0.03)); keyring.rotation.z = 0.25 * Math.sin(t * 7) + (t > T.carcelero && t < T.carcelero + 0.6 ? 0.5 * Math.sin(t * 30) : 0);
    saintMars.head.getWorldPosition(head.sm);
    const scared = win(t, T.matar - 0.1, c[4], 0.2);
    show(prisoner, { x: CELL, z: -0.55, face: -0.25, look: t > T.habla - 0.2 && t < T.matar ? toCam(CELL, 1.4) : V(SX, 1.4, 0.5), squash: breathe(t, 1) * (1 - 0.08 * scared) * settle(t, T.matar + 0.1, 0.1), y: hop(t, T.matar, 0.14),
      handL: V(CELL - 0.18, 1.18 + 0.2 * scared, 0.0), handR: V(CELL + 0.18, 1.18 + 0.2 * scared, 0.0), wL: 0.6 + 0.4 * scared, wR: 0.6 + 0.4 * scared, lean: -0.08 * scared, ...moodAt(t, [[0, 'neutral'], [T.matar - 0.1, 'surprised'], [T.matar + 0.4, 'worried']]) }, t, 1);
    pMask.update(t, 1, blinkAt(t, 1.3), scared > 0.5 ? 0.02 * Math.sin(t * 9) : null);
  }

  // ---------------- PASILLO DE PUERTAS ----------------
  const CL = [[21.15, 21.5], [22.55, 22.9], [23.65, 24.0]];
  const closeT = [CL[0], CL[1], CL[2]].map(([a, b]) => [a, b]);
  doors.forEach((d, i) => { const [a, b] = closeT[2 - i]; const u = prog(t, a, b); d.rotation.y = lerp(-1.5, 0, u) + (t > b ? 0.03 * Math.exp(-8 * (t - b)) * Math.sin(40 * (t - b)) : 0); });
  if (t >= CB && t < c[5]) {
    // camina hacia la cámara cerrando las tres puertas: C (la del fondo), B, A
    const segs = [[c[4] + 0.1, 20.95, -3.5, -2.55], [21.6, 22.4, -2.55, -1.15], [23.0, 23.55, -1.15, 0.25], [24.1, 24.5, 0.25, 0.75]];
    let si = 0; while (si < segs.length - 1 && t >= segs[si + 1][0]) si++;
    const p = walkZ(t, ...segs[si].slice(0, 2), segs[si][2], segs[si][3], DX + 0.12, 0.5);
    let closing = -1; CL.forEach(([a, b], i) => { if (t > a - 0.25 && t < b + 0.1) closing = i; });
    if (closing >= 0) {
      const di = 2 - closing, d = doors[di], [a, b] = CL[closing]; d.updateMatrixWorld();
      const edge = d.localToWorld(tmp.set(DOOR_W - 0.08, 1.0, 0.05));
      p.face = lerp(0, -1.55, win(t, a - 0.25, b + 0.1, 0.18)); p.look = toCam(DX, 1.4); p.handL = edge.clone(); p.wL = win(t, a - 0.2, b, 0.12);
    }
    if (t > T.escuche - 0.25) { p.handR = V(DX + 0.12 + 0.02, 1.27, p.z + 0.32); p.wR = back(lin(t, T.escuche - 0.25, T.escuche + 0.05)); p.look = toCam(DX + 0.12, 1.4); }
    Object.assign(p, moodAt(t, [[0, 'neutral'], [T.escuche - 0.2, 'sly']]));
    if (!p.look && !p.walk) p.look = toCam(DX);
    show(saintMars, p, t, 6);
    saintMars.hand(0, hv); keyring.visible = true; keyring.position.copy(hv).add(tmp.set(0, -0.04, 0.03)); keyring.rotation.z = 0.35 * Math.sin(t * 9);
    saintMars.head.getWorldPosition(head.sm);
    show(prisoner, { x: DX - 0.1, z: -4.1, face: 0, look: toCam(DX, 1.4), squash: breathe(t, 2), handL: V(DX - 0.35, 1.0, -3.8), wL: 0.5, mood: 'worried' }, t, 1);
    pMask.update(t, 2, blinkAt(t, 0.9));
    CL.forEach(([a, b], i) => { const di = 2 - i; [puffA, puffB, puffC][i](t, b, DX + 0.3, DOOR_Z[di] + 0.12, 1, 0.05); });
  }

  // ---------------- CAMINO: la silla tapada ----------------
  if (t >= c[5] && t < c[7]) {
    // la silla viaja, frena, la apoyan en el piso y el preso aparece adelante
    const cx = chairX(t), t0 = c[5] - 0.2, bob = 0.025 * Math.abs(Math.sin(t * 6.5)) * (t < STOP ? 1 : 0), down = prog(t, STOP, STOP + 0.35), sx0 = chairX(STOP);
    chair.position.set(cx, bob - 0.38 * down, 0.15); chair.rotation.z = 0.02 * Math.sin(t * 6.5) * (1 - down);
    const wk = (o, s = 0.5) => go(t, t0, STOP, chairX(t0) + o, chairX(STOP) + o, s);
    const py = 0.93 + bob - 0.38 * down, carry = t < c[6] + 0.2;
    if (carry) {
      show(porter1, { ...wk(-1.05), z: 0.15, crouch: 0.6 * down, handL: V(cx - 0.92, py, 0.15 + 0.42), handR: V(cx - 0.92, py, 0.15 - 0.42), wL: 1, wR: 1, mood: 'effort', lean: 0.1 }, t, 7);
      show(porter2, { ...wk(1.05), z: 0.15, crouch: 0.6 * down, handL: V(cx + 0.92, py, 0.15 + 0.42), handR: V(cx + 0.92, py, 0.15 - 0.42), wL: 1, wR: 1, mood: 'effort', lean: 0.05 }, t, 8);
    } else {
      show(porter1, { ...go(t, c[6] + 0.25, c[6] + 1.6, sx0 - 1.05, sx0 - 3.8, 0.5), z: 0.15, mood: 'happy' }, t, 7);
      show(porter2, { ...go(t, c[6] + 0.25, c[6] + 1.6, sx0 + 1.05, sx0 + 3.9, 0.5), z: lerp(0.15, -1.1, prog(t, c[6] + 0.25, c[6] + 0.9)), mood: 'happy' }, t, 8);
    }
    const stopped = t > STOP + 0.2;
    show(saintMars, { ...wk(2.05), z: 0.2, handL: V(cx + 2.05 + 0.3, 1.32, 0.2 + 0.28), wL: 1, look: stopped ? V(PX, 1.4, PZ) : V(cx + 3.3, 1.35, 3), mood: stopped ? 'sly' : 'neutral',
      ...(stopped ? { face: lerp(PI / 2, -0.6, prog(t, STOP + 0.2, STOP + 0.6)) } : {}) }, t, 6);
    saintMars.hand(0, hv); lantern.visible = true; lantern.position.copy(hv); lantern.rotation.z = 0.15 * Math.sin(t * 6.5);
    saintMars.hand(1, hv); keyring.visible = true; keyring.position.copy(hv).add(tmp.set(0, -0.04, 0.03)); keyring.rotation.z = 0.4 * Math.sin(t * 6.5);
    show(g1, { ...wk(-2.2), z: 0.0, handR: V(cx - 2.2 + 0.12, 1.0, -0.2), wR: 1 }, t, 2); holdPike(pikes[pk++], g1, 1, 0.05);
    const open = prog(t, T.escondido - 0.05, T.escondido + 0.35) * (1 - prog(t, c[6] - 0.1, c[6] + 0.1));
    chairCurtain.scale.x = 1 - 0.85 * open; chairCurtain.position.x = 0.06 - 0.145 * open;
    chairEyes.visible = open > 0.3; chairPupils.forEach(pp => pp.position.set(0.008 * Math.sin(t * 2.5), 0.004, 0.002));
    chairEyes.scale.y = Math.max(1 - 0.92 * blinkAt(t, 0.3), 0.1);
    saintMars.head.getWorldPosition(head.sm);
    puffC(t, STOP + 0.3, cx - 0.4, 0.5, -1, 0.05); puffD(t, STOP + 0.3, cx + 0.4, 0.5, 1, 0.05);
  }

  // ---------------- EN EL CAMINO: hierro o terciopelo, y Voltaire y Dumas ----------------
  if (t >= c[6] && t < c[7]) {
    const swapT = T.terciopelo - 0.1, touch = win(t, swapT - 0.25, swapT + 0.5, 0.15), side = t > CUT_STUDY + 0.2;
    pMask.iron.visible = t < swapT; pMask.velvet.visible = t >= swapT;
    show(prisoner, { x: PX, z: PZ, face: 0, look: toCam(PX + (side ? 0.6 * Math.sin(t * 1.3) : 0), 1.45), squash: breathe(t, 1) * settle(t, swapT, 0.1) * settle(t, c[6] + 0.3, 0.15), y: hop(t, swapT, 0.08) + hop(t, c[6] - 0.05, 0.3, 0.35),
      handL: V(PX - 0.34, 1.35, PZ + 0.15), handR: V(PX + 0.34, 1.35, PZ + 0.15), wL: touch, wR: touch, tilt: 0.08 * Math.sin(t * 1.6), ...moodAt(t, [[0, 'worried'], [swapT, 'surprised'], [swapT + 0.6, 'neutral']]) }, t, 1);
    pMask.update(t, 3, blinkAt(t, 0.2), t > T.hierro && t < swapT ? 0 : null, t > T.hierro && t < swapT ? 0.014 : null);
    puffA(t, swapT - 0.05, PX - 0.25, PZ + 0.3, -1, 1.25);
    puffB(t, c[6] - 0.08, PX - 0.2, PZ, -1, 0.1);
    const VXr = PX - 0.92, DXr = PX + 0.92, VZ = PZ + 0.2;
    const lv = back(lin(t, T.voltaire - 0.12, T.voltaire + 0.2)), ld = back(lin(t, T.dumas - 0.12, T.dumas + 0.2));
    if (t > T.voltaire - 0.12) { show(voltaire, { x: VXr, z: VZ, face: 0.25, look: toCam(VXr, 1.4), squash: breathe(t, 3) * settle(t, T.voltaire + 0.2, 0.14), y: hop(t, T.voltaire - 0.12, 0.25),
        handR: V(VXr + 0.17, 0.92, VZ + 0.28), wR: lv, handL: V(VXr - 0.17, 0.92, VZ + 0.28), wL: lv, ...moodAt(t, [[0, 'surprised'], [T.voltaire + 0.25, 'happy']]) }, t, 9);
      voltaire.head.getWorldPosition(head.vo); bookV.visible = true; bookV.position.set(VXr, 0.88, VZ + 0.3); bookV.rotation.set(0, 0.25, 0); bookV.scale.setScalar(Math.max(lv, 0.001)); } else bookV.visible = false;
    if (t > T.dumas - 0.12) { show(dumas, { x: DXr, z: VZ, face: -0.25, look: toCam(DXr, 1.4), squash: breathe(t, 4) * settle(t, T.dumas + 0.2, 0.14), y: hop(t, T.dumas - 0.12, 0.25),
        handR: V(DXr + 0.17, 0.92, VZ + 0.28), wR: ld, handL: V(DXr - 0.17, 0.92, VZ + 0.28), wL: ld, ...moodAt(t, [[0, 'surprised'], [T.dumas + 0.25, 'happy']]) }, t, 10);
      dumas.head.getWorldPosition(head.du); bookD.visible = true; bookD.position.set(DXr, 0.88, VZ + 0.3); bookD.rotation.set(0, -0.25, 0); bookD.scale.setScalar(Math.max(ld, 0.001)); } else bookD.visible = false;
    puffC(t, T.voltaire - 0.12, VXr - 0.2, VZ, -1, 0.1); puffD(t, T.dumas - 0.12, DXr + 0.2, VZ, 1, 0.1);
  } else { bookV.visible = bookD.visible = false; }

  // ---------------- BASTILLA + CEMENTERIO ----------------
  const out = prog(t, T.muere - 0.05, T.muere + 0.5);
  bWinDark.material.opacity = out * 0.92; bGlow.material.opacity = 0.6 * (1 - out) * (0.85 + 0.15 * Math.sin(t * 11));
  const ns = back(lin(t, T.otro - 0.1, T.otro + 0.25)); newStone.visible = ns > 0.01; newStone.scale.set(Math.max(ns, 0.001), Math.max(ns, 0.001), 1); newStone.position.y = 0.475 * Math.max(ns, 0.001);
  if (t >= c[7] && t < T.queman - 0.1) {
    const dig = Math.sin(t * 5);
    show(g2, { x: CMX + 0.8, z: -0.65, face: -0.5, look: t > T.otro ? V(CMX + 0.1, 0.8, -1.0) : toCam(CMX + 1, 1.3), handR: V(CMX + 0.57, 0.95 + 0.1 * dig, -0.45), handL: V(CMX + 0.59, 0.6 + 0.1 * dig, -0.5), wL: 1, wR: 1,
      lean: 0.1 + 0.05 * dig, ...moodAt(t, [[0, 'neutral'], [T.otro, 'worried']]) }, t, 3);
    g2.hand(1, hv); shovel.visible = true; shovel.position.copy(hv).add(tmp.set(0, -0.62, 0)); shovel.rotation.z = 0.25 + 0.05 * dig;
    g2.head.getWorldPosition(head.g2);
  } else shovel.visible = false;

  // ---------------- CELDA: queman y raspan ----------------
  const flare = win(t, T.queman + 0.3, T.queman + 1.6, 0.2);
  fire.forEach((f, i) => { f.on = t >= T.queman - 0.2 && t < c[9] ? 1 + 0.6 * flare : 0; });
  patch.visible = t >= T.raspan && t < c[10]; patch.scale.setScalar(Math.max(lin(t, T.raspan + 0.1, c[9]) * 0.9 + 0.1, 0.01)); patch.material.opacity = 0.75;
  if (t >= T.queman - 0.1 && t < c[9]) {
    const BZX = brazier.position.x, th = back(lin(t, T.queman + 0.05, T.queman + 0.3)), toss = lin(t, T.queman + 0.3, T.queman + 0.65);
    show(g1, { x: BZX - 0.55, z: 0.25, face: 0.4, look: t < T.queman + 0.8 ? V(BZX, 1.1, 1.2) : toCam(BZX - 0.6, 1.35), handR: V(BZX - 0.3, 1.0 + 0.35 * th * (1 - toss), 0.3), handL: V(BZX - 0.35, 0.95 + 0.3 * th * (1 - toss), 0.15), wL: 1 - toss * 0.6, wR: 1 - toss * 0.6,
      ...moodAt(t, [[0, 'effort'], [T.queman + 0.7, 'neutral']]) }, t, 2);
    g1.head.getWorldPosition(head.g1);
    if (toss < 1) { bundle.visible = true; g1.hand(1, hv); bundle.position.lerpVectors(hv, tmp.set(BZX, 0.7, 0.15), toss); bundle.position.y += 0.4 * Math.sin(PI * toss); bundle.rotation.z = toss * 3; }
    const sc = Math.sin(t * 9);
    const SGX = PATCH.x - 0.55;
    show(g2, { x: SGX, z: -1.35, face: lerp(0.6, PI / 2 - 0.35, prog(t, T.raspan - 0.35, T.raspan)), look: t > T.raspan + 0.12 || t < T.raspan - 0.2 ? toCam(SGX, 1.4) : V(PATCH.x, PATCH.y, PATCH.z), handR: V(PATCH.x - 0.05, PATCH.y + 0.18 * sc, PATCH.z + 0.1), wR: t > T.raspan - 0.2 ? 1 : 0.3, handL: V(SGX + 0.2, 1.0, -1.15), wL: 0.5,
      ...moodAt(t, [[0, 'neutral'], [T.raspan, 'effort']]) }, t, 3);
    g2.hand(1, hv); scraper.visible = true; scraper.position.copy(hv); scraper.rotation.set(0, 0, 0.3);
    g2.head.getWorldPosition(head.g2);
  }
  embers.forEach((m, i) => { const on = t >= T.queman - 0.1 && t < c[9], u = (t * (0.9 + 0.3 * flare) + m.userData.off) % 1; m.visible = on; if (!on) return; m.position.set(brazier.position.x + 0.2 * Math.sin(i * 2.3 + u * 4), 0.8 + 1.3 * u, 0.15 + 0.02 * i); m.scale.setScalar(1 - u); });
  scrapDust.forEach((m, i) => { const on = t >= T.raspan && t < c[9], u = (t * 1.6 + m.userData.off) % 1; m.visible = on; if (!on) return; m.position.set(PATCH.x + 0.25 * Math.sin(i * 1.9), PATCH.y - 1.2 * u * u, PATCH.z + 0.15); m.material.opacity = 0.8 * (1 - u); });

  // ---------------- PALACIO: las teorías ----------------
  if (t >= c[9]) {
    desk.visible = false; order.visible = false;
    const TWX2 = BX + 0.7, KX = BX - 0.7, kin = t >= T.hermano - 0.12 && t < c[10], fin2 = t >= c[10];
    show(twin, { x: TWX2, z: -0.45, face: -0.2, look: t > T.otros + 0.2 && !fin2 ? V(BX + 2.6, 1.4, 0) : toCam(TWX2, 1.4), squash: breathe(t, 5) * settle(t, T.hermano + 0.1, 0.06), ...(fin2 ? moodAt(t, [[0, 'neutral'], [T.nadie2, 'worried']]) : {}),
      handL: talk(t, TWX2, -0.45, -1, 2), wL: 0.6, handR: kin && t < T.otros ? V(TWX2 + 0.32, 1.5, -0.3) : talk(t, TWX2, -0.45, 1, 3), wR: 0.6 }, t, 11);
    tMask.update(t, 5, blinkAt(t, 1.7), t > T.nadie2 ? 0 : null, t > T.nadie2 ? 0 : null);
    twin.head.getWorldPosition(head.tw);
    if (kin) { show(king, { x: KX, z: -0.45, face: 0.2, y: hop(t, T.hermano - 0.12, 0.2), squash: settle(t, T.hermano + 0.28, 0.14) * breathe(t), look: t > T.otros + 0.2 ? V(BX + 2.6, 1.4, 0) : toCam(KX, 1.4),
        handL: t < T.otros ? V(KX - 0.32, 1.5, -0.3) : talk(t, KX, -0.45, -1, 4), wL: 0.8, handR: talk(t, KX, -0.45, 1, 5), wR: 0.6, ...moodAt(t, [[0, 'surprised'], [T.hermano + 0.6, 'sly'], [T.otros + 0.2, 'worried']]) }, t, 4);
      king.head.getWorldPosition(head.k); }
    puffA(t, T.hermano - 0.12, KX - 0.2, -0.3, -1); puffB(t, T.hermano - 0.12, KX + 0.2, -0.3, 1); puffC(t, c[10] - 0.05, KX, -0.3, -1); puffD(t, c[10] - 0.05, BX + 2.35, -0.4, 1);
    const peek = prog(t, T.otros + 0.1, T.otros + 0.6), SVX = lerp(BX + 3.3, BX + 2.35, peek), cover = back(lin(t, T.debia - 0.1, T.debia + 0.2));
    if (!fin2) show(servant, { x: SVX, z: lerp(-1.2, -0.5, peek), face: -0.35, lean: 0.12 * (1 - peek), look: t > T.vio ? V(BX, 1.4, -0.4) : toCam(SVX, 1.4), y: hop(t, T.vio, 0.14),
      handL: cover > 0.01 ? V(SVX - 0.06, 1.24, -0.2) : V(SVX + 0.35, 1.3, -0.62), wL: cover > 0.01 ? cover : 0.8, handR: cover > 0.01 ? V(SVX + 0.06, 1.24, -0.2) : V(SVX + 0.3, 0.95, -0.4), wR: cover > 0.01 ? cover : 0.4,
      ...moodAt(t, [[0, 'neutral'], [T.vio, 'surprised'], [T.debia, 'worried']]) }, t, 12);
    servant.head.getWorldPosition(head.sv);
    show(royalGuard, { x: BX - 1.9, z: -1.0, face: 0.4, look: toCam(BX - 1.8), handR: V(BX - 1.9 + 0.4, 1.0, -0.9), wR: 1 }, t, 5);
    holdPike(pikes[pk++], royalGuard);
  }

  if (prisoner.root.visible) prisoner.head.getWorldPosition(head.pr);

  // ---------------- vida de fondo ----------------
  for (const f of flames) {
    const fl = 1 + 0.13 * Math.sin(t * 13 + f.k) + 0.08 * Math.sin(t * 29 + f.k * 2.3) + 0.05 * Math.sin(t * 47 + f.k);
    f.g.visible = f.on > 0.01; if (!f.g.visible) { if (f.pl) f.pl.intensity = 0; continue; }
    f.fo.scale.set(1 + 0.08 * Math.sin(t * 17 + f.k), fl * f.on, 1); f.fi.scale.set(1, fl * f.on, 1); f.fo.rotation.z = 0.08 * Math.sin(t * 9 + f.k);
    f.gl.scale.setScalar((0.9 + 0.12 * fl) * Math.sqrt(f.on)); if (f.pl) f.pl.intensity = f.base * (0.85 + 0.2 * fl) * f.on;
  }
  towerLight.intensity = 5 * (0.9 + 0.1 * Math.sin(t * 13) + 0.06 * Math.sin(t * 31)); towerGlow.material.opacity = 0.5 + 0.08 * Math.sin(t * 17);
  for (const f of fogs) { f.t.offset.x = t * f.speed * 0.05 + f.k * 0.3; f.m.position.x = f.x0 + 0.4 * Math.sin(t * 0.3 + f.k); f.m.material.opacity = f.m.material.opacity; }
  for (const b of bats) { const a = t * 0.9 + b.off; b.g.position.set(b.cx + b.rx * Math.sin(a), b.cy + b.ry * Math.sin(2 * a + b.off), b.z + 0.4 * Math.cos(a)); const f = 0.9 * Math.sin(t * 16 + b.off * 3); b.wl.rotation.z = -f; b.wr.rotation.z = f; b.g.rotation.y = Math.cos(a) > 0 ? 0 : PI; }
  motes.forEach((m, i) => { const u = (t * 0.08 + m.userData.off) % 1; m.position.set(CELL + 0.3 + 0.9 * u + 0.1 * Math.sin(t + i), 0.3 + 2.4 * ((u * 1.7 + i * 0.13) % 1), -1.0 + 0.05 * i); m.material.opacity = 0.25 + 0.3 * Math.sin(t * 2 + i); });
  { const u = ((t - c[2]) * 0.55) % 1.8; rat.visible = t >= c[2] && t < c[4]; rat.position.set(CX - 0.2 - 2.6 * Math.min(u, 1), 0.02 * Math.abs(Math.sin(t * 24)), -1.5); rat.rotation.y = 0; }
  glints.forEach((m, i) => { m.position.x = m.userData.x0 + 0.15 * Math.sin(t * 1.3 + i * 1.7); m.material.opacity = 0.35 + 0.35 * Math.sin(t * 3 + i * 2.1); });
  curtains.forEach((cu, i) => { cu.rotation.y = 0.04 * Math.sin(t * 0.9 + i); });
  peekCurtain.rotation.y = 0.05 * Math.sin(t * 1.1) + (t > T.otros ? 0.25 * win(t, T.otros, T.otros + 1.4, 0.3) : 0);

  // signos sobre las cabezas
  const qOn = popIn(t, T.nadie, c[1]) + popIn(t, T.casi, c[3]) + (t >= c[9] ? popIn(t, c[9] + 0.15, T.hermano - 0.15) : 0) + (t >= c[10] ? popIn(t, T.nadie2, END + 2) : 0);
  const qAt = t < c[1] ? head.pr : t < c[3] ? ledger.position : head.tw;
  const fin = t >= c[10], led = t < c[3] && t >= c[2];
  qMarks.forEach((m, i) => k.glyphAt(m, qAt, (fin ? 1.25 : led ? 1.15 : 1) * [-0.42, 0.0, 0.42][i], (led ? 0.12 : fin ? 0.05 : 0.5) + (fin ? [0, -0.3, 0] : [0.0, 0.16, 0.0])[i] + 0.04 * Math.sin(t * 5 + i), Math.max(qOn, 0) * (led ? 0.55 : fin ? 0.55 : 1) * ((fin || led) && i === 1 ? 0 : 1), 0.15 * Math.sin(t * 4 + i)));
  k.glyphAt(xMark, head.pr, 0, 0.02, t >= c[6] && t < CUT_STUDY ? popIn(t, T.hierro - 0.05, T.terciopelo - 0.1) : 0, -0.1);
  sparks.forEach((m, i) => { const on = t >= c[6] && t < CUT_STUDY ? popIn(t, T.terciopelo - 0.05, T.del - 0.25) : 0; k.glyphAt(m, head.pr, [-0.45, 0.45, -0.38, 0.4, 0, 0.1][i], [0.3, 0.32, -0.15, -0.2, 0.5, -0.4][i], on * (0.6 + 0.4 * Math.sin(t * 9 + i * 1.6)), t * 2 + i); });
  k.glyphAt(bang, head.sv, 0.32, 0.36, t >= c[9] && t < c[10] ? popIn(t, T.vio, c[10] - 0.05) : 0, 0.1 * Math.sin(t * 7));
  k.glyphAt(eqMark, tmp.set(BX, 1.45, -0.45), 0, 0, t >= c[9] && t < c[10] ? popIn(t, T.hermano + 0.4, T.otros) : 0, 0);
}

// ---------------- cámara ----------------
const QZ = T.queman - 0.45;
k.shots([
  { t: 0, pos: [AX + 0.6, 3.0, 13.5], look: [AX + 0.6, 3.25, -2] },
  { t: 1.0, pos: [AX + 0.7, 3.05, 12.0], look: [AX + 0.7, 3.25, -2] },
  { t: T.encierra - 0.12, pos: [TWX - 0.1, 3.3, 8.0], look: [TWX, 3.3, -2] },
  { t: T.treinta - 0.2, pos: [TWX, 3.42, 5.2], look: [TWX, 3.4, -1.9] },
  { t: T.nadie - 0.15, pos: [TWX, 3.44, 3.4], look: [TWX, 3.4, -1.9] },
  { t: c[1], pos: [BX + 0.35, 1.55, 5.4], look: [BX + 0.35, 1.25, 0], cut: true },
  { t: T.orden1 - 0.2, pos: [BX + 0.5, 1.4, 2.6], look: [BX + 0.5, 0.95, 0.1] },
  { t: T.rey - 0.1, pos: [BX + 0.35, 1.5, 3.5], look: [BX + 0.35, 1.38, 0] },
  { t: c[2], pos: [CX - 1.29, 1.8, 0.95], look: [CX - 1.29, 0.8, 0.18], cut: true },
  { t: T.eustache - 0.1, pos: [CX - 1.29, 1.74, 0.82], look: [CX - 1.29, 0.8, 0.18] },
  { t: T.casi - 0.12, pos: [CX - 1.25, 1.5, 3.7], look: [CX - 1.25, 1.15, 0.0] },
  { t: c[3], pos: [CX - 0.9, 1.5, 4.8], look: [CX - 0.9, 1.3, 0] },
  { t: 14.3, pos: [CX - 1.2, 1.5, 4.0], look: [CX - 1.2, 1.32, 0] },
  { t: T.orden2 - 0.2, pos: [CX - 1.35, 1.45, 3.4], look: [CX - 1.35, 1.32, 0] },
  { t: T.habla - 0.15, pos: [CELL + 0.1, 1.5, 3.9], look: [CELL + 0.1, 1.35, -0.4] },
  { t: 18.1, pos: [CELL + 0.05, 1.52, 3.0], look: [CELL + 0.05, 1.4, -0.4] },
  { t: T.matar - 0.3, pos: [CX - 1.4, 1.52, 3.0], look: [CX - 1.4, 1.4, 0] },
  { t: c[4] - 0.3, pos: [CX - 1.4, 1.53, 2.7], look: [CX - 1.4, 1.42, 0] },
  { t: c[4] + 0.3, pos: [DX, 1.6, 3.4], look: [DX, 1.3, -3.2], glide: true },
  { t: 21.2, pos: [DX + 0.05, 1.55, 3.6], look: [DX, 1.3, -2.6] },
  { t: 22.6, pos: [DX + 0.08, 1.55, 3.9], look: [DX, 1.3, -1.4] },
  { t: 23.7, pos: [DX + 0.1, 1.55, 4.3], look: [DX + 0.1, 1.3, -0.3] },
  { t: T.escuche - 0.2, pos: [DX + 0.12, 1.55, 3.2], look: [DX + 0.12, 1.4, 0.5] },
  { t: c[5], pos: [chairX(c[5]) + 1.2, 1.75, 9.6], look: [chairX(c[5]) + 1.2, 1.3, 0], cut: true },
  { t: T.prision - 0.3, pos: [chairX(T.prision - 0.3) + 1.2, 1.7, 8.0], look: [chairX(T.prision - 0.3) + 1.2, 1.3, 0] },
  { t: T.escondido - 0.1, pos: [chairX(T.escondido - 0.1) + 1.2, 1.7, 7.6], look: [chairX(T.escondido - 0.1) + 1.2, 1.3, 0], glide: true },
  { t: T.escondido + 0.05, pos: [chairX(T.escondido) + 0.1, 1.15, 2.7], look: [chairX(T.escondido) + 0.1, 1.0, 0.4] },
  { t: STOP, pos: [chairX(STOP) + 0.1, 1.15, 2.6], look: [chairX(STOP) + 0.1, 1.0, 0.4], glide: true },
  { t: c[6] - 0.05, pos: [PX, 1.5, PZ + 3.4], look: [PX, 1.4, PZ] },
  { t: T.hierro - 0.2, pos: [PX, 1.52, PZ + 2.5], look: [PX, 1.44, PZ] },
  { t: T.terciopelo - 0.15, pos: [PX - 0.12, 1.56, PZ + 2.05], look: [PX, 1.45, PZ] },
  { t: CUT_STUDY, pos: [PX, 1.45, PZ + 6.4], look: [PX, 1.22, PZ] },
  { t: T.voltaire + 0.05, pos: [PX - 0.45, 1.4, PZ + 4.6], look: [PX - 0.45, 1.2, PZ] },
  { t: T.dumas + 0.05, pos: [PX + 0.4, 1.4, PZ + 4.8], look: [PX + 0.4, 1.2, PZ] },
  { t: c[7], pos: [GX, 3.3, 15.5], look: [GX, 3.3, -3], cut: true },
  { t: 38.2, pos: [GX - 0.1, 3.35, 13.4], look: [GX - 0.1, 3.35, -3] },
  { t: T.bastilla - 0.15, pos: [GX - 0.3, 3.4, 11.0], look: [GX - 0.3, 3.4, -3] },
  { t: T.muere - 0.3, pos: [BTX[1], 4.2, 2.6], look: [BTX[1], 4.2, -3.8] },
  { t: T.sete - 0.1, pos: [BTX[1] + 0.1, 4.15, 1.6], look: [BTX[1], 4.2, -3.8] },
  { t: c[8] + 0.35, pos: [CMX + 0.3, 1.45, 4.6], look: [CMX + 0.3, 0.95, -1], glide: true },
  { t: T.otro - 0.05, pos: [CMX + 0.3, 1.25, 4.5], look: [CMX + 0.3, 0.9, -1] },
  { t: QZ, pos: [CMX + 0.3, 1.25, 4.2], look: [CMX + 0.3, 0.9, -1] },
  { t: T.queman + 0.12, pos: [QX + 0.2, 1.45, 5.8], look: [QX + 0.2, 1.15, -0.5], glide: true },
  { t: T.raspan - 0.1, pos: [QX + 0.8, 1.5, 3.8], look: [QX + 0.85, 1.3, -1.3] },
  { t: 45.8, pos: [QX + 0.95, 1.48, 3.2], look: [QX + 1.0, 1.33, -1.4] },
  { t: c[9], pos: [BX + 0.7, 1.5, 4.3], look: [BX + 0.7, 1.4, 0], cut: true },
  { t: T.hermano - 0.15, pos: [BX, 1.55, 6.0], look: [BX, 1.4, 0] },
  { t: T.otros - 0.1, pos: [BX + 2.3, 1.5, 4.3], look: [BX + 2.3, 1.4, 0] },
  { t: T.sirviente - 0.1, pos: [BX + 2.32, 1.5, 3.8], look: [BX + 2.32, 1.41, 0] },
  { t: T.vio - 0.1, pos: [BX + 2.35, 1.5, 3.3], look: [BX + 2.35, 1.42, 0] },
  { t: T.debia - 0.05, pos: [BX + 2.35, 1.48, 2.9], look: [BX + 2.35, 1.42, 0] },
  { t: c[10], pos: [BX + 0.7, 1.5, 3.6], look: [BX + 0.7, 1.42, -0.45] },
  { t: T.tres + 0.4, pos: [BX + 0.65, 1.52, 3.0], look: [BX + 0.7, 1.42, -0.45] },
  { t: T.nadie2 - 0.15, pos: [BX + 0.7, 1.5, 2.4], look: [BX + 0.7, 1.42, -0.45] },
]);k.follow(() => head.pr);

// ---------------- carteles ----------------
tag({ text: 'Francia, 1669', big: true, off: BIG, from: 0.2, to: T.treinta - 0.25 });
tag({ text: '34 años', big: true, off: BIG, from: T.treinta, to: c[1] });
tag({ text: 'Luis XIV', at: () => V(head.k.x + 0.2, head.k.y + 0.3, head.k.z), off: [200, -170], from: T.luis - 0.1, to: c[2] });
tag({ text: 'Orden del rey', big: true, off: BIG, from: T.orden1, to: c[2] });
tag({ text: 'Eustache Dauger', at: () => ledger.position, off: [0, 230], from: T.eustache + 0.3, to: c[3] });
tag({ text: 'Saint-Mars, el carcelero', at: () => V(head.sm.x, head.sm.y + 0.55, head.sm.z), off: [60, -260], from: T.carcelero + 0.2, to: T.orden2 - 0.2 });
tag({ text: 'Si habla…', big: true, off: BIG, from: T.habla, to: T.matar - 0.3 });
tag({ text: '¡Lo matan!', big: true, off: BIG, from: T.matar - 0.2, to: c[4] });
tag({ text: 'Varias puertas', at: () => V(DX - 0.5, 2.1, DOOR_Z[0]), off: [120, -330], from: T.varias, to: T.otra + 0.4 });
tag({ text: 'Que nadie escuche', big: true, off: BIG, from: T.escuche - 0.2, to: c[5] });
tag({ text: 'Pignerol → Exilles', big: true, off: BIG, from: T.prision - 0.2, to: T.escondido - 0.15 });
tag({ text: '→ Sainte-Marguerite', big: true, off: BIG, from: T.escondido, to: c[6] });
tag({ text: '¿De hierro?', big: true, off: BIG, from: c[6] + 0.25, to: T.terciopelo - 0.2 });
tag({ text: 'Terciopelo negro', big: true, off: BIG, from: T.terciopelo - 0.05, to: CUT_STUDY + 0.1 });
tag({ text: 'Voltaire', at: () => tmp2.copy(head.vo).setY(head.vo.y + 0.42), off: [140, -200], from: T.voltaire, to: c[7] });
tag({ text: 'Dumas', at: () => V(head.du.x, head.du.y + 0.42, head.du.z), off: [-140, -200], from: T.dumas, to: c[7] });
tag({ text: 'La Bastilla, 1698', big: true, off: BIG, from: T.bastilla - 0.1, to: T.muere - 0.3 });
tag({ text: '1703', big: true, off: BIG, from: T.sete - 0.1, to: c[8] + 0.3 });
tag({ text: 'Otro nombre', big: true, off: BIG, from: T.otro + 0.1, to: T.queman - 0.15 });
tag({ text: 'Queman sus cosas', at: () => brazier.position.clone().setY(0.6), off: [0, 300], from: T.queman + 0.2, to: T.raspan - 0.1 });
tag({ text: 'Paredes raspadas', at: () => PATCH, off: [-120, -330], from: T.raspan + 0.25, to: c[9] });
tag({ text: '¿Quién era?', big: true, off: BIG, from: c[9] + 0.05, to: T.hermano - 0.2 });
tag({ text: '¿Su gemelo?', big: true, off: BIG, from: T.hermano, to: T.otros - 0.15 });
tag({ text: '¿Un sirviente?', big: true, off: BIG, from: T.sirviente - 0.1, to: T.vio - 0.05 });
tag({ text: 'Vio algo', big: true, off: BIG, from: T.vio, to: c[10] });
tag({ text: 'Más de 300 años', big: true, off: BIG, from: T.tres - 0.05, to: T.nadie2 - 0.1 });
tag({ text: 'Nadie lo sabe', big: true, off: BIG, from: T.nadie2, to: END + 1 });

// ---------------- sonidos ----------------
sfx(0, 'boom', 0.5);
sfx(T.encierra, 'thud', 0.8);
sfx(T.treinta, 'riser_to', 0.9); sfx(T.treinta, 'boom', 0.45);
sfx(T.orden1 + 0.1, 'thud', 0.7);
sfx(T.carcelero + 0.1, 'tap', 0.6); sfx(T.carcelero + 0.3, 'tap', 0.5);
sfx(T.matar - 0.1, 'riser_to', 1); sfx(T.matar - 0.1, 'boom', 0.55);
for (const [, b] of [[0, 21.5], [0, 22.9], [0, 24.0]]) sfx(b, 'clang', 0.55);
sfx(T.escondido + 0.05, 'tap', 0.5); sfx(STOP + 0.3, 'thud', 0.6); sfx(c[4] - 0.05, 'whoosh', 0.7); sfx(T.queman - 0.4, 'whoosh', 0.7); sfx(T.voltaire - 0.12, 'pop', 0.6); sfx(T.dumas - 0.12, 'pop', 0.6);
sfx(T.hierro - 0.05, 'thud', 0.7); sfx(T.terciopelo - 0.1, 'puff', 0.7);
sfx(T.bastilla - 0.1, 'riser_to', 0.9); sfx(T.bastilla - 0.1, 'boom', 0.5);
sfx(T.muere, 'thud', 0.45);
sfx(T.otro, 'thud', 0.6);
sfx(T.queman + 0.4, 'hiss', 0.5);
sfx(T.hermano - 0.12, 'riser_to', 0.9); sfx(T.hermano - 0.12, 'boom', 0.45);
sfx(T.vio, 'pop', 0.7);
sfx(T.nadie2, 'riser_to', 1); sfx(T.nadie2, 'boom', 0.6);

k.run(frame);
