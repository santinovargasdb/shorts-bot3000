"""Fuente de guiones del canal '¿Soy el Malo?' (historias de Reddit).

A diferencia de los otros canales (series_data/historia/misterios, con PARTS
estáticos), acá las partes salen DINÁMICAMENTE de las historias ya reescritas en
`reddit_pipeline/stories.sqlite`. El módulo imita la MISMA interfaz que un módulo
`series` (PARTS, title_for, background_for, descripcion, KEYWORDS) para que
`daily_post.py` lo consuma sin cambios estructurales.

Cada parte = una historia, numerada por su `seq` estable (ver reddit_pipeline.db):
seq 1, 2, 3... crece append-only, así el contador `next_part` de daily_post nunca
re-apunta a otra historia aunque se reescriban más.
"""
from __future__ import annotations

from series_data import BACKGROUNDS

import reddit_pipeline.db as _db
from reddit_pipeline.constants import DB_PATH
from reddit_pipeline.env import ROOT

# Voz es-MX según el género de quien narra (spec §2, §6).
VOZ = {"M": "es-MX-JorgeNeural", "F": "es-MX-DaliaNeural"}

KEYWORDS = [
    "shorts", "reddit", "historias de reddit", "historias reales", "drama",
    "relatos", "storytime", "venganza", "soy el malo", "reddit en español", "viral",
]


def _clean(s: str) -> str:
    """Saca emojis/flechas que la fuente ASS no dibuja (conserva acentos y ¿¡)."""
    return "".join(c for c in (s or "") if ord(c) < 0x2190).strip()


def build_parts(rows: list[dict]) -> dict[int, dict]:
    """Mapea las historias reescritas (filas de la DB con `seq`) al dict de partes
    que consume el motor. El guion + el veredicto se narran (el veredicto = capa
    editorial propia, hablada); la pregunta (cierre) va fija en pantalla al final."""
    parts: dict[int, dict] = {}
    for r in rows:
        seq = int(r["seq"])
        titulo = _clean(r["titulo_es"])
        narracion = _clean(f"{r['guion']}  {r['veredicto']}".strip())
        parts[seq] = {
            "titulo": titulo,
            # Sin tarjeta de título naranja: el gancho visual es la TARJETA DE POST
            # de Reddit (overlay en la apertura, ver intro_card_for). Solo narración.
            "segments": [
                {"kind": "fact", "text": narracion, "imgs": []},
            ],
            "resumen": _clean(r["veredicto"]) or titulo,
            "pregunta": _clean(r["cierre"]),
            "voice": VOZ.get(r["narrador_genero"], VOZ["F"]),
            "sfx": "sfx/pop.wav",
            # datos para la tarjeta de post de Reddit (apertura)
            "subreddit": r["subreddit"],
            "upvotes": r["score"],
            "comments": r["num_comments"],
            "username": f"u/throwaway_{seq * 1373 % 9000 + 1000}",
        }
    return parts


def _load() -> dict[int, dict]:
    """Construye PARTS desde la DB. Si no existe/está vacía, devuelve {} (daily_post
    lo maneja: 'No hay parte N en el backlog')."""
    if not DB_PATH.exists():
        return {}
    conn = _db.connect(DB_PATH)
    try:
        return build_parts(_db.rewritten_by_seq(conn))
    finally:
        conn.close()


PARTS: dict[int, dict] = _load()


def title_for(part: int) -> str:
    """El cliffhanger de la historia (título de YT/IG/TikTok)."""
    return PARTS[part]["titulo"]


def intro_card_for(part: int):
    """Renderiza (y cachea) la tarjeta de post de Reddit de la historia, para el
    overlay de apertura del video. Devuelve la ruta del PNG (o None si falta la parte)."""
    import reddit_card
    p = PARTS.get(part)
    if not p:
        return None
    cards = ROOT / "output" / "soyelmalo" / ".cards"
    cards.mkdir(parents=True, exist_ok=True)
    return reddit_card.render_card(
        cards / f"seq{part}.png", subreddit=p["subreddit"], title=p["titulo"],
        upvotes=p["upvotes"], comments=p["comments"], username=p["username"])


def background_for(part: int) -> str:
    """Gameplay rotativo del pool compartido, desfasado para no clonar el mismo
    fondo que los otros canales en la misma posición."""
    return BACKGROUNDS[(part + 2) % len(BACKGROUNDS)]


def descripcion(parte: int, resumen: str) -> str:
    """Descripción para YouTube + fuente del caption de IG (de acá _ig_caption saca
    el gancho = 1ª línea, y los hashtags = línea con '#'). Por eso la 1ª línea es el
    `resumen` (específico por historia), NO un texto genérico ni el guion entero."""
    return (
        f"{resumen}\n\n"
        "Historia real de Reddit, reescrita y narrada. ¿Soy el malo? "
        "Dejá tu veredicto en los comentarios 👇\n\n"
        "#shorts #reddit #historias #drama #storytime #soyelmalo "
        "#historiasdereddit #relatos #reddithistorias #viral"
    )
