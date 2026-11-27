// Episodio: el robo de la Mona Lisa (1911). Vincenzo Peruggia la descuelga un lunes con el museo cerrado,
// sale por una puerta de servicio, la tiene más de dos años en un baúl y cae en Florencia en 1913.
// Decorados lado a lado: GALERÍA del Louvre (x=0, con la escalera y la puerta de servicio a la derecha),
// CALLE frente al Louvre (40), COMISARÍA (80), PIEZA de Peruggia en París (120), HOTEL en Florencia (160).
//   python -m anim3d.narrar monalisa  ->  python -m anim3d.render monalisa stills ...  ->  ... full
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined, INK } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, painting, lamp } from '/lib/decor.js';

const k = await setup('monalisa');
const { scene, c, at, END, sfx, tag, BIG } = k;
const G = 0, S = 40, P = 80, R = 120, H = 160;

// ---------- tiempos (palabras de la voz) ----------
const robaT = at('roba'), nadieT = at('nadie');
const lunesT = at('lunes', c[1]), vinT = at('vincenzo', c[1]), blusT = at('blus', c[1]), emplT = at('empleados', c[1]);
const descT = at('descuelga', c[2]), ganT = at('ganchos', c[2]), marcoT = at('marco', c[2]), versT = at('version', c[2]), tapaT = at('tapa', c[2]);
const plomT = at('plomero', c[3]), abreT = at('abre', c[3]), calleT = at('calle', c[3]);
const pintT = at('pintor', c[4]), encT = at('encuentra', c[4]), vaciaT = at('vacia', c[4]);
const detT = at('detiene', c[5]), apoT = at('apollinaire', c[5]), hastaT = at('hasta', c[5]), picT = at('picasso', c[5]);
const dosT = at('dos', c[6]), nadie2T = at('nadie', c[6]);
const baulT = at('baul', c[7]), piezaT = at('pieza', c[7]), masT = at('mas', c[7]);
const florT = at('florencia', c[8]), vendT = at('venderla', c[8]);
const compT = at('comprador', c[9]), llamaT = at('llama', c[9]), uffT = at('uffizi', c[9]), confT = at('confirma', c[9]), verdT = at('verdadera', c[9]), poliT = at('policia', c[9]);
const caeT = at('cae', c[10]), presoT = at('preso', c[10]), backT = at('mona', c[10]) - 0.1;
const caraT = at('cara', c[11]), diarT = at('diarios', c[11]), asiT = at('asi', c[11]), cuadroT = at('cuadro', c[11]);

// ---------- dibujos en canvas ----------
const ell = (g, x, y, rx, ry, rot, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
/** La Mona Lisa: paisaje brumoso, pelo oscuro con raya al medio, manos cruzadas y la media sonrisa. */
function drawMona(g, W, H) {
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#a9b593'); gr.addColorStop(0.45, '#7f8c62'); gr.addColorStop(1, '#3f3a22');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#8fa294'; g.beginPath(); g.moveTo(0, H * 0.44); g.quadraticCurveTo(W * 0.12, H * 0.22, W * 0.32, H * 0.36); g.lineTo(W * 0.32, H * 0.62); g.lineTo(0, H * 0.62); g.fill();
  g.beginPath(); g.moveTo(W, H * 0.4); g.quadraticCurveTo(W * 0.86, H * 0.2, W * 0.66, H * 0.34); g.lineTo(W * 0.66, H * 0.62); g.lineTo(W, H * 0.62); g.fill();
  g.fillStyle = '#6f7d52'; g.beginPath(); g.moveTo(0, H * 0.6); g.quadraticCurveTo(W * 0.2, H * 0.48, W * 0.36, H * 0.55); g.lineTo(W * 0.36, H * 0.7); g.lineTo(0, H * 0.7); g.fill();
  g.beginPath(); g.moveTo(W, H * 0.56); g.quadraticCurveTo(W * 0.8, H * 0.47, W * 0.64, H * 0.54); g.lineTo(W * 0.64, H * 0.7); g.lineTo(W, H * 0.7); g.fill();
  g.lineCap = 'round'; g.strokeStyle = '#c9ad6c'; g.lineWidth = W * 0.02;
  g.beginPath(); g.moveTo(W * 0.04, H * 0.58); g.bezierCurveTo(W * 0.2, H * 0.52, W * 0.06, H * 0.46, W * 0.22, H * 0.41); g.stroke();
  g.strokeStyle = '#b3c7c4'; g.beginPath(); g.moveTo(W * 0.96, H * 0.52); g.bezierCurveTo(W * 0.8, H * 0.47, W * 0.92, H * 0.42, W * 0.78, H * 0.37); g.stroke();
  // pelo largo detrás
  g.fillStyle = '#22170d'; g.beginPath(); g.moveTo(W * 0.3, H * 0.3); g.quadraticCurveTo(W * 0.26, H * 0.48, W * 0.3, H * 0.56); g.lineTo(W * 0.7, H * 0.56); g.quadraticCurveTo(W * 0.74, H * 0.48, W * 0.7, H * 0.3); g.fill();
  // vestido oscuro
  g.fillStyle = '#2b2217'; g.beginPath(); g.moveTo(W * 0.38, H * 0.47); g.quadraticCurveTo(W * 0.12, H * 0.54, W * 0.02, H); g.lineTo(W * 0.98, H); g.quadraticCurveTo(W * 0.88, H * 0.54, W * 0.62, H * 0.47); g.fill();
  // mangas color miel
  ell(g, W * 0.24, H * 0.86, W * 0.16, H * 0.09, 0.5, '#7a5a2a'); ell(g, W * 0.77, H * 0.85, W * 0.16, H * 0.09, -0.5, '#7a5a2a');
  // cuello y escote
  g.fillStyle = '#d6a866'; g.fillRect(W * 0.45, H * 0.38, W * 0.1, H * 0.1);
  g.beginPath(); g.moveTo(W * 0.35, H * 0.5); g.quadraticCurveTo(W * 0.5, H * 0.64, W * 0.65, H * 0.5); g.lineTo(W * 0.6, H * 0.46); g.lineTo(W * 0.4, H * 0.46); g.fill();
  g.strokeStyle = '#5a3a1a'; g.lineWidth = W * 0.008; g.beginPath(); g.moveTo(W * 0.35, H * 0.5); g.quadraticCurveTo(W * 0.5, H * 0.64, W * 0.65, H * 0.5); g.stroke();
  // manos cruzadas
  ell(g, W * 0.46, H * 0.9, W * 0.14, H * 0.036, -0.15, '#e0b674'); ell(g, W * 0.6, H * 0.87, W * 0.13, H * 0.032, 0.2, '#e8c07e');
  // cara
  ell(g, W * 0.5, H * 0.31, W * 0.128, H * 0.112, 0, '#e8c07c');
  ell(g, W * 0.46, H * 0.34, W * 0.04, H * 0.02, 0, 'rgba(214,150,96,0.45)'); ell(g, W * 0.56, H * 0.34, W * 0.04, H * 0.02, 0, 'rgba(214,150,96,0.45)');
  // pelo sobre la frente (raya al medio) y mechones a los costados
  g.fillStyle = '#22170d'; g.beginPath(); g.moveTo(W * 0.5, H * 0.205); g.quadraticCurveTo(W * 0.38, H * 0.2, W * 0.36, H * 0.33); g.quadraticCurveTo(W * 0.33, H * 0.25, W * 0.37, H * 0.19); g.quadraticCurveTo(W * 0.5, H * 0.14, W * 0.63, H * 0.19); g.quadraticCurveTo(W * 0.67, H * 0.25, W * 0.64, H * 0.33); g.quadraticCurveTo(W * 0.62, H * 0.2, W * 0.5, H * 0.205); g.fill();
  g.fillStyle = 'rgba(20,14,8,0.35)'; g.beginPath(); g.ellipse(W * 0.5, H * 0.24, W * 0.2, H * 0.1, 0, PI, 2 * PI); g.fill();     // velo
  // ojos, nariz y la sonrisa
  ell(g, W * 0.452, H * 0.298, W * 0.024, H * 0.009, 0, '#f3e2c0'); ell(g, W * 0.552, H * 0.298, W * 0.024, H * 0.009, 0, '#f3e2c0');
  ell(g, W * 0.456, H * 0.298, W * 0.012, H * 0.008, 0, '#3a2414'); ell(g, W * 0.556, H * 0.298, W * 0.012, H * 0.008, 0, '#3a2414');
  g.strokeStyle = '#7a5030'; g.lineWidth = W * 0.006; g.beginPath(); g.moveTo(W * 0.425, H * 0.288); g.quadraticCurveTo(W * 0.452, H * 0.282, W * 0.478, H * 0.29); g.moveTo(W * 0.525, H * 0.29); g.quadraticCurveTo(W * 0.552, H * 0.282, W * 0.578, H * 0.288); g.stroke();
  g.strokeStyle = '#b5844c'; g.beginPath(); g.moveTo(W * 0.502, H * 0.3); g.lineTo(W * 0.494, H * 0.343); g.quadraticCurveTo(W * 0.505, H * 0.352, W * 0.518, H * 0.344); g.stroke();
  g.strokeStyle = '#8a4a2a'; g.lineWidth = W * 0.009; g.beginPath(); g.moveTo(W * 0.458, H * 0.37); g.quadraticCurveTo(W * 0.5, H * 0.382, W * 0.545, H * 0.366); g.stroke();
  // barniz viejo y viñeta
  g.fillStyle = 'rgba(190,150,60,0.13)'; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H * 0.4, W * 0.25, W / 2, H * 0.5, W * 0.85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(25,12,0,0.5)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}
/** Marco dorado con contorno; centro transparente. b = grosor en px. */
function gilt(g, W, H, b, color = '#d9a441') {
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); g.fillRect(0, 0, b, H); g.fillRect(W - b, 0, b, H);
  const i = 6, bb = b - 2 * i; g.fillStyle = color;
  g.fillRect(i, i, W - 2 * i, bb); g.fillRect(i, H - b + i, W - 2 * i, bb); g.fillRect(i, i, bb, H - 2 * i); g.fillRect(W - b + i, i, bb, H - 2 * i);
  g.fillStyle = '#f6d983'; g.fillRect(i, i, W - 2 * i, bb * 0.3); g.fillRect(i, i, bb * 0.3, H - 2 * i);
  for (let x = b; x < W - b * 0.6; x += b * 0.9) { ell(g, x, b / 2, bb * 0.16, bb * 0.16, 0, '#a8782a'); ell(g, x, H - b / 2, bb * 0.16, bb * 0.16, 0, '#a8782a'); }
  for (let y = b; y < H - b * 0.6; y += b * 0.9) { ell(g, b / 2, y, bb * 0.16, bb * 0.16, 0, '#a8782a'); ell(g, W - b / 2, y, bb * 0.16, bb * 0.16, 0, '#a8782a'); }
  g.strokeStyle = '#1e1428'; g.lineWidth = 5; g.strokeRect(b - 2, b - 2, W - 2 * b + 4, H - 2 * b + 4);
}
const P_PORTRAIT = (bg, coat, hair) => (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); ell(g, W / 2, H * 1.02, W * 0.42, H * 0.42, 0, coat);
  ell(g, W / 2, H * 0.43, W * 0.19, H * 0.16, 0, '#e8c08a'); ell(g, W / 2, H * 0.31, W * 0.21, H * 0.1, 0, hair); ell(g, W * 0.44, H * 0.44, 4, 3, 0, '#2a1a10'); ell(g, W * 0.56, H * 0.44, 4, 3, 0, '#2a1a10');
  g.strokeStyle = '#8a4a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(W * 0.46, H * 0.52); g.lineTo(W * 0.54, H * 0.52); g.stroke(); };
const P_SEA = (g, W, H) => { g.fillStyle = '#a9cbe0'; g.fillRect(0, 0, W, H); g.fillStyle = '#3f6f9a'; g.fillRect(0, H * 0.6, W, H * 0.4);
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W * (0.1 + i * 0.17), H * (0.7 + (i % 2) * 0.1), 10, PI, 2 * PI); g.stroke(); }
  g.fillStyle = '#6b3f22'; g.beginPath(); g.moveTo(W * 0.3, H * 0.6); g.lineTo(W * 0.7, H * 0.6); g.lineTo(W * 0.64, H * 0.68); g.lineTo(W * 0.36, H * 0.68); g.fill();
  g.fillStyle = '#fbf3dc'; g.beginPath(); g.moveTo(W * 0.5, H * 0.24); g.lineTo(W * 0.5, H * 0.58); g.lineTo(W * 0.32, H * 0.58); g.fill(); g.beginPath(); g.moveTo(W * 0.53, H * 0.3); g.lineTo(W * 0.53, H * 0.58); g.lineTo(W * 0.66, H * 0.58); g.fill(); };
const P_FRUIT = (g, W, H) => { g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, W, H); g.fillStyle = '#7a4b2a'; g.fillRect(0, H * 0.66, W, H * 0.34);
  ell(g, W * 0.5, H * 0.45, W * 0.1, H * 0.2, 0, '#5b7fa8'); ell(g, W * 0.3, H * 0.62, W * 0.09, W * 0.09, 0, '#c8443a'); ell(g, W * 0.44, H * 0.64, W * 0.08, W * 0.08, 0, '#e0a030');
  ell(g, W * 0.68, H * 0.62, W * 0.1, W * 0.07, 0, '#7fa848'); ell(g, W * 0.58, H * 0.66, W * 0.06, W * 0.06, 0, '#8a3a6a'); };
