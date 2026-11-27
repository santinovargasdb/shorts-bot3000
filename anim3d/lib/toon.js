// Personaje de caricatura hecho por código (sin modelos ni animaciones bajadas). Estilo tomado de
// @WeirdLittleFactsydk (mirado cuadro a cuadro el 26-nov-2026): cabeza redonda grande con contorno
// grueso color ciruela, cuerpo de píldora con ropa (botones, cuello, corbata, delantal, rayas),
// sombrero con forma, brazos y piernas de línea fina, ojos de RAYITA (arco si está contento, redondos
// solo en el susto) y boca que se abre con lengua. Proyecta sombra de verdad sobre el decorado.
// Cada cuadro se le pasa una POSE (dónde está, cuánto camina, a dónde van las manos, qué cara pone)
// y él resuelve codos y rodillas solo; el gesto es siempre el de la escena y se puede exagerar.
//
//   const p = makeToon({ shirt: 0x3b82c4, hat: { type: 'fedora', color: 0x2b2f3a }, detail: ['collar', 'tie'] });
//   p.pose({ x: 0, z: 0, face: 0.3, walk: 1, phase: t * 1.8, look: [1, 1.2, 0], mood: 'surprised' });
import * as THREE from 'three';

const PLUM = 0x1e1428;
const INK = new THREE.MeshBasicMaterial({ color: PLUM });
const HULL = new THREE.MeshBasicMaterial({ color: PLUM, side: THREE.BackSide });
const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });
const clamp01 = x => Math.min(1, Math.max(0, x));
const lerp = (a, b, k) => a + (b - a) * k;
const Y = new THREE.Vector3(0, 1, 0), Zf = new THREE.Vector3(0, 0, 1);

/** Color plano con un escalón suave de sombra (look de dibujo). */
export function flat(color, opts = {}) {
  const g = new Uint8Array([178, 178, 178, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
  const map = new THREE.DataTexture(g, 3, 1, THREE.RGBAFormat); map.needsUpdate = true;
  map.minFilter = map.magFilter = THREE.NearestFilter;
  return new THREE.MeshToonMaterial({ color, gradientMap: map, ...opts });
}
/** Agrega el contorno a una malla (su misma forma, un poco más grande, vista por adentro). */
export function outlined(mesh, w = 0.018) {
  mesh.geometry.computeBoundingSphere();
  const r = mesh.geometry.boundingSphere.radius || 1;
  const o = new THREE.Mesh(mesh.geometry, HULL);
  o.scale.setScalar(1 + w / r); mesh.add(o); mesh.castShadow = true;
  return mesh;
}
/** Caja con color plano y contorno, por límites. Para armar decorados del mismo estilo. */
export function block(parent, color, x0, x1, y0, y1, z0, z1, w = 0.02) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, Math.abs(z0 - z1)), color.isMaterial ? color : flat(color));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); outlined(m, w); m.receiveShadow = true; parent.add(m); return m;
}

const HIP = 0.6, SHOULDER = 1.02, HEAD = 1.36, HEAD_R = 0.3, LEG = 0.32, ARM = 0.29, TORSO_R = 0.19, TORSO_Y = (HIP + SHOULDER) / 2 + 0.02;

function limb(parent, r) {                    // un segmento de línea entre dos puntos
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), INK); m.castShadow = true; parent.add(m); return m;
}
const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), qz = new THREE.Quaternion();
function place(m, a, b) {
  va.copy(b).sub(a); const d = va.length() || 1e-4;
  m.position.copy(a).addScaledVector(va, 0.5); m.scale.set(1, d, 1);
  m.quaternion.setFromUnitVectors(Y, va.multiplyScalar(1 / d));
}
/** Codo/rodilla de una cadena de dos huesos del mismo largo, doblando hacia `pole`. */
function joint(root, tip, len, pole, out) {
  va.copy(tip).sub(root); let d = va.length();
  const max = 2 * len * 0.999;
  if (d > max) { tip.copy(root).addScaledVector(va, max / d); d = max; va.copy(tip).sub(root); }   // no llega: se estira hasta donde puede
  const h = Math.sqrt(Math.max(len * len - d * d / 4, 0));
  vb.copy(va).multiplyScalar(1 / (d || 1e-4));
  vc.copy(pole).addScaledVector(vb, -pole.dot(vb));                 // la parte de `pole` perpendicular al miembro
  if (vc.lengthSq() < 1e-6) vc.set(0, 0, 1);
  return out.copy(root).addScaledVector(va, 0.5).addScaledVector(vc.normalize(), h);
}

