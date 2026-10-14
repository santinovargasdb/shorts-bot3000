"""Backlog de shorts de streamers (SQLite, una db por canal A/B). seq monótono = nº de
parte estable. `clip_id` = id del clip de Twitch (dedup). `status` = flujo de aprobación:
  pending  -> recién armado, espera tu visto bueno
  approved -> aprobado, daily_post lo postea
  rejected -> descartado (el clip_id queda 'usado' para no re-elegirlo)
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS clips (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    video_path TEXT NOT NULL,
    streamer TEXT NOT NULL,
    clip_id TEXT NOT NULL UNIQUE,
    views INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_utc TEXT
);
"""


def connect(path) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    cols = {r[1] for r in conn.execute("PRAGMA table_info(clips)")}
    if "status" not in cols:                       # migración de db vieja (sin aprobación)
        conn.execute("ALTER TABLE clips ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'")
    conn.commit()
    return conn


def add_clip(conn, *, title, description, video_path, streamer, clip_id,
             views=0, status="pending") -> int:
    cur = conn.execute(
        "INSERT INTO clips (title, description, video_path, streamer, clip_id, views, status,"
        " created_utc) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
        (title, description, video_path, streamer, clip_id, int(views or 0), status),
    )
    conn.commit()
    return int(cur.lastrowid)


def _row(r) -> dict:
    return {"seq": r["seq"], "title": r["title"], "description": r["description"],
            "video_path": r["video_path"], "streamer": r["streamer"], "clip_id": r["clip_id"],
            "views": r["views"], "status": r["status"], "created_utc": r["created_utc"]}


def all_clips(conn) -> list:
    return [_row(r) for r in conn.execute("SELECT * FROM clips ORDER BY seq ASC")]


def by_status(conn, status: str) -> list:
    return [_row(r) for r in conn.execute(
        "SELECT * FROM clips WHERE status = ? ORDER BY seq ASC", (status,))]


def set_status(conn, seq: int, status: str) -> None:
    conn.execute("UPDATE clips SET status = ? WHERE seq = ?", (status, seq))
    conn.commit()


def used_clip_ids(conn) -> set:
    """Todos los clip_id ya vistos (pending/approved/rejected) -> no re-elegir ninguno."""
    return {r["clip_id"] for r in conn.execute("SELECT clip_id FROM clips")}
