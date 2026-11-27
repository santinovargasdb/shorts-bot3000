// Episodio: la Guerra del Cerdo (isla San Juan, 1859). Cuatro decorados uno al lado del otro en x:
// BAHÍA (0: playa, botes, barcos británicos, soldados), GRANJA (40: huerta de papas, cabaña, el cerdo),
// MAPA (80: la isla vista desde arriba con las dos banderas) y PALACIO (120: el káiser y el mapa en la pared).
// Tiempos de out/cerdo/timing.json (python -m anim3d.narrar cerdo).
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, painting, windowPic, hills } from '/lib/decor.js';

const k = await setup('cerdo');
const { scene, c, at, END, sfx, tag, BIG } = k;
const BX = 0, FX = 14, MX = 80, KX = 120;            // la granja queda pegada a la playa: se viaja de una a otra sin corte
const S = (o, s) => { o.visible = s > 0.01; o.scale.setScalar(Math.max(s, 0.001) * (o.userData.s0 || 1)); };
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), tmp3 = V(0, 0, 0);

// ---------- tiempos (palabras) ----------
const estT = at('estados', 0), granT = at('gran', 0), casiT = at('casi', 0), porT = at('por', 4) - 0.1;
const reclT = at('reclaman', c[1]), islaT = at('isla', c[1]), vivT = at('viven', c[1]);
const lymT = at('lyman', c[2]), cerdoT = at('cerdo', c[2]), papT = at('papas', c[2]), dispT = at('dispara', c[2]);
const irlT = at('irland', c[3]), compT = at('compa', c[3]);
const diezT = at('diez', c[4]), duenoT = at('due', c[4]), cienT = at('cien', c[4]), britT = at('brit', c[4]), amenT = at('amenazan', c[4]);
const ejT = at('ejercito', c[5]), sesT = at('sesenta', c[5]);
const mandaT = at('manda', c[6]), agoT = at('agosto', c[6]), cuatT = at('cuatrocientos', c[6]), cincoT = at('cinco', c[6]), hombT = at('dos', at('cinco', c[6]));
const ordenT = at('orden', c[7]), noT = at('no', c[7]), insT = at('insult', c[7]), asiT = at('asi', c[7]);
const almT = at('almirante', c[8]), niegaT = at('niega', c[8]), cerdo2T = at('cerdo', c[8]);
const compaT = at('comparten', c[9]), campT = at('campamento', c[9]), doceT = at('doce', c[9]);
const decT = at('decide', c[10]), kaiT = at('kaiser', c[10]), milT = at('mil', c[10]), quedaT = at('queda', c[10]);
const bajaT = at('baja', c[11]), cerdo3T = at('cerdo', c[11]);
const BANG = dispT + 0.08;

// ---------- piezas propias ----------
function cvTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const drawUK = (g, W, H) => {
  g.fillStyle = '#1f3f8f'; g.fillRect(0, 0, W, H);
  g.lineCap = 'butt';
  g.strokeStyle = '#ffffff'; g.lineWidth = H * 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
  g.strokeStyle = '#c8202f'; g.lineWidth = H * 0.07; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
  g.fillStyle = '#ffffff'; g.fillRect(W / 2 - H * 0.17, 0, H * 0.34, H); g.fillRect(0, H / 2 - H * 0.17, W, H * 0.34);
  g.fillStyle = '#c8202f'; g.fillRect(W / 2 - H * 0.1, 0, H * 0.2, H); g.fillRect(0, H / 2 - H * 0.1, W, H * 0.2);
  g.strokeStyle = '#1e1428'; g.lineWidth = 12; g.strokeRect(0, 0, W, H);
};
const drawUS = (g, W, H) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8202f'; g.fillRect(0, i * H / 13, W, H / 13 + 1); }
  const cw = W * 0.42, ch = H * 7 / 13; g.fillStyle = '#26408f'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#ffffff'; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(cw * (i + 0.5) / 6, ch * (j + 0.5) / 4, H * 0.025, 0, 7); g.fill(); }
  g.strokeStyle = '#1e1428'; g.lineWidth = 12; g.strokeRect(0, 0, W, H);
};
const drawDE = (g, W, H) => {
  ['#1e1428', '#ffffff', '#d63c3c'].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * H / 3, W, H / 3 + 1); });
  g.strokeStyle = '#1e1428'; g.lineWidth = 12; g.strokeRect(0, 0, W, H);
};
const flags = [];
/** Bandera que flamea (la tela se ondula), colgada de un mástil con perilla. */
function makeFlag(parent, draw, w, h, x, y, z, pole = 2.2) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  if (pole > 0) {
    const p = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, pole, 10), flat(0xe8e2d0)), 0.012); p.position.y = pole / 2; g.add(p);
    const knob = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), flat(0xffd23a)), 0.012); knob.position.y = pole + 0.04; g.add(knob);
  }
  const geo = new THREE.PlaneGeometry(w, h, 14, 2); geo.translate(w / 2 + 0.03, 0, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cvTex(256, Math.round(256 * h / w), draw), side: THREE.DoubleSide }));
  m.position.y = pole > 0 ? pole - h / 2 - 0.05 : 0; g.add(m);
  const pos = geo.attributes.position, x0 = Float32Array.from({ length: pos.count }, (_, i) => pos.getX(i)), ph = flags.length * 1.7;
  flags.push(t => { for (let i = 0; i < pos.count; i++) { const u = x0[i] / w; pos.setZ(i, 0.1 * w * u * Math.sin(u * 7 - t * 7 + ph)); pos.setY(i, pos.getY(i)); } pos.needsUpdate = true; });
  return g;
}
function seaTex(seed, rx, ry) {
  const t = cvTex(256, 256, (g, W) => {
    g.fillStyle = '#3f9bd8'; g.fillRect(0, 0, W, W); g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const x = (i * 97 + seed * 31) % W, y = (i * 53 + seed * 17) % W;
      g.strokeStyle = i % 3 ? '#6fb9ee' : '#e7f6ff'; g.lineWidth = i % 3 ? 7 : 5;
      for (const dx of [-W, 0, W]) { g.beginPath(); g.arc(x + dx, y, 16, 0.15 * PI, 0.85 * PI); g.stroke(); }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
const seas = [];
function sea(x, z, w, h, rx, ry, seed = 1) {
  const map = seaTex(seed, rx, ry); seas.push(map);
  const m = surface(scene, map, w, h, x, 0, z, true); return m;
}
/** Fusil: culata de madera y caño; se ubica con aim(desde, hacia). */
function makeRifle() {
  const g = new THREE.Group(); scene.add(g);
  block(g, 0x8a5a33, -0.03, 0.03, -0.05, 0.03, -0.3, 0.04, 0.012);
  const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8), flat(0x3a3f4d)), 0.01); b.rotation.x = PI / 2; b.position.set(0, 0.005, 0.33); g.add(b);
  g.userData.tip = new THREE.Object3D(); g.userData.tip.position.set(0, 0, 0.66); g.add(g.userData.tip);
  g.aim = (a, bpt) => { g.position.copy(a); g.lookAt(bpt); };
  return g;
}
/** Bote de remos (los personajes se paran adentro). */
function makeBoat(x, z, color = 0x9a6638) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const shape = new THREE.Shape([[-0.62, 0.3], [-0.45, 0], [0.45, 0], [0.62, 0.3]].map(p => new THREE.Vector2(...p)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.56, bevelEnabled: false }); geo.translate(0, -0.05, -0.28);
  g.add(outlined(new THREE.Mesh(geo, flat(color)), 0.018));
  block(g, 0xd9a441, -0.62, 0.62, 0.24, 0.29, 0.29, 0.25, 0.008);
  const oar = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 6), flat(0xc08a54)), 0.008); oar.rotation.z = 1.1; oar.position.set(0.5, 0.25, 0.33); g.add(oar);
  return g;
}
/** Barco de guerra a vela y vapor, con la bandera británica. */
const smokes = [];
function makeShip(s, x, z) {
  const g = new THREE.Group(); g.scale.setScalar(s); g.position.set(x, -0.06, z); scene.add(g);
  const hull = new THREE.Shape([[-1.6, -0.15], [1.45, -0.15], [2.05, 0.66], [1.55, 0.6], [-1.45, 0.6], [-1.75, 0.8], [-1.78, 0.6]].map(p => new THREE.Vector2(...p)));
  const hg = new THREE.ExtrudeGeometry(hull, { depth: 0.8, bevelEnabled: false }); hg.translate(0, 0, -0.4);
  g.add(outlined(new THREE.Mesh(hg, flat(0x2b2f3a)), 0.025));
  const band = picture(g, 3.1, 0.2, -0.05, 0.36, 0.405, (c2, W, H) => { c2.fillStyle = '#f3ecd8'; c2.fillRect(0, 0, W, H); c2.fillStyle = '#1e1428'; for (let i = 0; i < 12; i++) c2.fillRect(18 + i * (W - 36) / 12, H * 0.25, (W - 36) / 24, H * 0.5); }, 512);
  block(g, 0x8a2f2f, -1.5, 1.45, -0.16, 0.02, 0.41, 0.395, 0.006);
  for (const [mx, hm] of [[-0.95, 2.6], [0.15, 2.95], [1.1, 2.45]]) {
    const m = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, hm, 8), flat(0x7a4b2a)), 0.012); m.position.set(mx, 0.6 + hm / 2, 0); g.add(m);
    const sw = hm > 2.8 ? 0.5 : 0.42;
    block(g, 0xf6f0e0, mx - sw, mx + sw, 1.0, 1.7, 0.06, 0.02, 0.018);
    block(g, 0xf6f0e0, mx - sw * 0.75, mx + sw * 0.75, 1.85, 2.45, 0.06, 0.02, 0.018);
    if (hm > 2.8) block(g, 0xf6f0e0, mx - sw * 0.5, mx + sw * 0.5, 2.6, 3.1, 0.06, 0.02, 0.016);
  }
  k.stroke(g, [[2.05, 0.66], [1.1, 3.05], [0.15, 3.5], [-0.95, 3.15], [-1.75, 0.8]], 0.018, false, 0.0);
  const stack = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.6, 12), flat(0x23262d)), 0.014); stack.position.set(-0.42, 0.9, 0); g.add(stack);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.08, 12), flat(0xc8302a)); ring.position.set(-0.42, 1.08, 0); g.add(ring);
  makeFlag(g, drawUK, 0.5, 0.3, -1.72, 0.8, 0, 0.9);
  const puffs = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe6e6ea, transparent: true })); g.add(m); return m; });
  smokes.push({ puffs, x: -0.42, y: 1.22 });
  return g;
}
function makeCannon(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  block(g, 0x7a4b2a, -0.12, 0.12, 0.1, 0.28, -0.32, 0.18, 0.014);
  const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.75, 14), flat(0x2b2f3a)), 0.014); b.rotation.x = -PI / 2 + 0.22; b.position.set(0, 0.36, -0.12); g.add(b);
  for (const s of [-1, 1]) { const w = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), flat(0x9a6638)), 0.012); w.rotation.z = PI / 2; w.position.set(s * 0.16, 0.17, 0); g.add(w); }
  return g;
}
function makeTent(x, z, s = 1, color = 0xf3ecd8) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.userData.s0 = s; scene.add(g);
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 3); geo.rotateX(-PI / 2); geo.translate(0, 0.25, 0);
  g.add(outlined(new THREE.Mesh(geo, flat(color)), 0.02));
  const door = k.poly(g, [[-0.16, 0], [0, 0.55], [0.16, 0]], 0x5a4a3a, 0.02); door.position.z = 0.505;
  return g;
}
/** Gallina que picotea y camina un poco. */
const hens = [];
function makeHen(x, z, span, off) {
  const root = new THREE.Group(); scene.add(root); const turn = new THREE.Group(); turn.rotation.y = -PI / 2; root.add(turn);
  const body = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), flat(0xfaf6ee)), 0.014); body.scale.set(1.25, 1, 0.95); body.position.y = 0.2; turn.add(body);
  const tail = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 8), flat(0xfaf6ee)), 0.012); tail.rotation.z = 0.9; tail.position.set(-0.14, 0.28, 0); turn.add(tail);
  const head = new THREE.Group(); head.position.set(0.12, 0.3, 0); turn.add(head);
  head.add(outlined(new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), flat(0xfaf6ee)), 0.012));
  const beak = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 6), flat(0xf0a020)), 0.006); beak.rotation.z = -PI / 2; beak.position.set(0.08, -0.005, 0); head.add(beak);
  for (const dx of [-0.02, 0.015]) { const cm = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), flat(0xd63c3c)); cm.position.set(dx, 0.065, 0); head.add(cm); }
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), INK); e.position.set(0.035, 0.015, s * 0.055); head.add(e); }
  const legs = [-1, 1].map(s => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 5), basic(0xf0a020)); l.position.set(0, 0.06, s * 0.04); turn.add(l); return l; });
  hens.push(t => {
    const u = t * 0.35 + off, cyc = (u % 2 + 2) % 2, dir = cyc < 1 ? 1 : -1, walkK = Math.sin(PI * (cyc % 1)) > 0.35 ? 1 : 0;
    const px = x + span * (cyc < 1 ? cyc : 2 - cyc) - span / 2;
    root.position.set(px, 0.012 * Math.abs(Math.sin(t * 14)) * walkK, z); root.rotation.y = dir > 0 ? PI / 2 - 0.4 : -PI / 2 + 0.4;
    const peck = walkK ? 0 : Math.max(0, Math.sin(t * 9 + off * 3));
    head.rotation.z = -1.1 * peck; head.position.set(0.12 + 0.05 * peck, 0.3 - 0.12 * peck, 0);
    legs.forEach((l, i) => { l.rotation.z = 0.4 * Math.sin(t * 14 + i * PI) * walkK; });
  });
}

