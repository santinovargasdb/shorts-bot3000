# tests/test_whatonearth_sourcing_sources.py
from whatonearth import sourcing


def test_pexels_sin_key_devuelve_vacio(monkeypatch):
    monkeypatch.delenv("PEXELS_API_KEY", raising=False)
    assert sourcing.search_pexels("pangolin") == []


def test_pexels_normaliza(monkeypatch):
    monkeypatch.setenv("PEXELS_API_KEY", "k")
    payload = {"videos": [{
        "url": "https://www.pexels.com/video/123/", "duration": 8,
        "user": {"name": "Jane"}, "tags": ["pangolin"],
        "video_files": [
            {"link": "http://x/hd.mp4", "height": 1080, "width": 1920},
            {"link": "http://x/sd.mp4", "height": 480, "width": 854}],
    }]}

    class _R:
        status_code = 200
        def json(self):
            return payload

    monkeypatch.setattr(sourcing.requests, "get", lambda *a, **k: _R())
    cands = sourcing.search_pexels("pangolin")
    assert cands and cands[0]["height"] == 1080
    assert cands[0]["source"] == "pexels"
    assert cands[0]["author"] == "Jane"
    assert cands[0]["license"] == "Pexels License"


def test_wikimedia_normaliza(monkeypatch):
    payload = {"query": {"pages": {"1": {
        "title": "File:Pangolin.webm",
        "imageinfo": [{"url": "http://commons/pangolin.webm", "width": 1920,
                       "height": 1080, "extmetadata": {
                           "Artist": {"value": "Bob"},
                           "LicenseShortName": {"value": "CC BY-SA 4.0"}},
                       "descriptionurl": "http://commons/page"}],
    }}}}

    class _R:
        status_code = 200
        def json(self):
            return payload

    monkeypatch.setattr(sourcing.requests, "get", lambda *a, **k: _R())
    cands = sourcing.search_wikimedia("pangolin")
    assert cands and cands[0]["source"] == "wikimedia"
    assert cands[0]["license"].startswith("CC")
    assert cands[0]["tags"]  # usa el título como tags para el ranking


def test_wikimedia_sin_licencia_se_saltea(monkeypatch):
    payload = {"query": {"pages": {"1": {
        "title": "File:Pangolin_nolic.webm",
        "imageinfo": [{"url": "http://commons/pangolin_nolic.webm", "width": 1920,
                       "height": 1080, "extmetadata": {
                           "Artist": {"value": "Bob"}},
                       "descriptionurl": "http://commons/page_nolic"}],
    }}}}

    class _R:
        status_code = 200
        def json(self):
            return payload

    monkeypatch.setattr(sourcing.requests, "get", lambda *a, **k: _R())
    cands = sourcing.search_wikimedia("pangolin")
    assert cands == []


def test_wikimedia_author_sin_html(monkeypatch):
    payload = {"query": {"pages": {"1": {
        "title": "File:Pangolin_html.webm",
        "imageinfo": [{"url": "http://commons/pangolin_html.webm", "width": 1920,
                       "height": 1080, "extmetadata": {
                           "Artist": {"value": '<a href="http://x">María López</a>'},
                           "LicenseShortName": {"value": "CC BY-SA 4.0"}},
                       "descriptionurl": "http://commons/page_html"}],
    }}}}

    class _R:
        status_code = 200
        def json(self):
            return payload

    monkeypatch.setattr(sourcing.requests, "get", lambda *a, **k: _R())
    cands = sourcing.search_wikimedia("pangolin")
    assert cands, "debe devolver un candidato"
    author = cands[0]["author"]
    assert "<" not in author and ">" not in author, f"autor contiene HTML: {author!r}"
    assert "María López" in author, f"autor no contiene el nombre: {author!r}"
