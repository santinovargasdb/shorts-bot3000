// Episodio: el Ejército Fantasma (23rd Headquarters Special Troops, 1944-45): tanques de goma, parlantes y radio falsa.
// Cinco decorados uno al lado del otro en x:
//   CAMPO (0: campo de Normandía con granero, cerco y los tanques inflables; acá pasan el gancho, el inflado y los franceses en bici)
//   CARPA (40: el taller de los soldados-artistas y la radio)
//   LOMA  (80: el observador enemigo con binoculares)
//   RUTA  (120: el semioruga con parlantes gigantes)
//   OFICINA (160: el mapa de los engaños y la carpeta secreta)
// Tiempos de out/fantasma/timing.json (python -m anim3d.narrar fantasma).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, windowPic, hills } from '/lib/decor.js';

const k = await setup('fantasma');
const { scene, c, at, END, sfx, tag, BIG } = k;
const FX = 0, CX = 40, EX = 80, SX = 120, MX = 160;
const S = (o, s) => { o.visible = s > 0.01; o.scale.setScalar(Math.max(s, 0.001)); };
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), tmp3 = V(0, 0, 0), hv = V(0, 0, 0);

// ---------- tiempos (palabras) ----------
const ejT = at('ejercito', 0), erT = at('eran', 4), gomaT = at('goma', 0);
const tropT = at('tropas', c[1]), peroT = at('pero', c[1]), fanT = at('fantasma', c[1]);
const milT = at('mil', c[2]), artT = at('artistas', c[2]), arqT = at('arquitectos', c[2]), disT = at('disenadores', c[2]);
const pinT = at('pintor', c[3]), kelT = at('ellsworth', c[3]), elT = at('el', at('kelly', c[3])), blT = at('bill', c[3]);
const misT = at('mision', c[4]), vieT = at('viera', c[4]), noT = at('no', at('donde', c[4])), casiT = at('casi', c[4]);
const inflT = at('inflan', c[5]), tanqT = at('tanques', c[5]), canT = at('canones', c[5]), camT = at('camiones', c[5]), goma2T = at('goma', c[5]), lejT = at('desde', c[5]), verT = at('parecen', c[5]);
const escT = at('escucha', c[6]), asiT = at('asi', c[6]), parT = at('parlantes', c[6]), vehT = at('vehiculos', c[6]), ruiT = at('ruido', c[6]), oyeT = at('oye', c[6]), kmT = at('veinticuatro', c[6]);
const radT = at('radio', c[7]), menT = at('mensajes', c[7]), uniT = at('unidades', c[7]);
const franT = at('franceses', c[8]), bicT = at('bicicleta', c[8]), venT = at('ven', c[8]), cuaT = at('cuatro', c[8]), levT = at('levantar', c[8]), tanq2T = at('tanque', c[8]), manT = at('manos', c[8]);
const guaT = at('guardia', c[9]), losT = at('los', c[9]), fueT = at('fuertes', c[9]);
const vteT = at('veinte', c[10]), euT = at('europa', c[10]);
const secT = at('secreto', c[11]), cinT = at('cincuenta', c[11]), noveT = at('noventa', c[11]), seisT = at('seis', c[11]);
const POKE = gomaT - 0.2;
const LIFT = levT - 0.05;
const POV0 = lejT - 0.05, POV1 = c[6];

// ---------- piezas propias ----------
const rb = (w, h, d, r, col, ow = 0.022) => outlined(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), col.isMaterial ? col : flat(col)), ow);
/** Barra (cilindro) entre dos puntos. */
const YUP = V(0, 1, 0);
function rod(parent, a, b, r, color, ow = 0.008) {
  const d = V(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
  const m = outlined(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), color.isMaterial ? color : flat(color)), ow);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(YUP, d.normalize()); parent.add(m); return m;
}
function cvTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const OLIVE = 0x6e7d3c, OLIVE_D = 0x53602c, RUBBER = 0x8fae55, RUBBER_D = 0x6c8a3c, GREY = 0x7a827b;

/** Casco redondo (M1 o el gris del enemigo, sin insignias) apoyado sobre la cabeza. */
function helmet(toon, color = OLIVE) {
  const g = new THREE.Group(); toon.head.add(g);
  const dome = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.338, 28, 14, 0, PI * 2, 0, 1.02), flat(color, { side: THREE.DoubleSide })), 0.02);
  g.add(dome);
  const brim = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.33, 0.035, 28), flat(color)), 0.012); brim.position.y = 0.338 * Math.cos(1.02); g.add(brim);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 24, PI), INK); strap.rotation.set(0, PI / 2, PI); strap.position.y = 0.17; strap.scale.y = 1.25; g.add(strap);
  g.rotation.x = -0.14; return g;
}
const SKINS = [0xf6d2ae, 0xe8b98f, 0xd9a178, 0xf3c9a4, 0xc98a5e];
function soldier(i, { shirt = OLIVE, hair = 0x3a2a1c, hel = OLIVE, detail = ['belt', 'buttons'], mustache = false, noHelmet = false } = {}) {
  const t = makeToon({ shirt, skin: SKINS[i % SKINS.length], hair, detail, mustache, trim: 0x9c8f5a }); scene.add(t.root);
  if (!noHelmet) helmet(t, hel);
  return t;
}

/** Tanque: rubber = inflable (redondeado, costuras, válvula, parche, brillo); si no, el de verdad (remaches, estrella, antena). */
function makeTank(rubber, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const body = new THREE.Group(); g.add(body);
  const C = rubber ? RUBBER : 0x55612e, D = rubber ? RUBBER_D : 0x3b4421, TR = rubber ? 0x59604f : 0x2e322a;
  for (const s of [-1, 1]) { const tr = rb(2.5, 0.56, 0.34, rubber ? 0.17 : 0.07, TR); tr.position.set(0, 0.3, s * 0.5); body.add(tr); }
  const wheels = [];
  for (let i = 0; i < 5; i++) {
    const wx = -0.96 + i * 0.48;
    if (rubber) {      // ruedas PINTADAS sobre la goma
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), basic(0x9ea28d)); d.position.set(wx, 0.29, 0.672); body.add(d);
      const d2 = new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), basic(0x59604f)); d2.position.set(wx, 0.29, 0.675); body.add(d2);
    } else wheels.push(k.wheel(body, wx, 0.29, 0.675, 0.17));
  }
  const hull = rb(2.2, 0.5, 1.0, rubber ? 0.11 : 0.04, C); hull.position.set(0, 0.8, 0); body.add(hull);
  const nose = rb(0.5, 0.42, 0.96, rubber ? 0.13 : 0.04, D); nose.position.set(1.05, 0.72, 0); nose.rotation.z = -0.5; body.add(nose);
  const tur = new THREE.Group(); tur.position.set(-0.15, 1.05, 0); body.add(tur);
  if (rubber) {
    const dome = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.5, 26, 16), flat(C)), 0.022); dome.scale.set(1, 0.56, 0.82); dome.position.y = 0.18; tur.add(dome);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 6, 40), INK); seam.rotation.x = PI / 2; seam.scale.set(1, 0.82, 1); seam.position.y = 0.18; tur.add(seam);
    const hatch = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), flat(D)), 0.015); hatch.scale.y = 0.45; hatch.position.set(-0.1, 0.45, 0); tur.add(hatch);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); shine.scale.set(1.6, 0.6, 1); shine.position.set(0.08, 0.36, 0.33); shine.rotation.x = -0.5; tur.add(shine);
  } else {
    const cyl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.4, 24), flat(C)), 0.022); cyl.position.y = 0.2; tur.add(cyl);
    block(tur, D, 0.36, 0.56, 0.08, 0.36, 0.2, -0.2, 0.014);
    const hatch = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 18), flat(D)), 0.012); hatch.position.set(-0.12, 0.43, 0); tur.add(hatch);
    rod(tur, [-0.25, 0.4, -0.25], [-0.32, 1.35, -0.3], 0.012, 0x2e322a, 0.004);
    picture(tur, 0.36, 0.36, -0.05, 0.2, 0.437, (gg, W, H) => {      // estrella blanca (marca de EE.UU.)
      gg.strokeStyle = '#f4f1e8'; gg.lineWidth = 14; gg.beginPath(); gg.arc(W / 2, H / 2, W * 0.42, 0, 7); gg.stroke();
      gg.fillStyle = '#f4f1e8'; gg.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? W * 0.15 : W * 0.37; gg.lineTo(W / 2 + r * Math.cos(a), H / 2 + r * Math.sin(a)); } gg.fill();
    });
    for (let i = 0; i < 9; i++) { const rv = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), basic(0x2e322a)); rv.position.set(-0.98 + i * 0.245, 0.98, 0.505); body.add(rv); }
    block(body, D, -0.7, -0.1, 0.62, 0.74, 0.56, 0.5, 0.01);            // caja de herramientas
    const lampM = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 12), flat(0xffe9a3)), 0.01); lampM.rotation.z = PI / 2; lampM.position.set(1.28, 0.9, 0.36); body.add(lampM);
  }
  const pivot = new THREE.Group(); pivot.position.set(0.4, 0.2, 0); tur.add(pivot);
  const br = rubber ? 0.075 : 0.055;
  const barrel = outlined(new THREE.Mesh(new THREE.CylinderGeometry(br * 0.92, br, 1.15, 12), flat(rubber ? C : D)), 0.014); barrel.rotation.z = -PI / 2; barrel.position.x = 0.575; pivot.add(barrel);
  const muzzle = outlined(new THREE.Mesh(new THREE.CylinderGeometry(br * 1.35, br * 1.35, 0.12, 12), flat(D)), 0.012); muzzle.rotation.z = -PI / 2; muzzle.position.x = 1.12; pivot.add(muzzle);
  let valve = null;
  if (rubber) {
    for (const sx of [-0.55, 0.05, 0.62]) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.22), INK); sm.position.set(sx, 0.8, 0.506); body.add(sm); }
    for (let i = 0; i < 12; i++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.016), INK); st.position.set(-0.95 + i * 0.17, 0.8, 0.507); body.add(st); }      // costura punteada
    for (const bx of [-0.35, 0.35]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(br * 1.02, 0.008, 6, 16), INK); ring.rotation.y = PI / 2; ring.position.x = 0.575 + bx; pivot.add(ring); }
    const patch = new THREE.Group(); patch.position.set(0.33, 0.86, 0.508); patch.rotation.z = 0.25; body.add(patch);
    patch.add(new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.12), basic(0xc9b77a)));
    for (const [a, b] of [[[-0.085, -0.06], [0.085, 0.06]], [[-0.085, 0.06], [0.085, -0.06]]]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.012), INK); l.position.z = 0.002; l.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]); patch.add(l); }
    valve = new THREE.Group(); valve.position.set(-0.85, 0.76, 0.5); body.add(valve);
    const vb = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.1, 12), flat(0xffd23a)), 0.01); vb.rotation.x = PI / 2; vb.position.z = 0.05; valve.add(vb);
    const cap = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), flat(0xd63c3c)), 0.01); cap.rotation.x = PI / 2; cap.position.z = 0.11; valve.add(cap);
    for (const [sx, sy, sc] of [[-0.35, 0.95, 1.6], [0.75, 0.93, 1]]) { const sh = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); sh.scale.set(sc * 1.5, 0.45, 1); sh.position.set(sx, sy, 0.507); body.add(sh); }
  }
  return { g, body, pivot, wheels, valve, tur };
}

/** Cañón inflable con ruedas de goma. */
function makeCannon(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  for (const s of [-1, 1]) {
    const w = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 12, 24), flat(0x59604f)), 0.016); w.position.set(0, 0.36, s * 0.42); g.add(w);
    const hub = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), flat(RUBBER_D)), 0.012); hub.scale.z = 0.5; hub.position.set(0, 0.36, s * 0.42); g.add(hub);
  }
  const shield = rb(0.12, 0.6, 0.95, 0.05, RUBBER); shield.position.set(0.12, 0.7, 0); g.add(shield);
  const pivot = new THREE.Group(); pivot.position.set(0.1, 0.62, 0); g.add(pivot);
  const barrel = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 1.5, 6, 14), flat(RUBBER)), 0.016); barrel.rotation.z = -PI / 2; barrel.position.x = 0.75; pivot.add(barrel);
  for (const bx of [0.3, 0.9, 1.4]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.009, 6, 16), INK); ring.rotation.y = PI / 2; ring.position.x = bx; pivot.add(ring); }
  const trail = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.1, 6, 12), flat(RUBBER_D)), 0.014); trail.rotation.z = PI / 2 - 0.35; trail.position.set(-0.6, 0.32, 0); g.add(trail);
  const vb = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.08, 12), flat(0xffd23a)), 0.01); vb.rotation.x = PI / 2; vb.position.set(0.2, 0.75, 0.52); g.add(vb);
  return { g, pivot };
}
/** Camión inflable. */
function makeTruck(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const cab = rb(0.75, 0.75, 0.95, 0.16, RUBBER); cab.position.set(0.75, 0.82, 0); g.add(cab);
  const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.26), basic(0xcfeaf7)); win2.position.set(0.8, 1.0, 0.478); g.add(win2);
  const bed = rb(1.5, 0.85, 1.0, 0.18, RUBBER_D); bed.position.set(-0.4, 0.92, 0); g.add(bed);
  for (const bx of [-0.85, -0.4, 0.05]) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.45), INK); sm.position.set(bx, 0.92, 0.503); g.add(sm); }
  for (const wx of [-0.75, 0.75]) { const w = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 12, 22), flat(0x59604f)), 0.014); w.position.set(wx, 0.3, 0.42); g.add(w); }
  const vb = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.08, 12), flat(0xffd23a)), 0.01); vb.rotation.x = PI / 2; vb.position.set(-1.0, 0.7, 0.53); g.add(vb);
  return { g };
}
/** Inflado: 0 = sábana chata en el piso, 1 = inflado (con rebote de goma). */
function inflate(o, f, t, t0, d = 0.9) {
  const flatK = Math.max(f, 0.06), wob = t > t0 + d ? 0.07 * Math.exp(-4 * (t - t0 - d)) * Math.sin(16 * (t - t0 - d)) : 0;
  const xz = lerp(1.14, 1, Math.min(f, 1)) * (1 + wob * 0.5);
  o.g.scale.set(xz, flatK * (1 - wob), xz);
  if (o.pivot) o.pivot.rotation.z = -(1 - Math.min(f, 1)) * 0.9 + 0.04 * Math.sin(t * 3.1 + o.g.position.x);      // el caño de goma se cae y se bambolea
}
const inflK = (t, t0, d = 0.9) => t < t0 ? 0 : back(lin(t, t0, t0 + d));

