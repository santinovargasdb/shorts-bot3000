// Episodio: el estafador que vendió la Torre Eiffel (Victor Lustig, 1925), con personajes de caricatura
// hechos por código (lib/toon.js). Cuatro decorados puestos uno al lado del otro en el mundo (PARÍS,
// HOTEL, VÍA, CÁRCEL): la cámara salta de uno a otro. La línea de tiempo cuelga de
// out/eiffel/timing.json (python -m anim3d.narrar eiffel): cada frase es un paso y los cortes caen
// en palabras con at().
//   node capture.mjs --page eiffel.html --out eiffel/video.mp4   ->   python -m anim3d.armar eiffel
import * as THREE from 'three';
import { lerp, prog, lin, win, clamp01, makeStage, makeTags, cutTimes, gradientTex } from '/lib/kit.js';
import { makeToon, flat, outlined, block } from '/lib/toon.js';
import { tex, surface, picture, facade, painting, windowPic, cloud, tree, lamp, hills, makeLight } from '/lib/decor.js';

const timing = await (await fetch('/out/eiffel/timing.json')).json();
const END = timing.duration; window.DURATION = END;
const c = timing.frases.map(f => f.start);
const at = (word, from) => (timing.words.find(w => w.start >= from && w.text.toLowerCase().startsWith(word)) || { start: from }).start;

const vendT = at('vendió', 0) - 0.2, suyaT = at('suya', 0) - 0.3;
const rustT = at('oxidada', c[1]) - 0.4, caroT = at('carísimo', c[1]) - 0.3;
const stampT = at('falsifica', c[2]), subT = at('subdirector', c[2]) - 0.3, citaT = at('cita', c[2]) - 0.25;
const desT = at('desarmar', c[3]) - 0.35, tonT = at('siete', c[3]) - 0.25;
const pickT = at('víctima', c[4]) - 0.35, poiT = at('andré', c[4]) - 0.25;
const coimaT = at('pide', c[5]) - 0.2;
const okT = at('funciona', c[6]) - 0.15, funcT = at('funcionario', c[6]) - 0.3;
const payT = at('paga', c[7]) - 0.3, fleeT = at('menos', c[7]) - 0.3, trainT = at('lustig', c[7]) - 0.3;
const nuncaT = at('nunca', c[8]) - 0.25;
const otraT = at('venderla', c[9]) - 0.3;
const poliT = at('sospecha', c[10]) - 0.2, huyeT = at('huye', c[10]) - 0.3, usaT = at('estados', c[10]) - 0.2;
const jailT = at('termina', c[11]) - 0.2, alcT = at('alcatraz', c[11]) - 0.2;

await document.fonts.load('800 100px Montserrat');
const { renderer, scene, camera } = makeStage({ fov: 38, shadows: true });
renderer.toneMapping = THREE.NoToneMapping;
scene.background = gradientTex([[0, '#5fb0ea'], [0.55, '#bfe6f7'], [1, '#fdf3d6']]);
const light = makeLight(scene);                            // sol de costado con sombras largas + ambiente violeta
const PI = Math.PI, HX = 40, TX = 80, JX = 120;            // dónde está cada decorado
const SFX = []; window.SFX = SFX;
const sfx = (t, name, vol = 0.6) => SFX.push([+t.toFixed(3), name, vol]);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const basic = color => new THREE.MeshBasicMaterial({ color });
const drift = [], sway = [];                                // nubes que pasan y árboles que se mecen: nada queda quieto
const cloudD = (x, y, z, s) => { const g = cloud(scene, x, y, z, s); g.userData.x0 = x; drift.push(g); };
const treeD = (...a) => { sway.push(tree(scene, ...a)); };
const INK = basic(0x15171c);

// ---------- piezas ----------
function plane(parent, color, w, h, x, y, z, flatOnGround = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), color.isMaterial ? color : basic(color));
  if (flatOnGround) m.rotation.x = -PI / 2; m.position.set(x, y, z); parent.add(m); return m;
}
/** Trazo negro por una lista de puntos 2D (para dibujar contornos de formas planas). */
function stroke(parent, pts, w = 0.05, closed = true, z = 0.01) {
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(dx, dy) + w, w), INK);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z); m.rotation.z = Math.atan2(dy, dx); parent.add(m);
  }
}
function poly(parent, pts, color, w = 0.05) {
  const g = new THREE.Group(); parent.add(g);
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])))), basic(color)));
  stroke(g, pts, w); return g;
}
/** Cartel con texto (rectángulo con borde). */
function sign(text, w, h, { bg = '#ffffff', fg = '#15171c' } = {}) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w); const g = cv.getContext('2d');
  g.fillStyle = '#15171c'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = bg; g.fillRect(12, 12, cv.width - 24, cv.height - 24);
  const size = Math.min(cv.height * 0.56, (cv.width - 60) / (text.length * 0.66));
  g.font = `800 ${size}px Montserrat`; g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cv.width / 2, cv.height / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}
/** Un signo suelto (?, !, $, ✓) con borde negro, siempre por delante. */
function glyph(text, color, size = 0.6) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  g.font = '800 190px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 30; g.strokeStyle = '#15171c'; g.strokeText(text, 128, 138); g.fillStyle = color; g.fillText(text, 128, 138);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
  m.renderOrder = 10; m.visible = false; scene.add(m); return m;
}
function wheel(parent, x, y, z, r = 0.2) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 20), INK));
  const hub = new THREE.Mesh(new THREE.CircleGeometry(r * 0.45, 14), basic(0xb9bec8)); hub.position.z = 0.005; g.add(hub);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.2, r * 0.8), INK); mark.position.z = 0.01; g.add(mark);     // para que se vea girar
  return g;
}

// ---------- movimiento ----------
const back = x => { x = clamp01(x); const k = 1.70158; return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2; };
const settle = (t, t0, amp = 0.12) => t < t0 ? 1 : 1 - amp * Math.exp(-6 * (t - t0)) * Math.cos(18 * (t - t0));
const hop = (t, t0, h = 0.16, d = 0.4) => { const u = lin(t, t0, t0 + d); return h * 4 * u * (1 - u); };
const blinkAt = (t, k) => { const u = ((t + k) % 2.3) / 0.14; return u < 1 ? Math.sin(PI * u) : 0; };
const breathe = (t, k = 0) => 1 + 0.012 * Math.sin(t * 2.6 + k);
/** Aparece con rebote en t0 y se va en t1. */
const popIn = (t, t0, t1, d = 0.28) => back(lin(t, t0, t0 + d)) * (1 - prog(t, t1 - 0.15, t1));
/** Caminar de x0 a x1 entre t0 y t1 (los pies no patinan: el paso sale de la distancia). */
function go(t, t0, t1, x0, x1, stride = 0.46) {
  const x = lerp(x0, x1, lin(t, t0, t1));
  return { x, phase: Math.abs(x - x0) / (2 * stride), walk: win(t, t0 - 0.02, t1 + 0.14, 0.12), stride, face: x1 > x0 ? PI / 2 : -PI / 2,
    lean: stride > 0.6 ? 0.3 : 0, look: V(x + Math.sign(x1 - x0) * 1.5, 1.25, 3.2), squash: settle(t, t1) };
}
function moodAt(t, keys) {
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  return { mood: keys[Math.max(i - 1, 0)][1], mood2: keys[i][1], mix: i ? lin(t, keys[i][0], keys[i][0] + 0.12) : 1 };
}

