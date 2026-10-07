"""Sourcing de historias desde Reddit con PRAW (API oficial, tier gratis, solo lectura)."""
from __future__ import annotations

import os

from .env import load_env


def build_reddit():
    """Crea el cliente PRAW desde el .env (app tipo 'script')."""
    load_env()
    import praw  # import tardío: los tests de mapeo/filtrado no necesitan praw instalado
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        user_agent=os.environ.get("REDDIT_USER_AGENT", "soyelmalo/0.1 by u/anon"),
    )


def submission_to_dict(sub) -> dict:
    """Mapea un submission de PRAW al dict que usa el pipeline."""
    return {
        "id": sub.id,
        "subreddit": str(sub.subreddit),
        "title": sub.title,
        "body": sub.selftext,
        "score": int(sub.score),
        "ratio": float(sub.upvote_ratio),
        "num_comments": int(sub.num_comments),
        "created_utc": float(sub.created_utc),
    }


def fetch_posts(reddit, subreddits: list[str], limit: int = 50,
                time_filter: str = "month") -> list[dict]:
    """Trae posts de texto, no fijados, no NSFW, de cada subreddit (top)."""
    out: list[dict] = []
    for name in subreddits:
        for sub in reddit.subreddit(name).top(time_filter=time_filter, limit=limit):
            if getattr(sub, "stickied", False) or getattr(sub, "over_18", False):
                continue
            if not getattr(sub, "is_self", False):
                continue
            out.append(submission_to_dict(sub))
    return out
