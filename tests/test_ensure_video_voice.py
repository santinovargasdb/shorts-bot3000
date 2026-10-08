"""El canal de Reddit necesita voz por historia (Jorge/Dalia según el narrador).
_ensure_video debe pasar a generate() la voz y el sfx que la parte declare, y
mantener EXACTAMENTE el comportamiento viejo para las series que no los declaran
(los 3 canales en producción)."""
import types

import daily_post
import src.curiosidades as cur
import src.faceless as faceless


def _fake_series(part_extra):
    base = {"segments": [{"kind": "fact", "text": "x"}], "resumen": "r", "pregunta": "¿y?"}
    base.update(part_extra)
    return types.SimpleNamespace(
        PARTS={1: base},
        KEYWORDS=["a"],
        title_for=lambda p: "Un titulo",
        background_for=lambda p: "backgrounds/bg_subway.mp4",
        descripcion=lambda p, resumen: "desc",
    )


def _capture(monkeypatch):
    cap = {}

    def fake_generate(segments, **kw):
        cap.update(kw)
        cap["segments"] = segments
        return daily_post.ROOT / "output" / "x" / "y.mp4"

    monkeypatch.setattr(cur, "generate", fake_generate)
    monkeypatch.setattr(faceless, "_slug", lambda s: "zzz_slug_que_no_existe")
    return cap


def test_ensure_video_pasa_voz_y_sfx_por_historia(monkeypatch):
    cap = _capture(monkeypatch)
    series = _fake_series({"voice": "es-MX-JorgeNeural", "sfx": "sfx/pop.wav"})
    ctx = {"name": "soyelmalo", "engine_channel": "test_reddit_tmp",
           "music": "music/lofi", "sfx_style": "datos"}
    daily_post._ensure_video(1, ctx, series)
    assert cap.get("voice") == "es-MX-JorgeNeural"
    assert cap.get("sfx") == "sfx/pop.wav"


def test_ensure_video_legacy_sin_voz_no_cambia(monkeypatch):
    cap = _capture(monkeypatch)
    series = _fake_series({})      # serie vieja: PARTS sin voice/sfx
    ctx = {"name": "faceless", "engine_channel": "test_reddit_tmp",
           "music": "music/lofi", "sfx_style": "datos"}
    daily_post._ensure_video(1, ctx, series)
    assert cap.get("voice") is None              # cae al tts_voice del canal (yaml)
    assert cap.get("sfx") == "sfx/whoosh.wav"    # el default de siempre
