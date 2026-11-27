// Episodio: el pez arquero, que baja insectos de las hojas con un chorro de agua (canal En 60 Segundos).
// Decorados: MANGLAR EN CORTE (x de -12 a 10: arriba el aire con el manglar, abajo el agua con arena,
// raíces, burbujas y peces) y el CORTE DE LA CABEZA (x = 40: lengua, canaleta del paladar, agallas).
// Hay solo dos cortes: al entrar al corte de la cabeza y al volver al manglar. Todo lo demás son zooms y viajes.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, clamp01, back, settle, hop, popIn, moodAt, blinkAt, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { surface } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('pezarquero');
const { scene, c, at, END, sfx, tag, BIG, camera } = k;
const WL = 2.0, CX = 40;                                   // nivel del agua; dónde está el corte de la cabeza
const HULL = new THREE.MeshBasicMaterial({ color: 0x1e1428, side: THREE.BackSide });
const v3 = () => new THREE.Vector3();

// ---------- tiempos (todo cuelga de la voz) ----------
const fueraT = at('fuera'), escT = at('escupitajos');
const arqT = at('arquero', c[1]), mideT = at('mide', c[1]), veinteT = at('veinte', c[1]), mangT = at('manglares', c[1]), sudT = at('sudeste', c[1]), ausT = at('australia', c[1]);
const moscaT = at('mosca', c[2]), peroT = at('pero', c[2]), doblaT = at('dobla', c[2]), mosca2T = at('mosca', doblaT);
const corrigeT = at('corrige', c[3]), apuntarT = at('apuntar', c[3]);
const lenguaT = at('lengua', c[4]), canaletaT = at('canaleta', c[4]), canonT = at('cañón', c[4]);
const agallasT = at('agallas', c[5]), golpeT = at('golpe', c[5]), disparaT = at('dispara', c[5]), chorroT = at('chorro', c[5]), dosT = at('dos', c[5]);
const caeT = at('cae', c[6]), decimaT = at('decima', c[6]), calculaT = at('calcula', c[6]), tocarT = at('tocar', c[6]);
const nadaT = at('nada', c[7]), antesT = at('antes', c[7]), otrosT = at('otros', c[7]);
const cae2T = at('cae', c[8]);

const CUT1 = c[4], CUT2 = disparaT - 0.07;
const HJ0 = escT - 0.03, HJH = HJ0 + 0.2;                 // gancho: chorro y golpe al escarabajo
const J0 = disparaT + 0.05, JH = chorroT + 0.45;           // chorro principal: sale y llega a la mosca
const HIT = caeT - 0.15, LAND = cae2T + 0.08;              // la mosca se suelta; la mosca toca el agua
const G0 = 6, TFH0 = (0.5 + Math.sqrt(0.25 + 2 * G0 * (2.85 - WL))) / G0, HLAND = HJH + TFH0;

// ---------- geometría de la puntería (vista en corte) ----------
const S = V(0, WL, 0.25);                                  // donde la luz cruza la superficie
const R = V(1.39, 2.98, 0.05);                             // la mosca de verdad
const A = V(1.05, 3.34, 0.05);                             // donde el pez la "ve" (la luz doblada)
const B = V(-4.75, 2.85, 0.05);                            // escarabajo del gancho
const G = 6, FVX = 0.9, FVY = 0.7;                         // caída de la mosca
const TF = (FVY + Math.sqrt(FVY * FVY + 2 * G * (R.y - WL))) / G;
const L = V(R.x + FVX * TF, WL, 0.05);                     // donde cae
const HVX = 0.5, HVY = 0.5, TFH = (HVY + Math.sqrt(HVY * HVY + 2 * G * (B.y - WL))) / G, LH = V(B.x + HVX * TFH, WL, 0.05);
const SNOUT = [0.57, 0.015];
const rot = (p, [x, y]) => [x * Math.cos(p) - y * Math.sin(p), x * Math.sin(p) + y * Math.cos(p)];
/** Centro del pez para que la punta del hocico quede en m con inclinación p. */
const centerFor = (m, p) => { const [dx, dy] = rot(p, SNOUT); return V(m.x - dx, m.y - dy, 0); };
const P1 = 0.52, F_ = rot(P1, [0.25, 0.07]), C1 = V(-0.46 - F_[0], 1.41 - F_[1], 0);                   // mirando la mosca (el ojo queda en la línea de luz)
const PS = Math.atan2(R.y - WL, R.x - 0.15), CS = centerFor(V(0.15, WL - 0.01, 0), PS);
const CS2 = V(CS.x - 0.05, CS.y - 0.13, 0);
const PF = 0.87, CF = centerFor(V(L.x, WL - 0.06, 0), PF);
const PH = Math.atan2(B.y - WL, B.x + 5.45), CH0 = V(-6.0, 1.25, 0), CHS = centerFor(V(-5.45, WL - 0.01, 0), PH), CHF = centerFor(V(LH.x, WL - 0.06, 0), PF);
const CI = V(-4.75, 1.42, 0);

// ---------- piezas ----------
function ell(parent, color, a, b, cc, x, y, z, w = 0.016) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), color.isMaterial ? color : flat(color));
  m.scale.set(a, b, cc); m.position.set(x, y, z); m.castShadow = true; m.userData.s0 = [a, b, cc];
  if (w) { const h = new THREE.Mesh(m.geometry, HULL); h.scale.set((a + w) / a, (b + w) / b, (cc + w) / cc); m.add(h); }
  parent.add(m); return m;
}
const Yax = new THREE.Vector3(0, 1, 0);
/** Escala un ell() respecto de su tamaño original. */
const sc = (m, f) => { const s = m.userData.s0; m.scale.set(s[0] * f, s[1] * f, s[2] * f); };
function rod(parent, a, b, r, color, w = 0.018, r2 = r) {
  const d = v3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, 12), color.isMaterial ? color : flat(color));
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); m.castShadow = true; m.receiveShadow = true;
  if (w) m.add(new THREE.Mesh(new THREE.CylinderGeometry(r2 + w, r + w, len, 12), HULL));
  parent.add(m); return m;
}
function fin(parent, pts, color, depth = 0.02, w = 0.013) {
  const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); geo.computeBoundingBox();
  const cc = geo.boundingBox.getCenter(v3()); geo.translate(-cc.x, -cc.y, -cc.z);
  const m = outlined(new THREE.Mesh(geo, flat(color)), w); m.position.copy(cc); parent.add(m); return m;
}
const ellipsePts = (rx, ry, n = 26) => Array.from({ length: n }, (_, i) => [rx * Math.cos(i / n * 2 * PI), ry * Math.sin(i / n * 2 * PI)]);

