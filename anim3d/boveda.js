// Episodio (misterios): la bóveda Chase de Barbados (1812-1820). Según los relatos, cada vez que abrían la tumba
// sellada encontraban los ataúdes de plomo cambiados de lugar. Decorados lado a lado en x:
//   0  BÓVEDA EN CORTE: la cámara ve la tumba por dentro (paredes de coral, escalera, losa) y arriba el
//      cementerio de noche (palmeras, cruces, iglesia de Christ Church al fondo, luna).
//   40 CEMENTERIO (las explicaciones: temblor, broma, el escéptico con el libro).
// Paleta de noche caribeña: cielo azul profundo, luna, antorchas y farol con resplandor, luciérnagas, murciélagos,
// cangrejos. Sin nada macabro: los ataúdes siempre cerrados.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { draw, surface, picture } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('boveda', { sky: [[0, '#0c1238'], [0.55, '#28336e'], [1, '#5c4c82']], light: { ambient: 1.55, sun: 1.5 } });
const { scene, c, at, END, sfx, tag, BIG } = k;
k.light.sun.color.set(0xd6dcff);                                   // luz de luna
const AX = 40;
const S = 2.6;                                                       // altura del suelo del cementerio sobre el piso de la bóveda
const CZ = 0.905;                                                    // plano del corte

// ---------------- tiempos ----------------
const T = {
  vacia: at('vacia'), relatos: at('relatos'), ataudes: at('ataudes'), movian: at('movian'),
  boveda: at('boveda', c[1]), cementerio: at('cementerio', c[1]), christ: at('christ', c[1]),
  doce: at('doce', c[2]), abren: at('abren', c[2]), thomas: at('thomas', c[2]), y1: at('ataudes', c[2]), hijas: at('hijas', c[2]),
  cajones: at('cajones', c[3]), plomo: at('plomo', c[3]), hacian: at('hacian', c[3]), mover: at('mover', c[3]),
  acomodan: at('acomodan', c[4]), sellan: at('sellan', c[4]), losa: at('losa', c[4]), cemento: at('cemento', c[4]),
  d16: at('dieciseis', c[5]), d19: at('diecinueve', c[5]), otra6: at('otra', c[5]), revuelto: at('revuelto', c[5]),
  gob: at('gobernador', c[6]), lord: at('lord', c[6]), echan: at('echan', c[6]), arena: at('arena', c[6]), marca: at('marca', c[6]), sello: at('sello', c[6]),
  abril: at('abril', c[7]), vuelven: at('vuelven', c[7]), sello2: at('sello', c[7]), intacto: at('intacto', c[7]), arena2: at('arena', c[7]), huella: at('huella', c[7]),
  tirados: at('tirados', c[8]),
  sacan: at('sacan', c[9]), separado: at('separado', c[9]), vacia2: at('vacia', c[9]),
  inund: at('inundaciones', c[10]), temb: at('temblores', c[10]), broma: at('broma', c[10]), hay: at('hay', c[10]), casi: at('casi', c[10]),
  mas: at('mas', c[11]), nadie: at('nadie', c[11]), movia: at('movia', c[11]),
};
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), hv = V(0, 0, 0);

// ---------------- texturas ----------------
const cvCache = new Map();
function texW(kind, opts, w, h, Sz, ox = 0, oy = 0) {
  const key = kind + JSON.stringify(opts);
  if (!cvCache.has(key)) cvCache.set(key, draw[kind](opts));
  const t = new THREE.CanvasTexture(cvCache.get(key)); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / Sz, h / Sz); t.offset.set(ox / Sz, oy / Sz); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function canvasTex(w, h, paint, rep = null) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; paint(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
}
const CORAL = { base: '#e6d0a4', mortar: '#a98d68', rows: 6, cols: 3, seed: 4 };
const CORAL_IN = { base: '#d9be92', mortar: '#8f7354', rows: 6, cols: 3, seed: 9 };
function wallRect(x0, x1, y0, y1, z, opts = CORAL_IN, Sz = 1.3) { return surface(scene, texW('bricks', opts, x1 - x0, y1 - y0, Sz, x0, y0), x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, z); }
// tierra del corte: marrón con piedritas y raíces (la textura usa coordenadas del mundo: empalma entre piezas)
const soilTex = canvasTex(512, 512, (g, W) => {
  const r = rng(21); g.fillStyle = '#6a4a33'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? '#7d5a3f' : '#583b28'; g.beginPath(); g.ellipse(r() * W, r() * W, 14 + r() * 30, 8 + r() * 14, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * W, rr = 7 + r() * 13; g.fillStyle = r() < 0.5 ? '#b9a07c' : '#9c8566'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.75, r() * 3, 0, 7); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 3; g.stroke(); }
}, [0.45, 0.45]);
const soilMat = new THREE.MeshBasicMaterial({ map: soilTex, color: 0xd2c4e8 });
const coralCutTex = canvasTex(512, 512, (g, W) => { const c0 = draw.bricks({ base: '#efdcb4', mortar: '#a98d68', rows: 4, cols: 2, seed: 6 }); g.drawImage(c0, 0, 0, W, W); }, [0.8, 0.8]);
const coralCutMat = new THREE.MeshBasicMaterial({ map: coralCutTex, color: 0xd8d2ee });
const sandTex = canvasTex(512, 256, (g, W, H) => {
  const r = rng(33); g.fillStyle = '#ead7a4'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#d6bf86'; g.lineWidth = 4; for (let y = 10; y < H; y += 22) { g.beginPath(); for (let x = 0; x <= W; x += 16) g.lineTo(x, y + 4 * Math.sin(x * 0.05 + y)); g.stroke(); }
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? '#f6e8bf' : '#cdb57c'; g.fillRect(r() * W, r() * H, 3, 3); }
});
const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
function glowMesh(color, size, op = 0.6) {
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
}

// ---------------- piezas comunes ----------------
const flames = [];
function flame(parent, s = 1, { light = 0, glow = 1 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const gl = glowMesh(0xffa050, 1.5 * s * glow, 0.55); gl.position.set(0, 0.08 * s, 0.03); g.add(gl);
  const fo = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.075 * s, 0.26 * s, 10), basic(0xff7a22)), 0.012 * s); fo.position.y = 0.13 * s; g.add(fo);
  const fi = new THREE.Mesh(new THREE.ConeGeometry(0.042 * s, 0.16 * s, 10), basic(0xffe48a)); fi.position.set(0, 0.1 * s, 0.035 * s); g.add(fi);
  let pl = null; if (light) { pl = new THREE.PointLight(0xffb060, light, 7, 1.3); pl.position.set(0, 0.25, 0.5); g.add(pl); }
  const f = { g, gl, fo, fi, pl, base: light, k: flames.length * 1.37, on: 1 }; flames.push(f); return f;
}
/** Antorcha de mano. */
function handTorch(light = 0) {
  const g = new THREE.Group(); scene.add(g);
  block(g, 0x6b4a2a, -0.022, 0.022, -0.35, 0.12, 0.022, -0.022, 0.01);
  block(g, 0x3a2a1e, -0.045, 0.045, 0.08, 0.18, 0.045, -0.045, 0.01);
  const f = flame(g, 1.0, { light, glow: 1.2 }); f.g.position.y = 0.17; g.userData.f = f; return g;
}
/** Farol de mano con luz. */
function makeLantern(light = 6) {
  const g = new THREE.Group(); scene.add(g);
  block(g, 0x23262d, -0.07, 0.07, -0.3, -0.26, 0.07, -0.07, 0.01); block(g, 0x23262d, -0.06, 0.06, -0.06, -0.02, 0.06, -0.06, 0.01);
  const gls = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), basic(0xffd98a)), 0.012); gls.position.y = -0.16; g.add(gls);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12, PI), basic(0x23262d)); hd.position.y = -0.01; g.add(hd);
  const f = flame(g, 0.4, { light, glow: 3.4 }); f.g.position.y = -0.22; f.fo.visible = f.fi.visible = false; g.userData.f = f;
  return g;
}
const bats = [];
const WING = [[0, 0.02], [0.1, 0.07], [0.22, 0.08], [0.33, 0.03], [0.3, -0.02], [0.24, -0.01], [0.2, -0.07], [0.14, -0.03], [0.08, -0.07], [0.03, -0.03]];
function bat(cx, cy, z, off, rx = 2.2, ry = 0.6, s = 1) {
  const g = new THREE.Group(); g.scale.setScalar(s); scene.add(g);
  const m = new THREE.MeshBasicMaterial({ color: 0x0f0a16, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), m); body.scale.set(1, 1.3, 0.8); g.add(body);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), m); e.position.set(sx * 0.025, 0.085, 0); g.add(e); }
  for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), basic(0xffe25a)); ey.position.set(sx * 0.022, 0.03, 0.05); g.add(ey); }
  const mk = sx => { const w = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(WING.map(([x, y]) => new THREE.Vector2(sx * x, y)))), m); g.add(w); return w; };
  const b = { g, wl: mk(-1), wr: mk(1), cx, cy, z, off, rx, ry }; bats.push(b); return b;
}
function moon(x, y, z, r) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const gl = glowMesh(0xaab6ff, r * 7, 0.55); gl.position.z = -0.05; g.add(gl);
  g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(0xf6efcf)));
  for (const [dx, dy, rr] of [[-0.3, 0.2, 0.18], [0.25, -0.15, 0.24], [0.1, 0.38, 0.1], [-0.2, -0.35, 0.12]]) { const cr = new THREE.Mesh(new THREE.CircleGeometry(r * rr, 20), basic(0xddd3ad)); cr.position.set(dx * r, dy * r, 0.01); g.add(cr); }
  return g;
}
const stars = [];
function starField(cx, list, z) { for (const [x, y, s] of list) { const st = k.glyph('✦', '#fff6d0', 0.32 * s); st.position.set(cx + x, y, z); st.visible = true; st.material.depthTest = true; st.userData.tw = x * 3 + y; stars.push(st); } }
// palmera: tronco curvo con anillos, penacho de hojas que se mece y cocos
const palms = [];
function palm(parent, x, z, { h = 3.4, lean = 0.12, s = 1, seed = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  const r = rng(seed), n = 7, segs = [];
  let px = 0, py = 0;
  for (let i = 0; i < n; i++) {
    const hh = h / n, ang = lean * (1 + i * 0.25);
    const m = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.075 - i * 0.004, 0.09 - i * 0.004, hh * 1.05, 10), flat(i % 2 ? 0x8a6a48 : 0x7a5c3c)), 0.016);
    m.position.set(px + Math.sin(ang) * hh / 2, py + Math.cos(ang) * hh / 2, 0); m.rotation.z = -ang; g.add(m); segs.push(m);
    px += Math.sin(ang) * hh; py += Math.cos(ang) * hh;
  }
  const crown = new THREE.Group(); crown.position.set(px, py, 0); g.add(crown);
  for (let i = 0; i < 8; i++) {
    const f = new THREE.Group(); f.rotation.y = i * 2 * PI / 8 + r() * 0.3; crown.add(f);
    const leaf = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8), flat(i % 2 ? 0x2f7a4a : 0x3f915a)), 0.03);
    leaf.scale.set(1.5, 0.09, 0.32); leaf.position.set(0.62, -0.12, 0); leaf.rotation.z = -0.38 - r() * 0.25; f.add(leaf);
    f.userData.k = r() * 6; f.userData.z0 = leaf.rotation.z; f.userData.leaf = leaf;
  }
  for (let i = 0; i < 3; i++) { const co = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), flat(0x5a3d24)), 0.012); co.position.set(0.09 * Math.cos(i * 2.1), -0.12, 0.09 * Math.sin(i * 2.1)); crown.add(co); }
  palms.push({ g, crown, k: seed * 1.7 });
  return g;
}
// cangrejo de caricatura que camina de costado
const crabs = [];
function crab(parent, x, y, z, { span = 0.8, speed = 0.7, off = 0, s = 1 } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(s); parent.add(g);
  const body = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), flat(0xe0582c)), 0.014); body.scale.set(1.25, 0.55, 0.85); body.position.y = 0.09; g.add(body);
  const legs = [], claws = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.13, 5), INK); l.position.set(sx * (0.12 + 0.015 * i), 0.05, -0.05 + i * 0.05); l.rotation.z = sx * 0.9; g.add(l); legs.push({ l, sx, i }); }
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 5), INK); arm.position.set(sx * 0.1, 0.13, 0.08); arm.rotation.set(0.6, 0, sx * 0.6); g.add(arm);
    const claw = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), flat(0xe86a3a)), 0.01); claw.scale.set(1, 0.8, 1.2); claw.position.set(sx * 0.15, 0.17, 0.12); g.add(claw); claws.push(claw);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 5), INK); st.position.set(sx * 0.04, 0.17, 0.06); g.add(st);
    const eye = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), basic(0xffffff)), 0.006); eye.position.set(sx * 0.04, 0.22, 0.07); g.add(eye);
    const pu = new THREE.Mesh(new THREE.CircleGeometry(0.011, 8), INK); pu.position.set(sx * 0.04, 0.22, 0.097); g.add(pu);
  }
  crabs.push({ g, legs, x, y, z, span, speed, off, claws });
  return g;
}
function gravestone(parent, x, z, { w = 0.55, h = 0.75, color = 0x9aa0b8, cross = false, rot = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.z = rot; parent.add(g);
  if (cross) {
    block(g, color, -0.05, 0.05, 0, h, 0.05, -0.05, 0.014); block(g, color, -0.2, 0.2, h * 0.62, h * 0.74, 0.05, -0.05, 0.014);
  } else {
    block(g, color, -w / 2, w / 2, 0, h - w / 2, 0.07, -0.07, 0.016);
    const top = outlined(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.14, 20, 1, false, -PI / 2, PI), flat(color)), 0.016);
    top.rotation.x = PI / 2; top.position.y = h - w / 2; g.add(top);
    const cr = new THREE.Group(); cr.position.set(0, h * 0.62, 0.072); g.add(cr);
    k.plane(cr, 0x5e6380, 0.035, 0.22, 0, 0, 0); k.plane(cr, 0x5e6380, 0.15, 0.035, 0, 0.04, 0);
    for (let i = 0; i < 2; i++) k.plane(g, 0x6e7390, w * 0.55, 0.025, 0, h * 0.32 - i * 0.08, 0.072);
  }
  // musgo
  const moss = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 6), flat(0x4f8a5a)), 0.01); moss.scale.set(1.6, 0.5, 1); moss.position.set(-w * 0.3, 0.03, 0.06); g.add(moss);
  return g;
}
function church(parent, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  const WALL = 0xe8dcc0, ROOF = 0x4e5274;
  block(g, WALL, -1.7, 1.7, 0, 2.2, -0.2, -3.2, 0.03);                                     // nave
  const roof = new THREE.Shape([new THREE.Vector2(-1.9, 0), new THREE.Vector2(1.9, 0), new THREE.Vector2(0, 1.3)]);
  const rg = new THREE.ExtrudeGeometry(roof, { depth: 3.2, bevelEnabled: false }); rg.translate(0, 0, -3.3);
  const rm = outlined(new THREE.Mesh(rg, flat(ROOF)), 0.04); rm.position.y = 2.2; g.add(rm);
  block(g, WALL, -0.75, 0.75, 0, 4.4, 0.75, -0.3, 0.03);                                   // torre
  block(g, 0xd9cbb0, -0.85, 0.85, 4.4, 4.55, 0.85, -0.4, 0.02);
  for (const [dx, dz] of [[-0.68, 0.68], [0, 0.68], [0.68, 0.68], [-0.68, -0.22], [0.68, -0.22]]) block(g, 0xe8dcc0, dx - 0.13, dx + 0.13, 4.55, 4.85, dz + 0.12, dz - 0.12, 0.016);
  const lit = (w, h, px, py, pz) => picture(g, w, h, px, py, pz, (q, W, H) => {
    q.fillStyle = '#1e1428'; q.beginPath(); q.moveTo(0, H); q.lineTo(0, W / 2); q.arc(W / 2, W / 2, W / 2, PI, 0); q.lineTo(W, H); q.fill();
    q.fillStyle = '#ffcf6a'; q.beginPath(); q.moveTo(14, H - 14); q.lineTo(14, W / 2); q.arc(W / 2, W / 2, W / 2 - 14, PI, 0); q.lineTo(W - 14, H - 14); q.fill();
    q.strokeStyle = '#1e1428'; q.lineWidth = 10; q.beginPath(); q.moveTo(W / 2, 20); q.lineTo(W / 2, H); q.moveTo(0, H * 0.6); q.lineTo(W, H * 0.6); q.stroke();
  });
  lit(0.42, 0.8, 0, 3.3, 0.76); lit(0.42, 0.8, -1.2, 1.25, -0.19); lit(0.42, 0.8, 1.2, 1.25, -0.19);
  picture(g, 0.62, 1.05, 0, 0.53, 0.76, (q, W, H) => { q.fillStyle = '#1e1428'; q.beginPath(); q.moveTo(0, H); q.lineTo(0, W / 2); q.arc(W / 2, W / 2, W / 2, PI, 0); q.lineTo(W, H); q.fill(); q.fillStyle = '#6b3f24'; q.beginPath(); q.moveTo(12, H); q.lineTo(12, W / 2); q.arc(W / 2, W / 2, W / 2 - 12, PI, 0); q.lineTo(W - 12, H); q.fill(); q.fillStyle = '#ffd23a'; q.beginPath(); q.arc(W * 0.7, H * 0.65, 8, 0, 7); q.fill(); });
  for (const [px, py, pz] of [[0, 3.3, 0.9], [-1.2, 1.25, 0.1], [1.2, 1.25, 0.1]]) { const gl = glowMesh(0xffc060, 1.3, 0.35); gl.position.set(px, py, pz); g.add(gl); }
  // cruz en la punta de la nave
  block(g, 0xd9cbb0, -0.04, 0.04, 3.45, 4.0, -2.9, -3.0, 0.012); block(g, 0xd9cbb0, -0.16, 0.16, 3.75, 3.83, -2.9, -3.0, 0.012);
  return g;
}
const fireflies = [];
function fireflyCloud(cx, cy, cz, n, spread = [5, 1.5, 2], seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); scene.add(g);
    g.add(glowMesh(0xd8ff7a, 0.32, 0.8)); const dot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 8), basic(0xf4ffb0)); dot.position.z = 0.01; g.add(dot);
    fireflies.push({ g, x: cx + (r() - 0.5) * spread[0], y: cy + (r() - 0.5) * spread[1], z: cz + (r() - 0.5) * spread[2], k: r() * 9, sp: 0.4 + r() * 0.5 });
  }
}

