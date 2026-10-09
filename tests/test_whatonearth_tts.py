# tests/test_whatonearth_tts.py
import base64
import pytest
from whatonearth import tts


class _Resp:
    def __init__(self, status, payload):
        self.status_code = status
        self._payload = payload
        self.text = str(payload)

    def json(self):
        return self._payload


def test_synth_usa_primer_endpoint(monkeypatch, tmp_path):
    audio = b"ID3fake-mp3-bytes"
    calls = []

    def fake_post(url, json=None, timeout=None, headers=None):
        calls.append(url)
        return _Resp(200, {"data": base64.b64encode(audio).decode()})

    monkeypatch.setattr(tts.requests, "post", fake_post)
    out = tmp_path / "a.mp3"
    tts.synth("hello", "en_us_006", out)
    assert out.read_bytes() == audio
    assert len(calls) == 1  # no necesita fallback


def test_synth_cae_al_fallback(monkeypatch, tmp_path):
    audio = b"second-endpoint-bytes"

    def fake_post(url, json=None, timeout=None, headers=None):
        if "weilnet" in url:
            return _Resp(500, "boom")
        return _Resp(200, {"base64": base64.b64encode(audio).decode()})

    monkeypatch.setattr(tts.requests, "post", fake_post)
    out = tmp_path / "b.mp3"
    tts.synth("hi", "en_us_001", out)
    assert out.read_bytes() == audio


def test_synth_falla_si_todos_caen(monkeypatch, tmp_path):
    monkeypatch.setattr(tts.requests, "post",
                        lambda *a, **k: _Resp(500, "boom"))
    with pytest.raises(RuntimeError):
        tts.synth("x", "en_us_006", tmp_path / "c.mp3")
