// Episodio: por qué el hielo flota (canal En 60 Segundos). Tres decorados lado a lado:
//   COCINA (x = 0): una chica, un vaso con hielo que flota, un vaso de "otra sustancia" donde el sólido se hunde, una pecera.
//   MOLÉCULAS (x = 40): moléculas de agua con carita que en el líquido se amontonan y al congelarse se toman de
//     las manos en hexágonos con huecos; el bloque de hielo ocupa más y flota.
//   LAGO EN CORTE (x = 80): invierno; el agua de 4 °C se va al fondo, la tapa de hielo crece de arriba hacia abajo,
//     patinadores arriba, peces tranquilos abajo; al final el "mundo al revés": el hielo se hunde y el lago se
//     congela desde el fondo.
// Solo dos cortes (al entrar a las moléculas y al lago); todo lo demás son zooms y viajes.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, clamp01, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('hielo', { sky: [[0, '#7fa9d6'], [0.55, '#cfe2f1'], [1, '#f4f1ea']] });
const { scene, c, at, END, sfx, tag, BIG, renderer } = k;
renderer.localClippingEnabled = true;
const MX = 40, LX = 80;                                       // dónde está cada decorado
const HULL = new THREE.MeshBasicMaterial({ color: 0x1e1428, side: THREE.BackSide });
const sm = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

// ---------- tiempos (todo cuelga de la voz) ----------
const flotaT = at('flota'), siT = at('si', flotaT + 0.2), pecesT = at('peces');
const sustT = at('sustancias', c[1]), solidT = at('solidas', c[1]), aprT = at('aprietan', c[1]), hundT = at('hunden', c[1]), liqT = at('liquido', c[1]);
const aguaT = at('agua', c[2]), congT = at('congelarse', c[2]), molT = at('moleculas', c[2]), manoT = at('mano', c[2]), hexT = at('hexagonos', c[2]), huecT = at('huecos', c[2]);
const ocupaT = at('ocupa', c[3]), nueveT = at('nueve', c[3]), lugarT = at('lugar', c[3]), flota2T = at('flota', c[3]);
const pesT = at('pesada', c[4]), friaT = at('fria', c[4]), cuatroT = at('cuatro', c[4]), fondoT = at('fondo', c[4]);
const lagosT = at('lagos', c[5]), arribaT = at('arriba', c[5]), tapaT = at('tapa', c[5]), aislaT = at('aisla', c[5]);
const pecesT2 = at('peces', c[6]), tranqT = at('tranquilos', c[6]);
const hundeT = at('hundiera', c[7]), fondo2T = at('fondo', c[7]), casiT = at('casi', c[7]), sobrT = at('sobreviviria', c[7]);
const CUT1 = congT - 0.12;

// ---------- piezas comunes ----------
function ell(parent, color, a, b, cc, x, y, z, w = 0.016) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), color.isMaterial ? color : flat(color));
  m.scale.set(a, b, cc); m.position.set(x, y, z); m.castShadow = true;
  if (w) { const h = new THREE.Mesh(m.geometry, HULL); h.scale.set((a + w) / a, (b + w) / b, (cc + w) / cc); m.add(h); }
  parent.add(m); return m;
}
/** Carita de frente (para moléculas y peces): ojos redondos con pupila, cejas y tres bocas. */
function face(parent, r) {
  const g = new THREE.Group(); parent.add(g);
  const zAt = (x, y) => Math.sqrt(Math.max(r * r - x * x - y * y, 1e-4)) + 0.004;
  const eyes = [-1, 1].map(sd => {
    const x = sd * 0.36 * r, y = 0.16 * r, e = new THREE.Group(); e.position.set(x, y, zAt(x, y)); g.add(e);
    e.add(new THREE.Mesh(new THREE.CircleGeometry(0.27 * r, 20), INK));
    const wh = new THREE.Mesh(new THREE.CircleGeometry(0.21 * r, 20), basic(0xffffff)); wh.position.z = 0.002; e.add(wh);
    const pu = new THREE.Mesh(new THREE.CircleGeometry(0.11 * r, 14), INK); pu.position.z = 0.004; e.add(pu);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.04 * r, 8), basic(0xffffff)); sh.position.set(0.04 * r, 0.04 * r, 0.002); pu.add(sh);
    return { e, pu, sd };
  });
  const brows = [-1, 1].map(sd => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.32 * r, 0.075 * r), INK); m.userData.sd = sd; m.position.set(sd * 0.36 * r, 0.52 * r, zAt(sd * 0.36 * r, 0.5 * r) + 0.003); g.add(m); return m; });
  const my = -0.34 * r, mz = zAt(0, my) + 0.002;
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2 * r, 0.05 * r, 6, 16, PI), INK); smile.rotation.z = PI; smile.position.set(0, my + 0.1 * r, mz); g.add(smile);
  const frown = new THREE.Mesh(new THREE.TorusGeometry(0.15 * r, 0.05 * r, 6, 16, PI), INK); frown.position.set(0, my - 0.08 * r, mz); g.add(frown);
  const oh = new THREE.Group(); oh.position.set(0, my - 0.02 * r, mz); g.add(oh);
  oh.add(new THREE.Mesh(new THREE.CircleGeometry(0.14 * r, 16), INK));
  const inn = new THREE.Mesh(new THREE.CircleGeometry(0.095 * r, 16), basic(0x7a2236)); inn.position.z = 0.002; oh.add(inn); oh.scale.y = 1.25;
  const M = { neutral: [1, 0, 'smile', 0, 0.8], happy: [1, 0.06, 'smile', 0, 1.25], surprised: [1.25, 0.14, 'o', 0, 1], worried: [1.05, 0.04, 'frown', 0.4, 1],
    cold: [0.95, 0.02, 'frown', 0.45, 0.9], effort: [0.9, -0.05, 'frown', -0.35, 1.1] };
  return {
    g,
    set(mood, blink = 0, lx = 0, ly = 0) {
      const [es, by, mouth, bt, ms] = M[mood] || M.neutral;
      for (const { e, pu } of eyes) { e.scale.set(es, es * Math.max(1 - 0.92 * blink, 0.08), 1); pu.position.x = clamp01(Math.abs(lx)) * Math.sign(lx) * 0.08 * r; pu.position.y = Math.max(-1, Math.min(1, ly)) * 0.07 * r; }
      for (const b of brows) { b.position.y = (0.52 + by) * r; b.rotation.z = -b.userData.sd * bt; }
      smile.visible = mouth === 'smile'; frown.visible = mouth === 'frown'; oh.visible = mouth === 'o';
      smile.scale.setScalar(ms);
    },
  };
}
/** Molécula de agua de caricatura: oxígeno rojo con cara y dos hidrógenos blancos ("las manos"). */
const MR = 0.22, HR = 0.105, HD = 0.255;
function makeMol(parent, s = 1) {
  const root = new THREE.Group(); parent.add(root);
  ell(root, 0xe8463c, MR, MR, MR, 0, 0, 0, 0.022);
  const hs = [0, 1].map(() => ell(root, 0xf6f4ee, HR, HR, HR, 0, 0, -0.03, 0.018));
  const f = face(root, MR); root.scale.setScalar(s);
  return { root, hs, f };
}
function poseMol(m, x, y, z, a1, a2, mood = 'neutral', blink = 0, lx = 0, ly = 0) {
  m.root.position.set(x, y, z);
  m.hs[0].position.set(HD * Math.cos(a1), HD * Math.sin(a1), -0.03); m.hs[1].position.set(HD * Math.cos(a2), HD * Math.sin(a2), -0.03);
  m.f.set(mood, blink, lx, ly);
}
/** Pez de caricatura: cuerpo ovalado, cola que se mueve, aleta y carita a los dos lados. */
function makeFish(color, belly, s = 1) {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  ell(body, color, 0.26, 0.16, 0.12, 0, 0, 0, 0.018);
  ell(body, belly, 0.18, 0.07, 0.105, 0.02, -0.08, 0, 0);
  const tail = new THREE.Group(); tail.position.set(-0.24, 0, 0); body.add(tail);
  const finM = (pts, col, parent, x, y) => { const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))), { depth: 0.03, bevelEnabled: false }); geo.translate(0, 0, -0.015);
    const m = new THREE.Mesh(geo, flat(col)); m.position.set(x, y, 0); m.castShadow = true; parent.add(m);
    const o = new THREE.Mesh(geo, HULL); o.scale.set(1.12, 1.12, 1.6); o.position.set(0.01, 0, 0); m.add(o); return m; };
  finM([[0.04, 0], [-0.17, 0.15], [-0.12, 0], [-0.17, -0.15]], color, tail, 0, 0);
  finM([[0.08, 0], [-0.02, 0.08], [-0.12, 0.07], [-0.1, 0]], color, body, -0.02, 0.13);
  const faces = [1, -1].map(sd => { const g = new THREE.Group(); g.position.set(0.11, 0.02, 0); if (sd < 0) g.rotation.y = PI; body.add(g); const f = face(g, 0.115); f.g.position.z = 0.012; return f; });
  root.scale.setScalar(s);
  return { root, body, tail, faces };
}
/** Pose del pez: posición, hacia dónde nada (dir suave -1..1) y gesto. */
function poseFish(f, t, x, y, z, dir, mood = 'happy', k0 = 0, look = 0) {
  f.root.position.set(x, y, z); f.root.rotation.y = lerp(PI, 0, (dir + 1) / 2);
  f.tail.rotation.y = 0.5 * Math.sin(t * 9 + k0); f.body.rotation.z = 0.06 * Math.sin(t * 3 + k0);
  const bl = blinkAt(t, k0); for (const fc of f.faces) fc.set(mood, bl, look, 0);
}
/** Vaso de vidrio con líquido (vista de dibujo: vidrio transparente, bordes de tinta, brillo). */
function vessel(x, y, z, r, h, liquid, level, opacity) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, h, 30, 1, true), new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = h / 2; g.add(glass);
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.88, level, 30), new THREE.MeshBasicMaterial({ color: liquid, transparent: true, opacity, depthWrite: false }));
  liq.position.y = level / 2 + 0.012; g.add(liq);
  const ring = (rad, yy, tube) => { const m = new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 6, 44), INK); m.rotation.x = PI / 2; m.position.y = yy; g.add(m); return m; };
  ring(r, h, 0.011); ring(r * 0.9, 0.006, 0.011); ring(r * 0.94, level + 0.012, 0.006);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.018, h), INK); const rr = lerp(r * 0.9, r, 0.5); l.position.set(s * rr, h / 2, 0); g.add(l); }
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.16, h * 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false })); shine.position.set(-r * 0.55, h * 0.52, r * 0.9); g.add(shine);
  g.userData = { level: y + level + 0.012, bottom: y + 0.02 };
  return g;
}
function cube(color, s, w = 0.012) {
  const m = outlined(new THREE.Mesh(new THREE.BoxGeometry(s, s, s), flat(color)), w); m.castShadow = true;
  const hi = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.5, s * 0.14), basic(0xffffff)); hi.position.set(-s * 0.12, s * 0.28, s / 2 + 0.002); hi.rotation.z = 0.5; m.add(hi);
  scene.add(m); return m;
}
/** Copo de nieve dibujado (para la nieve y la escarcha). */
const flakeMat = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.translate(64, 64); g.lineCap = 'round';
  for (const [col, lw] of [['#1e1428', 14], ['#ffffff', 7]]) { g.strokeStyle = col; g.lineWidth = lw;
    for (let i = 0; i < 6; i++) { g.save(); g.rotate(i * PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -52); g.moveTo(0, -30); g.lineTo(-14, -42); g.moveTo(0, -30); g.lineTo(14, -42); g.stroke(); g.restore(); } }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
})();
/** Franja de agua con la cresta ondulada (solo la cresta lleva tinta), recortada por planos. */
function waveStrip(len, amp, period, depth, color, clip) {
  const g = new THREE.Group(); scene.add(g);
  const top = []; for (let x = -len / 2; x <= len / 2 + 1e-6; x += period / 6) top.push([x, amp * Math.sin(x / period * 2 * PI)]);
  const sh = new THREE.Shape([V(-len / 2, -depth, 0), ...top.map(([x, y]) => V(x, y, 0)), V(len / 2, -depth, 0)].map(v => new THREE.Vector2(v.x, v.y)));
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color, clippingPlanes: clip })));
  const ink = new THREE.MeshBasicMaterial({ color: 0x1e1428, clippingPlanes: clip });
  for (let i = 0; i < top.length - 1; i++) { const a = top[i], b = top[i + 1], m = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.04, 0.04), ink); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.005); m.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]); g.add(m); }
  return g;
}
const flake = (s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), flakeMat); scene.add(m); return m; };
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xeefaff, transparent: true, opacity: 0.75 });
const bubble = r => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), bubbleMat); const o = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r * 1.15, 16), basic(0x2b5f8f)); o.position.z = r * 0.5; m.add(o); scene.add(m); return m; };
const arrowCone = (color = 0xffd23a, s = 1) => { const m = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.11 * s, 0.24 * s, 4), flat(color)), 0.02); m.visible = false; scene.add(m); return m; };