const P_HORSE = (g, W, H) => { g.fillStyle = '#c9b48a'; g.fillRect(0, 0, W, H); g.fillStyle = '#6f8a5a'; g.fillRect(0, H * 0.7, W, H * 0.3);
  ell(g, W * 0.5, H * 0.56, W * 0.22, H * 0.1, 0, '#6b3f22'); g.fillStyle = '#6b3f22'; for (const x of [0.34, 0.42, 0.58, 0.66]) g.fillRect(W * x, H * 0.6, 7, H * 0.14);
  ell(g, W * 0.74, H * 0.42, W * 0.07, H * 0.06, -0.6, '#6b3f22'); g.fillStyle = '#c8443a'; g.fillRect(W * 0.44, H * 0.3, W * 0.1, H * 0.18); ell(g, W * 0.49, H * 0.26, W * 0.045, W * 0.045, 0, '#e8c08a'); };
const framed = (w, h, x, y, paint, z = -2.17) => picture(scene, w, h, x, y, z, (g, W, Hh) => { paint(g, W, Hh); gilt(g, W, Hh, Math.round(W * 0.075)); }, 384);
/** Diario con la cara de la Gioconda (el mundo entero la vio así). */
function drawPaper(name) {
  return (g, W, H) => {
    g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2ead6'; g.fillRect(6, 6, W - 12, H - 12);
    g.fillStyle = '#1e1428'; g.font = `800 ${H * 0.16}px Montserrat`; g.textAlign = 'center'; g.fillText(name, W / 2, H * 0.2);
    g.fillRect(16, H * 0.25, W - 32, 4); g.font = `800 ${H * 0.1}px Montserrat`; g.fillText('LA JOCONDE', W * 0.62, H * 0.38);
    g.save(); g.translate(W * 0.08, H * 0.3); g.scale(W * 0.3 / W, H * 0.62 / H); drawMona(g, W, H); g.restore();
    g.strokeStyle = '#1e1428'; g.lineWidth = 3; g.strokeRect(W * 0.08, H * 0.3, W * 0.3, H * 0.62);
    g.fillStyle = '#8a8478'; for (let i = 0; i < 6; i++) g.fillRect(W * 0.44, H * (0.46 + i * 0.075), W * (i % 3 === 2 ? 0.3 : 0.48), 5);
  };
}

// =====================================================================================
// GALERÍA DEL LOUVRE (Salón Carré) + escalera y puerta de servicio a la derecha
// =====================================================================================
surface(scene, tex.planks({ base: '#b5763f', line: '#7a4a22', seed: 4, n: 8 }, 14, 9), 34, 20, G + 1, 0.001, 0, true);
surface(scene, tex.stripes({ a: '#9a2f3f', b: '#8c2938', dot: '#a8404c', n: 8 }, 9, 6), 12.4, 12, G - 1.8, 6, -2.2);
surface(scene, tex.planks({ base: '#6b3f22', line: '#4a2a14', seed: 2, n: 10 }, 12, 1), 12.4, 0.8, G - 1.8, 0.4, -2.19);
k.plane(scene, INK, 12.4, 0.06, G - 1.8, 0.8, -2.185);
block(scene, 0xd9a441, G - 8, G + 4.4, 3.3, 3.45, -2.2, -2.04);                                    // cornisa dorada
for (const x of [-4.1, 3.9]) { block(scene, 0xeee3cc, G + x - 0.16, G + x + 0.16, 0, 3.3, -2.2, -2.02); block(scene, 0xd9a441, G + x - 0.2, G + x + 0.2, 0, 0.22, -2.2, -1.98); block(scene, 0xd9a441, G + x - 0.2, G + x + 0.2, 3.08, 3.3, -2.2, -1.98); }
// marca más clara en la pared donde estaba el cuadro (se ve cuando falta)
k.plane(scene, 0xb24654, 0.72, 0.96, G, 1.5, -2.188);
// los cuatro ganchos de hierro
const PEGS = [[-0.42, 1.12], [0.42, 1.12], [-0.42, 1.88], [0.42, 1.88]];
for (const [x, y] of PEGS) {
  const p = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.1, 10), flat(0x3a3f4d)), 0.01); p.rotation.x = PI / 2; p.position.set(G + x, y, -2.14); scene.add(p);
  const tip = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), flat(0x3a3f4d)), 0.01); tip.position.set(G + x, y + 0.01, -2.09); scene.add(tip);
}
picture(scene, 0.56, 0.11, G, 0.9, -2.17, (g, W, H) => { g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, H); g.fillStyle = '#d9a441'; g.fillRect(4, 4, W - 8, H - 8); g.fillStyle = '#1e1428'; g.font = `800 ${H * 0.34}px Montserrat`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LÉONARD DE VINCI', W / 2, H / 2 + 2); }, 512);
// la Mona Lisa (tabla) y su marco, por separado: el marco queda en la escalera
const MW = 0.53, MH = 0.77;
const mona = picture(scene, MW, MH, G, 1.5, -2.17, (g, W, Hh) => { drawMona(g, W, Hh); g.strokeStyle = '#1e1428'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, Hh - 10); }, 512);
const mframe = picture(scene, 0.71, 0.95, G, 1.5, -2.164, (g, W, Hh) => gilt(g, W, Hh, Math.round(W * 0.09 / 0.71)), 512);
// el resto de la sala, al estilo "salón" (cuadros en dos filas)
framed(0.95, 0.72, G - 1.35, 1.55, P_PORTRAIT('#4a3a2a', '#8f2433', '#3a2a1a'));
framed(0.7, 0.95, G - 2.75, 1.6, P_HORSE);
framed(0.9, 0.7, G + 1.35, 1.55, P_SEA);
framed(0.75, 1.0, G + 2.7, 1.62, P_PORTRAIT('#2f3f4a', '#2f4a8a', '#c98a3a'));
painting(scene, 1.3, 0.85, G - 2.1, 2.7, -2.17, 1); painting(scene, 1.2, 0.8, G + 1.9, 2.7, -2.17, 2);
framed(0.6, 0.75, G - 3.45, 2.75, P_FRUIT); framed(0.55, 0.7, G + 3.25, 2.75, P_PORTRAIT('#3a2a3a', '#3f8f6b', '#23262d'));
framed(0.55, 0.42, G - 0.9, 2.62, P_FRUIT);
// reloj sobre el cuadro (en el gancho del arranque gira rápido: "nadie lo nota")
const clock = new THREE.Group(); clock.position.set(G + 0.62, 2.62, -2.16); scene.add(clock);
picture(clock, 0.42, 0.42, 0, 0, 0, (g, W) => { g.fillStyle = '#1e1428'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#d9a441'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 12, 0, 7); g.fill();
  g.fillStyle = '#fbf3dc'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 26, 0, 7); g.fill(); g.fillStyle = '#1e1428'; for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.fillRect(W / 2 + Math.sin(a) * (W / 2 - 40) - 4, W / 2 - Math.cos(a) * (W / 2 - 40) - 4, 8, 8); } });
const clockHand = (len, w) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), INK); m.geometry.translate(0, len / 2 - 0.015, 0); m.position.z = 0.012; clock.add(m); return m; };
const hourH = clockHand(0.09, 0.024), minH = clockHand(0.14, 0.016);
// claraboya: rayos de luz con polvo flotando
const rays = [[-1.7, 0.45], [0.9, 0.45], [3.2, 0.45]].map(([x, rz]) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 6), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.11, depthWrite: false })); r.position.set(G + x, 2.4, -1.7); r.rotation.z = rz; scene.add(r); return r; });
const motes = Array.from({ length: 18 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.8 })); m.userData = { x: -3 + (i * 0.37) % 6.5, y: 0.6 + (i * 0.53) % 2.6, s: 0.5 + (i % 4) * 0.2 }; scene.add(m); return m; });
// plantas en macetas junto a las columnas
for (const x of [-3.55]) { const pot = new THREE.Group(); pot.position.set(G + x, 0, -1.75); scene.add(pot); block(pot, 0xb5654a, -0.17, 0.17, 0, 0.38, 0.17, -0.17, 0.016);
  for (const [dx, dy, r] of [[0, 0.8, 0.28], [-0.2, 0.6, 0.2], [0.2, 0.62, 0.21]]) { const lf = outlined(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat(0x4f9a5a)), 0.02); lf.position.set(dx, dy, 0); pot.add(lf); } }
// --- escalera de servicio y puerta ---
const stone = (rx, ry) => tex.bricks({ base: '#d8c9a8', mortar: '#b5a383', rows: 8, cols: 3, seed: 6 }, rx, ry);
surface(scene, stone(0.3, 6), 0.35, 8, G + 4.575, 4, -2.2);
surface(scene, stone(4, 6), 4.65, 8, G + 8.175, 4, -2.2);
surface(scene, stone(1, 5), 1.1, 5.85, G + 5.3, 2.15 + 5.85 / 2, -2.2);
for (const x of [4.75, 5.85]) { const sw = surface(scene, stone(1, 2), 1.2, 2.2, G + x, 1.1, -2.8); sw.rotation.y = PI / 2; }
block(scene, 0x9a8a6a, G + 4.62, G + 4.75, 0, 2.2, -2.2, -2.08); block(scene, 0x9a8a6a, G + 5.85, G + 5.98, 0, 2.2, -2.2, -2.08); block(scene, 0x9a8a6a, G + 4.62, G + 5.98, 2.15, 2.3, -2.2, -2.08);
picture(scene, 2.6, 3.2, G + 5.3, 1.6, -3.4, (g, W, Hh) => {                // la calle que se ve por la puerta
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#7fc0ea'); gr.addColorStop(0.6, '#d6ecf5'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#e9c3a8'; g.fillRect(0, Hh * 0.25, W * 0.45, Hh * 0.55); g.fillStyle = '#f1dcb4'; g.fillRect(W * 0.5, Hh * 0.18, W * 0.5, Hh * 0.62);
  g.fillStyle = '#5b7fa8'; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) g.fillRect(W * (0.05 + i * 0.16), Hh * (0.3 + j * 0.11), W * 0.06, Hh * 0.06);
  g.fillStyle = '#c9bfa6'; g.fillRect(0, Hh * 0.8, W, Hh * 0.2); g.strokeStyle = '#a89c80'; g.lineWidth = 3; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(i * W / 9, Hh * 0.8); g.lineTo(i * W / 9 - 40, Hh); g.stroke(); }
}, 256);
const door = new THREE.Group(); door.position.set(G + 4.76, 0, -2.24); scene.add(door);
block(door, 0x7a4b2a, 0, 1.08, 0, 2.13, 0.03, -0.03); block(door, 0x8f5c33, 0.14, 0.94, 1.18, 1.95, 0.05, 0.02, 0.012); block(door, 0x8f5c33, 0.14, 0.94, 0.2, 1.02, 0.05, 0.02, 0.012);
{ const kn = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), flat(0xd9a441)), 0.01); kn.position.set(0.95, 1.08, 0.07); door.add(kn); }
for (let i = 0; i < 10; i++) {
  block(scene, 0xcfc3a8, G + 6.7 + i * 0.32, G + 10.6, 0, 0.17 * (i + 1), -2.15, -0.95, 0.015);
  block(scene, 0x5a3a22, G + 6.78 + i * 0.32, G + 6.82 + i * 0.32, 0.17 * (i + 1), 0.17 * (i + 1) + 0.75, -1.0, -1.04, 0.01);
}
{ const len = Math.hypot(3.2, 1.7), rail = outlined(new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.07), flat(0x7a4b2a)), 0.012); rail.position.set(G + 6.8 + 1.6, 0.17 + 0.85 + 0.85, -1.02); rail.rotation.z = Math.atan2(1.7, 3.2); scene.add(rail); }
const toolbox = new THREE.Group(); toolbox.position.set(G + 6.45, 0, -0.85); scene.add(toolbox);
block(toolbox, 0xc8443a, -0.16, 0.16, 0, 0.17, 0.1, -0.1, 0.014); block(toolbox, 0x3a3f4d, -0.07, 0.07, 0.17, 0.21, 0.02, -0.02, 0.008);
// caballete y paleta del pintor que la viene a copiar
const easel = new THREE.Group(); easel.position.set(G - 1.7, 0, -0.3); easel.rotation.y = 0.45; scene.add(easel);
block(easel, 0x9a6638, -0.32, -0.27, 0, 1.55, 0.03, -0.03, 0.01); block(easel, 0x9a6638, 0.27, 0.32, 0, 1.55, 0.03, -0.03, 0.01); block(easel, 0x9a6638, -0.03, 0.03, 0, 1.5, -0.25, -0.3, 0.01);
block(easel, 0x9a6638, -0.36, 0.36, 0.62, 0.68, 0.06, 0, 0.01);
picture(easel, 0.62, 0.78, 0, 1.07, 0.04, (g, W, Hh) => { g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#fbf6ea'; g.fillRect(6, 6, W - 12, Hh - 12); g.strokeStyle = '#b5a383'; g.lineWidth = 3; g.beginPath(); g.ellipse(W / 2, Hh * 0.33, W * 0.14, Hh * 0.12, 0, 0, 7); g.moveTo(W * 0.25, Hh); g.quadraticCurveTo(W * 0.3, Hh * 0.5, W / 2, Hh * 0.47); g.quadraticCurveTo(W * 0.7, Hh * 0.5, W * 0.75, Hh); g.stroke(); });
const palette = new THREE.Group(); scene.add(palette);
{ const d = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.015, 20), flat(0xc08a54)), 0.012); d.rotation.x = PI / 2; palette.add(d);
  [0xc8443a, 0x3b82c4, 0xffd23a, 0x59c36a].forEach((col, i) => { const p = new THREE.Mesh(new THREE.CircleGeometry(0.025, 10), new THREE.MeshBasicMaterial({ color: col })); p.position.set(Math.cos(i * 1.2 + 0.4) * 0.09, Math.sin(i * 1.2 + 0.4) * 0.09, 0.012); palette.add(p); }); }

