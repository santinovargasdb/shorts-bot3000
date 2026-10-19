"""Los backlogs de clips (streamers) tienen HUECOS en los seq aprobados (ej. [8,9,11,12,17...]):
los clips rechazados por el QC consumen número. daily_post debe postear la primera parte
DISPONIBLE >= next_part y avanzar salteando los huecos, sin trabarse. Para los canales de
numeración contigua (faceless/historia/misterios/soyelmalo) el comportamiento no cambia."""
import json
import types

import daily_post
import uploaders.youtube_upload as ytu


def _series(keys):
    return types.SimpleNamespace(PARTS={k: {} for k in keys})


# ---------- helper puro ----------

def test_next_available_part_cuando_existe():
    assert daily_post._next_available_part(8, _series([8, 9, 11])) == 8


def test_next_available_part_salta_hueco():
    assert daily_post._next_available_part(10, _series([8, 9, 11, 12])) == 11


def test_next_available_part_contiguo_no_cambia():
    assert daily_post._next_available_part(1, _series([1, 2, 3])) == 1


def test_next_available_part_agotado_devuelve_none():
    assert daily_post._next_available_part(13, _series([8, 9, 11, 12])) is None


# ---------- integración en do_youtube ----------

def _video(tmp_path):
    v = tmp_path / "p.mp4"
    v.write_bytes(b"\x00")
    v.with_suffix(".json").write_text(json.dumps({"title": "T", "description": "g.\n\n#x"}),
                                      encoding="utf-8")
    return v


def _wire_yt(tmp_path, monkeypatch):
    v = _video(tmp_path)
    monkeypatch.setattr(daily_post, "_ensure_video", lambda part, ctx, series: v)
    posted = {}
    monkeypatch.setattr(ytu, "upload_from_folder",
                        lambda video, privacy, token_file: posted.setdefault("yes", True) or "vid123")
    return posted


def test_yt_arranca_en_la_primera_parte_disponible(tmp_path, monkeypatch):
    _wire_yt(tmp_path, monkeypatch)
    st = {"youtube": {"next_part": 1, "posted": []}}      # nunca posteó -> next_part 1
    ctx = {"name": "streamers_a", "yt_token": None, "platforms": ("yt",)}
    daily_post.do_youtube(st, ctx, _series([8, 9, 11]))   # pero el primer aprobado es 8
    assert st["youtube"]["posted"][0]["part"] == 8        # postea 8, no se traba en "no hay parte 1"
    assert st["youtube"]["next_part"] == 9


def test_yt_salta_el_hueco_al_avanzar(tmp_path, monkeypatch):
    _wire_yt(tmp_path, monkeypatch)
    st = {"youtube": {"next_part": 10, "posted": []}}      # 10 no existe (hueco)
    ctx = {"name": "streamers_a", "yt_token": None, "platforms": ("yt",)}
    daily_post.do_youtube(st, ctx, _series([8, 9, 11, 12]))
    assert st["youtube"]["posted"][0]["part"] == 11        # salta el hueco al 11
    assert st["youtube"]["next_part"] == 12


def test_yt_no_postea_si_no_quedan_partes(tmp_path, monkeypatch):
    posted = _wire_yt(tmp_path, monkeypatch)
    st = {"youtube": {"next_part": 13, "posted": []}}
    ctx = {"name": "streamers_a", "yt_token": None, "platforms": ("yt",)}
    daily_post.do_youtube(st, ctx, _series([8, 9, 11, 12]))
    assert "yes" not in posted                             # no subió nada
    assert st["youtube"]["next_part"] == 13                # no avanza
