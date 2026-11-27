// Personajes de la biblioteca (assets/mixamo): cargarlos a una altura fija en metros, "pintarles"
// la ropa y animarlos con los clips de assets/mixamo/anim.
//
//   const preso = await loadCharacter('Lewis', { outfit: OUTFITS.preso });
//   scene.add(preso.root);
//   preso.pose({ Walking: 1 }, t);            // mezcla de clips (pesos) en el instante t
//
// Todos los personajes de Mixamo comparten esqueleto, así que un clip bajado para uno sirve en
// los demás. Lo que cambia es el tamaño: se normaliza la altura del modelo y se reescala el
// recorrido de la cadera, que es la única pista de posición que importa.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const loader = new FBXLoader();
const BASE = '/assets/mixamo';
const MAX_TEX = 1024;          // las texturas vienen en 4K: en esta PC (8 GB, gráfica integrada) se achican

// Ropa pintada por código. Los colores reemplazan a la textura original en cada zona del cuerpo;
// `keep` deja pasar un poco del sombreado de la textura para que no quede plano.
export const OUTFITS = {
  preso:   { top: 0x7f9fc0, bottom: 0x4f6178, shoes: 0x2a2a2e, keep: 0.35 },   // camisa celeste y pantalón azul grisáceo
  guardia: { top: 0x2c3a4f, bottom: 0x232d3d, shoes: 0x15171a, keep: 0.3 },
};

// A qué zona pertenece cada hueso. La zona de un vértice sale de los huesos que lo mueven.
const ZONES = {
  top: ['Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'],
  bottom: ['Hips', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg'],
  shoes: ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase', 'LeftToe_End', 'RightToe_End'],
};
const short = n => n.replace(/^mixamorig\d*:?/, '');

function shrinkTextures(model) {
  const done = new Map();
  model.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      for (const key of ['normalMap', 'specularMap', 'bumpMap', 'emissiveMap']) if (m[key]) { m[key].dispose(); m[key] = null; }
      const tex = m.map, img = tex && tex.image;
      if (!img || Math.max(img.width, img.height) <= MAX_TEX) continue;
      if (!done.has(tex)) {
        const k = MAX_TEX / Math.max(img.width, img.height), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const small = new THREE.CanvasTexture(c);
        small.colorSpace = tex.colorSpace; small.flipY = tex.flipY; small.wrapS = tex.wrapS; small.wrapT = tex.wrapT;
        done.set(tex, small); tex.dispose();
      }
      m.map = done.get(tex);
    }
  });
}

