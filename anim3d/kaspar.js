// Episodio (misterios): Kaspar Hauser. En 1828 aparece en Núremberg un chico que casi no habla, con dos cartas;
// dice haber vivido en una celda oscura; rumor del príncipe de Baden; ataque de 1829; muerte en Ansbach (1833);
// la nota en escritura de espejo; el ADN. Decorados lado a lado en x:
//   0 PLAZA de Núremberg (atardecer)   40 POLICÍA   80 CELDA   120 PALACIO (rumor)   160 SÓTANO (1829)
//   200 PARQUE de Ansbach con nieve (+ tumba en 206)   240 LABORATORIO (ADN)
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, draw, surface, picture, painting, windowPic, lamp } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('kaspar', { sky: [[0, '#0e1233'], [0.45, '#2c2a5e'], [0.8, '#6a3f72'], [1, '#c2687a']], light: { ambient: 1.5, sun: 1.5 } });
const { scene, c, at, END, sfx, tag, BIG } = k;
k.light.sun.color.set(0xe4dcff);
const PX = 0, OX = 40, CX = 80, RX = 120, SX = 160, AX = 200, GX = 206, LX = 240;

// ---------------- tiempos ----------------
const T = {
  nurem: at('nuremberg'), chico: at('chico'), casi: at('casi'), nadie: at('nadie'),
  cartas: at('cartas', c[1]), una: at('una', c[1]), paso: at('paso', c[1]), casa: at('casa', c[1]),
  supu: at('supuestamente', c[2]), madre: at('madre', c[2]), kaspar2: at('kaspar', c[2]), pero: at('pero', c[2]), misma: at('misma', c[2]), mano: at('mano', c[2]),
  escribir: at('escribir', c[3]), nombre: at('nombre', c[3]), hauser: at('hauser', c[3]),
  celda: at('celda', c[4]), pan: at('pan', c[4]), caballitos: at('caballitos', c[4]), juguete: at('juguete', c[4]),
  rumor: at('rumor', c[5]), principe: at('principe', c[5]), baden: at('baden', c[5]), cambiado: at('cambiado', c[5]), escondido: at('escondido', c[5]),
  herido: at('herido', c[6]), dice: at('dice', c[6]), hombre: at('hombre', c[6]),
  parque: at('parque', c[7]), atacan: at('atacan', c[7]), muere: at('muere', c[7]), tres: at('tres', c[7] + 1.5),
  bolsita: at('bolsita', c[8]), nota: at('nota', c[8]), reves: at('reves', c[8]), espejo: at('espejo', c[8]),
  sospechan: at('sospechan', c[9]), adn: at('adn', c[9]), principe9: at('principe', c[9]),
  doscientos: at('doscientos', c[10]), nadie10: at('nadie', c[10]), kaspar10: at('kaspar', c[10]),
};

// ---------------- utilidades ----------------
function canvasTex(w, h, paint) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; paint(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function texRep(kind, opts, rx, ry) { const t = new THREE.CanvasTexture(draw[kind](opts)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const glowTex = canvasTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
function glowMesh(color, size, op = 0.6) {
  return new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
}
const flames = [];
function flame(parent, s = 1, { light = 0, glow = 1 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const gl = glowMesh(0xffa050, 1.5 * s * glow, 0.55); gl.position.set(0, 0.08 * s, 0.03); g.add(gl);
  const fo = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.075 * s, 0.26 * s, 10), basic(0xff7a22)), 0.012 * s); fo.position.y = 0.13 * s; g.add(fo);
  const fi = new THREE.Mesh(new THREE.ConeGeometry(0.042 * s, 0.16 * s, 10), basic(0xffe48a)); fi.position.set(0, 0.1 * s, 0.035 * s); g.add(fi);
  let pl = null; if (light) { pl = new THREE.PointLight(0xffb060, light, 6, 1.3); pl.position.set(0, 0.25, 0.5); g.add(pl); }
  const f = { g, gl, fo, fi, pl, base: light, k: flames.length * 1.37, s }; flames.push(f); return f;
}
function candle(x, y, z, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const w = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.16, 12), flat(0xf3ead2)), 0.01); w.position.y = 0.08; g.add(w);
  const dish = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 16), flat(0xc9a24a)), 0.01); g.add(dish);
  const f = flame(g, 0.45, { glow: 1.8, ...opts }); f.g.position.y = 0.16; return g;
}
function lampGlow(x, z) {
  lamp(scene, x, z);
  const gl = glowMesh(0xffc070, 1.6, 0.6); gl.position.set(x, 2.45, z + 0.15); scene.add(gl);
  const pl = new THREE.PointLight(0xffb868, 4, 6, 1.3); pl.position.set(x, 2.3, z + 0.6); scene.add(pl);
  flames.push({ g: null, gl, pl, base: 4, k: flames.length * 1.37, s: 1, lampOnly: true });
}
function moon(x, y, z, r) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const gl = glowMesh(0xaab6ff, r * 7, 0.5); gl.position.z = -0.05; g.add(gl);
  g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(0xf6efcf)));
  for (const [dx, dy, rr] of [[-0.3, 0.2, 0.18], [0.25, -0.15, 0.24], [0.1, 0.38, 0.1]]) { const cr = new THREE.Mesh(new THREE.CircleGeometry(r * rr, 20), basic(0xddd3ad)); cr.position.set(dx * r, dy * r, 0.01); g.add(cr); }
  return g;
}
const stars = [];
function starField(cx, list, z) { for (const [x, y, s] of list) { const st = k.glyph('✦', '#fff6d0', 0.3 * s); st.position.set(cx + x, y, z); st.visible = true; st.material.depthTest = true; st.renderOrder = 0; st.userData.tw = x * 3 + y; st.userData.s = s; stars.push(st); } }
/** Hoja plana con dibujo de canvas (cartas, notas): no recibe luz, así siempre se lee. */
function paper(w, h, paint, px = 512) { const t = canvasTex(px, Math.round(px * h / w), paint); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true })); }
const HAND = 'italic 700 %spx Georgia, "Times New Roman", serif';
const hand = s => HAND.replace('%s', s);
function parchment(g, W, H) {
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#f1e3bf'; g.fillRect(8, 8, W - 16, H - 16);
  g.fillStyle = 'rgba(160,120,60,0.15)'; const r = rng(4); for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(r() * W, r() * H, 6 + r() * 26, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(120,90,50,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, H / 2); g.lineTo(W - 8, H / 2); g.stroke();       // doblez
}

// partículas
const puffA = k.puffs(5), puffB = k.puffs(5), puffC = k.puffs(5);
const qMarks = Array.from({ length: 3 }, () => k.glyph('?', '#ffd23a', 0.42));
const bang = k.glyph('!', '#ffd23a', 0.55), eqMark = k.glyph('=', '#ffd23a', 0.42), xMark = k.glyph('✗', '#ff4a4a', 0.62);
const sparks = Array.from({ length: 5 }, () => k.glyph('✦', '#fff1a8', 0.26));
const noteMarks = Array.from({ length: 3 }, () => k.glyph('♪', '#cfe8ff', 0.2));
function pointsCloud(n, color, size, op = 0.9) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: glowTex, transparent: true, opacity: op, depthWrite: false }));
  m.frustumCulled = false; scene.add(m); return m;
}

// =====================================================================================
// PERSONAJES
// =====================================================================================
const kaspar = makeToon({ shirt: 0x7a5a3e, skin: 0xf6d6b6, hair: 0xb07a3c, detail: ['buttons', 'collar', 'belt'], trim: 0xe6d6b0 }); scene.add(kaspar.root);
// capa y corona (cuando aparece el rumor del príncipe)
const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.78, 22, 1, true, PI - 1.35, 2.7), flat(0xb02a3a, { side: THREE.DoubleSide })); cape.position.y = 0.78; cape.castShadow = true; kaspar.root.add(cape);
const ermine = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), flat(0xf4f1e8)), 0.01); ermine.rotation.x = PI / 2; ermine.position.y = 1.14; kaspar.root.add(ermine);
const crown = new THREE.Group(); crown.position.y = 0.32; kaspar.head.add(crown);
crown.add(outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.09, 22, 1, true), flat(0xe8b830, { side: THREE.DoubleSide })), 0.012));
for (let a = 0; a < 2 * PI - 0.01; a += 2 * PI / 6) { const p = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), flat(0xe8b830)), 0.008); p.position.set(0.155 * Math.sin(a), 0.08, 0.155 * Math.cos(a)); crown.add(p); }
{ const j = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), flat(0xd63c3c)), 0.008); j.position.set(0, 0, 0.16); crown.add(j); }
// venda en la frente (después del ataque de 1829): una vincha blanca, sin nada más
const bandage = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 30), flat(0xf4f1e8)), 0.008); bandage.rotation.set(PI / 2 - 0.35, 0, 0); bandage.position.y = 0.08; bandage.scale.set(1.04, 1.04, 0.9); kaspar.head.add(bandage);
// cartas en las manos
const smallLetter = () => { const m = paper(0.2, 0.14, (g, W, H) => { parchment(g, W, H); g.strokeStyle = '#6a5030'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(40, 40 + i * 50); g.lineTo(W - 60, 40 + i * 50); g.stroke(); } }, 256); scene.add(m); return m; };
const letA = smallLetter(), letB = smallLetter();

const vecino = makeToon({ shirt: 0x4f6f8f, hair: 0x3a2a1e, hat: { type: 'top', color: 0x2b2f3a, band: 0x8f2433 }, mustache: true, detail: ['apron', 'collar'], trim: 0xd9c7a3 }); scene.add(vecino.root);
const officer = makeToon({ shirt: 0x2f4a7a, hair: 0x2b2118, hat: { type: 'kepi', color: 0x1b2440 }, mustache: true, detail: ['buttons', 'badge', 'belt'] }); scene.add(officer.root);
const scientist = makeToon({ shirt: 0x6aa0b8, hair: 0x9aa0a8, detail: ['apron', 'collar'], trim: 0xffffff }); scene.add(scientist.root);

// el encapuchado: capa, capucha y dos ojitos; nunca se le ve la cara
function makeHooded() {
  const g = new THREE.Group(); scene.add(g); const m = flat(0x2a2040);
  const cloak = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.36, 22), m), 0.024); cloak.position.y = 0.68; g.add(cloak);
  const hood = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.3, 22, 16), m), 0.024); hood.position.y = 1.42; g.add(hood);
  const tip = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 14), m), 0.016); tip.position.set(0, 1.62, -0.14); tip.rotation.x = -0.8; g.add(tip);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.205, 24), basic(0x07040c)); hole.scale.y = 1.12; hole.position.set(0, 1.39, 0.296); g.add(hole);
  const eyes = [-1, 1].map(s => { const e = new THREE.Mesh(new THREE.CircleGeometry(0.03, 14), basic(0xfff1a8)); e.scale.y = 0.6; e.position.set(s * 0.075, 1.43, 0.3); g.add(e); return e; });
  const arm = new THREE.Group(); arm.position.set(-0.2, 1.08, 0.08); g.add(arm);
  const sl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.46, 10), m), 0.016); sl.position.y = -0.23; arm.add(sl);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), INK); hd.position.y = -0.48; arm.add(hd);
  return { g, eyes, arm, hd };
}
const hooded = makeHooded();
const purse = new THREE.Group(); scene.add(purse);
{ const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), flat(0x8a4ad0)), 0.012); b.scale.set(1, 0.85, 0.8); purse.add(b);
  const neck = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.06, 10), flat(0x8a4ad0)), 0.008); neck.position.y = 0.075; neck.rotation.x = PI; purse.add(neck);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 14), basic(0xffd23a)); tie.rotation.x = PI / 2; tie.position.y = 0.07; purse.add(tie); }

// caballito de madera con ruedas (los juguetes que contó Kaspar)
function woodHorse(color = 0xf0e4c8, s = 1.35) {
  const g = new THREE.Group(); g.scale.setScalar(s); scene.add(g); const m = flat(color), dk = flat(0x7a4b2a);
  block(g, 0x8a5a33, -0.2, 0.2, 0.05, 0.08, 0.08, -0.08, 0.008);
  const wheels = [];
  for (const [x, z] of [[-0.14, 0.09], [0.14, 0.09], [-0.14, -0.09], [0.14, -0.09]]) { const w = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 14), dk), 0.008); w.rotation.x = PI / 2; w.position.set(x, 0.045, z); g.add(w);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.07), basic(0xf0e4c8)); sp.position.z = z > 0 ? 0.012 : -0.012; sp.rotation.x = -PI / 2; w.add(sp); wheels.push(w); }
  for (const [x, z] of [[-0.11, 0.05], [0.11, 0.05], [-0.11, -0.05], [0.11, -0.05]]) { const l = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), m), 0.008); l.position.set(x, 0.15, z); g.add(l); }
  const body = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 6, 14), m), 0.012); body.rotation.z = PI / 2; body.position.y = 0.25; g.add(body);
  const neck = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 10), m), 0.01); neck.position.set(0.15, 0.34, 0); neck.rotation.z = -0.55; g.add(neck);
  const head = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.07, 6, 12), m), 0.01); head.position.set(0.22, 0.41, 0); head.rotation.z = PI / 2 - 0.4; g.add(head);
  for (const z of [-0.025, 0.025]) { const e = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 6), m), 0.006); e.position.set(0.19, 0.47, z); g.add(e); }
  for (const z of [-0.047, 0.047]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), INK); e.position.set(0.225, 0.43, z); g.add(e); }
  for (let i = 0; i < 4; i++) { const mn = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), dk); mn.position.set(0.13 + i * 0.02, 0.38 + i * 0.022, 0); g.add(mn); }
  const tail = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 8), dk), 0.006); tail.position.set(-0.2, 0.24, 0); tail.rotation.z = -2.2; g.add(tail);
  const spots = [[-0.04, 0.29, 0.07], [0.05, 0.22, 0.068]].map(([x, y, z]) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), basic(0x7a4b2a)); d.position.set(x, y, z); g.add(d); return d; });
  g.userData = { wheels, tail }; return g;
}

