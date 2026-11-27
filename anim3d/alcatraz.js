// Episodio: la fuga de Alcatraz (1962), en 14 pasos "pero / así que". Dos decorados: el PABELLÓN
// en corte (celda, pared del fondo, pasillo de servicio, taller, ventilador del techo) y la ISLA
// con la bahía. La línea de tiempo cuelga de out/alcatraz/timing.json (python -m anim3d.narrar
// alcatraz): cada frase del guion es un paso, y los cortes caen en palabras con at().
// Regla del formato (medida contra la referencia): nada queda quieto más de ~2 s; cada paso trae
// una acción, un encuadre o un cartel nuevo.
import * as THREE from 'three';
import { rng, lerp, prog, lin, win, clamp01, makeStage, mat, speckleTex, gradientTex, slab, cyl, ball,
  makeTags, makeCamera, cutTimes } from '/lib/kit.js';
import { loadCharacter, OUTFITS } from '/lib/character.js';

const timing = await (await fetch('/out/alcatraz/timing.json')).json();
const END = timing.duration;
window.DURATION = END;
const c = timing.frases.map(f => f.start);      // c[0]..c[13] = inicio de cada paso
/** Segundo en que se dice `word` por primera vez a partir de `from`. */
const at = (word, from) => (timing.words.find(w => w.start >= from && w.text.toLowerCase().startsWith(word)) || { start: from }).start;

const namesT = at('frank', 0) - 0.15, blockT = at('cárcel', 0) - 0.3, zoomT = at('hacen', 0) - 0.35;
const ventT = at('pero', c[1]) - 0.1;
const drillT = at('taladro', c[2]) - 0.25, boreT = at('perforan', c[2]) - 0.3, looseT = at('aflojar', c[2]) - 0.2;
const cardT = at('tapan', c[3]) - 0.2;
const climbT = at('trepan', c[4]) - 0.25, shopT = at('montan', c[4]) - 0.35;
const coatsT = at('juntan', c[5]) - 0.3, sewT = at('cosen', c[5]) - 0.25, vestT = at('chalecos', c[5]) - 0.1;
const steamT = at('sellan', c[6]) - 0.3;
const pumpT = at('convierten', c[7]) - 0.25, inflateT = at('inflador', c[7]) - 0.2;
const headT = at('dejan', c[8]) - 0.3, paintT = at('pintada', c[8]) - 0.1, hairT = at('pelo', c[8]) - 0.1;
const forceT = at('fuerzan', c[9]) - 0.25, soapT = at('tornillo', c[9]) - 0.2;
const stackT = at('bajan', c[10]) - 0.25, fenceT = at('saltan', c[10]) - 0.25, launchT = at('echan', c[10]) - 0.25;
const pushT = at('empuja', c[11]) - 0.1, rollT = at('rueda', c[11]) - 0.25;
const neverT = at('ellos', c[12]) - 0.2;
const askT = at('llegaron', c[13]) - 0.2;

const { renderer, scene, camera } = makeStage({ fov: 38 });
const PI = Math.PI;
const SFX = []; window.SFX = SFX;               // [segundo, sonido, volumen] -> lo mezcla anim3d/armar.py
const sfx = (t, name, vol = 0.6) => SFX.push([+t.toFixed(3), name, vol]);

// =====================================================================================
// PABELLÓN EN CORTE. Se mira de costado: x = fondo de la celda, y = altura, z=0 es el corte.
//   galería | reja | CELDA (-3.2..0) | pared (0..0.2) | PASILLO (0.2..1.3) | pared | otra fila
// =====================================================================================
const IN = new THREE.Group(); scene.add(IN);
const TIER = 2.4, CH = 2.2, ZB = -1.9;          // alto de piso a piso, alto libre de celda, fondo
const GAP0 = 0.05, GAP1 = 0.85, HZ = -0.6;      // el trozo de pared que se afloja (alto y hasta qué profundidad)
const TOP = 3 * TIER, ROOF = 9.6;

const concrete = mat({ map: speckleTex('#c2beb3', { seed: 2 }) });
const cellPaint = mat({ map: speckleTex('#b4d8ac', { seed: 5, alpha: 0.04 }) });
const cellCream = mat({ map: speckleTex('#efe6c8', { seed: 6, alpha: 0.04 }) });
const darkWall = mat({ color: 0x565c63 });
const steel = mat({ color: 0x59616b, metalness: 0.6, roughness: 0.5 });
const rust = mat({ color: 0xc0683a, metalness: 0.35, roughness: 0.6 });
const white = mat({ color: 0xf0efe8 });
const blanket = mat({ color: 0x6f8fb0 });
const skin = mat({ color: 0xd9a98a });
const olive = [0x6f8050, 0x7f8a5c, 0x5f7046, 0x8a9366];

slab(IN, darkWall, -7, 7, -0.3, ROOF, ZB - 0.1, ZB - 0.25);                 // fondo general
const bedrock = mat({ map: speckleTex('#8a7560', { seed: 21, n: 2600, dark: 30, light: 220, alpha: 0.1, repeat: 1 }), emissive: 0x3a2e22, emissiveIntensity: 0.5 });
bedrock.map.repeat.set(7, 3);
slab(IN, bedrock, -7, 7, -6, -0.2, 0, ZB);                                   // la roca de la isla, bajo el edificio
slab(IN, concrete, -7, -6.8, -0.2, ROOF, 0, ZB);
for (let j = 0; j < 3; j++) {
  const y0 = j * TIER;
  slab(IN, concrete, j ? -4.6 : -6.8, 0.2, y0 - 0.2, y0, 0, ZB);
  slab(IN, concrete, 1.3, 4.8, y0 - 0.2, y0, 0, ZB);
  for (const [x0, x1] of [[-3.2, 0], [1.5, 4.8]]) {                           // pared lateral: verde abajo, crema arriba
    slab(IN, cellPaint, x0, x1, y0, y0 + 1.15, ZB, ZB - 0.1);
    slab(IN, cellCream, x0, x1, y0 + 1.15, y0 + CH, ZB, ZB - 0.1);
  }
  slab(IN, concrete, 0, 0.2, y0 + GAP1, y0 + CH, 0, ZB);                     // pared del fondo: arriba del hueco
  slab(IN, concrete, 0, 0.2, y0, y0 + GAP0, 0, ZB);
  slab(IN, concrete, 0, 0.2, y0 + GAP0, y0 + GAP1, HZ, ZB);
  if (j) slab(IN, concrete, 0, 0.2, y0 + GAP0, y0 + GAP1, 0, HZ);
  slab(IN, concrete, 1.3, 1.5, y0, y0 + CH, 0, ZB);
  for (let z = -0.1; z > ZB; z -= 0.18) cyl(IN, steel, 0.02, CH, -3.2, y0 + CH / 2, z);       // reja
  for (const y of [0.95, CH - 0.04]) slab(IN, steel, -3.23, -3.17, y0 + y, y0 + y + 0.05, 0, ZB);
  if (j) {
    for (let z = -0.15; z > ZB; z -= 0.58) cyl(IN, steel, 0.02, 1.0, -4.55, y0 + 0.5, z);
    cyl(IN, steel, 0.025, -ZB, -4.55, y0 + 1.0, ZB / 2, { axis: 'z' });
  }
  slab(IN, steel, -2.7, -0.75, y0 + 0.33, y0 + 0.4, -1.15, -1.85);            // catre
  slab(IN, white, -2.68, -0.77, y0 + 0.4, y0 + 0.52, -1.17, -1.83);
  slab(IN, white, -1.1, -0.8, y0 + 0.52, y0 + 0.61, -1.3, -1.75);
  if (j) slab(IN, blanket, -2.68, -1.2, y0 + 0.52, y0 + 0.57, -1.17, -1.83);
  slab(IN, white, -0.5, -0.12, y0, y0 + 0.42, -1.45, -1.85);                 // inodoro
  slab(IN, white, -0.45, -0.1, y0 + 0.8, y0 + 0.93, -1.2, -1.42);            // lavatorio
}
slab(IN, concrete, -4.6, 0.2, TOP - 0.2, TOP, 0, ZB);                         // piso del taller
slab(IN, concrete, 1.3, 4.8, TOP - 0.2, TOP, 0, ZB);
slab(IN, concrete, -7, 0.4, ROOF, ROOF + 0.25, 0.3, ZB - 0.3);                // techo del edificio, con el ventilador
slab(IN, concrete, 1.1, 7, ROOF, ROOF + 0.25, 0.3, ZB - 0.3);
slab(IN, steel, 0.3, 0.4, ROOF + 0.25, ROOF + 0.9, -0.5, -1.4);
slab(IN, steel, 1.1, 1.2, ROOF + 0.25, ROOF + 0.9, -0.5, -1.4);
slab(IN, steel, 0.2, 1.3, ROOF + 0.9, ROOF + 1.0, -0.4, -1.5);

