# tests/test_autobuild_runway.py
import json
import autobuild.runway as rw


def test_next_part_defaults_to_1_when_no_state(tmp_path):
    missing = tmp_path / "nope.json"
    assert rw.next_part("faceless", missing) == 1


def test_next_part_is_max_over_active_platforms(tmp_path):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({
        "soyelmalo": {"youtube": {"next_part": 24}, "instagram": {"next_part": 23},
                      "tiktok": {"next_part": 26}},
        # faceless tiene TikTok PAUSADO (platforms=yt+ig): tt no cuenta aunque esté más adelantado
        "faceless": {"youtube": {"next_part": 24}, "instagram": {"next_part": 23},
                     "tiktok": {"next_part": 99}},
    }), encoding="utf-8")
    # soyelmalo activa yt+ig+tt -> el más adelantado es tiktok=26
    assert rw.next_part("soyelmalo", state) == 26
    # faceless solo yt+ig -> tiktok=99 se ignora -> max(24, 23) = 24
    assert rw.next_part("faceless", state) == 24


def test_parts_ahead_counts_only_keys_at_or_after_next_part(tmp_path, monkeypatch):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({"streamers_a": {}}), encoding="utf-8")
    # streamers_a: platforms=() -> next_part=1; aprobados con huecos {8,9,11}
    monkeypatch.setattr(rw, "available_parts", lambda ch: {8, 9, 11})
    assert rw.parts_ahead("streamers_a", state) == 3


def test_parts_ahead_respects_posted_position(tmp_path, monkeypatch):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({
        "faceless": {"youtube": {"next_part": 24}, "instagram": {"next_part": 24},
                     "tiktok": {"next_part": 24}}
    }), encoding="utf-8")
    monkeypatch.setattr(rw, "available_parts", lambda ch: set(range(1, 46)))  # 1..45
    assert rw.parts_ahead("faceless", state) == 22   # 24..45 inclusive


def test_runway_days_divides_by_posts_per_day(tmp_path, monkeypatch):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({"faceless": {"youtube": {"next_part": 24},
                     "instagram": {"next_part": 24}, "tiktok": {"next_part": 24}}}),
                     encoding="utf-8")
    monkeypatch.setattr(rw, "available_parts", lambda ch: set(range(1, 46)))
    assert rw.runway_days("faceless", state) == 11.0   # 22 / 2
