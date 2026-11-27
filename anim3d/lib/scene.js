// Todo lo común de un episodio animado en el estilo aprobado (Torre Eiffel v4, 26-nov-2026), para que cada
// episodio escriba solo SU decorado, SUS personajes y SU línea de tiempo.
//
//   import { setup, PI, V, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe } from '/lib/scene.js';
//   const k = await setup('mi_ep');                       // voz y tiempos de out/mi_ep/timing.json
//   const { scene, c, at, END, sfx, tag } = k;            // c[i] = inicio de la frase i; at('palabra', desde) = cuándo se dice
//   ... decorado, personajes ...
//   k.shots([{ t: 0, pos: [...], look: [...] }, { t: c[1], pos: [...], look: [...] }, { t: c[3], ..., cut: true }]);
//   k.run(t => { ... posar personajes y mover cosas en el instante t ... });
//
// Reglas del formato que esta librería ya resuelve (no deshacerlas):
//  - sombras reales que siguen a la cámara; cielo con degradé; sin "tone mapping" (colores tal cual);
//  - la cámara NUNCA queda quieta: empuje lento en cada toma; una toma sin `cut` entra con un zoom de un tirón
//    (0,35 s); con `glide` viaja suave todo el tramo; `cut: true` = corte directo SOLO para cambiar de lugar.
//    NUNCA cortinillas ni transiciones que tapen la pantalla (al usuario le molestaron);
//  - soplido automático en cada zoom y en cada corte; "pop" automático en cada cartel;
//  - nubes que avanzan, árboles que se mecen y pájaros que cruzan (si se crean con k.cloud / k.tree / k.birds).
import * as THREE from 'three';
import { lerp, prog, lin, win, clamp01, makeStage, makeTags, cutTimes, gradientTex } from '/lib/kit.js';
import { makeToon, flat, outlined } from '/lib/toon.js';
import { cloud, tree, makeLight } from '/lib/decor.js';

export { lerp, prog, lin, win, clamp01 };
export const PI = Math.PI;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const basic = color => new THREE.MeshBasicMaterial({ color });
export const INK = basic(0x1e1428);

// ---------------- movimiento ----------------
/** 0..1 que se pasa un poco y vuelve (entrada con rebote). */
export const back = x => { x = clamp01(x); const k = 1.70158; return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2; };
/** Multiplicador de "aplastar" que frena y rebota después de t0 (al aterrizar, al frenar). */
export const settle = (t, t0, amp = 0.12) => t < t0 ? 1 : 1 - amp * Math.exp(-6 * (t - t0)) * Math.cos(18 * (t - t0));
/** Altura de un saltito que empieza en t0. */
export const hop = (t, t0, h = 0.16, d = 0.4) => { const u = lin(t, t0, t0 + d); return h * 4 * u * (1 - u); };
/** Parpadeo cada 2,3 s (k desfasa a cada personaje). */
export const blinkAt = (t, k = 0) => { const u = (((t + k) % 2.3) + 2.3) % 2.3 / 0.14; return u < 1 ? Math.sin(PI * u) : 0; };
export const breathe = (t, k = 0) => 1 + 0.012 * Math.sin(t * 2.6 + k);
/** Aparece con rebote en t0 y se va en t1 (escala 0..1). */
export const popIn = (t, t0, t1, d = 0.28) => back(lin(t, t0, t0 + d)) * (1 - prog(t, t1 - 0.15, t1));
/** Caminar de x0 a x1 entre t0 y t1 (los pies no patinan). stride > 0.6 = correr. Devuelve campos de pose. */
export function go(t, t0, t1, x0, x1, stride = 0.46) {
  const x = lerp(x0, x1, lin(t, t0, t1));
  return { x, phase: Math.abs(x - x0) / (2 * stride), walk: win(t, t0 - 0.02, t1 + 0.14, 0.12), stride, face: x1 > x0 ? PI / 2 : -PI / 2,
    lean: stride > 0.6 ? 0.3 : 0, look: V(x + Math.sign(x1 - x0) * 1.5, 1.25, 3.2), squash: settle(t, t1) };
}
/** Cambio de cara en el tiempo: moodAt(t, [[0, 'neutral'], [3.2, 'surprised'], [5, 'happy']]). */
export function moodAt(t, keys) {
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  return { mood: keys[Math.max(i - 1, 0)][1], mood2: keys[i][1], mix: i ? lin(t, keys[i][0], keys[i][0] + 0.12) : 1 };
}
/** Mano que gesticula delante del pecho mientras el personaje "habla" (side -1 izquierda, 1 derecha). */
export const talk = (t, x, z, side, k = 0) => V(x + side * (0.3 + 0.05 * Math.sin(t * 6.3 + k)), 1.02 + 0.14 * Math.sin(t * 7.1 + k), z + 0.32);
/** Nadie queda duro: balanceo de cabeza y cuerpo y un rebote chico, distinto para cada uno (k). Envuelve la pose. */
export const alive = (p, t, k = 0) => { p.tilt = (p.tilt || 0) + 0.05 * Math.sin(t * 2.1 + k); p.lean = (p.lean || 0) + 0.025 * Math.sin(t * 2.7 + k); p.bob = 0.012 * Math.sin(t * 5.2 + k); return p; };