// =====================================================================================
// PARÍS: la torre al fondo, el cartel de venta, la limusina
// =====================================================================================
surface(scene, tex.cobble({}, 15, 10), 44, 30, 0, 0, 0, true);
hills(scene, 1, -13, [[-4, 4.5, 0xa9d3a2], [3, 5.2, 0x97c88f]]);
cloudD(-2.6, 6.0, -11, 1.1); cloudD(3.2, 7.2, -11, 0.9); cloudD(0.3, 8.4, -11, 0.7); cloudD(-5.5, 7.6, -11, 1);
facade(scene, -6.4, -4.6, 3.3, -7, { seed: 1 }); facade(scene, -4.6, -2.8, 2.7, -7, { wall: '#e9c3a8', shutter: '#3f6ea8', seed: 2 });
facade(scene, -2.8, -0.8, 3.6, -7, { wall: '#f3e2bd', shutter: '#a8504a', awning: '#3f8f6b', seed: 3 });
facade(scene, 3.0, 4.9, 3.1, -7, { wall: '#e3cfe6', shutter: '#4f8f6b', awning: '#3f6ea8', seed: 4 }); facade(scene, 4.9, 6.8, 2.6, -7, { seed: 5 });
treeD(-3.1, -3.4); treeD(3.5, -3.6, { h: 2.6, leaf: 0x6dbb58 }); lamp(scene, -2.15, -1.0); lamp(scene, 2.7, -1.6);
{ const sh = new THREE.Mesh(new THREE.CircleGeometry(1.7, 30), new THREE.MeshBasicMaterial({ color: 0x3a2a4a, transparent: true, opacity: 0.22 })); sh.rotation.x = -PI / 2; sh.scale.y = 0.35; sh.position.set(1.4, 0.01, -4.9); scene.add(sh); }
// La torre: tres tramos de silueta (así después se puede "desarmar")
const TW = [[0, 1.3], [0.6, 0.98], [1.25, 0.72], [1.85, 0.52], [2.45, 0.38], [3.1, 0.26], [3.8, 0.17], [4.5, 0.1], [4.95, 0.06]];
const widthAt = y => { for (let i = 1; i < TW.length; i++) if (y <= TW[i][0]) return lerp(TW[i - 1][1], TW[i][1], (y - TW[i - 1][0]) / (TW[i][0] - TW[i - 1][0])); return 0.03; };
const tower = new THREE.Group(); tower.position.set(1.1, 0, -5); scene.add(tower);
const IRON = 0x9a7f66, IRON_DARK = 0x6a5646;
// Por dónde pasa el borde interior de cada pata (el arco de abajo); arriba del arco la torre es maciza.
const ARCH = [[0, 0.84], [0.3, 0.8], [0.55, 0.68], [0.76, 0.48], [0.9, 0.24], [0.96, 0]];
const innerAt = y => { if (y >= 0.96) return 0; for (let i = 1; i < ARCH.length; i++) if (y <= ARCH[i][0]) return lerp(ARCH[i - 1][1], ARCH[i][1], (y - ARCH[i - 1][0]) / (ARCH[i][0] - ARCH[i - 1][0])); return 0; };
/** Enrejado de hierro entre dos alturas: travesaño + cruces, en una o dos columnas. */
function lattice(g, y0, a, b, xl, xr, cols) {
  const L = y => [xl(y0 + y), y], R = y => [xr(y0 + y), y], mix = (p, q, k) => [lerp(p[0], q[0], k), p[1]];
  stroke(g, [L(a), R(a)], 0.03, false, 0.012);
  for (let c = 0; c < cols; c++) {
    const a0 = mix(L(a), R(a), c / cols), a1 = mix(L(a), R(a), (c + 1) / cols), b0 = mix(L(b), R(b), c / cols), b1 = mix(L(b), R(b), (c + 1) / cols);
    stroke(g, [a0, b1], 0.02, false, 0.012); stroke(g, [a1, b0], 0.02, false, 0.012);
    if (c) stroke(g, [a0, b0], 0.02, false, 0.012);
  }
}
function towerPart(y0, y1, { arch = false, deck = 0, rows = 4 } = {}) {
  const n = 10, ys = Array.from({ length: n + 1 }, (_, i) => lerp(y0, y1, i / n));
  let pts = [...ys.map(y => [-widthAt(y), y - y0]), ...ys.slice().reverse().map(y => [widthAt(y), y - y0])];
  if (arch) pts = [...pts, ...ARCH.map(([y, x]) => [x, y]), ...ARCH.slice(0, -1).reverse().map(([y, x]) => [-x, y])];
  const g = poly(tower, pts, IRON, 0.06); g.position.y = y0; g.userData.y0 = y0;
  for (let k = 0; k < rows; k++) {
    const a = (y1 - y0) * k / rows + 0.02, b = (y1 - y0) * (k + 1) / rows - 0.02, w = widthAt(y0 + a);
    if (arch && innerAt(a) > 0.05) {              // cada pata por separado
      lattice(g, y0, a, b, y => -widthAt(y), y => -Math.max(innerAt(y), 0.02), 1); lattice(g, y0, a, b, y => Math.max(innerAt(y), 0.02), y => widthAt(y), 1);
    } else lattice(g, y0, a, b, y => -widthAt(y), y => widthAt(y), w > 0.45 ? 3 : w > 0.2 ? 2 : 1);
  }
  if (arch) stroke(g, [...ARCH.map(([y, x]) => [x * 0.93, y * 0.93]), ...ARCH.slice(0, -1).reverse().map(([y, x]) => [-x * 0.93, y * 0.93])].map(([x, y]) => [x, y + 0.07]), 0.03, false, 0.012);
  if (deck) {                                     // plataforma con baranda
    const w = widthAt(y0) + deck, d = poly(g, [[-w, -0.06], [-w, 0.09], [w, 0.09], [w, -0.06]], IRON_DARK, 0.045); d.position.z = 0.015;
    for (let x = -w + 0.08; x < w - 0.02; x += 0.12) stroke(g, [[x, 0.09], [x, 0.2]], 0.018, false, 0.02);
    stroke(g, [[-w, 0.2], [w, 0.2]], 0.022, false, 0.02);
  }
  return g;
}
const towerParts = [
  towerPart(0, 1.25, { arch: true, rows: 5 }),
  towerPart(1.25, 2.45, { deck: 0.14, rows: 4 }), towerPart(2.45, 4.95, { deck: 0.1, rows: 9 }),
];
{ // punta: cabina, antena y banderita
  const top = towerParts[2], y = 4.95 - 2.45;
  const cab = poly(top, [[-0.1, y], [-0.1, y + 0.16], [0.1, y + 0.16], [0.1, y]], IRON_DARK, 0.04); cab.position.z = 0.015;
  stroke(top, [[0, y + 0.16], [0, y + 0.62]], 0.03, false, 0.02);
  [0x3b5fc4, 0xffffff, 0xd63c3c].forEach((col, i) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.15), basic(col)); f.position.set(0.055 + i * 0.08, y + 0.53, 0.02); top.add(f); });
  stroke(top, [[0.015, y + 0.455], [0.255, y + 0.455], [0.255, y + 0.605], [0.015, y + 0.605]], 0.018, true, 0.025);
}
const rust = [[-0.5, 0.9], [0.45, 1.6], [-0.2, 2.1], [0.12, 2.9], [0.95, 0.45], [-0.06, 3.7], [0.3, 1.1]].map(([x, y]) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 14), basic(0xd9682b)); m.position.set(x, y, 0.03); tower.add(m); return m;
});
// Cartel "SE VENDE"
const sale = new THREE.Group(); sale.position.set(0.05, 0, 0); scene.add(sale);
block(sale, 0x7a4b2a, -0.04, 0.04, 0, 1.25, 0.03, -0.03, 0.015);
const saleSign = sign('SE VENDE', 0.95, 0.5, { bg: '#ffd23a' }); saleSign.position.set(0, 1.5, 0.02); sale.add(saleSign);
// Diario
const paper = new THREE.Group(); scene.add(paper);
paper.add(sign('LE JOURNAL', 0.52, 0.36)); paper.visible = false;
// Limusina
const limo = new THREE.Group(); limo.position.z = 1.1; scene.add(limo);
block(limo, 0x23262d, -1.55, 1.55, 0.2, 0.62, 0.25, -0.25); block(limo, 0x23262d, -0.95, 1.0, 0.62, 1.02, 0.25, -0.25);
for (const x of [-0.6, 0, 0.6]) {
  plane(limo, 0xcfeaf7, 0.46, 0.28, x, 0.8, 0.262);
  const h = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), basic(0xf2c9a4)); h.position.set(x, 0.77, 0.266); limo.add(h);
  for (const e of [-0.035, 0.035]) { const eye = new THREE.Mesh(new THREE.CircleGeometry(0.014, 8), INK); eye.position.set(x + e + 0.02, 0.79, 0.27); limo.add(eye); }
}
plane(limo, 0xffd23a, 0.1, 0.1, 1.5, 0.45, 0.262);
const limoWheels = [wheel(limo, -1.0, 0.2, 0.27), wheel(limo, 1.0, 0.2, 0.27)];

