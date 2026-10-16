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
