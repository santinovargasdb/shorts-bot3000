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


_QUERIES = ["satisfying", "slime", "paint mixing", "kinetic sand", "soap cutting",
            "hydraulic press", "glass breaking", "foam", "glitter", "sand art",
            "ice", "liquid color", "oddly satisfying", "cutting"]


def source_pool(target: int = 30, pool_dir: Path | None = None, seconds: int = 35,
                verbose: bool = True) -> int:
    """Baja ~target videos satisfactorios HORIZONTALES (Pixabay, licencia libre) y los deja
    como sat_NNNN.mp4 (1080 de ancho, sin audio, 30fps). Devuelve cuántos hay en total."""
    import subprocess

    from whatonearth.sourcing import search_pixabay, _download

    pool_dir = Path(pool_dir or POOL_DIR)
    pool_dir.mkdir(parents=True, exist_ok=True)
    n = len(list(pool_dir.glob("sat_*.mp4")))
    seen: set[str] = set()
    raw = pool_dir / "_raw.tmp.mp4"
    for q in _QUERIES:
        if n >= target:
            break
        for h in search_pixabay(q):
            if n >= target:
                break
            url = h.get("url")
            if not url or url in seen:
                continue
            seen.add(url)
            if h.get("width", 0) <= h.get("height", 0):      # solo HORIZONTAL
                continue
            try:
                _download(url, raw)
            except Exception:
                continue
            out = pool_dir / f"sat_{n + 1:04d}.mp4"
            r = subprocess.run(
                ["ffmpeg", "-y", "-t", str(seconds), "-i", str(raw), "-vf", "scale=1080:-2",
                 "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-r", "30",
                 str(out)], capture_output=True)
            if out.exists() and out.stat().st_size > 1000:
                n += 1
                if verbose:
                    print(f"[sat] {n}/{target}  ({q}: {h.get('width')}x{h.get('height')})")
            else:
                if verbose and r.returncode != 0:
                    print(f"[sat] falló cortar ({q}): {r.stderr[-120:].decode(errors='ignore')}")
    raw.unlink(missing_ok=True)
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
