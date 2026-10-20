import streamers.db as db

def test_migracion_agrega_has_gameplay_idempotente(tmp_path):
    p = tmp_path / "b.sqlite"
    conn = db.connect(p); conn.close()
    conn = db.connect(p)                      # 2a vez: no debe explotar
    cols = {r[1] for r in conn.execute("PRAGMA table_info(clips)")}
    assert "has_gameplay" in cols
    conn.close()

def test_set_y_lee_gameplay(tmp_path):
    conn = db.connect(tmp_path / "b.sqlite")
    seq = db.add_clip(conn, title="t", description="d", video_path="v.mp4",
                      streamer="s", clip_id="1", status="approved")
    db.set_gameplay(conn, seq, True)
    row = db.by_status(conn, "approved")[0]
    assert row["has_gameplay"] is True
    conn.close()