// =====================================================================================
// HOTEL
// =====================================================================================
surface(scene, tex.stripes({}, 20, 5.5), 44, 12, HX, 6, -2.2);
surface(scene, tex.planks({ base: '#8f5c33', line: '#5f3b1f' }, 40, 1), 44, 1.05, HX, 0.525, -2.19); plane(scene, INK, 44, 0.07, HX, 1.07, -2.18); plane(scene, INK, 44, 0.05, HX, 0.03, -2.17);
surface(scene, tex.planks({ base: '#c08a54', line: '#8f5f33', seed: 9 }, 10, 7), 44, 30, HX, 0.001, 0, true);
for (const [r, col] of [[1.75, 0xd9a441], [1.62, 0x9a2f3f], [1.05, 0xb5404f]]) { const rug = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshLambertMaterial({ color: col })); rug.rotation.x = -PI / 2; rug.scale.y = 0.5; rug.position.set(HX + 0.35, 0.004 + (1.8 - r) * 0.002, 0.1); rug.receiveShadow = true; scene.add(rug); }
const hotelSign = sign('HÔTEL DE CRILLON', 2.3, 0.5, { bg: '#7a2f3e', fg: '#ffd23a' }); hotelSign.position.set(HX, 5.2, -2.15); scene.add(hotelSign);
windowPic(scene, 0.95, 1.3, HX - 0.15, 2.5, -2.16); windowPic(scene, 0.95, 1.3, HX + 2.9, 2.5, -2.16);
painting(scene, 0.8, 0.6, HX + 1.35, 2.35, -2.16, 1); painting(scene, 0.6, 0.75, HX - 1.9, 2.4, -2.16, 2);
for (const x of [0.6, -1.05, 2.1]) {                        // apliques de pared, con su resplandor
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.35 })); glow.position.set(HX + x, 2.55, -2.17); scene.add(glow);
  const sc = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 10, 1, true), flat(0xfff3c4, { side: THREE.DoubleSide })), 0.014); sc.position.set(HX + x, 2.55, -2.08); scene.add(sc);
  block(scene, 0xd9a441, HX + x - 0.02, HX + x + 0.02, 2.3, 2.48, -2.06, -2.1, 0.01);
}
{ const pot = new THREE.Group(); pot.position.set(HX + 2.35, 0, -1.2); scene.add(pot); block(pot, 0xb5654a, -0.18, 0.18, 0, 0.36, 0.18, -0.18, 0.016);
  for (const [dx, dy, r] of [[0, 0.75, 0.3], [-0.2, 0.55, 0.22], [0.2, 0.58, 0.22]]) { const lf = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat(0x4f9a5a)), 0.02); lf.position.set(dx, dy, 0); pot.add(lf); } }
block(scene, 0x7a4b2a, HX - 1.62, HX - 0.88, 0, 0.74, 0.5, 0.12);                    // escritorio
block(scene, 0x9a6638, HX - 1.68, HX - 0.82, 0.74, 0.82, 0.56, 0.06);
const DESK = V(HX - 1.25, 0.94, 0.4);
const letter = sign('MINISTÈRE', 0.36, 0.3); letter.position.copy(DESK); letter.rotation.x = -0.5; scene.add(letter);
const seal = new THREE.Mesh(new THREE.CircleGeometry(0.06, 18), basic(0xd63c3c)); seal.position.set(0.1, -0.07, 0.01); letter.add(seal);
const stamper = new THREE.Group(); scene.add(stamper);
block(stamper, 0xd63c3c, -0.05, 0.05, 0, 0.07, 0.05, -0.05, 0.012); block(stamper, 0x23262d, -0.025, 0.025, 0.07, 0.2, 0.025, -0.025, 0.012);
// Flecha que elige a la víctima
const arrow = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), flat(0xffd23a)), 0.02); arrow.rotation.x = PI; scene.add(arrow);
// Valija con la plata
const bag = new THREE.Group(); scene.add(bag);
block(bag, 0x9a6638, -0.19, 0.19, -0.3, -0.04, 0.06, -0.06, 0.016); block(bag, 0x23262d, -0.06, 0.06, -0.04, 0, 0.02, -0.02, 0.01);
const bagMark = glyph('$', '#ffd23a', 0.2); bag.add(bagMark); bagMark.position.set(0, -0.17, 0.07); bagMark.visible = true; bagMark.material.depthTest = true;

// =====================================================================================
// VÍA (el tren a Austria) y CÁRCEL
// =====================================================================================
surface(scene, tex.grass({}, 14, 10), 44, 30, TX, 0.001, 0, true);
hills(scene, TX, -9, [[-3.5, 3.4, 0x9ad17a], [1.5, 4.4, 0x86c56c], [5.5, 2.8, 0x9ad17a]]);
cloudD(TX - 2.5, 5.6, -10, 1); cloudD(TX + 2.6, 6.8, -10, 0.8);
treeD(TX - 2.7, -2.6, { pine: true, leaf: 0x3f8f5a }); treeD(TX + 2.0, -3.2, { pine: true, leaf: 0x4a9a62 }); treeD(TX + 3.3, -1.9, { pine: true, leaf: 0x3f8f5a }); treeD(TX - 4.2, -3.8, { pine: true, leaf: 0x4a9a62 }); treeD(TX - 0.6, -4.4, { pine: true, leaf: 0x3f8f5a });
{ const bed = surface(scene, tex.cobble({ base: '#b3a995', line: '#8f8674', rows: 5, cols: 9 }, 30, 1), 44, 1.0, TX, 0.004, 0.4, true); bed.material.color.set(0xdddddd); }
plane(scene, INK, 44, 0.08, TX, 0.12, 0.4);
for (let i = -12; i < 12; i++) plane(scene, 0x7a4b2a, 0.12, 0.3, TX + i * 0.7, 0.06, 0.4);
for (const x of [-3.2, 0.9, 4.6]) { block(scene, 0x7a4b2a, TX + x - 0.05, TX + x + 0.05, 0, 2.6, -0.85, -0.95, 0.014); block(scene, 0x7a4b2a, TX + x - 0.4, TX + x + 0.4, 2.3, 2.38, -0.86, -0.94, 0.012); }
const train = new THREE.Group(); train.position.z = 0.1; scene.add(train);
block(train, 0xc8443a, 0.2, 1.7, 0.3, 1.1, 0.3, -0.3); block(train, 0xc8443a, 0.2, 0.85, 1.1, 1.65, 0.3, -0.3); block(train, 0x23262d, 1.25, 1.45, 1.1, 1.55, 0.1, -0.1);
plane(train, 0xcfeaf7, 0.34, 0.3, 0.52, 1.36, 0.312);
block(train, 0x3f8f6b, -1.9, 0.05, 0.3, 1.1, 0.3, -0.3); block(train, 0x23262d, 0.05, 0.2, 0.5, 0.6, 0.05, -0.05, 0.01);
plane(train, 0xffd23a, 1.5, 0.07, 0.95, 0.72, 0.312); plane(train, 0xffd23a, 1.95, 0.07, -0.925, 0.72, 0.312);
for (const x of [-1.45, -0.925, -0.4]) { plane(train, INK, 0.36, 0.3, x, 0.9, 0.311); plane(train, 0xcfeaf7, 0.3, 0.24, x, 0.9, 0.313); }
block(train, 0x23262d, 0.12, 0.93, 1.65, 1.73, 0.36, -0.36, 0.014); block(train, 0x23262d, 1.7, 1.86, 0.3, 0.52, 0.28, -0.28, 0.014);
const trainWheels = [-1.5, -0.4, 0.5, 1.35].map(x => wheel(train, x, 0.3, 0.32, 0.19));
const smoke = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); scene.add(m); return m; });

