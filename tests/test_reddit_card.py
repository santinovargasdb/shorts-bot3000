"""Tests de la tarjeta de post de Reddit (apertura de los videos de ¿Soy el Malo?)."""
from PIL import Image

import reddit_card as rc


def test_human_formatea_conteos():
    assert rc.human(81) == "81"
    assert rc.human(999) == "999"
    assert rc.human(1000) == "1k"
    assert rc.human(2169) == "2.2k"
    assert rc.human(15300) == "15.3k"


def test_render_card_produce_png_transparente(tmp_path):
    out = rc.render_card(
        tmp_path / "c.png", subreddit="relationship_advice",
        title="Mi suegra hizo algo increíble y no vas a creer lo que pasó",
        upvotes=4200, comments=847, username="u/throwaway_1234")
    assert out.exists()
    im = Image.open(out)
    assert im.format == "PNG"
    assert im.mode == "RGBA"                 # transparente, para el overlay del motor
    assert im.width > 500 and im.height > 200  # tarjeta de tamaño razonable