// =====================================================================================
// COCINA
// =====================================================================================
const CT = 0.92;                                              // altura de la mesada
surface(scene, tex.planks({ base: '#c08a54', line: '#8f5f33', seed: 4 }, 10, 7), 30, 20, 0, 0.001, 0, true);
surface(scene, tex.tiles({ base: '#eaf3f6', line: '#a9c4cf', n: 6 }, 10, 1.2), 16, 1.3, 0, 0.65, -1.6);
surface(scene, tex.stripes({ a: '#f6e9c9', b: '#efdcb3', dot: '#dcc08a' }, 14, 4), 16, 5, 0, 3.8, -1.61);
k.plane(scene, INK, 16, 0.05, 0, 1.3, -1.59);
block(scene, 0xcf8f52, -2.2, 3.0, 0, CT - 0.04, 0.38, -0.4, 0.02);                 // mueble
block(scene, 0xf1efe8, -2.25, 3.05, CT - 0.04, CT, 0.42, -0.44, 0.016);              // mesada
for (let i = 0; i < 6; i++) {                                                         // puertas con manija
  const x0 = -2.1 + i * 0.85; k.plane(scene, 0xd9a066, 0.74, 0.62, x0 + 0.37, 0.42, 0.385); k.stroke(scene, [[x0, 0.11], [x0 + 0.74, 0.11], [x0 + 0.74, 0.73], [x0, 0.73]].map(([x, y]) => [x, y]), 0.03, true, 0.386);
  block(scene, 0x5d6772, x0 + 0.33, x0 + 0.41, 0.62, 0.65, 0.41, 0.385, 0.008);
}
// ventana con el paisaje nevado (y nieve que cae del otro lado)
const WIN = { x: 1.45, y: 2.2, w: 1.0, h: 1.05 };
picture(scene, WIN.w, WIN.h, WIN.x, WIN.y, -1.58, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8fb3d9'); gr.addColorStop(1, '#dfeaf3'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f7fbff'; g.beginPath(); g.moveTo(0, H * 0.72); g.quadraticCurveTo(W * 0.4, H * 0.6, W, H * 0.75); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  for (const [x, s] of [[0.2, 1], [0.38, 0.7], [0.75, 0.9]]) { g.fillStyle = '#3f7f5a'; g.beginPath(); g.moveTo(W * x, H * (0.68 - 0.3 * s)); g.lineTo(W * (x - 0.09 * s), H * 0.72); g.lineTo(W * (x + 0.09 * s), H * 0.72); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(W * x, H * (0.68 - 0.3 * s)); g.lineTo(W * (x - 0.04 * s), H * (0.68 - 0.17 * s)); g.lineTo(W * (x + 0.04 * s), H * (0.68 - 0.17 * s)); g.fill(); }
  g.fillStyle = '#cfe3f2'; g.beginPath(); g.ellipse(W * 0.55, H * 0.88, W * 0.28, H * 0.05, 0, 0, 7); g.fill();          // laguna congelada
  g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  g.strokeStyle = '#1e1428'; g.lineWidth = 16; g.strokeRect(4, 4, W - 8, H - 8);
}, 320);
const winFlakes = Array.from({ length: 14 }, (_, i) => { const m = flake(0.07); m.userData = { u: (i * 0.37) % 1, x: ((i * 0.61) % 1 - 0.5) * 0.85, sp: 0.18 + (i % 4) * 0.04 }; return m; });
const curtains = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(WIN.x + s * (WIN.w / 2 + 0.08), WIN.y + WIN.h / 2 + 0.08, -1.5); scene.add(g);
  const m = picture(g, 0.32, 1.25, 0, -0.62, 0, (cg, W, H) => { cg.fillStyle = '#d9534f'; cg.beginPath(); cg.moveTo(0, 0); cg.lineTo(W, 0); cg.quadraticCurveTo(W * 0.5, H * 0.6, W * 0.8, H); cg.lineTo(W * 0.2, H); cg.quadraticCurveTo(W * 0.3, H * 0.5, 0, 0); cg.fill(); cg.strokeStyle = '#1e1428'; cg.lineWidth = 8; cg.stroke();
    cg.fillStyle = '#f4f1e8'; for (let j = 0; j < 6; j++) for (let i = 0; i < 3; i++) { cg.beginPath(); cg.arc(W * (0.3 + i * 0.2), H * (0.1 + j * 0.14), 7, 0, 7); cg.fill(); } }, 128);
  return g; });
block(scene, 0x7a4b2a, WIN.x - 0.65, WIN.x + 0.65, WIN.y + 0.62, WIN.y + 0.68, -1.45, -1.6, 0.012);                 // barral
// estante con frascos
block(scene, 0x9a6638, 0.15, 0.95, 2.18, 2.24, -1.3, -1.6, 0.014);
[[0.27, 0xf0c457, 0.22], [0.47, 0x8fd08a, 0.3], [0.66, 0xe07a5f, 0.18], [0.84, 0x7cc4f0, 0.26]].forEach(([x, col, h]) => {
  const j = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, h, 16), flat(col)), 0.014); j.position.set(x, 2.24 + h / 2, -1.45); scene.add(j);
  const lid = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), flat(0x5d6772)), 0.01); lid.position.set(x, 2.24 + h + 0.02, -1.45); scene.add(lid); });
// reloj de péndulo
const CLK = V(-1.0, 2.45, -1.55);
picture(scene, 0.5, 0.5, CLK.x, CLK.y, CLK.z, (g, W, H) => { g.fillStyle = '#1e1428'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#fff8e6'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 16, 0, 7); g.fill();
  g.fillStyle = '#1e1428'; for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.fillRect(W / 2 + Math.cos(a) * W * 0.36 - 4, H / 2 + Math.sin(a) * H * 0.36 - 4, 8, 8); } }, 160);
const hands = [0.16, 0.11].map((len, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.022, len), INK); m.geometry.translate(0, len / 2, 0); m.position.set(CLK.x, CLK.y, CLK.z + 0.01 + i * 0.002); scene.add(m); return m; });
const pend = new THREE.Group(); pend.position.set(CLK.x, CLK.y - 0.24, CLK.z + 0.005); scene.add(pend);
{ const rod = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.42), INK); rod.position.y = -0.21; pend.add(rod); const bob = new THREE.Mesh(new THREE.CircleGeometry(0.07, 18), basic(0xd9a441)); bob.position.y = -0.44; pend.add(bob); const bo = new THREE.Mesh(new THREE.CircleGeometry(0.085, 18), INK); bo.position.set(0, -0.44, -0.002); pend.add(bo); }
// pava con vapor
const KET = V(-1.0, CT, -0.12);
{ const g = new THREE.Group(); g.position.copy(KET); scene.add(g);
  ell(g, 0xd9534f, 0.2, 0.16, 0.18, 0, 0.16, 0, 0.02); ell(g, 0x2b2f3a, 0.06, 0.04, 0.06, 0, 0.33, 0, 0.012);
  const sp = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.22, 10), flat(0xd9534f)), 0.012); sp.position.set(0.23, 0.24, 0); sp.rotation.z = -0.9; g.add(sp);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 20, PI), INK); hd.position.set(0, 0.3, 0); g.add(hd); }