surface(scene, tex.bricks({ base: '#aab3be', mortar: '#7c8591', rows: 9, cols: 4 }, 12, 3.4), 44, 12, JX, 6, -1.6);
surface(scene, tex.tiles({ base: '#8f99a5', line: '#6c7682', n: 3 }, 14, 10), 44, 30, JX, 0.001, 0, true); plane(scene, INK, 44, 0.07, JX, 0.035, -1.59);
picture(scene, 0.8, 0.7, JX - 0.85, 2.35, -1.58, (g, W, H) => { g.fillStyle = '#9fd0ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#1e1428'; for (let i = 1; i < 5; i++) g.fillRect(i * W / 5 - 7, 0, 14, H); g.lineWidth = 22; g.strokeStyle = '#1e1428'; g.strokeRect(0, 0, W, H); });
{ const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.6), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.16, depthWrite: false })); ray.position.set(JX - 0.1, 1.2, -1.0); ray.rotation.z = 0.62; scene.add(ray); }
block(scene, 0x5d6772, JX + 0.75, JX + 2.1, 0.38, 0.5, -0.55, -1.5); block(scene, 0xe9e4d6, JX + 0.78, JX + 2.07, 0.5, 0.6, -0.58, -1.47, 0.014); block(scene, 0x5d6772, JX + 0.78, JX + 0.86, 0, 0.38, -0.58, -0.66, 0.012);
picture(scene, 0.5, 0.3, JX + 1.2, 1.7, -1.58, (g, W, H) => { g.strokeStyle = '#4a525e'; g.lineWidth = 7; for (let k = 0; k < 2; k++) { for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(20 + k * 120 + i * 20, 20); g.lineTo(20 + k * 120 + i * 20, H - 20); g.stroke(); } g.beginPath(); g.moveTo(8 + k * 120, H - 28); g.lineTo(92 + k * 120, 28); g.stroke(); } });
const bars = new THREE.Group(); bars.position.set(JX, 0, 0.5); scene.add(bars);
for (let i = -5; i <= 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 10), INK); b.position.set(i * 0.3, 1.7, 0); bars.add(b); }
for (const y of [0.25, 2.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.09, 0.09), INK); b.position.y = y; bars.add(b); }
const bills = new THREE.Group(); scene.add(bills);
[-0.5, 0, 0.5].forEach((a, i) => { const b = sign('100', 0.3, 0.16, { bg: '#8fd08a' }); b.position.set(Math.sin(a) * 0.14, 0.12 + Math.cos(a) * 0.05, i * 0.004); b.rotation.z = -a; bills.add(b); });

// ---------- signos y polvo ----------
const sparks = [0, 1, 2, 3].map(() => glyph('✦', '#fff1a8', 0.34));
const qMark = glyph('?', '#ffd23a', 0.55), okMark = glyph('✓', '#59c36a', 0.6), bangMark = glyph('!', '#ffd23a', 0.6);
const cash = [0, 1, 2].map(() => glyph('$', '#59c36a', 0.26));
const dust = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
function puffs(t, t0, x, z, dir, from) {
  for (let i = 0; i < 4; i++) {
    const m = dust[from + i], u = (t - t0 - i * 0.05) / 0.55;
    m.visible = u > 0 && u < 1; if (!m.visible) continue;
    m.position.set(x + dir * (0.15 + 0.5 * u + i * 0.08), 0.1 + 0.25 * u * (0.5 + i * 0.3), z + 0.1 * (i - 1.5));
    m.scale.setScalar(0.5 + 1.3 * u); m.material.opacity = 0.85 * (1 - u);
  }
}

// ---------- personajes ----------
const lustig = makeToon({ shirt: 0x2f6b4f, hair: 0x2b2118, hat: { type: 'fedora', color: 0x3a3f4d, band: 0x8f2433 }, mustache: true, detail: ['collar', 'tie', 'buttons'] }); scene.add(lustig.root);
const convict = makeToon({ shirt: 0xf08a24, hair: 0x2b2118, mustache: true, detail: ['stripes'] }); scene.add(convict.root);
const DX = [HX - 0.55, HX + 0.11, HX + 0.77, HX + 1.43], POI = 2;                                // dónde se para cada chatarrero
const dealers = [
  makeToon({ shirt: 0x8a6bbf, hair: 0x6b4a2a, hat: { type: 'bowler', color: 0x2b2f3a, band: 0x15171c }, detail: ['buttons'] }),
  makeToon({ shirt: 0xe0a030, hair: 0x23262d, hat: { type: 'boater', color: 0xf0d78a, band: 0xc8443a }, detail: ['apron'], trim: 0x9aa0a8 }),
  makeToon({ shirt: 0x3b82c4, hair: 0xe0b050, detail: ['apron', 'collar'], trim: 0xf4f1e8 }),
  makeToon({ shirt: 0xc8553d, hair: 0x9aa0a8, mustache: true, detail: ['buttons', 'belt'] }),
];
dealers.forEach(d => scene.add(d.root));
const poisson = dealers[POI], PX = DX[POI];
const police = makeToon({ shirt: 0x2f4a8a, hair: 0x1b2440, hat: { type: 'kepi', color: 0x1b2440 }, detail: ['buttons', 'badge', 'belt'] }); scene.add(police.root);
// Gente de fondo: transeúntes en París y un mozo en el hotel. En la referencia siempre hay alguien más moviéndose.
const extras = [
  { toon: makeToon({ shirt: 0xb5654a, hair: 0x23262d, hat: { type: 'bowler', color: 0x4a3222 }, detail: ['buttons'] }), cx: 0, z: -2.3, speed: 0.95, off: 2, dir: 1 },
  { toon: makeToon({ shirt: 0x6a8fd0, hair: 0xc98a3a, detail: ['collar'] }), cx: 0, z: -2.9, speed: 0.8, off: 8, dir: -1 },
  { toon: makeToon({ shirt: 0xd9b23a, hair: 0x6b4a2a, hat: { type: 'boater', color: 0xf0d78a, band: 0x3f6ea8 }, detail: ['belt'] }), cx: 0, z: -2.0, speed: 1.1, off: 11, dir: 1 },
  { toon: makeToon({ shirt: 0x23262d, hair: 0x23262d, detail: ['apron', 'collar'], trim: 0xffffff }), cx: HX, z: -1.35, speed: 0.75, off: 4, dir: -1, tray: true },
];
extras.forEach(x => scene.add(x.toon.root));
const tray = new THREE.Group(); scene.add(tray);
{ const d = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), flat(0xdfe3ea)), 0.014); tray.add(d); const gl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.12, 10), flat(0xcfeaf7)), 0.01); gl.position.set(0.06, 0.07, 0); tray.add(gl); }
function poseExtras(t) {
  for (const x of extras) {
    const span = 13, u = (t * x.speed + x.off) % span, px = x.cx + (x.dir > 0 ? -6.5 + u : 6.5 - u), o = { x: px, z: x.z, face: x.dir > 0 ? PI / 2 : -PI / 2, walk: 1, phase: u / 0.92, look: V(px + x.dir * 1.5, 1.25, 3), blink: blinkAt(t, x.off) };
    if (x.tray) { o.handR = V(px + x.dir * 0.2, 1.22, x.z + 0.22); o.wR = 1; }
    x.toon.pose(o);
    if (x.tray) { x.toon.hand(1, tray.position); tray.position.y += 0.06; }
  }
}
const birds = [[0, 5.6, 0], [0, 6.3, 5], [0, 5.1, 10], [TX, 5.8, 2], [TX, 6.6, 9]].map(([cx, y, off]) => {
  const g = new THREE.Group(); g.userData = { cx, y, off }; scene.add(g);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.035), INK); w.geometry.translate(s * 0.1, 0, 0); g.add(w); }
  return g;
});
const coins = Array.from({ length: 18 }, (_, i) => { const m = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 16), flat(0xffd23a)), 0.014); m.visible = false; m.userData = { vx: ((i * 7) % 9 - 4) * 0.09, spin: 5 + (i % 5) * 2, x0: ((i * 5) % 9 - 4) * 0.06 }; scene.add(m); return m; });
const speed = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.025), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
const sweat = [0, 1, 2].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const rat = new THREE.Group(); scene.add(rat);
{ const b = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), flat(0x8c8f99)), 0.014); b.scale.set(1.6, 0.9, 0.9); b.position.y = 0.09; rat.add(b);
  const ear = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), flat(0xd9a0a8)), 0.008); ear.position.set(-0.1, 0.17, 0.03); rat.add(ear);
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.02), INK); tail.position.set(0.24, 0.08, 0); rat.add(tail); }
/** Mano que gesticula delante del pecho mientras "habla". */
const talk = (t, x, z, side, k = 0) => V(x + side * (0.3 + 0.05 * Math.sin(t * 6.3 + k)), 1.02 + 0.14 * Math.sin(t * 7.1 + k), z + 0.32);
/** Nadie queda duro: balanceo de cabeza, de cuerpo y un rebote chico, distinto para cada uno. */
const alive = (p, t, k = 0) => { p.tilt = (p.tilt || 0) + 0.05 * Math.sin(t * 2.1 + k); p.lean = (p.lean || 0) + 0.025 * Math.sin(t * 2.7 + k); p.bob = 0.012 * Math.sin(t * 5.2 + k); return p; };
const head = { l: V(0, 0, 0), p: V(0, 0, 0), cop: V(0, 0, 0), d1: V(0, 0, 0) }, tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), hand = V(0, 0, 0);
const trainX = t => TX - 5 + 5.3 * lin(t, trainT, c[8]) ** 0.7;
const LX = HX - 0.5;                                       // Lustig en el mano a mano con Poisson
const SALE_HAND = V(-0.5, 1.42, 0.15);

