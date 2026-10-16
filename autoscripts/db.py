"""Store sqlite de episodios generados por canal: autoscripts/<canal>.sqlite. Guarda el episodio
como JSON + sus topic_keys (para dedup). Solo 'approved' se mergea en la serie."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS episodes (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_json TEXT NOT NULL,
    topic_keys TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    qc_note TEXT,
    created_utc TEXT
);
"""


def DB_PATH(channel: str) -> Path:
    return ROOT / "autoscripts" / f"{channel}.sqlite"


def connect(path) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    conn.commit()
    return conn


def add_episode(conn, *, episode: dict, topic_keys: list, status: str = "pending",
                qc_note: str = "") -> int:
    cur = conn.execute(
        "INSERT INTO episodes (episode_json, topic_keys, status, qc_note, created_utc) "
        "VALUES (?, ?, ?, ?, datetime('now'))",
        (json.dumps(episode, ensure_ascii=False), json.dumps(topic_keys, ensure_ascii=False),
         status, qc_note))
    conn.commit()
    return int(cur.lastrowid)


def _row(r) -> dict:
    return {"seq": r["seq"], "episode": json.loads(r["episode_json"]),
            "topic_keys": json.loads(r["topic_keys"]), "status": r["status"],
            "qc_note": r["qc_note"]}


def by_status(conn, status: str) -> list:
    return [_row(r) for r in conn.execute(
        "SELECT * FROM episodes WHERE status = ? ORDER BY seq ASC", (status,))]


def set_status(conn, seq: int, status: str) -> None:
    conn.execute("UPDATE episodes SET status = ? WHERE seq = ?", (status, seq))
    conn.commit()


def approved_episodes(channel: str) -> list:
    path = DB_PATH(channel)
    if not path.exists():
        return []
    conn = connect(path)
    try:
        return [r["episode"] for r in by_status(conn, "approved")]
    finally:
        conn.close()


def used_topics_db(channel: str) -> set:
    path = DB_PATH(channel)
    if not path.exists():
        return set()
    conn = connect(path)
    try:
        out = set()
        for r in by_status(conn, "approved"):
            out.update(r["topic_keys"])
        return out
    finally:
        conn.close()
