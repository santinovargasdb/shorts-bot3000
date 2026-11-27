// Episodio (En 60 Segundos): por qué las ventanas de los aviones son redondas (de Havilland Comet, 1954).
// Dos decorados: CIELO (avión moderno con el pasajero, el Comet que se infla y se parte, el Comet 4) y
// HANGAR de Farnborough (tanque de agua, restos del avión con la ventanita de antenas, chapas con líneas de
// tensión). Solo dos cortes: al hangar y de vuelta al cielo; adentro de cada lugar, zoom de un tirón y viajes.
// Los aviones son "de perfil" (paneles planos con agujeros de verdad para las ventanas: a través se ve la
// cabina y las cabezas de los pasajeros), como la torre del episodio Eiffel.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, clamp01, back, settle, hop, popIn, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, windowPic } from '/lib/decor.js';

const k = await setup('ventanas', { sky: [[0, '#3b8ee0'], [0.55, '#9fd3f4'], [1, '#eaf7fb']] });
const { scene, c, at, END, sfx, tag, BIG } = k;
const HX = 60, WX = HX + 11, PX = HX + 22;              // hangar: tanque, restos, chapas
const CX = -8.5, C4X = 12;                                // cielo: Comet viejo, Comet 4 (el moderno está en 0)
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), tmp3 = V(0, 0, 0);

// ---------- tiempos ----------
const redT = at('redondas', 0), partT0 = at('partieron', 0);
const cometT = at('comet', c[1]), primT = at('primer', c[1]), cuadT = at('cuadradas', c[1]), ventT = at('ventanas', c[1]);
const presT = at('presuriza', c[2]), inflaT = at('infla', c[2]), globoT = at('globo', c[2]);
const dosT = at('dos', c[3]), partT = at('parten', c[3]);
const tanqT = at('tanque', c[4]), aguaT = at('agua', c[4]), inflanT = at('inflan', c[4]), otraT = at('otra', c[4]);
const simT = at('simulados', c[5]), rajaT = at('raja', c[5]), salT = at('salida', c[5]);
const restT = at('restos', c[6]), grietaT = at('grieta', c[6]), esqT = at('esquina', c[6]), ventaT = at('ventanita', c[6]);
const juntT = at('juntan', c[7]), tensT = at('tension', c[7]), puntoT = at('punto', c[7]), curvT = at('curvas', c[7]), repT = at('reparten', c[7]);
const vuelveT = at('vuelve', c[8]), redoT = at('redondeadas', c[8]), todosT = at('todos', c[8]);
const sabesT = at('ninguna', c[9]);      // cierre en tercera persona (antes: "Ahora ya sabés por qué")

// ---------- piezas propias ----------
const mat = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
function canvasTex(w, h, paint) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; paint(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
/** Rectángulo redondeado como lista de puntos (r = radio de las puntas). */
function rrect(cx, cy, w, h, r, n = 6) {
  const pts = [], hw = w / 2 - r, hh = h / 2 - r;
  for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, PI / 2], [-1, -1, PI], [1, -1, 1.5 * PI]])
    for (let i = 0; i <= n; i++) { const a = a0 + (PI / 2) * i / n; pts.push([cx + sx * hw + r * Math.cos(a), cy + sy * hh + r * Math.sin(a)]); }
  return pts;
}
const shapeOf = (pts, holes = []) => { const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); for (const h of holes) s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1])))); return s; };
/** Línea de color (no tinta) por puntos. */
function cline(parent, pts, w, color, z = 0.01) {
  const g = new THREE.Group(), m = color.isMaterial ? color : mat(color); parent.add(g);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    const s = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(dx, dy) + w * 0.6, w), m); s.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z); s.rotation.z = Math.atan2(dy, dx); g.add(s);
  }
  return g;
}
/** Panel plano con agujeros y textura pintada en coordenadas del mundo (bx0, by0, bw, bh). */
function panel(parent, pts, holes, map, [bx0, by0, bw, bh], z = 0) {
  const t = map.clone(); t.needsUpdate = true; t.repeat.set(1 / bw, 1 / bh); t.offset.set(-bx0 / bw, -by0 / bh);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(pts, holes), 6), new THREE.MeshBasicMaterial({ map: t })); m.position.z = z; parent.add(m); return m;
}
function arrow(color, len = 0.62, w = 0.15) {
  const g = new THREE.Group();
  k.poly(g, [[-w / 2, 0], [w / 2, 0], [w / 2, len - 0.22], [w * 1.25, len - 0.22], [0, len], [-w * 1.25, len - 0.22], [-w / 2, len - 0.22]], color, 0.04);
  return g;
}

// =====================================================================================
// AVIONES DE PERFIL (Comet viejo con ventanas casi cuadradas, Comet 4 y avión moderno con redondas)
// =====================================================================================
const H = 1.1;                                     // medio alto del fuselaje
function chains({ NX = 1.6, NR = 1.2, TB = -1.35, TE = -2.8, xsT = -0.05, xsB = -0.2 } = {}) {
  const front = [], rear = [];
  for (let i = 0; i <= 4; i++) front.push([lerp(xsT, NX, i / 4), H]);
  for (let i = 1; i <= 10; i++) { const a = PI / 2 * (1 - i / 10); front.push([NX + NR * Math.cos(a), -0.15 + (H + 0.15) * Math.sin(a)]); }
  for (let i = 1; i <= 8; i++) { const a = -PI / 2 * i / 8; front.push([NX + NR * Math.cos(a), -0.15 + (H - 0.15) * Math.sin(a)]); }
  for (let i = 1; i <= 4; i++) front.push([lerp(NX, xsB, i / 4), -H]);
  for (let i = 1; i <= 3; i++) rear.push([lerp(xsB, TB, i / 3), -H]);
  for (let i = 1; i <= 8; i++) { const u = i / 8; rear.push([lerp(TB, TE, u), lerp(-H, 0.45, Math.pow(u, 1.35))]); }
  rear.push([TE, 0.85]);
  for (let i = 1; i <= 6; i++) { const u = i / 6; rear.push([lerp(TE, -2.0, u), lerp(0.85, H, Math.sin(u * PI / 2))]); }
  for (let i = 1; i <= 4; i++) rear.push([lerp(-2.0, xsT, i / 4), H]);
  rear.pop();
  return { front, rear };
}
const JAG = [[-0.05, H], [-0.22, 0.72], [0.02, 0.38], [-0.2, -0.05], [0.0, -0.42], [-0.24, -0.78], [-0.2, -H]];

function paintFuse(g, W, Hh, { top = '#f6f4ee', belly = '#c9ced6', band = '#1f3f7a', pin = '#d9a441', reg = null, bandY = [-0.18, 0.52] }) {
  const py = y => (1 - (y + 1.25) / 2.5) * Hh, px = x => (x + 3) / 6 * W;
  g.fillStyle = top; g.fillRect(0, 0, W, Hh);
  g.fillStyle = belly; g.fillRect(0, py(bandY[0]), W, Hh);
  g.fillStyle = band; g.fillRect(0, py(bandY[1]), W, py(bandY[0]) - py(bandY[1]));
  g.fillStyle = pin; g.fillRect(0, py(bandY[1] + 0.07), W, 7); g.fillRect(0, py(bandY[0]) + 4, W, 6);
  g.strokeStyle = 'rgba(30,20,40,0.22)'; g.lineWidth = 3;
  for (let x = -2.8; x < 3; x += 0.5) { g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), Hh); g.stroke(); }
  g.beginPath(); g.moveTo(0, py(0.85)); g.lineTo(W, py(0.85)); g.moveTo(0, py(-0.75)); g.lineTo(W, py(-0.75)); g.stroke();
  g.fillStyle = 'rgba(30,20,40,0.28)';
  for (let x = -2.8; x < 3; x += 0.5) for (let y = -1.05; y < 1.1; y += 0.12) { g.beginPath(); g.arc(px(x) + 7, py(y), 2.4, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, py(0.98), W, 10);            // brillo de arriba
  g.fillStyle = 'rgba(40,30,60,0.16)'; g.fillRect(0, py(-0.92), W, Hh);             // sombra de abajo
  if (reg) { g.font = '800 46px Montserrat'; g.fillStyle = '#1e1428'; g.textAlign = 'center'; g.fillText(reg, px(-1.75), py(-0.42)); }
}