// =====================================================================================
// CALLE: frente del Louvre, cerrado por ser lunes
// =====================================================================================
surface(scene, tex.cobble({}, 15, 10), 44, 30, S, 0, 0, true);
picture(scene, 16, 5.2, S, 2.6, -3.2, (g, W, Hh) => {
  const M = W / 16, Y = m => Hh - m * M, X = m => m * M;
  g.fillStyle = '#5f6a80'; g.beginPath(); g.moveTo(X(0), Y(3.9)); g.lineTo(X(0.25), Y(4.55)); g.lineTo(X(15.75), Y(4.55)); g.lineTo(X(16), Y(3.9)); g.fill();
  for (let m = 0.7; m < 16; m += 1.3) { if (m > 6.2 && m < 9.8) continue; g.fillStyle = '#eadfc4'; g.fillRect(X(m - 0.16), Y(4.45), X(0.32), X(0.4)); g.fillStyle = '#5b7fa8'; g.fillRect(X(m - 0.09), Y(4.38), X(0.18), X(0.28)); g.strokeStyle = '#1e1428'; g.lineWidth = 4; g.strokeRect(X(m - 0.16), Y(4.45), X(0.32), X(0.4)); }
  g.fillStyle = '#eadfc4'; g.fillRect(0, Y(3.9), W, X(3.9));
  g.fillStyle = '#ded2b4'; for (let y = 0.35; y < 3.9; y += 0.35) g.fillRect(0, Y(y), W, 3);
  // pabellón central más alto
  g.fillStyle = '#56607a'; g.beginPath(); g.moveTo(X(6.3), Y(4.4)); g.quadraticCurveTo(X(6.5), Y(5.2), X(8), Y(5.2)); g.quadraticCurveTo(X(9.5), Y(5.2), X(9.7), Y(4.4)); g.fill();
  g.fillStyle = '#f1e7cf'; g.fillRect(X(6.4), Y(4.4), X(3.2), X(4.4));
  g.fillStyle = '#e4d6b4'; g.beginPath(); g.moveTo(X(6.6), Y(3.7)); g.lineTo(X(8), Y(4.3)); g.lineTo(X(9.4), Y(3.7)); g.fill(); g.strokeStyle = '#1e1428'; g.lineWidth = 5; g.stroke();
  for (const m of [6.55, 7.2, 8.8, 9.45]) { g.fillStyle = '#fbf3dc'; g.fillRect(X(m - 0.08), Y(3.6), X(0.16), X(3.6)); g.strokeStyle = '#1e1428'; g.lineWidth = 3; g.strokeRect(X(m - 0.08), Y(3.6), X(0.16), X(3.6)); }
  g.fillStyle = '#1e1428'; g.font = `800 ${X(0.26)}px Montserrat`; g.textAlign = 'center'; g.fillText('MUSÉE DU LOUVRE', X(8), Y(3.2));
  // ventanas del piso de arriba y arcos de abajo
  for (let m = 0.7; m < 16; m += 1.3) {
    if (m > 6.2 && m < 9.8) continue;
    g.fillStyle = '#6d87a8'; g.fillRect(X(m - 0.28), Y(3.4), X(0.56), X(1.1)); g.strokeStyle = '#1e1428'; g.lineWidth = 4; g.strokeRect(X(m - 0.28), Y(3.4), X(0.56), X(1.1));
    g.beginPath(); g.moveTo(X(m), Y(3.4)); g.lineTo(X(m), Y(2.3)); g.moveTo(X(m - 0.28), Y(2.85)); g.lineTo(X(m + 0.28), Y(2.85)); g.stroke();
    g.fillStyle = '#e4d6b4'; g.beginPath(); g.moveTo(X(m - 0.36), Y(3.45)); g.lineTo(X(m), Y(3.68)); g.lineTo(X(m + 0.36), Y(3.45)); g.fill(); g.stroke();
    if (m > 10.0 && m < 11.2) continue;
    g.fillStyle = '#5b5148'; g.beginPath(); g.moveTo(X(m - 0.4), Y(0)); g.lineTo(X(m - 0.4), Y(1.4)); g.arc(X(m), Y(1.4), X(0.4), PI, 2 * PI); g.lineTo(X(m + 0.4), Y(0)); g.fill(); g.stroke();
  }
  g.strokeStyle = '#1e1428'; g.lineWidth = 6; for (const y of [2.05, 3.9]) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); }
  // portón principal cerrado (rejas) y puerta del personal
  g.fillStyle = '#2a2018'; g.beginPath(); g.moveTo(X(7.4), Y(0)); g.lineTo(X(7.4), Y(1.7)); g.arc(X(8), Y(1.7), X(0.6), PI, 2 * PI); g.lineTo(X(8.6), Y(0)); g.fill();
  g.strokeStyle = '#3a3f4d'; g.lineWidth = 7; for (let m = 7.5; m < 8.6; m += 0.14) { g.beginPath(); g.moveTo(X(m), Y(0)); g.lineTo(X(m), Y(2.1)); g.stroke(); }
  g.fillStyle = '#2a2018'; g.fillRect(X(10.2), Y(1.95), X(0.8), X(1.95)); g.fillStyle = '#7a4b2a'; g.fillRect(X(10.2), Y(1.95), X(0.28), X(1.95));
  g.strokeStyle = '#1e1428'; g.lineWidth = 5; g.strokeRect(X(10.2), Y(1.95), X(0.8), X(1.95));
  g.fillStyle = '#1e1428'; g.fillRect(X(10.05), Y(2.35), X(1.1), X(0.3)); g.fillStyle = '#ffd23a'; g.font = `800 ${X(0.17)}px Montserrat`; g.fillText('PERSONNEL', X(10.6), Y(2.13));
  g.lineWidth = 10; g.strokeRect(0, Y(3.9), W, X(3.9));
}, 2048);
const closed = new THREE.Group(); closed.position.set(S, 2.45, -3.1); scene.add(closed);
{ const s = k.sign('FERMÉ', 0.95, 0.4, { bg: '#c8443a', fg: '#ffffff' }); s.position.y = -0.32; closed.add(s); k.stroke(closed, [[-0.3, -0.12], [0, 0.12], [0.3, -0.12]], 0.025, false, 0.01);
  const d = k.sign('LUNDI', 0.6, 0.22, { bg: '#ffd23a' }); d.position.set(0, -0.68, 0.005); closed.add(d); }
k.tree(S - 4.3, -2.6, { h: 2.6, leaf: 0x5fae4d }); k.tree(S + 4.6, -2.7, { h: 2.4, leaf: 0x6dbb58 }); k.tree(S - 7, -2.9, { h: 2.5 });
lamp(scene, S - 2.6, -2.3); lamp(scene, S + 3.3, -2.3);
k.cloud(S - 3, 6.2, -9, 1.1); k.cloud(S + 2.5, 7.0, -9, 0.9); k.cloud(S + 6, 6.0, -9, 1);
k.birds([[S, 5.6, 0], [S, 6.3, 6], [S, 5.1, 11]], -6);
const DOOR_X = S + 2.6;                                         // la puerta del personal (en la fachada)
k.walker({ toon: { shirt: 0xb5654a, hair: 0x23262d, hat: { type: 'bowler', color: 0x4a3222 }, detail: ['buttons'] }, cx: S, z: -2.6, speed: 0.8, off: 3, dir: -1 });
k.walker({ toon: { shirt: 0x6a8fd0, hair: 0xc98a3a, hat: { type: 'boater', color: 0xf0d78a, band: 0xc8443a }, detail: ['collar'] }, cx: S, z: -2.85, speed: 1.0, off: 2, dir: 1 });

