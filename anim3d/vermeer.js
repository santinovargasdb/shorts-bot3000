// Episodio: Han van Meegeren, el falsificador que le vendió un "Vermeer" a Göring y en 1945 tuvo que pintar otro
// delante de testigos para probar que era falso. Decorados lado a lado:
//   OFICINA de Göring (x=0, de caricatura, sin símbolos), TALLER del pintor (x=40, caballete, horno, testigos),
//   TRIBUNAL de Ámsterdam (x=80, jueces, público que aplaude al final).
//   python -m anim3d.narrar vermeer  ->  python -m anim3d.render vermeer stills ...  ->  ... full
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, painting, windowPic, lamp } from '/lib/decor.js';
import { rng } from '/lib/kit.js';

const k = await setup('vermeer');
const { scene, c, at, END, sfx, tag, BIG } = k;
const GX = 0, TX = 40, CX = 80;

// ---------- tiempos (palabras de la voz) ----------
const goringT = at('goring'), ver0T = at('vermeer'), falsoT = at('falso'), salvT = at('salvarse'), testT = at('testigos');
const hanT = at('han', c[1]), imitaT = at('imita', c[1]), verT = at('vermeer', c[1]), sigloT = at('siglo', c[1]);
const oleoT = at('oleo', c[2]), decT = at('decadas', c[2]), mezT = at('mezcla', c[2]), baqT = at('baquelita', c[2]), hornT = at('hornea', c[2]), cienT = at('cien', c[2]), gradT = at('grados', c[2]);
const rodT = Math.max(at('rodillo', c[3]), c[3] + 1.0), tintaT = at('tinta', c[3]), pareceT = at('parece', c[3]), tresT = at('trescientos', c[3]);
const gor2T = at('goring', c[4]), numT = at('numero', c[4]), cien2T = at('cien', c[4]), robT = at('robados', c[4]);
const guerraT = at('guerra', c[5]), acuT = at('acusan', c[5]), traiT = at('traicion', c[5]), tesT = at('tesoro', c[5]), naziT = at('nazis', c[5]);
const confT = at('confiesa', c[6]), noT = at('no', c[6]), pintoT = at('pinto', c[6]);
const probT = at('probarlo', c[7]), vigT = at('vigilado', c[7]), testi2T = at('testigos', c[7]), pintaT = at('pinta', c[7]), ceroT = at('cero', c[7]);
const expT = at('expertos', c[8]), falso2T = at('falso', c[8]), retT = at('retiran', c[8]);
const condT = at('condenan', c[9]), falsifT = at('falsificacion', c[9]), anoT = at('ano', c[9]) - 0.1;
const muereT = at('muere', c[10]), infT = at('infarto', c[10]), encT = at('encuesta', c[10]), segT = at('segundo', c[10]), estT = at('estafar', c[10]);

// ---------- dibujos en canvas ----------
const ell = (g, x, y, rx, ry, rot, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
const shape = (g, col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
/** Estilo Vermeer: mujer junto a la ventana, chaqueta amarilla, delantal azul, jarra, luz de la izquierda. */
function drawWoman(g, W, H) {
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#d9cfb2'); gr.addColorStop(1, '#8f8468'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // ventana con vidrios emplomados
  g.fillStyle = '#c9d6c8'; g.fillRect(W * 0.04, H * 0.08, W * 0.26, H * 0.4); g.strokeStyle = '#4a4438'; g.lineWidth = W * 0.008;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(W * 0.04, H * (0.08 + i * 0.1)); g.lineTo(W * 0.3, H * (0.08 + i * 0.1)); g.stroke(); }
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(W * (0.04 + i * 0.087), H * 0.08); g.lineTo(W * (0.04 + i * 0.087), H * 0.48); g.stroke(); }
  // mapa en la pared
  g.fillStyle = '#b89a5a'; g.fillRect(W * 0.55, H * 0.1, W * 0.38, H * 0.24); g.strokeStyle = '#5a4020'; g.lineWidth = W * 0.012; g.strokeRect(W * 0.55, H * 0.1, W * 0.38, H * 0.24);
  g.fillStyle = '#8a7040'; ell(g, W * 0.68, H * 0.2, W * 0.07, H * 0.05, 0.4, '#8a7040'); ell(g, W * 0.82, H * 0.24, W * 0.05, H * 0.04, -0.3, '#8a7040');
  // mesa con mantel azul y pan
  shape(g, '#2f4f8a', [[0, H * 0.72], [W * 0.5, H * 0.66], [W * 0.56, H], [0, H]]);
  ell(g, W * 0.18, H * 0.7, W * 0.09, H * 0.04, 0, '#b5793a'); ell(g, W * 0.3, H * 0.71, W * 0.06, H * 0.03, 0, '#c98a45');
  // mujer: falda roja, delantal azul, chaqueta amarilla, cofia blanca
  shape(g, '#a8402f', [[W * 0.42, H * 0.55], [W * 0.78, H * 0.55], [W * 0.86, H], [W * 0.36, H]]);
  shape(g, '#3f63a8', [[W * 0.48, H * 0.6], [W * 0.72, H * 0.6], [W * 0.76, H], [W * 0.46, H]]);
  shape(g, '#e2b53a', [[W * 0.44, H * 0.36], [W * 0.74, H * 0.36], [W * 0.8, H * 0.6], [W * 0.4, H * 0.6]]);
  ell(g, W * 0.4, H * 0.55, W * 0.05, H * 0.035, 0.4, '#e8c49a');                    // manos con la jarra
  shape(g, '#9a6a3a', [[W * 0.33, H * 0.5], [W * 0.4, H * 0.5], [W * 0.41, H * 0.62], [W * 0.32, H * 0.62]]);
  g.strokeStyle = '#f3f0e6'; g.lineWidth = W * 0.012; g.beginPath(); g.moveTo(W * 0.335, H * 0.64); g.lineTo(W * 0.335, H * 0.72); g.stroke();
  ell(g, W * 0.59, H * 0.27, W * 0.08, H * 0.075, 0, '#ebc79e');                       // cara
  ell(g, W * 0.6, H * 0.2, W * 0.11, H * 0.06, 0, '#f6f2e6');                         // cofia
  ell(g, W * 0.56, H * 0.27, W * 0.012, H * 0.006, 0, '#3a2414'); ell(g, W * 0.62, H * 0.27, W * 0.012, H * 0.006, 0, '#3a2414');
  // barniz y sombra
  g.fillStyle = 'rgba(160,120,40,0.14)'; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W * 0.4, H * 0.4, W * 0.2, W / 2, H / 2, W * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,15,0,0.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}
/** "Cristo y la adúltera" (el falso que compró Göring): Cristo de rojo, la mujer de cabeza gacha, un soldado. */
function drawAdultera(g, W, H) {
  const gr = g.createRadialGradient(W * 0.5, H * 0.4, 10, W * 0.5, H * 0.5, W * 0.8); gr.addColorStop(0, '#5a4630'); gr.addColorStop(1, '#1f160d'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // soldado con casco, atrás a la derecha
  shape(g, '#3a3a38', [[W * 0.62, H * 0.42], [W * 0.92, H * 0.42], [W * 0.98, H], [W * 0.58, H]]);
  ell(g, W * 0.77, H * 0.3, W * 0.08, H * 0.08, 0, '#c99a6e'); ell(g, W * 0.77, H * 0.23, W * 0.1, H * 0.05, 0, '#6a6a68');
  // Cristo de rojo, a la izquierda
  shape(g, '#a8302a', [[W * 0.08, H * 0.42], [W * 0.38, H * 0.42], [W * 0.44, H], [W * 0.02, H]]);
  shape(g, '#2f4a7a', [[W * 0.06, H * 0.6], [W * 0.2, H * 0.48], [W * 0.26, H], [W * 0.04, H]]);
  ell(g, W * 0.23, H * 0.3, W * 0.085, H * 0.09, 0, '#d8a878'); ell(g, W * 0.23, H * 0.24, W * 0.1, H * 0.06, 0, '#4a2a14');
  ell(g, W * 0.23, H * 0.37, W * 0.06, H * 0.04, 0, '#4a2a14');                                    // barba
  ell(g, W * 0.38, H * 0.6, W * 0.05, H * 0.03, 0.4, '#d8a878');                                    // mano que señala
  // la mujer, de cabeza gacha, al medio
  shape(g, '#d8c07a', [[W * 0.42, H * 0.5], [W * 0.64, H * 0.5], [W * 0.7, H], [W * 0.38, H]]);
  ell(g, W * 0.53, H * 0.45, W * 0.075, H * 0.07, 0.3, '#e6bf94'); ell(g, W * 0.51, H * 0.41, W * 0.1, H * 0.065, 0.3, '#f1ece0');
  g.fillStyle = 'rgba(140,100,30,0.15)'; g.fillRect(0, 0, W, H);
}
/** "Jesús entre los doctores" (el que pintó vigilado): Jesús joven al medio, cuatro viejos con barba alrededor. */
function drawDoctors(g, W, H) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4a3a28'); gr.addColorStop(1, '#2a1f14'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#6a5236'; g.fillRect(0, H * 0.72, W, H * 0.28);                                    // mesa
  ell(g, W * 0.5, H * 0.74, W * 0.14, H * 0.03, 0, '#e8dcc0');                                       // libro abierto
  const elder = (x, y, robe, cap) => { shape(g, robe, [[x - W * 0.13, y + H * 0.1], [x + W * 0.13, y + H * 0.1], [x + W * 0.16, y + H * 0.45], [x - W * 0.16, y + H * 0.45]]);
    ell(g, x, y, W * 0.07, H * 0.06, 0, '#d0a07a'); ell(g, x, y + H * 0.06, W * 0.055, H * 0.05, 0, '#e8e4dc'); ell(g, x, y - H * 0.045, W * 0.08, H * 0.04, 0, cap); };
  elder(W * 0.16, H * 0.3, '#5a6a3a', '#8a2a2a'); elder(W * 0.84, H * 0.3, '#3a4a6a', '#d0b060');
  elder(W * 0.14, H * 0.56, '#7a3a5a', '#e8e0c8'); elder(W * 0.86, H * 0.56, '#6a5a2a', '#3a5a8a');
  shape(g, '#c0443a', [[W * 0.38, H * 0.42], [W * 0.62, H * 0.42], [W * 0.66, H * 0.8], [W * 0.34, H * 0.8]]);   // Jesús de joven
  ell(g, W * 0.5, H * 0.33, W * 0.075, H * 0.07, 0, '#ecc49c'); ell(g, W * 0.5, H * 0.28, W * 0.09, H * 0.05, 0, '#8a5a2a');
  ell(g, W * 0.47, H * 0.335, W * 0.01, H * 0.006, 0, '#3a2414'); ell(g, W * 0.53, H * 0.335, W * 0.01, H * 0.006, 0, '#3a2414');
  const v = g.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W * 0.5); v.addColorStop(0, 'rgba(255,230,160,0.28)'); v.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}
