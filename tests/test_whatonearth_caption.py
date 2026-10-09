import json
from pathlib import Path

import daily_post
from whatonearth import build, db


def test_build_video_escribe_sidecar(tmp_path, monkeypatch):
    fake = [{"name": "Pangolin", "category": "animal", "query": "pangolin",
             "question_en": "What is this?", "answer_en": "This is a pangolin.",
             "source": "wikimedia", "author": "Bob", "license": "CC BY-SA 4.0",
             "source_url": "http://c/x", "clip_path": "c.mp4"},
            {"name": "Capybara", "category": "animal", "query": "capybara",
             "question_en": "And this?", "answer_en": "This is a capybara.",
             "source": "pixabay", "author": "", "license": "Pixabay", "source_url": "",
             "clip_path": "d.mp4"}]
    monkeypatch.setattr(build, "collect_items", lambda n, work, category="object", **k: fake[:n])
    monkeypatch.setattr(build.render_whatonearth, "render",
                        lambda items, out, work: Path(out).write_bytes(b"MP4") or Path(out))
    conn = db.connect(":memory:"); db.init(conn)
    seq = build.build_video(n=2, out_dir=tmp_path, conn=conn, category="object")
    assert seq == 1
    sidecar = tmp_path / "woe_0001.json"
    assert sidecar.exists()
    data = json.loads(sidecar.read_text(encoding="utf-8"))
    assert "What on earth" in data["title"]
    assert "#" in data["description"]


def test_sidecar_produce_caption_no_stem(tmp_path):
    items = [{"name": "Pangolin", "source": "wikimedia", "author": "Bob",
              "license": "CC BY-SA 4.0", "source_url": "http://c/x"}]
    video = tmp_path / "woe_0001.mp4"; video.write_bytes(b"MP4")
    video.with_suffix(".json").write_text(
        json.dumps({"title": build.make_title(items),
                    "description": build.make_description(items)}, ensure_ascii=False),
        encoding="utf-8")
    tt = daily_post._tt_caption(video)
    ig = daily_post._ig_caption(video)
    assert tt != video.stem and "#" in tt
    assert ig != video.stem
