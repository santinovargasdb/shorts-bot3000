import pytest

from autobuild.config import REFILL, PLATFORM_MAP
import autobuild.refillers as rf


def test_refill_table_shape():
    assert set(PLATFORM_MAP) == {"yt", "ig", "tt"}
    required = {"target_days", "critical_days", "posts_per_day", "yield",
                "max_attempts", "batch", "gen"}
    for channel, cfg in REFILL.items():
        assert required <= set(cfg), f"{channel} le faltan claves"
        assert cfg["gen"] in {"clips", "whatonearth", "reddit", "script"}
    # Los 3 streamers + whatonearth + soyelmalo + los 3 de guiones (placeholder)
    assert {"streamers_a", "streamers_b", "streamers_c", "whatonearth",
            "soyelmalo", "faceless", "historia", "misterios"} <= set(REFILL)


def test_refill_clips_llama_build_backlog(monkeypatch):
    calls = []
    monkeypatch.setattr("streamers.build.build_backlog",
                        lambda ch, n: calls.append((ch, n)))
    rf.REFILLERS["clips"]("streamers_a", 5)
    assert calls == [("streamers_a", 5)]


def test_refill_whatonearth_llama_build_video_n_veces(monkeypatch):
    calls = []
    monkeypatch.setattr("whatonearth.build.build_video",
                        lambda: calls.append(1) or 1)
    rf.REFILLERS["whatonearth"]("whatonearth", 3)
    assert len(calls) == 3


def test_refill_reddit_llama_cmd_rewrite(monkeypatch):
    calls = []
    monkeypatch.setattr("reddit_pipeline.__main__.cmd_rewrite",
                        lambda n: calls.append(n))
    rf.REFILLERS["reddit"]("soyelmalo", 3)
    assert calls == [3]


def test_refill_script_levanta_not_implemented():
    with pytest.raises(NotImplementedError):
        rf.REFILLERS["script"]("faceless", 1)