/** Craquelado: red de grietas finas (sobre fondo transparente). */
function drawCracks(color, lw) {
  return (g, W, H) => {
    const r = rng(77); g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'round';
    for (let i = 0; i < 70; i++) {
      let x = r() * W, y = r() * H, a = r() * 7; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 7; s++) { a += (r() - 0.5) * 1.6; x += Math.cos(a) * (14 + r() * 22); y += Math.sin(a) * (14 + r() * 22); g.lineTo(x, y); }
      g.stroke();
    }
  };
}
/** Marco dorado (centro transparente). */
function gilt(g, W, H, b, color = '#d9a441') {
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); g.fillRect(0, 0, b, H); g.fillRect(W - b, 0, b, H);
  const i = 5, bb = b - 2 * i; g.fillStyle = color;
  g.fillRect(i, i, W - 2 * i, bb); g.fillRect(i, H - b + i, W - 2 * i, bb); g.fillRect(i, i, bb, H - 2 * i); g.fillRect(W - b + i, i, bb, H - 2 * i);
  g.fillStyle = '#f6d983'; g.fillRect(i, i, W - 2 * i, bb * 0.3); g.fillRect(i, i, bb * 0.3, H - 2 * i);
}
const MINI = [
  (g, W, H) => { g.fillStyle = '#9fc0d8'; g.fillRect(0, 0, W, H); g.fillStyle = '#5a8a4a'; g.fillRect(0, H * 0.62, W, H); ell(g, W * 0.3, H * 0.6, W * 0.06, H * 0.18, 0, '#7a5a3a'); ell(g, W * 0.7, H * 0.3, W * 0.1, H * 0.1, 0, '#f7e08a'); },
  (g, W, H) => { g.fillStyle = '#3a2a22'; g.fillRect(0, 0, W, H); ell(g, W / 2, H * 0.42, W * 0.16, H * 0.18, 0, '#e0b48a'); ell(g, W / 2, H, W * 0.4, H * 0.4, 0, '#2a3a5a'); ell(g, W / 2, H * 0.3, W * 0.2, H * 0.1, 0, '#2a1a10'); },
  (g, W, H) => { g.fillStyle = '#c9d8e0'; g.fillRect(0, 0, W, H); g.fillStyle = '#3f6f9a'; g.fillRect(0, H * 0.6, W, H); shape(g, '#fbf3dc', [[W * 0.5, H * 0.2], [W * 0.5, H * 0.58], [W * 0.3, H * 0.58]]); shape(g, '#6b3f22', [[W * 0.28, H * 0.6], [W * 0.72, H * 0.6], [W * 0.62, H * 0.7], [W * 0.38, H * 0.7]]); },
  (g, W, H) => { g.fillStyle = '#2a1f18'; g.fillRect(0, 0, W, H); ell(g, W * 0.5, H * 0.5, W * 0.12, H * 0.22, 0, '#5b7fa8'); ell(g, W * 0.3, H * 0.72, W * 0.1, W * 0.1, 0, '#c8443a'); ell(g, W * 0.68, H * 0.72, W * 0.1, W * 0.08, 0, '#e0a030'); },
  (g, W, H) => { g.fillStyle = '#e0c89a'; g.fillRect(0, 0, W, H); g.fillStyle = '#6f8a5a'; g.fillRect(0, H * 0.7, W, H); ell(g, W * 0.5, H * 0.55, W * 0.22, H * 0.1, 0, '#6b3f22'); },
];
const framedPic = (parent, w, h, x, y, z, paint, b = 0.075) => picture(parent, w, h, x, y, z, (g, W, Hh) => { paint(g, W, Hh); gilt(g, W, Hh, Math.round(W * b)); }, 384);

/** Un lienzo con capas: pintura, grietas finas, grietas con tinta y parches "sin pintar" que se van llenando. */
function makeCanvas(paint, w, h, { patches = 0 } = {}) {
  const g = new THREE.Group(); scene.add(g);
  const back0 = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.04, h + 0.04), INK); back0.position.z = -0.004; g.add(back0);
  const base = picture(g, w, h, 0, 0, 0, paint, 512);
  const cr = picture(g, w, h, 0, 0, 0.003, drawCracks('rgba(70,50,30,0.75)', 2), 512); cr.material.opacity = 0;
  const ink = picture(g, w, h, 0, 0, 0.005, drawCracks('#120a06', 3.2), 512); ink.material.opacity = 0;
  const cells = [];
  if (patches) {
    const cols = 4, rows = 5, r = rng(9), order = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) order.push({ i, j, k: r() * 0.4 + (Math.abs(i - 1.5) + Math.abs(j - 2)) * 0.12 });
    order.sort((a, b) => a.k - b.k);
    order.forEach(({ i, j }, n) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w / cols + 0.002, h / rows + 0.002), new THREE.MeshBasicMaterial({ color: (i + j) % 2 ? 0xefe6d2 : 0xe9dfc8 }));
      p.position.set(-w / 2 + (i + 0.5) * w / cols, -h / 2 + (j + 0.5) * h / rows, 0.007); p.userData.n = n / (cols * rows); g.add(p); cells.push(p); });
    const sketch = picture(g, w, h, 0, 0, 0.008, (cx, W, H) => { cx.strokeStyle = 'rgba(90,70,50,0.55)'; cx.lineWidth = 4; for (const [x, y, rx, ry] of [[0.5, 0.33, 0.08, 0.07], [0.16, 0.3, 0.07, 0.06], [0.84, 0.3, 0.07, 0.06], [0.14, 0.56, 0.07, 0.06], [0.86, 0.56, 0.07, 0.06]]) { cx.beginPath(); cx.ellipse(W * x, H * y, W * rx, H * ry, 0, 0, 7); cx.stroke(); } cx.beginPath(); cx.moveTo(0, H * 0.72); cx.lineTo(W, H * 0.72); cx.stroke(); }, 256);
    g.userData.sketch = sketch;
  }
  /** p = 0 (en blanco) .. 1 (terminado) */
  g.userData.reveal = p => { for (const m of cells) { const s = 1 - back(lin(p, m.userData.n * 0.9, m.userData.n * 0.9 + 0.08)); m.visible = s > 0.02; m.scale.setScalar(Math.max(s, 0.001)); } if (g.userData.sketch) g.userData.sketch.material.opacity = 1 - prog(p, 0.6, 0.95); };
  g.userData.cracks = (a, b) => { cr.material.opacity = a; ink.material.opacity = b; };
  return g;
}

// =====================================================================================
// OFICINA DE GÖRING (de caricatura: uniforme gris, medallas genéricas, sin símbolos)
// =====================================================================================
surface(scene, tex.stripes({ a: '#2f5a4a', b: '#2a5142', dot: '#c9a441', n: 8 }, 10, 5), 30, 12, GX, 6, -2.2);
surface(scene, tex.planks({ base: '#5a3820', line: '#3a2210', seed: 3, n: 10 }, 20, 1), 30, 0.95, GX, 0.475, -2.19); k.plane(scene, INK, 30, 0.06, GX, 0.95, -2.185);
surface(scene, tex.tiles({ base: '#c9b08a', line: '#8a7050', n: 4 }, 14, 10), 30, 30, GX, 0.001, 0, true);
for (const [r, col] of [[1.9, 0xd9a441], [1.78, 0x8f2433], [1.2, 0xa8404c]]) { const rug = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshLambertMaterial({ color: col })); rug.rotation.x = -PI / 2; rug.scale.y = 0.45; rug.position.set(GX + 0.1, 0.004 + (2 - r) * 0.002, 0.2); rug.receiveShadow = true; scene.add(rug); }
block(scene, 0xd9a441, GX - 8, GX + 8, 3.35, 3.5, -2.2, -2.04);
for (const x of [-2.9, 2.6]) { block(scene, 0xe9dcc0, GX + x - 0.15, GX + x + 0.15, 0, 3.35, -2.2, -2.0); block(scene, 0xd9a441, GX + x - 0.2, GX + x + 0.2, 0, 0.2, -2.2, -1.96); }
// la pared llena de cuadros (botín de guerra)
framedPic(scene, 0.9, 0.7, GX - 1.6, 1.85, -2.17, MINI[1]); framedPic(scene, 0.7, 0.55, GX - 0.55, 2.5, -2.17, MINI[0]);
framedPic(scene, 1.1, 0.8, GX + 0.75, 2.45, -2.17, MINI[2]); framedPic(scene, 0.6, 0.75, GX + 1.9, 1.9, -2.17, MINI[3]);
framedPic(scene, 0.75, 0.55, GX - 2.2, 2.85, -2.17, MINI[4]); framedPic(scene, 0.55, 0.45, GX + 1.85, 2.85, -2.17, MINI[0]); framedPic(scene, 0.5, 0.65, GX - 0.4, 1.5, -2.17, MINI[3]);
windowPic(scene, 1.0, 1.6, GX - 3.7, 2.1, -2.16, { curtain: '#8f2433' }); windowPic(scene, 1.0, 1.6, GX + 3.5, 2.1, -2.16, { curtain: '#8f2433' });
// escritorio enorme con teléfono y lámpara
block(scene, 0x6b3f22, GX + 1.45, GX + 2.75, 0, 0.78, -1.75, -1.05); block(scene, 0x8f5c33, GX + 1.4, GX + 2.8, 0.78, 0.85, -1.8, -1.0);
block(scene, 0x23262d, GX + 2.35, GX + 2.55, 0.85, 0.93, -1.5, -1.3, 0.01);
{ const sh = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.18, 14, 1, true), flat(0x3f8f6b, { side: THREE.DoubleSide })), 0.012); sh.position.set(GX + 1.7, 1.3, -1.4); scene.add(sh); block(scene, 0xd9a441, GX + 1.68, GX + 1.72, 0.85, 1.22, -1.38, -1.42, 0.008); }
// sillón dorado detrás
block(scene, 0x8f2433, GX + 1.8, GX + 2.4, 0.45, 1.7, -2.15, -1.95); block(scene, 0xd9a441, GX + 1.75, GX + 2.45, 1.7, 1.8, -2.17, -1.93, 0.012);
// araña de cristal que se mece
const chand = new THREE.Group(); chand.position.set(GX + 0.2, 3.35, -0.6); scene.add(chand);
block(chand, 0xd9a441, -0.015, 0.015, -0.5, 0, 0.015, -0.015, 0.006);
{ const ring = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 24), flat(0xd9a441)), 0.01); ring.rotation.x = PI / 2; ring.position.y = -0.55; chand.add(ring);
  for (let i = 0; i < 6; i++) { const a = i * PI / 3, cnd = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b8 })), 0.01); cnd.position.set(Math.cos(a) * 0.32, -0.47, Math.sin(a) * 0.32); chand.add(cnd); } }
const chandGlow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.25, depthWrite: false })); chandGlow.position.set(GX + 0.2, 2.85, -0.62); scene.add(chandGlow);
// caballete dorado para el "Vermeer"
const GEASEL = V(GX - 0.05, 0, 0.05);
{ const e = new THREE.Group(); e.position.copy(GEASEL); e.rotation.y = 0.25; scene.add(e);
  block(e, 0xb8862f, -0.36, -0.31, 0, 1.6, 0.03, -0.03, 0.012); block(e, 0xb8862f, 0.31, 0.36, 0, 1.6, 0.03, -0.03, 0.012); block(e, 0xb8862f, -0.03, 0.03, 0, 1.55, -0.28, -0.33, 0.01);
  block(e, 0xb8862f, -0.4, 0.4, 0.82, 0.88, 0.08, 0, 0.012); }
const GSLOT = V(GX - 0.05, 1.27, 0.12);
const adultera = new THREE.Group(); scene.add(adultera);
picture(adultera, 0.66, 0.74, 0, 0, 0, (g, W, H) => { drawAdultera(g, W, H); gilt(g, W, H, Math.round(W * 0.08)); }, 512);
const stamp = k.sign('FALSO', 0.5, 0.18, { bg: '#d63c3c', fg: '#ffffff' }); stamp.position.set(0, 0.05, 0.02); stamp.rotation.z = 0.25; adultera.add(stamp);
// la pila de cuadros robados que entrega a cambio
const PILE = V(GX - 1.55, 0, -0.35);
const loot = Array.from({ length: 11 }, (_, i) => { const f = framedPic(scene, 0.5, 0.38, 0, 0, 0, MINI[i % 5], 0.09); f.visible = false; return f; });
k.walker({ toon: { shirt: 0x8a9098, hair: 0x3a3a3a, hat: { type: 'kepi', color: 0x6a7078 }, detail: ['buttons', 'belt'] }, cx: GX + 3.0, z: -1.95, speed: 0.45, off: 1, dir: 1, span: 2.2 });

