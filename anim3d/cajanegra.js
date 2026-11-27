// Episodio: la "caja negra" de los aviones es naranja (canal En 60 Segundos).
// Decorados uno al lado del otro en x: HANGAR (0), CAMPO con restos y laguna (40), CABINA (80),
// AVIÓN en el cielo (120), LABORATORIO de pruebas (160: mesa, pistón, horno, tanque de presión) y FONDO DEL MAR (200).
// Sin choques ni víctimas: los restos son chapas sueltas y el resto es la caja y quienes la buscan.
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, clamp01, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, basic, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, windowPic, lamp, hills } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('cajanegra');
const { scene, c, at, END, sfx, tag, BIG } = k;
const KX = 40, CK = 80, PX = 120, LX = 160, SX = 200;
const HULL = new THREE.MeshBasicMaterial({ color: 0x1e1428, side: THREE.BackSide });
const v3 = () => new THREE.Vector3();
const ORANGE = 0xff7a1a;

// ---------- tiempos ----------
const noT = at('no'), naranjaT = at('naranja');
const asiT = c[1], restosT = at('restos', c[1]), rapidoT = at('rapido', c[1]), aguaT = at('agua', c[1]);
const dosT = at('dos', c[2]), unoT = at('uno', c[2]), vocesT = at('voces', c[2]);
const otroT = at('otro', c[3]), datosT = at('datos', c[3]), altT = at('altura', c[3]), velT = at('velocidad', c[3]), rumboT = at('rumbo', c[3]);
const colaT = at('cola', c[4]), resisteT = at('resiste', c[4]);
const adentroT = c[5], memT = at('memoria', c[5]), cilT = at('cilindro', c[5]), golpeT = at('golpe', c[5]), tresT = at('tres', c[5]);
const fuegoT = c[6], milT = at('mil', c[6]), mediaT = at('media', c[6]), presionT = at('presion', c[6]), seisT = at('seis', c[6]);
const caeT = at('cae', c[7]), faroT = at('faro', c[7]), pulsoT = at('pulso', c[7]), treintaT = at('treinta', c[7]);
const buzosT = at('buzos', c[8]), robotsT = at('robots', c[8]), encT = at('encontrarla', c[8]);
const negraT = at('negra', c[9]), nombreT = at('nombre', c[9]);
const HIT = golpeT + 0.12;                 // el pistón toca la caja
const LANDS = c[7] + 0.95;                 // la caja toca el fondo del mar
const PULSE0 = pulsoT;                     // primer pulso de la baliza

// ---------- piezas ----------
function ell(parent, color, a, b, cc, x, y, z, w = 0.016) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), color.isMaterial ? color : flat(color));
  m.scale.set(a, b, cc); m.position.set(x, y, z); m.castShadow = true;
  if (w) { const h = new THREE.Mesh(m.geometry, HULL); h.scale.set((a + w) / a, (b + w) / b, (cc + w) / cc); m.add(h); }
  parent.add(m); return m;
}
const Yax = new THREE.Vector3(0, 1, 0);
function rod(parent, a, b, r, color, w = 0.016, r2 = r) {
  const d = v3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, 16), color.isMaterial ? color : flat(color));
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); m.castShadow = true; m.receiveShadow = true;
  if (w) m.add(new THREE.Mesh(new THREE.CylinderGeometry(r2 + w, r + w, len + w, 16), HULL));
  parent.add(m); return m;
}
/** Cilindro acostado a lo largo de x. */
function cylX(parent, color, r, len, x, y, z, w = 0.014) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), color.isMaterial ? color : flat(color));
  m.rotation.z = PI / 2; m.position.set(x, y, z); m.castShadow = true;
  if (w) m.add(new THREE.Mesh(new THREE.CylinderGeometry(r + w, r + w, len + w, 28), HULL));
  parent.add(m); return m;
}
const disc = (parent, r, color, x, y, z, ry = r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), color.isMaterial ? color : basic(color)); m.scale.set(r, ry, 1); m.position.set(x, y, z); parent.add(m); return m; };
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const gradPlane = (w, h, x, y, z, stops) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTex(64, 512, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); stops.forEach(([s, col]) => gr.addColorStop(s, col)); g.fillStyle = gr; g.fillRect(0, 0, W, H); }) })); m.position.set(x, y, z); scene.add(m); return m; };

// =====================================================================================
// LA CAJA (el aparato): chasis naranja con franjas reflectivas, la inscripción, el cilindro blindado
// con la memoria adentro, la baliza en la punta y una cara simple
// =====================================================================================
const boxes = [];
function makeBox({ s = 1, parent = scene, face = true } = {}) {
  const root = new THREE.Group(); parent.add(root);
  const body = new THREE.Group(); root.add(body);              // se aplasta desde abajo
  block(body, 0x4a505c, -0.38, 0.38, 0, 0.04, 0.18, -0.18, 0.014);                       // bandeja de montaje
  for (const x of [-0.34, 0.34]) for (const z of [0.15]) disc(body, 0.016, 0xc9ced6, x, 0.02, z + 0.032);
  block(body, ORANGE, -0.33, 0.33, 0.04, 0.28, 0.14, -0.14, 0.016);                       // chasis
  block(body, 0x2b2f3a, -0.39, -0.33, 0.09, 0.2, 0.07, -0.07, 0.01);                      // conector de atrás
  for (const x of [-0.285, 0.285]) {                                                       // franjas reflectivas
    k.plane(body, INK, 0.058, 0.232, x, 0.16, 0.1415); k.plane(body, 0xf2f4f7, 0.044, 0.218, x, 0.16, 0.1425);
    k.plane(body, 0xc9d3dd, 0.044, 0.03, x, 0.12, 0.143); k.plane(body, 0xc9d3dd, 0.044, 0.03, x, 0.2, 0.143);
  }
  const l1 = k.sign('FLIGHT RECORDER', 0.44, 0.08, { bg: '#ff8a30' }); l1.position.set(0, 0.205, 0.1425); body.add(l1);
  const l2 = k.sign('DO NOT OPEN', 0.3, 0.062, { bg: '#ff8a30' }); l2.position.set(0, 0.11, 0.1425); body.add(l2);
  const cyl = new THREE.Group(); cyl.position.set(0, 0.395, 0); body.add(cyl);           // cilindro blindado
  cylX(cyl, ORANGE, 0.115, 0.46, 0, 0, 0, 0.016);
  for (const x of [-0.13, 0.13]) cylX(cyl, 0xf2f4f7, 0.119, 0.04, x, 0, 0, 0.008);       // franjas reflectivas del cilindro
  const caps = [-0.235, 0.235].map(x => cylX(cyl, 0xb9bfc9, 0.122, 0.03, x, 0, 0, 0.01));
  for (const x of [-0.235, 0.235]) for (const y of [-0.08, 0.08]) ell(cyl, 0x4a505c, 0.014, 0.014, 0.014, x, y, 0.1, 0);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 18, PI), basic(0x2b2f3a)); handle.position.set(0, 0.1, 0); cyl.add(handle);
  const beacon = new THREE.Group(); beacon.position.set(0.25, 0, 0); cyl.add(beacon);   // baliza (faro de agua)
  cylX(beacon, 0xd5d9e0, 0.045, 0.15, 0.075, 0, 0, 0.01);
  for (const x of [0.03, 0.12]) cylX(beacon, 0x2b2f3a, 0.047, 0.012, x, 0, 0, 0);
  const tipMat = flat(0x3b82c4); const tip = ell(beacon, tipMat, 0.03, 0.04, 0.04, 0.16, 0, 0, 0.01);
  // memoria (placa verde) escondida adentro del cilindro: sale cuando se "abre"
  const chip = new THREE.Group(); cyl.add(chip); chip.visible = false;
  block(chip, 0x2f8f4a, -0.13, 0.13, -0.006, 0.006, 0.07, -0.07, 0.008);
  for (let i = 0; i < 3; i++) block(chip, 0x23262d, -0.1 + i * 0.08, -0.05 + i * 0.08, 0.006, 0.02, 0.035, -0.035, 0.006);
  for (let i = 0; i < 6; i++) k.plane(chip, 0xffd23a, 0.24, 0.006, 0, 0.021, -0.06 + i * 0.024, true);
  // cara
  const faceG = new THREE.Group(); cyl.add(faceG); faceG.visible = face;
  const eyes = [-1, 1].map(sd => {
    const g = new THREE.Group(); g.position.set(sd * 0.058, 0.025, 0.118); faceG.add(g);
    const round = new THREE.Group(); g.add(round); disc(round, 0.04, INK, 0, 0, 0); disc(round, 0.032, 0xffffff, 0, 0, 0.001, 0.034);
    const pupil = disc(round, 0.017, INK, 0, 0, 0.002, 0.019);
    const shine = disc(round, 0.006, 0xffffff, 0.006, 0.008, 0.003); pupil.add(shine); shine.position.set(0.35, 0.4, 0.001); shine.scale.set(0.35, 0.32, 1);
    const dash = disc(g, 0.036, INK, 0, 0, 0, 0.011);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.009, 6, 16, PI), INK); arc.position.y = -0.01; g.add(arc);
    return { g, round, pupil, dash, arc };
  });
  const mouth = new THREE.Group(); mouth.position.set(0, -0.042, 0.113); faceG.add(mouth);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 16, PI), INK); smile.rotation.z = PI; smile.position.y = 0.018; mouth.add(smile);
  const frown = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.009, 6, 16, PI), INK); frown.position.y = -0.016; mouth.add(frown);
  const oh = new THREE.Group(); mouth.add(oh); disc(oh, 0.022, INK, 0, 0, 0, 0.027); disc(oh, 0.015, 0x4f1626, 0, -0.002, 0.001, 0.019);
  const flatM = disc(mouth, 0.026, INK, 0, 0, 0, 0.008);
  const open = new THREE.Group(); mouth.add(open);
  open.add(new THREE.Mesh(new THREE.CircleGeometry(0.036, 18, PI, PI), INK)); { const cv = new THREE.Mesh(new THREE.CircleGeometry(0.028, 18, PI, PI), basic(0x4f1626)); cv.position.set(0, -0.003, 0.001); open.add(cv); const tg = disc(open, 0.012, 0xe8665c, 0, -0.02, 0.002, 0.009); }
  open.position.y = 0.012;
  const cheeks = [-1, 1].map(sd => { const m = disc(faceG, 0.018, new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.45 }), sd * 0.095, -0.025, 0.11, 0.012); return m; });
  const B = {
    root, body, cyl, chip, beacon, tip, tipMat, caps, s,
    /** Punta de la baliza en el mundo. */
    beaconPos: (out = v3()) => tip.getWorldPosition(out),
    top: (out = v3()) => cyl.getWorldPosition(out),
    pose({ t = 0, x = 0, y = 0, z = 0, ry = 0, rz = 0, sc = 1, squash = 1, squeeze = 1, mood = 'neutral', look = null, lift = 0, chipOut = 0, glow = 0, kk = 0 }) {
      root.visible = sc > 0.01;
      root.position.set(x, y, z); root.rotation.set(0, ry, rz); root.scale.setScalar(Math.max(sc, 0.001) * s);
      const sq = Math.max(0.4, squash); body.scale.set(squeeze / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      cyl.position.y = 0.395 + lift; caps[0].position.x = -0.235 - 0.25 * chipOut;
      chip.visible = chipOut > 0.01; chip.position.set(-0.08 - 0.42 * chipOut, 0.02 + 0.12 * Math.sin(PI * Math.min(chipOut, 1) * 0.5), 0);
      const es = mood === 'surprised' ? 1.25 : mood === 'worried' ? 1.08 : 1, bl = blinkAt(t, kk);
      eyes.forEach((e, i) => {
        e.round.visible = mood !== 'happy' && mood !== 'effort'; e.dash.visible = mood === 'effort'; e.arc.visible = mood === 'happy';
        e.g.scale.set(es, es * (e.round.visible ? Math.max(1 - 0.92 * bl, 0.08) : 1), 1);
        e.dash.rotation.z = mood === 'effort' ? (i ? -0.35 : 0.35) : 0;
        if (look) { const d = v3(); e.g.getWorldPosition(d); d.subVectors(look, d); d.normalize(); e.pupil.position.set(clamp01(Math.abs(d.x)) * Math.sign(d.x) * 0.011, d.y * 0.011, 0.002); }
        else e.pupil.position.set(0, 0, 0.002);
      });
      smile.visible = mood === 'neutral'; frown.visible = mood === 'worried'; oh.visible = mood === 'surprised'; flatM.visible = mood === 'effort'; open.visible = mood === 'happy';
      tipMat.color.set(glow > 0.5 ? 0x9fe9ff : 0x3b82c4); tip.scale.set(0.03 * (1 + 0.4 * glow), 0.04 * (1 + 0.4 * glow), 0.04 * (1 + 0.4 * glow));
      root.updateMatrixWorld(true);
    },
  };
  boxes.push(B); return B;
}
/** Anillo amarillo que late alrededor de algo (para señalar). */
const halos = [];
function halo(r = 0.6) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r, 40), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 5; m.visible = false; scene.add(m); halos.push(m); return m;
}
function haloAt(m, p, t, k0) { m.visible = k0 > 0.01; if (!m.visible) return; m.position.copy(p); m.position.z += 0.2; const u = (t * 1.4) % 1; m.scale.setScalar(Math.max(k0, 0.001) * (0.8 + 0.5 * u)); m.material.opacity = 0.9 * (1 - u) * Math.min(k0, 1); }