// ojo: 'round' (blanco con pupila: el normal), 'half' (entrecerrado: desconfiado, pícaro, enojado), 'arc' (arco de risa)
// o 'dash' (apretado, solo para el esfuerzo). Con rayitas como ojo normal, todos parecían tener los ojos cerrados.
// es = tamaño del ojo; tilt = cuánto se inclina; btilt = inclinación de la ceja
const MOODS = {
  neutral:   { eye: 'round', tilt: 0.0,   brow: 0.125, btilt: 0.0,   mouth: 'flat', es: 0.86 },
  happy:     { eye: 'arc',   tilt: 0.0,   brow: null,                mouth: 'open' },
  surprised: { eye: 'round', tilt: 0.0,   brow: 0.155, btilt: -0.12, mouth: 'o', es: 1.18 },
  angry:     { eye: 'half',  tilt: 0.22,  brow: 0.06,  btilt: 0.42,  mouth: 'frown' },
  worried:   { eye: 'round', tilt: 0.0,   brow: 0.125, btilt: -0.42, mouth: 'frown' },
  effort:    { eye: 'dash',  tilt: 0.5,   brow: 0.08,  btilt: 0.3,   mouth: 'flat' },
  sly:       { eye: 'half',  tilt: 0.06,  brow: 0.075, btilt: 0.16,  mouth: 'smile' },
};

function makeHat(spec) {
  if (typeof spec === 'number') spec = { type: 'kepi', color: spec };
  const { type = 'fedora', color = 0x2b2f3a, band = 0x15171c } = spec, g = new THREE.Group(), mat = flat(color);
  const cyl = (rt, rb, h, y, m = mat, w = 0.02) => { const c = outlined(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 28), m), w); c.position.y = y; g.add(c); return c; };
  if (type === 'kepi') {                         // gorra de policía: copa, visera y chapa
    g.position.y = 0.17; cyl(0.235, 0.228, 0.17, 0.09);
    const visor = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 10), flat(0x15171c)), 0.016); visor.scale.set(1, 0.13, 1); visor.position.set(0, 0.01, 0.2); g.add(visor);
    const badge = outlined(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), flat(0xffd23a)), 0.01); badge.position.set(0, 0.1, 0.235); g.add(badge);
  } else {
    const [brim, rt, rb, h] = { fedora: [0.37, 0.2, 0.235, 0.22], boater: [0.39, 0.215, 0.215, 0.14], top: [0.31, 0.2, 0.19, 0.32], bowler: [0.3, 0.14, 0.215, 0.2] }[type] || [0.37, 0.2, 0.235, 0.22];
    g.position.y = 0.185; g.rotation.x = -0.1;
    cyl(brim, brim, 0.03, 0); cyl(rt, rb, h, h / 2 + 0.01); cyl(rb + 0.006, rb + 0.008, 0.055, 0.045, flat(band), 0.006);
  }
  return g;
}

