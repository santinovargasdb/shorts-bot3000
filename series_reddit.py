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
        titulo = _clean(r["titulo_es"])
        narracion = _clean(f"{r['guion']}  {r['veredicto']}".strip())
        parts[int(r["seq"])] = {
            "titulo": titulo,
            "segments": [
                {"kind": "title", "text": titulo},          # tarjeta del post
                {"kind": "fact", "text": narracion, "imgs": []},  # narración (sin imágenes)
            ],
            "resumen": _clean(r["veredicto"]) or titulo,
            "pregunta": _clean(r["cierre"]),
            "voice": VOZ.get(r["narrador_genero"], VOZ["F"]),
            "sfx": "sfx/pop.wav",
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
    """Título propio por historia (mejor búsqueda que 'pt. N')."""
    return f"{PARTS[part]['titulo']} | ¿Soy el Malo?"


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
