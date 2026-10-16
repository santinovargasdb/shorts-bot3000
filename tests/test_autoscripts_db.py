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
