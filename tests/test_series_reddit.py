"""Tests del adaptador series_reddit: imita la interfaz de un módulo `series`
(PARTS, title_for, background_for, descripcion, KEYWORDS) pero construido desde
las historias reescritas de la DB de Reddit."""
import series_reddit as sr

ROWS = [
    {"seq": 1, "titulo_es": "Mi ex tóxica", "guion": "guion uno",
     "veredicto": "se pasó mal", "cierre": "¿Vos qué harías? 👇", "narrador_genero": "M",
     "subreddit": "pettyrevenge", "score": 5000, "num_comments": 320},
    {"seq": 2, "titulo_es": "La suegra", "guion": "guion dos",
     "veredicto": "insólito", "cierre": "¿Soy el malo? 👇", "narrador_genero": "F",
     "subreddit": "EntitledParents", "score": 3000, "num_comments": 210},
]


def test_build_parts_estructura():
    parts = sr.build_parts(ROWS)
    assert set(parts) == {1, 2}
    p = parts[1]
    # Sin segmento de título (el gancho es la tarjeta de Reddit): solo la narración.
    assert len(p["segments"]) == 1
    assert p["segments"][0]["kind"] == "fact"
    assert "guion uno" in p["segments"][0]["text"]
    assert "se pasó mal" in p["segments"][0]["text"]   # el veredicto también se narra
    assert p["segments"][0]["imgs"] == []


def test_build_parts_datos_de_card():
    p = sr.build_parts(ROWS)[1]
    assert p["subreddit"] == "pettyrevenge"
    assert p["upvotes"] == 5000
    assert p["comments"] == 320
    assert p["username"].startswith("u/")


def test_build_parts_voz_por_genero():
    parts = sr.build_parts(ROWS)
    assert parts[1]["voice"] == "es-MX-JorgeNeural"    # M
    assert parts[2]["voice"] == "es-MX-DaliaNeural"    # F


def test_build_parts_pregunta_y_sfx():
    parts = sr.build_parts(ROWS)
    assert parts[1]["pregunta"] == "¿Vos qué harías?"   # _clean saca el emoji del final
    assert parts[1]["sfx"] == "sfx/pop.wav"


def test_clean_saca_emojis_conserva_acentos():
    assert sr._clean("¿Soy el malo? 👇") == "¿Soy el malo?"
    assert sr._clean("acción café ñandú") == "acción café ñandú"


def test_background_for_rota_y_es_mp4():
    b1, b2 = sr.background_for(1), sr.background_for(2)
    assert b1 != b2
    assert b1.endswith(".mp4")


def test_descripcion_incluye_resumen_y_hashtags():
    d = sr.descripcion(1, "un veredicto cualquiera")
    assert "un veredicto cualquiera" in d
    assert "#" in d


def test_title_for_es_el_cliffhanger_sin_sufijo(monkeypatch):
    monkeypatch.setattr(sr, "PARTS", sr.build_parts(ROWS))
    assert sr.title_for(1) == "Mi ex tóxica"          # el titulo tal cual
    assert "¿Soy el Malo?" not in sr.title_for(1)      # sin sufijo de marca