// =====================================================================================
// COMISARÍA
// =====================================================================================
surface(scene, tex.bricks({ base: '#b9c3b2', mortar: '#8e9987', rows: 9, cols: 4, seed: 8 }, 10, 3.4), 30, 12, P, 6, -2.0);
surface(scene, tex.tiles({ base: '#b8a07a', line: '#8a7452', n: 4 }, 14, 10), 30, 30, P, 0.001, 0, true);
k.plane(scene, 0x5d7a6a, 30, 1.0, P, 0.5, -1.99); k.plane(scene, INK, 30, 0.06, P, 1.0, -1.985);
picture(scene, 0.7, 0.92, P + 0.05, 2.25, -1.98, (g, W, Hh) => {                         // afiche: VOLÉE
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#f2ead6'; g.fillRect(6, 6, W - 12, Hh - 12);
  g.fillStyle = '#c8443a'; g.font = `800 ${W * 0.18}px Montserrat`; g.textAlign = 'center'; g.fillText('VOLÉE', W / 2, Hh * 0.17);
  g.save(); g.translate(W * 0.2, Hh * 0.22); g.scale(0.6, 0.62); drawMona(g, W, Hh); g.restore(); g.strokeStyle = '#1e1428'; g.lineWidth = 4; g.strokeRect(W * 0.2, Hh * 0.22, W * 0.6, Hh * 0.62);
  g.fillStyle = '#1e1428'; g.font = `800 ${W * 0.09}px Montserrat`; g.fillText('LA JOCONDE', W / 2, Hh * 0.94);
}, 256);
picture(scene, 0.9, 0.8, P + 1.75, 2.2, -1.98, (g, W, Hh) => { g.fillStyle = '#cfe6f2'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#1e1428'; for (let i = 1; i < 5; i++) g.fillRect(i * W / 5 - 6, 0, 12, Hh); g.lineWidth = 20; g.strokeStyle = '#1e1428'; g.strokeRect(0, 0, W, Hh); });
{ const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.6), new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.15, depthWrite: false })); ray.position.set(P + 1.2, 1.4, -1.2); ray.rotation.z = 0.62; scene.add(ray); }
for (const x of [P - 2.6, P + 2.6]) { block(scene, 0x7d8a8f, x - 0.32, x + 0.32, 0, 1.35, -1.95, -1.5); for (const y of [0.35, 0.75, 1.15]) { block(scene, 0x95a3a8, x - 0.26, x + 0.26, y - 0.15, y + 0.15, -1.5, -1.47, 0.01); block(scene, 0xd9a441, x - 0.06, x + 0.06, y - 0.02, y + 0.02, -1.47, -1.45, 0.006); } }
block(scene, 0x7a4b2a, P - 0.7, P + 0.7, 0, 0.74, -0.45, 0.15); block(scene, 0x9a6638, P - 0.78, P + 0.78, 0.74, 0.8, -0.5, 0.2);
block(scene, 0x2b2f3a, P + 0.25, P + 0.6, 0.8, 0.95, -0.3, 0.0); block(scene, 0x3a3f4d, P + 0.28, P + 0.57, 0.95, 1.02, -0.32, -0.18, 0.01);      // máquina de escribir
for (const [x, r] of [[-0.35, 0.1], [-0.15, -0.2]]) { const pp = k.plane(scene, 0xfbf6ea, 0.22, 0.3, P + x, 0.805, -0.1, true); pp.rotation.z = r; }
const lampP = new THREE.Group(); lampP.position.set(P, 3.6, -0.3); scene.add(lampP);
block(lampP, 0x2b2f3a, -0.012, 0.012, -1.2, 0, 0.012, -0.012, 0.005);
{ const shade = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 18, 1, true), flat(0x3f6b55, { side: THREE.DoubleSide })), 0.016); shade.position.y = -1.28; lampP.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })); bulb.position.y = -1.36; lampP.add(bulb); }
// rincón 2: el que interroga a Peruggia, con un tablero de sospechosos
block(scene, 0x7a4b2a, P + 4.75, P + 5.55, 0, 0.72, -0.25, 0.2); block(scene, 0x9a6638, P + 4.7, P + 5.6, 0.72, 0.78, -0.3, 0.25);
{ const pp = k.plane(scene, 0xfbf6ea, 0.24, 0.3, P + 5.0, 0.785, 0.0, true); pp.rotation.z = 0.15; }
picture(scene, 1.3, 0.85, P + 4.5, 2.15, -1.98, (g, W, Hh) => {
  g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#c08a54'; g.fillRect(8, 8, W - 16, Hh - 16);
  const spots = [[0.2, 0.32], [0.5, 0.25], [0.8, 0.35], [0.33, 0.72], [0.68, 0.7]];
  g.strokeStyle = '#c8443a'; g.lineWidth = 4; g.beginPath(); spots.forEach(([x, y], i) => i ? g.lineTo(x * W, y * Hh) : g.moveTo(x * W, y * Hh)); g.closePath(); g.stroke();
  for (const [x, y] of spots) { g.fillStyle = '#fbf6ea'; g.fillRect(x * W - 26, y * Hh - 30, 52, 60); ell(g, x * W, y * Hh - 6, 13, 15, 0, '#e8c08a'); ell(g, x * W, y * Hh - 18, 14, 7, 0, '#3a2a1a'); ell(g, x * W, y * Hh + 26, 20, 10, 0, '#5d6772'); ell(g, x * W, y * Hh - 30, 5, 5, 0, '#c8443a'); }
}, 384);
{ const cl = new THREE.Group(); cl.position.set(P - 1.5, 2.55, -1.97); scene.add(cl); picture(cl, 0.34, 0.34, 0, 0, 0, (g, W) => { g.fillStyle = '#1e1428'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#fbf3dc'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 14, 0, 7); g.fill(); }); }

// =====================================================================================
// LA PIEZA DE PERUGGIA EN PARÍS (el baúl)
// =====================================================================================
surface(scene, tex.stripes({ a: '#c9d4dc', b: '#b7c5cf', dot: '#9fb0bd', n: 6 }, 8, 3), 30, 12, R, 6, -1.9);
surface(scene, tex.planks({ base: '#9a6a3e', line: '#6a4422', seed: 12, n: 6 }, 10, 8), 30, 30, R, 0.001, 0, true);
k.plane(scene, 0x8a6a4a, 30, 0.14, R, 0.07, -1.89);
k.poly(scene, [[R - 6, 3.25], [R + 0.2, 3.25], [R + 6, 2.3], [R + 6, 7], [R - 6, 7]], 0x7a5a3a, 0.06).position.z = -1.86;
for (const x of [-4.4, -2.4, -0.4]) k.plane(scene, 0x5a3e24, 0.16, 4, R + x, 5.2, -1.855);
// ventana: cielo que pasa del día a la noche (el tiempo corre), con techos de París
const winSky = k.plane(scene, 0x9fd0ea, 1.0, 0.9, R + 0.9, 2.0, -1.888);
const sunD = new THREE.Mesh(new THREE.CircleGeometry(0.09, 18), new THREE.MeshBasicMaterial({ color: 0xffe9a3 })); sunD.position.z = -1.886; scene.add(sunD);
const moonD = new THREE.Mesh(new THREE.CircleGeometry(0.075, 18), new THREE.MeshBasicMaterial({ color: 0xf4f1e8 })); moonD.position.z = -1.886; scene.add(moonD);
picture(scene, 1.0, 0.9, R + 0.9, 2.0, -1.884, (g, W, Hh) => { g.fillStyle = '#5d6772'; g.beginPath(); g.moveTo(0, Hh); g.lineTo(0, Hh * 0.7); g.lineTo(W * 0.2, Hh * 0.62); g.lineTo(W * 0.35, Hh * 0.72); g.lineTo(W * 0.5, Hh * 0.6); g.lineTo(W * 0.5, Hh * 0.5); g.lineTo(W * 0.56, Hh * 0.5); g.lineTo(W * 0.56, Hh * 0.62); g.lineTo(W * 0.75, Hh * 0.68); g.lineTo(W, Hh * 0.58); g.lineTo(W, Hh); g.fill();
  g.strokeStyle = '#3a3f4d'; g.lineWidth = 4; g.beginPath(); g.moveTo(W * 0.82, Hh * 0.65); g.lineTo(W * 0.86, Hh * 0.18); g.lineTo(W * 0.9, Hh * 0.65); g.moveTo(W * 0.835, Hh * 0.5); g.lineTo(W * 0.885, Hh * 0.5); g.stroke(); });
picture(scene, 1.12, 1.02, R + 0.9, 2.0, -1.88, (g, W, Hh) => { g.strokeStyle = '#1e1428'; g.lineWidth = 26; g.strokeRect(13, 13, W - 26, Hh - 26); g.strokeStyle = '#f4f1e8'; g.lineWidth = 14; g.strokeRect(13, 13, W - 26, Hh - 26); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, Hh); g.moveTo(0, Hh / 2); g.lineTo(W, Hh / 2); g.stroke(); });
block(scene, 0xe9e4d6, R + 0.3, R + 1.5, 1.46, 1.52, -1.9, -1.78, 0.012);
// calendario que pasa las hojas
const calBack = picture(scene, 0.5, 0.6, R - 1.9, 2.05, -1.88, (g, W, Hh) => { g.fillStyle = '#1e1428'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#c8443a'; g.fillRect(5, 5, W - 10, Hh * 0.22); g.fillStyle = '#fbf6ea'; g.fillRect(5, Hh * 0.22 + 5, W - 10, Hh * 0.78 - 10); });
const years = ['1911', '1912', '1913'].map((y, i) => { const m = k.sign(y, 0.44, 0.4, { bg: '#fbf6ea', fg: '#c8443a' }); m.geometry.translate(0, -0.2, 0); m.position.set(R - 1.9, 2.22, -1.87 + 0.003 * (3 - i)); scene.add(m); return m; });
block(scene, 0x7a4b2a, R - 2.3, R - 1.5, 0, 0.7, -1.85, -1.25); block(scene, 0x9a6638, R - 2.36, R - 1.44, 0.7, 0.76, -1.88, -1.22);
{ const cd = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), flat(0xf4f1e8)), 0.01); cd.position.set(R - 1.7, 0.84, -1.5); scene.add(cd); }
const flame = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 10), flat(0xffb43a)), 0.008); flame.position.set(R - 1.7, 0.97, -1.5); scene.add(flame);
const glowR = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.3, depthWrite: false })); glowR.position.set(R - 1.7, 1.0, -1.6); scene.add(glowR);
block(scene, 0x7a4b2a, R + 1.9, R + 3.6, 0, 0.42, -1.85, -0.85); block(scene, 0xe8eef2, R + 1.92, R + 3.58, 0.42, 0.56, -1.83, -0.87); block(scene, 0x3f6ea8, R + 2.5, R + 3.6, 0.56, 0.62, -1.86, -0.84); block(scene, 0x7a4b2a, R + 1.86, R + 1.98, 0, 1.0, -1.85, -0.85);
{ const pil = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), flat(0xffffff)), 0.014); pil.scale.set(1, 0.4, 1.4); pil.position.set(R + 2.2, 0.62, -1.35); scene.add(pil); }
// el blusón blanco colgado (de recuerdo)
picture(scene, 0.55, 0.75, R - 3.0, 1.75, -1.87, (g, W, Hh) => { g.fillStyle = '#1e1428'; g.beginPath(); g.moveTo(W * 0.5, 8); g.lineTo(W * 0.95, Hh * 0.3); g.lineTo(W * 0.82, Hh * 0.4); g.lineTo(W * 0.78, Hh - 6); g.lineTo(W * 0.22, Hh - 6); g.lineTo(W * 0.18, Hh * 0.4); g.lineTo(W * 0.05, Hh * 0.3); g.closePath(); g.fill();
  g.fillStyle = '#f4f1e8'; g.beginPath(); g.moveTo(W * 0.5, 22); g.lineTo(W * 0.88, Hh * 0.31); g.lineTo(W * 0.76, Hh * 0.38); g.lineTo(W * 0.73, Hh - 16); g.lineTo(W * 0.27, Hh - 16); g.lineTo(W * 0.24, Hh * 0.38); g.lineTo(W * 0.12, Hh * 0.31); g.closePath(); g.fill(); ell(g, W / 2, 14, 10, 10, 0, '#3a3f4d'); });
// el baúl (viaja después a Florencia)
const trunk = new THREE.Group(); scene.add(trunk);
block(trunk, 0x8a5a33, -0.45, 0.45, 0, 0.42, -0.25, 0.25);
for (const x of [-0.3, 0.3]) block(trunk, 0x3a3f4d, x - 0.035, x + 0.035, -0.005, 0.425, -0.26, 0.26, 0.01);
const lid = new THREE.Group(); lid.position.set(0, 0.42, -0.25); trunk.add(lid);
block(lid, 0x9a6638, -0.46, 0.46, 0, 0.1, 0, 0.51); for (const x of [-0.3, 0.3]) block(lid, 0x3a3f4d, x - 0.035, x + 0.035, 0, 0.105, -0.005, 0.515, 0.01);
block(lid, 0xd9a441, -0.05, 0.05, -0.04, 0.06, 0.5, 0.53, 0.008);
const glowT = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.45, depthWrite: false })); scene.add(glowT);

// =====================================================================================
// HOTEL EN FLORENCIA (1913)
// =====================================================================================
surface(scene, tex.stripes({ a: '#efd29a', b: '#e5c486', dot: '#d4ad66', n: 6 }, 8, 3), 30, 12, H, 6, -2.0);
surface(scene, tex.tiles({ base: '#c8744a', line: '#8f4a2a', n: 4 }, 14, 10), 30, 30, H, 0.001, 0, true);
surface(scene, tex.planks({ base: '#7a4b2a', line: '#5a3a1a', seed: 3, n: 10 }, 12, 1), 30, 0.9, H, 0.45, -1.99); k.plane(scene, INK, 30, 0.06, H, 0.9, -1.985);
const WX = H - 0.7;
picture(scene, 1.3, 1.3, WX, 2.25, -1.985, (g, W, Hh) => {                            // Florencia por la ventana
  const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#7fc0ea'); gr.addColorStop(0.7, '#f7e3b8'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#9ab88a'; g.beginPath(); g.moveTo(0, Hh * 0.72); g.quadraticCurveTo(W * 0.3, Hh * 0.55, W * 0.6, Hh * 0.68); g.quadraticCurveTo(W * 0.85, Hh * 0.58, W, Hh * 0.66); g.lineTo(W, Hh); g.lineTo(0, Hh); g.fill();
  // cúpula de Brunelleschi
  g.fillStyle = '#f1e7cf'; g.fillRect(W * 0.32, Hh * 0.6, W * 0.36, Hh * 0.14);
  g.fillStyle = '#c8603a'; g.beginPath(); g.moveTo(W * 0.32, Hh * 0.6); g.quadraticCurveTo(W * 0.34, Hh * 0.3, W * 0.5, Hh * 0.27); g.quadraticCurveTo(W * 0.66, Hh * 0.3, W * 0.68, Hh * 0.6); g.fill();
  g.strokeStyle = '#fbf3dc'; g.lineWidth = 5; for (const s of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(W * (0.5 + s * 0.3), Hh * 0.6); g.quadraticCurveTo(W * (0.5 + s * 0.15), Hh * 0.36, W * 0.5, Hh * 0.27); g.stroke(); }
  g.fillStyle = '#fbf3dc'; g.fillRect(W * 0.47, Hh * 0.2, W * 0.06, Hh * 0.08); ell(g, W * 0.5, Hh * 0.19, W * 0.02, W * 0.02, 0, '#d9a441');
  // campanario y torre del Palazzo Vecchio
  g.fillStyle = '#f4f1e8'; g.fillRect(W * 0.76, Hh * 0.3, W * 0.09, Hh * 0.44); g.fillStyle = '#5f8f6b'; for (let i = 0; i < 4; i++) g.fillRect(W * 0.76, Hh * (0.34 + i * 0.1), W * 0.09, Hh * 0.025);
  g.fillStyle = '#d9b48a'; g.fillRect(W * 0.12, Hh * 0.36, W * 0.07, Hh * 0.38); for (let i = 0; i < 3; i++) g.fillRect(W * (0.11 + i * 0.033), Hh * 0.33, W * 0.022, Hh * 0.04);
  g.fillStyle = '#c8744a'; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(W * i / 7, Hh * 0.82); g.lineTo(W * (i + 0.5) / 7, Hh * 0.74); g.lineTo(W * (i + 1) / 7, Hh * 0.82); g.lineTo(W * (i + 1) / 7, Hh); g.lineTo(W * i / 7, Hh); g.fill(); }
  g.strokeStyle = '#1e1428'; g.lineWidth = 3; g.strokeRect(W * 0.32, Hh * 0.6, W * 0.36, Hh * 0.14);
}, 384);
const curtains = [-1, 1].map(s => { const cu = new THREE.Group(); cu.position.set(WX + s * 0.66, 2.95, -1.96); scene.add(cu);
  const m = k.poly(cu, [[-0.14, 0], [0.14, 0], [0.18 - s * 0.06, -1.5], [-0.18 - s * 0.06, -1.5]], 0xa83246, 0.03); return cu; });
picture(scene, 1.4, 1.4, WX, 2.25, -1.975, (g, W, Hh) => { g.strokeStyle = '#1e1428'; g.lineWidth = 26; g.strokeRect(13, 13, W - 26, Hh - 26); g.strokeStyle = '#ffffff'; g.lineWidth = 14; g.strokeRect(13, 13, W - 26, Hh - 26); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, Hh); g.stroke(); });
block(scene, 0xe9e4d6, WX - 0.75, WX + 0.75, 1.5, 1.57, -2.0, -1.86, 0.012);
const birdsW = [0, 1].map(i => { const b = new THREE.Group(); scene.add(b); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.014), INK); w.geometry.translate(s * 0.035, 0, 0); b.add(w); } b.position.z = -1.98; return b; });
// puerta del fondo (por donde entra el director de los Uffizi)
const HD = H + 0.75;
k.plane(scene, 0x2a2018, 0.9, 2.1, HD, 1.05, -1.985); block(scene, 0x9a6638, HD - 0.52, HD - 0.45, 0, 2.18, -2.0, -1.9); block(scene, 0x9a6638, HD + 0.45, HD + 0.52, 0, 2.18, -2.0, -1.9); block(scene, 0x9a6638, HD - 0.52, HD + 0.52, 2.1, 2.2, -2.0, -1.9);
const hdoor = new THREE.Group(); hdoor.position.set(HD - 0.45, 0, -1.96); scene.add(hdoor);
block(hdoor, 0x8f5c33, 0, 0.9, 0, 2.08, 0.025, -0.025); block(hdoor, 0xa8703f, 0.12, 0.78, 1.15, 1.9, 0.04, 0.02, 0.01); block(hdoor, 0xa8703f, 0.12, 0.78, 0.2, 1.0, 0.04, 0.02, 0.01);
block(scene, 0x7a4b2a, H - 3.0, H - 2.0, 0, 2.2, -1.95, -1.45); block(scene, 0x8f5c33, H - 2.95, H - 2.52, 0.15, 2.05, -1.45, -1.42, 0.01); block(scene, 0x8f5c33, H - 2.48, H - 2.05, 0.15, 2.05, -1.45, -1.42, 0.01);
block(scene, 0x7a4b2a, H + 2.2, H + 3.7, 0, 0.45, -1.95, -0.9); block(scene, 0xf4f1e8, H + 2.22, H + 3.68, 0.45, 0.6, -1.93, -0.92); block(scene, 0x5f8f6b, H + 2.7, H + 3.7, 0.6, 0.66, -1.96, -0.88); block(scene, 0x7a4b2a, H + 2.15, H + 2.27, 0, 1.05, -1.95, -0.9);
painting(scene, 0.9, 0.65, H + 2.95, 1.85, -1.98, 3);
{ const gl = new THREE.Mesh(new THREE.CircleGeometry(0.36, 22), new THREE.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.32 })); gl.position.set(H + 1.7, 2.3, -1.98); scene.add(gl);
  const sc = outlined(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 10, 1, true), flat(0xfff3c4, { side: THREE.DoubleSide })), 0.014); sc.position.set(H + 1.7, 2.3, -1.88); scene.add(sc); }