// Pasillo de servicio
slab(IN, mat({ color: 0x7b8086 }), 0.2, 1.3, 0, ROOF, ZB, ZB - 0.1);
for (const [x, z, r] of [[0.42, -1.62, 0.07], [0.75, -1.72, 0.1], [1.08, -1.62, 0.06]]) cyl(IN, rust, r, ROOF - 0.1, x, ROOF / 2, z);
for (let y = 0.5; y < ROOF - 0.4; y += 0.45) cyl(IN, steel, 0.02, 0.5, 0.75, y, -1.55, { axis: 'x' });
for (let j = 0; j < 4; j++) cyl(IN, rust, 0.05, 1.1, 0.75, j * TIER + 1.85, -1.78, { axis: 'x' });

// El trozo de pared que se afloja: bloque + rejilla + los agujeritos del taladro. Sale entero hacia la celda.
const chunk = new THREE.Group(); IN.add(chunk);
const chunkMat = mat({ map: speckleTex('#d8d2c0', { seed: 8, n: 1500, dark: 40, alpha: 0.12 }), emissive: 0xffd23a, emissiveIntensity: 0 });
slab(chunk, chunkMat, 0, 0.2, GAP0, GAP1, 0, HZ);
slab(chunk, steel, -0.035, 0, 0.2, 0.52, -0.14, -0.46);
for (let i = 0; i < 5; i++) slab(chunk, mat({ color: 0x14161a }), -0.045, -0.03, 0.235 + i * 0.055, 0.265 + i * 0.055, -0.17, -0.43);
const holes = [];
{ const black = new THREE.MeshBasicMaterial({ color: 0x0b0b0c });
  const ring = [];                                                            // perímetro del trozo, en sentido horario
  for (let z = -0.05; z > -0.56; z -= 0.072) ring.push([0.78, z]);
  for (let y = 0.7; y > 0.14; y -= 0.075) ring.push([y, -0.555]);
  for (let z = -0.55; z < -0.04; z += 0.072) ring.push([0.115, z]);
  for (let y = 0.19; y < 0.72; y += 0.075) ring.push([y, -0.045]);
  for (const [y, z] of ring) { const h = cyl(chunk, black, 0.014, 0.03, -0.012, y, z, { axis: 'x', seg: 10 }); h.castShadow = false; holes.push(h); } }
// Cartón que tapa el hueco, pintado como la rejilla
const card = new THREE.Group(); IN.add(card);
slab(card, mat({ color: 0xc7a06a }), -0.03, -0.012, GAP0, GAP1 + 0.03, 0.01, HZ - 0.02);
slab(card, mat({ color: 0x4a4f55 }), -0.04, -0.028, 0.2, 0.52, -0.14, -0.46);

// Aspiradora rota y el taladro que sale de su motor
const vacuum = new THREE.Group(); IN.add(vacuum); vacuum.position.set(-1.55, 0, -0.55);
cyl(vacuum, mat({ color: 0xb5483a }), 0.15, 0.5, 0, 0.19, 0, { axis: 'x', seg: 20 });
cyl(vacuum, mat({ color: 0x2a2d31 }), 0.06, 0.06, 0.2, 0.06, 0.14, { axis: 'z' }); cyl(vacuum, mat({ color: 0x2a2d31 }), 0.06, 0.06, -0.2, 0.06, 0.14, { axis: 'z' });
{ const hose = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 20, PI * 1.2), mat({ color: 0x3a3d42 }));
  hose.position.set(0.36, 0.2, 0); hose.rotation.set(PI / 2, 0, 0.3); vacuum.add(hose); }
const drill = new THREE.Group(); scene.add(drill);
cyl(drill, mat({ color: 0x3a3f46, metalness: 0.7, roughness: 0.4 }), 0.055, 0.17, 0, 0, 0, { axis: 'x', seg: 16 });
cyl(drill, mat({ color: 0xb5483a }), 0.03, 0.1, -0.02, -0.07, 0);
cyl(drill, mat({ color: 0xd0d4d9, metalness: 0.9, roughness: 0.25 }), 0.01, 0.16, 0.16, 0, 0, { axis: 'x', seg: 8 });

// Cama armada: bulto + cabeza de yeso que se pinta y recibe el pelo
const lump = ball(IN, blanket, 1, -1.85, 0.66, -1.5); lump.scale.set(0.72, 0.16, 0.27);
const headMat = mat({ color: 0xf2efe6 });
const head = new THREE.Group(); IN.add(head);
ball(head, headMat, 0.105, 0, 0, 0);
const hair = new THREE.Mesh(new THREE.SphereGeometry(0.113, 20, 14, 0, 7, 0, 1.25), mat({ color: 0x35271b }));
hair.rotation.z = -0.9; hair.position.set(0.015, 0.005, 0); head.add(hair);
const HEAD0 = new THREE.Vector3(-0.97, 0.7, -1.5);

// Taller: impermeables, balsa (que se infla), chalecos, cañería de vapor, fuelle
const coats = [];
{ const r = rng(4);
  for (let i = 0; i < 18; i++) {
    const x = -4.05 + r() * 0.5, y = TOP + Math.floor(i / 3) * 0.1, z = -0.85 - r() * 0.6;
    const p = slab(IN, mat({ color: olive[i % 4] }), x, x + 0.5 + r() * 0.15, y, y + 0.1, z, z - 0.38); p.rotation.y = (r() - 0.5) * 0.5;
    p.userData.y = p.position.y; coats.push(p);
  } }