// ---------------- todo lo que necesita la escena ----------------
export async function setup(ep, { sky = [[0, '#5fb0ea'], [0.55, '#bfe6f7'], [1, '#fdf3d6']], light = {}, fov = 38 } = {}) {
  const timing = await (await fetch(`/out/${ep}/timing.json`)).json();
  await document.fonts.load('800 100px Montserrat'); await document.fonts.load('600 30px Montserrat');
  const END = timing.duration; window.DURATION = END;
  const c = timing.frases.map(f => f.start);
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
  /** Segundo en que se dice por primera vez una palabra que empieza con `word`, a partir de `from` (sin tildes). */
  const at = (word, from = 0) => { const w = timing.words.find(x => x.start >= from - 0.01 && norm(x.text).startsWith(norm(word)));
    if (!w) console.warn(`at(): no se dice "${word}" después de ${from}`); return w ? w.start : from; };

  const { renderer, scene, camera } = makeStage({ fov, shadows: true });
  renderer.toneMapping = THREE.NoToneMapping;
  scene.background = Array.isArray(sky) ? gradientTex(sky) : new THREE.Color(sky);
  const lt = makeLight(scene, light);
  const SFX = []; window.SFX = SFX;
  const sfx = (t, name, vol = 0.6) => SFX.push([+Math.max(t, 0).toFixed(3), name, vol]);
  const tags = makeTags(camera);
  /** Cartel: { text, big?, at?: Vector3|() => Vector3, off: [dx, dy] px (o posición en pantalla si no hay `at`), from, to }. */
  const tag = o => { tags.add(o); sfx(o.from, 'pop', o.big ? 0.5 : 0.35); return o; };
  const BIG = [540, 400];                               // centro arriba, para carteles grandes

  // --- piezas planas ---
  function plane(parent, color, w, h, x, y, z, ground = false) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), color.isMaterial ? color : basic(color));
    if (ground) m.rotation.x = -PI / 2; m.position.set(x, y, z); parent.add(m); return m;
  }
  /** Trazo de tinta por una lista de puntos 2D [[x,y], ...]. */
  function stroke(parent, pts, w = 0.05, closed = true, z = 0.01) {
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(dx, dy) + w, w), INK);
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z); m.rotation.z = Math.atan2(dy, dx); parent.add(m);
    }
  }
  /** Polígono plano relleno con contorno. */
  function poly(parent, pts, color, w = 0.05) {
    const g = new THREE.Group(); parent.add(g);
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])))), color.isMaterial ? color : basic(color)));
    stroke(g, pts, w); return g;
  }
  /** Cartel/hoja con texto (rectángulo con borde), como malla plana. */
  function sign(text, w, h, { bg = '#ffffff', fg = '#1e1428' } = {}) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w); const g = cv.getContext('2d');
    g.fillStyle = '#1e1428'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = bg; g.fillRect(12, 12, cv.width - 24, cv.height - 24);
    const size = Math.min(cv.height * 0.56, (cv.width - 60) / (text.length * 0.66));
    g.font = `800 ${size}px Montserrat`; g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cv.width / 2, cv.height / 2 + size * 0.04);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  }
  /** Signo suelto (? ! $ ✓ ✦ ♥ 💡 no: solo texto de Montserrat) con borde, siempre por delante. Se muestra con glyphAt. */
  function glyph(text, color, size = 0.6) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    g.font = '800 190px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 30; g.strokeStyle = '#1e1428'; g.strokeText(text, 128, 138); g.fillStyle = color; g.fillText(text, 128, 138);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false }));
    m.renderOrder = 10; m.visible = false; scene.add(m); return m;
  }
  /** Ubica un glyph cerca de un punto (ej. sobre una cabeza) con escala k (0 = oculto). */
  function glyphAt(m, pos, dx, dy, k, spin = 0) { m.visible = k > 0.01; if (!m.visible) return; m.position.set(pos.x + dx, pos.y + dy, pos.z + 0.3); m.scale.setScalar(Math.max(k, 0.001)); m.rotation.z = spin; }
  function wheel(parent, x, y, z, r = 0.2) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 20), INK));
    const hub = new THREE.Mesh(new THREE.CircleGeometry(r * 0.45, 14), basic(0xb9bec8)); hub.position.z = 0.005; g.add(hub);
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.2, r * 0.8), INK); mark.position.z = 0.01; g.add(mark);
    return g;
  }

  // --- vida de fondo ---
  const drift = [], sway = [], birdList = [], walkers = [], dust = [];
  const cloudK = (x, y, z, s = 1) => { const g = cloud(scene, x, y, z, s); g.userData.x0 = x; drift.push(g); return g; };
  const treeK = (x, z, opts) => { const g = tree(scene, x, z, opts); sway.push(g); return g; };
  /** Pájaros que cruzan el cielo: [[centroX, altura, desfase], ...]. */
  function birds(list, z = -8) {
    for (const [cx, y, off] of list) {
      const g = new THREE.Group(); g.userData = { cx, y, off, z }; scene.add(g);
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.035), INK); w.geometry.translate(s * 0.1, 0, 0); g.add(w); }
      birdList.push(g);
    }
  }
  /** Gente de fondo que camina de un lado al otro sin parar: { toon: opciones de makeToon, cx, z, speed, off, dir, span? }. */
  function walker(o) { const t = makeToon(o.toon); scene.add(t.root); walkers.push({ span: 13, speed: 0.9, off: 0, dir: 1, ...o, t }); return t; }
  /** Nubecitas de polvo (al arrancar a correr, al caer algo). Devuelve puff(t, t0, x, z, dir). */
  function puffs(n = 4) {
    const pool = Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; scene.add(m); return m; });
    dust.push(pool);
    return (t, t0, x, z = 0, dir = 1, y0 = 0.1) => {
      for (let i = 0; i < pool.length; i++) {
        const m = pool[i], u = (t - t0 - i * 0.05) / 0.55;
        if (!(u > 0 && u < 1)) continue;
        m.visible = true; m.position.set(x + dir * (0.15 + 0.5 * u + i * 0.08), y0 + 0.25 * u * (0.5 + i * 0.3), z + 0.1 * (i - 1.5));
        m.scale.setScalar(0.5 + 1.3 * u); m.material.opacity = 0.85 * (1 - u);
      }
    };
  }
  function animate(t) {
    for (const pool of dust) for (const m of pool) m.visible = false;      // cada puff los vuelve a prender en su cuadro
    drift.forEach((g, i) => { g.position.x = g.userData.x0 + t * (0.1 + 0.04 * (i % 3)); });
    sway.forEach((g, i) => { g.rotation.z = 0.035 * Math.sin(t * 1.5 + i * 1.3); });
    birdList.forEach(g => { const d = g.userData, u = (t * 1.3 + d.off) % 15; g.position.set(d.cx - 7.5 + u, d.y + 0.2 * Math.sin(t * 1.7 + d.off), d.z);
      const f = 0.5 * Math.sin(t * 11 + d.off); g.children[0].rotation.z = -f; g.children[1].rotation.z = f; });
    for (const w of walkers) {
      const u = ((t * w.speed + w.off) % w.span + w.span) % w.span, px = w.cx + (w.dir > 0 ? -w.span / 2 + u : w.span / 2 - u);
      w.t.pose({ x: px, z: w.z, face: w.dir > 0 ? PI / 2 : -PI / 2, walk: 1, phase: u / 0.92, look: V(px + w.dir * 1.5, 1.25, 3), blink: blinkAt(t, w.off), ...(w.pose ? w.pose(t, px) : {}) });
    }
  }

  // --- cámara ---
  let cam = null;
  /** Tomas: [{ t, pos: [x,y,z], look: [x,y,z], cut?: true (cambio de lugar), glide?: true (viaje suave desde la toma anterior) }].
   *  Sin cut ni glide = zoom de un tirón al empezar la toma. */
  function shots(list, { sway: sw = 0.011, push = 0.05, move = 0.35 } = {}) {
    const pa = V(0, 0, 0), la = V(0, 0, 0), pb = V(0, 0, 0), lb = V(0, 0, 0), q = V(0, 0, 0);
    const state = (i, t, pos, look) => {
      const s = list[i], n = list[i + 1]; pos.set(...s.pos); look.set(...s.look);
      if (n && n.glide) { const k = prog(t, s.t, n.t); pos.lerp(q.set(...n.pos), k); look.lerp(q.set(...n.look), k); }
      else pos.lerp(look, 1 - Math.exp(-push * Math.min(t - s.t, 8)));
    };
    cam = t => {
      let i = 0; while (i < list.length - 1 && list[i + 1].t <= t) i++;
      state(i, t, pa, la);
      const s = list[i];
      if (i && !s.cut && !s.glide && t < s.t + move) { state(i - 1, t, pb, lb); const k = prog(t, s.t, s.t + move); pa.copy(pb.lerp(pa, k)); la.copy(lb.lerp(la, k)); }
      const d = pa.distanceTo(la) * sw;
      camera.position.set(pa.x + d * Math.sin(t * 0.9), pa.y + d * 0.6 * Math.sin(t * 0.7 + 1.3), pa.z);
      camera.lookAt(la); camera.rotation.z += 0.006 * Math.sin(t * 0.8); camera.updateMatrixWorld();
      return la;
    };
    for (const s of list) if (!s.cut && !s.glide && s.t > 0) sfx(s.t, 'whoosh', 0.3);
    for (const ct of cutTimes(list)) sfx(ct, 'whoosh', 0.5);
    return cam;
  }

  let track = null;
  const proj = V(0, 0, 0);
  /** Arranca: update(t) posa todo; después se mueve el fondo, la cámara, los carteles y se dibuja. */
  function run(update) {
    if (!cam) throw new Error('falta k.shots([...]) antes de k.run()');
    const frame = t => {
      animate(t); update(t);
      lt.follow(cam(t)); tags.update(t);
      renderer.render(scene, camera);
      if (track) { proj.copy(typeof track === 'function' ? track(t) : track).project(camera); window.MAN = { x: (proj.x + 1) / 2 * 1080, y: (1 - proj.y) / 2 * 1920 }; }
    };
    window.renderFrame = frame; frame(0); window.ready = true;
  }

  return { timing, END, c, at, renderer, scene, camera, light: lt, sfx, tag, tags, BIG,
    plane, stroke, poly, sign, glyph, glyphAt, wheel, cloud: cloudK, tree: treeK, birds, walker, puffs,
    shots, run, follow: v => { track = v; } };
}

export { makeToon, flat, outlined };