// ---------- el cerdo (protagonista) ----------
const PINK = 0xf7a9bb, PINK_D = 0xec849e;
function makePig() {
  const root = new THREE.Group(); scene.add(root);
  const turn = new THREE.Group(); turn.rotation.y = -PI / 2; root.add(turn);         // el modelo mira a +x; con face 0 mira a cámara
  const flip = new THREE.Group(); flip.position.y = 0.42; turn.add(flip);
  const m = new THREE.Group(); m.position.y = -0.42; flip.add(m);
  const torso = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.3, 26, 18), flat(PINK)), 0.024); torso.scale.set(1.32, 0.92, 0.96); torso.position.y = 0.42; m.add(torso);
  for (const [x, y, zz, r] of [[-0.12, 0.6, 0.2, 0.06], [0.05, 0.55, 0.25, 0.045], [-0.2, 0.45, 0.26, 0.04]]) {   // manchitas
    const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), flat(PINK_D)); sp.scale.z = 0.4; sp.position.set(x, y, zz); m.add(sp);
    const sp2 = sp.clone(); sp2.position.z = -zz; m.add(sp2);
  }
  const head = new THREE.Group(); head.position.set(0.37, 0.54, 0); m.add(head);
  head.add(outlined(new THREE.Mesh(new THREE.SphereGeometry(0.215, 24, 18), flat(PINK)), 0.022));
  const snout = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.095, 0.11, 22), flat(PINK_D)), 0.016); snout.rotation.z = PI / 2; snout.position.set(0.215, -0.035, 0); head.add(snout);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), basic(0x7a2f45)); n.scale.y = 1.4; n.rotation.y = PI / 2; n.position.set(0.272, -0.035, s * 0.033); head.add(n); }
  const Zf = V(0, 0, 1), seat = (obj, dir, r = 0.218) => { const p = dir.clone().normalize(); obj.quaternion.setFromUnitVectors(Zf, p); obj.position.copy(p).multiplyScalar(r); head.add(obj); return obj; };
  const eyes = [-1, 1].map(s => {
    const e = new THREE.Group(), round = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CircleGeometry(0.052, 20), INK); ring.scale.y = 1.15; round.add(ring);
    const wh = new THREE.Mesh(new THREE.CircleGeometry(0.041, 20), basic(0xffffff)); wh.scale.y = 1.15; wh.position.z = 0.002; round.add(wh);
    const pu = new THREE.Mesh(new THREE.CircleGeometry(0.022, 14), INK); pu.position.set(0.004, -0.004, 0.004); round.add(pu);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.008, 8), basic(0xffffff)); shine.position.set(0.012, 0.014, 0.006); round.add(shine);
    const arcG = new THREE.Group(); const a = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 6, 16, PI), INK); arcG.add(a);
    const xG = new THREE.Group(); for (const r of [0.8, -0.8]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.022), INK); b.rotation.z = r; xG.add(b); }
    e.add(round, arcG, xG); seat(e, V(0.62, 0.36, s * 0.55));
    return { e, round, arcG, xG };
  });
  const brows = [-1, 1].map(s => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.016), INK); seat(b, V(0.52, 0.62, s * 0.5), 0.222); return b; });
  const mouth = new THREE.Group(); const sm = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 6, 16, PI), INK); sm.rotation.z = PI; mouth.add(sm); seat(mouth, V(0.75, -0.55, 0));
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), basic(0xe8665c)); tongue.position.set(0, -0.05, 0.004); mouth.add(tongue);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(0.035, 14), new THREE.MeshBasicMaterial({ color: 0xff7d9a, transparent: true, opacity: 0.7 })); seat(ch, V(0.45, -0.25, s * 0.8), 0.22); }
  const ears = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(0.0, 0.17, s * 0.13); head.add(g);
    const e = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.17, 12), flat(PINK_D)), 0.014); e.scale.z = 0.45; e.position.y = 0.07; g.add(e);
    g.rotation.set(s * -0.35, 0, -0.55); return g;
  });
  const legs = [[0.2, 1], [0.2, -1], [-0.2, 1], [-0.2, -1]].map(([x, s]) => {
    const g = new THREE.Group(); g.position.set(x, 0.29, s * 0.14); m.add(g);
    const l = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.24, 12), flat(PINK)), 0.014); l.position.y = -0.12; g.add(l);
    const hoof = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.056, 0.05, 12), flat(0x6a4a3a)), 0.01); hoof.position.y = -0.265; g.add(hoof);
    return g;
  });
  const tailG = new THREE.Group(); tailG.position.set(-0.38, 0.5, 0); m.add(tailG);
  const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30, a = u * 3.2 * PI, r = 0.065 * (1 - 0.55 * u); pts.push(V(-0.02 - 0.09 * u, r * Math.sin(a), r * Math.cos(a) - 0.065)); }
  tailG.add(outlined(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.017, 7), flat(PINK_D)), 0.01));
  const halo = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 8, 28), basic(0xffe14a)), 0.012); halo.rotation.x = PI / 2; halo.position.set(0.3, 0.92, 0); m.add(halo);
  const wings = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(-0.02, 0.62, s * 0.22); m.add(g);
    const w = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), flat(0xffffff)), 0.014); w.scale.set(0.75, 0.3, 1.0); w.position.set(-0.05, 0.08, s * 0.13); g.add(w);
    return g;
  });
  const potato = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), flat(0xc9a05a)), 0.012); potato.scale.set(1.3, 0.9, 1); potato.position.set(0.3, -0.13, 0); head.add(potato);
  return {
    root, head,
    pose({ x = 0, y = 0, z = 0, face = 0, walk = 0, phase = 0, eat = 0, dead = 0, eye = 'round', squash = 1, tilt = 0, nod = 0, angel = 0, t = 0, lookX = 0 }) {
      root.position.set(x, y, z); root.rotation.y = face;
      const sq = Math.max(0.5, squash); root.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      flip.rotation.x = PI * dead; flip.position.y = 0.42 - 0.27 * Math.sin(PI / 2 * dead);
      legs.forEach((g, i) => { g.rotation.z = (i === 0 || i === 3 ? 1 : -1) * 0.55 * Math.sin(phase * 2 * PI) * walk + (dead ? 0.25 * Math.sin(t * 9 + i) * dead * 0 : 0) + angel * 0.25 * Math.sin(t * 5 + i); });
      head.rotation.set(tilt, lookX, -0.5 * eat + 0.09 * Math.sin(t * 15) * eat + nod);
      ears.forEach((g, i) => { g.rotation.z = -0.55 + 0.12 * Math.sin(t * 6 + i * 1.3) - 0.25 * eat; });
      tailG.rotation.x = 0.5 * Math.sin(t * 8);
      eyes.forEach(o => { o.round.visible = eye === 'round'; o.arcG.visible = eye === 'happy'; o.xG.visible = eye === 'x'; o.e.scale.setScalar(eye === 'round' ? 1 + 0.1 * Math.sin(t * 3) * 0 : 1); });
      brows.forEach(b => { b.visible = false; });
      tongue.visible = eye !== 'round';
      halo.visible = angel > 0.01; halo.position.y = 0.95 + 0.03 * Math.sin(t * 4);
      wings.forEach((g, i) => { g.visible = angel > 0.01; g.scale.setScalar(Math.max(angel, 0.001)); g.rotation.x = (i ? 1 : -1) * (0.25 + 0.5 * Math.sin(t * 13)); });
      potato.visible = eat > 0.5; potato.scale.set(1.3 * (1 - 0.25 * Math.abs(Math.sin(t * 15))), 0.9, 1);
      root.updateMatrixWorld(true);
    },
  };
}

// =====================================================================================
// BAHÍA (x = 0): playa, mar con olas, botes, carpas, barcos británicos
// =====================================================================================
surface(scene, tex.grass({ base: '#ecd59b', blade: '#d6ba78', light: '#f6e8bd', seed: 4 }, 10, 5), 24, 9, BX - 5, 0.003, 3.9, true);
k.plane(scene, 0xd9bf85, 24, 0.3, BX - 5, 0.004, -0.48, true);
const foam = k.plane(scene, 0xffffff, 24, 0.09, BX - 5, 0.006, -0.64, true);
sea(BX, -30.6, 80, 60, 26, 20, 1);
hills(scene, BX, -34, [[-9, 7, 0x6fa86a], [0, 9, 0x5f9a5e], [10, 6, 0x7bb574], [-16, 5, 0x86c56c]]);
for (const [x, z, h] of [[-12, -33, 1.6], [-10.5, -33, 2], [8, -33, 1.7], [9.6, -33, 1.4], [-3, -33.5, 2.2], [-1.6, -33.5, 1.8]]) k.tree(x, z, { pine: true, h, leaf: 0x3f7f4f });
k.cloud(-3.5, 6.5, -20, 1.4); k.cloud(2.8, 8, -20, 1.1); k.cloud(-0.4, 9.6, -20, 0.9); k.cloud(6, 6.8, -20, 1.2); k.cloud(-7, 8.4, -20, 1);
k.birds([[BX, 4.2, 0], [BX, 4.9, 6], [BX, 3.8, 10]], -6);
k.tree(BX - 8.0, -0.3, { pine: true, h: 2.6, leaf: 0x3f8f5a }); k.tree(BX - 8.9, 0.6, { pine: true, h: 2.2, leaf: 0x4a9a62 }); k.tree(BX + 4.3, 0.2, { pine: true, h: 2.4, leaf: 0x3f8f5a });
for (const [x, z, r] of [[-1.9, -0.2, 0.18], [1.6, -0.3, 0.14], [2.4, 0.6, 0.22], [-3.2, 1.4, 0.16], [0.9, 2.2, 0.1], [-0.4, -0.35, 0.09]]) {
  const rk = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), flat(0xa3a8b0)), 0.014); rk.scale.y = 0.6; rk.position.set(x, r * 0.3, z); rk.receiveShadow = true; scene.add(rk);
}
{ const log = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.2, 10), flat(0xb08a60)), 0.014); log.rotation.z = PI / 2; log.rotation.y = 0.4; log.position.set(1.9, 0.08, 1.6); scene.add(log); }
const tentsUK = [makeTent(BX + 2.0, -0.3), makeTent(BX + 2.85, -0.42, 0.9)], tentsUS = [makeTent(BX - 3.7, -0.35), makeTent(BX - 4.6, -0.45, 0.9)];
const flagUK = makeFlag(scene, drawUK, 0.7, 0.42, BX + 3.4, 0, -0.45, 2.4);
const sky2 = new THREE.Group(); scene.add(sky2);
{ const s = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), basic(0xffd23a)), 0.025); sky2.add(s);
  for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.26), basic(0xffd23a)); r.position.set(Math.cos(i * PI / 4) * 0.68, Math.sin(i * PI / 4) * 0.68, 0); r.rotation.z = i * PI / 4 - PI / 2; sky2.add(r); } }
