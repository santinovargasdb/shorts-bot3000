// Episodio: las nutrias marinas duermen flotando boca arriba y se toman de las patas (o se enrollan en algas)
// para que la corriente no las separe (canal En 60 Segundos).
// Decorados: MAR AL ATARDECER EN CORTE (x de -9 a 9: arriba el mar con la costa y el sol, abajo el bosque de
// algas) y MAR HELADO (x = 40: témpanos, nieve, la lupa y el pelaje). Dos cortes: al ir al mar helado y al volver.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, clamp01, back, settle, hop, popIn, blinkAt, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { picture } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('nutrias', { sky: [[0, '#4f8fd6'], [0.42, '#f2b98a'], [0.6, '#ffd39a'], [1, '#ffe6bd']] });
const { scene, c, at, END, sfx, tag, BIG } = k;
const WL = 1.0, FLOOR = -3.2, ZF = 1.5, BX = 40;
const HULL = new THREE.MeshBasicMaterial({ color: 0x1e1428, side: THREE.BackSide });
const v3 = () => new THREE.Vector3();

// ---------- tiempos (todo cuelga de la voz) ----------
const flotT = at('flotando'), patasT = at('patas'), sepT = at('separarse');
const dormT = at('dormidas', c[1]), corrT = at('corriente', c[1]), adentroT = at('adentro', c[1]);
const agarT = at('agarran', c[2]), nutT = at('nutria', c[2]), enrT = at('enrollan', c[2]), algT = at('algas', c[2]), anclaT = at('ancla', c[2]);
const solasT = at('solas', c[3]), balsT = at('balsas', c[3]), grandeT = at('grande', c[3]), dosT = at('dos', c[3]);
const heladaT = at('helada', c[4]), grasaT = at('grasa', c[4]);
const abrigaT = at('abriga', c[5]), pelajeT = at('pelaje', c[5]), densoT = at('denso', c[5]), cientoT = at('ciento', c[5]), pelosT = at('pelos', c[5]), cmT = at('centimetro', c[5]);
const criasT = at('crias', c[6]), panzaT = at('panza', c[6]), mamaT = at('mama', c[6]), boteT = at('bote', c[6]);
const niT = at('ni', c[7]), pierdenT = at('pierden', c[7]);

// ---------- piezas ----------
function ell(parent, color, a, b, cc, x, y, z, w = 0.016) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), color.isMaterial ? color : flat(color));
  m.scale.set(a, b, cc); m.position.set(x, y, z); m.castShadow = true;
  if (w) { const h = new THREE.Mesh(m.geometry, HULL); h.scale.set((a + w) / a, (b + w) / b, (cc + w) / cc); m.add(h); }
  parent.add(m); return m;
}
const Yax = new THREE.Vector3(0, 1, 0), tq = v3();
/** Cilindro de alto 1 que se estira entre dos puntos (brazos, tallos). */
function rodMesh(parent, r, color, w = 0.016) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), color.isMaterial ? color : flat(color)); m.castShadow = true;
  if (w) m.add(new THREE.Mesh(new THREE.CylinderGeometry(r + w, r + w, 1, 12), HULL));
  parent.add(m); return m;
}
function setRod(m, a, b) { tq.subVectors(b, a); const d = tq.length() || 1e-4; m.position.copy(a).addScaledVector(tq, 0.5); m.scale.set(1, d, 1); m.quaternion.setFromUnitVectors(Yax, tq.multiplyScalar(1 / d)); }
function disc(r, color, z = 0) { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 24), color.isMaterial ? color : basic(color)); d.position.z = z; return d; }
function arcM(r, tube, up) { const a = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 18, PI), INK); if (!up) a.rotation.z = PI; const g = new THREE.Group(); g.add(a); return g; }
function canvasT(w, h, draw, rx = 1, ry = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// =====================================================================================
// LA NUTRIA: cuerpo boca arriba (eje x del cuerpo = de la cola a la cabeza), cabeza que mira a cámara
// =====================================================================================
const FUR = 0x6e4a31, FUR2 = 0x8d6244, FACE = 0xdcc9a6, PAD = 0xf5ecd9, DARK = 0x3d2618;
const WHITE = basic(0xffffff), NOSE = basic(0x24160f), MOUTHIN = basic(0x5a1a22);
function makeOtter({ s = 1, fur = FUR, belly = FUR2, face = FACE } = {}) {
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body); body.scale.setScalar(s);
  ell(body, fur, 0.6, 0.24, 0.29, 0, 0, 0, 0.024);                              // torso
  ell(body, belly, 0.42, 0.12, 0.21, 0.06, 0.15, 0, 0);                          // panza
  ell(body, face, 0.22, 0.18, 0.23, 0.46, 0.12, 0, 0.02);                        // pecho claro
  ell(body, fur, 0.3, 0.065, 0.13, -0.8, 0.04, 0, 0.018).rotation.z = 0.25;      // cola
  const feet = [-1, 1].map(sd => { const g = new THREE.Group(); g.position.set(-0.5, 0.12, sd * 0.15); body.add(g);
    ell(g, DARK, 0.075, 0.2, 0.11, 0, 0.17, 0, 0.016); for (const dz of [-0.06, 0, 0.06]) ell(g, DARK, 0.03, 0.05, 0.03, 0, 0.36, dz, 0.01); return g; });
  const head = new THREE.Group(); head.position.set(0.68, 0.26, 0); body.add(head);
  ell(head, face, 0.25, 0.23, 0.24, 0, 0, 0, 0.026);
  ell(head, fur, 0.2, 0.08, 0.16, 0, 0.17, -0.08, 0);                            // coronilla más oscura
  for (const sd of [-1, 1]) ell(head, fur, 0.055, 0.055, 0.035, sd * 0.19, 0.15, -0.04, 0.012);
  for (const sd of [-1, 1]) ell(head, PAD, 0.082, 0.066, 0.06, sd * 0.055, -0.075, 0.19, 0.012);
  ell(head, NOSE, 0.052, 0.034, 0.032, 0, -0.025, 0.245, 0.008);
  for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.009), INK); w.geometry.translate(sd * 0.085, 0, 0);
    w.position.set(sd * 0.1, -0.06 - j * 0.022, 0.252); w.rotation.z = sd * (0.18 - j * 0.16); head.add(w);
  }
  // ojos: redondo (blanco con pupila), cerrado durmiendo (arco hacia abajo) o contento (arco hacia arriba)
  const eyes = [-1, 1].map(sd => {
    const e = new THREE.Group(); e.position.set(sd * 0.092, 0.05, 0.228); e.rotation.y = sd * 0.38; e.rotation.x = -0.2; head.add(e);
    const round = new THREE.Group(); round.add(disc(0.054, 0x1e1428), disc(0.044, WHITE, 0.002)); const pupil = disc(0.024, 0x1e1428, 0.004); round.add(pupil);
    const shine = disc(0.008, WHITE, 0.006); shine.position.set(0.008, 0.01, 0.002); pupil.add(shine);
    const sleep = arcM(0.038, 0.011, false); sleep.position.y = 0.01; const joy = arcM(0.036, 0.011, true); joy.position.y = -0.012;
    e.add(round, sleep, joy); return { e, round, sleep, joy, pupil };
  });
  const mouth = {
    smile: arcM(0.03, 0.009, false), frown: arcM(0.026, 0.009, true),
    o: (() => { const g = new THREE.Group(); g.add(disc(0.03, 0x1e1428), disc(0.022, MOUTHIN, 0.002)); g.scale.y = 1.25; return g; })(),
  };
  for (const [n, m] of Object.entries(mouth)) { m.position.set(0, n === 'frown' ? -0.175 : -0.15, 0.215); m.rotation.x = 0.4; head.add(m); }
  const arms = [-1, 1].map(() => rodMesh(scene, 0.038 * s, fur, 0.014));
  const paws = [-1, 1].map(() => ell(scene, DARK, 0.068 * s, 0.06 * s, 0.068 * s, 0, 0, 0, 0.014));
  const SH = [V(0.4, 0.14, 0.17), V(0.4, 0.14, -0.17)], REST = [V(0.27, 0.33, 0.1), V(0.27, 0.33, -0.1)];
  const sw = v3(), pw = v3(), lk = v3();
  return {
    root, body, head, s,
    show(v) { root.visible = v; arms.forEach(m => { m.visible = v; }); paws.forEach(m => { m.visible = v; }); },
    /** punto del cuerpo (coordenadas locales del cuerpo) en el mundo */
    pt: (x, y, z, out = v3()) => body.localToWorld(out.set(x, y, z)),
    headPos: (out = v3()) => head.getWorldPosition(out),
    pose({ x, y, z, yaw = -PI / 2, roll = 0, pitch = 0.12, pawL = null, pawR = null, wL = 1, wR = 1, look = null, mood = 'sleep', blink = 0, kick = 0, t = 0, ph = 0 }) {
      root.position.set(x, y, z); root.rotation.set(0, yaw, 0);
      body.rotation.set(roll, 0, pitch); root.updateMatrixWorld(true);
      feet.forEach((f, i) => { f.rotation.z = 0.15 + (0.12 + 0.35 * kick) * Math.sin(t * (2.2 + 6 * kick) + ph + i * 1.7); });
      head.rotation.set(0, 0, 0);
      head.lookAt(look || lk.set(x * 0.6, y + 2.2, z + 8));
      head.rotateZ(0.08 * Math.sin(t * 1.3 + ph)); head.updateMatrixWorld(true);
      [pawL, pawR].forEach((target, i) => {
        body.localToWorld(sw.copy(SH[i])); body.localToWorld(pw.copy(REST[i]));
        pw.y += 0.02 * Math.sin(t * 2.4 + ph + i);
        if (target) pw.lerp(target, clamp01(i ? wR : wL));
        setRod(arms[i], sw, pw); paws[i].position.copy(pw);
      });
      const round = mood === 'awake' || mood === 'surprised' || mood === 'cold';
      eyes.forEach(o => {
        o.round.visible = round; o.sleep.visible = mood === 'sleep'; o.joy.visible = mood === 'happy';
        const es = mood === 'surprised' ? 1.25 : 1; o.round.scale.set(es, es * Math.max(1 - 0.92 * blink, 0.08), 1);
        o.pupil.position.set(0.006 * Math.sin(t * 0.9 + ph), 0.004 * Math.sin(t * 1.3 + ph), 0.004);
      });
      mouth.smile.visible = mood === 'sleep' || mood === 'awake' || mood === 'happy'; mouth.smile.scale.setScalar(mood === 'happy' ? 1.3 : 1);
      mouth.o.visible = mood === 'surprised'; mouth.frown.visible = mood === 'cold';
    },
  };
}