// palomas de la plaza
function pigeon() {
  const g = new THREE.Group(); scene.add(g);
  const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), flat(0x9a9cb8)), 0.012); b.scale.set(1.4, 0.95, 0.95); b.position.y = 0.08; g.add(b);
  const hd = new THREE.Group(); hd.position.set(0.085, 0.15, 0); g.add(hd);
  hd.add(outlined(new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), flat(0x7d7fa0)), 0.01));
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 6), basic(0xe0a040)); bk.rotation.z = -PI / 2; bk.position.x = 0.05; hd.add(bk);
  for (const z of [-0.03, 0.03]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), INK); e.position.set(0.02, 0.012, z); hd.add(e); }
  const wings = [-1, 1].map(s => { const w = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), flat(0x6f7190)), 0.008); w.scale.set(1.2, 0.25, 0.8); w.position.set(-0.01, 0.11, s * 0.055); g.add(w); return w; });
  g.userData = { hd, wings }; return g;
}

// =====================================================================================
// PLAZA DE NÚREMBERG (x = 0): casas de entramado al atardecer, iglesia al fondo, faroles, palomas
// =====================================================================================
surface(scene, tex.cobble({ base: '#857b92', line: '#4e4660', rows: 7, cols: 5 }, 16, 11), 44, 30, PX, 0.001, 0, true);
k.plane(scene, new THREE.MeshBasicMaterial({ map: canvasTex(8, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(240,140,110,0)'); gr.addColorStop(0.7, 'rgba(240,150,110,0.75)'); gr.addColorStop(1, 'rgba(255,190,130,0.95)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }), transparent: true, depthWrite: false }), 60, 6, PX, 3, -13);
/** Casa de entramado (Fachwerk): vigas oscuras sobre revoque, techo a dos aguas, ventanas encendidas. */
function fachwerk(x, z, w, h, { wall = '#d9c7a6', beam = '#3a2418', roof = '#7a3428', seed = 1 } = {}) {
  return picture(scene, w, h, x, h / 2, z, (g, W, H) => {
    const r = rng(seed), gab = H * 0.36, floors = 3, fh = (H - gab) / floors;
    g.fillStyle = roof; g.beginPath(); g.moveTo(-4, gab + 6); g.lineTo(W / 2, 0); g.lineTo(W + 4, gab + 6); g.fill();
    g.strokeStyle = '#4e1e16'; g.lineWidth = 4; for (let i = 1; i < 7; i++) { const y = gab * i / 7, hw = W / 2 * (y / gab); g.beginPath(); g.moveTo(W / 2 - hw, y); g.lineTo(W / 2 + hw, y); g.stroke(); }
    g.fillStyle = wall; g.beginPath(); g.moveTo(W * 0.12, gab); g.lineTo(W / 2, gab * 0.22); g.lineTo(W * 0.88, gab); g.fill();
    g.fillRect(0, gab, W, H - gab);
    g.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 40; i++) g.fillRect(r() * W, gab + r() * (H - gab), 22, 6);
    g.strokeStyle = beam; g.lineWidth = 14;
    g.beginPath(); g.moveTo(W * 0.12, gab); g.lineTo(W / 2, gab * 0.22); g.lineTo(W * 0.88, gab); g.stroke();
    g.beginPath(); g.moveTo(W / 2, gab * 0.22); g.lineTo(W / 2, gab); g.stroke();
    for (let f = 0; f <= floors; f++) { g.beginPath(); g.moveTo(0, gab + f * fh); g.lineTo(W, gab + f * fh); g.stroke(); }
    const cols = 3, cw = W / cols;
    for (let f = 0; f < floors; f++) for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * cw, gab + f * fh); g.lineTo(i * cw, gab + (f + 1) * fh); g.stroke(); }
    g.lineWidth = 10;
    for (let f = 0; f < floors - 1; f++) for (let i = 0; i < cols; i++) {
      const x0 = i * cw, y0 = gab + f * fh, wx = x0 + cw * 0.3, wy = y0 + fh * 0.22, ww = cw * 0.4, wh = fh * 0.5;
      if ((i + f + seed) % 2) { g.beginPath(); g.moveTo(x0, y0 + fh); g.lineTo(wx, wy + wh); g.moveTo(x0 + cw, y0 + fh); g.lineTo(wx + ww, wy + wh); g.stroke(); }
      g.fillStyle = r() < 0.55 ? '#ffd36a' : '#33395a'; g.fillRect(wx, wy, ww, wh);
      g.strokeStyle = beam; g.lineWidth = 7; g.strokeRect(wx, wy, ww, wh); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2); g.stroke();
      g.fillStyle = '#5a6f4a'; g.fillRect(wx - ww * 0.32, wy, ww * 0.28, wh); g.fillRect(wx + ww * 1.04, wy, ww * 0.28, wh);
      g.lineWidth = 10;
    }
    const sy = gab + (floors - 1) * fh;                                              // planta baja: puerta y vidriera
    g.fillStyle = '#4a2a1a'; g.beginPath(); g.moveTo(W * 0.58, H); g.lineTo(W * 0.58, sy + fh * 0.35); g.arc(W * 0.7, sy + fh * 0.35, W * 0.12, PI, 0); g.lineTo(W * 0.82, H); g.fill();
    g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.stroke();
    g.fillStyle = r() < 0.6 ? '#ffc65a' : '#3a4060'; g.fillRect(W * 0.1, sy + fh * 0.25, W * 0.36, fh * 0.5); g.strokeRect(W * 0.1, sy + fh * 0.25, W * 0.36, fh * 0.5);
    g.fillStyle = '#ffe9a3'; g.beginPath(); g.arc(W / 2, gab * 0.66, W * 0.06, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, H); g.lineTo(0, gab); g.lineTo(W / 2, 0); g.lineTo(W, gab); g.lineTo(W, H); g.stroke();
  }, 384);
}
// iglesia de dos torres al fondo
picture(scene, 6, 8.5, PX + 0.6, 4.25, -9, (g, W, H) => {
  g.fillStyle = '#3a2f5a'; const tw = W * 0.18;
  for (const cx of [W * 0.3, W * 0.7]) { g.fillRect(cx - tw / 2, H * 0.28, tw, H * 0.72); g.beginPath(); g.moveTo(cx - tw / 2 - 6, H * 0.28); g.lineTo(cx, H * 0.02); g.lineTo(cx + tw / 2 + 6, H * 0.28); g.fill(); }
  g.fillRect(W * 0.3, H * 0.5, W * 0.4, H * 0.5); g.beginPath(); g.moveTo(W * 0.3, H * 0.5); g.lineTo(W * 0.5, H * 0.36); g.lineTo(W * 0.7, H * 0.5); g.fill();
  g.fillStyle = '#ffcf6a'; g.beginPath(); g.arc(W * 0.5, H * 0.62, W * 0.08, 0, 7); g.fill();
  g.strokeStyle = '#3a2f5a'; g.lineWidth = 6; for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(W * 0.5, H * 0.62); g.lineTo(W * 0.5 + Math.cos(a * PI / 4) * W * 0.08, H * 0.62 + Math.sin(a * PI / 4) * W * 0.08); g.stroke(); }
  g.fillStyle = '#ffcf6a'; for (const cx of [W * 0.3, W * 0.7]) for (let j = 0; j < 3; j++) g.fillRect(cx - 8, H * (0.36 + j * 0.12), 16, H * 0.06);
});
[[-6.4, 2.1, 4.6, '#d6c3a3', 3], [-4.3, 2.0, 5.2, '#cfb6a0', 4], [-2.25, 2.1, 4.4, '#dccfae', 5], [1.9, 2.2, 5.0, '#d2bea6', 6], [4.05, 2.0, 4.5, '#ddc8a8', 7], [6.1, 2.1, 5.3, '#cdb89e', 8]]
  .forEach(([x, w, h, wall, seed]) => fachwerk(PX + x, -6.0, w, h, { wall, seed, roof: seed % 2 ? '#7a3428' : '#6a3a3a' }));
// fuente con agua que cae (en el hueco del centro)
const fountain = new THREE.Group(); fountain.position.set(PX - 0.1, 0, -4.9); scene.add(fountain);
{ const basin = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.42, 26), flat(0x8a86a0)), 0.02); basin.position.y = 0.21; basin.receiveShadow = true; fountain.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.72, 26), basic(0x5a7ab8)); water.rotation.x = -PI / 2; water.position.y = 0.43; fountain.add(water);
  const col = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 12), flat(0x9a96b0)), 0.014); col.position.y = 0.9; fountain.add(col);
  const top = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), flat(0xd9a441)), 0.014); top.position.y = 1.75; fountain.add(top); }
const drops = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), basic(0xbfe0ff)); m.userData.a = i * PI / 4; fountain.add(m); return m; });
lampGlow(PX - 3.1, -1.6); lampGlow(PX + 3.2, -1.7);
// cartel de taberna que se mece
const tavern = new THREE.Group(); tavern.position.set(PX + 2.75, 2.75, -5.6); scene.add(tavern);
block(scene, 0x2b2f3a, PX + 2.4, PX + 3.1, 2.78, 2.83, -5.58, -5.66, 0.008);
{ const s = picture(tavern, 0.5, 0.4, 0, -0.26, 0, (g, W, H) => { g.fillStyle = '#7a4b2a'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffd23a'; g.fillRect(W * 0.3, H * 0.25, W * 0.3, H * 0.55); g.fillStyle = '#ffffff'; g.fillRect(W * 0.28, H * 0.2, W * 0.34, H * 0.12); g.strokeStyle = '#ffd23a'; g.lineWidth = 12; g.beginPath(); g.arc(W * 0.66, H * 0.52, H * 0.14, -PI / 2, PI / 2); g.stroke(); g.strokeStyle = '#1e1428'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12); }); }
const cl1 = k.cloud(PX - 3, 7.2, -11, 1.1), cl2 = k.cloud(PX + 3.5, 8.3, -11, 0.8);
for (const cl of [cl1, cl2]) cl.children[0].material.color.set(0x8a6a9a);
k.birds([[PX, 6.2, 0], [PX, 6.9, 6], [PX, 5.8, 11]], -8);
const pigeons = [[-2.3, 0.9], [-1.9, 1.3], [-1.45, 0.75], [-1.05, 1.15], [1.6, 1.1]].map(([x, z], i) => { const p = pigeon(); p.userData.x0 = PX + x; p.userData.z0 = z; p.userData.i = i; return p; });
const townOpts = [
  { shirt: 0x8a4a5a, hair: 0x23262d, hat: { type: 'top', color: 0x23262d }, detail: ['buttons'] },
  { shirt: 0x5f7a5a, hair: 0xc98a3a, detail: ['apron', 'collar'], trim: 0xe9dcc0 },
  { shirt: 0x6a5a8a, hair: 0x6b4a2a, hat: { type: 'bowler', color: 0x3a2a1e }, mustache: true, detail: ['belt'] },
];
k.walker({ toon: townOpts[0], cx: PX, z: -3.1, speed: 0.7, off: 2, dir: 1, span: 15 });
k.walker({ toon: townOpts[1], cx: PX, z: -3.8, speed: 0.6, off: 8, dir: -1, span: 15 });
k.walker({ toon: townOpts[2], cx: PX, z: -3.45, speed: 0.8, off: 5, dir: -1, span: 15 });
const gawker = makeToon({ shirt: 0xb5654a, hair: 0x6b4a2a, hat: { type: 'boater', color: 0xf0d78a, band: 0x3f6ea8 }, detail: ['collar'], trim: 0xffffff }); scene.add(gawker.root);
// cartas grandes (para leerlas)
const bigA = paper(0.66, 0.46, (g, W, H) => { parchment(g, W, H); g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = hand(44);
  g.fillText('«…nunca lo dejé', W / 2, H * 0.3); g.fillText('dar un solo paso', W / 2, H * 0.52); g.fillText('fuera de mi casa»', W / 2, H * 0.74); }); scene.add(bigA);
const bigB = paper(0.66, 0.46, (g, W, H) => { parchment(g, W, H); g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = hand(46);
  g.fillText('«Se llama', W / 2, H * 0.3); g.fillText('Kaspar»', W / 2, H * 0.52); g.font = hand(36); g.fillText('30 de abril de 1812', W / 2, H * 0.76); }); scene.add(bigB);
const lens = new THREE.Group(); scene.add(lens);
{ const ring = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 26), flat(0xd9a441)), 0.008); lens.add(ring);
  const gl = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.3 })); lens.add(gl);
  const hd = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 8), flat(0x5a3420)), 0.008); hd.position.set(0.11, -0.13, 0); hd.rotation.z = 0.7; lens.add(hd); }

