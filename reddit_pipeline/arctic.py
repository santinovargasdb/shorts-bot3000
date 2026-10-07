"""Sourcing alternativo desde Arctic Shift (archivo comunitario de Reddit).

API REST pública, SIN login / app / captcha / API key:
    GET https://arctic-shift.photon-reddit.com/api/posts/search

Notas del archivo (verificado contra la API real de Arctic Shift):
- Ordena por `created_utc` (asc/desc), NO por score. OJO: los posts recién capturados
  tienen score=1; el score se asienta recién semanas/meses después. Por eso pedimos una
  ventana VIEJA (`before` ~16 meses atrás): ahí el score ya es el final y las queries son
  más estables. El ranking por viralidad lo hace `scoring.viral_score`. Las historias de
  drama son atemporales, así que que sean "viejas" no importa.
- El archivo NO incluye `upvote_ratio` ni `is_self`. Por eso: mapeamos `ratio=1.0`
  (no filtramos por ratio) y detectamos "post de texto" por tener `selftext` con cuerpo.
- Muchos posts populares quedan "[removed]"/"[Removed by moderator]" en el archivo
  (AITA/relationship_advice borran mucho): esos los descarta `_is_text_post`.
- El server a veces responde 422 {"error":"Timeout. Maybe slow down a bit"} bajo carga:
  reintentamos con backoff.
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta

import requests

API = "https://arctic-shift.photon-reddit.com/api/posts/search"
FIELDS = "id,subreddit,title,selftext,score,num_comments,created_utc,over_18"
_SIN_CUERPO = {"", "[removed]", "[deleted]"}
_RETRYABLE = {422, 429, 500, 502, 503, 504}   # 422 = "Timeout. Maybe slow down a bit"
VENTANA_DIAS = 500   # cuánto atrás apuntar (score asentado + queries más estables)


def _is_text_post(p: dict) -> bool:
    """Post de texto usable: tiene cuerpo real, no fue removido y no es NSFW."""
    if p.get("over_18", False):
        return False
    if "removed by" in (p.get("title") or "").lower():
        return False
    return (p.get("selftext") or "").strip() not in _SIN_CUERPO


def arctic_to_dict(p: dict) -> dict:
    """Mapea un post de Arctic Shift al dict que usa el pipeline."""
    return {
        "id": p["id"],
        "subreddit": p.get("subreddit", ""),
        "title": p.get("title", ""),
        "body": p.get("selftext", ""),
        "score": int(p.get("score", 0) or 0),
        "ratio": 1.0,  # Arctic Shift no trae upvote_ratio -> no se filtra por ratio
        "num_comments": int(p.get("num_comments", 0) or 0),
        "created_utc": float(p.get("created_utc", 0) or 0),
    }


def _default_before() -> str:
    return (datetime.now() - timedelta(days=VENTANA_DIAS)).strftime("%Y-%m-%d")


def _get(session, subreddit: str, limit, sort: str, before: str,
         retries: int = 3, backoff: float = 5.0) -> list[dict]:
    """GET con reintento sobre errores transitorios (incluye el 422 'Timeout' del server)."""
    r = None
    for attempt in range(retries + 1):
        if attempt:
            time.sleep(backoff)
        r = session.get(API, params={"subreddit": subreddit, "limit": limit, "sort": sort,
                                      "before": before, "fields": FIELDS}, timeout=90)
        if r.status_code == 200:
            data = r.json()
            return (data["data"] if isinstance(data, dict) else data) or []
        if r.status_code not in _RETRYABLE:
            r.raise_for_status()
    r.raise_for_status()   # agotó los reintentos sobre un error retryable
    return []


def fetch_posts_arctic(subreddits: list[str], limit=100, sort: str = "desc",
                       before: str | None = None, session=None, pause: float = 2.0,
                       retries: int = 3, backoff: float = 5.0) -> list[dict]:
    """Trae posts de texto (con cuerpo, no NSFW, no removidos) de cada subreddit vía
    Arctic Shift, de una ventana vieja (score asentado). `pause` = cortesía entre
    subreddits. Un subreddit que falla (tras reintentos) se saltea y no corta el resto."""
    session = session or requests.Session()
    before = before or _default_before()
    out: list[dict] = []
    for i, name in enumerate(subreddits):
        if i:
            time.sleep(pause)
        try:
            for p in _get(session, name, limit, sort, before, retries, backoff):
                if _is_text_post(p):
                    out.append(arctic_to_dict(p))
        except Exception as e:  # red / rate-limit / timeout agotado / subreddit inexistente
            print(f"  [arctic] r/{name} falló: {e}")
    return out
