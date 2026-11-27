// Episodio: Henry "Box" Brown, el hombre que en 1849 se mandó a sí mismo por correo dentro de una caja,
// de Richmond a Filadelfia, para ser libre. Decorados lado a lado en x: ANDÉN (0), RICHMOND (40),
// TALLER (80), VIAJE (120), FILADELFIA (170), ESCENARIO (210). La caja es el objeto clave: tablas con veta y
// nudos, listones, clavos, inscripción "THIS SIDE UP / WITH CARE", tarjeta de Adams Express, agujero para
// respirar y tapa con bisagra; su frente se vuelve transparente para ver a Henry adentro.
// Fuentes (leídas el 26-nov-2026): Wikipedia "Henry Box Brown", NPS (nebe), National Geographic.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, INK, basic } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, facade, painting, windowPic, lamp, hills } from '/lib/decor.js';

const k = await setup('caja');
const { scene, c, at, END, sfx, tag, BIG } = k;
const { plane, stroke, poly, sign, glyph, glyphAt } = k;
const DX = 0, RX = 40, SX = 80, TX = 120, PX = 170, GX = 210;

// ---------- tiempos (palabras) ----------
const correoT = at('correo'), libreT = at('libre');
const richT = at('richmond', c[1]), vendenT = at('venden', c[1]);
const dentroT = at('dentro', c[2]);
const jamesT = at('james', c[3]), samT = at('samuel', c[3]);
const mideT = at('mide', c[4]), metroT = at('metro', c[4]), adentroT = at('adentro', c[4]), aguaT = at('agua', c[4]), galT = at('galletas', c[4]), aguT = at('agujero', c[4]);
const cierranT = at('cierran', c[5]), clavosT = at('clavos', c[5]), filaT = at('filadelfia', c[5]), estadoT = at('estado', c[5]);
const esteT = at('este', c[6]), vueltaT = at('vuelta', c[6]), henT = at('henry', c[6]), cabezaT = at('cabeza', c[6]);
const ojosT = at('ojos', c[7]), mueveT = at('mueve', c[7]);
const trenT = at('tren', c[8]), barcoT = at('barco', c[8]), horasT = at('veintisiete', c[8]);
const filT = at('filadelfia', c[9]), abrenT = at('abren', c[9]), saleT = at('sale', c[9]), saludaT = at('saluda', c[9]), comoT = at('como', c[9]), cabT = at('caballeros', c[9]);
const nameT = at('henry', c[10]), box2T = at('box', at('brown', c[10]) + 0.2), caja2T = at('caja', c[10]);
const recorreT = at('recorre', c[11]), ingT = at('inglaterra', c[11]), contraT = at('contra', c[11]), esclT = at('esclavitud', c[11]);
const climbT = adentroT - 0.35;              // Henry se mete en la caja
const flipT = vueltaT - 0.05, flipD = 0.5;    // el changador da vuelta la caja
const riseT = saleT - 0.05;                   // Henry sale de la caja

// ---------- utilidades ----------
function cvTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
let seedN = 7; const rnd = () => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647; };
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), tmp3 = V(0, 0, 0);
const W3 = (obj, x, y, z, out = V(0, 0, 0)) => obj.localToWorld(out.set(x, y, z));

// =====================================================================================
// LA CAJA
// =====================================================================================
const BW = 0.94, BH = 0.76, BD = 0.62, TH = 0.035;
const FRONT_TEX = cvTex(512, 414, (g, W, H) => {
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H);
  const cols = ['#d2a167', '#c08b52', '#cd9a5f'], bh = (H - 16) / 3;
  for (let i = 0; i < 3; i++) {
    const y = 8 + i * bh; g.fillStyle = cols[i]; g.fillRect(8, y + 4, W - 16, bh - 8);
    g.fillStyle = 'rgba(255,235,190,0.25)'; g.fillRect(8, y + 4, W - 16, 6);
    g.strokeStyle = 'rgba(110,60,25,0.45)'; g.lineWidth = 3;
    for (let q = 0; q < 5; q++) { const yy = y + 16 + q * (bh - 32) / 4 + (rnd() - 0.5) * 6; g.beginPath(); g.moveTo(10, yy); for (let x = 10; x <= W - 10; x += 24) g.lineTo(x, yy + Math.sin(x * 0.025 + i * 2 + q) * 3.5); g.stroke(); }
    const kx = 90 + rnd() * (W - 180), ky = y + bh * (0.35 + rnd() * 0.3);
    g.fillStyle = 'rgba(110,55,20,0.75)'; g.beginPath(); g.ellipse(kx, ky, 15, 8, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,45,15,0.8)'; g.lineWidth = 3; g.beginPath(); g.ellipse(kx, ky, 26, 13, 0, 0, 7); g.stroke();
  }
});
const LABEL_TEX = cvTex(512, 330, (g, W, H) => {
  g.clearRect(0, 0, W, H); g.fillStyle = '#3a1a12'; g.strokeStyle = '#3a1a12';
  g.beginPath(); g.moveTo(W / 2, 6); g.lineTo(W / 2 + 52, 70); g.lineTo(W / 2 + 20, 70); g.lineTo(W / 2 + 20, 104); g.lineTo(W / 2 - 20, 104); g.lineTo(W / 2 - 20, 70); g.lineTo(W / 2 - 52, 70); g.closePath(); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 60px Montserrat'; g.fillText('THIS SIDE UP', W / 2, 160);
  g.font = '800 56px Montserrat'; g.fillText('WITH CARE', W / 2, 236);
  g.lineWidth = 7; g.beginPath(); g.moveTo(40, 286); g.lineTo(W - 40, 286); g.stroke();
  g.globalCompositeOperation = 'destination-out';                       // pintura gastada
  for (let i = 0; i < 260; i++) { g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 5, 2 + rnd() * 4); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
});
const LID_TEX = cvTex(512, 140, (g, W, H) => {
  g.clearRect(0, 0, W, H); g.fillStyle = '#3a1a12'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 54px Montserrat'; g.fillText('PHILADELPHIA', W / 2, 52); g.font = '800 30px Montserrat'; g.fillText('PENN.', W / 2, 108);
});
const CARD_TEX = cvTex(256, 140, (g, W, H) => {
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4e6c0'; g.fillRect(6, 6, W - 12, H - 12);
  g.fillStyle = '#a83246'; g.fillRect(6, 6, W - 12, 34); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 24px Montserrat'; g.fillText('ADAMS EXPRESS', W / 2, 24);
  g.fillStyle = '#1e1428'; g.font = '800 22px Montserrat'; g.fillText('PHILADELPHIA', W / 2, 74); g.font = '600 18px Montserrat'; g.fillText('DRY GOODS', W / 2, 108);
});

function makeBox(parent, { inside = false } = {}) {
  const outer = new THREE.Group(); parent.add(outer); outer.position.y = BH / 2;
  const inner = new THREE.Group(); inner.position.y = -BH / 2; outer.add(inner);
  const fade = [];
  const fmat = o => { const m = new THREE.MeshLambertMaterial({ transparent: true, ...o }); fade.push(m); return m; };
  const fbas = o => { const m = new THREE.MeshBasicMaterial({ transparent: true, ...o }); fade.push(m); return m; };
  block(inner, 0xb7834c, -BW / 2, BW / 2, 0, BH, -BD / 2, -BD / 2 + TH, 0.016);
  block(inner, 0xc08b52, -BW / 2, BW / 2, 0, TH, -BD / 2, BD / 2 - 0.002, 0.016);
  block(inner, 0xcf9d63, -BW / 2, -BW / 2 + TH, 0, BH, -BD / 2, BD / 2 - 0.002, 0.016);
  block(inner, 0xcf9d63, BW / 2 - TH, BW / 2, 0, BH, -BD / 2, BD / 2 - 0.002, 0.016);
  // forro de paño adentro
  const baize = new THREE.MeshLambertMaterial({ color: 0x5f7a58 });
  plane(inner, baize, BW - 2 * TH - 0.01, BH - TH - 0.01, 0, (BH + TH) / 2, -BD / 2 + TH + 0.004);
  plane(inner, baize, BW - 2 * TH - 0.01, BD - TH - 0.02, 0, TH + 0.004, 0.0, true);
  // frente: tablas + listones + clavos + inscripción + agujero + tarjeta
  const front = new THREE.Mesh(new THREE.PlaneGeometry(BW + 0.02, BH + 0.01), fmat({ map: FRONT_TEX })); front.position.set(0, BH / 2, BD / 2 + 0.015); front.receiveShadow = true; inner.add(front);
  const inkF = fbas({ color: 0x1e1428 }), batF = fmat({ color: 0x9a6a3c }), nailF = fbas({ color: 0x3a3f4d }), shineF = fbas({ color: 0xc9ced8 });
  for (const s of [-1, 1]) {
    const x = s * (BW / 2 - 0.065);
    plane(inner, batF, 0.075, BH - 0.01, x, BH / 2, BD / 2 + 0.02);
    for (const e of [-1, 1]) plane(inner, inkF, 0.012, BH - 0.01, x + e * 0.0375, BH / 2, BD / 2 + 0.021);
    for (const y of [0.07, BH / 2, BH - 0.07]) { plane(inner, nailF, 0.028, 0.028, x, y, BD / 2 + 0.023).geometry = new THREE.CircleGeometry(0.014, 12); const sh = plane(inner, shineF, 0.01, 0.01, x - 0.004, y + 0.004, BD / 2 + 0.024); sh.geometry = new THREE.CircleGeometry(0.005, 8); }
  }
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.39), fbas({ map: LABEL_TEX })); label.position.set(0, 0.47, BD / 2 + 0.022); inner.add(label);
  const holeRing = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), fbas({ color: 0x1e1428 })); holeRing.position.set(-0.24, 0.14, BD / 2 + 0.022); inner.add(holeRing);
  const holeIn = new THREE.Mesh(new THREE.CircleGeometry(0.038, 20), fbas({ color: 0x2a160c })); holeIn.position.set(-0.24, 0.14, BD / 2 + 0.023); inner.add(holeIn);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.13), fbas({ map: CARD_TEX })); card.position.set(0.19, 0.14, BD / 2 + 0.025); card.rotation.z = -0.07; inner.add(card);
  // costado derecho: travesaño en diagonal con clavos
  const side = new THREE.Group(); side.position.set(BW / 2 + 0.006, 0, 0); side.rotation.y = PI / 2; inner.add(side);
  plane(side, 0x9a6a3c, 0.07, Math.hypot(BD - 0.1, BH - 0.1), 0, BH / 2, 0).rotation.z = Math.atan2(BD - 0.1, BH - 0.1);
  for (const y of [BH / 3, 2 * BH / 3]) plane(side, INK, BD, 0.012, 0, y, 0.002);
  // tapa con bisagra atrás
  const lid = new THREE.Group(); lid.position.set(0, BH, -BD / 2); inner.add(lid);
  block(lid, 0xc8955a, -BW / 2 - 0.012, BW / 2 + 0.012, 0, TH, 0, BD + 0.02, 0.016);
  for (const s of [-1, 1]) block(lid, 0x9a6a3c, s * (BW / 2 - 0.1), s * (BW / 2 - 0.02), TH, TH + 0.02, 0.03, BD - 0.01, 0.01);
  for (const z of [BD * 0.34, BD * 0.67]) { const ln = plane(lid, INK, BW - 0.24, 0.01, 0, TH + 0.002, z, true); ln.rotation.z = 0; }
  const lidTxt = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.15), new THREE.MeshBasicMaterial({ map: LID_TEX, transparent: true })); lidTxt.rotation.x = -PI / 2; lidTxt.position.set(0, TH + 0.004, BD / 2 + 0.02); lid.add(lidTxt);
  const nails = [0.36, -0.36, 0.12, -0.12].map(x => { const n = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), flat(0x7a808c)), 0.008); n.scale.y = 0.55; n.position.set(x, TH + 0.008, BD - 0.03); lid.add(n); return n; });
  // ojos que espían por el agujero (gancho)
  const eyes = new THREE.Group(); eyes.position.set(-0.24, 0.14, BD / 2 + 0.026); inner.add(eyes);
  const pupils = [];
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.013, 12), basic(0xffffff)); w.position.x = s * 0.016; eyes.add(w); const p = new THREE.Mesh(new THREE.CircleGeometry(0.007, 10), INK); p.position.set(s * 0.016, 0, 0.001); eyes.add(p); pupils.push(p); }
  eyes.visible = false;
  let holder = null;
  if (inside) { holder = new THREE.Group(); holder.position.set(-0.03, TH, -0.04); holder.scale.setScalar(0.4); inner.add(holder); }
  return { outer, inner, lid, card, nails, eyes, pupils, holder, holePos: () => W3(inner, -0.24, 0.14, BD / 2 + 0.03),
    setFront(op) { for (const m of fade) { m.opacity = op; m.depthWrite = op > 0.97; } } };
}