const lupa = new THREE.Group(); scene.add(lupa);
{ const ring = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 24), flat(0xd9a441)), 0.008); lupa.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), new THREE.MeshBasicMaterial({ color: 0xcfeaf7, transparent: true, opacity: 0.45 })); lupa.add(glass);
  const hnd = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.13, 8), flat(0x5a3a22)), 0.008); hnd.position.set(0.07, -0.1, 0); hnd.rotation.z = 0.6; lupa.add(hnd); }
const bars = new THREE.Group(); scene.add(bars);
for (let i = -3; i <= 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 10), INK); b.position.set(i * 0.15, 1.2, 0); bars.add(b); }
for (const y of [0.2, 2.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.08), INK); b.position.y = y; bars.add(b); }
// diarios del mundo (final)
const PAPERS = ['JOURNAL', 'THE NEWS', 'GIORNALE', 'ZEITUNG', 'DIARIO', 'GAZETTE'];
const papers = PAPERS.map((n, i) => { const m = picture(scene, 0.72, 0.52, 0, 0, 0, drawPaper(n), 384); m.visible = false;
  m.userData = { x: [-0.8, 1.4, 0.3, -0.45, 1.0, 1.65][i], y: [2.95, 3.0, 3.35, 3.85, 3.9, 4.3][i], t0: diarT - 0.5 + i * 0.16 }; return m; });

// ---------- signos, partículas ----------
const qWall = k.glyph('?', '#ffd23a', 0.6), bang = k.glyph('!', '#ffd23a', 0.6), q1 = k.glyph('?', '#ffd23a', 0.5), q2 = k.glyph('?', '#ffd23a', 0.5), q3 = k.glyph('?', '#ffd23a', 0.45), q4 = k.glyph('?', '#ffd23a', 0.45);
const okM = k.glyph('✓', '#59c36a', 0.6), shh = k.glyph('✦', '#fff1a8', 0.4);
const sparks = [0, 1, 2, 3, 4].map(() => k.glyph('✦', '#fff1a8', 0.3));
const cash = [0, 1, 2].map(() => k.glyph('$', '#59c36a', 0.28));
const flashes = [0, 1, 2].map(() => k.glyph('✦', '#ffffff', 0.7));
const speed = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.025), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
const sweat = [0, 1, 2].map(() => { const m = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0x7cc4f0)), 0.01); m.scale.y = 1.4; m.visible = false; scene.add(m); return m; });
const puffA = k.puffs(), puffB = k.puffs(), puffC = k.puffs(), puffD = k.puffs(5);

// ---------- personajes ----------
const peruW = makeToon({ shirt: 0xf4f1e8, hair: 0x2b2118, mustache: true, detail: ['buttons', 'collar'], trim: 0xe0dccf }); scene.add(peruW.root);      // con el blusón del Louvre
const peru = makeToon({ shirt: 0x6b4a2a, hair: 0x2b2118, mustache: true, hat: { type: 'fedora', color: 0x3a3f4d, band: 0x15171c }, detail: ['collar', 'buttons'] }); scene.add(peru.root);
const coworkers = [makeToon({ shirt: 0xf4f1e8, hair: 0x6b4a2a, detail: ['buttons'] }), makeToon({ shirt: 0xf4f1e8, hair: 0x9aa0a8, mustache: true, detail: ['buttons'] })];
coworkers.forEach(t => scene.add(t.root));
const plumber = makeToon({ shirt: 0x3b6ea8, hair: 0x6b4a2a, mustache: true, hat: { type: 'kepi', color: 0x4a3222 }, detail: ['apron', 'belt'], trim: 0x2f4a8a }); scene.add(plumber.root);
const beroud = makeToon({ shirt: 0x8a6bbf, hair: 0x9aa0a8, mustache: true, hat: { type: 'bowler', color: 0x2b2f3a }, detail: ['collar', 'tie'] }); scene.add(beroud.root);
const visitors = [makeToon({ shirt: 0xc8553d, hair: 0x6b4a2a, hat: { type: 'boater', color: 0xf0d78a, band: 0x3f6ea8 }, detail: ['belt'] }),
  makeToon({ shirt: 0x3f8f6b, hair: 0x23262d, hat: { type: 'top', color: 0x23262d }, detail: ['collar', 'tie', 'buttons'] })];
visitors.forEach(t => scene.add(t.root));
const crowd = [makeToon({ shirt: 0xe0a030, hair: 0x23262d, detail: ['collar'] }), makeToon({ shirt: 0x3b82c4, hair: 0xe0b050, hat: { type: 'boater', color: 0xf0d78a, band: 0xc8443a } }),
  makeToon({ shirt: 0xb5404f, hair: 0x6b4a2a, hat: { type: 'bowler', color: 0x2b2f3a }, mustache: true, detail: ['buttons'] }), makeToon({ shirt: 0x5f8f6b, hair: 0xc98a3a, detail: ['collar', 'tie'] })];
crowd.forEach(t => scene.add(t.root));
const CROWD = [[-1.0, -0.4], [-2.3, -1.1], [1.0, -0.4], [2.3, -1.1]];
const cop = makeToon({ shirt: 0x2f4a8a, hair: 0x1b2440, mustache: true, hat: { type: 'kepi', color: 0x1b2440 }, detail: ['buttons', 'badge', 'belt'] }); scene.add(cop.root);
const cop2 = makeToon({ shirt: 0x2a3f78, hair: 0x6b4a2a, hat: { type: 'kepi', color: 0x1b2440 }, detail: ['buttons', 'badge', 'belt'] }); scene.add(cop2.root);
const apol = makeToon({ shirt: 0x4f6b3f, hair: 0x6b4a2a, hat: { type: 'bowler', color: 0x3a2a1e, band: 0x15171c }, detail: ['collar', 'tie'] }); scene.add(apol.root);
const pica = makeToon({ shirt: 0xf4f1e8, hair: 0x15110d, detail: ['stripes'] }); scene.add(pica.root);
const geri = makeToon({ shirt: 0x8a5a33, hair: 0x3a2a1e, mustache: true, hat: { type: 'bowler', color: 0x2b2f3a }, detail: ['collar', 'tie'] }); scene.add(geri.root);
const poggi = makeToon({ shirt: 0x2b2f3a, hair: 0x9aa0a8, mustache: true, hat: { type: 'top', color: 0x15171c }, detail: ['collar', 'tie', 'buttons'], trim: 0xf4f1e8 }); scene.add(poggi.root);
const cara = makeToon({ shirt: 0x1b2440, hair: 0x23262d, mustache: true, hat: { type: 'kepi', color: 0x15171c }, detail: ['buttons', 'belt', 'badge'] }); scene.add(cara.root);

const head = {}; const hp = name => (head[name] = head[name] || V(0, 0, 0));
const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), hand = V(0, 0, 0);
const tops = {}; const top = name => { const h = hp(name); return (tops[name] = tops[name] || V(0, 0, 0)).set(h.x, h.y + 0.42, h.z); };
const show = (toon, on) => { toon.root.visible = on; return on; };
const pose = (toon, name, p, t, kk) => { toon.pose(alive({ blink: blinkAt(t, kk), ...p }, t, kk)); toon.head.getWorldPosition(hp(name)); };
/** Caminar hacia el fondo o hacia adelante (z), sin patinar. */
function goZ(t, t0, t1, x, z0, z1, stride = 0.5) {
  const z = lerp(z0, z1, lin(t, t0, t1));
  return { x, z, phase: Math.abs(z - z0) / (2 * stride), walk: win(t, t0 - 0.02, t1 + 0.14, 0.12), stride, face: z1 < z0 ? PI : 0, look: V(x, 1.25, z1 < z0 ? z - 3 : z + 3), squash: settle(t, t1) };
}

// Peruggia en la calle y en la galería (blusón blanco)
const PX0 = 0.72, PZ = -1.55, PX1 = 3.0;
let peruHold = null;                                      // dónde lleva el cuadro (en el mundo) o null
function posePeruW(t) {
  peruHold = null;
  if (t >= c[1] && t < c[2]) {                           // calle: camina hasta la puerta del personal y entra
    const tIn = 9.35, tEnd = 10.35, zw = -1.2;
    let p;
    if (t < tIn) p = { ...go(t, c[1], tIn, S - 2.0, DOOR_X, 0.5), z: zw, mood: 'neutral' };
    else p = { ...goZ(t, tIn, tEnd, DOOR_X, zw, -3.1, 0.5) };
    if (t < tIn && t > vinT - 0.3) { p.look = V(p.x + 0.6, 1.4, 4); p.mood = 'sly'; }
    if (!show(peruW, p.z > -2.95)) return;
    pose(peruW, 'pw', p, t, 0.3); return;
  }
  if (t < c[2] || t >= 19.7) { show(peruW, false); return; }
  show(peruW, true);
  const lift = prog(t, descT + 0.2, descT + 0.7), t1 = 12.1, t2 = 13.2, t3 = 17.55, t4 = 18.45, t5 = 19.25;
  let p;
  if (t < t1) {                                          // junto al cuadro: lo descuelga
    const reach = win(t, c[2] + 0.05, descT + 0.75, 0.2);
    p = { x: PX0, z: PZ, face: lerp(-0.45, 0.25, prog(t, descT + 0.6, descT + 0.95)), squash: breathe(t), look: t < descT + 0.7 ? V(G - 0.6, 1.5, 0.6) : V(PX0, 1.4, 3),
      handL: V(G + 0.36, 1.45, -1.95), wL: reach, handR: V(G + 0.38, 1.25, -1.9), wR: reach, ...moodAt(t, [[0, 'sly'], [descT + 0.75, 'happy'], [ganT + 0.2, 'sly']]) };
  } else if (t < t2 + 0.1) p = { ...go(t, t1, t2, PX0, PX1, 0.68), z: PZ, mood: 'effort' };
  else if (t < t3) {                                     // le saca el marco y lo tapa con el blusón
    const pull = win(t, marcoT + 0.05, marcoT + 0.55, 0.12), cover = prog(t, tapaT - 0.25, tapaT + 0.05);
    p = { x: PX1, z: PZ, face: 0.2, squash: settle(t, t2) * breathe(t) * (1 + 0.05 * win(t, tapaT, tapaT + 0.6, 0.15)), y: hop(t, tapaT + 0.3, 0.1),
      look: t < marcoT + 0.6 ? V(PX1 + 0.6, 0.9, PZ + 1) : V(PX1, 1.45, 4),
      handL: cover > 0 ? V(PX1 - 0.3, 0.62, PZ + 0.22) : V(PX1 + 0.35, 1.0, PZ + 0.35), wL: Math.max(pull, cover),
      ...moodAt(t, [[0, 'effort'], [marcoT + 0.55, 'sly'], [tapaT + 0.1, 'happy'], [tapaT + 0.6, 'sly']]) };
  } else if (t < t4 + 0.1) p = { ...go(t, t3, t4, PX1, G + 5.3, 0.5), z: lerp(PZ, -1.85, lin(t, t3, t4)), mood: 'sly' };
  else p = { ...goZ(t, t4 + 0.1, t5, G + 5.3, -1.85, -2.75, 0.45), mood: 'happy' };
  if (t < tapaT - 0.25 && t > descT + 0.4) { p.handR = V(p.x + 0.3, 1.0, (p.z ?? PZ) + 0.16); p.wR = 1; peruHold = 'side'; }
  else if (t >= tapaT - 0.25) { p.handR = V(p.x + 0.3, 0.62, (p.z ?? PZ) + 0.22); p.wR = 1; if (p.handL === undefined || p.walk) { p.handL = V(p.x - 0.3, 0.62, (p.z ?? PZ) + 0.22); p.wL = 1; } peruHold = 'belly'; }
  if (p.handL === undefined && !p.walk) { p.handL = talk(t, p.x, p.z ?? PZ, -1); p.wL = 0.8; }
  pose(peruW, 'pw', p, t, 0.3);
}
// bulto del cuadro bajo el blusón
const bulge = outlined(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), flat(0xf4f1e8)), 0.012); bulge.visible = false; scene.add(bulge);

function poseCoworkers(t) {
  coworkers.forEach((cw, i) => {
    const t0 = c[1], t1 = [6.2, 7.2][i], t2 = [7.0, 8.0][i], x0 = [S + 1.2, S + 0.4][i], z = [-1.2, -1.2][i];
    if (!show(cw, t >= c[1] && t < c[2])) return;
    const p = t < t1 ? { ...go(t, t0, t1, x0, DOOR_X, 0.48), z } : goZ(t, t1, t2, DOOR_X, z, -3.1, 0.48);
    if (!show(cw, (p.z ?? z) > -2.95)) return;
    pose(cw, 'cw' + i, p, t, 2 + i);
  });
}