// ---------- el pez arquero ----------
const MO = {
  neutral: { lid: 0, es: 1, p: 1, bt: 0, by: 0.13 }, surprised: { lid: 0, es: 1.2, p: 0.72, bt: 0.1, by: 0.165 },
  angry: { lid: 0.42, es: 1, p: 1, bt: -0.45, by: 0.115 }, worried: { lid: 0.12, es: 1.05, p: 0.9, bt: 0.42, by: 0.145 },
  aim: { lid: 0.48, es: 1, p: 1.05, bt: -0.28, by: 0.12 }, happy: { lid: 0, es: 1, p: 1, bt: 0.15, by: 0.15 },
};
function makeFish({ body = 0xeef0da, finC = 0xf0c457, tailC = 0xe3ae46, s = 1, simple = false, seed = 0, stripe = 0x2a2433 } = {}) {
  const root = new THREE.Group(); scene.add(root);
  const A_ = 0.5, B_ = 0.3, C_ = 0.16;
  ell(root, body, A_, B_, C_, 0, 0, 0, simple ? 0.03 : 0.022);
  ell(root, body, 0.17, 0.12, 0.11, 0.4, 0.015, 0, simple ? 0.026 : 0.018);         // hocico en punta
  ell(root, 0xf7f6ea, 0.36, 0.12, 0.152, 0.02, -0.15, 0, 0);                         // panza más clara
  if (!simple) for (const [x, h] of [[0.12, 0.5], [-0.07, 0.62], [-0.25, 0.62], [-0.39, 0.5]]) {   // manchas negras del lomo
    const top = B_ * Math.sqrt(1 - (x / A_) ** 2), m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), basic(stripe));
    m.scale.set(0.052, top * h * 0.5, C_ * 1.07); m.position.set(x, top * (1 - h * 0.5) - 0.012, 0); root.add(m);
  }
  const tail = new THREE.Group(); tail.position.set(-0.47, 0, 0); root.add(tail);
  fin(tail, [[0.05, 0], [-0.16, 0.2], [-0.31, 0.26], [-0.22, 0], [-0.31, -0.26], [-0.16, -0.2]], tailC);
  const dorsal = new THREE.Group(); dorsal.position.set(-0.12, 0.22, 0); root.add(dorsal);
  fin(dorsal, [[0.06, 0.02], [-0.02, 0.17], [-0.2, 0.2], [-0.3, 0.06], [-0.22, -0.03]], finC, 0.018);
  const anal = new THREE.Group(); anal.position.set(-0.12, -0.21, 0); root.add(anal);
  fin(anal, [[0.06, -0.02], [-0.04, -0.15], [-0.24, -0.19], [-0.3, -0.04], [-0.2, 0.03]], finC, 0.018);
  const ventral = new THREE.Group(); ventral.position.set(0.12, -0.25, 0); root.add(ventral);
  fin(ventral, [[0, 0], [-0.06, -0.11], [-0.13, -0.02]], finC, 0.014);
  const pecs = [-1, 1].map(sd => { const g = new THREE.Group(); g.position.set(0.1, -0.07, sd * 0.145); root.add(g); fin(g, [[0.01, 0], [-0.08, 0.05], [-0.18, 0.03], [-0.18, -0.03], [-0.08, -0.05]], finC, 0.012, 0.01); return g; });
  const eyes = [-1, 1].map(sd => {
    const g = new THREE.Group(); g.position.set(0.25, 0.07, sd * 0.105); root.add(g);
    const white = ell(g, 0xffffff, 0.09, 0.09, 0.09, 0, 0, 0, 0.014);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), basic(0x1e1428)); g.add(pupil);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), basic(0xffffff)); g.add(shine);
    const lid = new THREE.Group(); g.add(lid);
    lid.add(new THREE.Mesh(new THREE.SphereGeometry(0.097, 20, 10, 0, 2 * PI, 0, PI / 2), flat(0xd9d7bd, { side: THREE.DoubleSide })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.097, 0.011, 6, 28), basic(0x1e1428)); rim.rotation.x = PI / 2; lid.add(rim);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 16, PI), basic(0x1e1428)); arc.position.set(0, -0.015, sd * 0.07); g.add(arc);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, 0.04), basic(0x1e1428)); brow.position.set(0, 0.13, sd * 0.02); g.add(brow);
    if (simple) { lid.visible = false; brow.visible = false; arc.visible = false; }
    return { g, sd, white, pupil, shine, lid, arc, brow };
  });
  const mouthLine = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.2), basic(0x1e1428)); mouthLine.position.set(0.49, -0.025, 0); mouthLine.rotation.z = 0.45; root.add(mouthLine);
  const mouthG = new THREE.Group(); mouthG.position.set(0.56, 0.0, 0); root.add(mouthG);
  ell(mouthG, 0x5a1828, 0.065, 0.065, 0.075, 0, 0, 0, 0.014);
  const q = new THREE.Quaternion(), wp = v3(), d = v3();
  return {
    root, eyes,
    snout: (out = v3()) => root.localToWorld(out.set(SNOUT[0], SNOUT[1], 0)),
    eye: (out = v3()) => eyes[1].g.getWorldPosition(out),
    pose({ x = 0, y = 0, z = 0, face = 0, pitch = 0, swim = 0.3, t = 0, look = null, lid = 0, mouth = 0, mood = 'neutral', squash = 1, kk = seed }) {
      root.position.set(x, y + 0.03 * Math.sin(t * 1.8 + kk), z);
      root.rotation.set(0, face + 0.05 * Math.sin(t * 1.3 + kk), pitch + 0.035 * Math.sin(t * 2.2 + kk));
      root.scale.set(s / Math.sqrt(squash), s * squash, s / Math.sqrt(squash));
      const f = 5 + 10 * swim, a = 0.22 + 0.4 * swim;
      tail.rotation.y = a * Math.sin(t * f + kk); root.rotation.y += -0.08 * a * Math.sin(t * f + kk);
      dorsal.rotation.y = 0.12 * Math.sin(t * f - 0.8 + kk); anal.rotation.y = 0.12 * Math.sin(t * f - 1.1 + kk); ventral.rotation.y = 0.2 * Math.sin(t * 6 + kk);
      pecs.forEach((g, i) => { g.rotation.y = (i ? 1 : -1) * (0.35 + 0.35 * Math.sin(t * 9 + kk + i)); });
      root.updateMatrixWorld(true);
      const M = MO[mood] || MO.neutral, happy = mood === 'happy' && !simple, blink = blinkAt(t * 0.85, kk);
      root.getWorldQuaternion(q).invert();
      eyes.forEach(e => {
        if (look) { e.g.getWorldPosition(wp); d.copy(look).sub(wp).applyQuaternion(q).normalize(); } else d.set(0.4, 0, e.sd);
        d.z = e.sd * Math.max(e.sd * d.z, 0.62); d.normalize();
        e.pupil.position.copy(d).multiplyScalar(0.066); e.pupil.scale.set(M.p, M.p, 0.6 * M.p);
        e.shine.position.copy(e.pupil.position).add(wp.set(0.017, 0.022, e.sd * 0.03));
        e.white.visible = e.pupil.visible = e.shine.visible = !happy; e.arc.visible = happy;
        if (!simple) { e.lid.visible = !happy; e.lid.rotation.x = e.sd * lerp(-PI / 2, PI / 2, clamp01(Math.max(lid, M.lid, blink)) * 0.97); e.brow.rotation.z = M.bt; e.brow.position.y = M.by; }
        e.g.scale.setScalar(simple ? 0.8 : M.es);
      });
      mouthG.visible = mouth > 0.03; mouthG.scale.setScalar(Math.max(mouth, 0.001)); mouthLine.visible = mouth < 0.45;
      root.updateMatrixWorld(true);
    },
  };
}

// ---------- mosca y escarabajo ----------
function makeBug({ ghost = false, beetle = false } = {}) {
  const root = new THREE.Group(); scene.add(root);
  const inner = new THREE.Group(); root.add(inner);
  const dark = 0x2f3a48;
  let headP;
  if (beetle) {
    ell(inner, 0xd8402f, 0.14, 0.1, 0.12, -0.03, 0.1, 0, 0.014);
    for (const [x, y, z] of [[-0.06, 0.18, 0.05], [0.02, 0.16, -0.07], [-0.1, 0.12, -0.09], [0.04, 0.15, 0.08], [-0.12, 0.14, 0.06]]) ell(inner, 0x1e1428, 0.026, 0.02, 0.026, x, y, z, 0);
    ell(inner, 0x1e1428, 0.136, 0.104, 0.008, -0.03, 0.1, 0, 0);
    ell(inner, 0x2b2433, 0.065, 0.06, 0.065, 0.12, 0.09, 0, 0.012); headP = [0.12, 0.09];
  } else {
    ell(inner, 0x3b8fae, 0.11, 0.075, 0.08, -0.1, 0.1, 0, 0.012);                    // panza verde azulada
    for (const x of [-0.13, -0.07]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.009, 6, 20), basic(0x1e1428)); r.position.set(x, 0.1, 0); r.rotation.y = PI / 2; r.scale.set(1, 0.95, 1.05); inner.add(r); }
    ell(inner, dark, 0.075, 0.07, 0.07, 0.02, 0.11, 0, 0.012);
    ell(inner, dark, 0.07, 0.068, 0.072, 0.12, 0.14, 0, 0.012); headP = [0.12, 0.14];
  }
  const eyes = [-1, 1].map(sd => {
    const g = new THREE.Group(); g.position.set(headP[0] + 0.04, headP[1] + 0.035, sd * 0.042); inner.add(g);
    ell(g, 0xffffff, 0.042, 0.046, 0.042, 0, 0, 0, 0.01);
    const p = ell(g, 0x1e1428, 0.02, 0.024, 0.016, 0.026, 0.004, sd * 0.02, 0); return g;
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 6, 12, PI), basic(0x1e1428)); smile.rotation.set(0, PI / 2, PI); smile.position.set(headP[0] + 0.07, headP[1] - 0.025, 0); inner.add(smile);
  const oh = ell(inner, 0x4f1626, 0.012, 0.018, 0.016, headP[0] + 0.068, headP[1] - 0.03, 0, 0.006);
  const wings = beetle ? [] : [-1, 1].map(sd => {
    const g = new THREE.Group(); g.position.set(0.0, 0.17, sd * 0.03); inner.add(g);
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 22), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }));
    w.scale.set(0.14, 0.06, 1); w.rotation.x = -PI / 2; w.position.set(-0.11, 0.01, sd * 0.05); w.rotation.z = sd * 0.35; g.add(w);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 26), new THREE.MeshBasicMaterial({ color: 0x1e1428, side: THREE.DoubleSide })); rim.position.z = 0.001; w.add(rim);
    return g;
  });
  const legs = [];
  for (const sd of [-1, 1]) for (const x of [0.07, 0.01, -0.05]) {
    const g = new THREE.Group(); g.position.set(x, 0.07, sd * 0.03); inner.add(g);
    rod(g, V(0, 0, 0), V(x * 0.6, -0.04, sd * 0.06), 0.008, 0x1e1428, 0); rod(g, V(x * 0.6, -0.04, sd * 0.06), V(x * 0.9, -0.07, sd * 0.09), 0.008, 0x1e1428, 0);
    g.userData = { sd, x }; legs.push(g);
  }
  if (ghost) root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.38; o.material.depthWrite = false; o.castShadow = false; } });
  return {
    root, inner,
    pose({ x, y, z = 0.05, face = -0.9, spin = 0, t = 0, flap = 0, flail = 0, mood = 'neutral', rub = 0, s = 1 }) {
      root.position.set(x, y, z); root.rotation.set(0, face, 0); inner.rotation.set(0.4 * Math.sin(spin * 0.7), 0, spin); root.scale.setScalar(s);
      wings.forEach((g, i) => { g.rotation.x = (i ? 1 : -1) * (0.15 + flap * (0.3 + 0.6 * Math.abs(Math.sin(t * 38 + i)))); });
      legs.forEach((g, i) => { const u = g.userData; g.rotation.z = flail * 0.6 * Math.sin(t * 9 + i * 1.7) + (i % 3 === 0 ? rub * 0.5 * Math.sin(t * 12 + u.sd) : 0); g.rotation.x = u.sd * flail * 0.5 * Math.sin(t * 7 + i); });
      const es = mood === 'surprised' ? 1.25 : mood === 'effort' ? 0.85 : 1;
      eyes.forEach(g => g.scale.set(es, es * (mood === 'effort' ? 0.55 : 1) * Math.max(1 - blinkAt(t, x) * 0.9, 0.1), es));
      smile.visible = mood === 'neutral' || mood === 'happy'; oh.visible = !smile.visible; sc(oh, mood === 'effort' ? 0.6 : 1);
    },
  };
}