// =====================================================================================
// MAR EN CORTE (agua, superficie, fondo, algas)
// =====================================================================================
/** Tira de vértices con el borde de arriba ondulado (el frente del agua visto de costado). */
function strip(color, opacity, z, x0, x1, n, order) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array((n + 1) * 6); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const idx = []; for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = order; m.frustumCulled = false; scene.add(m);
  return (top, bot) => { for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); pos.set([x, top(x), z, x, bot(x), z], i * 6); } geo.attributes.position.needsUpdate = true; };
}
const wave = (x, t) => WL + 0.045 * Math.sin(x * 1.7 + t * 2.1) + 0.025 * Math.sin(x * 3.9 - t * 2.7);
const slope = (x, t) => 0.045 * 1.7 * Math.cos(x * 1.7 + t * 2.1) + 0.025 * 3.9 * Math.cos(x * 3.9 - t * 2.7);
const fronts = [];
function sea(cx, { top = '#5fb4d6', deep = ['#4fa7cf', '#2a76a6', '#174a78'], tint = 0x2b8fc7, far = 22, sand = '#d9c48e' } = {}) {
  // fondo del agua (pared del fondo) con rayas de luz
  const wallTex = canvasT(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); deep.forEach((col, i) => gr.addColorStop(i / (deep.length - 1), col)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(cx + 3); g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const x = r() * w; g.lineWidth = 14 + r() * 20; g.beginPath(); g.moveTo(x, -10); g.lineTo(x - 90, h + 10); g.stroke(); }
  }, 4, 1);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(26, WL - FLOOR + 0.6), new THREE.MeshBasicMaterial({ map: wallTex })); m.position.set(cx, (WL + FLOOR) / 2 - 0.3, -7); scene.add(m); }
  const sandTex = canvasT(512, 512, (g, w, h) => { g.fillStyle = sand; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let i = 0; i < 800; i++) { g.fillStyle = r() < 0.5 ? 'rgba(140,110,60,0.35)' : 'rgba(255,250,220,0.45)'; g.fillRect(r() * w, r() * h, 3 + r() * 4, 3 + r() * 4); } }, 8, 3);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), new THREE.MeshLambertMaterial({ map: sandTex, color: 0x9fb8c8 })); m.rotation.x = -PI / 2; m.position.set(cx, FLOOR, -2.5); scene.add(m); }
  // superficie vista desde arriba (hasta el horizonte), con ondas que corren
  const topTex = canvasT(256, 256, (g, w, h) => { g.fillStyle = top; g.fillRect(0, 0, w, h); const r = rng(cx + 2); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 5;
    for (let i = 0; i < 24; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 18, y - 8, x + 40, y); g.stroke(); } }, 16, 10);
  const len = far + ZF;
  const topM = new THREE.Mesh(new THREE.PlaneGeometry(40, len), new THREE.MeshBasicMaterial({ map: topTex, transparent: true, opacity: 0.94, depthWrite: true }));
  topM.rotation.x = -PI / 2; topM.position.set(cx, WL - 0.03, ZF - len / 2); scene.add(topM);
  const f = { cx, topTex, tint: strip(tint, 0.42, ZF, cx - 10, cx + 10, 200, 2), hi: strip(0xd9f6ff, 0.9, ZF + 0.01, cx - 10, cx + 10, 200, 3), line: strip(0x1e1428, 1, ZF + 0.02, cx - 10, cx + 10, 200, 4) };
  fronts.push(f); return f;
}
sea(0); sea(BX, { top: '#7fb6cf', deep: ['#5f9fc2', '#30668f', '#173b5e'], tint: 0x3a7fb0, far: 16, sand: '#c8c4b4' });