// =====================================================================================
// HANGAR (x = 0): taller con la caja en un pedestal
// =====================================================================================
surface(scene, tex.tiles({ base: '#a9b3c0', line: '#7d8794', n: 4 }, 16, 10), 34, 24, 0, 0.001, 0, true);
k.plane(scene, 0xffd23a, 30, 0.1, 0, 0.004, 1.3, true);
surface(scene, tex.stripes({ a: '#b9c3cf', b: '#a6b1be', dot: '#a6b1be', n: 16 }, 10, 1), 34, 9, 0, 4.5, -2.6);
k.plane(scene, INK, 34, 0.06, 0, 0.03, -2.58);
for (let i = -4; i <= 4; i++) block(scene, 0x7d8794, i * 2.2 - 0.07, i * 2.2 + 0.07, 0, 8, -2.45, -2.58, 0.012);   // columnas
// tablero de herramientas
picture(scene, 1.5, 1.0, -2.5, 2.0, -2.55, (g, W, H) => {
  g.fillStyle = '#d9b27a'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(120,80,40,0.35)'; for (let y = 12; y < H; y += 24) for (let x = 12; x < W; x += 24) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  g.lineCap = 'round'; const tool = (x, col, h) => { g.strokeStyle = '#1e1428'; g.lineWidth = 22; g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 40 + h); g.stroke(); g.strokeStyle = col; g.lineWidth = 12; g.stroke(); g.fillStyle = '#1e1428'; g.beginPath(); g.arc(x, 40, 16, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, 40, 9, 0, 7); g.fill(); };
  tool(40, '#c8443a', 90); tool(90, '#3b82c4', 110); tool(140, '#9aa0a8', 80); tool(190, '#ffd23a', 100); tool(240, '#3f8f6b', 85); tool(290, '#9aa0a8', 120); tool(340, '#c8443a', 95);
  g.strokeStyle = '#1e1428'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
}, 384);
block(scene, 0x7a4b2a, -3.4, -1.9, 0, 0.8, -1.6, -2.3); block(scene, 0x9a6638, -3.45, -1.85, 0.8, 0.88, -1.55, -2.35);   // banco de trabajo
block(scene, 0xc8443a, -3.2, -2.75, 0.88, 1.12, -1.8, -2.1); block(scene, 0x3b82c4, -2.6, -2.25, 0.88, 1.0, -1.75, -2.05);
// cajones apilados y un tambor
block(scene, 0xb07a44, 2.6, 3.5, 0, 0.8, -1.4, -2.2); block(scene, 0xc08a54, 2.75, 3.4, 0.8, 1.4, -1.5, -2.1); block(scene, 0xb07a44, 3.6, 4.3, 0, 0.6, -1.5, -2.2);
{ const d = rod(scene, V(-4.2, 0, -1.6), V(-4.2, 0.9, -1.6), 0.32, 0x3b82c4, 0.018); }
// trompa de avión al fondo
{ const g = new THREE.Group(); g.position.set(4.6, 0, -2.0); scene.add(g);
  ell(g, 0xf4f6f9, 1.4, 0.75, 0.7, 0, 1.4, 0, 0.026); cylX(g, 0xf4f6f9, 0.74, 2.5, 1.4, 1.4, 0, 0.02);
  for (const [x, w] of [[-0.62, 0.32], [-0.25, 0.3]]) { const p = k.poly(g, [[x, 1.62], [x + w, 1.62], [x + w - 0.04, 1.85], [x + 0.06, 1.82]], 0x2b3f63, 0.03); p.position.z = 0.62; }
  rod(g, V(0, 0.65, 0), V(0, 0, 0), 0.05, 0x4a505c); cylX(g, 0x23262d, 0.16, 0.12, 0, 0.16, 0.12, 0.014);
  k.plane(g, 0x3b82c4, 3.2, 0.14, 1.0, 1.15, 0.7); }
for (const x of [-2.2, 0.2, 2.6]) {                                                  // lámparas colgantes
  rod(scene, V(x, 4.6, -0.8), V(x, 3.2, -0.8), 0.012, 0x23262d, 0);
  const sh = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.24, 18, 1, true), flat(0x3f8f6b, { side: THREE.DoubleSide })), 0.016); sh.position.set(x, 3.1, -0.8); scene.add(sh);
  ell(scene, new THREE.MeshBasicMaterial({ color: 0xfff1b8 }), 0.09, 0.09, 0.09, x, 3.0, -0.8, 0.01);
}
block(scene, 0x5d6772, -0.35, 0.65, 0, 0.7, 0.4, -0.4, 0.02); block(scene, 0x7d8794, -0.42, 0.72, 0.62, 0.7, 0.47, -0.47, 0.016);   // pedestal
k.plane(scene, 0xffd23a, 0.8, 0.1, 0.15, 0.35, 0.402); k.plane(scene, INK, 0.8, 0.02, 0.15, 0.29, 0.403); k.plane(scene, INK, 0.8, 0.02, 0.15, 0.41, 0.403);
const boxH = makeBox({ s: 1.3 });
// burbuja de pensamiento con una caja NEGRA dibujada
const bubble = new THREE.Group(); scene.add(bubble);
picture(bubble, 1.25, 0.95, 0, 0, 0, (g, W, H) => {
  g.fillStyle = '#ffffff'; g.strokeStyle = '#1e1428'; g.lineWidth = 12;
  const puffs = [[0.3, 0.42, 0.22], [0.52, 0.32, 0.26], [0.72, 0.44, 0.22], [0.5, 0.6, 0.24], [0.3, 0.62, 0.17], [0.7, 0.64, 0.17]];
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x * W, y * H, r * W * 0.75, 0, 7); g.stroke(); }
  for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x * W, y * H, r * W * 0.75, 0, 7); g.fill(); }
  g.fillStyle = '#1e1428'; g.fillRect(W * 0.32, H * 0.36, W * 0.36, H * 0.3); g.fillStyle = '#3a3f4d'; g.fillRect(W * 0.35, H * 0.39, W * 0.3, H * 0.08);
  g.fillStyle = '#ffffff'; g.font = '800 70px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', W * 0.5, H * 0.555);
}, 320);
const bubDots = [0.07, 0.11].map(r => { const m = disc(scene, r, 0xffffff, 0, 0, 0); const o = disc(m, 1.2, INK, 0, 0, -0.002); return m; });
// cartel del final "CAJA NEGRA" con NEGRA tachado
const finalSign = new THREE.Group(); scene.add(finalSign);
{ const s = k.sign('CAJA NEGRA', 1.5, 0.36, { bg: '#ffffff' }); finalSign.add(s);
}
const strike = new THREE.Group(); finalSign.add(strike); strike.position.set(0.0, 0, 0.02);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.075), basic(0xe0302a)); m.geometry.translate(0.5, 0, 0); strike.add(m); strike.position.x = -0.02; strike.rotation.z = 0.08; }
const orangeWord = k.sign('NARANJA', 0.78, 0.22, { bg: '#ff7a1a', fg: '#ffffff' }); finalSign.add(orangeWord);

const visitor = makeToon({ shirt: 0x8a6bbf, hair: 0x6b4a2a, detail: ['collar', 'buttons'] }); scene.add(visitor.root);
const mech = makeToon({ shirt: 0x3b6ea8, hair: 0x23262d, hat: { type: 'kepi', color: 0xc8443a }, mustache: true, detail: ['belt', 'buttons', 'apron'], trim: 0x2f5a8a }); scene.add(mech.root);



// =====================================================================================
// CAMPO (x = 40): restos de chapa y una laguna
// =====================================================================================
surface(scene, tex.grass({}, 14, 10), 34, 24, KX, 0.001, 0, true);
hills(scene, KX, -10, [[-5, 4, 0xa9d3a2], [0, 5, 0x97c88f], [6, 4.2, 0xa9d3a2]]);
for (const [x, y, s] of [[-4, 6, 1], [0.5, 7.2, 0.9], [4, 6.3, 1.1], [-1.5, 8, 0.7]]) k.cloud(KX + x, y, -11, s);
k.tree(KX - 4.4, -3.2, { h: 2.6 }); k.tree(KX - 2.2, -4.4, { pine: true, leaf: 0x3f8f5a }); k.tree(KX + 5.4, -3.6, { h: 2.4, leaf: 0x6dbb58 }); k.tree(KX + 1.0, -4.8, { pine: true, leaf: 0x4a9a62 });
k.birds([[KX, 5.4, 0], [KX, 6.1, 4], [KX + 2, 5.7, 9]], -8);
// cinta de peligro
for (const x of [-4.6, -2.6, -0.6, 1.2]) block(scene, 0x7a4b2a, KX + x - 0.04, KX + x + 0.04, 0, 0.95, -1.6, -1.68, 0.012);
picture(scene, 5.8, 0.12, KX - 1.7, 0.85, -1.62, (g, W, H) => { for (let x = 0; x < W; x += 40) { g.fillStyle = (x / 40) % 2 ? '#1e1428' : '#ffd23a'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x + 20, H); g.lineTo(x - 20, H); g.fill(); } }, 1024);
// restos: chapas grises con remaches, un pedazo de ala, una rueda (todo gris, para que el naranja resalte)
const debris = [];
{ const r = rng(5), grays = [0x9aa3ae, 0x8a929c, 0xb3bac3, 0x7d8590];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group(); const x = KX - 4.2 + r() * 5.2, z = -1.2 + r() * 2.1; if (Math.hypot(x - (KX - 0.6), z - 0.35) < 0.75) continue; g.position.set(x, 0, z); g.rotation.set(0, r() * 3, (r() - 0.5) * 0.6); scene.add(g);
    const w = 0.25 + r() * 0.45, h = 0.04 + r() * 0.18;
    block(g, grays[i % 4], -w / 2, w / 2, 0, h, 0.15 + r() * 0.15, -0.15 - r() * 0.15, 0.014);
    for (let j = 0; j < 3; j++) ell(g, 0x5d6772, 0.016, 0.016, 0.016, -w / 2 + 0.06 + j * (w - 0.12) / 2, h, 0.05, 0);
    debris.push(g);
  }
  const wing = k.poly(scene, [[0, 0], [1.6, 0.0], [1.9, 0.38], [0.3, 0.32]], 0xb3bac3, 0.04); wing.position.set(KX - 4.4, 0.02, 0.4); wing.rotation.set(-PI / 2 + 0.25, 0, 0.2);
  for (let i = 0; i < 4; i++) k.plane(wing, 0x8a929c, 1.4, 0.02, 0.95, 0.06 + i * 0.07, 0.005);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.085, 10, 24), flat(0x2b2f3a)); outlined(tire, 0.014); tire.position.set(KX - 0.9, 0.1, -0.9); tire.rotation.set(-1.3, 0, 0); scene.add(tire);
  disc(tire, 0.11, 0x9aa3ae, 0, 0, 0.0); }
const boxL = makeBox({ s: 0.78 });
// avión chiquito que cruza el cielo del campo (puente hacia la cabina)
const flyover = new THREE.Group(); scene.add(flyover);
{ cylX(flyover, 0xf4f6f9, 0.22, 1.6, 0, 0, 0, 0.02); ell(flyover, 0xf4f6f9, 0.35, 0.22, 0.22, 0.8, 0, 0, 0.02); const fw = k.poly(flyover, [[0.25, -0.05], [0.45, -0.05], [-0.2, -0.55], [-0.38, -0.55]], 0xdfe3ea, 0.025); fw.position.z = 0.25;
  const ff = k.poly(flyover, [[-0.6, 0.1], [-0.85, 0.6], [-1.0, 0.6], [-0.95, 0.05]], 0xf4f6f9, 0.025); k.plane(flyover, 0x3b82c4, 1.6, 0.06, 0, -0.04, 0.222); for (let i = 0; i < 6; i++) disc(flyover, 0.03, 0x2b3f63, -0.4 + i * 0.15, 0.06, 0.222); }
// laguna con piedras alrededor, un bote y la caja bajo el agua
const POND = [KX + 3.2, 0.1];
{ const bed = disc(scene, 2.0, 0x3f7fa6, POND[0], 0.006, POND[1], 1.4); bed.rotation.x = -PI / 2;
  const r = rng(8); for (let i = 0; i < 34; i++) { const a = i / 34 * PI * 2, s = 0.11 + r() * 0.09; ell(scene, [0x8d8a9e, 0x9f9a8a, 0x7d7b8f][i % 3], s * 1.3, s * 1.4, s, POND[0] + Math.cos(a) * 2.02, 0.12, POND[1] + Math.sin(a) * 1.42, 0.016); }
  for (let i = 0; i < 10; i++) { const g = new THREE.Group(); g.position.set(POND[0] + (r() - 0.5) * 2.6, 0, POND[1] - 0.5 + (r() - 0.5) * 1.2); scene.add(g); for (let j = 0; j < 3; j++) { const b = ell(g, [0x4f9a45, 0x63ad4e][j % 2], 0.025, 0.12 + r() * 0.06, 0.02, (j - 1) * 0.04, 0.12, 0, 0.01); b.rotation.z = (j - 1) * 0.3; } } }
