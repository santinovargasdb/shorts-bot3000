"""Dedup de temas: evita que el generador repita datos ya cubiertos (hardcodeados o generados).
El tema de un dato generado viene en su campo 'topic'; el de los hardcodeados se deriva del
primer término de imagen de cada fact (proxy razonable del sujeto)."""
from __future__ import annotations

import re


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def hardcoded_topics() -> set:
    import series_data
    out = set()
    for part in series_data.PARTS.values():
        for seg in part.get("segments", []):
            if seg.get("kind") == "fact" and seg.get("imgs"):
                out.add(norm(seg["imgs"][0]))
    return out


def used_topics(channel: str) -> set:
    from autoscripts import db
    return hardcoded_topics() | db.used_topics_db(channel)


def dedup(datos: list, used: set) -> list:
    return [d for d in datos if norm(d.get("topic", "")) not in used]
