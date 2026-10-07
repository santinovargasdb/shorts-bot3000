"""Renderiza videos del canal '¿Soy el Malo?' desde las historias ya reescritas
(reddit_pipeline/stories.sqlite) con el motor `curiosidades`: fondo de gameplay +
karaoke + tarjeta de título (el post) + pregunta final, con voz según el género
del narrador (Jorge si M, Dalia si F).

Uso: python render_reddit.py [N]     (default 3)
"""
import sqlite3
import sys
from pathlib import Path

try:  # consola Windows (cp1252) crashea con los emojis del motor -> forzar UTF-8
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from src.curiosidades import generate

DB = ROOT / "reddit_pipeline" / "stories.sqlite"
CHANNEL = "soyelmalo"
VOZ = {"M": "es-MX-JorgeNeural", "F": "es-MX-DaliaNeural"}
BACKGROUNDS = [
    "backgrounds/bg_subway.mp4",
    "backgrounds/bg_minecraft.mp4",
    "backgrounds/bg_gta.mp4",
    "backgrounds/bg_satisfying.mp4",
    "backgrounds/bg_slime.mp4",
]


def _clean(s: str) -> str:
    """Saca emojis/flechas que la fuente ASS no dibuja (conserva acentos y ¿¡)."""
    return "".join(c for c in (s or "") if ord(c) < 0x2190).strip()


def _top_stories(n: int):
    conn = sqlite3.connect(str(DB))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM stories WHERE status='rewritten' ORDER BY viral_score DESC LIMIT ?",
        (n,)).fetchall()
    conn.close()
    return rows


def render_one(p, bg: str) -> Path:
    # El guion + el veredicto se narran (el veredicto = capa editorial propia, hablada).
    narracion = f"{p['guion']}  {p['veredicto']}".strip()
    segments = [
        {"kind": "title", "text": _clean(p["titulo_es"])},        # tarjeta del post
        {"kind": "fact", "text": narracion, "imgs": []},          # narración (sin imágenes)
    ]
    voice = VOZ.get(p["narrador_genero"], VOZ["F"])
    return generate(
        segments, channel_name=CHANNEL, background=bg, music="music/lofi",
        sfx="sfx/pop.wav", title_meta=_clean(p["titulo_es"]),
        question=_clean(p["cierre"]), hashtags=["shorts", "reddit", "historias"],
        sfx_style="datos", voice=voice, verbose=True)


def main(n: int = 3) -> None:
    rows = _top_stories(n)
    if not rows:
        print("No hay historias 'rewritten' en la DB. Corré el pipeline primero.")
        return
    for i, p in enumerate(rows, 1):
        bg = BACKGROUNDS[(i - 1) % len(BACKGROUNDS)]
        print(f"\n=== Render {i}/{len(rows)}: {p['titulo_es']} "
              f"(voz {VOZ.get(p['narrador_genero'])}, bg {bg}) ===")
        out = render_one(p, bg)
        print(f"[ok] {out}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 3)