const boxW = makeBox({ s: 0.62 });
const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x7fd0f0, transparent: true, opacity: 0.5, depthWrite: false }));
water.rotation.x = -PI / 2; water.scale.set(2.0, 1.42, 1); water.position.set(POND[0], 0.3, POND[1]); water.renderOrder = 3; scene.add(water);
const shine = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); m.rotation.x = -PI / 2; m.renderOrder = 4; scene.add(m); return m; });
const wRings = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })); m.rotation.x = -PI / 2; m.renderOrder = 4; scene.add(m); return m; });
const boat = new THREE.Group(); scene.add(boat);
block(boat, 0xc8553d, -0.55, 0.55, 0, 0.16, 0.26, -0.26, 0.018); block(boat, 0xf4f1e8, -0.57, 0.57, 0.16, 0.22, 0.28, -0.28, 0.014);
block(boat, 0x7a4b2a, -0.5, 0.5, 0.08, 0.12, 0.22, -0.22, 0.01);
const invA = makeToon({ shirt: 0xf2c230, hair: 0x2b2118, hat: { type: 'kepi', color: 0x1e3a6a }, detail: ['belt', 'badge'] }); scene.add(invA.root);
const invB = makeToon({ shirt: 0xf2c230, hair: 0xc98a3a, detail: ['belt', 'badge', 'collar'], trim: 0xf4f1e8 }); scene.add(invB.root);
const lens = new THREE.Group(); scene.add(lens);
{ const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 24), flat(0x23262d)); lens.add(ring); const gl = disc(lens, 0.088, new THREE.MeshBasicMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.6 }), 0, 0, 0); rod(lens, V(0, -0.09, 0), V(0, -0.24, 0), 0.016, 0x7a4b2a, 0.01); }
k.walker({ toon: { shirt: 0xf2c230, hair: 0x6b4a2a, hat: { type: 'kepi', color: 0x1e3a6a }, detail: ['belt'] }, cx: KX - 1, z: -2.4, speed: 0.6, off: 2, dir: 1, span: 10 });

// =====================================================================================
// CABINA (x = 80): dos pilotos, el parabrisas con nubes que pasan rápido, el tablero
// =====================================================================================
gradPlane(14, 7, CK, 2.2, -4, [[0, '#4f9fe0'], [0.6, '#a9dcf5'], [1, '#e9f6fb']]);
const ckClouds = Array.from({ length: 6 }, (_, i) => { const g = k.cloud(CK, 1.4 + (i % 3) * 0.55, -3.6 + (i % 2) * 0.3, 0.55 + (i % 3) * 0.15); g.userData.ck = i; return g; });
{ const sh = new THREE.Shape(); sh.moveTo(-3.2, 0); sh.lineTo(3.2, 0); sh.lineTo(3.2, 3.6); sh.lineTo(-3.2, 3.6); sh.lineTo(-3.2, 0);
  const panes = [[[-1.55, 1.3], [-0.12, 1.3], [-0.12, 2.75], [-1.2, 2.6]], [[0.12, 1.3], [1.55, 1.3], [1.2, 2.6], [0.12, 2.75]], [[-2.7, 1.4], [-1.8, 1.4], [-1.5, 2.45], [-2.5, 2.3]], [[1.8, 1.4], [2.7, 1.4], [2.5, 2.3], [1.5, 2.45]]];
  for (const p of panes) { const h = new THREE.Path(); h.moveTo(...p[0]); for (const q of p.slice(1)) h.lineTo(...q); h.lineTo(...p[0]); sh.holes.push(h); }
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshLambertMaterial({ color: 0x5d6a7c })); wall.position.set(CK, 0, -1); wall.receiveShadow = true; scene.add(wall);
  for (const p of panes) k.stroke(wall, p, 0.07, true, 0.01);
  for (let i = 0; i < 14; i++) disc(wall, 0.025, 0x3a4352, -3 + i * 0.46, 3.1, 0.01);
  block(scene, 0x3a4352, CK - 3.2, CK + 3.2, 3.0, 3.6, -0.2, -1, 0.02);                      // panel del techo
  for (let i = 0; i < 18; i++) { const m = disc(scene, 0.035, [0xffd23a, 0x59c36a, 0xe0302a, 0xf4f4f4][i % 4], CK - 2.1 + i * 0.25, 3.12, -0.19); }
}
for (const x of [-0.65, 0.65]) { block(scene, 0x2b2f3a, CK + x - 0.3, CK + x + 0.3, 0.3, 1.5, -0.28, -0.5, 0.016); block(scene, 0x3a3f4d, CK + x - 0.24, CK + x + 0.24, 1.5, 1.72, -0.3, -0.48, 0.014); }
block(scene, 0x3a3f4a, CK - 2.2, CK + 2.2, 0, 0.88, 0.75, 0.35, 0.02); block(scene, 0x2b2f3a, CK - 2.25, CK + 2.25, 0.88, 0.95, 0.8, 0.3, 0.016);   // tablero
function gauge(x, y, z, r, label, { face = '#f4f4f4', needle = 0xe0302a } = {}) {
  picture(scene, r * 2.2, r * 2.2, x, y, z, (g, W, H) => {
    g.fillStyle = '#1e1428'; g.beginPath(); g.arc(W / 2, H / 2, W * 0.48, 0, 7); g.fill(); g.fillStyle = face; g.beginPath(); g.arc(W / 2, H / 2, W * 0.42, 0, 7); g.fill();
    g.strokeStyle = '#1e1428'; g.lineWidth = 5; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * W * 0.33, H / 2 + Math.sin(a) * W * 0.33); g.lineTo(W / 2 + Math.cos(a) * W * 0.4, H / 2 + Math.sin(a) * W * 0.4); g.stroke(); }
    g.fillStyle = '#1e1428'; g.font = `800 ${W * 0.15}px Montserrat`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, H * 0.7);
  });
  const geo = new THREE.PlaneGeometry(r * 0.1, r * 0.75); geo.translate(0, r * 0.32, 0);
  const n = new THREE.Mesh(geo, basic(needle)); n.position.set(x, y, z + 0.004); scene.add(n); disc(scene, r * 0.1, INK, x, y, z + 0.006); return n;
}
const G_ALT = V(CK - 1.15, 0.55, 0.755), G_VEL = V(CK - 0.55, 0.55, 0.755), G_RUM = V(CK + 0.55, 0.55, 0.755);
const needles = [gauge(G_ALT.x, G_ALT.y, G_ALT.z, 0.17, 'ALT'), gauge(G_VEL.x, G_VEL.y, G_VEL.z, 0.17, 'KT'), gauge(G_RUM.x, G_RUM.y, G_RUM.z, 0.17, 'N'), gauge(CK + 1.15, 0.55, 0.755, 0.17, 'FUEL', { needle: 0x2f8f4a }), gauge(CK - 1.7, 0.6, 0.755, 0.12, 'RPM'), gauge(CK + 1.7, 0.6, 0.755, 0.12, 'OIL')];
const screens = [CK - 0.18, CK + 0.18].map(x => picture(scene, 0.28, 0.34, x, 0.55, 0.755, (g, W, H) => { g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#16324a'; g.fillRect(10, 10, W - 20, H - 20); g.strokeStyle = '#59c36a'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i < 8; i++) g.lineTo(18 + i * (W - 36) / 7, H * 0.6 - 30 * Math.sin(i)); g.stroke(); g.fillStyle = '#ffd23a'; g.fillRect(20, 24, 60, 10); }));
const blinkers = Array.from({ length: 10 }, (_, i) => disc(scene, 0.025, 0x59c36a, CK - 2.0 + i * 0.44 + (i > 4 ? 0.1 : 0), 0.22, 0.756));
const yokes = [-0.65, 0.65].map(x => { const g = new THREE.Group(); g.position.set(CK + x, 0.82, 0.32); scene.add(g); rod(g, V(0, 0, 0), V(0, 0.18, -0.05), 0.025, 0x23262d, 0.01); block(g, 0x23262d, -0.17, 0.17, 0.16, 0.22, -0.02, -0.08, 0.01); for (const s of [-1, 1]) block(g, 0x23262d, s * 0.17 - 0.03, s * 0.17 + 0.03, 0.08, 0.24, -0.02, -0.08, 0.01); return g; });
const pilots = [makeToon({ shirt: 0xf4f6f9, hair: 0x2b2118, hat: { type: 'kepi', color: 0x1b2440 }, detail: ['tie', 'buttons'] }), makeToon({ shirt: 0xf4f6f9, hair: 0xe0b050, hat: { type: 'kepi', color: 0x1b2440 }, mustache: true, detail: ['tie', 'buttons'] })];
pilots.forEach(p => scene.add(p.root));
const box1 = makeBox({ s: 0.72 }), box2 = makeBox({ s: 0.72 });
const voiceDots = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 6, 16, PI * 0.8), basic(0xffe14a)); m.visible = false; m.renderOrder = 6; scene.add(m); return m; });
const dataDots = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), basic([0x59c36a, 0xffd23a, 0x6fd0ff][i % 3])); const o = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085), INK); o.position.z = -0.002; m.add(o); m.visible = false; m.renderOrder = 6; scene.add(m); return m; });

// =====================================================================================
// AVIÓN en el cielo (x = 120): corte en la cola con las dos cajas
// =====================================================================================
const plane = new THREE.Group(); plane.position.set(PX, 0.6, 0); scene.add(plane);
{ cylX(plane, 0xf4f6f9, 0.55, 4.4, 0.2, 0, 0, 0.03);
  const nose = ell(plane, 0xf4f6f9, 0.9, 0.55, 0.55, 2.4, 0, 0, 0.03);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.12, 1.5, 28), flat(0xf4f6f9)); tail.rotation.z = -PI / 2; tail.position.set(-2.75, 0.18, 0); tail.geometry.translate(0, 0, 0); outlined(tail, 0.03); plane.add(tail);
  const tailTop = ell(plane, 0xf4f6f9, 0.25, 0.14, 0.13, -3.45, 0.38, 0, 0.02);
  k.plane(plane, 0x3b82c4, 5.0, 0.12, -0.2, -0.12, 0.556); k.plane(plane, 0xffd23a, 5.0, 0.04, -0.2, -0.22, 0.54);
  for (let i = 0; i < 13; i++) { const x = -1.6 + i * 0.3; disc(plane, 0.075, INK, x, 0.14, 0.545, 0.09); disc(plane, 0.058, 0x6fb6e6, x, 0.14, 0.548, 0.072); }
  const cw = k.poly(plane, [[2.55, 0.12], [2.9, 0.12], [2.75, 0.3], [2.5, 0.28]], 0x2b3f63, 0.025); cw.position.z = 0.5;
  const fin = k.poly(plane, [[-2.4, 0.5], [-3.0, 1.55], [-3.55, 1.55], [-3.5, 0.45]], 0xf4f6f9, 0.04); fin.position.z = 0;
  const logo = k.poly(plane, [[-2.9, 0.8], [-3.2, 1.3], [-3.42, 1.3], [-3.3, 0.8]], 0x3b82c4, 0.02); logo.position.z = 0.02;
  const stab = k.poly(plane, [[-2.6, 0.2], [-3.5, 0.35], [-3.6, 0.45], [-2.4, 0.3]], 0xdfe3ea, 0.03); stab.position.z = 0.35;
  const wing = k.poly(plane, [[0.9, -0.15], [1.4, -0.15], [-0.6, -0.95], [-0.95, -0.95]], 0xdfe3ea, 0.035); wing.position.z = 0.75;
  cylX(plane, 0xb9bfc9, 0.2, 0.75, 0.75, -0.48, 0.85, 0.02); disc(plane, 0.15, 0x2b2f3a, 1.13, -0.48, 0.86).rotation.y = PI / 2;
  rod(plane, V(0.75, -0.3, 0.8), V(0.75, -0.2, 0.75), 0.04, 0xb9bfc9, 0.01);
  for (const x of [-0.8, 0.6]) { rod(plane, V(x, -0.5, 0.2), V(x, -0.75, 0.2), 0.025, 0x4a505c, 0.01); ell(plane, 0x23262d, 0.1, 0.1, 0.06, x, -0.8, 0.22, 0.012); } }
const cut = new THREE.Group(); cut.position.set(-2.15, -0.12, 0.57); plane.add(cut);
{ const pts = [[-0.62, -0.32], [0.62, -0.32], [0.62, 0.26], [-0.62, 0.26]]; const p = k.poly(cut, pts, 0x24314a, 0.035);
  for (let i = 0; i < 5; i++) k.plane(cut, 0x34446a, 1.2, 0.012, 0, -0.25 + i * 0.12, 0.004);
  for (let i = 0; i < 9; i++) k.plane(cut, 0x8a929c, 0.03, 0.03, -0.44 + i * 0.11, 0.26, 0.006); }
const miniA = makeBox({ s: 0.5, parent: cut, face: false }), miniB = makeBox({ s: 0.5, parent: cut, face: false });
const planeHalo = halo(0.75);
const skyClouds = Array.from({ length: 9 }, (_, i) => ({ g: k.cloud(PX, -1.6 + (i % 5) * 1.0, -5 - (i % 3), 0.7 + (i % 4) * 0.25), off: i * 2.1, sp: 3 + (i % 3) * 1.2 }));
const frontClouds = Array.from({ length: 3 }, (_, i) => ({ g: k.cloud(PX, [-1.3, 2.6, -1.6][i], 2.0, 0.5), off: i * 3.7, sp: 6 }));
const speedL = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); scene.add(m); m.userData.i = i; return m; });

