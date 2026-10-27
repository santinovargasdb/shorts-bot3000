# tests/test_hook_first.py — §1/§9.1-3 de la fórmula: el short abre EN el hook,
# sin saludo/bienvenida/anuncio de tema hablado antes del dato.
import pytest

import series_data
import series_historia
import series_misterios

SERIES = (series_data, series_historia, series_misterios)


# ---------- detección de "bienvenida" (saludo / anuncio de tema) ----------

@pytest.mark.parametrize("texto", [
    "Hola chicos, bienvenidos al canal.",
    "¡Bienvenido a la serie donde te tiro datos!",
    "Buenas, en el video de hoy vamos a ver cinco datos.",
    "En este video te traigo los mejores datos.",
    "Hoy te traigo cinco datos para parecer inteligente.",
    "Qué tal, suscribite para más curiosidades.",
])
def test_es_bienvenida_detecta_saludos(texto):
    assert series_data.es_bienvenida(texto) is True


@pytest.mark.parametrize("texto", [
    "El pulpo tiene tres corazones y su sangre es azul.",
    "Un barco navegaba solo por el Atlántico, sin un alma al timón.",
    "Napoleón no era bajo.",
    "Hay más estrellas en el universo que granos de arena.",
])
def test_es_bienvenida_no_marca_hooks_reales(texto):
    assert series_data.es_bienvenida(texto) is False


# ---------- invariante del guion: el hook abre ----------

def test_assert_hook_first_acepta_fact_primero():
    segs = [{"kind": "fact", "text": "El pulpo tiene tres corazones."},
            {"kind": "title", "text": "Datos para parecer más inteligente."}]
    series_data.assert_hook_first(segs)   # no levanta


def test_assert_hook_first_rechaza_title_primero():
    segs = [{"kind": "title", "text": "Datos para parecer más inteligente."},
            {"kind": "fact", "text": "El pulpo tiene tres corazones."}]
    with pytest.raises(ValueError):
        series_data.assert_hook_first(segs)


def test_assert_hook_first_rechaza_bienvenida_hablada():
    segs = [{"kind": "fact", "text": "Hola, bienvenidos al canal de datos curiosos."}]
    with pytest.raises(ValueError):
        series_data.assert_hook_first(segs)


# ---------- invariante sobre TODOS los guiones curados ----------

def test_todos_los_guiones_abren_en_el_hook():
    for serie in SERIES:
        for part, data in serie.PARTS.items():
            segs = data["segments"]
            assert segs, f"{serie.__name__} parte {part} sin segmentos"
            # El primer segmento del guion es un dato hablado (fact), nunca un
            # 'title' ni cualquier otra cosa antes del hook.
            assert segs[0]["kind"] == "fact", \
                f"{serie.__name__} parte {part} no abre con un 'fact' (hook)"
            # Y esa primera frase hablada no es una bienvenida/anuncio de tema.
            assert not series_data.es_bienvenida(segs[0]["text"]), \
                f"{serie.__name__} parte {part} abre con bienvenida: {segs[0]['text'][:60]!r}"
