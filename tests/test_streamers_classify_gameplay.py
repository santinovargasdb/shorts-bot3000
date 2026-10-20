import streamers.verify as V

def test_classify_true(monkeypatch, tmp_path):
    monkeypatch.setattr(V, "_frames", lambda v, n=3: ["f.jpg"])
    monkeypatch.setattr(V, "_gemini", lambda p, f, verbose=True: {"gameplay": True})
    assert V.classify_gameplay(tmp_path / "v.mp4") is True

def test_classify_false(monkeypatch, tmp_path):
    monkeypatch.setattr(V, "_frames", lambda v, n=3: ["f.jpg"])
    monkeypatch.setattr(V, "_gemini", lambda p, f, verbose=True: {"gameplay": False})
    assert V.classify_gameplay(tmp_path / "v.mp4") is False

def test_classify_sin_qc_devuelve_none(monkeypatch, tmp_path):
    monkeypatch.setattr(V, "_frames", lambda v, n=3: ["f.jpg"])
    monkeypatch.setattr(V, "_gemini", lambda p, f, verbose=True: None)
    assert V.classify_gameplay(tmp_path / "v.mp4") is None