// =====================================================================================
// TALLER DEL PINTOR
// =====================================================================================
surface(scene, tex.bricks({ base: '#c9a27a', mortar: '#9a7a56', rows: 9, cols: 4, seed: 4 }, 10, 3.4), 30, 12, TX, 6, -2.2);
surface(scene, tex.planks({ base: '#a8743f', line: '#74491f', seed: 5, n: 7 }, 12, 9), 30, 30, TX, 0.001, 0, true);
picture(scene, 1.0, 1.25, TX - 1.55, 2.25, -2.17, (g, W, H) => {                   // ventana a un canal holandés
  g.fillStyle = '#9fd0ea'; g.fillRect(0, 0, W, H);
  const cols = ['#a8503a', '#6a4a3a', '#c98a5a', '#8a3a2a'];
  for (let i = 0; i < 4; i++) { const x = i * W / 4, hh = H * (0.45 + (i % 2) * 0.1); g.fillStyle = cols[i]; g.fillRect(x + 2, H * 0.75 - hh, W / 4 - 4, hh); shape(g, cols[i], [[x + 2, H * 0.75 - hh], [x + W / 8, H * 0.75 - hh - H * 0.1], [x + W / 4 - 2, H * 0.75 - hh]]);
    g.fillStyle = '#f3e3b0'; for (let j = 0; j < 3; j++) g.fillRect(x + W / 16, H * 0.75 - hh + H * 0.06 + j * H * 0.12, W / 8, H * 0.06); }
  g.fillStyle = '#3f6f9a'; g.fillRect(0, H * 0.75, W, H * 0.25); g.strokeStyle = '#cfe6f2'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(W * (0.05 + i * 0.16), H * (0.85 + (i % 2) * 0.06)); g.lineTo(W * (0.13 + i * 0.16), H * (0.85 + (i % 2) * 0.06)); g.stroke(); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  g.strokeStyle = '#1e1428'; g.lineWidth = 22; g.strokeRect(0, 0, W, H);
});
{ const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 4), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.13, depthWrite: false })); ray.position.set(TX - 0.9, 1.5, -1.2); ray.rotation.z = 0.6; scene.add(ray); }
const motes = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.016, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.8 })); m.userData = { x: -2 + (i * 0.37) % 3.2, y: 0.7 + (i * 0.53) % 2.4 }; scene.add(m); return m; });
// estante con frascos
block(scene, 0x7a4b2a, TX - 0.45, TX + 0.75, 2.2, 2.26, -2.18, -1.9, 0.012);
[[-0.35, 0x3b82c4, 0.22], [-0.18, 0xc8443a, 0.16], [0.0, 0xffd23a, 0.2], [0.2, 0x59c36a, 0.14], [0.38, 0x8a6bbf, 0.24], [0.6, 0xe0a030, 0.18]].forEach(([x, col, h]) => {
  const j = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, h, 12), flat(col)), 0.012); j.position.set(TX + x, 2.26 + h / 2, -2.03); scene.add(j); });
// lienzos apoyados contra la pared y un banquito
for (const [x, r, s] of [[-2.35, 0.12, 2], [-2.05, 0.08, 4], [2.3, -0.1, 0]]) { const f = framedPic(scene, 0.7, 0.85, TX + x, 0.45, -1.95, MINI[s]); f.rotation.x = -0.12; f.rotation.z = r; }
block(scene, 0x8f5c33, TX - 1.55, TX - 0.95, 0, 0.74, -1.5, -0.9); block(scene, 0x9a6638, TX - 1.6, TX - 0.9, 0.74, 0.8, -1.55, -0.85);         // mesa de trabajo
[[-1.45, 0x3b82c4], [-1.3, 0xffd23a], [-1.15, 0xc8443a]].forEach(([x, col]) => { const j = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10), flat(col)), 0.01); j.position.set(TX + x, 0.86, -1.2); scene.add(j); });
{ const pot = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 12), flat(0x7a8a9a)), 0.01); pot.position.set(TX - 1.0, 0.88, -1.15); scene.add(pot);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), flat(0x9a6638)); b.position.set(TX - 1.0 + (i - 1.5) * 0.02, 1.02, -1.15); b.rotation.z = (i - 1.5) * 0.2; scene.add(b); } }
// lámpara colgante
const hang = new THREE.Group(); hang.position.set(TX - 0.2, 3.6, -0.8); scene.add(hang);
block(hang, 0x2b2f3a, -0.01, 0.01, -0.8, 0, 0.01, -0.01, 0.005);
{ const sh = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 14, 1, true), flat(0x3f8f6b, { side: THREE.DoubleSide })), 0.012); sh.position.y = -0.86; hang.add(sh); const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b8 })); b.position.y = -0.94; hang.add(b); }
// reloj de pared (gira rápido con "décadas")
const clock = new THREE.Group(); clock.position.set(TX - 0.45, 2.85, -2.15); scene.add(clock);
picture(clock, 0.38, 0.38, 0, 0, 0, (g, W) => { g.fillStyle = '#1e1428'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#d9a441'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 12, 0, 7); g.fill();
  g.fillStyle = '#fbf3dc'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 26, 0, 7); g.fill(); g.fillStyle = '#1e1428'; for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.fillRect(W / 2 + Math.sin(a) * (W / 2 - 40) - 4, W / 2 - Math.cos(a) * (W / 2 - 40) - 4, 8, 8); } });
const clockHand = (len, w) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), INK); m.geometry.translate(0, len / 2 - 0.015, 0); m.position.z = 0.012; clock.add(m); return m; };
const hourH = clockHand(0.08, 0.022), minH = clockHand(0.13, 0.015);
// caballete
const EASEL = V(TX + 0.15, 0, 0.0);
{ const e = new THREE.Group(); e.position.copy(EASEL); e.rotation.y = -0.15; scene.add(e);
  block(e, 0x9a6638, -0.34, -0.29, 0, 1.75, 0.03, -0.03, 0.01); block(e, 0x9a6638, 0.29, 0.34, 0, 1.75, 0.03, -0.03, 0.01); block(e, 0x9a6638, -0.03, 0.03, 0, 1.7, -0.3, -0.35, 0.01);
  block(e, 0x9a6638, -0.38, 0.38, 0.93, 0.99, 0.08, 0, 0.01); block(e, 0x9a6638, -0.38, 0.38, 1.72, 1.77, 0.05, 0, 0.01); }
const SLOT = V(TX + 0.15, 1.35, 0.07);
const CW = 0.62, CH = 0.74;
const cvWoman = makeCanvas(drawWoman, CW, CH); cvWoman.rotation.y = -0.15;
const cvDoc = makeCanvas(drawDoctors, CW, CH, { patches: true }); cvDoc.rotation.y = -0.15; cvDoc.position.copy(SLOT);
// el horno
const OV = { x0: TX + 0.95, x1: TX + 1.8, z0: -1.05, z1: -0.25 };
block(scene, 0x8a4a3a, OV.x0, OV.x1, 0, 1.3, OV.z0, OV.z1);
surface(scene, tex.bricks({ base: '#a8584a', mortar: '#6a3a2a', rows: 6, cols: 3, seed: 2 }, 1, 1), OV.x1 - OV.x0 - 0.04, 1.26, (OV.x0 + OV.x1) / 2, 0.65, OV.z1 + 0.012);
block(scene, 0x3a3f4d, OV.x0 - 0.03, OV.x1 + 0.03, 1.3, 1.38, OV.z0 - 0.03, OV.z1 + 0.03, 0.012);
const OVC = V((OV.x0 + OV.x1) / 2, 0.72, OV.z1);
const mouthGlow = k.plane(scene, new THREE.MeshBasicMaterial({ color: 0xff9a3a }), 0.6, 0.48, OVC.x, OVC.y, OV.z1 + 0.016);
k.plane(scene, INK, 0.66, 0.54, OVC.x, OVC.y, OV.z1 + 0.014);
const door = new THREE.Group(); door.position.set(OVC.x - 0.32, OVC.y, OV.z1 + 0.03); scene.add(door);
block(door, 0x3a3f4d, 0, 0.64, -0.26, 0.26, 0.02, -0.02, 0.014);
const doorWin = k.plane(door, new THREE.MeshBasicMaterial({ color: 0xffb04a }), 0.3, 0.18, 0.32, 0.05, 0.022);
{ const kn = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0xd9a441)), 0.01); kn.position.set(0.56, -0.08, 0.04); door.add(kn); }
const dial = new THREE.Group(); dial.position.set(OVC.x, 1.13, OV.z1 + 0.03); scene.add(dial);
picture(dial, 0.26, 0.26, 0, 0, 0, (g, W) => { g.fillStyle = '#1e1428'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#fbf3dc'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 14, 0, 7); g.fill();
  g.strokeStyle = '#d63c3c'; g.lineWidth = 12; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 30, -0.4, 0.9); g.stroke(); g.fillStyle = '#1e1428'; for (let i = 0; i <= 8; i++) { const a = -2.4 + i * 0.6; g.fillRect(W / 2 + Math.cos(a) * (W / 2 - 34) - 3, W / 2 + Math.sin(a) * (W / 2 - 34) - 3, 6, 6); } });
const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.1), INK); needle.geometry.translate(0, 0.045, 0); needle.position.z = 0.012; dial.add(needle);
{ const pipe = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 12), flat(0x3a3f4d)), 0.012); pipe.position.set(OV.x1 - 0.2, 2.85, -0.7); scene.add(pipe); }
const smoke = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe8e4ee, transparent: true, depthWrite: false })); scene.add(m); return m; });
const waves = [0, 1, 2].map(() => { const g = new THREE.Group(); scene.add(g); k.stroke(g, Array.from({ length: 7 }, (_, i) => [0.03 * Math.sin(i * 1.4), i * 0.06]), 0.018, false, 0); return g; });
const OVEN_IN = V(OVC.x, OVC.y, OV.z1 - 0.35);
// herramientas en las manos del pintor
const paletteM = new THREE.Group(); scene.add(paletteM);
{ const d = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.015, 20), flat(0xc08a54)), 0.012); d.rotation.x = PI / 2; paletteM.add(d);
  [0xc8443a, 0x3b82c4, 0xffd23a, 0x59c36a, 0xf4f1e8].forEach((col, i) => { const p = new THREE.Mesh(new THREE.CircleGeometry(0.026, 10), new THREE.MeshBasicMaterial({ color: col })); p.position.set(Math.cos(i * 1.1 + 0.3) * 0.1, Math.sin(i * 1.1 + 0.3) * 0.1, 0.012); paletteM.add(p); }); }
const amberSpot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), new THREE.MeshBasicMaterial({ color: 0xd9822b })); amberSpot.position.set(-0.03, -0.04, 0.014); paletteM.add(amberSpot);
const brush = new THREE.Group(); scene.add(brush);
{ const h = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), flat(0x9a6638)), 0.008); h.position.y = 0.06; brush.add(h); }
const brushTip = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), flat(0x3b82c4)), 0.008); brushTip.scale.y = 1.6; brushTip.position.y = -0.1; brush.add(brushTip);
const jar = new THREE.Group(); scene.add(jar);
{ const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.2, 14), flat(0xd9822b)), 0.012); jar.add(b); const lab = k.sign('BAQUELITA', 0.16, 0.07, { bg: '#fbf3dc' }); lab.position.set(0, 0, 0.082); jar.add(lab); }
const drops = Array.from({ length: 5 }, () => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), flat(0xd9822b)), 0.006); m.scale.y = 1.5; m.visible = false; scene.add(m); return m; });
const roller = new THREE.Group(); scene.add(roller);
{ const cyl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16), flat(0xe0d4b8)), 0.012); cyl.rotation.z = PI / 2; roller.add(cyl);
  block(roller, 0x23262d, -0.2, -0.17, -0.01, 0.01, 0.01, -0.01, 0.005); block(roller, 0x9a6638, -0.42, -0.19, -0.02, 0.02, 0.02, -0.02, 0.008); }
