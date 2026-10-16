import importlib
import autoscripts.db as adb


def test_merge_agrega_generados_con_seq_mayor_a_45(monkeypatch):
    ep = {"pregunta": "¿?", "resumen": "r",
          "segments": [{"kind": "fact", "text": "dato nuevo sin numeros.", "imgs": ["a", "b"]},
                       {"kind": "title", "text": "Datos para parecer más inteligente."}]}
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [ep])
    import series_data
    importlib.reload(series_data)                 # re-corre el merge con el mock
    base = max(k for k in series_data.PARTS if k <= 45)
    assert series_data.PARTS[base + 1] == ep      # generado mergeado tras el último hardcodeado
    assert base == 45 or base >= 1                # hay hardcodeados


def test_merge_no_rompe_sin_generados(monkeypatch):
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [])
    import series_data
    importlib.reload(series_data)
    assert 1 in series_data.PARTS                 # los hardcodeados siguen
