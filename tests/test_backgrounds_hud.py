# tests/test_backgrounds_hud.py — §8/§1 de la fórmula: el fondo no debe tener la
# interfaz del juego (HUD de Subway Surfers: botón de pausa, contador de monedas,
# puntaje) tapando la pantalla. Esos clips quedan excluidos de la rotación.
import series_data
import series_historia
import series_misterios
import series_reddit

SERIES_CON_ROTACION = (series_data, series_historia, series_misterios, series_reddit)


def test_existe_lista_de_exclusion_de_clips_con_hud():
    # Los Subway Surfers tienen HUD; deben estar marcados como excluidos.
    assert hasattr(series_data, "HUD_BACKGROUNDS")
    assert any("subway" in b.lower() for b in series_data.HUD_BACKGROUNDS)


def test_pool_limpio_no_contiene_clips_con_hud():
    clean = series_data.CLEAN_BACKGROUNDS
    assert clean, "el pool limpio no puede quedar vacío"
    for b in clean:
        assert b not in series_data.HUD_BACKGROUNDS, f"{b} tiene HUD y no debería rotar"
    # Y ninguno de los Subway sobrevive en el pool limpio.
    assert not any("subway" in b.lower() for b in clean)


def test_background_for_nunca_devuelve_un_clip_con_hud():
    n = len(series_data.CLEAN_BACKGROUNDS)
    for serie in SERIES_CON_ROTACION:
        for p in range(1, 2 * n + 2):
            bg = serie.background_for(p)
            assert bg not in series_data.HUD_BACKGROUNDS, \
                f"{serie.__name__}.background_for({p}) devolvió un clip con HUD: {bg}"


def test_el_pool_completo_sigue_documentando_los_18_clips():
    # No borramos archivos: BACKGROUNDS sigue siendo el inventario completo.
    assert len(series_data.BACKGROUNDS) == 18
    assert series_data.CLEAN_BACKGROUNDS == [
        b for b in series_data.BACKGROUNDS if b not in series_data.HUD_BACKGROUNDS]