const inkBottle = new THREE.Group(); scene.add(inkBottle);
{ const b = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.13, 12), flat(0x23262d)), 0.012); inkBottle.add(b); const lab = k.sign('TINTA', 0.11, 0.05, { bg: '#fbf3dc' }); lab.position.set(0, 0, 0.072); inkBottle.add(lab); }
const wetDrips = Array.from({ length: 4 }, (_, i) => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), flat([0xe2b53a, 0x3f63a8, 0xa8402f, 0x8f8468][i])), 0.005); m.scale.y = 1.8; m.visible = false; scene.add(m); return m; });
const magnifier = new THREE.Group(); scene.add(magnifier);
{ const ring = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24), flat(0xd9a441)), 0.008); magnifier.add(ring);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.35 })); magnifier.add(lens);
  const h = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), flat(0x23262d)), 0.006); h.position.set(0.1, -0.13, 0); h.rotation.z = 0.7; magnifier.add(h); }
const camBox = new THREE.Group(); scene.add(camBox);
{ block(camBox, 0x23262d, -0.09, 0.09, -0.06, 0.06, 0.05, -0.05, 0.01); const l = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 12), flat(0x3a3f4d)), 0.008); l.rotation.x = PI / 2; l.position.z = 0.08; camBox.add(l);
  const fl = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.05, 14), flat(0xdfe3ea)), 0.008); fl.rotation.x = PI / 2; fl.position.set(0.05, 0.13, 0.03); camBox.add(fl); block(camBox, 0x23262d, 0.04, 0.06, 0.06, 0.12, 0.01, -0.01, 0.004); }
const flash = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, depthTest: false })); flash.renderOrder = 9; scene.add(flash);
// el "Vermeer" que Göring compró, flotando cuando confiesa (con una cruz)
const ghost = new THREE.Group(); scene.add(ghost);
picture(ghost, 0.5, 0.56, 0, 0, 0, (g, W, H) => { drawAdultera(g, W, H); gilt(g, W, H, Math.round(W * 0.08)); }, 384);
const ghostStamp = k.sign('FALSO', 0.42, 0.15, { bg: '#d63c3c', fg: '#ffffff' }); ghostStamp.position.set(0, 0.0, 0.02); ghostStamp.rotation.z = 0.25; ghost.add(ghostStamp);
// retrato de caricatura de Göring (el comprador) para el gancho
const gorPortrait = new THREE.Group(); scene.add(gorPortrait);
picture(gorPortrait, 0.5, 0.56, 0, 0, 0, (g, W, H) => {
  g.fillStyle = '#2f5a4a'; g.fillRect(0, 0, W, H);
  ell(g, W / 2, H * 1.05, W * 0.46, H * 0.42, 0, '#9aa0a8');                                  // uniforme gris
  [[0.36, '#d9a441'], [0.46, '#dfe3ea'], [0.6, '#d9a441']].forEach(([x, col]) => { ell(g, W * x, H * 0.82, W * 0.035, W * 0.035, 0, col); g.fillStyle = '#d63c3c'; g.fillRect(W * x - 5, H * 0.74, 10, H * 0.05); });
  ell(g, W / 2, H * 0.5, W * 0.27, H * 0.24, 0, '#f2c2a0');                                   // cara redonda
  g.fillStyle = '#8a9098'; g.fillRect(W * 0.24, H * 0.2, W * 0.52, H * 0.12); ell(g, W / 2, H * 0.33, W * 0.3, H * 0.035, 0, '#23262d');   // gorra
  ell(g, W * 0.42, H * 0.48, W * 0.025, H * 0.025, 0, '#1e1428'); ell(g, W * 0.58, H * 0.48, W * 0.025, H * 0.025, 0, '#1e1428');
  g.strokeStyle = '#1e1428'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H * 0.56, W * 0.09, 0.2, PI - 0.2); g.stroke();
  gilt(g, W, H, Math.round(W * 0.08));
}, 384);

// =====================================================================================
// TRIBUNAL (Ámsterdam, 1947)
// =====================================================================================
surface(scene, tex.planks({ base: '#8f5c33', line: '#5f3b1f', seed: 8, n: 8 }, 10, 3), 30, 12, CX, 6, -2.4);
surface(scene, tex.tiles({ base: '#d8cdb4', line: '#a89c80', n: 4 }, 14, 10), 30, 30, CX, 0.001, 0, true);
for (const x of [-2.4, 1.25, 4.4]) windowPic(scene, 0.9, 1.9, CX + x, 2.4, -2.37, { curtain: '#2f4a7a' });
k.plane(scene, INK, 30, 0.06, CX, 1.0, -2.385);
picture(scene, 0.6, 0.6, CX - 1.6, 2.95, -2.37, (g, W) => { g.fillStyle = '#1e1428'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#d9a441'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 14, 0, 7); g.fill();
  g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.beginPath(); g.moveTo(W / 2, W * 0.22); g.lineTo(W / 2, W * 0.78); g.moveTo(W * 0.25, W * 0.35); g.lineTo(W * 0.75, W * 0.35); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(W / 2 + s * W * 0.25, W * 0.35); g.lineTo(W / 2 + s * W * 0.32, W * 0.55); g.lineTo(W / 2 + s * W * 0.18, W * 0.55); g.closePath(); g.stroke(); } });      // balanza de la justicia
// estrado con los jueces
block(scene, 0x6b3f22, CX - 1.0, CX + 2.0, 0, 0.42, -2.35, -1.45);                 // tarima
block(scene, 0x7a4b2a, CX - 2.15, CX + 0.25, 0, 1.3, -1.45, -1.2); block(scene, 0x9a6638, CX - 2.2, CX + 0.3, 1.3, 1.38, -1.5, -1.15);
for (const x of [-1.75, -1.05, -0.35]) block(scene, 0x8f5c33, CX + x - 0.28, CX + x + 0.28, 0.2, 1.1, -1.2, -1.17, 0.012);
block(scene, 0x5a3a22, CX - 0.85, CX - 0.63, 1.38, 1.42, -1.38, -1.25, 0.008);
const gavel = new THREE.Group(); scene.add(gavel);
{ const hd = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.15, 12), flat(0x6b3f22)), 0.01); hd.rotation.z = PI / 2; gavel.add(hd); const h = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.22, 8), flat(0x9a6638)), 0.006); h.position.y = -0.11; gavel.add(h); }
// banquillo del acusado
block(scene, 0x7a4b2a, CX + 0.35, CX + 1.3, 0, 0.75, 0.0, 0.12); block(scene, 0x9a6638, CX + 0.3, CX + 1.35, 0.75, 0.81, -0.03, 0.15);
// público detrás de la baranda
block(scene, 0x6b3f22, CX + 1.75, CX + 4.2, 0, 0.25, -2.35, -1.0);
block(scene, 0x7a4b2a, CX + 1.7, CX + 4.2, 0.82, 0.88, -0.12, -0.04); for (let x = 1.78; x < 4.2; x += 0.16) block(scene, 0x9a6638, CX + x - 0.02, CX + x + 0.02, 0, 0.82, -0.1, -0.06, 0.006);
const pollSign = new THREE.Group(); scene.add(pollSign);
{ const s = k.sign('¡ENGAÑÓ A GÖRING!', 0.9, 0.3, { bg: '#ffd23a' }); pollSign.add(s); block(pollSign, 0x7a4b2a, -0.02, 0.02, -0.65, -0.15, 0.01, -0.01, 0.008); }
const confetti = Array.from({ length: 26 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.035), new THREE.MeshBasicMaterial({ color: [0xffd23a, 0xd63c3c, 0x3b82c4, 0x59c36a, 0xffffff][i % 5], side: THREE.DoubleSide })); m.visible = false; m.userData = { x: (i * 0.37) % 2.6, s: 0.6 + (i % 4) * 0.25, d: (i * 0.29) % 1 }; scene.add(m); return m; });

// ---------- personajes ----------
const han = makeToon({ shirt: 0x3f6ea8, hair: 0x8a6a4a, mustache: true, detail: ['apron', 'collar'], trim: 0xf4f1e8 }); scene.add(han.root);
{ const beret = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12), flat(0x2b2f3a)), 0.016); beret.scale.set(1.05, 0.32, 1.05); beret.position.set(0.03, 0.25, -0.03); beret.rotation.z = -0.18; han.head.add(beret);
  const nub = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), flat(0x2b2f3a)), 0.008); nub.position.set(0.02, 0.35, -0.03); han.head.add(nub); }
const goring = makeToon({ shirt: 0x9aa0a8, skin: 0xf2c2a0, hair: 0xb59a6a, hat: { type: 'kepi', color: 0x8a9098 }, detail: ['buttons', 'belt', 'collar'], trim: 0x8a9098 });
const fat = new THREE.Group(); fat.scale.set(1.3, 1, 1.2); fat.add(goring.root); scene.add(fat);
{ const body = goring.head.parent;                                                // medallas genéricas
  [[-0.1, 0.96, 0xd9a441, 0xd63c3c], [-0.04, 0.93, 0xdfe3ea, 0x3b82c4], [0.08, 0.95, 0xd9a441, 0x59c36a]].forEach(([x, y, col, rib]) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.05), new THREE.MeshBasicMaterial({ color: rib })); r.position.set(x, y + 0.04, 0.2); body.add(r);
    const m = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.01, 12), flat(col)), 0.006); m.rotation.x = PI / 2; m.position.set(x, y, 0.205); body.add(m); }); }
const agent = makeToon({ shirt: 0x7a4b2a, hair: 0x23262d, hat: { type: 'bowler', color: 0x2b2f3a }, mustache: true, detail: ['buttons', 'collar'], trim: 0xf4f1e8 }); scene.add(agent.root);
const copA = makeToon({ shirt: 0x2f4a8a, hair: 0x1b2440, hat: { type: 'kepi', color: 0x1b2440 }, detail: ['buttons', 'badge', 'belt'] }); scene.add(copA.root);
const copB = makeToon({ shirt: 0x2f4a8a, hair: 0x6b4a2a, hat: { type: 'kepi', color: 0x1b2440 }, mustache: true, detail: ['buttons', 'badge', 'belt'] }); scene.add(copB.root);
const photo = makeToon({ shirt: 0xb5654a, hair: 0x23262d, hat: { type: 'fedora', color: 0x4a3222, band: 0x15171c }, detail: ['collar', 'tie'] }); scene.add(photo.root);
const expert = makeToon({ shirt: 0x4f8f6b, hair: 0xdfe3ea, skin: 0xf0c8a8, mustache: true, detail: ['collar', 'tie', 'buttons'] }); scene.add(expert.root);
const pressTag = k.sign('PRENSA', 0.16, 0.06, { bg: '#fbf3dc' }); photo.head.add(pressTag); pressTag.position.set(0.1, 0.27, 0.2); pressTag.rotation.set(-0.3, 0, -0.1);
const judges = [[-1.75, 0x23262d, 0xdfe3ea], [-1.05, 0x23262d, 0x9aa0a8], [-0.35, 0x23262d, 0x6b4a2a]].map(([x, sh, hair]) => { const j = makeToon({ shirt: sh, hair, detail: ['collar'], trim: 0xffffff, mustache: x < 0 }); scene.add(j.root); j.x = CX + x; return j; });
const PUB = [[1.95, -0.45, 0, 0xc8553d, 0x23262d, 'bowler'], [2.65, -0.45, 0, 0x8a6bbf, 0xe0b050, null], [3.35, -0.45, 0, 0x59a36a, 0x6b4a2a, 'boater'], [2.3, -1.4, 0.25, 0xe0a030, 0x9aa0a8, 'fedora'], [3.0, -1.4, 0.25, 0x3b82c4, 0x23262d, null], [3.7, -1.4, 0.25, 0xd9b23a, 0x8a5a33, 'bowler']];
const pub = PUB.map(([x, z, y, sh, hair, hat]) => { const p = makeToon({ shirt: sh, hair, hat: hat ? { type: hat, color: 0x3a3f4d, band: 0xc8443a } : null, detail: ['buttons'] }); scene.add(p.root); return { p, x: CX + x, z, y }; });