// =====================================================================================
// POLICÍA (x = 40): escritorio, vela, reloj de péndulo, estantes; Kaspar escribe su nombre
// =====================================================================================
surface(scene, tex.planks({ base: '#6a4a32', line: '#3e2a1a', n: 7 }, 10, 7), 44, 30, OX, 0.001, 0, true);
surface(scene, tex.stripes({ a: '#6f6a8a', b: '#655f80', dot: '#57516f' }, 18, 5), 40, 12, OX, 6, -1.8);
surface(scene, tex.planks({ base: '#5a3420', line: '#3a2010', n: 8 }, 40, 1), 40, 1.0, OX, 0.5, -1.79);
k.plane(scene, 0xd9a441, 40, 0.05, OX, 1.02, -1.78);
windowPic(scene, 0.9, 1.2, OX - 1.6, 2.3, -1.77, { sky: '#1e2350', curtain: '#5a3a6a' });
{ const m = moon(OX - 1.45, 2.55, -1.765, 0.09); m.children[0].visible = false; }
picture(scene, 1.0, 0.75, OX + 1.75, 2.3, -1.77, (g, W, H) => { g.fillStyle = '#4a2c1a'; g.fillRect(0, 0, W, H); g.fillStyle = '#2e1a10'; g.fillRect(10, H * 0.48, W - 20, 10);
  const r = rng(9); for (let s = 0; s < 2; s++) for (let i = 0; i < 10; i++) { g.fillStyle = ['#8f2433', '#3f6ea8', '#c9a24a', '#4f8f6b', '#e9dcc0'][Math.floor(r() * 5)]; const bh = 34 + r() * 22; g.fillRect(14 + i * 23, s * H * 0.5 + H * 0.46 - bh, 19, bh); }
  g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8); });
picture(scene, 0.42, 0.55, OX + 0.55, 2.35, -1.77, (g, W, H) => { g.fillStyle = '#efe2c0'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a2410'; g.font = '800 34px Montserrat'; g.textAlign = 'center'; g.fillText('AVISO', W / 2, 46);
  g.fillStyle = '#c9b48a'; for (let i = 0; i < 6; i++) g.fillRect(24, 78 + i * 24, W - 48 - (i % 2) * 30, 8); g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8); });
painting(scene, 0.55, 0.45, OX - 0.4, 2.55, -1.77, 2);
// reloj de péndulo
block(scene, 0x5a3420, OX + 2.6, OX + 3.05, 0, 2.1, -1.35, -1.7);
const clockFace = picture(scene, 0.34, 0.34, OX + 2.825, 1.8, -1.34, (g, W, H) => { g.fillStyle = '#f3ead2'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 6, 0, 7); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.stroke(); g.fillStyle = '#1e1428'; for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.fillRect(W / 2 + Math.cos(a) * W * 0.36 - 4, H / 2 + Math.sin(a) * W * 0.36 - 4, 8, 8); } });
const clockHand = k.plane(scene, 0x1e1428, 0.015, 0.12, OX + 2.825, 1.8, -1.33); clockHand.geometry.translate(0, 0.05, 0);
const pendulum = new THREE.Group(); pendulum.position.set(OX + 2.825, 1.5, -1.33); scene.add(pendulum);
{ const rod = k.plane(pendulum, 0xd9a441, 0.02, 0.7, 0, -0.35, 0); const bob = new THREE.Mesh(new THREE.CircleGeometry(0.07, 18), basic(0xd9a441)); bob.position.y = -0.72; pendulum.add(bob); }
k.plane(scene, 0x2e1a10, 0.3, 0.9, OX + 2.825, 1.05, -1.345);
// escritorio
block(scene, 0x6a3a1e, OX - 0.35, OX + 1.15, 0, 0.76, 0.35, -0.25); block(scene, 0x8a5a33, OX - 0.4, OX + 1.2, 0.76, 0.82, 0.4, -0.3);
const deskCandle = candle(OX + 0.95, 0.82, -0.05, { light: 5 });
{ const ink = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.07, 12), flat(0x23262d)), 0.01); ink.position.set(OX + 0.7, 0.86, 0.2); scene.add(ink); }
for (let i = 0; i < 3; i++) block(scene, [0xe9dcc0, 0xd8c79f, 0xefe2c0][i], OX + 0.05, OX + 0.45, 0.82 + i * 0.02, 0.84 + i * 0.02, 0.1 + i * 0.01, -0.15, 0.005);
const ledCv = document.createElement('canvas'); ledCv.width = 512; ledCv.height = 340; const ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace; ledTex.anisotropy = 8;
let ledK = -1; const ledTip = { x: 0 };
function drawLedger(kk) {
  if (Math.abs(kk - ledK) < 0.003) return; ledK = kk; const g = ledCv.getContext('2d'), W = 512, H = 340;
  parchment(g, W, H);
  g.strokeStyle = '#c9b48a'; g.lineWidth = 2; for (let y = 230; y < H - 20; y += 34) { g.beginPath(); g.moveTo(40, y); g.lineTo(W - 40, y); g.stroke(); }
  const name = 'Kaspar Hauser', n = Math.floor(kk * name.length + 0.001);
  g.font = hand(76); g.fillStyle = '#1e1428'; g.textAlign = 'left';
  const full = g.measureText(name).width, x0 = W / 2 - full / 2; g.fillText(name.slice(0, n), x0, 150);
  ledTip.x = x0 + g.measureText(name.slice(0, n)).width;
  ledTex.needsUpdate = true;
}
const ledger = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.33), new THREE.MeshBasicMaterial({ map: ledTex })); ledger.position.set(OX - 0.2, 0.86, 0.12); ledger.rotation.x = -1.3; scene.add(ledger);
drawLedger(0);
const quill = new THREE.Group(); scene.add(quill);
{ const f = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), flat(0xf4f1e8)), 0.01); f.scale.set(0.3, 1.5, 0.15); f.position.y = 0.13; quill.add(f); block(quill, 0x23262d, -0.006, 0.006, -0.02, 0.06, 0.006, -0.006, 0.004); }
// perchero con capa
block(scene, 0x5a3420, OX - 2.6, OX - 2.54, 0, 1.9, -1.2, -1.26, 0.01);
{ const hat = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 16), flat(0x1b2440)), 0.012); hat.position.set(OX - 2.57, 1.95, -1.23); scene.add(hat); }
k.walker({ toon: { shirt: 0x2f4a7a, hair: 0x6b4a2a, hat: { type: 'kepi', color: 0x1b2440 }, detail: ['buttons', 'belt'] }, cx: OX - 2.8, z: -1.3, speed: 0.45, off: 3, dir: 1, span: 2.5 });

// =====================================================================================
// CELDA (x = 80): piedra oscura, ventanita con rayo de luz, paja, pan, jarra y dos caballitos
// =====================================================================================
surface(scene, tex.cobble({ base: '#4e4636', line: '#2e281e', rows: 6, cols: 4 }, 12, 9), 44, 30, CX, 0.001, 0, true);
surface(scene, texRep('bricks', { base: '#5a5470', mortar: '#2c283c', rows: 8, cols: 4, seed: 5 }, 12, 4), 30, 10, CX, 5, -1.4);
k.plane(scene, 0x1e1428, 30, 0.06, CX, 0.03, -1.39);
for (const x of [-2.4, 2.4]) block(scene, 0x403a56, CX + x - 0.18, CX + x + 0.18, 0, 4, -1.0, -1.4);
const winX = CX + 0.75, winY = 2.25;
picture(scene, 0.55, 0.45, winX, winY, -1.385, (g, W, H) => { g.fillStyle = '#ffe9b0'; g.fillRect(0, 0, W, H); g.fillStyle = '#1e1428'; for (let i = 1; i < 4; i++) g.fillRect(i * W / 4 - 7, 0, 14, H); g.lineWidth = 22; g.strokeStyle = '#1e1428'; g.strokeRect(0, 0, W, H); });
const winGlow = glowMesh(0xffe0a0, 1.6, 0.5); winGlow.position.set(winX, winY, -1.36); scene.add(winGlow);
const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.9), new THREE.MeshBasicMaterial({ map: canvasTex(8, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,240,190,0.55)'); gr.addColorStop(1, 'rgba(255,240,190,0.05)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
ray.position.set(CX + 0.35, 1.15, -0.75); ray.rotation.set(-0.5, 0, 0.35); scene.add(ray);
const cellLight = new THREE.PointLight(0xffe0a8, 6, 5, 1.2); cellLight.position.set(CX + 0.2, 1.8, 1.0); scene.add(cellLight);
const motes = pointsCloud(60, 0xfff1c0, 0.05, 0.85);
const moteSeed = Array.from({ length: 60 }, (_, i) => { const r = rng(100 + i); return [r(), r(), r(), r()]; });
// paja
{ const r = rng(21), mats = [flat(0xd9b04a), flat(0xc89a3a), flat(0xe8c460)];
  const bed = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 10), mats[1]), 0.02); bed.scale.set(1.1, 0.16, 0.6); bed.position.set(CX - 0.15, 0.03, -0.7); bed.receiveShadow = true; scene.add(bed);
  for (let i = 0; i < 46; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25 + r() * 0.2, 4), mats[i % 3]); s.position.set(CX - 0.15 + (r() - 0.5) * 1.3, 0.08 + r() * 0.04, -0.7 + (r() - 0.5) * 0.7); s.rotation.set(PI / 2 + (r() - 0.5) * 0.6, 0, (r() - 0.5) * 2.6); scene.add(s); } }
// pan y jarra
const bread = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.14, 6, 14), flat(0xb07a3c)), 0.014); bread.rotation.z = PI / 2; bread.position.set(CX - 0.85, 0.08, 0.25); scene.add(bread);
for (let i = 0; i < 3; i++) { const cut = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.1), basic(0xe8c88a)); cut.position.set(CX - 0.92 + i * 0.07, 0.13, 0.33); cut.rotation.set(-0.6, 0, 0.4); scene.add(cut); }
const jug = new THREE.Group(); jug.position.set(CX - 1.25, 0, 0.05); scene.add(jug);
{ const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.28, 16), flat(0x8a5a6a)), 0.014); b.position.y = 0.14; jug.add(b);
  const lip = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.05, 16), flat(0x8a5a6a)), 0.01); lip.position.y = 0.3; jug.add(lip);
  const hd = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 14, PI), flat(0x8a5a6a)), 0.006); hd.position.set(0.12, 0.16, 0); hd.rotation.z = -PI / 2; jug.add(hd);
  const w = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), basic(0x7ab0e0)); w.rotation.x = -PI / 2; w.position.y = 0.326; jug.add(w); }
const horse1 = woodHorse(0xf0e4c8), horse2 = woodHorse(0xe6d2a8, 1.2), horse3 = woodHorse(0xf0e4c8, 1.2);
horse2.rotation.y = 0.6;
const cellRat = new THREE.Group(); scene.add(cellRat);
{ const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), flat(0x6a6a80)), 0.012); b.scale.set(1.6, 0.9, 0.9); b.position.y = 0.07; cellRat.add(b);
  const ear = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), flat(0xd9a0a8)), 0.006); ear.position.set(-0.08, 0.13, 0.03); cellRat.add(ear);
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), INK); e.position.set(-0.1, 0.09, 0.05); cellRat.add(e);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.016), INK); tail.position.set(0.19, 0.06, 0); cellRat.add(tail); }

// =====================================================================================
// PALACIO (x = 120): el rumor del príncipe de Baden; dos cunas que se cambian
// =====================================================================================
surface(scene, tex.tiles({ base: '#c9c2b0', line: '#3a3450', n: 4, seed: 4 }, 14, 10), 44, 30, RX, 0.001, 0, true);
{ const t = canvasTex(256, 256, (g, W) => { g.fillStyle = '#5a1c2e'; g.fillRect(0, 0, W, W); g.strokeStyle = '#7a2a3e'; g.lineWidth = 6;
    for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i * 64 + 256, 0); g.lineTo(i * 64, 256); g.stroke(); }
    g.fillStyle = '#d9a441'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const x = i * 64 + 32, y = j * 64; g.beginPath(); g.ellipse(x, y + 10, 7, 14, 0, 0, 7); g.fill(); g.fillRect(x - 11, y + 22, 22, 4); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 6); surface(scene, t, 40, 12, RX, 6, -2.2); }