// ---------- hojas y manglares ----------
const leaves = [];
function makeLeaf(px, py, pz, { len = 0.6, color = 0x5bb04a, dir = 1, tilt = 1.0 } = {}) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; g.position.set(px, py, pz); scene.add(g);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(len * 0.45, len * 0.34, len, 0); sh.quadraticCurveTo(len * 0.45, -len * 0.34, 0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: false }); geo.computeBoundingBox();
  const cc = geo.boundingBox.getCenter(v3()); geo.translate(-cc.x, -cc.y, -cc.z);
  const m = outlined(new THREE.Mesh(geo, flat(color)), 0.016); m.position.copy(cc); m.receiveShadow = true; g.add(m);
  const vein = new THREE.Mesh(new THREE.BoxGeometry(len * 0.88, 0.012, 0.03), basic(0x2f6e32)); vein.position.set(len * 0.46, 0, 0); g.add(vein);
  g.rotation.y = dir > 0 ? 0 : PI; g.rotation.x = dir > 0 ? -tilt : tilt;
  g.userData = { dir, tilt, len, i: leaves.length }; leaves.push(g); return g;
}
const BR = 0x7b5a3c, BR2 = 0x6a4b30;
function mangrove(x, z, { top = 6.2, seed = 1, branch = null } = {}) {
  const r = rng(seed);
  const pts = [V(x, WL + 0.3, z), V(x + 0.08, WL + 1.3, z), V(x - 0.05, WL + 2.5, z), V(x + 0.06, top, z)];
  for (let i = 0; i < pts.length - 1; i++) { rod(scene, pts[i], pts[i + 1], 0.17 - i * 0.03, BR, 0.022, 0.17 - (i + 1) * 0.03); ell(scene, BR, 0.15 - i * 0.03, 0.15 - i * 0.03, 0.15 - i * 0.03, pts[i + 1].x, pts[i + 1].y, z, 0.02); }
  for (let i = 0; i < 7; i++) {                              // raíces zancudas que bajan hasta la arena
    const sd = i % 2 ? 1 : -1, lvl = Math.floor(i / 2), spread = 0.35 + 0.26 * lvl + r() * 0.12, dz = (r() - 0.5) * 1.1;
    const a = V(x + sd * 0.06, WL + 0.25 + 0.2 * lvl + r() * 0.12, z), b = V(x + sd * spread, a.y + 0.28, z + dz * 0.4), e = V(x + sd * (spread + 0.5 + r() * 0.35), -0.03, z + dz);
    let prev = a;
    for (let j = 1; j <= 6; j++) {
      const u = j / 6, p = V((1 - u) ** 2 * a.x + 2 * u * (1 - u) * b.x + u * u * e.x, (1 - u) ** 2 * a.y + 2 * u * (1 - u) * b.y + u * u * e.y, (1 - u) ** 2 * a.z + 2 * u * (1 - u) * b.z + u * u * e.z);
      const rr = 0.06 - 0.004 * j; rod(scene, prev, p, rr, BR2, 0.016); ell(scene, BR2, rr, rr, rr, p.x, p.y, p.z, 0.016); prev = p;
    }
  }
  const greens = [0x3f8f4a, 0x4fa35a, 0x5cb062, 0x47984f];
  for (let i = 0; i < 9; i++) { const rr = 0.55 + r() * 0.4; ell(scene, greens[i % 4], rr, rr * 0.78, rr * 0.8, x + (r() - 0.5) * 2.6, top + (r() - 0.3) * 0.9, z + (r() - 0.5) * 0.8, 0.026); }
  for (let i = 0; i < 6; i++) makeLeaf(x + (r() - 0.5) * 2.4, top - 0.7 - r() * 0.4, z + 0.7 + r() * 0.2, { len: 0.4, color: greens[i % 4], dir: r() < 0.5 ? 1 : -1, tilt: 0.3 });
  if (branch) {
    let prev = V(...branch[0]);
    branch.slice(1).forEach((p, i) => { const q = V(...p); const rr = 0.075 - i * 0.015; rod(scene, prev, q, Math.max(rr, 0.02), BR, 0.016, Math.max(rr - 0.015, 0.018)); ell(scene, BR, Math.max(rr - 0.012, 0.02), Math.max(rr - 0.012, 0.02), Math.max(rr - 0.012, 0.02), q.x, q.y, q.z, 0.014); prev = q; });
  }
}
const MAIN_LEAF = V(R.x + 0.27, R.y - 0.01, 0.0), HOOK_LEAF = V(B.x - 0.27, B.y - 0.01, 0.0);
mangrove(3.3, -0.9, { seed: 3, top: 6.0, branch: [[3.3, 4.5, -0.85], [2.75, 3.9, -0.5], [2.15, 3.38, -0.15], [MAIN_LEAF.x, MAIN_LEAF.y, 0]] });
mangrove(-6.6, -0.9, { seed: 7, top: 5.8, branch: [[-6.6, 4.1, -0.85], [-5.9, 3.45, -0.45], [-5.4, 3.0, -0.12], [HOOK_LEAF.x, HOOK_LEAF.y, 0]] });
mangrove(-2.5, -1.9, { seed: 11, top: 6.4 });
mangrove(6.9, -1.6, { seed: 5, top: 6.1 });
const leafMain = makeLeaf(MAIN_LEAF.x, MAIN_LEAF.y, MAIN_LEAF.z, { dir: -1, len: 0.6 });
const leafHook = makeLeaf(HOOK_LEAF.x, HOOK_LEAF.y, HOOK_LEAF.z, { dir: 1, len: 0.6, color: 0x67b84f });
for (const [x, y, d] of [[2.3, 3.6, 1], [2.05, 3.45, -1], [2.5, 4.0, -1], [-5.6, 3.25, 1], [-5.95, 3.55, -1]]) makeLeaf(x, y, -0.2, { len: 0.42, dir: d, color: 0x4fa35a, tilt: 0.8 });

// ---------- agua en corte ----------
function canvasT(w, h, draw, rx = 1, ry = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const wallTex = canvasT(512, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#74cde3'); gr.addColorStop(0.5, '#3f9fc6'); gr.addColorStop(1, '#22719c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(4); g.strokeStyle = 'rgba(25,80,120,0.45)'; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const x = r() * w; g.lineWidth = 10 + r() * 16; g.beginPath(); g.moveTo(x, -10); g.bezierCurveTo(x + 60, h * 0.3, x - 70, h * 0.6, x + (r() - 0.5) * 120, h + 10); g.stroke(); }
  g.fillStyle = 'rgba(30,90,130,0.5)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(r() * w, h - 10 - r() * 40, 40 + r() * 50, 22 + r() * 20, 0, 0, 7); g.fill(); }
}, 6, 1);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(30, WL + 1), new THREE.MeshBasicMaterial({ map: wallTex })); m.position.set(-1, (WL - 1) / 2, -4.5); scene.add(m); }
const sandTex = canvasT(512, 512, (g, w, h) => {
  g.fillStyle = '#e6d199'; g.fillRect(0, 0, w, h); const r = rng(9);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(170,140,80,0.35)' : 'rgba(255,250,220,0.5)'; g.fillRect(r() * w, r() * h, 3 + r() * 4, 3 + r() * 4); }
  g.strokeStyle = 'rgba(180,150,90,0.55)'; g.lineWidth = 5; for (let j = 0; j < 8; j++) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, j * 64 + 30 + 9 * Math.sin(x / 40 + j)); g.stroke(); }
}, 10, 3);
surface(scene, sandTex, 30, 7, -1, 0, -1.15, true);
const causticCanvas = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); const r = rng(21);
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 256, a = r() * 6.3, l = 16 + r() * 22; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l, y + Math.sin(a + 1) * l, x + Math.cos(a) * l * 1.6, y + Math.sin(a) * l * 1.6); g.stroke(); }
  return cv; })();
function causticTex(rx, ry) { const t = new THREE.CanvasTexture(causticCanvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
const caustics = [];
for (const [rx, ry, mk] of [[18, 4, 0], [11, 3, 1]]) {
  const t = causticTex(rx, ry); const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 6.7), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -PI / 2; m.position.set(-1, 0.008 + mk * 0.002, -1.15); scene.add(m); caustics.push(t);
  const t2 = causticTex(rx * 0.9, 1.2); const w = new THREE.Mesh(new THREE.PlaneGeometry(30, WL + 1), new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  w.position.set(-1, (WL - 1) / 2, -4.48 + mk * 0.005); scene.add(w); caustics.push(t2);
}
const topTex = canvasT(256, 256, (g, w, h) => { g.fillStyle = '#9fe3f3'; g.fillRect(0, 0, w, h); const r = rng(2); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 5; for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 8, x + 44, y); g.stroke(); } }, 14, 3);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 6.7), new THREE.MeshBasicMaterial({ map: topTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -PI / 2; m.position.set(-1, WL, -1.15); scene.add(m); }
const rays = Array.from({ length: 7 }, (_, i) => {
  const geo = new THREE.PlaneGeometry(0.45 + (i % 3) * 0.15, 2.4); geo.translate(0, -1.2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(-8 + i * 2.3, WL, -1.8 + (i % 2) * 0.9); m.rotation.z = 0.3; scene.add(m); return m;
});
/** Tira de vértices con el borde de arriba ondulado (la superficie vista de costado). */
function strip(color, opacity, z, x0, x1, n, order) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array((n + 1) * 6); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const idx = []; for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = order; m.frustumCulled = false; scene.add(m);
  return (top, bot) => { for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); pos.set([x, top(x), z, x, bot(x), z], i * 6); } geo.attributes.position.needsUpdate = true; };
}
const wave = (x, t, base = WL) => base + 0.035 * Math.sin(x * 2.1 + t * 2.4) + 0.02 * Math.sin(x * 4.7 - t * 3.1);
const tint = strip(0x2b9bd0, 0.2, 2.2, -12, 10, 240, 2), hi = strip(0xc9f4ff, 0.85, 2.21, -12, 10, 240, 3), line = strip(0x1e1428, 1, 2.22, -12, 10, 240, 4);
const tint2 = strip(0x2b9bd0, 0.16, 1.2, CX - 4, CX + 4, 80, 2), hi2 = strip(0xc9f4ff, 0.85, 1.21, CX - 4, CX + 4, 80, 3), line2 = strip(0x1e1428, 1, 1.22, CX - 4, CX + 4, 80, 4);

// ---------- arriba del agua: fondo de manglar, cielo ----------
{ const r = rng(31), greens = [0x3d7f4a, 0x4a9157, 0x356f42];
  for (let x = -12; x < 11; x += 0.55) ell(scene, greens[Math.floor(r() * 3)], 0.45 + r() * 0.35, 0.4 + r() * 0.5, 0.3, x, WL + 0.35 + r() * 0.6, -5.2, 0.022);
  for (let x = -11; x < 11; x += 1.7) { const g = k.tree(x + r() * 0.6, -7, { h: 3.2 + r(), leaf: greens[Math.floor(r() * 3)] }); g.position.y = WL - 0.6; } }