const steam = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); scene.add(m); return m; });

// Vaso con agua y hielo
const glass = vessel(0.3, CT, -0.1, 0.15, 0.42, 0x5fb6e8, 0.3, 0.5);
const WS = glass.userData.level;                              // nivel del agua del vaso
const ice = [0, 1, 2].map(() => cube(0xbfeeff, 0.095, 0.016));
const DROP = 0.32;
// Vaso con "otra sustancia": el sólido se hunde
const beak = vessel(1.0, CT, -0.1, 0.15, 0.42, 0xf0a63a, 0.3, 0.75);
const BS = beak.userData.level;
const drop = ell(scene, 0xf0a63a, 0.07, 0.085, 0.07, 0, 0, 0, 0.014);      // gota líquida que se vuelve sólida
const solid = cube(0xc8701a, 0.1);
const beakBub = Array.from({ length: 6 }, () => bubble(0.018));
// Pecera
const BOWL = V(1.75, CT + 0.25, -0.1);
{ const water = new THREE.Mesh(new THREE.CircleGeometry(0.25, 40), new THREE.MeshBasicMaterial({ color: 0x9fdcf5, transparent: true, opacity: 0.75 })); water.position.set(BOWL.x, BOWL.y - 0.02, BOWL.z - 0.12); scene.add(water);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.29, 48), INK); rim.position.set(BOWL.x, BOWL.y, BOWL.z + 0.14); scene.add(rim);
  const glassB = new THREE.Mesh(new THREE.CircleGeometry(0.27, 48), new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.18, depthWrite: false })); glassB.position.set(BOWL.x, BOWL.y, BOWL.z + 0.135); scene.add(glassB);
  const top = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 30), INK); top.rotation.x = PI / 2; top.position.set(BOWL.x, BOWL.y + 0.24, BOWL.z); scene.add(top);
  const gravel = picture(scene, 0.42, 0.1, BOWL.x, BOWL.y - 0.2, BOWL.z - 0.1, (g, W, H) => { const r = rng(3); for (let i = 0; i < 60; i++) { g.fillStyle = ['#e07a5f', '#f0c457', '#8fd08a', '#ffffff'][i % 4]; g.beginPath(); g.arc(r() * W, H * 0.4 + r() * H * 0.6, 7, 0, 7); g.fill(); } }, 128);
  const weed = picture(scene, 0.12, 0.28, BOWL.x - 0.13, BOWL.y - 0.08, BOWL.z - 0.08, (g, W, H) => { g.strokeStyle = '#3f9a5a'; g.lineWidth = 10; g.lineCap = 'round'; for (const x of [0.3, 0.6]) { g.beginPath(); g.moveTo(W * x, H); g.quadraticCurveTo(W * (x - 0.3), H * 0.5, W * x, 6); g.stroke(); } }, 64); }
const bowlFish = makeFish(0xf08a24, 0xffd9a0, 0.42);
const bowlBub = Array.from({ length: 3 }, () => bubble(0.014));

// La chica
const girl = makeToon({ shirt: 0x8a6bbf, hair: 0x7a3e1c, detail: ['collar', 'buttons'], trim: 0xfff3e0 }); scene.add(girl.root);
for (const s of [-1, 1]) { ell(girl.head, 0x7a3e1c, 0.1, 0.13, 0.1, s * 0.31, -0.02, -0.06, 0.02); ell(girl.head, 0xe0607e, 0.04, 0.04, 0.04, s * 0.27, 0.1, -0.06, 0.012); }
const GY = 0.25, GZ = -0.62;                                  // está parada en un banquito, detrás de la mesada

// =====================================================================================
// MOLÉCULAS (x = 40)
// =====================================================================================
const LY = 2.35, WL = LY + 1.85;                              // centro del grupo de moléculas; nivel del agua del tanque
surface(scene, tex.tiles({ base: '#cfe6ef', line: '#9fc0cf', n: 4 }, 8, 6), 18, 12, MX, 4, -2.6);
surface(scene, tex.tiles({ base: '#b9cdd6', line: '#8fa5b0', n: 3 }, 10, 8), 22, 14, MX, -0.3, 0, true);
// tanque: agua, marco y cartel
k.plane(scene, new THREE.MeshBasicMaterial({ color: 0xa9def5 }), 5.4, WL - 0.1 + 0.3, MX, (WL - 0.1 - 0.3) / 2, -1.9);
const tankClip = [new THREE.Plane(V(1, 0, 0), -(MX - 2.7)), new THREE.Plane(V(-1, 0, 0), MX + 2.7)];
const tankWave = waveStrip(12, 0.06, 0.4, 0.4, 0xa9def5, tankClip);
tankWave.position.set(MX, WL, -1.88);
for (const s of [-1, 1]) block(scene, 0x5d6772, MX + s * 2.7 - 0.09, MX + s * 2.7 + 0.09, -0.3, 5.3, -1.6, -2.0, 0.02);
block(scene, 0x5d6772, MX - 2.9, MX + 2.9, -0.3, 0.3, -1.5, -2.1, 0.02);
block(scene, 0x5d6772, MX - 2.9, MX + 2.9, 5.2, 5.4, -1.6, -2.0, 0.02);
const tankBub = Array.from({ length: 12 }, (_, i) => { const m = bubble(0.035 + (i % 3) * 0.012); m.userData = { x: ((i * 0.37) % 1 - 0.5) * 5, sp: 0.35 + (i % 4) * 0.08, u: (i * 0.29) % 1 }; return m; });
// las moléculas
const molG = new THREE.Group(); molG.position.set(MX, LY, 0); scene.add(molG);
const A = 0.64, Q = 7, R = 4, SQ = Math.sqrt(3) / 2;
const lat = [], latIdx = {};
for (let r = 0; r < R; r++) for (let q = 0; q < Q; q++) { latIdx[q + ',' + r] = lat.length; lat.push({ q, r, x: q * SQ * A, y: r * 1.5 * A + ((q + r) % 2) * 0.5 * A }); }
{ const cx = (Q - 1) * SQ * A / 2, cy = ((R - 1) * 1.5 * A + 0.5 * A) / 2; for (const p of lat) { p.x -= cx; p.y -= cy; } }
const links = [];
for (const p of lat) {
  const right = latIdx[(p.q + 1) + ',' + p.r]; if (right !== undefined) links.push([latIdx[p.q + ',' + p.r], right]);
  if ((p.q + p.r) % 2 === 1) { const up = latIdx[p.q + ',' + (p.r + 1)]; if (up !== undefined) links.push([latIdx[p.q + ',' + p.r], up]); }
}
const nbr = lat.map(() => []); for (const [a, b] of links) { nbr[a].push(b); nbr[b].push(a); }
const hexes = [];
for (let r = 0; r < R - 1; r++) for (let q = 0; q + 2 < Q; q++) if ((q + r) % 2 === 1) {
  const ids = [[q, r], [q + 1, r], [q + 2, r], [q + 2, r + 1], [q + 1, r + 1], [q, r + 1]].map(([a, b]) => latIdx[a + ',' + b]);
  hexes.push({ ids, x: ids.reduce((s, i) => s + lat[i].x, 0) / 6, y: ids.reduce((s, i) => s + lat[i].y, 0) / 6 });
}
// en el líquido: más apretadas y desordenadas
const liq = [], rr = rng(7), LW = 2.62, LH = 2.5;
for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) if (!((i === 0 && j === 0) || (i === 5 && j === 4))) liq.push({ x: -LW / 2 + i * LW / 5 + (j % 2 ? 0.12 : -0.12) + (rr() - 0.5) * 0.08, y: -LH / 2 + j * LH / 4 + (rr() - 0.5) * 0.08 });
const order = arr => arr.map((p, i) => [p, i]).sort((a, b) => (Math.round(a[0].y * 3) - Math.round(b[0].y * 3)) || (a[0].x - b[0].x)).map(e => e[1]);
const lo = order(lat), li = order(liq);
const mols = lat.map((p, i) => {
  const m = makeMol(molG); const L = liq[li[lo.indexOf(i)]];
  const nb = nbr[i].map(j => Math.atan2(lat[j].y - p.y, lat[j].x - p.x));
  m.d = { lx: L.x, ly: L.y, a1: nb[0] ?? -2.2, a2: nb[1] ?? -0.9, k: i * 1.37 };
  return m;
});
const linkMeshes = links.map(() => { const g = new THREE.Group(); molG.add(g);
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.075), INK); g.add(o); const y = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.04), basic(0xffd23a)); y.position.z = 0.002; g.add(y); g.visible = false; return g; });
const HEX = hexes[Math.floor(hexes.length / 2)];               // el hexágono que se marca
const hexLine = new THREE.Group(); molG.add(hexLine);
HEX.ids.forEach((id, n) => { const a = lat[id], b = lat[HEX.ids[(n + 1) % 6]], m = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(b.x - a.x, b.y - a.y) + 0.1, 0.1), basic(0xffd23a)); m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0.3); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); hexLine.add(m); });
const holes = hexes.map(h => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false })); m.position.set(h.x, h.y, -0.08); molG.add(m); return m; });
// marcos de "cuánto lugar ocupa": antes (líquido, punteado) y después (hielo)
function rectLines(w, h, color, dashed) {
  const g = new THREE.Group(); molG.add(g);
  const seg = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = dashed ? Math.floor(L / 0.18) : 1;
    for (let i = 0; i < n; i++) { if (dashed && i % 2) continue; const u0 = i / n, u1 = dashed ? (i + 1) / n : 1, m = new THREE.Mesh(new THREE.PlaneGeometry(L * (u1 - u0), 0.05), basic(color));
      m.position.set(lerp(x0, x1, (u0 + u1) / 2), lerp(y0, y1, (u0 + u1) / 2), 0.32); m.rotation.z = Math.atan2(y1 - y0, x1 - x0); g.add(m); } };
  seg(-w / 2, -h / 2, w / 2, -h / 2); seg(w / 2, -h / 2, w / 2, h / 2); seg(w / 2, h / 2, -w / 2, h / 2); seg(-w / 2, h / 2, -w / 2, -h / 2);
  g.visible = false; return g;
}
const ICEW = (Q - 1) * SQ * A + 0.75, ICEH = (R - 1) * 1.5 * A + 0.5 * A + 0.75;
const rectBefore = rectLines(ICEW * 0.917, ICEH * 0.917, 0xffffff, true), rectAfter = rectLines(ICEW, ICEH, 0xffd23a, false);
const frost = Array.from({ length: 16 }, (_, i) => { const m = flake(0.16 + (i % 3) * 0.05); m.userData = { x: ((i * 0.43) % 1 - 0.5) * 4.6, u: (i * 0.31) % 1, sp: 0.25 + (i % 5) * 0.05 }; m.visible = false; return m; });
const molSparks = [0, 1, 2, 3, 4].map(() => k.glyph('✦', '#fff1a8', 0.34));

