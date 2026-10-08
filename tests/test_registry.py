import pytest

import channels_registry as reg


def test_canales_registrados():
    assert set(reg.CHANNELS) == {"faceless", "historia", "misterios", "soyelmalo"}


def test_contexto_soyelmalo():
    ctx = reg.get_channel("soyelmalo")
    assert ctx["display"] == "¿Soy el Malo?"
    assert ctx["series"] == "series_reddit"       # adaptador dinámico (lee stories.sqlite)
    assert ctx["platforms"] == ("yt", "ig", "tt")
    assert ctx["yt_token"] == "secrets/soyelmalo/token.json"
    assert ctx["ig_creds"] == "secrets/soyelmalo/instagram.json"
    assert ctx["tt_token"] == "secrets/soyelmalo/tiktok_token.json"
    assert ctx["music"] == "music/lofi"


def test_contexto_historia():
    ctx = reg.get_channel("historia")
    assert ctx["display"] == "Historia en 60 Segundos"
    assert ctx["platforms"] == ("yt", "ig", "tt")
    assert ctx["yt_token"] == "secrets/historia/token.json"
    assert ctx["ig_creds"] == "secrets/historia/instagram.json"
    assert ctx["tt_token"] == "secrets/historia/tiktok_token.json"
    assert ctx["music"] == "music/cinematic"


def test_contexto_faceless_legacy():
    ctx = reg.get_channel("faceless")
    assert ctx["yt_token"] is None      # usa secrets/token.json (legacy)
    assert ctx["ig_creds"] is None      # usa .env (legacy)
    assert ctx["platforms"] == ("yt", "ig", "tt")
    assert ctx["tt_token"] is None      # usa el token global secrets/tiktok_token.json
    assert ctx["music"] == "music/lofi"


def test_contexto_misterios():
    ctx = reg.get_channel("misterios")
    assert ctx["display"] == "Misterios en 60 Segundos"
    assert ctx["platforms"] == ("yt", "ig", "tt")
    assert ctx["yt_token"] == "secrets/misterios/token.json"
    assert ctx["ig_creds"] == "secrets/misterios/instagram.json"
    assert ctx["tt_token"] == "secrets/misterios/tiktok_token.json"
    assert ctx["music"] == "music/dark_ambient"


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
    ch_misterios = cfg.load_channel("misterios")
    assert ch_misterios.get("tts_voice", "").startswith("es-")
