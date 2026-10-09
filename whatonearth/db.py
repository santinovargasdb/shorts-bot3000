"""Backlog de videos de What On Earth (SQLite). seq monótono = nº de parte estable."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "whatonearth" / "videos.sqlite"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    video_path TEXT NOT NULL,
    items_json TEXT NOT NULL,
    created_utc TEXT
);
"""


def connect(path=DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def init(conn) -> None:
    conn.executescript(_SCHEMA)
    conn.commit()


def add_video(conn, *, title: str, description: str, video_path: str, items: list) -> int:
    cur = conn.execute(
        "INSERT INTO videos (title, description, video_path, items_json, created_utc) "
        "VALUES (?, ?, ?, ?, datetime('now'))",
        (title, description, video_path, json.dumps(items, ensure_ascii=False)),
    )
    conn.commit()
    return int(cur.lastrowid)


def _row(r) -> dict:
    return {
        "seq": r["seq"], "title": r["title"], "description": r["description"],
        "video_path": r["video_path"], "items": json.loads(r["items_json"]),
        "created_utc": r["created_utc"],
    }


def all_videos(conn) -> list:
    return [_row(r) for r in conn.execute("SELECT * FROM videos ORDER BY seq ASC")]


def video_by_seq(conn, seq: int):
    r = conn.execute("SELECT * FROM videos WHERE seq = ?", (seq,)).fetchone()
    return _row(r) if r else None