// ---------- vehículos y animales ----------
function spokeWheel(parent, x, y, z, r = 0.3) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 28), INK); g.add(rim);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r - 0.035, 0.018, 6, 28), basic(0x9a6a3c)); tire.position.z = 0.004; g.add(tire);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.03, r * 2 - 0.06), INK); s.rotation.z = i * PI / 6; s.position.z = 0.006; g.add(s); }
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), basic(0x6b4426)); hub.position.z = 0.01; g.add(hub);
  const hr = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.075, 14), INK); hr.position.z = 0.011; g.add(hr);
  return g;
}
function makeHorse(parent, color = 0x9a6a3c) {
  const g = new THREE.Group(); parent.add(g);
  const m = flat(color), dark = flat(0x3a2418);
  const cap = (r, l, mm) => outlined(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), mm), 0.02);
  const body = cap(0.24, 0.6, m); body.rotation.z = PI / 2; body.position.y = 0.92; g.add(body);
  const strap = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.03, 6, 22), flat(0x8f2433)), 0.01); strap.rotation.y = PI / 2; strap.position.set(0.18, 0.92, 0); g.add(strap);
  const neck = cap(0.12, 0.34, m); neck.position.set(0.43, 1.18, 0); neck.rotation.z = -0.62; g.add(neck);
  const mane = cap(0.05, 0.34, dark); mane.position.set(0.36, 1.26, 0); mane.rotation.z = -0.62; g.add(mane);
  const headG = new THREE.Group(); headG.position.set(0.58, 1.4, 0); g.add(headG);
  const head = cap(0.11, 0.24, m); head.rotation.z = PI / 2 + 0.55; head.position.set(0.12, -0.06, 0); headG.add(head);
  const muz = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 10), flat(0xd9b48a)), 0.016); muz.position.set(0.25, -0.15, 0); headG.add(muz);
  const ring = new THREE.Mesh(new THREE.CircleGeometry(0.052, 16), INK); ring.position.set(0.07, 0.02, 0.104); headG.add(ring);
  const eyeW = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), basic(0xffffff)); eyeW.position.set(0.07, 0.02, 0.106); headG.add(eyeW);
  const pup = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), INK); pup.position.set(0.085, 0.015, 0.108); headG.add(pup);
  for (const z of [-0.05, 0.05]) { const e = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8), m), 0.01); e.position.set(-0.02, 0.13, z); headG.add(e); }
  const tailG = new THREE.Group(); tailG.position.set(-0.52, 1.0, 0); g.add(tailG);
  const tail = cap(0.05, 0.34, dark); tail.position.set(-0.06, -0.18, 0); tail.rotation.z = -0.3; tailG.add(tail);
  const legs = [[0.34, 0.12], [0.34, -0.12], [-0.34, 0.12], [-0.34, -0.12]].map(([x, z]) => {
    const lg = new THREE.Group(); lg.position.set(x, 0.75, z); g.add(lg);
    const l = cap(0.045, 0.55, m); l.position.y = -0.36; lg.add(l);
    const hoof = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.07, 10), dark), 0.012); hoof.position.y = -0.7; lg.add(hoof);
    return lg;
  });
  return { g, step(t, phase, w) {
    legs.forEach((l, i) => { l.rotation.z = 0.42 * w * Math.sin(phase * 2 * PI + [0, PI, PI, 0][i]); });
    headG.rotation.z = 0.07 * Math.sin(phase * 4 * PI) * w + 0.05 * Math.sin(t * 1.7); tailG.rotation.z = 0.2 * Math.sin(t * 3.1);
    g.position.y = 0.02 * Math.abs(Math.sin(phase * 2 * PI)) * w;
  } };
}
function makeWagon(parent) {
  const g = new THREE.Group(); parent.add(g);
  block(g, 0x8f5f33, -0.8, 0.8, 0.45, 0.6, -0.42, 0.42);
  block(g, 0xa8743f, -0.8, 0.8, 0.6, 0.82, 0.38, 0.44, 0.014); block(g, 0xa8743f, -0.8, 0.8, 0.6, 0.82, -0.44, -0.38, 0.014);
  block(g, 0xa8743f, -0.86, -0.8, 0.6, 0.82, -0.44, 0.44, 0.014);
  stroke(g, [[-0.78, 0.71], [0.78, 0.71]], 0.012, false, 0.445);
  for (const x of [-0.55, 0, 0.55]) block(g, 0x6b4426, x - 0.03, x + 0.03, 0.58, 0.84, 0.44, 0.47, 0.01);
  block(g, 0x6b4426, 0.45, 0.8, 0.82, 0.9, -0.3, 0.3);
  for (const z of [0.3, -0.34]) block(g, 0x6b4426, 0.8, 1.9, 0.55, 0.6, z, z + 0.04, 0.01);
  const wheels = [spokeWheel(g, -0.5, 0.3, 0.47), spokeWheel(g, 0.5, 0.3, 0.47)];
  const horse = makeHorse(g); horse.g.position.x = 1.95;
  return { g, wheels, horse };
}
function makeTrain(parent, { flat: withFlat = false } = {}) {
  const g = new THREE.Group(); parent.add(g);
  block(g, 0x2f5a8a, 0.2, 1.7, 0.3, 1.1, 0.3, -0.3); block(g, 0x2f5a8a, 0.2, 0.85, 1.1, 1.65, 0.3, -0.3);
  const chim = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.09, 0.55, 14), flat(0x23262d)), 0.02); chim.position.set(1.35, 1.38, 0); g.add(chim);
  block(g, 0xd9a441, 0.95, 1.15, 1.1, 1.22, 0.1, -0.1, 0.01);
  plane(g, 0xcfeaf7, 0.34, 0.3, 0.52, 1.36, 0.312);
  block(g, 0x23262d, 0.12, 0.93, 1.65, 1.73, 0.36, -0.36, 0.014); block(g, 0xc8443a, 1.7, 1.95, 0.3, 0.5, 0.3, -0.3, 0.014);
  plane(g, 0xffd23a, 1.5, 0.07, 0.95, 0.72, 0.312);
  const wheels = [0.5, 1.35].map(x => k.wheel(g, x, 0.3, 0.32, 0.22));
  if (withFlat) { block(g, 0x6b4426, -1.9, 0.05, 0.3, 0.42, 0.34, -0.34); wheels.push(k.wheel(g, -1.5, 0.25, 0.36, 0.17), k.wheel(g, -0.4, 0.25, 0.36, 0.17)); }
  else { block(g, 0x8f2433, -1.9, 0.05, 0.3, 1.25, 0.3, -0.3); for (const x of [-1.45, -0.925, -0.4]) { plane(g, INK, 0.36, 0.3, x, 0.9, 0.311); plane(g, 0xffe9a3, 0.3, 0.24, x, 0.9, 0.313); }
    block(g, 0x23262d, -1.98, 0.13, 1.25, 1.32, 0.36, -0.36, 0.012); wheels.push(k.wheel(g, -1.5, 0.27, 0.32, 0.2), k.wheel(g, -0.4, 0.27, 0.32, 0.2)); }
  const smoke = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); scene.add(m); return m; });
  return { g, wheels, smoke, puff(t, on = true) {
    g.updateMatrixWorld(true);
    smoke.forEach((m, i) => { m.visible = on && g.visible; const u = (t * 1.1 + i / 5) % 1; const p = W3(g, 1.35 - 1.2 * u, 1.65 + 1.2 * u, 0, tmp3); m.position.copy(p); m.scale.setScalar(0.5 + 1.5 * u); m.material.opacity = 0.9 * (1 - u); });
  } };
}

// =====================================================================================
// ANDÉN (x = 0): estación del expreso, tren parado, cajones
// =====================================================================================
surface(scene, tex.planks({ base: '#b98a58', line: '#7a5530', seed: 4 }, 12, 12), 40, 8.4, DX, 0.001, 1.8, true);
surface(scene, tex.cobble({ base: '#a99f8a', line: '#867c68', rows: 5, cols: 8 }, 20, 6), 40, 12, DX, 0.0, -6.0, true);
plane(scene, INK, 40, 0.06, DX, 0.02, -2.4, true);
for (const z of [-2.75, -3.35]) plane(scene, 0x5d6772, 40, 0.06, DX, 0.03, z, true);
for (let i = -26; i < 26; i++) plane(scene, 0x6b4426, 0.12, 0.9, DX + i * 0.6, 0.015, -3.05, true);
surface(scene, tex.bricks({ base: '#b5654a', mortar: '#8a4a38', rows: 9, cols: 4 }, 10, 3), 40, 12, DX, 6, -5.2);
plane(scene, INK, 40, 0.06, DX, 0.04, -5.19);
const depotSign = sign('ADAMS & CO. EXPRESS', 2.6, 0.42, { bg: '#2f4a3a', fg: '#ffd23a' }); depotSign.position.set(DX + 0.2, 3.05, -5.15); scene.add(depotSign);
windowPic(scene, 0.8, 1.1, DX - 1.6, 2.0, -5.16, { curtain: '#3f6ea8' }); windowPic(scene, 0.8, 1.1, DX + 2.0, 2.0, -5.16, { curtain: '#3f6ea8' });
picture(scene, 0.9, 1.7, DX + 0.2, 1.0, -5.16, (g, W, H) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, W, H); g.fillStyle = '#7a4b2a'; g.fillRect(14, 14, W / 2 - 20, H - 28); g.fillRect(W / 2 + 6, 14, W / 2 - 20, H - 28); g.strokeStyle = '#1e1428'; g.lineWidth = 12; g.strokeRect(0, 0, W, H); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); });
// reloj de la estación (las agujas giran)
const clock = new THREE.Group(); clock.position.set(DX + 1.0, 2.2, -5.12); scene.add(clock);
clock.add(new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), INK)); { const f = new THREE.Mesh(new THREE.CircleGeometry(0.25, 28), basic(0xfff8e6)); f.position.z = 0.005; clock.add(f); }
const handH = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.15), INK); handH.geometry.translate(0, 0.07, 0); handH.position.z = 0.01; clock.add(handH);
const handM = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.22), INK); handM.geometry.translate(0, 0.1, 0); handM.position.z = 0.012; clock.add(handM);
for (const [x, z, w, h, col] of [[-1.4, -1.1, 0.5, 0.45, 0xa8743f], [-1.25, -1.15, 0.36, 0.3, 0xc08b52], [1.6, -1.3, 0.6, 0.5, 0xb7834c]]) { const y0 = x === -1.25 ? 0.45 : 0; block(scene, col, DX + x - w / 2, DX + x + w / 2, y0, y0 + h, z + 0.25, z - 0.25); }
for (const [x, z] of [[-2.0, -0.9], [2.25, -0.8]]) { const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 16), flat(0x8f5f33)), 0.02); b.position.set(DX + x, 0.275, z); scene.add(b); for (const y of [0.12, 0.43]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.015, 6, 22), INK); r.rotation.x = PI / 2; r.position.set(DX + x, y, z); scene.add(r); } }
lamp(scene, DX - 2.6, -1.9); lamp(scene, DX + 2.9, -1.9);
const depotTrain = makeTrain(scene); depotTrain.g.position.set(DX - 0.8, 0, -3.05);
k.cloud(DX - 2.5, 5.8, -9, 1); k.cloud(DX + 2.4, 6.6, -9, 0.8);
const depotWalkers = [k.walker({ toon: { shirt: 0x6a8fd0, hair: 0x6b4a2a, hat: { type: 'top', color: 0x2b2f3a, band: 0x8f2433 }, detail: ['collar', 'buttons'] }, cx: DX, z: -1.5, speed: 0.8, off: 3, dir: 1 }),
k.walker({ toon: { shirt: 0xb5654a, hair: 0x23262d, hat: { type: 'bowler', color: 0x4a3222 }, mustache: true, detail: ['buttons', 'belt'] }, cx: DX, z: -1.9, speed: 0.95, off: 9, dir: -1 })];