// =====================================================================================
// LABORATORIO (x = 160): mesa, pistón, horno, tanque de presión
// =====================================================================================
const S0 = LX - 2.5, S1 = LX, S2 = LX + 2.5, S3 = LX + 5.0;
surface(scene, tex.tiles({ base: '#cfd8e0', line: '#9aa7b4', n: 4 }, 18, 10), 34, 24, LX + 1, 0.001, 0, true);
surface(scene, tex.tiles({ base: '#eef3f6', line: '#c3ced8', n: 5, seed: 7 }, 14, 4), 34, 9, LX + 1, 4.5, -1.8);
k.plane(scene, 0x3f8f6b, 34, 0.7, LX + 1, 0.35, -1.79); k.plane(scene, INK, 34, 0.05, LX + 1, 0.7, -1.785);
for (const [x, txt] of [[S1, 'IMPACTO'], [S2, 'FUEGO'], [S3, 'PRESIÓN']]) { const s = k.sign(txt, 1.2, 0.3, { bg: '#ffd23a' }); s.position.set(x, 3.15, -1.75); scene.add(s); }
windowPic(scene, 2.3, 1.7, S0, 2.05, -1.77, { curtain: '#3b82c4' });
for (const x of [S0, S1, S2, S3]) lamp(scene, x + 1.25, -1.5);
// mesa con la caja abierta
block(scene, 0xdfe3ea, S0 - 0.75, S0 + 0.75, 0.72, 0.8, 0.45, -0.45); for (const x of [-0.68, 0.68]) for (const z of [0.38, -0.38]) block(scene, 0x5d6772, S0 + x - 0.03, S0 + x + 0.03, 0, 0.72, z + 0.03, z - 0.03, 0.01);
const boxA = makeBox({ s: 1.0 });
const chipGlow = halo(0.25);
// pistón
block(scene, 0x5d6772, S1 - 0.6, S1 + 0.6, 0, 0.12, 0.45, -0.45, 0.02); block(scene, 0x2b2f3a, S1 - 0.45, S1 + 0.45, 0.12, 0.6, 0.35, -0.35, 0.02);
for (const x of [-0.55, 0.55]) block(scene, 0xe0a030, S1 + x - 0.07, S1 + x + 0.07, 0.12, 2.6, 0.07, -0.07, 0.016);
block(scene, 0xe0a030, S1 - 0.7, S1 + 0.7, 2.5, 2.72, 0.12, -0.12, 0.018);
cylX(scene, 0xc9ced6, 0.13, 0.5, S1, 2.25, 0, 0.014).rotation.z = 0;
const hammer = new THREE.Group(); scene.add(hammer);
{ block(hammer, 0x3a3f4a, -0.36, 0.36, 0, 0.32, 0.26, -0.26, 0.02); picture(hammer, 0.7, 0.12, 0, 0.16, 0.262, (g, W, H) => { for (let x = -40; x < W; x += 40) { g.fillStyle = (Math.round(x / 40) % 2) ? '#1e1428' : '#ffd23a'; g.beginPath(); g.moveTo(x, H); g.lineTo(x + 20, 0); g.lineTo(x + 40, 0); g.lineTo(x + 20, H); g.fill(); } });
  rod(hammer, V(0, 0.32, 0), V(0, 1.2, 0), 0.05, 0xdfe3ea, 0.012); }
const boxB = makeBox({ s: 0.9 });
const stars = [0, 1, 2, 3].map(() => k.glyph('✦', '#ffe14a', 0.3));
// horno
block(scene, 0x8a929c, S2 - 0.7, S2 + 0.7, 0, 0.2, 0.5, -0.5, 0.02);
block(scene, 0x9aa3ae, S2 - 0.7, S2 - 0.55, 0.2, 1.7, 0.5, -0.5, 0.018); block(scene, 0x9aa3ae, S2 + 0.55, S2 + 0.7, 0.2, 1.7, 0.5, -0.5, 0.018);
block(scene, 0x9aa3ae, S2 - 0.7, S2 + 0.7, 1.7, 1.9, 0.5, -0.5, 0.018); block(scene, 0x7d8590, S2 - 0.55, S2 + 0.55, 0.2, 1.7, -0.4, -0.5, 0.014);
const ovenGlow = k.plane(scene, new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.55 }), 1.08, 1.48, S2, 0.95, -0.39);
for (let i = 0; i < 4; i++) block(scene, 0x4a505c, S2 - 0.55, S2 + 0.55, 0.42 + 0 * i, 0.45, 0.35 - i * 0.22, 0.31 - i * 0.22, 0.008);       // rejilla
const boxC = makeBox({ s: 0.85 });
const flamePts = (() => { const sh = new THREE.Shape(); sh.moveTo(0, 1); sh.bezierCurveTo(0.12, 0.72, 0.46, 0.5, 0.36, 0.18); sh.bezierCurveTo(0.28, -0.04, -0.28, -0.04, -0.36, 0.18); sh.bezierCurveTo(-0.46, 0.5, -0.12, 0.72, 0, 1); return sh.getPoints(8).map(p => [p.x, p.y]); })();
const flames = Array.from({ length: 9 }, (_, i) => {
  const g = new THREE.Group(); g.position.set(S2 - 0.46 + (i % 5) * 0.23, i < 5 ? 0.3 : 0.42, i < 5 ? 0.32 : -0.2); g.userData.front = i < 5; scene.add(g);
  k.poly(g, flamePts, i % 2 ? 0xff5a1f : 0xff7a1a, 0.045);
  const inner = k.poly(g, flamePts.map(([x, y]) => [x * 0.55, y * 0.6]), 0xffd23a, 0.0001); inner.position.z = 0.005;
  return g;
});
const thermo = new THREE.Group(); thermo.position.set(S2 + 0.95, 0.6, 0.3); scene.add(thermo);
block(thermo, 0xffffff, -0.06, 0.06, 0, 1.0, 0.04, -0.04, 0.014); ell(thermo, 0xe0302a, 0.1, 0.1, 0.06, 0, 0, 0, 0.014);
const merc = k.plane(thermo, 0xe0302a, 0.05, 1, 0, 0, 0.045); merc.geometry.translate(0, 0.5, 0);
const clock = new THREE.Group(); clock.position.set(S2, 2.2, 0.3); scene.add(clock);
disc(clock, 0.28, INK, 0, 0, 0); disc(clock, 0.24, 0xffffff, 0, 0, 0.002); for (let i = 0; i < 12; i++) { const m = k.plane(clock, INK, 0.02, 0.05, Math.sin(i * PI / 6) * 0.2, Math.cos(i * PI / 6) * 0.2, 0.004); m.rotation.z = -i * PI / 6; }
const handM = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.2), INK); handM.geometry.translate(0, 0.09, 0); handM.position.z = 0.006; clock.add(handM);
const handH = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.13), basic(0xe0302a)); handH.geometry.translate(0, 0.055, 0); handH.position.z = 0.007; clock.add(handH);
const sweat = [0, 1, 2].map(() => { const m = ell(scene, 0x7cc4f0, 0.03, 0.045, 0.03, 0, 0, 0, 0.01); m.visible = false; return m; });
// tanque de presión
block(scene, 0x5d6772, S3 - 0.6, S3 + 0.6, 0, 0.2, 0.5, -0.5, 0.02);
const tankWater = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x3f9fd6, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
tankWater.position.set(S3, 1.0, 0); tankWater.renderOrder = 4; scene.add(tankWater);
{ const back = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.6), basic(0x1f5f8f)); back.position.set(S3, 1.0, -0.45); scene.add(back);
  for (const y of [0.2, 1.8]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.16, 32), flat(0x8a929c)); outlined(r, 0.018); r.position.set(S3, y, 0); scene.add(r); }
  for (const x of [-0.5, 0.5]) block(scene, 0x8a929c, S3 + x - 0.035, S3 + x + 0.035, 0.2, 1.8, 0.035, -0.035, 0.01);
  rod(scene, V(S3 + 0.56, 1.8, 0), V(S3 + 0.85, 1.8, 0), 0.04, 0x8a929c); }
const tGauge = gauge(S3 + 0.95, 1.8, 0.05, 0.2, 'BAR');
const boxD = makeBox({ s: 0.75 });
const arrows = Array.from({ length: 6 }, () => { const m = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), flat(0xffd23a)), 0.016); scene.add(m); return m; });
const tankBub = Array.from({ length: 10 }, (_, i) => ell(scene, 0xe2f7ff, 0.025 + (i % 3) * 0.01, 0.025 + (i % 3) * 0.01, 0.025 + (i % 3) * 0.01, 0, 0, 0, 0.008));
const sci = makeToon({ shirt: 0xf4f6f9, hair: 0x9aa0a8, detail: ['collar', 'tie', 'buttons'], trim: 0xdfe3ea }); scene.add(sci.root);
const clip = new THREE.Group(); scene.add(clip); block(clip, 0x9a6638, -0.1, 0.1, -0.13, 0.13, 0.01, -0.01, 0.01); k.plane(clip, 0xffffff, 0.16, 0.18, 0, -0.01, 0.012); block(clip, 0x9aa0a8, -0.04, 0.04, 0.11, 0.14, 0.02, -0.02, 0.006);
k.walker({ toon: { shirt: 0xf4f6f9, hair: 0x2b2118, detail: ['collar'], trim: 0xdfe3ea }, cx: LX + 1, z: -1.25, speed: 0.75, off: 5, dir: -1, span: 12 });

// =====================================================================================
// FONDO DEL MAR (x = 200)
// =====================================================================================
gradPlane(40, 16, SX, 4, -6, [[0, '#4fa9d6'], [0.45, '#1f6f9f'], [1, '#0f3a5f']]);
surface(scene, tex.grass({ base: '#c9b27a', blade: '#b39a62', light: '#dcc690' }, 12, 8), 34, 24, SX, 0.001, 0, true);
const seaRays = Array.from({ length: 6 }, (_, i) => { const g = new THREE.PlaneGeometry(0.7 + (i % 3) * 0.3, 9); g.translate(0, -4.5, 0); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.set(SX - 6 + i * 2.4, 7, -3 + (i % 2)); m.rotation.z = 0.25; scene.add(m); return m; });
{ const r = rng(3); for (let i = 0; i < 16; i++) { const s = 0.14 + r() * 0.3; ell(scene, [0x6f7a8a, 0x7d8590, 0x5d6772][i % 3], s * 1.4, s, s, SX - 6 + r() * 12, s * 0.5, -3.2 + r() * 1.9, 0.018); }
  const star = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = PI / 2 + i * PI / 5, rr = i % 2 ? 0.07 : 0.17; i ? star.lineTo(rr * Math.cos(a), rr * Math.sin(a)) : star.moveTo(rr * Math.cos(a), rr * Math.sin(a)); }
  for (const [x, z, col] of [[-1.8, 1.0, 0xf08a3a], [2.4, 0.9, 0xe8604a], [-3.5, -0.5, 0xf0a03a]]) { const geo = new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: false }); const m = outlined(new THREE.Mesh(geo, flat(col)), 0.012); m.rotation.x = -PI / 2 + 0.25; m.position.set(SX + x, 0.04, z); scene.add(m); } }
const weeds = [];
{ const r = rng(12); for (let i = 0; i < 22; i++) { const g = new THREE.Group(); g.position.set(SX - 6 + r() * 12, 0, -3.2 + r() * 2.6); scene.add(g); const n = 4 + Math.floor(r() * 3); for (let j = 0; j < n; j++) ell(g, [0x3f8a3f, 0x4f9a45, 0x63ad4e][i % 3], 0.06, 0.13, 0.04, 0, 0.1 + j * 0.22, 0, 0.012); g.userData.ph = r() * 6; weeds.push(g); } }
function makeFishS(col, s) { const g = new THREE.Group(); scene.add(g); ell(g, col, 0.22, 0.13, 0.08, 0, 0, 0, 0.014); const tl = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 3), flat(col)), 0.012); tl.rotation.z = PI / 2; tl.position.x = -0.26; g.add(tl); ell(g, 0xffffff, 0.04, 0.04, 0.03, 0.12, 0.03, 0.06, 0.008); ell(g, INK, 0.02, 0.022, 0.02, 0.135, 0.03, 0.085, 0); g.scale.setScalar(s); g.userData.tl = tl; return g; }
const seaFish = Array.from({ length: 9 }, (_, i) => ({ g: makeFishS([0xffd23a, 0xe8604a, 0x6fd0ff, 0xb7d3a8][i % 4], 0.7 + (i % 3) * 0.3), y: 0.8 + (i * 0.47) % 2.6, z: -2.4 - (i % 3) * 0.5, off: i * 1.9, sp: 0.5 + (i % 4) * 0.12, dir: i % 2 ? 1 : -1 }));
const snow = Array.from({ length: 40 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.014 + (i % 3) * 0.007, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); scene.add(m); return { m, x0: SX - 5 + ((i * 0.618) % 1) * 10, y0: ((i * 0.414) % 1) * 5, z: -1.5 + ((i * 0.27) % 1) * 3 }; });
const boxS = makeBox({ s: 0.85 });
const bubS = Array.from({ length: 12 }, (_, i) => ell(scene, 0xe2f7ff, 0.03 + (i % 3) * 0.012, 0.03 + (i % 3) * 0.012, 0.03 + (i % 3) * 0.012, 0, 0, 0, 0.008));
const pings = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.028, 6, 48), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, depthWrite: false })); m.renderOrder = 6; m.visible = false; scene.add(m); return m; });
const puffSea = k.puffs(6), puffSea2 = k.puffs(5), puffHit = k.puffs(5), puffDiver = k.puffs(4);
// contador de días
const dayCv = document.createElement('canvas'); dayCv.width = 256; dayCv.height = 200; const dayTex = new THREE.CanvasTexture(dayCv); dayTex.colorSpace = THREE.SRGBColorSpace;
let lastDay = -1;
function drawDay(n) { if (n === lastDay) return; lastDay = n; const g = dayCv.getContext('2d'); g.fillStyle = '#1e1428'; g.fillRect(0, 0, 256, 200); g.fillStyle = '#ffffff'; g.fillRect(12, 12, 232, 176); g.fillStyle = '#e0302a'; g.fillRect(12, 12, 232, 52);
  g.fillStyle = '#ffffff'; g.font = '800 36px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DÍA', 128, 40); g.fillStyle = '#1e1428'; g.font = '800 104px Montserrat'; g.fillText(String(n), 128, 128); dayTex.needsUpdate = true; }