function poseLustig(t) {
  let p; stamper.visible = false;
  if (t < c[1]) {                                    // presenta el cartel
    p = { x: -0.95, face: 0.35, y: hop(t, suyaT, 0.14), squash: settle(t, suyaT + 0.4, 0.1) * breathe(t),
      look: t < vendT ? V(1.6, 2.2, 3) : V(0, 1.5, 9), handR: SALE_HAND, wR: back(lin(t, vendT, vendT + 0.3)), mood: 'happy' };
  } else if (t < c[2]) {                             // lee el diario
    const x = -0.95; paper.position.set(x + 0.04, 0.88, 0.42);
    p = { x, face: 0.2, squash: breathe(t), look: V(x + 0.05, 1.05, 2.6), handL: V(x - 0.2, 0.84, 0.4), handR: V(x + 0.28, 0.84, 0.4),
      ...moodAt(t, [[0, 'neutral'], [rustT - 0.5, 'surprised']]) };
  } else if (t < c[5]) {                             // en el hotel, detrás del escritorio
    const x = HX - 1.25, s1 = stampT + 0.35, s2 = stampT + 1.0;
    const down = Math.max(win(t, s1 - 0.1, s1 + 0.14, 0.09), win(t, s2 - 0.1, s2 + 0.14, 0.09)), stamping = win(t, c[2] + 0.05, subT, 0.2);
    stamper.position.set(DESK.x + 0.1, DESK.y - 0.06 + 0.2 * (1 - down), DESK.z + 0.03); stamper.visible = stamping > 0.05;
    seal.visible = t > s1;
    tmp.copy(stamper.position); tmp.y += 0.2;
    const whisper = win(t, c[3] + 0.1, desT, 0.25), point = win(t, pickT, c[5], 0.25);
    p = { x, z: -0.2, face: lerp(0.3, 0.75, prog(t, citaT, citaT + 0.4)), y: hop(t, subT, 0.12), squash: settle(t, subT + 0.4, 0.1) * breathe(t), lean: 0.14 * whisper,
      look: t < subT ? V(DESK.x, 1.05, 2.8) : t < citaT ? V(HX - 1, 1.5, 9) : V(HX + 1.2, 1.3, 3),
      handR: stamping > 0.05 ? tmp : V(x + 0.55, 1.2, 0.25), wR: Math.max(stamping, back(point)),
      handL: V(x + 0.24, 1.3, 0.2), wL: whisper,
      ...moodAt(t, [[0, 'effort'], [subT, 'happy'], [citaT, 'neutral'], [c[3], 'sly']]) };
  } else if (t < trainT) {                           // mano a mano con Poisson: pide la coima, cobra y sale corriendo
    if (t < fleeT + 0.25) {
      const ask = back(lin(t, coimaT, coimaT + 0.3)), got = prog(t, payT + 0.25, payT + 0.55), wind = prog(t, fleeT, fleeT + 0.22);
      p = { x: LX, face: lerp(0.9, -PI / 2, prog(t, fleeT, fleeT + 0.25)), squash: breathe(t) * (1 - 0.14 * wind), crouch: 0.6 * wind, lean: -0.2 * wind,
        look: V(PX, 1.35, 2.6), handR: tmp.set(LX + 0.42, lerp(1.02, 0.78, got), 0.3), wR: ask * (1 - wind),
        ...moodAt(t, [[0, 'neutral'], [coimaT, 'sly'], [payT + 0.3, 'happy']]) };
    } else p = { ...go(t, fleeT + 0.25, fleeT + 1.3, LX, HX - 5, 0.72), mood: 'happy' };
  } else if (t < c[8]) {                             // arriba del tren
    const x = trainX(t) - 0.95, y = 1.1 + 0.02 * Math.sin(t * 22);
    p = { x, y, z: 0.1, face: 0.3, squash: breathe(t), look: V(x, 2.6, 9), handL: V(x - 0.42, y + 1.62, 0.3), mood: 'happy', tilt: 0.08 * Math.sin(t * 5) };
  } else if (t < c[9]) { lustig.root.visible = false; return; }
  else if (t < c[11]) {                              // vuelve a París, llega la policía y huye
    if (t < huyeT + 0.2) {
      const arrive = c[9] + 1.15, wind = prog(t, huyeT, huyeT + 0.2), scared = t > poliT + 0.5;
      p = { ...go(t, c[9], arrive, -2.7, -0.95), handR: SALE_HAND, wR: back(lin(t, otraT, otraT + 0.3)) * (scared ? 1 - prog(t, poliT + 0.5, poliT + 0.7) : 1) };
      if (t > arrive) { p.face = lerp(lerp(PI / 2, 0.35, prog(t, arrive, arrive + 0.35)), -PI / 2, prog(t, huyeT - 0.1, huyeT + 0.2)); p.look = scared ? V(head.cop.x, 1.4, 2.6) : V(0, 1.5, 9); }
      p.y = hop(t, poliT + 0.5, 0.22); p.squash = p.squash * settle(t, poliT + 0.9, 0.12) * breathe(t) * (1 - 0.14 * wind); p.crouch = 0.6 * wind;
      Object.assign(p, moodAt(t, [[0, 'happy'], [poliT + 0.45, 'surprised'], [huyeT - 0.1, 'worried']]));
    } else p = { ...go(t, huyeT + 0.2, huyeT + 1.7, -0.95, -4.6, 0.72), mood: 'worried' };
  } else if (t < jailT) {                            // con los billetes falsos
    p = { x: JX, face: 0.15, squash: breathe(t), y: hop(t, c[11] + 0.5, 0.1), look: V(JX, 1.5, 9), handR: V(JX + 0.4, 1.12 + 0.03 * Math.sin(t * 7), 0.3), mood: 'happy' };
  } else { lustig.root.visible = false; return; }
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, p.z || 0, -1); p.wL = 0.85; }      // mano libre: gesticula
  lustig.root.visible = true; lustig.pose(alive({ blink: blinkAt(t, 0), ...p }, t, 0)); lustig.head.getWorldPosition(head.l);
}

