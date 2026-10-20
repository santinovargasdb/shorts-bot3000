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
