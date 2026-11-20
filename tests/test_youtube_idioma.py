"""El idioma declarado en el .json llega al snippet de la subida."""
import json

import uploaders.youtube_upload as yu


def _clip(tmp_path, meta):
    clip = tmp_path / "v.mp4"
    clip.write_bytes(b"x")
    clip.with_suffix(".json").write_text(json.dumps(meta), encoding="utf-8")
    return clip


def test_upload_from_folder_pasa_el_idioma(tmp_path, monkeypatch):
    cap = {}
    monkeypatch.setattr(yu, "upload", lambda *a, **kw: cap.update(kw) or "id")
    yu.upload_from_folder(_clip(tmp_path, {"title": "T", "language": "es"}))
    assert cap["language"] == "es"


def test_sin_idioma_en_el_json_no_se_declara(tmp_path, monkeypatch):
    cap = {}
    monkeypatch.setattr(yu, "upload", lambda *a, **kw: cap.update(kw) or "id")
    yu.upload_from_folder(_clip(tmp_path, {"title": "T"}))
    assert cap["language"] is None