function makeRaft() {
  const g = new THREE.Group(), m = mat({ color: 0x6f8050, roughness: 0.8 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.17, 12, 28), m);
  ring.rotation.x = PI / 2; ring.scale.set(1.75, 1, 1); ring.position.y = 0.17; ring.castShadow = true; g.add(ring);
  slab(g, mat({ color: 0x566842 }), -1.05, 1.05, 0.02, 0.06, 0.6, -0.6);
  g.userData.ring = ring;
  return g;
}
const shopRaft = makeRaft(); shopRaft.position.set(-1.6, TOP, -0.95); IN.add(shopRaft);
const vests = [0, 1, 2].map(i => slab(IN, mat({ color: 0xa3ad6c }), -3.0 + i * 0.07, -2.62 + i * 0.07, TOP + i * 0.09, TOP + 0.09 + i * 0.09, -0.3, -0.72));
cyl(IN, rust, 0.07, 4.6, -2.3, TOP + 1.25, -1.55, { axis: 'x' });              // cañería de vapor del taller
const seam = slab(IN, new THREE.MeshBasicMaterial({ color: 0xff8a2a }), -2.75, -1.85, TOP + 1.16, TOP + 1.19, -1.44, -1.47);
const flap = slab(IN, mat({ color: 0x6f8050 }), -2.8, -1.8, TOP + 0.75, TOP + 1.18, -1.46, -1.49);
const puffs = [];
{ const pm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), pm); IN.add(p); puffs.push(p); } }
const bellows = new THREE.Group(); IN.add(bellows); bellows.position.set(-0.25, TOP + 0.22, -0.75);
const bellL = slab(bellows, mat({ color: 0x5a3a26 }), -0.03, 0.03, -0.14, 0.14, 0.14, -0.14);
const bellR = slab(bellows, mat({ color: 0x5a3a26 }), -0.03, 0.03, -0.14, 0.14, 0.14, -0.14);
const bellMid = slab(bellows, mat({ color: 0xb23b3b }), -0.5, 0.5, -0.12, 0.12, 0.12, -0.12);
const hoseB = cyl(IN, mat({ color: 0x2a2d31 }), 0.02, 0.75, -0.75, TOP + 0.18, -0.8, { axis: 'x' });

// Ventilador del techo: rejilla con bisagra + tornillo de jabón
const vent = new THREE.Group(); vent.position.set(0.4, ROOF, -0.95); IN.add(vent);
for (let i = 0; i < 6; i++) slab(vent, steel, 0.03 + i * 0.12, 0.07 + i * 0.12, -0.03, 0.03, 0.42, -0.42);
slab(vent, steel, 0, 0.7, -0.035, 0.035, 0.45, 0.4); slab(vent, steel, 0, 0.7, -0.035, 0.035, -0.4, -0.45);
const bolt = cyl(IN, mat({ color: 0x2a2d31 }), 0.03, 0.09, 1.07, ROOF - 0.05, -0.6);
const soap = cyl(IN, mat({ color: 0xf6f1dc }), 0.032, 0.1, 1.07, ROOF - 0.05, -0.6);

// Linterna del guardia
const beam = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.6, 20, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
scene.add(beam);
const flash = new THREE.PointLight(0xfff0c0, 0, 4, 1.4); flash.position.set(-1.2, 0.95, -1.3); IN.add(flash);
const cellLamp = new THREE.PointLight(0xffe2b0, 0, 8, 1.4); cellLamp.position.set(-1.6, 2.0, -0.6); IN.add(cellLamp);
const corrLamp = new THREE.PointLight(0xffd29a, 0, 10, 1.3); corrLamp.position.set(0.75, 4.6, -0.5); IN.add(corrLamp);
const topLamp = new THREE.PointLight(0xffe2b0, 0, 10, 1.3); topLamp.position.set(-1.6, 8.9, -0.5); IN.add(topLamp);

// =====================================================================================
// LA ISLA. Decorado aparte, lejos del pabellón (x = EX).
// =====================================================================================
const EX = 300, X = EX;
const OUT = new THREE.Group(); OUT.position.x = EX; scene.add(OUT);
const waterMat = mat({ color: 0x1f4f6b, roughness: 0.35, metalness: 0.25, flatShading: true });
const water = new THREE.Mesh(new THREE.PlaneGeometry(520, 320, 104, 64), waterMat);
water.rotation.x = -PI / 2; water.position.set(0, 0, -70); water.receiveShadow = true; OUT.add(water);
const waterBase = water.geometry.attributes.position.array.slice();
const rock = mat({ map: speckleTex('#8f7f6c', { seed: 12, n: 1400, alpha: 0.09, repeat: 6 }) });
slab(OUT, rock, -14, 62, -3, 9, -6, -80);
slab(OUT, rock, -20, -14, -3, 0.55, -5, -34);
{ const r = rng(31);
  for (let i = 0; i < 22; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + r() * 1.6, 1), mat({ color: 0x86776a, flatShading: true }));
    b.position.set(i < 12 ? -6 + r() * 68 : -16.5 - r() * 2.5, i < 12 ? 5 + r() * 3 : r() * 5, i < 12 ? -5.5 - r() * 1.5 : -14 - r() * 22);
    b.castShadow = true; OUT.add(b);
  } }
const cream = mat({ map: speckleTex('#e3d9bb', { seed: 7, repeat: 8 }) });
slab(OUT, cream, -10, 34, 9, 19, -10, -34);                                     // pabellón de celdas
slab(OUT, mat({ color: 0x6d737c }), -10.4, 34.4, 19, 19.4, -9.6, -34.4);
const winM = new THREE.MeshBasicMaterial({ color: 0x1a2028 });
for (const y of [11.4, 14.2, 16.9]) for (let x = -8.4; x < 33; x += 3.1) slab(OUT, winM, x, x + 1.3, y, y + 1.7, -9.94, -10.06);
slab(OUT, steel, -6.6, -5.4, 19.4, 20.15, -11.8, -13);                          // ventilador: por acá salen
cyl(OUT, mat({ color: 0x9a5a40 }), 0.42, 13, -10.75, 15.5, -12.2, { seg: 18 });  // chimenea de la panadería
for (let z = -8; z > -20; z -= 1.2) cyl(OUT, steel, 0.04, 2.7, -13.3, 10.35, z);  // cerca
for (const y of [9.5, 10.4, 11.3, 11.65]) cyl(OUT, steel, 0.02, 12, -13.3, y, -14, { axis: 'z' });
cyl(OUT, white, 1.1, 15, 42, 16.5, -22, { seg: 20 });                           // faro
const lampBall = ball(OUT, new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), 0.9, 42, 24.8, -22);
const moon = ball(OUT, new THREE.MeshBasicMaterial({ color: 0xf2f1e4 }), 6, -52, 62, -230);
const seaRaft = makeRaft(); seaRaft.scale.setScalar(1.25); OUT.add(seaRaft);
const paddle = new THREE.Group(); OUT.add(paddle);
slab(paddle, mat({ color: 0xa97a45 }), -0.6, 0.35, 0, 0.05, 0.04, -0.04); slab(paddle, mat({ color: 0xa97a45 }), 0.35, 0.75, 0, 0.04, 0.13, -0.13);
const vestSea = slab(OUT, mat({ color: 0xa3ad6c }), -0.3, 0.3, 0, 0.12, 0.22, -0.22);

const SKY = {
  day: gradientTex([[0, '#4f9be6'], [0.6, '#b3d8f5'], [1, '#e9f3f7']]),
  night: gradientTex([[0, '#0a1430'], [0.6, '#1c3358'], [1, '#33507a']]),
  dawn: gradientTex([[0, '#40588a'], [0.5, '#e09a86'], [1, '#ffd7a0']]),
};
const INSIDE = new THREE.Color(0x2a2e33);

