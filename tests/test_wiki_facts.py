# tests/test_wiki_facts.py
"""wiki_facts: trae el resumen (intro) de Wikipedia para grounding, es->en fallback, con cache."""
import src.wiki_facts as W


class _Resp:
    def __init__(self, json_data, status=200):
        self._j, self.status_code = json_data, status
    def json(self):
        return self._j
    def raise_for_status(self):
        if self.status_code >= 400:
            import requests
            raise requests.HTTPError()


def _page(extract):
    return {"query": {"pages": {"123": {"extract": extract}}}}


def test_extract_from_response_toma_el_extract():
    assert W._extract_from_response(_page("Hola mundo.")) == "Hola mundo."


def test_extract_from_response_vacio_es_none():
    assert W._extract_from_response(_page("")) is None
    assert W._extract_from_response({}) is None


def test_fetch_summary_es_ok(monkeypatch):
    W._CACHE.clear()
    calls = []
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get",
                        lambda url, params=None, timeout=None, headers=None:
                        (calls.append(url), _Resp(_page("Hecho real en espanol.")))[1])
    assert W.fetch_summary("Mary Celeste") == "Hecho real en espanol."
    assert "es.wikipedia.org" in calls[0]


def test_fetch_summary_cae_a_ingles(monkeypatch):
    W._CACHE.clear()
    urls = []
    def fake_get(url, params=None, timeout=None, headers=None):
        urls.append(url)
        extract = "" if "es.wikipedia" in url else "Real fact in English."
        return _Resp(_page(extract))
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get", fake_get)
    assert W.fetch_summary("Obscure subject") == "Real fact in English."
    assert any("en.wikipedia.org" in u for u in urls)


def test_fetch_summary_sin_articulo_es_none(monkeypatch):
    W._CACHE.clear()
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get", lambda *a, **k: _Resp(_page("")))
    assert W.fetch_summary("Nada de nada") is None


def test_fetch_summary_capea_a_max_chars(monkeypatch):
    W._CACHE.clear()
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get", lambda *a, **k: _Resp(_page("x" * 5000)))
    assert len(W.fetch_summary("Largo", max_chars=100)) == 100


# ---------- fetch_source (grounding de relatos: articulo EXACTO, nunca el 1er resultado de busqueda) ----------

def _wire_source(monkeypatch, *, es=None, en=None):
    """`es`/`en` = pagina que devuelve cada Wikipedia. Guarda los params para ver que no se busque."""
    W._CACHE.clear()
    params_vistos = []
    def fake_get(url, params=None, timeout=None, headers=None):
        params_vistos.append(params)
        pg = es if "es.wikipedia" in url else en
        return _Resp({"query": {"pages": {"1": pg if pg is not None else {"missing": ""}}}})
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get", fake_get)
    return params_vistos


def test_fetch_source_pide_titulo_exacto_no_busqueda(monkeypatch):
    # Bug real: la busqueda devolvia "Somerton" (pueblo ingles) para "Somerton Man" y una serie de
    # TV para "Great Fire of London"; el juez verificaba contra esa fuente equivocada.
    vistos = _wire_source(monkeypatch, en={"title": "Somerton Man", "extract": "x" * 1000})
    assert W.fetch_source("Somerton Man") == "x" * 1000
    assert all(p["titles"] == "Somerton Man" for p in vistos)
    assert not any("generator" in p for p in vistos)


def test_fetch_source_saltea_desambiguacion(monkeypatch):
    # "Rosetta Stone" en es.wikipedia es una desambiguacion; en inglés está el articulo real.
    disamb = {"extract": "d" * 900, "pageprops": {"disambiguation": ""}}
    _wire_source(monkeypatch, es=disamb, en={"extract": "real" * 300})
    assert W.fetch_source("Rosetta Stone") == "real" * 300


def test_fetch_source_elige_el_mas_largo(monkeypatch):
    _wire_source(monkeypatch, es={"extract": "e" * 800}, en={"extract": "i" * 1500})
    assert W.fetch_source("Caso") == "i" * 1500


def test_fetch_source_muy_corta_es_none(monkeypatch):
    # USS Cyclops en es: 233 caracteres. El relato pide 100+ palabras: con tan poco, el modelo inventa.
    _wire_source(monkeypatch, es={"extract": "e" * 233}, en={"extract": "i" * 300})
    assert W.fetch_source("Corto") is None


def test_fetch_source_sin_articulo_es_none(monkeypatch):
    _wire_source(monkeypatch)
    assert W.fetch_source("Nada de nada") is None


def test_fetch_source_capea_a_max_chars(monkeypatch):
    _wire_source(monkeypatch, es={"extract": "x" * 5000})
    assert len(W.fetch_source("Largo", max_chars=1000)) == 1000