// =====================================================================================
// RICHMOND (x = 40): calle de ladrillo
// =====================================================================================
surface(scene, tex.cobble({}, 15, 10), 40, 30, RX, 0, 0, true);
hills(scene, RX, -13, [[-4, 4.5, 0xa9d3a2], [3, 5.2, 0x97c88f]]);
k.cloud(RX - 2.6, 6.0, -11, 1.1); k.cloud(RX + 3.2, 7.2, -11, 0.9); k.cloud(RX + 0.3, 8.4, -11, 0.7);
facade(scene, RX - 6.4, RX - 4.4, 3.3, -6, { wall: '#c97a5a', roof: '#5a4a4a', shutter: '#2f5a3a', seed: 6 });
facade(scene, RX - 4.4, RX - 2.4, 2.8, -6, { wall: '#d9b48a', shutter: '#3f6ea8', awning: '#3f8f6b', seed: 7 });
facade(scene, RX - 2.4, RX + 0.2, 3.6, -6, { wall: '#b5654a', roof: '#4a3a3a', shutter: '#1f3a2a', awning: '#d9a441', seed: 8 });
facade(scene, RX + 0.2, RX + 2.6, 3.0, -6, { wall: '#e3cfb0', shutter: '#8f2433', awning: '#3f6ea8', seed: 9 });
facade(scene, RX + 2.6, RX + 5.0, 3.4, -6, { wall: '#c98a5a', shutter: '#2f5a3a', seed: 10 }); facade(scene, RX + 5.0, RX + 7, 2.7, -6, { seed: 11 });
k.tree(RX - 2.9, -4.2); k.tree(RX + 2.4, -4.4, { h: 2.6, leaf: 0x6dbb58 }); k.tree(RX + 4.4, -3.8, { leaf: 0x58a84a });
for (const x of [-2.4, 2.9]) { block(scene, 0x6b4426, RX + x - 0.04, RX + x + 0.04, 0, 0.9, -0.45, -0.53, 0.012); block(scene, 0x6b4426, RX + x - 0.35, RX + x + 0.35, 0.8, 0.86, -0.46, -0.52, 0.01); }
k.birds([[RX, 5.6, 0], [RX, 6.3, 5], [RX, 5.1, 10]]);
k.walker({ toon: { shirt: 0xd9b23a, hair: 0x6b4a2a, hat: { type: 'boater', color: 0xf0d78a, band: 0x3f6ea8 }, detail: ['belt'] }, cx: RX, z: -3.4, speed: 0.9, off: 2, dir: 1 });
k.walker({ toon: { shirt: 0x6b4a8a, skin: 0x8d5a3b, hair: 0x1e1428, detail: ['apron'], trim: 0xf4efe2 }, cx: RX, z: -3.9, speed: 0.75, off: 7, dir: -1 });
const wagon = makeWagon(scene);
const boxW = makeBox(wagon.g); boxW.outer.position.set(-0.25, 0.6 + BH / 2, 0); boxW.outer.scale.setScalar(0.85);

// =====================================================================================
// TALLER (x = 80): madera, estantes con botas, banco de trabajo
// =====================================================================================
surface(scene, tex.planks({ base: '#a87848', line: '#6f4a28', seed: 21, n: 8 }, 12, 4), 40, 12, SX, 6, -2.2);
surface(scene, tex.planks({ base: '#c08a54', line: '#8f5f33', seed: 9 }, 10, 7), 40, 30, SX, 0.001, 0, true);
plane(scene, INK, 40, 0.07, SX, 0.035, -2.19);
windowPic(scene, 0.95, 1.2, SX - 1.9, 2.4, -2.16, { curtain: '#6f8f4a' }); windowPic(scene, 0.95, 1.2, SX + 2.3, 2.4, -2.16, { curtain: '#6f8f4a' });
const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.4), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.16, depthWrite: false })); ray.position.set(SX - 1.3, 1.4, -1.4); ray.rotation.z = 0.55; scene.add(ray);
// estantes con botas y hormas
for (const y of [1.55, 2.25]) {
  block(scene, 0x6b4426, SX - 0.9, SX + 1.4, y, y + 0.06, -1.85, -2.15, 0.012);
  for (let i = 0; i < 5; i++) {
    const x = SX - 0.7 + i * 0.48, boot = new THREE.Group(); boot.position.set(x, y + 0.06, -2.0); scene.add(boot);
    const col = [0x3a2418, 0x6b3a22, 0x23262d, 0x8f5f33, 0x4a3222][(i + (y > 2 ? 2 : 0)) % 5];
    block(boot, col, -0.06, 0.04, 0, 0.26, 0.06, -0.06, 0.012); block(boot, col, -0.06, 0.13, 0, 0.08, 0.06, -0.06, 0.012);
  }
}
block(scene, 0x7a4b2a, SX - 2.9, SX - 1.6, 0, 0.8, -0.9, -1.6); block(scene, 0x9a6638, SX - 2.95, SX - 1.55, 0.8, 0.88, -0.85, -1.65);
{ const saw = poly(scene, [[0, 0], [0.5, 0.06], [0.5, 0.16], [0, 0.14]], 0xb9bec8, 0.02); saw.position.set(SX - 2.7, 0.89, -1.1); saw.rotation.x = -PI / 2; }
const lantern = new THREE.Group(); lantern.position.set(SX + 0.55, 2.95, -1.9); scene.add(lantern);
{ block(lantern, 0x23262d, -0.1, 0.1, -0.02, 0.02, 0.1, -0.1, 0.01); const gl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 10), basic(0xffe9a3)), 0.015); gl.position.y = 0.12; lantern.add(gl); block(lantern, 0x23262d, -0.1, 0.1, 0.22, 0.26, 0.1, -0.1, 0.01); }
const lanternGlow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.3, depthWrite: false })); lanternGlow.position.set(SX + 0.55, 3.07, -2.1); scene.add(lanternGlow);
const motes = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.8 })); m.userData = { i }; scene.add(m); return m; });
// cinta de medir, agua, galletas
const tape = new THREE.Group(); scene.add(tape);
{ const band = new THREE.Mesh(new THREE.PlaneGeometry(BW, 0.07), basic(0xffd23a)); tape.add(band); stroke(tape, [[-BW / 2, -0.035], [BW / 2, -0.035], [BW / 2, 0.035], [-BW / 2, 0.035]], 0.012, true, 0.002);
  for (let i = 0; i <= 18; i++) { const tk = new THREE.Mesh(new THREE.PlaneGeometry(0.008, i % 2 ? 0.025 : 0.045), INK); tk.position.set(-BW / 2 + i * BW / 18, 0.0, 0.003); tape.add(tk); } }
tape.rotation.x = -0.25;
const jug = new THREE.Group(); scene.add(jug);
{ const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), flat(0xe8dcc0)), 0.012); b.position.y = 0.09; jug.add(b); const n = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.08, 10), flat(0xe8dcc0)), 0.01); n.position.y = 0.2; jug.add(n); const cork = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 10), flat(0x8f5f33)), 0.008); cork.position.y = 0.25; jug.add(cork);
  const drop = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), basic(0x7cc4f0)); drop.position.set(0, 0.09, 0.095); jug.add(drop); }
const biscuits = new THREE.Group(); scene.add(biscuits);
for (let i = 0; i < 3; i++) { const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.022, 14), flat(0xe0b060)), 0.01); b.position.set(0.01 * i, 0.012 + i * 0.026, 0); biscuits.add(b); }
const hammers = [0, 1].map(() => { const g = new THREE.Group(); scene.add(g); const h = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), flat(0x8f5f33)), 0.01); h.position.y = 0.1; g.add(h); block(g, 0x5d6772, -0.07, 0.07, 0.24, 0.3, 0.03, -0.03, 0.01); return g; });

// =====================================================================================
// VIAJE (x = 120): camino, vía y río con barco de vapor
// =====================================================================================
surface(scene, tex.grass({}, 16, 10), 50, 30, TX - 4, 0.001, 0, true);
surface(scene, tex.cobble({ base: '#c9b48a', line: '#a8946c', rows: 4, cols: 10 }, 12, 1), 14, 0.9, TX - 6, 0.004, 0.3, true);
{ const bed = surface(scene, tex.cobble({ base: '#b3a995', line: '#8f8674', rows: 5, cols: 9 }, 12, 1), 12, 1.0, TX + 1.5, 0.004, 0.3, true); bed.material.color.set(0xdddddd); }
for (const z of [0.1, 0.5]) plane(scene, 0x5d6772, 12, 0.05, TX + 1.5, 0.02, z, true);
for (let i = -10; i < 10; i++) plane(scene, 0x7a4b2a, 0.12, 0.6, TX + 1.5 + i * 0.6, 0.012, 0.3, true);
const water = new THREE.Mesh(new THREE.PlaneGeometry(20, 30), new THREE.MeshLambertMaterial({ color: 0x4f9ad0 })); water.rotation.x = -PI / 2; water.position.set(TX + 17.5, 0.03, 0); water.receiveShadow = true; scene.add(water);
plane(scene, INK, 0.06, 30, TX + 7.5, 0.035, 0, true);
const waves = Array.from({ length: 14 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.04), basic(0xffffff)); m.rotation.x = -PI / 2; m.userData = { x0: (i * 1.37) % 9, z: -2.5 + (i * 0.83) % 4.2 }; scene.add(m); return m; });
hills(scene, TX, -12, [[-9, 4.4, 0x9ad17a], [-3, 5.4, 0x86c56c], [4, 4.2, 0x9ad17a], [10, 5.2, 0x86c56c]]);
for (const [x, z, o] of [[-9, -3.2, {}], [-4.2, -2.6, { pine: true, leaf: 0x3f8f5a }], [-1.6, -3.6, { pine: true, leaf: 0x4a9a62 }], [3.2, -2.8, {}], [5.4, -3.8, { pine: true, leaf: 0x3f8f5a }], [-7.2, -4.2, { pine: true, leaf: 0x4a9a62 }]]) k.tree(TX + x, z, o);
for (const [x, y, s] of [[-7, 5.6, 1], [-2.5, 6.6, 0.8], [2.5, 5.9, 1.1], [7.5, 6.8, 0.9], [11, 5.7, 1]]) k.cloud(TX + x, y, -10, s);
k.birds([[TX - 4, 5.6, 0], [TX + 3, 6.1, 4], [TX + 9, 5.4, 8]]);
const travelTrain = makeTrain(scene, { flat: true }); travelTrain.g.position.z = 0.3;
const boxT = makeBox(travelTrain.g); boxT.outer.position.set(-0.95, 0.42 + BH / 2 * 0.85, 0); boxT.outer.scale.setScalar(0.85);
const boat = new THREE.Group(); scene.add(boat);
block(boat, 0x8f2433, -1.3, 1.25, 0.0, 0.3, 0.55, -0.55); block(boat, 0xf4efe2, -1.4, 1.45, 0.3, 0.55, 0.58, -0.58);
plane(boat, INK, 2.85, 0.03, 0.02, 0.42, 0.585);
block(boat, 0xf4efe2, -1.0, 0.45, 0.55, 1.0, 0.42, -0.42); block(boat, 0x8f2433, -1.08, 0.53, 1.0, 1.07, 0.47, -0.47, 0.014);
for (const x of [-0.8, -0.45, -0.1, 0.25]) { plane(boat, INK, 0.22, 0.22, x, 0.78, 0.43); plane(boat, 0xffe9a3, 0.17, 0.17, x, 0.78, 0.432); }
for (const x of [-0.55, -0.1]) { const ch = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 12), flat(0x23262d)), 0.016); ch.position.set(x, 1.5, -0.1); boat.add(ch); const top = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.1, 12), flat(0xc8443a)), 0.012); top.position.set(x, 2.0, -0.1); boat.add(top); }
const paddle = spokeWheel(boat, -0.95, 0.4, 0.62, 0.38);
{ const cover = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24, 0, PI), basic(0xd9a441)); cover.position.set(-0.95, 0.42, 0.6); boat.add(cover); stroke(boat, Array.from({ length: 13 }, (_, i) => [-0.95 + 0.45 * Math.cos(i * PI / 12), 0.42 + 0.45 * Math.sin(i * PI / 12)]), 0.03, false, 0.605); }
const boxB = makeBox(boat); boxB.outer.position.set(0.95, 0.55 + BH / 2 * 0.75, 0); boxB.outer.scale.setScalar(0.75);
const boatSmoke = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf2f2f2, transparent: true })); scene.add(m); return m; });

