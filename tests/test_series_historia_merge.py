import importlib

import autoscripts.db as adb

_EP = {"pregunta": "¿Real o leyenda?", "titulo": "Un episodio generado", "resumen": "resumen",
       "segments": [{"kind": "fact", "text": "momento narrado sin numeros.", "imgs": ["a", "b"]}]}


def test_merge_agrega_generados_tras_los_hardcodeados(monkeypatch):
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [_EP] if ch == "historia" else [])
    import series_historia
    importlib.reload(series_historia)                 # re-corre el merge con el mock
    base = max(k for k in series_historia.HISTORIAS if k <= 40)
    assert series_historia.HISTORIAS[base + 1] == _EP  # generado mergeado tras el último hardcodeado
    assert series_historia.PARTS is series_historia.HISTORIAS


def test_merge_no_rompe_sin_generados(monkeypatch):
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [])
    import series_historia
    importlib.reload(series_historia)
    assert 1 in series_historia.HISTORIAS             # los hardcodeados siguen