// =====================================================================================
// LAGO EN CORTE (x = 80)
// =====================================================================================
const W0 = 3.0, D = 2.6;                                       // medio ancho y profundidad del lago
const halfW = y => W0 * Math.sqrt(Math.max(1 - (y / D) ** 2, 0));
// agua (detrás de la tierra recortada)
picture(scene, 6.4, 3.0, LX, -1.45, -0.36, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9fdcf5'); gr.addColorStop(0.45, '#5fb0e0'); gr.addColorStop(1, '#2f6fb0'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 6; const r = rng(5); for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40, y); g.stroke(); }
}, 512);
// hielo que crece desde el fondo (solo en el "mundo al revés")
const botClip = new THREE.Plane(V(0, -1, 0), -D - 0.01);
const botIce = picture(scene, 6.4, 3.0, LX, -1.45, -0.34, (g, W, H) => {
  g.fillStyle = '#d8f1fb'; g.fillRect(0, 0, W, H); g.strokeStyle = '#a9d4ea'; g.lineWidth = 5; const r = rng(9);
  for (let i = 0; i < 30; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 60); g.stroke(); }
  g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) g.fillRect(r() * W, r() * H, 14, 4);
}, 512);
botIce.material.clippingPlanes = [botClip];
const botEdge = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.06), new THREE.MeshBasicMaterial({ color: 0x1e1428 })); botEdge.position.set(LX, -D, -0.335); scene.add(botEdge);
// tierra en corte con el hueco del lago
picture(scene, 14, 6, LX, -3, -0.3, (g, W, H) => {
  const ppm = W / 14, r = rng(21);
  g.fillStyle = '#8a5a3a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#7a4d30'; g.fillRect(0, H * 0.35, W, H * 0.25); g.fillStyle = '#6a4228'; g.fillRect(0, H * 0.6, W, H * 0.4);
  for (let i = 0; i < 170; i++) { g.fillStyle = ['#a8784f', '#6a4228', '#b9a585', '#9aa0a8'][i % 4]; g.beginPath(); g.ellipse(r() * W, 20 + r() * (H - 20), 6 + r() * 14, 4 + r() * 9, r() * 3, 0, 7); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 2; if (i % 4 === 3) g.stroke(); }
  g.strokeStyle = '#5f3b1f'; g.lineWidth = 5; for (let i = 0; i < 14; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (r() - 0.5) * 60, 40, x + (r() - 0.5) * 90, 70 + r() * 60); g.stroke(); }
  // hueco del lago (media elipse) y su borde
  const cx = W / 2; g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(cx, 0, W0 * ppm, D * ppm, 0, 0, PI); g.fill();
  g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#1e1428'; g.lineWidth = 9; g.beginPath(); g.ellipse(cx, 0, W0 * ppm, D * ppm, 0, 0, PI); g.stroke();
  g.strokeStyle = '#c9b08a'; g.lineWidth = 16; g.beginPath(); g.ellipse(cx, 0, W0 * ppm + 12, D * ppm + 12, 0, 0.05, PI - 0.05); g.stroke();          // arena del borde
  g.fillStyle = '#3f9a5a'; for (let i = 0; i < 9; i++) { const a = 0.35 + i * 0.27, x = cx + Math.cos(a) * (W0 * ppm - 4), y = Math.sin(a) * (D * ppm - 4); g.beginPath(); g.ellipse(x, y - 16, 5, 22, (a - PI / 2) * 0.4, 0, 7); g.fill(); }   // algas
  g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 2); g.lineTo(W, 2); g.stroke();
}, 1536);
// nieve en las orillas y orilla de atrás
for (const s of [-1, 1]) block(scene, 0xf6f9fc, Math.min(LX + s * W0, LX + s * 15), Math.max(LX + s * W0, LX + s * 15), -0.06, 0.05, 0.9, -0.3, 0.016);
picture(scene, 14, 0.5, LX, 0.1, -1.0, (g, W, H) => { const f = i => H * (0.35 + 0.15 * Math.sin(i * 1.7)); g.fillStyle = '#eef4fa'; g.beginPath(); g.moveTo(0, H); for (let i = 0; i <= 28; i++) g.lineTo(i * W / 28, f(i)); g.lineTo(W, H); g.fill(); g.strokeStyle = '#9fb4c8'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 28; i++) g.lineTo(i * W / 28, f(i)); g.stroke(); }, 1536);
surface(scene, tex.grass({ base: '#eef4fa', blade: '#d6e3ee', light: '#ffffff', seed: 4 }, 12, 6), 40, 20, LX, 0.0, -10.3, true);
for (const [dx, r, col] of [[-5, 5, 0xdce9f4], [2, 6.5, 0xe8f1f8], [7, 4.5, 0xd2e2ef]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(col)); h.scale.y = 0.5; h.position.set(LX + dx, 0, -14); scene.add(h); }
const pines = [[-3.6, -1.6, 2.4], [-2.4, -3.5, 2.0], [-0.8, -5.5, 1.8], [1.2, -4.5, 2.1], [2.9, -2.2, 2.6], [3.9, -1.4, 2.2], [-4.6, -3.0, 2.3], [0.2, -7, 1.7]];
for (const [dx, z, h] of pines) { const tr = k.tree(LX + dx, z, { pine: true, h, leaf: 0x3f7f5a }); const cap = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 12), flat(0xffffff)), 0.018); cap.position.y = h * 0.42 + 2 * 0.5 + 0.22; tr.add(cap); }
k.cloud(LX - 2.5, 5.2, -9, 1.0); k.cloud(LX + 2.4, 6.2, -9, 0.9); k.cloud(LX + 0.3, 7.4, -10, 0.8);
k.birds([[LX, 4.6, 0], [LX, 5.3, 7]], -7);
// cabaña con humo, en la orilla de atrás
{ const g = new THREE.Group(); g.position.set(LX + 1.9, 0, -3.2); scene.add(g);
  block(g, 0x9a5a3a, -0.6, 0.6, 0, 0.85, 0.45, -0.45, 0.02);
  const roof = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), flat(0xffffff)), 0.02); roof.position.y = 1.15; roof.rotation.y = PI / 4; g.add(roof);
  block(g, 0x5d4a3a, 0.25, 0.42, 1.0, 1.55, 0.1, -0.1, 0.014); block(g, 0x3a2a20, -0.15, 0.12, 0, 0.5, 0.47, 0.45, 0.012);
  k.plane(g, 0xffe9a3, 0.22, 0.2, 0.36, 0.5, 0.46); }