// ---------- signos y partículas ----------
const sparks = [0, 1, 2, 3].map(() => k.glyph('✦', '#fff1a8', 0.3));
const qA = k.glyph('?', '#ffd23a', 0.45), qB = k.glyph('?', '#ffd23a', 0.45), bang = k.glyph('!', '#ffd23a', 0.55), okMark = k.glyph('✓', '#59c36a', 0.55), xMark = k.glyph('✗', '#d63c3c', 0.6);
const sweat = [0, 1, 2].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const puffA = k.puffs(4), puffB = k.puffs(4), puffC = k.puffs(5), puffD = k.puffs(4);
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), hA = V(0, 0, 0), hB = V(0, 0, 0);
const head = { han: V(0, 0, 0), gor: V(0, 0, 0), ag: V(0, 0, 0), copA: V(0, 0, 0), copB: V(0, 0, 0), photo: V(0, 0, 0), exp: V(0, 0, 0), judge: V(0, 0, 0) };

// ---------- quién está dónde ----------
const HX = TX - 0.45;                       // el pintor frente al caballete
const inHook = t => t < c[1] + 0.36;
const docP = t => inHook(t) ? lerp(0.7, 0.93, prog(t, 0, c[1])) : lerp(0, 1, prog(t, c[7] + 0.5, expT - 0.2));
// brochazos: la mano va y viene sobre el lienzo
const strokeAt = (t, k0 = 0) => V(SLOT.x - 0.12 + 0.12 * Math.sin(t * 3.1 + k0), SLOT.y + 0.05 + 0.18 * Math.sin(t * 2.3 + k0), SLOT.z + 0.09);
const painting2 = t => (t >= c[1] + 0.36 && t < oleoT) || (t >= c[5] && t < acuT - 0.4) || inHook(t) || (t >= c[7] + 0.5 && t < expT);

function poseHan(t) {
  han.root.visible = (t < c[4]) || (t >= c[5] && t < c[9]) || t >= c[9];
  brush.visible = paletteM.visible = jar.visible = roller.visible = inkBottle.visible = false;
  if (!han.root.visible) return;
  let p;
  if (t < c[4]) {
    if (t >= hornT - 0.1 && t < c[3] + 1.0) {                          // al horno y de vuelta
      const toOven = go(t, hornT - 0.05, hornT + 0.75, HX, TX + 0.45);
      if (t < hornT + 0.8) p = { ...toOven, mood: 'effort', handL: V(toOven.x + 0.25, 1.02, 0.12), wL: 1, handR: V(toOven.x + 0.25, 1.08, 0.3), wR: 1 };
      else if (t < c[3] + 0.1) { const push = prog(t, hornT + 0.8, hornT + 1.25);
        p = { x: TX + 0.45, face: lerp(PI / 2, 0.9, prog(t, hornT + 1.3, hornT + 1.6)), lean: 0.2 * win(t, hornT + 0.8, hornT + 1.3, 0.15), squash: breathe(t), look: t < hornT + 1.4 ? V(OVC.x, 0.9, 0) : V(TX + 0.45, 1.4, 4),
          handL: V(lerp(TX + 0.75, OVC.x - 0.2, push), 0.95, 0.0), handR: V(lerp(TX + 0.75, OVC.x - 0.2, push), 1.05, 0.0), wL: 1 - prog(t, hornT + 1.3, hornT + 1.5), wR: 1 - prog(t, hornT + 1.3, hornT + 1.5),
          y: hop(t, cienT + 0.1, 0.12), ...moodAt(t, [[0, 'effort'], [hornT + 1.3, 'happy'], [gradT, 'sly']]) };
        if (p.wR < 0.5) { p.handR = talk(t, p.x, 0, 1); p.wR = 0.8; } }
      else p = { ...go(t, c[3] + 0.1, c[3] + 0.95, TX + 0.45, HX), mood: 'happy' };
    } else {
      p = { x: HX, face: 0.75, squash: breathe(t), look: V(SLOT.x, SLOT.y, SLOT.z + 0.3), mood: 'neutral' };
      if (painting2(t)) { brush.visible = paletteM.visible = true; p.handR = strokeAt(t); p.wR = 1; p.handL = V(HX - 0.3, 1.05, 0.25); p.wL = 1; p.mood = 'happy'; }
      if (t >= c[1] + 0.36 && t < hornT - 0.1) {
        if (t < oleoT) { p.look = t < verT ? V(HX + 0.3, 1.5, 4) : V(SLOT.x, SLOT.y, SLOT.z + 0.3); }
        else if (t < mezT) { const touch = win(t, oleoT + 0.1, decT + 0.6, 0.2); p.handR = V(SLOT.x - 0.05, SLOT.y - 0.05, SLOT.z + 0.08); p.wR = touch; p.handL = talk(t, HX, 0, -1); p.wL = 0.6;
          Object.assign(p, moodAt(t, [[0, 'neutral'], [oleoT + 0.3, 'surprised'], [decT + 0.4, 'worried']])); p.look = t < decT + 0.6 ? V(SLOT.x, SLOT.y, SLOT.z + 0.3) : V(HX, 1.4, 4); }
        else { paletteM.visible = true; jar.visible = t > baqT - 0.4; p.handL = V(HX - 0.12, 0.84, 0.36); p.wL = 1; p.handR = V(HX + 0.3, 0.86, 0.42); p.wR = back(lin(t, baqT - 0.45, baqT - 0.15));
          p.look = V(HX - 0.05, 1.0, 0.5); Object.assign(p, moodAt(t, [[0, 'neutral'], [baqT, 'sly']])); p.face = 0.35; }
      }
      if (t >= c[3] + 0.95) {
        p.y = hop(t, c[3] + 0.95, 0.08);
        if (t < tintaT - 0.2) { roller.visible = t > rodT - 0.25; const u = prog(t, rodT, tintaT - 0.3);
          p.handR = V(SLOT.x - 0.38 + 0.05 * Math.sin(t * 9), SLOT.y + 0.22 * Math.sin(t * 6), SLOT.z + 0.12); p.wR = back(lin(t, rodT - 0.3, rodT)); p.handL = talk(t, HX, 0, -1); p.wL = 0.7; p.mood = 'effort';
          roller.position.set(SLOT.x - 0.02 + 0.12 * Math.sin(u * 9), SLOT.y + 0.22 * Math.sin(t * 6), SLOT.z + 0.12); roller.rotation.x = t * 12; }
        else { inkBottle.visible = brush.visible = true; p.handL = V(HX - 0.15, 1.0, 0.35); p.wL = 1; p.handR = strokeAt(t * 1.6, 1); p.wR = 1; p.mood = t < tresT - 0.2 ? 'sly' : 'happy';
          if (t > tresT - 0.2) p.look = V(HX + 0.3, 1.5, 4); }
      }
      if (inHook(t)) { p.mood = 'effort'; p.look = V(SLOT.x, SLOT.y, SLOT.z + 0.3); }
    }
  } else if (t < c[9]) {                                                   // la policía, la confesión, el cuadro vigilado
    p = { x: HX, face: 0.75, squash: breathe(t), look: V(SLOT.x, SLOT.y, SLOT.z + 0.3), mood: 'happy' };
    if (painting2(t)) { brush.visible = paletteM.visible = true; p.handR = strokeAt(t); p.wR = 1; p.handL = V(HX - 0.3, 1.05, 0.25); p.wL = 1; p.mood = t < c[7] ? 'happy' : 'effort'; }
    if (t >= acuT - 0.4 && t < c[7] + 0.5) {
      const up = win(t, traiT - 0.15, c[6] + 0.2, 0.15);
      p.face = lerp(0.75, -0.55, prog(t, acuT - 0.4, acuT - 0.1)); p.look = V(head.copA.x, 1.4, 1.5);
      p.y = hop(t, acuT - 0.3, 0.2); p.squash = settle(t, acuT + 0.1, 0.12) * breathe(t);
      p.handL = V(HX - 0.3, 1.85, 0.15); p.handR = V(HX + 0.3, 1.85, 0.15); p.wL = p.wR = up;
      Object.assign(p, moodAt(t, [[0, 'neutral'], [acuT - 0.3, 'surprised'], [traiT + 0.3, 'worried'], [confT, 'sly'], [pintoT - 0.1, 'happy']]));
      if (t >= confT - 0.1) { p.face = lerp(-0.55, 0.05, prog(t, confT - 0.1, confT + 0.3)); p.look = t < pintoT ? V(HX - 0.4, 1.45, 2.5) : V(HX, 1.45, 4);
        p.handR = V(HX + 0.05, 1.0, 0.25); p.wR = back(lin(t, pintoT - 0.15, pintoT + 0.15)); p.handL = talk(t, HX, 0, -1); p.wL = win(t, confT, c[7], 0.2) * 0.9; p.y = hop(t, pintoT, 0.16); }
      if (t >= c[7]) { p.face = lerp(0.05, 0.75, prog(t, c[7], c[7] + 0.35)); p.look = V(SLOT.x, SLOT.y, SLOT.z + 0.3); p.mood = 'neutral'; }
    }
    if (t >= expT - 0.1) { p.face = lerp(0.75, 0.2, prog(t, expT - 0.1, expT + 0.3)); p.look = t < retT ? V(head.exp.x, 1.4, 1) : V(HX, 1.45, 4);
      p.y = hop(t, retT + 0.1, 0.2); p.squash = settle(t, retT + 0.5, 0.12) * breathe(t); Object.assign(p, moodAt(t, [[0, 'worried'], [falso2T, 'surprised'], [retT + 0.1, 'happy']]));
      p.handL = V(HX - 0.3, 1.8, 0.2); p.wL = back(lin(t, retT + 0.1, retT + 0.4)); }
  } else {                                                                  // en el tribunal
    const x = CX + 0.9, z = 0.45;
    p = { x, z, face: -0.3, squash: breathe(t), look: t < anoT + 0.4 ? V(CX - 1.05, 1.75, 1.2) : V(x - 0.2, 1.45, 4), ...moodAt(t, [[0, 'neutral'], [condT + 0.2, 'surprised'], [anoT + 0.2, 'worried']]) };
    p.y = hop(t, condT + 0.15, 0.12);
    p.handL = talk(t, x, z, -1); p.wL = 0.5 * win(t, c[9] + 0.3, condT, 0.2);
    if (t >= infT - 0.3) { const ch = back(lin(t, infT - 0.3, infT)); p.handL = V(x - 0.05, 1.02, z + 0.25); p.handR = V(x + 0.1, 0.98, z + 0.26); p.wL = p.wR = ch; p.mood = 'worried'; p.lean = 0.1 * ch; p.face = lerp(-0.55, -0.1, prog(t, infT - 0.3, infT + 0.2)); p.look = V(x - 0.3, 1.3, 4); }
  }
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, p.z || 0, -1); p.wL = 0.7; }
  han.pose(alive({ blink: blinkAt(t, 0), ...p }, t, 0)); han.head.getWorldPosition(head.han);
  // herramientas pegadas a las manos
  if (brush.visible) { han.hand(1, brush.position); brush.position.y += 0.06; brush.rotation.set(0.3, 0, -0.6); brushTip.material.color.set(inkBottle.visible ? 0x15171c : 0x3b82c4); }
  if (paletteM.visible) { han.hand(0, paletteM.position); paletteM.position.z += 0.03; paletteM.rotation.set(0, 0.3, 0.2); amberSpot.visible = t > baqT + 0.3; }
  if (inkBottle.visible) { han.hand(0, inkBottle.position); inkBottle.position.y += 0.05; }
  if (jar.visible) { han.hand(1, jar.position); jar.position.y += 0.07; jar.rotation.z = 1.7 * back(lin(t, baqT, baqT + 0.35)); jar.rotation.x = 0; jar.scale.setScalar(Math.max(back(lin(t, baqT - 0.45, baqT - 0.15)), 0.001)); }
}