makeFlag(scene, drawUS, 0.75, 0.45, BX - 1.7, 0, -0.3, 2.6);
const boat = makeBoat(BX + 0.85, -1.2), boat2 = makeBoat(BX + 5.0, -2.2, 0x7a5233);
const ships = [makeShip(1.25, 3.4, -3.4), makeShip(0.95, -2.8, -9.5), makeShip(0.9, 1.4, -12), makeShip(0.85, 5.4, -11), makeShip(0.8, -7.2, -13)];
ships.forEach(s => { s.userData.x0 = s.position.x; });
const cannons = [makeCannon(BX - 1.8, 1.05, PI + 0.5), makeCannon(BX - 3.2, 1.0, PI + 0.4), makeCannon(BX - 4.6, 0.95, PI + 0.3), makeCannon(BX - 6.0, 0.9, PI + 0.3)];

// =====================================================================================
// GRANJA (x = 40): cabaña de troncos, cerca, huerta de papas, cartel de la compañía
// =====================================================================================
surface(scene, tex.grass({}, 11, 7), 34, 21, FX + 10, 0.004, 4.5, true);
k.plane(scene, 0xffffff, 34, 0.09, FX + 10, 0.006, -6.04, true);
hills(scene, FX, -14, [[-5, 4.5, 0x9ad17a], [2, 5.5, 0x86c56c], [7, 3.6, 0x9ad17a]]);
k.cloud(FX - 2.6, 6.2, -12, 1.1); k.cloud(FX + 2.8, 7.4, -12, 0.9); k.cloud(FX + 0.2, 8.8, -12, 0.7);
k.birds([[FX, 5.4, 2], [FX, 6.1, 8]], -9);
for (const [x, z, h] of [[-4.2, -3.4, 2.8], [-5.2, -2.4, 2.3], [3.9, -3.6, 2.9], [4.9, -2.6, 2.2], [2.9, -4.6, 2.5], [-3.1, -5, 2.6]]) k.tree(FX + x, z, { pine: true, h, leaf: (x * 7) % 2 ? 0x3f8f5a : 0x4a9a62 });
k.tree(FX - 2.6, -0.6, { h: 2.4, leaf: 0x6dbb58 });
{ // cabaña
  block(scene, 0x9a6638, FX - 3.4, FX - 1.3, 0, 1.75, -1.9, -3.3, 0.022);
  picture(scene, 2.1, 1.75, FX - 2.35, 0.875, -1.885, (g, W, H) => {
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#a8723f' : '#9a6638'; g.fillRect(0, i * H / 9, W, H / 9); g.strokeStyle = '#6b4424'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, i * H / 9); g.lineTo(W, i * H / 9); g.stroke(); }
    g.fillStyle = '#5f3b1f'; g.fillRect(W * 0.58, H * 0.38, W * 0.2, H * 0.62); g.strokeStyle = '#1e1428'; g.lineWidth = 8; g.strokeRect(W * 0.58, H * 0.38, W * 0.2, H * 0.62);
    g.fillStyle = '#ffe9a3'; g.fillRect(W * 0.14, H * 0.35, W * 0.24, H * 0.24); g.strokeRect(W * 0.14, H * 0.35, W * 0.24, H * 0.24);
    g.beginPath(); g.moveTo(W * 0.26, H * 0.35); g.lineTo(W * 0.26, H * 0.59); g.moveTo(W * 0.14, H * 0.47); g.lineTo(W * 0.38, H * 0.47); g.stroke();
    g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(W * 0.74, H * 0.7, 6, 0, 7); g.fill();
  }, 384);
  k.poly(scene, [[FX - 3.6, 1.7], [FX - 2.35, 2.65], [FX - 1.1, 1.7]], 0x8a3a2a, 0.05).position.z = -1.86;
  const r1 = outlined(new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 1.6), flat(0x8a3a2a)), 0.018); r1.position.set(FX - 2.95, 2.18, -2.6); r1.rotation.z = 0.65; scene.add(r1);
  const r2 = r1.clone(); r2.position.x = FX - 1.75; r2.rotation.z = -0.65; scene.add(r2);
  block(scene, 0x8a8f99, FX - 1.95, FX - 1.7, 2.1, 2.9, -2.4, -2.65, 0.016);
}
const chimney = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf0f0f4, transparent: true })); scene.add(m); return m; });
// cerca
for (let x = -1.0; x <= 3.6; x += 0.55) block(scene, 0xb08a60, FX + x - 0.04, FX + x + 0.04, 0, 0.85, -1.5, -1.58, 0.012);
for (const y of [0.35, 0.68]) block(scene, 0xc79c6a, FX - 1.05, FX + 3.65, y, y + 0.07, -1.47, -1.52, 0.01);
{ const post = block(scene, 0x7a4b2a, FX + 2.25, FX + 2.33, 0, 1.6, -1.3, -1.38, 0.012);
  const hbc = k.sign("HUDSON'S BAY Co.", 1.15, 0.42, { bg: '#f3e2bd', fg: '#7a2f3e' }); hbc.position.set(FX + 2.29, 1.45, -1.25); scene.add(hbc); }
// huerta: surcos de tierra con plantas y papas
const ROWS = [-0.05, -0.5, -0.95];
for (const z of ROWS) {
  block(scene, 0x7a4b2a, FX - 0.7, FX + 1.6, 0, 0.11, z + 0.15, z - 0.15, 0.012);
  for (let x = -0.55; x < 1.55; x += 0.32) {
    const pl = new THREE.Group(); pl.position.set(FX + x, 0.11, z); scene.add(pl);
    for (const [dx, dy, r] of [[0, 0.1, 0.09], [-0.07, 0.06, 0.065], [0.07, 0.06, 0.065]]) { const lf = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), flat(0x4f9a4a)), 0.012); lf.position.set(dx, dy, 0); pl.add(lf); }
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), flat(0xffffff)); fl.position.set(0.02, 0.2, 0.03); pl.add(fl);
  }
}
const potatoes = [[0.3, 0.32], [0.55, 0.28], [-0.2, 0.3], [0.9, 0.3], [0.0, 0.55]].map(([x, z]) => {
  const p = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), flat(0xc9a05a)), 0.012); p.scale.set(1.35, 0.85, 1); p.position.set(FX + x, 0.05, z); scene.add(p); return p;
});
makeHen(FX + 2.6, -0.7, 1.1, 0.3); makeHen(FX - 1.9, -1.0, 0.8, 1.4);
const bill10 = k.sign('$10', 0.34, 0.2, { bg: '#8fd08a' }); scene.add(bill10);
const bill100 = k.sign('$100', 0.46, 0.24, { bg: '#8fd08a' }); scene.add(bill100);

// =====================================================================================
// MAPA (x = 80): la isla vista desde arriba, el estrecho, las dos costas y las banderas
// =====================================================================================
sea(MX, 0, 40, 30, 14, 10, 2);
const ground = (pts, color, y = 0.02) => { const g = new THREE.Group(); g.rotation.x = -PI / 2; g.position.set(MX, y, 0); scene.add(g); const p = k.poly(g, pts, color, 0.05); p.children[0].material = new THREE.MeshLambertMaterial({ color }); p.children[0].receiveShadow = true; return g; };
const ISLA = [[-1.2, 1.9], [-0.6, 2.2], [0.1, 2.0], [0.5, 1.4], [0.9, 0.7], [1.1, 0], [1.3, -0.8], [1.2, -1.6], [0.8, -2.2], [0.5, -1.8], [0.2, -1.0], [-0.4, -0.5], [-1.0, 0.1], [-1.3, 0.9]];
ground(ISLA.map(([x, y]) => [x * 1.08, y * 1.05]), 0xecd59b, 0.015);
ground(ISLA, 0x8fcf6a, 0.025);
ground([[-7, 5], [-2.0, 5], [-2.2, 3.4], [-1.85, 1.8], [-2.25, 0.3], [-2.0, -1.4], [-2.4, -3], [-2.2, -5], [-7, -5]], 0x7bb574);
ground([[2.35, 5], [7, 5], [7, -5], [2.5, -5], [2.3, -3.2], [2.75, -1.6], [2.3, 0.2], [2.6, 1.8], [2.3, 3.4]], 0x9ad17a);
for (const [x, z] of [[-0.7, -1.6], [-0.2, -1.2], [0.3, -0.6], [0.6, 0.4], [0.9, 1.2], [-0.9, -0.6], [0.0, 0.1], [-2.8, 1.5], [-3.0, -0.8], [-2.7, -2.4], [3.0, 1.0], [3.2, -1.2], [2.9, -2.8]]) {
  const tr = k.tree(MX + x, z, { pine: true, h: 0.8, leaf: 0x3f8f5a }); tr.scale.setScalar(0.42);
}
const houses = [[0.75, 0.9, 0xe9c3a8], [0.95, 1.5, 0xf3e2bd], [-0.55, -0.9, 0xe3cfe6], [-0.85, -1.45, 0xf1dcb4]].map(([x, z, col]) => {
  const g = new THREE.Group(); g.position.set(MX + x, 0.02, z); scene.add(g);
  block(g, col, -0.13, 0.13, 0, 0.2, 0.11, -0.11, 0.012);
  const roof = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 4), flat(0x8a3a2a)), 0.012); roof.rotation.y = PI / 4; roof.position.y = 0.28; g.add(roof);
  return g;
});
const mapUK = makeFlag(scene, drawUK, 0.6, 0.36, MX - 0.75, 0.02, -1.1, 1.3);
const mapUS = makeFlag(scene, drawUS, 0.6, 0.36, MX + 0.7, 0.02, 0.75, 1.3);
const campUK = [makeTent(MX - 0.55, -1.75, 0.38, 0xf3ecd8), makeTent(MX - 0.9, -1.95, 0.38, 0xf3ecd8)];
const campUS = [makeTent(MX + 0.95, 1.85, 0.38, 0xf3ecd8), makeTent(MX + 0.6, 1.6, 0.38, 0xf3ecd8)];
const miniShip = makeShip(0.22, MX - 1.65, 0);
const sun = new THREE.Group(); scene.add(sun);
{ const s = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), basic(0xffd23a)), 0.02); sun.add(s);
  for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16), basic(0xffd23a)); r.position.set(Math.cos(i * PI / 4) * 0.42, Math.sin(i * PI / 4) * 0.42, 0); r.rotation.z = i * PI / 4 - PI / 2; sun.add(r); } }