const chim = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf4f4f4, transparent: true })); scene.add(m); return m; });
k.walker({ toon: { shirt: 0x3b82c4, hair: 0x23262d, detail: ['stripes'] }, cx: LX - 1, z: -5.2, speed: 0.7, off: 3, dir: 1, span: 16 });
// superficie del agua (antes del hielo)
const lakeClip = [new THREE.Plane(V(1, 0, 0), -(LX - W0)), new THREE.Plane(V(-1, 0, 0), LX + W0)];
const lakeWave = waveStrip(16, 0.05, 0.4, 0.3, 0x9fdcf5, lakeClip);
lakeWave.position.set(LX, -0.02, -0.32);
// la tapa de hielo: cinco placas (después se hunden en el mundo al revés)
const ICE_TOP = 0.03, CAP = 0.34;
const slabs = [-2.4, -1.2, 0, 1.2, 2.4].map((x, i) => {
  const g = new THREE.Group(); scene.add(g);
  const mat = flat(0xcdeefa, { transparent: true }), m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const o = new THREE.Mesh(m.geometry, HULL); g.add(o);
  const snow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), flat(0xffffff)); g.add(snow);
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.04), basic(0xffffff)); streak.rotation.z = 0.25; g.add(streak);
  g.userData = { x, i, m, o, snow, streak };
  return g;
});
function poseSlab(g, cx, top, thk, rot = 0, w = 1.18) {
  const { m, o, snow, streak } = g.userData, d = 0.85, e = 0.03;
  g.position.set(cx, top - thk / 2, 0.17); g.rotation.z = rot;
  m.scale.set(w, Math.max(thk, 0.001), d); o.scale.set(w + e, Math.max(thk, 0.001) + e, d + e);
  snow.scale.set(w * 0.96, 0.03, d * 0.9); snow.position.y = thk / 2 + 0.01; snow.visible = thk > 0.12;
  streak.position.set(-w * 0.15, 0, d / 2 + 0.003); streak.scale.set(1, thk > 0.1 ? 1 : 0, 1);
}
// termómetro del fondo
const TH = V(LX + 1.6, -2.0, 0.05);
{ const g = new THREE.Group(); g.position.copy(TH); scene.add(g);
  const tube = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.95, 14), flat(0xffffff)), 0.016); tube.position.y = 0.5; g.add(tube);
  ell(g, 0xe8463c, 0.1, 0.1, 0.1, 0, 0, 0, 0.018);
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.014), INK); l.position.set(0.09, 0.2 + i * 0.13, 0.03); g.add(l); } }
const merc = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1, 10), flat(0xe8463c)), 0.004); scene.add(merc);
const thSign = k.sign('4 °C', 0.46, 0.24, { bg: '#ffd23a' }); thSign.position.set(TH.x, TH.y + 1.2, 0.08); scene.add(thSign);
// moléculas del lago: tres de cuatro grados (al fondo) y tres casi congeladas (arriba)
const warm = [0, 1, 2].map(() => makeMol(scene, 0.8)), cold = [0, 1, 2].map(() => makeMol(scene, 0.8));
const WARM_END = [[-1.25, -2.15], [-0.65, -2.36], [-0.05, -2.42]], COLD_END = [[-1.6, -0.3], [-0.95, -0.38], [-0.3, -0.3]];
const arrows = [0, 1, 2, 3, 4, 5].map(i => arrowCone(i < 3 ? 0xffd23a : 0x9fe0ff, 0.9));
// peces
const fishes = [
  { f: makeFish(0xf08a24, 0xffd9a0), cx: 0.2, y: -1.12, amp: 1.0, w: 0.55, ph: 0, z: 0.25, sx: -0.5 },
  { f: makeFish(0x5fae4d, 0xd8f0b0), cx: -0.2, y: -1.88, amp: 0.55, w: 0.42, ph: 2, z: 0.15, sx: -1.55 },
  { f: makeFish(0xd9534f, 0xffc9b0), cx: 0.6, y: -0.72, amp: 1.2, w: 0.5, ph: 4, z: 0.2, sx: 0.5 },
  { f: makeFish(0x8a6bbf, 0xe3d6f5), cx: 0.1, y: -1.52, amp: 0.9, w: 0.36, ph: 1, z: 0.1, sx: 1.55 },
];
const lakeBub = Array.from({ length: 10 }, () => bubble(0.03));
const snow = Array.from({ length: 70 }, (_, i) => { const m = flake(0.08 + (i % 3) * 0.03); m.userData = { x: ((i * 0.618) % 1 - 0.5) * 9, z: ((i * 0.37) % 1) * 2.4 - 1.4, sp: 0.35 + (i % 5) * 0.07, u: (i * 0.29) % 1, k: i }; return m; });
// patinadores (gorro de lana con pompón, hecho acá)
function beanie(t, col, pom) { const g = new THREE.Group(); t.head.add(g);
  const cap = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.315, 24, 12, 0, 2 * PI, 0, 1.25), flat(col)), 0.02); cap.rotation.x = -0.12; g.add(cap);
  const band = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.31, 0.08, 24), flat(pom)), 0.014); band.position.y = 0.08; band.rotation.x = -0.12; g.add(band);
  ell(g, pom, 0.08, 0.08, 0.08, 0, 0.33, -0.02, 0.016); return g; }
const skaters = [
  { t: makeToon({ shirt: 0xd9534f, hair: 0x2b2118, detail: ['stripes'] }), cap: [0x3b82c4, 0xffffff], x0: LX - 3.7, end: LX - 3.35, k: 0 },
  { t: makeToon({ shirt: 0x3f8f6b, hair: 0xe0b050, detail: ['buttons'] }), cap: [0xf0c457, 0xd9534f], x0: LX + 3.7, end: LX + 3.35, k: 2 },
];
const SKB = [LX - 1.25, LX + 1.15];
for (const s of skaters) { scene.add(s.t.root); beanie(s.t, ...s.cap); }

// ---------- signos ----------
const qMark = k.glyph('?', '#ffd23a', 0.42), bang = k.glyph('!', '#ffd23a', 0.45), bangF = k.glyph('!', '#ffd23a', 0.3);
const kSparks = [0, 1, 2].map(() => k.glyph('✦', '#fff1a8', 0.2));
const fishQ = [0, 1, 2, 3].map(() => k.glyph('!', '#ffd23a', 0.3));
const sweat = [0, 1, 2, 3].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const heartTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.beginPath(); g.moveTo(64, 112); g.bezierCurveTo(8, 72, 4, 34, 34, 22); g.bezierCurveTo(52, 16, 62, 28, 64, 40); g.bezierCurveTo(66, 28, 76, 16, 94, 22); g.bezierCurveTo(124, 34, 120, 72, 64, 112); g.closePath();
  g.lineWidth = 14; g.strokeStyle = '#1e1428'; g.stroke(); g.fillStyle = '#ff6f91'; g.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hearts = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ map: heartTex, transparent: true, depthTest: false })); m.renderOrder = 10; m.visible = false; scene.add(m); return m; });
/** Salpicadura de gotitas (al caer algo en un vaso). */
function drops(color, n = 7) {
  const pool = Array.from({ length: n }, () => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), flat(color)), 0.008); m.visible = false; scene.add(m); return m; });
  return (t, t0, x, y, z) => pool.forEach((m, i) => { const u = t - t0 - i * 0.01; m.visible = u > 0 && u < 0.45; if (!m.visible) return;
    const a = -1.2 + 2.4 * i / (n - 1), vx = 0.55 * Math.sin(a), vy = 1.3 + 0.3 * Math.cos(a * 3); m.position.set(x + vx * u, y + vy * u - 4.9 * u * u, z + 0.05 * Math.cos(i)); });
}
const splashK = drops(0x8fd3f2), splashB = drops(0xf0a63a), thudPools = [k.puffs(5), k.puffs(5), k.puffs(5)];

// ---------- cámara ----------
const HOLE = () => tmpH.set(MX + HEX.x, LY + HEX.y, 0);
const tmpH = V(0, 0, 0), tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), headG = V(0, 0, 0), headS = V(0, 0, 0);
const PAIR = lat[latIdx['3,1']];
k.shots([
  { t: 0, pos: [0.15, 1.5, 4.4], look: [0.15, 1.32, 0] },
  { t: flotaT + 0.25, pos: [0.1, 1.38, 2.7], look: [0.1, 1.28, 0] },
  { t: siT, pos: [0.0, 1.62, 3.0], look: [0.0, 1.5, 0] },
  { t: pecesT - 0.15, pos: [1.7, 1.25, 2.5], look: [1.7, 1.15, 0] },
  { t: c[1], pos: [0.75, 1.45, 5.6], look: [0.75, 1.3, 0] },
  { t: solidT, pos: [0.9, 1.45, 3.5], look: [0.9, 1.35, 0] },
  { t: hundT - 0.1, pos: [1.0, 1.18, 2.1], look: [1.0, 1.1, 0] },
  { t: c[2], pos: [0.45, 1.45, 3.6], look: [0.45, 1.32, 0] },
  { t: CUT1, pos: [MX, LY + 0.15, 10.8], look: [MX, LY + 0.15, 0], cut: true },
  { t: molT, pos: [MX + 0.2, LY, 7.6], look: [MX + 0.2, LY, 0] },
  { t: manoT - 0.05, pos: [MX + PAIR.x + 0.3, LY + PAIR.y, 3.2], look: [MX + PAIR.x + 0.3, LY + PAIR.y, 0] },
  { t: hexT, pos: [MX, LY, 7.8], look: [MX, LY, 0] },
  { t: huecT - 0.05, pos: [MX + HEX.x, LY + HEX.y, 4.3], look: [MX + HEX.x, LY + HEX.y, 0] },
  { t: c[3], pos: [MX, LY + 0.2, 12.6], look: [MX, LY + 0.2, 0] },
  { t: nueveT, pos: [MX, LY + 0.3, 11.6], look: [MX, LY + 0.3, 0] },
  { t: flota2T - 0.05, pos: [MX, LY + 0.9, 11.4], look: [MX, LY + 1.0, 0] },
  { t: c[4], pos: [LX, -0.6, 13.5], look: [LX, -0.85, 0], cut: true },
  { t: pesT - 0.1, pos: [LX - 0.4, -0.95, 8], look: [LX - 0.4, -1.05, 0] },
  { t: friaT, pos: [LX - 0.9, -0.55, 5.4], look: [LX - 0.9, -0.6, 0] },
  { t: cuatroT - 0.15, pos: [LX + 0.22, -1.55, 8.4], look: [LX + 0.22, -1.65, 0] },
  { t: c[5], pos: [LX, -0.45, 12.5], look: [LX, -0.7, 0] },
  { t: tapaT - 0.1, pos: [LX - 0.1, 0.9, 6.6], look: [LX - 0.1, 0.8, 0] },
  { t: aislaT + 0.05, pos: [LX - 0.2, -0.75, 7.4], look: [LX - 0.2, -0.85, 0] },
  { t: c[6], pos: [LX + 0.1, -1.2, 4.8], look: [LX + 0.1, -1.25, 0] },
  { t: tranqT, pos: [LX - 0.5, -1.05, 5.6], look: [LX - 0.5, -1.1, 0], glide: true },
  { t: c[7], pos: [LX, -0.5, 13.5], look: [LX, -0.75, 0] },
  { t: fondo2T - 0.2, pos: [LX, -1.4, 9.2], look: [LX, -1.5, 0] },
  { t: casiT, pos: [LX, -0.45, 6.4], look: [LX, -0.55, 0] },
]);

