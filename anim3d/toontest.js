// Prueba del personaje de caricatura (lib/toon.js): 10 segundos sin voz para juzgar el estilo y el
// movimiento. Un tipo entra caminando, ve una moneda, se sorprende, la agarra, festeja, llega un
// guardia y sale corriendo.
//   node capture.mjs --page toon.html --out toon/video.mp4
import * as THREE from 'three';
import { lerp, prog, lin, win, clamp01, makeStage, makeTags, makeCamera, cutTimes } from '/lib/kit.js';
import { makeToon, flat, outlined, block } from '/lib/toon.js';

window.DURATION = 10.4;
const { renderer, scene, camera } = makeStage({ fov: 38, shadows: false });
renderer.toneMapping = THREE.NoToneMapping;                 // colores planos, tal cual se eligen
scene.background = new THREE.Color(0xf6e7c8);
scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-3, 6, 5); scene.add(sun);

const SFX = []; window.SFX = SFX;
const sfx = (t, name, vol = 1) => SFX.push([+t.toFixed(3), name, vol]);

// ---------- decorado: pocas formas, colores lisos ----------
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshBasicMaterial({ color: 0xe9b872 }));
floor.rotation.x = -Math.PI / 2; floor.position.z = -1; scene.add(floor);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), new THREE.MeshBasicMaterial({ color: 0xf9d9a0 }));
wall.position.set(0, 4, -2.2); scene.add(wall);
const skirting = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.16), new THREE.MeshBasicMaterial({ color: 0x15171c }));
skirting.position.set(0, 0.08, -2.19); scene.add(skirting);
const rug = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), new THREE.MeshBasicMaterial({ color: 0xc8553d }));
rug.rotation.x = -Math.PI / 2; rug.scale.set(1.25, 0.6, 1); rug.position.set(0.3, 0.006, 0); scene.add(rug);
block(scene, 0x8e6bbf, 0.25, 0.45, 0, 0.7, 0.1, -0.1);                        // pedestal
block(scene, 0xb99be0, 0.2, 0.5, 0.7, 0.78, 0.15, -0.15);
block(scene, 0x5a86c9, -0.3, 0.5, 2.25, 3.15, -2.1, -2.18, 0.035);             // ventana
block(scene, 0x7a4b2a, 1.15, 1.9, 0, 2.05, -2.08, -2.18, 0.035);               // puerta

const PED = new THREE.Vector3(0.35, 0.98, 0);
const coin = outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 28), flat(0xffc928)), 0.02);
coin.rotation.x = Math.PI / 2; scene.add(coin);

const bang = new THREE.Group(); scene.add(bang);            // el "!" de sorpresa
const yellow = flat(0xffd23a);
const b1 = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 10), yellow), 0.02); b1.position.y = 0.2; bang.add(b1);
bang.add(outlined(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), yellow), 0.02));

const dust = Array.from({ length: 8 }, () => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  scene.add(m); return m;
});
function puffs(t, t0, x, dir, from) {                       // nubecitas de polvo al arrancar a correr
  for (let i = 0; i < 4; i++) {
    const m = dust[from + i], u = (t - t0 - i * 0.05) / 0.55;
    m.visible = u > 0 && u < 1; if (!m.visible) continue;
    m.position.set(x + dir * (0.15 + 0.5 * u + i * 0.08), 0.1 + 0.25 * u * (0.5 + i * 0.3), 0.1 * (i - 1.5));
    m.scale.setScalar(0.5 + 1.3 * u); m.material.opacity = 0.85 * (1 - u);
  }
}

const hero = makeToon({ shirt: 0xe8553f, hair: 0x4a3222 }); scene.add(hero.root);
const guard = makeToon({ shirt: 0x2f4a8a, hair: 0x1b2440, shoes: 0x15171c, hat: 0x1b2440 }); scene.add(guard.root);