for (const [x, y, s] of [[-7, 6.6, 1.1], [-3, 7.6, 0.9], [1, 6.9, 1], [4.5, 7.8, 0.8], [8, 6.5, 1]]) k.cloud(x, y, -10, s);
k.birds([[-1, 5.6, 0], [-1, 6.3, 6], [-5, 5.9, 3], [3, 6.6, 9]], -7);

// ---------- abajo del agua: pastos, piedras, cangrejo, estrella, peces chicos, burbujas ----------
const seagrass = [];
{ const r = rng(17), gc = [0x4f9a45, 0x63ad4e, 0x3f8a3f];
  for (let i = 0; i < 46; i++) {
    const g = new THREE.Group(); g.position.set(lerp(-9.5, 7, r()), 0, lerp(-3.6, 1.4, r())); scene.add(g);
    for (let j = 0; j < 3; j++) { const h = 0.18 + r() * 0.3; const b = ell(g, gc[(i + j) % 3], 0.035, h, 0.02, (j - 1) * 0.05, h * 0.9, 0, 0.012); b.rotation.z = (j - 1) * 0.25; }
    seagrass.push(g);
  }
  for (let i = 0; i < 14; i++) { const s = 0.1 + r() * 0.16; ell(scene, [0x8d8a9e, 0x9f9a8a, 0x7d7b8f][i % 3], s * 1.4, s, s, lerp(-9, 6.5, r()), s * 0.5, lerp(-3.4, 1.3, r()), 0.018); }
  const star = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = PI / 2 + i * PI / 5, rr = i % 2 ? 0.07 : 0.17; i ? star.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : star.moveTo(rr * Math.cos(a), rr * Math.sin(a)); }
  for (const [x, z, col] of [[-1.6, 1.25, 0xf08a3a], [-5.0, 1.1, 0xe8604a], [3.8, 1.2, 0xf0a03a]]) { const geo = new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: false }); geo.translate(0, 0, -0.015); const m = outlined(new THREE.Mesh(geo, flat(col)), 0.012); m.rotation.x = -PI / 2 + 0.25; m.position.set(x, 0.04, z); scene.add(m); }
}
const crab = new THREE.Group(); scene.add(crab);
const crabLegs = [], crabClaws = [];
{ ell(crab, 0xe0553a, 0.17, 0.085, 0.12, 0, 0.12, 0, 0.016);
  for (const sd of [-1, 1]) {
    rod(crab, V(sd * 0.05, 0.18, 0.06), V(sd * 0.065, 0.27, 0.07), 0.012, 0x1e1428, 0);
    ell(crab, 0xffffff, 0.034, 0.038, 0.034, sd * 0.065, 0.29, 0.07, 0.01); ell(crab, 0x1e1428, 0.016, 0.02, 0.012, sd * 0.065, 0.292, 0.1, 0);
    const cl = new THREE.Group(); cl.position.set(sd * 0.17, 0.13, 0.09); crab.add(cl); ell(cl, 0xe0553a, 0.06, 0.045, 0.045, sd * 0.04, 0.02, 0, 0.014);
    const pin = ell(cl, 0xe0553a, 0.035, 0.016, 0.03, sd * 0.08, 0.06, 0, 0.012); crabClaws.push([cl, pin]);
    for (let j = 0; j < 3; j++) { const g = new THREE.Group(); g.position.set(sd * 0.13, 0.09, -0.05 + j * 0.05); crab.add(g); rod(g, V(0, 0, 0), V(sd * 0.09, 0.03, 0), 0.01, 0x1e1428, 0); rod(g, V(sd * 0.09, 0.03, 0), V(sd * 0.15, -0.08, 0), 0.01, 0x1e1428, 0); g.userData.sd = sd; crabLegs.push(g); }
  }
  const sm = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12, PI), basic(0x1e1428)); sm.rotation.z = PI; sm.position.set(0, 0.12, 0.122); crab.add(sm); }
const school = Array.from({ length: 9 }, (_, i) => ({ f: makeFish({ simple: true, s: 0.28 + (i % 3) * 0.05, body: [0x9fc4d6, 0xb7d3a8, 0xe9b7a0][i % 3], finC: [0x6f9cb8, 0x8fb878, 0xd9846a][i % 3], tailC: [0x6f9cb8, 0x8fb878, 0xd9846a][i % 3], seed: i * 1.7 }),
  z: -2.6 - (i % 3) * 0.35, y: 0.55 + ((i * 0.37) % 1) * 0.9, off: i * 2.3, dir: i % 2 ? 1 : -1, sp: 0.45 + (i % 4) * 0.08 }));
const bubbles = Array.from({ length: 40 }, (_, i) => { const r = 0.025 + (i % 4) * 0.012; return { m: ell(scene, 0xe2f7ff, r, r, r, 0, 0, 0, 0.009), x0: lerp(-9, 7, ((i * 0.618) % 1)), z: lerp(-2.4, 1.3, ((i * 0.37) % 1)), sp: 0.35 + (i % 5) * 0.08, ph: i * 0.53 }; });
const plankton = Array.from({ length: 50 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.012 + (i % 3) * 0.006, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); scene.add(m); return { m, x0: lerp(-9, 7, (i * 0.618) % 1), y0: lerp(0.2, 1.9, (i * 0.414) % 1), z: lerp(-2, 1.5, (i * 0.27) % 1), ph: i }; });
const floater = makeLeaf(-1, WL + 0.012, 0.8, { len: 0.35, color: 0x8fbf4a, tilt: PI / 2 });

// ---------- personajes ----------
const fish = makeFish({ seed: 0 });
const rivalA = makeFish({ seed: 2.3, body: 0xe4e9cf, finC: 0xe9b94a });
const rivalB = makeFish({ seed: 4.1, body: 0xf0ecd6, finC: 0xf2cf6a, s: 0.9 });
const fly = makeBug(), ghost = makeBug({ ghost: true }), beetle = makeBug({ beetle: true });

// ---------- corte de la cabeza (x = 40) ----------
const diag = new THREE.Group(); diag.position.set(CX, 2.0, 0); scene.add(diag);
{ const bg = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.6), new THREE.MeshBasicMaterial({ map: canvasT(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7ad3e8'); gr.addColorStop(1, '#2a7ba6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
  bg.position.set(CX, 3.4 - 2.3, -1.5); scene.add(bg);
  const ct = causticTex(6, 2.4); caustics.push(ct); const cm = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.6), new THREE.MeshBasicMaterial({ map: ct, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })); cm.position.set(CX, 1.1, -1.49); scene.add(cm);
  for (let i = 0; i < 9; i++) { const g = new THREE.Group(); g.position.set(CX - 4 + i * 1.0, -1.3, -1.2); scene.add(g); const h = 0.5 + (i % 3) * 0.25; ell(g, 0x4f9a45, 0.06, h, 0.03, 0, h, 0, 0.014); seagrass.push(g); }
  for (const [x, y, s] of [[CX - 1.5, 4.3, 0.8], [CX + 1.4, 4.6, 0.7]]) k.cloud(x, y, -3, s);
}
const P = (pts, color, z, parent = diag, w = 0.035) => { const g = k.poly(parent, pts, color, w); g.position.z = z; return g; };
P([[-1.7, 0.76], [-0.6, 0.79], [0.1, 0.67], [0.55, 0.46], [0.88, 0.21], [1.05, 0.05], [1.03, -0.06], [0.8, -0.26], [0.4, -0.5], [-0.2, -0.68], [-1.7, -0.73]], 0xeef0da, 0, diag, 0.05);
P([[-0.15, -0.66], [0.38, -0.5], [0.75, -0.28], [0.95, -0.1], [0.5, -0.38], [-0.2, -0.56]], 0xf8f7ec, 0.004, diag, 0.0001);
P([[-1.32, 0.77], [-1.06, 0.78], [-1.1, 0.02], [-1.3, 0.02]], 0x2a2433, 0.006, diag, 0.0001);
P([[0.27, 0.62], [0.52, 0.49], [0.5, 0.3], [0.3, 0.3]], 0x2a2433, 0.006, diag, 0.0001);
const palate = [[1.0, 0.03], [0.6, 0.09], [0.15, 0.14], [-0.3, 0.12], [-0.5, 0.02]];
P([...palate, [-0.5, -0.2], [-0.2, -0.3], [0.3, -0.25], [0.7, -0.12], [1.0, -0.04]], 0x6b2233, 0.01);
P([...palate, ...palate.slice().reverse().map(([x, y]) => [x, y + 0.085])], 0xe58a9a, 0.015, diag, 0.025);
const grooveLine = palate.slice(0, 4), band = (pts, d0, d1) => [...pts.map(([x, y]) => [x, y + d0]), ...pts.slice().reverse().map(([x, y]) => [x, y + d1])];
P(band(grooveLine, -0.004, 0.035), 0x3b0f1a, 0.02, diag, 0.0001);
const grooveGlow = P(band(grooveLine, -0.012, 0.045), 0xffd23a, 0.022, diag, 0.0001); grooveGlow.children[0].material = new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0 });
const tube = P(band(grooveLine, 0.0, 0.03), 0x7fd6ff, 0.024, diag, 0.0001); tube.children[0].material = new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0 });
const tongue = P(ellipsePts(0.3, 0.075), 0xf08a9a, 0.03, diag, 0.03);
{ const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.012), basic(0xc8606e)); tl.position.set(0, 0.0, 0.012); tongue.add(tl); }
{ const gc = P(ellipsePts(0.19, 0.4), 0x7a2433, 0.011); gc.position.set(-0.61, -0.07, 0.011); }
for (let i = 0; i < 5; i++) { const fl = P([[-0.74 + i * 0.065, 0.22], [-0.7 + i * 0.065, 0.22], [-0.72 + i * 0.065, -0.4]], 0xd8455a, 0.012, diag, 0.012); }
const flap = new THREE.Group(); flap.position.set(-0.6, 0.35, 0.035); diag.add(flap);
P([[0, 0], [0.2, -0.22], [0.22, -0.58], [0.08, -0.85], [-0.16, -0.86], [-0.12, -0.35]], 0xe2dfc4, 0, flap, 0.04);
const dEye = new THREE.Group(); dEye.position.set(0.38, 0.38, 0.04); diag.add(dEye);
P(ellipsePts(0.13, 0.13), 0xffffff, 0, dEye, 0.03);
const dPupil = P(ellipsePts(0.062, 0.066), 0x1e1428, 0.005, dEye, 0.0001);
{ const sh = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), basic(0xffffff)); sh.position.set(0.02, 0.025, 0.004); dPupil.add(sh); }
const dLid = P([[-0.15, 0.0], [-0.12, 0.09], [0, 0.15], [0.12, 0.09], [0.15, 0.0]], 0xd9d7bd, 0.012, dEye, 0.025);
const dDots = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), basic(0x6fd0ff)); const o = new THREE.Mesh(new THREE.CircleGeometry(0.042, 12), INK); o.position.z = -0.002; m.add(o); m.position.z = 0.06; diag.add(m); return m; });
const DPATH = [[-0.6, -0.1], [-0.35, 0.04], [0.1, 0.12], [0.6, 0.095], [1.04, 0.035], [1.6, 0.36], [2.3, 0.75]];
const pathAt = u => { u = Math.max(0, u) * (DPATH.length - 1); const i = Math.min(Math.floor(u), DPATH.length - 2), f = u - i; return [lerp(DPATH[i][0], DPATH[i + 1][0], f), lerp(DPATH[i][1], DPATH[i + 1][1], f)]; };
const dBubbles = Array.from({ length: 14 }, (_, i) => { const r = 0.03 + (i % 3) * 0.015; return { m: ell(scene, 0xe2f7ff, r, r, r, 0, 0, 0, 0.009), x0: CX - 1.4 + ((i * 0.618) % 1) * 3, z: i % 2 ? -0.6 : 0.4, sp: 0.4 + (i % 4) * 0.1, ph: i * 0.7 }; });