// --- bosque de algas (kelp): tallos en cadena que se mecen, hojas, flotadores y frondas sobre la superficie ---
const kelps = [], KELP = [0x8a7a2a, 0x7d8a33, 0x9a7f2e];
function kelp(x, z, seed, { lean = 0 } = {}) {
  const r = rng(seed), root = new THREE.Group(); root.position.set(x, FLOOR, z); scene.add(root);
  const n = 7, h = (WL - FLOOR - 0.05) / n, segs = []; let p = root;
  ell(root, 0x6b5a2a, 0.12, 0.06, 0.12, 0, 0.02, 0, 0.014);                     // agarre en la roca
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); g.position.y = i ? h : 0; p.add(g);
    ell(g, 0x6f6422, 0.022, h * 0.55, 0.022, 0, h / 2, 0, 0.01);
    const sd = i % 2 ? 1 : -1, col = KELP[(i + seed) % 3];
    const bl = ell(g, col, 0.06, 0.24 + r() * 0.08, 0.014, sd * 0.13, h * 0.55, 0, 0.011); bl.rotation.z = -sd * 0.75;
    if (i > 2) ell(g, 0xb39a3a, 0.03, 0.03, 0.03, sd * 0.03, h * 0.35, 0, 0.008);
    segs.push(g); p = g;
  }
  ell(p, 0xb39a3a, 0.055, 0.055, 0.055, 0, h, 0, 0.012);
  kelps.push({ segs, ph: r() * 6, lean }); return root;
}
for (const [x, z, s] of [[-7.5, -1.5, 1], [-6, -3, 2], [-4.8, -0.6, 3], [-3.6, -2.4, 4], [-2.2, -1.2, 5], [-1.2, -3.4, 6], [0.4, -2.0, 7], [1.4, -0.9, 8], [3.2, -2.9, 10], [4.4, -1.2, 11], [5.6, -2.5, 12], [6.8, -1.0, 13], [-5.4, -4.6, 14], [2.4, -4.6, 15], [-0.4, -5.2, 16], [7.6, -3.6, 17]]) kelp(x, z, s);
for (const [x, z, s] of [[BX - 3.4, -2.2, 21], [BX - 1.6, -3.6, 22], [BX + 2.2, -2.6, 23], [BX + 3.6, -1.2, 24]]) kelp(x, z, s);
// frondas que flotan en la superficie (el "colchón" de algas donde duermen)
const fronds = [];
{ const r = rng(41);
  for (let i = 0; i < 46; i++) {
    const x = lerp(-8, 8, r()), z = lerp(-6.5, 1.1, r());
    if (Math.abs(x) < 1.1 && z > -0.8) continue;                                  // que no tapen a las nutrias del gancho
    const m = ell(scene, KELP[i % 3], 0.32 + r() * 0.3, 0.025, 0.07 + r() * 0.05, x, WL, z, 0.012); m.rotation.y = r() * PI; fronds.push({ m, x, z, ph: r() * 6 });
  } }

// --- vida bajo el agua: peces, burbujas, estrellas en el fondo ---
function makeFish(color) {
  const g = new THREE.Group(); scene.add(g);
  ell(g, color, 0.16, 0.08, 0.05, 0, 0, 0, 0.012);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.13, 3), flat(color)); outlined(tail, 0.01); tail.rotation.z = PI / 2; tail.position.x = -0.19; g.add(tail);
  const e = disc(0.022, WHITE, 0.052); e.position.set(0.09, 0.02, 0.052); g.add(e); const pp = disc(0.011, 0x1e1428, 0.054); pp.position.set(0.095, 0.02, 0.054); g.add(pp);
  return { g, tail };
}
const school = [];
{ const cols = [0xf2a33a, 0xf06a5a, 0xffd23a, 0x7fd0c8];
  for (let i = 0; i < 9; i++) school.push({ f: makeFish(cols[i % 4]), cx: i < 6 ? 0 : BX, y: lerp(-1.6, 0.4, (i * 0.37) % 1), z: lerp(-2.5, 0.9, (i * 0.61) % 1), sp: 0.5 + (i % 3) * 0.2, off: i * 2.3, dir: i % 2 ? 1 : -1 }); }
const bubbles = Array.from({ length: 26 }, (_, i) => { const m = ell(scene, new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.8 }), 0.035, 0.035, 0.035, 0, 0, 0, 0.008);
  return { m, x0: (i < 18 ? 0 : BX) + lerp(-6, 6, (i * 0.47) % 1), z: lerp(-2.5, 1.0, (i * 0.29) % 1), sp: 0.35 + (i % 4) * 0.12, ph: i * 0.77 }; });
{ const star = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = PI / 2 + i * PI / 5, rr = i % 2 ? 0.07 : 0.17; i ? star.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : star.moveTo(rr * Math.cos(a), rr * Math.sin(a)); }
  for (const [x, z, col] of [[-2.6, 0.6, 0xf06a5a], [1.8, 0.2, 0xf2a33a], [BX + 1, 0.4, 0xf06a5a]]) { const m = outlined(new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), flat(col)), 0.012); m.rotation.x = -PI / 2; m.position.set(x, FLOOR + 0.02, z); scene.add(m); }
  const r = rng(5); for (let i = 0; i < 12; i++) { const s = 0.15 + r() * 0.2; ell(scene, [0x8d8a9e, 0x7d7b8f, 0x9f9a8a][i % 3], s * 1.5, s, s, lerp(-7, 7, r()), FLOOR + s * 0.4, lerp(-3.5, 1, r()), 0.018); } }

// --- arriba: costa lejana, sol que baja, nubes, gaviotas ---
const SUNX = -1.8;
const sun = new THREE.Group(); scene.add(sun);
{ for (const [r, col, op] of [[5.2, 0xffe2a0, 0.18], [3.6, 0xffd27a, 0.3], [2.3, 0xfff0b8, 1]]) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, depthWrite: false })); m.position.z = (r < 3 ? 0.02 : 0); sun.add(m); } }
const glint = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 22), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
glint.rotation.x = -PI / 2; glint.position.set(SUNX, WL - 0.01, -10.5); scene.add(glint);
const glints = Array.from({ length: 14 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })); m.rotation.x = -PI / 2; scene.add(m); return { m, z: -2 - i * 1.3, ph: i * 1.9 }; });
{ // costa: lomas en capas con cipreses, y un faro sobre las rocas
  for (const [dx, r, col, z] of [[-9, 6, 0x7f9d93, -21.5], [-1, 5, 0x6f9184, -21.4], [7, 7, 0x86a59a, -21.6], [13, 5, 0x6f9184, -21.3]]) { const h = new THREE.Mesh(new THREE.CircleGeometry(r, 40), basic(col)); h.scale.y = 0.32; h.position.set(dx, WL, z); scene.add(h); }
  for (const [x, z, s] of [[-8.5, -21, 1.1], [-6.8, -20.9, 0.9], [5.6, -21, 1.2], [7.8, -21, 1], [9.4, -20.9, 0.9]]) { const g = k.tree(x, z, { pine: true, h: 2.2 * s, leaf: 0x3f6f58 }); g.position.y = WL + 0.9; }
  const lh = new THREE.Group(); lh.position.set(4.2, WL + 1.0, -20.5); scene.add(lh);
  block(lh, 0xf4efe6, -0.25, 0.25, 0, 1.9, 0.25, -0.25, 0.03); block(lh, 0xc8443a, -0.27, 0.27, 0.6, 0.95, 0.27, -0.27, 0.025); block(lh, 0xc8443a, -0.3, 0.3, 1.9, 2.3, 0.3, -0.3, 0.03);
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.6 })); lamp.position.set(0, 2.1, 0.32); lh.add(lamp); }
for (const [x, y, s] of [[-6, 7.5, 1.6], [-1, 9.2, 1.3], [4, 8.0, 1.7], [8.5, 9.6, 1.2], [-9.5, 9.8, 1.2]]) k.cloud(x, y, -19, s);
k.birds([[0, 4.6, 0], [0, 5.3, 4], [0, 4.2, 8.5], [-2, 5.8, 11], [BX, 4.4, 2], [BX, 5.2, 7]], -6);

