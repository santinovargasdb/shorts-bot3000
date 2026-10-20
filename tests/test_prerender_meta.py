"""Los canales con video PRE-RENDERIZADO (streamers_a/b/c, whatonearth) exponen video_path_for
pero NO escriben el .json de metadatos -> al subir, title/caption caían al NOMBRE DEL ARCHIVO
(ej. 'streamers_c_0001'). _ensure_video ahora escribe el .json con el título real de la serie
(title_for/descripcion), así upload_from_folder / _ig_caption / _tt_caption lo usan."""
import json
import types

import daily_post


def test_ensure_video_prerender_escribe_json_con_titulo_real(tmp_path):
    vid = tmp_path / "streamers_c_0001.mp4"
    vid.write_bytes(b"\x00")
    series = types.SimpleNamespace(
        video_path_for=lambda p: str(vid),
        title_for=lambda p: "ibai farmea aura 😂🎮",
        descripcion=lambda p, r: "Un clip de ibai.",
        KEYWORDS=["clips", "twitch"],
        PARTS={1: {"resumen": "x"}},
    )
    out = daily_post._ensure_video(1, {}, series)
    assert out == vid
    meta = json.loads(vid.with_suffix(".json").read_text(encoding="utf-8"))
    assert meta["title"] == "ibai farmea aura 😂🎮"       # título real, NO 'streamers_c_0001'
    assert meta["hashtags"] == ["clips", "twitch"]
    assert meta["description"] == "Un clip de ibai."


def test_ensure_video_prerender_no_pisa_json_existente(tmp_path):
    vid = tmp_path / "v.mp4"
    vid.write_bytes(b"\x00")
    vid.with_suffix(".json").write_text('{"title": "ya estaba"}', encoding="utf-8")
    series = types.SimpleNamespace(video_path_for=lambda p: str(vid),
                                   title_for=lambda p: "nuevo", PARTS={1: {}})
    daily_post._ensure_video(1, {}, series)
    assert json.loads(vid.with_suffix(".json").read_text(encoding="utf-8"))["title"] == "ya estaba"
