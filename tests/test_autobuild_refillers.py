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


def test_refill_script_canal_no_implementado_levanta_not_implemented():
    # Un canal 'script' que todavía no tiene generador (p.ej. un futuro 'mente') sigue saltando.
    with pytest.raises(NotImplementedError):
        rf.REFILLERS["script"]("mente", 1)


def test_refill_clips_resuelve_pendientes_antes_de_buildear(monkeypatch):
    import streamers.verify as verify
    import streamers.build as build
    monkeypatch.setattr(verify, "QUOTA_HIT", False)
    monkeypatch.setattr(verify, "reset_quota", lambda: setattr(verify, "QUOTA_HIT", False))
    calls = []
    monkeypatch.setattr(build, "resolve_pending", lambda ch, **k: calls.append(("resolve", ch)) or 0)
    monkeypatch.setattr(build, "build_backlog", lambda ch, n: calls.append(("build", ch, n)))
    rf.REFILLERS["clips"]("streamers_a", 5)
    assert calls == [("resolve", "streamers_a"), ("build", "streamers_a", 5)]  # resolve ANTES de build


def test_refill_clips_levanta_quota_exhausted_si_se_agota(monkeypatch):
    import streamers.verify as verify
    import streamers.build as build
    from autobuild.errors import QuotaExhausted
    monkeypatch.setattr(verify, "QUOTA_HIT", False)
    monkeypatch.setattr(verify, "reset_quota", lambda: setattr(verify, "QUOTA_HIT", False))
    monkeypatch.setattr(build, "resolve_pending", lambda ch, **k: 0)

    def fake_build(ch, n):
        verify.QUOTA_HIT = True            # la cuota se agota durante el build
    monkeypatch.setattr(build, "build_backlog", fake_build)
    with pytest.raises(QuotaExhausted):
        rf.REFILLERS["clips"]("streamers_a", 5)


def test_refill_clips_salta_build_si_resolve_ya_agoto_quota(monkeypatch):
    import streamers.verify as verify
    import streamers.build as build
    from autobuild.errors import QuotaExhausted
    monkeypatch.setattr(verify, "QUOTA_HIT", False)
    monkeypatch.setattr(verify, "reset_quota", lambda: setattr(verify, "QUOTA_HIT", False))
    monkeypatch.setattr(build, "resolve_pending",
                        lambda ch, **k: setattr(verify, "QUOTA_HIT", True) or 0)
    built = []
    monkeypatch.setattr(build, "build_backlog", lambda ch, n: built.append(n))
    with pytest.raises(QuotaExhausted):
        rf.REFILLERS["clips"]("streamers_a", 5)
    assert built == []                     # no intentó buildear si ya no había cuota


def test_refill_script_faceless_corre_autoscripts(monkeypatch):
    import autoscripts.build as ab
    llamado = []
    monkeypatch.setattr(ab, "build", lambda ch, n: llamado.append((ch, n)) or 1)
    rf.REFILLERS["script"]("faceless", 3)
    assert llamado == [("faceless", 3)]


def test_refill_script_historia_corre_autoscripts(monkeypatch):
    import autoscripts.build as ab
    llamado = []
    monkeypatch.setattr(ab, "build", lambda ch, n: llamado.append((ch, n)) or 1)
    rf.REFILLERS["script"]("historia", 1)
    assert llamado == [("historia", 1)]


def test_refill_script_misterios_corre_autoscripts(monkeypatch):
    import autoscripts.build as ab
    llamado = []
    monkeypatch.setattr(ab, "build", lambda ch, n: llamado.append((ch, n)) or 1)
    rf.REFILLERS["script"]("misterios", 2)
    assert llamado == [("misterios", 2)]
