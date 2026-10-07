import json
import pytest
import reddit_pipeline.rewrite as rw

VALID = {"guion": " ".join(["palabra"] * 120), "narrador_genero": "M",
         "titulo": "Mi ex", "veredicto": "se pasó", "cierre": "¿vos qué harías?"}


class _FakeClient:
    """Cliente LLM falso: devuelve respuestas en cola. Imita client.chat.completions.create."""
    def __init__(self, responses):
        self._r = list(responses)
        self.chat = self
        self.completions = self

    def create(self, **kw):
        content = self._r.pop(0)
        msg = type("M", (), {"content": content})()
        choice = type("C", (), {"message": msg})()
        return type("R", (), {"choices": [choice]})()


def test_parse_json_plano():
    assert rw.parse_rewrite(json.dumps(VALID))["narrador_genero"] == "M"


def test_parse_con_fences():
    raw = "```json\n" + json.dumps(VALID) + "\n```"
    assert rw.parse_rewrite(raw)["titulo"] == "Mi ex"


def test_parse_falta_clave():
    bad = {k: v for k, v in VALID.items() if k != "cierre"}
    with pytest.raises(ValueError):
        rw.parse_rewrite(json.dumps(bad))


def test_parse_genero_invalido():
    with pytest.raises(ValueError):
        rw.parse_rewrite(json.dumps({**VALID, "narrador_genero": "X"}))


def test_rewrite_ok_sin_retry():
    client = _FakeClient([json.dumps(VALID)])
    out = rw.rewrite_story({"body": "x"}, client, "m")
    assert rw.word_count(out["guion"]) == 120


def test_rewrite_reintenta_si_largo():
    largo = {**VALID, "guion": " ".join(["x"] * 400)}
    client = _FakeClient([json.dumps(largo), json.dumps(VALID)])
    out = rw.rewrite_story({"body": "x"}, client, "m", max_retries=2)
    assert 110 <= rw.word_count(out["guion"]) <= 160


def test_rewrite_falla_si_no_converge():
    largo = {**VALID, "guion": " ".join(["x"] * 400)}
    client = _FakeClient([json.dumps(largo), json.dumps(largo), json.dumps(largo)])
    with pytest.raises(ValueError):
        rw.rewrite_story({"body": "x"}, client, "m", max_retries=2)
