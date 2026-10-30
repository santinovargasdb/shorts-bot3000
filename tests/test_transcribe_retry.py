"""El VAD de faster-whisper a veces explota (IndexError de numpy, 'boolean index ... size 0') con
audio sin voz clara, y mataba el build de streamers_c. transcribe_words ahora reintenta SIN VAD."""
import numpy as np

import src.transcribe as T


class _FakeWord:
    def __init__(self, s, e, w):
        self.start, self.end, self.word = s, e, w


class _FakeSeg:
    def __init__(self, words):
        self.words = words


class _Exploding:
    """Un 'segments' que explota al iterar (simula el VAD rompiendo durante la transcripción)."""
    def __iter__(self):
        raise IndexError("boolean index did not match indexed array along axis 0; "
                         "size of axis is 0 but size of corresponding boolean axis is 1")


def _model(vad_explota: bool, sin_vad_words):
    class M:
        def transcribe(self, audio, language=None, word_timestamps=True, vad_filter=True):
            if vad_filter and vad_explota:
                return _Exploding(), None
            return [_FakeSeg(sin_vad_words)], None
    return M()


def test_collect_words_filtra_vacios_y_none():
    segs = [_FakeSeg([_FakeWord(0, 0.5, " hola "), _FakeWord(0.5, 0.6, "  ")]), _FakeSeg(None)]
    assert [w.text for w in T._collect_words(segs)] == ["hola"]


def test_reintenta_sin_vad_si_el_vad_explota(monkeypatch):
    monkeypatch.setattr(T, "_get_model", lambda sz: _model(True, [_FakeWord(0, 0.5, "che")]))
    monkeypatch.setattr(T, "_decode_audio", lambda p: np.zeros(8000, dtype=np.float32))
    words = T.transcribe_words("x.mp4")
    assert [w.text for w in words] == ["che"]     # se rescató sin VAD, no explotó


def test_usa_vad_si_anda(monkeypatch):
    monkeypatch.setattr(T, "_get_model", lambda sz: _model(False, [_FakeWord(0, 0.5, "ok")]))
    monkeypatch.setattr(T, "_decode_audio", lambda p: np.zeros(8000, dtype=np.float32))
    assert [w.text for w in T.transcribe_words("x.mp4")] == ["ok"]