function poseDealers(t) {
  dealers.forEach((d, i) => {
    const isP = i === POI, alone = t >= c[5];
    d.root.visible = t >= citaT && (isP ? t < c[9] : !alone) && !(t >= desT && t < pickT);
    if (!d.root.visible) return;
    const t0 = citaT + 0.12 * i, t1 = citaT + 0.95 + 0.14 * i;
    let p;
    if (t < t1 + 0.15) p = { ...go(t, t0, t1, DX[i] + 3.4, DX[i]), mood: 'neutral' };
    else if (!alone) {
      const lean = 0.16 * win(t, c[3] + 0.2 + 0.05 * i, desT, 0.25), chosen = isP && t > poiT;
      p = { x: DX[i], face: lerp(-PI / 2, -0.5, prog(t, t1 + 0.1, t1 + 0.45)), lean, squash: settle(t, t1) * breathe(t, i), y: (chosen ? hop(t, poiT + 0.1, 0.16) : 0) + hop(t, c[3] + 0.55 + 0.1 * i, 0.14, 0.32) + hop(t, pickT + 0.15 + 0.08 * i, 0.08, 0.25),
        look: V(HX - 1.6, 1.3, 2.8), tilt: 0.06 * Math.sin(t * 1.4 + i * 2),
        ...(chosen ? { mood: 'happy', handR: V(DX[i] + 0.2, 1.85, 0.3), wR: back(lin(t, poiT + 0.1, poiT + 0.4)) } : moodAt(t, [[0, 'neutral'], [c[3] + 0.3, 'surprised'], [pickT, 'neutral']])) };
    } else if (t < c[8]) {                           // Poisson: desconfía, se convence, paga y saluda
      const give = win(t, payT - 0.15, payT + 0.45, 0.18), bye = prog(t, fleeT + 0.5, fleeT + 0.8);
      p = { x: PX, face: -0.9, y: hop(t, okT + 0.1, 0.16), squash: breathe(t, 2), lean: 0.08 * Math.sin((t - okT) * 9) * win(t, okT, okT + 1.4, 0.2),          // asiente
        handL: t < okT ? V(PX - 0.1, 1.2, 0.36) : V(PX - 0.34, 1.78, 0.2), wL: t < okT ? win(t, c[5] + 0.25, okT, 0.2) : win(t, okT + 0.15, payT - 0.2, 0.2),      // se rasca el mentón; después festeja
        look: V(Math.max(head.l.x, PX - 1.3), 1.35, 2.6), tilt: 0.16 * win(t, c[5] + 0.2, okT, 0.25),
        handR: bye > 0 ? V(PX + 0.3 + 0.1 * Math.sin(t * 9), 1.66, 0.25) : V(PX - 0.42, 1.0, 0.3), wR: Math.max(give, bye),
        ...moodAt(t, [[0, 'neutral'], [c[5] + 0.15, 'angry'], [okT, 'surprised'], [okT + 0.35, 'happy']]) };
    } else {                                         // solo, muerto de vergüenza
      const hide = prog(t, c[8] + 0.25, c[8] + 0.6);
      p = { x: PX, face: -0.15, squash: breathe(t, 2), lean: 0.12 * hide, look: V(PX, 0.9, 3), tilt: 0.05 * Math.sin(t * 8) * hide,
        handL: V(PX - 0.17, 1.33, 0.36), wL: hide, handR: V(PX + 0.17, 1.33, 0.36), wR: hide, ...moodAt(t, [[0, 'surprised'], [c[8] + 0.3, 'worried']]) };
    }
    d.pose(alive({ blink: blinkAt(t, 0.5 + i * 0.6), ...p }, t, 1 + i * 1.7));
  });
  poisson.head.getWorldPosition(head.p); dealers[1].head.getWorldPosition(head.d1);
}

function posePolice(t) {
  police.root.visible = t >= poliT && t < c[11]; if (!police.root.visible) return;
  let p;
  if (t < huyeT + 0.45) {
    const stop = poliT + 0.9;
    p = { ...go(t, poliT, stop, 3.3, 1.35, 0.5), z: 0.3 };
    if (t > stop) p.look = V(head.l.x, 1.4, 2.6);
    p.handR = V(0.75, 1.2 + 0.1 * Math.sin(t * 16), 0.5); p.wR = back(lin(t, stop + 0.05, stop + 0.3));      // agita el puño
  } else p = { ...go(t, huyeT + 0.45, huyeT + 2.1, 1.35, -4.6, 0.72), z: 0.3 + 0.5 * prog(t, huyeT + 0.45, huyeT + 0.8) };
  police.pose(alive({ blink: blinkAt(t, 1.1), mood: 'angry', ...p }, t, 5)); police.head.getWorldPosition(head.cop);
}

function poseConvict(t) {
  convict.root.visible = t >= jailT; if (!convict.root.visible) return;
  const grab = back(lin(t, jailT + 0.3, jailT + 0.6));
  convict.pose({ x: JX + 0.014 * Math.sin(t * 31) * win(t, jailT + 0.7, jailT + 1.7, 0.2), face: 0, squash: settle(t, jailT + 0.22, 0.12) * breathe(t), look: V(JX, 1.4, 9), blink: blinkAt(t, 0), tilt: 0.05 * Math.sin(t * 1.5),
    handL: V(JX - 0.3, 1.02, 0.5), wL: grab, handR: V(JX + 0.3, 1.02, 0.5), wR: grab, ...moodAt(t, [[0, 'surprised'], [jailT + 0.5, 'worried']]) });
}

// ---------- cámara ----------
const shots = [
  { t: 0, pos: [0.1, 1.6, 9.2], look: [0.1, 1.95, 0] },
  { t: vendT, pos: [-0.4, 1.5, 6.4], look: [-0.4, 1.55, 0] },
  { t: suyaT, pos: [-0.8, 1.45, 4.9], look: [-0.8, 1.4, 0] },
  { t: c[1], pos: [-0.9, 1.3, 4.4], look: [-0.9, 1.2, 0] },
  { t: rustT, pos: [1.1, 2.2, 5.5], look: [1.1, 2.75, -5] },
  { t: c[2], pos: [1.1, 2.3, 4.2], look: [1.1, 2.8, -5], glide: true },
  { t: c[2], pos: [HX - 1.15, 1.35, 4.7], look: [HX - 1.15, 1.2, 0], cut: true },
  { t: subT, pos: [HX - 1.2, 1.4, 3.9], look: [HX - 1.2, 1.3, 0] },
  { t: citaT, pos: [HX, 1.6, 9.4], look: [HX, 1.75, 0] },
  { t: desT, pos: [HX + 0.1, 1.55, 8.6], look: [HX + 0.1, 1.65, 0], glide: true },
  { t: desT, pos: [1.1, 2.4, 7], look: [1.1, 3.1, -5], cut: true },
  { t: c[4], pos: [0, 1.5, 8.6], look: [0, 1.75, 0] },
  { t: pickT, pos: [HX + 0.3, 1.5, 9], look: [HX + 0.3, 1.7, 0], cut: true },
  { t: poiT + 0.9, pos: [PX, 1.5, 6.6], look: [PX, 1.5, 0], glide: true },
  { t: c[5], pos: [HX + 0.15, 1.4, 6], look: [HX + 0.15, 1.35, 0] },
  { t: coimaT, pos: [HX + 0.1, 1.4, 5.3], look: [HX + 0.1, 1.3, 0] },
  { t: okT, pos: [PX, 1.4, 4.3], look: [PX, 1.35, 0] },
  { t: funcT, pos: [HX + 0.1, 1.45, 6.4], look: [HX + 0.1, 1.35, 0] },
  { t: payT, pos: [HX + 0.13, 1.3, 5.0], look: [HX + 0.13, 1.1, 0] },
  { t: fleeT, pos: [HX - 0.5, 1.5, 7.8], look: [HX - 0.5, 1.5, 0] },
  { t: trainT, pos: [TX - 0.4, 1.7, 9], look: [TX - 0.4, 2.0, 0], cut: true },
  { t: c[8], pos: [PX, 1.4, 5.2], look: [PX, 1.35, 0], cut: true },
  { t: c[9], pos: [PX, 1.4, 4.3], look: [PX, 1.35, 0], glide: true },
  { t: c[9], pos: [-0.4, 1.5, 6.8], look: [-0.4, 1.6, 0], cut: true },
  { t: otraT, pos: [-0.3, 1.5, 5.6], look: [-0.3, 1.55, 0] },
  { t: poliT, pos: [0.2, 1.55, 8.6], look: [0.2, 1.8, 0] },
  { t: huyeT, pos: [0.1, 1.55, 8.6], look: [0.1, 1.8, 0], glide: true },
  { t: c[11], pos: [-1.3, 1.55, 8.9], look: [-1.3, 1.8, 0], glide: true },
  { t: c[11], pos: [JX, 1.4, 5.2], look: [JX, 1.35, 0], cut: true },
  { t: jailT, pos: [JX, 1.4, 4.6], look: [JX, 1.35, 0] },
  { t: alcT, pos: [JX, 1.42, 3.8], look: [JX, 1.36, 0] },
];
/** Cámara que nunca se queda quieta (medido en la referencia: la imagen cambia cada 1,9 s y casi no hay cortes secos).
 *  Cada toma empuja lento hacia lo que mira; una toma sin `cut` entra de un tirón (zoom brusco de 0,35 s); con `glide`
 *  se viaja durante todo el tramo anterior. Devuelve el punto mirado (la luz de sombras lo sigue). */
