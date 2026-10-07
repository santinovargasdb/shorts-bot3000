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