/** Avión de perfil. kind: 'comet' | 'comet4' | 'modern'. Devuelve partes para animar. */
function airliner(kind) {
  const g = new THREE.Group(); scene.add(g);
  const comet = kind !== 'modern', round = kind !== 'comet';
  const ch = comet ? chains() : chains({ NX: 1.45, NR: 1.35, TB: -1.25, TE: -2.85 });
  const winX = [-1.45, -0.72, 0.42, 1.12];
  const ww = round ? 0.5 : 0.54, wh = round ? 0.64 : 0.56, wr = round ? 0.24 : 0.07, wy = 0.18;
  const holes = winX.map(x => rrect(x, wy, ww, wh, wr));
  const map = canvasTex(1024, 420, (gg, W, Hh) => paintFuse(gg, W, Hh, kind === 'modern'
    ? { top: '#fbfbf8', belly: '#d7dbe2', band: '#2aa3a0', pin: '#f0c04a', bandY: [-0.42, -0.24] }
    : { reg: kind === 'comet' ? 'G-ALYP' : null }));
  const bounds = [-3, -1.25, 6, 2.5];
  const halves = [new THREE.Group(), new THREE.Group()]; halves.forEach(h => g.add(h));
  const [F, R] = halves;
  // panel (dos mitades si es el Comet viejo, para poder partirlo)
  const jagDown = JAG, jagUp = JAG.slice().reverse();
  const fPts = [...ch.front, ...jagUp.slice(1, -1)], rPts = [...ch.rear, ...jagDown];
  const inF = h => h[0][0] > 0;
  panel(F, fPts, holes.filter(inF), map, bounds); panel(R, rPts, holes.filter(h => !inF(h)), map, bounds);
  k.stroke(F, ch.front, 0.07, false, 0.02); k.stroke(R, [ch.front[ch.front.length - 1], ...ch.rear, ch.front[0]], 0.07, false, 0.02);
  const jag = new THREE.Group(); F.add(jag); k.stroke(jag, JAG, 0.05, false, 0.022);
  const jag2 = new THREE.Group(); R.add(jag2); k.stroke(jag2, JAG, 0.05, false, 0.022); jag.visible = jag2.visible = false;
  // marcos de las ventanas, vidrio y cabina
  const wins = [];
  holes.forEach((h, i) => {
    const part = inF(h) ? F : R, x = winX[i];
    const fr = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(rrect(x, wy, ww + 0.1, wh + 0.1, wr + 0.05), [h])), mat(0xaab2be)); fr.position.z = 0.012; part.add(fr);
    k.stroke(part, h, 0.045, true, 0.02); k.stroke(part, rrect(x, wy, ww + 0.1, wh + 0.1, wr + 0.05), 0.03, true, 0.02);
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(h)), mat(0xdff3ff, { transparent: true, opacity: 0.12, depthWrite: false })); glass.position.z = -0.02; part.add(glass);
    const glare = new THREE.Mesh(new THREE.PlaneGeometry(0.05, wh * 0.35), mat(0xffffff, { transparent: true, opacity: 0.5, depthWrite: false })); glare.position.set(x + ww * 0.36, wy + wh * 0.22, -0.015); glare.rotation.z = -0.5; part.add(glare);
    block(part, kind === 'modern' ? 0x3f6ea8 : 0x8f2433, x - ww / 2 - 0.12, x - ww / 2 + 0.06, -0.25, 0.62, -0.5, -0.7, 0.014);     // respaldo del asiento
    wins.push({ x, part });
  });
  for (const part of halves) {                     // pared del fondo de la cabina (se ve por las ventanas)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(part === F ? 2.0 : 2.1, 1.5), mat(0xefe2c4)); back.position.set(part === F ? 0.9 : -1.15, 0.2, -0.78); part.add(back);
    const bin = new THREE.Mesh(new THREE.PlaneGeometry(part === F ? 2.0 : 2.1, 0.22), mat(0xd6c39b)); bin.position.set(back.position.x, 0.78, -0.77); part.add(bin);
    const lampL = new THREE.Mesh(new THREE.PlaneGeometry(part === F ? 2.0 : 2.1, 0.05), mat(0xfff6c8)); lampL.position.set(back.position.x, 0.64, -0.76); part.add(lampL);
  }
  // nariz: ventanas de la cabina de mando
  const cockpit = comet ? [[1.95, 0.62], [2.35, 0.42], [2.48, 0.2], [2.12, 0.24], [1.9, 0.38]] : [[1.85, 0.6], [2.32, 0.4], [2.5, 0.16], [2.08, 0.2], [1.8, 0.36]];
  k.poly(F, cockpit, 0x2a3550, 0.04).position.z = 0.025;
  k.stroke(F, [[2.12, 0.24], [2.25, 0.5]], 0.03, false, 0.03);
  // puerta
  k.stroke(R, rrect(-1.95, 0.05, 0.42, 1.05, 0.1), 0.035, true, 0.02);
  k.stroke(F, rrect(1.62, 0.02, 0.38, 0.98, 0.1), 0.03, true, 0.02);
  // cola, estabilizador y ala
  const fin = k.poly(R, comet ? [[-1.25, H - 0.02], [-2.2, 2.4], [-2.78, 2.42], [-2.82, 0.84]] : [[-1.2, H - 0.02], [-2.3, 2.5], [-2.95, 2.5], [-2.86, 0.84]], comet ? 0xf6f4ee : 0x2aa3a0, 0.06); fin.position.z = -0.03;
  const finBand = k.poly(R, comet ? [[-1.62, 1.55], [-1.9, 1.95], [-2.52, 1.95], [-2.6, 1.55]] : [[-1.85, 1.75], [-2.1, 2.05], [-2.6, 2.05], [-2.6, 1.75]], comet ? 0x1f3f7a : 0xffffff, 0.03); finBand.position.z = -0.025;
  const stab = k.poly(R, [[-2.0, 0.55], [-3.15, 0.18], [-3.22, 0.4], [-2.1, 0.78]], 0xb9c0ca, 0.04); stab.position.z = 0.05;
  const wing = k.poly(R, [[0.85, -0.72], [-0.75, -0.72], [-1.6, -2.15], [-1.08, -2.2]], 0xc3c9d2, 0.06); wing.position.z = 0.08;
  k.stroke(wing, [[0.55, -0.78], [-1.17, -2.15]], 0.025, false, 0.012);
  const spin = [];
  if (comet) {                                     // turbinas metidas en la raíz del ala: tomas de aire y escapes
    for (const [x, y] of [[0.68, -0.86], [0.34, -1.2]]) {
      const ring = outlined(new THREE.Mesh(new THREE.CircleGeometry(0.15, 22), flat(0x9aa2ad)), 0.02); ring.scale.set(0.6, 1, 1); ring.position.set(x, y, 0.11); R.add(ring);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), mat(0x15121c)); hole.scale.set(0.6, 1, 1); hole.position.set(x, y, 0.12); R.add(hole);
    }
    for (const [x, y] of [[-0.9, -0.86], [-1.15, -1.25]]) { const ex = outlined(new THREE.Mesh(new THREE.CircleGeometry(0.1, 18), flat(0x4a4f5a)), 0.016); ex.scale.set(0.6, 1, 1); ex.position.set(x, y, 0.11); R.add(ex); }
  } else {                                         // motor colgado debajo del ala, con el ventilador girando
    const eng = k.poly(R, rrect(0.2, -1.75, 1.3, 0.62, 0.28), 0xd7dbe2, 0.05); eng.position.z = 0.14;
    const fan = new THREE.Group(); fan.position.set(0.86, -1.75, 0.17); fan.scale.set(0.42, 1, 1); R.add(fan);
    fan.add(new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), mat(0x2b2f3a)));
    const blades = new THREE.Group(); blades.position.z = 0.005; fan.add(blades);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5), mat(0xb9c0ca)); b.rotation.z = i * PI / 6; blades.add(b); }
    spin.push(blades);
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), mat(0xffffff)); cone.position.z = 0.01; fan.add(cone);
  }
  return { g, F, R, jag, jag2, wins, spin, kind };
}
const modern = airliner('modern'), cometA = airliner('comet'), comet4 = airliner('comet4');
modern.g.position.set(0, 2.0, 0); cometA.g.position.set(CX, 2.0, 0); comet4.g.position.set(C4X, 2.0, 0);
// otros aviones de hoy, lejos: todos con ventanas redondeadas
const farPlanes = [[6.6, 5.0, -5, 0.42], [4.6, -0.3, -7, 0.38], [9.0, 1.5, -10, 0.34]].map(([x, y, z, s]) => { const p = airliner('modern'); p.g.position.set(x, y, z); p.g.scale.setScalar(s); return { p, x, y }; });

// pasajeros: solo se les ve la cabeza por la ventanilla (sentados detrás del panel)
function seat(plane, i, opts) { const t = makeToon(opts); plane.wins[i].part.add(t.root); return { t, x: plane.wins[i].x, plane }; }
const hero = seat(modern, 2, { shirt: 0xe0a030, hair: 0x6b4a2a, detail: ['collar'] });
const paxM = [seat(modern, 0, { shirt: 0x8a6bbf, hair: 0x23262d, detail: ['buttons'] }), seat(modern, 3, { shirt: 0x3b82c4, hair: 0xc98a3a, hat: { type: 'boater', color: 0xf0d78a, band: 0xc8443a } })];
const paxC = [seat(cometA, 0, { shirt: 0x2f6b4f, hair: 0x2b2118, hat: { type: 'fedora', color: 0x3a3f4d, band: 0x8f2433 }, mustache: true }),
  seat(cometA, 2, { shirt: 0xc8553d, hair: 0xe0b050, detail: ['collar'] }), seat(cometA, 3, { shirt: 0x6a8fd0, hair: 0x6b4a2a, hat: { type: 'bowler', color: 0x4a3222 } })];
const pax4 = [seat(comet4, 1, { shirt: 0xd9b23a, hair: 0x23262d, hat: { type: 'fedora', color: 0x6b4a2a, band: 0x15171c } }), seat(comet4, 3, { shirt: 0xb5654a, hair: 0x9aa0a8, mustache: true, detail: ['collar'] })];
const WY = 0.18, SEAT_Y = WY - 1.36 + 0.22, SEAT_Z = -0.38;   // crouch 1 baja la cabeza 0,22

