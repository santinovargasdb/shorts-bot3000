import importlib

from whatonearth import db


def _seed(tmp_path, monkeypatch):
    dbfile = tmp_path / "videos.sqlite"
    c = db.connect(dbfile); db.init(c)
    db.add_video(c, title="What on earth is this?! (Pangolin and more)",
                 description="hook\n\n#shorts", video_path=str(tmp_path / "woe_0001.mp4"),
                 items=[{"name": "Pangolin"}])
    c.close()
    monkeypatch.setattr(db, "DB_PATH", dbfile)
    import series_whatonearth
    return importlib.reload(series_whatonearth)


def test_interfaz_series(tmp_path, monkeypatch):
    s = _seed(tmp_path, monkeypatch)
    for attr in ("PARTS", "KEYWORDS", "title_for", "descripcion", "background_for"):
        assert hasattr(s, attr)


def test_partes_y_video_path(tmp_path, monkeypatch):
    s = _seed(tmp_path, monkeypatch)
    assert 1 in s.PARTS
    assert s.title_for(1).startswith("What on earth")
    assert s.video_path_for(1).endswith("woe_0001.mp4")
    assert "#shorts" in s.descripcion(1, "")