function poseGoring(t) {
  const on = t >= c[4] && t < c[5];
  fat.visible = on; if (!on) return;
  const x = GX + 0.8; fat.position.set(x, 0, 0);
  let p = { face: -0.45, squash: breathe(t, 1), look: V(GSLOT.x, GSLOT.y, GSLOT.z + 0.4), mood: 'happy' };
  if (t < salvT) {
    p.handL = V(x - 0.4, 1.25 + 0.06 * Math.sin(t * 5), 0.35); p.wL = back(lin(t, 0.4, 0.8));
    p.handR = V(x + 0.32, 1.0, 0.2); p.wR = 1;
    if (t > goringT + 0.2 && t < falsoT) p.look = V(x - 0.3, 1.5, 4);
    p.y = hop(t, goringT, 0.1);
  } else {
    const arrive = c[4] + 1.6;
    p.look = t < arrive ? V(head.ag.x, 1.4, 1.5) : V(GSLOT.x, GSLOT.y, GSLOT.z + 0.4);
    Object.assign(p, moodAt(t, [[0, 'sly'], [arrive + 0.3, 'happy']]));
    p.y = hop(t, arrive + 0.3, 0.18); p.squash = settle(t, arrive + 0.7, 0.14) * breathe(t, 1);
    if (t > numT - 0.2 && t < cien2T) { p.look = V(x - 0.2, 1.5, 4); p.handR = V(x + 0.25, 1.9, 0.2); p.wR = back(lin(t, numT - 0.2, numT + 0.1)); }
    if (t >= cien2T - 0.3) { const fl = win(t, cien2T - 0.3, c[5], 0.2); p.handL = V(x - 0.45 + 0.08 * Math.sin(t * 12), 1.35, 0.3); p.wL = fl; p.look = V(PILE.x, 1.0, 0.5); p.mood = 'sly'; }
  }
  if (p.handL === undefined) { p.handL = talk(t, x, 0, -1); p.wL = 0.7; }
  goring.pose(alive({ blink: blinkAt(t, 0.7), ...p }, t, 2)); goring.head.getWorldPosition(head.gor);
}

function poseAgent(t) {
  agent.root.visible = t >= c[4] && t < c[5]; if (!agent.root.visible) return;
  const AX = GX - 0.85, arrive = c[4] + 1.2;
  let p;
  if (t < arrive) p = { ...go(t, c[4], arrive, GX - 2.8, AX), mood: 'happy', handL: V(0, 0, 0), wL: 0, handR: V(0, 0, 0), wR: 0 };
  else p = { x: AX, face: 0.55, squash: settle(t, arrive, 0.1) * breathe(t, 3), look: V(head.gor.x, 1.5, 0.5), ...moodAt(t, [[0, 'happy'], [cien2T, 'surprised'], [robT + 0.3, 'happy']]) };
  const carry = t < arrive + 0.5;
  if (carry) { p.handL = V(p.x + 0.28, 1.0, 0.1); p.handR = V(p.x + 0.3, 1.05, 0.3); p.wL = p.wR = 1; }
  else { p.handR = talk(t, AX, 0, 1); p.wR = 0.6; if (t > cien2T) { p.handL = V(AX - 0.35, 1.7, 0.2); p.wL = back(lin(t, cien2T, cien2T + 0.3)); p.y = hop(t, cien2T + 0.1, 0.16); } }
  agent.pose(alive({ blink: blinkAt(t, 1.3), ...p }, t, 3)); agent.head.getWorldPosition(head.ag);
}

const COPA = V(TX - 1.2, 0, -0.65), COPB = V(TX + 1.7, 0, -0.15);
const PHOTO = V(TX - 1.9, 0, 0.6), EXPERT = V(TX + 0.7, 0, 0.75);
function poseWitnesses(t) {
  const copsOn = inHook(t) || (t >= acuT - 1.3 && t < c[9]);
  copA.root.visible = copB.root.visible = copsOn;
  const sideOn = inHook(t) || (t >= c[7] && t < c[9]);
  photo.root.visible = expert.root.visible = sideOn;
  camBox.visible = photo.root.visible; magnifier.visible = expert.root.visible && t > expT - 0.3 && !inHook(t);
  if (copsOn) {
    [[copA, COPA, 0, head.copA], [copB, COPB, 1, head.copB]].forEach(([cp, P, i, hd]) => {
      let p;
      const t0 = acuT - 1.3 + i * 0.15, t1 = acuT - 0.35 + i * 0.15;
      if (!inHook(t) && t < t1 + 0.1) p = { ...go(t, t0, t1, P.x + (i ? 1.6 : -1.6), P.x, 0.5), z: P.z };
      else {
        p = { x: P.x, z: P.z, face: i ? -0.6 : 0.75, squash: breathe(t, 4 + i), look: V(head.han.x, 1.4, 0.5), mood: 'sly' };
        if (!inHook(t) && t < c[7]) {
          Object.assign(p, moodAt(t, [[0, 'angry'], [pintoT, 'surprised'], [pintoT + 0.6, 'sly']]));
          if (i === 0) { p.handR = V(P.x + 0.45, 1.3, P.z + 0.3); p.wR = back(lin(t, acuT - 0.1, acuT + 0.2)) * (1 - prog(t, confT, confT + 0.3)); }
          if (t > pintoT) { p.tilt = 0.15; p.handL = V(P.x - 0.1, 1.2, P.z + 0.3); p.wL = 0.9; }
        }
        if (t >= retT) { p.mood = 'happy'; p.y = hop(t, retT + 0.2 + i * 0.1, 0.12); }
        if (t >= c[7] && t < retT) p.mood = 'sly';
      }
      if (p.handL === undefined && !p.walk) { p.handL = V(p.x - 0.22, 0.72, p.z + 0.12); p.wL = 0.7; }
      cp.pose(alive({ blink: blinkAt(t, 1.1 + i), ...p }, t, 5 + i)); cp.head.getWorldPosition(hd);
    });
  }
  if (sideOn) {
    const arr = c[7] + 1.0;
    // fotógrafo
    let p = !inHook(t) && t < arr ? { ...go(t, c[7] + 0.1, arr, PHOTO.x - 1.4, PHOTO.x, 0.5), z: PHOTO.z } : { x: PHOTO.x, z: PHOTO.z, face: 0.55, squash: breathe(t, 6), look: V(SLOT.x, SLOT.y, 0.3), mood: 'neutral' };
    p.handL = V(PHOTO.x - 0.14, 1.08, PHOTO.z + 0.3); p.handR = V(PHOTO.x + 0.04, 1.08, PHOTO.z + 0.32); p.wL = p.wR = 1;
    if (t >= retT) p.mood = 'happy';
    photo.pose(alive({ blink: blinkAt(t, 1.7), ...p }, t, 7)); photo.head.getWorldPosition(head.photo);
    photo.hand(0, hA); photo.hand(1, hB); camBox.position.copy(hA).lerp(hB, 0.5); camBox.position.y += 0.03; camBox.rotation.y = 0.5;
    // experto
    const toCanvas = !inHook(t) && t >= expT - 0.3;
    let e = !inHook(t) && t < arr + 0.2 ? { ...go(t, c[7] + 0.25, arr + 0.2, EXPERT.x + 1.6, EXPERT.x, 0.45), z: EXPERT.z } : { x: EXPERT.x, z: EXPERT.z, face: -0.4, squash: breathe(t, 8), look: V(SLOT.x - 0.2, SLOT.y, 2.2), mood: 'neutral', handL: V(EXPERT.x - 0.18, 1.05, EXPERT.z + 0.3), wL: 0.8 };
    if (toCanvas) {
      const ex = lerp(EXPERT.x, TX + 0.82, prog(t, expT - 0.3, expT + 0.5)), ez = lerp(EXPERT.z, 0.05, prog(t, expT - 0.3, expT + 0.5));
      e = { x: ex, z: ez, face: -0.45, squash: breathe(t, 8), walk: win(t, expT - 0.3, expT + 0.6, 0.1), phase: (t - expT) * 2, look: V(SLOT.x + 0.15, SLOT.y + 0.05, SLOT.z + 0.6),
        handL: V(SLOT.x + 0.15 + 0.05 * Math.sin(t * 4), SLOT.y + 0.05 + 0.08 * Math.sin(t * 3), SLOT.z + 0.18), wL: 1, ...moodAt(t, [[0, 'neutral'], [falso2T, 'surprised'], [falso2T + 0.4, 'happy']]) };
      if (t > falso2T + 0.3) { e.look = V(ex, 1.45, 4); e.handR = V(ex + 0.25, 1.75, ez + 0.2); e.wR = back(lin(t, falso2T + 0.3, falso2T + 0.6)); }
      e.y = hop(t, falso2T + 0.1, 0.12);
    }
    expert.pose(alive({ blink: blinkAt(t, 2.1), ...e }, t, 9)); expert.head.getWorldPosition(head.exp);
    if (magnifier.visible) { expert.hand(0, magnifier.position); magnifier.position.y += 0.12; magnifier.rotation.set(0, -0.3, 0); }
  }
}

function poseCourt(t) {
  const on = t >= c[9];
  judges.forEach(j => j.root.visible = on); pub.forEach(q => q.p.root.visible = on); gavel.visible = pollSign.visible = on;
  if (!on) return;
  judges.forEach((j, i) => {
    const p = { x: j.x, y: 0.42, z: -1.8, face: 0.35 - i * 0.15, squash: breathe(t, i), look: V(head.han.x, 1.4, 0.5), ...moodAt(t, [[0, 'neutral'], [condT, 'angry'], [anoT + 0.5, 'neutral']]) };
    if (i === 1) { const bangK = Math.max(win(t, condT - 0.25, condT + 0.05, 0.1), win(t, anoT - 0.25, anoT + 0.05, 0.1)); p.handR = V(j.x + 0.32, 1.45 + 0.4 * (1 - bangK), -1.32); p.wR = 1; }
    else { p.handR = talk(t, j.x, -1.8, 1, i); p.wR = 0.5; }
    j.pose(alive({ blink: blinkAt(t, 0.4 + i * 0.7), ...p }, t, 10 + i));
    if (i === 1) { j.hand(1, gavel.position); gavel.position.y += 0.08; gavel.rotation.z = 0.3; j.head.getWorldPosition(head.judge); }
  });
  pub.forEach((q, i) => {
    const cheer = t >= encT - 0.1, clap = Math.abs(Math.sin(t * 13 + i));
    const p = { x: q.x, y: q.y + (cheer ? hop(t, encT + 0.1 * i + ((t - encT) > 0.8 ? Math.floor((t - encT - 0.1 * i) / 0.8) * 0.8 : 0), 0.14, 0.35) : 0), z: q.z, face: cheer ? -0.15 : -0.7, squash: breathe(t, i),
      look: cheer ? V(q.x - 0.4, 1.5, 4) : V(head.han.x, 1.4, 0.5), ...(cheer ? { mood: 'happy' } : moodAt(t, [[0, 'neutral'], [condT + 0.2 + 0.05 * i, 'surprised'], [anoT + 0.3, i % 2 ? 'worried' : 'neutral']])) };
    if (cheer) { p.handL = V(q.x - 0.04 - 0.1 * clap, 1.2, q.z + 0.32); p.handR = V(q.x + 0.04 + 0.1 * clap, 1.2, q.z + 0.32); p.wL = p.wR = back(lin(t, encT - 0.1, encT + 0.2)); }
    else if (i % 3 === 1) { p.handL = V(q.x - 0.12, 1.35, q.z + 0.3); p.wL = 0.6; }                  // murmuran tapándose la boca
    if (i === 4) { p.handR = V(q.x + 0.15, 1.75, q.z + 0.2); p.wR = back(lin(t, estT - 0.6, estT - 0.3)); }
    q.p.pose(alive({ blink: blinkAt(t, 0.3 + i * 0.5), ...p }, t, 12 + i));
  });
  const sk = back(lin(t, estT - 0.5, estT - 0.2)); pollSign.visible = sk > 0.01; pub[4].p.hand(1, pollSign.position); pollSign.position.y += 0.6 * sk; pollSign.scale.setScalar(Math.max(sk, 0.001)); pollSign.position.z += 0.05; pollSign.rotation.z = 0.06 * Math.sin(t * 6);
}