/** Fantasma de caricatura con casco: la "mascota" del nombre. */
function makeGhost() {
  const g = new THREE.Group(); scene.add(g);
  const pts = [];
  for (let i = 0; i <= 12; i++) { const a = i / 12 * PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * 0.36 + 1e-3, 0.32 + Math.cos(a) * 0.36)); }
  pts.push(new THREE.Vector2(0.4, 0.02)); pts.reverse();
  const bodyM = outlined(new THREE.Mesh(new THREE.LatheGeometry(pts, 30), flat(0xf4f2ff)), 0.025); g.add(bodyM);
  for (let i = 0; i < 9; i++) { const a = -PI / 2 + i * PI / 8 * 2; const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), flat(0xf4f2ff)), 0.016); b.position.set(Math.sin(a) * 0.36, 0.0, Math.cos(a) * 0.36); g.add(b); }
  const eyes = [-1, 1].map(s => { const e = new THREE.Group(); e.position.set(s * 0.115, 0.43, 0.33); g.add(e);
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.06, 18), INK); d.scale.y = 1.3; e.add(d);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), basic(0xffffff)); hl.position.set(0.018, 0.03, 0.002); e.add(hl); return e; });
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), basic(0x4f1626)); mouth.position.set(0, 0.27, 0.35); mouth.scale.y = 0.8; g.add(mouth);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshBasicMaterial({ color: 0xf2a0a8, transparent: true, opacity: 0.7 })); ch.position.set(s * 0.2, 0.33, 0.3); ch.rotation.y = s * 0.5; g.add(ch); }
  const arms = [-1, 1].map(s => { const a = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), flat(0xf4f2ff)), 0.016); a.scale.set(1.3, 0.7, 0.8); a.position.set(s * 0.4, 0.3, 0.05); g.add(a); return a; });
  const hel = new THREE.Group(); hel.position.y = 0.32; g.add(hel);
  hel.add(outlined(new THREE.Mesh(new THREE.SphereGeometry(0.385, 26, 12, 0, PI * 2, 0, 0.95), flat(OLIVE, { side: THREE.DoubleSide })), 0.018));
  const brim = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.36, 0.035, 26), flat(OLIVE)), 0.012); brim.position.y = 0.385 * Math.cos(0.95); hel.add(brim); hel.rotation.x = -0.18;
  return { g, eyes, arms };
}
function poseGhost(gh, t, x, y, z, s, wink = 0) {
  S(gh.g, s); if (!gh.g.visible) return;
  gh.g.position.set(x, y + 0.08 * Math.sin(t * 3.4), z); gh.g.rotation.z = 0.08 * Math.sin(t * 2.2); gh.g.rotation.y = 0.15 * Math.sin(t * 1.3);
  gh.arms.forEach((a, i) => { a.position.y = 0.3 + 0.06 * Math.sin(t * 7 + i * PI); });
  gh.eyes[1].scale.y = Math.max(1 - 0.92 * wink, 0.08); gh.eyes[0].scale.y = Math.max(1 - 0.92 * (blinkAt(t, 0.7) * (1 - wink)), 0.08);
}

/** Bicicleta (con ruedas que giran y pedal). */
function makeBike(color) {
  const g = new THREE.Group(); scene.add(g);
  const wheels = [-0.45, 0.45].map(wx => { const w = new THREE.Group(); w.position.set(wx, 0.29, 0); g.add(w);
    w.add(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 28), INK));
    for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.012), INK); sp.rotation.z = i * PI / 3; w.add(sp); }
    return w; });
  rod(g, [-0.45, 0.29, 0], [-0.05, 0.3, 0], 0.022, color); rod(g, [-0.05, 0.3, 0], [-0.15, 0.78, 0], 0.022, color);
  rod(g, [-0.45, 0.29, 0], [-0.15, 0.72, 0], 0.02, color); rod(g, [-0.15, 0.72, 0], [0.34, 0.76, 0], 0.022, color);
  rod(g, [-0.05, 0.3, 0], [0.34, 0.76, 0], 0.022, color); rod(g, [0.45, 0.29, 0], [0.36, 0.95, 0], 0.022, color);
  rod(g, [0.36, 0.95, -0.2], [0.36, 0.95, 0.2], 0.018, 0x2b2f3a);
  const seat = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), flat(0x5a3a22)), 0.01); seat.scale.set(1.5, 0.4, 0.8); seat.position.set(-0.16, 0.8, 0); g.add(seat);
  const crank = new THREE.Group(); crank.position.set(-0.05, 0.3, 0); g.add(crank); crank.add(new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.025), INK));
  return { g, wheels, crank };
}

// =====================================================================================
// CAMPO (x=0): Normandía, verano de 1944
// =====================================================================================
surface(scene, tex.grass({}, 22, 22), 70, 70, FX, 0, 6, true);
{ const road = surface(scene, tex.cobble({ base: '#c9ad7f', line: '#a88d62', rows: 5, cols: 9, seed: 4 }, 30, 1), 70, 1.6, FX, 0.004, 2.2, true); road.material.color.set(0xe8dcc8); }
hills(scene, FX, -17, [[-9, 6, 0xa9d3a2], [-2, 7.5, 0x97c88f], [6, 6.4, 0xa3cf96], [12, 5, 0x97c88f]]);
for (const [x, y, s] of [[-4, 6.6, 1.2], [2.6, 7.8, 0.9], [-0.6, 9.2, 0.8], [6, 6.9, 1.1], [-8, 8, 1]]) k.cloud(FX + x, y, -14, s);
k.birds([[FX, 5.2, 0], [FX, 5.9, 5], [FX, 4.7, 10]], -9);
// granero
{ const bx = FX - 5.4, bz = -6.5;
  block(scene, 0xb5453a, bx - 1.3, bx + 1.3, 0, 1.9, bz + 0.9, bz - 0.9, 0.025);
  const roof = k.poly(scene, [[-1.5, 0], [0, 1.1], [1.5, 0]], 0x6d4a3a, 0.06); roof.position.set(bx, 1.9, bz + 0.92);
  const doorG = new THREE.Group(); doorG.position.set(bx, 0, bz + 0.915); scene.add(doorG);
  k.plane(doorG, 0x8a2f2a, 1.0, 1.3, 0, 0.65, 0); k.stroke(doorG, [[-0.5, 0], [0.5, 1.3]], 0.07, false, 0.005); k.stroke(doorG, [[-0.5, 1.3], [0.5, 0]], 0.07, false, 0.005); k.stroke(doorG, [[-0.5, 0], [-0.5, 1.3], [0.5, 1.3], [0.5, 0]], 0.06, false, 0.006);
  k.plane(doorG, 0xf4f1e8, 0.42, 0.32, 0, 1.6, 0.003);
  for (const [hx, hz] of [[2.0, 0.4], [2.6, -0.2]]) { const h = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.6, 18), flat(0xe8c25a)), 0.02); h.rotation.z = PI / 2; h.position.set(bx + hx, 0.43, bz + hz + 1.2); scene.add(h); }
}
// cerco de madera y seto de bocage
for (let x = -9; x <= 9; x += 1.1) { block(scene, 0x8a5a33, FX + x - 0.05, FX + x + 0.05, 0, 0.75, -3.45, -3.55, 0.012); }
for (const y of [0.35, 0.62]) block(scene, 0xa0703f, FX - 9, FX + 9, y - 0.035, y + 0.035, -3.42, -3.48, 0.01);
for (let i = 0; i < 26; i++) { const x = -12 + i * 0.95, r = 0.55 + 0.2 * Math.sin(i * 2.3); const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat(i % 2 ? 0x4f9a4a : 0x5aa852)), 0.02); b.position.set(FX + x, r * 0.7, -8.6 + 0.3 * Math.sin(i)); scene.add(b); }
for (const [x, z, o] of [[-3.0, -5.5, {}], [3.6, -6.0, { h: 2.7, leaf: 0x6dbb58 }], [7.2, -5.2, { pine: true, leaf: 0x3f8f5a }], [-7.8, -4.6, { h: 2.4 }], [5.4, -9.5, { h: 3 }], [-1.2, -10, { h: 3.2, leaf: 0x6dbb58 }]]) k.tree(FX + x, z, o);
for (const [x, z] of [[-6.5, 4.5], [6.6, 4.8], [-4.5, 8], [5, 9]]) { const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), flat(0x5aa852)), 0.02); b.position.set(FX + x, 0.3, z); scene.add(b); }
// flores en el pasto
for (let i = 0; i < 40; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), basic([0xffffff, 0xffd23a, 0xf28aa0][i % 3])); f.rotation.x = -PI / 2; f.position.set(FX - 8 + (i * 4.13) % 16, 0.01, -3 + (i * 2.71) % 9); scene.add(f); }

const tanks = [makeTank(true, FX + 1.3, -0.3), makeTank(true, FX - 1.9, -2.9), makeTank(true, FX + 4.7, -3.0)];
const hero = tanks[0];
const real = makeTank(false, FX - 2.6, -0.25);
const cannon = makeCannon(FX + 4.3, 0.9), truck = makeTruck(FX + 6.9, -0.3);
// inflador con manguera hasta la válvula del tanque
const pump = new THREE.Group(); pump.position.set(FX - 0.35, 0, 1.05); scene.add(pump);
block(pump, 0xc8443a, -0.22, 0.22, 0, 0.42, 0.18, -0.18, 0.016); block(pump, 0x2b2f3a, -0.22, 0.22, 0.42, 0.46, 0.18, -0.18, 0.01);
const plunger = new THREE.Group(); pump.add(plunger);
rod(plunger, [0, 0.46, 0], [0, 0.85, 0], 0.025, 0xb9bec8); rod(plunger, [-0.16, 0.85, 0], [0.16, 0.85, 0], 0.03, 0x2b2f3a);
{ const p0 = V(FX - 0.15, 0.1, 1.15), p3 = V(FX + 1.3 - 0.85, 0.76, -0.3 + 0.62);
  const curve = new THREE.CatmullRomCurve3([p0, V(FX + 0.05, 0.02, 1.0), V(FX + 0.4, 0.05, 0.7), V(FX + 0.5, 0.45, 0.45), p3]);
  var hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.025, 6), basic(0x2b2f3a)); scene.add(hose); }
const airPuff = k.puffs(5), realDust = k.puffs(5), bikeDust = k.puffs(4), bikeDust2 = k.puffs(4), liftDust = k.puffs(5);

// =====================================================================================
// CARPA (x=40): el taller de los artistas
// =====================================================================================
// campamento al aire libre (mismos colores que el campo: así el corte no es un salto de luz)
surface(scene, tex.grass({ seed: 41 }, 16, 12), 46, 30, CX, 0.003, 0, true);
hills(scene, CX, -14, [[-7, 5.5, 0xa9d3a2], [0, 6.5, 0x97c88f], [7, 5.2, 0xa9d3a2]]);
for (const [x, y, s] of [[-3, 6.6, 1.1], [2.8, 7.6, 0.9], [-0.4, 9.0, 0.8], [5.5, 6.4, 1]]) k.cloud(CX + x, y, -13, s);
k.birds([[CX, 5.4, 3], [CX, 6.0, 9]], -9);
for (const [x, z, o] of [[-5.2, -5.5, { h: 2.8 }], [4.9, -6.0, { pine: true, leaf: 0x3f8f5a, h: 3 }], [-1.5, -9, { h: 3.2, leaf: 0x6dbb58 }], [2.5, -10, { pine: true, leaf: 0x4a9a62 }]]) k.tree(CX + x, z, o);
for (const [x, z, w] of [[-3.2, -6.5, 1.6], [3.0, -7.2, 1.9]]) { const tn = k.poly(scene, [[-w, 0], [0, w * 0.95], [w, 0]], 0x7d8a4a, 0.05); tn.position.set(CX + x, 0, z); k.poly(tn, [[-0.3, 0], [0, 0.6], [0.3, 0]], 0x4f5a2a, 0.03).position.z = 0.01; }
{ const roof = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.8), new THREE.MeshLambertMaterial({ map: tex.stripes({ a: '#a3a86a', b: '#959b5c', dot: '#868c50', n: 6 }, 3, 2), side: THREE.DoubleSide }));
  roof.position.set(CX, 4.15, -0.3); roof.rotation.x = -PI / 2 + 0.16; scene.add(roof);
  for (const x of [-3.4, 3.4]) block(scene, 0x8a5a33, CX + x - 0.06, CX + x + 0.06, 0, 3.9, 1.4, 1.28, 0.012); }
