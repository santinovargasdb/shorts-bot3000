# tests/test_tt_caption.py
import json
import types

import daily_post
import uploaders.tiktok_upload as tt


def _mk_video(tmp_path, meta: dict | None, name: str = "episodio-7.mp4"):
    video = tmp_path / name
    video.write_bytes(b"\x00")
    if meta is not None:
        video.with_suffix(".json").write_text(
            json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return video


def test_caption_titulo_mas_hashtags(tmp_path):
    video = _mk_video(tmp_path, {
        "title": "El faro de Eilean Mor | Misterios en 60 Segundos",
        "description": ("🕵️ Casos reales.\n\n🔍 Episodio 7: el faro.\n\n"
                        "#shorts #misterio #casosinresolver"),
    })
    assert daily_post._tt_caption(video) == (
        "El faro de Eilean Mor | Misterios en 60 Segundos\n\n"
        "#shorts #misterio #casosinresolver")


def test_caption_con_credito_de_musica_despues_de_hashtags(tmp_path):
    # El crédito de música se agrega DESPUÉS de los hashtags: la línea de
    # hashtags no es la última, hay que buscar la que empieza con '#'.
    video = _mk_video(tmp_path, {
        "title": "Datos para parecer inteligente pt. 3",
        "description": ("¿Querés parecer más inteligente?\n\n"
                        "#shorts #curiosidades #datoscuriosos\n\n"
                        'Música: "Monkeys Spinning Monkeys" Kevin MacLeod (incompetech.com)\n'
                        "Licensed under Creative Commons: By Attribution 4.0"),
    })
    assert daily_post._tt_caption(video) == (
        "Datos para parecer inteligente pt. 3\n\n"
        "#shorts #curiosidades #datoscuriosos")


def test_caption_sin_hashtags_en_descripcion(tmp_path):
    video = _mk_video(tmp_path, {
        "title": "Título pelado",
        "description": "Descripción sin ninguna línea de hashtags.",
    })
    assert daily_post._tt_caption(video) == "Título pelado"


def test_caption_sin_json_usa_el_stem(tmp_path):
    video = _mk_video(tmp_path, None, name="historia-del-faro.mp4")
    assert daily_post._tt_caption(video) == "historia-del-faro"


def _setup_tt(tmp_path, monkeypatch, video):
    """Entorno común para los tests de do_tiktok (token presente, video listo)."""
    token = tmp_path / "tok.json"
    token.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(tt, "TOKEN_FILE", token)
    monkeypatch.setattr(daily_post, "_ensure_video", lambda part, ctx, series: video)
    st = {"tiktok": {"next_part": 1, "posted": []},
          "youtube": {"next_part": 2, "posted": []}}
    ctx = {"name": "faceless"}
    series = types.SimpleNamespace(PARTS={1: {}})
    return st, ctx, series


def test_do_tiktok_publica_directo_con_caption(tmp_path, monkeypatch):
    video = _mk_video(tmp_path, {
        "title": "El faro de Eilean Mor | Misterios en 60 Segundos",
        "description": "Casos reales.\n\n#shorts #misterio",
    })
    st, ctx, series = _setup_tt(tmp_path, monkeypatch, video)
    monkeypatch.setattr(daily_post, "TT_PRIVACY", "SELF_ONLY")
    monkeypatch.setattr(tt, "creator_info",
                        lambda: {"privacy_level_options": ["PUBLIC_TO_EVERYONE", "SELF_ONLY"]})
    llamadas = {}

    def fake_publish(video_path, title, privacy_level, **kw):
        llamadas.update(title=title, privacy=privacy_level)
        return "pid123"

    monkeypatch.setattr(tt, "publish_direct", fake_publish)
    monkeypatch.setattr(tt, "upload_draft",
                        lambda v: (_ for _ in ()).throw(AssertionError("no debería ir a borradores")))
    monkeypatch.setattr(tt, "fetch_status",
                        lambda pid: {"data": {"status": "PUBLISH_COMPLETE"}})

    daily_post.do_tiktok(st, ctx, series)

    assert llamadas["privacy"] == "SELF_ONLY"
    assert llamadas["title"] == ("El faro de Eilean Mor | Misterios en 60 Segundos\n\n"
                                 "#shorts #misterio")
    assert st["tiktok"]["next_part"] == 2
    assert st["tiktok"]["posted"][0]["publish_id"] == "pid123"
    assert st["tiktok"]["posted"][0]["modo"] == "directo"


def test_do_tiktok_fallback_a_borradores_si_privacidad_no_disponible(tmp_path, monkeypatch):
    # Cuenta en privado: PUBLIC_TO_EVERYONE no está entre las opciones.
    video = _mk_video(tmp_path, {"title": "T", "description": "#shorts"})
    st, ctx, series = _setup_tt(tmp_path, monkeypatch, video)
    monkeypatch.setattr(daily_post, "TT_PRIVACY", "PUBLIC_TO_EVERYONE")
    monkeypatch.setattr(tt, "creator_info",
                        lambda: {"privacy_level_options": ["SELF_ONLY", "FOLLOWER_OF_CREATOR"]})
    monkeypatch.setattr(tt, "publish_direct",
                        lambda *a, **kw: (_ for _ in ()).throw(AssertionError("no debería publicar directo")))
    monkeypatch.setattr(tt, "upload_draft", lambda v: "piddraft")

    daily_post.do_tiktok(st, ctx, series)

    assert st["tiktok"]["next_part"] == 2
    assert st["tiktok"]["posted"][0]["publish_id"] == "piddraft"
    assert st["tiktok"]["posted"][0]["modo"] == "borrador"
