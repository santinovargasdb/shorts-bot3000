"""TDD del fetcher de imágenes de Wikimedia (src/stock.py).

Funciones puras (sin red): limpiar la query para que Wikipedia encuentre el SUJETO,
parsear la respuesta de pageimages, y sacar los parámetros de tracking (utm) de la URL.
"""
from pathlib import Path

import src.stock as stock


# ---- clean_wiki_query: Wikipedia encuentra mejor el sujeto sin palabras descriptivas ----

def test_clean_wiki_query_quita_portrait():
    # "benito juarez portrait" en Wiki trajo a OTRA persona; sin "portrait" trae a Juárez.
    assert stock.clean_wiki_query("benito juarez portrait") == "benito juarez"


def test_clean_wiki_query_quita_painting_e_illustration():
    assert stock.clean_wiki_query("columbus deathbed painting") == "columbus deathbed"
    assert stock.clean_wiki_query("aztec city street illustration") == "aztec city street"


def test_clean_wiki_query_conserva_adjetivos_con_sentido():
    # "old", "medieval" son parte del sujeto; no se tocan.
    assert stock.clean_wiki_query("old sailing ship on the ocean") == "old sailing ship on the ocean"


def test_clean_wiki_query_sin_descriptivas_queda_igual():
    assert stock.clean_wiki_query("desierto") == "desierto"


# ---- wiki_url_from_response: extrae la URL de imagen del JSON de pageimages ----

def test_wiki_url_prefiere_thumbnail_no_el_original_gigante():
    # el 'original' puede ser gigante (ej. PNG 20000px, que ffmpeg rechaza); el thumbnail
    # está capeado por pithumbsize -> siempre se prefiere.
    data = {"query": {"pages": {"123": {"title": "Benito Juárez",
            "original": {"source": "https://up/juarez.jpg"},
            "thumbnail": {"source": "https://up/juarez_thumb.jpg"}}}}}
    assert stock.wiki_url_from_response(data) == "https://up/juarez_thumb.jpg"


def test_wiki_url_cae_a_thumbnail_si_no_hay_original():
    data = {"query": {"pages": {"123": {"title": "X",
            "thumbnail": {"source": "https://up/thumb.jpg"}}}}}
    assert stock.wiki_url_from_response(data) == "https://up/thumb.jpg"


def test_wiki_url_evita_svg_usa_thumbnail():
    # un .svg (ej. emblema) no se puede componer en el video; usa el thumbnail raster.
    data = {"query": {"pages": {"1": {
        "original": {"source": "https://up/Emblema_Ejercito.svg"},
        "thumbnail": {"source": "https://up/Emblema_Ejercito.png"}}}}}
    assert stock.wiki_url_from_response(data) == "https://up/Emblema_Ejercito.png"


def test_wiki_url_none_si_pagina_sin_imagen():
    data = {"query": {"pages": {"123": {"title": "Tenochtitlan"}}}}
    assert stock.wiki_url_from_response(data) is None


def test_wiki_url_none_si_respuesta_vacia():
    assert stock.wiki_url_from_response({}) is None


# ---- strip_tracking: sacar utm_* que mete la API (ensucian y disparan 429) ----

def test_strip_tracking_saca_utm():
    url = "https://upload.wikimedia.org/a/File.jpg?utm_source=es.wikipedia.org&utm_campaign=api"
    assert stock.strip_tracking(url) == "https://upload.wikimedia.org/a/File.jpg"


def test_strip_tracking_conserva_params_legitimos():
    url = "https://up/File.jpg?width=800&utm_source=es"
    assert stock.strip_tracking(url) == "https://up/File.jpg?width=800"


def test_strip_tracking_sin_query_queda_igual():
    url = "https://up/File.jpg"
    assert stock.strip_tracking(url) == url


# ---- download_image: Wikimedia-first con fallback a Pixabay (la orquestación) ----

_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 20  # cabecera JPEG válida para pasar _is_raster_image


def test_download_image_usa_wiki_cuando_hay(monkeypatch, tmp_path):
    monkeypatch.setattr(stock, "_wiki_search_image_url", lambda q: "https://up/juarez.jpg")
    monkeypatch.setattr(stock, "_download_url",
                        lambda url, dest, headers=None: Path(dest).write_bytes(_JPEG) or Path(dest))
    px_called = []
    monkeypatch.setattr(stock, "_download_image_pixabay",
                        lambda *a, **k: px_called.append(True))
    dest = tmp_path / "img.jpg"
    res = stock.download_image("benito juarez portrait", dest)
    assert res == (dest, "wiki:https://up/juarez.jpg")
    assert px_called == []  # no cayó a Pixabay


