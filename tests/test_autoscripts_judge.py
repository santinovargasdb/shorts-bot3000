import json

import pytest

import autoscripts.judge as J

_DATOS = [{"text": "El pulpo tiene sangre azul.", "topic": "pulpo"},
          {"text": "La Luna está hecha de queso.", "topic": "luna"}]


def test_parse_verdict():
    assert J.parse_verdict('{"ok": false, "problema": "la Luna no es de queso"}') == \
        {"ok": False, "problema": "la Luna no es de queso"}


def test_judge_rechaza_si_hay_dato_falso(monkeypatch):
    monkeypatch.setattr(J, "_chat",
                        lambda c, m, p: json.dumps({"ok": False, "problema": "Luna de queso es falso"}))
    v = J.judge_episode(object(), "m", _DATOS)
    assert v["ok"] is False and "Luna" in v["problema"]


def test_judge_aprueba_si_todos_ok(monkeypatch):
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"ok": true, "problema": ""}')
    assert J.judge_episode(object(), "m", _DATOS)["ok"] is True


# ---------- juez narrativo (historia/misterios) ----------

_STORY = {
    "titulo": "El faro cuyos tres guardianes desaparecieron",
    "segments": [
        {"text": "Tres fareros desaparecieron de una isla remota sin dejar rastro."},
        {"text": "La lámpara llevaba días apagada cuando llegó el barco de suministros."},
    ],
}


def test_judge_story_rechaza_si_un_dato_es_falso(monkeypatch):
    visto = {}

    def fake(c, m, p):
        visto["p"] = p
        return json.dumps({"ok": False, "problema": "la fecha es incorrecta"})
    monkeypatch.setattr(J, "_chat", fake)
    v = J.judge_story(object(), "m", _STORY, instr="consigna de misterios")
    assert v["ok"] is False and "fecha" in v["problema"]
    # el prompt lleva el relato y la consigna del canal
    assert "guardianes desaparecieron" in visto["p"]
    assert "consigna de misterios" in visto["p"]


def test_judge_story_aprueba_si_todo_ok(monkeypatch):
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"ok": true, "problema": ""}')
    assert J.judge_story(object(), "m", _STORY, instr="x")["ok"] is True


# ---------- judge_story grounded: la fuente entra en el prompt ----------

def test_judge_story_mete_la_fuente(monkeypatch):
    import autoscripts.judge as J
    visto = {}
    def fake(c, m, p, **k):
        visto["p"] = p
        return '{"contradice": [], "sin_respaldo": [], "leyenda": []}'
    monkeypatch.setattr(J, "_chat", fake)
    story = {"titulo": "T", "segments": [{"text": "algo"}]}
    J.judge_story(object(), "m", story, "instr del juez", source="FUENTE_123")
    assert "FUENTE_123" in visto["p"]


_STORY_SRC = {"titulo": "T", "segments": [{"text": "algo"}]}


def _judge_con_fuente(monkeypatch, respuesta, source):
    import autoscripts.judge as J
    vacio = {"contradice": [], "sin_respaldo": [], "leyenda": []}
    monkeypatch.setattr(J, "_chat", lambda c, m, p, **k: json.dumps({**vacio, **respuesta}))
    return J.judge_story(object(), "m", _STORY_SRC, "instr", source=source)


def test_judge_fuente_descarta_sin_respaldo_si_el_dato_esta_en_la_fuente(monkeypatch):
    # Bug real: decia que Deffaudis no existia, y estaba en la fuente. El codigo descarta esa objecion.
    v = _judge_con_fuente(monkeypatch, {"sin_respaldo": [{"relato": "x", "dato": "Barón Antoine-Louis Deffaudis"}]},
                          "El baron Antoine-Louis Deffaudis reclamo a Mexico.")
    assert v["ok"] is True


def test_judge_fuente_normaliza_cifras_y_acentos(monkeypatch):
    v = _judge_con_fuente(monkeypatch, {"sin_respaldo": [{"relato": "x", "dato": "1342"}]},
                          "It carried 1,342 passengers.")
    assert v["ok"] is True


def test_judge_fuente_rechaza_dato_que_no_esta(monkeypatch):
    v = _judge_con_fuente(monkeypatch, {"sin_respaldo": [{"relato": "un millon", "dato": "1000000 dolares"}]},
                          "The reward was 1,000 dollars.")
    assert v["ok"] is False and "1000000" in v["problema"]


def test_judge_fuente_rechaza_hecho_sin_nombres_ni_cifras(monkeypatch):
    # Un hecho inventado sin nombres ni cifras no se puede comprobar por codigo: la objecion queda.
    v = _judge_con_fuente(monkeypatch, {"sin_respaldo": [{"relato": "x", "dato": "los vecinos huyeron"}]},
                          "Los vecinos huyeron no aparece como dato, pero esta fuente es otra cosa.")
    assert v["ok"] is False