/** Gente chiquita (escala de mapa): un toon metido en un grupo achicado. */
const minis = [];
function mini(opts, x, z, span, off, from, s = 0.3) {
  const g = new THREE.Group(); g.position.set(x, 0.02, z); g.scale.setScalar(s); scene.add(g);
  const t = makeToon(opts); g.add(t.root); minis.push({ g, t, span, off, from }); return g;
}
const SOLDIER_US = { shirt: 0x2f4a8a, hair: 0x2b2118, hat: { type: 'kepi', color: 0x1b2440 }, detail: ['buttons', 'belt'] };
const SOLDIER_UK = { shirt: 0xc8302a, hair: 0x6b4a2a, hat: { type: 'kepi', color: 0x1e1428 }, detail: ['buttons', 'belt'], trim: 0xffffff };
mini({ shirt: 0x6a8f3a, hair: 0x8a5a2a, hat: { type: 'boater', color: 0xe8c56a, band: 0x7a4b2a } }, MX + 0.85, 1.2, 1.6, 0, c[1]);
mini({ shirt: 0x3f8f5a, hair: 0xc8642a, hat: { type: 'bowler', color: 0x4a3222 } }, MX - 0.7, -1.2, 1.4, 1.3, c[1]);
mini(SOLDIER_UK, MX - 0.7, -1.55, 1.8, 0.5, c[9]); mini(SOLDIER_UK, MX - 0.95, -1.4, 1.2, 2.1, c[9]);
mini(SOLDIER_US, MX + 0.75, 1.45, 1.8, 0.9, c[9]); mini(SOLDIER_US, MX + 1.0, 1.65, 1.2, 2.7, c[9]);

// =====================================================================================
// PALACIO (x = 120): el káiser, el mapa en la pared y la raya en el estrecho de Haro
// =====================================================================================
surface(scene, tex.stripes({ a: '#e9d9b0', b: '#dcc58f', dot: '#c9a35a' }, 20, 5.5), 44, 12, KX, 6, -2.2);
surface(scene, tex.planks({ base: '#7a3f2a', line: '#4f2618' }, 40, 1), 44, 1.0, KX, 0.5, -2.19); k.plane(scene, INK, 44, 0.07, KX, 1.02, -2.18);
surface(scene, tex.tiles({ base: '#efe7d6', line: '#b9ab8f', n: 4 }, 14, 10), 44, 30, KX, 0.001, 0, true);
{ const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshLambertMaterial({ color: 0x9a2f3f })); rug.rotation.x = -PI / 2; rug.position.set(KX - 0.2, 0.004, 0); rug.receiveShadow = true; scene.add(rug);
  const rb = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.2), new THREE.MeshLambertMaterial({ color: 0xb5404f })); rb.rotation.x = -PI / 2; rb.position.set(KX - 0.2, 0.006, 0); rb.receiveShadow = true; scene.add(rb); }
const MAPW = 1.3, MAPH = 1.6, MAPX = KX + 0.95, MAPY = 2.1;
picture(scene, MAPW, MAPH, MAPX, MAPY, -2.17, (g, W, H) => {
  g.fillStyle = '#9fd0ea'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#7cbbe0'; g.lineWidth = 3; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc((i * 71) % W, (i * 113) % H, 10, 0.2 * PI, 0.8 * PI); g.stroke(); }
  g.fillStyle = '#7bb574'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.3, 0); g.lineTo(W * 0.27, H * 0.3); g.lineTo(W * 0.32, H * 0.55); g.lineTo(W * 0.26, H * 0.8); g.lineTo(W * 0.3, H); g.lineTo(0, H); g.fill();
  g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#9ad17a'; g.beginPath(); g.moveTo(W, 0); g.lineTo(W * 0.86, 0); g.lineTo(W * 0.9, H * 0.35); g.lineTo(W * 0.84, H * 0.7); g.lineTo(W * 0.9, H); g.lineTo(W, H); g.fill(); g.stroke();
  g.fillStyle = '#8fcf6a'; g.beginPath(); ISLA.forEach(([x, y], i) => { const px = W * 0.62 + x * W * 0.12, py = H * 0.5 - y * H * 0.15; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill(); g.stroke();
  g.font = '800 26px Montserrat'; g.fillStyle = '#1e1428'; g.textAlign = 'center'; g.fillText('SAN JUAN', W * 0.62, H * 0.93);
  g.strokeStyle = '#d9a441'; g.lineWidth = 22; g.strokeRect(11, 11, W - 22, H - 22); g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6); g.strokeRect(22, 22, W - 44, H - 44);
}, 384);
const HARO_X = MAPX - MAPW / 2 + 0.44 * MAPW, HARO_TOP = MAPY + MAPH / 2 - 0.1;
const haro = (() => { const geo = new THREE.PlaneGeometry(0.045, 1.38); geo.translate(0, -0.69, 0); const m = new THREE.Mesh(geo, basic(0xd63c3c)); m.position.set(HARO_X, HARO_TOP, -2.14); scene.add(m); return m; })();
const mapFlagUS = makeFlag(scene, drawUS, 0.26, 0.16, MAPX - MAPW / 2 + 0.62 * MAPW, MAPY - 0.05, -2.12, 0.35);
const mapFlagUK = makeFlag(scene, drawUK, 0.26, 0.16, MAPX - MAPW / 2 + 0.12 * MAPW, MAPY - 0.05, -2.12, 0.35);
painting(scene, 0.7, 0.9, KX - 1.35, 2.35, -2.17, 2); windowPic(scene, 0.9, 1.4, KX + 2.5, 2.4, -2.17, { curtain: '#2f4a8a' });
for (const x of [-2.35, 1.95]) { block(scene, 0xd9a441, KX + x - 0.14, KX + x + 0.14, 0, 3.8, -1.95, -2.15, 0.016); block(scene, 0xb5862f, KX + x - 0.2, KX + x + 0.2, 0, 0.2, -1.9, -2.18, 0.014); }
makeFlag(scene, drawDE, 0.7, 0.42, KX - 2.0, 0, -1.3, 2.5);
const desk = new THREE.Group(); scene.add(desk);
block(desk, 0x6b3a22, KX - 0.95, KX + 0.4, 0, 0.74, 0.62, 0.16); block(desk, 0x8a4f2e, KX - 1.0, KX + 0.45, 0.74, 0.82, 0.66, 0.12);
picture(scene, 1.0, 0.4, KX - 0.27, 0.42, 0.625, (g, W, H) => { g.fillStyle = '#6b3a22'; g.fillRect(0, 0, W, H); g.strokeStyle = '#d9a441'; g.lineWidth = 8; g.strokeRect(14, 14, W / 2 - 22, H - 28); g.strokeRect(W / 2 + 8, 14, W / 2 - 22, H - 28); });
const doc = k.sign('ARBITRAJE', 0.42, 0.3); doc.position.set(KX + 0.12, 0.83, 0.42); doc.rotation.x = -PI / 2 + 0.25; scene.add(doc);
const seal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), basic(0xd63c3c)); seal.position.set(0.12, -0.08, 0.01); doc.add(seal);
const stamp = new THREE.Group(); scene.add(stamp);
block(stamp, 0xd63c3c, -0.05, 0.05, 0, 0.06, 0.05, -0.05, 0.012); block(stamp, 0x23262d, -0.022, 0.022, 0.06, 0.2, 0.022, -0.022, 0.012);
{ const ink = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 12), flat(0x23262d)), 0.01); ink.position.set(KX + 0.2, 0.86, 0.35); scene.add(ink);
  const quill = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.32, 6), flat(0xffffff)); quill.position.set(KX + 0.22, 1.02, 0.33); quill.rotation.z = -0.35; scene.add(quill); }
const chand = new THREE.Group(); chand.position.set(KX - 0.25, 3.9, -0.6); scene.add(chand);
{ const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), INK); rod.position.y = -0.3; chand.add(rod);
  const ringC = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 24), flat(0xd9a441)), 0.012); ringC.rotation.x = PI / 2; ringC.position.y = -0.62; chand.add(ringC);
  for (let i = 0; i < 6; i++) { const a = i * PI / 3, cdl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), basic(0xffe9a3)); cdl.position.set(0.32 * Math.cos(a), -0.53, 0.32 * Math.sin(a)); chand.add(cdl); } }

// ---------- personajes ----------
const pig = makePig();
const cutlar = makeToon({ shirt: 0x6a8f3a, hair: 0x8a5a2a, hat: { type: 'boater', color: 0xe8c56a, band: 0x7a4b2a }, detail: ['apron', 'buttons'], trim: 0x3f6ea8 }); scene.add(cutlar.root);
const griffin = makeToon({ shirt: 0x3f8f5a, hair: 0xc8642a, hat: { type: 'bowler', color: 0x4a3222, band: 0x15171c }, mustache: true, detail: ['collar', 'buttons'] }); scene.add(griffin.root);
const officer = makeToon({ ...SOLDIER_UK, mustache: true, detail: ['buttons', 'belt', 'badge'] }); scene.add(officer.root);
const blues = [makeToon({ ...SOLDIER_US, hair: 0x6b4a2a, mustache: true, detail: ['buttons', 'belt', 'badge'] })];
for (let i = 1; i < 10; i++) blues.push(makeToon({ ...SOLDIER_US, hair: [0x2b2118, 0x6b4a2a, 0xc98a3a, 0x23262d][i % 4], mustache: i % 3 === 0 }));
blues.forEach(b => scene.add(b.root));
const marine = makeToon({ ...SOLDIER_UK, mustache: true }); scene.add(marine.root);
const rower = makeToon({ ...SOLDIER_UK, hair: 0x2b2118 }); scene.add(rower.root);
const admiral = makeToon({ shirt: 0x1b2a55, hair: 0xd8d8d8, hat: { type: 'top', color: 0x1e1428, band: 0xd9a441 }, mustache: true, detail: ['buttons', 'belt', 'collar'], trim: 0xd9a441 }); scene.add(admiral.root);
const kaiser = makeToon({ shirt: 0x2b3a55, skin: 0xf6d2ae, hair: 0xe8e8e8, hat: { type: 'kepi', color: 0x23262d }, mustache: true, detail: ['buttons', 'belt', 'collar'], trim: 0xd9a441 }); scene.add(kaiser.root);
const guard = makeToon({ shirt: 0x2b3a55, hair: 0x2b2118, hat: { type: 'kepi', color: 0x23262d }, detail: ['buttons', 'belt'] }); scene.add(guard.root);
for (const tn of [kaiser, guard]) {      // casco con punta (pickelhaube)
  const sp = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 10), flat(0xd9a441)), 0.01); sp.position.y = 0.45; tn.head.add(sp);
}
for (const s of [-1, 1]) { const sb = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), flat(0xf2f2f2)), 0.012); sb.scale.set(0.7, 1.1, 0.9); sb.position.set(s * 0.27, -0.1, 0.02); kaiser.head.add(sb); }
const telescope = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.42, 10), flat(0xd9a441)), 0.01); scene.add(telescope);
const rifles = { cutlar: makeRifle(), marine: makeRifle(), guard: makeRifle(), blues: blues.map(() => makeRifle()) };
// gente de fondo en la playa: un vigía que patrulla
const patrol = k.walker({ toon: SOLDIER_US, cx: BX, z: -0.42, speed: 0.6, off: 3, dir: -1, span: 14 });

// ---------- partículas ----------
const sparks = [0, 1, 2, 3].map(() => k.glyph('✦', '#fff1a8', 0.3));
const stars = [0, 1, 2].map(() => k.glyph('✦', '#ffd23a', 0.22));
const qMark = k.glyph('?', '#ffd23a', 0.9), bang = k.glyph('!', '#ffd23a', 0.5), bangG = k.glyph('!', '#ffd23a', 0.5), angryG = k.glyph('!', '#ff5a4a', 0.45);
const grawlix = ['#', '@', '%', '!', '$', '&', '#', '@'].map((s, i) => k.glyph(s, i % 2 ? '#ff6a4a' : '#ffd23a', 0.48));
const nope = k.glyph('✗', '#ff5a4a', 0.5), okMark = k.glyph('✓', '#59c36a', 0.5);
const coins = [0, 1, 2].map(() => k.glyph('$', '#59c36a', 0.24));
const sweat = [0, 1, 2].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const flash = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, depthTest: false })); flash.renderOrder = 9; scene.add(flash);
const gunSmoke = k.puffs(5), runDust = k.puffs(4), runDust2 = k.puffs(4), fallDust = k.puffs(5), splashP = k.puffs(5), shipFoam = k.puffs(4);
const speed = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.025), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });

// ---------- posar ----------
const head = { cut: V(0, 0, 0), gri: V(0, 0, 0), off: V(0, 0, 0), pick: V(0, 0, 0), mar: V(0, 0, 0), adm: V(0, 0, 0), kai: V(0, 0, 0), pig: V(0, 0, 0) };
const TV = V(0, 0, 0), above = v => () => TV.copy(v).setY(v.y + 0.4), toCam = v => V(v.x, v.y, 2.6);
const P = (tn, p, t, kk) => { tn.root.visible = true; tn.pose(alive({ blink: blinkAt(t, kk), ...p }, t, kk)); };
const hide = (...ts) => ts.forEach(x => { x.root.visible = false; });
const rifleUp = (r, tn, x, z, t, side = 1) => { tn.hand(side, tmp); r.visible = true; r.aim(tmp, tmp2.set(tmp.x + 0.08 * side, tmp.y + 1, tmp.z + 0.12)); };
const inBahia = t => (t < c[1]) || (t >= c[5] && t < c[10]);
const BOAT_Y = t => 0.035 * Math.sin(t * 2.2);
const PICK_END = [-0.75, -1.45, -2.15, -2.85];
const ROW2 = [-3.55, -4.25, -4.95, -5.65, -6.35, -7.05];

function poseBahia(t) {
  const on = inBahia(t);
  // botes que se mecen
  boat.position.y = BOAT_Y(t); boat.rotation.z = 0.04 * Math.sin(t * 1.7); boat2.position.y = BOAT_Y(t + 1); boat2.rotation.z = 0.05 * Math.sin(t * 1.5 + 1);
  foam.position.z = -0.64 + 0.05 * Math.sin(t * 1.3); foam.material.opacity = 1;
  patrol.root.visible = t < c[1];
  // barcos: en el gancho están; después llegan desde la derecha en la frase 7
  const shipsOn = t < c[1] || t >= mandaT - 0.1;
  ships.forEach((s, i) => {
    s.visible = on && shipsOn;
    const arrive = t < c[1] ? 1 : lin(t, mandaT + i * 0.28, mandaT + 1.4 + i * 0.28) ** 0.6;
    const leave = t < c[9] ? 0 : prog(t, compaT + 0.2 + i * 0.25, compaT + 2.6 + i * 0.25) ** 1.6;      // se retiran los refuerzos
    s.position.x = s.userData.x0 - 14 * (1 - arrive) - 16 * leave; s.position.y = -0.06 + 0.03 * Math.sin(t * 1.6 + i); s.rotation.z = 0.025 * Math.sin(t * 1.3 + i * 2);
  });
  cannons.forEach((cn, i) => { const s = on && t >= cuatT ? back(lin(t, cuatT + 0.5 + i * 0.15, cuatT + 0.8 + i * 0.15)) * (1 - prog(t, compaT + 0.1 * i, compaT + 0.3 + 0.1 * i)) : 0; S(cn, s); });
  // frase 10: un campamento para cada uno y los días que pasan
  const camp = on && t >= c[9];
  tentsUK.forEach((h, i) => S(h, camp ? back(lin(t, campT - 0.3 + i * 0.15, campT + i * 0.15)) : 0));
  tentsUS.forEach((h, i) => S(h, camp ? back(lin(t, campT + 0.35 + i * 0.15, campT + 0.65 + i * 0.15)) : 0));
  S(flagUK, camp ? back(lin(t, campT - 0.1, campT + 0.2)) : 0);
  sky2.visible = camp && t >= doceT - 0.6;
  if (sky2.visible) { const a = ((t - doceT + 0.6) * 2.6) % PI; sky2.position.set(-3.2 + 6.4 * a / PI, 3.4 + 2.6 * Math.sin(a), -9); sky2.rotation.z = t * 3; }
  // soldado azul del gancho = Pickett después; columna que llega en la frase 6
  blues.forEach((b, i) => {
    const r = rifles.blues[i];
    if (!on) { b.root.visible = false; r.visible = false; return; }
    let p;
    if (t < c[1]) {
      if (i !== 0) { b.root.visible = false; r.visible = false; return; }
      p = { x: -0.75, z: 0.35, face: 0.55, look: t < granT ? V(0, 1.4, 4) : toCam(head.mar), squash: breathe(t), y: hop(t, estT, 0.12), ...moodAt(t, [[0, 'angry'], [porT + 0.2, 'surprised']]) };
      p.handL = V(-0.4, 1.0 + 0.12 * Math.abs(Math.sin(t * 7)), 0.65); p.wL = win(t, casiT, porT, 0.2);
    } else if (i < 4) {
      const t0 = c[5] + 0.05 + i * 0.18, t1 = c[5] + 2.0 + i * 0.18, ex = PICK_END[i], ez = [0.35, 0.15, -0.05, -0.25][i];
      if (t < t1 + 0.1) p = { ...go(t, t0, t1, ex - 5.5, ex, 0.5), z: ez };
      else {
        const salute = i === 0 ? win(t, sesT - 0.1, c[6] + 0.3, 0.2) : 0;
        p = { x: ex, z: ez, face: lerp(PI / 2, 0.35, prog(t, t1 + 0.05, t1 + 0.4)), squash: settle(t, t1) * breathe(t, i), look: V(ex + 0.6, 1.4, 4),
          handL: V(ex - 0.1, 1.72, ez + 0.2), wL: salute, ...moodAt(t, [[0, 'neutral'], [t1 + 0.2, i === 0 ? 'happy' : 'neutral']]) };
        if (t >= c[7]) {                         // frase 8: se insultan con los británicos del bote
          const yell = i === 0 ? 1 : 0.5;
          p.face = i === 0 ? 0.55 : 0.4; p.look = i === 0 ? toCam(head.mar) : V(ex + 2, 1.4, 2.6);
          Object.assign(p, moodAt(t, [[0, 'angry'], [noT, 'angry'], [asiT, 'angry']]));
          p.handL = V(ex + 0.32, 1.2 + 0.18 * Math.abs(Math.sin(t * 8 + i)), ez + 0.3); p.wL = yell * win(t, asiT - 0.1, c[8] + 0.3, 0.15) + (i === 0 ? 0.6 * win(t, ordenT, asiT, 0.2) * 0 : 0);
          p.y = i === 0 ? hop(t, asiT + 0.1, 0.12) + hop(t, insT + 0.3, 0.1) : 0;
        }
        if (t >= c[8]) { p.look = V(3.0, 2.1, -3.2); p.face = 0.7; Object.assign(p, moodAt(t, [[0, 'angry'], [niegaT + 0.2, 'surprised']])); p.wL = 0; }
        if (t >= c[9]) { p.look = V(ex + 0.4, 1.5, 4); p.face = 0.35; p.y = hop(t, campT + 0.4 + i * 0.1, 0.12); Object.assign(p, moodAt(t, [[0, 'surprised'], [campT, 'happy']]));
          p.handL = V(ex - 0.1, 1.72, ez + 0.2); p.wL = i === 0 ? win(t, doceT, END + 1, 0.2) : 0; }
      }
    } else {                                     // segunda fila que aparece con los 461
      const j = i - 4, s = t >= cuatT ? back(lin(t, cuatT + j * 0.12, cuatT + 0.3 + j * 0.12)) * (1 - prog(t, compaT + j * 0.08, compaT + 0.3 + j * 0.08)) : 0;
      if (s < 0.01) { b.root.visible = false; r.visible = false; return; }
      const ex = ROW2[j];
      p = { x: ex, z: j % 2 ? -0.05 : 0.25, face: 0.25, squash: s * settle(t, cuatT + 0.3 + j * 0.12) * breathe(t, i), y: hop(t, cuatT + j * 0.12, 0.2), look: t >= c[8] ? V(3.0, 2.1, -3.2) : V(ex + 0.5, 1.4, 4),
        mood: t >= c[7] ? 'angry' : 'neutral' };
    }
    if (!(i === 0 && t < c[1])) { p.handR = V(p.x + 0.24, 0.86, (p.z || 0) + 0.18); p.wR = p.walk ? 0.8 : 1; }
    else { p.handR = V(p.x + 0.24, 0.86, (p.z || 0) + 0.18); p.wR = 1; }
    P(b, p, t, i * 1.3);
    rifleUp(r, b, p.x, p.z, t, 1);
    if (i === 0) b.head.getWorldPosition(head.pick);
  });
  // británico parado en el bote, y otro que rema
  if (on && (t < c[1] || t >= c[6])) {
    const by = BOAT_Y(t) + 0.12, mx = 0.85;
    const p = { x: mx, y: by, z: -1.2, face: -0.5, look: toCam(head.pick), squash: breathe(t, 3), ...moodAt(t, [[0, 'angry'], [porT + 0.2, 'surprised'], [c[6], 'angry']]) };
    if (t < c[1]) { p.handL = V(mx - 0.3, by + 1.05 + 0.12 * Math.abs(Math.sin(t * 7 + 1)), -0.9); p.wL = win(t, casiT, porT, 0.2); }
    if (t >= c[7] && t < c[8]) { p.handL = V(mx - 0.34, by + 1.15 + 0.18 * Math.abs(Math.sin(t * 8.5)), -0.9); p.wL = win(t, asiT - 0.1, c[8] + 0.3, 0.15); p.y = by + hop(t, insT, 0.12); }
    if (t >= c[8]) { p.look = V(3.0, 2.1, -3.2); p.face = 0.4; }
    if (t >= c[9]) { p.look = V(mx, 1.6, 4); p.face = -0.2; Object.assign(p, moodAt(t, [[0, 'surprised'], [campT - 0.3, 'happy']])); p.handL = V(mx - 0.1, by + 1.75, -1.0); p.wL = win(t, campT - 0.2, doceT, 0.2); }
    p.handR = V(mx + 0.22, by + 0.86, -1.0); p.wR = 1;
    P(marine, p, t, 4); rifleUp(rifles.marine, marine, mx, -1.2, t, 1); marine.head.getWorldPosition(head.mar);
    const row = Math.sin(t * 3);
    P(rower, { x: 5.0, y: BOAT_Y(t + 1) + 0.05, z: -2.2, face: 0.3, crouch: 0.9, look: V(0.8, 1.2, 2), mood: t >= c[7] ? 'angry' : 'neutral',
      handL: V(5.25 + 0.15 * row, 0.75 + 0.08 * row, -1.9), handR: V(5.4 + 0.15 * row, 0.78 + 0.08 * row, -2.0) }, t, 6);
  } else { hide(marine, rower); rifles.marine.visible = false; }
  // almirante en la cubierta del barco grande
  if (on && t >= mandaT) {
    const sh = ships[0], ax = sh.position.x - 0.7, ay = sh.position.y + 0.72, az = -3.4 + 0.25;
    const no = t >= niegaT ? 0.32 * Math.sin((t - niegaT) * 11) * win(t, niegaT, niegaT + 1.4, 0.15) : 0;
    const p = { x: ax, y: ay + hop(t, cerdo2T, 0.1), z: az, face: 0.25 + no * 0.6, look: t >= c[8] ? V(ax, 2.2, 3) : V(0, 1.3, 0), squash: breathe(t, 2), tilt: no * 0.3,
      ...moodAt(t, [[0, 'neutral'], [almT, 'sly'], [niegaT, 'angry'], [cerdo2T + 0.1, 'happy']]) };
    const cross = win(t, niegaT - 0.1, c[9], 0.2);
    if (t < c[8]) { p.handR = V(ax + 0.12, ay + 1.45, az + 0.3); p.wR = 1; }       // mira con el catalejo
    else { p.handL = V(ax + 0.13, ay + 0.98, az + 0.3); p.handR = V(ax - 0.13, ay + 0.95, az + 0.32); p.wL = cross; p.wR = cross; if (cross < 0.5) { p.handL = talk(t, ax, az, -1); p.wL = 0.9; } }
    P(admiral, p, t, 7); admiral.head.getWorldPosition(head.adm);
    telescope.visible = t < c[8]; if (telescope.visible) { admiral.hand(1, tmp); telescope.position.copy(tmp).add(tmp2.set(-0.05, 0.12, 0.1)); telescope.rotation.set(0.9, 0, 0.4); }
  } else { hide(admiral); telescope.visible = false; }
  // insultos: signos que saltan entre los dos
  grawlix.forEach((m, i) => {
    const t0 = insT - 0.9 + i * 0.32, u = (t - t0) / 0.9, from = i % 2 ? head.mar : head.pick;
    const s = on && t >= c[7] && t < c[8] && u > 0 && u < 1 ? back(u * 3) * (1 - prog(u, 0.75, 1)) : 0;
    k.glyphAt(m, from, (i % 2 ? -0.25 : 0.25) * (1 + u), 0.3 + 0.25 * u, s, 0.3 * Math.sin(t * 7 + i));
  });
  k.glyphAt(nope, head.adm, 0.0, 0.62, on ? popIn(t, niegaT + 0.1, c[9]) : 0, 0.15 * Math.sin(t * 6));
  // pequeños destellos y salpicaduras cuando llegan los barcos
  if (on && t > mandaT && t < agoT + 0.5) shipFoam(t, mandaT + 0.5, ships[0].position.x + 1.8, ships[0].position.z + 0.5, 1, 0.05);
  if (on) splashP(t, sesT, -2.9, 0.4, -1, 0.05);
}