// ---------- movimiento ----------
const back = x => { x = clamp01(x); const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };   // se pasa y vuelve
const settle = (t, t0, amp = 0.14) => t < t0 ? 1 : 1 - amp * Math.exp(-6 * (t - t0)) * Math.cos(18 * (t - t0));     // frena y rebota
const blinkAt = (t, k) => { const u = ((t + k) % 2.3) / 0.14; return u < 1 ? Math.sin(Math.PI * u) : 0; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
/** Punto que cambia en el tiempo: [[t, vec | () => vec], ...], pasando suave de uno al siguiente. */
function chain(t, keys, d = 0.32, out = new THREE.Vector3()) {
  const get = k => typeof k[1] === 'function' ? k[1]() : k[1];
  out.copy(get(keys[0]));
  for (let i = 1; i < keys.length; i++) if (t > keys[i][0]) out.lerp(get(keys[i]), prog(t, keys[i][0], keys[i][0] + d));
  return out;
}
function moodAt(t, keys) {
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  return { mood: keys[Math.max(i - 1, 0)][1], mood2: keys[i][1], mix: i ? lin(t, keys[i][0], keys[i][0] + 0.12) : 1 };
}

const T = { enter: 0.3, stop: 2.0, see: 2.55, jump: 3.0, step: 3.9, reach: 4.6, grab: 5.15, lift: 5.4, guard: 6.4, gstop: 7.4, turn: 7.5, run: 8.05, chase: 8.45 };
const hand = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), gHead = new THREE.Vector3(), hHead = new THREE.Vector3();

function poseHero(t) {
  let x, phase, walk, stride = 0.46, lean = 0, crouch = 0, y = 0, squash = 1;
  if (t < T.step) {                               // entra caminando y frena
    x = lerp(-2.3, -0.75, lin(t, T.enter, T.stop)); phase = (x + 2.3) / 0.92; walk = 1 - prog(t, T.stop - 0.1, T.stop + 0.12);
    squash = settle(t, T.stop, 0.1);
    const a = prog(t, T.jump - 0.18, T.jump) * (1 - lin(t, T.jump, T.jump + 0.06)), u = lin(t, T.jump, T.jump + 0.46);   // salto de sorpresa
    y = 0.32 * 4 * u * (1 - u); squash *= (1 - 0.2 * a) * (1 + 0.09 * Math.sin(Math.PI * u)) * settle(t, T.jump + 0.46, 0.16);
  } else if (t < T.run) {                         // dos pasos hasta la moneda
    stride = 0.35; x = lerp(-0.75, -0.22, lin(t, T.step, T.reach - 0.1)); phase = (x + 0.75) / 0.7; walk = win(t, T.step - 0.05, T.reach, 0.12);
    lean = 0.22 * win(t, T.reach, T.lift, 0.18) - 0.28 * prog(t, T.run - 0.4, T.run - 0.08);        // se estira; después toma carrera
    crouch = 0.7 * prog(t, T.run - 0.4, T.run - 0.08);
    const u = lin(t, T.lift + 0.25, T.lift + 0.6); y = 0.14 * 4 * u * (1 - u);                         // saltito de festejo
    squash = settle(t, T.lift + 0.6, 0.1) * (1 - 0.14 * prog(t, T.run - 0.4, T.run - 0.08));
  } else {                                        // sale disparado
    stride = 0.72; const k = lin(t, T.run, T.run + 1.15); x = -0.22 - 3.1 * k ** 1.5; phase = (-0.22 - x) / 1.44; walk = 1;
    lean = 0.34; squash = 1 + 0.16 * (1 - prog(t, T.run, T.run + 0.25));
  }
  const face = t < T.lift ? Math.PI / 2 : lerp(lerp(Math.PI / 2, 0.3, prog(t, T.lift, T.lift + 0.42)), -Math.PI / 2, prog(t, T.turn, T.turn + 0.4));
  const look = chain(t, [[0, () => V(x + 1.5, 1.25, 3.2)], [T.see, V(PED.x + 0.5, 0.95, 2.6)], [T.lift + 0.1, V(0.4, 1.6, 9)], [T.guard + 0.35, () => V(gHead.x, gHead.y, 2.6)], [T.turn + 0.1, () => V(x - 2, 1.2, 2.5)]]);
  // mano derecha: va a la moneda, la levanta, y después la lleva contra el pecho
  const target = chain(t, [[0, PED], [T.lift, () => V(x - 0.4, 1.66, 0.15)], [T.guard + 0.45, () => V(x - 0.5, 1.0, 0.2)], [T.turn + 0.15, () => V(x - 0.55, 1.05, 0)]], 0.3, tmp);
  hero.pose({ x, y, face, tilt: 0.05 * Math.sin(t * 1.3), walk, phase, stride, squash: squash * (1 + 0.012 * Math.sin(t * 2.6)), lean, crouch, look, blink: blinkAt(t, 0),
    handL: target, wL: back(lin(t, T.reach, T.grab)),
    ...moodAt(t, [[0, 'happy'], [T.see + 0.2, 'neutral'], [T.jump - 0.15, 'surprised'], [T.step, 'neutral'], [T.reach, 'effort'], [T.lift, 'happy'], [T.guard + 0.4, 'surprised'], [T.gstop, 'worried']]) });
  hero.head.getWorldPosition(hHead);
  return x;
}
function poseGuard(t) {
  let x, phase, walk = 1, stride = 0.5, lean = 0.15, squash = 1;
  if (t < T.chase) { x = lerp(2.6, 1.15, lin(t, T.guard, T.gstop)); phase = (2.6 - x) / 1.0; walk = 1 - prog(t, T.gstop - 0.08, T.gstop + 0.1); squash = settle(t, T.gstop, 0.16); lean = 0.15 * walk; }
  else { stride = 0.7; const k = lin(t, T.chase, T.chase + 1.5); x = 1.15 - 4.2 * k ** 1.3; phase = (1.15 - x) / 1.4; lean = 0.3; }
  const point = back(lin(t, T.gstop + 0.05, T.gstop + 0.3)) * (1 - prog(t, T.chase - 0.15, T.chase));   // lo señala
  guard.pose({ x, z: 0.15 + 0.6 * prog(t, T.chase, T.chase + 0.4), face: -Math.PI / 2, walk, phase, stride, squash, lean, look: tmp2.set(hHead.x, hHead.y, 2.6), blink: blinkAt(t, 1.1),
    handR: tmp.set(x - 0.6, 1.12, 0.3), wR: point, mood: 'angry' });
  guard.head.getWorldPosition(gHead);
  return x;
}

