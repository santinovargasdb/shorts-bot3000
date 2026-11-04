import series_data


def test_title_for():
    assert series_data.title_for(3) == "Datos para parecer inteligente pt. 3"


def test_title_for_usa_el_titulo_gancho_si_existe(monkeypatch):
    monkeypatch.setitem(series_data.PARTS, 999, {"titulo": "Animales que hacen trampa",
                                                 "resumen": "r", "segments": []})
    assert series_data.title_for(999) == "Animales que hacen trampa 🧠"
    # el archivo sigue con nombre estable (no re-renderiza ni pisa mp4 viejos)
    assert series_data.file_title_for(999) == "Datos para parecer inteligente pt. 999"


def test_teaser_adelanta_la_proxima_parte(monkeypatch):
    monkeypatch.setitem(series_data.PARTS, 998, {"titulo": "X", "resumen": "r", "segments": []})
    monkeypatch.setitem(series_data.PARTS, 999, {"titulo": "Animales que ganan haciendo trampa",
                                                 "resumen": "r", "segments": []})
    t = series_data.teaser_for(998)
    assert t == "Y en la próxima parte: animales que ganan haciendo trampa."
    assert "seguime" not in t.lower() and "suscrib" not in t.lower()   # §9.12-13
    assert series_data.teaser_for(999) == ""          # sin parte siguiente con título -> nada