for (const x of [-1.25, 1.25]) block(scene, 0x8a5a33, CX + x - 0.05, CX + x + 0.05, 0, 3.4, -2.42, -2.52, 0.012);
k.plane(scene, INK, 6.8, 0.02, CX, 2.58, -2.06);
for (const x of [-3.4, 3.4]) block(scene, 0x8a5a33, CX + x - 0.07, CX + x + 0.07, 0, 4.4, -2.0, -2.14, 0.014);
block(scene, 0x8a5a33, CX - 3.6, CX + 3.6, 4.3, 4.42, -2.0, -2.14, 0.014);
const lamps = [];
for (const x of [-2.6, 2.6]) {
  const g = new THREE.Group(); g.position.set(CX + x, 4.05, -0.9); scene.add(g); lamps.push(g);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), INK); cord.position.y = -0.45; g.add(cord);
  const shade = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 14, 1, true), flat(0x3a5a3a, { side: THREE.DoubleSide })), 0.014); shade.position.y = -0.95; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), basic(0xfff1b8)); bulb.position.y = -1.02; g.add(bulb);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.25, depthWrite: false })); glow.position.set(0, -1.0, -0.05); g.add(glow);
}
// cartel con el nombre oficial
picture(scene, 2.6, 0.78, CX, 3.05, -2.36, (g, W, H) => {
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#f3ead0'; g.fillRect(12, 12, W - 24, H - 24);
  g.fillStyle = '#3d4a22'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 92px Montserrat'; g.fillText('23rd HEADQUARTERS', W / 2, H * 0.36);
  g.font = '800 80px Montserrat'; g.fillStyle = '#8f2433'; g.fillText('SPECIAL TROOPS', W / 2, H * 0.72);
}, 1024);
// bocetos colgados en la pared
const sketchPaint = [
  (g, W, H) => { g.fillStyle = '#f7f1e0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#3a3a3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, 170); g.lineTo(90, 110); g.lineTo(170, 110); g.lineTo(220, 170); g.closePath(); g.stroke(); g.beginPath(); g.arc(120, 95, 30, PI, 0); g.stroke(); g.beginPath(); g.moveTo(150, 92); g.lineTo(230, 80); g.stroke(); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(60 + i * 35, 185, 14, 0, 7); g.stroke(); } },
  (g, W, H) => { g.fillStyle = '#f7f1e0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#3a3a3a'; g.lineWidth = 5; g.beginPath(); g.arc(W / 2, 70, 28, 0, 7); g.stroke(); g.beginPath(); g.moveTo(W / 2, 100); g.lineTo(W / 2, 170); g.moveTo(W / 2 - 40, 125); g.lineTo(W / 2 + 40, 125); g.moveTo(W / 2, 170); g.lineTo(W / 2 - 30, 230); g.moveTo(W / 2, 170); g.lineTo(W / 2 + 30, 230); g.stroke(); },
  (g, W, H) => { g.fillStyle = '#f7f1e0'; g.fillRect(0, 0, W, H); g.fillStyle = '#7fae55'; g.beginPath(); g.ellipse(W / 2, H * 0.6, W * 0.38, H * 0.2, 0, 0, 7); g.fill(); g.strokeStyle = '#3a3a3a'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#3a3a3a'; g.font = '800 30px Montserrat'; g.fillText('¿?', W * 0.45, H * 0.3); },
];
[[-2.75, 2.1, 0.06, 0], [-1.0, 2.25, -0.05, 1], [1.45, 2.05, 0.04, 2], [2.9, 2.3, -0.06, 0]].forEach(([x, y, r, i]) => { const p = picture(scene, 0.62, 0.55, CX + x, 2.3, -2.05, (g, W, H) => { sketchPaint[i](g, W, H); g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.strokeRect(0, 0, W, H); }); p.rotation.z = r;
  const pin = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), basic(0xd63c3c)); pin.position.set(CX + x, 2.56, -2.03); scene.add(pin); });
// cajones, rollos de goma y latas de pintura al fondo
for (const [x0, x1, y0, y1, z0, z1, col] of [[1.1, 1.9, 0, 0.6, -1.2, -1.9, 0x9a6638], [1.95, 2.6, 0, 0.5, -1.3, -1.95, 0x8a5a33], [1.3, 2.0, 0.6, 1.05, -1.3, -1.85, 0xa8743f], [-3.2, -2.5, 0, 0.55, -1.4, -2.0, 0x9a6638]])
  block(scene, col, CX + x0, CX + x1, y0, y1, z0, z1, 0.016);
picture(scene, 0.6, 0.22, CX + 1.5, 0.3, -1.19, (g, W, H) => { g.fillStyle = '#9a6638'; g.fillRect(0, 0, W, H); g.fillStyle = '#2b2118'; g.font = '800 56px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FRÁGIL', W / 2, H / 2); });
for (const [x, z, col] of [[-0.9, -1.7, RUBBER], [-0.45, -1.85, RUBBER_D], [-0.65, -1.4, 0x9ea28d]]) { const r = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 16), flat(col)), 0.016); r.rotation.z = PI / 2; r.position.set(CX + x, 0.2, z); scene.add(r); }
for (const [x, col] of [[-2.4, 0xd63c3c], [-2.25, 0x3f6ea8], [-2.55, 0xffd23a]]) { const cn = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12), flat(col)), 0.01); cn.position.set(CX + x, 0.62, -1.7 + (x + 2.4) * 0.8); scene.add(cn); }
// caballete de Kelly con su cuadro de bloques de color
const KX = CX - 1.45, BX = CX + 0.85, AX = CX - 0.3, RX = CX + 3.05;
{ const ex = CX - 2.15, g = new THREE.Group(); g.position.set(ex, 0, -0.2); scene.add(g);
  rod(g, [-0.3, 0, 0.15], [0, 1.75, 0], 0.025, 0x8a5a33); rod(g, [0.3, 0, 0.15], [0, 1.75, 0], 0.025, 0x8a5a33); rod(g, [0, 0, -0.35], [0, 1.7, -0.02], 0.025, 0x8a5a33);
  rod(g, [-0.36, 0.72, 0.13], [0.36, 0.72, 0.13], 0.03, 0x8a5a33);
  const cnv = picture(g, 0.74, 0.86, 0, 1.18, 0.16, (gg, W, H) => {
    gg.fillStyle = '#f7f1e0'; gg.fillRect(0, 0, W, H);
    [['#d63c3c', 0.08, 0.08, 0.4, 0.5], ['#3f6ea8', 0.52, 0.08, 0.4, 0.3], ['#ffd23a', 0.52, 0.42, 0.4, 0.5], ['#1e1428', 0.08, 0.62, 0.4, 0.3], ['#59c36a', 0.15, 0.62, 0.2, 0.0]].forEach(([c0, x, y, w, h]) => { gg.fillStyle = c0; gg.fillRect(x * W, y * H, w * W, h * H); });
    gg.strokeStyle = '#1e1428'; gg.lineWidth = 12; gg.strokeRect(0, 0, W, H);
  }); cnv.rotation.x = -0.08; }
// mesa de dibujo del arquitecto
{ const g = new THREE.Group(); g.position.set(AX + 0.55, 0, -0.55); scene.add(g);
  rod(g, [-0.3, 0, 0], [-0.3, 0.85, 0], 0.025, 0x5a3a22); rod(g, [0.3, 0, 0], [0.3, 0.85, 0], 0.025, 0x5a3a22);
  const board = picture(g, 0.8, 0.55, 0, 1.0, 0.05, (gg, W, H) => { gg.fillStyle = '#2f5f9f'; gg.fillRect(0, 0, W, H); gg.strokeStyle = '#e8f2ff'; gg.lineWidth = 4;
    gg.strokeRect(30, 30, W - 60, H - 60); gg.beginPath(); gg.moveTo(40, H * 0.7); gg.lineTo(W * 0.35, H * 0.45); gg.lineTo(W * 0.7, H * 0.45); gg.lineTo(W - 40, H * 0.7); gg.closePath(); gg.stroke();
    for (let i = 0; i < 4; i++) { gg.beginPath(); gg.arc(70 + i * 40, H * 0.78, 14, 0, 7); gg.stroke(); } gg.strokeStyle = '#1e1428'; gg.lineWidth = 10; gg.strokeRect(0, 0, W, H); });
  board.rotation.x = -0.75; }
// mesa de la radio
block(scene, 0x7a4b2a, RX - 1.15, RX - 0.35, 0, 0.78, -0.35, -0.95, 0.016); block(scene, 0x9a6638, RX - 1.2, RX - 0.3, 0.78, 0.84, -0.3, -1.0, 0.012);
const radio = new THREE.Group(); radio.position.set(RX - 0.75, 0.84, -0.62); scene.add(radio);
block(radio, 0x4f5a3a, -0.32, 0.32, 0, 0.42, 0.22, -0.22, 0.016);
picture(radio, 0.56, 0.34, 0, 0.21, 0.225, (g, W, H) => { g.fillStyle = '#3d4a2a'; g.fillRect(0, 0, W, H); for (const [x, y, r] of [[50, 50, 26], [130, 50, 26], [210, 50, 20]]) { g.fillStyle = '#e8e2d0'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * 0.7, y - r * 0.5); g.stroke(); }
  g.fillStyle = '#1e1428'; g.fillRect(30, 100, W - 60, 40); g.fillStyle = '#ffd23a'; g.fillRect(40, 108, (W - 80) * 0.6, 24); g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(0, 0, W, H); });
const radioLed = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), basic(0xff4a3a)); radioLed.position.set(0.24, 0.36, 0.226); radio.add(radioLed);
rod(radio, [0.25, 0.42, -0.1], [0.32, 1.7, -0.12], 0.012, 0x2b2f3a, 0.005);
const mic = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.06, 4, 10), flat(0x2b2f3a)), 0.008); scene.add(mic);
const radioWaves = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 24, PI * 0.7), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true })); m.rotation.z = PI * 0.15; scene.add(m); return m; });
const morse = ['·', '—', '·', '·', '—'].map(s => k.glyph(s, '#ffd23a', 0.32));

// =====================================================================================
// LOMA (x=80): el observador enemigo
// =====================================================================================
surface(scene, tex.grass({ base: '#8fc45a', blade: '#6fa844', light: '#a8d878', seed: 21 }, 16, 12), 46, 30, EX, 0, 0, true);
hills(scene, EX, -12, [[-5, 4, 0xb7d9a6], [1, 5.5, 0xa8cf98], [6, 4.2, 0xb7d9a6]]);
hills(scene, EX, -18, [[-2, 7, 0xc9e2bc], [7, 6, 0xc9e2bc]]);
for (const [x, y, s] of [[-3, 6, 1.1], [2.5, 7.2, 0.9], [-0.5, 8.4, 0.7], [4.5, 5.6, 1]]) k.cloud(EX + x, y, -12, s);
k.birds([[EX, 4.4, 2], [EX, 5.2, 7], [EX, 3.9, 11]], -7);
for (let i = 0; i < 12; i++) { const x = -4 + i * 0.75; block(scene, 0x9ea0a0 + (i % 3) * 0x050505, EX + x - 0.36, EX + x + 0.36, 0, 0.42 + 0.08 * (i % 2), -1.5, -1.95, 0.016); }
for (const [x, z, o] of [[-2.6, -2.8, { pine: true, leaf: 0x3f8f5a, h: 2.8 }], [2.8, -3.2, { h: 2.6 }], [-4.4, -4.5, { pine: true, leaf: 0x4a9a62 }], [4.6, -4.8, { pine: true, leaf: 0x3f8f5a, h: 3 }]]) k.tree(EX + x, z, o);
for (const [x, z, r] of [[-1.3, 0.3, 0.42], [1.25, 0.2, 0.46], [-1.75, -0.3, 0.38], [1.75, -0.4, 0.4]]) { const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat(0x4f9a4a)), 0.02); b.position.set(EX + x, r * 0.7, z); scene.add(b); }
const binos = new THREE.Group(); scene.add(binos);
for (const s of [-1, 1]) { const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.2, 14), flat(0x2b2f3a)), 0.01); b.rotation.x = PI / 2; b.position.x = s * 0.075; binos.add(b);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 14), basic(0x9fd0ea)); lens.position.set(s * 0.075, 0, 0.102); binos.add(lens); }
block(binos, 0x2b2f3a, -0.03, 0.03, -0.025, 0.025, 0.04, -0.04, 0.006);
const earWaves = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 6, 30, PI * 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.rotation.z = PI * 0.75; scene.add(m); return m; });

