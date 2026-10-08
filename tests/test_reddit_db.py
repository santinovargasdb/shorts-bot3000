import sqlite3
import pytest
import reddit_pipeline.db as db

SAMPLE = {
    "id": "abc1", "subreddit": "pettyrevenge", "title": "AITA for X",
    "body": "una historia larga", "score": 5000, "ratio": 0.97,
    "num_comments": 320, "created_utc": 1700000000.0,
}


def test_insert_and_dedup(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    assert db.insert_story(conn, SAMPLE) is True
    assert db.insert_story(conn, SAMPLE) is False      # dedup por id
    assert db.story_exists(conn, "abc1") is True
    assert db.story_exists(conn, "nope") is False


def test_status_flow(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, SAMPLE)
    assert [s["id"] for s in db.get_by_status(conn, "sourced")] == ["abc1"]
    db.save_viral_score(conn, "abc1", 1234.5, "filtered")
    assert db.get_by_status(conn, "sourced") == []
    got = db.get_by_status(conn, "filtered")
    assert got[0]["viral_score"] == 1234.5


def test_save_rewrite(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, SAMPLE)
    db.save_rewrite(conn, "abc1", {
        "guion": "un guion", "narrador_genero": "F",
        "titulo": "Mi ex", "veredicto": "se pasó", "cierre": "¿vos qué harías?"})
    r = db.get_by_status(conn, "rewritten")[0]
    assert r["narrador_genero"] == "F"
    assert r["titulo_es"] == "Mi ex"
    assert r["guion"] == "un guion"
    assert r["status"] == "rewritten"


def test_save_rewrite_rechaza_genero_invalido(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, SAMPLE)
    with pytest.raises(sqlite3.IntegrityError):
        db.save_rewrite(conn, "abc1", {"guion": "g", "narrador_genero": "X",
                                       "titulo": "t", "veredicto": "v", "cierre": "c"})


def test_set_status(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, SAMPLE)
    db.set_status(conn, "abc1", "produced")
    assert [s["id"] for s in db.get_by_status(conn, "produced")] == ["abc1"]


def _rw(genero="F", titulo="t"):
    return {"guion": "g", "narrador_genero": genero,
            "titulo": titulo, "veredicto": "v", "cierre": "c"}


def test_save_rewrite_asigna_seq_monotonico(tmp_path):
    """Cada reescritura recibe un seq entero, creciente y estable (1, 2, 3...).
    Es la clave que usa daily_post como 'número de parte' (next_part)."""
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, {**SAMPLE, "id": "a"})
    db.insert_story(conn, {**SAMPLE, "id": "b"})
    db.save_rewrite(conn, "a", _rw(titulo="Primera"))
    db.save_rewrite(conn, "b", _rw(titulo="Segunda"))
    seqs = {r["id"]: r["seq"] for r in db.rewritten_by_seq(conn)}
    assert seqs == {"a": 1, "b": 2}


def test_rewritten_by_seq_ordena_por_seq(tmp_path):
    """Devuelve SOLO las historias con seq, ordenadas por seq asc, con todos los campos."""
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, {**SAMPLE, "id": "a"})
    db.insert_story(conn, {**SAMPLE, "id": "b"})
    db.insert_story(conn, {**SAMPLE, "id": "c"})      # queda sin reescribir (sin seq)
    db.save_rewrite(conn, "b", _rw(titulo="Segunda"))
    db.save_rewrite(conn, "a", _rw(titulo="Primera"))
    rows = db.rewritten_by_seq(conn)
    assert [r["id"] for r in rows] == ["b", "a"]        # por seq (orden de reescritura)
    assert [r["seq"] for r in rows] == [1, 2]
    assert rows[0]["titulo_es"] == "Segunda"


def test_migracion_agrega_seq_y_backfill(tmp_path):
    """Una DB vieja (sin columna seq) con historias ya reescritas: connect() debe
    agregar la columna y backfillear un seq a las rewritten por viral_score desc."""
    p = tmp_path / "old.sqlite"
    old = sqlite3.connect(str(p))
    old.execute("""CREATE TABLE stories (
        id TEXT PRIMARY KEY, subreddit TEXT, title TEXT, body TEXT, score INTEGER,
        ratio REAL, num_comments INTEGER, created_utc REAL,
        status TEXT NOT NULL DEFAULT 'sourced', viral_score REAL, guion TEXT,
        narrador_genero TEXT, titulo_es TEXT, veredicto TEXT, cierre TEXT)""")
    old.execute("INSERT INTO stories (id, status, viral_score, titulo_es) "
                "VALUES ('low', 'rewritten', 10.0, 'Baja')")
    old.execute("INSERT INTO stories (id, status, viral_score, titulo_es) "
                "VALUES ('high', 'rewritten', 99.0, 'Alta')")
    old.commit()
    old.close()

    conn = db.connect(p)                         # <- migra
    cols = [c[1] for c in conn.execute("PRAGMA table_info(stories)").fetchall()]
    assert "seq" in cols
    seqs = {r["id"]: r["seq"] for r in db.rewritten_by_seq(conn)}
    assert seqs == {"high": 1, "low": 2}         # el de mayor viral_score primero