// =====================================================================================
// BÓVEDA EN CORTE (x = 0)
// =====================================================================================
const gB = new THREE.Group(); scene.add(gB);
const RX0 = -2.45, RX1 = 2.45, WT = 0.3, ZB = -1.4, CEIL = 2.2;          // interior de la bóveda
const SX0 = -5.0, SX1 = -2.75;                                            // fosa de la escalera
const stairY = x => x >= SX1 ? 0 : x <= SX0 ? S : (SX1 - x) / (SX1 - SX0) * S;

// interior: pared del fondo, pared derecha, techo, piso de piedra
wallRect(RX0, RX1, 0, CEIL, ZB, CORAL_IN);
{ const m = surface(gB, texW('bricks', CORAL_IN, CZ - ZB, CEIL, 1.3), CZ - ZB, CEIL, RX1, CEIL / 2, (CZ + ZB) / 2); m.rotation.y = -PI / 2; }
{ const m = surface(gB, texW('bricks', CORAL_IN, CZ - ZB, CEIL - 1.75, 1.3), CZ - ZB, CEIL - 1.75, RX0, (CEIL + 1.75) / 2, (CZ + ZB) / 2); m.rotation.y = PI / 2; }
{ const m = surface(gB, texW('tiles', { base: '#b8a27e', line: '#8a7458', n: 3 }, RX1 - RX0, CZ - ZB, 1.2), RX1 - RX0, CZ - ZB, 0, CEIL - 0.001, (CZ + ZB) / 2); m.rotation.x = PI / 2; m.material.color.set(0x9a8e86); }
surface(gB, texW('tiles', { base: '#c7b28e', line: '#8f7a5c', n: 3, seed: 8 }, 7, CZ - ZB + 0.2, 1.1), 7.5, CZ - ZB, -1.3, 0.002, (CZ + ZB) / 2, true);
// fosa de la escalera: pared del fondo y escalones de coral
wallRect(SX0 - 0.5, RX0, 0, S, -1.0, CORAL_IN);
for (let i = 1; i <= 6; i++) {
  const xr = SX1 - (i - 1) * 0.375, xl = SX1 - i * 0.375, y = i * S / 6.1;
  block(gB, 0xd8c39b, xl, xr, 0, y, -1.0, CZ - 0.02, 0.016);
}
// relieves del interior: nichos, telarañas, una cruz tallada y una urna
block(gB, 0xc9ae84, -0.6, 0.6, 1.55, 1.62, ZB + 0.12, ZB, 0.012);
{ const cr = new THREE.Group(); cr.position.set(0, 1.85, ZB + 0.01); gB.add(cr); block(cr, 0xb69a70, -0.04, 0.04, -0.22, 0.22, 0.05, 0, 0.01); block(cr, 0xb69a70, -0.15, 0.15, 0.04, 0.11, 0.05, 0, 0.01); }
const cobweb = (x, y, sx) => { const g = new THREE.Group(); g.position.set(x, y, ZB + 0.02); g.scale.x = sx; gB.add(g);
  const m = new THREE.MeshBasicMaterial({ color: 0xf0eefc, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * PI / 8, l = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.012), m); l.geometry.translate(0.275, 0, 0); l.rotation.z = a + PI; g.add(l); }
  for (const rr of [0.18, 0.32, 0.46]) { const arc = new THREE.Mesh(new THREE.RingGeometry(rr, rr + 0.012, 16, 1, PI, PI / 2), m); g.add(arc); }
  return g; };
const webs = [cobweb(RX1 - 0.02, CEIL - 0.02, 1), cobweb(RX0 + 0.02, CEIL - 0.02, -1)];
// el corte: tierra con piedras, bandas de coral (paredes, techo, piso) y la losa de mármol
const cut = new THREE.Group(); gB.add(cut); cut.position.z = CZ;
const soilPoly = pts => { const g = k.poly(cut, pts, soilMat, 0.06); return g; };
soilPoly([[-16, -3], [16, -3], [16, -0.3], [-16, -0.3]]);
soilPoly([[RX1 + WT, -0.3], [16, -0.3], [16, S], [RX1 + WT, S]]);
{ const pts = [[-16, -0.3], [SX1, -0.3], [SX1, 0]]; for (let i = 1; i <= 6; i++) { const y = i * S / 6.1; pts.push([SX1 - (i - 1) * 0.375, y], [SX1 - i * 0.375, y]); } pts.push([SX0 - 0.25, S], [-16, S]); soilPoly(pts); }
const coralPoly = pts => k.poly(cut, pts, coralCutMat, 0.05);
const cutWalls = [coralPoly([[RX0 - WT, -0.3], [RX1 + WT, -0.3], [RX1 + WT, 0], [RX0 - WT, 0]]),
  coralPoly([[RX1, 0], [RX1 + WT, 0], [RX1 + WT, CEIL], [RX1, CEIL]]),
  coralPoly([[RX0 - WT, 1.75], [RX0, 1.75], [RX0, CEIL], [RX0 - WT, CEIL]]),
  coralPoly([[RX0 - WT, CEIL], [RX1 + WT, CEIL], [RX1 + WT, S], [RX0 - WT, S]])];
