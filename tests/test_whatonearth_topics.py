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


def test_parse_topics_captura_fact_en():
    raw = ('[{"name":"Glass frog","category":"animal","query":"glass frog",'
           '"question_en":"What is this?","answer_en":"This is a glass frog.",'
           '"fact_en":"They use their skin to camouflage."}]')
    out = topics.parse_topics(raw)
    assert out[0]["fact_en"] == "They use their skin to camouflage."


def test_parse_topics_sin_fact_en_sigue_valido():
    # fact_en es OPCIONAL: un ítem sin ese campo sigue siendo válido (ítems viejos / el LLM lo omite).
    raw = ('[{"name":"Pangolin","category":"animal","query":"pangolin",'
           '"question_en":"What is this?","answer_en":"This is a pangolin."}]')
    out = topics.parse_topics(raw)
    assert len(out) == 1 and "fact_en" not in out[0]


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