// ---------- luces ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x555049, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 1.5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; scene.add(sun, sun.target);
scene.fog = new THREE.Fog(0x000000, 100, 400);
const LOOK = {       // [cielo, hemi (cielo, suelo, fuerza), sol (color, fuerza), niebla (color, cerca, lejos), agua, lámparas]
  inDay:     [INSIDE, 0xffffff, 0x8a8478, 1.35, 0xfff4e0, 1.7, 0x2a2e33, 60, 200, 0, [0, 4, 4]],
  inNight:   [INSIDE, 0xd3dcf0, 0x5a5f6a, 1.05, 0xc4d0ec, 0.7, 0x1c2026, 60, 200, 0, [7, 7, 9]],
  exDay:     [SKY.day, 0xffffff, 0x7c848e, 1.3, 0xfff4e0, 2.1, 0xcfe0ee, 160, 520, 0x2f7fa8, [0, 0, 0]],
  exNight:   [SKY.night, 0xb4c6ee, 0x2a3850, 1.25, 0xc9d6f8, 1.7, 0x1c3358, 70, 300, 0x245a80, [0, 0, 0]],
  exDawn:    [SKY.dawn, 0xffe0c8, 0x55687a, 1.0, 0xffcda0, 1.3, 0xe6b9a2, 90, 380, 0x5f86a0, [0, 0, 0]],
};
const lookAt = new THREE.Vector3();
function applyLook(name) {
  const [bg, sky, ground, hi, sc, si, fc, fn, ff, wc, lamps] = LOOK[name], inside = name.startsWith('in');
  scene.background = bg; hemi.color.set(sky); hemi.groundColor.set(ground); hemi.intensity = hi;
  sun.color.set(sc); sun.intensity = si; scene.fog.color.set(fc); scene.fog.near = fn; scene.fog.far = ff;
  IN.visible = inside; OUT.visible = !inside;
  if (wc) waterMat.color.set(wc);
  [cellLamp.intensity, corrLamp.intensity, topLamp.intensity] = lamps;
  moon.visible = name === 'exNight'; lampBall.visible = name !== 'exDay';
  const S = inside ? 9 : 36, sc2 = sun.shadow.camera;              // la sombra sigue a lo que mira la cámara
  camera.getWorldDirection(lookAt).multiplyScalar(inside ? 8 : 30).add(camera.position);
  sun.target.position.copy(lookAt);
  sun.position.copy(lookAt).add(inside ? new THREE.Vector3(-6, 12, 11) : new THREE.Vector3(-34, 44, 36));
  if (sc2.right !== S) { sc2.left = sc2.bottom = -S; sc2.right = sc2.top = S; sc2.near = 1; sc2.far = inside ? 60 : 190; sc2.updateProjectionMatrix(); }
}
const lookOf = t => t < namesT ? 'exDay' : t < c[5] ? 'inDay' : t < coatsT ? 'exDay' : t < c[8] ? 'inDay' : t < c[10] ? 'inNight'
  : t < c[11] ? 'exNight' : t < c[12] ? 'inDay' : 'exDawn';

// ---------- reparto ----------
const PRISONER = ['Idle', 'Walking', 'Kneeling-Idle', 'Low-Crawl', 'Climbing-Ladder', 'Crouch-Walk-Forward', 'Sitting-Idle', 'Looking-Around', 'Running'];
const morris = await loadCharacter('Lewis', { outfit: OUTFITS.preso, clips: PRISONER });
const john = await loadCharacter('Adam', { outfit: OUTFITS.preso, clips: PRISONER });
const clarence = await loadCharacter('Leonard', { outfit: OUTFITS.preso, clips: PRISONER });
const guard = await loadCharacter('Joe', { outfit: OUTFITS.guardia, clips: ['Idle', 'Walking', 'Looking-Around'] });
const cast = [morris, john, clarence, guard], trio = [morris, john, clarence];
for (const ch of cast) scene.add(ch.root);
function act(ch, t, clip, x, y, z, ry, o = {}) {
  ch.root.visible = true; ch.root.position.set(x, y, z); ch.root.rotation.y = ry; ch.root.updateMatrixWorld(true);
  ch.pose(typeof clip === 'string' ? { [clip]: 1 } : clip, t * (o.speed ?? 1) + (o.phase ?? 0));
  if (o.ground !== false) ch.ground(y, o.pad);
}
/** Las dos manos hacia un punto (trabajar sobre algo). */
function hands(ch, p, w = 1, both = true) {
  ch.aim('RightArm', p, w * 0.85); ch.aim('RightForeArm', p, w);
  if (both) { ch.aim('LeftArm', p, w * 0.85); ch.aim('LeftForeArm', p, w); }
}
const FACE_R = PI / 2, FACE_L = -PI / 2, FACE_CAM = 0, FACE_BACK = PI;
const P = new THREE.Vector3(), Q = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);