// =====================================================================================
// RUTA (x=120): el semioruga con parlantes
// =====================================================================================
surface(scene, tex.grass({ seed: 31 }, 16, 12), 46, 30, SX, 0, 0, true);
{ const road = surface(scene, tex.cobble({ base: '#c9ad7f', line: '#a88d62', rows: 4, cols: 9, seed: 8 }, 26, 1), 46, 2.0, SX, 0.004, 0.1, true); road.material.color.set(0xe8dcc8); }
hills(scene, SX, -13, [[-6, 4.5, 0xa9d3a2], [0, 5.6, 0x97c88f], [6, 4.4, 0xa9d3a2]]);
for (const [x, y, s] of [[-3, 6.4, 1.1], [2.8, 7.4, 0.9], [0, 8.6, 0.8], [5, 6, 1]]) k.cloud(SX + x, y, -12, s);
k.birds([[SX, 4.9, 1], [SX, 5.6, 6]], -8);
for (let i = 0; i < 20; i++) { const x = -9 + i * 0.95, r = 0.5 + 0.18 * Math.sin(i * 1.7); const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat(i % 2 ? 0x4f9a4a : 0x5aa852)), 0.02); b.position.set(SX + x, r * 0.7, -2.6 + 0.25 * Math.sin(i * 2)); scene.add(b); }
for (const [x, z, o] of [[-3.5, -4.2, { h: 2.8 }], [0.8, -4.8, { pine: true, leaf: 0x3f8f5a, h: 3 }], [4.2, -4.0, { h: 2.5, leaf: 0x6dbb58 }], [-6, -5, { pine: true }]]) k.tree(SX + x, z, o);
const ht = new THREE.Group(); ht.position.set(SX, 0, 0.1); scene.add(ht);
{ block(ht, 0x2e322a, -1.55, 0.2, 0.05, 0.55, 0.52, -0.52, 0.02);
  const htWheels = [-1.35, -0.95, -0.55, -0.15].map(x => k.wheel(ht, x, 0.3, 0.53, 0.2)); ht.userData.wheels = htWheels;
  ht.userData.front = k.wheel(ht, 1.15, 0.32, 0.53, 0.3);
  block(ht, OLIVE, -1.6, 0.25, 0.5, 1.05, 0.5, -0.5, 0.02);
  block(ht, OLIVE, 0.25, 0.95, 0.5, 1.02, 0.5, -0.5, 0.02);           // cabina abierta (lados)
  block(ht, OLIVE_D, 0.95, 1.6, 0.5, 0.95, 0.42, -0.42, 0.02);         // capó
  block(ht, 0x2b2f3a, 1.55, 1.62, 0.55, 0.9, 0.36, -0.36, 0.01);       // parrilla
  rod(ht, [0.95, 1.02, 0.45], [0.95, 1.38, 0.45], 0.02, 0x2b2f3a); rod(ht, [0.95, 1.02, -0.45], [0.95, 1.38, -0.45], 0.02, 0x2b2f3a); rod(ht, [0.95, 1.38, 0.45], [0.95, 1.38, -0.45], 0.02, 0x2b2f3a);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.34), new THREE.MeshBasicMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.35 })); glass.rotation.y = PI / 2; glass.position.set(0.955, 1.2, 0); ht.add(glass);
  picture(ht, 0.5, 0.5, -0.65, 0.78, 0.505, (gg, W, H) => { gg.strokeStyle = '#f4f1e8'; gg.lineWidth = 12; gg.beginPath(); gg.arc(W / 2, H / 2, W * 0.42, 0, 7); gg.stroke(); gg.fillStyle = '#f4f1e8'; gg.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? W * 0.15 : W * 0.37; gg.lineTo(W / 2 + r * Math.cos(a), H / 2 + r * Math.sin(a)); } gg.fill(); });
  // la torre de parlantes en la caja
  block(ht, 0x3b4421, -1.5, -0.7, 1.05, 1.25, 0.3, -0.3, 0.014); rod(ht, [-1.1, 1.25, 0], [-1.1, 1.7, 0], 0.05, 0x2b2f3a);
  block(ht, 0x2b2f3a, -0.55, -0.15, 1.0, 1.3, 0.1, -0.3, 0.012);          // grabadora
  { const reel = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), flat(0xb9bec8)), 0.008); reel.position.set(-0.35, 1.32, -0.1); ht.add(reel); ht.userData.reel = reel; }
  ht.userData.horns = [];
  for (const [dx, dy, ry] of [[-1.4, 1.85, 0.6], [-0.8, 1.85, -0.2], [-1.1, 2.4, 0.2]]) {
    const hg = new THREE.Group(); hg.position.set(dx, dy, 0.05); hg.rotation.y = ry; ht.add(hg);
    const cone = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.08, 0.7, 20, 1, true), flat(0x9ea28d, { side: THREE.DoubleSide })), 0.02); cone.rotation.x = PI / 2; cone.position.z = 0.35; hg.add(cone);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), basic(0x2b2f3a)); inner.position.z = 0.6; hg.add(inner);
    const grill = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 20), basic(0x6a6f63)); grill.position.z = 0.62; hg.add(grill);
    const back2 = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 14), flat(0x5a6352)), 0.012); back2.rotation.x = PI / 2; back2.position.z = -0.08; hg.add(back2);
    ht.userData.horns.push(hg);
  }
}
const soundRings = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 30, PI * 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })); m.rotation.z = -PI * 0.45; scene.add(m); return m; });
const htSmoke = k.puffs(5);

// =====================================================================================
// OFICINA (x=160): el mapa de los engaños y la carpeta secreta
// =====================================================================================
// puesto de mando al aire libre, bajo un árbol (mismos colores que el resto)
surface(scene, tex.grass({ seed: 51 }, 16, 12), 46, 30, MX, 0.003, 0, true);
hills(scene, MX, -14, [[-7, 5.5, 0xa9d3a2], [0, 6.8, 0x97c88f], [7, 5.2, 0xa9d3a2]]);
for (const [x, y, s] of [[-3, 6.4, 1.1], [2.6, 7.6, 0.9], [0.2, 9.0, 0.8], [5.5, 6.2, 1]]) k.cloud(MX + x, y, -13, s);
k.birds([[MX, 5.0, 2], [MX, 5.7, 8]], -9);
for (const [x, z, o] of [[3.2, -3.0, { h: 3.4, leaf: 0x5fae4d }], [-4.2, -4.5, { h: 2.8 }], [5.6, -6, { pine: true, leaf: 0x3f8f5a, h: 3 }], [-1.0, -9, { pine: true, leaf: 0x4a9a62 }]]) k.tree(MX + x, z, o);
for (let i = 0; i < 14; i++) { const x = -7 + i * 1.05, r = 0.5 + 0.18 * Math.sin(i * 1.9); const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat(i % 2 ? 0x4f9a4a : 0x5aa852)), 0.02); b.position.set(MX + x, r * 0.7, -5.2 + 0.3 * Math.sin(i)); scene.add(b); }
for (const x of [-1.6, 0.5]) block(scene, 0x8a5a33, MX + x - 0.05, MX + x + 0.05, 0, 3.0, -2.2, -2.3, 0.012);const MAPW = 2.5, MAPH = 1.7, MAPX = MX - 0.55, MAPY = 2.15;
picture(scene, MAPW, MAPH, MAPX, MAPY, -2.15, (g, W, H) => {
  g.fillStyle = '#8fcbe8'; g.fillRect(0, 0, W, H);
  const land = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)); g.closePath(); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 5; g.stroke(); };
  land([[0.02, 0.02], [0.2, 0.02], [0.26, 0.12], [0.22, 0.24], [0.28, 0.3], [0.12, 0.34], [0.06, 0.24], [0.1, 0.14]], '#e9dcb4');                // Inglaterra
  land([[0.32, 0.3], [0.5, 0.26], [0.58, 0.34], [0.6, 0.5], [0.56, 0.62], [0.62, 0.78], [0.5, 0.92], [0.34, 0.9], [0.3, 0.74], [0.18, 0.56], [0.1, 0.46], [0.26, 0.44]], '#f3e4b0');      // Francia
  land([[0.5, 0.26], [0.6, 0.2], [0.66, 0.28], [0.6, 0.34], [0.58, 0.34]], '#f0d39a');                                                       // Bélgica
  land([[0.6, 0.34], [0.66, 0.34], [0.65, 0.4], [0.6, 0.4]], '#e8c48a');                                                                    // Luxemburgo
  land([[0.6, 0.2], [0.68, 0.04], [0.98, 0.02], [0.98, 0.62], [0.8, 0.68], [0.68, 0.62], [0.62, 0.56], [0.6, 0.5], [0.66, 0.4], [0.66, 0.28]], '#dfe6c2');   // Alemania
  land([[0.66, 0.74], [0.82, 0.72], [0.86, 0.84], [0.92, 0.98], [0.82, 0.98], [0.74, 0.86]], '#e9dcb4');                                       // Italia
  g.fillStyle = '#1e1428'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 46px Montserrat'; g.fillText('FRANCIA', W * 0.4, H * 0.62); g.fillText('ALEMANIA', W * 0.83, H * 0.33);
  g.font = '800 26px Montserrat'; g.fillText('BÉLGICA', W * 0.57, H * 0.18); g.fillText('ITALIA', W * 0.8, H * 0.92);
  g.strokeStyle = '#6a4a2a'; g.lineWidth = 22; g.strokeRect(0, 0, W, H); g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(0, 0, W, H);
}, 1024);
// chinches de cada engaño (francia, bélgica, luxemburgo, borde alemán)
const PINS = [[0.2, 0.47], [0.27, 0.4], [0.35, 0.36], [0.42, 0.33], [0.24, 0.55], [0.48, 0.42], [0.53, 0.36], [0.56, 0.3], [0.63, 0.37], [0.62, 0.44], [0.58, 0.52], [0.64, 0.25], [0.7, 0.3], [0.72, 0.18], [0.66, 0.5], [0.45, 0.5], [0.38, 0.45], [0.7, 0.42], [0.61, 0.6], [0.52, 0.62], [0.74, 0.08], [0.77, 0.81]];
const pins = PINS.map(([u, v], i) => { const g = new THREE.Group(); g.position.set(MAPX - MAPW / 2 + u * MAPW, MAPY + MAPH / 2 - v * MAPH, -2.08); scene.add(g);
  const h = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), flat(i % 4 === 3 ? 0x3f6ea8 : 0xd63c3c)), 0.01); h.position.z = 0.05; g.add(h); return g; });
const pointer = new THREE.Group(); scene.add(pointer); rod(pointer, [0, 0, 0], [0, 0.9, 0], 0.012, 0x8a5a33, 0.005);
// escritorio, archivero, carpeta, sello y almanaque
block(scene, 0x7a4b2a, MX + 0.8, MX + 2.95, 0, 0.78, 0.25, -0.55, 0.018); block(scene, 0x9a6638, MX + 0.75, MX + 3.0, 0.78, 0.86, 0.3, -0.6, 0.014);
block(scene, 0x9a6638, MX + 3.3, MX + 3.95, 0, 0.9, -1.4, -2.0, 0.018); block(scene, 0x8a5a33, MX + 3.35, MX + 3.9, 0.9, 1.4, -1.5, -1.95, 0.016);

const lampD = new THREE.Group(); lampD.position.set(MX + 2.75, 0.86, -0.4); scene.add(lampD);
rod(lampD, [0, 0, 0], [0, 0.4, 0], 0.02, 0x2b5a3a); { const sh = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 14, 1, true), flat(0x2b7a4a, { side: THREE.DoubleSide })), 0.012); sh.position.y = 0.45; lampD.add(sh); }
const folder = new THREE.Group(); folder.position.set(MX + 1.8, 1.02, 0.12); folder.rotation.x = -0.75; folder.scale.setScalar(1.35); scene.add(folder);
folder.add(picture(folder, 0.6, 0.45, 0, 0, 0, (g, W, H) => { g.fillStyle = '#e8c98a'; g.fillRect(0, 0, W, H); g.fillStyle = '#d9b672'; g.fillRect(0, 0, W * 0.4, H * 0.12); g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.strokeRect(0, 0, W, H);
  g.fillStyle = '#5a4a2a'; g.font = '800 26px Montserrat'; g.textAlign = 'center'; g.fillText('23rd HQ SPECIAL TROOPS', W / 2, H * 0.3); for (let i = 0; i < 4; i++) g.fillRect(W * 0.15, H * (0.45 + i * 0.1), W * 0.7, 6); }, 512));
