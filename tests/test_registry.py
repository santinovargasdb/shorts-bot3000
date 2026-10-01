import pytest

import channels_registry as reg


def test_canales_registrados():
    assert set(reg.CHANNELS) == {"faceless", "historia"}


def test_contexto_historia():
    ctx = reg.get_channel("historia")
    assert ctx["display"] == "Historia en 60 Segundos"
    assert ctx["platforms"] == ("yt", "ig")
    assert ctx["yt_token"] == "secrets/historia/token.json"
    assert ctx["ig_creds"] == "secrets/historia/instagram.json"
    assert ctx["music"] == "music/historia_tema.mp3"


def test_contexto_faceless_legacy():
    ctx = reg.get_channel("faceless")
    assert ctx["yt_token"] is None      # usa secrets/token.json (legacy)
    assert ctx["ig_creds"] is None      # usa .env (legacy)
    assert ctx["platforms"] == ("yt", "ig", "tt")


def test_canal_inexistente():
    with pytest.raises(KeyError):
        reg.get_channel("reddit")


def test_series_cargan():
    for name in reg.CHANNELS:
        mod = reg.load_series(reg.get_channel(name))
        for attr in ("PARTS", "KEYWORDS", "title_for", "descripcion", "background_for"):
            assert hasattr(mod, attr), f"{name}: falta {attr}"


def test_perfil_motor_existe():
    from src import config as cfg
    ch = cfg.load_channel("historia")
    assert ch.get("tts_voice", "").startswith("es-")
