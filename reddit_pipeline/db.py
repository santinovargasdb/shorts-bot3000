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
    narrador_genero TEXT CHECK(narrador_genero IN ('M','F')),
    titulo_es       TEXT,
    veredicto       TEXT,
    cierre          TEXT,
    seq             INTEGER
);
"""


def _migrate(conn: sqlite3.Connection) -> None:
    """Migración idempotente: agrega la columna `seq` si falta (DBs viejas) y
    backfillea un seq a las historias ya reescritas, por viral_score desc."""
    cols = [c[1] for c in conn.execute("PRAGMA table_info(stories)").fetchall()]
    if "seq" in cols:
        return
    conn.execute("ALTER TABLE stories ADD COLUMN seq INTEGER")
    pend = conn.execute(
        "SELECT id FROM stories WHERE status = 'rewritten' AND seq IS NULL "
        "ORDER BY viral_score DESC, id ASC").fetchall()
    for i, row in enumerate(pend, 1):
        conn.execute("UPDATE stories SET seq = ? WHERE id = ?", (i, row["id"]))
    conn.commit()


def connect(db_path: Path | str) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    conn.commit()
    _migrate(conn)
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
    """Guarda la reescritura y, si la historia aún no tenía, le asigna un `seq`
    monotónico (= siguiente MAX(seq)+1). Ese seq es el 'número de parte' estable
    que consume daily_post; no cambia aunque después se reescriban más historias."""
    conn.execute(
        "UPDATE stories SET guion = :guion, narrador_genero = :narrador_genero, "
        "titulo_es = :titulo, veredicto = :veredicto, cierre = :cierre, "
        "status = 'rewritten', "
        "seq = COALESCE(seq, (SELECT COALESCE(MAX(seq), 0) FROM stories) + 1) "
        "WHERE id = :id",
        {**rw, "id": post_id},
    )
    conn.commit()


def revert_to_filtered(conn: sqlite3.Connection, min_seq: int) -> int:
    """Devuelve las historias con seq >= min_seq al pool 'filtered' (limpia la
    reescritura y el seq; conserva viral_score). Las de seq < min_seq (ya posteadas)
    no se tocan. Útil para refrescar el backlog con un formato nuevo. Devuelve cuántas."""
    cur = conn.execute(
        "UPDATE stories SET status='filtered', guion=NULL, narrador_genero=NULL, "
        "titulo_es=NULL, veredicto=NULL, cierre=NULL, seq=NULL "
        "WHERE seq IS NOT NULL AND seq >= ?", (min_seq,))
    conn.commit()
    return cur.rowcount


def rewritten_by_seq(conn: sqlite3.Connection) -> list[dict]:
    """Historias con seq asignado (= ya reescritas), ordenadas por seq asc.
    Es el backlog que recorre el canal de Reddit, parte 1, 2, 3..."""
    cur = conn.execute("SELECT * FROM stories WHERE seq IS NOT NULL ORDER BY seq ASC")
    return [dict(row) for row in cur.fetchall()]