// ---------- regla, líneas de puntos, chorro, salpicaduras, signos ----------
const ruler = new THREE.Group(); scene.add(ruler);
block(ruler, 0xffd23a, 0, 1.45, -0.055, 0.055, 0.03, -0.03, 0.014);
for (let i = 0; i <= 20; i++) k.plane(ruler, INK, 0.012, i % 5 ? 0.035 : 0.065, i * 1.45 / 20, 0.055 - (i % 5 ? 0.0175 : 0.0325), 0.032);
function dots(n, color, r = 0.028) {
  return Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), new THREE.MeshBasicMaterial({ color, transparent: true })); const o = new THREE.Mesh(new THREE.CircleGeometry(r * 1.45, 12), new THREE.MeshBasicMaterial({ color: 0x1e1428, transparent: true })); o.position.z = -0.002; m.add(o); m.renderOrder = 6; m.visible = false; scene.add(m); return m; });
}
/** Pone una fila de puntos por una polilínea, mostrando la fracción `show` (0..1) y con un pulso que corre. */
function dotLine(pool, pts, show, t, { op = 1, march = 1.5, z = 0.3 } = {}) {
  const segs = []; let total = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); segs.push(l); total += l; }
  pool.forEach((m, i) => {
    const u = (i + 0.5) / pool.length; m.visible = u <= show && op > 0.02; if (!m.visible) return;
    let d = u * total, j = 0; while (j < segs.length - 1 && d > segs[j]) { d -= segs[j]; j++; }
    m.position.lerpVectors(pts[j], pts[j + 1], Math.min(d / segs[j], 1)); m.position.z = z;
    const s = (0.75 + 0.35 * Math.max(0, Math.sin((u * 9 - t * march) * PI))) * back(Math.min((show - u) * 8, 1));
    m.scale.setScalar(Math.max(s, 0.001)); m.material.opacity = op; m.children[0].material.opacity = op;
  });
}
const rayD = dots(22, 0xffe14a), ghostD = dots(12, 0xffffff), aimD = dots(16, 0xff8a3a), predD = dots(22, 0xffe14a, 0.03), lookD = dots(10, 0xdff8ff, 0.034);
const drop = (r = 0.04) => { const m = ell(scene, 0x8fdcff, r, r, r, 0, 0, 0, 0.012); m.visible = false; return m; };
const jetD = Array.from({ length: 30 }, (_, i) => drop(i ? 0.034 : 0.06)), hookJet = Array.from({ length: 12 }, (_, i) => drop(i ? 0.03 : 0.05));
const spray = Array.from({ length: 10 }, () => drop(0.026)), burstA = Array.from({ length: 12 }, () => drop(0.03)), burstB = Array.from({ length: 12 }, () => drop(0.035)), burstH = Array.from({ length: 10 }, () => drop(0.03));
/** Estallido de gotas en p0 a partir de t0 (con gravedad). */
function burst(pool, t, t0, p0, { up = 1.6, side = 1.1, dur = 0.65, seed = 1 } = {}) {
  pool.forEach((m, i) => {
    const u = t - t0; m.visible = u > 0 && u < dur; if (!m.visible) return;
    const a = (i / pool.length) * PI * 2 + seed, vx = Math.cos(a) * side * (0.5 + 0.5 * ((i * 0.37) % 1)), vy = up * (0.55 + 0.45 * Math.abs(Math.sin(a + 0.7)));
    m.position.set(p0.x + vx * u, p0.y + vy * u - 4.5 * u * u, p0.z + 0.2 + 0.05 * Math.sin(a * 3)); sc(m, 1 - 0.6 * u / dur);
  });
}
const rings = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.rotation.x = PI / 2; m.visible = false; scene.add(m); return m; });
function ripple(t, t0, p) { rings.forEach((m, i) => { const u = (t - t0 - i * 0.15) / 1.1; if (!(u > 0 && u < 1)) return; m.visible = true; m.position.set(p.x, WL + 0.01, p.z); m.scale.set(0.1 + 0.8 * u, 0.1 + 0.8 * u, 1); m.material.opacity = 0.9 * (1 - u); }); }
const speed = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.025), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
const sweat = [0, 1].map(() => { const m = ell(scene, 0x7cc4f0, 0.022, 0.032, 0.022, 0, 0, 0, 0.008); m.visible = false; return m; });
const mouthB = Array.from({ length: 5 }, () => { const m = ell(scene, 0xe2f7ff, 0.03, 0.03, 0.03, 0, 0, 0, 0.009); m.visible = false; return m; });
const qGhost = k.glyph('?', '#ffd23a', 0.42), okMark = k.glyph('✓', '#59c36a', 0.5), bang = k.glyph('!', '#ffd23a', 0.45), xMark = k.glyph('X', '#ff5a4a', 0.34);
const rivalQ = k.glyph('?', '#ffd23a', 0.36), rivalQ2 = k.glyph('!', '#ff8a3a', 0.36), hookBang = k.glyph('!', '#ffd23a', 0.4);
const sparks = [0, 1, 2, 3].map(() => k.glyph('✦', '#fff1a8', 0.26));

// ---------- tiempo de la caída (cámara lenta mientras el pez calcula) ----------
const tau = t => t < HIT ? 0 : t < HIT + 0.15 ? t - HIT : t < LAND - 0.35 ? 0.15 + (TF - 0.5) * lin(t, HIT + 0.15, LAND - 0.35) : Math.min(TF - 0.35 + (t - (LAND - 0.35)), TF);
const fallPos = (tt, out) => out.set(R.x + FVX * tt, R.y + FVY * tt - 0.5 * G * tt * tt, R.z);
const leafPoint = (leaf, out) => leaf.localToWorld(out.set(leaf.userData.len / 2, 0.012, 0));