// =====================================================================================
// FILADELFIA (x = 170): oficina de los abolicionistas
// =====================================================================================
surface(scene, tex.stripes({ a: '#d6e3c4', b: '#c6d6b0', dot: '#a8bf8f' }, 20, 5.5), 40, 12, PX, 6, -2.2);
surface(scene, tex.planks({ base: '#7a4b2a', line: '#4f2f18' }, 40, 1), 40, 1.05, PX, 0.525, -2.19); plane(scene, INK, 40, 0.07, PX, 1.07, -2.18);
surface(scene, tex.planks({ base: '#b07a48', line: '#7f532b', seed: 15 }, 10, 7), 40, 30, PX, 0.001, 0, true);
for (const [r, col] of [[1.7, 0x3f6ea8], [1.56, 0x8f2433], [1.0, 0xd9a441]]) { const rug = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshLambertMaterial({ color: col })); rug.rotation.x = -PI / 2; rug.scale.y = 0.5; rug.position.set(PX, 0.004 + (1.8 - r) * 0.002, 0.2); rug.receiveShadow = true; scene.add(rug); }
windowPic(scene, 0.95, 1.3, PX - 1.6, 2.5, -2.16, { curtain: '#8f2433' }); windowPic(scene, 0.95, 1.3, PX + 1.8, 2.5, -2.16, { curtain: '#8f2433' });
painting(scene, 0.8, 0.6, PX + 0.15, 2.6, -2.16, 2); painting(scene, 0.5, 0.65, PX - 2.8, 2.4, -2.16, 4);
// biblioteca con libros
block(scene, 0x6b4426, PX + 2.6, PX + 3.6, 0, 2.2, -1.75, -2.15);
for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const x = PX + 2.68 + i * 0.15, y = 0.15 + j * 0.52; block(scene, [0x8f2433, 0x3f6ea8, 0x3f8f6b, 0xd9a441, 0x6b4a8a][(i + j * 2) % 5], x, x + 0.12, y, y + 0.36 + 0.06 * ((i * 7 + j) % 3), -1.7, -1.95, 0.008); }
// escritorio con papeles y vela
block(scene, 0x7a4b2a, PX - 3.1, PX - 2.0, 0, 0.74, -1.0, -1.6); block(scene, 0x9a6638, PX - 3.15, PX - 1.95, 0.74, 0.82, -0.95, -1.65);
{ const pap = sign('', 0.3, 0.22); pap.rotation.x = -PI / 2; pap.position.set(PX - 2.7, 0.83, -1.25); scene.add(pap); }
const candle = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), flat(0xf4efe2)), 0.01); candle.position.set(PX - 2.25, 0.91, -1.3); scene.add(candle);
const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), basic(0xffc23a)); flame.scale.y = 1.7; flame.position.set(PX - 2.25, 1.05, -1.3); scene.add(flame);
const flameGlow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.35, depthWrite: false })); flameGlow.position.set(PX - 2.25, 1.05, -1.32); scene.add(flameGlow);
const crowbar = new THREE.Group(); scene.add(crowbar);
{ const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 8), flat(0x5d6772)), 0.008); b.position.y = 0.2; crowbar.add(b); const tip = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 8), flat(0x5d6772)), 0.008); tip.position.set(0.04, 0.45, 0); tip.rotation.z = -1.1; crowbar.add(tip); }

// =====================================================================================
// ESCENARIO (x = 210): Henry cuenta su historia con un panorama que se desenrolla
// =====================================================================================
surface(scene, tex.bricks({ base: '#6b3a3a', mortar: '#4a2626', rows: 10, cols: 5 }, 12, 3.4), 40, 12, GX, 6, -2.0);
surface(scene, tex.planks({ base: '#5a3a22', line: '#3a2414', seed: 31 }, 10, 7), 40, 30, GX, 0.001, 0, true);
const STAGE_Y = 0.5;
block(scene, 0x7a4b2a, GX - 2.6, GX + 2.6, 0, STAGE_Y, 1.0, -1.95);
surface(scene, tex.planks({ base: '#c08a54', line: '#8f5f33', seed: 33 }, 10, 3), 5.2, 2.9, GX, STAGE_Y + 0.003, -0.45, true);
const PANO_TEX = cvTex(2048, 300, (g, W, H) => {
  g.fillStyle = '#9fd0ea'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#7fc24f'; g.fillRect(0, H * 0.62, W, H * 0.38);
  for (let i = 0; i < 8; i++) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(120 + i * 260, 50 + (i % 3) * 15, 60, 18, 0, 0, 7); g.fill(); }
  // casitas, río con barco, ciudad, caja
  for (let i = 0; i < 4; i++) { const x = 80 + i * 120; g.fillStyle = '#c98a5a'; g.fillRect(x, 140, 80, 50); g.fillStyle = '#6b3a3a'; g.beginPath(); g.moveTo(x - 10, 140); g.lineTo(x + 40, 105); g.lineTo(x + 90, 140); g.fill(); }
  g.fillStyle = '#4f9ad0'; g.fillRect(620, 180, 520, 120); g.fillStyle = '#f4efe2'; g.fillRect(760, 160, 200, 30); g.fillStyle = '#23262d'; g.fillRect(820, 110, 16, 50); g.fillRect(870, 110, 16, 50);
  for (let i = 0; i < 6; i++) { g.fillStyle = ['#b5654a', '#d9b48a', '#8f99a5'][i % 3]; g.fillRect(1220 + i * 70, 90 + (i % 2) * 30, 60, 100 - (i % 2) * 30); }
  g.fillStyle = '#c8955a'; g.fillRect(1720, 120, 120, 90); g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.strokeRect(1720, 120, 120, 90); g.beginPath(); g.moveTo(1720, 150); g.lineTo(1840, 150); g.moveTo(1720, 180); g.lineTo(1840, 180); g.stroke();
  g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, 5); g.lineTo(W, 5); g.moveTo(0, H - 5); g.lineTo(W, H - 5); g.stroke();
});
PANO_TEX.wrapS = THREE.RepeatWrapping; PANO_TEX.repeat.set(0.5, 1);
const pano = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), new THREE.MeshBasicMaterial({ map: PANO_TEX })); pano.position.set(GX, STAGE_Y + 1.25, -1.5); scene.add(pano);
const rollers = [-1, 1].map(s => { const r = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 14), flat(0x9a6638)), 0.016); r.position.set(GX + s * 1.22, STAGE_Y + 1.25, -1.45); scene.add(r);
  for (const y of [-0.5, 0, 0.5]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.12), INK); b.position.set(0, y, 0.095); r.add(b); } return r; });
block(scene, 0x23262d, GX - 1.3, GX + 1.3, STAGE_Y, STAGE_Y + 0.55, -1.6, -1.7, 0.012);
const panoSign = sign('PANORAMA', 1.2, 0.3, { bg: '#ffd23a' }); panoSign.position.set(GX, STAGE_Y + 2.15, -1.5); scene.add(panoSign);
const flags = [[-0.95, (g, W, H) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#fff' : '#c8443a'; g.fillRect(0, i * H / 13, W, H / 13 + 1); } g.fillStyle = '#2f4a8a'; g.fillRect(0, 0, W * 0.42, H * 0.54); g.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(14 + (i % 4) * 22, 14 + Math.floor(i / 4) * 24, 4, 0, 7); g.fill(); } }],
  [0.95, (g, W, H) => { g.fillStyle = '#2f4a8a'; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 26; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke(); g.strokeStyle = '#c8443a'; g.lineWidth = 9; g.stroke(); g.fillStyle = '#fff'; g.fillRect(W / 2 - 22, 0, 44, H); g.fillRect(0, H / 2 - 22, W, 44); g.fillStyle = '#c8443a'; g.fillRect(W / 2 - 12, 0, 24, H); g.fillRect(0, H / 2 - 12, W, 24); }]]
  .map(([dx, paint]) => { block(scene, 0xd9a441, GX + dx - 0.02, GX + dx + 0.02, STAGE_Y + 1.6, STAGE_Y + 2.55, -1.45, -1.49, 0.008);
    const f = picture(scene, 0.45, 0.3, 0, 0, 0, (g, W, H) => { paint(g, W, H); g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(0, 0, W, H); }); f.geometry.translate(0.225 * Math.sign(-dx) * -1, 0, 0); f.position.set(GX + dx, STAGE_Y + 2.35, -1.44); return f; });
for (const s of [-1, 1]) {
  const pts = [[0, 0], [0.9, 0], [0.75, 0.9], [0.95, 1.8], [0.7, 2.7], [0.9, 3.5], [0, 3.5]].map(([x, y]) => [s * (2.65 - x), y]);
  const cur = poly(scene, pts, 0xa8243a, 0.05); cur.position.set(GX, STAGE_Y, -0.3);
  for (const x of [0.2, 0.45, 0.65]) stroke(cur, [[s * (2.65 - x), 0.1], [s * (2.65 - x - 0.05), 3.4]], 0.02, false, 0.01);
}
{ const val = poly(scene, [[-2.7, 0], [2.7, 0], [2.7, 0.45], [-2.7, 0.45]], 0xa8243a, 0.05); val.position.set(GX, STAGE_Y + 3.05, -0.28); for (let i = 0; i < 18; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10, PI, PI), basic(0xd9a441)); f.position.set(-2.55 + i * 0.3, 0, 0.012); val.add(f); } }
const footGlow = [];
for (let i = 0; i < 7; i++) { const x = GX - 1.8 + i * 0.6; const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8, 0, PI * 2, 0, PI / 2), basic(0xffe9a3)), 0.012); b.position.set(x, STAGE_Y, 0.85); scene.add(b);
  const gl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.3, depthWrite: false })); gl.position.set(x, STAGE_Y + 0.08, 0.9); scene.add(gl); footGlow.push(gl); }
for (const X of [GX - 1.45, GX + 1.5]) block(scene, 0x6b4426, X - 0.38, X + 0.38, 0, 0.42, 2.05, 2.5);
const box2 = makeBox(scene); box2.outer.position.set(GX + 0.75, STAGE_Y + BH / 2, -0.4); box2.lid.rotation.x = -1.9;

// =====================================================================================
// PERSONAJES
// =====================================================================================
const SKIN_B = 0x8d5a3b;
const henry = makeToon({ shirt: 0xe3d3ad, skin: SKIN_B, hair: 0x1e1428, detail: ['buttons', 'belt'] }); scene.add(henry.root);
const hb = makeToon({ shirt: 0xe3d3ad, skin: SKIN_B, hair: 0x1e1428, detail: ['buttons', 'belt'] });
const mainBox = makeBox(scene, { inside: true }); mainBox.holder.add(hb.root);
const henryS = makeToon({ shirt: 0x2b2f3a, skin: SKIN_B, hair: 0x1e1428, detail: ['collar', 'tie', 'buttons'] }); scene.add(henryS.root);
const wife = makeToon({ shirt: 0x6f8fc0, skin: 0x7a4a30, hair: 0x1e1428, detail: ['apron'], trim: 0xf4efe2 }); scene.add(wife.root);
const kids = [0xd9824a, 0x8fbf6a, 0xe0c050].map(col => { const t = makeToon({ shirt: col, skin: 0x8a5a3c, hair: 0x1e1428, detail: col === 0x8fbf6a ? ['belt'] : ['buttons'] }); scene.add(t.root); return t; });
const driver = makeToon({ shirt: 0x9a5a3a, hair: 0x6b4a2a, hat: { type: 'fedora', color: 0x4a3222, band: 0x23262d }, mustache: true, detail: ['buttons'] }); scene.add(driver.root);
const james = makeToon({ shirt: 0x3f5a3a, skin: 0x6b4630, hair: 0x1e1428, hat: { type: 'top', color: 0x2b2f3a, band: 0x8f2433 }, detail: ['collar', 'tie', 'buttons'] }); scene.add(james.root);
const samuel = makeToon({ shirt: 0x4a6fa5, hair: 0xc98a3a, mustache: true, detail: ['apron', 'collar'], trim: 0xa0703f }); scene.add(samuel.root);
const porter = makeToon({ shirt: 0x8a5a33, hair: 0x23262d, hat: { type: 'kepi', color: 0x2f4a8a }, mustache: true, detail: ['buttons', 'belt'] }); scene.add(porter.root);
const ab = [
  makeToon({ shirt: 0x23262d, hair: 0x9aa0a8, detail: ['collar', 'tie', 'buttons'] }),
  makeToon({ shirt: 0x5a3d6b, skin: 0x7a4a30, hair: 0x1e1428, mustache: true, detail: ['collar', 'tie'] }),
  makeToon({ shirt: 0x6b4a2a, hair: 0x4a3222, hat: { type: 'bowler', color: 0x2b2f3a }, mustache: true, detail: ['buttons', 'belt'] }),
];
ab.forEach(a => scene.add(a.root));
const aud = [
  makeToon({ shirt: 0x3f6ea8, hair: 0x6b4a2a, hat: { type: 'top', color: 0x23262d, band: 0x8f2433 }, detail: ['collar'] }),
  makeToon({ shirt: 0x8f2433, hair: 0xe0b050, detail: ['apron'], trim: 0xf4efe2 }),
];
aud.forEach(a => scene.add(a.root));