function poseGranja(t) {
  const on = t >= c[2] && t < c[5] + 1.6;           // sigue armada mientras la cámara viaja a la playa
  for (const [i, m] of chimney.entries()) { const u = (t * 0.5 + i / 4) % 1; m.visible = on; m.position.set(FX - 1.82 + 0.4 * u, 2.95 + 1.3 * u, -2.5); m.scale.setScalar(0.6 + 1.5 * u); m.material.opacity = 0.85 * (1 - u); }
  if (!on) {
    hide(cutlar, griffin, officer); pig.root.visible = t < c[1]; rifles.cutlar.visible = false; bill10.visible = bill100.visible = false;
    [...stars, bang, ...coins, ...speed, ...sweat, flash].forEach(m => { m.visible = false; }); if (t >= c[1]) sparks.forEach(m => { m.visible = false; });
    return;
  }
  pig.root.visible = true;
  const CX = FX - 0.95, GX = FX + 0.85, OX = FX + 1.65, PX = FX + 0.1;
  if (t < c[11]) {
    // ---- el cerdo: come papas, recibe el tiro y queda patas arriba ----
    const shot = prog(t, BANG + 0.05, BANG + 0.4);
    if (t < BANG) pig.pose({ x: PX, z: 0.42, face: -0.25 + 0.1 * Math.sin(t * 1.3), eat: t < cerdoT ? 1 : t < papT - 0.2 ? 1 - prog(t, cerdoT, cerdoT + 0.2) : 1, eye: t < cerdoT ? 'happy' : 'round',
      lookX: t > cerdoT && t < papT - 0.2 ? 0.3 : 0, squash: breathe(t * 2), t, nod: 0.06 * Math.sin(t * 4) });
    else pig.pose({ x: PX, y: hop(t, BANG, 0.45, 0.45), z: 0.42, face: -0.45, dead: shot, eye: 'x', squash: settle(t, BANG + 0.45, 0.2), t });
    pig.head.getWorldPosition(head.pig);
    potatoes.forEach((p, i) => { const u = ((t * 0.9 + i * 0.37) % 1); p.position.y = 0.05 + (t < BANG && i < 2 ? 0.2 * Math.max(0, Math.sin(u * PI)) : 0); p.rotation.z = t * 2 + i; });
    // ---- Cutlar ----
    {
      let p; const aim = win(t, dispT - 0.35, BANG + 0.9, 0.2), rec = prog(t, BANG, BANG + 0.12) * (1 - prog(t, BANG + 0.12, BANG + 0.5));
      if (t < c[2] + 1.3) p = { ...go(t, c[2] + 0.05, c[2] + 1.25, CX - 3.0, CX, 0.5), mood: 'neutral' };
      else {
        p = { x: CX, z: 0.3, face: lerp(PI / 2, 0.55, prog(t, c[2] + 1.3, c[2] + 1.6)), squash: settle(t, c[2] + 1.25) * breathe(t), lean: -0.12 * rec,
          look: t < lymT + 0.6 ? V(CX, 1.4, 4) : t < c[3] ? head.pig : t < britT ? toCam(head.gri) : toCam(head.off),
          ...moodAt(t, [[0, 'neutral'], [lymT, 'happy'], [cerdoT, 'surprised'], [papT, 'angry'], [BANG + 0.3, 'sly'], [c[3] + 0.6, 'surprised'], [diezT - 0.3, 'happy'], [cienT, 'surprised'], [amenT, 'worried']]) };
        if (aim > 0.01) { p.handR = V(CX + 0.12, 1.05, 0.5); p.handL = V(CX + 0.42, 0.98, 0.62); p.wR = aim; p.wL = aim; }
        else if (t >= c[4]) { const off = back(lin(t, diezT - 0.35, diezT)); p.handR = V(CX + 0.48, 1.12 + 0.04 * Math.sin(t * 6), 0.55); p.wR = off * (1 - prog(t, amenT, amenT + 0.3)); if (t > amenT) { p.handL = V(CX - 0.15, 1.6, 0.4); p.handR = V(CX + 0.15, 1.62, 0.4); p.wL = p.wR = prog(t, amenT, amenT + 0.25); } }
        else { p.handL = talk(t, CX, 0.3, -1); p.wL = 0.6; }
        p.y = hop(t, papT, 0.12) + hop(t, amenT + 0.05, 0.2);
      }
      P(cutlar, p, t, 0); cutlar.head.getWorldPosition(head.cut);
      // el fusil: al hombro, apuntando, y después apoyado
      const r = rifles.cutlar; r.visible = t < c[4];
      if (r.visible) {
        if (aim > 0.3) { cutlar.hand(1, tmp); cutlar.hand(0, tmp3); r.aim(tmp, tmp3); }
        else { cutlar.hand(1, tmp); r.aim(tmp, tmp2.set(tmp.x + 0.12, tmp.y + 1, tmp.z + 0.15)); }
        r.userData.tip.getWorldPosition(tmp2);
        gunSmoke(t, BANG, tmp2.x, tmp2.z, 1, tmp2.y - 0.1);
        const fk = 1 - prog(t, BANG, BANG + 0.15); flash.visible = t >= BANG && fk > 0.01; flash.position.copy(tmp2); flash.scale.setScalar(1 + 2 * (1 - fk)); flash.material.opacity = fk;
      } else flash.visible = false;
      bill10.visible = t >= diezT - 0.3 && t < amenT + 0.2; if (bill10.visible) { cutlar.hand(1, bill10.position); bill10.position.y += 0.12; bill10.position.z += 0.05; bill10.rotation.z = 0.1 * Math.sin(t * 5); bill10.scale.setScalar(back(lin(t, diezT - 0.3, diezT))); }
    }
    // ---- Griffin: llega corriendo, se agarra la cabeza, pide cien ----
    if (t >= c[3]) {
      let p; const arrive = c[3] + 0.9;
      if (t < arrive + 0.1) p = { ...go(t, c[3], arrive, GX + 3.2, GX, 0.72), ...moodAt(t, [[0, 'surprised']]) };
      else {
        const horror = win(t, arrive, irlT + 0.9, 0.2), point = win(t, compT - 0.2, c[4] + 0.2, 0.2), demand = back(lin(t, cienT - 0.3, cienT));
        p = { x: GX, z: 0.3, face: lerp(-PI / 2, -0.55, prog(t, arrive, arrive + 0.3)), squash: settle(t, arrive, 0.18) * breathe(t, 2),
          look: t < irlT + 0.6 ? head.pig : t < c[4] ? V(GX, 1.4, 4) : toCam(head.cut), y: hop(t, cienT, 0.16),
          ...moodAt(t, [[0, 'surprised'], [arrive + 0.2, 'worried'], [irlT + 0.4, 'neutral'], [compT, 'happy'], [c[4], 'neutral'], [duenoT - 0.2, 'angry']]) };
        if (horror > 0.01) { p.handL = V(GX - 0.24, 1.55, 0.35); p.handR = V(GX + 0.24, 1.55, 0.35); p.wL = p.wR = horror; }
        else if (point > 0.01) { p.handR = V(GX + 0.55, 1.35, 0.0); p.wR = point; p.look = V(FX + 2.3, 1.45, -1.25); }
        if (t >= c[4]) { p.handL = V(GX - 0.1, 1.75 + 0.05 * Math.sin(t * 9), 0.35); p.wL = demand; if (t < duenoT - 0.2) { p.handR = talk(t, GX, 0.3, 1); p.wR = 0.6; } }
      }
      P(griffin, p, t, 2); griffin.head.getWorldPosition(head.gri);
      runDust(t, c[3] + 0.1, GX + 3.0, 0.3, 1);
    } else hide(griffin);
    bill100.visible = t >= cienT - 0.3 && t < c[5]; if (bill100.visible) { griffin.hand(0, bill100.position); bill100.position.y += 0.14; bill100.position.z += 0.05; bill100.rotation.z = 0.12 * Math.sin(t * 8); bill100.scale.setScalar(back(lin(t, cienT - 0.3, cienT))); }
    // ---- autoridad británica que amenaza con arrestarlo ----
    if (t >= britT - 0.3) {
      const t1 = britT + 0.7; let p;
      if (t < t1 + 0.1) p = { ...go(t, britT - 0.3, t1, OX + 2.8, OX, 0.55), z: -0.2, mood: 'angry' };
      else p = { x: OX, z: -0.2, face: -0.6, squash: settle(t, t1) * breathe(t, 5), look: toCam(head.cut), mood: 'angry', handR: V(OX - 0.55, 1.3 + 0.04 * Math.sin(t * 10), 0.1), wR: back(lin(t, amenT - 0.2, amenT + 0.1)),
        handL: V(OX + 0.05, 0.85, 0.05), wL: 0.7, y: hop(t, amenT, 0.1) };
      P(officer, p, t, 5); officer.head.getWorldPosition(head.off);
    } else hide(officer);
    k.glyphAt(bang, head.cut, 0, 0.6, popIn(t, amenT + 0.05, c[5]), 0.1 * Math.sin(t * 9));
    k.glyphAt(qMark, head.gri, 0.05, 0.62, 0, 0);
    stars.forEach((m, i) => { const a = t * 5 + i * 2.1; k.glyphAt(m, head.pig, 0.25 * Math.cos(a), 0.05 + 0.06 * Math.sin(a), t > BANG + 0.4 && t < c[3] + 1.2 ? 1 : 0, a); });
    sweat.forEach((m, i) => { const on2 = t > amenT && t < c[5], u = (t * 1.7 + i / 3) % 1, s = i % 2 ? 1 : -1; m.visible = on2; if (!on2) return; m.position.set(head.cut.x + s * (0.3 + 0.25 * u), head.cut.y + 0.22 + 0.3 * u - 0.6 * u * u, 0.55); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
    coins.forEach((m, i) => { const u = lin(t, diezT + i * 0.15, diezT + 0.8 + i * 0.15); k.glyphAt(m, bill10.position, (i - 1) * 0.15, 0.15 + 0.5 * u, u > 0 && u < 1 && t < amenT ? back(u * 3) * (1 - prog(u, 0.7, 1)) : 0); });
    fallDust(t, BANG + 0.42, PX - 0.2, 0.42, -1); runDust2(t, BANG + 0.42, PX + 0.2, 0.42, 1);
    const running = t > c[3] && t < c[3] + 0.9;
    speed.forEach((m, i) => { m.visible = running; if (!running) return; m.position.set(head.gri.x + 0.45 + 0.13 * ((i * 3) % 5) + 0.2 * Math.sin(t * 40 + i), 0.5 + i * 0.28, 0.4); m.material.opacity = 0.5 + 0.4 * Math.sin(t * 50 + i * 2); });
  } else {
    // ---- final: el cerdo sube al cielo con alas y aureola ----
    bill10.visible = bill100.visible = false; rifles.cutlar.visible = false; flash.visible = false; hide(officer);
    speed.forEach(m => { m.visible = false; }); sweat.forEach(m => { m.visible = false; });
    const up = prog(t, c[11] + 0.1, c[11] + 2.2);
    pig.pose({ x: PX, y: 0.1 + 1.25 * up + 0.08 * Math.sin(t * 3), z: 0.42, face: 0.15 * Math.sin(t * 1.5), eye: 'happy', angel: back(lin(t, c[11], c[11] + 0.4)), t, tilt: 0.1 * Math.sin(t * 2), nod: -0.1 });
    pig.head.getWorldPosition(head.pig);
    P(cutlar, { x: CX - 0.2, z: 0.3, face: 0.45, look: head.pig, squash: breathe(t), y: hop(t, cerdo3T, 0.14), ...moodAt(t, [[0, 'surprised'], [cerdo3T, 'worried']]), handL: V(CX - 0.15, 1.82, 0.35), wL: win(t, c[11] + 0.6, END + 1, 0.3) }, t, 0);
    P(griffin, { x: GX + 0.25, z: 0.3, face: -0.45, look: head.pig, squash: breathe(t, 2), y: hop(t, bajaT, 0.12), ...moodAt(t, [[0, 'surprised'], [bajaT + 0.3, 'worried']]), handR: V(GX + 0.15, 1.15, 0.42), wR: 0.9, handL: talk(t, GX + 0.25, 0.3, -1), wL: 0.5 }, t, 2);
    cutlar.head.getWorldPosition(head.cut); griffin.head.getWorldPosition(head.gri);
    stars.forEach(m => { m.visible = false; });
    k.glyphAt(bang, head.cut, 0, 0.6, 0, 0);
    coins.forEach(m => { m.visible = false; });
  }
  sparks.forEach((m, i) => {
    const s = t >= c[11] ? (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)) * back(lin(t, c[11] + 0.3, c[11] + 0.6)) : 0;
    k.glyphAt(m, head.pig, [-0.5, 0.5, -0.4, 0.45][i], [0.3, 0.35, -0.25, -0.2][i], s, t * 1.5 + i);
  });
}

function poseMapa(t) {
  const on = t >= c[1] && t < c[2];
  S(mapUK, on ? (t < c[2] ? back(lin(t, reclT - 0.1, reclT + 0.2)) : 1) : 0);
  S(mapUS, on ? (t < c[2] ? back(lin(t, reclT + 0.3, reclT + 0.6)) : 1) : 0);
  houses.forEach((h, i) => S(h, on ? (t < c[2] ? back(lin(t, vivT - 0.1 + i * 0.12, vivT + 0.2 + i * 0.12)) : 1) : 0));
  campUK.forEach((h, i) => S(h, on && t >= c[9] ? back(lin(t, compaT + i * 0.15, compaT + 0.3 + i * 0.15)) : 0));
  campUS.forEach((h, i) => S(h, on && t >= c[9] ? back(lin(t, compaT + 0.4 + i * 0.15, compaT + 0.7 + i * 0.15)) : 0));
  miniShip.visible = on; miniShip.position.z = -2.6 + ((t * 0.35) % 5.2); miniShip.rotation.y = -PI / 2; miniShip.position.y = 0;
  for (const m of minis) {
    const vis = on && t >= m.from && (m.from < c[9] ? true : t >= c[9]) && (m.from === c[1] ? true : t >= compaT + 0.5);
    m.g.visible = vis; if (!vis) continue;
    const w = 0.9, x = m.span / 2 * Math.sin(t * w + m.off), dir = Math.cos(t * w + m.off) > 0 ? 1 : -1;
    m.t.pose(alive({ x, face: dir > 0 ? PI / 2 : -PI / 2, walk: 1, phase: t * 1.6 + m.off, look: V(m.g.position.x + dir, 1, 3), blink: blinkAt(t, m.off), mood: 'happy' }, t, m.off));
  }
  const sOn = on && t >= c[9]; sun.visible = sOn;
  if (sOn) { const a = ((t - c[9]) * 2.4) % PI; sun.position.set(MX + 2.0 * Math.cos(PI - a) * -1, 1.0 + 1.6 * Math.sin(a), -2.4); sun.rotation.set(-1.0, 0, t * 2); }
  k.glyphAt(qMark, tmp.set(MX + 0.0, 0.3, 0.2), 0, 0.9, on && t < c[2] ? popIn(t, islaT, c[2]) : 0, 0.15 * Math.sin(t * 5));
}

function posePalacio(t) {
  const on = t >= c[10];
  chand.rotation.z = 0.05 * Math.sin(t * 1.3);
  // final: el cerdo baja del techo con alas y aureola (la "única baja")
  const fin = on && t >= c[11];
  if (fin) {
    const down = prog(t, c[11], c[11] + 1.1);
    pig.root.visible = true;
    pig.pose({ x: KX + 0.55, y: lerp(3.6, 1.15, 1 - (1 - down) ** 2) + 0.07 * Math.sin(t * 3), z: 0.55, face: -0.25 + 0.12 * Math.sin(t * 1.5), eye: 'happy', angel: 1, t, tilt: 0.1 * Math.sin(t * 2), nod: -0.1, squash: settle(t, c[11] + 1.1, 0.15) });
    pig.head.getWorldPosition(head.pig);
  }
  sparks.forEach((m, i) => {
    const s = fin ? (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)) * back(lin(t, c[11] + 0.9, c[11] + 1.2)) : 0;
    if (fin || t >= c[10]) k.glyphAt(m, head.pig, [-0.5, 0.5, -0.4, 0.45][i], [0.3, 0.35, -0.25, -0.2][i], s, t * 1.5 + i);
  });
  if (!on) { hide(kaiser, guard); rifles.guard.visible = false; stamp.visible = false; okMark.visible = false; return; }
  const x = KX - 0.3, z = -0.15;
  const s1 = decT + 0.1, down = win(t, s1 - 0.08, s1 + 0.14, 0.08), stamping = win(t, c[10], decT + 0.9, 0.2);
  stamp.position.set(KX + 0.12, 0.83 + 0.22 * (1 - down), 0.42); stamp.visible = true;
  seal.visible = t > s1;
  const toMap = win(t, milT - 0.2, c[11] + 0.2, 0.3), up = win(t, c[11] + 0.3, END + 1, 0.25);
  const p = { x, z, face: lerp(lerp(0.15, 0.6, toMap), 0.35, up), squash: settle(t, s1 + 0.05, 0.14) * breathe(t), y: hop(t, s1, 0.08) + hop(t, quedaT, 0.14) + hop(t, bajaT, 0.16),
    look: t < kaiT ? V(KX + 0.12, 1.25, 2.6) : t < milT ? V(x, 1.5, 4) : t < c[11] ? V(MAPX, MAPY, 2.0) : V(head.pig.x, head.pig.y, 2.4),
    ...moodAt(t, [[0, 'effort'], [s1, 'sly'], [kaiT, 'neutral'], [milT, 'sly'], [quedaT, 'happy'], [c[11] + 0.4, 'surprised'], [cerdo3T, 'worried']]) };
  tmp.copy(stamp.position); tmp.y += 0.2;
  if (stamping > 0.05) { p.handR = tmp.clone(); p.wR = stamping; }
  if (toMap > 0.05) { p.handR = V(x + 0.55, 1.5, z - 0.1); p.wR = toMap; }
  p.handL = talk(t, x, z, -1); p.wL = 0.6;
  if (up > 0.05) { p.handL = V(x - 0.25, 1.62, z + 0.3); p.handR = V(x + 0.25, 1.62, z + 0.3); p.wL = p.wR = up; }
  P(kaiser, p, t, 9); kaiser.head.getWorldPosition(head.kai);
  if (stamping <= 0.05) stamp.position.set(KX + 0.32, 0.83, 0.3);
  // guardia que pasea al fondo
  const gu = (t * 0.25) % 2, gx = KX - 2.2 + 0.9 * (gu < 1 ? gu : 2 - gu);
  P(guard, { x: gx, z: -1.45, face: gu < 1 ? PI / 2 : -PI / 2, walk: 1, phase: (t * 0.25 * 0.9) / 0.92, look: V(gx + (gu < 1 ? 1 : -1), 1.3, 2), mood: 'neutral', handR: V(gx + 0.2, 0.86, -1.3), wR: 1 }, t, 10);
  rifleUp(rifles.guard, guard, gx, -1.45, t, 1);
  // la raya por el estrecho de Haro y las banderitas
  haro.scale.y = Math.max(0.001, prog(t, milT, milT + 1.6)); haro.visible = t >= milT;
  S(mapFlagUS, back(lin(t, quedaT, quedaT + 0.3)));
  mapFlagUK.visible = true; mapFlagUK.scale.setScalar(1); mapFlagUK.rotation.z = -1.6 * prog(t, quedaT + 0.4, quedaT + 0.9) ** 2; mapFlagUK.position.y = MAPY - 0.05 - 0.4 * prog(t, quedaT + 0.6, quedaT + 1.1);
  if (t > quedaT + 1.1) mapFlagUK.visible = false;
  k.glyphAt(okMark, tmp.set(MAPX + 0.2, MAPY + 0.45, -2.1), 0, 0, popIn(t, quedaT + 0.3, c[11] + 0.2), 0);
}