// ---------- cámara ----------
k.shots([
  { t: 0, pos: [TX - 0.1, 1.95, 9.8], look: [TX - 0.1, 1.95, 0] },
  { t: goringT - 0.15, pos: [TX + 0.6, 2.2, 5.6], look: [TX + 0.6, 2.2, 0] },
  { t: ver0T - 0.1, pos: [TX - 0.5, 2.2, 5.4], look: [TX - 0.5, 2.2, 0] },
  { t: falsoT - 0.1, pos: [TX - 0.55, 2.25, 4.2], look: [TX - 0.55, 2.25, 0] },
  { t: salvT, pos: [TX - 0.1, 1.7, 9.4], look: [TX - 0.1, 1.55, 0] },
  { t: testT - 0.15, pos: [TX - 0.1, 1.6, 8.4], look: [TX - 0.1, 1.45, 0] },
  { t: c[1], pos: [TX - 0.35, 1.45, 4.4], look: [TX - 0.35, 1.38, 0] },
  { t: verT - 0.1, pos: [TX + 0.12, 1.4, 2.7], look: [TX + 0.12, 1.36, 0] },
  { t: sigloT - 0.1, pos: [TX - 0.15, 1.5, 4.6], look: [TX - 0.15, 1.42, 0] },
  { t: oleoT, pos: [TX - 0.05, 1.4, 3.2], look: [TX - 0.05, 1.33, 0] },
  { t: decT + 0.4, pos: [TX - 0.25, 1.75, 4.4], look: [TX - 0.25, 1.9, -1] },
  { t: mezT - 0.1, pos: [TX - 0.35, 1.2, 3.5], look: [TX - 0.35, 1.08, 0] },
  { t: hornT - 0.1, pos: [TX + 0.75, 1.35, 5.2], look: [TX + 0.75, 1.0, 0] },
  { t: cienT - 0.15, pos: [OVC.x - 0.1, 1.2, 2.9], look: [OVC.x - 0.1, 1.0, -0.2] },
  { t: c[3], pos: [TX + 0.55, 1.45, 5.6], look: [TX + 0.55, 1.2, 0] },
  { t: rodT - 0.1, pos: [TX + 0.0, 1.4, 3.4], look: [TX + 0.0, 1.33, 0] },
  { t: tintaT - 0.1, pos: [TX - 0.25, 1.35, 3.6], look: [TX - 0.25, 1.25, 0] },
  { t: tresT - 0.2, pos: [SLOT.x, 1.38, 2.4], look: [SLOT.x, 1.35, 0] },
  { t: c[4], pos: [GX - 0.7, 1.6, 7.0], look: [GX - 0.7, 1.45, 0], cut: true },
  { t: c[4] + 1.5, pos: [GX - 0.1, 1.55, 6.2], look: [GX - 0.1, 1.45, 0], glide: true },
  { t: gor2T - 0.1, pos: [GX + 0.65, 1.55, 4.0], look: [GX + 0.65, 1.45, 0] },
  { t: cien2T - 0.2, pos: [GX - 0.5, 1.65, 7.4], look: [GX - 0.5, 1.4, 0] },
  { t: robT, pos: [GX - 1.05, 1.3, 4.8], look: [GX - 1.05, 1.05, 0] },
  { t: c[5], pos: [TX + 0.1, 1.6, 8.6], look: [TX + 0.1, 1.5, 0], cut: true },
  { t: traiT - 0.1, pos: [TX - 0.6, 1.5, 5.2], look: [TX - 0.6, 1.42, 0] },
  { t: tesT - 0.1, pos: [TX - 0.75, 1.6, 6.6], look: [TX - 0.75, 1.5, 0] },
  { t: confT - 0.1, pos: [TX - 0.55, 1.6, 5.2], look: [TX - 0.55, 1.6, 0] },
  { t: noT - 0.1, pos: [TX - 0.75, 1.95, 5.0], look: [TX - 0.75, 1.95, 0] },
  { t: pintoT - 0.15, pos: [TX - 0.5, 1.45, 3.4], look: [TX - 0.5, 1.42, 0] },
  { t: c[7], pos: [TX - 0.1, 1.7, 9.8], look: [TX - 0.1, 1.5, 0] },
  { t: vigT - 0.1, pos: [TX - 0.1, 1.6, 8.8], look: [TX - 0.1, 1.45, 0] },
  { t: pintaT - 0.1, pos: [TX - 0.05, 1.4, 3.8], look: [TX - 0.05, 1.35, 0] },
  { t: ceroT - 0.1, pos: [TX - 0.3, 1.5, 5.2], look: [TX - 0.3, 1.42, 0] },
  { t: expT - 0.1, pos: [TX + 0.35, 1.5, 5.0], look: [TX + 0.35, 1.4, 0] },
  { t: falso2T - 0.15, pos: [TX + 0.4, 1.42, 3.2], look: [TX + 0.4, 1.4, 0] },
  { t: retT - 0.1, pos: [TX - 0.3, 1.55, 5.8], look: [TX - 0.3, 1.45, 0] },
  { t: c[9], pos: [CX - 0.45, 1.9, 8.8], look: [CX - 0.45, 1.7, 0], cut: true },
  { t: condT - 0.2, pos: [CX - 1.05, 1.85, 4.4], look: [CX - 1.05, 1.75, -1.6] },
  { t: falsifT - 0.1, pos: [CX + 0.95, 1.55, 4.4], look: [CX + 0.95, 1.42, 0] },
  { t: anoT - 0.15, pos: [CX - 0.1, 1.7, 7.0], look: [CX - 0.1, 1.55, 0] },
  { t: c[10], pos: [CX + 1.0, 1.5, 5.0], look: [CX + 1.0, 1.42, 0] },
  { t: infT - 0.1, pos: [CX + 1.0, 1.45, 3.6], look: [CX + 1.0, 1.4, 0] },
  { t: encT - 0.1, pos: [CX + 2.65, 1.6, 6.0], look: [CX + 2.65, 1.45, -0.8] },
  { t: segT, pos: [CX + 2.6, 1.6, 5.4], look: [CX + 2.6, 1.5, -0.8], glide: true },
  { t: estT - 0.1, pos: [CX + 2.0, 1.8, 8.2], look: [CX + 2.0, 1.55, -0.5] },
]);