surface(scene, tex.planks({ base: '#5a3420', line: '#3a2010', n: 8 }, 40, 1), 40, 1.0, RX, 0.5, -2.19);
k.plane(scene, 0xd9a441, 40, 0.06, RX, 1.02, -2.18);
for (const x of [-2.2, 2.9]) picture(scene, 0.9, 3.4, RX + x, 1.75, -2.1, (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, 0); for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, i % 2 ? '#2a3f8a' : '#3a52a8'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#d9a441'; g.fillRect(0, 0, W, H * 0.06); for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(i * W / 7, H * 0.07, 10, 0, PI); g.fill(); } g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6); });
// retrato del gran duque y escudo de Baden (amarillo-rojo-amarillo)
picture(scene, 0.8, 1.0, RX - 0.9, 2.45, -2.15, (g, W, H) => { g.fillStyle = '#3a2a4a'; g.fillRect(0, 0, W, H); g.fillStyle = '#b02a3a'; g.beginPath(); g.moveTo(W * 0.2, H); g.lineTo(W * 0.3, H * 0.62); g.lineTo(W * 0.7, H * 0.62); g.lineTo(W * 0.8, H); g.fill();
  g.fillStyle = '#f6d2ae'; g.beginPath(); g.arc(W / 2, H * 0.45, W * 0.17, 0, 7); g.fill(); g.fillStyle = '#ece8e0'; g.beginPath(); g.arc(W / 2, H * 0.36, W * 0.19, PI, 0); g.fill();
  g.fillStyle = '#1e1428'; g.fillRect(W * 0.42, H * 0.44, 8, 10); g.fillRect(W * 0.55, H * 0.44, 8, 10); g.fillStyle = '#e8b830'; g.fillRect(W * 0.36, H * 0.22, W * 0.28, H * 0.06);
  g.strokeStyle = '#d9a441'; g.lineWidth = 18; g.strokeRect(9, 9, W - 18, H - 18); });
picture(scene, 0.62, 0.76, RX + 1.25, 2.5, -2.15, (g, W, H) => { g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(10, 10); g.lineTo(W - 10, 10); g.lineTo(W - 10, H * 0.55); g.quadraticCurveTo(W - 10, H - 10, W / 2, H - 6); g.quadraticCurveTo(10, H - 10, 10, H * 0.55); g.closePath(); g.fill();
  g.save(); g.clip(); g.fillStyle = '#d63c3c'; g.beginPath(); g.moveTo(0, H * 0.25); g.lineTo(W * 0.2, 0); g.lineTo(W, H * 0.75); g.lineTo(W * 0.8, H); g.closePath(); g.fill(); g.restore();
  g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.beginPath(); g.moveTo(10, 10); g.lineTo(W - 10, 10); g.lineTo(W - 10, H * 0.55); g.quadraticCurveTo(W - 10, H - 10, W / 2, H - 6); g.quadraticCurveTo(10, H - 10, 10, H * 0.55); g.closePath(); g.stroke(); });
{ const s = k.sign('BADEN', 0.9, 0.26, { bg: '#ffd23a', fg: '#7a1c2a' }); s.position.set(RX + 1.25, 3.1, -2.14); scene.add(s); }
// araña de velas
const chandelier = new THREE.Group(); chandelier.position.set(RX + 0.5, 3.15, -0.8); scene.add(chandelier);
{ const ring = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 30), flat(0xd9a441)), 0.01); ring.rotation.x = PI / 2; chandelier.add(ring);
  block(chandelier, 0xd9a441, -0.015, 0.015, 0, 1.2, 0.015, -0.015, 0.006);
  for (let a = 0; a < 2 * PI - 0.01; a += PI / 3) { const cg = new THREE.Group(); cg.position.set(0.42 * Math.cos(a), 0.02, 0.42 * Math.sin(a)); chandelier.add(cg);
    const w = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10), flat(0xf3ead2)), 0.008); w.position.y = 0.06; cg.add(w);
    const f = flame(cg, 0.35, { glow: 1.6 }); f.g.position.y = 0.12; } }
{ const pl = new THREE.PointLight(0xffc070, 6, 7, 1.2); pl.position.set(RX + 0.5, 2.6, 0.5); scene.add(pl); }
function cradle(withCrown) {
  const g = new THREE.Group(); scene.add(g);
  block(g, 0xc9a24a, -0.34, 0.34, 0.16, 0.36, 0.2, -0.2, 0.014);
  block(g, 0xf4f1e8, -0.3, 0.3, 0.33, 0.4, 0.17, -0.17, 0.01);
  for (const z of [-0.18, 0.18]) { const r = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 6, 24, 1.2), flat(0x8a5a33)), 0.006); r.rotation.z = -PI / 2 - 0.6; r.position.set(0, 0.5, z); g.add(r); }
  const baby = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), flat(0xf6d2ae)), 0.012); baby.position.set(-0.16, 0.47, 0.02); g.add(baby);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 4, 10, PI), INK); e.position.set(-0.16 + s * 0.035, 0.48, 0.11); e.rotation.z = PI; g.add(e); }
  const bl = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), flat(withCrown ? 0x3a52a8 : 0x9a9a7a)), 0.012); bl.scale.set(1.2, 0.4, 0.75); bl.position.set(0.08, 0.42, 0); g.add(bl);
  if (withCrown) { const cr = k.glyph('♛', '#ffd23a', 0.3); cr.visible = true; cr.material.depthTest = true; cr.position.set(0, 0.75, 0); g.add(cr); g.userData.crown = cr; }
  return g;
}
const cradleA = cradle(true), cradleB = cradle(false);
k.walker({ toon: { shirt: 0x23262d, hair: 0x6b4a2a, detail: ['apron', 'collar'], trim: 0xffffff }, cx: RX, z: -1.55, speed: 0.5, off: 4, dir: -1, span: 10 });

// =====================================================================================
// SÓTANO (x = 160, 1829): piedra, escalera, toneles, farol; la sombra del encapuchado en la pared
// =====================================================================================
surface(scene, tex.cobble({ base: '#5e5a72', line: '#3c384e', rows: 7, cols: 5 }, 12, 9), 44, 30, SX, 0.001, 0, true);
surface(scene, texRep('bricks', { base: '#6a6484', mortar: '#3a3650', rows: 8, cols: 4, seed: 9 }, 12, 4), 30, 10, SX, 5, -1.6);
k.plane(scene, 0x1e1428, 30, 0.06, SX, 0.03, -1.59);
for (let i = 0; i < 7; i++) block(scene, 0x6a4a32, SX - 2.6 + i * 0.0, SX - 1.7, 0, 0.3 + i * 0.3, -1.55 + 0, -1.55 + 0.32 * (7 - i), 0.012);
for (const [x, z] of [[1.6, -1.1], [2.25, -1.05], [1.95, -0.45]]) { const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.75, 18), flat(0x7a4b2a)), 0.018); b.position.set(SX + x, 0.375, z); b.receiveShadow = true; scene.add(b);
  for (const y of [0.15, 0.6]) { const hb = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.014, 6, 24), INK); hb.rotation.x = PI / 2; hb.position.set(SX + x, y, z); scene.add(hb); } }
const cellarLamp = new THREE.Group(); cellarLamp.position.set(SX + 0.9, 2.0, -1.45); scene.add(cellarLamp);
{ block(cellarLamp, 0x23262d, -0.07, 0.07, -0.3, -0.26, 0.07, -0.07, 0.01); block(cellarLamp, 0x23262d, -0.06, 0.06, -0.06, -0.02, 0.06, -0.06, 0.01);
  const gls = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), basic(0xffd98a)), 0.012); gls.position.y = -0.16; cellarLamp.add(gls);
  const f = flame(cellarLamp, 0.4, { light: 6, glow: 3.2 }); f.g.position.y = -0.22; f.fo.visible = f.fi.visible = false; }
// sombra del encapuchado sobre la pared
const shadowFig = new THREE.Group(); shadowFig.position.set(SX - 0.7, 0, -1.58); scene.add(shadowFig);
{ const pts = [[-0.55, 0], [-0.38, 1.1], [-0.42, 1.45], [-0.3, 1.85], [-0.1, 2.05], [0.15, 2.12], [0.32, 1.98], [0.38, 1.7], [0.3, 1.45], [0.45, 1.25], [0.55, 0]];
  const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])))), new THREE.MeshBasicMaterial({ color: 0x0a0612, transparent: true, opacity: 0.85, depthWrite: false }));
  shadowFig.add(m);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), basic(0xfff1a8)); e.scale.y = 0.6; e.position.set(0.02 + s * 0.08, 1.75, 0.01); shadowFig.add(e); } }

// =====================================================================================
// PARQUE DE ANSBACH (x = 200, 1833): nieve que cae, pinos nevados, faroles, la tumba (x = 206)
// =====================================================================================
{ const t = canvasTex(512, 512, (g, W) => { g.fillStyle = '#d8e0f2'; g.fillRect(0, 0, W, W); const r = rng(31); for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? '#c3cde6' : '#eef2ff'; g.beginPath(); g.ellipse(r() * W, r() * W, 6 + r() * 22, 3 + r() * 7, 0, 0, 7); g.fill(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 7); surface(scene, t, 44, 30, AX + 2, 0.001, 0, true); }
k.plane(scene, 0x1c2148, 60, 3, AX + 2, 1.2, -12.2);
for (const [dx, r, col] of [[-6, 6, 0x2a2f5a], [3, 7.5, 0x252a52], [10, 5.5, 0x2c3160]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(col)); h.scale.y = 0.4; h.position.set(AX + dx, 0, -12); scene.add(h);
  const sn = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 40, 0.5, PI - 1.0), basic(0x9aa6d0)); sn.scale.y = 0.4; sn.position.set(AX + dx, 0, -11.95); scene.add(sn); }
moon(AX + 2.8, 7.6, -13, 0.8);
starField(AX, [[-3.5, 8.6, 0.8], [-1.5, 9.6, 0.6], [0.6, 8.9, 0.7], [4.6, 9.4, 0.5], [6.4, 8.1, 0.7], [-5.2, 7.4, 0.5], [1.8, 10.4, 0.5], [8.2, 9.8, 0.6]], -12.5);
// el edificio de la Orangerie al fondo, con ventanas encendidas
picture(scene, 12, 2.8, AX + 2, 1.4, -8.5, (g, W, H) => {
  g.fillStyle = '#4a4a78'; g.fillRect(0, H * 0.2, W, H * 0.8); g.fillStyle = '#3a3a62'; g.fillRect(0, H * 0.12, W, H * 0.1); g.fillRect(W * 0.42, 0, W * 0.16, H * 0.2);
  g.fillStyle = '#cfd8f5'; g.fillRect(0, H * 0.1, W, H * 0.04); g.fillRect(W * 0.42, 0, W * 0.16, H * 0.03);
  const r = rng(12); for (let i = 0; i < 22; i++) { const x = W * (0.03 + i * 0.044); g.fillStyle = r() < 0.6 ? '#ffd36a' : '#2a2e52'; g.beginPath(); g.moveTo(x, H * 0.9); g.lineTo(x, H * 0.45); g.arc(x + W * 0.012, H * 0.45, W * 0.012, PI, 0); g.lineTo(x + W * 0.024, H * 0.9); g.fill(); }
  g.fillStyle = '#d8e0f2'; g.fillRect(0, H * 0.92, W, H * 0.08);
});
function snowyPine(x, z, h = 2.4) {
  const g = k.tree(x, z, { pine: true, leaf: 0x2f5a4a, h });
  for (let i = 0; i < 3; i++) { const r = 0.62 - i * 0.14, cy = h * 0.42 + i * 0.5; const cap = outlined(new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, 0.36, 12), flat(0xeef2ff)), 0.016); cap.position.y = cy + 0.23; g.add(cap); }
  return g;
}
function bareTree(x, z, s = 1) {
  const g = k.tree(x, z, { h: 0.01, leaf: 0x000000 }); g.children.slice(1).forEach(ch => { ch.visible = false; });       // solo el tronco como base
  const m = flat(0x4a3428), sn = flat(0xeef2ff);
  const tr = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.11 * s, 2.2 * s, 10), m), 0.016); tr.position.y = 1.1 * s; g.add(tr);
  for (const [y, a, l] of [[1.3, 0.8, 0.8], [1.6, -0.9, 0.7], [1.95, 0.6, 0.6], [2.1, -0.5, 0.5], [1.0, -1.0, 0.55]]) {
    const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.045 * s, l * s, 8), m), 0.012); b.position.set(Math.sin(a) * l * 0.5 * s, y * s + Math.cos(a) * l * 0.5 * s, 0); b.rotation.z = -a; g.add(b);
    const c = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, l * 0.7 * s, 8), sn), 0.008); c.position.copy(b.position).add(V(0, 0.035, 0)); c.rotation.z = -a; g.add(c);
  }
  return g;
}
snowyPine(AX - 3.2, -2.6, 2.8); snowyPine(AX + 3.6, -3.0, 2.6); snowyPine(AX - 1.4, -4.2, 2.4); snowyPine(AX + 5.4, -2.2, 2.5); snowyPine(AX + 8.6, -2.8, 2.7);
bareTree(AX + 1.9, -1.9, 1.05); bareTree(AX - 4.8, -1.6, 1.1); bareTree(AX + 7.4, -1.5, 1.0);
lampGlow(AX - 2.1, -1.2); lampGlow(AX + 2.8, -1.4); lampGlow(AX + 7.3, -0.8);
{ const bench = new THREE.Group(); bench.position.set(AX - 0.9, 0, -1.7); scene.add(bench);
  block(bench, 0x6a4a32, -0.6, 0.6, 0.4, 0.46, 0.2, -0.2, 0.012); block(bench, 0x6a4a32, -0.6, 0.6, 0.6, 0.8, -0.16, -0.22, 0.012);
  for (const x of [-0.5, 0.5]) block(bench, 0x23262d, x - 0.03, x + 0.03, 0, 0.4, 0.15, -0.15, 0.01);
  block(bench, 0xeef2ff, -0.58, 0.58, 0.46, 0.52, 0.18, -0.18, 0.008); }