function posePlumber(t) {
  wrench.visible = false;
  if (!show(plumber, t >= c[2] && t < c[4])) return;
  const x = G + 6.05, z = -1.5, open = back(lin(t, abreT - 0.1, abreT + 0.35)) * (1 - prog(t, 19.25, 19.6));
  const p = { x, z, face: -0.5, squash: breathe(t, 3) * settle(t, plomT, 0.08), y: hop(t, plomT, 0.1), look: t < c[3] ? V(G + 3.4, 1.4, 1) : t < 19.3 ? V(hp('pw').x, 1.4, 1.5) : V(x, 1.4, 4),
    handL: V(G + 5.75, 1.08, -2.0), wL: open > 0.05 ? 1 : 0, handR: t > 19.4 ? V(x + 0.38, 1.25 + 0.03 * Math.sin(t * 9), z + 0.3) : V(x + 0.3, 0.9, z + 0.3), wR: 1,
    ...moodAt(t, [[0, 'neutral'], [plomT, 'happy'], [19.4, 'surprised'], [19.9, 'neutral']]) };
  pose(plumber, 'pl', p, t, 3);
  wrench.visible = true; plumber.hand(1, tmp); wrench.position.copy(tmp); wrench.rotation.z = 0.4 + 0.15 * Math.sin(t * 3);
}
const wrench = new THREE.Group(); scene.add(wrench);
{ const h = outlined(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.26, 0.03), flat(0x9aa0a8)), 0.008); h.position.y = 0.1; wrench.add(h); const j = outlined(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.016, 6, 12, 4.5), flat(0x9aa0a8)), 0.006); j.position.y = 0.25; wrench.add(j); }

function poseBeroud(t) {
  const on = t >= c[4] && t < c[5]; show(beroud, on); easel.visible = on; palette.visible = on;
  if (!on) return;
  const x1 = G - 0.75, z = -0.55, arrive = pintT + 0.45;
  let p;
  if (t < arrive) p = { ...go(t, c[4] + 0.05, arrive, G - 3.2, x1, 0.46), z, mood: 'happy' };
  else {
    const shock = t > vaciaT - 0.05;
    p = { x: x1, z, face: lerp(PI / 2, 0.35, prog(t, arrive, arrive + 0.3)), squash: settle(t, arrive) * settle(t, vaciaT + 0.4, 0.14) * breathe(t), y: hop(t, vaciaT, 0.22),
      look: t < encT ? V(x1, 1.4, 4) : t < vaciaT + 0.1 ? V(G, 1.6, -2.1) : V(x1 + 0.5, 1.5, 3),
      handL: shock ? V(x1 - 0.2, 1.38, z + 0.3) : V(x1 - 0.3, 0.95, z + 0.3), wL: 1, handR: shock ? V(x1 + 0.2, 1.38, z + 0.3) : talk(t, x1, z, 1), wR: 1,
      ...moodAt(t, [[0, 'happy'], [encT, 'neutral'], [vaciaT, 'surprised'], [vaciaT + 0.5, 'worried']]) };
  }
  pose(beroud, 'be', p, t, 4);
  // paleta: en la mano hasta que se le cae
  const drop = lin(t, vaciaT + 0.05, vaciaT + 0.35);
  if (t < vaciaT + 0.05) { beroud.hand(0, palette.position); palette.position.z += 0.05; palette.rotation.set(0, 0, 0.3); }
  else { palette.position.set(x1 - 0.42, lerp(0.95, 0.02, drop * drop), z + 0.35); palette.rotation.set(-PI / 2 * drop, 0, 0.3 + drop); }
  easel.scale.setScalar(Math.max(back(lin(t, arrive - 0.2, arrive + 0.1)), 0.001));
}

function poseVisitors(t) {
  const on = t >= c[4] && t < c[5];
  [[G - 2.85, -1.05, G - 2.75], [G + 3.05, -0.75, G + 2.7]].forEach(([x, z, lx], i) => {
    const v = visitors[i]; if (!show(v, on)) return;
    const turn = t >= vaciaT && t < c[5] ? prog(t, vaciaT + 0.1, vaciaT + 0.35) : 0;
    const p = { x: x + 0.05 * Math.sin(t * 0.8 + i), z, face: lerp(i ? -0.5 : 0.5, i ? -0.3 : 0.3, turn), squash: breathe(t, i), y: hop(t, vaciaT + 0.15 + i * 0.1, 0.12) * (t < c[5] ? 1 : 0) + (t >= backT ? hop(t, backT + 0.4 + 0.1 * i, 0.15) : 0),
      look: turn > 0.5 ? V(hp('be').x, 1.4, 1) : t >= backT ? V(G, 1.6, -2.1) : V(lx, 1.6, -2.2),
      handL: t >= backT && i === 0 ? V(x + 0.32, 1.6, z + 0.2) : null, wL: t >= backT && i === 0 ? back(lin(t, backT + 0.5, backT + 0.8)) : 0,
      ...moodAt(t, [[0, 'neutral'], [vaciaT + 0.1, 'surprised'], [c[5], 'neutral'], [backT + 0.3, 'happy']]) };
    pose(v, 'v' + i, p, t, 5 + i);
  });
}

function poseCrowd(t) {
  crowd.forEach((cr, i) => {
    if (!show(cr, t >= backT)) return;
    const [x, z] = CROWD[i], up = t > diarT - 0.3 && t < asiT;
    const p = { x: x + 0.04 * Math.sin(t * 1.1 + i * 2), z, face: x < 0 ? 0.35 : -0.35, squash: breathe(t, i) * settle(t, backT + 0.6, 0.1), y: hop(t, backT + 0.35 + 0.08 * i, 0.18) + hop(t, cuadroT + 0.05 * i, 0.16),
      look: up ? V(papers[i].userData.x, 2.8, 0) : t > cuadroT ? V(x * 0.4, 1.5, 3) : V(G, 1.6, 0.9),
      handR: i % 2 === 0 ? V(x + (x < 0 ? 0.32 : -0.32), 1.55, z + 0.2) : null, wR: i % 2 === 0 ? back(lin(t, backT + 0.55, backT + 0.85)) * (1 - prog(t, diarT - 0.3, diarT)) : 0,
      ...moodAt(t, [[0, 'surprised'], [backT + 0.5, 'happy'], [diarT - 0.2, 'surprised'], [asiT, 'happy']]) };
    if (!p.handR) { p.handL = talk(t, x, z, x < 0 ? 1 : -1, i); p.wL = 0.7; }
    pose(cr, 'cr' + i, p, t, 7 + i);
  });
}

function posePolice(t) {
  const on = t >= c[5] && t < c[7];
  for (const tn of [cop, cop2, apol, pica]) show(tn, on);
  if (!on) return;
  const slam = win(t, detT - 0.05, detT + 0.3, 0.08);
  pose(cop, 'cop', { x: P, z: -0.85, face: 0, squash: breathe(t, 1) * settle(t, detT + 0.1, 0.1), look: t < picT - 0.2 ? V(hp('ap').x, 1.4, 1.5) : V(hp('pi').x, 1.4, 1.5),
    handR: slam > 0 ? V(P + 0.32, lerp(1.2, 0.86, slam), -0.35) : talk(t, P, -0.85, 1, 1), wR: 1, handL: talk(t, P, -0.85, -1, 2), wL: 0.7, mood: 'angry' }, t, 9);
  pose(apol, 'ap', { x: P - 1.25, z: 0.45, face: 0.55, squash: breathe(t, 2) * settle(t, detT + 0.15, 0.14), y: hop(t, detT + 0.1, 0.18),
    look: t < apoT ? V(P, 1.5, -0.2) : V(P - 1.0, 1.4, 3), handL: V(P - 1.55, 1.5, 0.7), wL: back(lin(t, detT, detT + 0.3)), handR: V(P - 0.95, 1.5, 0.7), wR: back(lin(t, detT, detT + 0.3)),
    ...moodAt(t, [[0, 'neutral'], [detT + 0.05, 'surprised'], [apoT + 0.3, 'worried']]) }, t, 10);
  const arr = hastaT + 0.25;
  const pp = t < arr ? { ...go(t, hastaT - 0.55, arr, P + 2.5, P + 1.25, 0.46), z: 0.45, mood: 'neutral' }
    : { x: P + 1.25, z: 0.45, face: -0.55, squash: settle(t, arr) * breathe(t, 3), y: hop(t, picT, 0.14), look: V(P + 0.7, 1.45, 2.6),
      handL: talk(t, P + 1.25, 0.45, -1, 3), wL: 0.8, ...moodAt(t, [[0, 'neutral'], [picT - 0.2, 'surprised'], [picT + 0.4, 'worried']]) };
  pose(pica, 'pi', pp, t, 11);
  // rincón 2
  pose(cop2, 'c2', { x: P + 5.15, z: -0.6, face: -0.35, squash: breathe(t, 4) * settle(t, dosT + 0.05, 0.1) * settle(t, dosT + 0.3, 0.1), look: V(P + 4.0, 1.4, 0.8),
    handR: t > nadie2T ? V(P + 5.5 + 0.08 * Math.sin(t * 12), 1.3, -0.3) : talk(t, P + 5.15, -0.6, 1, 4), wR: 1, handL: talk(t, P + 5.15, -0.6, -1, 5), wL: 0.6,
    ...moodAt(t, [[0, 'neutral'], [dosT, 'angry'], [nadie2T, 'happy']]) }, t, 12);
}
function posePeru(t) {
  if (t < c[5] || t >= backT) { show(peru, false); return; }
  show(peru, true);
  let p;
  if (t < c[7]) {                                       // comisaría: interrogado, tranquilo
    const x = P + 4.0, z = 0.35;
    p = { x, z, face: 0.45, squash: breathe(t, 5), y: hop(t, nadie2T + 0.2, 0.1), look: t < nadie2T ? V(P + 5.1, 1.4, 0) : V(x + 0.3, 1.4, 4),
      handL: talk(t, x, z, -1, 6), wL: 0.7, ...moodAt(t, [[0, 'neutral'], [dosT, 'worried'], [nadie2T, 'sly']]) };
  } else if (t < c[8]) {                                // la pieza: el baúl
    const x = R - 1.0, z = -0.25, rub = win(t, baulT + 0.2, piezaT + 0.3, 0.2);
    p = { x, z, face: 0.45, squash: breathe(t, 5) * settle(t, baulT + 0.3, 0.1), y: hop(t, baulT + 0.25, 0.12), look: t < piezaT ? V(R + 0.25, 0.9, 0.1) : t < masT ? V(x + 0.4, 1.4, 4) : V(R - 1.9, 2.1, -1.8),
      handL: V(x + 0.05 + 0.05 * Math.sin(t * 14) * rub, 0.95, z + 0.32), wL: rub, handR: V(x + 0.1 - 0.05 * Math.sin(t * 14) * rub, 0.95, z + 0.34), wR: rub,
      ...moodAt(t, [[0, 'neutral'], [baulT, 'happy'], [piezaT, 'sly'], [masT + 0.1, 'neutral']]) };
  } else {                                              // Florencia
    const xe = H - 1.05, z = 0.25, arrive = 37.25;
    if (t < arrive + 0.1) { p = { ...go(t, c[8] + 0.1, arrive, H - 3.1, xe, 0.46), z, mood: 'effort' }; p.handL = V(p.x + 0.33, 0.48, z + 0.05); p.handR = V(p.x + 0.33, 0.48, z - 0.05); p.wL = p.wR = 1; }
    else {
      const caught = t > caeT - 0.1;
      p = { x: xe, z, face: 0.4, squash: settle(t, arrive) * breathe(t, 5) * settle(t, presoT, 0.14), y: hop(t, vendT, 0.12) + hop(t, verdT + 0.1, 0.14) + hop(t, caeT, 0.18),
        look: t < c[9] ? V(xe + 0.3, 1.4, 4) : t < confT ? V(hp('ge').x, 1.4, 1.5) : t < caeT ? V(H - 0.15, 1.0, 0.3) : V(hp('ca').x, 1.4, 1.5),
        handR: t > c[9] && !caught ? V(xe + 0.42, 1.02 + 0.03 * Math.sin(t * 6), z + 0.25) : null, wR: 1,
        handL: caught ? V(xe - 0.25, 1.32, z + 0.3) : null, wL: 1,
        ...moodAt(t, [[0, 'neutral'], [vendT - 0.1, 'happy'], [c[9], 'sly'], [verdT, 'happy'], [caeT - 0.15, 'surprised'], [presoT + 0.2, 'worried']]) };
      if (!p.handR) { p.handR = caught ? V(xe + 0.25, 1.32, z + 0.3) : talk(t, xe, z, 1, 7); p.wR = caught ? 1 : 0.7; }
      if (!p.handL) { p.handL = talk(t, xe, z, -1, 8); p.wL = 0.7; }
    }
  }
  pose(peru, 'pe', p, t, 13);
}
function poseHotel(t) {
  const on = t >= c[8] && t < backT;
  for (const tn of [geri, poggi, cara]) show(tn, false);
  if (!on) { lupa.visible = false; return; }
  // Geri (el comprador)
  if (show(geri, t >= 38.45)) {
    const xg = H + 1.65, z = 0.2, arr = 39.3;
    const p = t < arr ? { ...go(t, 38.45, arr, H + 3.4, xg, 0.46), z, mood: 'neutral' }
      : { x: xg, z, face: -0.45, squash: settle(t, arr) * breathe(t, 6), y: hop(t, verdT + 0.15, 0.12),
        look: t < llamaT ? V(hp('pe').x, 1.4, 1) : t < uffT ? V(xg - 1.0, 1.5, 2.2) : t < poliT ? V(H - 0.15, 1.0, 0.3) : V(xg - 0.3, 1.4, 4),
        handR: t > llamaT && t < uffT ? V(xg + 0.25 + 0.06 * Math.sin(t * 12), 1.65, z + 0.1) : t > poliT ? V(xg - 0.05, 1.22, z + 0.34) : null, wR: 1,
        ...moodAt(t, [[0, 'neutral'], [compT, 'sly'], [verdT, 'happy'], [poliT, 'sly']]) };
    if (!p.handR) { p.handR = talk(t, xg, z, 1, 9); p.wR = 0.7; }
    pose(geri, 'ge', p, t, 14);
  }
  // Poggi (director de los Uffizi), con la lupa
  lupa.visible = false;
  if (show(poggi, t >= llamaT + 0.25)) {
    const xp = H + 0.75, z1 = 0.35, t0 = llamaT + 0.25, t1 = uffT - 0.05;
    let p;
    if (t < t1) p = { ...goZ(t, t0, t1, xp, -1.7, z1, 0.5), mood: 'neutral' };
    else {
      const look = win(t, confT - 0.1, verdT + 0.2, 0.2);
      p = { x: xp, z: z1, face: lerp(0.2, 0.3, look), squash: settle(t, t1) * breathe(t, 7), lean: 0.22 * look, y: hop(t, verdT, 0.14),
        look: look > 0.5 ? V(H - 0.3, 1.1, 1.6) : V(xp, 1.4, 4), handL: look > 0 ? V(H + 0.1, 1.02, 0.48) : V(xp - 0.3, 1.0, z1 + 0.3), wL: 1,
        handR: talk(t, xp, z1, 1, 10), wR: 0.6, ...moodAt(t, [[0, 'neutral'], [confT, 'sly'], [verdT, 'surprised'], [verdT + 0.4, 'happy']]) };
    }
    pose(poggi, 'po', p, t, 15);
    lupa.visible = true; poggi.hand(0, lupa.position); lupa.position.z += 0.05;
  }
  // el policía que lo detiene
  if (show(cara, t >= poliT - 0.05)) {
    const xc = H - 2.1, z = 0.3, arr = caeT - 0.05;
    const p = t < arr ? { ...go(t, poliT - 0.05, arr, H - 3.6, xc, 0.6), z, mood: 'angry' }
      : { x: xc, z, face: 0.45, squash: settle(t, arr) * breathe(t, 8), look: V(hp('pe').x, 1.4, 0.5), handR: V(xc + 0.42, 1.05, z + 0.2), wR: back(lin(t, arr, arr + 0.25)), mood: 'angry' };
    pose(cara, 'ca', p, t, 16);
  }
}