// ---------- partículas ----------
const sparks = [0, 1, 2, 3, 4].map(() => glyph('✦', '#fff1a8', 0.3));
const qMark = glyph('?', '#ffd23a', 0.5), bang = glyph('!', '#ffd23a', 0.55), qBox = glyph('?', '#ffd23a', 0.4), qPorter = glyph('?', '#ffd23a', 0.45);
const bangSmall = [0, 1].map(() => glyph('!', '#ff6a3a', 0.16));
const nailFly = [0, 1, 2].map(() => glyph('✦', '#ffffff', 0.18));
const sweat = Array.from({ length: 4 }, () => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const speed = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.025), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
const air = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.032, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
const puffA = k.puffs(5), puffB = k.puffs(5), puffC = k.puffs(4), puffD = k.puffs(4);
const head = { h: V(0, 0, 0), hb: V(0, 0, 0), w: V(0, 0, 0), j: V(0, 0, 0), s: V(0, 0, 0), p: V(0, 0, 0), a1: V(0, 0, 0), a2: V(0, 0, 0), hs: V(0, 0, 0) };

// ---------- trayectorias ----------
const wagonX = t => t < c[2] ? (t < 9.55 ? lerp(RX - 6.5, RX + 0.1, prog(t, 7.0, 8.45)) : RX + 0.1 + 7 * lin(t, 9.55, 11.6) ** 1.4)
  : lerp(TX - 8.6, TX - 5.0, lin(t, c[8] - 0.6, c[8] + 1.6));
const trainXt = t => lerp(TX - 1.6, TX + 3.0, lin(t, c[8] - 0.2, c[9] + 0.1));
const boatXt = t => lerp(TX + 7.4, TX + 10.6, lin(t, c[8] + 0.2, c[9] + 0.1));
const BOX_S = SX + 0.15, BOX_P = PX + 0.1;

// ---------- poses ----------
function poseHenry(t) {
  let p = null;
  if (t >= c[1] && t < c[2]) {                       // Richmond
    if (t < 9.7) {
      const shock = t > vendenT;
      p = { x: RX - 1.15, face: shock ? 0.75 : 0.35, squash: breathe(t) * settle(t, vendenT + 0.1, 0.12), y: hop(t, vendenT + 0.05, 0.12),
        look: shock ? tmp.set(head.w.x, head.w.y, 1.2) : V(RX - 0.6, 1.5, 6), handR: shock ? V(RX - 0.6, 1.35 + 0.05 * Math.sin(t * 8), 0.1) : V(RX - 0.62, 1.05, 0.15), wR: 1,
        ...moodAt(t, [[0, 'happy'], [vendenT + 0.05, 'surprised'], [vendenT + 0.6, 'worried']]) };
    } else if (t < 10.35) p = { ...go(t, 9.7, 10.35, RX - 1.15, RX - 0.4, 0.62), mood: 'worried' };
    else p = { x: RX - 0.4, face: 0.85, squash: settle(t, 10.35) * breathe(t), look: V(wagonX(t), 1.6, -1.7), handR: V(RX + 0.05, 1.5 + 0.04 * Math.sin(t * 6), -0.1), wR: 1, handL: V(RX - 0.5, 1.0, 0.25), wL: 1, mood: 'worried', tilt: 0.1 };
  } else if (t >= c[2] && t < climbT + 0.7) {        // taller
    const x0 = SX - 0.75;
    if (t < c[3]) {
      const think = t < dentroT;
      p = { x: x0, face: 0.4, y: hop(t, dentroT, 0.16), squash: settle(t, dentroT + 0.4, 0.12) * breathe(t), look: think ? V(x0 - 0.5, 2.4, 3) : V(BOX_S, 0.6, 1.5),
        handL: think ? V(x0 + 0.05, 1.18, 0.33) : undefined, wL: 1, tilt: think ? 0.15 : 0, ...moodAt(t, [[0, 'worried'], [dentroT, 'surprised'], [dentroT + 0.6, 'neutral']]) };
    } else if (t < climbT) {
      const lookAt = t < samT ? head.j : t < mideT ? head.s : V(BOX_S, 0.7, 0.3);
      p = { x: x0, face: t < samT ? -0.3 : 0.5, squash: breathe(t), y: hop(t, jamesT + 0.3, 0.1) + hop(t, samT + 0.4, 0.1), look: tmp.copy(lookAt), ...moodAt(t, [[0, 'neutral'], [jamesT, 'happy'], [mideT, 'neutral'], [metroT, 'worried']]) };
      if (t > mideT) { p.handR = V(x0 + 0.4, 1.0, 0.3); p.wR = 0.8; }
    } else {                                         // se mete en la caja
      const u = lin(t, climbT + 0.25, climbT + 0.65);
      if (t < climbT + 0.25) p = { ...go(t, climbT, climbT + 0.25, x0, BOX_S - 0.62), mood: 'effort' };
      else p = { x: lerp(BOX_S - 0.62, BOX_S, u), y: 0.9 * Math.sin(PI * Math.min(u * 1.3, 1)) - 1.3 * Math.max(0, u - 0.55) / 0.45, face: PI / 2 - 0.6, crouch: 0.8 * u, look: V(BOX_S + 1, 0.5, 2), mood: 'effort', handL: V(BOX_S - 0.3, 1.9, 0.2), handR: V(BOX_S + 0.1, 1.9, 0.2), wL: 1 - u, wR: 1 - u };
      if (p.y < -0.85) { henry.root.visible = false; return; }
    }
  } else if (t >= riseT && t < c[11]) {              // Filadelfia: sale de la caja
    if (t < c[10] + 0.1) {
      const u = back(lin(t, riseT, riseT + 0.4)), wave = t > saludaT - 0.2;
      p = { x: BOX_P, z: 0, y: lerp(-1.0, 0.05, u), face: 0.15, squash: settle(t, riseT + 0.4, 0.16) * breathe(t), look: wave ? V(BOX_P + 0.2, 1.5, 6) : V(BOX_P - 1, 1.5, 2.6),
        handL: V(BOX_P - 0.35, 2.0, 0.1), wL: win(t, riseT + 0.35, saludaT - 0.1, 0.15), handR: wave ? V(BOX_P + 0.42 + 0.08 * Math.sin(t * 10), 1.85, 0.25) : V(BOX_P + 0.35, 2.0, 0.1), wR: Math.max(win(t, riseT + 0.35, saludaT - 0.1, 0.15), back(lin(t, saludaT - 0.2, saludaT + 0.1))),
        ...moodAt(t, [[0, 'surprised'], [riseT + 0.5, 'happy']]) };
    } else if (t < c[10] + 0.75) {
      const u = lin(t, c[10] + 0.1, c[10] + 0.75);
      p = { x: lerp(BOX_P, PX - 0.8, u), z: lerp(0, 0.35, u), y: 0.05 + 0.6 * Math.sin(PI * u) - 0.05 * u, face: -PI / 2 + 0.3, crouch: 0.3 * Math.sin(PI * u), mood: 'happy', look: V(PX - 1.5, 1.4, 2) };
    } else {
      const point = back(lin(t, box2T - 0.2, box2T + 0.1));
      p = { x: PX - 0.8, z: 0.35, face: 0.45, squash: settle(t, c[10] + 0.75, 0.14) * breathe(t), y: hop(t, box2T, 0.14), look: t > box2T ? V(PX - 0.1, 1.2, 4) : V(PX - 0.6, 1.5, 6),
        handR: V(PX - 0.4, 1.1, 0.45), wR: point, mood: 'happy' };
    }
  } else { henry.root.visible = false; return; }
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, p.z || 0, -1); p.wL = 0.8; }
  henry.root.visible = true; henry.pose(alive({ blink: blinkAt(t, 0), ...p }, t, 0)); henry.head.getWorldPosition(head.h);
}

function poseHB(t) {                                // Henry chiquito, dentro de la caja
  const inShop = t >= adentroT + 0.25 && t < cierranT + 0.4, inDepot = t >= henT - 0.4 && t < 36.6;
  hb.root.visible = inShop || inDepot; if (!hb.root.visible) return;
  mainBox.outer.updateMatrixWorld(true);
  const L = (x, y, z) => W3(mainBox.holder, x, y, z, V(0, 0, 0));
  let p;
  if (inShop) {
    const lookAt = t < aguaT ? L(0, 1.4, 6) : t < galT ? W3(mainBox.inner, 0.3, 0.15, -0.1, V(0, 0, 0)) : t < aguT ? W3(mainBox.inner, 0.3, 0.1, 0.15, V(0, 0, 0)) : mainBox.holePos();
    p = { crouch: 1, face: 0.1, squash: settle(t, adentroT + 0.3, 0.2) * breathe(t), look: lookAt, handL: L(-0.2, 0.6, 0.36), handR: t > aguaT && t < galT + 0.3 ? L(0.45, 0.75, 0.3) : L(0.2, 0.6, 0.36), wL: 1, wR: 1,
      ...moodAt(t, [[0, 'effort'], [adentroT + 0.6, 'neutral'], [aguT, 'happy'], [cierranT - 0.1, 'worried']]) };
  } else {
    const still = t > mueveT - 0.1, fl = !still ? 1 : 0;
    p = { crouch: 1, face: 0, squash: settle(t, flipT + flipD, 0.2) * breathe(t), look: L(0, 1.6, 6),
      handL: still ? L(-0.2, 0.6, 0.36) : L(-0.38, 1.0 + 0.15 * Math.sin(t * 9), 0.3), handR: still ? L(0.2, 0.6, 0.36) : L(0.38, 1.0 + 0.15 * Math.sin(t * 9 + 2), 0.3), wL: 1, wR: 1,
      tilt: 0.08 * Math.sin(t * 7) * fl, ...moodAt(t, [[0, 'neutral'], [flipT + 0.2, 'surprised'], [mueveT - 0.1, 'effort']]) };
  }
  hb.pose(alive({ blink: blinkAt(t, 1.3), ...p }, t, 3)); hb.head.getWorldPosition(head.hb);
}

function poseFamily(t) {
  const on = t >= c[1] && t < c[2];
  [wife, ...kids].forEach((f, i) => {
    f.root.visible = on; if (!on) return;
    const x0 = [RX - 0.25, RX + 0.3, RX + 0.7, RX + 1.1][i], slot = [-0.72, -0.36, -0.02, 0.3][i], sz = [-1.75, -1.45, -1.9, -1.45][i];
    const tc = vendenT + 0.15 + 0.2 * i, u = lin(t, tc, tc + 0.45), wx = wagonX(t);
    let p;
    if (t < tc) p = { x: x0, z: 0.1, face: i ? 0.2 * Math.sin(i) : -0.5, squash: breathe(t, i), y: i && t < vendenT ? hop(t, 6.2 + i * 0.55, 0.12) + hop(t, 7.6 + i * 0.4, 0.1) : 0,
      look: i ? tmp2.copy(head.h) : V(RX - 0.6, 1.5, 6), ...moodAt(t, [[0, 'happy'], [vendenT, 'surprised']]) };
    else if (u < 1) p = { x: lerp(x0, wx + slot, u), z: lerp(0.1, sz, u), y: 0.6 * u + 0.5 * Math.sin(PI * u), face: PI - 0.3, crouch: 0.3 * Math.sin(PI * u), mood: 'worried' };
    else p = { x: wx + slot, z: sz, y: 0.6, face: -0.55, squash: breathe(t, i), look: tmp2.copy(head.h), mood: 'worried',
      handR: V(wx + slot + 0.25, 0.6 + (i ? 1.0 : 1.75) + 0.1 * Math.sin(t * 7 + i), sz + 0.3), wR: i % 2 ? 0.7 : 1 };
    f.pose(alive({ blink: blinkAt(t, 0.4 + i * 0.7), ...p }, t, 2 + i));
    if (i) f.root.scale.multiplyScalar(0.58);
    if (!i) f.head.getWorldPosition(head.w);
  });
}

function poseDriver(t) {
  const onR = t >= c[1] && t < c[2], onT = t >= c[8] && t < c[9];
  driver.root.visible = onR || onT; if (!driver.root.visible) return;
  const wx = wagonX(t), z = t < c[2] ? -1.7 : 0.3;
  driver.pose(alive({ x: wx + 0.62, y: 0.52, z, face: PI / 2 - 0.5, crouch: 1, look: V(wx + 3, 1.6, z + 2.5), handL: V(wx + 1.0, 1.0, z + 0.15), handR: V(wx + 1.0, 1.0, z - 0.1), blink: blinkAt(t, 2), mood: 'neutral' }, t, 6));
}

