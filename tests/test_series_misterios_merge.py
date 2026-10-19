import importlib

import autoscripts.db as adb

_EP = {"pregunta": "¿Caso o leyenda?", "titulo": "Un misterio generado", "resumen": "resumen",
       "segments": [{"kind": "fact", "text": "momento narrado sin numeros.", "imgs": ["a", "b"]}]}


def test_merge_agrega_generados_tras_los_hardcodeados(monkeypatch):
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [_EP] if ch == "misterios" else [])
    import series_misterios
    importlib.reload(series_misterios)                 # re-corre el merge con el mock
    base = max(k for k in series_misterios.MISTERIOS if k <= 40)
    assert series_misterios.MISTERIOS[base + 1] == _EP  # generado mergeado tras el último hardcodeado
    assert series_misterios.PARTS is series_misterios.MISTERIOS


def test_merge_no_rompe_sin_generados(monkeypatch):
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [])
    import series_misterios
    importlib.reload(series_misterios)
    assert 1 in series_misterios.MISTERIOS             # los hardcodeados siguen