// --- mar helado (x = BX): fondo de montañas nevadas, témpanos, nieve ---
picture(scene, 34, 15, BX, WL + 5.0, -16.5, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6f97c4'); gr.addColorStop(0.65, '#c6dcef'); gr.addColorStop(1, '#eaf3fa'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const r = rng(77);
  for (const [col, base, amp] of [['#b7cbe0', 0.74, 0.16], ['#9db6cf', 0.84, 0.1]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, H); let x = 0; const peaks = []; while (x < W) { const pk = 90 + r() * 120, py = H * (base - amp * (0.5 + r() * 0.5)); g.lineTo(x + pk / 2, py); g.lineTo(x + pk, H * base); peaks.push([x + pk / 2, py, pk]); x += pk; } g.lineTo(W, H); g.fill();
    g.fillStyle = '#ffffff'; for (const [px, py, pk] of peaks) { const d = (H * base - py) * 0.3; g.beginPath(); g.moveTo(px, py); g.lineTo(px - pk * 0.15, py + d); g.lineTo(px, py + d * 0.7); g.lineTo(px + pk * 0.15, py + d); g.fill(); } }
  g.fillStyle = '#ffffff'; for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(r() * W, r() * H * 0.4, 12 + r() * 20, 5 + r() * 6, 0, 0, 7); g.fill(); }
}, 1024);
const floes = [];
for (const [x, z, w, d, h] of [[BX + 1.9, -0.7, 0.9, 0.6, 0.22], [BX - 2.4, -1.4, 1.2, 0.8, 0.3], [BX + 3.4, -3.5, 1.8, 1.0, 0.5], [BX - 3.8, -4.2, 2.2, 1.2, 0.8], [BX - 1.2, -6.5, 2.2, 1.2, 0.8]]) {
  const g = new THREE.Group(); g.position.set(x, WL, z); scene.add(g);
  if (h < 0.4) { block(g, 0xdff1fa, -w / 2, w / 2, -0.15, h, d / 2, -d / 2, 0.022); block(g, 0xffffff, -w / 2 + 0.06, w / 2 - 0.12, h, h + 0.04, d / 2 - 0.05, -d / 2 + 0.1, 0.012); }
  else for (const [dx, sc, hh] of [[0, 1, 1], [-w * 0.32, 0.6, 0.65], [w * 0.3, 0.5, 0.5]]) {          // iceberg de picos
    const m = outlined(new THREE.Mesh(new THREE.ConeGeometry(w * 0.4 * sc, h * 1.8 * hh, 5), flat(0xe4f3fb)), 0.03); m.position.set(dx, h * 0.9 * hh - 0.2, 0); m.rotation.y = dx; g.add(m);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.14 * sc, h * 0.6 * hh, 5), flat(0xffffff)); cap.position.set(dx, h * 1.5 * hh - 0.2, 0.01); cap.rotation.y = dx; g.add(cap);
  }
  floes.push({ g, ph: x * 1.7 });
}
// termómetro sobre el témpano chico
const thermo = new THREE.Group(); scene.add(thermo);
{ block(thermo, 0xffffff, -0.09, 0.09, 0, 0.8, 0.035, -0.035, 0.018);
  for (let i = 0; i < 6; i++) block(thermo, 0x1e1428, 0.015, 0.07, 0.18 + i * 0.1, 0.19 + i * 0.1, 0.045, 0.04, 0.0);
  ell(thermo, 0xd63c3c, 0.07, 0.07, 0.05, -0.02, 0.1, 0.03, 0.012); }
const merc = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 1), basic(0xd63c3c)); merc.geometry.translate(0, 0.5, 0); merc.position.set(-0.02, 0.12, 0.05); thermo.add(merc);
const snow = Array.from({ length: 60 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.025 + (i % 3) * 0.01, 8, 6), basic(0xffffff)); scene.add(m); return { m, x0: BX + lerp(-3.2, 3.6, (i * 0.618) % 1), z: lerp(-3, 1.2, (i * 0.37) % 1), sp: 0.3 + (i % 5) * 0.06, ph: i * 0.53 }; });

// =====================================================================================
// LAS NUTRIAS DE LA HISTORIA
// =====================================================================================
const A = makeOtter(), B = makeOtter({ fur: 0x7a5236, face: 0xe2d2b4 });           // las del gancho, de la mano
const D = makeOtter({ fur: 0x664430 });                                            // la que se va con la corriente
const C = makeOtter({ fur: 0x735034, face: 0xd6c09c });                            // la enrollada en algas
const E = makeOtter({ fur: 0x6e4a31 });                                            // la del agua helada
const M = makeOtter({ fur: 0x6a4630, face: 0xe0cfb0 });                            // la mamá
const P = makeOtter({ s: 0.46, fur: 0x9a7350, belly: 0xb08a64, face: 0xeadbc0 });  // la cría
// la balsa: aparecen desde abajo del agua cuando la cámara se abre
const RAFT = [
  [-2.7, -1.7, -0.3, 1], [-1.75, -2.0, 0.2, 0], [-0.9, -3.4, -0.2, 1], [0.05, -3.5, 0.25, 0], [1.3, -2.1, -0.35, 1], [2.25, -2.2, 0.15, 0],
  [3.4, -1.4, 0.3, -1], [-3.4, -3.6, 0.1, -1], [1.7, -4.6, -0.2, 1], [2.75, -4.8, 0.2, 0], [-2.0, -5.4, 0.3, -1], [-0.2, -6.2, -0.1, -1], [3.9, -3.4, -0.3, -1], [-4.2, -5.0, 0.35, -1],
].map(([x, z, dy, pair], i) => ({ o: makeOtter({ fur: [0x6e4a31, 0x7a5236, 0x664430, 0x735034][i % 4], face: [0xdcc9a6, 0xe2d2b4, 0xd6c09c][i % 3] }), x, z, yaw: -PI / 2 + dy, pair, t0: solasT + 0.15 + i * 0.13, ph: i * 1.3 }));
// algas enrolladas en la nutria C, con el tallo que baja hasta el fondo (el ancla)
const wrap = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 26), flat(KELP[i])); outlined(m, 0.015); C.body.add(m); m.scale.set(0.27, 0.3, 1); m.position.set(-0.1 + i * 0.32, 0, 0); m.rotation.y = PI / 2; return m; });
const tether = rodMesh(scene, 0.03, 0x7d6a26, 0.014);
const tetherLeaves = [0, 1, 2, 3].map(i => { const m = ell(scene, KELP[i % 3], 0.05, 0.2, 0.014, 0, 0, 0, 0.01); return m; });
const ANCHOR = V(2.85, FLOOR + 0.05, -0.5);
ell(scene, 0x8d8a9e, 0.3, 0.18, 0.25, ANCHOR.x, FLOOR + 0.1, ANCHOR.z, 0.02);

