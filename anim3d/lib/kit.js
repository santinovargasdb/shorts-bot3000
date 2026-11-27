// Piezas comunes de las escenas 3D en corte: escenario, materiales dibujados por código, cajas
// por límites, carteles con flecha y cámara por tomas. Cada episodio importa de acá y solo
// describe SU decorado y SU línea de tiempo.
import * as THREE from 'three';

export const W = 1080, H = 1920;

// ---------- matemática ----------
export function rng(seed) {                 // PRNG con semilla: la misma textura en cada corrida
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
/** 0..1 suavizado entre los segundos a y b. */
export const prog = (t, a, b) => ease((t - a) / (b - a));
/** 0..1 lineal entre a y b (para caminar: suavizado, los pies patinan). */
export const lin = (t, a, b) => clamp01((t - a) / (b - a));
/** 1 dentro de [a, b], con entrada/salida suaves de `f` segundos. */
export const win = (t, a, b, f = 0.3) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b));

// ---------- escenario ----------
export function makeStage({ fov = 38, shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.body.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 600);
  const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
  window.GL_RENDERER = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'desconocido';
  return { renderer, scene, camera };
}

// ---------- materiales y texturas ----------
export function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
export const mat = o => new THREE.MeshStandardMaterial({ roughness: 0.95, ...o });

/** Ruido de manchitas sobre un color base: hormigón, revoque, óxido... */
export function speckleTex(base, { seed = 1, n = 900, dark = 60, light = 235, alpha = 0.06, repeat = 2 } = {}) {
  return canvasTex(256, (g, s) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) {
      const v = r() < 0.5 ? dark : light; g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      g.fillRect(r() * s, r() * s, 1 + r() * 5, 1 + r() * 5);
    }
  }, repeat);
}
export function gradientTex(stops) {         // fondo de cielo: [[0, '#...'], [1, '#...']] de arriba a abajo
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  for (const [k, col] of stops) gr.addColorStop(k, col);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- geometría ----------
/** Caja por sus límites: x0..x1, y0..y1, z0 (frente) .. z1 (fondo, más negativo). */
export function slab(parent, material, x0, x1, y0, y1, z0, z1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  m.castShadow = m.receiveShadow = true; parent.add(m);
  setSlab(m, x0, x1, y0, y1, z0, z1);
  return m;
}
export function setSlab(m, x0, x1, y0, y1, z0, z1) {
  m.scale.set(Math.max(x1 - x0, 1e-4), Math.max(y1 - y0, 1e-4), Math.max(z0 - z1, 1e-4));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
export function cyl(parent, material, r, h, x, y, z, { axis = 'y', seg = 14 } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), material);
  if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
export function ball(parent, material, r, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), material);
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}

// ---------- carteles con flecha ----------
/** tags.add({ text, at: [x,y,z] | () => Vector3, off: [dx,dy] en píxeles, from, to }); tags.update(t) cada cuadro. */
export function makeTags(camera) {
  const svg = document.getElementById('lines'), box = document.getElementById('tags');
  const list = [], v = new THREE.Vector3();
  return {
    add(tag) {
      tag.el = document.createElement('div'); tag.el.className = 'tag' + (tag.big ? ' big' : ''); tag.el.textContent = tag.text; box.append(tag.el);
      tag.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tag.line.setAttribute('stroke', '#fff'); tag.line.setAttribute('stroke-width', '4'); svg.append(tag.line);
      tag.dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      tag.dot.setAttribute('r', '8'); tag.dot.setAttribute('fill', '#fff'); svg.append(tag.dot);
      list.push(tag); return tag;
    },
    update(t) {
      for (const tag of list) {
        const k = win(t, tag.from, tag.to, 0.3), on = t >= tag.from && t <= tag.to && k > 0.01;
        tag.el.style.opacity = on ? k : 0; tag.line.setAttribute('opacity', on ? k : 0); tag.dot.setAttribute('opacity', on ? k : 0);
        if (!on) continue;
        if (!tag.at) {                             // sin flecha: texto fijo en pantalla (off = posición en píxeles)
          tag.el.style.left = tag.off[0] + 'px'; tag.el.style.top = tag.off[1] + 'px';
          tag.line.setAttribute('opacity', 0); tag.dot.setAttribute('opacity', 0); continue;
        }
        v.copy(typeof tag.at === 'function' ? tag.at() : v.set(...tag.at)).project(camera);
        const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, lx = x + tag.off[0] * k, ly = y + tag.off[1] * k;
        tag.el.style.left = lx + 'px'; tag.el.style.top = ly + 'px';
        for (const [a, val] of [['x1', x], ['y1', y], ['x2', lx], ['y2', ly]]) tag.line.setAttribute(a, val);
        tag.dot.setAttribute('cx', x); tag.dot.setAttribute('cy', y);
      }
    },
  };
}

// ---------- cámara por tomas ----------
/** shots = [{ t, pos:[x,y,z], look:[x,y,z], cut?:true }]. Entre tomas la cámara viaja suave; con cut salta. */
export function makeCamera(camera, shots, { sway = 0.012 } = {}) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), look = new THREE.Vector3();
  return t => {
    let i = 0;
    while (i < shots.length - 1 && shots[i + 1].t <= t) i++;
    const s0 = shots[i], s1 = shots[i + 1];
    const k = !s1 || s1.cut ? 0 : ease((t - s0.t) / (s1.t - s0.t));
    const to = s1 && !s1.cut ? s1 : s0;
    camera.position.copy(a.set(...s0.pos).lerp(b.set(...to.pos), k));
    look.copy(a.set(...s0.look).lerp(b.set(...to.look), k));
    // La cámara nunca queda clavada: un vaivén chico, proporcional a la distancia, aun en las tomas "fijas"
    const d = camera.position.distanceTo(look) * sway;
    camera.position.x += d * Math.sin(t * 0.9); camera.position.y += d * 0.6 * Math.sin(t * 0.7 + 1.3);
    camera.position.z -= d * 2.2 * ((t - s0.t) / Math.max(0.5, (s1 ? s1.t : s0.t + 4) - s0.t)) * (s1 && !s1.cut ? 0 : 1);   // empuje lento en las tomas sin viaje
    camera.lookAt(look);
    camera.updateMatrixWorld();
  };
}
/** Cuándo corta la cámara (para ponerle un sonido a cada corte). */
export const cutTimes = shots => shots.filter(s => s.cut).map(s => s.t);