// ---------- la Mona Lisa: dónde está en cada momento ----------
const WALL = V(G, 1.5, -2.17), LEAN = V(G + 2.15, 0.49, -2.03);
function placeMona(t) {
  let pos = null, s = 1;
  const side = tmp2.set(0, 0, 0);
  if (t < robaT) pos = tmp.copy(WALL);
  else if (t < c[1]) { const u = lin(t, robaT, robaT + 0.32); if (u < 1) { pos = tmp.copy(WALL); pos.x += 5 * u * u; pos.y += 0.15 * u; } }
  else if (t >= c[2] && t < 19.7) {
    if (t < descT + 0.2) pos = tmp.copy(WALL);
    else {
      side.set(peruW.root.position.x + 0.52, 0.84, peruW.root.position.z + 0.12);
      const belly = V(hp('pw').x, 0.74, hp('pw').z + 0.22);
      pos = tmp.copy(WALL).lerp(side, prog(t, descT + 0.2, descT + 0.7));
      if (t > tapaT - 0.25) pos.copy(side).lerp(belly, prog(t, tapaT - 0.25, tapaT + 0.05));
      if (t > tapaT + 0.2) pos = null;
    }
  }
  else if (t >= c[7] && t < c[8]) {                      // sube del doble fondo del baúl
    const up = prog(t, baulT + 0.15, baulT + 0.6) * (1 - prog(t, masT, masT + 0.35));
    if (up > 0.01) pos = tmp.set(trunk.position.x, lerp(0.3, 0.98, up), trunk.position.z);
  } else if (t >= c[9] && t < backT) { const up = prog(t, c[9] + 0.1, c[9] + 0.55); if (up > 0.01) pos = tmp.set(trunk.position.x, lerp(0.3, 0.98, up), trunk.position.z); }
  else if (t >= backT) { pos = tmp.copy(WALL); s = back(lin(t, backT + 0.25, backT + 0.6)); }
  mona.visible = !!pos && s > 0.01;
  if (mona.visible) { mona.position.copy(pos); mona.scale.setScalar(Math.max(s, 0.001)); mona.rotation.z = t < 19.7 && t > descT ? 0.04 * Math.sin(t * 6) : 0; }
  // marco: va con el cuadro, sale volando hacia la pared de la escalera y queda apoyado ahí
  const withPanel = t < c[1] || (t >= c[2] && t < marcoT + 0.1) || t >= backT;
  if (withPanel && mona.visible) { mframe.visible = true; mframe.position.copy(mona.position); mframe.position.z += 0.006; mframe.scale.copy(mona.scale); mframe.rotation.set(0, 0, mona.rotation.z); }
  else if (t >= marcoT + 0.1 && t < marcoT + 0.5) { const u = prog(t, marcoT + 0.1, marcoT + 0.5); mframe.visible = true; mframe.scale.setScalar(1);
    mframe.position.copy(side).lerp(LEAN, u); mframe.position.y += 0.45 * Math.sin(PI * u); mframe.position.z += 0.006; mframe.rotation.set(-0.25 * u, 0, 0.5 * Math.sin(PI * u)); }
  else if (t >= marcoT + 0.5 && t < c[5]) { mframe.visible = true; mframe.scale.setScalar(1); mframe.position.copy(LEAN); mframe.rotation.set(-0.25, 0, 0); }
  else mframe.visible = false;
}

// ---------- tomas ----------
k.shots([
  { t: 0, pos: [G, 1.7, 8.6], look: [G, 1.85, -2] },
  { t: 1.3, pos: [G, 1.55, 4.2], look: [G, 1.5, -2.2] },
  { t: robaT + 0.35, pos: [G + 1.2, 1.6, 5.4], look: [G + 0.9, 1.6, -2.2] },
  { t: nadieT, pos: [G + 0.3, 1.95, 4.4], look: [G + 0.3, 2.0, -2.2] },
  { t: c[1], pos: [S, 2.1, 10.5], look: [S, 2.3, -3], cut: true },
  { t: vinT - 0.2, pos: [S + 0.3, 1.45, 4.4], look: [S + 0.3, 1.3, -1.2] },
  { t: blusT, pos: [S + 2.0, 1.4, 3.9], look: [S + 2.0, 1.15, -1.2], glide: true },
  { t: emplT, pos: [DOOR_X - 0.2, 1.9, 7.5], look: [DOOR_X - 0.2, 1.8, -3] },
  { t: c[2], pos: [G + 0.35, 1.5, 5.0], look: [G + 0.35, 1.35, -1.6], cut: true },
  { t: 11.6, pos: [G + 0.55, 1.45, 3.8], look: [G + 0.55, 1.3, -2] },
  { t: 13.2, pos: [G + 3.0, 1.35, 4.6], look: [G + 3.0, 1.05, -1.5], glide: true },
  { t: versT, pos: [G + 3.1, 1.45, 3.2], look: [G + 3.1, 1.3, -1.5] },
  { t: tapaT - 0.1, pos: [G + 3.0, 1.2, 4.0], look: [G + 3.0, 1.0, -1.5] },
  { t: c[3], pos: [G + 4.6, 1.6, 7.2], look: [G + 4.6, 1.4, -2] },
  { t: calleT - 0.4, pos: [G + 5.6, 1.5, 4.8], look: [G + 5.6, 1.3, -2.4] },
  { t: c[4], pos: [G - 0.6, 1.6, 6.2], look: [G - 0.6, 1.5, -2] },
  { t: pintT + 0.3, pos: [G - 0.8, 1.45, 4.0], look: [G - 0.8, 1.35, -0.4] },
  { t: encT, pos: [G - 0.3, 1.55, 5.2], look: [G - 0.25, 1.5, -2] },
  { t: vaciaT, pos: [G - 0.6, 1.45, 3.4], look: [G - 0.6, 1.4, -0.6] },
  { t: c[5], pos: [P, 1.7, 8.2], look: [P, 1.5, -0.5], cut: true },
  { t: apoT - 0.1, pos: [P - 1.15, 1.45, 4.4], look: [P - 1.15, 1.35, 0] },
  { t: picT - 0.4, pos: [P + 1.1, 1.45, 4.6], look: [P + 1.15, 1.35, 0] },
  { t: c[6], pos: [P + 4.55, 1.6, 6.6], look: [P + 4.55, 1.4, -0.3] },
  { t: dosT, pos: [P + 4.55, 1.55, 5.0], look: [P + 4.55, 1.45, -0.3] },
  { t: nadie2T, pos: [P + 4.0, 1.45, 3.5], look: [P + 4.0, 1.4, 0.3] },
  { t: c[7], pos: [R - 0.3, 1.6, 7.6], look: [R - 0.3, 1.3, -0.5], cut: true },
  { t: baulT - 0.1, pos: [R + 0.25, 1.15, 3.8], look: [R + 0.25, 0.8, 0] },
  { t: piezaT, pos: [R - 0.4, 1.45, 5.0], look: [R - 0.4, 1.25, -0.5] },
  { t: masT, pos: [R - 0.5, 1.95, 6.4], look: [R - 0.5, 1.95, -1.9] },
  { t: c[8], pos: [H - 2.0, 1.6, 7.0], look: [H - 2.0, 1.5, -0.5], cut: true },
  { t: florT, pos: [WX, 2.15, 4.6], look: [WX, 2.2, -2] },
  { t: c[9], pos: [H + 0.3, 1.6, 8.0], look: [H + 0.3, 1.4, -0.5] },
  { t: compT + 0.2, pos: [H + 1.6, 1.45, 4.4], look: [H + 1.6, 1.35, 0] },
  { t: uffT, pos: [H + 0.75, 1.5, 4.6], look: [H + 0.75, 1.35, 0] },
  { t: confT, pos: [H + 0.4, 1.4, 4.5], look: [H + 0.35, 1.25, 0] },
  { t: verdT + 0.25, pos: [H - 0.3, 1.5, 6.0], look: [H - 0.2, 1.3, 0] },
  { t: poliT, pos: [H - 1.4, 1.55, 6.0], look: [H - 1.5, 1.35, 0] },
  { t: presoT - 0.1, pos: [H - 1.1, 1.4, 4.4], look: [H - 1.1, 1.25, 0] },
  { t: backT, pos: [G, 1.6, 6.0], look: [G, 1.55, -2], cut: true },
  { t: c[11], pos: [G, 2.0, 8.8], look: [G, 2.0, -2] },
  { t: diarT, pos: [G + 0.3, 2.3, 7.4], look: [G + 0.3, 2.4, -1] },
  { t: asiT, pos: [G, 1.55, 3.6], look: [G, 1.5, -2.2] },
  { t: cuadroT, pos: [G, 1.55, 2.5], look: [G, 1.5, -2.2] },
]);

// ---------- carteles ----------
tag({ text: 'París, 1911', big: true, off: BIG, from: 0.15, to: robaT });
tag({ text: 'La Mona Lisa', at: () => tmp2.set(G - 0.2, 1.95, -2.1), off: [-200, -230], from: 0.5, to: robaT });
tag({ text: '¡Nadie lo notó!', big: true, off: BIG, from: nadieT, to: c[1] });
tag({ text: 'Lunes: cerrado', big: true, off: BIG, from: lunesT, to: vinT });
tag({ text: 'Vincenzo Peruggia', at: () => top('pw'), off: [40, -150], from: vinT + 0.1, to: blusT });
tag({ text: 'Blusón de empleado', at: () => V(hp('pw').x, 0.85, -1.0), off: [230, 120], from: blusT + 0.1, to: c[2] });
tag({ text: '4 ganchos', at: () => V(G + 0.42, 1.88, -2.08), off: [180, -170], from: ganT - 0.1, to: marcoT });
tag({ text: 'El marco', at: () => mframe.position, off: [150, -200], from: marcoT + 0.55, to: tapaT - 0.3 });
tag({ text: '¿Bajo el blusón?', big: true, off: BIG, from: tapaT - 0.1, to: c[3] });
tag({ text: 'Plomero', at: () => top('pl'), off: [-150, -150], from: plomT, to: calleT });
tag({ text: '¡Afuera!', big: true, off: BIG, from: calleT + 0.25, to: c[4] });
tag({ text: 'Al otro día', big: true, off: BIG, from: c[4] + 0.05, to: pintT + 0.3 });
tag({ text: 'Louis Béroud, pintor', at: () => top('be'), off: [60, -150], from: pintT + 0.35, to: encT });
tag({ text: '¡La pared vacía!', big: true, off: BIG, from: vaciaT, to: c[5] });
tag({ text: '¡Detenido!', big: true, off: BIG, from: detT, to: apoT + 0.4 });
tag({ text: 'Apollinaire, poeta', at: () => top('ap'), off: [60, -150], from: apoT, to: hastaT + 0.2 });
tag({ text: 'Pablo Picasso', at: () => top('pi'), off: [-40, -150], from: picT - 0.1, to: c[6] });
tag({ text: 'Vincenzo Peruggia', at: () => top('pe'), off: [20, -150], from: c[6] + 0.3, to: dosT });
tag({ text: '2 interrogatorios', big: true, off: BIG, from: dosT, to: nadie2T });
tag({ text: 'Nadie sospecha', big: true, off: BIG, from: nadie2T + 0.15, to: c[7] });
tag({ text: 'Baúl con doble fondo', at: () => V(trunk.position.x + 0.3, 0.45, trunk.position.z + 0.2), off: [-230, 260], from: baulT + 0.3, to: masT });
tag({ text: '+2 años', big: true, off: BIG, from: masT, to: c[8] });
tag({ text: 'Florencia, 1913', big: true, off: BIG, from: c[8] + 0.1, to: compT });
tag({ text: 'Alfredo Geri, comerciante', at: () => top('ge'), off: [-120, -150], from: compT + 0.25, to: uffT });
tag({ text: 'Director de los Uffizi', at: () => top('po'), off: [-40, -150], from: uffT, to: verdT - 0.1 });
tag({ text: '¡Es la verdadera!', big: true, off: BIG, from: verdT, to: poliT });
tag({ text: 'Policía', at: () => top('ca'), off: [60, -150], from: poliT + 0.4, to: caeT });
tag({ text: '¡Preso!', big: true, off: BIG, from: presoT, to: backT });
tag({ text: 'Louvre, 1914', big: true, off: BIG, from: backT + 0.2, to: c[11] + 0.4 });
tag({ text: 'En todo el mundo', big: true, off: BIG, from: diarT, to: asiT });
tag({ text: '¡El más famoso!', big: true, off: BIG, from: cuadroT, to: END + 1 });