// ---------- carteles ----------
const glassTop = V(0.3, CT + 0.45, -0.1), beakTop = V(1.0, CT + 0.45, -0.1), bowlTop = V(BOWL.x, BOWL.y + 0.27, BOWL.z);
tag({ text: 'El hielo flota', big: true, off: BIG, from: 0.1, to: siT });
tag({ text: '¿Sin peces?', big: true, off: BIG, from: pecesT, to: c[1] });
tag({ text: 'Hielo', at: () => tmp2.copy(ice[0].position), off: [-230, -200], from: flotaT + 0.4, to: siT + 0.2 });
tag({ text: 'Otras sustancias', at: () => beakTop, off: [170, 230], from: sustT, to: hundT });
tag({ text: 'Sólido = se hunde', big: true, off: BIG, from: hundT, to: c[2] });
tag({ text: '¡El agua no!', big: true, off: BIG, from: aguaT - 0.1, to: CUT1 });
tag({ text: 'Molécula de agua', at: () => molG.localToWorld(tmp2.set(mols[24].root.position.x, mols[24].root.position.y + 0.2, 0)), off: [-220, -230], from: molT, to: manoT - 0.1 });
tag({ text: '¡Se toman de la mano!', big: true, off: BIG, from: manoT + 0.15, to: hexT });
tag({ text: 'Hexágonos', big: true, off: BIG, from: hexT, to: huecT });
tag({ text: 'Hueco', at: HOLE, off: [180, -330], from: huecT + 0.1, to: c[3] });
tag({ text: '+9% de lugar', big: true, off: BIG, from: nueveT - 0.1, to: flota2T });
tag({ text: '¡Y flota!', big: true, off: BIG, from: flota2T, to: c[4] });
tag({ text: '0 °C', at: () => cold[1].root.position, off: [-60, -230], from: friaT + 0.1, to: cuatroT - 0.1 });
tag({ text: 'Más pesada: 4 °C', big: true, off: [540, 1380], from: cuatroT - 0.1, to: c[5] });
tag({ text: 'Al fondo', at: () => warm[1].root.position, off: [-220, 160], from: fondoT, to: c[5] });
tag({ text: 'De arriba hacia abajo', big: true, off: BIG, from: arribaT - 0.1, to: tapaT });
tag({ text: 'Tapa de hielo', at: () => tmp2.set(LX + 0.6, -0.15, 0.6), off: [140, 240], from: tapaT + 0.1, to: aislaT + 0.2 });
tag({ text: 'Aísla el agua', big: true, off: BIG, from: aislaT, to: c[6] });
tag({ text: 'A salvo', big: true, off: BIG, from: tranqT - 0.2, to: c[7] });
tag({ text: '¿Y si se hundiera?', big: true, off: BIG, from: c[7] + 0.05, to: fondo2T - 0.2 });
tag({ text: 'Desde el fondo', big: true, off: BIG, from: fondo2T - 0.2, to: casiT });
tag({ text: 'Casi nada sobrevive', big: true, off: BIG, from: casiT, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'boom', 0.45); sfx(DROP + 0.25, 'splash', 0.6); sfx(aprT + 0.55, 'splash', 0.5); sfx(hundT + 0.45, 'thud', 0.6);
for (const hit of [nueveT, hundeT + 0.2]) sfx(hit - 0.02, 'riser_to', 1);
sfx(nueveT, 'boom', 0.45); sfx(hundeT + 0.2, 'boom', 0.4);
sfx(molT + 0.25, 'hiss', 0.5);
for (let i = 0; i < 5; i++) sfx(manoT + 0.05 + i * 0.09, 'tap', 0.45);
sfx(flota2T + 0.05, 'pop', 0.7); sfx(arribaT, 'hiss', 0.45);
for (let i = 0; i < 3; i++) sfx(hundeT + 0.9 + i * 0.18, 'thud', 0.55);
sfx(pecesT2 + 0.1, 'pop', 0.5);

// ---------- poses ----------
function poseGirl(t) {
  girl.root.visible = t < CUT1 + 0.1; if (!girl.root.visible) return;
  let p;
  const H = y => y + GY;
  if (t < c[1]) {
    const x = -0.2, hold = 1 - prog(t, DROP, DROP + 0.25), think = win(t, siT, pecesT - 0.2, 0.2);
    p = { x, face: 0.35, look: t < siT ? V(0.3, WS, -0.1) : t < pecesT - 0.15 ? V(x, H(1.4), 9) : V(BOWL.x, BOWL.y, 0),
      handR: hold > 0.01 ? V(0.27, H(1.25), -0.15) : V(0.12, H(0.95), -0.25), wR: Math.max(hold, 0.6 * (1 - hold)),
      handL: V(x - 0.04, H(1.12), GZ + 0.3), wL: think, tilt: 0.18 * think, y: GY + hop(t, flotaT + 0.1, 0.12),
      ...moodAt(t, [[0, 'happy'], [flotaT, 'surprised'], [siT, 'neutral'], [pecesT, 'worried']]) };
  } else if (t < c[2]) {
    const x0 = -0.2, x1 = 0.62, w0 = c[1] + 0.05, w1 = c[1] + 0.85;
    if (t < w1 + 0.1) p = { ...go(t, w0, w1, x0, x1, 0.4), y: GY };
    else {
      const holdUp = 1 - prog(t, aprT + 0.3, aprT + 0.5), pt = win(t, hundT, c[2] + 0.1, 0.2);
      p = { x: x1, y: GY + hop(t, hundT + 0.45, 0.1), face: 0.2, look: t < hundT ? V(1.0, H(1.25), -0.1) : V(1.0, BS - 0.15, -0.1),
        handR: holdUp > 0.01 ? V(1.0, H(1.32), -0.12) : V(0.85, H(1.05), -0.2), wR: holdUp > 0.01 ? back(lin(t, w1, w1 + 0.3)) : pt,
        ...moodAt(t, [[0, 'neutral'], [solidT, 'effort'], [aprT + 0.35, 'neutral'], [hundT + 0.4, 'surprised']]) };
    }
  } else {
    const x = 0.62, pt = back(lin(t, aguaT - 0.15, aguaT + 0.15));
    p = { x, y: GY + hop(t, aguaT - 0.1, 0.14), face: -0.1, look: V(0.3, WS + 0.1, 0.5), handL: V(0.32, H(1.15), -0.2), wL: pt,
      ...moodAt(t, [[0, 'surprised'], [aguaT + 0.2, 'happy']]) };
  }
  p.z = GZ;
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, GZ, -1); p.handL.y += GY; p.wL = 0.8; }
  girl.pose(alive({ blink: blinkAt(t, 0.4), ...p }, t, 0.7)); girl.head.getWorldPosition(headG);
}

function poseKitchen(t) {
  // hielo del vaso: uno cae de la mano y sube a flotar; los otros dos flotan desde el principio
  const floatY = WS - 0.015;
  ice.forEach((m, i) => {
    let x = 0.3 + [0, -0.06, 0.07][i], z = -0.1 + [0.03, -0.05, -0.04][i], y;
    if (i === 0) {
      if (t < DROP) { girl.hand(1, tmp); x = tmp.x; y = tmp.y - 0.06; z = tmp.z + 0.02; }
      else { const u = t - DROP;
        if (t < tHit) y = H_DROP - 4.9 * u * u; else { const tu = t - tHit; y = floatY - 0.13 * Math.exp(-4.5 * tu) * Math.sin(8 * tu) + 0.006 * Math.sin(t * 3); }
        x = lerp(H_X, x, prog(t, DROP, tHit)); }
    } else y = floatY + 0.007 * Math.sin(t * 2.6 + i * 2);
    m.position.set(x, y, z); m.rotation.set(0.15 * Math.sin(t * 1.7 + i), 0.5 + i * 0.7 + 0.1 * Math.sin(t + i), 0.12 * Math.sin(t * 2.1 + i * 3));
  });
  splashK(t, tHit, 0.3, WS, -0.05);
  // la gota que se vuelve sólido y se hunde
  const w1 = c[1] + 0.85, inHand = t >= w1 && t < aprT + 0.4;
  drop.visible = inHand && t < solidT + 0.25; solid.visible = t >= solidT + 0.15 && t < CUT1;
  if (inHand) { girl.hand(1, tmp); tmp.y -= 0.1; }
  if (drop.visible) { const s = back(lin(t, w1, w1 + 0.3)) * (1 - prog(t, solidT + 0.1, solidT + 0.25)); drop.position.copy(tmp); drop.scale.set(0.07 * s * (1 + 0.08 * Math.sin(t * 14)), 0.085 * s, 0.07 * s); }
  if (solid.visible) {
    const sq = settle(t, aprT, 0.25);
    if (t < aprT + 0.4) { solid.position.copy(tmp); solid.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)).multiplyScalar(back(lin(t, solidT + 0.15, solidT + 0.4)) * (1 - 0.12 * win(t, aprT - 0.05, aprT + 0.25, 0.1))); solid.rotation.set(0, 0.4, 0); }
    else {
      const u = t - (aprT + 0.4), yS = BS, bottom = beak.userData.bottom + 0.05;
      const fallT = 0.18, yAt = Math.max(bottom, u < fallT ? SOLID_Y0 - (SOLID_Y0 - yS) * (u / fallT) ** 2 : yS - (yS - bottom) * sm((u - fallT) / (hundT + 0.45 - aprT - 0.4 - fallT)));
      solid.position.set(1.0, yAt, -0.1); solid.scale.setScalar(1); solid.rotation.set(0.1 * Math.sin(u * 3), 0.4 + 0.6 * sm(u), 0.25 * sm(u));
    }
  }
  splashB(t, aprT + 0.4 + 0.18, 1.0, BS, -0.05);
  beakBub.forEach((m, i) => { const u = ((t - aprT - 0.6) * 0.9 - i * 0.12); m.visible = u > 0 && u < 1 && t < CUT1; if (!m.visible) return; const bx = 1.0 + 0.05 * Math.sin(i * 2.3 + t * 5); m.position.set(bx, lerp(solid.position.y, BS - 0.02, u), -0.05); });
  // pecera
  const fx = BOWL.x + 0.11 * Math.sin(t * 1.3), dir = Math.cos(t * 1.3);
  poseFish(bowlFish, t, fx, BOWL.y - 0.03 + 0.02 * Math.sin(t * 2.3), BOWL.z + 0.02, Math.max(-1, Math.min(1, dir * 4)), t > pecesT ? 'surprised' : 'happy', 3, t > pecesT ? 0 : dir);
  bowlBub.forEach((m, i) => { const u = (t * 0.6 + i / 3) % 1; m.position.set(fx + 0.1 * Math.sign(dir) + 0.02 * Math.sin(t * 6 + i), BOWL.y + 0.0 + 0.2 * u, BOWL.z + 0.05); m.scale.setScalar(0.6 + 0.6 * u); });
  glyphAt(bangF, bowlFish.root.position, 0, 0.2, popIn(t, pecesT, c[1]), 0);
  // reloj, cortinas, vapor, nieve por la ventana
  hands[0].rotation.z = -t * 0.9; hands[1].rotation.z = -t * 0.08 - 1; pend.rotation.z = 0.32 * Math.sin(t * 3.4);
  curtains.forEach((g, i) => { g.rotation.z = 0.03 * Math.sin(t * 1.3 + i * 2); });
  steam.forEach((m, i) => { const u = (t * 0.55 + i / 5) % 1; m.position.set(KET.x + 0.32 + 0.25 * u + 0.05 * Math.sin(t * 3 + i), KET.y + 0.33 + 0.5 * u, KET.z); m.scale.setScalar(0.5 + 1.4 * u); m.material.opacity = 0.85 * (1 - u); });
  winFlakes.forEach(m => { const d = m.userData, u = (d.u + t * d.sp) % 1; m.position.set(WIN.x + d.x + 0.04 * Math.sin(t * 2 + d.x * 9), WIN.y + WIN.h * 0.45 - u * WIN.h * 0.9, -1.56); m.rotation.z = t * 0.8; });
  glyphAt(qMark, headG, 0.05, 0.55, popIn(t, siT + 0.1, pecesT - 0.1), 0.15 * Math.sin(t * 6));
  glyphAt(bang, headG, 0.0, 0.6, popIn(t, aguaT - 0.1, CUT1) + popIn(t, hundT + 0.4, c[2] - 0.1), 0);
  kSparks.forEach((m, i) => { const kk = popIn(t, flotaT + 0.3, siT + 0.3) * (0.6 + 0.4 * Math.sin(t * 9 + i * 2)); glyphAt(m, tmp2.set(0.3, WS + 0.04, -0.1), [-0.18, 0.2, 0.02][i], [0.08, 0.12, 0.2][i], Math.max(kk, 0), t + i); });
}
// datos del hielo que cae (fijos: los cuadros sueltos se dibujan sin los anteriores)
const H_DROP = 1.44, H_X = 0.27, SOLID_Y0 = 1.47;
const tHit = DROP + Math.sqrt((H_DROP - (WS - 0.015)) / 4.9);
const glyphAt = k.glyphAt;