// ---------- carteles ----------
tag({ text: 'Hermann Göring', at: () => gorPortrait.position, off: [-60, -260], from: 0.45, to: ver0T + 0.2 });
tag({ text: '“Vermeer”', at: () => ghost.position, off: [120, 340], from: ver0T, to: falsoT - 0.1 });
tag({ text: '¡Falso!', big: true, off: BIG, from: falsoT, to: salvT });
tag({ text: 'Ante testigos', big: true, off: BIG, from: testT - 0.15, to: c[1] });
tag({ text: 'Han van Meegeren', at: () => head.han, off: [180, -300], from: hanT + 0.2, to: verT - 0.1 });
tag({ text: 'Estilo Vermeer', at: () => tmp2.set(SLOT.x + 0.2, SLOT.y + 0.3, SLOT.z), off: [40, -330], from: verT + 0.2, to: sigloT - 0.1 });
tag({ text: 'Siglo XVII', big: true, off: BIG, from: sigloT, to: c[2] });
tag({ text: '¡Décadas!', big: true, off: BIG, from: decT, to: mezT - 0.1 });
tag({ text: 'Baquelita', at: () => jar.position, off: [230, 160], from: baqT, to: hornT - 0.1 });
tag({ text: '+100 °C', big: true, off: BIG, from: cienT, to: c[3] });
tag({ text: 'Horno', at: () => tmp2.set(OVC.x + 0.25, 1.3, OV.z1), off: [60, -330], from: hornT + 0.2, to: cienT - 0.2 });
tag({ text: 'Rodillo', at: () => roller.position, off: [-250, -280], from: rodT + 0.2, to: tintaT - 0.2 });
tag({ text: 'Tinta china', at: () => inkBottle.position, off: [-80, -320], from: tintaT, to: pareceT });
tag({ text: '¿300 años?', big: true, off: BIG, from: tresT - 0.1, to: c[4] });
tag({ text: 'Göring', at: () => head.gor, off: [-10, -280], from: gor2T, to: numT - 0.2 });
tag({ text: 'Nº 2 de Hitler', big: true, off: BIG, from: numT - 0.1, to: cien2T - 0.2 });
tag({ text: '+100 cuadros', big: true, off: BIG, from: cien2T, to: c[5] });
tag({ text: 'Robados', at: () => tmp2.set(PILE.x, 0.9, PILE.z), off: [160, -260], from: robT, to: c[5] });
tag({ text: '1945', big: true, off: BIG, from: guerraT - 0.1, to: traiT - 0.1 });
tag({ text: '¡Traición!', big: true, off: BIG, from: traiT, to: c[6] });
tag({ text: 'Policía', at: () => head.copA, off: [-20, -280], from: acuT, to: traiT + 0.6 });
tag({ text: 'Tesoro holandés', at: () => head.han, off: [140, -320], from: tesT, to: c[6] });
tag({ text: '“Lo pinté yo”', big: true, off: BIG, from: pintoT - 0.1, to: c[7] });
tag({ text: 'Bajo vigilancia', big: true, off: BIG, from: vigT, to: pintaT });
tag({ text: 'Testigos', at: () => head.photo, off: [-100, -290], from: testi2T, to: expT - 0.3 });
tag({ text: 'Expertos', at: () => head.exp, off: [-60, -300], from: expT + 0.3, to: falso2T - 0.1 });
tag({ text: '¡Es falso!', big: true, off: BIG, from: falso2T, to: retT });
tag({ text: 'Acusación retirada', at: () => head.han, off: [150, -330], from: retT + 0.2, to: c[9] });
tag({ text: '1947', big: true, off: BIG, from: c[9] + 0.15, to: falsifT - 0.1 });
tag({ text: 'Falsificación', at: () => head.han, off: [-60, -300], from: falsifT, to: anoT - 0.15 });
tag({ text: '1 año de cárcel', big: true, off: BIG, from: anoT, to: c[10] });
tag({ text: 'Murió en 1947', big: true, off: BIG, from: infT, to: encT - 0.1 });
tag({ text: '2º más popular', big: true, off: BIG, from: segT, to: estT - 0.2 });
tag({ text: '¿Héroe o estafador?', big: true, off: BIG, from: estT, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'boom', 0.5);
for (const hit of [falsoT, cienT, traiT, pintoT, falso2T, anoT]) sfx(hit, 'riser_to', 1);
sfx(falsoT, 'thud', 0.8); sfx(cienT, 'boom', 0.4); sfx(traiT, 'boom', 0.45); sfx(pintoT, 'boom', 0.4); sfx(falso2T, 'pop', 0.8);
sfx(hornT + 0.5, 'clang', 0.5); sfx(hornT + 1.25, 'clang', 0.6); sfx(cienT + 0.2, 'hiss', 0.5); sfx(c[3] + 0.05, 'clang', 0.5);
sfx(condT, 'thud', 0.9); sfx(anoT, 'thud', 0.9); sfx(cien2T + 0.1, 'thud', 0.4);
const FLASHES = [salvT + 0.5, salvT + 1.9, testT + 0.4, vigT + 0.1, vigT + 1.0, testi2T + 0.2, pintaT + 0.6, ceroT + 0.2, falso2T + 0.25, retT + 0.3, retT + 1.4, segT + 0.2, segT + 1.0];
for (const f of FLASHES) sfx(f, 'tap', 0.55);

// ---------- cuadro ----------
k.run(t => {
  poseHan(t); poseGoring(t); poseAgent(t); poseWitnesses(t); poseCourt(t);
  if (t >= c[4] && t < c[5]) poseGoring(t);                       // se miran entre sí: segunda pasada
  if (t >= acuT - 1.3 && t < c[9]) poseHan(t);

  // --- Göring: el "Vermeer" en su caballete; la pila de cuadros ---
  adultera.visible = t >= c[4] && t < c[5];
  if (adultera.visible) {
    if (t < c[4] || t >= c[4] + 1.7) adultera.position.copy(GSLOT);
    else if (t < c[4] + 1.2) { agent.hand(0, hA); agent.hand(1, hB); adultera.position.copy(hA).lerp(hB, 0.5); adultera.position.x += 0.22; adultera.position.y += 0.05; adultera.position.z += 0.05; }
    else { agent.hand(0, hA); agent.hand(1, hB); tmp.copy(hA).lerp(hB, 0.5); tmp.x += 0.22; adultera.position.copy(tmp).lerp(GSLOT, back(prog(t, c[4] + 1.2, c[4] + 1.6))); }
    adultera.rotation.set(0, 0.25, 0.04 * Math.sin(t * 2) * (t > c[4] && t < c[4] + 1.3 ? 1 : 0));
  }
  stamp.visible = false;
  const st = popIn(t, falsoT, salvT + 0.2); ghostStamp.visible = t < salvT && st > 0.01; ghostStamp.scale.setScalar(Math.max(st, 0.001));
  const pk = popIn(t, 0.2, salvT + 0.1); gorPortrait.visible = pk > 0.01;
  if (gorPortrait.visible) { gorPortrait.position.set(TX + 0.65, 2.4 + 0.05 * Math.sin(t * 3 + 1), 0.6); gorPortrait.scale.setScalar(Math.max(pk, 0.001)); gorPortrait.rotation.z = -0.06 * Math.sin(t * 2); }
  loot.forEach((f, i) => {
    const t0 = cien2T - 0.1 + i * 0.13, u = prog(t, t0, t0 + 0.45);
    f.visible = t >= c[4] && t < c[5] && t > t0;
    if (!f.visible) return;
    const end = tmp.set(PILE.x + 0.06 * Math.sin(i * 2.3), 0.22 + i * 0.075, PILE.z + 0.02 * i), start = tmp2.set(GX + 0.9, 2.2, -1.6);
    f.position.copy(start).lerp(end, u); f.position.y += 1.2 * Math.sin(PI * u); f.rotation.set(-1.25 * u, 0, (1 - u) * 4 + 0.15 * Math.sin(i * 1.7));
  });
  puffA(t, cien2T + 1.5, PILE.x, PILE.z + 0.3, 1);
  chand.rotation.z = 0.04 * Math.sin(t * 1.2); chandGlow.material.opacity = 0.22 + 0.06 * Math.sin(t * 7);

  // --- Taller: lienzos, horno, herramientas ---
  cvDoc.visible = inHook(t) || t >= c[7] + 0.15 && t < c[9];
  if (cvDoc.visible) { cvDoc.position.copy(SLOT); cvDoc.userData.reveal(docP(t)); cvDoc.userData.cracks(0, 0); }
  cvWoman.visible = t >= c[1] + 0.36 && t < c[7] + 0.15;
  let inOven = false;
  if (cvWoman.visible) {
    let s = 1;
    if (t < hornT + 0.05 || t >= c[3] + 0.75) cvWoman.position.copy(SLOT);
    else if (t < hornT + 0.8) { han.hand(0, hA); han.hand(1, hB); cvWoman.position.copy(hA).lerp(hB, 0.5); cvWoman.position.x += 0.22; cvWoman.position.y += 0.12; cvWoman.position.z += 0.1; }
    else if (t < c[3] + 0.1) { const u = prog(t, hornT + 0.8, hornT + 1.3); tmp.set(TX + 0.45 + 0.42, 1.17, 0.25); cvWoman.position.copy(tmp).lerp(OVEN_IN, u); s = lerp(1, 0.6, u); inOven = u >= 1; }
    else { const u = prog(t, c[3] + 0.1, c[3] + 0.75); cvWoman.position.copy(OVEN_IN).lerp(SLOT, u); cvWoman.position.y += 0.6 * Math.sin(PI * u); cvWoman.position.z = lerp(OVEN_IN.z + 0.4, SLOT.z, u); s = lerp(0.6, 1, u); }
    cvWoman.visible = !inOven; cvWoman.scale.setScalar(s); cvWoman.rotation.y = -0.15 + (t > c[3] + 0.1 && t < c[3] + 0.75 ? 2 * PI * prog(t, c[3] + 0.1, c[3] + 0.75) : 0);
    const cracks = prog(t, rodT, tintaT - 0.3), inked = prog(t, tintaT + 0.1, tresT - 0.2);
    cvWoman.userData.cracks(t < c[3] ? 0 : cracks, t < c[3] ? 0 : inked);
  }
  // gotas de pintura fresca que se chorrean
  wetDrips.forEach((m, i) => { const on = t > oleoT + 0.3 && t < mezT + 0.3, u = ((t - oleoT) * 0.35 + i * 0.27) % 1; m.visible = on; if (!on) return; m.position.set(SLOT.x - 0.22 + i * 0.14, SLOT.y + 0.25 - 0.55 * u, SLOT.z + 0.04); });
  // baquelita que cae a la paleta
  drops.forEach((m, i) => { const u = ((t - baqT - 0.3) * 1.8 + i / 5) % 1, on = t > baqT + 0.3 && t < hornT - 0.2; m.visible = on && jar.visible; if (!m.visible) return; m.position.set(jar.position.x - 0.1, jar.position.y - 0.05 - 0.3 * u, jar.position.z); });
  // reloj: "décadas" = las agujas vuelan
  const spinF = win(t, decT - 0.2, mezT, 0.2); minH.rotation.z = -(t * 0.4 + 60 * prog(t, decT - 0.2, mezT)); hourH.rotation.z = -(t * 0.03 + 5 * prog(t, decT - 0.2, mezT)); clock.scale.setScalar(1 + 0.15 * spinF);
  // horno: puerta, brillo, aguja, humo, ondas de calor
  const open = Math.max(win(t, hornT + 0.45, hornT + 1.3, 0.15), win(t, c[3] - 0.05, c[3] + 0.5, 0.12));
  door.rotation.y = -1.6 * open; door.position.z = OV.z1 + 0.03 + 0.25 * open * 0;
  const heat = win(t, hornT + 1.2, c[3] + 0.3, 0.3);
  mouthGlow.material.color.setHSL(0.07, 1, 0.45 + 0.15 * heat + 0.05 * Math.sin(t * 13));
  doorWin.material.color.setHSL(0.08, 1, 0.4 + 0.3 * heat + 0.06 * Math.sin(t * 11));
  needle.rotation.z = 2.2 - 3.0 * prog(t, hornT + 1.2, gradT + 0.4) + 0.04 * Math.sin(t * 17) * heat - (t > c[4] ? -3.0 * 0 : 0);
  smoke.forEach((m, i) => { const u = (t * (0.5 + 0.5 * heat) + i / 7) % 1; m.position.set(OV.x1 - 0.2 + 0.15 * Math.sin(u * 5 + i), 1.4 + 2.4 * u, -0.7); m.scale.setScalar(0.5 + 1.6 * u); m.material.opacity = (0.35 + 0.5 * heat) * (1 - u); });
  waves.forEach((g, i) => { const u = (t * 0.8 + i / 3) % 1; g.visible = heat > 0.05; g.position.set(OVC.x - 0.2 + i * 0.2, 1.42 + 0.5 * u, OV.z1 - 0.1); g.scale.setScalar(heat * (1 - u) + 0.01); });
  puffB(t, c[3], OVC.x - 0.2, OV.z1 + 0.2, -1, 0.8);
  puffC(t, c[7] + 0.1, SLOT.x - 0.2, SLOT.z + 0.2, -1, 1.2);
  puffD(t, c[3] + 0.95, HX, 0.1, -1);
  hang.rotation.z = 0.05 * Math.sin(t * 1.3);
  motes.forEach((m, i) => { const d = m.userData; m.position.set(TX - 0.9 + d.x * 0.4 + 0.1 * Math.sin(t * 0.5 + i), d.y + 0.15 * Math.sin(t * 0.7 + i * 1.3), -1.15); });
  // signos
  k.glyphAt(qA, head.copA, 0.05, 0.6, popIn(t, pintoT + 0.2, c[7]), 0.12 * Math.sin(t * 6));
  k.glyphAt(qB, head.copB, 0.05, 0.6, popIn(t, pintoT + 0.35, c[7]), 0.12 * Math.sin(t * 6 + 1));
  k.glyphAt(bang, head.han, 0, 0.62, popIn(t, traiT - 0.1, confT));
  k.glyphAt(okMark, head.exp, 0.05, 0.62, popIn(t, falso2T + 0.1, c[9]));
  const hookG = t < c[1], gk = hookG ? popIn(t, ver0T - 0.25, salvT + 0.1) : popIn(t, noT - 0.2, pintoT + 0.6); ghost.visible = gk > 0.01 && (hookG || (t >= c[6] && t < c[7]));
  if (ghost.visible) { ghost.position.set(hookG ? TX - 0.6 : TX - 0.9, 2.35 + 0.05 * Math.sin(t * 3), hookG ? 0.6 : 0.3); ghost.scale.setScalar(Math.max(gk, 0.001)); ghost.rotation.z = 0.08 * Math.sin(t * 2); }
  k.glyphAt(xMark, tmp.set(TX - 0.9, 2.35, 0.3), 0, 0, popIn(t, noT + 0.25, pintoT + 0.6), 0);
  sparks.forEach((m, i) => {
    let kk = 0, pos = tmp2;
    if (t < salvT) { kk = popIn(t, falsoT, salvT); pos.copy(ghost.position); }
    else if (t >= c[4] && t < c[5]) { kk = popIn(t, c[4] + 1.6, numT); pos.copy(GSLOT); }
    else if (t >= tresT - 0.3 && t < c[4]) { kk = popIn(t, tresT - 0.3, c[4] + 0.1); pos.copy(SLOT); }
    else if (t >= c[3] + 0.1 && t < c[3] + 0.9) { kk = 1; pos.copy(cvWoman.position); }
    kk *= 0.55 + 0.45 * Math.sin(t * 9 + i * 1.6);
    k.glyphAt(m, pos, [-0.42, 0.42, -0.36, 0.4][i], [0.34, 0.3, -0.32, -0.28][i], Math.max(kk, 0), t * 1.5 + i);
  });
  sweat.forEach((m, i) => { const on = (t > traiT && t < confT) || (t > infT && t < encT + 0.5), u = (t * 1.7 + i / 3) % 1, s = i % 2 ? 1 : -1; m.visible = on; if (!on) return;
    m.position.set(head.han.x + s * (0.3 + 0.25 * u), head.han.y + 0.22 + 0.3 * u - 0.6 * u * u, head.han.z + 0.25); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
  // flashes de la prensa
  let fl = 0; for (const f of FLASHES) fl = Math.max(fl, t >= f ? Math.exp(-9 * (t - f)) : 0);
  const fromPhoto = t < c[9];
  if (fromPhoto) { flash.visible = photo.root.visible && fl > 0.02; if (flash.visible) { flash.position.copy(camBox.position); flash.position.y += 0.13; flash.position.z += 0.1; } }
  else { flash.visible = fl > 0.02; flash.position.set(pub[5].x + 0.35, 2.1, pub[5].z + 0.4); }
  flash.material.opacity = 0.7 * fl; flash.scale.setScalar(fromPhoto ? 0.35 + 0.6 * fl : 0.3 + 0.6 * fl);
  // tribunal: confeti al final
  confetti.forEach((m, i) => { const d = m.userData, u = ((t - encT) * 0.5 * d.s + d.d) % 1; m.visible = t > encT; if (!m.visible) return;
    m.position.set(CX + 1.4 + d.x + 0.15 * Math.sin(t * 3 + i), 3.2 - 3.0 * u, -0.6 + 0.4 * Math.sin(i)); m.rotation.set(t * 4 + i, t * 3, i); });
});