// nubes: tres capas que pasan a distinta velocidad (el avión "vuela")
const skyClouds = [];
for (let i = 0; i < 34; i++) {
  const layer = i % 3, x0 = -30 + ((i * 37) % 56) + (i % 5) * 0.4;
  const y = layer === 0 ? 4.6 + (i % 4) * 0.9 : layer === 1 ? -0.9 - (i % 3) * 0.6 : 5.2 + (i % 3) * 0.7;
  const z = layer === 0 ? -9 : layer === 1 ? -3.5 : -5;
  const g = k.cloud(x0, y, z, layer === 1 ? 1.4 : 0.8 + (i % 3) * 0.25);
  skyClouds.push({ g, x0, sp: [1.6, 3.6, 2.4][layer] });
}
// mar de nubes abajo
for (let i = 0; i < 18; i++) { const g = k.cloud(-30 + i * 3.2, -3.2 + (i % 2) * 0.3, -6, 2.2); skyClouds.push({ g, x0: -30 + i * 3.2, sp: 1.2 }); }
const sun = new THREE.Group(); scene.add(sun); sun.position.set(0, 6.5, -14);
sun.add(new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), mat(0xfff3b0)));
const rays = new THREE.Group(); sun.add(rays); for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 3.4), mat(0xfff8d6, { transparent: true, opacity: 0.45 })); r.rotation.z = i * PI / 12; r.position.z = -0.01; rays.add(r); }
const speedL = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.03), mat(0xffffff, { transparent: true })); scene.add(m); return m; });
const heat = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.035), mat(0xffffff, { transparent: true })); scene.add(m); return m; });

// flechas de presión (Comet viejo)
const pArrows = [];
for (const x of [-1.25, -0.1, 0.95]) for (const s of [1, -1]) { const a = arrow(0xe8453c); a.rotation.z = s > 0 ? 0 : PI; cometA.F.parent.add(a); pArrows.push({ a, x, s }); }
{ const a = arrow(0xe8453c); a.rotation.z = -PI / 2; cometA.g.add(a); pArrows.push({ a, x: 2.95, s: 0, side: true }); }
// pedazos que vuelan al partirse
const debris = Array.from({ length: 12 }, (_, i) => {
  const s = 0.08 + (i % 4) * 0.04, m = k.poly(scene, [[-s, -s * 0.6], [s * 0.8, -s], [s, s * 0.7], [-s * 0.4, s]], i % 3 ? 0xc9ced6 : 0xf6f4ee, 0.025);
  m.userData = { vx: ((i * 7) % 9 - 4) * 0.5, vy: 1.2 + (i % 5) * 0.45, spin: 3 + (i % 4) * 2 }; m.visible = false; return m;
});
const crackSpark = [0, 1, 2, 3, 4].map(() => k.glyph('✦', '#fff1a8', 0.4));

// =====================================================================================
// HANGAR (Farnborough): tanque de agua, restos, chapas de prueba
// =====================================================================================
surface(scene, tex.stripes({ a: '#a7b3bf', b: '#97a3b0', dot: '#8794a1', n: 10 }, 26, 3), 50, 12, HX + 11, 6, -3.2);
surface(scene, tex.bricks({ base: '#b9715a', mortar: '#8a5444', rows: 6, cols: 4 }, 30, 1.2), 50, 1.3, HX + 11, 0.65, -3.18);
k.plane(scene, INK, 50, 0.06, HX + 11, 1.3, -3.17);
surface(scene, tex.tiles({ base: '#a9aeb3', line: '#878c92', n: 3 }, 16, 10), 50, 30, HX + 11, 0.001, 0, true);
for (let i = 0; i < 6; i++) windowPic(scene, 1.3, 1.0, HX - 4 + i * 6.2, 4.35, -3.15, { sky: '#a8d8f0', curtain: '#5d6772' });
for (let i = 0; i < 8; i++) {                         // vigas del techo
  block(scene, 0x5d6772, HX - 6 + i * 4.6 - 0.07, HX - 6 + i * 4.6 + 0.07, 1.3, 5.6, -3.0, -3.12, 0.012);
}
const hLamps = [];
for (let i = 0; i < 7; i++) {
  const x = HX - 3 + i * 4.5, g = new THREE.Group(); g.position.set(x, 5.0, -1.2); scene.add(g);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), INK); cord.position.y = 0.5; g.add(cord);
  const shade = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.26, 16, 1, true), flat(0x3f6e5a, { side: THREE.DoubleSide })), 0.016); g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(0xfff3c4)); bulb.position.y = -0.12; g.add(bulb);
  hLamps.push(g);
}
const rae = k.sign('R.A.E. FARNBOROUGH', 2.6, 0.42, { bg: '#ffd23a' }); rae.position.set(HX - 1.25, 5.3, -2.9); scene.add(rae);
// cajas, barriles, banco de trabajo
for (const [x, z, s, col] of [[HX - 4.4, -2.2, 0.6, 0xb5884f], [HX - 3.8, -2.4, 0.45, 0xa8784a], [HX + 8.0, -2.3, 0.55, 0xb5884f], [HX + 16.3, -2.3, 0.6, 0xa8784a], [HX + 27, -2.2, 0.5, 0xb5884f]]) {
  block(scene, col, x - s / 2, x + s / 2, 0, s, z + s / 2, z - s / 2, 0.016); k.stroke(scene, [[x - s / 2, 0.02], [x + s / 2, s - 0.02]], 0.02, false, z + s / 2 + 0.003); }
for (const [x, z, col] of [[HX + 4.2, -2.4, 0x2f6b9a], [HX + 4.75, -2.2, 0xc8443a], [HX + 19.6, -2.3, 0x3f8f6b]]) {
  const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.8, 18), flat(col)), 0.018); b.position.set(x, 0.4, z); scene.add(b);
  for (const y of [0.2, 0.6]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.015, 6, 22), INK); r.rotation.x = PI / 2; r.position.set(x, y, z); scene.add(r); } }
block(scene, 0x7a4b2a, HX + 13.2, HX + 15.2, 0.8, 0.9, -1.9, -2.6); block(scene, 0x5a3a22, HX + 13.3, HX + 13.4, 0, 0.8, -1.95, -2.05, 0.01); block(scene, 0x5a3a22, HX + 15.0, HX + 15.1, 0, 0.8, -1.95, -2.05, 0.01);
block(scene, 0xc8443a, HX + 13.5, HX + 14.0, 0.9, 1.1, -2.1, -2.4, 0.012); block(scene, 0x9aa0a8, HX + 14.4, HX + 14.9, 0.9, 1.0, -2.1, -2.3, 0.012);

