# tests/test_whatonearth_build.py
from whatonearth import build


def test_make_description_formato():
    items = [{"name": "Pangolin", "source": "wikimedia", "author": "Bob",
              "license": "CC BY-SA 4.0", "source_url": "http://c/x"}]
    desc = build.make_description(items)
    lines = desc.splitlines()
    assert lines[0].strip()                 # hook en 1ª línea
    assert any("#" in ln for ln in lines)   # hashtags
    assert "Bob" in desc and "CC BY-SA 4.0" in desc   # atribución CC
    assert "DM" in desc or "dm" in desc.lower()        # disclaimer de cortesía


def test_collect_items_repone_caidos():
    # 2 temas dan clip, 1 no; pedimos 2 -> debe reponer con una 2da ronda
    temas = iter([
        [{"name": "A", "category": "animal", "query": "a", "question_en": "q", "answer_en": "a"},
         {"name": "B", "category": "place", "query": "b", "question_en": "q", "answer_en": "a"}],
        [{"name": "C", "category": "object", "query": "c", "question_en": "q", "answer_en": "a"}],
    ])
    found = {"a": {"local_path": "a.mp4", "source": "pixabay", "author": "", "license": "", "source_url": ""},
             "b": None,  # B se cae
             "c": {"local_path": "c.mp4", "source": "pixabay", "author": "", "license": "", "source_url": ""}}

    items = build.collect_items(
        2, "work",
        _gen=lambda n, exclude: next(temas),
        _find=lambda q, wd: found.get(q))
    assert [it["name"] for it in items] == ["A", "C"]


def test_collect_items_corta_tras_tope():
    # nunca hay clips -> no cuelga, devuelve menos de n
    items = build.collect_items(
        3, "work",
        _gen=lambda n, exclude: [{"name": "Z", "category": "x", "query": "z",
                                  "question_en": "q", "answer_en": "a"}],
        _find=lambda q, wd: None, max_rounds=3)
    assert items == []