const stampMark = picture(folder, 0.5, 0.17, 0, -0.08, 0.004, (g, W, H) => { g.strokeStyle = '#d6252e'; g.lineWidth = 10; g.strokeRect(6, 6, W - 12, H - 12); g.fillStyle = '#d6252e'; g.font = '800 92px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SECRETO', W / 2, H / 2 + 4); }, 512);
stampMark.rotation.z = 0.12;
const stamper = new THREE.Group(); scene.add(stamper);
block(stamper, 0xd63c3c, -0.07, 0.07, 0, 0.07, 0.06, -0.06, 0.012); block(stamper, 0x2b2f3a, -0.025, 0.025, 0.07, 0.24, 0.025, -0.025, 0.01);
{ const s = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), flat(0x2b2f3a)), 0.008); s.position.y = 0.26; stamper.add(s); }
// almanaque con el año
const calCv = document.createElement('canvas'); calCv.width = 256; calCv.height = 200; const calG = calCv.getContext('2d'); const calTex = new THREE.CanvasTexture(calCv); calTex.colorSpace = THREE.SRGBColorSpace;
let calYear = 0;
function drawYear(y) { if (y === calYear) return; calYear = y; const g = calG, W = 256, H = 200; g.fillStyle = '#f7f1e0'; g.fillRect(0, 0, W, H); g.fillStyle = '#d63c3c'; g.fillRect(0, 0, W, 52); g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.strokeRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.font = '800 34px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AÑO', W / 2, 28); g.fillStyle = '#1e1428'; g.font = '800 92px Montserrat'; g.fillText(String(y), W / 2, 128); calTex.needsUpdate = true; }
drawYear(1945);
const cal = new THREE.Group(); cal.position.set(MX + 1.2, 0.86, -0.15); scene.add(cal);
block(cal, 0x2b2f3a, -0.2, 0.2, 0, 0.05, 0.12, -0.12, 0.01);
const calFace = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.33), new THREE.MeshBasicMaterial({ map: calTex })); calFace.position.set(0, 0.22, 0.02); calFace.rotation.x = -0.2; cal.add(calFace);
const pageFly = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.33), basic(0xf7f1e0)); scene.add(pageFly);

// =====================================================================================
// PERSONAJES
// =====================================================================================
// campo
const P = [soldier(0), soldier(1, { hair: 0x6b4a2a, mustache: true }), soldier(2, { hair: 0x23262d }), soldier(3, { hair: 0xc98a3a })];
const guard = soldier(4, { hair: 0x2b2118, detail: ['belt', 'buttons', 'badge'] });
const civ = [makeToon({ shirt: 0x3f6ea8, hair: 0x6b4a2a, mustache: true, detail: ['stripes'], skin: 0xf3c9a4 }), makeToon({ shirt: 0xc8553d, hair: 0x9aa0a8, hat: { type: 'fedora', color: 0x6a4a2a, band: 0x2b2118 }, detail: ['buttons'], skin: 0xe8b98f })];
civ.forEach(cv => scene.add(cv.root));
{ const beret = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.31, 22, 12), flat(0x23305a)), 0.016); beret.scale.set(1.05, 0.32, 1.05); beret.position.set(0.02, 0.24, -0.02); beret.rotation.z = -0.18; civ[0].head.add(beret);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6), INK); stem.position.set(0.02, 0.34, -0.02); civ[0].head.add(stem); }
const bikes = [makeBike(0x3f8f6b), makeBike(0xa8504a)];
const LANE = [1.3, 1.9], STOP = [-1.95, -2.8];
// gente de fondo cargando bultos
const bundles = [];
const bundleOf = color => { const b = rb(0.5, 0.28, 0.34, 0.08, color, 0.016); scene.add(b); bundles.push(b); return b; };
const carriers = [
  { w: k.walker({ toon: { shirt: OLIVE, skin: SKINS[1], hair: 0x3a2a1c, detail: ['belt'] }, cx: FX, z: -4.4, speed: 0.75, off: 2, dir: 1, span: 16,
      pose: (t, px) => ({ handL: V(px + 0.1, 1.15, -4.2), handR: V(px + 0.1, 1.15, -4.6), wL: 1, wR: 1 }) }), b: bundleOf(0x9ea28d) },
  { w: k.walker({ toon: { shirt: OLIVE, skin: SKINS[3], hair: 0x23262d, detail: ['belt'] }, cx: FX, z: -5.0, speed: 0.6, off: 9, dir: -1, span: 16,
      pose: (t, px) => ({ handL: V(px - 0.1, 1.15, -4.8), handR: V(px - 0.1, 1.15, -5.2), wL: 1, wR: 1 }) }), b: bundleOf(RUBBER_D) },
];
carriers.forEach(cr => helmet(cr.w, OLIVE));
// carpa
const kelly = soldier(0, { shirt: OLIVE_D, hair: 0x3a2a1c, noHelmet: true, detail: ['collar', 'buttons'] });
const blass = soldier(3, { shirt: OLIVE_D, hair: 0x23262d, noHelmet: true, detail: ['collar', 'tie'] });
const archi = soldier(1, { shirt: OLIVE, hair: 0x9a6a3a, noHelmet: true, detail: ['buttons', 'belt'] });
const radioOp = soldier(2, { shirt: OLIVE, hair: 0x2b2118, noHelmet: true, detail: ['buttons'] });
{ const hp = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 22, PI), INK); hp.rotation.y = PI / 2; hp.position.y = 0.02; radioOp.head.add(hp);
  for (const s of [-1, 1]) { const ear = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), flat(0x8a5a33)), 0.01); ear.rotation.z = PI / 2; ear.position.set(s * 0.3, 0.02, -0.07); radioOp.head.add(ear); } }
const brush = new THREE.Group(); scene.add(brush); rod(brush, [0, -0.12, 0], [0, 0.14, 0], 0.012, 0x8a5a33, 0.005); { const tip = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 8), flat(0xd63c3c)), 0.006); tip.position.y = 0.18; brush.add(tip); }
const palette = picture(scene, 0.3, 0.22, 0, 0, 0, (g, W, H) => { g.fillStyle = '#d9b27a'; g.beginPath(); g.ellipse(W / 2, H / 2, W / 2 - 6, H / 2 - 6, 0, 0, 7); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.stroke();
  for (const [x, y, c0] of [[0.3, 0.35, '#d63c3c'], [0.5, 0.25, '#3f6ea8'], [0.7, 0.35, '#ffd23a'], [0.65, 0.65, '#59c36a']]) { g.fillStyle = c0; g.beginPath(); g.arc(x * W, y * H, 16, 0, 7); g.fill(); } });
const sketchbook = picture(scene, 0.34, 0.42, 0, 0, 0, (g, W, H) => { g.fillStyle = '#f7f1e0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.strokeRect(0, 0, W, H);
  g.strokeStyle = '#c8443a'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H * 0.18, 18, 0, 7); g.stroke(); g.beginPath(); g.moveTo(W / 2 - 20, H * 0.26); g.lineTo(W / 2 + 20, H * 0.26); g.lineTo(W / 2 + 60, H * 0.82); g.lineTo(W / 2 - 60, H * 0.82); g.closePath(); g.stroke();
  g.fillStyle = '#f2a0a8'; g.fill(); g.stroke(); });
const pencil = new THREE.Group(); scene.add(pencil); rod(pencil, [0, -0.08, 0], [0, 0.1, 0], 0.01, 0xffd23a, 0.004);
const ruler = new THREE.Group(); scene.add(ruler); block(ruler, 0xe8d39a, -0.02, 0.02, -0.2, 0.2, 0.01, -0.01, 0.006);
// loma
const enemy = soldier(1, { shirt: GREY, hel: 0x666d66, hair: 0x9a7a4a, detail: ['belt', 'buttons'] });
// oficina: el guardia hace de oficial, P[1] de oficinista
const ghost = makeGhost();

// ---------- signos y partículas ----------
const bang = [0, 1].map(() => k.glyph('!', '#ffd23a', 0.5)), qm = k.glyph('?', '#ffd23a', 0.55), qm2 = k.glyph('?', '#ffd23a', 0.5);
const sparks = [0, 1, 2, 3, 4].map(() => k.glyph('✦', '#fff1a8', 0.3));
const sweat = [0, 1].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const speed = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.025), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });

const H = {}; for (const n of ['p0', 'p1', 'p2', 'p3', 'g', 'c0', 'c1', 'k', 'b', 'a', 'r', 'e']) H[n] = V(0, 0, 0);
const above = v => () => tmp3.copy(v).setY(v.y + 0.25);