// --- tanque ---
const TANK = { x0: HX - 3.3, x1: HX + 3.3, y1: 3.6, z0: -1.25, z1: 1.25 };
const tankBack = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.6), mat(0x3f8fd0, { transparent: true, opacity: 0.55 })); tankBack.position.set(HX, 1.8, TANK.z0); scene.add(tankBack);
const tankFront = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.4), mat(0x6cc0f0, { transparent: true, opacity: 0.26, depthWrite: false })); tankFront.position.set(HX, 1.7, TANK.z1); tankFront.renderOrder = 2; scene.add(tankFront);
for (const x of [TANK.x0, TANK.x1, HX]) for (const z of [TANK.z0, TANK.z1]) block(scene, 0x3f6e5a, x - 0.08, x + 0.08, 0, 3.75, z + 0.08, z - 0.08, 0.016);
for (const z of [TANK.z0, TANK.z1]) { block(scene, 0x3f6e5a, TANK.x0 - 0.1, TANK.x1 + 0.1, 3.65, 3.8, z + 0.09, z - 0.09, 0.016); block(scene, 0x3f6e5a, TANK.x0 - 0.1, TANK.x1 + 0.1, 0, 0.18, z + 0.09, z - 0.09, 0.016); }
for (let x = TANK.x0 + 0.3; x < TANK.x1; x += 0.4) { const r = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), mat(0x1e1428)); r.position.set(x, 3.725, TANK.z1 + 0.095); scene.add(r); }
const glareT = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22 - i * 0.1, 3.7), mat(0xffffff, { transparent: true, opacity: 0.28, depthWrite: false })); m.position.set(HX - 2.2 + i * 0.4, 1.8, TANK.z1 + 0.01); m.rotation.z = 0.45; m.renderOrder = 3; scene.add(m); return m; });
const surf = new THREE.Group(); scene.add(surf);
const SURF_N = 40, surfPts = Array.from({ length: SURF_N + 1 }, (_, i) => TANK.x0 + (TANK.x1 - TANK.x0) * i / SURF_N);
const surfMesh = surfPts.slice(1).map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), mat(0xffffff)); m.position.z = TANK.z1 + 0.02; m.renderOrder = 4; surf.add(m); return m; });
const caust = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.04), mat(0xcff0ff, { transparent: true, opacity: 0.5 })); m.position.z = TANK.z0 + 0.02; scene.add(m); return m; });
const bubbles = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.05 + (i % 3) * 0.025, 14), mat(0xffffff, { transparent: true, opacity: 0.75, depthWrite: false })); m.renderOrder = 3; scene.add(m); return m; });
// fuselaje de prueba (G-ALYU) dentro del tanque, con la salida de emergencia
const testF = new THREE.Group(); testF.position.set(HX - 0.2, 2.05, 0); scene.add(testF);
const TW = [-1.95, -1.4, -0.85, -0.3, 0.25, 0.8, 2.0];
{
  const outline = rrect(0, 0, 5.4, 1.56, 0.76, 10), holes = TW.map(x => rrect(x, 0.16, 0.3, 0.32, 0.04));
  const map = canvasTex(1024, 300, (g, W, Hh) => { g.fillStyle = '#d6dbe2'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#bfc5ce'; g.fillRect(0, Hh * 0.62, W, Hh);
    g.strokeStyle = 'rgba(30,20,40,0.25)'; g.lineWidth = 3; for (let x = 0; x < W; x += W / 11) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); }
    g.fillStyle = 'rgba(30,20,40,0.3)'; for (let x = 6; x < W; x += W / 11) for (let y = 10; y < Hh; y += 22) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); } });
  panel(testF, outline, holes, map, [-2.7, -0.78, 5.4, 1.56]); k.stroke(testF, outline, 0.06, true, 0.02);
  holes.forEach(h => k.stroke(testF, h, 0.035, true, 0.02));
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.0), mat(0x2c3a52)); inner.position.set(0, 0.1, -0.5); testF.add(inner);
  const hatch = k.poly(testF, rrect(1.42, 0.02, 0.42, 0.74, 0.05), 0xc3c9d2, 0.045); hatch.position.z = 0.012;
  const hw = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(rrect(1.42, 0.16, 0.26, 0.26, 0.03))), mat(0x2c3a52)); hw.position.z = 0.03; testF.add(hw);
  const handle = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), INK); handle.position.set(1.42, -0.18, 0.03); testF.add(handle);
}
const HATCH_CORNER = V(1.63, 0.39, 0.04);                 // punta de arriba a la derecha de la salida (local)
const crackT = new THREE.Group(); testF.add(crackT);
const crackTPts = [[1.63, 0.39], [1.74, 0.47], [1.8, 0.43], [1.9, 0.55], [1.97, 0.5], [2.08, 0.6]];
const crackTSeg = crackTPts.slice(1).map((p, i) => { const g = new THREE.Group(); crackT.add(g); k.stroke(g, [crackTPts[i], p], 0.055, false, 0.04); return g; });
// bomba, caño y manómetro
const pump = new THREE.Group(); pump.position.set(HX + 2.95, 0, 1.75); pump.scale.setScalar(0.75); pump.rotation.y = -0.3; scene.add(pump);
block(pump, 0x3f6e5a, -0.45, 0.45, 0, 0.9, 0.35, -0.35, 0.018); block(pump, 0x2b2f3a, -0.5, 0.5, 0.9, 0.98, 0.4, -0.4, 0.016);
const piston = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 14), flat(0xb9c0ca)), 0.014); pump.add(piston);
const cap = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 18), flat(0xc8443a)), 0.016); pump.add(cap);
{ const pipe = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.25, 12), flat(0x8a96a3)), 0.014); pipe.rotation.z = PI / 2; pipe.position.set(-0.98, 0.55, 0); pump.add(pipe); }
const gauge = new THREE.Group(); gauge.position.set(0, 0.55, 0.36); pump.add(gauge);
gauge.add(outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 22), flat(0xffffff)), 0.02)); gauge.children[0].rotation.x = PI / 2;
for (let i = 0; i < 7; i++) { const a = PI * (0.9 - i * 0.8 / 6), tk = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.05), mat(i > 4 ? 0xe8453c : 0x1e1428)); tk.position.set(0.15 * Math.cos(a), 0.15 * Math.sin(a), 0.03); tk.rotation.z = a - PI / 2; gauge.add(tk); }
const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.16), mat(0xe8453c)); needle.geometry.translate(0, 0.07, 0); needle.position.z = 0.035; gauge.add(needle);
// contador de ciclos (texto que cambia)
const counter = (() => {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 220; const g = cv.getContext('2d');
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.73), new THREE.MeshBasicMaterial({ map: t })); let last = -1;
  m.userData.set = n => { if (n === last) return; last = n;
    g.fillStyle = '#1e1428'; g.fillRect(0, 0, 512, 220); g.fillStyle = '#23302a'; g.fillRect(12, 12, 488, 196);
    g.textAlign = 'center'; g.font = '800 50px Montserrat'; g.fillStyle = '#ffd23a'; g.fillText('CICLOS', 256, 70);
    g.font = '800 104px Montserrat'; g.fillStyle = '#7dff8a'; g.fillText(n >= 1000 ? `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, '0')}` : String(n).padStart(4, '0'), 256, 182); t.needsUpdate = true; };
  m.userData.set(0); return m;
})();
counter.position.set(HX + 1.0, 4.3, TANK.z1 + 0.12); scene.add(counter);
for (const dx of [-0.6, 0.6]) block(scene, 0x2b2f3a, HX + 1.0 + dx - 0.02, HX + 1.0 + dx + 0.02, 3.8, 4.0, TANK.z1 + 0.1, TANK.z1 + 0.06, 0.008);

// --- restos del avión caído (G-ALYP) con la ventanita de antenas ---
for (const [x0, x1] of [[WX - 2.6, WX - 2.45], [WX + 2.45, WX + 2.6]]) block(scene, 0x5d6772, x0, x1, 0, 3.4, -0.9, -1.05, 0.014);
block(scene, 0x5d6772, WX - 2.6, WX + 2.6, 3.3, 3.42, -0.9, -1.05, 0.014);
const wreck = [
  [[-2.3, 0.4], [-1.2, 0.55], [-1.05, 1.5], [-1.6, 1.75], [-2.35, 1.45]], [[1.15, 0.45], [2.35, 0.35], [2.4, 1.4], [1.7, 1.7], [1.25, 1.3]],
  [[-2.2, 1.95], [-1.3, 1.85], [-1.25, 2.95], [-2.25, 3.05]], [[1.3, 1.95], [2.3, 2.0], [2.25, 3.0], [1.45, 2.85]],
];
wreck.forEach((pts, i) => { const p = k.poly(scene, pts.map(([x, y]) => [x + WX, y]), i % 2 ? 0xc3c9d2 : 0xd6dbe2, 0.05); p.position.z = -0.85;
  for (let j = 0; j < 4; j++) { const r = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), INK); const [a, b] = [pts[j % pts.length], pts[(j + 2) % pts.length]]; r.position.set(WX + lerp(a[0], b[0], 0.3), lerp(a[1], b[1], 0.3), 0.02); p.add(r); } });
for (const [x, y, s, r] of [[WX - 1.2, 0.05, 0.3, 0.3], [WX + 0.9, 0.05, 0.25, -0.5], [WX + 1.9, 0.05, 0.35, 1.2], [WX - 2.0, 0.05, 0.22, 2]]) {
  const p = k.poly(scene, [[-s, 0], [s, 0], [s * 0.6, s * 0.5], [-s * 0.8, s * 0.4]], 0xc3c9d2, 0.03); p.position.set(x, y, 0.6); p.rotation.set(-PI / 2 + 0.2, 0, r); }
// el pedazo de techo, grande, con la ventanita cuadrada para antenas
const roof = new THREE.Group(); roof.position.set(WX, 2.15, -0.2); roof.rotation.x = -0.12; scene.add(roof);
const ADF = { x: -0.15, y: 0.05, s: 0.42 };
{
  const outline = [[-1.0, -0.62], [-0.3, -0.7], [0.55, -0.58], [1.02, -0.66], [1.08, 0.1], [0.95, 0.66], [0.2, 0.72], [-0.6, 0.6], [-1.05, 0.7], [-0.98, 0.05]];
  const hole = rrect(ADF.x, ADF.y, ADF.s, ADF.s, 0.025, 2);
  const map = canvasTex(512, 380, (g, W, Hh) => { g.fillStyle = '#e4e7ec'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#1f3f7a'; g.fillRect(0, Hh * 0.8, W, Hh);
    g.strokeStyle = 'rgba(30,20,40,0.28)'; g.lineWidth = 3; for (let x = 40; x < W; x += 110) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); }
    g.fillStyle = 'rgba(30,20,40,0.35)'; for (let x = 46; x < W; x += 110) for (let y = 14; y < Hh; y += 24) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } });
  panel(roof, outline, [hole], map, [-1.1, -0.75, 2.2, 1.5]); k.stroke(roof, outline, 0.06, true, 0.02);
  const inside = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(hole)), mat(0x5a4636)); inside.position.z = -0.02; roof.add(inside);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 20), mat(0x2b2f3a)); loop.position.set(ADF.x, ADF.y, -0.01); roof.add(loop);
  const frame = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(rrect(ADF.x, ADF.y, ADF.s + 0.12, ADF.s + 0.12, 0.04, 2), [hole])), mat(0xaab2be)); frame.position.z = 0.012; roof.add(frame);
  k.stroke(roof, hole, 0.04, true, 0.025); k.stroke(roof, rrect(ADF.x, ADF.y, ADF.s + 0.12, ADF.s + 0.12, 0.04, 2), 0.025, true, 0.025);
}
const ADF_CORNER = V(ADF.x + ADF.s / 2, ADF.y - ADF.s / 2, 0.03);     // punta de abajo a la derecha (local del techo)
const crackR = [[ADF.x + ADF.s / 2, ADF.y - ADF.s / 2], [0.16, -0.24], [0.24, -0.2], [0.33, -0.33], [0.42, -0.3], [0.52, -0.45], [0.62, -0.42], [0.74, -0.58]];
const crackRSeg = crackR.slice(1).map((p, i) => { const g = new THREE.Group(); roof.add(g); k.stroke(g, [crackR[i], p], 0.03, false, 0.035); return g; });
const hot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 22), mat(0xff3b2f, { transparent: true, opacity: 0.6, depthWrite: false })); hot.position.copy(ADF_CORNER); hot.position.z = 0.03; roof.add(hot);