// tumba (x = 206)
const grave = new THREE.Group(); grave.position.set(GX, 0, -0.5); scene.add(grave);
{ block(grave, 0x7d8299, -0.45, 0.45, 0, 1.0, 0.12, -0.12, 0.02);
  const top = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.24, 26, 1, false, 0, PI), flat(0x7d8299)), 0.02); top.rotation.set(PI / 2, PI / 2, 0); top.position.y = 1.0; grave.add(top);
  const snowTop = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8), flat(0xeef2ff)), 0.012); snowTop.scale.set(1.3, 0.25, 0.4); snowTop.position.y = 1.42; grave.add(snowTop);
  const plate = paper(0.66, 0.58, (g, W, H) => { g.fillStyle = '#6e6e8c'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4f1e8'; g.textAlign = 'center'; g.font = '800 62px Montserrat'; g.fillText('KASPAR', W / 2, H * 0.3); g.fillText('HAUSER', W / 2, H * 0.52);
    g.font = '600 46px Montserrat'; g.fillText('† 1833', W / 2, H * 0.74); g.strokeStyle = '#f4f1e8'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28); });
  plate.position.set(0, 0.86, 0.125); grave.add(plate);
  const mound = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), flat(0xe2e8f7)), 0.014); mound.scale.set(1.2, 0.2, 1.4); mound.position.set(0, 0.0, 0.75); grave.add(mound); }
const graveCandle = candle(GX - 0.62, 0, -0.1, { light: 1.5 });
// nieve que cae
const SN = 520, snow = pointsCloud(SN, 0xffffff, 0.07, 0.95);
const snowSeed = Array.from({ length: SN }, (_, i) => { const r = rng(500 + i); return [r(), r(), r(), r()]; });
// el lab no tiene nieve: un segundo grupo de copos por si la cámara mira la tumba
// =====================================================================================
// LABORATORIO (x = 240): microscopio, pantalla con barras de ADN, hélice que gira, corona tachada
// =====================================================================================
surface(scene, tex.tiles({ base: '#4a5878', line: '#2e3652', n: 4, seed: 7 }, 12, 9), 44, 30, LX, 0.001, 0, true);
surface(scene, tex.tiles({ base: '#5a6a8e', line: '#3a4466', n: 5, seed: 3 }, 16, 5), 40, 12, LX, 6, -1.8);
k.plane(scene, 0x1e1428, 40, 0.06, LX, 0.03, -1.79);
block(scene, 0xdfe3ea, LX - 1.5, LX + 2.3, 0, 0.88, -0.25, -1.0); block(scene, 0x8a95ab, LX - 1.55, LX + 2.35, 0.88, 0.94, -0.2, -1.05);
const screen = picture(scene, 1.3, 0.9, LX + 0.1, 2.4, -1.77, (g, W, H) => { g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#0e2a3a'; g.fillRect(14, 14, W - 28, H - 28);
  const r = rng(77); g.font = '800 26px Montserrat'; g.fillStyle = '#8fe0ff'; g.textAlign = 'center'; g.fillText('KASPAR', W * 0.28, 44); g.fillText('BADEN', W * 0.72, 44);
  for (let i = 0; i < 9; i++) { const a = ['#59c36a', '#ffd23a', '#ff6a5a', '#6ab0ff'][Math.floor(r() * 4)], b = i % 3 === 1 ? ['#59c36a', '#ffd23a', '#ff6a5a', '#6ab0ff'][Math.floor(r() * 4)] : a;
    g.fillStyle = a; g.fillRect(W * 0.14, 62 + i * 15, W * 0.28, 10); g.fillStyle = b; g.fillRect(W * 0.58, 62 + i * 15, W * 0.28, 10); } });
const scanLine = k.plane(scene, new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.6 }), 1.1, 0.02, LX + 0.1, 2.4, -1.76);
const microscope = new THREE.Group(); microscope.position.set(LX - 0.95, 0.94, -0.6); scene.add(microscope);
{ block(microscope, 0x3a4466, -0.15, 0.15, 0, 0.05, 0.12, -0.12, 0.01); block(microscope, 0x3a4466, -0.04, 0.04, 0.05, 0.45, -0.04, -0.12, 0.01);
  const tube = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 12), flat(0xdfe3ea)), 0.01); tube.position.set(0, 0.42, 0.02); tube.rotation.x = 0.4; microscope.add(tube);
  block(microscope, 0x8a95ab, -0.1, 0.1, 0.16, 0.19, 0.1, -0.06, 0.008); }
const tubes = [];
{ const rack = new THREE.Group(); rack.position.set(LX + 1.9, 0.94, -0.55); scene.add(rack); block(rack, 0x8a5a33, -0.25, 0.25, 0, 0.06, 0.08, -0.08, 0.01);
  [0x59c36a, 0xff6a5a, 0x6ab0ff, 0xffd23a].forEach((col, i) => { const tb = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 10), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.55 })), 0.008); tb.position.set(-0.18 + i * 0.12, 0.15, 0); rack.add(tb);
    const lq = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.14, 10), basic(col)); lq.position.set(-0.18 + i * 0.12, 0.1, 0); rack.add(lq);
    const bub = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), basic(0xffffff)); rack.add(bub); tubes.push({ bub, x: -0.18 + i * 0.12, k: i * 0.7 }); }); }
const helix = new THREE.Group(); helix.position.set(LX + 1.15, 1.05, -0.55); scene.add(helix);
{ const cols = [0x59c36a, 0xffd23a, 0xff6a5a, 0x6ab0ff];
  for (let i = 0; i < 16; i++) { const y = i * 0.075, a = i * 0.55;
    for (const s of [0, PI]) { const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), flat(s ? 0xdfe3ea : 0x8a4ad0)), 0.008); b.position.set(0.2 * Math.cos(a + s), y, 0.2 * Math.sin(a + s)); helix.add(b); }
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), flat(cols[i % 4])); rung.rotation.z = PI / 2; rung.rotation.y = -a; rung.position.y = y; helix.add(rung); } }
const labCrown = new THREE.Group(); labCrown.position.set(LX + 1.75, 1.6, -0.5); scene.add(labCrown);
{ labCrown.add(outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.12, 22, 1, true), flat(0xe8b830, { side: THREE.DoubleSide })), 0.014));
  for (let a = 0; a < 2 * PI - 0.01; a += 2 * PI / 6) { const p = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), flat(0xe8b830)), 0.008); p.position.set(0.195 * Math.sin(a), 0.1, 0.195 * Math.cos(a)); labCrown.add(p); } }
{ const pl = new THREE.PointLight(0x8fd0ff, 4, 6, 1.2); pl.position.set(LX + 0.3, 1.9, 0.8); scene.add(pl); }

// =====================================================================================
// POSES
// =====================================================================================
const head = { k: V(0, 0, 0), v: V(0, 0, 0), o: V(0, 0, 0), s: V(0, 0, 0), h: V(0, 0, 0) };
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), hv = V(0, 0, 0);
const KX0 = PX - 0.6, ARRIVE = Math.min(T.chico + 0.6, T.casi - 0.2);
const VX = PX + 0.85;
const KPX = OX - 0.82, KCX = CX - 0.05, KRX = RX - 0.9, KSX = SX + 0.05, KAX = AX - 0.45;
const strX = t => t < T.parque + 0.2 ? lerp(AX + 2.6, AX + 0.45, prog(t, c[7] + 0.6, T.parque + 0.2)) : t < T.atacan + 0.15 ? lerp(AX + 0.45, AX + 0.1, prog(t, T.atacan - 0.1, T.atacan + 0.15)) : lerp(AX + 0.1, AX + 6.5, prog(t, T.atacan + 0.35, T.atacan + 1.6));