// ---------- cámara ----------
k.shots([
  { t: 0, pos: [0.1, 2.0, 10.2], look: [0.1, 1.35, -1] },
  { t: estT - 0.1, pos: [-0.7, 1.5, 4.6], look: [-0.7, 1.35, 0.3] },
  { t: granT - 0.1, pos: [0.85, 1.75, 3.0], look: [0.85, 1.45, -1.2] },
  { t: casiT, pos: [0.4, 1.9, 8.0], look: [0.4, 1.4, -1.5] },
  { t: porT, pos: [0.1, 0.95, 3.6], look: [0.1, 0.6, 0.9] },
  { t: c[1], pos: [MX, 8.4, 4.2], look: [MX, 0, -0.4], cut: true },
  { t: reclT, pos: [MX, 7.3, 3.4], look: [MX, 0, -0.5] },
  { t: vivT - 0.1, pos: [MX + 0.2, 5.6, 3.0], look: [MX + 0.2, 0, -0.2] },
  { t: vivT + 0.7, pos: [MX + 0.6, 4.4, 2.9], look: [MX + 0.7, 0, 0.7], glide: true },
  { t: c[2], pos: [FX - 0.5, 1.8, 8.6], look: [FX - 0.5, 1.1, -0.5], cut: true },
  { t: lymT - 0.1, pos: [FX - 0.95, 1.45, 4.6], look: [FX - 0.95, 1.3, 0.3] },
  { t: cerdoT - 0.05, pos: [FX + 0.15, 0.95, 3.3], look: [FX + 0.1, 0.5, 0.4] },
  { t: papT - 0.1, pos: [FX + 0.05, 0.85, 2.9], look: [FX + 0.05, 0.5, 0.4] },
  { t: dispT - 0.35, pos: [FX - 0.4, 1.5, 5.6], look: [FX - 0.4, 0.95, 0.3] },
  { t: c[3] + 0.3, pos: [FX + 0.4, 1.45, 6.0], look: [FX + 0.4, 1.0, 0.2] },
  { t: irlT, pos: [FX + 0.85, 1.5, 4.0], look: [FX + 0.85, 1.35, 0.3] },
  { t: compT - 0.15, pos: [FX + 1.9, 1.5, 3.6], look: [FX + 2.1, 1.25, -1.2] },
  { t: c[4], pos: [FX - 0.75, 1.4, 4.4], look: [FX - 0.75, 1.25, 0.3] },
  { t: duenoT - 0.1, pos: [FX + 0.8, 1.55, 4.2], look: [FX + 0.8, 1.45, 0.3] },
  { t: britT - 0.3, pos: [FX + 0.4, 1.6, 7.6], look: [FX + 0.4, 1.15, 0] },
  { t: amenT + 0.1, pos: [FX - 0.85, 1.65, 3.9], look: [FX - 0.85, 1.68, 0.3] },
  { t: c[5], pos: [FX - 0.85, 1.65, 3.9], look: [FX - 0.85, 1.68, 0.3] },
  { t: ejT + 0.3, pos: [FX - 4.5, 1.9, 7.5], look: [FX - 5.5, 1.2, -1], glide: true },
  { t: sesT - 0.6, pos: [-2.2, 1.8, 8.8], look: [-2.2, 1.2, 0], glide: true },
  { t: sesT - 0.1, pos: [-1.3, 1.5, 5.2], look: [-1.3, 1.3, 0.2] },
  { t: c[6], pos: [-0.8, 1.7, 7.0], look: [-0.8, 1.3, 0] },
  { t: agoT, pos: [1.4, 3.3, 13.5], look: [1.4, 1.4, -6], glide: true },
  { t: cuatT - 0.1, pos: [-3.3, 2.1, 8.0], look: [-3.3, 1.1, 0] },
  { t: cincoT - 0.1, pos: [1.8, 2.7, 11.5], look: [1.8, 1.5, -7] },
  { t: hombT, pos: [2.4, 2.9, 5.5], look: [3.2, 1.8, -5] },
  { t: c[7], pos: [0.05, 1.65, 5.9], look: [0.05, 1.2, -0.4] },
  { t: noT, pos: [0.05, 1.75, 4.9], look: [0.05, 1.4, -0.4] },
  { t: asiT, pos: [-0.75, 1.5, 3.3], look: [-0.75, 1.4, 0.35] },
  { t: insT - 0.2, pos: [0.85, 1.7, 2.4], look: [0.85, 1.55, -1.2] },
  { t: c[8], pos: [2.85, 2.5, 1.5], look: [2.72, 2.1, -3.15] },
  { t: niegaT, pos: [2.7, 2.35, 0.7], look: [2.7, 2.1, -3.15] },
  { t: cerdo2T - 0.2, pos: [2.7, 2.3, 3.0], look: [2.7, 1.9, -3.15] },
  { t: c[9], pos: [0.2, 2.2, 10.5], look: [0.2, 1.3, -1.5] },
  { t: campT - 0.35, pos: [2.1, 1.35, 4.4], look: [2.2, 0.75, -0.4] },
  { t: campT + 0.35, pos: [-3.3, 1.45, 5.2], look: [-3.5, 0.85, -0.4] },
  { t: doceT - 0.3, pos: [-0.6, 2.6, 11.5], look: [-0.6, 2.4, -4] },
  { t: c[10], pos: [KX - 0.2, 1.65, 5.6], look: [KX - 0.2, 1.4, 0], cut: true },
  { t: decT - 0.1, pos: [KX - 0.12, 1.45, 3.5], look: [KX - 0.12, 1.2, 0.2] },
  { t: milT - 0.1, pos: [KX + 0.9, 2.05, 3.0], look: [KX + 0.9, 2.05, -2.15] },
  { t: quedaT - 0.1, pos: [KX + 0.25, 1.75, 5.0], look: [KX + 0.3, 1.65, -0.8] },
  { t: c[11], pos: [KX + 0.2, 1.9, 6.0], look: [KX + 0.2, 1.75, 0] },
  { t: bajaT + 0.4, pos: [KX + 0.1, 1.7, 4.4], look: [KX + 0.1, 1.55, 0.2], glide: true },
  { t: cerdo3T - 0.15, pos: [KX + 0.75, 1.75, 3.5], look: [KX + 0.75, 1.65, 0.5] },
]);