// ---------- cámara, carteles y sonidos ----------
const shots = [
  { t: 0, pos: [-0.3, 1.45, 7.8], look: [-0.3, 1.0, 0] },
  { t: T.see + 0.15, pos: [-0.15, 1.35, 6.2], look: [-0.15, 1.1, 0], cut: true },
  { t: T.lift, pos: [0.15, 1.45, 4.9], look: [0.15, 1.2, 0], cut: true },
  { t: T.guard, pos: [0.4, 1.45, 7.8], look: [0.4, 1.0, 0], cut: true },
  { t: T.run + 0.1, pos: [-0.2, 1.5, 8.6], look: [-0.2, 1.0, 0] },
  { t: window.DURATION, pos: [-0.4, 1.5, 9.0], look: [-0.4, 1.0, 0] },
];
const cam = makeCamera(camera, shots, { sway: 0.008 });
const tags = makeTags(camera);
tags.add({ text: 'Moneda de oro', at: () => coin.position, off: [190, -170], from: T.see + 0.25, to: T.reach });
tags.add({ text: '¡ES MÍA!', big: true, off: [540, 520], from: T.lift + 0.3, to: T.guard });
tags.add({ text: 'Guardia', at: () => gHead, off: [-170, -270], from: T.gstop, to: T.chase });
for (const c of cutTimes(shots)) sfx(c, 'whoosh', 0.6);
sfx(T.jump, 'pop', 1); sfx(T.grab, 'pop', 0.8); sfx(T.lift + 0.3, 'boom', 0.6); sfx(T.gstop, 'thud', 0.6); sfx(T.run, 'whoosh', 1);

const proj = new THREE.Vector3();
function frame(t) {
  const hx = poseHero(t), gx = poseGuard(t);
  poseHero(t);                                    // otra vez: el héroe mira al guardia, que recién ahora está en su lugar
  // moneda: gira sobre el pedestal, salta a la mano y viaja con ella
  hero.hand(0, hand); hand.y += 0.13;
  const k = prog(t, T.grab - 0.08, T.grab + 0.1), idle = 1 - k;
  coin.position.copy(PED).setY(PED.y + 0.03 * Math.sin(t * 3) * idle).lerp(hand, k);
  coin.rotation.z = t * 1.6 * idle; coin.scale.setScalar(1 + 0.25 * win(t, T.grab, T.grab + 0.3, 0.12));
  // "!" sobre la cabeza
  const b = back(lin(t, T.jump - 0.12, T.jump + 0.1)) * (1 - prog(t, T.step - 0.3, T.step - 0.1))
          + back(lin(t, T.guard + 0.4, T.guard + 0.6)) * (1 - prog(t, T.gstop + 0.2, T.gstop + 0.4));
  bang.visible = b > 0.01; hero.headTop(bang.position); bang.scale.setScalar(Math.max(b, 0.001) * 1.05);
  puffs(t, T.run, -0.22, 1, 0); puffs(t, T.chase, 1.15, 1, 4);
  cam(t); tags.update(t);
  renderer.render(scene, camera);
  proj.copy(hHead).project(camera); window.MAN = { x: (proj.x + 1) / 2 * 1080, y: (1 - proj.y) / 2 * 1920 };
}
window.renderFrame = frame;
document.fonts.ready.then(() => { frame(0); window.ready = true; });