// --- chapas de prueba: esquina contra curva ---
const PLATE = 0.78, PY = 2.85;
const plates = [-1, 1].map(s => {
  const g = new THREE.Group(); g.position.set(PX + s * 0.95, PY, -0.2); scene.add(g);
  const outline = rrect(0, 0, PLATE * 2, PLATE * 2, 0.08, 3);
  const hole = s < 0 ? rrect(0, 0, 0.6, 0.6, 0.02, 2) : Array.from({ length: 36 }, (_, i) => [0.32 * Math.cos(i / 36 * 2 * PI), 0.32 * Math.sin(i / 36 * 2 * PI)]);
  const map = canvasTex(512, 512, (gg, W) => { gg.fillStyle = '#cfd5dd'; gg.fillRect(0, 0, W, W); gg.strokeStyle = 'rgba(255,255,255,0.5)'; gg.lineWidth = 2;
    for (let i = 0; i < 60; i++) { const y = (i * 53) % W; gg.beginPath(); gg.moveTo(0, y); gg.lineTo(W, y + 6); gg.stroke(); }
    gg.fillStyle = 'rgba(30,20,40,0.45)'; for (let i = 0; i < 9; i++) for (const [x, y] of [[24 + i * 58, 24], [24 + i * 58, W - 24], [24, 24 + i * 58], [W - 24, 24 + i * 58]]) { gg.beginPath(); gg.arc(x, y, 5, 0, 7); gg.fill(); } });
  panel(g, outline, [hole], map, [-PLATE, -PLATE, PLATE * 2, PLATE * 2]); k.stroke(g, outline, 0.05, true, 0.02); k.stroke(g, hole, 0.04, true, 0.02);
  block(g, 0x5d6772, -0.06, 0.06, -PY, -PLATE, -0.06, -0.18, 0.014); block(g, 0x5d6772, -0.4, 0.4, -PY, -PY + 0.08, 0.1, -0.4, 0.014);
  // líneas de tensión: como agua que corre por la chapa y tiene que esquivar el agujero
  const lines = [];
  const ys = [-0.66, -0.53, -0.4, -0.27, -0.12, 0.12, 0.27, 0.4, 0.53, 0.66];
  ys.forEach((y0, li) => {
    const ay = Math.abs(y0), sg = Math.sign(y0);
    let f;
    if (s < 0) {                                  // agujero cuadrado: las de adentro se amontonan pegadas al borde
      const a = 0.3, inside = ay < a + 0.02, rank = [0.12, 0.27].indexOf(+ay.toFixed(2));
      const tgt = inside ? a + 0.035 + rank * 0.03 : ay + 0.04 * Math.max(0, 1 - (ay - a) / 0.3);
      f = x => { const ax = Math.abs(x), r = ax < a ? 1 : ax < a + 0.14 ? 1 - (ax - a) / 0.14 : 0; return sg * lerp(ay, tgt, r); };
    } else {                                      // agujero redondo: se abren parejas, de a poco
      const a = 0.32, d = Math.max(0, a + 0.06 + 0.42 * ay - ay);
      f = x => sg * (ay + d * Math.exp(-((x / (1.35 * a)) ** 2)));
    }
    const pts = Array.from({ length: 41 }, (_, i) => { const x = -PLATE + 0.06 + (2 * PLATE - 0.12) * i / 40; return [x, f(x)]; });
    const hotLine = s < 0 && ay < 0.32;
    const base = cline(g, pts, hotLine ? 0.032 : 0.022, s < 0 ? (hotLine ? 0xe8453c : 0xf08a24) : 0x3fbf5a, 0.03);
    base.visible = false;
    const dashes = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, hotLine ? 0.045 : 0.035), mat(s < 0 ? (hotLine ? 0xffd2c0 : 0xfff0c8) : 0xe0ffd8)); m.position.z = 0.04; g.add(m); return m; });
    lines.push({ f, base, dashes, hot: hotLine });
  });
  const glow = s < 0 ? [[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]].map(([x, y]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), mat(0xff2a1f, { transparent: true, opacity: 0.7, depthWrite: false })); m.position.set(x, y, 0.05); g.add(m); return m; }) : [];
  return { g, lines, glow };
});
const xMark = k.glyph('✗', '#e8453c', 0.7), okMark = k.glyph('✓', '#59c36a', 0.75);

// ---------- personajes del hangar ----------
const coat = (o = {}) => makeToon({ shirt: 0xf2f2ee, detail: ['collar', 'tie', 'buttons'], ...o });
const eng1 = coat({ hair: 0x2b2118, mustache: true }); scene.add(eng1.root);
const eng2 = coat({ hair: 0xc98a3a }); scene.add(eng2.root);
const eng3 = coat({ hair: 0x9aa0a8, hat: { type: 'bowler', color: 0x2b2f3a, band: 0x15171c } }); scene.add(eng3.root);
const eng4 = coat({ hair: 0x6b4a2a }); scene.add(eng4.root);
k.walker({ toon: { shirt: 0x3f6e5a, hair: 0x23262d, detail: ['belt', 'buttons'] }, cx: HX + 6, z: -2.6, speed: 0.8, off: 3, dir: 1, span: 16 });
k.walker({ toon: { shirt: 0xf2f2ee, hair: 0xe0b050, detail: ['collar', 'buttons'] }, cx: HX + 17, z: -2.7, speed: 0.7, off: 9, dir: -1, span: 16 });
const board = new THREE.Group(); scene.add(board);
block(board, 0x9a6638, -0.15, 0.15, -0.2, 0.2, 0.012, -0.012, 0.01); { const p = k.sign('3.057', 0.24, 0.16, { bg: '#ffffff' }); p.position.set(0, -0.02, 0.02); board.add(p); }
const lupa = new THREE.Group(); scene.add(lupa);
{ const ring = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 26), flat(0x2b2f3a)), 0.012); lupa.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), mat(0xcff0ff, { transparent: true, opacity: 0.35, depthWrite: false })); lupa.add(glass);
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.18), mat(0xffffff, { transparent: true, opacity: 0.7 })); shine.position.set(-0.06, 0.03, 0.01); shine.rotation.z = -0.6; lupa.add(shine);
  const handle = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.28, 10), flat(0x7a4b2a)), 0.012); handle.position.set(0.17, -0.2, 0); handle.rotation.z = 0.7; lupa.add(handle); }
const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 6), mat(0x7a4b2a)); stick.geometry.translate(0, 0.5, 0); scene.add(stick);

// ---------- signos y partículas ----------
const bang = k.glyph('!', '#ffd23a', 0.6), bang2 = k.glyph('!', '#ffd23a', 0.55), qMark = k.glyph('?', '#ffd23a', 0.55), heart = k.glyph('✓', '#59c36a', 0.55);
const sweat = [0, 1].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const sparks = [0, 1, 2, 3].map(() => k.glyph('✦', '#fff1a8', 0.32));
const splashD = Array.from({ length: 10 }, (_, i) => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), flat(0x8fd6ff)), 0.01); m.userData = { vx: ((i * 7) % 9 - 4) * 0.35, vy: 1.6 + (i % 4) * 0.4 }; m.visible = false; scene.add(m); return m; });
const puffBreak = k.puffs(6), puffBreak2 = k.puffs(5), puffTank = k.puffs(4);

// ---------- poses ----------
const head = { hero: V(0, 0, 0), e1: V(0, 0, 0), e2: V(0, 0, 0), e3: V(0, 0, 0), e4: V(0, 0, 0), c1: V(0, 0, 0) };
const CAMZ = 6;
function posePax(p, t, i, mood, extra = {}) {
  p.t.root.visible = p.plane.g.visible !== false;
  p.t.pose(alive({ x: p.x, y: SEAT_Y + 0.02 * Math.sin(t * 3 + i), z: SEAT_Z, face: 0.12 * Math.sin(t * 0.7 + i), crouch: 1, squash: breathe(t, i),
    look: V(p.plane.g.position.x + p.x + 0.6 * Math.sin(t * 0.6 + i * 2), 2.1, CAMZ), blink: blinkAt(t, i * 0.7), mood, ...extra }, t, i * 1.3));
}
function poseHero(t) {
  const surpr = t > partT0 - 0.1 && t < c[1] + 0.6;
  const wave = win(t, c[9] + 0.15, END + 1, 0.2), x = hero.x;
  const p = { x, y: SEAT_Y + hop(t, partT0 - 0.05, 0.12) + hop(t, sabesT - 0.1, 0.1), z: SEAT_Z, crouch: 1, face: lerp(0.35, 0, prog(t, redT - 0.3, redT + 0.1)),
    squash: breathe(t) * settle(t, partT0 + 0.35, 0.12),
    look: t < redT - 0.3 ? V(modern.g.position.x + x + 1.5, 2.4, 3) : V(modern.g.position.x + x, 2.15, CAMZ), blink: blinkAt(t, 0.3),
    ...moodAt(t, [[0, 'neutral'], [redT - 0.2, 'happy'], [partT0 - 0.1, 'surprised'], [c[1] + 0.5, 'neutral'], [c[8], 'happy']]),
    handR: V(modern.g.position.x + x + 0.2 + 0.06 * Math.sin(t * 12), 2.05 + 0.04 * Math.sin(t * 9), -0.06), wR: 0 * wave };
  if (surpr) Object.assign(p, { mood: 'surprised', mood2: 'surprised', mix: 1 });
  hero.t.pose(alive(p, t, 0)); hero.t.head.getWorldPosition(head.hero);
}

