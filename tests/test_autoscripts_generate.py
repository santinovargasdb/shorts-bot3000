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
    monkeypatch.setattr(g, "_chat", lambda client, model, prompt: json.dumps(_OK, ensure_ascii=False))
    ep = g.generate_episode(client=object(), model="m", avoid_topics=["algo"])
    assert ep["datos"][0]["topic"] == "pulpo sangre azul"