// ---------- signos, corriente, salpicones ----------
const zzz = Array.from({ length: 12 }, () => k.glyph('z', '#ffffff', 0.3));
const bang = k.glyph('!', '#ffd23a', 0.5), qm = k.glyph('?', '#ffd23a', 0.5);
const hearts = [0, 1, 2].map(() => k.glyph('♥', '#ff6b8a', 0.3));
const sparks = [0, 1, 2, 3].map(() => k.glyph('✦', '#fff1a8', 0.32));
const xMark = k.glyph('X', '#e8423a', 0.6);
const flow = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.035), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })); m.rotation.x = -PI / 2; m.renderOrder = 6; scene.add(m); return m; });
const flowFront = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.03), new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, depthWrite: false })); m.renderOrder = 6; scene.add(m); return m; });
const rings = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 30), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -PI / 2; m.visible = false; m.renderOrder = 5; scene.add(m); return m; });
const drops = Array.from({ length: 28 }, () => { const m = ell(scene, basic(0xe8fbff), 0.03, 0.04, 0.03, 0, 0, 0, 0.008); m.visible = false; return m; });
const breath = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
const shiverL = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.022), INK); m.visible = false; m.renderOrder = 8; scene.add(m); return m; });

// cartel "GRASA" (que se tacha)
const fat = picture(scene, 0.62, 0.7, 0, 0, 0, (g, W, H) => {
  g.fillStyle = '#ffffff'; g.strokeStyle = '#1e1428'; g.lineWidth = 12; g.beginPath(); g.roundRect(8, 8, W - 16, H - 16, 28); g.fill(); g.stroke();
  g.fillStyle = '#ffd96a'; g.beginPath(); g.moveTo(W / 2, H * 0.12); g.bezierCurveTo(W * 0.85, H * 0.42, W * 0.78, H * 0.66, W / 2, H * 0.66); g.bezierCurveTo(W * 0.22, H * 0.66, W * 0.15, H * 0.42, W / 2, H * 0.12); g.fill(); g.lineWidth = 9; g.stroke();
  g.fillStyle = '#fff6cf'; g.beginPath(); g.ellipse(W * 0.42, H * 0.45, 12, 20, -0.4, 0, 7); g.fill();
  g.fillStyle = '#1e1428'; g.font = '800 46px Montserrat'; g.textAlign = 'center'; g.fillText('GRASA', W / 2, H * 0.88);
});
fat.visible = false;

// lupa
const lupa = new THREE.Group(); scene.add(lupa);
{ const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 36), flat(0x3a3f4d)); outlined(ring, 0.014); lupa.add(ring);
  lupa.add(new THREE.Mesh(new THREE.CircleGeometry(0.29, 32), new THREE.MeshBasicMaterial({ color: 0xcff0ff, transparent: true, opacity: 0.3, depthWrite: false })));
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); sh.position.set(-0.12, 0.08, 0.01); sh.rotation.z = -0.6; lupa.add(sh);
  const hd = rodMesh(lupa, 0.045, 0x7a4b2a, 0.014); setRod(hd, V(0.22, -0.22, 0), V(0.5, -0.5, 0)); }
// el pelaje agrandado: un círculo con miles de pelos que se mecen (aparecen de a poco al contar)
const FX = BX + 1.75, FY = WL + 1.55, FZ = 0.25, FR = 0.95;
const furPanel = new THREE.Group(); furPanel.position.set(FX, FY, FZ); scene.add(furPanel);
{ furPanel.add(new THREE.Mesh(new THREE.CircleGeometry(FR, 48), basic(0x4a2e1e)));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(FR + 0.04, 0.06, 10, 60), flat(0xf4efe6)); outlined(rim, 0.016); furPanel.add(rim); }
const NH = 1700, hairGeo = new THREE.PlaneGeometry(0.012, 0.17); hairGeo.translate(0, 0.085, 0);
const hairs = new THREE.InstancedMesh(hairGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), NH); hairs.position.z = 0.01; furPanel.add(hairs);
const hairData = [];
{ const r = rng(99), cols = [0x8a5c3c, 0xb0835a, 0x6b4330, 0xc9a27a, 0x9a6a46].map(h => new THREE.Color(h));
  for (let i = 0; i < NH; i++) { const rr = Math.sqrt(r()) * (FR - 0.12), a = r() * 2 * PI; hairData.push({ x: rr * Math.cos(a), y: rr * Math.sin(a) - 0.06, a0: (r() - 0.5) * 0.6, ph: r() * 6, z: r() * 0.004 });
    hairs.setColorAt(i, cols[i % 5]); } }
const hm = new THREE.Matrix4(), hq = new THREE.Quaternion(), hp = v3(), hs = V(1, 1, 1), Zax = V(0, 0, 1);
// cuadradito de 1 cm² en el medio del círculo
const sq = new THREE.Group(); sq.position.z = 0.03; furPanel.add(sq);
for (const [w, h, x, y] of [[0.5, 0.035, 0, 0.25], [0.5, 0.035, 0, -0.25], [0.035, 0.535, 0.25, 0], [0.035, 0.535, -0.25, 0]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(0xffffff)); m.position.set(x, y, 0); sq.add(m); }

// =====================================================================================
// POSES
// =====================================================================================
const CAMT = V(0, 3.0, 9);
const fw = v3(), q1 = v3(), q2 = v3(), hA = v3(), hB = v3(), hC = v3(), hD = v3(), hE = v3(), hM = v3(), hP = v3(), mid = v3();
const lookCam = (x, y, z, out) => out.set(x * 0.5, y + 2.6, z + 8);
const zz = (t, i, pos, on, k0) => { const g = zzz[i], u = ((t * 0.55 + k0) % 1); k.glyphAt(g, pos, 0.15 + 0.25 * u, 0.3 + 0.5 * u, on ? Math.sin(PI * u) * (0.7 + 0.3 * u) : 0, 0.3 * Math.sin(t * 2 + k0)); };
const float = (x, t) => wave(x, t) - 0.05;