function poseMolecules(t) {
  const on = t >= CUT1 - 0.1 && t < c[4] + 0.1;
  molG.visible = on; if (!on) { frost.forEach(m => { m.visible = false; }); return; }
  const fr = i => sm(lin(t, molT + 0.15 + (i % 7) * 0.035, manoT + 0.05 + (i % 7) * 0.035));
  const rise = back(lin(t, flota2T, flota2T + 0.5)) * 0.62;
  molG.position.y = LY + rise + (t > flota2T ? 0.04 * Math.sin((t - flota2T) * 3.2) : 0);
  mols.forEach((m, i) => {
    const d = m.d, f = fr(i), shiver = win(t, molT + 0.05, manoT + 0.25, 0.1);
    const jx = 0.07 * Math.sin(t * 7.3 + d.k) * (1 - f) + 0.01 * Math.sin(t * 13 + d.k) + 0.012 * shiver * Math.sin(t * 40 + d.k);
    const jy = 0.07 * Math.cos(t * 6.1 + d.k * 1.3) * (1 - f) + 0.01 * Math.cos(t * 11 + d.k);
    const x = lerp(d.lx, lat[i].x, f) + jx, y = lerp(d.ly, lat[i].y, f) + jy;
    const spin = t * (1.2 + (i % 3) * 0.5) * (i % 2 ? 1 : -1) + d.k;
    const la1 = -PI / 2 - 0.91 + spin, la2 = -PI / 2 + 0.91 + spin;
    const ang = (from, to) => { let dd = (to - from) % (2 * PI); if (dd > PI) dd -= 2 * PI; if (dd < -PI) dd += 2 * PI; return from + dd * f; };
    const mood = t < molT + 0.1 ? 'happy' : t < manoT + 0.3 ? 'surprised' : 'happy';
    poseMol(m, x, y, 0, ang(la1, d.a1), ang(la2, d.a2), mood, blinkAt(t, d.k), Math.sin(t * 2 + d.k) * (1 - f), 0);
    m.root.scale.setScalar(1 + 0.04 * Math.sin(t * 5 + d.k));
  });
  links.forEach(([a, b], n) => {
    const g = linkMeshes[n], s = back(lin(t, manoT + 0.02 * (n % 9), manoT + 0.3 + 0.02 * (n % 9)));
    g.visible = s > 0.01; if (!g.visible) return;
    const pa = mols[a].root.position, pb = mols[b].root.position, L = pa.distanceTo(pb);
    g.position.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, -0.06); g.rotation.z = Math.atan2(pb.y - pa.y, pb.x - pa.x); g.scale.set(Math.max(L * s, 0.001), 1, 1);
  });
  const hl = popIn(t, hexT, c[3] + 0.4);
  hexLine.visible = hl > 0.01; hexLine.scale.setScalar(Math.max(hl, 0.001) * (1 + 0.04 * Math.sin(t * 8))); hexLine.position.set(HEX.x * (1 - hl), HEX.y * (1 - hl), 0);
  holes.forEach((m, i) => { const kk = (m === holes[hexes.indexOf(HEX)] ? 1 : 0.6) * win(t, huecT, flota2T, 0.25); m.material.opacity = 0.55 * kk * (0.75 + 0.25 * Math.sin(t * 7 + i)); m.scale.setScalar(0.8 + 0.2 * kk); });
  rectBefore.visible = t > ocupaT + 0.1 && t < flota2T; rectAfter.visible = t > lugarT - 0.2 && t < flota2T;
  if (rectAfter.visible) rectAfter.scale.setScalar(lerp(0.917, 1, back(lin(t, lugarT - 0.2, lugarT + 0.3))));
  frost.forEach(m => { const d = m.userData, u = (d.u + (t - molT) * d.sp) % 1; m.visible = t > molT; m.position.set(MX + d.x + 0.1 * Math.sin(t * 1.5 + d.x), WL + 0.8 - u * 5.5, 0.6); m.rotation.z = t * 0.6 + d.x; m.scale.setScalar(t > molT ? Math.min(1, (t - molT) * 3) : 0); });
  tankBub.forEach(m => { const d = m.userData, u = (d.u + t * d.sp * 0.4) % 1; m.position.set(MX + d.x + 0.06 * Math.sin(t * 3 + d.x), 0.35 + u * (WL - 0.5), -1.4); });
  tankWave.position.x = MX + ((t * 0.25) % 0.4);
  molSparks.forEach((m, i) => { const kk = popIn(t, flota2T + 0.1, c[4] + 0.1) * (0.6 + 0.4 * Math.sin(t * 9 + i * 1.7)); glyphAt(m, tmp2.set(MX + (i - 2) * 0.8, molG.position.y + ICEH / 2 + 0.15 + 0.15 * (i % 2), 0.4), 0, 0, Math.max(kk, 0), t + i); });
}

