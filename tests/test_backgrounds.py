# tests/test_backgrounds.py
from pathlib import Path

import series_data
import series_historia
import series_misterios

ROOT = Path(series_data.__file__).resolve().parent


def test_pool_tiene_18_clips_y_existen():
    assert len(series_data.BACKGROUNDS) == 18
    for bg in series_data.BACKGROUNDS:
        assert (ROOT / bg).exists(), f"falta el archivo {bg}"


def test_sin_clip_repetido_dentro_del_ciclo():
    # Regresión del incidente 2026-10-04: pt.6-8 de faceless salieron con el
    # mismo clip que pt.1-3 (pool viejo de 5). Dentro de un ciclo completo
    # ningún canal puede repetir un clip exacto.
    n = len(series_data.BACKGROUNDS)
    for serie in (series_data, series_historia, series_misterios):
        fondos = [serie.background_for(p) for p in range(1, n + 1)]
        assert len(set(fondos)) == n, f"{serie.__name__} repite clip dentro del ciclo"


def test_mismo_episodio_distinto_fondo_entre_canales():
    # El desfase entre canales debe evitar que el mismo nro de episodio
    # salga con el mismo fondo en los 3 perfiles.
    for p in range(1, 31):
        fondos = {series_data.background_for(p),
                  series_historia.background_for(p),
                  series_misterios.background_for(p)}
        assert len(fondos) == 3, f"parte {p}: fondo repetido entre canales"