function poseHook(t) {
  // A y B: tomadas de la pata; en la frase 3 la corriente las estira y no se sueltan
  const pull = win(t, agarT - 0.2, enrT - 0.1, 0.5) * (0.75 + 0.25 * Math.sin(t * 6));
  const xa = -0.45 - 0.3 * pull, xb = 0.45 + 0.3 * pull;
  const ya = float(xa, t), yb = float(xb, t);
  mid.set((xa + xb) / 2, WL + 0.34 + 0.03 * Math.sin(t * 2.2), 0.5);
  const hold = t < 1.0 ? 0 : back(lin(t, 1.0, 1.5));                     // al principio se buscan las patas
  const wake = win(t, agarT - 0.1, enrT, 0.2);
  A.pose({ t, x: xa, y: ya, z: 0, yaw: -PI / 2 - 0.15 - 0.1 * pull, roll: 0.5 * slope(xa, t) - 0.1, pawR: mid, wR: hold, look: lookCam(xa, ya, 0, hA), mood: wake > 0.5 ? 'surprised' : 'sleep', blink: blinkAt(t, 0.3), kick: pull, ph: 0 });
  B.pose({ t, x: xb, y: yb, z: 0, yaw: -PI / 2 + 0.15 + 0.1 * pull, roll: 0.5 * slope(xb, t) + 0.1, pawL: mid, wL: hold, look: lookCam(xb, yb, 0, hB), mood: wake > 0.5 ? 'awake' : 'sleep', blink: blinkAt(t, 1.4), kick: pull, ph: 2 });
  A.headPos(hA); B.headPos(hB);
  const asleep = !(wake > 0.5);
  zz(t, 0, hA, asleep, 0); zz(t, 1, hA, asleep, 0.5); zz(t, 2, hB, asleep, 0.25);
  hearts.forEach((m, i) => { const u = ((t * 0.5 + i / 3) % 1); k.glyphAt(m, mid, (i - 1) * 0.15, 0.15 + 0.6 * u, (t > patasT - 0.2 && t < c[1] + 0.2) || (t > nutT && t < enrT) ? Math.sin(PI * u) : 0, 0.2 * Math.sin(t * 3 + i)); });
}
function poseDrift(t) {
  // D duerme sola y la corriente se la lleva mar adentro
  const on = t < c[2] + 0.5; D.show(on); if (!on) { zzz[3].visible = zzz[4].visible = false; return; }
  const u = prog(t, dormT - 0.1, c[2] + 0.4);
  const x = lerp(-2.9, -4.7, u), z = lerp(0.1, -2.0, u), y = float(x, t);
  const scared = t > adentroT - 0.15;
  D.pose({ t, x, y, z, yaw: -PI / 2 + 0.35 + 0.5 * u + 0.08 * Math.sin(t * 1.5), roll: 0.5 * slope(x, t), look: lookCam(x, y, z, hD), mood: scared ? 'surprised' : 'sleep', blink: blinkAt(t, 0.9), kick: scared ? 1 : 0, ph: 4 });
  D.headPos(hD);
  zz(t, 3, hD, !scared, 0.1); zz(t, 4, hD, !scared, 0.6);
  k.glyphAt(bang, hD, 0, 0.45, popIn(t, adentroT - 0.1, c[2] + 0.3), 0.1 * Math.sin(t * 8));
}
function poseKelp(t) {
  const x = 2.6, z = -0.2, y = float(x, t);
  C.pose({ t, x, y, z, yaw: -PI / 2 + 0.3, roll: 0.5 * slope(x, t), look: lookCam(x, y, z, hC), mood: 'sleep', ph: 6 });
  C.headPos(hC); zz(t, 5, hC, true, 0.35);
  const top = C.pt(0.1, -0.2, -0.25, q1);
  const sway = 0.15 * Math.sin(t * 1.1);
  setRod(tether, top, q2.set(ANCHOR.x + sway * 0.3, ANCHOR.y, ANCHOR.z));
  tetherLeaves.forEach((m, i) => { const f = (i + 1) / 5; m.position.lerpVectors(top, ANCHOR, f); m.position.x += (i % 2 ? 0.13 : -0.13) + sway * (1 - f); m.rotation.z = (i % 2 ? -0.8 : 0.8) + 0.15 * Math.sin(t * 1.4 + i); });
}
function poseRaft(t) {
  RAFT.forEach((r, i) => {
    const u = lin(t, r.t0, r.t0 + 0.55), vis = t > r.t0;
    r.o.show(vis); if (!vis) return;
    const y = lerp(WL - 1.1, float(r.x, t), back(u));
    let pawL = null, pawR = null;
    if (r.pair === 1) { const n = RAFT[i + 1]; r.midP = r.midP || v3(); r.midP.set((r.x + n.x) / 2, WL + 0.32 + 0.03 * Math.sin(t * 2 + i), (r.z + n.z) / 2 + 0.45); pawR = r.midP; }
    if (r.pair === 0) pawL = RAFT[i - 1].midP;
    const hold = back(lin(t, r.t0 + 0.6, r.t0 + 1.0));
    r.o.pose({ t, x: r.x, y, z: r.z, yaw: r.yaw + 0.06 * Math.sin(t * 0.8 + r.ph), roll: 0.5 * slope(r.x, t), pawL, pawR, wL: hold, wR: hold, look: r.o.root.position.clone().add(V(0, 2.6, 9)), mood: 'sleep', ph: r.ph });
    // salpicón al salir
    const rg = rings[i], ru = (t - r.t0 - 0.15) / 0.8; rg.visible = ru > 0 && ru < 1; if (rg.visible) { rg.position.set(r.x, WL + 0.02, r.z); rg.scale.setScalar(0.3 + 0.9 * ru); rg.material.opacity = 0.9 * (1 - ru); }
    for (let j = 0; j < 2; j++) { const dm = drops[i * 2 + j], du = (t - r.t0 - 0.1) / 0.5; dm.visible = du > 0 && du < 1; if (dm.visible) dm.position.set(r.x + (j ? 0.25 : -0.25) * du, WL + 0.6 * du - 0.9 * du * du + 0.1, r.z + 0.2); }
  });
}
function poseCold(t) {
  const x = BX - 0.5, y = float(x, t);
  const cold = t < abrigaT - 0.1, shiv = cold ? 0.025 * Math.sin(t * 46) : 0;
  E.pose({ t, x: x + shiv, y, z: 0.1, yaw: -PI / 2 + 0.15, roll: 0.5 * slope(x, t) + (cold ? 0.04 * Math.sin(t * 40) : 0),
    pawL: E.pt(0.27, 0.3, -0.06, q1), pawR: E.pt(0.27, 0.3, 0.06, q2), wL: cold ? 1 : 0, wR: cold ? 1 : 0,              // se abraza
    look: hE.set(x + 0.2, y + 2.4, 8), mood: t < c[4] + 0.25 ? 'awake' : cold ? 'cold' : 'happy', blink: blinkAt(t, 0.2), ph: 1 });
  E.headPos(hE);
  breath.forEach((m, i) => { const u = ((t * 0.8 + i / 4) % 1); m.visible = cold && t > c[4]; if (!m.visible) return; m.position.set(hE.x + 0.08 + 0.3 * u, hE.y - 0.1 + 0.25 * u, hE.z + 0.35); m.scale.setScalar(0.5 + 1.4 * u); m.material.opacity = 0.75 * (1 - u); });
  shiverL.forEach((m, i) => { const sd = i % 2 ? 1 : -1; m.visible = cold && t > c[4] && Math.sin(t * 20 + i) > -0.3; if (!m.visible) return; m.position.set(hE.x + sd * (0.36 + 0.03 * Math.sin(t * 30)), hE.y + 0.08 - (i >> 1) * 0.12, hE.z + 0.2); m.rotation.z = sd * 0.3; });
  sparks.forEach((m, i) => { const kk = t > abrigaT ? popIn(t, abrigaT + i * 0.08, c[6]) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)) : 0; k.glyphAt(m, hE, [-0.5, 0.5, -0.4, 0.55][i], [0.2, 0.35, -0.25, -0.1][i], Math.max(kk, 0), t * 1.5 + i); });
  // cartel de grasa tachado
  const fk = popIn(t, c[4] + 1.1, abrigaT + 0.2);
  fat.visible = fk > 0.01; fat.scale.setScalar(Math.max(fk, 0.001)); fat.position.set(BX + 0.42, WL + 1.0 + 0.03 * Math.sin(t * 2.4), 0.5); fat.rotation.z = 0.06 * Math.sin(t * 1.7);
  k.glyphAt(xMark, fat.position, 0, 0, t > grasaT - 0.1 ? back(lin(t, grasaT - 0.1, grasaT + 0.15)) * (1 - prog(t, abrigaT, abrigaT + 0.2)) : 0, -0.1);
  // termómetro que baja
  const fl = floes[0].g.position; thermo.position.set(fl.x + 0.1, fl.y + 0.25, fl.z + 0.1); thermo.rotation.z = 0.04 * Math.sin(t * 1.3);
  merc.scale.y = lerp(0.55, 0.06, prog(t, heladaT - 0.2, heladaT + 0.6)) + 0.01 * Math.sin(t * 5);
  // lupa sobre el pelaje y el círculo agrandado
  const lu = prog(t, abrigaT - 0.15, abrigaT + 0.45);
  lupa.visible = t > abrigaT - 0.2 && t < c[6];
  lupa.position.set(lerp(BX + 1.3, BX - 0.15, lu) + 0.03 * Math.sin(t * 2), lerp(WL + 1.6, WL + 0.38, lu) + 0.03 * Math.sin(t * 2.6), 0.75); lupa.rotation.z = 0.1 * Math.sin(t * 1.4);
  const pk = back(lin(t, pelajeT - 0.1, pelajeT + 0.3));
  furPanel.visible = pk > 0.01 && t < c[6]; furPanel.scale.setScalar(Math.max(pk, 0.001)); furPanel.position.y = FY + 0.03 * Math.sin(t * 1.6);
  const shown = Math.floor(lerp(450, NH, prog(t, cientoT - 0.2, cmT + 0.3)));
  hairs.count = shown;
  for (let i = 0; i < shown; i++) { const d = hairData[i]; hp.set(d.x, d.y, d.z); hq.setFromAxisAngle(Zax, d.a0 + 0.22 * Math.sin(t * 2.2 + d.ph + d.x * 2)); hm.compose(hp, hq, hs); hairs.setMatrixAt(i, hm); }
  hairs.instanceMatrix.needsUpdate = true;
  sq.visible = t > cmT - 0.3; sq.scale.setScalar(back(lin(t, cmT - 0.3, cmT)));
}
function poseMom(t) {
  const on = t > c[6] - 0.05; M.show(on); P.show(on); if (!on) { zzz[6].visible = zzz[7].visible = false; return; }
  const x = -6.2, z = 0.8, y = float(x, t);
  const pupAt = M.pt(0.05, 0.36, 0, q1);
  M.pose({ t, x, y, z, yaw: -0.15, roll: 0.5 * slope(x, t), pawL: P.pt(0.2, 0.1, 0.2, q2), pawR: P.pt(0.2, 0.1, -0.2, fw), wL: 0.9, wR: 0.9, look: hM.set(x + 0.3, y + 2.6, 8), mood: t > panzaT ? 'happy' : 'awake', blink: blinkAt(t, 0.5), ph: 3 });
  // la cría arriba de la panza (se posa después de la mamá, con su panza ya ubicada)
  M.pt(0.05, 0.36, 0, pupAt);
  P.pose({ t, x: pupAt.x, y: pupAt.y + 0.06 + 0.012 * Math.sin(t * 2.6), z: pupAt.z, yaw: -0.15, roll: 0.05 * Math.sin(t * 1.8), pitch: 0.22, look: hP.set(x, y + 2.4, 8), mood: 'sleep', ph: 5, kick: 0.3 });
  // la mamá la abraza: vuelve a posar con la cría ya en su lugar
  M.pose({ t, x, y, z, yaw: -0.15, roll: 0.5 * slope(x, t), pawL: P.pt(0.2, 0.1, 0.2, q2), pawR: P.pt(0.2, 0.1, -0.2, fw), wL: 0.9, wR: 0.9, look: hM.set(x + 0.3, y + 2.6, 8), mood: t > panzaT ? 'happy' : 'awake', blink: blinkAt(t, 0.5), ph: 3 });
  M.headPos(hM); P.headPos(hP);
  zz(t, 6, hP, true, 0.2); zz(t, 7, hP, true, 0.7);
  if (t > mamaT - 0.1) k.glyphAt(hearts[0], hM, 0.35, 0.3 + 0.08 * Math.sin(t * 3), popIn(t, mamaT - 0.1, END + 1) * (0.9 + 0.1 * Math.sin(t * 6)), 0.15 * Math.sin(t * 2));
}

