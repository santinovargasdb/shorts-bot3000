"""Formato "juego" del carril prioritario: juego a pantalla completa + título descriptivo."""
import json
from datetime import date

from streamers import config as scfg, db
from streamers.build import _transcript_of
from streamers.titles import clean_title, game_title


def test_el_juego_prioritario_declara_el_formato_juego():
    pg = scfg.priority_game(scfg.get("streamers_a"), today=date(2026, 11, 25))
    assert pg["layout"] == "juego" and pg["smart_title"] is True


def test_titulo_valido_se_limpia():
    assert clean_title('"Trevor Phillips aparece en la radio de GTA 6" 😂🎮 #gta6', "GTA 6") == \
        "Trevor Phillips aparece en la radio de GTA 6"


def test_titulo_sin_el_juego_se_descarta():
    assert clean_title("Trevor Phillips aparece en la radio", "GTA 6") is None


def test_titulo_no_o_vacio_o_largo_se_descarta():
    assert clean_title("NO", "GTA 6") is None
    assert clean_title("", "GTA 6") is None
    assert clean_title(None, "GTA 6") is None
    assert clean_title("GTA 6 " + "x" * 80, "GTA 6") is None
    assert clean_title("GTA 6: ah", "GTA 6") is None            # no describe nada


def test_sin_habla_no_se_llama_al_llm(monkeypatch):
    import reddit_pipeline.rewrite as rw
    monkeypatch.setattr(rw, "build_client", lambda: (_ for _ in ()).throw(AssertionError("no debía llamar")))
    assert game_title("yeu", "eh jaja", "GTA 6", "auronplay") is None


def test_si_el_llm_falla_no_rompe(monkeypatch):
    import reddit_pipeline.rewrite as rw
    monkeypatch.setattr(rw, "build_client", lambda: (_ for _ in ()).throw(RuntimeError("sin cuota")))
    assert game_title("yeu", "mirá esto que está sonando en la radio es Trevor", "GTA 6") is None


def test_transcript_sale_del_json_del_render(tmp_path):
    (tmp_path / "x_clip01.json").write_text(json.dumps(
        {"description": "es trevor en la radio tío\n\n#shorts #viral"}), encoding="utf-8")
    assert _transcript_of(tmp_path / "x_clip01.mp4") == "es trevor en la radio tío"
    assert _transcript_of(tmp_path / "no_existe.mp4") == ""


def test_la_db_guarda_el_formato(tmp_path):
    conn = db.connect(tmp_path / "b.sqlite")
    a = db.add_clip(conn, title="t", description="d", video_path="v", streamer="s", clip_id="1",
                    priority=True, variant="juego")
    b = db.add_clip(conn, title="t", description="d", video_path="v", streamer="s", clip_id="2")
    filas = {c["seq"]: c for c in db.all_clips(conn)}
    assert filas[a]["variant"] == "juego" and filas[b]["variant"] == ""