cutWalls.forEach(g => { g.position.z = 0.003; });
// pasto en el borde del corte
for (const [x0, x1] of [[-16, SX0 - 0.25], [RX1 + WT, 16]]) { const m = k.plane(cut, 0x3f7a4a, x1 - x0, 0.12, (x0 + x1) / 2, S - 0.03, 0.006); }
// raíces colgando en la tierra
{ const r = rng(5); for (let i = 0; i < 14; i++) { const x = (r() < 0.5 ? -15 + r() * 9 : 3.2 + r() * 11), y0 = S - 0.1, pts = [[x, y0]]; let xx = x, yy = y0; for (let j = 0; j < 4; j++) { xx += (r() - 0.5) * 0.3; yy -= 0.18 + r() * 0.2; pts.push([xx, yy]); } k.stroke(cut, pts, 0.035, false, 0.008); } }
// techo de la bóveda sobre el suelo (la parte que asoma) con cruz y placa
const cap = new THREE.Group(); gB.add(cap);
block(cap, 0xe8d5ad, RX0 - WT - 0.1, RX1 + WT + 0.1, S - 0.02, S + 0.42, -1.75, CZ - 0.01, 0.025);
block(cap, 0xd8c39b, RX0 - WT, RX1 + WT, S + 0.42, S + 0.55, -1.6, CZ - 0.1, 0.02);
{ const pl = k.sign('CHASE', 1.0, 0.28, { bg: '#f1e6cc', fg: '#3a2a4a' }); pl.position.set(0, S + 0.2, CZ + 0.003); cap.add(pl); }
block(cap, 0xe8d5ad, -0.05, 0.05, S + 0.55, S + 1.25, -0.4, -0.5, 0.014); block(cap, 0xe8d5ad, -0.24, 0.24, S + 0.98, S + 1.07, -0.4, -0.5, 0.014);
// suelo del cementerio (con agujero en la fosa y sobre la bóveda)
const GRASS = { base: '#3f7a4f', blade: '#2f6340', light: '#5a9a62', seed: 12 };
const ground = (x0, x1, z0, z1) => surface(gB, texW('grass', GRASS, x1 - x0, z1 - z0, 1.6, x0, z0), x1 - x0, z1 - z0, (x0 + x1) / 2, S, (z0 + z1) / 2, true);
ground(-16, SX0 - 0.25, -14, CZ); ground(SX0 - 0.25, 16, -14, -1.75); ground(RX1 + WT + 0.1, 16, -1.75, CZ); ground(SX0 - 0.25, RX0 - WT - 0.1, -1.75, -1.0);
// la losa de mármol (se corre hacia atrás para abrir) con cemento y sello
const slab = new THREE.Group(); gB.add(slab);
block(slab, 0xf2eee6, SX0 - 0.15, SX1 + 0.12, S - 0.02, S + 0.17, -1.0, CZ - 0.005, 0.022);
for (const [x0, x1, z0, z1] of [[-4.6, -3.9, 0.2, 0.0], [-3.5, -3.1, -0.4, -0.55]]) k.stroke(slab, [[x0, z0], [x1, z1]], 0.02, false, 0);
slab.children.slice(-2).forEach(m => { m.position.z = m.position.y; m.position.y = S + 0.175; m.rotation.x = -PI / 2; });
const cement = [];
for (const [x0, x1, z0, z1] of [[SX0 - 0.17, SX1 + 0.14, CZ - 0.04, CZ + 0.01], [SX0 - 0.2, SX0 - 0.13, -1.0, CZ], [SX1 + 0.1, SX1 + 0.17, -1.0, CZ]]) {
  const m = block(gB, 0x9a9aa8, x0, x1, S - 0.01, S + 0.07, z0, z1, 0.01); cement.push(m);
}
const sealTex = canvasTex(128, 128, (g) => { g.fillStyle = '#b3202c'; g.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * 2 * PI, r = i % 2 ? 56 : 62; g.lineTo(64 + r * Math.cos(a), 64 + r * Math.sin(a)); } g.fill(); g.strokeStyle = '#7a1018'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 40, 0, 7); g.stroke(); g.fillStyle = '#ffd9a0'; g.font = '800 54px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('C', 64, 68); });
const seal = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ map: sealTex, transparent: true })); seal.rotation.x = -PI / 2; gB.add(seal);
const SEAL_P = V(SX0 + 0.45, S + 0.19, 0.45);
// arena del piso (se desparrama de derecha a izquierda)
const sandG = new THREE.PlaneGeometry(RX1 - RX0, CZ - ZB); sandG.translate(-(RX1 - RX0) / 2, 0, 0);
const sand = new THREE.Mesh(sandG, new THREE.MeshLambertMaterial({ map: sandTex })); sand.rotation.x = -PI / 2; sand.position.set(RX1, 0.006, (CZ + ZB) / 2); sand.receiveShadow = true; gB.add(sand);
// oscuridad de la tumba cerrada (un velo negro delante del interior)
const darkM = new THREE.MeshBasicMaterial({ color: 0x07050f, transparent: true, opacity: 0, depthWrite: false });
const darkVeil = new THREE.Mesh(new THREE.PlaneGeometry(RX1 - RX0 + 0.02, CEIL + 0.02), darkM); darkVeil.position.set(0, CEIL / 2, CZ - 0.01); darkVeil.renderOrder = 3; gB.add(darkVeil);
// agua de la inundación (hipótesis)
const waterM = new THREE.MeshBasicMaterial({ color: 0x3f86d6, transparent: true, opacity: 0.55, depthWrite: false });
const waterFront = new THREE.Mesh(new THREE.PlaneGeometry(RX1 - RX0, 1), waterM); waterFront.geometry.translate(0, 0.5, 0); waterFront.position.set(0, 0, CZ - 0.015); waterFront.renderOrder = 4; gB.add(waterFront);
const waterTop = new THREE.Mesh(new THREE.PlaneGeometry(RX1 - RX0, CZ - ZB), new THREE.MeshBasicMaterial({ color: 0x7fc0f0, transparent: true, opacity: 0.6, depthWrite: false })); waterTop.rotation.x = -PI / 2; waterTop.position.z = (CZ + ZB) / 2; waterTop.renderOrder = 4; gB.add(waterTop);
const waveLine = new THREE.Group(); gB.add(waveLine);
for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16, 0, PI), new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.8 })); m.position.set(RX0 + 0.2 + i * 0.41, 0, CZ - 0.012); m.scale.y = 0.35; waveLine.add(m); }
// fondo de noche: colinas, iglesia, palmeras, tumbas, luna, estrellas
k.plane(gB, 0x141a44, 70, 14, 0, S + 3, -22);
for (const [dx, r, col] of [[-9, 7, 0x1c2350], [1, 8.5, 0x18204a], [10, 6.5, 0x202856]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(col)); h.scale.y = 0.42; h.position.set(dx, S, -18); gB.add(h); }
moon(4.2, 9.6, -17, 1.0);
starField(0, [[-4, 11.5, 0.8], [-1.5, 12.4, 0.6], [1.2, 11.2, 0.7], [6.5, 12, 0.6], [-7, 10.4, 0.7], [2.6, 13, 0.5], [-3, 9.6, 0.5], [7.8, 9.8, 0.6], [-9, 12.5, 0.6], [0, 10.2, 0.4]], -16.5);
const gChurchB = new THREE.Group(); gChurchB.position.y = S; gB.add(gChurchB);
church(gChurchB, -4.6, -8.5, 1.05);
const gSurfB = new THREE.Group(); gSurfB.position.y = S; gB.add(gSurfB);
palm(gSurfB, -9.7, -3.0, { h: 3.6, lean: 0.14, seed: 1 }); palm(gSurfB, 5.7, -3.1, { h: 3.9, lean: -0.13, seed: 2 }); palm(gSurfB, 8.4, -5.5, { h: 3.4, lean: 0.1, seed: 3 });
palm(gSurfB, -12.5, -5, { h: 3.2, lean: -0.12, seed: 4 }); palm(gSurfB, 1.8, -7, { h: 3.6, lean: 0.12, seed: 5 });
const gravesB = [];
for (const [x, z, o] of [[-7.0, -3.2, {}], [-8.2, -4.6, { cross: true, h: 1.0 }], [3.6, -3.0, { rot: 0.05 }], [4.6, -4.4, { cross: true, h: 0.9 }], [6.6, -2.4, { w: 0.6, h: 0.8 }], [-6.0, -5.4, { cross: true }], [7.4, -4.0, { rot: -0.06 }], [-10.6, -3.4, {}], [3.4, -1.1, { w: 0.5, h: 0.65 }]]) gravesB.push(gravestone(gSurfB, x, z, o));
// tumbas nuevas (cuando los entierran por separado)
const newGraves = [[-8.4, -2.2], [-7.6, -2.6], [-6.6, -2.2], [-5.8, -2.6], [-9.2, -2.6], [-8.0, -1.6]].map(([x, z]) => { const g = gravestone(gSurfB, x, z, { cross: true, h: 0.75, color: 0xe3dccb }); g.visible = false; return g; });
crab(gSurfB, 4.0, 0, 0.45, { span: 1.0, speed: 0.6, off: 0 }); crab(gSurfB, -8.4, 0, 0.55, { span: 0.8, speed: 0.8, off: 2, s: 0.85 }); crab(gSurfB, 6.5, 0, -0.2, { span: 0.7, speed: 0.5, off: 4, s: 0.8 });
crab(gB, 1.6, 0.0, 0.55, { span: 0.6, speed: 0.55, off: 1, s: 0.7 });                         // uno adentro de la bóveda (al final)
bat(-1.5, 6.6, -3, 0, 3.2, 0.7); bat(2.5, 7.4, -4, 2.1, 2.6, 0.5, 0.9); bat(-6, 7.8, -5, 4.0, 2.2, 0.6, 0.8);
const roomBat = bat(0, 1.4, -0.4, 1.0, 1.8, 0.35, 0.9);
fireflyCloud(-1, S + 1.2, -1.5, 12, [14, 1.6, 3], 7);
// polvo que flota en el interior
const motes = Array.from({ length: 14 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.018, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.4 })); m.userData.off = i / 14; gB.add(m); return m; });

// ---------------- ataúdes ----------------
// tamaño [largo, ancho, alto], color: plomo (gris azulado) o madera (el de Mrs. Goddard)
const SPEC = [
  [0.8, 0.3, 0.22, 'lead'], [0.8, 0.3, 0.22, 'lead'], [1.2, 0.42, 0.3, 'wood'], [1.3, 0.46, 0.32, 'lead'], [0.62, 0.25, 0.19, 'lead'], [1.2, 0.42, 0.3, 'lead'],
];
function makeCoffin([L, w, h, kind]) {
  const g = new THREE.Group(); gB.add(g);
  const shp = sc => new THREE.Shape([[-L / 2, -0.3 * w], [0.2 * L, -0.5 * w], [L / 2, -0.36 * w], [L / 2, 0.36 * w], [0.2 * L, 0.5 * w], [-L / 2, 0.3 * w]].map(([x, y]) => new THREE.Vector2(x * sc, y * sc)));
  const body = new THREE.ExtrudeGeometry(shp(1), { depth: h - 0.05, bevelEnabled: false }); body.rotateX(PI / 2); body.translate(0, h / 2 - 0.05, 0);
  const lid = new THREE.ExtrudeGeometry(shp(1.05), { depth: 0.06, bevelEnabled: false }); lid.rotateX(PI / 2); lid.translate(0, h / 2 + 0.01, 0);
  const col = kind === 'wood' ? [0x9a6638, 0x7a4b2a] : [0x8c97ab, 0x6c7790];
  g.add(outlined(new THREE.Mesh(body, flat(col[0])), 0.018)); g.add(outlined(new THREE.Mesh(lid, flat(col[1])), 0.018));
  const top = h / 2 + 0.012;
  // cruz y remaches en la tapa
  const cr = new THREE.Group(); cr.position.set(0.05 * L, top + 0.002, 0); cr.rotation.x = -PI / 2; g.add(cr);
  const gold = basic(kind === 'wood' ? 0xe8c060 : 0xd9dde8);
  cr.add(new THREE.Mesh(new THREE.PlaneGeometry(L * 0.42, 0.04), gold)); { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.04, w * 0.5), gold); v.position.x = L * 0.08; cr.add(v); }
  if (kind !== 'wood') for (let i = 0; i < 7; i++) { const x = -L / 2 + 0.08 + i * (L - 0.16) / 6, hw = lerp(0.3 * w, 0.5 * w, Math.min(1, (x + L / 2) / (0.7 * L))) * 0.88;
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), basic(0x3a4256)); r.position.set(x, top - 0.01, s * hw); g.add(r); } }
  // asas a los costados
  g.userData = { L, w, h };
  return g;
}
const coffins = SPEC.map(makeCoffin);
const HB = 0.31;                                                    // altura de un ataúd grande (para apilar los chicos)
// [x, base, z, ry, rz (parado), rx (volcado)]
const ORDER0 = { 2: [-0.2, 0, -0.85, 0, 0, 0], 1: [-0.2, HB, -0.85, 0.06, 0, 0], 0: [1.3, 0, -0.85, 0, 0, 0] };
const SC1 = { 2: [-0.35, 0, -0.8, 0.35, 0, 0], 1: [0.75, 0, -0.5, -0.5, 0, PI], 0: [1.95, 0, -1.05, 0, 1.2, 0] };
const ORDER1 = { 2: [-0.2, 0, -0.85, 0, 0, 0], 1: [-0.2, HB, -0.85, 0.06, 0, 0], 3: [1.4, 0, -0.02, 0, 0, 0], 0: [1.4, 0.33, -0.02, -0.05, 0, 0] };
const SC2 = { 3: [1.15, 0, -0.6, 0.5, 0, 0], 2: [-0.65, 0, -0.95, -0.25, 0, 0], 0: [0.25, 0, -0.25, 1.2, 0, PI], 1: [-1.75, 0, -0.95, 0, 1.15, 0], 4: [2.0, 0, -0.15, -0.8, 0, 0] };
const ORDER2 = { 5: [-1.6, 0, -0.85, 0, 0, 0], 4: [-1.6, HB, -0.85, 0.05, 0, 0], 2: [-0.1, 0, -0.85, 0, 0, 0], 1: [-0.1, HB, -0.85, -0.05, 0, 0], 3: [1.45, 0, -0.85, 0, 0, 0], 0: [1.45, 0.33, -0.85, 0.04, 0, 0] };
const SC3 = { 5: [-1.35, 0, -0.55, 0.6, 0, 0], 4: [-0.35, 0, -0.15, 2.0, 0, PI], 2: [0.45, 0, -1.0, -0.2, 0, 0.5], 1: [1.35, 0, -0.3, 0.9, 0, 0], 3: [1.6, 0, -1.05, 0.12, 0, 0], 0: [-2.0, 0, -1.1, 0, 1.2, 0] };
const SC4 = { 5: [-0.25, 0, -1.0, 0.45, 0, PI], 2: [0.5, 0, -0.35, -0.55, 0, 0.5], 1: [1.1, 0, -1.1, 0.25, 0, 0], 4: [-0.2, 0, 0.0, 2.4, 0, 0], 0: [1.75, 0, -0.1, 0.3, 1.2, 0], 3: [1.55, 0, -0.85, 0.0, 0.85, 0] };
const halfY = (i, rz, rx) => { const { L, w, h } = coffins[i].userData, hh = h / 2 + 0.05; return (L / 2) * Math.abs(Math.sin(rz)) + (hh * Math.abs(Math.cos(rx)) + (w / 2) * Math.abs(Math.sin(rx))) * Math.abs(Math.cos(rz)); };
function placeCoffin(i, s, { dy = 0, sq = 1, sc = 1, wob = 0 } = {}) {
  const g = coffins[i]; if (!s || sc < 0.01) { g.visible = false; return; }
  const [x, base, z, ry, rz, rx] = s;
  g.visible = true; g.rotation.set(rx, ry + wob, rz, 'YZX');
  g.position.set(x, base + halfY(i, rz, rx) * sq + dy, z);
  g.scale.set(sc / Math.sqrt(sq), sc * sq, sc / Math.sqrt(sq));
}
const mixS = (a, b, u) => a && b ? a.map((v, j) => j >= 3 ? lerp(v, b[j], u) : lerp(v, b[j], u)) : (u < 0.5 ? a : b);

