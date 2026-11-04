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


def test_dedup_atrapa_el_mismo_sujeto_con_otro_nombre():
    # Caso real (nov-2026): flamencos x3 y medusa inmortal x2 en el backlog. Los topics venían
    # con mayúsculas/plurales distintos y el db los guardaba sin normalizar.
    used = {"flamingo", "Flamencos rosados", "turritopsis dohrnii"}
    datos = [{"text": "a", "imgs": ["Flamingo", "x"], "topic": "flamenco"},
             {"text": "b", "imgs": ["Turritopsis dohrnii", "y"], "topic": "Medusa inmortal"},
             {"text": "c", "imgs": ["Axolotl", "z"], "topic": "ajolote"}]
    assert [d["topic"] for d in T.dedup(datos, used)] == ["ajolote"]


def test_dedup_no_bloquea_un_tema_amplio_entero():
    # que ya haya salido "brain" no prohíbe para siempre otro dato distinto sobre el cerebro
    used = {"brain"}
    datos = [{"text": "a", "imgs": ["Human brain", "x"], "topic": "cerebro y sueño"}]
    assert len(T.dedup(datos, used)) == 1


def test_dedup_saca_repetidos_dentro_del_episodio():
    datos = [{"text": "a", "imgs": ["Flamingo", "x"], "topic": "flamencos"},
             {"text": "b", "imgs": ["Flamingo", "y"], "topic": "flamenco rosado"}]
    assert len(T.dedup(datos, set())) == 1


def test_dedup_mismo_genero_con_otro_nombre():
    # caso real: "Armillaria ostoyae" pasó aunque ya estaba "armillaria fungus"
    datos = [{"text": "a", "imgs": ["Armillaria ostoyae", "x"], "topic": "hongo gigante"}]
    assert T.dedup(datos, {"armillaria fungus"}) == []


def test_dedup_genero_no_bloquea_palabras_genericas():
    datos = [{"text": "a", "imgs": ["Giant squid", "x"], "topic": "calamar gigante"}]
    assert len(T.dedup(datos, {"giant sequoia"})) == 1
