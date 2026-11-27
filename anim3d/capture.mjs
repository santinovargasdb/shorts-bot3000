// Renderiza la escena cuadro por cuadro en Chrome sin ventana y arma el mp4 con ffmpeg.
//   node capture.mjs [segundos] [--stills]
// Sin tiempo real: cada cuadro se dibuja en su instante exacto, tarde lo que tarde la PC.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FPS = 30;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary', '.fbx': 'application/octet-stream', '.json': 'application/json' };
const argOf = (flag, def) => process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : def;
const PAGE = argOf('--page', '');                  // otra página en vez de la escena (ej. charsheet.html?char=Remy)

// Servidor local: los módulos ES no cargan desde file://
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url.startsWith('/three/') ? join(HERE, 'node_modules', url)
    : url.startsWith('/fonts/') ? join(ROOT, url)
    : join(HERE, url === '/' ? 'index.html' : url);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--hide-scrollbars'],
  defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', e => console.error('error en la página:', e.message));
await page.goto(`http://127.0.0.1:${port}/${PAGE}`);
await page.waitForFunction('window.ready === true', { timeout: 180000 });
const { dur, gl } = await page.evaluate(() => ({ dur: window.DURATION, gl: window.GL_RENDERER }));
console.log('render con:', gl);
const dbg = await page.evaluate(() => window.DEBUG);          // la página puede dejar datos de diagnóstico acá
if (dbg) console.log('DEBUG', JSON.stringify(dbg));

await mkdir(join(HERE, 'out'), { recursive: true });
// La escena puede declarar sus efectos de sonido (window.SFX = [[segundo, nombre, volumen], ...]): se guardan
// junto al video para que anim3d/armar.py los mezcle.
const sfxList = await page.evaluate(() => window.SFX || null);
if (sfxList && PAGE) {
  const dir = join(HERE, 'out', PAGE.split('.')[0]);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'sfx.json'), JSON.stringify(sfxList));
}
const seconds = Number(process.argv[2]) || dur;
const t0 = Date.now();

if (process.argv.includes('--stills')) {          // cuadros sueltos para revisar rápido
  const times = process.argv.slice(process.argv.indexOf('--stills') + 1).map(Number).filter(n => !Number.isNaN(n));
  for (const t of times.length ? times : [0.5, 1.5, 3.5, 5.5, 7, 8.4, 9.6, 11.3, 13.5]) {
    const man = await page.evaluate(x => { window.renderFrame(x); return window.MAN; }, t);
    const name = String(t).replace('.', '_');
    await page.screenshot({ path: join(HERE, 'out', `still_${name}.jpg`), type: 'jpeg', quality: 88 });
    if (man) {                                       // recorte de la persona, para revisarla de cerca
      const x = Math.min(Math.max(man.x - 200, 0), 1080 - 400), y = Math.min(Math.max(man.y - 250, 0), 1920 - 500);
      await page.screenshot({ path: join(HERE, 'out', `zoom_${name}.jpg`), type: 'jpeg', quality: 92,
        clip: { x, y, width: 400, height: 500 } });
    }
  }
  console.log(`cuadros de prueba en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} else {
  const out = join(HERE, 'out', argOf('--out', 'bunker.mp4'));
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(seconds * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate(x => window.renderFrame(x), i / FPS);
    const shot = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(shot)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`cuadro ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  const s = (Date.now() - t0) / 1000;
  console.log(`listo: ${out}  (${total} cuadros en ${s.toFixed(0)}s = ${(s / seconds).toFixed(1)}s de render por segundo de video)`);
}
await browser.close();
server.close();
