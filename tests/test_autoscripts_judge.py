import json
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
