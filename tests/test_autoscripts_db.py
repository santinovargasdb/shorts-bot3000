import autoscripts.db as db


def test_add_and_by_status(tmp_path):
    conn = db.connect(tmp_path / "faceless.sqlite")
    ep = {"pregunta": "¿?", "resumen": "r", "segments": [{"kind": "fact", "text": "t", "imgs": ["a", "b"]}]}
    seq = db.add_episode(conn, episode=ep, topic_keys=["tema uno"], status="approved")
    assert seq == 1
    rows = db.by_status(conn, "approved")
    assert len(rows) == 1
    assert rows[0]["episode"] == ep and rows[0]["topic_keys"] == ["tema uno"]


def test_set_status_and_used_topics(tmp_path, monkeypatch):
    path = tmp_path / "faceless.sqlite"
    monkeypatch.setattr(db, "DB_PATH", lambda ch: path)
    conn = db.connect(path)
    db.add_episode(conn, episode={"x": 1}, topic_keys=["t1", "t2"], status="approved")
    s = db.add_episode(conn, episode={"x": 2}, topic_keys=["t3"], status="pending")
    db.set_status(conn, s, "rejected")
    conn.close()
    assert db.used_topics_db("faceless") == {"t1", "t2"}        # solo approved
    assert [e["x"] for e in db.approved_episodes("faceless")] == [1]


def test_approved_episodes_sin_db_devuelve_vacio(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "nope.sqlite")
    assert db.approved_episodes("faceless") == []
    assert db.used_topics_db("faceless") == set()


def test_add_episode_guarda_la_fuente(tmp_path):
    conn = db.connect(tmp_path / "x.sqlite")
    seq = db.add_episode(conn, episode={"x": 1}, topic_keys=["t"], status="rejected", source="FUENTE")
    assert conn.execute("SELECT source FROM episodes WHERE seq = ?", (seq,)).fetchone()["source"] == "FUENTE"


def test_connect_migra_una_base_vieja_sin_perder_datos(tmp_path):
    import sqlite3
    path = tmp_path / "vieja.sqlite"
    old = sqlite3.connect(path)
    old.execute("CREATE TABLE episodes (seq INTEGER PRIMARY KEY AUTOINCREMENT, episode_json TEXT NOT NULL, "
                "topic_keys TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', qc_note TEXT, created_utc TEXT)")
    old.execute("INSERT INTO episodes (episode_json, topic_keys, status) VALUES ('{\"x\": 1}', '[\"t\"]', 'approved')")
    old.commit()
    old.close()
    conn = db.connect(path)
    assert db.by_status(conn, "approved")[0]["episode"] == {"x": 1}
    db.add_episode(conn, episode={"x": 2}, topic_keys=["u"], source="F")
    conn.close()
    assert db.connect(path).execute("SELECT count(*) AS n FROM episodes").fetchone()["n"] == 2