// ---------- posar el pez ----------
const T = { eye: v3(), snout: v3(), fly: v3(), bug: v3(), tmp: v3(), tmp2: v3(), rA: v3(), rB: v3() };
function fishPose(t) {
  const look = T.fly;
  let p;
  if (t < c[1]) {                                           // gancho: apunta, dispara, se lo come
    if (t < HJH + 0.08) {
      const kk = prog(t, 2.35, 3.0), cc = V(lerp(CH0.x, CHS.x, kk), lerp(CH0.y, CHS.y, kk), 0);
      p = { x: cc.x, y: cc.y, pitch: lerp(0.35, PH, kk), swim: 0.3 + 0.4 * win(t, 2.35, 3.0, 0.2), look: T.bug, lid: win(t, 2.5, HJH + 0.1, 0.15) * 0.45, mouth: win(t, HJ0 - 0.04, HJH + 0.05, 0.05),
        ...moodAt(t, [[0, 'neutral'], [fueraT, 'aim']]) };
    } else {
      const kk = prog(t, HJH + 0.08, HLAND - 0.1), cc = V(lerp(CHS.x, CHF.x, kk), lerp(CHS.y, CHF.y, kk), 0), lunge = hop(t, HLAND - 0.12, 0.1, 0.3);
      p = { x: cc.x + 0.6 * lunge * Math.cos(PF), y: cc.y + lunge, pitch: lerp(PH, PF, kk), swim: t < HLAND ? 1 : 0.4, look: T.bug, mouth: win(t, HLAND - 0.16, HLAND + 0.02, 0.05),
        ...moodAt(t, [[0, 'angry'], [HLAND + 0.05, 'happy']]), squash: settle(t, HLAND + 0.03, 0.1) };
    }
  } else if (t < 6.95) {                                    // se presenta: 3/4, después de perfil con la regla
    const kk = prog(t, c[1] - 0.1, c[1] + 0.5), cc = V(lerp(CHF.x, CI.x, kk), lerp(CHF.y, CI.y, kk), 0);
    p = { x: cc.x, y: cc.y + hop(t, arqT, 0.1, 0.35), pitch: lerp(PF, 0, kk), face: lerp(0, -0.62, kk) * (1 - prog(t, mideT - 0.3, mideT + 0.15)), swim: 0.25,
      look: V(cc.x, 1.6, 9), squash: settle(t, arqT + 0.35, 0.08), ...moodAt(t, [[0, 'happy'], [arqT + 0.6, 'neutral'], [veinteT + 0.3, 'happy'], [mangT - 0.2, 'neutral']]) };
  } else if (t < CUT1) {                                    // nada hasta el manglar y mira la mosca
    const kk = prog(t, 7.0, 10.3), cc = V(lerp(CI.x, C1.x, kk), lerp(CI.y, C1.y, kk), 0);
    const lookAt = t < mosca2T - 0.1 || t > corrigeT + 0.5 ? T.fly : A;
    p = { x: cc.x, pitch: lerp(0, P1, prog(t, 9.6, 10.4)), swim: 0.3 + 0.6 * win(t, 7.0, 10.3, 0.4), look: t < 9.8 ? V(cc.x + 2, cc.y + 0.2, 1) : lookAt,
      squash: settle(t, mosca2T + 0.1, 0.1), y: cc.y + hop(t, mosca2T, 0.08, 0.3),
      ...moodAt(t, [[0, 'neutral'], [moscaT + 0.2, 'happy'], [peroT - 0.1, 'neutral'], [mosca2T, 'surprised'], [corrigeT - 0.1, 'aim'], [apuntarT + 0.25, 'happy']]) };
  } else if (t < c[6]) {                                    // (fuera de cuadro sube a la superficie) y dispara
    const kk = prog(t, CUT1 + 0.5, CUT2 - 0.5);
    p = { x: lerp(C1.x, CS.x, kk), y: lerp(C1.y, CS.y, kk), pitch: lerp(P1, PS, kk), swim: 0.3, look: T.fly, lid: 0, mouth: t > J0 - 0.05 ? 0.8 + 0.12 * Math.sin(t * 20) : 0, mood: 'aim',
      squash: t > J0 ? 1 - 0.06 * Math.exp(-6 * (t - J0)) : 1 };
  } else if (t < nadaT - 0.1) {                             // la mosca cae: la sigue con los ojos y calcula
    const kk = prog(t, HIT, HIT + 0.8);
    p = { x: lerp(CS.x, CS2.x, kk), y: lerp(CS.y, CS2.y, kk), pitch: lerp(PS, 0.5, kk), swim: 0.35, look: T.fly, mouth: t < HIT ? 0.8 : 0.8 * (1 - prog(t, HIT, HIT + 0.25)),
      ...moodAt(t, [[0, 'aim'], [HIT + 0.1, 'surprised'], [decimaT - 0.2, 'aim'], [tocarT - 0.1, 'surprised'], [tocarT + 0.4, 'angry']]), squash: settle(t, tocarT, 0.1) };
  } else {                                                  // nada hasta donde va a caer, espera y se la come
    const kk = prog(t, nadaT - 0.1, antesT + 1.4), cc = V(lerp(CS2.x, CF.x, kk), lerp(CS2.y, CF.y, kk), 0), lunge = hop(t, LAND - 0.2, 0.14, 0.42);
    p = { x: cc.x + 0.5 * lunge * Math.cos(PF), y: cc.y + lunge, pitch: lerp(0.5, PF, kk), swim: t < antesT + 1.4 ? 1 : 0.35, look: t < LAND + 0.4 ? T.fly : V(cc.x, 1.8, 9),
      mouth: t < LAND - 0.3 ? 0 : win(t, LAND - 0.25, LAND + 0.04, 0.06) * 1.1, squash: settle(t, LAND + 0.04, 0.14) * (1 + 0.06 * hop(t, LAND + 0.7, 1, 0.4)),
      ...moodAt(t, [[0, 'angry'], [antesT + 1.4, 'aim'], [LAND + 0.05, 'happy']]) };
    p.y += hop(t, LAND + 0.7, 0.12, 0.4);
  }
  fish.pose({ t, ...p });
  fish.eye(T.eye); fish.snout(T.snout);
}

function rivalPose(t) {
  const on = t > otrosT - 0.5;
  rivalA.root.visible = rivalB.root.visible = on; if (!on) return;
  const kA = prog(t, otrosT - 0.4, LAND + 0.15), kB = prog(t, otrosT - 0.2, LAND + 0.3), late = t > LAND + 0.1;
  rivalA.pose({ t, x: lerp(4.4, 2.95, kA), y: lerp(1.2, 1.72, kA), z: -0.35, face: PI, pitch: 0.5 * kA, swim: late ? 0.3 : 1, look: late ? V(2.6, 1.9, 6) : T.fly, kk: 2.3,
    ...moodAt(t, [[0, 'angry'], [LAND + 0.1, 'surprised'], [LAND + 0.6, 'worried']]), squash: settle(t, LAND + 0.15, 0.12) });
  rivalB.pose({ t, x: lerp(4.2, 2.6, kB), y: lerp(0.55, 0.95, kB), z: -0.95, face: PI, pitch: 0.35 * kB, swim: late ? 0.3 : 1, look: late ? V(2, 1.8, 6) : T.fly, kk: 4.1,
    ...moodAt(t, [[0, 'angry'], [LAND + 0.2, 'surprised'], [LAND + 0.7, 'angry']]), squash: settle(t, LAND + 0.3, 0.12) });
  rivalA.root.getWorldPosition(T.rA); rivalB.root.getWorldPosition(T.rB);
}

function bugsPose(t) {
  // mosca
  leafMain.updateMatrixWorld(true); leafPoint(leafMain, T.tmp);
  if (t < HIT) {
    const blast = t > JH ? 1 : 0, jit = blast * 0.02 * Math.sin(t * 47);
    fly.pose({ x: T.tmp.x + jit, y: T.tmp.y + 0.004 * Math.sin(t * 6), z: T.tmp.z + 0.03, face: -0.9 + 0.2 * blast, spin: -0.25 * blast, t, flap: blast ? 1 : 0.3 * win(t, moscaT, moscaT + 0.8, 0.15),
      rub: blast ? 0 : 1, flail: blast * 0.4, ...moodAt(t, [[0, 'neutral'], [moscaT, 'happy'], [hojaT(), 'neutral'], [JH, 'effort']]) });
    fly.root.visible = true; fly.root.getWorldPosition(T.fly);
  } else if (t < LAND + 0.03) {
    const tt = tau(t); fallPos(tt, T.fly);
    fly.pose({ x: T.fly.x, y: T.fly.y, z: R.z + 0.03, face: -0.9, spin: -0.25 - tt * 9 - 0.25 * Math.sin(t * 1.3), t: HIT + (t - HIT) * 0.25, flap: 1, flail: 1, mood: t < HIT + 1.2 ? 'surprised' : 'effort',
      s: t > LAND - 0.03 ? Math.max(1 - (t - (LAND - 0.03)) / 0.06, 0.01) : 1 });
    fly.root.visible = true;
  } else { fly.root.visible = false; fallPos(TF, T.fly); }
  // fantasma (donde la ve el pez)
  const g = popIn(t, mosca2T + 0.2, corrigeT + 0.9) * 1;
  ghost.root.visible = g > 0.02;
  if (ghost.root.visible) ghost.pose({ x: A.x, y: A.y + 0.03 * Math.sin(t * 3), z: A.z, face: -0.9, t, rub: 1, mood: 'neutral', s: Math.max(g, 0.01) });
  // escarabajo del gancho
  leafHook.updateMatrixWorld(true); leafPoint(leafHook, T.tmp2);
  if (t < HJH) { beetle.pose({ x: T.tmp2.x, y: T.tmp2.y, z: T.tmp2.z + 0.03, face: -0.8, t, rub: 0.5, mood: 'neutral' }); beetle.root.visible = true; }
  else if (t < HLAND + 0.02) { const u = t - HJH; beetle.pose({ x: B.x + HVX * u, y: B.y + HVY * u - 0.5 * G * u * u, z: B.z + 0.03, face: -0.8, spin: -u * 12, t, flail: 1, mood: 'surprised', s: t > HLAND - 0.03 ? 0.4 : 1 }); beetle.root.visible = true; }
  else beetle.root.visible = false;
  beetle.root.getWorldPosition(T.bug);
}
const hojaT = () => at('hoja', c[2]), pareceT = () => at('parece', c[2]);

function jets(t) {
  // gancho
  hookJet.forEach((m, i) => {
    const h = lin(t, HJ0, HJH), u = h - i * 0.07; m.visible = t > HJ0 && t < HJH + 0.12 && u > 0; if (!m.visible) return;
    const M = T.snout, f = t > HJH ? (t - HJH) : 0; m.position.set(lerp(M.x, B.x, u), lerp(M.y, B.y, u) - 0.1 * 4 * u * (1 - u) - 3 * f * f, 0.1);
  });
  burst(burstH, t, HJH, B, { up: 1.2, side: 0.8, seed: 0.3 });
  // principal
  const M = T.snout, tgt = t < HIT ? T.fly : R;
  jetD.forEach((m, i) => {
    let u;
    if (t < J0 || t > HIT + 0.7) { m.visible = false; return; }
    if (t < JH) u = prog(t, J0, JH) * 1.0 - i * 0.034;
    else if (t < HIT) u = ((t - JH) * 1.7 + i / jetD.length) % 1;
    else u = ((HIT - JH) * 1.7 + i / jetD.length) % 1;
    m.visible = u > 0 && u <= 1; if (!m.visible) return;
    const f = t > HIT ? t - HIT : 0;
    m.position.set(lerp(M.x, tgt.x, u) + 0.012 * Math.sin(t * 30 + i), lerp(M.y, tgt.y, u) - 0.12 * 4 * u * (1 - u) - 4 * f * f, 0.12);
    sc(m, (t < JH && i === 0 ? 1.4 : 0.85 + 0.25 * Math.sin(t * 25 + i * 2)) * (t > HIT ? Math.max(1 - f / 0.7, 0.05) : 1));
    if (m.position.y < WL - 0.02 && u > 0.2) m.visible = false;
  });
  spray.forEach((m, i) => {
    m.visible = t > JH && t < HIT; if (!m.visible) return;
    const u = ((t * 2.6 + i / spray.length) % 1), a = i * 2.4;
    m.position.set(T.fly.x + Math.cos(a) * 0.3 * u, T.fly.y + 0.05 + Math.abs(Math.sin(a)) * 0.35 * u - 0.6 * u * u, 0.15); sc(m, 1 - 0.7 * u);
  });
  burst(burstA, t, JH, R, { up: 1.0, side: 0.9, seed: 1.1, dur: 0.55 });
  burst(burstB, t, LAND, L, { up: 2.0, side: 0.9, seed: 0.6, dur: 0.75 });
  rings.forEach(m => { m.visible = false; });
  ripple(t, LAND, L); ripple(t, HLAND, LH);
}