function poseEng(t) {
  // eng1: a la izquierda del tanque, mira, se sorprende cuando se raja
  {
    const x = HX - 0.35, p = { x, z: 1.9, face: 0.55, squash: breathe(t, 1) * settle(t, rajaT + 0.3, 0.14), y: hop(t, rajaT + 0.05, 0.2),
      look: t < rajaT ? V(HX - 0.5, 2.3, 0) : V(HX + 1.2, 2.3, 0), blink: blinkAt(t, 1.1), handL: talk(t, x, 1.9, -1, 1), wL: win(t, c[4] + 0.3, inflanT, 0.25),
      handR: V(x + 0.3, 1.05, 2.15), wR: 1, ...moodAt(t, [[0, 'neutral'], [inflanT, 'effort'], [rajaT, 'surprised'], [c[6], 'worried']]) };
    eng1.pose(alive(p, t, 2)); eng1.head.getWorldPosition(head.e1);
    eng1.hand(1, board.position); board.position.y += 0.02; board.rotation.set(-0.3, 0.4, 0.1);
  }
  // eng2: a la derecha, junto a la bomba, maneja la palanca y anota
  {
    const x = HX + 2.1, push = Math.sin(pumpPhase(t) * 2 * PI), p = { x, z: 1.95, face: -0.55, squash: breathe(t, 2), y: hop(t, rajaT + 0.12, 0.18),
      look: t < rajaT ? V(HX + 1.4, 4.0, 1) : V(HX + 1.3, 2.3, 0), blink: blinkAt(t, 1.7),
      handR: V(x + 0.5, 0.95 + 0.12 * push * (t < rajaT ? 1 : 0), 1.95), wR: t < rajaT + 0.2 ? win(t, c[4], rajaT + 0.2, 0.25) : 0,
      handL: t > rajaT ? V(x - 0.15, 1.5, 2.3) : null, wL: prog(t, rajaT, rajaT + 0.2),
      ...moodAt(t, [[0, 'happy'], [inflanT, 'effort'], [rajaT, 'surprised'], [c[6], 'worried']]) };
    eng2.pose(alive(p, t, 3)); eng2.head.getWorldPosition(head.e2);
  }
  // eng3: con la lupa sobre la esquina de la ventanita
  {
    const x = WX + 1.25, lean = 0.15 * prog(t, grietaT, grietaT + 0.5), p = { x, z: 0.3, face: -0.45, lean, squash: breathe(t, 4) * settle(t, esqT + 0.3, 0.12), y: hop(t, esqT, 0.14),
      look: t < esqT ? V(WX + 0.1, 1.9, 0) : V(WX + 0.2, 1.9, CAMZ), blink: blinkAt(t, 0.9),
      handR: tmp3.copy(ADF_CORNER).applyMatrix4(roof.matrixWorld).add(tmp.set(0.26 + 0.05 * Math.sin(t * 3), -0.16 + 0.04 * Math.sin(t * 2.3), 0.35)), wR: win(t, c[6] + 0.3, c[7] + 0.5, 0.3),
      handL: talk(t, x, 0.3, 1, 2), wL: win(t, esqT, c[7], 0.3) * 0.8,
      ...moodAt(t, [[0, 'neutral'], [grietaT, 'sly'], [esqT, 'surprised'], [ventaT + 0.3, 'happy']]) };
    eng3.pose(alive(p, t, 4)); eng3.head.getWorldPosition(head.e3);
    eng3.hand(1, lupa.position); lupa.position.add(tmp.set(-0.08, 0.12, 0.05)); lupa.rotation.set(0, -0.25, 0.15 * Math.sin(t * 2));
  }
  // eng4: en las chapas, con el puntero
  {
    const x = PX + 0.05, focus = t < curvT - 0.1 ? -1 : 1;
    const tip = tmp2.set(PX + focus * 0.95 + (focus < 0 ? 0.3 : 0.24) + 0.03 * Math.sin(t * 5), PY + (focus < 0 ? -0.3 : -0.24), -0.1);
    const p = { x, z: 0.55, face: focus * 0.35, squash: breathe(t, 5) * settle(t, curvT + 0.2, 0.1), y: hop(t, repT, 0.1),
      look: t < juntT ? V(PX, 1.7, CAMZ) : V(tip.x, PY - 0.2, 0), blink: blinkAt(t, 1.4),
      handR: V(x + focus * 0.38, 1.45, 0.75), wR: 1, handL: talk(t, x, 0.55, -focus, 5), wL: 0.8,
      ...moodAt(t, [[0, 'neutral'], [juntT, 'worried'], [curvT, 'happy']]) };
    eng4.pose(alive(p, t, 5)); eng4.head.getWorldPosition(head.e4);
    eng4.hand(1, stick.position); tmp.copy(tip).sub(stick.position); const len = tmp.length(); stick.scale.set(1, len * 0.96, 1);
    stick.quaternion.setFromUnitVectors(V(0, 1, 0), tmp.normalize());
  }
}
// bomba: arranca lenta y cada vez más rápido ("una y otra vez") hasta que se raja
const P0 = c[4] + 0.5, PD = rajaT - P0;
function pumpPhase(t) { const u = clamp01((t - P0) / PD); return PD * (1.0 * u + (3.6 - 1.0) * u * u / 2); }

// ---------- cámara ----------
const PWX = hero.x;                                  // ventana del pasajero (avión moderno en x = 0)
k.shots([
  { t: 0, pos: [PWX + 0.35, 2.3, 4.4], look: [PWX, 2.15, 0] },
  { t: redT - 0.15, pos: [PWX, 2.2, 2.7], look: [PWX, 2.15, 0] },
  { t: partT0 - 0.15, pos: [PWX - 0.1, 2.15, 5.2], look: [PWX - 0.1, 2.05, 0] },
  { t: c[1] + 0.2, pos: [0.0, 2.1, 12.2], look: [0.0, 1.85, 0], glide: true },
  { t: cometT + 1.0, pos: [CX + 0.2, 2.2, 12.5], look: [CX + 0.2, 1.9, 0], glide: true },
  { t: at('reaccion', c[1]) - 0.1, pos: [CX + 0.9, 2.3, 8.5], look: [CX + 0.9, 2.1, 0] },
  { t: ventT - 0.2, pos: [CX + 0.8, 2.2, 4.6], look: [CX + 0.8, 2.15, 0] },
  { t: c[2] + 0.1, pos: [CX + 0.5, 2.25, 7.2], look: [CX + 0.5, 2.1, 0] },
  { t: presT - 0.05, pos: [CX + 0.1, 2.5, 11.5], look: [CX + 0.1, 2.4, 0], glide: true },
  { t: at('vuelo', c[2]) - 0.1, pos: [CX + 0.3, 2.6, 9.0], look: [CX + 0.3, 2.5, 0] },
  { t: globoT - 0.15, pos: [CX + 0.1, 2.6, 11.5], look: [CX + 0.1, 2.5, 0] },
  { t: c[3], pos: [CX, 2.4, 14.5], look: [CX, 1.8, 0] },
  { t: at('cuatro', c[3]) - 0.1, pos: [CX - 0.2, 2.2, 12], look: [CX - 0.2, 1.9, 0] },
  { t: partT - 0.15, pos: [CX - 0.2, 2.0, 9.5], look: [CX - 0.2, 1.6, 0] },
  { t: c[4], pos: [HX, 2.4, 12], look: [HX, 2.35, 0], cut: true },
  { t: at('entero', c[4]) - 0.1, pos: [HX - 0.4, 2.4, 9.5], look: [HX - 0.4, 2.4, 0] },
  { t: aguaT, pos: [HX + 0.2, 2.6, 11], look: [HX + 0.2, 2.5, 0] },
  { t: inflanT - 0.15, pos: [HX + 0.45, 2.45, 9.0], look: [HX + 0.45, 2.5, 0] },
  { t: otraT - 0.1, pos: [HX + 0.9, 2.9, 7.4], look: [HX + 0.9, 3.0, 0] },
  { t: c[5], pos: [HX + 1.1, 2.7, 8.6], look: [HX + 1.1, 2.8, 0] },
  { t: at('vuelos', c[5]) - 0.1, pos: [HX + 1.1, 2.9, 6.6], look: [HX + 1.1, 3.0, 0] },
  { t: rajaT - 0.1, pos: [HX + 1.3, 2.3, 4.4], look: [HX + 1.3, 2.25, 0] },
  { t: salT, pos: [HX + 1.1, 2.2, 7.4], look: [HX + 1.1, 2.1, 0] },
  { t: c[6] + 1.0, pos: [WX + 0.3, 2.0, 7.6], look: [WX + 0.3, 1.9, 0], glide: true },
  { t: grietaT - 0.1, pos: [WX + 0.4, 2.05, 6.0], look: [WX + 0.4, 1.95, 0] },
  { t: esqT - 0.2, pos: [WX + 0.6, 2.05, 4.9], look: [WX + 0.6, 1.95, 0] },
  { t: ventaT + 0.1, pos: [WX + 0.5, 2.0, 6.2], look: [WX + 0.5, 1.9, 0] },
  { t: c[7] + 0.75, pos: [PX, 2.3, 10.5], look: [PX, 2.25, 0], glide: true },
  { t: juntT, pos: [PX - 0.95, 2.6, 6.0], look: [PX - 0.95, 2.65, 0] },
  { t: tensT - 0.1, pos: [PX - 0.95, 2.7, 4.4], look: [PX - 0.95, 2.7, 0] },
  { t: puntoT - 0.2, pos: [PX - 0.75, 2.95, 3.0], look: [PX - 0.75, 2.7, 0] },
  { t: curvT, pos: [PX - 0.3, 2.6, 5.4], look: [PX - 0.3, 2.65, 0] },
  { t: repT + 0.3, pos: [PX + 0.95, 2.6, 4.9], look: [PX + 0.95, 2.65, 0], glide: true },
  { t: c[8], pos: [C4X, 2.1, 12.5], look: [C4X, 1.9, 0], cut: true },
  { t: vuelveT - 0.1, pos: [C4X + 0.3, 2.2, 9], look: [C4X + 0.3, 2.0, 0] },
  { t: redoT - 0.2, pos: [C4X - 0.6, 2.2, 5.0], look: [C4X - 0.6, 2.15, 0] },
  { t: at('despues', c[8]) - 0.1, pos: [C4X - 0.5, 2.2, 8], look: [C4X - 0.5, 2.0, 0] },
  { t: todosT - 0.5, pos: [C4X - 0.3, 2.2, 11.5], look: [C4X - 0.3, 1.9, 0] },
  { t: c[9], pos: [0.1, 2.1, 11.5], look: [0.1, 1.9, 0], glide: true },
  { t: c[9] + 0.05, pos: [PWX, 2.2, 4.6], look: [PWX, 2.15, 0] },
  { t: sabesT - 0.1, pos: [PWX, 2.2, 3.0], look: [PWX, 2.15, 0] },
]);

