# tests/test_whatonearth_topics.py
from whatonearth import topics


def test_parse_topics_extrae_validos():
    raw = '''Here you go:
    [
      {"name":"Pangolin","category":"animal","query":"pangolin",
       "question_en":"What kind of animal is this?","answer_en":"This is a pangolin."},
      {"name":"","category":"animal","query":"x","question_en":"q","answer_en":"a"}
    ]'''
    out = topics.parse_topics(raw)
    assert len(out) == 1
    assert out[0]["name"] == "Pangolin"
    assert out[0]["query"] == "pangolin"


def test_parse_topics_json_roto_devuelve_vacio():
    assert topics.parse_topics("no json here") == []


def test_generate_topics_usa_cliente(monkeypatch):
    fake_json = ('[{"name":"Axolotl","category":"animal","query":"axolotl",'
                 '"question_en":"What is this?","answer_en":"This is an axolotl."}]')

    class _Msg:
        content = fake_json

    class _Choice:
        message = _Msg()

    class _Resp:
        choices = [_Choice()]

    class _Client:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return _Resp()

    monkeypatch.setattr(topics, "build_client", lambda: _Client())
    out = topics.generate_topics(1)
    assert out[0]["name"] == "Axolotl"