drawDay(1);
const calendar = new THREE.Group(); scene.add(calendar);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.48), new THREE.MeshBasicMaterial({ map: dayTex })); calendar.add(m); for (const x of [-0.18, 0.18]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 14), basic(0x9aa0a8)); r.position.set(x, 0.24, 0.01); calendar.add(r); } }
// buzo
const diver = makeToon({ shirt: 0x23262d, skin: 0xf6d2ae, hair: null, detail: ['belt'], trim: 0xffd23a }); scene.add(diver.root);
{ const tank = new THREE.Group(); tank.position.set(0, 0.85, -0.22); diver.root.add(tank); rod(tank, V(-0.07, -0.2, 0), V(-0.07, 0.25, 0), 0.07, 0xffd23a, 0.014); rod(tank, V(0.07, -0.2, 0), V(0.07, 0.25, 0), 0.07, 0xffd23a, 0.014);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.315, 28, 16, 0, PI * 2, 0, 1.25), flat(0x23262d)); outlined(hood, 0.018); hood.rotation.x = -0.35; diver.head.add(hood);
  const mask = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 28), flat(0xffd23a)); mask.scale.set(1.25, 0.72, 1); mask.position.set(0, 0.02, 0.27); mask.rotation.x = -0.05; diver.head.add(mask);
  rod(diver.head, V(0.26, 0.0, 0.1), V(0.3, 0.32, 0.0), 0.022, 0xffd23a, 0.01); }
const diverBub = Array.from({ length: 6 }, (_, i) => ell(scene, 0xe2f7ff, 0.03 + (i % 2) * 0.015, 0.03 + (i % 2) * 0.015, 0.03 + (i % 2) * 0.015, 0, 0, 0, 0.008));
// robot submarino
const robot = new THREE.Group(); scene.add(robot);
const robotArm = new THREE.Group(), props = [];
{ block(robot, 0xffd23a, -0.42, 0.42, -0.22, 0.22, 0.28, -0.28, 0.02); block(robot, 0x3a3f4a, -0.46, 0.46, 0.22, 0.32, 0.3, -0.3, 0.016); block(robot, 0x3a3f4a, -0.46, 0.46, -0.32, -0.22, 0.3, -0.3, 0.016);
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.52, 0, 0); robot.add(p); cylX(p, 0x3a3f4a, 0.1, 0.18, 0, 0, 0, 0.012); const bl = new THREE.Group(); bl.position.x = s * 0.1; p.add(bl); for (let i = 0; i < 3; i++) { const b = block(bl, 0xdfe3ea, -0.01, 0.01, 0, 0.13, 0.03, -0.03, 0.006); b.rotation.x = i * 2.1; } props.push(bl); }
  disc(robot, 0.14, INK, -0.12, 0.02, 0.282); disc(robot, 0.115, 0xffffff, -0.12, 0.02, 0.284); const pu = disc(robot, 0.06, INK, -0.1, 0.0, 0.286); robot.userData.pupil = pu; disc(robot, 0.02, 0xffffff, -0.08, 0.03, 0.288);
  for (const x of [0.12, 0.28]) { disc(robot, 0.055, INK, x, 0.06, 0.282); disc(robot, 0.042, 0xfff1b8, x, 0.06, 0.284); }
  const sm = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14, PI), INK); sm.rotation.z = PI; sm.position.set(0.2, -0.1, 0.284); robot.add(sm);
  robot.add(robotArm); robotArm.position.set(-0.3, -0.22, 0.1); }
const armSeg = rod(robotArm, V(0, 0, 0), V(0, -1, 0), 0.03, 0x9aa0a8, 0.01);
const claw = new THREE.Group(); robotArm.add(claw); for (const s of [-1, 1]) { const f = block(claw, 0x3a3f4a, -0.015, 0.015, -0.14, 0, 0.02, -0.02, 0.008); f.position.x = s * 0.05; f.rotation.z = s * 0.3; }
const lightBeam = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.0, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
lightBeam.geometry.translate(0, -1.0, 0); scene.add(lightBeam);

// ---------- signos ----------
const qMark = k.glyph('?', '#ffd23a', 0.5), xMark = k.glyph('X', '#e0302a', 0.62), bangA = k.glyph('!', '#ffd23a', 0.5), bangB = k.glyph('!', '#ffd23a', 0.45), okMark = k.glyph('✓', '#59c36a', 0.55), okSci = k.glyph('!', '#ffd23a', 0.45);
const sparks = [0, 1, 2, 3, 4, 5].map(() => k.glyph('✦', '#fff1a8', 0.3));
const seaSparks = [0, 1, 2, 3].map(() => k.glyph('✦', '#fff1a8', 0.28));
const fireSparks = [0, 1, 2, 3, 4].map(() => k.glyph('✦', '#ffb03a', 0.18));

// =====================================================================================
// posar todo en el instante t
// =====================================================================================
const T = { tmp: v3(), tmp2: v3(), hV: v3(), hM: v3(), hA: v3(), hB: v3(), p0: v3(), p1: v3(), hS: v3(), hD: v3(), bS: v3(), chip: v3(), beac: v3() };
const BOXH = V(0.15, 0.7, 0), BOXL = V(KX - 0.6, 0, 0.35), BOXW = V(POND[0] - 0.4, 0.02, POND[1] + 0.2);

function poseHangar(t) {
  const on = t < asiT + 0.2;
  [visitor, mech].forEach(p => { p.root.visible = on; }); boxH.root.visible = on; bubble.visible = false; bubDots.forEach(m => { m.visible = false; }); finalSign.visible = false;
  if (!on) return;
  const end = false;
  // la caja: aparece con rebote al decir "naranja", y vuelve en el remate
  const appear = end ? 1 : back(lin(t, naranjaT - 0.12, naranjaT + 0.25));
  const land = end ? c[9] - 0.1 : naranjaT + 0.25;
  boxH.pose({ t, x: BOXH.x, y: BOXH.y + (end ? 0 : 0.5 * (1 - lin(t, naranjaT - 0.12, naranjaT + 0.25))), z: BOXH.z, ry: 0.12 * Math.sin(t * 1.2), sc: appear, squash: settle(t, land, 0.22) * breathe(t, 1),
    mood: end ? (t > nombreT - 0.1 ? 'happy' : 'neutral') : (t < land + 0.3 ? 'surprised' : 'happy'), look: V(0.2, 1.5, 6), kk: 0.4 });
  // el visitante pregunta (burbuja con caja negra) y se sorprende
  const hop1 = end ? hop(t, nombreT, 0.14) : hop(t, naranjaT + 0.1, 0.2);
  visitor.pose(alive({ x: -1.3, z: 0.25, face: 0.45, y: hop1, squash: settle(t, end ? nombreT + 0.4 : naranjaT + 0.5, 0.12) * breathe(t),
    look: t < naranjaT - 0.1 && !end ? V(-1.0, 2.4, 2.6) : V(0.15, 1.2, 2.6), blink: blinkAt(t, 0.3),
    handR: end ? V(-0.85, 1.75 + 0.06 * Math.sin(t * 8), 0.4) : t < naranjaT ? V(-1.15, 1.42, 0.5) : V(-0.82, 1.65, 0.45), wR: end ? win(t, nombreT - 0.2, END + 1, 0.2) : 1,
    handL: t < naranjaT && !end ? V(-1.62, 1.15, 0.4) : V(-1.7, 1.55, 0.4), wL: end ? 0 : win(t, naranjaT, asiT, 0.15),
    ...(end ? moodAt(t, [[0, 'neutral'], [negraT, 'surprised'], [nombreT - 0.1, 'happy']]) : moodAt(t, [[0, 'neutral'], [noT - 0.1, 'surprised'], [naranjaT + 0.2, 'happy']])) }, t, 0.7));
  // el mecánico presenta la caja
  const present = end ? win(t, c[9], END + 1, 0.2) : back(lin(t, naranjaT + 0.15, naranjaT + 0.45));
  mech.pose(alive({ x: 1.32, z: 0.2, face: -0.4, squash: breathe(t, 2), y: end ? hop(t, nombreT + 0.15, 0.1) : 0,
    look: t < naranjaT && !end ? V(-1.3, 1.5, 2.6) : V(1.0, 1.4, 6), blink: blinkAt(t, 1.4),
    handL: V(0.86, 1.18 + 0.03 * Math.sin(t * 6), 0.45), wL: present, handR: talk(t, 1.32, 0.2, 1), wR: 0.85,
    ...moodAt(t, end ? [[0, 'happy']] : [[0, 'neutral'], [naranjaT, 'happy']]) }, t, 2.3));
  visitor.head.getWorldPosition(T.hV); mech.head.getWorldPosition(T.hM);
  if (!end) {
    const b = popIn(t, 0.05, naranjaT + 0.05);
    bubble.visible = b > 0.01; bubble.position.set(-0.85, 2.45 + 0.03 * Math.sin(t * 3), 0.3); bubble.scale.setScalar(Math.max(b, 0.001)); bubble.rotation.z = 0.03 * Math.sin(t * 2.3);
    bubDots.forEach((m, i) => { m.visible = b > 0.01; m.position.set(lerp(T.hV.x + 0.15, -0.95, (i + 1) / 3), lerp(T.hV.y + 0.4, 2.0, (i + 1) / 3), 0.35); m.scale.setScalar(Math.max(b, 0.001) * [0.07, 0.11][i]); });
  } else {
    const s = popIn(t, c[9] + 0.05, END + 2);
    finalSign.visible = s > 0.01; finalSign.position.set(BOXH.x, 2.25 + 0.04 * Math.sin(t * 2), 0.2); finalSign.scale.setScalar(Math.max(s, 0.001)); finalSign.rotation.z = 0.04 * Math.sin(t * 1.7);
    const st = lin(t, negraT + 0.05, negraT + 0.35); strike.visible = st > 0.01; strike.scale.x = Math.max(st, 0.001) * 0.68; strike.position.x = -0.02;
    const ow = back(lin(t, negraT + 0.45, negraT + 0.75)); orangeWord.visible = ow > 0.01; orangeWord.scale.setScalar(Math.max(ow, 0.001)); orangeWord.position.set(0.32, -0.27, 0.04); orangeWord.rotation.z = -0.12;
  }
  k.glyphAt(xMark, T.tmp.set(-0.85, 2.48, 0.35), 0, 0, popIn(t, noT, naranjaT), 0.1 * Math.sin(t * 9));
  k.glyphAt(qMark, T.hV, -0.3, 0.52, end ? 0 : popIn(t, 0.1, noT), 0.15 * Math.sin(t * 6));
  sparks.forEach((m, i) => {
    const kk = (end ? popIn(t, nombreT - 0.3, END + 2) : popIn(t, naranjaT + 0.05, asiT)) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6));
    k.glyphAt(m, T.tmp2.set(BOXH.x + 0.05, BOXH.y + 0.45, 0.2), [-0.75, 0.8, -0.6, 0.7, -0.15, 0.25][i], [0.35, 0.4, -0.15, -0.2, 0.62, 0.66][i], Math.max(kk, 0), t * 1.5 + i);
  });
}