// =====================================================================================
// CÁMARA
// =====================================================================================
k.shots([
  { t: 0, pos: [0, 2.5, 6.6], look: [0, 1.15, 0] },
  { t: flotT, pos: [0, 2.25, 5.2], look: [0, 1.2, 0] },
  { t: patasT - 0.3, pos: [0, 2.2, 4.9], look: [0, 1.3, 0.35] },
  { t: sepT - 0.1, pos: [0.15, 2.4, 5.6], look: [0.15, 1.3, 0.3] },
  { t: c[1] + 0.3, pos: [-2.9, 2.2, 4.9], look: [-2.9, 1.1, 0], glide: true },
  { t: corrT - 0.1, pos: [-3.3, 2.5, 6.0], look: [-3.4, 1.05, -0.4] },
  { t: adentroT - 0.35, pos: [-4.0, 2.1, 3.9], look: [-4.1, 1.1, -1.3] },
  { t: agarT - 0.25, pos: [0, 2.2, 5.0], look: [0, 1.2, 0] },
  { t: nutT - 0.15, pos: [0, 2.45, 6.7], look: [0, 1.3, 0.3] },
  { t: enrT - 0.25, pos: [2.6, 2.1, 4.6], look: [2.6, 1.0, -0.2] },
  { t: algT + 0.3, pos: [2.6, 1.85, 3.6], look: [2.6, 1.05, -0.2] },
  { t: anclaT - 0.2, pos: [2.7, 0.0, 6.6], look: [2.75, -0.95, -0.3], glide: true },
  { t: c[3] + 0.05, pos: [0.4, 3.0, 8.6], look: [0.4, 1.2, -1.6] },
  { t: solasT + 0.5, pos: [0.3, 3.7, 10.4], look: [0.3, 1.1, -2.3] },
  { t: balsT - 0.2, pos: [0.3, 3.2, 8.2], look: [0.3, 1.2, -2.6] },
  { t: grandeT - 0.1, pos: [0.3, 4.8, 13.2], look: [0.3, 1.1, -3.0] },
  { t: dosT - 0.1, pos: [0.3, 4.2, 10.8], look: [0.3, 1.3, -3.0] },
  { t: c[4], pos: [BX + 0.1, 2.1, 5.0], look: [BX + 0.1, 1.25, 0], cut: true },
  { t: heladaT - 0.2, pos: [BX - 0.4, 1.85, 3.5], look: [BX - 0.4, 1.3, 0.2] },
  { t: grasaT - 0.5, pos: [BX, 2.0, 4.9], look: [BX, 1.45, 0.2] },
  { t: abrigaT - 0.1, pos: [BX - 0.3, 1.75, 3.2], look: [BX - 0.3, 1.35, 0.4] },
  { t: densoT, pos: [FX, FY, 3.9], look: [FX, FY, 0], glide: true },
  { t: cientoT - 0.1, pos: [FX, FY, 3.0], look: [FX, FY, 0] },
  { t: pelosT - 0.1, pos: [FX - 0.4, FY - 0.25, 4.8], look: [FX - 0.4, FY - 0.25, 0], glide: true },      // viaje en vez de salto: el salto contaba como corte
  { t: cmT + 0.25, pos: [BX + 1.15, 2.3, 7.6], look: [BX + 1.15, 1.9, 0] },
  { t: c[6], pos: [-6.0, 2.3, 5.0], look: [-6.0, 1.25, 0.8], cut: true },
  { t: panzaT - 0.2, pos: [-6.0, 2.15, 4.0], look: [-6.0, 1.35, 0.8] },
  { t: mamaT - 0.05, pos: [-6.2, 2.4, 5.0], look: [-6.2, 1.3, 0.8] },
  { t: boteT - 0.3, pos: [-5.8, 2.7, 6.4], look: [-5.8, 1.25, 0.6] },
  { t: c[7] + 0.05, pos: [-4.0, 3.2, 8.6], look: [-3.6, 1.2, -1.0] },
  { t: END, pos: [-2.8, 4.2, 11.5], look: [-2.4, 1.3, -2.0], glide: true },
], { move: 0.16 });