// =====================================================================================
// CEMENTERIO (x = 40): las explicaciones
// =====================================================================================
const gA = new THREE.Group(); scene.add(gA);
surface(gA, texW('grass', GRASS, 34, 26, 1.6, AX - 17, -13), 34, 26, AX, 0.001, 0, true);
{ const path = surface(gA, texW('cobble', { base: '#b8ad94', line: '#7d7464', rows: 6, cols: 4 }, 1.6, 14, 1.0), 1.6, 14, AX + 0.2, 0.004, -5, true); path.material.color.set(0xb9b4c8); }
k.plane(gA, 0x141a44, 70, 14, AX, 3, -22);
for (const [dx, r, col] of [[-8, 7, 0x1c2350], [2, 8.5, 0x18204a], [10, 6.5, 0x202856]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(col)); h.scale.y = 0.42; h.position.set(AX + dx, 0, -18); gA.add(h); }
moon(AX + 3.2, 7.6, -16, 0.9);
starField(AX, [[-3, 9, 0.8], [-1, 10, 0.6], [1.6, 8.6, 0.7], [5, 9.6, 0.6], [-5.5, 8, 0.7], [3, 11, 0.5], [-2.2, 7.4, 0.5]], -15.5);
church(gA, AX + 0.2, -7.5, 1.15);
palm(gA, AX - 3.3, -1.2, { h: 3.6, lean: 0.15, seed: 6 }); palm(gA, AX + 3.3, -2.4, { h: 3.8, lean: -0.13, seed: 7 }); palm(gA, AX + 5.6, -4.6, { h: 3.4, lean: 0.1, seed: 8 }); palm(gA, AX - 5.4, -4.8, { h: 3.3, lean: -0.1, seed: 9 });
const gravesA = [];
for (const [x, z, o] of [[-2.0, -2.6, {}], [-1.2, -3.6, { cross: true, h: 1.0 }], [1.7, -3.0, { w: 0.6, h: 0.85 }], [2.7, -1.3, { cross: true, h: 0.95 }], [-2.6, -0.9, { w: 0.5, h: 0.7 }], [0.9, -4.6, {}], [-3.6, -3.4, { cross: true }]]) gravesA.push(gravestone(gA, AX + x, z, o));
const prankStone = gravestone(gA, AX + 1.35, -0.25, { w: 0.78, h: 1.0 });
gravesA.push(prankStone);
crab(gA, AX + 2.3, 0, 0.7, { span: 0.9, speed: 0.7, off: 1 }); crab(gA, AX - 2.2, 0, 0.9, { span: 0.7, speed: 0.6, off: 3, s: 0.85 });
bat(AX - 1, 4.8, -3, 1.3, 3, 0.6); bat(AX + 2, 5.6, -4, 3.3, 2.4, 0.5, 0.85);
fireflyCloud(AX, 1.2, -1.2, 9, [8, 1.4, 2.5], 11);
// grietas del temblor
const cracks = new THREE.Group(); cracks.rotation.x = -PI / 2; cracks.position.set(AX - 0.2, 0.012, 1.0); gA.add(cracks);
k.stroke(cracks, [[-1.4, 0.2], [-0.8, -0.05], [-0.3, 0.15], [0.3, -0.1], [0.9, 0.12], [1.5, -0.08]], 0.05, false, 0);
k.stroke(cracks, [[-0.3, 0.15], [-0.15, 0.55], [0.05, 0.75]], 0.035, false, 0); k.stroke(cracks, [[0.9, 0.12], [1.1, -0.35]], 0.035, false, 0);
// libro de registros (casi vacío)
const book = new THREE.Group(); scene.add(book);
block(book, 0x6b2a2a, -0.24, 0.24, -0.015, 0.0, 0.17, -0.17, 0.01);
const pageL = k.plane(book, 0xf4eedc, 0.22, 0.3, -0.115, 0.004, 0); pageL.rotation.x = -PI / 2;
const pageR = new THREE.Group(); pageR.position.y = 0.006; book.add(pageR); { const p = k.plane(pageR, 0xf4eedc, 0.22, 0.3, 0.115, 0, 0); p.rotation.x = -PI / 2; }
k.plane(book, 0x8a7a66, 0.12, 0.012, -0.12, 0.006, -0.09).rotation.x = -PI / 2;
const flyPapers = Array.from({ length: 3 }, () => { const p = k.plane(scene, 0xf4eedc, 0.2, 0.26, 0, 0, 0); p.material = new THREE.MeshBasicMaterial({ color: 0xf4eedc, side: THREE.DoubleSide }); p.visible = false; return p; });

// ---------------- personajes ----------------
const rector = makeToon({ shirt: 0x2b2b3a, hair: 0xd8d8e0, detail: ['collar', 'buttons'], trim: 0xffffff }); scene.add(rector.root);
const gov = makeToon({ shirt: 0xb02a3a, hair: 0x6b4a2a, mustache: true, detail: ['buttons', 'belt', 'collar'], trim: 0xf4f1e8 }); scene.add(gov.root);
{ // bicornio y charreteras del gobernador
  const hat = new THREE.Group(); hat.position.y = 0.24; gov.head.add(hat);
  const bc = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 28, 1, false, -PI / 2, PI), flat(0x1e1d2a)), 0.02); bc.rotation.set(-PI / 2, 0, 0); bc.scale.set(1, 1, 0.6); bc.position.set(0, 0.0, 0); hat.add(bc);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.014, 6, 28, PI), basic(0xd9a441)); trim.scale.set(1, 0.6, 1); trim.position.set(0, 0.02, 0.045); hat.add(trim);
  const ck = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), flat(0xf4f1e8)), 0.01); ck.position.set(0.18, 0.12, 0.05); hat.add(ck);
  const body = gov.root.children[0];
  for (const s of [-1, 1]) { const ep = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), flat(0xd9a441)), 0.012); ep.scale.set(1.2, 0.45, 1); ep.position.set(s * 0.17, 1.06, 0); body.add(ep); }
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 24), basic(0x2a3f9a)); sash.rotation.set(PI / 2 - 0.0, 0.55, 0); sash.position.y = 0.86; body.add(sash);
}
const bOpts = [
  { shirt: 0xc9b48a, skin: 0x8d5a3b, hair: 0x1b1410, detail: ['belt'] },
  { shirt: 0x5f7a5a, skin: 0xf0c8a0, hair: 0x6b4a2a, hat: { type: 'boater', color: 0xe8d08a, band: 0x8f2433 }, detail: ['belt'] },
  { shirt: 0x8a6a4a, skin: 0x6b4430, hair: 0x1b1410, detail: ['belt', 'collar'], trim: 0xe9dcc4 },
  { shirt: 0x4a6a8a, skin: 0xc8946a, hair: 0x23262d, mustache: true, detail: ['belt'] },
];
const bearers = bOpts.map(o => { const t = makeToon(o); scene.add(t.root); return t; });
const prank = makeToon({ shirt: 0xd9b23a, skin: 0xb07850, hair: 0x23262d, hat: { type: 'boater', color: 0xe8d08a, band: 0x3f6ea8 }, detail: ['buttons', 'collar'], trim: 0xf4f1e8 });
scene.add(prank.root);
const skeptic = makeToon({ shirt: 0x6a4a8a, hair: 0xb9b9c4, hat: { type: 'top', color: 0x23262d, band: 0x8f2433 }, detail: ['collar', 'tie', 'buttons'], trim: 0xf4f1e8 }); scene.add(skeptic.root);
const ALL = [rector, gov, ...bearers, prank, skeptic];
// gente de fondo con antorchas
const wTorches = [];
const surfWalker = (cx, z, off, dir, toon, yy) => {
  const w = k.walker({ toon, cx, z, speed: 0.55, off, dir, span: 14, pose: (t, px) => ({ y: yy, handR: V(px + dir * 0.32, yy + 1.12, z + 0.3), wR: 1 }) });
  const tr = handTorch(0); wTorches.push({ w, tr }); return w;
};
surfWalker(-2, -2.3, 0, 1, { shirt: 0x7a2f3e, skin: 0x8d5a3b, hair: 0x1b1410, detail: ['belt'] }, S);
surfWalker(1, -3.9, 7, -1, { shirt: 0x3f6ea8, skin: 0xf0c8a0, hair: 0xc98a3a, hat: { type: 'boater', color: 0xe8d08a, band: 0x7a2f3e } }, S);
surfWalker(AX, -2.05, 3, 1, { shirt: 0x2f6b4f, skin: 0x6b4430, hair: 0x1b1410, detail: ['belt'] }, 0);
// utilería en manos
const lantern = makeLantern(7);
const torchB1 = handTorch(3.5);
const sack = new THREE.Group(); scene.add(sack);
{ const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), flat(0xb08a5a)), 0.016); b.scale.set(1, 1.15, 0.9); b.position.y = -0.12; sack.add(b);
  const nk = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.1, 10), flat(0xb08a5a)), 0.01); nk.position.y = 0.04; sack.add(nk); }