function poseSmiths(t) {
  const on = t >= c[3] && t < c[6];
  james.root.visible = samuel.root.visible = on; hammers.forEach(h => { h.visible = on && t > cierranT - 0.1 && t < estadoT; });
  if (!on) return;
  // golpes de martillo: Samuel y James se turnan
  const sHits = [clavosT - 0.1, clavosT + 0.6], jHits = [clavosT + 0.25, clavosT + 0.95];
  const strike = (hits, t) => Math.max(...hits.map(h => win(t, h - 0.18, h + 0.05, 0.12)));
  // James
  let p;
  if (t < jamesT + 0.5) p = { ...go(t, c[3], jamesT + 0.5, SX - 3.2, SX - 1.6), mood: 'happy' };
  else if (t < cierranT) p = { x: SX - 1.6, face: 0.55, squash: settle(t, jamesT + 0.5) * breathe(t, 1), y: hop(t, jamesT + 0.6, 0.12) + hop(t, climbT + 0.4, 0.1), look: t < climbT ? tmp.copy(head.h) : V(BOX_S, 0.7, 0.3),
    handR: t < samT ? V(SX - 1.3, 1.75 + 0.08 * Math.sin(t * 10), 0.2) : undefined, wR: back(lin(t, jamesT + 0.5, jamesT + 0.8)) * (t < samT ? 1 : 0), ...moodAt(t, [[0, 'happy'], [climbT + 0.3, 'surprised'], [aguaT, 'neutral']]) };
  else if (t < cierranT + 0.5) p = { ...go(t, cierranT, cierranT + 0.5, SX - 1.6, SX - 0.8), mood: 'neutral' };
  else { const s = strike(jHits, t), wave = t > estadoT - 0.2;
    p = { x: SX - 0.8, face: wave ? 0.3 : 1.0, squash: settle(t, cierranT + 0.5) * breathe(t, 1), lean: 0.2 * (1 - (wave ? 1 : 0)), look: wave ? V(SX - 0.4, 1.5, 6) : V(BOX_S - 0.2, 0.75, 0.3),
      handR: wave ? V(SX - 0.45 + 0.08 * Math.sin(t * 9), 1.75, 0.3) : V(SX - 0.3, 1.25 - 0.35 * s, 0.25), wR: 1, ...moodAt(t, [[0, 'effort'], [estadoT - 0.2, 'happy']]) }; }
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, 0, -1, 1); p.wL = 0.7; }
  james.pose(alive({ blink: blinkAt(t, 0.8), ...p }, t, 4)); james.head.getWorldPosition(head.j);
  if (hammers[1].visible) { james.hand(1, hammers[1].position); hammers[1].rotation.z = 0.9 - 1.4 * strike(jHits, t); }
  // Samuel
  let q;
  const sx = SX + 1.2;
  if (t < samT + 0.5) q = { ...go(t, Math.min(c[3] + 0.4, samT - 0.6), samT + 0.5, SX + 3.2, sx), mood: 'happy', z: 0 };
  else if (t < cierranT) q = { x: sx, face: -0.55, squash: settle(t, samT + 0.5) * breathe(t, 2), y: hop(t, samT + 0.6, 0.12) + hop(t, climbT + 0.45, 0.1), look: t < mideT ? tmp.copy(head.h) : V(BOX_S, 0.7, 0.3),
    handR: t > mideT && t < metroT + 0.6 ? V(sx - 0.45, 0.95, 0.25) : undefined, wR: 1, ...moodAt(t, [[0, 'happy'], [climbT + 0.3, 'surprised'], [aguaT, 'happy']]) };
  else { const s = strike(sHits, t), wave = t > estadoT - 0.2;
    q = { x: sx - 0.2, face: wave ? -0.3 : -1.0, squash: breathe(t, 2), lean: 0.2 * (wave ? 0 : 1), look: wave ? V(SX + 0.4, 1.5, 6) : V(BOX_S + 0.3, 0.75, 0.3),
      handL: wave ? V(sx - 0.55 + 0.08 * Math.sin(t * 9 + 1), 1.75, 0.3) : V(sx - 0.65, 1.25 - 0.35 * s, 0.25), wL: 1, ...moodAt(t, [[0, 'effort'], [estadoT - 0.2, 'happy']]) }; }
  if (q.handL === undefined && !q.walk) { q.handL = talk(t, q.x, 0, -1, 2); q.wL = 0.7; }
  if (q.handR === undefined && !q.walk) { q.handR = talk(t, q.x, 0, 1, 3); q.wR = 0.7; }
  samuel.pose(alive({ blink: blinkAt(t, 1.6), ...q }, t, 5)); samuel.head.getWorldPosition(head.s);
  if (hammers[0].visible) { samuel.hand(0, hammers[0].position); hammers[0].rotation.z = -0.9 + 1.4 * strike(sHits, t); }
}

function posePorter(t) {
  const on = t >= c[6] && t < c[8]; porter.root.visible = on; if (!on) return;
  const x = DX + 1.15, b = mainBox.outer;
  let p;
  if (t < c[6] + 0.75) p = { ...go(t, c[6], c[6] + 0.75, DX + 3.4, x), mood: 'neutral' };
  else if (t < flipT - 0.15) p = { x, face: -0.4, squash: settle(t, c[6] + 0.75) * breathe(t), look: V(DX + 0.2, 0.8, 0.4), handL: V(x - 0.1, 0.75, 0.25), wL: 0.8, mood: 'neutral', tilt: 0.1 };
  else if (t < flipT + flipD + 0.3) { b.updateMatrixWorld(true);
    p = { x, face: -1.0, lean: 0.25, crouch: 0.3, squash: breathe(t), look: V(DX + 0.2, 0.6, 0.3), handL: W3(b, BW / 2, BH / 2, 0.15, V(0, 0, 0)), handR: W3(b, BW / 2, 0, 0.25, V(0, 0, 0)), wL: 1, wR: 1, mood: 'effort' }; }
  else { const sus = t > 36.2;
    p = { x, face: sus ? -0.6 : 0.3, squash: settle(t, flipT + flipD + 0.3) * breathe(t), y: hop(t, 36.25, 0.1), look: sus ? V(DX + 0.2, 0.5, 0.3) : V(DX + 1.0, 1.5, 6), tilt: sus ? 0.22 : 0,
      handL: sus ? V(x - 0.05, 1.75, 0.15) : V(x - 0.15 + 0.06 * Math.sin(t * 14), 0.95, 0.35), handR: V(x + 0.15 - 0.06 * Math.sin(t * 14), 0.95, 0.35), wL: 1, wR: sus ? 0 : 1, ...moodAt(t, [[0, 'happy'], [36.2, 'sly']]) }; }
  porter.pose(alive({ blink: blinkAt(t, 2.2), ...p }, t, 7)); porter.head.getWorldPosition(head.p);
}

function poseAbol(t) {
  const on = t >= c[9] && t < c[11];
  ab.forEach((a, i) => {
    a.root.visible = on && i < 2; if (!a.root.visible) return;
    const X = [PX - 0.95, PX + 1.15, PX + 1.75][i], Z = [0.1, 0.1, -0.9][i];
    const surprise = t > riseT, clap = t > c[10] + 0.6;
    let p;
    if (i === 0) {
      const xx = t < c[10] - 0.3 ? X : lerp(X, PX - 1.6, prog(t, c[10] - 0.3, c[10] + 0.1));
      const knock = win(t, c[9] + 0.5, c[9] + 1.6, 0.1) * Math.abs(Math.sin((t - c[9]) * 9)), pry = win(t, abrenT - 0.55, abrenT + 0.25, 0.15);
      p = { x: xx, z: Z, face: 0.9, lean: 0.18 * pry, squash: breathe(t, i), look: surprise ? tmp.copy(head.h) : V(BOX_P, 0.7, 0.3),
        handR: pry > 0.05 ? V(BOX_P - 0.38, 0.75 + 0.25 * prog(t, abrenT - 0.1, abrenT + 0.2), 0.32) : knock > 0 ? V(BOX_P - 0.42, 0.62 + 0.05 * knock, 0.34) : undefined, wR: Math.max(pry, knock > 0 ? 1 : 0) };
    } else p = { x: X, z: Z, face: i === 1 ? -0.7 : 0.2, squash: breathe(t, i), look: surprise ? tmp.copy(head.h) : V(BOX_P, 0.7, 0.3) };
    p.y = hop(t, riseT + 0.35 + 0.1 * i, 0.18) + (clap ? hop(t, box2T + 0.1 * i, 0.1) : 0);
    Object.assign(p, moodAt(t, [[0, i === 1 ? 'worried' : 'neutral'], [riseT + 0.2, 'surprised'], [saludaT + 0.2, 'happy']]));
    if (clap && i < 2) { const s = 0.06 * Math.abs(Math.sin(t * 12 + i)); p.handL = V(p.x - 0.05 - s, 1.12, Z + 0.32); p.handR = V(p.x + 0.05 + s, 1.12, Z + 0.32); p.wL = p.wR = 1; }
    if (p.handL === undefined) { p.handL = talk(t, p.x, Z, -1, i * 2); p.wL = 0.6; }
    a.pose(alive({ blink: blinkAt(t, 0.3 + i * 0.8), ...p }, t, 8 + i * 1.7));
    if (i === 0) a.head.getWorldPosition(head.a1); if (i === 1) a.head.getWorldPosition(head.a2);
  });
  crowbar.visible = on && t > c[9] + 1.6 && t < abrenT + 0.6;
  if (crowbar.visible) { ab[0].hand(1, crowbar.position); crowbar.rotation.z = -0.4 - 0.6 * prog(t, abrenT - 0.1, abrenT + 0.2); }
}

function poseStage(t) {
  const on = t >= c[11]; henryS.root.visible = on; aud.forEach(a => { a.root.visible = on; });
  if (!on) return;
  const x = GX - 0.35 + 0.25 * Math.sin((t - c[11]) * 0.9), jump = t > esclT;
  henryS.pose(alive({ x, y: STAGE_Y + hop(t, esclT + 0.1, 0.2), z: -0.2, face: 0.2 * Math.sin(t * 0.9), squash: settle(t, esclT + 0.5, 0.14) * breathe(t), look: V(x + 0.2, 1.9, 6),
    handL: jump ? V(x - 0.35, STAGE_Y + 1.95, 0) : talk(t, x, -0.2, -1, 0).setY(STAGE_Y + 1.02 + 0.14 * Math.sin(t * 7.1)), handR: t > contraT - 0.4 && !jump ? V(GX - 1.0, STAGE_Y + 1.45, -0.9) : jump ? V(x + 0.35, STAGE_Y + 1.95, 0) : talk(t, x, -0.2, 1, 2).setY(STAGE_Y + 1.02 + 0.14 * Math.sin(t * 7.1 + 2)), wL: 0.9, wR: 1,
    blink: blinkAt(t, 0.5), ...moodAt(t, [[0, 'happy'], [contraT - 0.3, 'neutral'], [esclT, 'happy']]) }, t, 11));
  henryS.head.getWorldPosition(head.hs);
  aud.forEach((a, i) => {
    const X = [GX - 1.45, GX + 1.5][i], clap = t > esclT;
    const s = 0.06 * Math.abs(Math.sin(t * 13 + i));
    a.pose(alive({ x: X, z: 2.2, face: PI + [0.55, -0.55][i], crouch: 0.6, squash: breathe(t, i), y: clap ? hop(t, esclT + 0.15 + 0.1 * i, 0.12) : 0, look: tmp.copy(head.hs), blink: blinkAt(t, i),
      handL: clap ? V(X - 0.04 - s, 1.0, 2.2 - 0.3) : undefined, handR: clap ? V(X + 0.04 + s, 1.0, 2.2 - 0.3) : undefined, mood: 'happy' }, t, 12 + i));
  });
}

