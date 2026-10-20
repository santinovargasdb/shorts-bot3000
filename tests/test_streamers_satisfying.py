from pathlib import Path
import streamers.satisfying as S

def _pool(tmp, k):
    d = tmp / "sat"; d.mkdir()
    for i in range(k):
        (d / f"sat_{i:02d}.mp4").write_bytes(b"\x00")
    return d

def test_pick_devuelve_n_distintos(tmp_path):
    pool, st = _pool(tmp_path, 6), tmp_path / "state.json"
    got = S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st)
    assert len(got) == 2 and got[0] != got[1]

def test_no_repite_vs_video_anterior(tmp_path):
    pool, st = _pool(tmp_path, 6), tmp_path / "state.json"
    first = set(S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st))
    second = set(S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st))
    assert first.isdisjoint(second)

def test_pool_chico_no_rompe(tmp_path):
    pool, st = _pool(tmp_path, 1), tmp_path / "state.json"
    got = S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st)
    assert len(got) >= 1

def test_canales_independientes(tmp_path):
    pool, st = _pool(tmp_path, 6), tmp_path / "state.json"
    S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st)
    got_b = S.pick_for("streamers_b", 2, pool_dir=pool, state_path=st)
    assert len(got_b) == 2
