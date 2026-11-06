from pathlib import Path

from src import curiosidades as C


def _fake_stock(monkeypatch, wiki=(), pixabay=()):
    """Wikipedia solo tiene los términos de `wiki`; Pixabay, los de `pixabay`."""
    llamadas = []

    def fake(q, dest, exclude_ids=None, allow_pixabay=True):
        llamadas.append((q, allow_pixabay))
        if q in wiki:
            return Path(dest), f"wiki:{q}"
        if allow_pixabay and q in pixabay:
            return Path(dest), q
        return None

    monkeypatch.setattr(C.stock, "download_image", fake)
    return llamadas


def test_prueba_todos_los_terminos_en_wikipedia_antes_de_pixabay(monkeypatch):
    # "Tara Calico" no tiene foto en Wikipedia y Pixabay traía un gatito calicó, sin probar el 2º término.
    _fake_stock(monkeypatch, wiki={"Belen, New Mexico"}, pixabay={"Tara Calico"})
    res = C._pick_image(["Tara Calico", "Belen, New Mexico"], "x.jpg", set(), pixabay=True)
    assert res[1] == "wiki:Belen, New Mexico"


def test_sin_pixabay_no_lo_consulta_y_queda_sin_imagen(monkeypatch):
    llamadas = _fake_stock(monkeypatch, pixabay={"Natalee Holloway"})
    assert C._pick_image(["Natalee Holloway"], "x.jpg", set(), pixabay=False) is None
    assert all(not permitido for _, permitido in llamadas)


def test_con_pixabay_es_el_ultimo_recurso(monkeypatch):
    _fake_stock(monkeypatch, pixabay={"desierto"})
    assert C._pick_image(["duna", "desierto"], "x.jpg", set(), pixabay=True)[1] == "desierto"


def test_un_error_en_un_termino_no_corta_los_demas(monkeypatch):
    def fake(q, dest, exclude_ids=None, allow_pixabay=True):
        if q == "roto":
            raise RuntimeError("429")
        return Path(dest), f"wiki:{q}"

    monkeypatch.setattr(C.stock, "download_image", fake)
    assert C._pick_image(["roto", "bueno"], "x.jpg", set(), pixabay=False)[1] == "wiki:bueno"