// ---------- carteles ----------
tag({ text: '¿Por qué redondas?', big: true, off: BIG, from: 0.2, to: partT0 - 0.2 });
tag({ text: 'Ventana redonda', at: () => tmp.set(PWX + 0.25, 2.45, 0), off: [-170, -280], from: redT + 0.2, to: partT0 - 0.2 });
tag({ text: '¡2 aviones partidos!', big: true, off: BIG, from: partT0, to: c[1] });
tag({ text: '1952', big: true, off: BIG, from: c[1] + 0.1, to: primT });
tag({ text: 'de Havilland Comet', at: () => tmp.set(cometA.g.position.x + 2.3, 1.5, 0), off: [-150, 330], from: cometT + 0.5, to: ventT - 0.25 });
tag({ text: '1er jet de pasajeros', big: true, off: BIG, from: primT, to: ventT - 0.2 });
tag({ text: 'Casi cuadradas', at: () => tmp.set(CX + 1.12 + 0.27, 2.45, 0), off: [-60, -300], from: cuadT - 0.1, to: c[2] });
tag({ text: 'Presión de cabina', at: () => tmp.set(CX + 0.5, 3.4, 0), off: [140, -150], from: presT, to: globoT - 0.1 });
tag({ text: '¡Como un globo!', big: true, off: BIG, from: globoT - 0.1, to: c[3] });
tag({ text: '1954', big: true, off: BIG, from: c[3] + 0.1, to: dosT - 0.05 });
tag({ text: '2 Comet partidos', big: true, off: BIG, from: dosT, to: c[4] });
tag({ text: 'Enero y abril', at: () => tmp.set(CX + 0.3, 3.4, 0), off: [130, -120], from: dosT + 0.3, to: c[4] });
tag({ text: 'Farnborough', at: () => tmp.set(HX - 0.6, 5.1, -3.1), off: [40, 140], from: c[4] + 0.3, to: tanqT });
tag({ text: 'Tanque de agua', big: true, off: BIG, from: tanqT, to: inflanT });
tag({ text: 'Fuselaje entero', at: () => tmp.set(HX - 1.6, 2.8, 0), off: [-40, -230], from: aguaT, to: c[5] - 0.1 });
tag({ text: '¡Una y otra vez!', big: true, off: [540, 760], from: otraT - 0.15, to: c[5] });
tag({ text: '≈ 3.000 vuelos', big: true, off: [540, 760], from: at('tres', c[5]) - 0.1, to: rajaT - 0.1 });
tag({ text: '¡Se raja!', big: true, off: BIG, from: rajaT, to: salT });
tag({ text: 'Salida de emergencia', at: () => tmp.set(HX - 0.2 + 1.42, 2.05 - 0.25, 0.1), off: [-60, 330], from: salT - 0.1, to: c[6] });
tag({ text: 'Restos del avión', big: true, off: BIG, from: restT, to: esqT - 0.2 });
tag({ text: '¡En la esquina!', big: true, off: BIG, from: esqT, to: c[7] });
tag({ text: 'Ventanita para antenas', at: () => tmp.set(WX + ADF.x - 0.1, 2.15 + ADF.y + 0.2, -0.1), off: [-30, -330], from: ventaT - 0.1, to: c[7] });
tag({ text: 'Esquina = tensión', big: true, off: BIG, from: tensT - 0.2, to: curvT - 0.1 });
tag({ text: 'Curva = la reparte', big: true, off: BIG, from: curvT + 0.1, to: c[8] });
tag({ text: 'Comet 4, 1958', at: () => tmp.set(C4X + 1.3, 3.1, 0), off: [40, -200], from: c[8] + 0.3, to: redoT - 0.2 });
tag({ text: '¡Redondeadas!', big: true, off: BIG, from: redoT - 0.2, to: todosT - 0.3 });
tag({ text: '¡Todos los aviones!', big: true, off: BIG, from: todosT - 0.3, to: c[9] });
tag({ text: '¡Sin esquinas!', big: true, off: BIG, from: c[9] + 0.2, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'whoosh', 0.5);
sfx(partT0, 'pop', 0.7);
sfx(presT + 0.1, 'hiss', 0.5);
for (const hit of [partT, rajaT, puntoT]) sfx(hit, 'riser_to', 1);
sfx(partT, 'boom', 0.6); sfx(partT + 0.05, 'thud', 0.8);
sfx(aguaT, 'splash', 0.6);
sfx(rajaT, 'clang', 0.7); sfx(rajaT + 0.05, 'boom', 0.45);
sfx(esqT, 'tap', 0.7); sfx(puntoT, 'boom', 0.4); sfx(repT, 'pop', 0.7);
sfx(todosT, 'pop', 0.6);

// ---------- cuadro ----------
k.follow(() => head.hero);
k.run(t => {
  // cielo
  for (const cl of skyClouds) { let x = cl.x0 - cl.sp * t; x = ((x + 30) % 56 + 56) % 56 - 30; cl.g.position.x = x; }
  rays.rotation.z = t * 0.15; sun.position.x = t < c[1] ? 2 : t < c[4] ? CX + 2 : C4X - 4;
  const planeX = t < c[1] + 1 ? lerp(0, CX, prog(t, c[1], cometT + 0.9)) : t < c[4] ? CX : t < todosT ? C4X : lerp(C4X, 0, prog(t, todosT - 0.6, c[9]));
  const inSky = t < c[4] || t >= c[8];
  speedL.forEach((m, i) => { m.visible = inSky; if (!inSky) return; const u = ((t * 1.7 + i * 0.37) % 1); m.position.set(planeX + 4 - 9 * u, [0.2, 0.55, 3.5, 3.9, 4.3, -0.2, 0.9, 3.2, 4.6][i], -1.4); m.material.opacity = 0.75 * Math.sin(PI * u); });
  for (const pl of [modern, cometA, comet4]) { pl.g.position.y = 2.0 + 0.06 * Math.sin(t * 1.6 + pl.g.position.x); pl.g.rotation.z = 0.03 * Math.sin(t * 1.1 + pl.g.position.x) + 0.02; pl.spin.forEach(b => { b.rotation.z = t * 25; }); }
  heat.forEach((m, i) => { const pl = t < c[1] + 0.5 ? modern : t < c[4] ? cometA : t < todosT ? comet4 : modern; const u = (t * 2.4 + i / 6) % 1;
    const ex = pl === modern ? [-0.45, -1.75] : [[-0.9, -0.86], [-1.15, -1.25]][i % 2];
    m.visible = inSky && !(pl === cometA && t > partT); if (!m.visible) return; m.position.set(pl.g.position.x + ex[0] - 0.2 - 1.6 * u, pl.g.position.y + ex[1] + 0.05 * Math.sin(t * 20 + i), 0.15); m.material.opacity = 0.8 * (1 - u); });

  farPlanes.forEach(({ p, x, y }, i) => { p.g.position.x = x + 0.25 * Math.sin(t * 0.5 + i); p.g.position.y = y + 0.08 * Math.sin(t * 1.3 + i * 2); p.spin.forEach(b => { b.rotation.z = t * 25; }); });
  for (const pl of [modern, cometA, comet4]) pl.g.updateMatrixWorld(true);
  // pasajeros
  poseHero(t);
  paxM.forEach((p, i) => posePax(p, t, i + 1, t > partT0 && t < c[1] + 0.5 ? 'surprised' : 'happy'));
  const cometPax = t < c[3];
  paxC.forEach((p, i) => { p.t.root.visible = cometPax; if (cometPax) posePax(p, t, i + 3, moodAt(t, [[0, 'neutral'], [presT + 0.2 * i, 'surprised'], [globoT + 0.2, 'worried']]).mood2, { y: SEAT_Y + hop(t, globoT + 0.1 * i, 0.12) }); });
  pax4.forEach((p, i) => posePax(p, t, i + 7, 'happy'));
  glyphAt(bang, head.hero, 0.0, 0.5, popIn(t, partT0, c[1] + 0.2), 0.1 * Math.sin(t * 9));
  glyphAt(heart, head.hero, 0.3, 0.12, 0.7 * popIn(t, sabesT, END + 1), 0.1 * Math.sin(t * 5));
  sweat.forEach((m, i) => { const on = t > partT0 + 0.2 && t < c[1] + 0.3, u = (t * 1.8 + i / 2) % 1, s = i ? 1 : -1; m.visible = on; if (!on) return; m.position.set(head.hero.x + s * (0.28 + 0.2 * u), head.hero.y + 0.2 + 0.25 * u - 0.5 * u * u, head.hero.z + 0.3); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });

  // Comet viejo: se infla y se parte
  const inf = 0.1 * prog(t, presT, presT + 0.6) + 0.13 * win(t, globoT - 0.15, c[3] + 0.4, 0.25) + 0.025 * Math.sin(t * 8) * win(t, presT, partT, 0.3) + 0.03 * Math.sin(t * 2.4) * win(t, c[3], partT, 0.3);
  const sq = settle(t, inflaT, 0.06);
  cometA.g.scale.set(1 + 0.25 * inf, (1 + inf) * sq, 1);
  const shake = win(t, partT - 0.6, partT + 0.1, 0.1) * 0.04 * Math.sin(t * 60);
  cometA.g.position.x = CX + shake;
  const brk = lin(t, partT, partT + 2.4), bk = 1 - (1 - brk) ** 2;
  cometA.jag.visible = cometA.jag2.visible = t > partT - 0.3;
  cometA.F.position.set(0.9 * bk, -1.4 * brk * brk, 0); cometA.F.rotation.z = -0.55 * bk;
  cometA.R.position.set(-0.6 * bk, -1.8 * brk * brk, 0); cometA.R.rotation.z = 0.4 * bk;
  pArrows.forEach(({ a, x, s, side }, i) => { const kk = popIn(t, presT + 0.05 * i, partT - 0.05) * (1 + 0.18 * Math.sin(t * 10 + i));
    a.visible = kk > 0.01; if (!a.visible) return; a.scale.setScalar(Math.max(kk, 0.001) * 0.9);
    const pulse = 0.12 * (0.5 + 0.5 * Math.sin(t * 10 + i));
    if (side) a.position.set(x + pulse, -0.15, 0.2); else a.position.set(x, s * (H + 0.08 + pulse), 0.2); });
  debris.forEach((m, i) => { const u = t - partT; m.visible = u > 0 && u < 2.2 && t < c[4]; if (!m.visible) return; const d = m.userData;
    m.position.set(CX - 0.1 + d.vx * u, 2.0 + d.vy * u - 2.6 * u * u, 0.4 + (i % 3) * 0.1); m.rotation.z = u * d.spin; });
  crackSpark.forEach((m, i) => { const kk = popIn(t, partT - 0.3 + i * 0.05, partT + 0.6) * (0.6 + 0.4 * Math.sin(t * 14 + i)); k.glyphAt(m, tmp.set(CX - 0.1, 2.0, 0.3), [0.1, -0.2, 0.15, -0.1, 0][i], [0.9, 0.4, -0.2, -0.7, 0.1][i], Math.max(kk, 0), t * 3 + i); });
  if (t > partT && t < c[4]) { puffBreak(t, partT, CX - 0.1, 0.5, 1, 1.6); puffBreak2(t, partT + 0.05, CX - 0.1, 0.5, -1, 2.2); }

  // tanque: el fuselaje se infla y desinfla cada vez más rápido
  const ph = pumpPhase(t), pulse = t < rajaT ? 0.5 - 0.5 * Math.cos(ph * 2 * PI) : 0.3 * Math.exp(-4 * (t - rajaT));
  const pon = t > P0 ? 1 : 0;
  testF.scale.set(1 + 0.02 * pulse * pon, 1 + 0.09 * pulse * pon, 1);
  testF.position.x = HX - 0.2 + (t > rajaT && t < rajaT + 0.6 ? 0.03 * Math.sin(t * 70) * (1 - (t - rajaT) / 0.6) : 0);
  piston.position.y = 1.2 + 0.25 * pulse * pon; cap.position.y = piston.position.y + 0.45;
  needle.rotation.z = 0.9 - 1.6 * pulse * pon - (t > rajaT ? 0.4 * Math.sin(t * 30) * Math.exp(-3 * (t - rajaT)) : 0);
  counter.userData.set(Math.round(3057 * Math.pow(clamp01((t - P0) / PD), 2.0)));
  crackTSeg.forEach((g, i) => { g.visible = t > rajaT + i * 0.06; });
  for (let i = 0; i < SURF_N; i++) { const x0 = surfPts[i], x1 = surfPts[i + 1], y0 = 3.4 + 0.04 * Math.sin(x0 * 3 + t * 3) + 0.05 * pulse * Math.sin(x0 * 5), y1 = 3.4 + 0.04 * Math.sin(x1 * 3 + t * 3) + 0.05 * pulse * Math.sin(x1 * 5);
    const m = surfMesh[i]; m.position.set((x0 + x1) / 2, (y0 + y1) / 2, TANK.z1 + 0.02); m.scale.x = Math.hypot(x1 - x0, y1 - y0) + 0.01; m.rotation.z = Math.atan2(y1 - y0, x1 - x0); }
  caust.forEach((m, i) => { m.position.x = HX - 3 + ((i * 0.83 + t * 0.4) % 6); m.position.y = 0.6 + (i % 4) * 0.65 + 0.08 * Math.sin(t * 2 + i); m.rotation.z = 0.2 * Math.sin(t + i); });
  bubbles.forEach((m, i) => { const burst = t > rajaT && t < rajaT + 2.5, sp = burst ? 1.6 : 0.5, u = (t * sp * 0.35 + i / 16) % 1;
    const bx = burst && i % 2 ? HX - 0.2 + 1.85 + 0.25 * Math.sin(i + t * 4) : HX - 2.9 + ((i * 0.77) % 5.8);
    m.position.set(bx, 0.3 + 3.0 * u, (i % 2 ? 0.9 : -0.9)); m.scale.setScalar(0.7 + 0.5 * u); m.material.opacity = 0.75 * Math.sin(PI * u); });
  splashD.forEach((m, i) => { const u = t - rajaT; m.visible = u > 0 && u < 1.0 && t < c[6]; if (!m.visible) return; const d = m.userData;
    m.position.set(HX - 0.2 + 1.9 + d.vx * u * 0.6, 3.45 + d.vy * u - 4 * u * u, TANK.z1 - 0.2); });
  if (t > rajaT) puffTank(t, rajaT + 0.05, HX + 1.65, 1.0, 1, 2.4);
  hLamps.forEach((g, i) => { g.rotation.z = 0.05 * Math.sin(t * 1.3 + i); });

  // restos: la grieta avanza desde la esquina
  crackRSeg.forEach((g, i) => { g.visible = t > grietaT + 0.15 + i * 0.12; });
  hot.visible = t > esqT - 0.1; hot.scale.setScalar(Math.max(0.001, back(lin(t, esqT - 0.1, esqT + 0.2)) * (1 + 0.3 * Math.sin(t * 12))));
  roof.rotation.y = 0.04 * Math.sin(t * 0.9);
  glyphAt(bang2, head.e3, 0.05, 0.55, popIn(t, esqT, ventaT), 0.1 * Math.sin(t * 8));
  glyphAt(qMark, head.e1, 0.05, 0.55, popIn(t, c[4] + 0.4, inflanT), 0.12 * Math.sin(t * 6));
  sparks.forEach((m, i) => { const kk = popIn(t, esqT, c[7]) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)); tmp.copy(ADF_CORNER).applyMatrix4(roof.matrixWorld);
    k.glyphAt(m, tmp, [-0.25, 0.28, -0.2, 0.3][i], [0.22, 0.25, -0.22, -0.18][i], Math.max(kk, 0) * 0.8, t * 1.5 + i); });

  // chapas: las líneas corren; en la cuadrada se amontonan en las puntas (rojo), en la redonda se abren (verde)
  plates.forEach((pl, s) => {
    const kk = back(lin(t, c[7] + 0.3 + s * 0.25, c[7] + 0.65 + s * 0.25)); pl.g.scale.setScalar(Math.max(kk, 0.001)); pl.g.visible = t > c[6] + 1;
    const on = t > c[7] + 0.6 + s * 0.3;
    pl.lines.forEach((ln, li) => { ln.base.visible = on; ln.dashes.forEach((m, di) => { m.visible = on; if (!on) return;
      const u = (di / ln.dashes.length + t * 0.22 + li * 0.07) % 1, x = -PLATE + 0.06 + (2 * PLATE - 0.12) * u, y = ln.f(x), y2 = ln.f(x + 0.01);
      m.position.set(x, y, 0.04); m.rotation.z = Math.atan2(y2 - y, 0.01); }); });
    pl.glow.forEach((m, i) => { m.visible = t > juntT; m.scale.setScalar(Math.max(0.001, back(lin(t, juntT + i * 0.08, juntT + 0.3 + i * 0.08)) * (1 + 0.35 * Math.sin(t * 11 + i)) * (t > puntoT ? 1.3 : 1))); });
  });
  k.glyphAt(xMark, tmp.set(PX - 0.95 + 0.6, PY - 0.6, 0.1), 0, 0, 0.55 * popIn(t, puntoT, c[8]), 0.1 * Math.sin(t * 6));
  k.glyphAt(okMark, tmp.set(PX + 0.95 + 0.58, PY - 0.58, 0.1), 0, 0, 0.6 * popIn(t, repT, c[8]), 0.1 * Math.sin(t * 6));

  roof.updateMatrixWorld(true);
  poseEng(t);
  lupa.visible = t > c[6] + 0.45 && t < c[8];
  board.visible = t < c[6] + 2;
  // visibilidad por zona (ahorra dibujo y evita que se vea algo de otro lado)
  cometA.g.visible = t < c[4] + 0.1;
});
function glyphAt(m, pos, dx, dy, kk, spin = 0) { k.glyphAt(m, pos, dx, dy, kk, spin); }