def test_download_image_cae_a_pixabay_si_wiki_vacio(monkeypatch, tmp_path):
    monkeypatch.setattr(stock, "_wiki_search_image_url", lambda q: None)
    monkeypatch.setattr(stock, "_download_image_pixabay",
                        lambda q, dest, index=0, exclude_ids=None: (Path(dest), "px:1"))
    res = stock.download_image("desierto", tmp_path / "img.jpg")
    assert res == (tmp_path / "img.jpg", "px:1")


def test_download_image_cae_a_pixabay_si_wiki_ya_usada(monkeypatch, tmp_path):
    # si la imagen de wiki ya se usó (está en exclude_ids), no la repite: va a Pixabay.
    monkeypatch.setattr(stock, "_wiki_search_image_url", lambda q: "https://up/dup.jpg")
    monkeypatch.setattr(stock, "_download_image_pixabay",
                        lambda q, dest, index=0, exclude_ids=None: (Path(dest), "px:2"))
    res = stock.download_image("x", tmp_path / "img.jpg",
                               exclude_ids={"wiki:https://up/dup.jpg"})
    assert res == (tmp_path / "img.jpg", "px:2")


def test_download_image_descarta_wiki_no_raster(monkeypatch, tmp_path):
    # si wiki baja un SVG/corrupto (no raster), lo descarta y va a Pixabay (ffmpeg no compone SVG).
    monkeypatch.setattr(stock, "_wiki_search_image_url", lambda q: "https://up/emblema.jpg")
    monkeypatch.setattr(stock, "_download_url",
                        lambda url, dest, headers=None: Path(dest).write_bytes(b"<?xml version='1.0'?><svg/>") or Path(dest))
    monkeypatch.setattr(stock, "_download_image_pixabay",
                        lambda q, dest, index=0, exclude_ids=None: (Path(dest), "px:9"))
    res = stock.download_image("mexican army", tmp_path / "img.jpg")
    assert res == (tmp_path / "img.jpg", "px:9")


# ---- _is_raster_image: magic-bytes (no SVG, no HTML, no corrupto) ----

def test_is_raster_image_acepta_jpeg_y_png(tmp_path):
    jpg = tmp_path / "a.jpg"; jpg.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 20)
    png = tmp_path / "b.png"; png.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 20)
    assert stock._is_raster_image(jpg) is True
    assert stock._is_raster_image(png) is True


def test_is_raster_image_rechaza_svg_y_basura(tmp_path):
    svg = tmp_path / "c.jpg"; svg.write_bytes(b'<?xml version="1.0"?><svg></svg>')
    junk = tmp_path / "d.jpg"; junk.write_bytes(b"not an image at all")
    assert stock._is_raster_image(svg) is False
    assert stock._is_raster_image(junk) is False


def test_wiki_url_svg_sin_thumbnail_devuelve_none():
    # SVG sin thumbnail raster: no se devuelve (ffmpeg no lo compone) -> None (va a Pixabay).
    data = {"query": {"pages": {"1": {"original": {"source": "https://up/Emblema.svg"}}}}}
    assert stock.wiki_url_from_response(data) is None


# ---- caché: no re-pedir la misma query a Wikimedia (baja el rate-limit 429) ----

class _FakeResp:
    status_code = 200
    def __init__(self, payload): self._p = payload
    def raise_for_status(self): pass
    def json(self): return self._p


def test_wiki_search_cachea_la_misma_query(monkeypatch):
    payload = {"query": {"pages": {"1": {"original": {"source": "https://up/juarez.jpg"}}}}}
    calls = []
    monkeypatch.setattr(stock.requests, "get",
                        lambda *a, **k: calls.append(1) or _FakeResp(payload))
    monkeypatch.setattr(stock.time, "sleep", lambda *a, **k: None)
    stock._WIKI_CACHE.clear()
    u1 = stock._wiki_search_image_url("benito juarez portrait")
    u2 = stock._wiki_search_image_url("benito juarez")  # misma query tras limpiar
    assert u1 == u2 == "https://up/juarez.jpg"
    assert len(calls) == 1  # la 2da sale de la caché, no re-pide
