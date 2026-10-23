# tests/test_transcribe_align.py — §3: el subtítulo quemado sale del TEXTO DEL
# GUION (canónico), no de re-transcribir el audio (que metía "HAY UN ESTRELLA",
# "FEL" por Torre Eiffel). align_script_to_words conserva los TIEMPOS de Whisper
# pero reemplaza las palabras por las del guion.
import pytest

from src.transcribe import Word, align_script_to_words, align_segments_to_words


def _texts(words):
    return [w.text for w in words]


def test_alinea_usa_el_texto_del_guion_no_el_transcripto():
    # Whisper transcribió mal: "estrella" en vez de "Eiffel".
    asr = [Word(0.0, 0.4, "la"), Word(0.4, 0.8, "torre"), Word(0.8, 1.4, "estrella")]
    out = align_script_to_words("La Torre Eiffel", asr)
    assert _texts(out) == ["La", "Torre", "Eiffel"]      # texto canónico, no el ASR


def test_conserva_los_tiempos_cuando_el_conteo_coincide():
    asr = [Word(0.0, 0.4, "x"), Word(0.5, 0.9, "y"), Word(1.0, 1.5, "z")]
    out = align_script_to_words("uno dos tres", asr)
    assert _texts(out) == ["uno", "dos", "tres"]
    assert out[0].start == 0.0 and out[0].end == 0.4
    assert out[1].start == 0.5 and out[1].end == 0.9
    assert out[2].start == 1.0 and out[2].end == 1.5


def test_reparte_cuando_el_asr_tiene_menos_palabras():
    # El guion tiene 4 palabras; el ASR juntó dos en una sola marca de tiempo.
    asr = [Word(0.0, 1.0, "hayun"), Word(1.0, 2.0, "estrella")]
    out = align_script_to_words("hay una estrella brillante", asr)
    assert _texts(out) == ["hay", "una", "estrella", "brillante"]
    # Cubre el mismo span temporal total (0.0 -> 2.0), monótono y creciente.
    assert out[0].start == pytest.approx(0.0)
    assert out[-1].end == pytest.approx(2.0)
    for a, b in zip(out, out[1:]):
        assert a.start <= b.start
        assert a.end <= b.end


def test_reparte_cuando_el_asr_tiene_mas_palabras():
    # El ASR partió una palabra del guion en dos tokens.
    asr = [Word(0.0, 0.5, "in"), Word(0.5, 1.0, "creible"), Word(1.0, 1.5, "dato")]
    out = align_script_to_words("increíble dato", asr)
    assert _texts(out) == ["increíble", "dato"]
    assert out[0].start == pytest.approx(0.0)
    assert out[-1].end == pytest.approx(1.5)


def test_guion_vacio_devuelve_el_asr_sin_tocar():
    asr = [Word(0.0, 0.4, "algo")]
    assert align_script_to_words("", asr) == asr


def test_asr_vacio_devuelve_lista_vacia():
    assert align_script_to_words("hola mundo", []) == []


# ---------- alineación por segmentos (lo que usa el render) ----------

def test_alinea_por_segmento_respeta_el_texto_de_cada_dato():
    # Dos datos; Whisper transcribió mal el 2º ("estrella" por "Eiffel").
    # Cada segmento debe quedar con SU texto canónico y dentro de SU ventana.
    segs = [("La Torre Eiffel", 0.0, 1.5),
            ("Mide trescientos metros", 1.5, 3.0)]
    asr = [Word(0.0, 0.5, "la"), Word(0.5, 1.0, "torre"), Word(1.0, 1.5, "estrella"),
           Word(1.5, 2.0, "mide"), Word(2.0, 2.5, "trescientos"), Word(2.5, 3.0, "metros")]
    res = align_segments_to_words(segs, asr)
    assert _texts(res) == ["La", "Torre", "Eiffel", "Mide", "trescientos", "metros"]
    # El 2º segmento no invade tiempos del 1º.
    eiffel = res[2]
    mide = res[3]
    assert eiffel.end <= 1.5 + 1e-6
    assert mide.start >= 1.5 - 1e-6


def test_alinea_por_segmento_sin_palabras_asr_en_la_ventana():
    # Si Whisper no detectó palabras en la ventana de un segmento (silencio/VAD),
    # igual se emite el texto del guion repartido sobre la ventana declarada.
    segs = [("dato uno", 0.0, 1.0), ("dato dos", 1.0, 2.0)]
    asr = [Word(0.0, 0.5, "dato"), Word(0.5, 1.0, "uno")]   # nada en [1.0, 2.0]
    res = align_segments_to_words(segs, asr)
    assert _texts(res) == ["dato", "uno", "dato", "dos"]
    assert res[-1].end == pytest.approx(2.0)