// =====================================================================================
// POSES
// =====================================================================================
const inField = t => t < c[1] || (t >= c[5] && t < c[6]) || (t >= c[8] && t < c[10]);
function poseField(t) {
  // ----- tanques -----
  const gancho = t < c[1];
  const fT = [inflT + 0.1, inflT + 0.35, inflT + 0.6];
  tanks.forEach((tk, i) => {
    let f = gancho ? 1 : inflK(t, fT[i]);
    if (t >= c[8]) f = 1;
    inflate(tk, f, t, gancho ? -9 : fT[i]);
    tk.g.visible = inField(t);
  });
  // pinchazo del gancho: la goma se hunde y rebota
  if (gancho && t > POKE + 0.15) { const u = t - POKE - 0.15, w = 0.12 * Math.exp(-4.5 * u) * Math.sin(19 * u); hero.body.scale.set(1 + w * 0.6, 1 - w, 1 + w * 0.3); } else hero.body.scale.set(1, 1, 1);
  // el levantamiento (frase 8 y 9)
  const lift = t >= c[8] ? back(lin(t, LIFT, LIFT + 0.6)) : 0;
  hero.g.position.y = 0.55 * lift + 0.05 * Math.sin(t * 5) * lift;
  hero.g.rotation.y = 0.12 * Math.sin((t - LIFT) * 1.6) * lift; hero.g.rotation.z = 0.03 * Math.sin(t * 3.3) * lift;
  if (lift > 0 && t < c[10]) { const w = 0.05 * Math.sin(t * 7); hero.body.scale.set(1 + w * 0.4, 1 - w, 1); }
  liftDust(t, LIFT + 0.1, hero.g.position.x - 1.3, -0.3, -1); liftDust(t, LIFT + 0.1, hero.g.position.x + 1.3, -0.3, 1);
  inflate(cannon, t < c[1] ? 1 : t >= c[8] ? 1 : inflK(t, canT - 0.05), t, canT - 0.05); cannon.g.visible = inField(t);
  inflate(truck, t < c[1] ? 1 : t >= c[8] ? 1 : inflK(t, camT - 0.05), t, camT - 0.05); truck.g.visible = inField(t);
  // el de verdad: está solo en la comparación del inflado
  real.g.visible = t >= c[5] && t < c[6];
  if (real.g.visible) { const x = lerp(FX - 7.5, FX - 2.6, Math.min(1, back(lin(t, c[5], c[5] + 1.2)) )); real.g.position.x = x; real.wheels.forEach(w => { w.rotation.z = -x / 0.17; }); real.g.position.y = 0.012 * Math.sin(t * 28) * (t < c[5] + 1.2 ? 1 : 0); real.tur.rotation.y = 0.2 * Math.sin(t * 0.8);
    realDust(t, c[5] + 1.05, x - 1.3, -0.25, -1); }
  pump.visible = t >= c[5] && t < c[6]; hose.visible = pump.visible;
  plunger.position.y = -0.3 * (0.5 + 0.5 * Math.sin(t * 9));
  if (t >= c[5] && t < c[6]) for (let i = 0; i < 3; i++) airPuff(t, inflT + 0.1 + i * 0.32, FX + 1.3 - 0.85, 0.55, 1, 0.75);

  // ----- soldados -----
  const L = [[FX - 0.25, 0.08], [FX - 0.25, -0.62], [FX + 2.85, 0.08], [FX + 2.85, -0.62]];
  P.forEach((p, i) => {
    let o = null;
    if (t < c[1]) {
      if (i === 0) { const pk = win(t, POKE - 0.35, POKE + 0.25, 0.15);
        o = { x: FX - 0.5, z: 0.7, face: 0.55, squash: breathe(t), handR: V(FX + 0.1, 0.92, 0.2), wR: pk, look: t > POKE - 0.4 && t < POKE + 0.2 ? V(FX + 0.2, 0.9, 0.2) : V(FX - 0.4, 1.4, 7), y: hop(t, POKE + 0.25, 0.14),
          handL: t > POKE + 0.3 ? V(FX - 0.95, 1.55, 0.9) : null, wL: back(lin(t, POKE + 0.3, POKE + 0.55)),
          ...moodAt(t, [[0, 'neutral'], [POKE + 0.1, 'surprised'], [POKE + 0.55, 'happy']]) };
      } else if (i === 2) o = { x: FX + 3.2, z: 0.5, face: -0.4, squash: breathe(t, 2), look: V(FX + 1.8, 1.2, 3), handR: V(FX + 3.4, 1.5 + 0.08 * Math.sin(t * 8), 0.6), wR: win(t, 1.0, 3.2, 0.2), mood: 'happy' };
    } else if (t >= c[5] && t < c[6]) {
      if (i === 0) { const ph = 0.5 + 0.5 * Math.sin(t * 9), hy = 0.85 - 0.3 * ph + 0.0;
        o = { x: FX - 0.85, z: 1.05, face: 1.1, crouch: 0.25 + 0.15 * ph, handL: V(FX - 0.5, hy, 1.0), handR: V(FX - 0.2, hy, 1.1), wL: 1, wR: 1, look: V(FX + 0.5, 0.8, 0.3), mood: 'effort' };
        if (t > tanqT + 0.4) Object.assign(o, moodAt(t, [[tanqT + 0.4, 'effort'], [tanqT + 0.6, 'happy']]));
      } else if (i === 1) { const ph = 0.5 + 0.5 * Math.sin(t * 8 + 1);
        o = { x: FX + 3.35, z: 1.45, face: 1.0, crouch: 0.2 + 0.2 * ph, handL: V(FX + 3.65, 0.95 - 0.35 * ph, 1.5), handR: V(FX + 3.75, 0.95 - 0.35 * ph, 1.4), wL: 1, wR: 1, look: V(FX + 4.2, 0.8, 1), ...moodAt(t, [[0, 'effort'], [canT + 0.6, 'happy']]) };
      } else if (i === 2) o = { x: FX + 2.95, z: 0.75, face: -0.3, squash: breathe(t, 2), y: hop(t, tanqT + 0.5, 0.18), look: V(FX + 1.6, 1.2, 2.6), handR: V(FX + 3.2, 1.65 + 0.06 * Math.sin(t * 9), 0.9), wR: win(t, tanqT + 0.4, verT, 0.2), ...moodAt(t, [[0, 'neutral'], [tanqT + 0.4, 'happy']]) };
      else o = { x: FX + 6.15, z: 1.45, face: -0.5, squash: breathe(t, 3), y: hop(t, camT + 0.6, 0.15), look: t > camT + 0.4 ? V(FX + 6.0, 1.4, 5) : V(FX + 6.9, 1.1, 0), ...moodAt(t, [[0, 'neutral'], [camT + 0.5, 'surprised'], [camT + 1.0, 'happy']]) };
    } else if (t >= c[8] && t < c[10]) {
      const [lx, lz] = L[i], end = i < 2 ? -1 : 1;
      hero.g.updateMatrixWorld(true);
      const grab = hero.g.localToWorld(tmp.set(end * 1.16, 0.62, lz + 0.3 > 0 ? 0.36 : -0.36));
      const hold = Math.max(lift, prog(t, cuaT - 0.4, LIFT));
      o = { x: lx + 0.03 * Math.sin(t * 5 + i), z: lz, face: end > 0 ? -PI / 2 + 0.5 : PI / 2 - 0.5, crouch: 0.35 * (1 - lift) * hold + 0.1 * lift, squash: breathe(t, i),
        handL: V(grab.x, grab.y, grab.z - 0.1), handR: V(grab.x, grab.y, grab.z + 0.1), wL: hold, wR: hold, look: t > c[9] ? V(FX - 1.5, 1.4, 2.5) : V(FX + 1.3, 1.2, 2.6),
        ...moodAt(t, [[0, 'neutral'], [LIFT, 'effort'], [LIFT + 0.35, 'happy']]) };
      if (t < cuaT - 0.4) { o.wL = o.wR = 0; o.face = end > 0 ? -0.3 : 0.3; o.look = V(FX + 1.3, 1.3, 3); }
    }
    p.root.visible = !!o; if (!o) return;
    p.pose(alive({ blink: blinkAt(t, i * 0.7), ...o }, t, i * 1.3)); p.head.getWorldPosition(H['p' + i]);
  });

  // ----- guardia (Arthur Shilstone, según su relato) -----
  guard.root.visible = t >= c[8] && t < c[10];
  if (guard.root.visible) {
    const talking = t > losT - 0.1 && t < fueT + 0.5;
    const o = { x: FX - 0.95, z: 1.6, face: lerp(-0.9, -0.45, prog(t, guaT, guaT + 0.3)), squash: breathe(t, 4), look: t < guaT ? V(FX - 2.3, 1.4, 2.4) : V(FX - 1.9, 1.4, 4.2),
      handL: talking ? talk(t, FX - 0.95, 1.6, -1) : null, wL: talking ? 0.9 : 0, handR: t > fueT - 0.2 ? V(FX - 0.55, 1.25 + 0.08 * Math.sin(t * 10), 1.9) : null, wR: t > fueT - 0.2 ? back(lin(t, fueT - 0.2, fueT + 0.1)) : 0,
      y: hop(t, fueT, 0.12), ...moodAt(t, [[0, 'neutral'], [venT, 'worried'], [guaT, 'sly'], [fueT, 'happy']]) };
    if (t < bicT) { o.face = -1.1; o.look = V(FX - 3.5, 1.3, 2); }
    guard.pose(alive({ blink: blinkAt(t, 1.4), ...o }, t, 6)); guard.head.getWorldPosition(H.g);
  }

  // ----- franceses en bicicleta -----
  civ.forEach((cv, i) => {
    const on = t >= c[8] && t < c[10]; cv.root.visible = on; bikes[i].g.visible = on; if (!on) return;
    const t0 = c[8] + 0.05 + i * 0.15, t1 = bicT + 0.15 + i * 0.12;
    const u = lin(t, t0, t1), e = 1 - (1 - u) * (1 - u), x = lerp(FX - 7.5 - i * 0.9, STOP[i], e);
    const bk = bikes[i]; bk.g.position.set(x, 0, LANE[i]); bk.wheels.forEach(w => { w.rotation.z = -(x - STOP[i]) / 0.27; }); bk.crank.rotation.z = -(x - STOP[i]) / 0.35;
    const off = prog(t, t1 + 0.15, t1 + 0.5);
    (i ? bikeDust2 : bikeDust)(t, t1 - 0.1, x - 0.4, LANE[i], -1);
    const riding = 1 - off;
    bk.g.updateMatrixWorld(true);
    const hb = bk.g.localToWorld(tmp.set(0.36, 0.95, 0));
    const o = {
      x: lerp(x - 0.12, STOP[i] + 0.1, off), y: 0.2 * riding, z: lerp(LANE[i], LANE[i] + 0.6, off), face: lerp(PI / 2, 0.55, off),
      walk: riding * (u < 1 ? 1 : 0), phase: (x - STOP[i]) / 0.7, stride: 0.22, crouch: 0.22 * riding, lean: 0.15 * riding,
      handL: V(hb.x, hb.y, hb.z - 0.15), handR: V(hb.x, hb.y, hb.z + 0.15), wL: riding, wR: riding,
      look: off > 0.5 ? (t > guaT ? V(H.g.x, H.g.y, H.g.z + 0.6) : V(FX + 1.3, 1.1 + hero.g.position.y, 0)) : V(x + 2, 1.3, LANE[i] + 1),
      squash: breathe(t, i) * settle(t, venT + 0.1 + i * 0.1, 0.12), y2: 0,
      ...moodAt(t, [[0, 'neutral'], [venT + 0.05, 'surprised'], [manT, 'surprised'], [fueT + 0.2, 'surprised'], [fueT + 0.7, 'worried']]) };
    o.y += hop(t, venT + 0.1 + i * 0.1, 0.16) + hop(t, fueT + 0.25 + i * 0.12, 0.12);
    if (off > 0.5 && t > LIFT + 0.4 && t < c[9]) { o.handR = V(o.x + 0.05, 1.45, o.z + 0.3); o.wR = 0.9 * win(t, LIFT + 0.4, c[9], 0.2); }      // se agarran la cabeza
    cv.pose(alive({ blink: blinkAt(t, 0.3 + i), ...o }, t, 8 + i * 2)); cv.head.getWorldPosition(H['c' + i]);
  });
}

function poseTent(t) {
  const on = (t >= c[1] && t < c[4]) || (t >= c[7] && t < c[8]);
  for (const p of [kelly, blass, archi, radioOp]) p.root.visible = on;
  brush.visible = palette.visible = sketchbook.visible = pencil.visible = ruler.visible = mic.visible = on;
  if (!on) { radioWaves.forEach(m => { m.visible = false; }); return; }
  // Kelly pinta
  const strokeK = Math.sin(t * 5.5);
  kelly.pose(alive({ x: KX, z: 0.05, face: -0.75 + 0.25 * prog(t, kelT - 0.2, kelT + 0.2) * (1 - prog(t, blT, blT + 0.3)), squash: breathe(t), blink: blinkAt(t, 0.2),
    handR: V(KX - 0.48 + 0.05 * strokeK, 1.25 + 0.12 * Math.sin(t * 3.1), 0.05 + 0.12), wR: 1, handL: V(KX + 0.05, 0.95, 0.32), wL: 1,
    look: (t > kelT - 0.2 && t < blT) || (t > c[2] && t < artT + 0.6) ? V(KX + 0.3, 1.4, 4) : V(KX - 0.7, 1.2, 0.0), ...moodAt(t, [[0, 'neutral'], [pinT, 'happy'], [blT + 0.3, 'neutral']]) }, t, 1));
  kelly.hand(1, brush.position); brush.rotation.set(0.3, 0, 0.6 + 0.2 * strokeK);
  kelly.hand(0, palette.position); palette.position.z += 0.03; palette.rotation.set(-0.6, -0.4, 0);
  kelly.head.getWorldPosition(H.k);
  // el arquitecto mide con la regla en la mesa
  archi.pose(alive({ x: AX, z: 0.15, face: 0.55, squash: breathe(t, 2), blink: blinkAt(t, 1.2), handR: V(AX + 0.45 + 0.12 * Math.sin(t * 2.4), 1.0, -0.3), wR: 1, handL: V(AX + 0.25, 1.15 + 0.05 * Math.sin(t * 4), 0.05), wL: 0.8,
    look: (t > arqT - 0.1 && t < c[3]) || (t > c[2] && t < artT) ? V(AX + 0.4, 1.4, 4) : V(AX + 0.55, 0.95, -0.55), ...moodAt(t, [[0, 'neutral'], [arqT, 'happy'], [c[3], 'neutral']]) }, t, 2));
  archi.hand(0, ruler.position); ruler.rotation.set(-0.7, 0.2, 1.2);
  archi.head.getWorldPosition(H.a);
  // Blass dibuja un vestido en su cuaderno
  const sb = Math.sin(t * 6.5);
  blass.pose(alive({ x: BX, z: 0.1, face: -0.25 + 0.2 * prog(t, blT - 0.2, blT + 0.2), squash: breathe(t, 3), blink: blinkAt(t, 0.9), y: hop(t, blT + 0.1, 0.1),
    handL: V(BX - 0.3, 1.0, 0.42), wL: 1, handR: V(BX - 0.18 + 0.05 * sb, 1.05 + 0.04 * Math.cos(t * 6.5), 0.5), wR: 1,
    look: t > blT - 0.2 || (t > disT && t < c[3]) || (t > c[2] && t < artT) ? V(BX + 0.2, 1.45, 4) : V(BX - 0.25, 0.95, 0.5), ...moodAt(t, [[0, 'neutral'], [disT, 'happy'], [c[3], 'neutral'], [blT, 'happy']]) }, t, 3));
  blass.hand(0, sketchbook.position); sketchbook.position.set(sketchbook.position.x + 0.02, sketchbook.position.y + 0.08, sketchbook.position.z + 0.03); sketchbook.rotation.set(-0.35, 0.2, 0.15);
  blass.hand(1, pencil.position); pencil.rotation.set(0.4, 0, 0.5 + 0.2 * sb);
  blass.head.getWorldPosition(H.b);
  // la radio
  const radioOn = t >= c[7] && t < c[8], spk = radioOn && t > radT;
  radioOp.pose(alive({ x: RX, z: -0.25, face: -0.2, squash: breathe(t, 5), blink: blinkAt(t, 0.4), handL: V(RX - 0.4, 1.12 + (spk ? 0.04 * Math.sin(t * 9) : 0), 0.0), wL: 1,
    handR: spk ? V(RX - 0.55, 0.98 + 0.03 * Math.sin(t * 13), -0.45) : V(RX - 0.6, 1.0, -0.5), wR: radioOn ? 1 : 0.6, y: hop(t, uniT, 0.1),
    look: radioOn && t > menT ? V(RX - 0.6, 1.4, 3.4) : V(RX - 0.8, 1.1, -0.6), ...moodAt(t, [[0, 'neutral'], [radT, 'sly'], [uniT + 0.2, 'happy']]) }, t, 4));
  radioOp.hand(0, mic.position); mic.position.y += 0.06; mic.rotation.z = 0.4;
  radioOp.head.getWorldPosition(H.r);
  radioLed.material.color.set(radioOn && Math.sin(t * 14) > 0 ? 0xff4a3a : 0x6a2020);
  radioWaves.forEach((m, i) => { const u = ((t * 1.1 + i / 4) % 1); m.visible = radioOn; if (!radioOn) return; m.position.set(RX - 0.75 + 0.32, 0.84 + 1.7, -0.74); m.scale.setScalar(0.4 + 1.6 * u); m.material.opacity = 0.9 * (1 - u); });
  morse.forEach((m, i) => { const u = (t - menT - i * 0.32) / 1.4; k.glyphAt(m, tmp.set(RX - 0.5, 1.6, -0.2), -0.45 + 0.3 * i + 0.25 * u, 0.25 + 0.6 * u, u > 0 && u < 1 && t < c[8] ? back(u * 4) * (1 - prog(u, 0.7, 1)) : 0); });
}

