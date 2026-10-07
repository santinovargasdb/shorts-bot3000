"""Capa de datos del pipeline: SQLite con el estado de cada historia.
Estados: sourced -> filtered -> rewritten -> produced -> posted (o 'rejected')."""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS stories (
    id              TEXT PRIMARY KEY,
    subreddit       TEXT,
    title           TEXT,
    body            TEXT,
    score           INTEGER,
    ratio           REAL,
    num_comments    INTEGER,
    created_utc     REAL,
    status          TEXT NOT NULL DEFAULT 'sourced',
    viral_score     REAL,
    guion           TEXT,
    narrador_genero TEXT,
    titulo_es       TEXT,
    veredicto       TEXT,
    cierre          TEXT
);
"""


def connect(db_path: Path | str) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    conn.commit()
    return conn


def insert_story(conn: sqlite3.Connection, post: dict) -> bool:
    """Inserta una historia nueva (status 'sourced'). False si ya existía (dedup por id)."""
    try:
        conn.execute(
            "INSERT INTO stories (id, subreddit, title, body, score, ratio, "
            "num_comments, created_utc, status) VALUES "
            "(:id, :subreddit, :title, :body, :score, :ratio, "
            ":num_comments, :created_utc, 'sourced')",
            post,
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def story_exists(conn: sqlite3.Connection, post_id: str) -> bool:
    cur = conn.execute("SELECT 1 FROM stories WHERE id = ?", (post_id,))
    return cur.fetchone() is not None


def get_by_status(conn: sqlite3.Connection, status: str) -> list[dict]:
    cur = conn.execute(
        "SELECT * FROM stories WHERE status = ? ORDER BY viral_score DESC", (status,))
    return [dict(row) for row in cur.fetchall()]


def set_status(conn: sqlite3.Connection, post_id: str, status: str) -> None:
    conn.execute("UPDATE stories SET status = ? WHERE id = ?", (status, post_id))
    conn.commit()


def save_viral_score(conn: sqlite3.Connection, post_id: str,
                     score: float, status: str) -> None:
    conn.execute("UPDATE stories SET viral_score = ?, status = ? WHERE id = ?",
                 (score, status, post_id))
    conn.commit()


def save_rewrite(conn: sqlite3.Connection, post_id: str, rw: dict) -> None:
    conn.execute(
        "UPDATE stories SET guion = :guion, narrador_genero = :narrador_genero, "
        "titulo_es = :titulo, veredicto = :veredicto, cierre = :cierre, "
        "status = 'rewritten' WHERE id = :id",
        {**rw, "id": post_id},
    )
    conn.commit()