function poseLake(t) {
  // espesor de la tapa (crece de arriba hacia abajo) y el mundo al revés (las placas se hunden)
  const thk = CAP * sm(lin(t, arribaT - 0.2, aislaT));
  const sink = i => lin(t, hundeT + 0.15 + i * 0.12, hundeT + 0.95 + i * 0.12);
  const REST = [[-1.05, -2.0, 0.45], [-0.35, -2.25, 0.12], [0.35, -2.27, -0.1], [1.05, -2.02, -0.42], [0.0, -1.92, 0.05]];
  slabs.forEach((g, i) => {
    const x0 = LX + g.userData.x;
    if (t < hundeT + 0.15 + i * 0.12) { poseSlab(g, x0 + (t > hundeT ? 0.01 * Math.sin(t * 40 + i) : 0), ICE_TOP, thk); g.visible = thk > 0.005; return; }
    const u = sink(i), e = u * u, [rx, ry, rot] = REST[i];
    const fade = prog(t, fondo2T + 0.4, casiT + 0.1), um = g.userData;
    um.m.material.opacity = 1 - fade; um.o.visible = fade < 0.05; um.streak.visible = fade < 0.5;
    poseSlab(g, lerp(x0, LX + rx, sm(u)), lerp(ICE_TOP, ry + 0.17, e) + (u >= 1 ? 0.03 * Math.exp(-6 * (t - hundeT - 0.95 - i * 0.12)) * Math.abs(Math.cos(14 * (t - hundeT - 0.95 - i * 0.12))) : 0), CAP, rot * sm(u), 0.62 + 0.56 * (1 - sm(u)));
    g.visible = fade < 0.99; if (fade > 0.4) um.snow.visible = false;
  });
  for (let i = 0; i < 3; i++) { const pt = thudPools[i]; pt(t, hundeT + 0.95 + i * 0.24, LX + [-1.0, 0.3, 1.0][i], 0.4, i % 2 ? 1 : -1, -2.15); }
  // hielo que sube desde el fondo
  const hb = lerp(-D - 0.01, -0.5, sm(lin(t, fondo2T - 0.25, sobrT + 0.3)));
  botClip.constant = hb; botIce.visible = t > fondo2T - 0.3; botEdge.visible = botIce.visible && hb > -D + 0.02;
  botEdge.position.y = hb; botEdge.scale.x = (2 * halfW(hb)) / 6.4;
  lakeWave.visible = thk < 0.02 || t > hundeT + 0.2; lakeWave.position.x = LX + ((t * 0.3) % 0.4);
  // moléculas del lago
  const mOn = t >= c[4] - 0.1 && t < hundeT + 0.3;
  [...warm, ...cold].forEach(m => { m.root.visible = mOn; });
  if (mOn) {
    warm.forEach((m, i) => {
      const u = sm(lin(t, pesT - 0.3 + i * 0.15, fondoT + 0.4 + i * 0.1)), [ex, ey] = WARM_END[i];
      const x = LX + lerp(-1.3 + i * 0.55, ex, u), y = lerp(-1.3 - 0.08 * i, ey, u) + 0.03 * Math.sin(t * 3 + i);
      const kk = 1 - prog(t, hundeT - 0.1, hundeT + 0.25);
      poseMol(m, x, y, 0.05, -PI / 2 - 0.9 + 0.2 * Math.sin(t * 2 + i), -PI / 2 + 0.9 + 0.2 * Math.sin(t * 2.3 + i), u < 0.95 ? 'effort' : 'happy', blinkAt(t, i * 0.7), 0, u < 0.95 ? -1 : 0);
      m.root.scale.setScalar(0.8 * kk * settle(t, fondoT + 0.4 + i * 0.1, 0.15));
      m.root.visible = mOn && kk > 0.01;
    });
    cold.forEach((m, i) => {
      const u = sm(lin(t, pesT - 0.1 + i * 0.12, friaT + 0.5 + i * 0.1)), [ex, ey] = COLD_END[i];
      const x = LX + lerp(-1.55 + i * 0.6, ex, u) + 0.015 * Math.sin(t * 38 + i), y = lerp(-0.78, ey, u);
      const join = sm(lin(t, arribaT - 0.1, arribaT + 0.4)), gone = prog(t, tapaT - 0.4, tapaT + 0.1);
      const a1 = lerp(-PI / 2 - 0.9, PI, join), a2 = lerp(-PI / 2 + 0.9, 0, join);
      poseMol(m, x, y + 0.2 * gone, 0.05, a1 + 0.2 * Math.sin(t * 3 + i), a2 - 0.2 * Math.sin(t * 3 + i), join > 0.5 ? 'happy' : 'cold', blinkAt(t, 1 + i), 0, 1);
      m.root.scale.setScalar(0.8 * (1 - gone)); m.root.visible = mOn && gone < 0.99;
    });
  }
  arrows.forEach((m, i) => {
    const kk = popIn(t, pesT + 0.1, c[5] - 0.2); m.visible = kk > 0.01 && t < c[5]; if (!m.visible) return;
    const src = i < 3 ? warm[i] : cold[i - 3], down = i < 3, bobA = 0.06 * Math.sin(t * 8 + i);
    m.position.set(src.root.position.x + 0.32, src.root.position.y + (down ? -0.05 : 0.05) + bobA, 0.3); m.rotation.set(0, t * 3, down ? PI : 0); m.scale.setScalar(kk);
  });
  // termómetro (el mercurio sube a la marca de 4 °C)
  const lev = 0.18 + 0.38 * back(lin(t, cuatroT - 0.3, cuatroT + 0.2)) + 0.015 * Math.sin(t * 5);
  merc.scale.set(1, lev, 1); merc.position.set(TH.x, TH.y + lev / 2, TH.z + 0.04);
  thSign.scale.setScalar(Math.max(0.001, back(lin(t, cuatroT - 0.1, cuatroT + 0.2))) * (1 + 0.04 * Math.sin(t * 6)));
  thSign.visible = t > cuatroT - 0.1 && t < hundeT + 1.2;
  // peces
  const squeeze = sm(lin(t, fondo2T, sobrT + 0.3));
  fishes.forEach((F, i) => {
    const on = t >= c[4] - 0.1; F.f.root.visible = on; if (!on) return;
    const ph = t * F.w + F.ph, amp = F.amp * (1 - 0.6 * squeeze);
    const aside = win(t, c[4] - 0.2, c[5] + 1.2, 0.5);
    let x = lerp(lerp(LX + F.cx + amp * Math.sin(ph), LX + 0.8 + 0.32 * Math.sin(ph), aside), LX + F.sx + 0.12 * Math.sin(ph), squeeze), y = F.y + 0.05 * Math.sin(t * 2 + i);
    y = lerp(y, -0.25 - 0.08 * (i % 2), squeeze);
    if (t > c[7] && t < fondo2T) y += 0.02 * Math.sin(t * 30 + i);
    const vx = Math.cos(ph), dir = Math.max(-1, Math.min(1, vx * 3));
    const mood = t < c[7] ? 'happy' : t < hundeT + 0.4 ? 'surprised' : 'worried';
    poseFish(F.f, t, x, y, F.z, dir, mood, i * 1.3, dir * 0.5);
    F.f.root.scale.setScalar(1 + 0.03 * Math.sin(t * 4 + i));
    glyphAt(fishQ[i], F.f.root.position, 0, 0.3, popIn(t, hundeT + 0.2 + i * 0.08, fondo2T + 0.2), 0);
    if (i < 3) glyphAt(hearts[i], F.f.root.position, 0.12, 0.3 + 0.1 * Math.sin(t * 3 + i), popIn(t, pecesT2 + 0.1 + i * 0.15, c[7]) * (0.85 + 0.15 * Math.sin(t * 7 + i)), 0);
  });
  sweat.forEach((m, i) => { const F = fishes[i], on = t > casiT - 0.2, u = (t * 1.6 + i / 4) % 1; m.visible = on; if (!on) return; const p = F.f.root.position; m.position.set(p.x + 0.12 + 0.12 * u, p.y + 0.2 + 0.2 * u - 0.4 * u * u, p.z + 0.1); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
  lakeBub.forEach((m, i) => { const F = fishes[i % 4], u = (t * 0.5 + i / 10) % 1, top = thk > 0.05 ? ICE_TOP - thk - 0.04 : -0.05; m.visible = t >= c[4]; if (!m.visible) return;
    const yb = Math.max(hb + 0.05, -2.2 + 0.25 * (i % 3)); m.position.set(LX + ((i * 0.53) % 1 - 0.5) * 4.2 + 0.05 * Math.sin(t * 4 + i), lerp(yb, top, u), 0.3); m.scale.setScalar(0.6 + 0.5 * u); });
  // nieve, humo de la cabaña
  snow.forEach(m => { const d = m.userData, u = (d.u + t * d.sp * 0.18) % 1; m.position.set(LX + d.x + 0.15 * Math.sin(t * 1.4 + d.k), 6.5 - u * 6.5, d.z); m.rotation.z = t * 0.7 + d.k; m.visible = t >= c[4] - 0.1; });
  chim.forEach((m, i) => { const u = (t * 0.45 + i / 5) % 1; m.position.set(LX + 2.24 + 0.4 * u + 0.08 * Math.sin(t * 2 + i), 1.6 + 1.2 * u, -3.2); m.scale.setScalar(0.6 + 1.5 * u); m.material.opacity = 0.9 * (1 - u); });
  // patinadores: entran desde la orilla cuando hay tapa, patinan, y antes de que se hunda saltan a la orilla
  skaters.forEach((S, i) => {
    const on = t > tapaT - 0.9 && t >= c[4]; S.t.root.visible = on; if (!on) return;
    let p;
    const enter0 = tapaT - 0.9 + i * 0.2, enter1 = tapaT - 0.05 + i * 0.2;
    if (t < enter1) p = { ...go(t, enter0, enter1, S.x0, SKB[i], 0.6) };
    else if (t < c[7] + 0.1) {
      const u = t - enter1, base = SKB[i], x = base + 0.75 * Math.sin(u * 1.3 + i), vx = Math.cos(u * 1.3 + i);
      p = { x, face: vx > 0 ? PI / 2 - 0.4 : -PI / 2 + 0.4, walk: 0.55, phase: u * 0.9, stride: 0.55, lean: 0.18, look: V(x, 1.4, 9), mood: 'happy',
        handL: V(x - 0.45, 1.05 + 0.05 * Math.sin(t * 3), 0.15), handR: V(x + 0.45, 1.05 - 0.05 * Math.sin(t * 3), 0.15), wL: 0.8, wR: 0.8 };
    } else {
      const xs = SKB[i] + 0.75 * Math.sin((c[7] + 0.1 - enter1) * 1.3 + i), xe = i ? LX + 3.35 : LX - 3.35;
      if (t < hundeT + 0.1) p = { ...go(t, c[7] + 0.1, hundeT + 0.1, xs, xe, 0.75), mood: 'worried' };
      else p = { x: xe, face: i ? -0.6 : 0.6, look: V(LX, -0.8, 1), y: hop(t, hundeT + 0.15, 0.2), squash: settle(t, hundeT + 0.5, 0.12) * breathe(t, i),
        handL: V(xe - 0.25, 1.65, 0.3), handR: V(xe + 0.25, 1.65, 0.3), wL: 0.8, wR: 0.8, ...moodAt(t, [[0, 'surprised'], [fondo2T, 'worried']]) };
    }
    p.y = (p.y || 0) + ICE_TOP; p.z = 0.17;
    S.t.pose(alive({ blink: blinkAt(t, S.k), ...p }, t, 3 + i * 1.6));
  });
}

k.run(t => {
  poseGirl(t); poseKitchen(t); poseMolecules(t); poseLake(t);
});
