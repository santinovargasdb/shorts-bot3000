"""Healthcheck: detecta canales que dejaron de subir (silencio > umbral) y arma el aviso.
Funciones puras (now/state inyectados) -> deterministas, sin reloj ni red."""
from datetime import datetime

from autobuild.healthcheck import (
    Status, classify, hint_for, last_post_dt, monitored_pairs, render, should_email,
)

NOW = datetime(2026, 10, 21, 22, 30)


def _state():
    return {
        "faceless": {
            "youtube": {"next_part": 3, "posted": [{"part": 1, "date": "2026-10-20 11:30"},
                                                    {"part": 2, "date": "2026-10-21 18:30"}]},
            "instagram": {"next_part": 2, "posted": [{"part": 1, "date": "2026-10-19 10:00"}]},
        },
        "streamers_a": {"instagram": {"next_part": 1, "posted": []}},
    }


def test_monitored_pairs_mapea_y_filtra():
    channels = {"faceless": {"platforms": ("yt", "ig", "tt")},
                "soyelmalo": {"platforms": ("ig", "tt")}}
    pairs = monitored_pairs(channels)
    assert ("faceless", "youtube") in pairs
    assert ("faceless", "instagram") in pairs
    assert ("faceless", "tiktok") in pairs
    assert ("soyelmalo", "instagram") in pairs
    assert ("soyelmalo", "youtube") not in pairs   # yt no declarado -> no se vigila


def test_last_post_dt_toma_el_maximo():
    assert last_post_dt(_state(), "faceless", "youtube") == datetime(2026, 10, 21, 18, 30)


def test_last_post_dt_none_si_vacio_o_falta_clave():
    st = _state()
    assert last_post_dt(st, "streamers_a", "instagram") is None   # posted vacío
    assert last_post_dt(st, "faceless", "tiktok") is None         # falta la plataforma


def test_classify_ok_stale_never():
    st = _state()
    pairs = [("faceless", "youtube"), ("faceless", "instagram"), ("streamers_a", "instagram")]
    by = {(s.canal, s.plataforma): s for s in classify(st, pairs, NOW, stale_hours=30)}
    assert by[("faceless", "youtube")].estado == "OK"        # hace 4h
    assert by[("faceless", "instagram")].estado == "STALE"   # hace ~60h
    assert by[("streamers_a", "instagram")].estado == "NEVER"


def test_classify_umbral_justo():
    st_stale = {"c": {"youtube": {"posted": [{"date": "2026-10-20 15:30"}]}}}   # 31h
    st_ok = {"c": {"youtube": {"posted": [{"date": "2026-10-20 17:00"}]}}}      # 29.5h
    assert classify(st_stale, [("c", "youtube")], NOW, 30)[0].estado == "STALE"
    assert classify(st_ok, [("c", "youtube")], NOW, 30)[0].estado == "OK"


def test_classify_fecha_rota_es_stale():
    st = {"c": {"youtube": {"posted": [{"date": "no-es-fecha"}]}}}
    # sin fecha parseable -> None -> NEVER (no rompe)
    assert classify(st, [("c", "youtube")], NOW, 30)[0].estado == "NEVER"


def test_should_email_problema_si_hay_stale():
    sts = [Status("c", "youtube", None, 40.0, "STALE")]
    assert should_email(sts, NOW, heartbeat_weekday=NOW.weekday()) == "problema"


def test_should_email_ok_en_dia_heartbeat():
    sts = [Status("c", "youtube", NOW, 1.0, "OK")]
    assert should_email(sts, NOW, heartbeat_weekday=NOW.weekday()) == "ok"


def test_should_email_none_fuera_de_heartbeat():
    sts = [Status("c", "youtube", NOW, 1.0, "OK")]
    otro = (NOW.weekday() + 1) % 7
    assert should_email(sts, NOW, heartbeat_weekday=otro) is None


def test_render_subject_problema_cuenta_caidos():
    sts = [Status("c", "youtube", None, 40.0, "STALE"),
           Status("d", "instagram", None, 50.0, "STALE")]
    subj, body = render(sts, "problema", NOW)
    assert "2" in subj and "🔴" in subj
    assert "c" in body and "youtube" in body


def test_render_subject_ok():
    sts = [Status("c", "youtube", NOW, 1.0, "OK")]
    subj, _ = render(sts, "ok", NOW)
    assert "✅" in subj and "OK" in subj


def test_hint_yt_token_viejo():
    assert "reautor" in hint_for("youtube", yt_token_age_days=9).lower()


def test_hint_ig_token_por_vencer():
    assert "ig" in hint_for("instagram", ig_token_age_days=58).lower()


def test_hint_backlog_vacio():
    assert "backlog" in hint_for("youtube", backlog_empty=True).lower()


def test_hint_fallback():
    assert hint_for("tiktok")   # algo no vacío
