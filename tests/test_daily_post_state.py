# tests/test_daily_post_state.py
import json

import daily_post


def test_migra_estado_plano_a_por_canal(tmp_path, monkeypatch):
    # Formato actual (plano, solo canal 1) -> {"faceless": {...}, "historia": {...}}
    legacy = {
        "youtube": {"next_part": 4, "posted": [{"part": 3}]},
        "instagram": {"next_part": 3, "posted": [], "token_refreshed": "2026-09-30"},
        "tiktok": {"next_part": 2, "posted": []},
    }
    f = tmp_path / "automation_state.json"
    f.write_text(json.dumps(legacy), encoding="utf-8")
    monkeypatch.setattr(daily_post, "STATE", f)

    s = daily_post._load_state()
    assert s["faceless"]["youtube"]["next_part"] == 4
    assert s["faceless"]["instagram"]["token_refreshed"] == "2026-09-30"
    assert s["historia"]["youtube"]["next_part"] == 1
    assert s["historia"]["instagram"]["next_part"] == 1


def test_estado_nuevo_pasa_intacto(tmp_path, monkeypatch):
    nuevo = {"faceless": {"youtube": {"next_part": 7, "posted": []}},
             "historia": {"youtube": {"next_part": 2, "posted": []}}}
    f = tmp_path / "automation_state.json"
    f.write_text(json.dumps(nuevo), encoding="utf-8")
    monkeypatch.setattr(daily_post, "STATE", f)

    s = daily_post._load_state()
    assert s["faceless"]["youtube"]["next_part"] == 7
    assert s["historia"]["youtube"]["next_part"] == 2
    # Las plataformas faltantes se completan con el default
    assert s["historia"]["instagram"]["next_part"] == 1


def test_estado_vacio(tmp_path, monkeypatch):
    monkeypatch.setattr(daily_post, "STATE", tmp_path / "no_existe.json")
    s = daily_post._load_state()
    for canal in ("faceless", "historia"):
        for plat in ("youtube", "instagram", "tiktok"):
            assert s[canal][plat]["next_part"] == 1