function lines(t) {
  // la luz que se dobla: mosca -> superficie -> ojo del pez
  const rOn = win(t, doblaT - 0.35, corrigeT + 0.4, 0.25);
  dotLine(rayD, [R, S, T.eye], prog(t, doblaT - 0.35, at('luz', c[2]) + 0.35), t, { op: rOn });
  dotLine(ghostD, [S, A], prog(t, mosca2T + 0.1, mosca2T + 0.6), t, { op: 0.85 * win(t, mosca2T, corrigeT + 0.6, 0.25), march: -1.5 });
  // puntería: primero a la falsa, después a la de verdad
  const aimTo = T.tmp.copy(A).lerp(R, prog(t, corrigeT + 0.1, corrigeT + 0.8));
  dotLine(aimD, [T.snout, aimTo], prog(t, corrigeT - 0.2, corrigeT + 0.2), t, { op: win(t, corrigeT - 0.2, CUT1, 0.2), march: 3 });
  // mira la caída y calcula dónde va a tocar el agua
  dotLine(lookD, [T.eye, T.fly], prog(t, decimaT - 0.3, decimaT + 0.2), t, { op: win(t, decimaT - 0.3, calculaT + 0.3, 0.2), march: 3 });
  const pts = []; const t0 = tau(Math.max(t, HIT)); for (let i = 0; i <= 12; i++) pts.push(fallPos(lerp(t0, TF, i / 12), v3()));
  dotLine(predD, pts, prog(t, calculaT - 0.15, calculaT + 0.9), t, { op: win(t, calculaT - 0.15, LAND - 0.25, 0.2), march: 2 });
}

function closeup(t) {
  diag.position.y = 2.0 + 0.025 * Math.sin(t * 1.6); diag.rotation.z = 0.012 * Math.sin(t * 1.1);
  const ty = lerp(-0.2, 0.055, prog(t, lenguaT + 0.1, lenguaT + 0.7)), tp = 1 + 0.12 * win(t, lenguaT - 0.05, lenguaT + 0.5, 0.2) * Math.sin((t - lenguaT) * 14);
  tongue.position.set(0.35 + 0.02 * Math.sin(t * 3), ty, 0.03); tongue.scale.set(tp, tp * (1 + 0.15 * prog(t, lenguaT + 0.5, lenguaT + 0.8)), 1);
  grooveGlow.children[0].material.opacity = win(t, canaletaT - 0.1, canonT + 0.3, 0.2) * (0.45 + 0.4 * Math.sin(t * 11));
  tube.children[0].material.opacity = prog(t, canonT - 0.2, canonT + 0.2) * (0.75 + 0.25 * Math.sin(t * 9));
  const shut = prog(t, golpeT - 0.06, golpeT + 0.04), u = t - golpeT - 0.04;
  flap.rotation.z = lerp(-0.32 - 0.07 * Math.sin(t * 3.2), 0, shut) + (u > 0 ? 0.08 * Math.exp(-8 * u) * Math.sin(30 * u) : 0);
  dEye.scale.set(1, Math.max(1 - 0.9 * blinkAt(t, 0.7), 0.1), 1);
  dPupil.position.set(0.035 + 0.01 * Math.sin(t * 2), 0.03, 0.005);
  dLid.visible = t > golpeT - 0.1 && t < CUT2;                                   // aprieta el ojo al cerrar de golpe
  dDots.forEach((m, i) => {
    const uu = (t - golpeT - i * 0.03) / 0.5;
    if (uu <= 0) { m.position.set(-0.62 + 0.09 * Math.sin(t * 2.2 + i) + ((i * 0.31) % 1) * 0.12, -0.32 + ((i * 0.53) % 1) * 0.5 + 0.04 * Math.sin(t * 3 + i), 0.06); m.scale.setScalar(0.8 + 0.2 * Math.sin(t * 5 + i)); m.visible = t > agallasT - 0.3; }
    else { const [x, y] = pathAt(Math.min(uu, 1)); m.position.set(x, y, 0.06); m.visible = uu < 1; m.scale.setScalar(uu > 0.66 ? 1.3 : 0.9); }
  });
  dBubbles.forEach(b => { const y = ((t * b.sp + b.ph) % 3.2); b.m.position.set(b.x0 + 0.06 * Math.sin(t * 3 + b.ph), 0.2 + y, b.z); b.m.visible = true; });
}

function life(t) {
  const W = x => wave(x, t), W2 = x => wave(x, t, 3.4);
  tint(W, () => -0.6); hi(W, x => W(x) - 0.06); line(x => W(x) + 0.028, W);
  tint2(W2, () => -1.2); hi2(W2, x => W2(x) - 0.06); line2(x => W2(x) + 0.028, W2);
  caustics.forEach((tx, i) => { tx.offset.set(t * (0.03 + 0.01 * i) * (i % 2 ? -1 : 1) + 0.02 * Math.sin(t * 0.9 + i), t * 0.02 + 0.015 * Math.cos(t * 1.1 + i)); });
  topTex.offset.set(t * 0.04, 0);
  rays.forEach((m, i) => { m.material.opacity = 0.07 + 0.05 * Math.sin(t * 1.3 + i * 1.7); m.rotation.z = 0.3 + 0.04 * Math.sin(t * 0.7 + i); });
  seagrass.forEach((g, i) => { g.rotation.z = 0.14 * Math.sin(t * 1.5 + i * 0.9); g.rotation.x = 0.06 * Math.sin(t * 1.1 + i); });
  leaves.forEach(g => { const d = g.userData, base = d.dir > 0 ? -d.tilt : d.tilt; g.rotation.z = 0.06 * Math.sin(t * 1.7 + d.i * 1.3); g.rotation.x = base + 0.04 * Math.sin(t * 1.3 + d.i); });
  leafMain.rotation.z += (t > JH && t < HIT ? 0.12 * Math.sin(t * 40) : 0) + (t > HIT ? 0.25 * Math.exp(-3 * (t - HIT)) * Math.sin(14 * (t - HIT)) : 0);
  leafHook.rotation.z += t > HJH ? 0.25 * Math.exp(-3 * (t - HJH)) * Math.sin(14 * (t - HJH)) : 0;
  floater.position.set(-2.2 + 0.08 * t, wave(-2.2 + 0.08 * t, t) + 0.012, 0.8); floater.rotation.y = 0.2 * t;
  bubbles.forEach(b => { const y = (t * b.sp + b.ph) % (WL - 0.1); b.m.position.set(b.x0 + 0.05 * Math.sin(t * 3 + b.ph), 0.05 + y, b.z); sc(b.m, 0.6 + 0.4 * y / WL); });
  plankton.forEach(p => { p.m.position.set(p.x0 + 0.15 * Math.sin(t * 0.5 + p.ph), p.y0 + 0.1 * Math.sin(t * 0.7 + p.ph * 2), p.z); });
  school.forEach(s => { const span = 17, u = ((t * s.sp + s.off) % span), x = s.dir > 0 ? -9.5 + u : 7.5 - u; s.f.pose({ t, x, y: s.y + 0.08 * Math.sin(t + s.off), z: s.z, face: s.dir > 0 ? 0 : PI, swim: 0.6, kk: s.off }); });
  { const x = 0.4 + 0.9 * Math.sin(t * 0.55), vx = Math.cos(t * 0.55); crab.position.set(x, 0.0 + 0.01 * Math.abs(Math.sin(t * 16)), 0.95); crab.rotation.y = 0.15 * Math.sin(t * 0.4);
    crabLegs.forEach((g, i) => { g.rotation.z = g.userData.sd * 0.35 * Math.sin(t * 16 + i * 2) * Math.abs(vx); });
    crabClaws.forEach(([cl, pin], i) => { cl.rotation.z = (i ? -1 : 1) * 0.2 * Math.sin(t * 2.3 + i); pin.rotation.z = 0.4 * Math.abs(Math.sin(t * 3 + i)); }); }
  // burbujas que salen del hocico del pez, solo debajo del agua
  mouthB.forEach((m, i) => { const u = ((t * 0.6 + i / mouthB.length) % 1); m.position.set(T.snout.x + 0.05 * Math.sin(t * 4 + i), T.snout.y + 0.05 + u * 0.9, 0.2); m.visible = m.position.y < WL - 0.05 && !(t > J0 && t < HIT); });
  // líneas de velocidad cuando el pez nada rápido
  const dashing = (t > HJH + 0.1 && t < HLAND - 0.1) || (t > nadaT && t < antesT + 1.2) || (t > 7.2 && t < 9.9);
  speed.forEach((m, i) => { m.visible = dashing; if (!dashing) return; m.position.set(fish.root.position.x - 0.75 - 0.15 * ((i * 3) % 5) + 0.15 * Math.sin(t * 40 + i), fish.root.position.y - 0.25 + i * 0.1, 0.4); m.rotation.z = t > nadaT ? 0.12 : t < c[1] ? 0.6 : 0; m.material.opacity = 0.45 + 0.35 * Math.sin(t * 50 + i * 2); });
  // gotas de sudor de la mosca en la caída
  sweat.forEach((m, i) => { const on = t > HIT + 1.4 && t < LAND - 0.4, u = (t * 1.4 + i / 2) % 1, s = i ? 1 : -1; m.visible = on; if (!on) return; m.position.set(T.fly.x + s * (0.14 + 0.15 * u), T.fly.y + 0.22 + 0.2 * u - 0.4 * u * u, 0.25); sc(m, 1 - u * 0.6); });
}