function poseField(t) {
  const on = t >= asiT - 0.1 && t < c[2] + 0.1;
  invA.root.visible = invB.root.visible = boat.visible = lens.visible = flyover.visible = on; boxL.root.visible = boxW.root.visible = on;
  shine.forEach(m => { m.visible = on; }); wRings.forEach(m => { m.visible = on; });
  if (!on) return;
  boxL.pose({ t, x: BOXL.x, y: 0, z: BOXL.z, ry: 0.35, rz: 0.12, squash: breathe(t, 3), mood: t < rapidoT ? 'worried' : 'happy', look: V(BOXL.x - 1.5, 1.5, 3), kk: 0.9 });
  flyover.position.set(lerp(KX + 0.5, KX + 7.5, lin(t, aguaT - 0.2, c[2] + 0.1)), 4.6 + 0.1 * Math.sin(t * 2), -5); flyover.rotation.z = 0.08;
  const w = t < rapidoT - 0.3 ? go(t, asiT + 0.1, rapidoT - 0.35, KX - 3.9, KX - 1.75) : { x: KX - 1.75, face: 0.9 };
  const found = t > rapidoT - 0.2;
  invA.pose(alive({ z: 0.3, ...w, y: hop(t, rapidoT - 0.1, 0.18), squash: settle(t, rapidoT + 0.3, 0.12) * breathe(t), blink: blinkAt(t, 0.2),
    look: found ? V(KX - 1.0, 1.1, 2.6) : V(w.x + 1.2, 0.6, 1.5),
    handR: found ? V(KX - 1.25, 1.3, 0.6) : V(w.x + 0.4, 0.9, 0.55), wR: 1, handL: V(w.x - 0.25, 1.05, 0.5), wL: found ? 0 : 0.6,
    ...moodAt(t, [[0, 'neutral'], [rapidoT - 0.15, 'surprised'], [rapidoT + 0.5, 'happy']]) }, t, 1.1));
  invA.hand(1, lens.position); lens.position.y += 0.12; lens.rotation.set(0, 0.6, found ? -0.6 : 0); lens.visible = true;
  invA.head.getWorldPosition(T.hA);
  // laguna: bote que se mece y la caja bajo el agua
  const by = 0.3 + 0.03 * Math.sin(t * 2.2);
  boat.position.set(POND[0] + 1.1, by, POND[1] - 0.35); boat.rotation.z = 0.05 * Math.sin(t * 1.8);
  boxW.pose({ t, x: BOXW.x, y: BOXW.y, z: BOXW.z, ry: -0.3, rz: -0.08, squash: breathe(t, 5), mood: t > aguaT ? 'happy' : 'neutral', look: V(POND[0] + 1.1, 1.4, 2), kk: 1.7 });
  const seen = t > aguaT - 0.3;
  invB.pose(alive({ x: POND[0] + 1.1, y: by + 0.12, z: POND[1] - 0.35, face: -0.5, squash: breathe(t, 4), blink: blinkAt(t, 1.2), look: seen ? V(BOXW.x, 0.3, 1.5) : V(POND[0] + 1, 1.3, 3),
    handR: seen ? V(BOXW.x + 0.55, 0.9, 0.3) : V(POND[0] + 1.4, 0.95, 0.0), wR: seen ? back(lin(t, aguaT - 0.3, aguaT)) : 0.5, handL: talk(t, POND[0] + 1.1, -0.35, -1), wL: 0.6,
    ...moodAt(t, [[0, 'neutral'], [aguaT - 0.3, 'surprised'], [aguaT + 0.3, 'happy']]) }, t, 3.2));
  invB.head.getWorldPosition(T.hB);
  shine.forEach((m, i) => { const u = ((t * 0.3 + i * 0.13) % 1); m.position.set(POND[0] - 1.5 + ((i * 0.37) % 1) * 3, 0.305, POND[1] - 0.9 + ((i * 0.61) % 1) * 1.8); m.material.opacity = 0.8 * Math.sin(PI * u); m.scale.x = 0.6 + u; });
  wRings.forEach((m, i) => { const u = ((t - asiT) * 0.7 + i / 3) % 1; m.position.set(BOXW.x, 0.31, BOXW.z); m.scale.setScalar(0.2 + 0.7 * u); m.material.opacity = 0.7 * (1 - u); });
  debris.forEach((g, i) => { g.position.y = 0; });
  k.glyphAt(bangA, T.hA, 0.42, 0.4, popIn(t, rapidoT - 0.15, aguaT - 0.3), 0.1 * Math.sin(t * 7));
  k.glyphAt(bangB, T.hB, 0.05, 0.62, popIn(t, aguaT - 0.2, c[2]), 0.1 * Math.sin(t * 7));
}

/** Punto a la fracción u de una polilínea de Vector3. */
function pathLerp(out, pts, u) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = pts[i].distanceTo(pts[i - 1]); L.push(l); tot += l; }
  let d = clamp01(u) * tot, j = 0; while (j < L.length - 1 && d > L[j]) { d -= L[j]; j++; }
  return out.lerpVectors(pts[j], pts[j + 1], L[j] ? Math.min(d / L[j], 1) : 0);
}
function poseCockpit(t) {
  const on = t >= c[2] - 0.1 && t < c[4] + 0.1;
  pilots.forEach(p => { p.root.visible = on; }); box1.root.visible = box2.root.visible = on;
  voiceDots.forEach(m => { m.visible = false; }); dataDots.forEach(m => { m.visible = false; });
  if (!on) return;
  ckClouds.forEach((g, i) => { const u = ((t * 1.6 + i * 1.9) % 11); g.position.x = CK + 5.5 - u; });
  const shake = 0.008 * Math.sin(t * 23);
  [-0.65, 0.65].forEach((x, i) => {
    const p = pilots[i], px = CK + x, talkL = i === 0 ? win(t, vocesT - 0.4, otroT, 0.2) : win(t, vocesT + 0.25, otroT, 0.2);
    const yk = yokes[i]; yk.rotation.z = 0.06 * Math.sin(t * 1.3 + i); yk.position.y = 0.82 + shake;
    const hl = V(px - 0.17, 1.03 + shake, 0.27), hr = V(px + 0.17, 1.03 + shake, 0.27);
    const lookBox = t > dosT - 0.1 && t < unoT ? (i ? box2 : box1).top(T.tmp) : t > datosT && i === 1 ? G_RUM : V(px - x * 0.5, 1.3, 3);
    p.pose(alive({ x: px, z: 0, face: -x * 0.35, squash: breathe(t, i), blink: blinkAt(t, i * 1.1), y: hop(t, dosT + 0.1 * i, 0.08),
      look: lookBox.clone ? lookBox.clone() : lookBox, handL: talkL > 0.1 && i === 0 ? talk(t, px, 0, -1) : hl, wL: 1, handR: talkL > 0.1 && i === 1 ? talk(t, px, 0, 1) : hr, wR: 1,
      ...moodAt(t, i === 0 ? [[0, 'neutral'], [dosT, 'surprised'], [vocesT - 0.3, 'happy'], [otroT, 'neutral']] : [[0, 'neutral'], [dosT, 'surprised'], [vocesT + 0.2, 'happy'], [datosT, 'neutral'], [rumboT, 'happy']]) }, t, i * 2.1));
  });
  const b1 = back(lin(t, dosT - 0.1, dosT + 0.2)), b2 = back(lin(t, dosT + 0.05, dosT + 0.35));
  box1.pose({ t, x: CK - 0.55, y: 1.92 + 0.05 * Math.sin(t * 2.6), z: 0.1, ry: 0.25, sc: b1, squash: settle(t, unoT, 0.12), mood: t > vocesT ? 'happy' : 'surprised', look: V(CK - 0.65, 1.2, 1), kk: 0.3 });
  box2.pose({ t, x: CK + 0.55, y: 1.92 + 0.05 * Math.sin(t * 2.6 + 1), z: 0.1, ry: -0.25, sc: b2, squash: settle(t, datosT, 0.12), mood: t > datosT ? 'happy' : 'neutral', look: t > datosT ? V(CK, 0.5, 1) : V(CK, 1.6, 5), kk: 1.1 });
  pilots[0].head.getWorldPosition(T.p0); pilots[1].head.getWorldPosition(T.p1);
  // voces que viajan hasta la caja 1
  const b1p = box1.top(T.tmp2);
  voiceDots.forEach((m, i) => {
    const from = i % 2 ? T.p1 : T.p0, on2 = (i % 2 ? win(t, vocesT + 0.2, otroT + 0.3, 0.15) : win(t, vocesT - 0.4, otroT + 0.3, 0.15)) > 0.05;
    if (!on2) return; const u = ((t * 0.9 + i / 12 * 2) % 1);
    const side = i % 2 ? -1 : 1, a = T.tmp.set(from.x + side * 0.34, from.y - 0.05, 0.4), mid = T.hM.set(i % 2 ? CK : from.x + 0.42, from.y + 0.45, 0.4);
    m.visible = true; pathLerp(m.position, [a, mid, b1p], u); m.position.z = 0.4;
    m.rotation.z = side > 0 ? -0.3 : PI + 0.3; m.scale.setScalar(0.8 + 0.6 * Math.sin(PI * u));
  });
  // datos que suben del tablero a la caja 2
  const b2p = box2.top(T.hS);
  dataDots.forEach((m, i) => {
    if (t < datosT - 0.1) return; const src = [G_ALT, G_VEL, G_RUM][i % 3], u = ((t * 0.8 + i / 16 * 3) % 1);
    m.visible = true; pathLerp(m.position, [T.tmp.set(src.x, src.y + 0.2, 0.85), T.hM.set(CK, 1.0, 0.7), T.hV.set(CK, 1.8, 0.5), b2p], u); m.rotation.z = t * 3 + i; m.scale.setScalar(0.7 + 0.5 * Math.sin(PI * u));
  });
  needles[0].rotation.z = -1.5 - 0.6 * Math.sin(t * 0.9) - 2.2 * win(t, altT - 0.1, END, 0.4) * prog(t, altT - 0.1, altT + 0.6);
  needles[1].rotation.z = -0.8 - 0.3 * Math.sin(t * 2.1) - 1.6 * prog(t, velT - 0.1, velT + 0.5);
  needles[2].rotation.z = 0.5 * Math.sin(t * 0.7) + 2.4 * prog(t, rumboT - 0.1, rumboT + 0.5);
  needles[3].rotation.z = -0.6 + 0.05 * Math.sin(t * 3); needles[4].rotation.z = -2 + 0.4 * Math.sin(t * 5); needles[5].rotation.z = -1 + 0.2 * Math.sin(t * 4);
  blinkers.forEach((m, i) => { m.material.color.set(((t * 2.5 + i * 0.37) % 1) < 0.5 ? 0x59c36a : 0x1f4a2a); });
}

function posePlane(t) {
  const on = t >= c[4] - 0.1 && t < c[5] + 0.1; plane.visible = on; planeHalo.visible = false; speedL.forEach(m => { m.visible = on; });
  if (!on) return;
  plane.position.set(PX, 0.6 + 0.08 * Math.sin(t * 1.6), 0); plane.rotation.z = 0.03 * Math.sin(t * 1.2);
  skyClouds.forEach(c0 => { const u = ((t * c0.sp + c0.off * 3) % 22); c0.g.position.x = PX + 11 - u; });
  frontClouds.forEach(c0 => { const u = ((t * c0.sp + c0.off * 3) % 26); c0.g.position.x = PX + 13 - u; });
  speedL.forEach((m, i) => { const u = ((t * 2.2 + i * 0.29) % 1); m.position.set(PX + 4 - 8 * u, -0.6 + (i % 4) * 0.65 + 0.25 * (i % 2), 1.0); m.material.opacity = 0.7 * Math.sin(PI * u); });
  const lit = popIn(t, colaT - 0.1, c[5] + 0.3);
  miniA.pose({ t, x: -0.3, y: -0.27, z: 0.02, sc: 0.6 + 0.4 * back(lin(t, colaT - 0.1, colaT + 0.2)), squash: 1 + 0.06 * Math.sin(t * 9) * lit });
  miniB.pose({ t, x: 0.27, y: -0.27, z: 0.02, sc: 0.6 + 0.4 * back(lin(t, colaT, colaT + 0.3)), squash: 1 + 0.06 * Math.sin(t * 9 + 1) * lit });
  cut.updateMatrixWorld(true); cut.localToWorld(T.tmp.set(0, -0.05, 0.05));
  haloAt(planeHalo, T.tmp, t, lit);
}