// ---------- carteles ----------
const tags = makeTags(camera);
const TOPC = [540, 400];
const tag = o => { tags.add(o); sfx(o.from, 'pop', o.big ? 0.5 : 0.35); };
tag({ text: 'Alcatraz, 1962', big: true, off: TOPC, from: 0.15, to: namesT - 0.1 });
tag({ text: 'Frank Morris', at: () => morris.worldPos('Head', P).clone(), off: [-40, -230], from: namesT + 0.15, to: blockT - 0.1 });
tag({ text: 'John Anglin', at: () => john.worldPos('Head', P).clone(), off: [0, -330], from: at('hermanos', 0) - 0.1, to: blockT - 0.1 });
tag({ text: 'Clarence Anglin', at: () => clarence.worldPos('Head', P).clone(), off: [40, -230], from: at('anglin', 0), to: blockT - 0.1 });
tag({ text: 'Nadie se escapaba', big: true, off: TOPC, from: blockT + 0.2, to: zoomT });
tag({ text: 'Hormigón', at: [0.1, 1.5, -0.2], off: [-250, -200], from: c[1] + 0.3, to: ventT + 0.2 });
tag({ text: 'Rejilla de ventilación', at: [-0.03, 0.36, -0.3], off: [-290, -330], from: ventT + 0.6, to: c[2] - 0.1 });
tag({ text: 'Aspiradora rota', at: [-1.55, 0.3, -0.55], off: [-120, -330], from: c[2] + 0.25, to: boreT - 0.1 });
tag({ text: 'Taladro casero', at: () => drill.position, off: [150, -300], from: drillT + 0.15, to: boreT + 1.6 });
tag({ text: 'Agujeritos', at: [-0.02, 0.78, -0.3], off: [-170, -260], from: boreT + 0.9, to: looseT + 0.2 });
tag({ text: 'Cartón pintado', at: [-0.03, 0.6, -0.3], off: [-200, -300], from: cardT + 0.5, to: c[4] - 0.1 });
tag({ text: 'Pasillo de servicio', at: [0.75, 2.0, -1.7], off: [-130, -400], from: c[4] + 0.3, to: climbT + 0.3 });
tag({ text: 'Sin guardias', big: true, off: TOPC, from: at('sin', c[4]) - 0.1, to: climbT + 0.2 });
tag({ text: 'Taller secreto', at: [-0.9, TOP + 0.5, -1.0], off: [150, -330], from: shopT + 0.2, to: c[5] - 0.1 });
tag({ text: 'Agua helada', big: true, off: TOPC, from: at('agua', c[5]) - 0.2, to: coatsT - 0.05 });
tag({ text: 'Más de 50 impermeables', at: [-3.75, TOP + 0.55, -1.1], off: [230, -330], from: coatsT + 0.4, to: sewT + 0.3 });
tag({ text: 'Balsa', at: [-1.6, TOP + 0.3, -0.9], off: [130, -390], from: sewT + 0.5, to: c[6] - 0.1 });
tag({ text: 'Chalecos', at: [-2.8, TOP + 0.25, -0.5], off: [-120, -300], from: vestT + 0.2, to: c[6] - 0.1 });
tag({ text: 'Cañería de vapor', at: [-2.3, TOP + 1.25, -1.5], off: [150, -300], from: steamT + 0.3, to: c[7] - 0.1 });
tag({ text: 'Costura sellada', at: [-2.3, TOP + 1.17, -1.45], off: [-170, 260], from: steamT + 1.4, to: c[7] - 0.1 });
tag({ text: 'Instrumento musical', at: [-0.25, TOP + 0.36, -0.75], off: [-120, -330], from: pumpT + 0.2, to: inflateT + 0.2 });
tag({ text: 'Inflador', at: [-0.25, TOP + 0.36, -0.75], off: [-120, -330], from: inflateT + 0.3, to: c[8] - 0.1 });
tag({ text: 'Conteo de presos', big: true, off: TOPC, from: c[8] + 0.4, to: headT });
tag({ text: 'Yeso', at: () => head.position, off: [-200, -330], from: at('yeso', c[8]) - 0.1, to: paintT });
tag({ text: 'Pintura color piel', at: () => head.position, off: [-220, -330], from: paintT + 0.1, to: hairT });
tag({ text: 'Pelo de verdad', at: () => head.position, off: [-210, -330], from: hairT + 0.1, to: c[9] - 0.1 });
tag({ text: 'Rejilla atornillada', at: [0.75, ROOF, -0.95], off: [-230, 250], from: c[9] + 0.6, to: forceT + 0.3 });
tag({ text: 'Tornillo de jabón', at: [1.07, ROOF - 0.05, -0.6], off: [-300, 230], from: soapT + 0.5, to: c[10] - 0.1 });
tag({ text: '11 de junio', big: true, off: TOPC, from: c[10] + 0.2, to: stackT });
tag({ text: 'Chimenea de la panadería', at: [X - 10.75, 16, -12.2], off: [-150, -300], from: stackT + 0.3, to: fenceT });
tag({ text: 'Cerca', at: [X - 13.3, 11.6, -12.2], off: [-150, -260], from: fenceT + 0.2, to: launchT });
tag({ text: '12 de junio', big: true, off: TOPC, from: c[11] + 0.2, to: pushT + 0.4 });
tag({ text: 'Remo', at: () => paddle.getWorldPosition(P).clone(), off: [-160, -280], from: at('remo', c[12]) - 0.15, to: neverT });
tag({ text: 'Chaleco', at: () => vestSea.getWorldPosition(P).clone(), off: [170, -300], from: at('chaleco', c[12]) - 0.15, to: neverT });
tag({ text: 'Caso cerrado en 1979', big: true, off: TOPC, from: at('cerró', c[13]) - 0.1, to: askT - 0.1 });
tag({ text: '¿Llegaron a la orilla?', big: true, off: [540, 480], from: askT, to: END });

// ---------- cámara ----------
const CELL = { pos: [-1.3, 1.45, 9.0], look: [-1.4, 1.15, -0.9] };
const WALL = { pos: [-0.28, 0.8, 3.7], look: [-0.2, 0.5, -0.4] };
const FACE = { pos: [-2.4, 0.78, 0.95], look: [0, 0.45, -0.3] };            // desde adentro de la celda, mirando la pared del fondo
const SHOP = { pos: [-2.0, 8.3, 7.6], look: [-2.1, 7.75, -0.9] };
const shots = [
  { t: 0, pos: [X - 14, 16, 96], look: [X + 12, 11, -20] },                   // 1: la isla, entrando rápido
  { t: namesT, pos: [X - 4, 13, 60], look: [X + 12, 11, -20] },
  { t: namesT, cut: true, pos: [-1.7, 1.45, 7.2], look: [-1.6, 1.15, -0.9] },  //    los tres, con nombre
  { t: blockT, pos: [-1.6, 1.4, 6.2], look: [-1.6, 1.15, -0.9] },
  { t: blockT, cut: true, pos: [-0.6, 7.6, 20], look: [-0.9, 4.2, -0.9] },    //    todo el pabellón
  { t: zoomT, pos: [-1.0, 5.2, 17], look: [-1.1, 3.6, -0.9] },
  { t: c[1], ...CELL },                                                       //    zoom a la celda
  { t: ventT, pos: [-0.9, 1.25, 6.0], look: [-0.8, 0.95, -0.7] },             // 2: hormigón -> rejilla
  { t: ventT + 0.9, ...WALL },
  { t: c[2], pos: [-0.35, 0.78, 3.4], look: [-0.25, 0.5, -0.4] },
  { t: c[2], cut: true, pos: [-1.6, 0.95, 3.4], look: [-1.5, 0.45, -0.5] },   // 3: la aspiradora y el taladro
  { t: boreT, pos: [-1.35, 0.85, 2.7], look: [-1.3, 0.45, -0.5] },
  { t: boreT, cut: true, ...FACE },                                           //    perforando, visto desde adentro
  { t: looseT, pos: [-2.0, 0.7, 0.8], look: [0, 0.45, -0.3] },
  { t: c[3], pos: [-2.5, 0.85, 1.15], look: [-0.1, 0.45, -0.3] },
  { t: c[4], pos: [-2.25, 0.75, 0.9], look: [0, 0.45, -0.3] },                // 4: el cartón
  { t: c[4], cut: true, pos: [0.3, 1.0, 5.0], look: [0.35, 0.75, -0.6] },     // 5: pasa al pasillo
  { t: climbT, pos: [0.75, 1.5, 6.6], look: [0.75, 1.4, -1.2] },
  { t: shopT, pos: [0.75, 7.0, 8.2], look: [0.75, 6.6, -1.2] },               //    la cámara sube con ellos
  { t: c[5], pos: [-0.8, 8.2, 7.6], look: [-1.0, 7.7, -0.9] },
  { t: c[5], cut: true, pos: [X - 34, 3.5, 46], look: [X - 6, 9, -20] },      // 6: agua helada, al ras
  { t: coatsT, pos: [X - 26, 5.5, 34], look: [X - 4, 10, -20] },
  { t: coatsT, cut: true, pos: [-3.2, 8.2, 5.8], look: [-3.3, 7.6, -1.0] },   //    los impermeables
  { t: sewT, pos: [-2.8, 8.25, 6.6], look: [-2.9, 7.7, -1.0] },
  { t: sewT + 0.6, ...SHOP },
  { t: c[6], pos: [-1.8, 8.2, 6.8], look: [-1.9, 7.7, -0.9] },
  { t: c[6], cut: true, pos: [-2.3, 8.35, 4.4], look: [-2.3, 8.2, -1.4] },    // 7: la costura en la cañería
  { t: c[7], pos: [-2.25, 8.4, 3.2], look: [-2.3, 8.3, -1.4] },
  { t: c[7], cut: true, pos: [-0.5, 7.9, 3.6], look: [-0.45, 7.5, -0.8] },    // 8: el fuelle
  { t: inflateT, pos: [-0.6, 7.95, 4.2], look: [-0.6, 7.5, -0.8] },
  { t: c[8], pos: [-1.4, 8.3, 7.4], look: [-1.5, 7.65, -0.9] },
  { t: c[8], cut: true, pos: [-2.9, 1.45, 8.4], look: [-2.7, 1.1, -0.9] },    // 9: el guardia cuenta
  { t: headT, pos: [-2.6, 1.3, 7.2], look: [-2.4, 1.0, -0.9] },
  { t: headT, cut: true, pos: [-1.5, 1.05, 3.6], look: [-1.4, 0.7, -1.4] },   //    la cabeza falsa
  { t: c[9], pos: [-1.15, 0.95, 2.4], look: [-1.05, 0.7, -1.5] },
  { t: c[9], cut: true, pos: [0.75, 7.4, 7.0], look: [0.75, 8.6, -1.0] },     // 10: el ventilador del techo
  { t: forceT, pos: [0.7, 8.6, 5.0], look: [0.75, 9.3, -1.0] },
  { t: c[10], pos: [0.9, 9.0, 3.6], look: [0.85, 9.45, -0.9] },
  { t: c[10], cut: true, pos: [X - 7.4, 21, 5], look: [X - 7.6, 19.8, -13] }, // 11: techo
  { t: stackT, pos: [X - 8.4, 21, 4], look: [X - 8.6, 19.8, -13] },
  { t: stackT + 0.5, pos: [X - 14, 16, 8], look: [X - 11, 14.6, -12.2] },     //     chimenea
  { t: fenceT, pos: [X - 15, 12.5, 6], look: [X - 12, 11.4, -12.2] },
  { t: fenceT + 0.5, pos: [X - 15.5, 11.2, 2], look: [X - 13.2, 10.4, -12.2] }, //     cerca
  { t: launchT, pos: [X - 16, 11, 1], look: [X - 13.4, 10.2, -12.2] },
  { t: launchT, cut: true, pos: [X - 21.8, 1.9, 0.5], look: [X - 22, 0.75, -8] }, //   balsa al agua
  { t: c[11], pos: [X - 24.5, 3.2, 6], look: [X - 25.3, 0.75, -8] },
  { t: c[11], cut: true, pos: [-3.0, 1.35, 7.0], look: [-2.6, 0.95, -1.0] },  // 12: la cabeza rueda
  { t: rollT, pos: [-2.4, 1.0, 4.6], look: [-1.6, 0.55, -1.2] },
  { t: c[12], pos: [-1.7, 0.6, 2.6], look: [-1.3, 0.2, -1.0] },
  { t: c[12], cut: true, pos: [X - 27.5, 1.5, -2], look: [X - 26.5, 0.2, -9.5] }, // 13: remo y chaleco
  { t: neverT, pos: [X - 26.5, 1.9, -1], look: [X - 25.2, 0.2, -9.5] },
  { t: neverT, cut: true, pos: [X - 46, 2.2, 10], look: [X - 60, 2.2, -40] },  //     el agua vacía
  { t: c[13], pos: [X - 48, 3.4, 16], look: [X - 62, 2.4, -40] },
  { t: c[13], cut: true, pos: [X - 34, 4, 44], look: [X + 4, 10, -20] },      // 14: la isla al amanecer
  { t: END, pos: [X - 44, 9, 74], look: [X + 6, 11, -20] },
];
const cam = makeCamera(camera, shots);
for (const tc of cutTimes(shots)) sfx(tc - 0.08, 'whoosh', 0.45);