function poseKaspar(t) {
  let p = null; cape.visible = ermine.visible = crown.visible = false; bandage.visible = false;
  const chest = (x, z = 0) => V(x + 0.06, 0.98, z + 0.24);
  if (t < c[3]) {                                           // plaza: llega tambaleando, con las cartas
    if (t < ARRIVE) {
      p = { ...go(t, 0.2, ARRIVE, PX - 4.4, KX0, 0.3), mood: 'worried' };
      p.lean += 0.16; p.tilt = 0.14 * Math.sin(t * 5.3); p.handL = V(p.x + 0.12, 0.95, 0.3); p.wL = 0.6; p.handR = V(p.x + 0.16, 0.92, -0.05); p.wR = 0.5;
    } else {
      const give = win(t, T.cartas + 0.2, c[2] - 0.1, 0.3);
      p = { x: KX0, face: 0.55, squash: settle(t, ARRIVE, 0.12) * breathe(t), y: hop(t, T.nadie, 0.1),
        look: t < T.casi ? V(VX, 1.45, 0.5) : t < T.nadie ? V(KX0 + 0.3, 1.5, 9) : t < c[1] ? V(VX, 1.45, 1) : t < c[2] ? V(PX + 0.1, 0.85, 0.8) : t < T.mano ? V(PX + 0.3, 0.85, 0.8) : V(KX0 + 0.2, 1.4, 9),
        handL: chest(KX0 - 0.1), wL: t < c[2] ? 1 : 0.4, handR: give > 0 ? V(lerp(KX0 + 0.3, VX - 0.38, give), 1.02, 0.35) : chest(KX0 + 0.05), wR: 1,
        ...moodAt(t, [[0, 'worried'], [T.casi, 'surprised'], [T.nadie + 0.3, 'worried'], [c[2], 'neutral'], [T.misma, 'worried']]) };
      p.tilt = 0.08 * Math.sin(t * 1.9);
    }
  } else if (t < c[4]) {                                    // policía: escribe su nombre
    const w0 = T.escribir - 0.1, w1 = T.hauser - 0.05, writing = t > w0 && t < w1;
    tmp.set(OX - 0.2 + (ledTip.x / 512 - 0.5) * 0.5, 0.86 + 0.015 * Math.sin(t * 22), 0.15 + 0.03);
    p = { x: KPX, z: 0.45, face: writing ? 1.0 : 0.45, crouch: 0.15, lean: 0.22, squash: breathe(t), look: writing ? V(OX - 0.2, 0.82, 0.15) : t < c[3] + 0.7 ? V(KPX + 0.2, 1.45, 9) : V(OX + 0.7, 1.45, -0.6),
      handR: writing ? tmp : V(KPX + 0.32, 0.78, 0.7), wR: 1, handL: V(KPX + 0.2, 0.86, 0.6), wL: 0.7,
      ...moodAt(t, [[0, 'neutral'], [w0, 'effort'], [w1, 'happy']]) };
    if (t > w1) { p.look = V(KPX + 0.4, 1.5, 9); p.y = hop(t, w1, 0.12); }
  } else if (t < c[5]) {                                    // celda: sentado en la paja, empuja el caballito
    const hx = CX + 0.5 + 0.1 * Math.sin((t - c[4]) * 2.4);
    p = { x: KCX, z: -0.3, face: 0.25, crouch: 1.0, y: -0.06, squash: breathe(t),
      look: t < c[4] + 0.7 ? V(KCX + 0.2, 1.2, 9) : t < T.pan - 0.1 ? V(winX, winY, -1.3) : t < T.caballitos ? V(CX - 0.9, 0.1, 0.3) : t < T.juguete ? V(hx, 0.4, 0.4) : V(KCX + 0.2, 1.3, 9),
      handR: V(hx - 0.14, 0.5, 0.12), wR: t > T.caballitos - 0.6 ? 1 : 0.2, handL: t < T.caballitos - 0.6 ? V(KCX - 0.25, 0.75, 0.05) : V(KCX - 0.3, 0.6, 0.0), wL: 0.7,
      ...moodAt(t, [[0, 'worried'], [T.celda, 'neutral'], [T.caballitos, 'happy']]) };
    horse1.position.set(hx, 0, 0.12);
  } else if (t < c[6]) {                                    // palacio: ¿un príncipe?
    const royal = t > T.principe - 0.1; cape.visible = ermine.visible = crown.visible = royal;
    const s = back(lin(t, T.principe - 0.1, T.principe + 0.25)); crown.scale.setScalar(Math.max(s, 0.001)); cape.scale.set(Math.max(s, 0.001), 1, Math.max(s, 0.001));
    p = { x: KRX, z: 0.1, face: 0.3, squash: settle(t, T.principe + 0.05, 0.14) * breathe(t), y: hop(t, T.principe - 0.1, 0.18),
      look: t < T.cambiado - 0.2 || t > T.escondido - 0.1 ? V(KRX + 0.3, 1.5, 9) : V(RX + 1.0, 0.6, 0.1), handL: talk(t, KRX, 0.1, -1), wL: 0.7,
      ...moodAt(t, [[0, 'worried'], [T.principe - 0.05, 'surprised'], [T.baden, 'happy'], [T.cambiado, 'surprised']]) };
  } else if (t < c[7]) {                                    // sótano, 1829
    const fall = T.herido - 0.25;
    if (t < fall) p = { x: KSX, z: 0, face: 0.2, squash: breathe(t), look: t < c[6] + 0.6 ? V(KSX + 0.2, 1.45, 9) : V(SX - 0.7, 1.6, -1.5),
      handL: V(KSX - 0.15, 1.0, 0.3), wL: 0.6, ...moodAt(t, [[0, 'neutral'], [c[6] + 0.7, 'worried']]) };
    else { bandage.visible = true;
      p = { x: KSX, z: 0, face: t < T.hombre || t > c[7] - 0.75 ? 0.2 : -0.5, crouch: 1.0 * back(lin(t, fall, fall + 0.3)), y: -0.06 * prog(t, fall, fall + 0.3), squash: settle(t, fall + 0.3, 0.15) * breathe(t),
        look: t < T.hombre || t > c[7] - 0.75 ? V(KSX + 0.2, 1.3, 9) : V(SX - 0.7, 1.7, -1.5),
        handL: V(KSX - 0.12, 1.55, 0.25), wL: 1 - prog(t, T.hombre - 0.2, T.hombre + 0.1) * 0.6, handR: V(KSX + 0.35, 0.3, 0.2), wR: 0.8,
        ...moodAt(t, [[0, 'surprised'], [fall + 0.5, 'worried'], [T.hombre, 'surprised']]) };
    }
  } else if (t < c[8]) {                                    // parque de Ansbach
    {
      const hit = T.atacan, kneel = T.muere - 0.1, sx = strX(t);
      const x = t < hit ? KAX : lerp(KAX, KAX - 0.3, back(lin(t, hit, hit + 0.3)));
      p = { x, z: 0, face: t < hit ? 0.9 : 0.4, squash: settle(t, hit + 0.3, 0.14) * breathe(t), y: hop(t, hit, 0.14),
        crouch: 0.9 * prog(t, kneel, kneel + 0.5), lean: 0.2 * prog(t, kneel, kneel + 0.5),
        look: t < c[7] + 0.8 ? V(KAX + 0.2, 1.45, 9) : t < hit ? V(sx, 1.4, 0.3) : t < kneel ? V(sx, 1.3, 1) : V(x + 0.2, 1.0, 9),
        handR: t < hit ? V(x + 0.35, 1.05, 0.25) : chest(x), wR: t < hit ? win(t, T.parque + 0.3, hit, 0.2) : 1,
        handL: chest(x - 0.12), wL: prog(t, hit + 0.1, hit + 0.3),
        ...moodAt(t, [[0, 'neutral'], [T.parque + 0.3, 'surprised'], [hit, 'surprised'], [hit + 0.4, 'worried']]) };
    }
  } else { kaspar.root.visible = false; return; }
  kaspar.root.visible = true;
  kaspar.pose(alive({ blink: blinkAt(t, 0), ...p }, t, 0)); kaspar.head.getWorldPosition(head.k);
  quill.visible = t >= c[3] && t < c[4];
  if (quill.visible) { kaspar.hand(1, hv); quill.position.copy(hv); quill.rotation.set(0, 0, -0.5 + 0.08 * Math.sin(t * 22) * (t > T.escribir && t < T.hauser + 0.4 ? 1 : 0)); }
}

function poseVecino(t) {
  vecino.root.visible = t < c[3]; gawker.root.visible = t < c[3]; if (t >= c[3]) { letA.visible = letB.visible = false; return; }
  const take = T.cartas + 0.55, reading = t > take;
  vecino.pose(alive({ x: VX, z: 0.1, face: t < T.casi - 0.6 ? -0.2 + 0.3 * Math.sin(t * 0.8) : lerp(-0.2, -0.75, prog(t, T.casi - 0.6, T.casi - 0.2)),
    squash: breathe(t, 1), y: hop(t, T.casi - 0.3, 0.12) + hop(t, T.paso, 0.08),
    look: t < T.casi - 0.6 ? V(VX - 1.5, 1.3, 2) : t < c[1] ? head.k : t < c[2] ? V(PX + 0.1, 0.85, 0.8) : t < T.misma ? V(PX + 0.5, 0.85, 0.8) : V(VX - 0.2, 1.45, 9),
    handL: reading ? V(VX - 0.3, 0.98, 0.42) : talk(t, VX, 0.1, -1, 2), wL: reading ? 1 : 0.6,
    handR: t > T.mano ? V(VX + 0.12, 1.25, 0.3) : V(VX + 0.25, 0.98, 0.35), wR: t > T.mano ? 1 : 0.6,
    blink: blinkAt(t, 0.7), ...moodAt(t, [[0, 'neutral'], [T.casi - 0.3, 'surprised'], [c[1] + 0.4, 'neutral'], [T.paso, 'surprised'], [T.misma, 'sly']]) }, t, 2));
  vecino.head.getWorldPosition(head.v);
  // curioso de fondo que se queda mirando
  gawker.pose(alive({ x: PX + 2.0, z: -1.2, face: -0.6, squash: breathe(t, 3), look: head.k, handL: V(PX + 1.85, 1.33, -0.95), wL: win(t, T.casi, c[2], 0.3), blink: blinkAt(t, 1.3),
    ...moodAt(t, [[0, 'neutral'], [T.casi, 'surprised'], [c[1] + 1, 'neutral']]) }, t, 4));
  // cartas
  kaspar.hand(0, hv); letA.position.copy(hv).add(tmp2.set(0.02, 0.05, 0.05)); letA.rotation.set(-0.2, 0.4, 0.15);
  if (reading) { vecino.hand(0, hv); letB.position.copy(hv).add(tmp2.set(0.05, 0.05, 0.05)); letB.rotation.set(-0.3, -0.5, -0.1); }
  else { kaspar.hand(1, hv); letB.position.copy(hv).add(tmp2.set(0.02, 0.06, 0.05)); letB.rotation.set(-0.2, 0.3, -0.12); }
  letA.visible = letB.visible = t > 0.2;
}

function poseOfficer(t) {
  let p;
  if (t >= c[3] && t < c[4]) {
    const xo = OX + 0.85;
    p = { x: xo, z: -0.65, face: -0.35, squash: breathe(t, 2), y: hop(t, T.nombre + 0.1, 0.12),
      look: t < T.escribir ? head.k : t < T.hauser + 0.3 ? V(OX + 0.05, 0.85, 0.22) : V(xo, 1.5, 9),
      handL: t < T.escribir ? talk(t, xo, -0.65, -1, 1) : V(xo - 0.1, 1.33, -0.35), wL: t < T.escribir ? 0.7 : win(t, T.escribir, c[4], 0.25),
      handR: V(xo + 0.25, 0.9, -0.4), wR: 0.5, ...moodAt(t, [[0, 'neutral'], [T.escribir, 'sly'], [T.nombre + 0.05, 'surprised']]) };
  } else if (t >= c[8] && t < T.adn - 0.15) {
    const stop = c[8] + 1.2, pick = T.bolsita + 0.1;
    if (t < stop) p = { ...go(t, c[8], stop, AX - 2.6, AX - 0.25, 0.42) };
    else {
      const bend = win(t, pick - 0.35, pick + 0.4, 0.25), holding = t > pick;
      p = { x: AX - 0.25, z: 0, face: t < c[9] ? 0.35 : 0.15, crouch: 0.9 * bend, lean: 0.35 * bend, squash: breathe(t, 2),
        look: t < pick + 0.3 ? V(AX + 0.1, 0.1, 0.4) : t < c[9] ? V(AX + 0.45, 1.0, 0.7) : V(AX - 0.1, 1.5, 9),
        handR: t < pick ? V(AX + 0.1, 0.12, 0.38) : V(AX + 0.05, 1.0, 0.45), wR: Math.max(bend, holding ? 1 : 0),
        handL: t > c[9] ? V(AX - 0.32, 1.25, 0.3) : V(AX - 0.4, 0.95, 0.3), wL: t > c[9] ? 1 : 0.4,
        tilt: t > c[9] ? 0.18 : 0,
        ...moodAt(t, [[0, 'neutral'], [pick + 0.3, 'surprised'], [T.reves, 'surprised'], [c[9], 'worried'], [T.sospechan + 0.6, 'sly']]) };
    }
  } else { officer.root.visible = false; return; }
  officer.root.visible = true; officer.pose(alive({ blink: blinkAt(t, 1.1), mood: 'neutral', ...p }, t, 5)); officer.head.getWorldPosition(head.o);
}

function poseScientist(t) {
  scientist.root.visible = t >= T.adn - 0.15 && t < c[10]; if (!scientist.root.visible) return;
  const x = LX + 0.32;
  scientist.pose(alive({ x, z: 0.25, face: 0.3, squash: breathe(t, 4), y: hop(t, T.principe9, 0.12),
    look: t < T.adn + 0.4 || t >= T.principe9 - 0.2 ? V(x + 0.3, 1.5, 9) : V(LX + 1.15, 1.4, -0.5),
    handR: t < T.principe9 ? V(x + 0.45, 1.25 + 0.05 * Math.sin(t * 7), 0.2) : V(x + 0.4, 1.62, 0.25), wR: 1,
    handL: talk(t, x, 0.25, -1, 3), wL: 0.8, blink: blinkAt(t, 0.4),
    ...moodAt(t, [[0, 'neutral'], [T.principe9 - 0.1, 'surprised']]) }, t, 7));
  scientist.head.getWorldPosition(head.s);
}

function poseHooded(t) {
  const on = t >= c[7] + 0.5 && t < T.atacan + 1.6; hooded.g.visible = on; if (!on) return;
  const x = strX(t), fleeing = t > T.atacan + 0.35;
  hooded.g.position.set(x, 0.03 * Math.abs(Math.sin(t * (fleeing ? 14 : 6))), -0.05);
  hooded.g.rotation.y = fleeing ? PI / 2 : -0.9; hooded.g.rotation.z = fleeing ? -0.15 : 0.03 * Math.sin(t * 2);
  hooded.arm.rotation.x = -1.3 * win(t, T.parque, T.atacan + 0.3, 0.25);
  const bl = blinkAt(t, 0.3); hooded.eyes.forEach(e => { e.scale.y = 0.6 * Math.max(1 - bl, 0.1); });
  hooded.hd.getWorldPosition(head.h);
}