export function makeToon({ shirt = 0x3b82c4, skin = 0xf6d2ae, hair = 0x4a3222, hat = null, mustache = false, detail = [], trim = 0xffffff, blob = false } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  // sombra de contacto dibujada: solo para escenas SIN sombras de verdad (blob: true)
  const blobM = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  blobM.rotation.x = -Math.PI / 2; blobM.position.y = 0.012; blobM.visible = blob; root.add(blobM);

  const torso = outlined(new THREE.Mesh(new THREE.CapsuleGeometry(TORSO_R, 0.3, 6, 18), flat(shirt)), 0.026);
  torso.position.y = TORSO_Y; body.add(torso);
  // ropa: piezas chicas apoyadas sobre la píldora
  const on = (m, x, y, z) => { m.position.set(x, y, z); body.add(m); return m; };
  if (detail.includes('stripes')) for (const y of [0.64, 0.75, 0.86, 0.97, 1.08]) { const r = Math.sqrt(Math.max(TORSO_R ** 2 - Math.max(Math.abs(y - TORSO_Y) - 0.15, 0) ** 2, 1e-4)); const s = on(new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.016, 6, 26), INK), 0, y, 0); s.rotation.x = Math.PI / 2; }
  if (detail.includes('apron')) { const a = on(outlined(new THREE.Mesh(new THREE.CylinderGeometry(TORSO_R + 0.008, TORSO_R + 0.008, 0.4, 20, 1, true, -0.8, 1.6), flat(trim, { side: THREE.DoubleSide })), 0.012), 0, 0.76, 0); a.castShadow = false; }
  if (detail.includes('collar')) on(outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.152, 0.06, 20), flat(trim)), 0.012), 0, 1.1, 0);
  if (detail.includes('tie')) { const t = on(new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.24), new THREE.MeshBasicMaterial({ color: 0x8f2433 })), 0, 0.95, TORSO_R + 0.006); t.add(new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.265), INK)); t.children[0].position.z = -0.002; }
  if (detail.includes('buttons')) for (const y of [0.97, 0.84, 0.71]) on(new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 6), new THREE.MeshBasicMaterial({ color: detail.includes('tie') ? PLUM : 0xffd23a })), detail.includes('tie') ? 0.075 : 0, y, detail.includes('tie') ? TORSO_R - 0.012 : TORSO_R + 0.002);
  if (detail.includes('badge')) on(outlined(new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), flat(0xffd23a)), 0.01), -0.1, 0.99, TORSO_R - 0.024);
  if (detail.includes('belt')) { const b = on(new THREE.Mesh(new THREE.TorusGeometry(TORSO_R + 0.004, 0.02, 6, 26), INK), 0, 0.68, 0); b.rotation.x = Math.PI / 2; }

  const head = new THREE.Group(); head.position.y = HEAD; body.add(head);
  head.add(outlined(new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 30, 22), flat(skin)), 0.026));
  if (hair !== null) { const cap = outlined(new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 1.04, 28, 14, 0, Math.PI * 2, 0, hat ? 0.95 : 1.15), flat(hair)), 0.02); cap.rotation.x = hat ? -0.1 : -0.25; head.add(cap); }
  if (hat !== null) head.add(makeHat(hat));

  // ---- cara: todo va APOYADO sobre la curva de la cabeza (puesto plano, queda cortado o flotando) ----
  const face = new THREE.Group(); head.add(face);
  const seat = (m, x, y, lift = 0.012) => { const p = new THREE.Vector3(x, y, Math.sqrt(HEAD_R * HEAD_R - x * x - y * y)).normalize(); m.quaternion.setFromUnitVectors(Zf, p); m.userData.q0 = m.quaternion.clone(); m.position.copy(p).multiplyScalar(HEAD_R + lift); face.add(m); return m; };
  const spin = (m, a) => m.quaternion.copy(m.userData.q0).multiply(qz.setFromAxisAngle(Zf, a));
  const disc = (rx, ry, mat, z = 0) => { const d = new THREE.Mesh(new THREE.CircleGeometry(1, 24), mat); d.scale.set(rx, ry, 1); d.position.z = z; return d; };
  const arc = (r, tube, up) => { const a = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 18, Math.PI), INK); if (!up) a.rotation.z = Math.PI; const g = new THREE.Group(); g.add(a); return g; };
  const eyes = [-1, 1].map(s => {
    const e = seat(new THREE.Group(), s * 0.118, 0.01); e.userData.s = s;
    const round = new THREE.Group(); round.add(disc(0.064, 0.078, INK, 0), disc(0.05, 0.064, WHITE, 0.002)); const pupil = disc(0.026, 0.03, INK, 0.004); round.add(pupil);
    const dash = disc(0.05, 0.015, INK), laugh = arc(0.042, 0.012, true); laugh.position.y = -0.015;
    // entrecerrado: la mitad de abajo del ojo, con el párpado como una línea gruesa arriba
    const half = new THREE.Group(), hd = (rx, ry, mat, z) => { const d = new THREE.Mesh(new THREE.CircleGeometry(1, 24, Math.PI, Math.PI), mat); d.scale.set(rx, ry, 1); d.position.z = z; return d; };
    const pupil2 = disc(0.024, 0.026, INK, 0.004); pupil2.position.y = -0.03;
    half.add(hd(0.066, 0.08, INK, 0), hd(0.052, 0.066, WHITE, 0.002), pupil2, disc(0.074, 0.013, INK, 0.005)); half.position.y = 0.022;
    e.add(round, dash, laugh, half); Object.assign(e.userData, { round, dash, arc: laugh, half, pupil, pupil2 }); return e;
  });
  const brows = [-1, 1].map(s => { const b = seat(disc(0.066, 0.017, INK), s * 0.118, 0.1); b.userData.s = s; return b; });
  const mo = mustache ? -0.035 : 0;                    // con bigote, la boca va más abajo
  const open = new THREE.Group();                     // boca abierta: medio disco oscuro con dientes y lengua
  open.add(new THREE.Mesh(new THREE.CircleGeometry(0.09, 22, Math.PI, Math.PI), INK));
  const cavity = new THREE.Mesh(new THREE.CircleGeometry(0.074, 22, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: 0x4f1626 })); cavity.position.set(0, -0.008, 0.002); open.add(cavity);
  const teeth = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.02), WHITE); teeth.position.set(0, -0.019, 0.003); open.add(teeth);
  open.add(disc(0.034, 0.026, new THREE.MeshBasicMaterial({ color: 0xe8665c }), 0.004)); open.children[3].position.y = -0.052;
  const oh = new THREE.Group(); oh.add(disc(0.04, 0.052, INK, 0), disc(0.029, 0.041, new THREE.MeshBasicMaterial({ color: 0x4f1626 }), 0.002));
  const wrap = m => { const g = new THREE.Group(); g.add(m); return g; };      // la escala del gesto va en el grupo, no en el disco
  const mouths = { flat: seat(wrap(disc(0.046, 0.012, INK)), 0, -0.155 + mo), smile: seat(arc(0.055, 0.012, false), 0, -0.115 + mo), frown: seat(arc(0.04, 0.012, true), 0, -0.19 + mo),
    open: seat(open, 0, -0.095 + mo, 0.016), o: seat(oh, 0, -0.17 + mo) };
  if (mustache) { const m = seat(disc(0.1, 0.026, INK), 0, -0.085); m.add(disc(0.03, 0.03, INK)); m.children[0].position.set(0, 0.01, 0); m.children[0].scale.set(0.045, 0.03, 1); }

  const LEG_R = 0.02, ARM_R = 0.017;
  const knob = r => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), INK); body.add(m); return m; };
  const seg = { armL: [limb(body, ARM_R), limb(body, ARM_R), knob(ARM_R)], armR: [limb(body, ARM_R), limb(body, ARM_R), knob(ARM_R)],
                legL: [limb(body, LEG_R), limb(body, LEG_R), knob(LEG_R)], legR: [limb(body, LEG_R), limb(body, LEG_R), knob(LEG_R)] };
  const hands = [-1, 1].map(() => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 10), INK); h.castShadow = true; body.add(h); return h; });
  const feet = [-1, 1].map(() => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), INK); f.scale.set(0.8, 0.5, 1.5); f.castShadow = true; body.add(f); return f; });

  const S = new THREE.Vector3(), T = new THREE.Vector3(), E = new THREE.Vector3(), P = new THREE.Vector3(), W = new THREE.Vector3();
  return {
    root, head,
    /** Posición de una mano en el mundo (para pegarle un objeto). side: 0 = izquierda, 1 = derecha. */
    hand: (side, out = new THREE.Vector3()) => hands[side].getWorldPosition(out),
    headTop: (out = new THREE.Vector3()) => head.getWorldPosition(out).add(va.set(0, HEAD_R + 0.12, 0)),
    pose({ x = 0, y = 0, z = 0, face: ry = 0, walk = 0, phase = 0, stride = 0.46, squash = 1, lean = 0, bob = 0,
           handL = null, handR = null, wL = 1, wR = 1, look = null, tilt = 0, mood = 'neutral', mood2 = null, mix = 0,
           blink = 0, crouch = 0 } = {}) {
      root.position.set(x, y, z); root.rotation.y = ry;
      const sq = Math.max(0.4, squash), inv = 1 / Math.sqrt(sq);
      root.scale.set(inv, sq, inv);                               // aplastar y estirar conservando el volumen
      blobM.scale.setScalar(lerp(1, 0.6, clamp01(y * 1.5)) * inv); blobM.position.y = 0.012 - y / sq;
      root.updateMatrixWorld(true);

      const ph = phase * Math.PI * 2, w = walk;
      const hipY = HIP - crouch * 0.22 + (0.028 * Math.abs(Math.cos(ph)) - 0.02) * w + bob;
      body.position.set(0, hipY - HIP, 0); body.rotation.x = lean + 0.07 * w; body.rotation.z = 0.03 * Math.sin(ph) * w;
      body.updateMatrixWorld(true);

      // piernas: el pie apoya y va hacia atrás, después se levanta y vuelve adelante (el cuerpo cuelga de la cadera)
      [-1, 1].forEach((s, i) => {
        const f = ((phase + (i ? 0.5 : 0)) % 1 + 1) % 1;
        let fz, fy;
        if (f < 0.5) { fz = stride / 2 - stride * (f / 0.5); fy = 0; }
        else { const k = (f - 0.5) / 0.5, e = k * k * (3 - 2 * k); fz = -stride / 2 + stride * e; fy = 0.15 * Math.sin(Math.PI * k); }
        T.set(s * 0.1, 0.04 + fy * w - body.position.y, fz * w);        // el pie vive en el piso, no cuelga con el cuerpo
        S.set(s * 0.09, HIP, 0);
        joint(S, T, LEG, P.set(s * 0.08, 0, 1), E);
        const legs = seg[i ? 'legR' : 'legL']; place(legs[0], S, E); place(legs[1], E, T); legs[2].position.copy(E);
        feet[i].position.copy(T).setZ(T.z + 0.035); feet[i].rotation.x = f >= 0.5 ? -0.5 * Math.sin(Math.PI * ((f - 0.5) / 0.5)) * w : 0;
      });
      // brazos: se balancean al revés que las piernas, salvo que la escena les dé un punto del mundo
      [[handL, wL, -1, 'armL'], [handR, wR, 1, 'armR']].forEach(([target, tw, s, key], i) => {
        S.set(s * 0.2, SHOULDER, 0);
        // la mano llega un poco después que la pierna (arrastre) y el braceo crece con el paso; corriendo, codos arriba
        T.set(s * 0.27, HIP + 0.04 + Math.max(stride - 0.46, 0) * 0.6 * w, 0.04 - s * 0.42 * stride * Math.sin(ph - 0.4) * w);
        if (target && tw > 0) { W.copy(target.isVector3 ? target : va.set(...target)); body.worldToLocal(W); T.lerp(W, clamp01(tw)); }
        joint(S, T, ARM, P.set(s * 0.6, -0.5, -0.7), E);
        place(seg[key][0], S, E); place(seg[key][1], E, T); seg[key][2].position.copy(E); hands[i].position.copy(T);
      });

      // cabeza: mira a un punto (con límite, para que no gire como búho) y se inclina
      let hy = 0, hx = 0, gx = 0, gy = 0;
      if (look) {
        W.copy(look.isVector3 ? look : va.set(...look)); body.worldToLocal(W); W.y -= HEAD;
        const ry0 = Math.atan2(W.x, W.z), rx0 = -Math.atan2(W.y, Math.hypot(W.x, W.z));
        hy = THREE.MathUtils.clamp(ry0, -1.0, 1.0); hx = THREE.MathUtils.clamp(rx0, -0.5, 0.5);
        gx = THREE.MathUtils.clamp((ry0 - hy * 0.75) * 0.05, -0.02, 0.02); gy = THREE.MathUtils.clamp(-(rx0 - hx * 0.75) * 0.05, -0.018, 0.018);   // lo que no gira la cabeza, lo miran los ojos
      }
      head.rotation.set(hx + 0.04 * Math.sin(ph * 2) * w, hy, tilt);
      head.position.y = HEAD + 0.012 * Math.sin(ph * 2 + 0.6) * w;

      // cara: hasta la mitad del cambio se ve el gesto viejo; después el nuevo, que entra con un rebote
      const a = MOODS[mood] || MOODS.neutral, b = MOODS[mood2] || a, k = clamp01(mix), m = k > 0.5 ? b : a;
      const pop = b === a ? 1 : 0.55 + 0.45 * clamp01(Math.abs(k - 0.5) * 2);
      eyes.forEach(e => {
        const u = e.userData, es = pop * (m.es || 1); u.round.visible = m.eye === 'round'; u.dash.visible = m.eye === 'dash'; u.arc.visible = m.eye === 'arc'; u.half.visible = m.eye === 'half';
        spin(e, u.s * lerp(a.tilt, b.tilt, k)); e.scale.set(es, es * (m.eye === 'round' || m.eye === 'half' ? Math.max(1 - 0.92 * clamp01(blink), 0.08) : 1), 1);
        u.pupil.position.x = gx; u.pupil.position.y = gy; u.pupil2.position.x = gx;
      });
      brows.forEach(br => { br.visible = m.brow !== null; if (!br.visible) return;
        const s = br.userData.s, by = lerp(a.brow ?? m.brow, b.brow ?? m.brow, k), p = va.set(s * 0.118, by, Math.sqrt(HEAD_R * HEAD_R - 0.118 * 0.118 - by * by)).normalize();
        br.position.copy(p).multiplyScalar(HEAD_R + 0.012); spin(br, s * lerp(a.btilt ?? 0, b.btilt ?? 0, k)); });
      for (const [name, mm] of Object.entries(mouths)) { mm.visible = name === m.mouth; if (mm.visible) mm.scale.setScalar(pop); }
      root.updateMatrixWorld(true);
    },
  };
}
