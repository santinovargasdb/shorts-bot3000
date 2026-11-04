"""Dedup de temas: evita que el generador repita datos ya cubiertos (hardcodeados o generados).
El tema de un dato generado viene en su campo 'topic'; el de los hardcodeados se deriva del
primer término de imagen de cada fact (proxy razonable del sujeto).

Ojo: el LLM nombra el MISMO sujeto distinto cada vez ("Flamencos rosados", "flamencos",
"Flamingo"), así que la comparación es por CLAVE normalizada (minúsculas, sin acentos, sin
plurales) del topic Y del 1er término de imagen (el sujeto en inglés de Wikipedia), y una clave
de una sola palabra tapa a las compuestas que la contienen ("flamingo" ⊂ "american flamingo")."""
from __future__ import annotations

import re
import unicodedata


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def key(s: str) -> str:
    """Clave de sujeto: norm + sin acentos + sin signos + cada palabra en singular."""
    t = unicodedata.normalize("NFKD", norm(s))
    t = "".join(c for c in t if not unicodedata.combining(c))
    words = re.findall(r"[a-z0-9ñ]+", t)
    return " ".join(w[:-1] if len(w) > 3 and w.endswith("s") else w for w in words)


def keys_of(dato: dict) -> set:
    """Claves de un dato: su topic y su sujeto de imagen principal."""
    out = {key(dato.get("topic", ""))}
    if dato.get("imgs"):
        out.add(key(dato["imgs"][0]))
    return {k for k in out if k}


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


def is_used(dato: dict, used: set) -> bool:
    # Se bloquea el MISMO sujeto (clave exacta normalizada del topic o del sujeto de imagen). No por
    # contención de palabras: "stomach anatomy" bloqueaba todo dato sobre el estómago y un episodio
    # de cuerpo humano quedaba con 2 datos. Los repetidos reales (flamingo, Turritopsis, pistol
    # shrimp, wood frog, hummingbird) eran todos coincidencia exacta del sujeto.
    used_keys = {key(u) for u in used}
    if any(k in used_keys for k in keys_of(dato)):
        return True
    # Mismo GÉNERO con otro nombre ("armillaria ostoyae" vs "armillaria fungus"): solo entre nombres
    # de 2+ palabras y con una 1ª palabra distintiva (no "giant", "human", "lake"...).
    used_first = {u.split()[0] for u in used_keys if " " in u}
    for k in keys_of(dato):
        w = k.split()
        if len(w) >= 2 and len(w[0]) >= 6 and w[0] not in _GENERICOS and w[0] in used_first:
            return True
    return False


_GENERICOS = {
    "giant", "great", "common", "human", "african", "american", "european", "asian", "golden",
    "black", "white", "green", "purple", "orange", "yellow", "silver", "little", "lesser",
    "greater", "ancient", "northern", "southern", "eastern", "western", "desert", "island",
    "ocean", "planet", "mount", "river", "forest", "domestic", "atlantic", "pacific", "arctic",
    "antarctic", "tropical", "mountain", "volcanic", "frozen", "blood", "animal", "flower",
}


def dedup(datos: list, used: set) -> list:
    """Filtra los datos ya usados y también los repetidos DENTRO del mismo episodio."""
    out, vistos = [], set(used)
    for d in datos:
        if is_used(d, vistos):
            continue
        out.append(d)
        vistos.add(d.get("topic", ""))
        if d.get("imgs"):
            vistos.add(d["imgs"][0])
    return out
