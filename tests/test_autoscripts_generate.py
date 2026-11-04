import pytest
import autoscripts.generate as g

_OK = {
    "pregunta": "¿Qué dato sabés vos?",
    "resumen": "cinco datos curiosos",
    "datos": [
        {"text": "El pulpo tiene tres corazones y sangre azul por el cobre.", "imgs": ["octopus", "octopus underwater"], "topic": "pulpo sangre azul"},
        {"text": "La miel nunca se echa a perder: casi no tiene agua.", "imgs": ["honey", "honeycomb"], "topic": "miel no caduca"},
    ],
}


def test_parse_episode_extrae_json_con_fences():
    raw = "```json\n" + __import__("json").dumps(_OK, ensure_ascii=False) + "\n```"
    ep = g.parse_episode(raw)
    assert ep["pregunta"].startswith("¿") and len(ep["datos"]) == 2


def test_validate_schema_ok():
    g.validate_schema(_OK)   # no levanta


def test_validate_schema_rechaza_digitos_sueltos():
    bad = {"pregunta": "¿?", "resumen": "r",
           "datos": [{"text": "El pulpo tiene 3 corazones.", "imgs": ["a", "b"], "topic": "pulpo"}]}
    with pytest.raises(ValueError):
        g.validate_schema(bad)


def test_validate_schema_rechaza_imgs_incompletas():
    bad = {"pregunta": "¿?", "resumen": "r",
           "datos": [{"text": "texto sin numeros.", "imgs": ["solo uno"], "topic": "x"}]}
    with pytest.raises(ValueError):
        g.validate_schema(bad)


def test_generate_episode_usa_el_cliente(monkeypatch):
    import json
    monkeypatch.setattr(g, "_chat", lambda client, model, prompt, **k: json.dumps(_OK, ensure_ascii=False))
    ep = g.generate_episode(client=object(), model="m", avoid_topics=["algo"])
    assert ep["datos"][0]["topic"] == "pulpo sangre azul"


def test_fewshot_sin_terminos_genericos_de_escena():
    # Los ejemplos few-shot condicionan los imgs que genera el LLM. Tienen que nombrar SUJETOS de
    # Wikipedia, no escenas genéricas de stock (que Wikipedia no resuelve: "octopus underwater" no
    # es un artículo). Estos eran los términos de escena que arrastraban los ejemplos viejos.
    fs = g._fewshot().lower()
    for generico in ("octopus underwater", "venus surface", "lightning storm", "saturn rings",
                     "stars night sky", "koala tree", "honeybee flower"):
        assert generico not in fs, f"ejemplo few-shot todavía usa escena genérica: {generico!r}"


def test_fewshot_incluye_ejemplos_reales(monkeypatch):
    import series_data
    monkeypatch.setattr(series_data, "PARTS", {
        1: {"pregunta": "¿p?", "resumen": "r", "segments": [
            {"kind": "fact", "text": "El pulpo tiene tres corazones.", "imgs": ["octopus", "x"]},
            {"kind": "title", "text": "T"}]}})
    fs = g._fewshot(k=1)
    assert "tres corazones" in fs and "octopus" in fs


def test_prompt_tiene_regla_anti_exageracion():
    assert "exageres" in g._PROMPT.lower()


def test_prompt_pide_sujetos_de_wikipedia():
    # Las imágenes salen Wikimedia-first (src.stock.download_image). El prompt debe pedir que los
    # términos nombren un SUJETO con artículo propio (como narrativa.py), no escenas genéricas de
    # stock, y ya no debe decir que los términos son "para Pixabay".
    p = g._PROMPT.lower()
    assert "wikipedia" in p
    assert "pixabay" not in p


def test_generate_episode_mete_los_ejemplos_en_el_prompt(monkeypatch):
    import json
    visto = {}

    def fake_chat(c, m, prompt, **k):
        visto["p"] = prompt
        return json.dumps(_OK, ensure_ascii=False)
    monkeypatch.setattr(g, "_fewshot", lambda k=2: "EJEMPLO_REAL_XYZ")
    monkeypatch.setattr(g, "_chat", fake_chat)
    g.generate_episode(client=object(), model="m", avoid_topics=[])
    assert "EJEMPLO_REAL_XYZ" in visto["p"]        # el few-shot llega al prompt


def test_grounding_arma_fuentes_con_los_sujetos(monkeypatch):
    import json
    import src.wiki_facts as W
    monkeypatch.setattr(g, "_chat", lambda c, m, p, **k: json.dumps(
        {"tema": "animales del desierto", "sujetos": [f"S{i}" for i in range(6)]}))
    monkeypatch.setattr(W, "fetch_summary", lambda s, lang="en", max_chars=1200: f"texto de {s}")
    bloque = g._grounding(object(), "m", "animales", "(ninguno)", "(ninguno)", {})
    assert "animales del desierto" in bloque and 'FUENTE: """texto de S0"""' in bloque


def test_grounding_vacio_si_hay_pocas_fuentes(monkeypatch):
    import json
    import src.wiki_facts as W
    monkeypatch.setattr(g, "_chat", lambda c, m, p, **k: json.dumps({"tema": "x", "sujetos": ["A", "B"]}))
    monkeypatch.setattr(W, "fetch_summary", lambda s, **k: "t")
    assert g._grounding(object(), "m", "f", "", "", {}) == ""   # < 5 fuentes -> modo de antes


def test_generate_episode_mete_las_fuentes_en_el_prompt(monkeypatch):
    import json
    visto = []
    monkeypatch.setattr(g, "_grounding", lambda *a, **k: "BLOQUE_FUENTES_XYZ")
    def fake_chat(c, m, prompt, **k):
        visto.append(prompt)
        return json.dumps(_OK, ensure_ascii=False)
    monkeypatch.setattr(g, "_chat", fake_chat)
    g.generate_episode(client=object(), model="m", avoid_topics=[])
    assert "BLOQUE_FUENTES_XYZ" in visto[-1]