function poseLab(t) {
  const on = t >= c[5] - 0.1 && t < c[7] + 0.1;
  [boxA, boxB, boxC, boxD].forEach(b => { b.root.visible = on; }); sci.root.visible = clip.visible = hammer.visible = on; chipGlow.visible = false;
  stars.forEach(m => { m.visible = false; }); sweat.forEach(m => { m.visible = false; });
  arrows.forEach(m => { m.visible = false; }); tankBub.forEach(m => { m.visible = on; });
  if (!on) return;
  // mesa: el cilindro sube y suelta la memoria
  const lift = back(lin(t, adentroT + 0.15, adentroT + 0.5)) * 0.32, chipOut = back(lin(t, memT - 0.1, memT + 0.35));
  boxA.pose({ t, x: S0, y: 0.8, z: 0, ry: 0.15, lift, chipOut, squash: breathe(t, 2), mood: t < memT ? 'surprised' : 'happy', look: V(S0 - 0.6, 1.4, 2), kk: 0.2 });
  boxA.chip.getWorldPosition(T.chip);
  haloAt(chipGlow, T.chip, t, popIn(t, memT + 0.1, cilT + 0.1));
  // pistón: sube, baja de golpe, rebota
  const top0 = 0.6 + 0.58 * 0.9, rest = 1.65;
  let hy = rest + 0.06 * Math.sin(t * 2);
  if (t > golpeT - 0.5 && t < HIT) hy = lerp(rest, rest + 0.3, prog(t, golpeT - 0.5, golpeT - 0.05)) - (rest + 0.3 - top0) * (lin(t, HIT - 0.1, HIT) ** 2);
  else if (t >= HIT && t < HIT + 0.9) hy = lerp(top0, rest, prog(t, HIT + 0.2, HIT + 0.9)) + 0.03 * Math.exp(-8 * (t - HIT)) * Math.sin(40 * (t - HIT));
  hammer.position.set(S1, hy, 0);
  const sq = t >= HIT - 0.02 && t < HIT + 0.25 ? lerp(0.62, 1, prog(t, HIT + 0.05, HIT + 0.25)) : settle(t, HIT + 0.25, 0.15);
  boxB.pose({ t, x: S1, y: 0.6, z: 0, ry: -0.1, squash: sq * breathe(t, 1), mood: t > golpeT - 0.5 && t < HIT + 0.6 ? (t < HIT ? 'worried' : 'effort') : t > HIT ? 'happy' : 'neutral', look: V(S1, 2.2, 1), kk: 0.6 });
  stars.forEach((m, i) => { const kk = popIn(t, HIT + 0.05, fuegoT - 0.3); const a = t * 4 + i * PI / 2; k.glyphAt(m, T.tmp.set(S1 + 0.02, 1.3, 0.1), Math.cos(a) * 0.45, Math.sin(a) * 0.12 + 0.05, kk, t * 3); });
  puffHit(t, HIT, S1 - 0.45, 0.4, -1, 0.65);
  // horno: llamas, termómetro, reloj
  boxC.pose({ t, x: S2, y: 0.45, z: -0.05, ry: 0.1, squash: breathe(t, 3) * (1 + 0.03 * Math.sin(t * 13) * win(t, fuegoT, presionT, 0.2)), mood: t < fuegoT ? 'neutral' : t < mediaT ? 'worried' : 'effort', look: V(S2 + 0.3, 1.5, 3), kk: 1.3 });
  const heat = 0.35 + 0.65 * prog(t, fuegoT - 0.2, fuegoT + 0.4);
  flames.forEach((m, i) => { const f = 0.8 + 0.3 * Math.sin(t * (11 + i) + i * 1.7); const fr = m.userData.front ? 0.55 : 1.25; m.scale.set(0.3 * heat * (0.85 + 0.2 * Math.sin(t * 9 + i)), 0.42 * fr * heat * f * (1 + (i % 3) * 0.2), 1); m.rotation.z = 0.12 * Math.sin(t * 7 + i * 2); });
  ovenGlow.material.opacity = 0.4 + 0.25 * heat + 0.08 * Math.sin(t * 17);
  merc.scale.y = 0.12 + 0.85 * prog(t, fuegoT - 0.1, milT + 0.9) + 0.01 * Math.sin(t * 20);
  handM.rotation.z = -t * 0.5 - 12 * prog(t, mediaT - 0.3, presionT); handH.rotation.z = -1 - PI * prog(t, mediaT - 0.3, presionT);
  sweat.forEach((m, i) => { const onS = t > fuegoT + 0.3 && t < presionT + 0.2, u = (t * 1.6 + i / 3) % 1, s = i % 2 ? 1 : -1; m.visible = onS; if (!onS) return; m.position.set(S2 + s * (0.35 + 0.15 * u), 0.95 + 0.2 * u - 0.5 * u * u, 0.25); m.scale.set(0.03 * (1 - u * 0.7), 0.045 * (1 - u * 0.7), 0.03); });
  fireSparks.forEach((m, i) => { const u = (t * 0.9 + i / 5) % 1; k.glyphAt(m, T.tmp.set(S2 - 0.4 + ((i * 0.37) % 1) * 0.8, 0.5 + 1.0 * u, 0.4), 0, 0, (t > fuegoT - 0.2 && t < presionT + 0.3 ? 1 : 0) * Math.sin(PI * u), t * 2 + i); });
  // tanque: flechas que aprietan y aguja que sube
  const press = prog(t, presionT - 0.1, seisT + 0.3);
  boxD.pose({ t, x: S3, y: 0.42, z: 0, ry: -0.15, squash: 1 - 0.05 * press * (0.5 + 0.5 * Math.sin(t * 10)), squeeze: 1 - 0.1 * press * (0.5 + 0.5 * Math.sin(t * 10 + 1)), mood: t < presionT ? 'neutral' : t < seisT + 0.4 ? 'effort' : 'happy', look: V(S3, 1.4, 3), kk: 2.1 });
  arrows.forEach((m, i) => { const a = i / 6 * PI * 2, d = 0.72 - 0.12 * press - 0.05 * Math.sin(t * 10 + i), kk = back(lin(t, presionT - 0.1 + i * 0.05, presionT + 0.2 + i * 0.05));
    m.visible = kk > 0.01 && t < c[7]; m.position.set(S3 + Math.cos(a) * d, 0.72 + Math.sin(a) * d * 0.7, 0.35); m.rotation.set(0, 0, a + PI / 2); m.scale.setScalar(Math.max(kk, 0.001)); });
  tGauge.rotation.z = 1.2 - 3.2 * press + 0.04 * Math.sin(t * 15);
  tankBub.forEach((m, i) => { const u = (t * 0.5 + i / 10) % 1; m.position.set(S3 - 0.35 + ((i * 0.37) % 1) * 0.7, 0.3 + 1.4 * u, 0.2 - ((i * 0.61) % 1) * 0.4); });
  // científico: va de estación en estación
  const X0 = S0 + 1.3, X1 = S1 + 1.3, X2 = S2 + 1.3, X3 = S3 + 1.3;
  let p;
  if (t < cilT + 0.5) p = { x: X0, face: -0.7 };
  else if (t < golpeT - 0.4) p = go(t, cilT + 0.5, golpeT - 0.45, X0, X1, 0.55);
  else if (t < fuegoT - 0.7) p = { x: X1, face: -0.7 };
  else if (t < fuegoT + 0.1) p = go(t, fuegoT - 0.7, fuegoT + 0.05, X1, X2, 0.6);
  else if (t < presionT - 0.6) p = { x: X2, face: -0.7 };
  else p = t < presionT + 0.15 ? go(t, presionT - 0.6, presionT + 0.1, X2, X3, 0.6) : { x: X3, face: -0.7 };
  const station = [S0, S1, S2, S3][[X0, X1, X2, X3].indexOf(p.x)] ?? null;
  const wow = Math.max(hop(t, HIT + 0.05, 0.2), hop(t, milT, 0.12), hop(t, seisT, 0.14), hop(t, memT, 0.1));
  sci.pose(alive({ z: 0.45, ...p, y: wow, squash: (p.walk ? 1 : settle(t, HIT + 0.45, 0.12)) * breathe(t, 4), blink: blinkAt(t, 0.8),
    look: p.walk ? p.look : V(station ?? p.x, 1.0, 2.6), handL: V(p.x - 0.28, 1.08, 0.75), wL: p.walk ? 0.4 : 1, handR: p.walk ? undefined : V(p.x - 0.1, 1.2 + 0.08 * Math.sin(t * 7) * win(t, mediaT, presionT, 0.2), 0.8), wR: p.walk ? 0 : 0.8,
    ...moodAt(t, [[0, 'neutral'], [memT, 'surprised'], [cilT + 0.4, 'neutral'], [HIT, 'surprised'], [tresT + 0.5, 'happy'], [fuegoT, 'worried'], [milT + 0.6, 'surprised'], [presionT, 'neutral'], [seisT, 'surprised']]) }, t, 3.3));
  sci.hand(0, clip.position); clip.position.z += 0.05; clip.rotation.set(-0.3, 0.3, 0.2);
  sci.head.getWorldPosition(T.hS);
  k.glyphAt(okSci, T.hS, 0.05, 0.62, popIn(t, HIT + 0.05, HIT + 1.0) + popIn(t, seisT, c[7]), 0.12 * Math.sin(t * 7));
}

function poseSea(t) {
  const on = t >= c[7] - 0.1;
  boxS.root.visible = diver.root.visible = robot.visible = calendar.visible = lightBeam.visible = on; pings.forEach(m => { m.visible = false; }); bubS.forEach(m => { m.visible = false; }); diverBub.forEach(m => { m.visible = false; });
  if (!on) return;
  const sink = lin(t, c[7], LANDS), y = lerp(5.2, 0, 1 - (1 - sink) ** 1.6);
  boxS.pose({ t, x: SX + 0.3, y, z: 0, ry: t < LANDS ? 0.6 * Math.sin(t * 3) : 0.2, rz: t < LANDS ? 0.2 * Math.sin(t * 4) : 0.05, squash: settle(t, LANDS, 0.2) * breathe(t, 2),
    mood: t < LANDS + 0.3 ? 'surprised' : t < encT ? 'neutral' : 'happy', look: t > buzosT ? V(SX - 1.5, 1, 3) : V(SX, 1.4, 5), glow: t > PULSE0 && ((t - PULSE0) % 1) < 0.22 ? 1 : 0, kk: 0.5 });
  bubS.forEach((m, i) => { const u = (t * 0.9 + i / 12) % 1; m.visible = t < LANDS + 1.5; m.position.set(SX + 0.3 + 0.25 * Math.sin(i * 2.1 + t * 2), y + 0.5 + 1.6 * u, 0.1 + 0.1 * Math.sin(i)); m.scale.setScalar(0.04 * (1 - 0.5 * u) + 0.01); });
  puffSea(t, LANDS, SX + 0.6, 0.2, 1, 0.08); puffSea2(t, LANDS, SX, 0.2, -1, 0.08);
  boxS.beaconPos(T.beac);
  pings.forEach((m, i) => {
    if (t < PULSE0) return; const n = Math.floor(t - PULSE0) - i, age = t - PULSE0 - n; if (n < 0 || age > 1.8) return;
    m.visible = true; m.position.copy(T.beac); m.position.z += 0.05; m.scale.setScalar(0.12 + 1.6 * age); m.material.opacity = 0.9 * (1 - age / 1.8);
  });
  const day = Math.max(1, Math.min(30, Math.round(1 + 29 * prog(t, treintaT - 0.7, treintaT + 0.4))));
  drawDay(day);
  const cal = popIn(t, treintaT - 0.8, buzosT - 0.1);
  calendar.visible = cal > 0.01; calendar.scale.setScalar(Math.max(cal, 0.001)); calendar.position.set(SX + 1.45, 1.45 + 0.05 * Math.sin(t * 2), 0.3); calendar.rotation.z = 0.06 * Math.sin(t * 3) - 0.08 * (day % 2);
  // buzo
  const dw = t < encT - 0.2 ? go(t, buzosT - 0.9, encT - 0.3, SX - 2.4, SX - 0.75, 0.38) : { x: SX - 0.75, face: 0.6 };
  const thumbs = t > encT;
  diver.pose(alive({ z: 0.3, ...dw, y: 0.04 * Math.sin(t * 2) + hop(t, encT + 0.1, 0.14), squash: breathe(t), blink: blinkAt(t, 0.6), look: thumbs ? V(SX - 0.5, 1.4, 4) : V(dw.x + 1.5, 0.9, 2),
    handR: thumbs ? V(SX - 0.42, 1.55 + 0.04 * Math.sin(t * 9), 0.5) : undefined, wR: thumbs ? back(lin(t, encT, encT + 0.3)) : 0, handL: thumbs ? V(SX - 1.1, 1.0, 0.5) : undefined, wL: thumbs ? 1 : 0,
    ...moodAt(t, [[0, 'neutral'], [encT - 0.1, 'happy']]) }, t, 1.9));
  diver.head.getWorldPosition(T.hD);
  diverBub.forEach((m, i) => { const u = (t * 0.8 + i / 6) % 1; m.visible = diver.root.visible && t > buzosT - 0.3; m.position.set(T.hD.x + 0.3 + 0.08 * Math.sin(t * 5 + i), T.hD.y + 0.35 + 1.2 * u, T.hD.z); });
  puffDiver(t, encT - 0.3, SX - 0.75, 0.3, 1, 0.06);
  // robot
  const ry0 = lin(t, robotsT - 0.4, encT - 0.2);
  const rx = lerp(SX + 3.6, SX + 1.4, ry0), ryy = lerp(3.6, 1.35, ry0) + 0.06 * Math.sin(t * 2.5);
  robot.position.set(rx, ryy, 0.1); robot.rotation.z = 0.08 * Math.sin(t * 1.8); robot.visible = t > robotsT - 0.5;
  props.forEach((p, i) => { p.rotation.x = t * 25 + i; });
  const reach = back(lin(t, encT - 0.25, encT + 0.15));
  robotArm.rotation.z = lerp(0.2, -0.95, reach); armSeg.scale.y = lerp(0.35, 1.0, reach); armSeg.position.y = -0.5 * armSeg.scale.y; claw.position.y = -1.0 * armSeg.scale.y;
  robot.userData.pupil.position.x = -0.12 - 0.03 * reach; robot.userData.pupil.position.y = -0.02 * reach;
  lightBeam.visible = robot.visible; lightBeam.position.set(rx - 0.15, ryy - 0.05, 0.2); lightBeam.rotation.z = -0.9 + 0.2 * Math.sin(t * 0.8);
  k.glyphAt(okMark, T.tmp.set(SX + 0.3, 1.05, 0.3), 0, 0.15, popIn(t, encT + 0.1, c[9] + 0.1), 0.1 * Math.sin(t * 6));
  { // remate: el cartel CAJA NEGRA con NEGRA tachado, flotando sobre la caja
    const s2 = popIn(t, c[9] + 0.05, END + 2);
    finalSign.visible = s2 > 0.01; finalSign.position.set(SX + 0.3, 1.85 + 0.05 * Math.sin(t * 2), 0.2); finalSign.scale.setScalar(Math.max(s2, 0.001) * 0.8); finalSign.rotation.z = 0.04 * Math.sin(t * 1.7);
    const st = lin(t, negraT + 0.05, negraT + 0.35); strike.visible = st > 0.01; strike.scale.x = Math.max(st, 0.001) * 0.68;
    const ow = back(lin(t, negraT + 0.45, negraT + 0.75)); orangeWord.visible = ow > 0.01; orangeWord.scale.setScalar(Math.max(ow, 0.001)); orangeWord.position.set(0.32, -0.27, 0.04); orangeWord.rotation.z = -0.12;
    seaSparks.forEach((m, i) => { const kk = popIn(t, nombreT - 0.3, END + 2) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6)); k.glyphAt(m, T.tmp2.set(SX + 0.3, 0.55, 0.2), [-0.7, 0.75, -0.55, 0.65][i], [0.3, 0.35, -0.15, -0.2][i], Math.max(kk, 0), t * 1.5 + i); });
  }
  // vida
  seaFish.forEach(f => { const u = ((t * f.sp + f.off) % 14), x = SX + (f.dir > 0 ? -7 + u : 7 - u); f.g.position.set(x, f.y + 0.1 * Math.sin(t * 2 + f.off), f.z); f.g.rotation.y = f.dir > 0 ? 0 : PI; f.g.userData.tl.rotation.y = 0.5 * Math.sin(t * 9 + f.off); });
  weeds.forEach(g => { g.rotation.z = 0.12 * Math.sin(t * 1.4 + g.userData.ph); g.rotation.x = 0.06 * Math.sin(t * 1.1 + g.userData.ph); });
  snow.forEach((s, i) => { s.m.position.set(s.x0 + 0.2 * Math.sin(t * 0.6 + i), ((s.y0 - t * 0.12) % 5 + 5) % 5, s.z); });
  seaRays.forEach((m, i) => { m.material.opacity = 0.07 + 0.04 * Math.sin(t * 1.3 + i); });
}