def test_judge_fuente_contradice_exige_cita_textual(monkeypatch):
    # La cita inventada es memoria disfrazada de fuente: se descarta. La cita real rechaza.
    src = "Hong Xiuquan was a failed examination candidate."
    falsa = {"contradice": [{"relato": "x", "fuente": "Hong died of illness in 1864"}]}
    real = {"contradice": [{"relato": "era profesor", "fuente": "was a failed  examination candidate"}]}
    assert _judge_con_fuente(monkeypatch, falsa, src)["ok"] is True
    v = _judge_con_fuente(monkeypatch, real, src)
    assert v["ok"] is False and "profesor" in v["problema"]


def test_judge_fuente_leyenda_como_hecho_siempre_rechaza(monkeypatch):
    v = _judge_con_fuente(monkeypatch, {"leyenda": [{"relato": "el pozo no tiene fondo", "motivo": "es leyenda"}]},
                          "Oak Island is an island.")
    assert v["ok"] is False and "leyenda" in v["problema"]


def test_judge_fuente_sin_objeciones_aprueba(monkeypatch):
    assert _judge_con_fuente(monkeypatch, {}, "Fuente.")["ok"] is True


def test_judge_fuente_respuesta_sin_claves_no_aprueba(monkeypatch):
    # Sesgo del juez: una respuesta que no se entiende nunca aprueba (build.py lo cuenta como fallo).
    import autoscripts.judge as J
    monkeypatch.setattr(J, "_chat", lambda c, m, p, **k: '{"ok": true}')
    with pytest.raises(ValueError):
        J.judge_story(object(), "m", _STORY_SRC, "instr", source="Fuente.")


def test_judge_fuente_usa_temperatura_cero_y_prompt_con_fuente(monkeypatch):
    # A 0.8 el mismo relato salia aprobado y rechazado segun la corrida (Keddie).
    import autoscripts.judge as J
    visto = {}
    def fake(c, m, p, **k):
        visto.update(p=p, **k)
        return '{"contradice": [], "sin_respaldo": [], "leyenda": []}'
    monkeypatch.setattr(J, "_chat", fake)
    J.judge_story(object(), "m", _STORY_SRC, "CONSIGNA", source="FUENTE_Z")
    assert visto["temperature"] == 0
    assert "FUENTE_Z" in visto["p"] and "algo" in visto["p"] and "CONSIGNA" in visto["p"]
    assert "MANDA" in visto["p"]


def test_judge_story_sin_fuente_no_dice_que_mande_la_fuente(monkeypatch):
    import autoscripts.judge as J
    visto = {}
    def fake(c, m, p):
        visto["p"] = p
        return '{"ok": true, "problema": ""}'
    monkeypatch.setattr(J, "_chat", fake)
    J.judge_story(object(), "m", {"titulo": "T", "segments": [{"text": "algo"}]}, "instr")
    assert "La fuente MANDA" not in visto["p"]


def test_judge_story_sin_fuente_sigue_andando(monkeypatch):
    import autoscripts.judge as J
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"ok": false, "problema": "mal"}')
    story = {"titulo": "T", "segments": [{"text": "algo"}]}
    v = J.judge_story(object(), "m", story, "instr")       # sin source (backward-compat)
    assert v["ok"] is False and v["problema"] == "mal"


def test_judge_datos_devuelve_indices_base_cero(monkeypatch):
    import autoscripts.judge as J
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"falsos": [2], "problema": "el 2 es falso"}')
    out = J.judge_datos(object(), "m", [{"text": "a"}, {"text": "b"}, {"text": "c"}])
    assert out["falsos"] == {1}


def test_judge_datos_ambiguo_descarta_todo(monkeypatch):
    import autoscripts.judge as J
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"falsos": ["el segundo"], "problema": "?"}')
    out = J.judge_datos(object(), "m", [{"text": "a"}, {"text": "b"}])
    assert out["falsos"] == {0, 1}


def test_prompt_each_numera_y_pide_falsos():
    import autoscripts.judge as J
    p = J._PROMPT_EACH.format(datos="1. x")
    assert '"falsos"' in p and "Mercurio" in p


def test_judge_datos_descarta_tambien_los_aburridos(monkeypatch):
    import autoscripts.judge as J
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"falsos": [1], "aburridos": [3], "problema": "x"}')
    out = J.judge_datos(object(), "m", [{"text": "a"}, {"text": "b"}, {"text": "c"}])
    assert out["falsos"] == {0, 2}
