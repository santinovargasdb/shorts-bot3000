# tests/test_autoscripts_topics.py
import autoscripts.topics as T


def test_norm():
    assert T.norm("  Pulpo  Sangre  Azul ") == "pulpo sangre azul"


def test_dedup_descarta_temas_usados():
    datos = [{"text": "a", "imgs": ["x", "y"], "topic": "Tema Nuevo"},
             {"text": "b", "imgs": ["p", "q"], "topic": "Pulpo Sangre Azul"}]
    used = {"pulpo sangre azul"}
    out = T.dedup(datos, used)
    assert len(out) == 1 and out[0]["topic"] == "Tema Nuevo"


def test_hardcoded_topics_incluye_de_los_45(monkeypatch):
    import series_data
    # un PART de prueba con un fact cuyo 1er img es "octopus"
    monkeypatch.setattr(series_data, "PARTS", {
        1: {"segments": [{"kind": "fact", "text": "t", "imgs": ["octopus", "x"]},
                         {"kind": "title", "text": "T"}]}})
    assert "octopus" in T.hardcoded_topics()


def test_used_topics_une_hardcoded_y_db(monkeypatch):
    import autoscripts.db as db
    monkeypatch.setattr(T, "hardcoded_topics", lambda: {"octopus"})
    monkeypatch.setattr(db, "used_topics_db", lambda ch: {"tema db"})
    assert T.used_topics("faceless") == {"octopus", "tema db"}
