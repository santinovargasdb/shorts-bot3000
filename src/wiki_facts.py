# src/wiki_facts.py
"""Trae el resumen (intro) de un articulo de Wikipedia como texto plano, para GROUNDING de los
relatos de historia/misterios: el LLM escribe sobre hechos reales en vez de inventar. Reusa el
mismo trato de Wikipedia que src/stock.py (User-Agent, pacing anti-429, reintentos, cache)."""
from __future__ import annotations

import time

import requests

_UA = {"User-Agent": "shorts-bot/1.0 (https://github.com/santinovargasdb/shorts-bot3000)"}
_API = "https://{lang}.wikipedia.org/w/api.php"
_MIN_INTERVAL = 0.4          # seg minimos entre pedidos (cortesia anti-429)
_last_req = [0.0]
_CACHE: dict = {}            # subject -> resumen (o None)


def _pace() -> None:
    elapsed = time.monotonic() - _last_req[0]
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_req[0] = time.monotonic()


def _extract_from_response(data: dict) -> str | None:
    """Texto del intro (prop=extracts) de la 1a pagina, o None si vacio."""
    pages = (data or {}).get("query", {}).get("pages", {})
    for pg in pages.values():
        extract = (pg.get("extract") or "").strip()
        if extract:
            return extract
    return None


def _fetch_one(subject: str, lang: str) -> str | None:
    """Pide el intro de Wikipedia en UN idioma. None si no hay articulo/extract o si falla."""
    params = {"action": "query", "format": "json", "prop": "extracts",
              "exintro": 1, "explaintext": 1, "redirects": 1,
              "generator": "search", "gsrsearch": subject, "gsrlimit": 1}
    url = _API.format(lang=lang)
    for attempt in range(4):
        try:
            _pace()
            r = requests.get(url, params=params, timeout=30, headers=_UA)
            if r.status_code == 429:
                time.sleep(2.0 * (attempt + 1)); continue
            r.raise_for_status()
            return _extract_from_response(r.json())
        except requests.RequestException:
            time.sleep(1.0 * (attempt + 1))
    return None


def fetch_summary(subject: str, lang: str = "es", max_chars: int = 2000) -> str | None:
    """Resumen (intro) de Wikipedia para `subject`, texto plano capeado a `max_chars`. Prueba
    `lang` (es por defecto) y cae a ingles. None si no hay articulo en ninguno. Cachea el resultado."""
    subject = (subject or "").strip()
    if not subject:
        return None
    if subject in _CACHE:
        return _CACHE[subject]
    result = _fetch_one(subject, lang)
    if not result and lang != "en":
        result = _fetch_one(subject, "en")
    if result:
        result = result[:max_chars].strip()
    _CACHE[subject] = result
    return result