const sandBits = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), basic(0xead7a4)); m.visible = false; scene.add(m); return m; });
const stamp = new THREE.Group(); scene.add(stamp);
block(stamp, 0xd9a441, -0.05, 0.05, -0.05, 0, 0.05, -0.05, 0.01); block(stamp, 0x4a3222, -0.018, 0.018, 0, 0.14, 0.018, -0.018, 0.008);
const trowel = new THREE.Group(); scene.add(trowel);
block(trowel, 0xb9bec8, -0.09, 0.09, -0.01, 0.0, 0.06, -0.06, 0.008); block(trowel, 0x6b4a2a, -0.015, 0.015, 0.0, 0.14, 0.015, -0.015, 0.008);
// signos
const qMarks = Array.from({ length: 4 }, () => k.glyph('?', '#ffd23a', 0.46));
const bangs = Array.from({ length: 3 }, () => k.glyph('!', '#ffd23a', 0.5));
const okMark = k.glyph('✓', '#59c36a', 0.55), xMark = k.glyph('✗', '#ff5a5a', 0.6);
const jas = [k.glyph('JA', '#ffd23a', 0.42), k.glyph('JA', '#ffd23a', 0.34)];
const sparks = Array.from({ length: 5 }, () => k.glyph('✦', '#fff1a8', 0.26));
const sweat = Array.from({ length: 4 }, () => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const puffA = k.puffs(5), puffB = k.puffs(5), puffC = k.puffs(5), puffD = k.puffs(5), puffE = k.puffs(5);

// ---------------- recorridos ----------------
/** Posición a lo largo de una lista [[t, x], ...] con caminata: devuelve {x, walk, dir}. */
function path(t, pts) {
  if (t <= pts[0][0]) return { x: pts[0][1], walk: 0, dir: Math.sign(pts[1][1] - pts[0][1]) || 1 };
  for (let i = 1; i < pts.length; i++) {
    const [t0, x0] = pts[i - 1], [t1, x1] = pts[i];
    if (t <= t1) { const u = lin(t, t0, t1); return { x: lerp(x0, x1, u), walk: x1 !== x0 ? win(t, t0 - 0.02, t1 + 0.1, 0.1) : 0, dir: Math.sign(x1 - x0) || 1, v: Math.abs(x1 - x0) / (t1 - t0), t1 }; }
  }
  const n = pts.length; return { x: pts[n - 1][1], walk: 0, dir: Math.sign(pts[n - 1][1] - pts[n - 2][1]) || 1, t1: pts[n - 1][0] };
}
const head = { r: V(0, 0, 0), g: V(0, 0, 0), b: [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)], p: V(0, 0, 0), s: V(0, 0, 0) };
const cam3 = (x, y) => V(x, y + 1.35, 9);                                    // mirar a cámara

// los cargadores con el ataúd de Thomas Chase (F3-F4)
const CARRY = [[9.0, -8.9], [T.abren + 0.3, -6.3], [T.y1 - 0.15, -1.2], [T.y1 + 0.2, -0.75], [T.mover - 0.6, -0.75], [T.mover + 0.15, 1.4]];
const SETDOWN = T.mover + 0.15;
const BZ = [0.45, -0.5, 0.45, -0.5], BDX = [0.82, 0.82, -0.82, -0.82];
function carryState(t) {
  const p = path(t, CARRY), xc = p.x;
  const xb = xc - 0.82, xf = xc + 0.82, yb = stairY(xb), yf = stairY(xf);
  const down = prog(t, SETDOWN, SETDOWN + 0.35), strain = t > T.cajones - 0.2 && t < T.mover ? 1 : 0;
  const lift = lerp(0.92 + 0.03 * Math.sin(t * 9) * strain - 0.05 * strain, 0.21, down);
  return { p, xc, cy: (yb + yf) / 2 + lift, rz: Math.atan2(yf - yb, 1.64) * (1 - down), down, strain };
}

function poseBearers(t) {
  bearers.forEach((b, i) => {
    let p = null;
    if (t >= 8.6 && t < (i < 2 ? T.sellan : T.acomodan + 0.05)) {                         // cargan el ataúd
      const cs = carryState(t), x = cs.xc + BDX[i], y = stairY(x), z = BZ[i];
      const hx = cs.xc + BDX[i] * 0.78, hy = cs.cy + Math.sin(cs.rz) * BDX[i] * 0.78 + 0.02;
      const walking = cs.p.walk > 0.05 && t < SETDOWN;
      p = { x, y, z, face: walking ? (cs.p.dir > 0 ? PI / 2 : -PI / 2) * 0.75 : (i < 2 ? 0.5 : -0.5), walk: walking ? cs.p.walk : 0, phase: Math.abs(x) / 0.92 + i * 0.25,
        handL: V(hx - 0.06, hy, z * 0.4), handR: V(hx + 0.06, hy, z * 0.4), wL: 1 - cs.down * prog(t, SETDOWN + 0.4, SETDOWN + 0.6), wR: 1 - cs.down * prog(t, SETDOWN + 0.4, SETDOWN + 0.6),
        crouch: 0.35 * cs.strain + 0.4 * win(t, SETDOWN, SETDOWN + 0.6, 0.2), squash: breathe(t, i) * (1 - 0.05 * cs.strain * Math.abs(Math.sin(t * 8 + i))),
        look: cs.strain ? cam3(x, y) : V(x + cs.p.dir * 2, y + 1.3, 3),
        ...(t < T.y1 - 0.1 ? { mood: 'neutral' } : moodAt(t, [[0, 'neutral'], [T.y1 - 0.05, 'surprised'], [T.cajones - 0.2, 'effort'], [SETDOWN + 0.3, 'neutral']])) };
      if (t > SETDOWN + 0.6 && t >= T.acomodan - 0.1) { p.handL = V(x + (i < 2 ? 0.35 : -0.35), 0.5, z - 0.4); p.wL = win(t, T.acomodan - 0.1, T.acomodan + 0.45, 0.12); p.mood = 'effort'; p.mood2 = 'effort'; p.lean = 0.25; }
    } else if (i >= 2 && t >= T.acomodan + 0.05 && t < c[6]) {                 // salen corriendo, cierran la losa, ponen cemento; después esperan arriba
      const from = carryState(T.acomodan).xc + BDX[i];
      const dest = [-7.3, -8.0, -5.6, -6.25][i], zz = [0.3, -0.5, 0.6, -0.5][i];
      const q = path(t, [[T.acomodan + 0.05, from], [T.losa - 0.5 + 0.08 * (i - 2), dest]]);
      const z = lerp(BZ[i], zz, lin(t, T.acomodan + 0.05, T.losa - 0.5));
      const y = stairY(q.x);
      p = { x: q.x, y, z, walk: q.walk, phase: Math.abs(q.x) / 1.44, stride: 0.72, face: q.walk > 0.5 ? -PI / 2 : 0.3, lean: q.walk > 0.5 ? 0.25 : 0, look: cam3(q.x, y), squash: settle(t, q.t1 || 0) * breathe(t, i), mood: 'neutral' };
      if (i >= 2 && t > T.sellan + 0.4) {                             // empujan la losa
        const push = win(t, T.losa - 0.4, T.cemento - 0.15, 0.15) + win(t, c[5] + 0.05, T.d16 - 0.1, 0.15);
        p.handL = V(SX0 - 0.12, S + 0.32, z * 0.6); p.handR = V(SX0 - 0.12, S + 0.45, z * 0.6 - 0.1); p.wL = p.wR = push; p.face = PI / 2 - 0.5; p.lean = 0.3 * push; p.crouch = 0.4 * push;
        Object.assign(p, push > 0.2 ? { mood: 'effort', mood2: 'effort', mix: 1 } : moodAt(t, [[0, 'neutral'], [T.d16, 'surprised']]));
        if (i === 3 && t > T.cemento - 0.2 && t < c[5]) { p.handR = V(SX0 + 0.4 + 0.5 * Math.sin(t * 6), S + 0.15, CZ - 0.1); p.wR = win(t, T.cemento - 0.2, c[5], 0.15); p.crouch = 1; p.face = 0.4; p.mood = p.mood2 = 'happy'; }
      } else if (t > T.d16 - 0.1) Object.assign(p, moodAt(t, [[0, 'neutral'], [T.d16, 'surprised']]));
    } else if (t >= c[7] && t < c[10] && i < 3) {                    // vecinos con antorchas mirando (1820)
      const x = [-8.1, -8.9, -9.7][i], z = [-0.9, 0.2, -0.45][i];
      p = { x, y: S + hop(t, c[8] + 0.05 + 0.08 * i, 0.18), z, face: 0.45, look: t > T.vuelven ? V(-4.2, S + 0.3, 0) : cam3(x, S), squash: breathe(t, i) * settle(t, c[8] + 0.45, 0.12),
        ...moodAt(t, [[0, 'neutral'], [T.intacto, 'surprised'], [T.intacto + 0.6, 'neutral'], [c[8], 'surprised'], [c[8] + 1.2, 'worried']]) };
      if (i === 1) { p.handR = V(x + 0.15, S + 1.5, z + 0.25); p.wR = 1; }
    }
    if (!p) { b.root.visible = false; return; }
    if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, p.z || 0, -1, i); p.handL.y += p.y || 0; p.wL = 0.6; }
    b.root.visible = true; b.pose(alive({ blink: blinkAt(t, 0.4 + i * 0.7), ...p }, t, 2 + i * 1.3)); b.head.getWorldPosition(head.b[i]);
  });
}

function poseRector(t) {
  let p = null; sack.visible = false;
  const L = { handR: null, wR: 1 };
  if (t >= 8.6 && t < c[6]) {
    if (t < T.acomodan + 0.45) {                                        // baja detrás de los cargadores, con el farol en alto
      const q = path(t, [[9.0, -11.0], [T.abren + 0.3, -8.4], [T.y1 + 0.05, -2.5]]), y = stairY(q.x);
      p = { x: q.x, y, z: 0.05, walk: q.walk, phase: Math.abs(q.x) / 0.92, face: q.walk > 0.5 ? PI / 2 : 0.4, look: q.walk > 0.5 ? V(q.x + 2, y + 1.3, 3) : V(1.0, 0.6, -0.4),
        ...moodAt(t, [[0, 'neutral'], [T.y1 - 0.05, 'surprised'], [T.hijas + 0.4, 'worried']]) };
      p.y += hop(t, T.y1 - 0.05, 0.18);
    } else if (t < c[5]) {
      if (t >= T.sellan) { rector.root.visible = false; lantern.visible = false; lantern.userData.f.on = 0; sack.visible = false; return; }
      p = { x: -2.5, y: 0, z: 0.05, face: 0.4, look: V(1.0, 0.6, -0.4), mood: 'worried' };
    } else {
      const q = path(t, [[c[5] + 0.15, -6.4], [T.d16 - 0.15, -2.15]]), y = stairY(q.x);
      p = { x: q.x, y: y + hop(t, T.d16, 0.2) + hop(t, T.d19 + 0.05, 0.16), z: 0.05, walk: q.walk, phase: Math.abs(q.x) / 0.92, face: q.walk > 0.5 ? PI / 2 : 0.35,
        look: q.walk > 0.5 ? V(q.x + 2, y + 1.3, 3) : t > T.revuelto - 0.3 ? cam3(-2.4, 0) : V(0.5, 0.5, -0.5), squash: settle(t, T.d16 + 0.4, 0.14) * breathe(t),
        ...moodAt(t, [[0, 'neutral'], [T.d16 - 0.05, 'surprised'], [T.d19 + 0.4, 'worried'], [T.revuelto - 0.1, 'surprised']]) };
    }
    L.handR = V(p.x + 0.35, (p.y || 0) + 1.55, p.z + 0.3);
  } else if (t >= c[6] && t < c[7]) {                                 // echa arena y sale
    const q = path(t, [[c[6] + 0.05, -2.4], [T.echan - 0.2, 1.9], [T.echan + 1.0, -2.4], [T.marca - 0.15, -6.6]]);
    const y = stairY(q.x), pour = win(t, T.echan - 0.15, T.echan + 1.0, 0.15);
    p = { x: q.x, y, z: lerp(0.45, -0.45, prog(t, T.echan + 1.1, T.marca - 0.3)), walk: q.walk, phase: Math.abs(q.x) / (q.v > 3 ? 1.44 : 0.92), stride: q.v > 3 ? 0.72 : 0.46, face: q.walk > 0.5 ? q.dir * PI / 2 : 0.3,
      look: pour > 0.3 ? V(q.x - 0.5, 0.1, 0.8) : cam3(q.x, y), mood: pour > 0.3 ? 'happy' : 'neutral', lean: 0.15 * pour };
    if (pour > 0.05) { L.handR = V(q.x - 0.35, y + 0.85, 0.75); L.wR = pour; }
  } else if (t >= c[7] && t < c[10]) {                                // 1820: baja con el farol
    const q = path(t, [[c[7], -6.6], [T.vuelven, -6.6], [T.sello2, -5.6], [T.intacto + 0.75, -5.6], [T.arena2 + 0.25, -2.6], [c[9] + 0.05, -2.6], [T.separado - 0.2, -7.0]]);
    const y = stairY(q.x);
    p = { x: q.x, y: y + hop(t, c[8] + 0.02, 0.24), z: lerp(-0.45, 0.0, prog(t, T.vuelven, T.sello2)), walk: q.walk, phase: Math.abs(q.x) / 0.92, face: q.walk > 0.5 ? q.dir * PI / 2 : 0.4,
      look: q.walk > 0.5 ? V(q.x + q.dir * 2, y + 1.3, 3) : t > c[8] - 0.1 && t < c[9] ? cam3(q.x, y) : t > T.vuelven ? V(-4.2, S + 0.2, 0.3) : cam3(q.x, y), squash: breathe(t, 3) * settle(t, c[8] + 0.4, 0.14),
      ...moodAt(t, [[0, 'neutral'], [T.intacto, 'happy'], [T.arena2 + 0.3, 'neutral'], [c[8] - 0.02, 'surprised'], [T.tirados + 0.4, 'worried'], [c[9] + 0.3, 'neutral']]) };
    L.handR = V(p.x + 0.35, p.y + 1.55, p.z + 0.3);
  }
  lantern.visible = !!(p && L.handR);
  if (!p) { rector.root.visible = false; lantern.userData.f.on = 0; return; }
  if (L.handR) { p.handR = L.handR; p.wR = L.wR; }
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, p.z || 0, -1, 1); p.handL.y += p.y || 0; p.wL = 0.75; }
  rector.root.visible = true; rector.pose(alive({ blink: blinkAt(t, 1.1), ...p }, t, 0.7)); rector.head.getWorldPosition(head.r);
  lantern.userData.f.on = 1;
  if (lantern.visible) { rector.hand(1, lantern.position); lantern.rotation.z = 0.12 * Math.sin(t * 3.1); }
  const pouring = t >= c[6] && t < c[7] && p.handR && L.wR > 0.05;
  sack.visible = pouring;
  if (sack.visible) { lantern.visible = false; lantern.userData.f.on = 0; rector.hand(1, sack.position); sack.rotation.z = 1.2; }
}