// ---------- efectos de sonido del relato ----------
// Pocos tipos de sonido, como las referencias: soplido en los cortes y "pop" en los carteles (arriba), barrido
// que sube hasta cada revelación (riser_to = TERMINA en ese instante) y golpe. Lo literal, solo en los momentos clave.
sfx(0, 'boom', 0.5);
for (const hit of [looseT + 0.55, launchT + 0.15, rollT + 0.25, c[13] + 0.1]) sfx(hit, 'riser_to', 1);
for (let t = boreT + 0.25; t < looseT - 0.1; t += 0.7) sfx(t, 'drill', 0.5);
sfx(looseT + 0.55, 'thud', 0.8); sfx(cardT + 0.75, 'tap', 0.6);
for (let t = climbT + 0.2; t < shopT; t += 0.5) sfx(t, 'clang', 0.3);
for (let i = 0; i < 9; i++) sfx(coatsT + 0.3 + i * 0.13, 'tap', 0.35);
sfx(steamT + 0.5, 'hiss', 0.55); sfx(steamT + 2.2, 'hiss', 0.45);
for (let t = inflateT + 0.3; t < c[8] - 0.3; t += 0.5) sfx(t, 'puff', 0.6);
// Sin pasos: repetidos cada medio segundo, el modelo de escucha los oía como "picar comida" (y molestan).
sfx(forceT + 0.5, 'clang', 0.75); sfx(soapT + 0.6, 'tap', 0.6);
sfx(fenceT + 0.6, 'clang', 0.45); sfx(launchT + 0.15, 'splash', 0.8);
sfx(pushT + 0.1, 'tap', 0.6); sfx(rollT + 0.25, 'thud', 0.7); sfx(rollT + 0.45, 'roll', 0.6);
sfx(c[12] + 0.3, 'splash', 0.35); sfx(c[13] + 0.1, 'boom', 0.55); sfx(askT, 'riser', 0.35);

// ---------- piezas del relato ----------
function raftScene(t, t0, t1, x0, x1) {
  const rx = lerp(x0, x1, lin(t, t0, t1)), bob = 0.05 * Math.sin(t * 2.3);
  seaRaft.visible = true; seaRaft.position.set(rx, 0.02 + bob, -8); seaRaft.rotation.z = 0.04 * Math.sin(t * 1.7);
  trio.forEach((ch, i) => act(ch, t, 'Sitting-Idle', X + rx - 0.75 + i * 0.75, -0.12 + bob, -8 + (i - 1) * 0.12, FACE_L, { phase: i * 1.3 }));
}
function kneelAtWall(t, target, w, tool) {              // Morris de rodillas frente a la pared, con las manos en `target`
  act(morris, t, 'Kneeling-Idle', -0.66, 0, -0.62, FACE_R);
  hands(morris, target, w, false);
  if (tool) { morris.worldPos('RightHand', drill.position); drill.position.x += 0.1; drill.position.y += 0.02 * Math.sin(t * 60); drill.rotation.set(0, 0, 0); drill.visible = true; }
}