// =====================================================================================
// CARTELES
// =====================================================================================
tag({ text: 'Nutrias marinas', big: true, off: BIG, from: 0.15, to: patasT - 0.35 });
tag({ text: '¡De la mano!', big: true, off: BIG, from: patasT - 0.1, to: c[1] });
tag({ text: 'Corriente', at: () => q1.set(-2.2, WL + 0.05, 0.6), off: [180, -260], from: corrT - 0.1, to: adentroT - 0.2 });
tag({ text: 'Mar adentro', big: true, off: BIG, from: adentroT - 0.2, to: c[2] });
tag({ text: '¡No se suelta!', big: true, off: BIG, from: nutT - 0.2, to: enrT - 0.3 });
tag({ text: 'Algas', at: () => C.pt(-0.1, 0.25, 0.3, fw), off: [-260, -120], from: algT - 0.2, to: anclaT - 0.4 });
tag({ text: 'Como un ancla', big: true, off: BIG, from: anclaT - 0.15, to: c[3] });
tag({ text: 'Balsas', big: true, off: BIG, from: balsT - 0.1, to: dosT - 0.2 });
tag({ text: '+2.000 nutrias', big: true, off: BIG, from: dosT - 0.1, to: c[4] });
tag({ text: 'Agua helada', big: true, off: BIG, from: heladaT - 0.15, to: grasaT - 0.4 });
tag({ text: 'Sin grasa', big: true, off: BIG, from: grasaT - 0.1, to: c[5] });
tag({ text: 'Pelaje', at: () => E.pt(0.2, 0.3, 0.25, hD), off: [-220, -330], from: pelajeT, to: densoT + 0.25 });
tag({ text: 'El más denso', big: true, off: BIG, from: densoT, to: cientoT - 0.15 });
tag({ text: '150.000 pelos', big: true, off: BIG, from: cientoT - 0.1, to: c[6] });
tag({ text: 'En 1 cm²', at: () => q2.set(FX + 0.25, FY - 0.25, FZ + 0.05), off: [0, 300], from: cmT - 0.2, to: c[6] });
tag({ text: 'Cría', at: () => hP, off: [230, -300], from: criasT, to: boteT - 0.2 });
tag({ text: 'Mamá', at: () => hM, off: [-330, 260], from: mamaT - 0.1, to: boteT - 0.2 });
tag({ text: 'Un bote propio', big: true, off: BIG, from: boteT - 0.15, to: c[7] });
tag({ text: '¡Siempre juntas!', big: true, off: BIG, from: niT - 0.1, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'splash', 0.35); sfx(patasT, 'pop', 0.6);
sfx(corrT, 'riser', 0.35); sfx(adentroT - 0.1, 'pop', 0.7);
sfx(nutT - 0.1, 'thud', 0.5);
sfx(solasT + 0.2, 'splash', 0.7); sfx(solasT + 1.0, 'splash', 0.5);
sfx(dosT, 'riser_to', 1); sfx(dosT, 'boom', 0.45);
sfx(grasaT - 0.05, 'thud', 0.8);
sfx(abrigaT + 0.3, 'tap', 0.6);
sfx(cientoT, 'riser_to', 1); sfx(cientoT, 'boom', 0.45);
sfx(c[7] + 0.1, 'splash', 0.4);

// =====================================================================================
// CUADRO
// =====================================================================================
k.run(t => {
  for (const f of fronts) { const W = x => wave(x, t); f.tint(W, () => FLOOR - 0.6); f.hi(W, x => W(x) - 0.05); f.line(x => W(x) + 0.025, W); f.topTex.offset.set(t * 0.03, -t * 0.02); }
  kelps.forEach(kp => kp.segs.forEach((g, i) => { g.rotation.z = (0.035 + 0.01 * i) * Math.sin(t * 1.1 + kp.ph + i * 0.45) * (i ? 1 : 0.4); g.rotation.x = 0.02 * Math.sin(t * 0.9 + kp.ph + i); }));
  fronds.forEach(f => { f.m.position.y = wave(f.x, t) + 0.005; f.m.rotation.z = 0.5 * slope(f.x, t); f.m.rotation.x = 0.05 * Math.sin(t * 1.3 + f.ph); });
  school.forEach(s => { const span = 14, u = ((t * s.sp + s.off) % span), x = s.cx + (s.dir > 0 ? -7 + u : 7 - u); s.f.g.position.set(x, s.y + 0.1 * Math.sin(t * 1.4 + s.off), s.z); s.f.g.rotation.y = s.dir > 0 ? 0 : PI; s.f.tail.rotation.y = 0.5 * Math.sin(t * 9 + s.off); });
  bubbles.forEach(b => { const span = WL - FLOOR - 0.15, y = (t * b.sp + b.ph) % span; b.m.position.set(b.x0 + 0.06 * Math.sin(t * 3 + b.ph), FLOOR + 0.1 + y, b.z); b.m.scale.setScalar(0.03 + 0.02 * y / span); });
  snow.forEach(s => { const y = 5 - ((t * s.sp + s.ph) % 4.6); s.m.position.set(s.x0 + 0.15 * Math.sin(t * 1.2 + s.ph), y, s.z); s.m.visible = y > WL; });
  floes.forEach(f => { f.g.position.y = wave(f.g.position.x, t) - 0.03; f.g.rotation.z = 0.4 * slope(f.g.position.x, t); });
  // sol que baja y brillos en el agua
  const sy = lerp(7.2, 4.4, t / END); sun.position.set(SUNX, sy, -40); sun.children[0].scale.setScalar(1 + 0.04 * Math.sin(t * 2));
  glint.material.opacity = 0.28 + 0.08 * Math.sin(t * 3);
  glints.forEach(g => { const u = Math.sin(t * 2.5 + g.ph); g.m.position.set(SUNX + 0.6 * Math.sin(g.ph * 3 + t * 0.6), WL + 0.01, g.z); g.m.material.opacity = Math.max(0, u) * 0.9; g.m.scale.x = 0.6 + 0.6 * Math.max(0, u); });
  // la corriente: rayas que corren por la superficie y por el frente del agua
  const fon = Math.max(win(t, corrT - 0.3, c[2] + 0.2, 0.3), win(t, agarT - 0.3, enrT, 0.3));
  const fcx = t < c[2] + 0.2 ? -3.4 : 0;
  flow.forEach((m, i) => { const u = ((t * 0.9 + i * 0.137) % 1); m.visible = fon > 0.01; if (!m.visible) return; m.position.set(fcx + 2.4 - 4.8 * u + 0.3 * Math.sin(i), WL + 0.03, -1.6 + (i % 5) * 0.55); m.material.opacity = fon * Math.sin(PI * u) * 0.85; m.scale.x = 0.6 + 0.4 * Math.sin(i * 2.1); });
  flowFront.forEach((m, i) => { const u = ((t * 0.8 + i * 0.21) % 1); m.visible = fon > 0.01; if (!m.visible) return; m.position.set(fcx + 2.6 - 5.2 * u, WL - 0.35 - i * 0.28, ZF + 0.03); m.material.opacity = fon * Math.sin(PI * u) * 0.7; });

  poseHook(t); poseDrift(t); poseKelp(t); poseRaft(t); poseCold(t); poseMom(t);
  zzz.slice(8).forEach(z => { z.visible = false; });
  k.glyphAt(qm, hA, 0, 0.45, popIn(t, agarT, nutT), 0.1 * Math.sin(t * 7));
});