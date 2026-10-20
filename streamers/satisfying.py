"""Pool de videos satisfactorios horizontales + rotación. pick_for entrega n clips distintos,
sin repetir respecto a la llamada anterior del mismo canal (estado en satisfying_state.json)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POOL_DIR = ROOT / "streamers" / "satisfying"
STATE_PATH = ROOT / "streamers" / "satisfying_state.json"


def _load(state_path: Path) -> dict:
    try:
        return json.loads(state_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def pick_for(channel: str, n: int, pool_dir: Path | None = None,
             state_path: Path | None = None) -> list[Path]:
    pool_dir = Path(pool_dir or POOL_DIR)
    state_path = Path(state_path or STATE_PATH)
    pool = sorted(pool_dir.glob("*.mp4"))
    if not pool:
        return []
    state = _load(state_path)
    prev = set(state.get(channel, []))
    candidatos = [p for p in pool if p.name not in prev] or pool
    start = int(state.get(f"{channel}__cursor", 0)) % len(candidatos)
    picked: list[Path] = []
    i = start
    while len(picked) < min(n, len(pool)) and candidatos:
        cand = candidatos[i % len(candidatos)]
        if cand not in picked:
            picked.append(cand)
        i += 1
        if i - start > 2 * len(candidatos):
            break
    state[channel] = [p.name for p in picked]
    state[f"{channel}__cursor"] = start + len(picked)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    return picked


# Compilaciones "oddly satisfying" de YouTube (yt-dlp). Pixabay no tiene este contenido;
# acá está el slime/kinetic sand/soap cutting de verdad. Riesgo de copyright: tier riesgoso.
_YT_QUERIES = [
    "ytsearch3:oddly satisfying slime kinetic sand compilation no talking",
    "ytsearch3:satisfying soap cutting asmr compilation",
    "ytsearch2:hydraulic press satisfying compilation",
    "ytsearch2:satisfying glass fruit cutting compilation",
    "ytsearch2:satisfying paint mixing compilation",
    "ytsearch2:kinetic sand cutting satisfying compilation",
]


def _probe_dur(path) -> float:
    import subprocess
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "csv=p=0", str(path)], capture_output=True, text=True, timeout=30)
        return float((r.stdout or "0").strip())
    except Exception:
        return 0.0


def _is_landscape(path) -> bool:
    import subprocess
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height", "-of", "csv=p=0", str(path)],
                           capture_output=True, text=True, timeout=30)
        w, h = (int(x) for x in r.stdout.strip().split(","))
        return w > h
    except Exception:
        return True


def source_pool(target: int = 30, pool_dir: Path | None = None, seg: int = 30,
                verbose: bool = True) -> int:
    """Baja compilaciones 'oddly satisfying' de YouTube (yt-dlp), HORIZONTALES 1080p, y las corta
    en segmentos de ~seg s (sin audio, 1080 de ancho, 30fps) -> sat_NNNN.mp4. Salta ~30s entre
    cortes para variar el contenido. Devuelve el total en el pool."""
    import subprocess

    pool_dir = Path(pool_dir or POOL_DIR)
    pool_dir.mkdir(parents=True, exist_ok=True)
    n = len(list(pool_dir.glob("sat_*.mp4")))
    comp = pool_dir / "_comp.tmp.mp4"
    for query in _YT_QUERIES:
        if n >= target:
            break
        comp.unlink(missing_ok=True)
        try:
            subprocess.run(
                ["yt-dlp", "-f", "bv*[height<=1080][ext=mp4]+ba/b[height<=1080]",
                 "--merge-output-format", "mp4",
                 "--match-filter", "duration>180 & duration<1500",   # horizontal se chequea abajo
                 "--max-downloads", "1", "-o", str(comp), query],
                capture_output=True, timeout=600)
        except Exception:
            continue
        dur = _probe_dur(comp)
        if not comp.exists() or dur < 120 or not _is_landscape(comp):
            continue
        t = 45.0
        while t + seg < dur - 25 and n < target:
            out = pool_dir / f"sat_{n + 1:04d}.mp4"
            subprocess.run(
                ["ffmpeg", "-y", "-ss", f"{t:.0f}", "-t", str(seg), "-i", str(comp),
                 "-vf", "scale=1080:-2", "-an", "-c:v", "libx264", "-preset", "veryfast",
                 "-crf", "23", "-r", "30", str(out)], capture_output=True)
            if out.exists() and out.stat().st_size > 1000:
                n += 1
                if verbose:
                    print(f"[sat] {n}/{target}  (corte en {int(t)}s)")
            t += seg + 30
    comp.unlink(missing_ok=True)
    return n


if __name__ == "__main__":
    import sys
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    tgt = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    print(f"Pool satisfactorio: {source_pool(tgt)} videos en {POOL_DIR}")