function paint(model, outfit) {
  const colors = ['top', 'bottom', 'shoes'].map(z => new THREE.Color(outfit[z]));
  model.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const zoneOf = o.skeleton.bones.map(b => ['top', 'bottom', 'shoes'].findIndex(z => ZONES[z].includes(short(b.name))));
    const idx = o.geometry.attributes.skinIndex, wgt = o.geometry.attributes.skinWeight;
    const zone = new Float32Array(idx.count * 3);
    for (let v = 0; v < idx.count; v++) {
      for (let k = 0; k < 4; k++) {
        const z = zoneOf[idx.getComponent(v, k)];
        if (z >= 0) zone[v * 3 + z] += wgt.getComponent(v, k);
      }
    }
    o.geometry.setAttribute('paintZone', new THREE.BufferAttribute(zone, 3));
    o.material = [].concat(o.material).map(src => {
      const m = src.clone();
      m.onBeforeCompile = sh => {
        sh.uniforms.paintTop = { value: colors[0] }; sh.uniforms.paintBottom = { value: colors[1] };
        sh.uniforms.paintShoes = { value: colors[2] }; sh.uniforms.paintKeep = { value: outfit.keep ?? 0.3 };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute vec3 paintZone;\nvarying vec3 vPaintZone;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintZone = paintZone;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vPaintZone;\nuniform vec3 paintTop, paintBottom, paintShoes;\nuniform float paintKeep;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            {
              float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
              float shade = mix(1.0, clamp(lum * 1.6, 0.35, 1.25), paintKeep);     // pliegues de la textura original
              vec3 z = smoothstep(0.42, 0.58, vPaintZone);
              diffuseColor.rgb = mix(diffuseColor.rgb, paintTop * shade, z.x);
              diffuseColor.rgb = mix(diffuseColor.rgb, paintBottom * shade, z.y);
              diffuseColor.rgb = mix(diffuseColor.rgb, paintShoes * shade, z.z);
            }`);
      };
      m.customProgramCacheKey = () => 'paint';
      return m;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
}

const CLIMBS = ['Climbing-Ladder', 'Climbing-Up-Wall'];
const UP = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const clipCache = new Map();
/** Clip de assets/mixamo/anim, sin recorrido horizontal: la cadera solo sube y baja; al personaje lo mueve la escena. */
export async function loadClip(name) {
  if (!clipCache.has(name)) {
    clipCache.set(name, loader.loadAsync(`${BASE}/anim/${name}.fbx`).then(fbx => {
      const clip = fbx.animations[0]; clip.name = name;
      for (const tr of clip.tracks) {
        if (!/Hips\.position$/.test(tr.name)) continue;
        // x/z en cero: la cadera queda SOBRE la raíz. Dejar el valor inicial del clip corría al personaje
        // (el de trepar arranca ~medio metro adelante: trepaba al lado de las cañerías, no sobre ellas).
        const v = tr.values, x0 = 0, z0 = 0, n = v.length / 3;
        // los clips de trepar suben sin parar: se les quita la subida para que queden "en el lugar"
        const rise = CLIMBS.includes(name) ? v[v.length - 2] - v[1] : 0;
        for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; v[i + 1] -= rise * (i / 3) / (n - 1); }
        clip.userData = { hipsY: v[1] };
      }
      return clip;
    }));
  }
  return clipCache.get(name);
}

export async function loadCharacter(name, { height = 1.78, outfit = null, clips = ['Idle', 'Walking'] } = {}) {
  const model = await loader.loadAsync(`${BASE}/${name}.fbx`);
  model.animations = [];
  shrinkTextures(model);
  if (outfit) paint(model, outfit);
  const bones = {};
  model.traverse(o => {
    if (o.isBone && !bones[short(o.name)]) bones[short(o.name)] = o;   // algunos FBX traen huesos repetidos anidados: vale el de afuera
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    for (const m of o.isMesh ? [].concat(o.material) : []) { m.shininess = 4; m.specular?.setScalar(0.04); }
  });
  // Altura real del modelo en pose de reposo (cabeza - pies), en sus propias unidades.
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const b of Object.values(bones)) box.expandByPoint(b.getWorldPosition(new THREE.Vector3()));
  const headTop = bones.HeadTop_End ? bones.HeadTop_End.getWorldPosition(new THREE.Vector3()).y : box.max.y;
  const scale = height / (headTop - box.min.y);
  model.scale.multiplyScalar(scale);
  // Alto de la cadera en reposo, ya en metros, y cómo pasar de metros a las unidades del hueso:
  // cada FBX trae sus propias unidades y a veces una escala en el nodo padre (salían hundidos hasta la cintura).
  model.updateMatrixWorld(true);
  const hipsWorldY = bones.Hips.getWorldPosition(new THREE.Vector3()).y;
  const parentY = bones.Hips.parent.getWorldPosition(new THREE.Vector3()).y;
  const parentScale = bones.Hips.parent.getWorldScale(new THREE.Vector3()).y;

  const root = new THREE.Group(); root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const refHips = (await loadClip('Idle')).userData.hipsY;       // alto de cadera del esqueleto con que se bajaron los clips
  async function addClip(clipName) {
    if (actions[clipName]) return;
    const clip = (await loadClip(clipName)).clone();
    for (const tr of clip.tracks) {
      // cada personaje trae su prefijo en los huesos (mixamorig, mixamorig4...): la pista se reapunta al suyo
      const [bone, prop] = tr.name.split('.');
      if (bones[short(bone)]) tr.name = `${bones[short(bone)].name}.${prop}`;
      if (!/Hips\.position$/.test(tr.name)) continue;
      const v = tr.values;                         // (valor / cadera del clip) = fracción de la altura de cadera
      for (let i = 0; i < v.length; i++) v[i] = ((v[i] / refHips) * hipsWorldY - (i % 3 === 1 ? parentY : 0)) / parentScale;
    }
    const a = mixer.clipAction(clip); a.play(); a.setEffectiveWeight(0); actions[clipName] = a;
  }
  for (const c of clips) await addClip(c);

  return {
    name, root, model, bones, mixer, actions, addClip,
    debug: { hipsWorldY, parentY, parentScale, refHips, hips: bones.Hips.name, parent: bones.Hips.parent.name || bones.Hips.parent.type },
    duration: clipName => actions[clipName].getClip().duration,
    /** Apoya al personaje: sube o baja la raíz hasta que su hueso más bajo quede a la altura `y` (después de pose). */
    ground(y = 0, pad = 0.07) {
      let min = Infinity;
      for (const b of Object.values(bones)) { b.getWorldPosition(tmp); if (tmp.y < min) min = tmp.y; }
      root.position.y += y - (min - pad);
      root.updateMatrixWorld(true);
    },
    /** Apunta un hueso (su eje +Y) hacia un punto del mundo, pisando la animación con peso w. Para gestos sin clip. */
    aim(boneName, target, w = 1) {
      const bone = bones[boneName];
      if (!bone || w <= 0) return;
      tmp.copy(target).sub(bone.getWorldPosition(tmp2)).normalize();
      const parentInv = bone.parent.getWorldQuaternion(qa).invert();
      bone.quaternion.slerp(qb.setFromUnitVectors(UP, tmp).premultiply(parentInv), w);
      bone.updateMatrixWorld(true);
    },
    worldPos: (boneName, out = new THREE.Vector3()) => bones[boneName].getWorldPosition(out),
    /** weights = { Clip: peso }. `times` opcional = { Clip: segundo dentro del clip } para los que no van en bucle con t. */
    pose(weights, t, times = {}) {
      for (const [n, a] of Object.entries(actions)) {
        a.setEffectiveWeight(weights[n] ?? 0);
        const d = a.getClip().duration;
        a.time = (((times[n] ?? t) % d) + d) % d;          // t negativo = clip al revés (bajar una escalera)
      }
      mixer.update(0);
      model.updateMatrixWorld(true);
    },
  };
}