// ---------- carteles ----------
tag({ text: '1859', big: true, off: BIG, from: 0.15, to: porT - 0.05 });
tag({ text: 'EE.UU.', at: above(head.pick), off: [-150, -300], from: estT, to: porT });
tag({ text: 'Gran Bretaña', at: above(head.mar), off: [120, -320], from: granT, to: porT });
tag({ text: '¡Por un cerdo!', big: true, off: BIG, from: porT + 0.05, to: c[1] });
tag({ text: 'Isla San Juan', at: () => tmp3.set(MX + 0.1, 0.05, 0.1), off: [220, 420], from: islaT - 0.1, to: c[2] });
tag({ text: '¿De quién es?', big: true, off: BIG, from: reclT + 0.2, to: vivT });
tag({ text: 'Granjeros de ambos', big: true, off: BIG, from: vivT + 0.1, to: c[2] });
tag({ text: 'Lyman Cutlar', at: above(head.cut), off: [180, -320], from: lymT, to: cerdoT });
tag({ text: '¡Sus papas!', big: true, off: BIG, from: papT, to: dispT - 0.1 });
tag({ text: '¡BANG!', big: true, off: BIG, from: BANG, to: c[3] });
tag({ text: 'Charles Griffin, irlandés', at: above(head.gri), off: [-140, -330], from: irlT - 0.1, to: compT - 0.2 });
tag({ text: 'Compañía de la Bahía de Hudson', at: () => tmp3.set(FX + 2.29, 1.7, -1.25), off: [-150, -280], from: compT, to: c[4] });
tag({ text: '$10', big: true, off: BIG, from: diezT, to: duenoT - 0.1 });
tag({ text: '$100', big: true, off: BIG, from: cienT, to: britT - 0.1 });
tag({ text: 'Autoridades británicas', at: above(head.off), off: [-120, -330], from: britT + 0.5, to: c[5] });
tag({ text: '¡Arresto!', big: true, off: BIG, from: amenT, to: c[5] });
tag({ text: 'Capitán George Pickett', at: above(head.pick), off: [-260, -230], from: ejT, to: sesT });
tag({ text: '66 soldados', big: true, off: BIG, from: sesT, to: c[6] });
tag({ text: 'Barcos de guerra', at: () => tmp3.set(ships[0].position.x, 2.6, ships[0].position.z), off: [-260, -260], from: mandaT + 1.0, to: agoT + 0.6 });
tag({ text: '461 soldados', big: true, off: BIG, from: cuatT, to: cincoT - 0.1 });
tag({ text: '14 cañones', at: () => cannons[0].position, off: [200, -320], from: cuatT + 0.8, to: cincoT - 0.1 });
tag({ text: '5 barcos', big: true, off: BIG, from: cincoT, to: c[7] });
tag({ text: '+2.000 hombres', big: true, off: [540, 500], from: hombT, to: c[7] });
tag({ text: 'No disparar', big: true, off: [540, 330], from: noT, to: asiT });
tag({ text: 'primero', big: true, off: [540, 425], from: noT + 0.4, to: asiT });
tag({ text: '¡Insultos!', big: true, off: BIG, from: insT, to: c[8] });
tag({ text: 'Almirante Baynes', at: above(head.adm), off: [-110, -320], from: almT, to: niegaT + 0.6 });
tag({ text: '¿Por un cerdo?', big: true, off: [540, 330], from: niegaT + 0.3, to: c[9] });
tag({ text: '¡NO!', big: true, off: [540, 430], from: cerdo2T, to: c[9] });
tag({ text: 'Campamento inglés', at: () => tmp3.set(BX + 2.0, 0.8, -0.3), off: [-80, -300], from: campT - 0.2, to: campT + 0.35 });
tag({ text: 'Campamento americano', at: () => tmp3.set(BX - 3.7, 0.8, -0.35), off: [120, -330], from: campT + 0.45, to: doceT - 0.3 });
tag({ text: '12 años', big: true, off: BIG, from: doceT, to: c[10] });
tag({ text: 'Káiser Guillermo I', at: above(head.kai), off: [-60, -330], from: kaiT - 0.1, to: milT });
tag({ text: '1872', big: true, off: BIG, from: milT, to: quedaT - 0.1 });
tag({ text: 'Para EE.UU.', big: true, off: BIG, from: quedaT, to: c[11] });
tag({ text: 'Única baja:', big: true, off: [540, 330], from: bajaT - 0.1, to: END + 1 });
tag({ text: '1 cerdo', big: true, off: [540, 430], from: cerdo3T - 0.05, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'boom', 0.5);
sfx(porT + 0.05, 'riser_to', 1); sfx(porT + 0.05, 'boom', 0.45);
sfx(BANG, 'boom', 0.8); sfx(BANG + 0.42, 'thud', 0.8);
sfx(c[3] + 0.9, 'thud', 0.4);
sfx(diezT, 'tap', 0.6); sfx(cienT, 'tap', 0.7);
sfx(amenT, 'pop', 0.7);
sfx(mandaT + 0.5, 'splash', 0.6);
sfx(cincoT, 'riser_to', 1); sfx(cincoT, 'boom', 0.5);
sfx(cuatT + 0.6, 'thud', 0.5);
sfx(niegaT + 0.1, 'pop', 0.7);
sfx(decT + 0.1, 'thud', 0.8);
sfx(quedaT, 'riser_to', 1); sfx(quedaT, 'boom', 0.45);
sfx(c[11] + 0.1, 'puff', 0.6);

// ---------- cuadro ----------
k.follow(t => (t >= c[2] && t < c[5]) || t >= c[11] ? head.pig : t >= c[10] ? head.kai : head.pick);
k.run(t => {
  poseBahia(t); poseGranja(t); poseMapa(t); posePalacio(t);
  if (inBahia(t)) poseBahia(t);                     // segunda pasada: ya se conocen las cabezas para mirarse
  if (t >= c[2] && t < c[5]) poseGranja(t);
  // en el gancho el cerdo está en la playa, entre los dos
  if (t < c[1]) {
    pig.root.visible = true;
    pig.pose({ x: 0.08, y: hop(t, porT + 0.1, 0.22) + hop(t, granT, 0.08), z: 1.0, face: 0.25 * Math.sin(t * 2.2), eye: t > porT ? 'happy' : 'round', lookX: 0.35 * Math.sin(t * 2.8), squash: settle(t, porT + 0.32, 0.18) * breathe(t * 2), t });
    pig.head.getWorldPosition(head.pig);
    sparks.forEach((m, i) => { const s = popIn(t, porT + 0.1, c[1]) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)); k.glyphAt(m, head.pig, [-0.45, 0.45, -0.35, 0.4][i], [0.3, 0.35, -0.2, -0.15][i], s, t * 1.5 + i); });
  }
  for (const f of flags) f(t);
  seas.forEach((m, i) => { m.offset.set(t * 0.012 * (i + 1), t * 0.02); });
  for (const sm of smokes) sm.puffs.forEach((m, i) => { const u = (t * 0.7 + i / 4) % 1; m.position.set(sm.x - 0.6 * u, sm.y + 1.0 * u, 0); m.scale.setScalar(0.6 + 1.6 * u); m.material.opacity = 0.85 * (1 - u); });
  for (const h of hens) h(t);
});
