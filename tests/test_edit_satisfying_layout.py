import src.edit as E


def test_layout_tres_franjas_usa_ambos_satisfactorios():
    g = E._layout_graph(layout="", face_box=None, width=1080, height=1920,
                        punch="", grade="", subs="subtitles=x.ass", sat_top_idx=1, sat_bot_idx=2)
    assert "[1:v]" in g and "[2:v]" in g
    assert "overlay=0:640" in g and "overlay=0:1280" in g


def test_layout_gaming_usa_satisfactorio_abajo():
    g = E._layout_graph(layout="gaming", face_box=(10, 10, 100, 100), width=1080, height=1920,
                        punch="", grade="", subs="subtitles=x.ass", sat_top_idx=None, sat_bot_idx=1)
    assert "[1:v]" in g
    assert "overlay=0:1236" in g