// =====================================================================================
// CUADRO
// =====================================================================================
const snowPos = snow.geometry.attributes.position, motePos = motes.geometry.attributes.position;
function frame(t) {
  poseKaspar(t); poseVecino(t); poseOfficer(t); poseScientist(t); poseHooded(t);
  if (t < c[3]) poseKaspar(t);
  // luces que titilan
  flames.forEach(f => { const fl = 0.86 + 0.1 * Math.sin(t * 17 + f.k) + 0.06 * Math.sin(t * 29 + f.k * 2);
    if (f.fo) { f.fo.scale.set(1, fl, 1); f.fi.scale.set(1, 0.9 + 0.2 * Math.sin(t * 23 + f.k), 1); f.g.rotation.z = 0.06 * Math.sin(t * 7 + f.k); }
    f.gl.material.opacity = 0.45 + 0.15 * fl; if (f.pl) f.pl.intensity = f.base * fl; });
  stars.forEach(s => s.scale.setScalar(0.7 + 0.3 * Math.sin(t * 3 + s.userData.tw)));
  // plaza
  drops.forEach((m, i) => { const u = (t * 1.2 + i / 8) % 1, a = m.userData.a; m.position.set(Math.cos(a) * 0.55 * u, 1.75 - 1.3 * u * u, Math.sin(a) * 0.55 * u); });
  tavern.rotation.z = 0.08 * Math.sin(t * 1.6);
  pigeons.forEach(p => { const d = p.userData, flyT = 0.2 + (d.x0 - (PX - 4.4)) / ((KX0 - (PX - 4.4)) / (ARRIVE - 0.2)) - 0.6, u = Math.max(0, t - flyT);
    const flying = d.i < 4 && t > flyT && t < flyT + 3;
    p.visible = t < c[3] && !(d.i < 4 && t > flyT + 3);
    if (!p.visible) return;
    if (flying) { p.position.set(d.x0 - 0.8 * u - 0.2 * d.i * u, 0.2 + 1.6 * u + 0.3 * u * u, d.z0 - 0.6 * u); p.rotation.y = PI * 0.85; d.wings.forEach((w, j) => { w.rotation.x = (j ? 1 : -1) * (0.4 + 0.9 * Math.sin(t * 30 + d.i)); w.position.y = 0.14; }); d.hd.position.y = 0.15; }
    else { const peck = Math.max(0, Math.sin(t * 4 + d.i * 1.7)) ** 6; p.position.set(d.x0 + 0.05 * Math.sin(t * 0.7 + d.i), 0, d.z0); p.rotation.y = d.i % 2 ? 0.4 : PI - 0.4; d.hd.position.set(0.085 + 0.03 * peck, 0.15 - 0.09 * peck, 0); d.wings.forEach(w => { w.rotation.x = 0; }); }
  });
  // cartas grandes
  const sA = t >= c[1] ? popIn(t, T.una - 0.1, c[3] - 0.05) : 0, sB = t >= c[2] ? popIn(t, T.madre - 0.35, c[3] - 0.05) : 0;
  bigA.visible = sA > 0.01; bigB.visible = sB > 0.01;
  bigA.scale.setScalar(Math.max(sA, 0.001)); bigB.scale.setScalar(Math.max(sB, 0.001));
  const split = prog(t, c[2], c[2] + 0.4);
  bigA.position.set(lerp(PX + 0.15, PX - 0.22, split), 0.62 + 0.02 * Math.sin(t * 2.2), 1.0); bigA.rotation.set(-0.5, 0, -0.04 + 0.02 * Math.sin(t * 1.7));
  bigB.position.set(PX + 0.52, 0.64 + 0.02 * Math.sin(t * 2.0 + 1), 1.05); bigB.rotation.set(-0.5, 0, 0.05 + 0.02 * Math.sin(t * 1.5));
  const lk = t >= c[2] ? popIn(t, T.misma - 0.25, c[3] - 0.05) : 0; lens.visible = lk > 0.01; lens.scale.setScalar(Math.max(lk, 0.001));
  lens.position.set(lerp(PX - 0.3, PX + 0.6, 0.5 + 0.5 * Math.sin((t - T.misma) * 3.2)), 0.66 + 0.06 * Math.sin((t - T.misma) * 6.4), 1.25);
  k.glyphAt(eqMark, tmp.set(PX + 0.15, 0.66, 0.85), 0, 0, t >= c[2] && t < c[3] ? popIn(t, T.mano - 0.15, c[3]) : 0, 0);
  // policía
  drawLedger(t >= c[3] && t < c[4] ? prog(t, T.escribir, T.hauser - 0.1) : 0);
  pendulum.rotation.z = 0.3 * Math.sin(t * 3.4); clockHand.rotation.z = -t * 0.5;
  // celda
  if (!(t >= c[4] && t < c[5])) horse1.position.set(CX + 0.5, 0, 0.12);
  horse1.userData.wheels.forEach(w => { w.rotation.y = -(horse1.position.x - CX) / 0.06; });
  horse2.position.set(CX + 0.95, 0, -0.05); horse2.rotation.z = 0; horse2.rotation.y = 0.6 + 0.05 * Math.sin(t * 1.3);
  horse1.visible = horse2.visible = true;
  horse1.userData.tail.rotation.z = -2.2 + 0.2 * Math.sin(t * 6); horse2.userData.tail.rotation.z = -2.2 + 0.2 * Math.sin(t * 5 + 1);
  ray.material.opacity = 0.8 + 0.2 * Math.sin(t * 1.3); winGlow.material.opacity = 0.42 + 0.1 * Math.sin(t * 1.3);
  for (let i = 0; i < 60; i++) { const [a, b, cc, d] = moteSeed[i], u = (t * 0.06 * (0.5 + d) + a) % 1;
    motePos.setXYZ(i, CX + 0.35 + (b - 0.5) * 0.5 + 0.35 * (u - 0.5) + 0.05 * Math.sin(t * (1 + cc) + i), 0.2 + 2.2 * ((cc + u * 0.3) % 1), -0.75 + 0.6 * (d - 0.5) + 0.65 * (u - 0.5)); }
  motePos.needsUpdate = true;
  { const u = ((t - c[4]) * 0.45) % 4; cellRat.position.set(CX + 2.0 - 1.1 * Math.min(u, 2) + 1.1 * Math.max(0, u - 2), 0.02 * Math.abs(Math.sin(t * 20)), -1.15); cellRat.rotation.y = u < 2 ? 0 : PI; }
  // palacio: cunas que se cambian
  const sw = prog(t, T.cambiado + 0.05, T.cambiado + 0.9), A0 = RX + 0.55, B0 = RX + 1.6;
  cradleA.position.set(lerp(A0, B0, sw), 0, 0.15 + 0.45 * Math.sin(PI * sw)); cradleB.position.set(lerp(B0, A0, sw), 0, 0.15 - 0.45 * Math.sin(PI * sw));
  cradleA.rotation.z = 0.08 * Math.sin(t * 2.3); cradleB.rotation.z = 0.08 * Math.sin(t * 2.3 + 1.5);
  cradleA.userData.crown.position.y = 0.75 + 0.04 * Math.sin(t * 3); cradleA.userData.crown.rotation.z = 0.15 * Math.sin(t * 2);
  chandelier.rotation.y = 0.15 * Math.sin(t * 0.6);
  // sótano: la sombra
  const sh1 = t >= c[6] && t < T.herido ? back(lin(t, c[6] + 0.6, c[6] + 1.2)) : 0, sh2 = t >= T.hombre - 0.15 && t < c[7] ? back(lin(t, T.hombre - 0.15, T.hombre + 0.25)) : 0;
  const shk = Math.max(sh1, sh2); shadowFig.visible = shk > 0.01; shadowFig.scale.set(0.9 + 0.3 * shk, Math.max(shk, 0.001) * (1 + 0.15 * sh1), 1); shadowFig.position.x = SX - 0.7 + 0.25 * sh1 + 0.04 * Math.sin(t * 2.1);
  cellarLamp.rotation.z = 0.1 * Math.sin(t * 1.8);
  // parque: bolsita, nota y espejo
  if (t >= c[7] && t < T.atacan + 0.05) { hooded.hd.getWorldPosition(purse.position); purse.position.y -= 0.08; purse.visible = hooded.g.visible; }
  else if (t >= T.atacan && t < T.bolsita + 0.1) { const u = prog(t, T.atacan + 0.05, T.atacan + 0.35); purse.visible = true; purse.position.set(AX + 0.1, lerp(1.0, 0.07, u * u), 0.38); purse.rotation.z = 1.2 * u; }
  else if (t >= T.bolsita + 0.1 && t < T.adn - 0.15) { officer.hand(1, purse.position); purse.position.y -= 0.05; purse.visible = true; purse.rotation.z = 0; }
  else purse.visible = false;
  const nk = t >= c[8] && t < T.adn - 0.15 ? popIn(t, T.nota - 0.15, T.adn - 0.15) : 0;
  note.visible = nk > 0.01; note.scale.setScalar(Math.max(nk, 0.001)); note.position.set(AX + 0.6, 0.85 + 0.02 * Math.sin(t * 2.1), 0.65); note.rotation.set(-0.35, 0, 0.03 * Math.sin(t * 1.4));
  const mk = t >= c[8] && t < c[9] + 0.6 ? popIn(t, T.espejo - 0.15, c[9] + 0.6) : 0;
  mirror.visible = mk > 0.01; mirror.scale.setScalar(Math.max(mk, 0.001)); mirror.position.set(AX + 1.12, 0.88, 0.65); mirror.rotation.set(-0.3, -0.3 + 0.05 * Math.sin(t * 1.6), 0);
  // nieve
  for (let i = 0; i < SN; i++) { const [a, b, cc, d] = snowSeed[i], fall = 0.35 + 0.35 * d, y = 6.5 - ((t * fall + a * 6.5) % 6.5);
    snowPos.setXYZ(i, AX + 2.5 + (b - 0.5) * 16 + 0.25 * Math.sin(t * (0.8 + cc) + i), y, -5 + 9 * cc); }
  snowPos.needsUpdate = true;
  horse3.position.set(GX + 0.55, 0, 0.15); horse3.rotation.y = -0.5;
  // laboratorio
  helix.rotation.y = t * 1.4; scanLine.position.y = 2.4 + 0.33 * Math.sin(t * 2.2);
  tubes.forEach(b => { const u = (t * 0.8 + b.k) % 1; b.bub.position.set(b.x, 0.06 + 0.12 * u, 0.0); b.bub.scale.setScalar(1 - u * 0.6); });
  const ck = t >= T.adn - 0.15 && t < c[10] ? popIn(t, T.adn + 0.1, c[10] + 0.2) : 0; labCrown.visible = ck > 0.01; labCrown.scale.setScalar(Math.max(ck, 0.001)); labCrown.rotation.y = t * 0.9;
  labCrown.position.y = 1.6 + 0.05 * Math.sin(t * 2.4);

  // signos
  k.glyphAt(bang, t < c[7] ? head.k : head.k, 0.05, 0.62, (t >= c[6] && t < c[7] ? popIn(t, T.herido - 0.3, T.herido + 0.6) : 0) + (t >= c[7] && t < c[8] ? popIn(t, T.atacan, T.atacan + 0.9) : 0), 0.1 * Math.sin(t * 8));
  const qAt = t < c[1] ? head.k : t < c[10] ? head.o : tmp2.set(GX, 1.55, -0.5);
  const qOn = (t < c[1] ? popIn(t, T.nadie + 0.1, c[1]) : 0) + (t >= c[9] && t < T.adn - 0.2 ? popIn(t, c[9] + 0.15, T.adn - 0.2) : 0) + (t >= c[10] ? popIn(t, T.nadie10 - 0.1, END + 2) : 0);
  qMarks.forEach((m, i) => k.glyphAt(m, qAt, [-0.42, 0, 0.42][i] * (t >= c[10] ? 1.3 : 1), (t >= c[10] ? 0.25 : t >= c[9] ? 0.36 : 0.5) + [0, 0.16, 0][i] + 0.04 * Math.sin(t * 5 + i), Math.max(qOn, 0) * (t >= c[10] ? 1.2 : 1), 0.15 * Math.sin(t * 4 + i)));
  k.glyphAt(xMark, labCrown.position, 0, 0, t >= T.adn && t < c[10] ? popIn(t, T.principe9 - 0.1, c[10]) : 0, -0.1);
  sparks.forEach((m, i) => { const on = t >= c[5] && t < c[6] ? popIn(t, T.principe, T.cambiado) : 0; k.glyphAt(m, head.k, [-0.45, 0.45, -0.38, 0.4, 0][i], [0.4, 0.42, -0.1, -0.15, 0.62][i], on * (0.6 + 0.4 * Math.sin(t * 9 + i * 1.6)), t * 2 + i); });
  noteMarks.forEach((m, i) => { const on = t >= c[4] && t < c[5] ? popIn(t, T.caballitos + 0.2, c[5]) : 0, u = (t * 0.7 + i / 3) % 1; k.glyphAt(m, head.k, 0.3 + 0.2 * u, 0.25 + 0.5 * u, on * Math.sin(PI * u), 0.3 * Math.sin(t * 3 + i)); });
  puffA(t, ARRIVE - 0.05, KX0, 0.1, 1); puffB(t, T.atacan + 0.35, AX + 0.2, 0, 1); puffC(t, T.herido - 0.25, KSX, 0.1, -1);
}

// nota con escritura de espejo + espejito que la da vuelta
const NOTE_TXT = ['M. L. Ö.'];
function scribble(g, W, H, y, seed, w = 0.7) { const r = rng(seed); g.strokeStyle = '#3a2410'; g.lineWidth = 5; g.beginPath(); let x = W * (0.5 - w / 2); g.moveTo(x, y);
  while (x < W * (0.5 + w / 2)) { x += 10 + r() * 14; g.lineTo(x, y + (r() - 0.5) * 16); } g.stroke(); }
const note = paper(0.5, 0.4, (g, W, H) => { g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#f3ead2'; g.fillRect(8, 8, W - 16, H - 16);
  g.save(); g.translate(W, 0); g.scale(-1, 1);
  scribble(g, W, H, H * 0.2, 3); scribble(g, W, H, H * 0.36, 5, 0.6); scribble(g, W, H, H * 0.52, 7, 0.75);
  g.fillStyle = '#3a2410'; g.font = hand(74); g.textAlign = 'center'; g.fillText(NOTE_TXT[0], W / 2, H * 0.83); g.restore(); }); scene.add(note);