function poseHill(t) {
  const on = (t >= c[4] && t < c[5]) || (t >= c[6] && t < asiT) || (t >= oyeT - 0.15 && t < c[7]);
  enemy.root.visible = on; binos.visible = on;
  if (!on) { earWaves.forEach(m => { m.visible = false; }); return; }
  let o;
  if (t < c[5]) {        // mira con binoculares; no ve casi nada
    const up = 1 - prog(t, noT + 0.1, noT + 0.4);
    o = { x: EX, z: 0, face: 0.1, squash: breathe(t), handL: V(EX - 0.08, 1.36, 0.42), handR: V(EX + 0.08, 1.36, 0.42), wL: up, wR: up, look: V(EX + 0.1 * Math.sin(t * 0.9), 1.35, 3),
      ...moodAt(t, [[0, 'sly'], [noT + 0.2, 'surprised'], [casiT + 0.1, 'worried']]) };
    if (up < 1) { o.handR = V(EX + 0.4, 1.05 + 0.1 * (1 - up), 0.3); o.wR = 1 - up; o.handL = V(EX - 0.4, 1.05, 0.3); o.wL = 1 - up; o.tilt = 0.15 * (1 - up); }
  } else if (t < asiT) {   // escucha
    const ear = back(lin(t, c[6] + 0.3, c[6] + 0.6));
    o = { x: EX, z: 0, face: -0.2, squash: breathe(t), handL: V(EX - 0.36, 1.38, 0.05), wL: ear, look: V(EX - 1.5, 1.35, 3), tilt: -0.2 * ear, ...moodAt(t, [[0, 'neutral'], [escT, 'sly']]) };
  } else {                 // le llega el ruido
    o = { x: EX, z: 0, face: -0.25, y: hop(t, kmT, 0.22), squash: breathe(t) * settle(t, kmT + 0.4, 0.14), handL: V(EX - 0.36, 1.38, 0.05), wL: 1, handR: V(EX + 0.35, 1.0, 0.35), wR: 0.6,
      look: V(EX - 1.2, 1.4, 3), ...moodAt(t, [[0, 'surprised'], [kmT + 0.2, 'worried']]) };
  }
  enemy.pose(alive({ blink: blinkAt(t, 0.6), ...o }, t, 7)); enemy.head.getWorldPosition(H.e);
  // binoculares en las manos (o colgando del cuello)
  if (t < c[5]) { enemy.hand(0, tmp); enemy.hand(1, tmp2); binos.position.copy(tmp).add(tmp2).multiplyScalar(0.5); binos.position.z += 0.05; binos.rotation.set(0, 0, 0); }
  else { binos.position.set(H.e.x, H.e.y - 0.55, H.e.z + 0.22); binos.rotation.set(-0.3, 0, 0); }
  const waves = t >= oyeT - 0.15;
  earWaves.forEach((m, i) => { const u = ((t * 0.9 + i / 5) % 1); m.visible = waves; if (!waves) return; m.position.set(EX - 0.3, 1.3, 0.2); m.scale.setScalar(3.2 - 2.7 * u); m.material.opacity = 0.9 * u; });
}

function poseRoad(t) {
  const on = t >= asiT - 0.01 && t < oyeT - 0.15;
  const x = SX - 0.9 + 1.4 * lin(t, asiT, oyeT + 0.5);
  ht.userData.reel.rotation.y = t * 8;
  ht.position.x = x; ht.position.y = 0.012 * Math.sin(t * 26);
  ht.userData.wheels.forEach(w => { w.rotation.z = -x / 0.2; }); ht.userData.front.rotation.z = -x / 0.3;
  ht.userData.horns.forEach((hg, i) => { const pulse = t > ruiT - 0.3 ? 0.06 * Math.max(0, Math.sin(t * 18 + i * 2)) : 0; hg.scale.setScalar(1 + pulse); });
  htSmoke(t, asiT + 0.2, x - 1.6, 0.1, -1, 0.35); htSmoke(t, asiT + 1.6, x - 1.6, 0.1, -1, 0.35); htSmoke(t, asiT + 3.0, x - 1.6, 0.1, -1, 0.35);
  // conductor y operador en la cabina (P[2] y P[3])
  if (on) {
    [P[2], P[3]].forEach((p, i) => {
      p.root.visible = true;
      const sx = i ? x + 0.05 : x + 0.72, sz = i ? 0.0 : 0.2;
      const o = i
        ? { x: sx, y: 0.5, z: sz, face: 0.25, squash: breathe(t, i), look: t > ruiT ? V(sx - 1.2, 2.0, 2) : V(sx, 1.9, 4), blink: blinkAt(t, i),
            handL: V(x - 0.3, 1.42 + 0.03 * Math.sin(t * 9), -0.1), wL: 1, handR: V(sx + 0.3, 2.05 + 0.08 * Math.sin(t * 8), 0.3), wR: win(t, parT, ruiT, 0.2), y2: 0,
            ...moodAt(t, [[0, 'neutral'], [parT, 'happy']]) }
        : { x: sx, y: 0.32, z: sz, face: 0.45, squash: breathe(t, i), crouch: 0.6, look: V(sx + 1.2, 1.6, 3), blink: blinkAt(t, i),
            handR: V(sx + 0.3, 1.25, sz + 0.12), wR: 1, handL: V(sx + 0.3, 1.25, sz - 0.12), wL: 1, ...moodAt(t, [[0, 'neutral'], [ruiT, 'happy']]) };
      p.pose(alive(o, t, 9 + i));
    });
  }
  const loud = on && t > ruiT - 0.3;
  soundRings.forEach((m, i) => {
    const hg = ht.userData.horns[i % 3], u = ((t * 1.3 + i / 9) % 1);
    m.visible = loud; if (!loud) return;
    hg.updateMatrixWorld(true); hg.localToWorld(m.position.set(0, 0, 0.7 + 1.6 * u));
    m.scale.setScalar(0.3 + 0.9 * u); m.lookAt(m.position.x + Math.sin(hg.rotation.y), m.position.y, m.position.z + Math.cos(hg.rotation.y)); m.rotateZ(-PI * 0.45); m.material.opacity = 0.95 * (1 - u);
  });
}

function poseOffice(t) {
  const on = t >= c[10];
  ghost.g.visible = false;
  if (!on) {
    pins.forEach(p => { p.visible = false; }); stamper.visible = false; stampMark.visible = false; pointer.visible = false; pageFly.visible = false;
    // fantasma del nombre, en la carpa
    if (t >= c[1] && t < c[2]) poseGhost(ghost, t, CX + 1.6, 1.55 + 0.5 * back(lin(t, fanT - 0.15, fanT + 0.35)), -1.55, popIn(t, fanT - 0.15, c[2] + 0.2));
    return;
  }
  pins.forEach((p, i) => { const t0 = c[10] + 0.3 + i * 0.075; S(p, back(lin(t, t0, t0 + 0.22))); });
  // oficial con el puntero (el guardia)
  guard.root.visible = true;
  const px = MAPX - MAPW / 2 + PINS[Math.min(21, Math.floor(lin(t, c[10] + 0.3, c[10] + 2) * 21))][0] * MAPW;
  const leave = t >= c[11] ? go(t, c[11] + 0.1, c[11] + 1.6, MX + 0.85, MX - 1.6) : null;
  guard.pose(alive({ x: MX + 0.85, z: -1.1, face: -0.55, squash: breathe(t, 4), blink: blinkAt(t, 1.4), handL: V(MX + 0.55, 1.3 + 0.05 * Math.sin(t * 3), -1.4), wL: t < c[11] ? 1 : 0.2,
    handR: talk(t, MX + 0.95, -1.0, 1), wR: 0.8, look: t < euT ? V(px, 1.9, -2) : V(MX + 0.6, 1.5, 3), ...moodAt(t, [[0, 'neutral'], [vteT, 'happy'], [c[11], 'neutral'], [secT + 0.1, 'sly']]), ...(leave ? { ...leave, z: -1.1, handL: null, handR: null } : {}) }, t, 6));
  guard.hand(0, tmp); pointer.visible = t < c[11] + 0.1; pointer.position.copy(tmp);
  pointer.lookAt(lerp(tmp.x, px, 1), MAPY + 0.1 * Math.sin(t * 4), -2.1); pointer.rotateX(PI / 2);
  guard.head.getWorldPosition(H.g);
  // oficinista sella la carpeta (P[1])
  const p = P[1]; p.root.visible = true;
  const st = secT - 0.15, down = win(t, st, st + 0.22, 0.08);
  const sx = MX + 1.8, onStamp = t >= c[10] + 0.5;
  stamper.visible = true; stamper.position.set(sx + 0.05, 1.0 + (onStamp ? 0.32 * (1 - down) : 0.32) + (t > st + 0.3 ? 0.12 : 0), 0.08 - 0.1 * down);
  stampMark.visible = t > st + 0.11; S(stampMark, t > st + 0.11 ? back(lin(t, st + 0.11, st + 0.3)) : 0);
  p.pose(alive({ x: MX + 2.5, z: -0.95, face: -0.35, squash: breathe(t, 1) * settle(t, st + 0.22, 0.08), blink: blinkAt(t, 0.8), handL: tmp.copy(stamper.position).setY(stamper.position.y + 0.26), wL: t > c[10] + 0.4 ? 1 : 0,
    look: t < seisT ? V(sx, 0.9, 0) : V(MX + 1.8, 1.5, 3), y: hop(t, seisT + 0.1, 0.12), ...moodAt(t, [[0, 'neutral'], [st, 'effort'], [st + 0.3, 'sly'], [noveT, 'surprised'], [seisT + 0.2, 'happy']]) }, t, 2));
  // almanaque que vuela de 1945 a 1996
  const yu = prog(t, cinT - 0.2, noveT + 0.5);
  const year = Math.round(lerp(1945, 1996, yu));
  drawYear(t < cinT - 0.2 ? 1945 : year);
  const flipping = t > cinT - 0.2 && t < noveT + 0.5;
  pageFly.visible = flipping;
  if (flipping) { const u = (t * 6) % 1; pageFly.position.set(MX + 1.2 - 0.3 * u, 1.12 + 0.9 * u, -0.2 - 0.6 * u); pageFly.rotation.set(-0.2 - 2 * u, 0.5 * u, 1.5 * u); pageFly.scale.setScalar(1 - 0.5 * u); }
  cal.scale.setScalar(1 + 0.12 * win(t, seisT - 0.1, seisT + 0.4, 0.1));
  // el fantasma sale de la carpeta y guiña
  if (t > seisT - 0.25) poseGhost(ghost, t, MX + 1.75, 1.15 + 0.4 * back(lin(t, seisT - 0.25, seisT + 0.35)), 0.35, back(lin(t, seisT - 0.25, seisT + 0.1)) * 0.75, win(t, seisT + 0.5, seisT + 0.9, 0.08));
}

// ---------- cámara ----------
k.shots([
  { t: 0, pos: [FX + 0.9, 2.3, 12.0], look: [FX + 0.9, 1.0, -1.2] },
  { t: at('estados', 0), pos: [FX + 0.1, 1.9, 9.8], look: [FX + 0.1, 1.0, -0.8] },
  { t: ejT, pos: [FX + 1.2, 1.6, 8.6], look: [FX + 1.2, 1.0, -0.6] },
  { t: erT - 0.05, pos: [FX + 0.15, 1.45, 7.0], look: [FX + 0.15, 1.05, 0] },
  { t: c[1], pos: [CX, 2.3, 9.0], look: [CX, 2.1, -1], cut: true },
  { t: tropT, pos: [CX, 2.5, 6.6], look: [CX, 2.4, -2.4] },
  { t: at('veintitres', c[1]), pos: [CX - 0.2, 2.2, 7.6], look: [CX - 0.2, 2.3, -2.4] },
  { t: peroT, pos: [CX + 0.9, 1.9, 7.6], look: [CX + 0.9, 1.65, -0.5] },
  { t: c[2], pos: [CX - 0.1, 1.8, 10.5], look: [CX - 0.1, 1.3, 0] },
  { t: at('hombres', c[2]), pos: [CX + 0.3, 1.6, 8.0], look: [CX + 0.3, 1.3, 0] },
  { t: artT - 0.1, pos: [CX - 1.55, 1.5, 6.2], look: [CX - 1.55, 1.2, 0] },
  { t: disT, pos: [CX + 0.55, 1.5, 6.2], look: [CX + 0.55, 1.2, 0], glide: true },
  { t: c[3], pos: [KX - 0.25, 1.5, 5.4], look: [KX - 0.3, 1.3, 0] },
  { t: pinT, pos: [KX - 0.25, 1.45, 4.3], look: [KX - 0.3, 1.3, 0] },
  { t: elT - 0.1, pos: [BX, 1.45, 4.3], look: [BX, 1.3, 0] },
  { t: c[4], pos: [EX, 1.7, 6.6], look: [EX, 1.3, 0], cut: true },
  { t: vieT, pos: [EX, 1.5, 4.4], look: [EX, 1.4, 0] },
  { t: noT, pos: [EX, 1.48, 3.5], look: [EX, 1.42, 0] },
  { t: c[5], pos: [FX - 0.1, 2.4, 12.8], look: [FX - 0.1, 0.9, -1], cut: true },
  { t: tanqT - 0.05, pos: [FX + 1.1, 1.5, 7.2], look: [FX + 1.1, 0.9, -0.3] },
  { t: canT - 0.05, pos: [FX + 5.4, 1.6, 8.6], look: [FX + 5.4, 0.8, 0] },
  { t: goma2T - 0.05, pos: [FX - 0.65, 2.0, 13.2], look: [FX - 0.65, 0.95, -0.5] },
  { t: POV0, pos: [FX - 0.6, 1.9, 14.5], look: [FX - 0.6, 0.9, -1], cut: true },
  { t: verT, pos: [FX - 0.6, 1.8, 12.8], look: [FX - 0.6, 0.9, -1] },
  { t: c[6], pos: [EX, 1.6, 4.9], look: [EX, 1.4, 0], cut: true },
  { t: escT, pos: [EX - 0.1, 1.5, 3.6], look: [EX - 0.1, 1.45, 0] },
  { t: asiT, pos: [SX - 0.9, 2.0, 11.5], look: [SX - 0.9, 1.4, 0], cut: true },
  { t: vehT, pos: [SX - 0.45, 2.0, 9.4], look: [SX - 0.45, 1.5, 0], glide: true },
  { t: ruiT, pos: [SX - 0.6, 2.1, 7.0], look: [SX - 0.6, 1.85, 0] },
  { t: oyeT - 0.15, pos: [EX - 0.3, 1.7, 6.2], look: [EX - 0.3, 1.45, 0], cut: true },
  { t: kmT, pos: [EX - 0.15, 1.55, 4.6], look: [EX - 0.15, 1.45, 0] },
  { t: c[7], pos: [RX - 0.6, 1.6, 5.6], look: [RX - 0.6, 1.35, 0], cut: true },
  { t: uniT, pos: [RX - 0.4, 1.5, 4.2], look: [RX - 0.4, 1.4, 0] },
  { t: c[8], pos: [FX - 4.2, 1.6, 9.2], look: [FX - 4.2, 1.0, 1.5], cut: true },
  { t: venT - 0.2, pos: [FX - 2.6, 1.6, 8.6], look: [FX - 2.6, 1.1, 1.5], glide: true },
  { t: cuaT, pos: [FX - 0.3, 1.9, 12.2], look: [FX - 0.3, 1.05, 0.3] },
  { t: tanq2T, pos: [FX + 1.3, 1.5, 10.6], look: [FX + 1.3, 1.15, -0.3] },
  { t: c[9], pos: [FX - 2.0, 1.5, 9.8], look: [FX - 2.0, 1.3, 1.8] },
  { t: losT - 0.1, pos: [FX - 1.0, 1.5, 5.1], look: [FX - 1.0, 1.42, 1.6] },
  { t: fueT, pos: [FX - 2.4, 1.45, 6.9], look: [FX - 2.4, 1.3, 2.2] },
  { t: c[10], pos: [MX - 0.4, 2.0, 7.4], look: [MX - 0.4, 1.9, -1.5], cut: true },
  { t: euT - 0.1, pos: [MX - 0.3, 2.0, 6.5], look: [MX - 0.3, 1.95, -1.5] },
  { t: c[11], pos: [MX + 1.9, 1.6, 5.2], look: [MX + 1.9, 1.1, 0] },
  { t: cinT - 0.2, pos: [MX + 1.55, 1.35, 3.9], look: [MX + 1.55, 1.05, 0] },
  { t: at('hasta', c[11]), pos: [MX + 1.3, 1.25, 3.2], look: [MX + 1.3, 1.05, 0] },
  { t: noveT - 0.05, pos: [MX + 1.6, 1.6, 5.4], look: [MX + 1.6, 1.35, 0] },
], { move: 0.25, push: 0.075, sway: 0.016 });

