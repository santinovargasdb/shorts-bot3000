"""Rotación de claves del LLM (Groq): con varias claves (cada cuenta = su propio presupuesto diario
de tokens), el cliente usa una hasta que da 429 y cae a la siguiente; solo falla si TODAS están sin
cuota. Un error que NO es de cuota se re-lanza sin rotar. Mismo criterio que el Gemini de streamers."""
import pytest

import reddit_pipeline.rewrite as R


class _RateLimit(Exception):
    status_code = 429

    def __init__(self):
        super().__init__("Error code: 429 - rate_limit_exceeded (tokens per day)")


class _FakeClient:
    """Cliente falso con .chat.completions.create. `script`: por llamada, 'RL' -> 429, una Exception
    -> se lanza, otra cosa -> se devuelve (clampea en el último si se piden más llamadas)."""
    def __init__(self, script):
        self._script = list(script)
        self.calls = 0
        outer = self

        class _Completions:
            def create(self, **kwargs):
                outer.calls += 1
                r = outer._script[min(outer.calls - 1, len(outer._script) - 1)]
                if r == "RL":
                    raise _RateLimit()
                if isinstance(r, Exception):
                    raise r
                return r

        self.chat = type("Chat", (), {"completions": _Completions()})()


def test_rotating_usa_la_primera_si_anda():
    c1, c2 = _FakeClient(["A"]), _FakeClient(["B"])
    comp = R._RotatingCompletions([c1, c2])
    assert comp.create(model="m") == "A"
    assert c2.calls == 0            # no tocó la segunda


def test_rotating_cae_a_la_segunda_en_429():
    c1, c2 = _FakeClient(["RL"]), _FakeClient(["B"])
    comp = R._RotatingCompletions([c1, c2])
    assert comp.create(model="m") == "B"


def test_rotating_recuerda_la_clave_viva():
    # una vez agotada la 1ª, las siguientes llamadas arrancan directo en la 2ª (no reintenta la muerta)
    c1, c2 = _FakeClient(["RL", "A2"]), _FakeClient(["B1", "B2"])
    comp = R._RotatingCompletions([c1, c2])
    assert comp.create(model="m") == "B1"
    assert comp.create(model="m") == "B2"
    assert c1.calls == 1


def test_rotating_falla_si_todas_sin_cuota():
    comp = R._RotatingCompletions([_FakeClient(["RL"]), _FakeClient(["RL"])])
    with pytest.raises(_RateLimit):
        comp.create(model="m")


def test_rotating_no_rota_en_error_que_no_es_cuota():
    class _Boom(Exception):
        pass
    c1, c2 = _FakeClient([_Boom()]), _FakeClient(["B"])
    comp = R._RotatingCompletions([c1, c2])
    with pytest.raises(_Boom):
        comp.create(model="m")     # error que no es 429 -> re-lanza, NO rota
    assert c2.calls == 0


def test_llm_keys_junta_y_dedup(monkeypatch):
    monkeypatch.setattr(R, "load_env", lambda: None)
    monkeypatch.setenv("LLM_API_KEY", "k1, k2")
    monkeypatch.setenv("LLM_API_KEY_2", "k2, k3")     # k2 repetida -> se dedup
    assert R._llm_keys() == ["k1", "k2", "k3"]


def test_llm_keys_lee_cuentas_numeradas(monkeypatch):
    # el usuario puede sumar cuentas como vars separadas: LLM_API_KEY_2, LLM_API_KEY_3, ...
    monkeypatch.setattr(R, "load_env", lambda: None)
    monkeypatch.setenv("LLM_API_KEY", "k1")
    monkeypatch.setenv("LLM_API_KEY_2", "k2")
    monkeypatch.setenv("LLM_API_KEY_3", "k3")
    assert R._llm_keys() == ["k1", "k2", "k3"]