function poseGov(t) {
  let p = null;
  if (t >= c[6] && t < c[10]) {
    const q = path(t, [[c[6] + 0.05, -10.6], [T.lord - 0.1, -6.9], [T.marca - 0.55, -6.9], [T.marca - 0.05, -5.75], [T.sello2 + 0.3, -5.75], [T.arena2, -5.3], [c[9] + 0.1, -5.3], [T.separado, -6.3]]);
    const x = q.x, y = S, z = 0.55;
    const press = win(t, T.marca + 0.3, c[7] - 0.05, 0.2), peek = win(t, T.arena2 + 0.05, c[9] + 0.1, 0.25);
    p = { x, y: y + hop(t, c[8] + 0.05, 0.22), z, walk: q.walk, phase: Math.abs(x) / 0.92, face: q.walk > 0.5 ? q.dir * PI / 2 : 0.3 + 0.4 * peek,
      look: press > 0.3 ? V(SEAL_P.x, SEAL_P.y, SEAL_P.z) : peek > 0.3 ? V(-0.6, 0.6, 0) : cam3(x, y), crouch: 0.9 * press, lean: 0.4 * press + 0.3 * peek,
      squash: breathe(t, 5) * settle(t, c[8] + 0.45, 0.12),
      ...moodAt(t, [[0, 'neutral'], [T.lord, 'sly'], [T.echan, 'neutral'], [T.marca, 'effort'], [T.sello, 'happy'], [c[7], 'neutral'], [T.intacto, 'happy'], [c[8] - 0.02, 'surprised'], [T.tirados + 0.3, 'worried']]) };
    if (press > 0.05) { p.handR = V(SEAL_P.x + 0.02, SEAL_P.y + 0.12 + 0.1 * (1 - prog(t, T.sello - 0.25, T.sello)), SEAL_P.z); p.wR = press; }
  }
  stamp.visible = !!(p && p.handR);
  if (!p) { gov.root.visible = false; return; }
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, p.z, -1, 2); p.handL.y += p.y; p.wL = 0.8; }
  if (p.handR === undefined && !p.walk && t < T.marca - 0.6) { p.handR = talk(t, p.x, p.z, 1, 3); p.handR.y += p.y; p.wR = 0.7 * win(t, T.lord - 0.1, T.echan, 0.2); }
  gov.root.visible = true; gov.pose(alive({ blink: blinkAt(t, 1.7), ...p }, t, 4)); gov.head.getWorldPosition(head.g);
  if (stamp.visible) { gov.hand(1, stamp.position); stamp.position.y -= 0.02; }
}

function poseA(t) {
  const on = t >= T.temb - 0.05 && t < c[11];
  prank.root.visible = skeptic.root.visible = on;
  book.visible = on;
  if (!on) { flyPapers.forEach(p => { p.visible = false; }); return; }
  const quake = win(t, T.temb - 0.05, T.broma - 0.1, 0.1);
  // bromista detrás de la lápida
  const up = back(lin(t, T.broma - 0.15, T.broma + 0.2));
  const px = AX + 1.35, pz = -0.75;
  prank.pose(alive({ x: px, z: pz, y: -0.55 * (1 - up), face: -0.2, look: cam3(px, 0), blink: blinkAt(t, 2.2), squash: settle(t, T.broma + 0.2, 0.15) * breathe(t, 6),
    handL: V(px - 0.25, 1.02, pz + 0.45), handR: V(px + 0.25, 1.02, pz + 0.45), wL: up, wR: up, tilt: 0.12 * Math.sin(t * 12) * win(t, T.broma + 0.2, T.hay, 0.2),
    ...moodAt(t, [[0, 'sly'], [T.broma + 0.25, 'happy'], [T.hay, 'sly']]) }, t, 6)); prank.head.getWorldPosition(head.p);
  // el escéptico con el libro
  const sx = AX - 0.9, sz = 0.35, shake = win(t, T.hay + 0.1, T.casi, 0.2);
  skeptic.pose(alive({ x: sx, z: sz, y: hop(t, T.temb + 0.1, 0.2) + hop(t, T.temb + 0.5, 0.12), face: 0.25, look: t > T.casi ? V(sx + 0.15, 0.95, sz + 0.6) : cam3(sx, 0), blink: blinkAt(t, 0.3),
    handL: V(sx - 0.12, 0.98, sz + 0.38), handR: V(sx + 0.3, 0.98, sz + 0.38), wL: 1, wR: 1, tilt: 0.25 * Math.sin(t * 9) * shake, squash: breathe(t, 7) * settle(t, T.temb + 0.9, 0.12),
    ...moodAt(t, [[0, 'surprised'], [T.broma, 'neutral'], [T.hay + 0.1, 'sly'], [T.casi, 'worried']]) }, t, 7)); skeptic.head.getWorldPosition(head.s);
  skeptic.hand(0, tmp); skeptic.hand(1, tmp2); book.position.copy(tmp).lerp(tmp2, 0.5); book.position.y += 0.02; book.position.z += 0.08; book.rotation.set(0.9, 0.25, 0);
  pageR.rotation.z = -PI * (Math.max(0, Math.sin((t - T.casi) * 7)) ** 2) * win(t, T.casi, c[11], 0.1) * 0.9;
  flyPapers.forEach((m, i) => { const u = (t - T.casi - 0.15 - i * 0.25) / 1.4; m.visible = u > 0 && u < 1;
    if (!m.visible) return; m.position.set(book.position.x + 0.2 + 1.2 * u + 0.1 * Math.sin(u * 9 + i), book.position.y + 0.1 + 1.0 * u + 0.15 * Math.sin(u * 7), book.position.z + 0.1 * i); m.rotation.set(u * 6 + i, u * 4, u * 5); });
  gA.position.set(0.05 * quake * Math.sin(t * 61), 0.035 * quake * Math.sin(t * 47), 0);
  gravesA.forEach((g, i) => { g.rotation.z = (g.userData.r0 ?? (g.userData.r0 = g.rotation.z)) + 0.12 * quake * Math.sin(t * 25 + i * 1.7); });
  cracks.scale.setScalar(back(lin(t, T.temb + 0.15, T.temb + 0.45))); cracks.visible = t > T.temb + 0.15;
  puffD(t, T.temb + 0.1, AX - 1.2, 1.0, -1); puffE(t, T.temb + 0.25, AX + 0.8, 1.0, 1);
}

// ---------------- estado de los ataúdes ----------------
function poseCoffins(t) {
  const set = (st, opts = {}) => { for (let i = 0; i < 6; i++) placeCoffin(i, st[i], opts); };
  const rev = (tr, i, base = {}) => ({ sq: settle(t, tr + 0.03 * i, 0.28), dy: hop(t, tr + 0.03 * i - 0.12, 0.18, 0.3), ...base });
  if (t < c[1]) {                                                    // gancho: se mueven solos
    const shiver = win(t, T.ataudes, T.movian, 0.2);
    for (let i = 0; i < 6; i++) {
      const u = back(lin(t, T.movian - 0.1 + i * 0.09, T.movian + 0.45 + i * 0.09));
      placeCoffin(i, mixS(ORDER2[i], SC3[i], u), { dy: 0.025 * shiver * Math.abs(Math.sin(t * 30 + i)) + hop(t, T.movian - 0.1 + i * 0.09, 0.3, 0.45), wob: 0.05 * shiver * Math.sin(t * 25 + i), sq: settle(t, T.movian + 0.45 + i * 0.09, 0.2) });
    }
    return;
  }
  if (t < T.y1 - 0.1) { set(ORDER0); coffins[3].visible = false; }
  else if (t < T.acomodan - 0.1) { for (const i of [0, 1, 2]) placeCoffin(i, SC1[i], rev(T.y1 - 0.1, i)); for (const i of [4, 5]) coffins[i].visible = false; }
  else if (t < c[5]) { for (const i of [0, 1, 2]) { const u = prog(t, T.acomodan - 0.1 + 0.15 * i, T.acomodan + 0.6 + 0.15 * i); placeCoffin(i, mixS(SC1[i], ORDER1[i], u), { dy: 0.12 * Math.sin(PI * u) }); } for (const i of [4, 5]) coffins[i].visible = false; }
  else if (t < T.d19 - 0.1) { if (t < T.d16 - 0.15) set(ORDER1); else for (let i = 0; i < 6; i++) placeCoffin(i, SC2[i], rev(T.d16 - 0.15, i)); }
  else if (t < c[6]) { for (let i = 0; i < 6; i++) { const u = back(lin(t, T.d19 - 0.1 + 0.05 * i, T.d19 + 0.22 + 0.05 * i)); const a = SC2[i] || SC3[i]; placeCoffin(i, mixS(a, SC3[i], u), { sc: SC2[i] ? 1 : back(u), ...rev(T.d19 + 0.2, i) }); } }
  else if (t < T.vuelven) set(ORDER2);
  else if (t < T.sacan) for (let i = 0; i < 6; i++) placeCoffin(i, SC4[i], rev(c[8] + 0.02, i));
  else if (t < c[10]) {                                              // los sacan: se van por la escalera, uno por uno
    for (let i = 0; i < 6; i++) {
      const t0 = T.sacan + 0.05 + i * 0.36, u = lin(t, t0, t0 + 0.7), s = SC4[i];
      if (u <= 0) { placeCoffin(i, s); continue; }
      const xx = lerp(s[0], -4.8, u), yy = stairY(Math.min(xx, -2.2)) + 0.1, sc = 1 - prog(u, 0.75, 1);
      placeCoffin(i, [xx, yy, lerp(s[2], 0, Math.min(1, u * 2)), lerp(s[3], 0, u), 0, lerp(s[5], 0, u)], { sc, dy: 0.05 * Math.abs(Math.sin(t * 20)) });
      coffins[i].rotation.z = Math.atan2(S, SX1 - SX0) * prog(u, 0.25, 0.4) * -1 * (xx < -2.6 ? 1 : 0);
    }
  } else if (t < T.temb) {                                           // inundación (hipótesis): flotan
    const lvl = 1.0 * prog(t, T.inund - 0.05, T.inund + 0.8);
    for (let i = 0; i < 6; i++) { const s = ORDER2[i], fl = Math.max(0, lvl - 0.12 - s[1]);
      placeCoffin(i, [s[0] + 0.15 * Math.sin(t * 1.6 + i) * lvl, s[1] + fl, s[2] + 0.1 * Math.sin(t * 1.3 + i * 2) * lvl, s[3] + 0.3 * lvl * Math.sin(t * 1.1 + i), 0.08 * lvl * Math.sin(t * 2.3 + i), 0.12 * lvl * Math.sin(t * 1.9 + i)], { sc: back(lin(t, c[10] + 0.03 * i, c[10] + 0.3 + 0.03 * i)), dy: 0.03 * lvl * Math.sin(t * 3 + i) }); }
  } else set({});
  if (t >= 8.6 && t < c[5]) {                                         // el ataúd de Thomas Chase, en manos de los cargadores
    const cs = carryState(t);
    if (cs.down < 1) placeCoffin(3, [cs.xc, cs.cy - halfY(3, cs.rz, 0), -0.02, 0, cs.rz, 0]); else placeCoffin(3, ORDER1[3]);
  }
}

