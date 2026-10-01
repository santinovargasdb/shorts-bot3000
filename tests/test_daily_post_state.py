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


def test_migra_formato_prehistorico(tmp_path, monkeypatch):
    # Formato prehistórico (solo YT, sin canal) -> faceless.youtube.next_part
    prehistorico = {"next_part": 7, "posted": []}
    f = tmp_path / "automation_state.json"
    f.write_text(json.dumps(prehistorico), encoding="utf-8")
    monkeypatch.setattr(daily_post, "STATE", f)

    s = daily_post._load_state()
    assert s["faceless"]["youtube"]["next_part"] == 7
    # Las demás plataformas deben arrancar desde 1
    assert s["faceless"]["instagram"]["next_part"] == 1
    assert s["faceless"]["tiktok"]["next_part"] == 1


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
    for canal in ("faceless", "historia", "misterios"):
        for plat in ("youtube", "instagram", "tiktok"):
            assert s[canal][plat]["next_part"] == 1


def test_save_state_por_canal(tmp_path, monkeypatch):
    """_save_state(state, channel) solo sobreescribe la clave del canal indicado,
    preservando las demás tal como estén en disco (simula escritura concurrente)."""
    state_file = tmp_path / "automation_state.json"
    monkeypatch.setattr(daily_post, "STATE", state_file)

    # Estado inicial en disco: faceless next_part=3, historia next_part=1
    inicial = {
        "faceless": {"youtube": {"next_part": 3, "posted": []},
                     "instagram": {"next_part": 1, "posted": []},
                     "tiktok": {"next_part": 1, "posted": []}},
        "historia": {"youtube": {"next_part": 1, "posted": []},
                     "instagram": {"next_part": 1, "posted": []},
                     "tiktok": {"next_part": 1, "posted": []}},
    }
    state_file.write_text(json.dumps(inicial), encoding="utf-8")

    # Proceso A carga el estado y avanza historia en memoria
    state = daily_post._load_state()
    state["historia"]["youtube"]["next_part"] = 2

    # Mientras tanto, otro proceso ya actualizó faceless en disco (next_part 3->4)
    disco_actual = json.loads(state_file.read_text(encoding="utf-8"))
    disco_actual["faceless"]["youtube"]["next_part"] = 4
    state_file.write_text(json.dumps(disco_actual), encoding="utf-8")

    # Proceso A guarda solo su canal (historia)
    daily_post._save_state(state, "historia")

    # Verificar resultado final
    resultado = json.loads(state_file.read_text(encoding="utf-8"))
    # faceless debe conservar el valor que el otro proceso escribió (4)
    assert resultado["faceless"]["youtube"]["next_part"] == 4
    # historia debe tener el valor nuevo (2)
    assert resultado["historia"]["youtube"]["next_part"] == 2
