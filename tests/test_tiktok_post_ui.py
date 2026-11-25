"""Reglas de la pantalla "Post to TikTok" (Content Sharing Guidelines de TikTok)."""
import pytest

import tiktok_post_ui as ui

CI = {
    "creator_nickname": "En 60 Segundos",
    "privacy_level_options": ["FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
    "comment_disabled": False, "duet_disabled": False, "stitch_disabled": True,
    "max_video_post_duration_sec": 600,
}


def _p(**kw):
    base = {"title": "Hola #datos", "privacy": "SELF_ONLY", "comment": False, "duet": False,
            "stitch": False, "commercial": False, "your_brand": False, "branded": False}
    return {**base, **kw}


def test_sin_privacidad_elegida_no_publica():
    with pytest.raises(ValueError):
        ui.validate_post(_p(privacy=""), CI, 60)


def test_privacidad_fuera_de_las_opciones_de_la_cuenta():
    with pytest.raises(ValueError):
        ui.validate_post(_p(privacy="PUBLIC_TO_EVERYONE"), CI, 60)


def test_interacciones_apagadas_por_defecto():
    k = ui.validate_post(_p(), CI, 60)
    assert k["disable_comment"] and k["disable_duet"] and k["disable_stitch"]
    assert k["privacy_level"] == "SELF_ONLY"
    assert not k["brand_content_toggle"] and not k["brand_organic_toggle"]


def test_interaccion_deshabilitada_en_la_cuenta_no_se_puede_prender():
    k = ui.validate_post(_p(comment=True, stitch=True), CI, 60)
    assert k["disable_comment"] is False
    assert k["disable_stitch"] is True      # stitch_disabled en la cuenta


def test_comercial_prendido_exige_elegir_una_opcion():
    with pytest.raises(ValueError):
        ui.validate_post(_p(commercial=True), CI, 60)


def test_contenido_de_marca_no_puede_ser_privado():
    with pytest.raises(ValueError):
        ui.validate_post(_p(commercial=True, branded=True), CI, 60)
    k = ui.validate_post(_p(commercial=True, branded=True, privacy="FOLLOWER_OF_CREATOR"), CI, 60)
    assert k["brand_content_toggle"] is True


def test_tu_marca_si_puede_ser_privado():
    k = ui.validate_post(_p(commercial=True, your_brand=True), CI, 60)
    assert k["brand_organic_toggle"] is True and k["brand_content_toggle"] is False


def test_opciones_comerciales_se_ignoran_con_el_interruptor_apagado():
    k = ui.validate_post(_p(commercial=False, branded=True, your_brand=True), CI, 60)
    assert not k["brand_content_toggle"] and not k["brand_organic_toggle"]


def test_video_mas_largo_que_el_maximo_de_la_cuenta():
    with pytest.raises(ValueError):
        ui.validate_post(_p(), CI, 601)


def test_titulo_demasiado_largo():
    with pytest.raises(ValueError):
        ui.validate_post(_p(title="a" * 2201), CI, 60)


def test_error_de_app_sin_auditar_se_explica():
    msg = ui.friendly_error("init falló: {'code': 'unaudited_client_can_only_post_to_private_accounts'}")
    assert "private" in msg


def test_cuenta_publica_se_detecta():
    assert ui.looks_public({"privacy_level_options": ["PUBLIC_TO_EVERYONE", "SELF_ONLY"]})
    assert not ui.looks_public(CI)


def test_video_path_no_sale_de_la_carpeta_del_canal(tmp_path, monkeypatch):
    (tmp_path / "ok.mp4").write_bytes(b"x")
    monkeypatch.setitem(ui.S, "videos_dir", tmp_path)
    assert ui.video_path("ok.mp4") == tmp_path / "ok.mp4"
    assert ui.video_path("../ok.mp4") == tmp_path / "ok.mp4"    # se queda con el nombre
    assert ui.video_path("..\\..\\.env") is None
    assert ui.video_path("no_existe.mp4") is None
