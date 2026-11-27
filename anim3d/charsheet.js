// Hoja de reparto: los personajes de la biblioteca, uno al lado del otro, con cada animación.
// renderFrame(i) = animación i, a 40% de su duración.
//   node capture.mjs --page "charsheet.html?chars=Lewis:preso,Joe:guardia" --stills 0 1 2
// `Nombre:ropa` pinta al personaje con una de las ropas de lib/character.js; sin `:ropa` va como viene.
import * as THREE from 'three';
import { loadCharacter, OUTFITS } from '/lib/character.js';

const W = 1080, H = 1920;
const ANIMS = ['Idle', 'Walking', 'Running', 'Sneak-Walk', 'Crouch-Walk-Forward', 'Low-Crawl', 'Climbing-Ladder',
  'Climbing-Up-Wall', 'Kneeling-Idle', 'Kneeling-Inspecting', 'Digging', 'Laying-Sleeping', 'Sitting-Idle',
  'Looking-Around', 'Waving'];
window.ANIMS = ANIMS;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe6ec);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 6, 5); sun.castShadow = true; scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0xc9d1d8 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
// vara de 1,78 m: para comprobar a ojo que la altura quedó normalizada
const rod = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.78, 0.03), new THREE.MeshBasicMaterial({ color: 0xd9412f }));
rod.position.set(-0.75, 0.89, 0); scene.add(rod);

const spec = (new URLSearchParams(location.search).get('chars') || 'Remy').split(',');
const cast = [];
for (const [i, s] of spec.entries()) {             // de a uno: cargar varios FBX de 50 MB a la vez no entra en memoria
  const [name, outfit] = s.split(':');
  const c = await loadCharacter(name, { outfit: OUTFITS[outfit] || null, clips: ANIMS });
  c.root.position.x = i * 1.1; scene.add(c.root); cast.push(c);
}
const mid = (cast.length - 1) * 1.1 / 2, dist = 5.2 + cast.length * 1.15;

window.renderFrame = i => {
  i = Math.round(i);
  for (const c of cast) c.pose({ [ANIMS[i]]: 1 }, c.duration(ANIMS[i]) * 0.4);
  camera.position.set(mid + dist * 0.35, 1.5, dist); camera.lookAt(mid, 0.9, 0);
  document.getElementById('name').textContent = ANIMS[i].replaceAll('-', ' ');
  renderer.render(scene, camera);
};
document.fonts.ready.then(() => { window.renderFrame(0); window.ready = true; });
