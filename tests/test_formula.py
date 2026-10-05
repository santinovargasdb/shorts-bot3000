# tests/test_formula.py — invariantes de docs/formula-faceless-viral.md
from pathlib import Path

import series_data
import series_historia
import series_misterios
from src import config as cfg
from src.subtitles import build_ass
from src.transcribe import Word

ROOT = Path(series_data.__file__).resolve().parent
SERIES = (series_data, series_historia, series_misterios)
NARRATIVAS = (series_historia, series_misterios)


def _textos(serie):
    for part, data in serie.PARTS.items():
        for seg in data["segments"]:
            yield part, seg.get("text", "")


def test_ningun_guion_pide_seguime_hablado():
    # Anti-patrón §9.12-13: CTA genérica hablada rompe el loop y roza
    # engagement bait (exclusión documentada de recomendaciones en IG).
    for serie in SERIES:
        for part, texto in _textos(serie):
            assert "seguime" not in texto.lower(), \
                f"{serie.__name__} parte {part} todavía pide 'Seguime' en la voz"


def test_aperturas_in_medias_res():
    # §2/§9.7: nunca abrir con la fecha ("En el año..."); la anomalía va primero.
    for serie in NARRATIVAS:
        for part, data in serie.PARTS.items():
            primera = data["segments"][0]["text"]
            assert not primera.startswith("En "), \
                f"{serie.__name__} ep.{part} abre con construcción de fecha: {primera[:50]!r}"
            assert " mil " not in f" {primera[:70].lower()}", \
                f"{serie.__name__} ep.{part} abre con año hablado: {primera[:70]!r}"


def test_cada_episodio_tiene_pregunta_binaria():
    # §7: remate con pregunta binaria en pantalla (genera comentarios).
    for serie in SERIES:
        for part, data in serie.PARTS.items():
            pregunta = data.get("pregunta", "")
            assert pregunta.strip().endswith("?"), \
                f"{serie.__name__} parte {part} sin campo 'pregunta'"


def test_karaoke_fuera_de_la_zona_de_ui():
    # §6: con margin_v 360 el karaoke caía dentro del bottom-480 que tapan
    # Shorts/TikTok; debe quedar en el tercio medio-bajo (margin_v ~700).
    canal = cfg.load_channel("faceless")
    assert canal["caption"]["margin_v"] >= 600


def test_highlight_rojo_en_misterios():
    # §6: rojo para misterios (refuerza el tono); BGR de ASS = &H000000FF.
    canal = cfg.load_channel("misterios")
    assert canal["caption"]["highlight_color"] == "&H000000FF"


def test_pack_sfx_existe():
    # §5: pop (tarjetas), riser (misterios) y boom (historia/giro) además del whoosh.
    for nombre in ("whoosh.wav", "pop.wav", "riser.wav", "boom.wav"):
        assert (ROOT / "sfx" / nombre).exists(), f"falta sfx/{nombre}"


def test_build_ass_renderiza_pregunta_final(tmp_path):
    words = [Word(start=0.0, end=0.5, text="hola"), Word(start=0.5, end=1.0, text="mundo")]
    out = tmp_path / "caps.ass"
    build_ass(words, out, caption={"margin_v": 700}, target_width=1080, target_height=1920,
              clip_duration=50.0, question_text="¿Accidente o encubrimiento?",
              question_start=46.5)
    contenido = out.read_text(encoding="utf-8")
    assert "Style: Pregunta" in contenido
    # El _wrap puede partir la pregunta en líneas (\N): chequear por partes.
    assert "¿ACCIDENTE O" in contenido and "ENCUBRIMIENTO?" in contenido
