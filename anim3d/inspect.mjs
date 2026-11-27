import { readFileSync } from 'node:fs';
for (const f of ['Soldier.glb', 'Xbot.glb', 'readyplayer.me.glb']) {
  const b = readFileSync('assets/' + f); const len = b.readUInt32LE(12);
  const j = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
  console.log('==', f, (b.length / 1e6).toFixed(1) + 'MB', '| generador:', j.asset?.generator);
  console.log('  animaciones:', (j.animations || []).map(a => a.name).join(', ') || '(ninguna)');
  console.log('  mallas:', (j.meshes || []).map(m => m.name).join(', '));
  console.log('  materiales:', (j.materials || []).map(m => m.name).join(', '), '| texturas:', (j.images || []).length);
  const bones = (j.skins?.[0]?.joints || []).map(i => j.nodes[i].name);
  console.log('  huesos:', bones.length, '->', bones.filter(n => /Arm|Hand$|UpLeg|^.*Leg$|Spine$|Head$|Hips/.test(n)).slice(0, 16).join(', '));
}
