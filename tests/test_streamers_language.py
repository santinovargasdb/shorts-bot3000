"""Idioma de transcripción POR canal de clips: streamers_c es IRL en INGLÉS, así que debe
transcribir/subtitular en 'en' (no en 'es'). A/B son hispanos -> 'es'. Antes el perfil
'streamers' de channels.yaml forzaba 'es' para los tres, y C salía con subtítulos en español."""
from streamers import build as B, config as scfg, db
from streamers.build import language_mismatch


def test_clip_hablado_en_otro_idioma_no_corresponde():
    assert language_mismatch("es", ("en", 0.45, 35)) is True   # mernuel, b54: voz real en inglés con solo 0.45
    assert language_mismatch("en", ("es", 0.95, 40)) is True   # el problema inverso, en el canal C


def test_clip_en_el_idioma_del_canal_pasa():
    assert language_mismatch("es", ("es", 0.68, 30)) is False


def test_pocas_palabras_no_alcanzan_para_rechazar():
    # Ruido o gritos: whisper inventa unas palabras en otro idioma con mucha seguridad (elxokas a71: pt 0.77).
    assert language_mismatch("es", ("pt", 0.77, 8)) is False
    assert language_mismatch("es", ("pt", 0.77, 0)) is False


def test_deteccion_muy_dudosa_no_rechaza():
    assert language_mismatch("es", ("ko", 0.31, 20)) is False


def test_sin_deteccion_o_canal_sin_idioma_no_rechaza():
    assert language_mismatch("es", None) is False
    assert language_mismatch(None, ("en", 0.95, 40)) is False


def test_build_clip_rechaza_sin_renderizar_y_quema_el_clip(monkeypatch, tmp_path):
    cfg = {"streamers": ["ibai"], "db": tmp_path / "b.sqlite", "content": "gameplay", "language": "es"}
    monkeypatch.setattr(B.scfg, "get", lambda _: cfg)
    monkeypatch.setattr(B.sourcing, "best_clip", lambda *a, **k: {
        "id": "c1", "title": "x", "streamer": "ibai", "views": 5, "local_path": str(tmp_path / "c.mp4")})
    monkeypatch.setattr("streamers.verify.classify_gameplay", lambda *a, **k: True)
    monkeypatch.setattr("src.transcribe.detect_language", lambda *a, **k: ("en", 0.95, 40))

    def no_renderizar(*a, **k):
        raise AssertionError("no debería renderizar un clip en otro idioma")

    monkeypatch.setattr(B, "process_source", no_renderizar)
    seq = B.build_clip("streamers_a", verbose=False)
    clip = next(c for c in db.all_clips(db.connect(cfg["db"])) if c["seq"] == seq)
    assert clip["status"] == "rejected"
    assert "idioma" in clip["qc_note"]


def test_streamers_c_transcribe_en_ingles():
    assert scfg.get("streamers_c").get("language") == "en"


def test_streamers_a_b_transcriben_en_espanol():
    assert scfg.get("streamers_a").get("language") == "es"
    assert scfg.get("streamers_b").get("language") == "es"