function makeCam(shots, { sway = 0.011, push = 0.05, move = 0.35 } = {}) {
  const pa = V(0, 0, 0), la = V(0, 0, 0), pb = V(0, 0, 0), lb = V(0, 0, 0), q = V(0, 0, 0);
  const state = (i, t, pos, look) => {
    const s = shots[i], n = shots[i + 1]; pos.set(...s.pos); look.set(...s.look);
    if (n && n.glide) { const k = prog(t, s.t, n.t); pos.lerp(q.set(...n.pos), k); look.lerp(q.set(...n.look), k); }
    else pos.lerp(look, 1 - Math.exp(-push * Math.min(t - s.t, 8)));
  };
  return t => {
    let i = 0; while (i < shots.length - 1 && shots[i + 1].t <= t) i++;
    state(i, t, pa, la);
    const s = shots[i];
    if (i && !s.cut && !s.glide && t < s.t + move) { state(i - 1, t, pb, lb); const k = prog(t, s.t, s.t + move); pa.copy(pb.lerp(pa, k)); la.copy(lb.lerp(la, k)); }
    const d = pa.distanceTo(la) * sway;
    camera.position.set(pa.x + d * Math.sin(t * 0.9), pa.y + d * 0.6 * Math.sin(t * 0.7 + 1.3), pa.z);
    camera.lookAt(la); camera.rotation.z += 0.006 * Math.sin(t * 0.8); camera.updateMatrixWorld();
    return la;
  };
}
const cam = makeCam(shots);
for (const s of shots) if (!s.cut && !s.glide && s.t > 0) sfx(s.t, 'whoosh', 0.3);
// Cambios de lugar: corte directo. Se probó una cortinilla que tapaba la pantalla y al usuario le molestó
// ("son al pedo"): no volver a ponerla. Queda la lista vacía para que el código de abajo no dibuje nada.
const wipes = [], wipeEl = document.getElementById('wipe');
for (const ct of cutTimes(shots)) sfx(ct, 'whoosh', 0.5);

// ---------- carteles ----------
const tags = makeTags(camera);
const tag = o => { tags.add(o); sfx(o.from, 'pop', o.big ? 0.5 : 0.35); };
const BIG = [540, 400];
tag({ text: 'París, 1925', big: true, off: BIG, from: 0.15, to: vendT });
tag({ text: '¡No era suya!', big: true, off: BIG, from: suyaT, to: c[1] });
tag({ text: 'Victor Lustig', at: () => head.l, off: [250, -300], from: c[1] + 0.2, to: rustT });
tag({ text: 'Óxido', at: () => tmp2.set(1.55, 1.6, -5), off: [230, -40], from: rustT + 0.5, to: c[2] });
tag({ text: '¡Carísimo!', big: true, off: BIG, from: caroT, to: c[2] });
tag({ text: 'Papel oficial falso', at: () => DESK, off: [250, 250], from: stampT + 0.5, to: subT });
tag({ text: '“Subdirector de Correos”', at: () => head.l, off: [200, -330], from: subT + 0.1, to: citaT });
tag({ text: 'Chatarreros', at: () => head.d1, off: [0, -260], from: citaT + 1.3, to: c[3] });
tag({ text: '¡Secreto!', big: true, off: BIG, from: at('secreto', c[3]) - 0.2, to: desT });
tag({ text: '7.000 toneladas', big: true, off: [540, 330], from: tonT, to: c[4] });
tag({ text: 'Hierro', at: () => tmp2.set(1.1 + 0.5, 1.9, -5), off: [260, 60], from: at('hierro', c[3]) - 0.2, to: c[4] });
tag({ text: 'André Poisson', at: () => head.p, off: [-150, -330], from: poiT + 0.2, to: c[5] });
tag({ text: '¡Coima!', big: true, off: BIG, from: at('coima', c[5]) - 0.25, to: okT });
tag({ text: '“Es de verdad”', big: true, off: BIG, from: funcT, to: payT });
tag({ text: '→ Austria', big: true, off: BIG, from: trainT + 0.3, to: c[8] });
tag({ text: 'Nunca lo denunció', big: true, off: BIG, from: nuncaT, to: c[9] });
tag({ text: '¡Otra vez!', big: true, off: BIG, from: otraT + 0.2, to: poliT });
tag({ text: 'Policía', at: () => head.cop, off: [60, -270], from: poliT + 1.0, to: huyeT + 0.3 });
tag({ text: '→ Estados Unidos', big: true, off: BIG, from: usaT, to: c[11] });
tag({ text: 'Billetes falsos', at: () => bills.position, off: [150, -260], from: c[11] + 0.5, to: jailT });
tag({ text: 'Alcatraz', big: true, off: BIG, from: alcT, to: END + 1 });

// ---------- sonidos (pocos tipos: soplido en cortes, pop en carteles, barrido hasta la revelación, golpe) ----------
sfx(0, 'boom', 0.5); sfx(stampT + 0.35, 'thud', 0.5); sfx(stampT + 1.0, 'thud', 0.5);
for (const hit of [tonT, payT + 0.3, jailT + 0.2]) sfx(hit, 'riser_to', 1);
sfx(tonT, 'boom', 0.45); sfx(payT + 0.3, 'tap', 0.7); sfx(fleeT + 0.25, 'whoosh', 0.9); sfx(huyeT + 0.2, 'whoosh', 0.9);
sfx(poliT + 0.5, 'pop', 0.8); sfx(jailT + 0.2, 'thud', 0.9); sfx(okT, 'pop', 0.8);
rust.forEach((_, i) => sfx(rustT + 0.15 + i * 0.13, 'tap', 0.5));