// ---------- sonidos ----------
sfx(0, 'boom', 0.5); sfx(robaT, 'riser_to', 1); sfx(robaT, 'whoosh', 0.9); sfx(robaT + 0.05, 'boom', 0.45);
sfx(descT + 0.25, 'tap', 0.6); sfx(marcoT + 0.5, 'thud', 0.6); sfx(tapaT + 0.05, 'puff', 0.5);
sfx(abreT, 'tap', 0.5); sfx(19.55, 'thud', 0.7); sfx(vaciaT, 'riser_to', 1); sfx(vaciaT, 'boom', 0.45); sfx(vaciaT + 0.35, 'thud', 0.5);
sfx(detT, 'thud', 0.9); sfx(dosT, 'tap', 0.6); sfx(dosT + 0.25, 'tap', 0.6);
sfx(baulT, 'thud', 0.4); sfx(baulT + 0.6, 'riser_to', 0.8); sfx(masT + 0.6, 'thud', 0.6); [0, 1].forEach(i => sfx(masT + 0.15 + i * 0.35, 'tap', 0.5));
sfx(37.3, 'thud', 0.5); sfx(verdT, 'riser_to', 1); sfx(verdT, 'boom', 0.45); sfx(presoT, 'clang', 0.8); sfx(presoT + 0.15, 'thud', 0.8);
sfx(backT + 0.3, 'boom', 0.5); sfx(cuadroT, 'riser_to', 1); sfx(cuadroT, 'boom', 0.5);

// ---------- cuadro por cuadro ----------
k.run(t => {
  posePeruW(t); poseCoworkers(t); posePlumber(t); poseBeroud(t); poseVisitors(t); poseCrowd(t); posePolice(t);
  // baúl
  trunk.visible = t >= c[7] && t < backT;
  if (t < c[8]) trunk.position.set(R + 0.25, 0, 0.05);
  else { const arrive = 37.25; trunk.position.set(t < arrive ? lerp(H - 3.1, H - 1.05, lin(t, c[8] + 0.1, arrive)) + 0.9 : H - 0.15, 0.012 * Math.abs(Math.sin(t * 18)) * (t < arrive ? 1 : 0), 0.25); }
  const lidOpen = t < c[8] ? back(lin(t, baulT - 0.05, baulT + 0.25)) * (1 - prog(t, masT + 0.35, masT + 0.6)) : back(lin(t, c[9] - 0.05, c[9] + 0.25));
  lid.rotation.x = -1.9 * lidOpen;
  posePeru(t); poseHotel(t);
  if (t >= c[5] && t < c[7]) posePolice(t);              // segunda pasada: ya se conocen las cabezas
  if (t >= c[8] && t < backT) { posePeru(t); poseHotel(t); }
  placeMona(t);
  // bulto bajo el blusón
  bulge.visible = peruW.root.visible && t > tapaT - 0.05;
  if (bulge.visible) { const s = back(lin(t, tapaT - 0.05, tapaT + 0.25)); const ry = peruW.root.rotation.y; bulge.position.set(peruW.root.position.x + 0.2 * Math.sin(ry), 0.8, peruW.root.position.z + 0.18 * Math.cos(ry)); bulge.scale.set(0.42 * s, 0.52 * s, 0.16 * s); bulge.rotation.y = peruW.root.rotation.y; }
  // puertas
  door.rotation.y = 1.1 * back(lin(t, abreT - 0.05, abreT + 0.4)) * (1 - prog(t, 19.25, 19.6)) * (t >= c[2] && t < c[4] ? 1 : 0);
  hdoor.rotation.y = -1.5 * back(lin(t, llamaT + 0.05, llamaT + 0.4)) * (1 - prog(t, uffT + 0.4, uffT + 0.8));
  // reloj, luz y polvo de la galería
  const fast = win(t, nadieT - 0.1, c[1], 0.2), spin = t * 0.4 + 18 * Math.max(0, Math.min(t, c[1]) - nadieT + 0.1) * (t > nadieT - 0.1 ? 1 : 0);
  minH.rotation.z = -spin * 2 * PI / 3; hourH.rotation.z = -spin * 2 * PI / 36 - 1.2; clock.scale.setScalar(1 + 0.08 * fast * Math.abs(Math.sin(t * 20)));
  rays.forEach((r, i) => { r.material.opacity = 0.09 + 0.04 * Math.sin(t * 1.3 + i * 2); });
  motes.forEach((m, i) => { const d = m.userData; m.position.set(G + d.x + 0.25 * Math.sin(t * 0.4 * d.s + i), d.y + ((t * 0.08 * d.s + i * 0.3) % 1.2) - 0.6, -1.4 + 0.1 * (i % 5)); });
  // pieza: vela, ventana (día/noche rápido mientras pasan los años), calendario
  flame.scale.set(1 + 0.15 * Math.sin(t * 23), 1 + 0.25 * Math.sin(t * 17 + 1), 1); flame.rotation.z = 0.15 * Math.sin(t * 9); glowR.material.opacity = 0.25 + 0.08 * Math.sin(t * 13);
  { const dayK = t < masT ? 0.15 : 0.15 + (t - masT) * 1.6, ang = dayK * 2 * PI, sx = R + 0.9 + 0.42 * Math.cos(ang), sy = 2.0 + 0.32 * Math.sin(ang);
    const night = Math.max(0, -Math.sin(ang)); winSky.material.color.setRGB(lerp(0.62, 0.12, night), lerp(0.82, 0.14, night), lerp(0.92, 0.32, night));
    sunD.position.set(sx, sy, -1.886); sunD.visible = sy > 1.62; moonD.position.set(R + 0.9 - 0.42 * Math.cos(ang), 2.0 - 0.32 * Math.sin(ang), -1.886); moonD.visible = moonD.position.y > 1.62; }
  years.forEach((m, i) => { const f = i < 2 ? prog(t, masT + 0.15 + i * 0.35, masT + 0.4 + i * 0.35) : 0; m.rotation.x = -PI * 0.5 * f; m.visible = f < 0.98; });
  glowT.visible = mona.visible && t >= c[7] && t < backT; if (glowT.visible) { glowT.position.set(mona.position.x, mona.position.y, mona.position.z - 0.03); glowT.scale.setScalar(0.95 + 0.08 * Math.sin(t * 7)); }
  // comisaría y hotel
  lampP.rotation.z = 0.07 * Math.sin(t * 1.6) + (t > detT ? 0.12 * Math.exp(-3 * (t - detT)) * Math.sin(12 * (t - detT)) : 0);
  closed.rotation.z = 0.06 * Math.sin(t * 2.2);
  curtains.forEach((cu, i) => { cu.rotation.z = 0.05 * Math.sin(t * 1.4 + i * 1.7); });
  birdsW.forEach((b, i) => { const u = ((t * 0.18 + i * 0.45) % 1); b.position.x = WX - 0.55 + 1.1 * u; b.position.y = 2.55 + 0.25 * i + 0.04 * Math.sin(t * 3 + i); const f = 0.5 * Math.sin(t * 12 + i); b.children[0].rotation.z = -f; b.children[1].rotation.z = f; b.visible = t >= c[8] && t < backT; });
  const fall = lin(t, presoT, presoT + 0.2);
  bars.visible = t >= presoT && t < backT; bars.position.set(H - 1.05, 2.8 * (1 - fall * fall) + (t > presoT + 0.2 ? 0.07 * Math.exp(-7 * (t - presoT - 0.2)) * Math.abs(Math.cos(16 * (t - presoT - 0.2))) : 0), 0.75);
  // diarios que llueven sobre la gente
  papers.forEach((m, i) => { const d = m.userData, u = t - d.t0, out = prog(t, asiT + 0.1 + i * 0.05, asiT + 0.6 + i * 0.05);
    m.visible = u > 0 && out < 1; if (!m.visible) return;
    const fallK = Math.min(u / 0.6, 1); m.position.set(G + d.x + 0.06 * Math.sin(t * 2 + i), lerp(5.6, d.y, 1 - (1 - fallK) ** 2) + 0.05 * Math.sin(t * 2.6 + i) + 3 * out * out, -0.3 + 0.05 * i);
    m.rotation.set(0, 0.2 * Math.sin(t * 1.5 + i), (1 - fallK) * 3 * (i % 2 ? 1 : -1) + 0.1 * Math.sin(t * 2 + i)); });
  // signos y partículas
  k.glyphAt(qWall, tmp2.set(G, 1.55, -2.1), 0, 0.05 * Math.sin(t * 5), popIn(t, robaT + 0.4, c[1]), 0.12 * Math.sin(t * 6));
  k.glyphAt(bang, hp('be'), 0.36, 0.42, popIn(t, vaciaT, c[5]));
  k.glyphAt(q1, hp('ap'), 0.34, 0.42, popIn(t, detT + 0.15, c[6]), 0.12 * Math.sin(t * 6));
  k.glyphAt(q2, hp('pi'), -0.34, 0.42, popIn(t, picT + 0.1, c[6]), 0.12 * Math.sin(t * 6 + 1));
  k.glyphAt(q3, hp('c2'), -0.18, 0.62, popIn(t, dosT, nadie2T), 0.12 * Math.sin(t * 6));
  k.glyphAt(q4, hp('c2'), 0.18, 0.66, popIn(t, dosT + 0.25, nadie2T), 0.12 * Math.sin(t * 6 + 2));
  k.glyphAt(okM, hp('po'), 0.34, 0.45, t >= c[9] ? popIn(t, verdT, poliT + 0.2) : 0);
  k.glyphAt(shh, hp('pe'), 0.5, 0.05, t >= c[6] && t < c[7] ? popIn(t, nadie2T + 0.2, c[7]) * (0.7 + 0.3 * Math.sin(t * 9)) : 0, t * 2);
  cash.forEach((m, i) => { const u = lin(t, vendT + i * 0.12, vendT + 0.8 + i * 0.12); k.glyphAt(m, hp('pe'), (i - 1) * 0.24, 0.45 + 0.6 * u, t >= c[8] && u > 0 && u < 1 ? back(u * 3) * (1 - prog(u, 0.7, 1)) : 0); });
  sparks.forEach((m, i) => {
    const kk = Math.max(popIn(t, baulT + 0.4, masT), t >= c[9] && t < backT ? popIn(t, c[9] + 0.5, poliT) : 0, popIn(t, backT + 0.4, c[11]), popIn(t, cuadroT, END + 1)) * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.6));
    k.glyphAt(m, mona.position, [-0.42, 0.44, -0.38, 0.4, 0][i], [0.36, 0.3, -0.3, -0.34, 0.5][i], mona.visible ? Math.max(kk, 0) : 0, t * 1.5 + i);
  });
  flashes.forEach((m, i) => { const tt = cuadroT + 0.2 + i * 0.45, u = lin(t, tt, tt + 0.25); k.glyphAt(m, tmp2.set(G + [-0.75, 0.78, -0.7][i], [1.2, 1.55, 1.95][i], -1.2), 0, 0, u > 0 && u < 1 ? Math.sin(PI * u) * 1.2 : 0, u * 2); });
  sweat.forEach((m, i) => { const on = t > caeT + 0.1 && t < backT, u = (t * 1.7 + i / 3) % 1, s = i % 2 ? 1 : -1; m.visible = on; if (!on) return; m.position.set(hp('pe').x + s * (0.3 + 0.25 * u), hp('pe').y + 0.22 + 0.3 * u - 0.6 * u * u, 0.55); m.scale.set(1 - u, 1.4 * (1 - u), 1 - u); });
  const yank = t > robaT && t < robaT + 0.45, running = (t > 12.15 && t < 13.2);
  speed.forEach((m, i) => { const on = yank || running; m.visible = on; if (!on) return;
    const bx = yank ? mona.position.x - 0.5 : hp('pw').x - 0.55; m.position.set(bx - 0.14 * ((i * 3) % 5) + 0.2 * Math.sin(t * 40 + i), (yank ? 1.25 : 0.45) + i * (yank ? 0.12 : 0.26), yank ? -2.0 : PZ + 0.2); m.material.opacity = 0.5 + 0.4 * Math.sin(t * 50 + i * 2); });
  puffA(t, 12.1, G + PX0, PZ, -1); puffB(t, marcoT + 0.5, LEAN.x, -1.85, 1); puffC(t, vaciaT + 0.35, G - 1.17, -0.2, -1); puffD(t, 37.25, H - 0.15, 0.25, 1);
  puffA(t, hastaT + 0.25, P + 1.25, 0.45, 1);
});
