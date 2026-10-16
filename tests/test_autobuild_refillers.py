from autobuild.config import REFILL, PLATFORM_MAP


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
