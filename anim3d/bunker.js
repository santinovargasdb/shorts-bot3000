// Prueba de formato "3D en corte": un pozo en el jardín que termina siendo un búnker.
// Todo es código: geometría con primitivas, texturas dibujadas en canvas, sin modelos externos.
// No corre en tiempo real: capture.mjs llama a window.renderFrame(t) cuadro por cuadro.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const W = 1080, H = 1920, DUR = 14;
window.DURATION = DUR;

// ---------- utilidades ----------
function rng(seed) {                       // PRNG con semilla: la misma textura en cada corrida
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const clamp01 = x => Math.min(1, Math.max(0, x));
const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const prog = (t, a, b) => ease((t - a) / (b - a));       // 0..1 suavizado entre los segundos a y b
const lerp = (a, b, k) => a + (b - a) * k;

function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// ---------- texturas ----------
const soilTex = () => canvasTex(512, (g, s) => {
  const r = rng(7);
  g.fillStyle = '#7a4a26'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {            // terrones
    const x = r() * s, y = r() * s, w = 14 + r() * 60, h = 10 + r() * 34;
    g.fillStyle = `rgba(${40 + r() * 50},${20 + r() * 25},${8 + r() * 12},${0.18 + r() * 0.22})`;
    g.beginPath(); g.ellipse(x, y, w, h, r() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 170; i++) {            // vetas claras
    g.strokeStyle = `rgba(190,130,80,${0.10 + r() * 0.16})`; g.lineWidth = 1 + r() * 3;
    const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + r() * 50 - 25, y + r() * 30, x + r() * 70 - 35, y + r() * 50); g.stroke();
  }
  for (let i = 0; i < 26; i++) {             // piedras
    g.fillStyle = `rgb(${120 + r() * 40},${105 + r() * 30},${90 + r() * 25})`;
    g.beginPath(); g.ellipse(r() * s, r() * s, 5 + r() * 12, 4 + r() * 8, r() * 3, 0, 7); g.fill();
  }
});
const grassTex = canvasTex(256, (g, s) => {
  const r = rng(3);
  g.fillStyle = '#5c9b3a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    g.strokeStyle = `rgba(${50 + r() * 60},${120 + r() * 70},${30 + r() * 40},0.55)`;
    const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 4 - 2, y - 3 - r() * 6); g.stroke();
  }
}, 10);
const concreteTex = canvasTex(256, (g, s) => {
  const r = rng(11);
  g.fillStyle = '#b9b6ae'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < .5 ? 60 : 235},${r() < .5 ? 60 : 235},${r() < .5 ? 60 : 230},0.06)`;
    g.fillRect(r() * s, r() * s, 1 + r() * 5, 1 + r() * 5); }
}, 2);
const sidingTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#e9dcc3'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 32) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(0, y, s, 3);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, y + 3, s, 2); }
}, 4);
const plankTex = canvasTex(256, (g, s) => {
  const r = rng(5);
  for (let x = 0; x < s; x += 32) { const v = 120 + r() * 30; g.fillStyle = `rgb(${v + 30},${v - 10},${v - 60})`; g.fillRect(x, 0, 30, s);
    g.fillStyle = '#3d2a17'; g.fillRect(x + 30, 0, 2, s); }
}, 1);
const skyTex = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#6fa8e6'); gr.addColorStop(0.55, '#bcd9f2'); gr.addColorStop(1, '#eef4f7');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

// ---------- escena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = skyTex;
scene.fog = new THREE.Fog(0xdfeaf2, 40, 95);
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 200);

scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6b5a45, 1.15));
const sun = new THREE.DirectionalLight(0xfff2dc, 2.3);
sun.position.set(-9, 16, 14); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
sun.shadow.bias = -0.0005;
scene.add(sun);

const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.95, ...o });
function box(w, h, d, material, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
// Caja definida por sus límites (más cómodo para el terreno, que cambia de forma cada cuadro).
function setBounds(m, x0, x1, y0, y1, z0, z1) {
  m.scale.set(Math.max(x1 - x0, 1e-4), Math.max(y1 - y0, 1e-4), Math.max(z0 - z1, 1e-4));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const tex = m.material.map;                 // textura anclada al mundo: no se estira al crecer el pozo
  if (tex && m.userData.world) { tex.repeat.set((x1 - x0) / 4, (y1 - y0) / 4); tex.offset.set(x0 / 4, y0 / 4); }
}
function soilBox() {
  const m = box(1, 1, 1, mat({ map: soilTex() })); m.userData.world = true; return m;
}

// Terreno en corte: la cara de adelante (z=0) es el "corte". El pozo es el hueco entre 3 bloques.
const X = 14, DEEP = 11, ZC = 3.4, ZBACK = 60, HALF = 2.2;       // HALF = medio ancho del pozo
const soilL = soilBox(), soilR = soilBox(), soilB = soilBox(), soilBack = soilBox(), fill = soilBox();
setBounds(soilBack, -X, X, -DEEP, 0, -ZC, -ZBACK);
const grass = mat({ map: grassTex });
const grassBack = box(1, 1, 1, grass), grassL = box(1, 1, 1, grass), grassR = box(1, 1, 1, grass), grassTop = box(1, 1, 1, grass);
setBounds(grassBack, -X, X, 0, 0.1, -ZC, -ZBACK);
setBounds(grassL, -X, -HALF, 0, 0.1, 0, -ZC);
setBounds(grassR, HALF, X, 0, 0.1, 0, -ZC);

// Casa, cerca y árboles (fondo).
const house = new THREE.Group(); house.position.set(1.2, 0.1, -17); scene.add(house);
box(9, 4.6, 6, mat({ map: sidingTex }), house).position.y = 2.3;
const roofShape = new THREE.Shape([new THREE.Vector2(-5.1, 0), new THREE.Vector2(5.1, 0), new THREE.Vector2(0, 2.6)]);
const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 6.8, bevelEnabled: false }), mat({ color: 0x59606b }));
roof.position.set(0, 4.6, -3.4); roof.castShadow = true; house.add(roof);
box(0.9, 2.2, 0.9, mat({ color: 0x8a4b3a }), house).position.set(2.6, 6.2, 0);
for (const [x, y] of [[-2.8, 3.1], [0, 3.1], [2.8, 3.1], [-2.8, 1.2], [2.8, 1.2]]) {
  box(1.5, 1.3, 0.1, mat({ color: 0xffffff }), house).position.set(x, y, 3.02);
  box(1.25, 1.05, 0.12, mat({ color: 0x33475c, roughness: 0.3 }), house).position.set(x, y, 3.03);
}
box(1.2, 2.1, 0.12, mat({ color: 0x6b4226 }), house).position.set(0, 1.05, 3.03);
const fence = box(2 * X, 1.5, 0.12, mat({ map: plankTex })); fence.material.map.repeat.set(26, 1);
fence.position.set(0, 0.85, -10);
function tree(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, 0.1, z); g.scale.setScalar(s); scene.add(g);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 3, 8), mat({ color: 0x5a3d25 }));
  trunk.position.y = 1.5; trunk.castShadow = true; g.add(trunk);
  for (const [dx, dy, dz, r] of [[0, 3.6, 0, 1.7], [-1, 3.1, .3, 1.2], [1.1, 3.2, -.2, 1.3], [0.2, 4.6, 0, 1.1]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat({ color: 0x3f7d33, flatShading: true }));
    b.position.set(dx, dy, dz); b.castShadow = true; g.add(b);
  }
}
tree(-6.5, -13, 1.25); tree(7.5, -12, 1.1); tree(-9, -24, 1.5); tree(10, -26, 1.6); tree(-3.6, -27, 1.3);

// Montón de tierra (crece mientras se cava, vuelve al pozo al tapar).
const pile = new THREE.Group(); pile.position.set(1.6, 0.1, -6); scene.add(pile);
{ const r = rng(21);
  for (let i = 0; i < 16; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + r() * 0.5, 1), mat({ color: 0x6f4424, flatShading: true }));
    b.position.set((r() - 0.5) * 2.6, r() * 0.9, (r() - 0.5) * 1.6); b.castShadow = true; pile.add(b);
  } }

// Búnker de hormigón (abierto hacia la cámara para ver adentro).
const concrete = mat({ map: concreteTex, color: 0xd6d3cb });
const FLOOR_Y = -3.5, ROOF_Y = -0.9, T = 0.22, SHAFT_X1 = -1.35;        // el pozo de acceso va de -HALF a SHAFT_X1
const bFloor = box(1, 1, 1, concrete), bWallL = box(1, 1, 1, concrete), bWallR = box(1, 1, 1, concrete),
      bBack = box(1, 1, 1, concrete), bRoof = box(1, 1, 1, concrete), shaftWall = box(1, 1, 1, concrete);
const interior = box(1, 1, 1, mat({ color: 0xe9e6dd }));               // revoque claro del fondo
const ladder = new THREE.Group(); scene.add(ladder);
{ const steel = mat({ color: 0x555b63, roughness: 0.5, metalness: 0.6 });
  const hgt = -FLOOR_Y + 0.3;
  for (const dx of [-0.25, 0.25]) box(0.05, hgt, 0.05, steel, ladder).position.set(dx, hgt / 2, 0);
  for (let y = 0.3; y < hgt; y += 0.32) box(0.5, 0.04, 0.04, steel, ladder).position.set(0, y, 0);
  ladder.position.set((-HALF + SHAFT_X1) / 2 + 0.05, FLOOR_Y + T, -2.6); }
const hatch = box(1.0, 0.12, 1.0, mat({ color: 0x4a5058, roughness: 0.45, metalness: 0.7 }));
hatch.position.set((-HALF + SHAFT_X1) / 2, 0.16, -1.6);

// Luz de adentro: con el techo puesto el sol ya no entra y la persona quedaba a oscuras.
const lamp = new THREE.PointLight(0xffe9c4, 0, 9, 1.6); lamp.position.set(0.4, ROOF_Y - 0.25, -1.3); scene.add(lamp);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff3d6 }));
bulb.position.copy(lamp.position); scene.add(bulb);

// Ventilación: caño con "cuello de cisne" + ventilador adentro.
const steelPipe = mat({ color: 0xb8bcc2, roughness: 0.35, metalness: 0.8 });
const pipe = new THREE.Group(); pipe.position.set(1.35, ROOF_Y, -1.9); scene.add(pipe);
const PIPE_H = 2.3;
const pipeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, PIPE_H, 16), steelPipe);
pipeTube.position.y = PIPE_H / 2; pipeTube.castShadow = true; pipe.add(pipeTube);
const neck = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.11, 12, 24, Math.PI), steelPipe);
neck.position.set(0.22, PIPE_H, 0); neck.castShadow = true; pipe.add(neck);
const fan = new THREE.Group(); fan.position.set(1.55, -1.5, -3.0); scene.add(fan);
box(0.7, 0.7, 0.3, mat({ color: 0x3a3f46, roughness: 0.5 }), fan);
const blades = new THREE.Group(); blades.position.z = 0.17; fan.add(blades);
for (const a of [0, Math.PI / 2]) { const b = box(0.56, 0.09, 0.03, mat({ color: 0xd9412f }), blades); b.rotation.z = a + Math.PI / 4; }

// Persona: modelo con esqueleto (assets/readyplayer.me.glb) animado con los clips de caminar y
// reposo de assets/Xbot.glb. Los dos esqueletos usan los mismos huesos (Mixamo), así que el clip
// se pasa de uno a otro solo renombrando las pistas. Lo que no existe como clip (palear, saludar)
// se hace apuntando los huesos del brazo a mano, encima de la animación.
const man = new THREE.Group(); scene.add(man);
const loader = new GLTFLoader();
const [avatarGltf, animGltf] = await Promise.all([loader.loadAsync('/assets/readyplayer.me.glb'), loader.loadAsync('/assets/Xbot.glb')]);
const avatar = avatarGltf.scene; man.add(avatar);
const bones = {};
avatar.traverse(o => {
  if (o.isBone) bones[o.name] = o;
  if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
  if (o.isMesh && o.name === 'Wolf3D_Outfit_Top') o.material.color.set(0xe0564a);      // remera roja, como el de referencia
});
// El modelo que trae las animaciones no se dibuja: se anima "a ciegas" y cada cuadro se copia su
// pose al personaje. Copiar los giros hueso a hueso no sirve (cada modelo tiene los huesos
// orientados distinto en reposo y sale retorcido): se copia cuánto giró cada hueso RESPECTO de su
// reposo, medido en el espacio del modelo, y se aplica sobre el reposo del personaje.
const src = animGltf.scene; src.updateMatrixWorld(true); avatar.updateMatrixWorld(true);
const srcBones = {}; src.traverse(o => { if (o.isBone) srcBones[o.name.replace('mixamorig', '')] = o; });
const rig = [], rigOf = new Map();
avatar.traverse(o => {                              // traverse visita a los padres antes que a los hijos
  if (!o.isBone || !srcBones[o.name]) return;
  const r = { tgt: o, src: srcBones[o.name], cur: new THREE.Quaternion(),
    srcRestInv: srcBones[o.name].getWorldQuaternion(new THREE.Quaternion()).invert(),
    tgtRest: o.getWorldQuaternion(new THREE.Quaternion()),
    parent: rigOf.get(o.parent), parentRest: o.parent.getWorldQuaternion(new THREE.Quaternion()) };
  rig.push(r); rigOf.set(o, r);
});
const mixer = new THREE.AnimationMixer(src);
const clipOf = name => animGltf.animations.find(a => a.name === name);
const idleAction = mixer.clipAction(clipOf('idle')), walkAction = mixer.clipAction(clipOf('walk'));
idleAction.play(); walkAction.play();
function copyPose() {
  src.updateMatrixWorld(true);
  for (const r of rig) {
    r.cur.copy(r.src.getWorldQuaternion(qa)).multiply(r.srcRestInv).multiply(r.tgtRest);
    r.tgt.quaternion.copy(qb.copy(r.parent ? r.parent.cur : r.parentRest).invert()).multiply(r.cur);
  }
}

const UP = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), va = new THREE.Vector3(), vb = new THREE.Vector3();
// Apunta un hueso (que "mira" por su eje +Y) hacia `dir`, dada en el espacio de la persona; w = cuánto pisa a la animación.
function aim(bone, dir, w) {
  if (w <= 0) return;
  if (dir.isVector3) va.copy(dir).sub(bone.getWorldPosition(vb)).normalize();     // un punto del mundo: apuntar hacia él
  else va.set(...dir).normalize().applyQuaternion(man.quaternion);
  const parentInv = bone.parent.getWorldQuaternion(qa).invert();
  qb.setFromUnitVectors(UP, va).premultiply(parentInv);
  bone.quaternion.slerp(qb, w);
}
const shovel = new THREE.Group(); scene.add(shovel);       // origen en la empuñadura, el mango baja por -Y
box(0.045, 1.25, 0.045, mat({ color: 0x8a6238 }), shovel).position.y = -0.45;
box(0.22, 0.3, 0.03, mat({ color: 0x70767e, metalness: 0.6, roughness: 0.4 }), shovel).position.y = -1.2;
const DOWN = new THREE.Vector3(0, -1, 0), hand = new THREE.Vector3(), tip = new THREE.Vector3();

// ---------- carteles ----------
const TAGS = [
  { text: 'Hormigón armado', at: [-1.0, -2.2, -ZC], off: [150, -230], from: 7.2, to: 9.6 },
  { text: 'Cuello de cisne', at: [1.57, ROOF_Y + PIPE_H + 0.2, -1.9], off: [-250, -120], from: 10.9, to: 14 },
  { text: 'Ventilador + filtro', at: [1.55, -1.5, -2.8], off: [-300, 130], from: 11.5, to: 14 },
  { text: 'Tapa blindada', at: [-1.78, 0.2, -1.6], off: [200, -210], from: 12.1, to: 14 },
];
const svg = document.getElementById('lines'), tagBox = document.getElementById('tags');
for (const t of TAGS) {
  t.el = document.createElement('div'); t.el.className = 'tag'; t.el.textContent = t.text; tagBox.append(t.el);
  t.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  t.line.setAttribute('stroke', '#fff'); t.line.setAttribute('stroke-width', '4'); svg.append(t.line);
  t.dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  t.dot.setAttribute('r', '8'); t.dot.setAttribute('fill', '#fff'); svg.append(t.dot);
}
const v3 = new THREE.Vector3();
function placeTags(t) {
  for (const tag of TAGS) {
    const k = Math.min(prog(t, tag.from, tag.from + 0.35), 1 - prog(t, tag.to - 0.3, tag.to));
    const on = t >= tag.from && k > 0.01;
    v3.set(...tag.at).project(camera);
    const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * H, lx = x + tag.off[0] * k, ly = y + tag.off[1] * k;
    tag.el.style.cssText += `;left:${lx}px;top:${ly}px;opacity:${on ? k : 0}`;
    for (const [a, val] of [['x1', x], ['y1', y], ['x2', lx], ['y2', ly]]) tag.line.setAttribute(a, val);
    tag.line.setAttribute('opacity', on ? k : 0);
    tag.dot.setAttribute('cx', x); tag.dot.setAttribute('cy', y); tag.dot.setAttribute('opacity', on ? k : 0);
  }
}

// ---------- línea de tiempo ----------
// 0-2 jardín · 2-6 se cava · 6-8.6 hormigón · 8.6-10.4 se tapa · 10.4-11.4 ventilación · 11.4-14 carteles
function frame(t) {
  const dig = prog(t, 2, 6);                        // profundidad del pozo
  const d = dig * -FLOOR_Y + (dig > 0 ? 0.1 : 0);
  setBounds(soilL, -X, -HALF, -DEEP, 0, 0, -ZC);
  setBounds(soilR, HALF, X, -DEEP, 0, 0, -ZC);
  setBounds(soilB, -HALF, HALF, -DEEP, -d, 0, -ZC);

  // hormigón: piso -> paredes -> techo
  const kFloor = prog(t, 6.0, 6.6), kWalls = prog(t, 6.6, 7.7), kRoof = prog(t, 7.7, 8.6);
  const wallTop = lerp(FLOOR_Y + T, ROOF_Y, kWalls);
  setBounds(bFloor, lerp(0, -HALF, kFloor), lerp(0, HALF, kFloor), FLOOR_Y - 0.1, FLOOR_Y + T, 0, -ZC);
  setBounds(bWallL, -HALF, -HALF + T, FLOOR_Y + T, wallTop, 0, -ZC);
  setBounds(bWallR, HALF - T, HALF, FLOOR_Y + T, wallTop, 0, -ZC);
  setBounds(bBack, -HALF + T, HALF - T, FLOOR_Y + T, wallTop, -ZC + T, -ZC);
  setBounds(interior, -HALF + T, HALF - T, FLOOR_Y + T, wallTop, -ZC + T + 0.02, -ZC + T);
  setBounds(bRoof, SHAFT_X1, lerp(SHAFT_X1, HALF, kRoof), ROOF_Y, ROOF_Y + T, 0, -ZC);
  for (const m of [bFloor]) m.visible = kFloor > 0;
  for (const m of [bWallL, bWallR, bBack, interior]) m.visible = kWalls > 0;
  bRoof.visible = kRoof > 0;
  lamp.intensity = 16 * prog(t, 8.2, 8.9); bulb.visible = t > 8.2;

  // tapar: tierra sobre el techo (deja libre el pozo de acceso) + pared del pozo + pasto
  const kFill = prog(t, 8.6, 10.2);
  setBounds(fill, SHAFT_X1 + T, HALF, ROOF_Y + T, lerp(ROOF_Y + T, 0, kFill), 0, -ZC);
  setBounds(shaftWall, SHAFT_X1, SHAFT_X1 + T, ROOF_Y, lerp(ROOF_Y, 0.1, kFill), 0, -ZC);
  fill.visible = shaftWall.visible = kFill > 0;
  const grassBackOn = kFill >= 1;
  setBounds(grassTop, dig > 0 ? SHAFT_X1 + T : -HALF, HALF, 0, 0.1, 0, -ZC);
  grassTop.visible = dig === 0 || grassBackOn;

  ladder.visible = kRoof > 0.2; ladder.scale.y = prog(t, 7.9, 8.6) || 1e-3;
  hatch.visible = kFill >= 1; hatch.position.y = lerp(1.2, 0.16, prog(t, 10.2, 10.7));
  pile.scale.setScalar(Math.max(1e-3, dig * (1 - 0.82 * kFill)));

  const kPipe = prog(t, 10.4, 11.2);
  pipe.visible = kPipe > 0; pipeTube.scale.y = kPipe || 1e-3; pipeTube.position.y = PIPE_H * kPipe / 2;
  neck.position.y = PIPE_H * kPipe; neck.scale.setScalar(prog(t, 11.0, 11.4) || 1e-3);
  fan.visible = t > 11.2; fan.scale.setScalar(prog(t, 11.2, 11.6) || 1e-3); blades.rotation.z = t * 9;

  // persona: baja con el fondo del pozo, palea mientras cava, saluda al final
  // camina a velocidad constante (si se suaviza, los pies patinan contra el clip de caminar)
  const kWalk = clamp01((t - 0.2) / 2.1);
  man.position.set(lerp(-3.0, 0.2, kWalk), 0.1 - d + (kFloor > 0.5 ? T + 0.1 : 0), -1.7);
  man.rotation.y = lerp(Math.PI / 2, 0.55, prog(t, 2.2, 2.7));
  man.updateMatrixWorld();
  const wWalk = Math.min(prog(t, 0.1, 0.35), 1 - prog(t, 2.15, 2.45));
  walkAction.setEffectiveWeight(wWalk); idleAction.setEffectiveWeight(1 - wWalk);
  mixer.setTime(t);
  copyPose();

  const wDig = Math.min(prog(t, 2.5, 2.9), 1 - prog(t, 5.9, 6.3)), s = Math.sin(t * 5.2);
  if (wDig > 0) bones.Spine.quaternion.multiply(qa.setFromAxisAngle(va.set(1, 0, 0), (0.32 + 0.14 * s) * wDig));
  aim(bones.RightArm, [-0.25, -0.6 - 0.15 * s, 0.75], wDig);
  aim(bones.RightForeArm, [-0.45, -0.55 + 0.3 * s, 0.7], wDig);
  // en reposo el clip deja los brazos abiertos: se bajan un poco hacia el cuerpo
  const wRest = 0.55 * (1 - wWalk) * (1 - wDig);
  aim(bones.LeftArm, [0.16, -1, 0.06], wRest); aim(bones.RightArm, [-0.16, -1, 0.06], wRest);
  aim(bones.LeftForeArm, [0.1, -1, 0.22], wRest); aim(bones.RightForeArm, [-0.1, -1, 0.22], wRest);
  const wWave = prog(t, 12.2, 12.6);
  aim(bones.LeftArm, [0.6, 0.75, 0.15], wWave);
  aim(bones.LeftForeArm, [0.15 + 0.35 * Math.sin(t * 8), 1, 0.2], wWave);

  // pala: sale de la mano derecha y apunta al suelo delante de los pies (o cuelga mientras camina)
  shovel.visible = t < 6.2;
  avatar.updateMatrixWorld(true);
  bones.RightHand.getWorldPosition(hand);
  tip.set(0.05, 0.02 + 0.22 * Math.max(0, s), 0.6).applyQuaternion(man.quaternion).add(man.position);
  va.copy(tip).sub(hand).normalize().lerp(DOWN, 1 - wDig * 0.95).normalize();
  shovel.position.copy(hand); shovel.quaternion.setFromUnitVectors(DOWN, va);
  if (wDig > 0) {                                   // la mano izquierda agarra el mango más abajo
    tip.copy(hand).addScaledVector(va, 0.42);
    aim(bones.LeftArm, tip, wDig); aim(bones.LeftForeArm, tip, wDig);
  }

  // cámara: arranca mostrando la casa, baja con la excavación, se aleja para el plano final
  const down = prog(t, 2, 5.5), out = prog(t, 10.2, 12.2);
  camera.position.set(lerp(-0.5, 0, down), lerp(2.6, -0.9, down) + out * 1.2, lerp(19, 15.5, down) + out * 3.4);
  camera.lookAt(0, lerp(1.8, -1.75, down) + out * 0.9, -ZC / 2);
  camera.updateMatrixWorld();

  renderer.render(scene, camera);
  placeTags(t);
  v3.copy(man.position).setY(man.position.y + 0.9).project(camera);       // dónde quedó la persona (para revisar de cerca)
  window.MAN = { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H };
}

window.renderFrame = frame;
const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.GL_RENDERER = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'desconocido';
document.fonts.ready.then(() => { frame(0); window.ready = true; });
