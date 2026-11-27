"""Cola de render para armar varios episodios animados a la vez en una PC de 8 GB.

Cada captura abre un Chrome con WebGL; dos renders completos juntos revientan la memoria. Por eso:
  - cuadros sueltos (stills): de a UNO por vez (candado propio, tarda segundos);
  - render completo (full): de a UNO por vez (otro candado), en un proceso aparte que no depende de
    quien lo pidió. Puede correr uno de cada tipo al mismo tiempo.

    python -m anim3d.render <ep> stills 1 4.5 9 13 ...   cuadros -> anim3d/out/<ep>/hoja.jpg (espera su turno)
    python -m anim3d.render <ep> full                     encola el render completo y vuelve enseguida
    python -m anim3d.render <ep> wait                     espera (hasta ~9 min) a que termine y muestra el resultado
    python -m anim3d.render <ep> status                   estado sin esperar

El render completo hace: video (capture.mjs) -> mezcla con voz, música y efectos (armar.py) -> medición de
ritmo (medir.py) -> copia a revision/<fecha>/<canal>/ para que el usuario lo mire. Estado en
anim3d/out/<ep>/render_status.json y registro en anim3d/out/<ep>/render.log.
"""
from __future__ import annotations

import json
import msvcrt
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = HERE / "out"
REVISION = ROOT / "revision" / "27-nov"
CARPETA = {"historia": "historia", "misterios": "misterios", "faceless": "en60seg"}


@contextmanager
def candado(nombre: str, espera_max: float = 3600):
    """Candado del sistema operativo: se libera solo si el proceso muere."""
    OUT.mkdir(exist_ok=True)
    f = open(OUT / f".{nombre}.lock", "a+")
    t0, avisado = time.time(), False
    while True:
        try:
            f.seek(0); msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1); break
        except OSError:
            if not avisado:
                print(f"esperando turno ({nombre})...", flush=True); avisado = True
            if time.time() - t0 > espera_max:
                f.close(); raise TimeoutError(f"no se liberó el turno de {nombre} en {espera_max:.0f} s")
            time.sleep(2)
    try:
        yield
    finally:
        f.seek(0); msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1); f.close()


def _node(args: list[str], log=None) -> str:
    r = subprocess.run(["node", "capture.mjs", *args], cwd=str(HERE), capture_output=True, text=True, encoding="utf-8", errors="replace")
    salida = (r.stdout or "") + (r.stderr or "")
    if log:
        log.write(salida); log.flush()
    errores = [ln for ln in salida.splitlines() if "error en la página" in ln]
    if r.returncode != 0 or errores:
        raise RuntimeError("falló la captura:\n" + "\n".join((errores or salida.splitlines())[-15:]))
    return salida


def stills(ep: str, tiempos: list[str], cols: int | None = None) -> Path:
    dest = OUT / ep
    with candado("stills", espera_max=1500):
        salida = _node(["--page", f"{ep}.html", "--stills", *tiempos])
    for ln in salida.splitlines():
        if ln.startswith("DEBUG"):
            print(ln)
    cols = cols or min(len(tiempos), 6)
    filas = -(-len(tiempos) // cols)
    hoja = dest / "hoja.jpg"
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(tiempos):
            shutil.copy(dest / f"still_{('%g' % float(t)).replace('.', '_')}.jpg", Path(tmp) / f"{i:03d}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(Path(tmp) / "%03d.jpg"),
                        "-vf", f"scale={1920 // cols}:-1,tile={cols}x{filas}", "-frames:v", "1", str(hoja)], check=True)
    print(hoja)
    return hoja


def _estado(ep: str, **kw) -> None:
    p = OUT / ep / "render_status.json"
    st = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    st.update(kw, actualizado=f"{datetime.now():%H:%M:%S}")
    p.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")


def _worker(ep: str) -> None:
    (OUT / ep).mkdir(parents=True, exist_ok=True)
    with open(OUT / ep / "render.log", "a", encoding="utf-8") as log:
        log.write(f"\n==== {datetime.now():%Y-%m-%d %H:%M:%S} render de {ep}\n"); log.flush()
        try:
            _estado(ep, estado="en_cola", mensaje="esperando turno de render")
            with candado("full", espera_max=6 * 3600):
                _estado(ep, estado="renderizando", inicio=f"{datetime.now():%H:%M:%S}", mensaje="capturando cuadros")
                t0 = time.time()
                _node(["--page", f"{ep}.html", "--out", f"{ep}/video.mp4"], log)
                _estado(ep, mensaje="mezclando audio")
                sys.path.insert(0, str(ROOT))
                from anim3d.armar import armar
                final = armar(ep)
            _estado(ep, mensaje="midiendo ritmo")
            from anim3d.medir import medir
            m = medir(str(final))
            guion = json.loads((HERE / "episodes" / ep / "guion.json").read_text(encoding="utf-8"))
            carpeta = REVISION / CARPETA.get(guion["canal"], guion["canal"])
            carpeta.mkdir(parents=True, exist_ok=True)
            for viejo in carpeta.glob(f"*_{ep}.mp4"):
                viejo.unlink()
            dest = carpeta / f"{guion.get('orden', 0)}_{ep}.mp4"
            shutil.copy2(final, dest)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(final), "-vf", f"fps={12 / max(m['duracion'], 1):.4f},scale=240:-1,tile=12x1",
                            "-frames:v", "1", str(OUT / ep / "hoja_final.jpg")], check=False)
            _estado(ep, estado="listo", mensaje=f"listo en {time.time() - t0:.0f} s", medicion=m, archivo=str(dest),
                    hoja_final=str(OUT / ep / "hoja_final.jpg"))
        except Exception as e:
            log.write(f"ERROR: {e}\n")
            _estado(ep, estado="error", mensaje=str(e)[-1500:])


def full(ep: str) -> None:
    if not (OUT / ep / "timing.json").exists():
        raise SystemExit(f"falta out/{ep}/timing.json: correr antes python -m anim3d.narrar {ep}")
    _estado(ep, estado="en_cola", mensaje="encolado", medicion=None)
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    subprocess.Popen([sys.executable, "-m", "anim3d.render", ep, "_worker"], cwd=str(ROOT), creationflags=flags,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, close_fds=True)
    print(f"encolado: {ep}. Seguir con: python -m anim3d.render {ep} wait")


def status(ep: str) -> dict:
    p = OUT / ep / "render_status.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"estado": "sin_render"}


def wait(ep: str, max_s: float = 540) -> dict:
    t0 = time.time()
    while time.time() - t0 < max_s:
        st = status(ep)
        if st.get("estado") in ("listo", "error"):
            return st
        time.sleep(5)
    st = status(ep); st["nota"] = "todavía no terminó: volver a correr wait"
    return st


if __name__ == "__main__":
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    os.chdir(ROOT)
    a = sys.argv[1:]
    ep, cmd = a[0], (a[1] if len(a) > 1 else "status")
    if cmd == "stills":
        cols = None
        if "--cols" in a:
            i = a.index("--cols"); cols = int(a[i + 1]); del a[i:i + 2]
        stills(ep, a[2:], cols)
    elif cmd == "full":
        full(ep)
    elif cmd == "_worker":
        _worker(ep)
    elif cmd == "wait":
        print(json.dumps(wait(ep), ensure_ascii=False, indent=1))
    else:
        print(json.dumps(status(ep), ensure_ascii=False, indent=1))