function frame(t) {
  cam(t);
  const look = lookOf(t);
  applyLook(look);
  for (const ch of cast) ch.root.visible = false;
  drill.visible = beam.visible = seaRaft.visible = false; flash.intensity = 0;
  paddle.visible = vestSea.visible = t >= c[12] && t < neverT;

  // --- estado del pabellón ---
  const bored = lin(t, boreT + 0.2, looseT - 0.1);                      // agujeritos, uno por uno
  holes.forEach((h, i) => { h.visible = t >= boreT && bored * holes.length > i; });
  const out = prog(t, looseT + 0.1, looseT + 0.7), away = prog(t, c[3], c[3] + 0.5);
  chunk.position.set(-0.5 * out - 0.55 * away, 0, -1.0 * away);        // el trozo sale entero y queda a un costado
  chunk.rotation.y = 0.5 * away;
  chunk.visible = t < c[4];                                            // después queda guardado: en la celda tapaba la cama
  chunkMat.emissiveIntensity = t > ventT + 0.5 && t < c[2] ? 0.1 + 0.09 * Math.sin(t * 7) : 0;
  const covered = prog(t, cardT + 0.2, cardT + 0.8), crawling = t >= c[4] && t < c[4] + 1.5;
  card.visible = t >= cardT && !crawling;
  card.position.set(-0.7 * (1 - covered), 0.25 * (1 - covered), 0); card.rotation.z = 0.5 * (1 - covered);
  vacuum.visible = t >= c[1] && t < c[4]; vacuum.scale.setScalar(t < drillT ? 1 : lerp(1, 0.86, prog(t, drillT, drillT + 0.3)));
  lump.visible = t >= headT; head.visible = t >= headT;
  lump.scale.set(0.72, 0.16 * prog(t, headT, headT + 0.5) + 1e-3, 0.27);
  headMat.color.set(0xf2efe6).lerp(skin.color, prog(t, paintT, paintT + 0.6));
  hair.visible = t >= hairT; hair.scale.setScalar(1 + 0.5 * (1 - prog(t, hairT, hairT + 0.3)));
  if (t < rollT) head.position.copy(HEAD0).setY(HEAD0.y + 0.5 * (1 - prog(t, headT, headT + 0.35)));
  else {                                                               // la empujan: cae de la cama y rueda hacia la cámara
    const k = lin(t, rollT, rollT + 1.5), fall = prog(t, rollT + 0.1, rollT + 0.42);
    head.position.set(lerp(-0.97, -1.25, k), lerp(0.7, 0.105, fall) + 0.07 * Math.abs(Math.sin(k * 9)) * (1 - k), lerp(-1.5, -0.55, k));
    head.rotation.set(k * 9, 0, k * 4);
  }
  const piled = lin(t, coatsT + 0.25, coatsT + 0.25 + 18 * 0.075);
  coats.forEach((p, i) => { const k = clamp01(piled * coats.length - i); p.visible = k > 0 && t < c[10]; p.position.y = p.userData.y + 1.2 * (1 - ease(k)); });
  const sewn = prog(t, sewT, c[6] - 0.6), puffed = prog(t, inflateT + 0.2, c[8] - 0.2);
  shopRaft.visible = t >= sewT && t < c[10] && !(t >= c[6] && t < c[7]);      // en el plano de la cañería solo se ve la costura
  shopRaft.scale.setScalar(Math.max(sewn, 1e-3));
  shopRaft.userData.ring.scale.set(1.75, 1, t < c[7] ? 0.35 : lerp(0.35, 1, puffed));     // desinflada hasta el fuelle
  vests.forEach((v, i) => { v.visible = t >= vestT + i * 0.18 && t < c[10]; });
  const steaming = t >= steamT && t < c[7];
  flap.visible = seam.visible = steaming; seam.material.color.setHSL(0.07, 1, 0.45 + 0.2 * Math.sin(t * 12));
  puffs.forEach((p, i) => { const k = ((t * 0.9 + i / puffs.length) % 1); p.visible = steaming;
    p.position.set(-2.75 + 0.95 * (i / puffs.length), TOP + 1.3 + 0.8 * k, -1.4 + 0.1 * Math.sin(i * 2 + t)); p.scale.setScalar(0.5 + 1.6 * k); });
  const squeeze = t >= pumpT ? 0.5 + 0.5 * Math.sin((t - inflateT) * 12.6) * (t >= inflateT ? 1 : 0.25) : 1;
  bellows.visible = hoseB.visible = t >= c[7] && t < c[8]; hoseB.visible &&= t >= inflateT;
  const half = lerp(0.1, 0.24, squeeze); bellL.position.x = -half; bellR.position.x = half; bellMid.scale.x = 2 * half;
  const forced = win(t, forceT + 0.4, soapT + 0.1, 0.35);
  vent.rotation.z = 0.9 * forced; bolt.visible = t < forceT + 0.4; soap.visible = t >= soapT + 0.5;
  soap.position.y = ROOF - 0.05 - 0.3 * (1 - prog(t, soapT + 0.5, soapT + 0.8));

  // --- quién hace qué ---
  if (t < namesT) {
    // la isla sola
  } else if (t < blockT) {                                              // 1: los tres, de frente
    trio.forEach((ch, i) => act(ch, t, i === 1 ? 'Looking-Around' : 'Idle', -2.45 + i * 0.85, 0, -0.9 + (i === 1 ? -0.25 : 0), FACE_CAM, { phase: i * 0.7 }));
  } else if (t < c[1]) {
    act(morris, t, 'Looking-Around', -1.9, 0, -0.8, FACE_CAM);
  } else if (t < c[2]) {                                                // 2: golpea el hormigón, encuentra la rejilla
    const w1 = c[1] + 1.3;
    if (t < w1) act(morris, t, 'Walking', lerp(-1.9, -0.66, lin(t, c[1], w1)), 0, lerp(-0.8, -0.62, lin(t, c[1], w1)), FACE_R);
    else if (t < ventT + 0.4) { act(morris, t, 'Idle', -0.66, 0, -0.62, FACE_R); P.set(0, 1.45 + 0.05 * Math.sin(t * 16), -0.55); hands(morris, P, prog(t, w1, w1 + 0.3), false); }
    else kneelAtWall(t, P.set(-0.03, 0.4, -0.3), prog(t, ventT + 0.4, ventT + 0.9));
  } else if (t < boreT) {                                               // 3a: desarma la aspiradora
    act(morris, t, 'Kneeling-Idle', -2.15, 0, -0.55, FACE_R);
    P.set(-1.6, 0.3 + 0.05 * Math.sin(t * 9), -0.55); hands(morris, P, 1);
    if (t >= drillT) { const k = prog(t, drillT, drillT + 0.4);
      drill.visible = true; drill.position.set(-1.55, 0.3 + 0.45 * k, -0.5); drill.rotation.set(0, 0, 6 * (1 - k)); drill.scale.setScalar(0.4 + 0.9 * k); }
  } else if (t < c[3]) {                                                // 3b: perfora alrededor de la rejilla y saca el trozo
    drill.scale.setScalar(1.3);
    const i = Math.min(holes.length - 1, Math.floor(bored * holes.length)), h = holes[i];
    if (t < looseT) kneelAtWall(t, h.getWorldPosition(P), 1, true);
    else { act(morris, t, 'Kneeling-Idle', -0.66 - 0.45 * out, 0, -0.62, FACE_R); P.set(-0.5 * out, 0.5, -0.3); hands(morris, P, 1); }
  } else if (t < c[4]) {                                                // 4: tapa el hueco con el cartón
    act(morris, t, 'Kneeling-Idle', -0.85, 0, -0.62, FACE_R);
    P.set(card.position.x - 0.03, 0.55, -0.3); hands(morris, P, 1);
  } else if (t < climbT) {                                              // 5: los tres pasan al pasillo
    trio.forEach((ch, i) => {
      const t0 = c[4] + i * 0.28, x = lerp(-1.3, 0.75, lin(t, t0, t0 + 1.25));
      if (x < 0.74) act(ch, t, 'Low-Crawl', x, 0, -0.3, FACE_R, { speed: 1.5, phase: i });
      else act(ch, t, 'Looking-Around', 0.45 + i * 0.3, 0, -1.0 - i * 0.12, FACE_BACK, { phase: i });
    });
  } else if (t < shopT) {                                               //    trepan las cañerías
    trio.forEach((ch, i) => act(ch, t, 'Climbing-Ladder', 0.45 + i * 0.3, lerp(0, TOP, lin(t, climbT + i * 0.22, shopT + i * 0.22 - 0.3)), -1.36, FACE_BACK, { speed: 1.5, phase: i * 0.4 }));
  } else if (t < c[5]) {
    trio.forEach((ch, i) => act(ch, t, 'Walking', lerp(0.1, -1.2 - i * 0.9, lin(t, shopT + i * 0.1, c[5])), TOP, -0.95 - i * 0.05, FACE_L, { phase: i }));
  } else if (t < coatsT) {
    // la isla y el agua
  } else if (t < c[6]) {                                                // 6: impermeables, balsa, chalecos
    act(clarence, t, 'Kneeling-Idle', -3.15, TOP, -0.6, FACE_L, { phase: 2 });
    P.set(-3.75, TOP + 0.5 + 0.08 * Math.sin(t * 8), -1.1); hands(clarence, P, 1);
    if (t >= sewT - 0.3) {
      const s = Math.sin(t * 9);
      act(morris, t, 'Kneeling-Idle', -0.45, TOP, -0.95, FACE_L); P.set(-1.0, TOP + 0.3 + 0.1 * s, -0.95); hands(morris, P, 1);
      act(john, t, 'Kneeling-Idle', -2.6, TOP, -1.25, FACE_R, { phase: 1.1 }); P.set(-2.1, TOP + 0.3 - 0.1 * s, -1.0); hands(john, P, 1);
    }
  } else if (t < c[7]) {                                                // 7: la costura contra la cañería de vapor
    act(john, t, 'Idle', -2.75, TOP, -1.05, FACE_BACK); P.set(-2.6, TOP + 1.12, -1.46); hands(john, P, 1);
    act(clarence, t, 'Idle', -1.85, TOP, -1.05, FACE_BACK, { phase: 1 }); P.set(-2.0, TOP + 1.12, -1.46); hands(clarence, P, 1);
  } else if (t < c[8]) {                                                // 8: el fuelle
    act(morris, t, 'Kneeling-Idle', 0.12, TOP, -0.75, FACE_L);
    P.set(bellows.position.x + bellR.position.x, TOP + 0.24, -0.75); hands(morris, P, 1);
    act(john, t, 'Kneeling-Idle', -2.75, TOP, -1.0, FACE_R, { phase: 1.1 });
  } else if (t < headT) {                                               // 9a: el guardia cuenta, linterna en mano
    act(guard, t, 'Walking', -3.85, 0, lerp(-1.85, -0.45, lin(t, c[8], headT)), FACE_CAM);
    P.set(-1.4, 0.7, -1.4 + 0.5 * Math.sin(t * 3)); guard.aim('RightArm', P, 0.85); guard.aim('RightForeArm', P, 1);
    guard.worldPos('RightHand', Q);
    beam.visible = true; beam.position.copy(Q).lerp(P, 0.5); beam.scale.set(1, Q.distanceTo(P) / 2.6, 1);
    beam.quaternion.setFromUnitVectors(UPV, Q.clone().sub(P).normalize()); flash.intensity = 6;
  } else if (t < c[9]) {                                                // 9b: arma la cabeza
    act(morris, t, 'Kneeling-Idle', -0.42, 0, -1.25, FACE_L);            // del lado de la pared, para no tapar la cabeza
    hands(morris, head.position, 1);
  } else if (t < c[10]) {                                               // 10: fuerza el ventilador
    act(morris, t, 'Climbing-Ladder', 0.75, ROOF - 2.25, -1.36, FACE_BACK, { speed: t < forceT ? 1.2 : 0.05 });
    if (t >= forceT) { P.set(0.75 + 0.1 * Math.sin(t * 20) * forced, ROOF - 0.05 + 0.25 * forced, -1.0); hands(morris, P, prog(t, forceT, forceT + 0.3)); }
    act(john, t, 'Climbing-Ladder', 0.45, ROOF - 4.3, -1.36, FACE_BACK, { speed: 0.08, phase: 1 });
  } else if (t < launchT) {                                             // 11: techo, chimenea, cerca
    trio.forEach((ch, i) => {
      const te = c[10] + 0.1 + i * 0.22, run0 = te + 0.35, d0 = stackT + 0.1 + i * 0.3, d1 = fenceT + i * 0.2 - 0.1, f1 = d1 + 0.9;
      if (t < te) return;
      if (t < run0) act(ch, t, 'Idle', X - 6, lerp(17.9, 19.4, prog(t, te, run0)), -12.4, FACE_L, { ground: false });
      else if (t < d0) act(ch, t, 'Crouch-Walk-Forward', X + lerp(-6.9, -10.1, lin(t, run0, d0)), 19.4, -12.3, FACE_L, { phase: i, speed: 1.4 });
      else if (t < d1) act(ch, t, 'Climbing-Ladder', X - 11.35, lerp(19.2, 9.0, lin(t, d0, d1)), -12.2, FACE_R, { speed: -1.6, phase: i + 5 });
      else if (t < f1) { const k = lin(t, d1, f1);                      // trepa la cerca y cae del otro lado
        act(ch, t, 'Climbing-Ladder', X + lerp(-12.9, -13.75, prog(t, d1 + 0.45, f1)), 9 + 2.3 * Math.sin(k * PI), -12.2, FACE_L, { speed: 1.8, phase: i }); }
      else act(ch, t, 'Running', X + lerp(-13.75, -17, lin(t, f1, launchT + 0.4)), 9 - 8.4 * prog(t, f1, launchT + 0.3), -12.2, FACE_L, { speed: 1.2, phase: i });
    });
  } else if (t < c[11]) {
    raftScene(t, launchT, c[11], -21, -25.5);
  } else if (t < c[12]) {                                               // 12: el guardia empuja la cabeza
    act(guard, t, 'Idle', -3.55, 0, -1.5, FACE_R);
    P.set(-1.2, 0.72, -1.5); const k = prog(t, pushT - 0.5, pushT + 0.1);
    guard.aim('RightArm', P, k * 0.9); guard.aim('RightForeArm', P, k);
  } else if (t < neverT) {                                              // 13: lo único que apareció
    paddle.position.set(-26.9, 0.05 + 0.04 * Math.sin(t * 2), -9.3); paddle.rotation.y = 0.5 + 0.1 * Math.sin(t);
    vestSea.position.set(-25.3, 0.04 + 0.04 * Math.sin(t * 2.4 + 1), -9.9); vestSea.rotation.y = -0.4;
  }

  if (look.startsWith('ex')) {                                          // oleaje
    const p = water.geometry.attributes.position, a = p.array;
    for (let i = 0; i < a.length; i += 3) a[i + 2] = 0.16 * Math.sin(waterBase[i] * 0.35 + t * 1.4) + 0.12 * Math.sin(waterBase[i + 1] * 0.5 - t * 1.1 + waterBase[i] * 0.1);
    p.needsUpdate = true; water.geometry.computeVertexNormals();
  }
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
  tags.update(t);
}
function ease(x) { x = clamp01(x); return x * x * (3 - 2 * x); }

window.renderFrame = frame;
document.fonts.ready.then(() => { frame(0); window.ready = true; });
