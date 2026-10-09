import build_ripped


def test_manifest_to_items_mapea_y_resuelve():
    man = {"category": "animal", "items": [
        {"name": "Saola", "clip": "clips/saola.mp4", "credit": "@u (url)"},
        {"name": "Kakapo", "clip": "clips/kakapo.mp4", "credit": "@v",
         "question": "What bird is this?", "answer": "This is a kakapo."},
    ]}
    cat, items = build_ripped.manifest_to_items(man, "C:/base")
    assert cat == "animal"
    # ítem 0: question del pool animal, answer default "This is <name>."
    assert items[0]["question_en"] in build_ripped._Q["animal"]
    assert items[0]["answer_en"] == "This is Saola."
    assert items[0]["clip_path"].replace("\\", "/").endswith("base/clips/saola.mp4")
    assert items[0]["credit"] == "@u (url)"
    # ítem 1: overrides respetados
    assert items[1]["question_en"] == "What bird is this?"
    assert items[1]["answer_en"] == "This is a kakapo."


def test_build_caption_tiene_titulo_creditos_disclaimer():
    _, items = build_ripped.manifest_to_items(
        {"category": "animal", "items": [
            {"name": "Saola", "clip": "a.mp4", "credit": "@u (url)"}]}, "/b")
    cap = build_ripped.build_caption("animal", items)
    assert cap.splitlines()[0].startswith("What animal on earth is this?!")
    assert "#shorts" in cap
    assert "Credits:" in cap and "Saola: @u (url)" in cap
    assert "DM us for credit or removal" in cap


def test_build_caption_place_title():
    _, items = build_ripped.manifest_to_items(
        {"category": "place", "items": [{"name": "Socotra", "clip": "a.mp4"}]}, "/b")
    cap = build_ripped.build_caption("place", items)
    assert cap.startswith("What place on earth is this?!")
    assert "Socotra: (uncredited)" in cap
