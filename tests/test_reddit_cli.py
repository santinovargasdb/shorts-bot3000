import reddit_pipeline.db as db
import reddit_pipeline.__main__ as cli


def _mk(conn, pid, **kw):
    base = {"id": pid, "subreddit": "x", "title": "AITA", "body": " ".join(["w"] * 300),
            "score": 5000, "ratio": 0.97, "num_comments": 300, "created_utc": 1.0}
    base.update(kw)
    db.insert_story(conn, base)


def test_cmd_filter_marca_estados(tmp_path):
    p = tmp_path / "s.sqlite"
    conn = db.connect(p)
    _mk(conn, "good")
    _mk(conn, "bad", title="t", body="corto", score=10, ratio=0.5, num_comments=0)
    conn.close()
    cli.cmd_filter(db_path=p)
    conn = db.connect(p)
    assert [s["id"] for s in db.get_by_status(conn, "filtered")] == ["good"]
    assert [s["id"] for s in db.get_by_status(conn, "rejected")] == ["bad"]


def test_cmd_rewrite_guarda(tmp_path, monkeypatch):
    p = tmp_path / "s.sqlite"
    conn = db.connect(p)
    _mk(conn, "good")
    db.save_viral_score(conn, "good", 10.0, "filtered")
    conn.close()
    monkeypatch.setattr(cli.rewrite, "build_client", lambda: object())
    monkeypatch.setattr(cli.rewrite, "model_name", lambda: "m")
    monkeypatch.setattr(cli.rewrite, "rewrite_story",
                        lambda post, client, model: {
                            "guion": "g", "narrador_genero": "M",
                            "titulo": "T", "veredicto": "v", "cierre": "c"})
    cli.cmd_rewrite(5, db_path=p)
    conn = db.connect(p)
    r = db.get_by_status(conn, "rewritten")
    assert r and r[0]["narrador_genero"] == "M"
