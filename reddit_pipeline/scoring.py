"""Selección de historias: viral_score + filtro (spec §4.2)."""
from __future__ import annotations

from .constants import (MIN_SCORE, MIN_RATIO, MIN_WORDS, MAX_WORDS,
                        HOOK_KEYWORDS, HOOK_BONUS, FAMILY_KEYWORDS, FAMILY_BONUS)


def word_count(text: str) -> int:
    return len((text or "").split())


def viral_score(post: dict) -> float:
    """Puntaje de viralidad. 0.0 si no pasa los umbrales duros."""
    score = post.get("score", 0) or 0
    ratio = post.get("ratio", 0.0) or 0.0
    if score < MIN_SCORE or ratio < MIN_RATIO:
        return 0.0
    wc = word_count(post.get("body", ""))
    if not (MIN_WORDS <= wc <= MAX_WORDS):
        return 0.0
    num_comments = post.get("num_comments", 0) or 0
    title = (post.get("title", "") or "").lower()
    family = any(k in title for k in FAMILY_KEYWORDS)
    hook = any(k in title for k in HOOK_KEYWORDS)
    mult = FAMILY_BONUS if family else (HOOK_BONUS if hook else 1.0)
    engagement = 1 + num_comments / max(score, 1)
    return score * ratio * engagement * mult


def passes(post: dict) -> bool:
    return viral_score(post) > 0