// ---------- cámara ----------
const shots = [
  // andén (gancho)
  { t: 0, pos: [0.2, 1.55, 7.8], look: [0.2, 1.3, 0] },
  { t: 1.0, pos: [0.25, 1.35, 5.4], look: [0.25, 0.9, 0] },
  { t: 2.0, pos: [0.2, 1.0, 3.6], look: [0.2, 0.55, 0] },
  { t: correoT - 0.2, pos: [0.3, 0.8, 2.6], look: [0.3, 0.45, 0] },
  { t: 4.55, pos: [0.02, 0.38, 1.75], look: [0.02, 0.28, 0] },
  // Richmond
  { t: c[1], pos: [RX - 0.1, 1.55, 8.4], look: [RX - 0.1, 1.45, 0], cut: true },
  { t: richT + 0.45, pos: [RX - 0.55, 1.5, 6.2], look: [RX - 0.55, 1.35, 0] },
  { t: vendenT, pos: [RX + 0.1, 1.7, 9.2], look: [RX + 0.1, 1.6, -0.5] },
  { t: 9.9, pos: [RX + 0.9, 1.75, 9.6], look: [RX + 0.9, 1.7, -1], glide: true },
  { t: 10.4, pos: [RX - 0.35, 1.5, 4.4], look: [RX - 0.25, 1.4, 0] },
  // taller
  { t: c[2], pos: [SX - 0.55, 1.45, 5.0], look: [SX - 0.55, 1.3, 0], cut: true },
  { t: dentroT - 0.1, pos: [SX - 0.25, 1.4, 6.2], look: [SX - 0.25, 1.05, 0] },
  { t: c[3], pos: [SX - 0.2, 1.55, 8.6], look: [SX - 0.2, 1.4, 0] },
  { t: jamesT + 0.4, pos: [SX - 1.0, 1.5, 5.8], look: [SX - 1.0, 1.35, 0] },
  { t: samT, pos: [SX + 0.3, 1.5, 7.4], look: [SX + 0.3, 1.35, 0] },
  { t: samT + 0.9, pos: [SX + 0.85, 1.5, 5.2], look: [SX + 0.85, 1.4, 0] },
  { t: mideT - 0.3, pos: [BOX_S, 1.55, 3.4], look: [BOX_S, 0.7, 0] },
  { t: metroT - 0.2, pos: [BOX_S, 1.2, 2.6], look: [BOX_S, 0.75, 0] },
  { t: climbT - 0.1, pos: [SX - 0.15, 1.5, 6.2], look: [SX - 0.15, 1.0, 0] },
  { t: adentroT + 0.4, pos: [BOX_S, 0.75, 2.5], look: [BOX_S, 0.42, 0] },
  { t: galT - 0.1, pos: [BOX_S + 0.08, 0.55, 2.0], look: [BOX_S + 0.08, 0.32, 0] },
  { t: aguT - 0.1, pos: [BOX_S + 0.02, 0.62, 2.0], look: [BOX_S + 0.02, 0.36, 0] },
  { t: c[5], pos: [SX + 0.1, 1.85, 6.2], look: [SX + 0.1, 0.95, 0] },
  { t: filaT - 0.5, pos: [BOX_S + 0.05, 0.95, 2.5], look: [BOX_S + 0.05, 0.45, 0] },
  { t: estadoT - 0.3, pos: [SX - 0.05, 1.55, 7.8], look: [SX - 0.05, 1.3, 0] },
  { t: estadoT + 0.6, pos: [SX + 0.6, 1.55, 5.4], look: [SX + 0.6, 1.4, 0] },
  // andén: lo dan vuelta
  { t: c[6], pos: [0.55, 1.5, 6.6], look: [0.55, 1.2, 0], cut: true },
  { t: esteT - 0.3, pos: [0.2, 0.75, 2.5], look: [0.2, 0.45, 0] },
  { t: vueltaT - 0.25, pos: [0.55, 1.3, 5.4], look: [0.55, 0.9, 0] },
  { t: henT, pos: [0.2, 0.5, 2.3], look: [0.2, 0.38, 0] },
  { t: cabezaT, pos: [0.18, 0.42, 1.65], look: [0.18, 0.36, 0] },
  { t: c[7], pos: [0.2, 0.6, 2.6], look: [0.2, 0.4, 0] },
  { t: ojosT, pos: [0.16, 0.38, 1.2], look: [0.16, 0.32, 0] },
  { t: mueveT - 0.1, pos: [0.2, 0.45, 2.0], look: [0.2, 0.36, 0] },
  { t: 36.25, pos: [0.6, 1.35, 5.4], look: [0.6, 1.0, 0] },
  { t: 37.0, pos: [0.65, 1.25, 4.2], look: [0.65, 0.95, 0] },
  // viaje
  { t: c[8], pos: [TX - 7.0, 1.5, 7.2], look: [TX - 7.0, 1.1, 0], cut: true },
  { t: trenT, pos: [TX - 0.3, 1.6, 7.8], look: [TX - 0.3, 1.1, 0], glide: true },
  { t: barcoT, pos: [TX + 8.3, 1.6, 8.0], look: [TX + 8.3, 1.0, 0], glide: true },
  { t: horasT, pos: [TX + 9.8, 1.35, 5.8], look: [TX + 9.8, 1.0, 0] },
  // Filadelfia
  { t: c[9], pos: [PX + 0.2, 1.6, 8.8], look: [PX + 0.2, 1.4, 0], cut: true },
  { t: c[9] + 0.9, pos: [PX + 0.05, 1.2, 4.6], look: [PX + 0.05, 0.9, 0] },
  { t: abrenT - 0.45, pos: [PX - 0.3, 1.4, 5.0], look: [PX - 0.3, 1.0, 0] },
  { t: saleT - 0.1, pos: [PX + 0.05, 1.5, 6.6], look: [PX + 0.05, 1.3, 0] },
  { t: comoT - 0.15, pos: [BOX_P, 1.6, 3.8], look: [BOX_P, 1.5, 0] },
  { t: cabT, pos: [PX + 0.4, 1.5, 6.0], look: [PX + 0.4, 1.35, 0] },
  { t: c[10], pos: [PX - 0.25, 1.55, 8.4], look: [PX - 0.25, 1.3, 0] },
  { t: nameT + 0.4, pos: [PX - 0.7, 1.5, 4.2], look: [PX - 0.7, 1.4, 0] },
  { t: box2T - 0.25, pos: [PX - 0.35, 1.3, 5.8], look: [PX - 0.35, 1.0, 0] },
  // escenario
  { t: c[11], pos: [GX, 1.95, 8.8], look: [GX, 1.65, 0], cut: true },
  { t: ingT - 0.2, pos: [GX + 0.3, 1.9, 6.8], look: [GX + 0.3, 1.75, 0] },
  { t: ingT + 0.8, pos: [GX - 0.15, 1.95, 6.4], look: [GX - 0.15, 1.75, 0] },
  { t: esclT - 0.4, pos: [GX - 0.3, 2.0, 4.6], look: [GX - 0.3, 1.9, 0] },
];
k.shots(shots, { move: 0.2 });
k.follow(t => t < c[1] ? V(0.2, 0.4, 0) : head.h);