// ---------- cuadro ----------
const proj = V(0, 0, 0);
function glyphAt(m, pos, dx, dy, k, spin = 0) { m.visible = k > 0.01; if (!m.visible) return; m.position.set(pos.x + dx, pos.y + dy, pos.z + 0.3); m.scale.setScalar(Math.max(k, 0.001)); m.rotation.z = spin; }
function frame(t) {
  poseLustig(t); poseDealers(t); posePolice(t); poseConvict(t); poseExtras(t);
  if (t >= c[5] && t < trainT) { poseLustig(t); poseDealers(t); }             // se miran entre sí: segunda pasada con las cabezas ya ubicadas
  if (t >= poliT && t < c[11]) poseLustig(t);

  // París: cartel, diario, óxido, torre que se desarma, limusina
  const s = popIn(t, vendT, c[1] + 0.15) + (t >= c[9] ? popIn(t, otraT, c[11] + 1) : 0);
  sale.visible = s > 0.01; sale.scale.setScalar(Math.max(s, 0.001));
  paper.visible = t >= c[1] && t < c[2];
  rust.forEach((m, i) => { const k = back(lin(t, rustT + 0.15 + i * 0.13, rustT + 0.4 + i * 0.13)) * (t < c[2] ? 1 : 0); m.visible = k > 0.01; m.scale.setScalar(Math.max(k, 0.001)); });
  const apart = t >= desT && t < c[4] ? back(lin(t, desT + 0.25, desT + 0.7)) : 0;
  towerParts.forEach((g, i) => { g.position.set([0, -0.35, 0.3][i] * apart, g.userData.y0 + [0, 0.45, 1.0][i] * apart, 0); g.rotation.z = [0, 0.12, -0.16][i] * apart; });
  const lx = lerp(-5.6, 5.6, lin(t, c[4] + 0.05, pickT + 0.1));
  limo.visible = t >= c[4] && t < pickT + 0.1; limo.position.x = lx; limo.position.y = 0.012 * Math.sin(t * 30);
  limoWheels.forEach(w => { w.rotation.z = -lx / 0.2; });

  // Hotel: flecha que elige, valija, signos
  const picking = t >= pickT && t < c[5];
  arrow.visible = picking;
  if (picking) {
    const order = [0, 1, 3], n = Math.max(1, Math.floor((poiT - pickT) / 0.3)), u = (t - pickT) / ((poiT - pickT) / n), i = Math.floor(u);
    const from = i === 0 ? order[0] : order[(i - 1) % 3], to = t >= poiT ? POI : order[i % 3], k = t >= poiT ? prog(t, poiT, poiT + 0.2) : prog(u - i, 0, 0.6);
    const a = t >= poiT ? order[(n - 1) % 3] : from;
    arrow.position.set(lerp(DX[a], DX[to], k), 2.05 + 0.25 * Math.sin(PI * k) + 0.05 * Math.sin(t * 9), 0); arrow.rotation.y = t * 3;
  }
  bag.visible = t >= c[5] && t < c[8];
  if (bag.visible) {
    poisson.hand(1, hand); lustig.hand(t < c[8] && t >= trainT ? 0 : 1, tmp);
    bag.position.copy(hand).lerp(tmp, prog(t, payT + 0.2, payT + 0.42));
    bag.scale.setScalar(1 + 0.2 * win(t, payT + 0.3, payT + 0.65, 0.12)); bag.rotation.y = t >= trainT ? 0.3 : 0;
  }
  glyphAt(qMark, head.p, 0.05, 0.62, popIn(t, c[5] + 0.3, okT), 0.12 * Math.sin(t * 6));
  glyphAt(okMark, head.p, 0.05, 0.62, popIn(t, okT, funcT + 0.4));
  glyphAt(bangMark, head.l, 0, 0.66, popIn(t, poliT + 0.5, huyeT + 0.1));
  cash.forEach((m, i) => { const u = lin(t, payT + 0.3 + i * 0.12, payT + 1.1 + i * 0.12); glyphAt(m, tmp2.set((LX + PX) / 2, 0.75, 0), (i - 1) * 0.2, 0.2 + 0.9 * u, u > 0 && u < 1 ? back(u * 3) * (1 - prog(u, 0.7, 1)) : 0); });
  puffs(t, fleeT + 0.25, LX, 0, 1, 0); puffs(t, huyeT + 0.2, -0.95, 0, 1, 4); puffs(t, huyeT + 0.45, 1.35, 0.3, 1, 8);

  // Tren
  const tx = trainX(t); train.position.x = tx; train.position.y = 0.01 * Math.sin(t * 22);
  trainWheels.forEach(w => { w.rotation.z = -tx / 0.19; });
  smoke.forEach((m, i) => { const u = (t * 1.3 + i / 5) % 1; m.position.set(tx + 1.35 - 1.5 * u, 1.65 + 1.3 * u, 0.1); m.scale.setScalar(0.6 + 1.6 * u); m.material.opacity = 0.9 * (1 - u); });

  // Cárcel: billetes y rejas que caen
  bills.visible = t >= c[11] && t < jailT;
  if (bills.visible) { lustig.hand(1, bills.position); bills.rotation.z = 0.08 * Math.sin(t * 7); }
  const fall = lin(t, jailT, jailT + 0.2);
  bars.visible = t >= jailT; bars.position.y = 3.6 * (1 - fall * fall) + (t > jailT + 0.2 ? 0.08 * Math.exp(-7 * (t - jailT - 0.2)) * Math.abs(Math.cos(16 * (t - jailT - 0.2))) : 0);

  // --- vida de fondo y partículas ---
  drift.forEach((g, i) => { g.position.x = g.userData.x0 + t * (0.1 + 0.04 * (i % 3)); });
  sway.forEach((g, i) => { g.rotation.z = 0.035 * Math.sin(t * 1.5 + i * 1.3); });
  birds.forEach(g => { const d = g.userData, u = (t * 1.3 + d.off) % 15; g.position.set(d.cx - 7.5 + u, d.y + 0.2 * Math.sin(t * 1.7 + d.off), -8); const f = 0.5 * Math.sin(t * 11 + d.off); g.children[0].rotation.z = -f; g.children[1].rotation.z = f; });
  coins.forEach((m, i) => {                         // lluvia de monedas cuando Poisson paga
    const u = t - (payT + 0.3 + i * 0.035), d = m.userData, tf = 0.72;
    m.visible = u > 0 && t < trainT; if (!m.visible) return;
    const y = u < tf ? 2.4 - 4.5 * u * u : 0.05 + Math.max(0, 1.5 * (u - tf) - 4.5 * (u - tf) ** 2);
    m.position.set((LX + PX) / 2 + d.x0 + d.vx * Math.min(u, tf + 0.35), y, 0.25 + 0.03 * (i % 5)); m.rotation.set(PI / 2 + (y > 0.06 ? u * d.spin : 1.45), 0, u * 2);
  });
  const running = (t > fleeT + 0.3 && t < fleeT + 1.3) || (t > huyeT + 0.25 && t < huyeT + 1.7);
  speed.forEach((m, i) => { m.visible = running; if (!running) return; m.position.set(head.l.x + 0.55 + 0.14 * ((i * 3) % 5) + 0.2 * Math.sin(t * 40 + i), 0.45 + i * 0.26, 0.1); m.material.opacity = 0.5 + 0.4 * Math.sin(t * 50 + i * 2); });
  sweat.forEach((m, i) => { const on = t > c[8] + 0.45 && t < c[9], u = (t * 1.7 + i / 3) % 1, s = i % 2 ? 1 : -1; m.visible = on; if (!on) return; m.position.set(head.p.x + s * (0.3 + 0.25 * u), head.p.y + 0.22 + 0.3 * u - 0.6 * u * u, 0.25); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
  { const u = lin(t, c[11] + 0.5, c[11] + 3.2); rat.visible = t >= c[11]; rat.position.set(JX + 2.3 - 4.8 * u, 0.02 * Math.abs(Math.sin(t * 24)), 0.95); }
  sparks.forEach((m, i) => {                       // destellos: en el cartel de venta y en la torre "en venta"
    const k = (popIn(t, vendT + 0.1, c[1]) + (t >= c[9] ? popIn(t, otraT + 0.1, poliT) : 0)) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6));
    glyphAt(m, tmp2.set(0.05, 1.5, 0), [-0.6, 0.62, -0.45, 0.5][i], [0.32, 0.38, -0.3, -0.26][i], Math.max(k, 0), t * 1.5 + i);
  });
  let wx = -140; for (const w of wipes) { const u = (t - (w - 0.18)) / 0.36; if (u > 0 && u < 1) wx = lerp(-140, 70, u); }
  wipeEl.style.transform = `translateX(${wx}%) skewX(-12deg)`;

  light.follow(cam(t)); tags.update(t);
  renderer.render(scene, camera);
  proj.copy(t >= jailT ? tmp.set(JX, 1.4, 0) : head.l).project(camera); window.MAN = { x: (proj.x + 1) / 2 * 1080, y: (1 - proj.y) / 2 * 1920 };
}
window.renderFrame = frame; window.DEBUG = { sombra: !!light.sun.shadow.map, tipo: renderer.shadowMap.type, on: renderer.shadowMap.enabled };
frame(0); window.ready = true;