// ---------- carteles ----------
tag({ text: '1944', big: true, off: BIG, from: 0.15, to: erT - 0.1 });
tag({ text: '¡De goma!', big: true, off: BIG, from: gomaT - 0.05, to: c[1] });
tag({ text: 'Nombre oficial', at: () => tmp3.set(CX, 3.65, -2.3), off: [0, -90], from: tropT + 0.3, to: peroT });
tag({ text: 'Ejército Fantasma', big: true, off: [540, 170], from: fanT - 0.1, to: c[2] });
tag({ text: '1.100 hombres', big: true, off: [540, 170], from: milT, to: artT - 0.15 });
tag({ text: 'Artistas', at: above(H.k), off: [0, -230], from: artT, to: c[3] });
tag({ text: 'Arquitectos', at: above(H.a), off: [0, -300], from: arqT, to: c[3] });
tag({ text: 'Diseñadores', at: above(H.b), off: [0, -230], from: disT, to: c[3] });
tag({ text: 'Ellsworth Kelly', at: above(H.k), off: [120, -300], from: kelT - 0.1, to: elT - 0.15 });
tag({ text: 'Pintor', big: true, off: BIG, from: pinT, to: elT - 0.15 });
tag({ text: 'Bill Blass', at: above(H.b), off: [-100, -300], from: blT - 0.1, to: c[4] });
tag({ text: 'Modisto', big: true, off: BIG, from: elT + 0.1, to: c[4] });
tag({ text: 'Misión: engañar', big: true, off: BIG, from: misT, to: noT - 0.1 });
tag({ text: '¡Casi nada!', big: true, off: BIG, from: casiT - 0.1, to: c[5] });
tag({ text: 'Tanques', at: () => tmp3.set(FX + 1.15, 1.6, -0.3), off: [0, -200], from: tanqT + 0.2, to: canT - 0.05 });
tag({ text: 'Cañones', at: () => tmp3.set(FX + 4.9, 1.1, 0.9), off: [-120, -260], from: canT + 0.15, to: goma2T - 0.1 });
tag({ text: 'Camiones', at: () => tmp3.set(FX + 6.6, 1.4, -0.3), off: [60, -280], from: camT + 0.15, to: goma2T - 0.1 });
tag({ text: 'De verdad', at: () => tmp3.set(real.g.position.x - 0.1, 1.6, -0.25), off: [0, -170], from: goma2T + 0.1, to: POV0 });
tag({ text: 'De goma', at: () => tmp3.set(FX + 1.15, 1.6, -0.3), off: [0, -170], from: goma2T + 0.25, to: POV0 });
tag({ text: '¡Parecen de verdad!', big: true, off: [540, 330], from: verT - 0.05, to: c[6] });
tag({ text: 'El enemigo', at: above(H.e), off: [160, -260], from: c[6] + 0.2, to: asiT - 0.1 });
tag({ text: 'Parlantes gigantes', at: () => tmp3.set(ht.position.x - 0.8, 2.8, 0.1), off: [0, -150], from: parT, to: ruiT - 0.1 });
tag({ text: 'Ruido grabado', big: true, off: BIG, from: ruiT, to: oyeT - 0.2 });
tag({ text: '24 km', big: true, off: BIG, from: kmT - 0.05, to: c[7] });
tag({ text: 'Radio falsa', big: true, off: BIG, from: radT - 0.1, to: uniT - 0.15 });
tag({ text: 'Unidades que no están', at: () => tmp3.set(RX - 0.75, 1.4, -0.62), off: [-60, -330], from: uniT, to: c[8] });
tag({ text: 'Franceses', at: () => tmp3.copy(H.c0).setY(H.c0.y + 0.25), off: [60, -250], from: franT + 0.1, to: venT + 0.3 });
tag({ text: '¡4 soldados!', big: true, off: BIG, from: cuaT, to: manT - 0.15 });
tag({ text: '¡Con las manos!', big: true, off: BIG, from: manT - 0.1, to: c[9] });
tag({ text: 'El guardia', at: above(H.g), off: [-40, -260], from: guaT - 0.05, to: losT - 0.15 });
tag({ text: '“Los americanos son muy fuertes”', at: above(H.g), off: [-120, -280], from: losT, to: fueT + 0.1 });
tag({ text: '¡Muy fuertes!', big: true, off: BIG, from: fueT + 0.1, to: c[10] });
tag({ text: '+20 engaños', big: true, off: [540, 330], from: vteT - 0.05, to: c[11] });
tag({ text: 'Secreto', big: true, off: BIG, from: secT, to: cinT - 0.15 });
tag({ text: '50 años', big: true, off: BIG, from: cinT - 0.05, to: noveT - 0.15 });
tag({ text: '1996', big: true, off: BIG, from: noveT - 0.05, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'boom', 0.5);
for (const hit of [gomaT, fanT, verT, kmT, LIFT + 0.1, noveT]) sfx(hit, 'riser_to', 0.9);
sfx(gomaT, 'boom', 0.4); sfx(fanT, 'boom', 0.4); sfx(verT, 'boom', 0.4); sfx(kmT, 'boom', 0.45); sfx(noveT, 'boom', 0.5);
sfx(POKE + 0.15, 'pop', 0.8);
sfx(inflT + 0.1, 'hiss', 0.7); sfx(canT, 'hiss', 0.5);
sfx(c[5], 'roll', 0.5); sfx(c[5] + 1.05, 'thud', 0.6);
sfx(LIFT + 0.1, 'thud', 0.4);
sfx(secT - 0.04, 'thud', 0.8);
PINS.forEach((_, i) => { if (i % 3 === 0) sfx(c[10] + 0.3 + i * 0.075, 'tap', 0.45); });
sfx(radT, 'tap', 0.5); sfx(radT + 0.35, 'tap', 0.5); sfx(radT + 0.6, 'tap', 0.5);

// ---------- cuadro ----------
const binoEl = document.getElementById('bino');
const focus = V(0, 1.4, 0);
k.follow(() => focus);
k.run(t => {
  poseField(t); poseTent(t); poseHill(t); poseRoad(t); poseOffice(t);
  if (t >= c[8] && t < c[10]) poseField(t);           // los franceses miran al guardia ya ubicado
  if (!(t >= asiT - 0.01 && t < oyeT - 0.15) && !(t < c[1] || (t >= c[5] && t < c[6]) || (t >= c[8] && t < c[10])) && t < c[10]) { P[2].root.visible = false; P[3].root.visible = false; }
  if (t < c[10] && !(t >= c[8])) guard.root.visible = false;
  if (t < c[10] && !inField(t)) P[1].root.visible = false;
  // bultos de los que cargan
  carriers.forEach(cr => { cr.w.hand(0, tmp); cr.w.hand(1, tmp2); cr.b.position.copy(tmp).add(tmp2).multiplyScalar(0.5); cr.b.position.y += 0.06; cr.b.rotation.y = PI / 2; });
  // binoculares (máscara) en la toma subjetiva
  binoEl.style.display = t >= POV0 && t < POV1 ? 'block' : 'none';
  // lámparas que se mecen
  lamps.forEach((g, i) => { g.rotation.z = 0.05 * Math.sin(t * 1.3 + i); });
  // destellos sobre el tanque inflado y el almanaque
  sparks.forEach((m, i) => {
    let kk = 0, base = null;
    if (t >= gomaT - 0.1 && t < c[1]) { kk = popIn(t, gomaT - 0.1, c[1]); base = tmp.set(FX + 1.0, 1.0, 0.3); }
    else if (t >= tanqT && t < goma2T) { kk = popIn(t, tanqT + 0.3, goma2T); base = tmp.set(FX + 1.2, 1.1, 0.3); }
    else if (t >= noveT) { kk = popIn(t, noveT, END + 2); base = tmp.set(MX + 1.05, 1.15, 0.1); }
    kk *= 0.55 + 0.45 * Math.sin(t * 9 + i * 1.6);
    if (!base) { m.visible = false; return; }
    k.glyphAt(m, base, [-0.7, 0.75, -0.5, 0.55, 0.05][i], [0.45, 0.4, -0.25, -0.2, 0.75][i], Math.max(kk, 0), t * 1.5 + i);
  });
  // signos sobre las cabezas
  k.glyphAt(bang[0], H.c0, 0.38, 0.4, t >= c[8] ? popIn(t, venT + 0.1, manT + 0.3) + popIn(t, fueT + 0.25, c[10]) : 0, 0.1 * Math.sin(t * 7));
  k.glyphAt(bang[1], H.c1, -0.38, 0.4, t >= c[8] ? popIn(t, venT + 0.2, manT + 0.3) + popIn(t, fueT + 0.35, c[10]) : 0, -0.1 * Math.sin(t * 7));
  k.glyphAt(qm, H.e, 0.42, 0.45, t >= c[4] && t < c[5] ? popIn(t, casiT - 0.1, c[5]) : t >= c[6] && t < asiT ? popIn(t, escT, asiT) : 0, 0.12 * Math.sin(t * 6));
  k.glyphAt(qm2, H.p3, 0.05, 0.62, 0);
  sweat.forEach((m, i) => { const on = t > kmT + 0.3 && t < c[7], u = (t * 1.7 + i / 2) % 1, s = i ? 1 : -1; m.visible = on; if (!on) return; m.position.set(H.e.x + s * (0.3 + 0.25 * u), H.e.y + 0.22 + 0.3 * u - 0.6 * u * u, 0.25); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
  const riding = t > c[8] && t < bicT + 0.2;
  speed.forEach((m, i) => { m.visible = riding; if (!riding) return; m.position.set(bikes[0].g.position.x - 0.8 - 0.15 * ((i * 3) % 4) + 0.2 * Math.sin(t * 40 + i), 0.4 + i * 0.28, LANE[0]); m.material.opacity = 0.5 + 0.4 * Math.sin(t * 50 + i * 2); });
  // qué sigue la sombra
  if (t < c[1] || (t >= c[5] && t < c[6]) || (t >= c[8] && t < c[10])) focus.set(FX, 1.4, 0); else if (t < c[4] || (t >= c[7] && t < c[8])) focus.set(CX, 1.4, 0); else if (t < c[10] && (t < asiT || t >= oyeT - 0.15)) focus.set(EX, 1.4, 0); else if (t < c[10]) focus.set(ht.position.x, 1.4, 0); else focus.set(MX + 1, 1.4, 0);
});