// ---------------- cuadro ----------------
const SHAKE_Y = (t, t0, d = 0.5, a = 0.04) => a * Math.exp(-6 * (t - t0)) * Math.sin(40 * (t - t0)) * (t > t0 && t < t0 + d ? 1 : 0);
function frame(t) {
  gA.position.set(0, 0, 0);
  poseCoffins(t);
  // la losa: se corre hacia atrás para abrir
  const openA = prog(t, T.abren, T.abren + 0.45) * (1 - prog(t, T.losa - 0.45, T.losa + 0.05));
  const openB = prog(t, c[5] + 0.1, c[5] + 0.5) * (1 - prog(t, T.marca - 0.05, T.marca + 0.3));
  const openC = prog(t, T.intacto + 0.75, T.intacto + 1.15) * (t < c[11] ? 1 : 0);
  const open = Math.max(t < c[5] ? openA : 0, t >= c[5] && t < c[7] ? openB : 0, t >= c[7] ? openC : 0, t >= T.sacan - 0.5 && t < c[11] ? 1 : 0);
  slab.position.z = -1.95 * open; slab.position.y = 0.04 * Math.sin(PI * open) + SHAKE_Y(t, T.losa + 0.05) + SHAKE_Y(t, T.marca + 0.3);
  // cemento: aparece al cerrar; se rompe al abrir
  const cem = (t >= T.cemento - 0.2 && t < c[5] + 0.1 ? lin(t, T.cemento - 0.2, T.cemento + 0.5) : 0) || (t >= T.marca && t < c[7] + 0.1 ? 1 : 0) || (t >= c[7] && t < T.intacto + 0.75 ? 1 : 0);
  cement.forEach((m, i) => { m.visible = cem > 0.02; m.scale.set(Math.max(lin(cem, i * 0.2, 0.4 + i * 0.2), 0.001), 1, 1); });
  // sello del gobernador
  const sOn = (t >= T.sello - 0.05 && t < T.intacto + 0.75) ? back(lin(t, T.sello - 0.05, T.sello + 0.2)) : 0;
  seal.visible = sOn > 0.01; seal.position.set(SEAL_P.x, SEAL_P.y + 0.002 - 1.95 * 0 , SEAL_P.z); seal.scale.setScalar(Math.max(sOn, 0.001));
  // arena
  const sandK = t >= c[6] ? lin(t, T.echan - 0.15, T.echan + 1.0) : 0;
  sand.visible = sandK > 0.01 && t < c[11]; sand.scale.x = Math.max(sandK, 0.001);
  // oscuridad de la tumba cerrada
  const dk = Math.max(t >= 5.25 && t < T.y1 + 0.2 ? prog(t, 5.4, 5.9) * (1 - prog(t, T.y1 - 0.55, T.y1 - 0.08)) : 0,
    t >= T.losa && t < T.d16 + 0.2 ? prog(t, T.losa, T.losa + 0.4) * (1 - prog(t, T.d16 - 0.5, T.d16 - 0.1)) : 0,
    t >= T.marca && t < T.arena2 + 0.2 ? prog(t, T.marca + 0.2, T.marca + 0.5) * (1 - prog(t, T.intacto + 0.9, T.arena2 - 0.05)) : 0);
  darkM.opacity = 0.74 * dk; darkVeil.visible = dk > 0.01;
  // agua
  const lvl = t >= c[10] && t < T.temb ? prog(t, T.inund - 0.05, T.inund + 0.8) : 0;
  waterFront.visible = waterTop.visible = waveLine.visible = lvl > 0.01;
  waterFront.scale.y = Math.max(lvl, 0.001); waterTop.position.y = lvl + 0.01 * Math.sin(t * 5);
  waveLine.position.y = lvl; waveLine.children.forEach((m, i) => { m.position.x = RX0 + 0.2 + ((i * 0.41 + t * 0.5) % 4.9); m.scale.y = 0.3 + 0.12 * Math.sin(t * 6 + i); });
  // tumbas nuevas
  newGraves.forEach((g, i) => { const s = t >= T.separado - 0.2 && t < c[11] ? back(lin(t, T.separado - 0.2 + i * 0.12, T.separado + 0.1 + i * 0.12)) : 0; g.visible = s > 0.01; g.scale.setScalar(Math.max(s, 0.001)); });

  for (const a of ALL) a.root.visible = false;
  poseBearers(t); poseRector(t); poseGov(t); poseA(t);
  if (t >= c[7] && t < c[10]) poseBearers(t);

  // antorcha del vecino y de la gente de fondo
  torchB1.visible = bearers[1].root.visible && t >= c[7];
  torchB1.userData.f.on = torchB1.visible ? 1 : 0;
  if (torchB1.visible) { bearers[1].hand(1, torchB1.position); torchB1.rotation.z = 0.1 * Math.sin(t * 2.3); }
  for (const { w, tr } of wTorches) { w.hand(1, tr.position); tr.rotation.z = 0.08 * Math.sin(t * 3); }
  // llana de cemento
  trowel.visible = bearers[3].root.visible && t > T.cemento - 0.2 && t < c[5];
  if (trowel.visible) { bearers[3].hand(1, trowel.position); trowel.position.y -= 0.05; }
  // arena que cae de la bolsa
  sandBits.forEach((m, i) => { const u = ((t * 2.2 + i / 8) % 1); m.visible = sack.visible; if (!m.visible) return; m.position.set(sack.position.x - 0.12 + 0.05 * Math.sin(i * 3), sack.position.y - 0.25 - 0.75 * u, sack.position.z + 0.03 * Math.cos(i)); });

  // fuego que titila
  for (const f of flames) {
    const fl = 1 + 0.13 * Math.sin(t * 13 + f.k) + 0.08 * Math.sin(t * 29 + f.k * 2.3) + 0.05 * Math.sin(t * 47 + f.k);
    f.g.visible = f.on > 0.01; if (!f.g.visible) { if (f.pl) f.pl.intensity = 0; continue; }
    f.fo.scale.set(1 + 0.08 * Math.sin(t * 17 + f.k), fl * f.on, 1); f.fi.scale.set(1, fl * f.on, 1); f.fo.rotation.z = 0.08 * Math.sin(t * 9 + f.k);
    f.gl.scale.setScalar((0.9 + 0.12 * fl) * Math.sqrt(f.on)); f.gl.material.opacity = 0.5 + 0.08 * Math.sin(t * 11 + f.k); if (f.pl) f.pl.intensity = f.base * (0.85 + 0.2 * fl) * f.on;
  }
  for (const b of bats) { const a = t * 0.9 + b.off; b.g.position.set(b.cx + b.rx * Math.sin(a), b.cy + b.ry * Math.sin(2 * a + b.off), b.z + 0.4 * Math.cos(a)); const f = 0.9 * Math.sin(t * 16 + b.off * 3); b.wl.rotation.z = -f; b.wr.rotation.z = f; b.g.rotation.y = Math.cos(a) > 0 ? 0 : PI; }
  roomBat.g.visible = t >= T.vacia2 - 0.3 && t < c[10] || t >= c[11];
  for (const p of palms) { p.crown.rotation.z = 0.06 * Math.sin(t * 1.3 + p.k); p.crown.rotation.x = 0.04 * Math.sin(t * 1.1 + p.k * 2); p.crown.children.forEach((f, i) => { if (f.userData.leaf) f.userData.leaf.rotation.z = f.userData.z0 + 0.07 * Math.sin(t * 2.1 + f.userData.k); }); p.g.rotation.z = 0.012 * Math.sin(t * 1.3 + p.k); }
  for (const cb of crabs) {
    const u = t * cb.speed + cb.off, xx = cb.x + cb.span * Math.sin(u);
    cb.g.position.set(xx, cb.y + 0.01 * Math.abs(Math.sin(t * 18 + cb.off)), cb.z);
    cb.legs.forEach(({ l, sx, i }) => { l.rotation.z = sx * (0.9 + 0.35 * Math.sin(t * 22 + i * 2 + cb.off)); });
    cb.claws.forEach((m, i) => { m.position.y = 0.17 + 0.03 * Math.sin(t * 6 + i * 3 + cb.off); });
  }
  crabs[3].g.visible = t >= c[11] || (t >= T.vacia2 - 0.3 && t < c[10]);
  for (const f of fireflies) { f.g.position.set(f.x + 0.4 * Math.sin(t * f.sp + f.k), f.y + 0.25 * Math.sin(t * f.sp * 1.7 + f.k * 2), f.z); const b = 0.5 + 0.5 * Math.sin(t * 3 + f.k * 4); f.g.scale.setScalar(0.4 + 0.6 * b); }
  for (const st of stars) st.scale.setScalar(0.7 + 0.3 * Math.sin(t * 2.2 + st.userData.tw));
  motes.forEach((m, i) => { const u = (t * 0.07 + m.userData.off) % 1; m.position.set(RX0 + 0.4 + 4.2 * ((u * 1.3 + i * 0.37) % 1), 0.2 + 1.8 * ((u + i * 0.13) % 1), 0.3 - 0.08 * i); m.material.opacity = 0.2 + 0.25 * Math.sin(t * 2 + i); });
  webs.forEach((w, i) => { w.rotation.z = 0.04 * Math.sin(t * 1.7 + i); });

  // signos y partículas
  const qOn = popIn(t, T.y1 + 0.15, c[3] - 0.1);
  [head.r, head.b[0], head.b[2]].forEach((h, i) => k.glyphAt(qMarks[i], h, 0.05, 0.62, qOn * (i === 0 ? 1 : 0.85), 0.12 * Math.sin(t * 6 + i)));
  const qEnd = (t >= c[11] ? popIn(t, T.nadie - 0.1, END + 2) : 0);
  if (t >= c[11]) [[-1.2, 1.1, -0.5], [0.3, 1.5, -0.6], [1.6, 1.0, -0.5], [0.9, 0.5, 0.2]].forEach(([x, y, z], i) => k.glyphAt(qMarks[i], tmp.set(x, y + 0.08 * Math.sin(t * 3 + i), z), 0, 0, qEnd * (0.9 + 0.1 * Math.sin(t * 5 + i)), 0.15 * Math.sin(t * 4 + i)));
  else if (qOn <= 0.01) qMarks[3].visible = false;
  const bangOn = popIn(t, c[8] + 0.05, T.tirados + 0.5) + (t >= c[5] && t < c[6] ? popIn(t, T.d16, T.d16 + 1.0) : 0);
  k.glyphAt(bangs[0], head.r, 0.02, 0.62, bangOn, 0.1 * Math.sin(t * 7));
  k.glyphAt(bangs[1], head.g, 0.02, 0.75, t >= c[7] ? popIn(t, c[8] + 0.1, T.tirados + 0.5) : 0, -0.1 * Math.sin(t * 7));
  k.glyphAt(bangs[2], head.b[1], 0.02, 0.62, t >= c[7] ? popIn(t, c[8] + 0.15, T.tirados + 0.5) : 0, 0.1 * Math.sin(t * 6));
  k.glyphAt(okMark, tmp.copy(SEAL_P), 0.3, 0.32, t >= c[7] ? popIn(t, T.intacto - 0.05, T.intacto + 0.8) : 0);
  k.glyphAt(xMark, tmp2.set(-1.6, 0.4, 0.4), 0, 0, popIn(t, T.huella - 0.1, c[8] - 0.05), 0);
  k.glyphAt(jas[0], head.p, 0.45, 0.4, popIn(t, T.broma + 0.25, T.hay), 0.2 * Math.sin(t * 9));
  k.glyphAt(jas[1], head.p, -0.45, 0.55, popIn(t, T.broma + 0.4, T.hay), -0.2 * Math.sin(t * 9));
  sparks.forEach((m, i) => { const on = t >= c[6] && t < c[7] ? popIn(t, T.sello + 0.05, c[7]) : 0; k.glyphAt(m, SEAL_P, [-0.35, 0.35, -0.25, 0.3, 0][i], [0.25, 0.3, 0.12, 0.1, 0.42][i], on * (0.6 + 0.4 * Math.sin(t * 9 + i * 1.6)), t * 2 + i); });
  sweat.forEach((m, i) => { const on = t > T.cajones && t < T.mover && i < 4, u = (t * 1.7 + i / 4) % 1, s = i % 2 ? 1 : -1, h = head.b[i % 4];
    m.visible = on; if (!on) return; m.position.set(h.x + s * (0.3 + 0.25 * u), h.y + 0.22 + 0.3 * u - 0.6 * u * u, h.z + 0.25); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
  puffA(t, T.mover + 0.45, 1.0, 0.1, -1); puffB(t, T.mover + 0.5, 1.9, 0.1, 1);
  puffC(t, T.losa + 0.05, SX0 + 0.1, 0.9, -1, S + 0.1); puffC(t, T.marca + 0.05, SX0 + 0.1, 0.9, -1, S + 0.1);
  puffD(t, T.abren + 0.1, SX0 + 0.2, 0.9, -1, S + 0.1); puffE(t, T.y1, 1.0, 0.0, 1, 0.1);
  if (t >= c[5] && t < c[6]) { puffD(t, T.d16 - 0.1, -0.5, 0, -1); puffE(t, T.d19 + 0.15, 1.0, 0, 1); }
  if (t >= c[7] && t < c[9]) { puffD(t, c[8] + 0.02, -0.2, 0.2, -1); puffE(t, c[8] + 0.05, 1.6, 0.1, 1); }
}

// ---------------- cámara ----------------
k.shots([
  { t: 0, pos: [-0.8, 2.6, 12.0], look: [-0.8, 2.2, 0] },
  { t: T.vacia - 0.1, pos: [0, 1.45, 7.2], look: [0, 1.1, 0] },
  { t: T.ataudes - 0.15, pos: [0.2, 1.05, 4.6], look: [0.2, 0.6, -0.5] },
  { t: c[1], pos: [-1.0, 3.6, 9.8], look: [-1.0, 3.3, -2] },
  { t: T.cementerio - 0.1, pos: [-3.6, 4.6, 6.5], look: [-4.2, 4.4, -8] },
  { t: c[2], pos: [-5.2, 3.7, 8.2], look: [-5.2, 3.2, 0] },
  { t: T.abren + 0.35, pos: [-5.0, 3.5, 7.6], look: [-5.0, 3.0, 0] },
  { t: T.y1 - 0.25, pos: [-0.9, 1.5, 6.6], look: [-0.9, 1.05, 0], glide: true },
  { t: T.y1 - 0.2, pos: [0.0, 1.35, 6.4], look: [0.0, 1.0, 0] },
  { t: T.hijas - 0.1, pos: [1.2, 0.95, 3.5], look: [1.2, 0.55, -0.6] },
  { t: c[3], pos: [-0.7, 1.35, 4.6], look: [-0.7, 1.15, 0] },
  { t: T.plomo - 0.15, pos: [-0.75, 1.3, 4.0], look: [-0.75, 1.0, -0.1] },
  { t: T.hacian - 0.1, pos: [-0.6, 1.45, 5.9], look: [-0.6, 1.1, 0] },
  { t: T.mover - 0.4, pos: [0.6, 1.3, 5.6], look: [0.6, 1.0, 0], },
  { t: c[4], pos: [0.1, 1.35, 6.2], look: [0.1, 0.9, 0] },
  { t: T.sellan, pos: [-5.0, 4.0, 6.6], look: [-5.0, 3.2, 0] },
  { t: T.losa - 0.15, pos: [-5.15, 3.75, 5.2], look: [-5.15, 3.0, 0] },
  { t: c[5], pos: [-1.6, 2.6, 10.0], look: [-1.6, 1.9, 0] },
  { t: T.d16 - 0.15, pos: [-0.8, 1.35, 7.2], look: [-0.8, 0.95, 0] },
  { t: T.d19 - 0.15, pos: [0.3, 1.05, 4.5], look: [0.3, 0.65, -0.4] },
  { t: T.revuelto - 0.15, pos: [-2.2, 1.45, 3.2], look: [-2.2, 1.3, 0.3] },
  { t: c[6], pos: [-7.2, 4.0, 6.8], look: [-7.2, 3.65, 0] },
  { t: T.lord - 0.1, pos: [-6.8, 4.0, 3.8], look: [-6.8, 3.85, 0.4] },
  { t: T.echan - 0.15, pos: [0.9, 1.45, 6.4], look: [0.9, 0.75, 0] },
  { t: T.echan + 1.0, pos: [-1.4, 1.45, 6.0], look: [-1.4, 0.8, 0], glide: true },
  { t: T.marca - 0.45, pos: [-4.9, 4.3, 4.6], look: [-4.7, 3.0, 0] },
  { t: T.sello - 0.2, pos: [-4.6, 3.8, 2.9], look: [-4.6, 2.85, 0.2] },
  { t: c[7], pos: [-6.2, 4.2, 9.2], look: [-6.2, 3.6, 0] },
  { t: T.vuelven - 0.1, pos: [-5.0, 4.0, 5.6], look: [-5.0, 3.2, 0] },
  { t: T.intacto - 0.6, pos: [-4.5, 3.7, 2.6], look: [-4.5, 2.85, 0.2] },
  { t: T.arena2 - 0.1, pos: [-1.6, 0.85, 3.3], look: [-1.6, 0.3, 0] },
  { t: c[8], pos: [-0.5, 1.75, 9.6], look: [-0.5, 1.2, 0] },
  { t: T.tirados - 0.15, pos: [0.8, 1.05, 4.2], look: [0.8, 0.6, -0.4] },
  { t: c[9], pos: [-0.8, 1.6, 7.4], look: [-0.8, 1.2, 0] },
  { t: T.separado - 0.2, pos: [-5.5, 3.2, 10.5], look: [-5.5, 2.8, -1] },
  { t: T.vacia2 - 0.15, pos: [-0.3, 1.25, 7.0], look: [-0.3, 0.85, 0] },
  { t: c[10], pos: [0.0, 1.2, 5.6], look: [0.0, 0.85, 0] },
  { t: T.temb - 0.05, pos: [AX, 2.2, 8.6], look: [AX, 1.8, -1], cut: true },
  { t: T.broma - 0.15, pos: [AX + 1.35, 1.3, 4.0], look: [AX + 1.35, 1.05, 0] },
  { t: T.hay - 0.1, pos: [AX - 0.9, 1.45, 4.2], look: [AX - 0.9, 1.25, 0] },
  { t: T.casi - 0.1, pos: [AX - 0.75, 1.35, 2.9], look: [AX - 0.75, 1.1, 0.3] },
  { t: c[11], pos: [-0.6, 3.0, 13.5], look: [-0.6, 2.6, 0], cut: true },
  { t: T.nadie - 0.15, pos: [0.0, 1.35, 6.0], look: [0.0, 1.0, 0] },
]);
k.follow(() => head.r);

// ---------------- carteles ----------------
tag({ text: 'Barbados', big: true, off: BIG, from: 0.15, to: T.relatos - 0.1 });
tag({ text: '¿Se movían solos?', big: true, off: BIG, from: T.movian - 0.2, to: c[1] });
tag({ text: 'Bóveda Chase', at: () => V(-0.6, S + 0.5, 0.5), off: [-120, -330], from: T.boveda, to: T.cementerio - 0.1 });
tag({ text: 'Christ Church', at: () => V(-4.6, S + 4.7, -8.5), off: [200, -160], from: T.christ - 0.25, to: c[2] });
tag({ text: '1812', big: true, off: BIG, from: c[2] + 0.1, to: T.abren + 0.3 });
tag({ text: 'Thomas Chase', at: () => coffins[3].position, off: [80, -300], from: T.thomas, to: T.y1 - 0.25 });
tag({ text: 'Sus hijas', at: () => coffins[0].position, off: [-150, -330], from: T.hijas - 0.05, to: c[3] });
tag({ text: 'De plomo', big: true, off: BIG, from: T.plomo - 0.1, to: T.hacian - 0.15 });
tag({ text: 'Varios hombres', big: true, off: BIG, from: T.hacian, to: c[4] });
tag({ text: 'Losa + cemento', big: true, off: BIG, from: T.losa - 0.1, to: c[5] });
tag({ text: '1816', big: true, off: BIG, from: T.d16 - 0.1, to: T.d19 - 0.15 });
tag({ text: '1819', big: true, off: BIG, from: T.d19 - 0.1, to: T.revuelto - 0.2 });
tag({ text: '¡Todo revuelto!', big: true, off: BIG, from: T.revuelto - 0.15, to: c[6] });
tag({ text: 'Lord Combermere', at: () => V(head.g.x, head.g.y + 0.5, head.g.z), off: [170, -250], from: T.lord, to: T.echan - 0.2 });
tag({ text: 'Gobernador', big: true, off: BIG, from: T.gob - 0.05, to: T.echan - 0.2 });
tag({ text: 'Arena', at: () => V(0.8, 0.02, 0.4), off: [160, -330], from: T.arena, to: T.marca - 0.5 });
tag({ text: 'Para ver huellas', big: true, off: BIG, from: T.arena + 0.4, to: T.marca - 0.5 });
tag({ text: 'Su sello', at: () => SEAL_P, off: [200, -280], from: T.sello - 0.05, to: c[7] });
tag({ text: 'Abril de 1820', big: true, off: BIG, from: c[7] + 0.05, to: T.vuelven - 0.1 });
tag({ text: 'Sello intacto', big: true, off: BIG, from: T.intacto - 0.15, to: T.arena2 - 0.15 });
tag({ text: 'Ni una huella', big: true, off: BIG, from: T.huella - 0.25, to: c[8] });
tag({ text: '¡Otra vez!', big: true, off: BIG, from: c[8] + 0.1, to: c[9] });
tag({ text: 'Por separado', big: true, off: BIG, from: T.separado - 0.1, to: T.vacia2 - 0.15 });
tag({ text: 'Vacía', big: true, off: BIG, from: T.vacia2 - 0.05, to: c[10] });
tag({ text: '¿Inundaciones?', big: true, off: BIG, from: c[10] + 0.05, to: T.temb - 0.1 });
tag({ text: '¿Temblores?', big: true, off: BIG, from: T.temb, to: T.broma - 0.15 });
tag({ text: '¿Una broma?', big: true, off: BIG, from: T.broma - 0.1, to: T.hay - 0.15 });
tag({ text: 'Pocos registros', big: true, off: BIG, from: T.casi - 0.1, to: c[11] });
tag({ text: 'Más de 200 años', big: true, off: BIG, from: c[11] + 0.05, to: T.nadie - 0.15 });
tag({ text: '¿Qué los movía?', big: true, off: BIG, from: T.nadie - 0.1, to: END + 1 });

// ---------------- sonidos ----------------
sfx(0, 'boom', 0.5);
sfx(T.movian - 0.1, 'riser_to', 0.9); sfx(T.movian, 'roll', 0.6); sfx(T.movian + 0.45, 'thud', 0.6);
sfx(T.abren, 'roll', 0.55);
sfx(T.y1 - 0.1, 'riser_to', 1); sfx(T.y1 - 0.1, 'boom', 0.5);
sfx(SETDOWN + 0.4, 'thud', 0.8);
sfx(T.losa + 0.05, 'thud', 0.8);
sfx(T.d16 - 0.15, 'riser_to', 0.9); sfx(T.d16 - 0.15, 'boom', 0.45); sfx(T.d19 + 0.2, 'thud', 0.7);
sfx(T.echan, 'hiss', 0.45);
sfx(T.sello, 'thud', 0.7);
sfx(T.intacto, 'tap', 0.7);
sfx(c[8] + 0.02, 'riser_to', 1); sfx(c[8] + 0.02, 'boom', 0.6);
sfx(c[10] + 0.05, 'splash', 0.7);
sfx(T.temb, 'boom', 0.55); sfx(T.temb + 0.15, 'thud', 0.7);
sfx(T.nadie - 0.1, 'riser_to', 1); sfx(T.nadie - 0.1, 'boom', 0.55);

k.run(frame);