// ---------- cámara ----------
k.shots([
  { t: 0, pos: [-0.15, 1.8, 9.4], look: [-0.15, 1.65, 0] },
  { t: noT - 0.05, pos: [-0.95, 2.05, 4.4], look: [-0.95, 2.0, 0] },
  { t: naranjaT - 0.1, pos: [0.1, 1.55, 6.8], look: [0.1, 1.4, 0] },
  { t: naranjaT + 0.55, pos: [0.15, 1.2, 3.2], look: [0.15, 1.05, 0] },
  { t: asiT, pos: [KX - 0.55, 0.55, 2.4], look: [KX - 0.55, 0.3, 0], cut: true },
  { t: restosT - 0.3, pos: [KX - 1.6, 1.9, 8.2], look: [KX - 1.6, 0.9, 0] },
  { t: rapidoT - 0.1, pos: [KX - 1.3, 1.3, 4.2], look: [KX - 1.3, 1.0, 0] },
  { t: aguaT - 1.0, pos: [KX + 0.8, 1.9, 8.8], look: [KX + 0.8, 1.0, 0] },
  { t: aguaT - 0.15, pos: [POND[0] + 0.35, 2.0, 5.0], look: [POND[0] + 0.35, 0.75, 0], glide: true },
  { t: c[2] - 0.42, pos: [POND[0] + 0.35, 2.0, 5.0], look: [POND[0] + 0.35, 0.75, 0], glide: true },
  { t: c[2] - 0.02, pos: [POND[0] + 1.2, 2.2, 4.5], look: [KX + 6.0, 5.2, -5], glide: true },
  { t: c[2], pos: [CK - 0.85, 2.3, 0.35], look: [CK - 0.85, 2.3, -1], cut: true },
  { t: dosT - 0.1, pos: [CK, 1.7, 6.6], look: [CK, 1.7, 0] },
  { t: unoT, pos: [CK - 0.5, 1.7, 3.5], look: [CK - 0.5, 1.65, 0] },
  { t: vocesT + 0.55, pos: [CK - 0.1, 1.6, 5.8], look: [CK - 0.1, 1.55, 0] },
  { t: otroT - 0.1, pos: [CK + 0.55, 1.55, 3.5], look: [CK + 0.55, 1.5, 0] },
  { t: altT - 0.15, pos: [CK - 0.3, 1.25, 5.6], look: [CK - 0.3, 1.05, 0] },
  { t: velT - 0.1, pos: [CK - 0.85, 0.75, 2.4], look: [CK - 0.85, 0.65, 0] },
  { t: rumboT - 0.1, pos: [CK + 0.3, 1.0, 3.4], look: [CK + 0.3, 0.85, 0] },
  { t: c[4] - 0.5, pos: [CK + 0.3, 1.0, 3.4], look: [CK + 0.3, 0.85, 0], glide: true },
  { t: c[4] - 0.25, pos: [CK + 0.85, 2.4, 2.6], look: [CK + 0.85, 2.3, -1], glide: true },
  { t: c[4] - 0.02, pos: [CK + 0.85, 2.3, 0.35], look: [CK + 0.85, 2.3, -1], glide: true },
  { t: c[4], pos: [PX, 1.1, 13.5], look: [PX, 1.1, 0], cut: true },
  { t: colaT - 0.15, pos: [PX - 2.0, 0.75, 4.4], look: [PX - 2.0, 0.6, 0] },
  { t: resisteT - 0.3, pos: [PX - 1.2, 1.0, 8.6], look: [PX - 1.2, 0.85, 0] },
  { t: c[5], pos: [S0, 1.85, 5.6], look: [S0, 1.8, 0], cut: true },
  { t: memT - 0.1, pos: [S0 - 0.2, 1.3, 2.7], look: [S0 - 0.2, 1.25, 0] },
  { t: cilT + 0.3, pos: [S0 + 0.3, 1.6, 5.8], look: [S0 + 0.3, 1.35, 0] },
  { t: golpeT - 0.5, pos: [S1 + 0.3, 1.6, 6.0], look: [S1 + 0.3, 1.4, 0], glide: true },
  { t: HIT, pos: [S1 + 0.1, 1.15, 3.0], look: [S1 + 0.1, 1.0, 0] },
  { t: tresT + 0.6, pos: [S1 + 0.5, 1.5, 6.2], look: [S1 + 0.5, 1.35, 0] },
  { t: fuegoT, pos: [S2 + 0.3, 1.3, 5.4], look: [S2 + 0.3, 1.15, 0], glide: true },
  { t: milT, pos: [S2, 1.0, 2.9], look: [S2, 0.85, 0] },
  { t: mediaT - 0.15, pos: [S2 + 0.4, 1.6, 5.6], look: [S2 + 0.4, 1.5, 0] },
  { t: presionT - 0.1, pos: [S3 + 0.3, 1.4, 5.8], look: [S3 + 0.3, 1.25, 0], glide: true },
  { t: seisT - 0.1, pos: [S3, 1.15, 3.2], look: [S3, 1.05, 0] },
  { t: c[7] - 0.35, pos: [S3, 1.15, 3.2], look: [S3, 1.05, 0], glide: true },
  { t: c[7] - 0.02, pos: [S3, 1.0, 1.25], look: [S3, 1.0, 0], glide: true },
  { t: c[7], pos: [SX + 0.3, 4.3, 6.0], look: [SX + 0.3, 3.9, 0], cut: true },
  { t: LANDS + 0.05, pos: [SX + 0.3, 1.25, 5.4], look: [SX + 0.3, 0.75, 0], glide: true },
  { t: pulsoT - 0.1, pos: [SX + 0.55, 0.85, 2.6], look: [SX + 0.55, 0.65, 0] },
  { t: pulsoT + 1.1, pos: [SX + 0.3, 1.4, 6.8], look: [SX + 0.3, 1.1, 0] },
  { t: treintaT - 0.8, pos: [SX + 1.1, 1.4, 3.6], look: [SX + 1.1, 1.3, 0] },
  { t: buzosT - 0.2, pos: [SX + 0.15, 1.5, 9.0], look: [SX + 0.15, 1.25, 0] },
  { t: robotsT + 0.25, pos: [SX - 1.35, 1.35, 4.0], look: [SX - 1.35, 1.2, 0] },
  { t: encT - 0.3, pos: [SX + 0.2, 1.2, 6.2], look: [SX + 0.2, 1.0, 0] },
  { t: c[9], pos: [SX + 0.25, 1.6, 4.2], look: [SX + 0.25, 1.45, 0] },
  { t: nombreT - 0.35, pos: [SX + 0.1, 1.5, 7.0], look: [SX + 0.1, 1.35, 0] },
]);

// ---------- carteles ----------
tag({ text: '¿Caja negra?', big: true, off: BIG, from: 0.15, to: naranjaT - 0.1 });
tag({ text: '¡Es NARANJA!', big: true, off: BIG, from: naranjaT + 0.1, to: asiT });
tag({ text: 'Restos', at: () => T.tmp2.set(KX - 2.6, 0.2, 0.2), off: [-120, -230], from: restosT, to: rapidoT + 0.2 });
tag({ text: '¡Se ve de lejos!', big: true, off: BIG, from: rapidoT, to: aguaT - 0.5 });
tag({ text: 'Bajo el agua', at: () => BOXW, off: [-150, -260], from: aguaT, to: c[2] });
tag({ text: '2 aparatos', big: true, off: BIG, from: dosT, to: unoT + 0.2 });
tag({ text: 'Voces de cabina', at: () => box1.top(V(0, 0, 0)), off: [-120, -230], from: vocesT - 0.3, to: otroT + 0.2 });
tag({ text: 'Datos de vuelo', at: () => box2.top(V(0, 0, 0)), off: [110, -240], from: datosT - 0.2, to: c[4] });
tag({ text: 'Altura', at: () => G_ALT, off: [-90, 230], from: altT, to: c[4] });
tag({ text: 'Velocidad', at: () => G_VEL, off: [60, 330], from: velT, to: c[4] });
tag({ text: 'Rumbo', at: () => G_RUM, off: [110, 230], from: rumboT, to: c[4] });
tag({ text: '¡En la COLA!', big: true, off: BIG, from: colaT, to: resisteT - 0.2 });
tag({ text: 'Las dos cajas', at: () => { cut.localToWorld(T.p0.set(0, -0.1, 0.1)); return T.p0; }, off: [-80, 300], from: colaT + 0.3, to: c[5] });
tag({ text: 'Lo más resistente', big: true, off: BIG, from: resisteT - 0.1, to: c[5] });
tag({ text: 'Memoria', at: () => T.chip, off: [-40, -260], from: memT + 0.15, to: golpeT - 0.4 });
tag({ text: 'Cilindro blindado', at: () => boxA.top(V(0, 0, 0)), off: [120, -330], from: cilT, to: golpeT - 0.4 });
tag({ text: '3.400 G', big: true, off: BIG, from: tresT, to: fuegoT });
tag({ text: '3.400 veces la gravedad', off: [540, 500], from: tresT + 0.4, to: fuegoT });
tag({ text: '1.100 °C', big: true, off: BIG, from: milT, to: presionT });
tag({ text: '30 minutos', at: () => clock.position, off: [250, -60], from: mediaT, to: presionT });
tag({ text: '6.000 m', big: true, off: BIG, from: seisT, to: c[7] });
tag({ text: 'Presión del mar', at: () => V(S3, 1.5, 0.3), off: [-40, -330], from: presionT + 0.2, to: c[7] });
tag({ text: 'Baliza', at: () => T.beac, off: [200, -200], from: faroT, to: treintaT - 0.6 });
tag({ text: '1 pulso por segundo', big: false, at: () => T.beac, off: [-250, -330], from: pulsoT + 0.2, to: treintaT - 0.5 });
tag({ text: '30 días', big: true, off: BIG, from: treintaT, to: buzosT });
tag({ text: 'Buzo', at: () => T.hD, off: [-60, -260], from: buzosT + 0.1, to: encT });
tag({ text: 'Robot', at: () => robot.position, off: [40, -260], from: robotsT + 0.1, to: encT + 0.2 });
tag({ text: '¡Encontrada!', big: true, off: BIG, from: encT, to: c[9] });
tag({ text: 'Solo el NOMBRE', big: true, off: BIG, from: nombreT - 0.4, to: END + 1 });

// ---------- sonidos ----------
sfx(naranjaT - 0.1, 'riser_to', 1); sfx(naranjaT - 0.1, 'boom', 0.5); sfx(naranjaT + 0.25, 'thud', 0.6);
sfx(rapidoT - 0.15, 'pop', 0.7); sfx(aguaT, 'splash', 0.5);
sfx(dosT, 'pop', 0.7); sfx(dosT + 0.15, 'pop', 0.6);
sfx(colaT, 'riser_to', 0.8);
sfx(memT, 'tap', 0.7);
sfx(HIT, 'riser_to', 1); sfx(HIT, 'thud', 1); sfx(HIT + 0.02, 'clang', 0.7);
sfx(fuegoT, 'hiss', 0.6);
sfx(seisT, 'boom', 0.45);
sfx(c[7] + 0.15, 'splash', 0.7); sfx(LANDS, 'thud', 0.7);
for (let i = 0; i < 6; i++) sfx(PULSE0 + i, 'tap', 0.45);
sfx(encT, 'riser_to', 0.9); sfx(encT, 'pop', 0.8);
sfx(negraT + 0.05, 'tap', 0.7); sfx(nombreT - 0.4, 'boom', 0.4);

k.follow(t => t < asiT ? BOXH : t < c[2] ? BOXL : t < c[5] ? V(CK, 1.5, 0) : V(0, 1, 0));
k.run(t => {
  poseHangar(t); poseField(t); poseCockpit(t); posePlane(t); poseLab(t); poseSea(t);
});