// ---------- carteles ----------
tag({ text: '1849', big: true, off: BIG, from: 0.15, to: 2.4 });
tag({ text: '¡Por correo!', big: true, off: BIG, from: correoT - 0.15, to: 4.65 });
tag({ text: 'Para ser libre', big: true, off: BIG, from: libreT - 0.3, to: c[1] });
tag({ text: 'Richmond', big: true, off: BIG, from: c[1] + 0.15, to: vendenT - 0.1 });
tag({ text: 'Henry Brown', at: () => head.h, off: [90, -330], from: c[1] + 0.6, to: vendenT + 0.3 });
tag({ text: 'Su esposa y sus 3 hijos', at: () => head.w, off: [60, -290], from: vendenT + 0.8, to: 10.4 });
tag({ text: '¡En una caja!', big: true, off: BIG, from: dentroT, to: c[3] });
tag({ text: 'James Smith, hombre libre', at: () => head.j, off: [180, -320], from: jamesT, to: samT });
tag({ text: 'Samuel Smith, zapatero', at: () => head.s, off: [-170, -320], from: samT, to: c[4] });
tag({ text: 'Menos de 1 metro', big: true, off: BIG, from: metroT - 0.4, to: adentroT });
tag({ text: 'Agua', at: () => jug.position, off: [60, -330], from: aguaT, to: c[5] - 0.1 });
tag({ text: 'Galletas', at: () => biscuits.position, off: [-220, 150], from: galT, to: c[5] - 0.1 });
tag({ text: 'Agujero para respirar', at: () => mainBox.holePos(), off: [180, 330], from: aguT, to: c[5] - 0.1 });
tag({ text: 'Clavos', at: () => mainBox.nails[0].getWorldPosition(tmp3), off: [200, -200], from: clavosT + 0.2, to: filaT - 0.4 });
tag({ text: '→ Filadelfia', big: true, off: BIG, from: filaT - 0.1, to: estadoT });
tag({ text: 'Estado libre', big: true, off: BIG, from: estadoT, to: c[6] });
tag({ text: '“Este lado arriba”', big: true, off: BIG, from: esteT - 0.15, to: vueltaT });
tag({ text: '¡Cabeza abajo!', big: true, off: BIG, from: cabezaT - 0.15, to: c[7] });
tag({ text: '¡Ni un ruido!', big: true, off: BIG, from: mueveT - 0.2, to: 36.2 });
tag({ text: 'Carreta', at: () => wagon.g.position.clone().setY(1.2).setX(wagon.g.position.x + 1.2), off: [0, -330], from: c[8] + 0.1, to: trenT - 0.05 });
tag({ text: 'Tren', at: () => travelTrain.g.position.clone().setY(1.7).setX(travelTrain.g.position.x + 0.9), off: [0, -330], from: trenT, to: barcoT - 0.05 });
tag({ text: 'Barco de vapor', at: () => boat.position.clone().setY(1.9), off: [0, -300], from: barcoT, to: horasT - 0.1 });
tag({ text: '27 horas', big: true, off: BIG, from: horasT - 0.1, to: c[9] });
tag({ text: 'Filadelfia', big: true, off: BIG, from: c[9] + 0.1, to: abrenT - 0.3 });
tag({ text: 'Abolicionistas', at: () => head.a2, off: [-60, -300], from: c[9] + 1.0, to: saleT - 0.2 });
tag({ text: '¿Cómo están,', big: true, off: [540, 330], from: comoT - 0.1, to: c[10] });
tag({ text: 'caballeros?', big: true, off: [540, 425], from: cabT - 0.1, to: c[10] });
tag({ text: 'Henry “Box” Brown', big: true, off: BIG, from: nameT, to: box2T - 0.1 });
tag({ text: 'BOX = CAJA', big: true, off: BIG, from: box2T - 0.1, to: c[11] });
tag({ text: 'Estados Unidos', big: true, off: [540, 330], from: recorreT, to: contraT - 0.2 });
tag({ text: 'e Inglaterra', big: true, off: [540, 425], from: ingT - 0.1, to: contraT - 0.2 });
tag({ text: 'Su panorama', at: () => tmp2.set(GX - 0.85, STAGE_Y + 1.5, -1.5), off: [-60, -330], from: contraT - 0.3, to: END + 1 });
tag({ text: '¡Libre!', big: true, off: BIG, from: esclT - 0.1, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'boom', 0.5);
sfx(2.25, 'thud', 0.35); sfx(3.25, 'thud', 0.35);
sfx(dentroT + 0.3, 'thud', 0.7);
sfx(climbT + 0.3, 'whoosh', 0.8); sfx(climbT + 0.65, 'thud', 0.6);
sfx(cierranT + 0.35, 'thud', 0.8);
for (const h of [clavosT - 0.1, clavosT + 0.25, clavosT + 0.6, clavosT + 0.95]) sfx(h, 'clang', 0.45);
sfx(filaT - 0.55, 'tap', 0.7);
sfx(flipT + flipD, 'riser_to', 1); sfx(flipT + flipD, 'thud', 0.9);
sfx(horasT, 'boom', 0.45);
sfx(c[9] + 0.55, 'tap', 0.6); sfx(c[9] + 0.9, 'tap', 0.6); sfx(c[9] + 1.25, 'tap', 0.6);
sfx(abrenT + 0.1, 'clang', 0.5);
sfx(riseT + 0.3, 'riser_to', 1); sfx(riseT + 0.3, 'boom', 0.5);
sfx(c[10] + 0.75, 'thud', 0.5); sfx(box2T, 'pop', 0.7);
sfx(esclT, 'boom', 0.45);

// =====================================================================================
// CUADRO
// =====================================================================================
k.run(t => {
  // --- caja principal: dónde está en cada momento ---
  const B = mainBox, O = B.outer;
  let place = null;
  if (t < c[1]) place = 'depot'; else if (t >= c[2] && t < c[6]) place = 'shop'; else if (t >= c[6] && t < c[8]) place = 'depot'; else if (t >= c[9] && t < c[11]) place = 'phila';
  O.visible = !!place && !(place === 'shop' && t < dentroT + 0.25);
  O.rotation.set(0, 0, 0); O.scale.setScalar(1); B.lid.rotation.x = 0; B.lid.position.y = BH; B.eyes.visible = false; B.card.visible = true;
  B.nails.forEach(n => { n.visible = true; n.scale.set(1, 0.55, 1); });
  let front = 1;
  if (place === 'depot' && t < c[1]) {
    const wig = Math.exp(-6 * Math.max(0, t - 2.2)) * Math.sin((t - 2.2) * 30) * (t > 2.2 ? 1 : 0) + Math.exp(-6 * Math.max(0, t - 3.2)) * Math.sin((t - 3.2) * 30) * (t > 3.2 ? 1 : 0);
    O.position.set(DX + 0.2, BH / 2 + 0.02 * Math.abs(wig), 0); O.rotation.z = 0.04 * wig;
    B.eyes.visible = t > 4.4; const bl = blinkAt(t, 0.7); B.eyes.scale.set(1, Math.max(1 - bl, 0.1), 1);
    B.pupils.forEach((p, i) => { p.position.x = (i ? 0.016 : -0.016) + 0.004 * Math.sin(t * 2.3); });
  } else if (place === 'shop') {
    const s = back(lin(t, dentroT + 0.25, dentroT + 0.55));
    O.position.set(BOX_S, BH / 2, 0); O.scale.setScalar(Math.max(s, 0.001));
    B.lid.rotation.x = lerp(-1.95, 0, back(lin(t, cierranT - 0.05, cierranT + 0.35)));
    B.card.visible = t > filaT - 0.6; B.card.scale.setScalar(Math.max(back(lin(t, filaT - 0.6, filaT - 0.35)), 0.001));
    const hits = [clavosT - 0.1, clavosT + 0.25, clavosT + 0.6, clavosT + 0.95];
    B.nails.forEach((n, i) => { const kk = back(lin(t, hits[i], hits[i] + 0.15)); n.visible = kk > 0.01; n.scale.set(kk, 0.55 * kk, kk); });
    front = 1 - 0.8 * win(t, adentroT + 0.4, cierranT - 0.15, 0.3);
    O.rotation.z = 0.02 * Math.sin(t * 20) * win(t, clavosT - 0.15, clavosT + 1.1, 0.05) * 0.5;
  } else if (place === 'depot') {
    const u = lin(t, flipT, flipT + flipD), turned = back(u);
    O.position.set(DX + 0.2 - 0.1 * Math.sin(PI * u), BH / 2 + 0.35 * Math.sin(PI * u) + (t > flipT + flipD ? 0.03 * Math.exp(-7 * (t - flipT - flipD)) * Math.abs(Math.cos(16 * (t - flipT - flipD))) : 0), 0);
    O.rotation.z = PI * turned;
    front = 1 - 0.8 * win(t, henT - 0.3, 36.15, 0.3);
  } else if (place === 'phila') {
    O.position.set(BOX_P, BH / 2 + hop(t, box2T, 0.14), 0);
    O.scale.set(1, settle(t, box2T + 0.3, 0.14), 1);
    const op = back(lin(t, abrenT + 0.05, abrenT + 0.4)); B.lid.rotation.x = -2.3 * op;
  }
  B.setFront(front); O.updateMatrixWorld(true);
  // agua y galletas adentro (y cinta de medir encima)
  const itemsOn = place === 'shop' && t < cierranT + 0.4;
  jug.visible = itemsOn && t > aguaT - 0.05; biscuits.visible = itemsOn && t > galT - 0.05;
  if (jug.visible) { W3(B.inner, 0.3, TH, -0.12, jug.position); jug.scale.setScalar(Math.max(back(lin(t, aguaT - 0.05, aguaT + 0.25)), 0.001)); }
  if (biscuits.visible) { W3(B.inner, 0.3, TH, 0.14, biscuits.position); biscuits.scale.setScalar(Math.max(back(lin(t, galT - 0.05, galT + 0.25)), 0.001)); biscuits.rotation.y = t; }
  const tp = place === 'shop' ? popIn(t, mideT, adentroT - 0.3) : 0; tape.visible = tp > 0.01;
  if (tape.visible) { tape.position.set(BOX_S, BH + 0.07, BD / 2 + 0.08); tape.scale.set(Math.max(tp, 0.001) * lin(t, mideT, mideT + 0.6), 1, 1); }

  poseHenry(t); poseHB(t); poseFamily(t); poseDriver(t); poseSmiths(t); posePorter(t); poseAbol(t); poseStage(t);
  if (t >= c[1] && t < c[2]) poseHenry(t);            // segunda pasada: miradas ya ubicadas
  if (t >= c[3] && t < c[6]) poseSmiths(t);

  depotWalkers.forEach(w => { w.root.visible = !(t > 35.6 && t < c[8]); });
  // --- reloj, tren parado, faroles ---
  handM.rotation.z = -t * 0.8; handH.rotation.z = -t * 0.07 - 1;
  depotTrain.puff(t, true); depotTrain.wheels.forEach(w => { w.rotation.z = 0; });
  lanternGlow.material.opacity = 0.25 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 7.3);
  flame.scale.set(1 + 0.15 * Math.sin(t * 17), 1.7 + 0.3 * Math.sin(t * 11), 1); flameGlow.material.opacity = 0.3 + 0.08 * Math.sin(t * 15);
  motes.forEach(m => { const i = m.userData.i, u = (t * 0.07 + i * 0.1) % 1; m.position.set(SX - 1.9 + 1.2 * u + 0.2 * Math.sin(t + i), 0.4 + 2.6 * ((i * 0.37 + t * 0.05) % 1), -1.3); m.material.opacity = 0.7 * Math.sin(PI * u); });

  // --- carreta (Richmond y viaje) ---
  const onWagon = (t >= c[1] && t < c[2]) || (t >= c[8] && t < c[9]);
  wagon.g.visible = onWagon; boxW.outer.visible = t >= c[8];
  if (onWagon) {
    const wx = wagonX(t), v = (wagonX(t + 0.03) - wx) / 0.03, moving = Math.min(Math.abs(v) / 0.8, 1);
    wagon.g.position.set(wx, 0.01 * Math.sin(t * 25) * moving, t < c[2] ? -1.7 : 0.3);
    wagon.wheels.forEach(w => { w.rotation.z = -wx / 0.3; }); wagon.horse.step(t, wx / 1.1, moving);
  }
  // --- tren y barco del viaje ---
  const onTravel = t >= c[8] && t < c[9];
  travelTrain.g.visible = boat.visible = onTravel;
  const trX = trainXt(t); travelTrain.g.position.x = trX; travelTrain.g.position.y = 0.01 * Math.sin(t * 22); travelTrain.wheels.forEach(w => { w.rotation.z = -trX / 0.2; }); travelTrain.puff(t, onTravel);
  const bX = boatXt(t); boat.position.set(bX, 0.03 * Math.sin(t * 3), -0.4); boat.rotation.z = 0.025 * Math.sin(t * 2.3); paddle.rotation.z = -t * 5;
  boatSmoke.forEach((m, i) => { m.visible = onTravel; const u = (t * 0.9 + i / 6) % 1; m.position.set(bX + [-0.55, -0.1][i % 2] - 1.3 * u, 2.05 + 1.2 * u, -0.5); m.scale.setScalar(0.5 + 1.6 * u); m.material.opacity = 0.85 * (1 - u); });
  waves.forEach((m, i) => { const d = m.userData, x = TX + 7.8 + ((d.x0 - t * 0.5) % 9 + 9) % 9; m.position.set(x, 0.04, d.z); m.scale.x = 0.6 + 0.4 * Math.sin(t * 2 + i); });

  // --- escenario ---
  PANO_TEX.offset.x = (t - c[11]) * 0.05; rollers.forEach(r => { r.rotation.y = t * 2.2; });
  flags.forEach((f, i) => { f.rotation.y = 0.25 * Math.sin(t * 3 + i); f.scale.x = 1 - 0.08 * Math.abs(Math.sin(t * 3 + i)); });
  footGlow.forEach((g, i) => { g.material.opacity = 0.25 + 0.06 * Math.sin(t * 9 + i * 1.7); });
  box2.outer.rotation.y = 0.05 * Math.sin(t * 1.3);

  // --- partículas ---
  glyphAt(qBox, tmp.set(DX + 0.2, BH + 0.25, 0.1), 0, 0, popIn(t, 2.35, 4.2), 0.12 * Math.sin(t * 6));
  glyphAt(qMark, head.h, 0.05, 0.62, t >= c[2] && t < c[3] ? popIn(t, c[2] + 0.3, dentroT) : 0, 0.12 * Math.sin(t * 6));
  glyphAt(bang, head.h, 0.0, 0.66, t >= c[2] && t < c[3] ? popIn(t, dentroT, c[3]) : 0);
  glyphAt(qPorter, head.p, 0.05, 0.6, t >= c[6] && t < c[8] ? popIn(t, 36.3, c[8]) : 0, 0.12 * Math.sin(t * 6));
  bangSmall.forEach((m, i) => glyphAt(m, head.hb, (i ? 0.13 : -0.13), -0.14, t >= c[7] && t < mueveT ? popIn(t, at('estallan', c[7]) - 0.2, mueveT) * (0.8 + 0.2 * Math.sin(t * 20)) : 0, (i ? -0.3 : 0.3)));
  sparks.forEach((m, i) => {
    let kk = 0, pos = tmp;
    if (t < c[1]) { kk = popIn(t, libreT - 0.2, c[1]); pos.copy(B.holePos()); }
    else if (t >= c[9] && t < c[11]) { kk = popIn(t, riseT + 0.3, c[10]) + (t > box2T - 0.1 ? popIn(t, box2T, c[11]) : 0); pos.copy(t > box2T - 0.1 ? O.position : head.h); }
    else if (t >= c[11]) { kk = popIn(t, esclT, END + 1); pos.copy(head.hs); }
    else if (t >= c[2] && t < c[3]) { kk = popIn(t, dentroT + 0.3, c[3]); pos.set(BOX_S, 0.5, 0.3); }
    const ang = i * 1.257 + t * 0.8, rr = t < c[1] ? 0.1 : 0.5;
    glyphAt(m, pos, rr * Math.cos(ang), rr * 0.8 * Math.sin(ang) + (t < c[1] ? 0 : 0.1), Math.max(kk * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)), 0) * (t < c[1] ? 0.5 : 1), t * 1.5 + i);
  });
  nailFly.forEach((m, i) => { const u = lin(t, abrenT + 0.1, abrenT + 0.7); glyphAt(m, tmp.set(BOX_P + (i - 1) * 0.3, BH + 0.1, 0.3), (i - 1) * 0.4 * u, 0.6 * u - 0.5 * u * u, t >= c[9] && u > 0 && u < 1 ? 1 - u : 0, t * 8); });
  sweat.forEach((m, i) => {
    const on = t > cabezaT && t < 36.2, u = (t * 1.6 + i / 4) % 1, s = i % 2 ? 1 : -1; m.visible = on; if (!on) return;
    m.position.set(head.hb.x + s * (0.12 + 0.12 * u), head.hb.y - 0.05 - 0.25 * u, head.hb.z + 0.15); m.scale.set(0.6 * (1 - u), 0.85 * (1 - u), 0.6 * (1 - u));
  });
  // lágrimas en Richmond (mismas gotas, otro momento)
  if (t > vendenT + 0.8 && t < c[2]) sweat.forEach((m, i) => { const u = (t * 1.2 + i / 4) % 1, s = i % 2 ? 1 : -1; m.visible = true; m.position.set(head.h.x + s * 0.13, head.h.y - 0.02 - 0.3 * u, head.h.z + 0.27); m.scale.set(0.8 * (1 - u * 0.5), 1.1 * (1 - u * 0.5), 0.8); });
  air.forEach((m, i) => { const on = t > aguT && t < cierranT - 0.2, u = (t * 1.3 + i / 3) % 1; m.visible = on; if (!on) return; const hp = B.holePos(); m.position.set(hp.x - 0.05 * u, hp.y + 0.03 * Math.sin(u * 6), hp.z + 0.05 + 0.4 * u); m.scale.setScalar(1 + 2 * u); m.material.opacity = 0.9 * (1 - u); });
  const running = t > 9.7 && t < 10.35;
  speed.forEach((m, i) => { m.visible = running; if (!running) return; m.position.set(head.h.x - 0.5 - 0.14 * ((i * 3) % 5) + 0.2 * Math.sin(t * 40 + i), 0.45 + i * 0.26, 0.1); m.material.opacity = 0.5 + 0.4 * Math.sin(t * 50 + i * 2); });
  puffA(t, dentroT + 0.3, BOX_S, 0.2, -1); puffB(t, dentroT + 0.3, BOX_S + 0.3, 0.2, 1);
  puffC(t, flipT + flipD, DX - 0.2, 0.2, -1); puffD(t, flipT + flipD, DX + 0.6, 0.2, 1);
  if (t >= c[1] && t < c[2]) { puffA(t, 9.6, wagonX(t) - 0.6, -1.7, -1); puffC(t, 9.7, RX - 1.15, 0, -1); }
  if (t >= c[9]) { puffB(t, riseT + 0.15, BOX_P - 0.3, 0.3, -1); puffD(t, c[10] + 0.75, PX - 0.85, 0.35, -1); }
});