const mirror = new THREE.Group(); scene.add(mirror);
{ const fr = outlined(new THREE.Mesh(new THREE.CircleGeometry(0.22, 30), flat(0xd9a441)), 0.012); fr.scale.y = 1.15; mirror.add(fr);
  const gl = paper(0.36, 0.42, (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#dff2ff'); gr.addColorStop(1, '#9cc4e4'); g.fillStyle = gr; g.beginPath(); g.ellipse(W / 2, H / 2, W / 2 - 4, H / 2 - 4, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(W * 0.3, H * 0.25, W * 0.08, H * 0.16, 0.6, 0, 7); g.fill();
    g.fillStyle = '#3a2410'; g.font = hand(70); g.textAlign = 'center'; g.fillText(NOTE_TXT[0], W / 2, H * 0.58); });
  gl.position.z = 0.01; mirror.add(gl);
  const hd = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), flat(0xd9a441)), 0.008); hd.position.y = -0.34; mirror.add(hd); }

// =====================================================================================
// CÁMARA
// =====================================================================================
k.shots([
  { t: 0, pos: [PX - 0.8, 2.8, 11.5], look: [PX - 0.8, 2.4, -2] },
  { t: T.nurem + 0.3, pos: [PX - 1.6, 1.7, 6.6], look: [PX - 1.6, 1.25, 0], glide: true },
  { t: T.chico - 0.1, pos: [PX - 0.9, 1.5, 4.4], look: [PX - 0.9, 1.25, 0] },
  { t: T.casi - 0.15, pos: [KX0 + 0.05, 1.5, 2.7], look: [KX0 + 0.05, 1.4, 0] },
  { t: T.nadie - 0.15, pos: [PX + 0.2, 1.75, 6.0], look: [PX + 0.2, 1.45, 0] },
  { t: c[1], pos: [PX + 0.1, 1.5, 4.0], look: [PX + 0.1, 1.25, 0] },
  { t: T.una - 0.15, pos: [PX + 0.15, 1.5, 2.4], look: [PX + 0.15, 0.62, 1.0] },
  { t: T.paso - 0.15, pos: [PX + 0.45, 1.6, 3.5], look: [PX + 0.45, 1.05, 0.4] },
  { t: c[2], pos: [PX + 0.15, 1.6, 3.0], look: [PX + 0.15, 0.68, 1.0] },
  { t: T.madre - 0.2, pos: [PX + 0.52, 1.5, 2.3], look: [PX + 0.52, 0.64, 1.05] },
  { t: T.misma - 0.2, pos: [PX + 0.15, 1.75, 3.9], look: [PX + 0.15, 0.85, 0.6] },
  // los cambios de lugar empalman cara con cara (mismo encuadre de Kaspar a los dos lados del corte): así el
  // corte no "salta" y después la toma abre de un tirón al decorado nuevo
  { t: T.mano + 0.15, pos: [KX0, 1.44, 2.0], look: [KX0, 1.4, 0] },
  { t: c[3], pos: [KPX + 0.1, 1.38, 2.65], look: [KPX + 0.1, 1.34, 0.6], cut: true },
  { t: c[3] + 0.75, pos: [OX - 0.05, 1.6, 4.7], look: [OX - 0.05, 1.25, 0] },
  { t: T.escribir - 0.2, pos: [OX + 0.3, 1.75, 1.3], look: [OX - 0.2, 0.86, 0.12] },
  { t: T.hauser - 0.1, pos: [KPX + 0.1, 1.38, 2.65], look: [KPX + 0.1, 1.34, 0.6] },
  { t: c[4], pos: [KCX, 1.12, 1.7], look: [KCX, 1.08, -0.3], cut: true },
  { t: c[4] + 0.75, pos: [CX + 0.35, 1.65, 3.7], look: [CX + 0.35, 1.4, -0.9] },
  { t: T.pan - 0.2, pos: [CX - 0.95, 0.85, 2.0], look: [CX - 0.95, 0.35, 0] },
  { t: T.caballitos - 0.2, pos: [CX + 0.2, 1.0, 2.6], look: [CX + 0.2, 0.74, 0] },
  { t: T.juguete, pos: [KCX, 1.12, 1.7], look: [KCX, 1.08, -0.3] },
  { t: c[5], pos: [KRX, 1.44, 2.1], look: [KRX, 1.4, 0.1], cut: true },
  { t: c[5] + 0.75, pos: [RX + 0.1, 1.8, 6.6], look: [RX + 0.1, 1.45, 0] },
  { t: T.principe - 0.2, pos: [KRX, 1.75, 3.0], look: [KRX, 1.62, 0] },
  { t: T.cambiado - 0.2, pos: [RX + 1.05, 1.3, 3.2], look: [RX + 1.05, 0.6, 0] },
  { t: T.escondido, pos: [KRX, 1.5, 2.1], look: [KRX, 1.46, 0.1] },
  { t: c[6], pos: [KSX, 1.44, 2.0], look: [KSX, 1.4, 0], cut: true },
  { t: c[6] + 0.6, pos: [SX - 0.1, 1.7, 4.8], look: [SX - 0.1, 1.4, -0.6] },
  { t: T.herido - 0.2, pos: [KSX + 0.05, 1.15, 2.5], look: [KSX + 0.05, 1.0, 0] },
  { t: T.hombre - 0.2, pos: [SX - 0.35, 1.5, 3.6], look: [SX - 0.35, 1.3, -1.0] },
  { t: c[7] - 0.6, pos: [KSX, 1.12, 2.0], look: [KSX, 1.08, 0] },
  { t: c[7], pos: [KAX, 1.44, 2.0], look: [KAX, 1.4, 0], cut: true },
  { t: c[7] + 0.8, pos: [AX - 0.4, 2.3, 7.5], look: [AX - 0.4, 1.8, -1] },
  { t: T.parque - 0.15, pos: [AX - 0.2, 1.6, 4.8], look: [AX - 0.2, 1.3, 0] },
  { t: T.atacan - 0.2, pos: [KAX + 0.05, 1.5, 3.2], look: [KAX + 0.05, 1.35, 0] },
  { t: T.muere - 0.2, pos: [AX - 0.4, 2.3, 5.6], look: [AX - 0.4, 1.5, 0] },
  { t: c[8], pos: [AX - 0.7, 1.6, 4.8], look: [AX - 0.7, 1.15, 0] },
  { t: T.nota - 0.2, pos: [AX + 0.6, 1.45, 2.2], look: [AX + 0.6, 0.85, 0.65] },
  { t: T.espejo - 0.2, pos: [AX + 0.88, 1.45, 2.5], look: [AX + 0.88, 0.85, 0.65] },
  { t: c[9], pos: [AX - 0.2, 1.55, 3.0], look: [AX - 0.2, 1.4, 0] },
  { t: T.sospechan + 0.6, pos: [AX - 0.25, 1.44, 2.0], look: [AX - 0.25, 1.4, 0] },
  { t: T.adn - 0.15, pos: [LX + 0.32, 1.44, 2.25], look: [LX + 0.32, 1.4, 0.25], cut: true },
  { t: T.adn + 0.45, pos: [LX + 0.7, 1.65, 4.5], look: [LX + 0.7, 1.35, -0.2] },
  { t: T.principe9 - 0.2, pos: [LX + 1.45, 1.6, 2.9], look: [LX + 1.45, 1.45, -0.5] },
  { t: c[10], pos: [GX + 0.1, 1.7, 4.8], look: [GX + 0.1, 1.05, -0.5], cut: true },
  { t: T.nadie10 - 0.15, pos: [GX + 0.1, 1.5, 3.4], look: [GX + 0.1, 1.1, -0.5] },
]);
k.follow(t => t < c[8] ? head.k : t < T.adn - 0.15 ? head.o : t < c[10] ? head.s : tmp.set(GX, 1.0, -0.5));

// =====================================================================================
// CARTELES
// =====================================================================================
const at3 = (v, dy) => () => tmp2.copy(v).setY(v.y + dy);
tag({ text: 'Núremberg, 1828', big: true, off: BIG, from: 0.15, to: T.chico - 0.1 });
tag({ text: 'Unos 16 años', at: at3(head.k, 0.4), off: [-60, -230], from: T.chico + 0.4, to: T.nadie - 0.2 });
tag({ text: '¿De dónde salió?', big: true, off: BIG, from: T.nadie, to: c[1] });
tag({ text: '2 cartas', big: true, off: BIG, from: T.cartas - 0.1, to: T.una - 0.1 });
tag({ text: 'Carta 1', at: () => tmp2.copy(bigA.position).setY(bigA.position.y + 0.25), off: [0, -150], from: T.una + 0.2, to: c[2] });
tag({ text: '¿De su madre?', big: true, off: BIG, from: T.supu, to: T.misma - 0.25 });
tag({ text: '¿La misma letra?', big: true, off: BIG, from: T.misma - 0.1, to: c[3] });
tag({ text: 'Policía', at: at3(head.o, 0.42), off: [120, -170], from: c[3] + 0.85, to: T.escribir - 0.2 });
tag({ text: 'Solo sabía su nombre', big: true, off: [540, 360], from: T.nombre - 0.1, to: c[4] });
tag({ text: 'Celda oscura', big: true, off: BIG, from: T.celda - 0.05, to: T.pan - 0.2 });
tag({ text: 'Pan y agua', at: () => tmp2.set(CX - 1.05, 0.3, 0.2), off: [120, -300], from: T.pan, to: T.caballitos - 0.2 });
tag({ text: 'Caballitos de madera', at: () => tmp2.copy(horse1.position).setY(0.55), off: [-60, -330], from: T.caballitos, to: c[5] });
tag({ text: '¿Un príncipe?', big: true, off: BIG, from: T.principe - 0.1, to: T.cambiado - 0.2 });
tag({ text: 'Heredero de Baden', at: at3(head.k, 0.5), off: [150, -200], from: T.baden - 0.1, to: T.cambiado - 0.2 });
tag({ text: '¿Cambiado al nacer?', big: true, off: BIG, from: T.cambiado - 0.1, to: c[6] });
tag({ text: '1829', big: true, off: BIG, from: c[6] + 0.1, to: T.dice - 0.1 });
tag({ text: 'Hombre encapuchado', at: () => tmp2.set(shadowFig.position.x, 1.95, -1.5), off: [160, -240], from: T.hombre, to: c[7] });
tag({ text: 'Ansbach, 1833', big: true, off: BIG, from: c[7] + 0.1, to: T.atacan - 0.2 });
tag({ text: '¡Otra vez!', big: true, off: BIG, from: T.atacan, to: T.muere - 0.2 });
tag({ text: 'Murió 3 días después', big: true, off: BIG, from: T.muere, to: c[8] });
tag({ text: 'Bolsita violeta', at: () => purse.position, off: [180, -220], from: T.bolsita + 0.1, to: T.nota - 0.2 });
tag({ text: 'Escritura de espejo', big: true, off: BIG, from: T.reves, to: c[9] });
tag({ text: '¿Se hirió solo?', big: true, off: BIG, from: c[9] + 0.1, to: T.adn - 0.2 });
tag({ text: 'ADN: no era príncipe', big: true, off: [540, 360], from: T.adn, to: c[10] });
tag({ text: '“Enigma de su tiempo”', at: () => tmp2.set(GX, 1.5, -0.5), off: [0, -360], from: c[10] + 0.3, to: T.nadie10 - 0.2 });
tag({ text: '¿Quién era?', big: true, off: BIG, from: T.nadie10, to: END + 1 });

// =====================================================================================
// SONIDOS
// =====================================================================================
sfx(0, 'boom', 0.5);
sfx(T.nadie - 0.1, 'riser_to', 0.9); sfx(T.nadie - 0.1, 'boom', 0.45);
sfx(T.cartas + 0.55, 'tap', 0.6); sfx(T.mano - 0.1, 'pop', 0.6);
for (let i = 0; i < 4; i++) sfx(T.escribir + 0.1 + i * 0.35, 'tap', 0.4);
sfx(T.caballitos, 'roll', 0.45);
sfx(T.principe - 0.15, 'riser_to', 0.9); sfx(T.principe - 0.15, 'boom', 0.45);
sfx(T.cambiado + 0.1, 'whoosh', 0.6);
sfx(T.herido - 0.3, 'riser_to', 1); sfx(T.herido - 0.25, 'thud', 0.8);
sfx(T.atacan, 'riser_to', 1); sfx(T.atacan, 'boom', 0.55); sfx(T.atacan + 0.35, 'whoosh', 0.9);
sfx(T.muere, 'thud', 0.45);
sfx(T.bolsita + 0.1, 'tap', 0.6); sfx(T.espejo - 0.15, 'pop', 0.7);
sfx(T.adn - 0.15, 'riser_to', 0.9); sfx(T.principe9 - 0.1, 'boom', 0.5);
sfx(T.nadie10, 'riser_to', 1); sfx(T.nadie10, 'boom', 0.6);

k.run(frame);