function signs(t) {
  k.glyphAt(qGhost, A, 0.05, 0.36, popIn(t, mosca2T + 0.6, corrigeT + 0.6), 0.15 * Math.sin(t * 6));
  k.glyphAt(okMark, R, 0.0, 0.42, popIn(t, apuntarT + 0.1, CUT1 + 0.05));
  k.glyphAt(hookBang, B, 0, 0.36, popIn(t, HJH, HJH + 0.55));
  k.glyphAt(bang, T.eye, 0.0, 0.5, popIn(t, tocarT - 0.1, c[7] + 0.4), 0.1 * Math.sin(t * 8));
  k.glyphAt(xMark, L, 0, 0.16, popIn(t, calculaT + 0.8, LAND) * (1 + 0.12 * Math.sin(t * 8)));
  k.glyphAt(rivalQ, T.rA, 0, 0.5, popIn(t, LAND + 0.2, END + 1), 0.12 * Math.sin(t * 6));
  k.glyphAt(rivalQ2, T.rB, 0, 0.45, popIn(t, LAND + 0.3, END + 1), 0.12 * Math.sin(t * 5));
  sparks.forEach((m, i) => { const kk = popIn(t, LAND + 0.15 + i * 0.08, END + 1) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)); k.glyphAt(m, T.eye, [-0.45, 0.4, -0.3, 0.5][i], [0.25, 0.35, -0.2, -0.1][i], Math.max(kk, 0), t * 1.5 + i); });
  const rk = popIn(t, mideT - 0.1, mangT - 0.3);
  ruler.visible = rk > 0.01; ruler.scale.setScalar(Math.max(rk, 0.001)); ruler.position.set(CI.x - 0.78, 0.86 + 0.01 * Math.sin(t * 2), 0.35);
}

// ---------- cámara ----------
k.shots([
  { t: 0, pos: [-5.3, 2.2, 6.6], look: [-5.3, 2.15, 0] },
  { t: fueraT - 0.25, pos: [-4.85, 2.7, 3.9], look: [-4.85, 2.72, 0] },
  { t: escT - 0.3, pos: [-5.1, 2.2, 6.1], look: [-5.1, 2.15, 0] },
  { t: HLAND - 0.18, pos: [-4.6, 1.75, 4.1], look: [-4.6, 1.65, 0] },
  { t: arqT - 0.1, pos: [-4.72, 1.5, 3.0], look: [-4.72, 1.45, 0] },
  { t: mideT - 0.15, pos: [-4.75, 1.3, 5.2], look: [-4.75, 1.25, 0] },
  { t: veinteT + 0.45, pos: [-4.6, 1.45, 6.6], look: [-4.6, 1.4, 0] },
  { t: mangT - 0.4, pos: [-4.4, 2.7, 9.0], look: [-4.3, 2.7, 0] },
  { t: sudT - 0.1, pos: [-2.2, 2.8, 9.6], look: [-2.1, 2.75, 0], glide: true },
  { t: ausT - 0.1, pos: [-0.5, 2.0, 6.0], look: [-0.6, 1.85, 0] },
  { t: moscaT - 0.3, pos: [R.x, R.y + 0.1, 3.4], look: [R.x, R.y + 0.07, 0] },
  { t: peroT - 0.1, pos: [0.3, 2.15, 9.5], look: [0.3, 2.35, 0] },
  { t: doblaT - 0.3, pos: [0.35, 2.2, 6.2], look: [0.4, 2.4, 0] },
  { t: mosca2T - 0.2, pos: [0.3, 2.2, 8.9], look: [0.3, 2.45, 0] },
  { t: pareceT() - 0.3, pos: [1.15, 3.0, 5.3], look: [1.15, 3.1, 0] },
  { t: corrigeT - 0.25, pos: [-0.2, 1.75, 4.0], look: [-0.2, 1.7, 0] },
  { t: apuntarT - 0.15, pos: [0.3, 2.15, 6.9], look: [0.3, 2.35, 0] },
  { t: CUT1, pos: [CX + 0.05, 2.15, 5.9], look: [CX + 0.05, 2.1, 0], cut: true },
  { t: canaletaT - 0.2, pos: [CX + 0.5, 2.2, 4.0], look: [CX + 0.5, 2.15, 0] },
  { t: canonT - 0.4, pos: [CX + 0.1, 2.2, 5.6], look: [CX + 0.1, 2.15, 0] },
  { t: agallasT - 0.3, pos: [CX - 0.45, 2.0, 3.9], look: [CX - 0.45, 2.0, 0] },
  { t: golpeT + 0.12, pos: [CX + 0.25, 2.15, 5.6], look: [CX + 0.3, 2.15, 0] },
  { t: CUT2, pos: [0.55, 2.15, 7.5], look: [0.55, 2.4, 0], cut: true },
  { t: dosT - 0.9, pos: [R.x - 0.15, 2.75, 4.4], look: [R.x - 0.15, 2.85, 0] },
  { t: HIT - 0.1, pos: [1.0, 2.25, 6.6], look: [1.1, 2.6, 0] },
  { t: decimaT - 0.4, pos: [0.05, 1.85, 3.9], look: [0.05, 1.85, 0] },
  { t: calculaT - 0.3, pos: [0.85, 2.15, 7.0], look: [0.85, 2.35, 0] },
  { t: tocarT - 0.1, pos: [1.7, 2.35, 4.6], look: [1.7, 2.45, 0] },
  { t: nadaT - 0.25, pos: [0.8, 2.05, 6.6], look: [0.8, 2.1, 0] },
  { t: otrosT - 0.45, pos: [1.5, 2.05, 7.2], look: [1.55, 2.15, 0], glide: true },
  { t: otrosT - 0.3, pos: [2.1, 2.1, 9.2], look: [2.15, 2.2, 0] },
  { t: c[8], pos: [2.05, 2.1, 5.6], look: [2.05, 2.3, 0] },
  { t: LAND + 0.6, pos: [1.75, 2.0, 3.7], look: [1.75, 1.95, 0] },
], { move: 0.2 });

// ---------- carteles ----------
tag({ text: 'Fuera del agua', big: true, off: BIG, from: fueraT - 0.1, to: escT - 0.15 });
tag({ text: '¡A escupitajos!', big: true, off: BIG, from: escT, to: c[1] });
tag({ text: 'Pez arquero', at: () => T.eye, off: [200, -300], from: arqT - 0.1, to: mideT + 0.2 });
tag({ text: 'Menos de 20 cm', big: true, off: BIG, from: veinteT - 0.15, to: mangT - 0.35 });
tag({ text: 'Manglares', at: () => T.tmp2.set(-5.55, 2.45, -0.9), off: [200, -300], from: mangT - 0.1, to: sudT + 0.6 });
tag({ text: 'Sudeste asiático', big: true, off: BIG, from: sudT - 0.1, to: ausT - 0.15 });
tag({ text: 'Norte de Australia', big: true, off: BIG, from: ausT - 0.1, to: c[2] - 0.05 });
tag({ text: 'Mosca', at: () => T.fly, off: [-230, -260], from: moscaT, to: peroT - 0.1 });
tag({ text: 'La luz se dobla', big: true, off: BIG, from: doblaT - 0.3, to: mosca2T - 0.1 });
tag({ text: 'Donde parece', at: () => A, off: [-260, -170], from: mosca2T + 0.5, to: corrigeT - 0.3 });
tag({ text: 'Donde está', at: () => T.fly, off: [-120, 210], from: mosca2T + 0.9, to: corrigeT - 0.3 });
tag({ text: 'Corrige el error', big: true, off: BIG, from: corrigeT, to: CUT1 });
tag({ text: 'Lengua', at: () => T.tmp.set(CX + 0.3, tongue.position.y + diag.position.y, 0.1), off: [-150, 330], from: lenguaT - 0.05, to: canonT - 0.4 });
tag({ text: 'Canaleta del paladar', at: () => T.tmp2.set(CX + 0.62, diag.position.y + 0.1, 0.1), off: [-80, -380], from: canaletaT - 0.05, to: c[5] });
tag({ text: '¡Un cañón!', big: true, off: BIG, from: canonT - 0.15, to: c[5] });
tag({ text: 'Agallas', at: () => T.tmp.set(CX - 0.6, diag.position.y - 0.2, 0.1), off: [170, 340], from: agallasT - 0.1, to: CUT2 });
tag({ text: '¡De golpe!', big: true, off: BIG, from: golpeT - 0.1, to: CUT2 });
tag({ text: 'Hasta unos 2 metros', big: true, off: BIG, from: dosT - 0.25, to: c[6] });
tag({ text: 'Cámara lenta', off: [540, 260], from: HIT + 0.5, to: LAND - 0.3 });
tag({ text: '0,1 segundos', big: true, off: BIG, from: decimaT - 0.2, to: calculaT - 0.3 });
tag({ text: 'Acá va a caer', at: () => L, off: [-60, -330], from: calculaT + 0.9, to: c[7] + 0.4 });
tag({ text: '¡Llega antes!', big: true, off: BIG, from: antesT - 0.1, to: otrosT - 0.2 });
tag({ text: 'Competencia', at: () => T.rA, off: [-230, -250], from: otrosT + 0.3, to: LAND });
tag({ text: '¡Atrapada!', big: true, off: BIG, from: LAND + 0.1, to: END + 1 });

// ---------- sonido ----------
sfx(0, 'boom', 0.5);
sfx(HJ0, 'hiss', 0.4); sfx(HJH, 'riser_to', 0.8); sfx(HJH, 'tap', 0.6); sfx(HLAND, 'pop', 0.7); sfx(HJH + 0.1, 'whoosh', 0.6);
[0, 0.3, 0.6].forEach(d => sfx(doblaT - 0.3 + d, 'tap', 0.45));
sfx(mosca2T + 0.6, 'pop', 0.6); sfx(apuntarT + 0.1, 'tap', 0.7);
sfx(canonT, 'riser_to', 0.9); sfx(canonT, 'boom', 0.4);
sfx(golpeT, 'thud', 0.8);
sfx(J0, 'hiss', 0.6);
sfx(HIT, 'riser_to', 0.9); sfx(HIT, 'thud', 0.55);
[0, 0.3, 0.6].forEach(d => sfx(calculaT - 0.1 + d, 'tap', 0.45));
sfx(nadaT - 0.05, 'whoosh', 0.7); sfx(otrosT, 'whoosh', 0.4);
sfx(LAND, 'riser_to', 0.9); sfx(LAND, 'splash', 0.7); sfx(LAND + 0.1, 'boom', 0.35);

// ---------- cuadro ----------
k.follow(() => T.eye);
k.run(t => {
  life(t);
  bugsPose(t);
  fishPose(t);
  bugsPose(t);                                              // segunda pasada: la mosca ya sabe dónde está el pez (y al revés)
  fishPose(t);
  rivalPose(t);
  jets(t);
  lines(t);
  closeup(t);
  signs(t);
});
