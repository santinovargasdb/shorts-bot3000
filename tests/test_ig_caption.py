# tests/test_ig_caption.py
import json

import daily_post

DESC_COMPLETA = (
    "🕵️ Casos reales que nadie pudo explicar, contados en un minuto.\n\n"
    "🔍 Episodio 7: el faro de Eilean Mor.\n\n"
    "💡 Seguime para un misterio nuevo cada día.\n\n"
    "misterios, casos sin resolver, enigmas.\n\n"
    "#shorts #misterio #casosinresolver #enigmas #misterioreal #misteriosdelmundo\n\n"
    '"Long Note Two" Kevin MacLeod (incompetech.com)\n'
    "Licensed under Creative Commons: By Attribution 4.0 License\n"
    "http://creativecommons.org/licenses/by/4.0/"
)


def _mk_video(tmp_path, meta: dict | None, name: str = "episodio-7.mp4"):
    video = tmp_path / name
    video.write_bytes(b"\x00")
    if meta is not None:
        video.with_suffix(".json").write_text(
            json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return video


def test_ig_caption_titulo_gancho_hashtags_y_credito(tmp_path):
    # Sin #shorts (es de YouTube), máx 5 tags, y el crédito CC-BY se conserva.
    video = _mk_video(tmp_path, {
        "title": "El faro de Eilean Mor | Misterios en 60 Segundos",
        "description": DESC_COMPLETA,
    })
    assert daily_post._ig_caption(video) == (
        "El faro de Eilean Mor | Misterios en 60 Segundos\n\n"
        "🕵️ Casos reales que nadie pudo explicar, contados en un minuto.\n\n"
        "#misterio #casosinresolver #enigmas #misterioreal #misteriosdelmundo\n\n"
        '"Long Note Two" Kevin MacLeod (incompetech.com)\n'
        "Licensed under Creative Commons: By Attribution 4.0 License\n"
        "http://creativecommons.org/licenses/by/4.0/")


def test_ig_caption_sin_credito(tmp_path):
    video = _mk_video(tmp_path, {
        "title": "Título",
        "description": "Gancho de apertura.\n\n#uno #dos",
    })
    assert daily_post._ig_caption(video) == "Título\n\nGancho de apertura.\n\n#uno #dos"


def test_ig_caption_recorta_a_cinco_hashtags(tmp_path):
    video = _mk_video(tmp_path, {
        "title": "T",
        "description": "Gancho.\n\n#a #b #c #d #e #f #g",
    })
    assert daily_post._ig_caption(video) == "T\n\nGancho.\n\n#a #b #c #d #e"


def test_ig_caption_sin_json_usa_el_stem(tmp_path):
    video = _mk_video(tmp_path, None, name="parte-3.mp4")
    assert daily_post._ig_caption(video) == "parte-3"


def test_do_instagram_usa_el_caption_corto(tmp_path, monkeypatch):
    import src.gh_release as ghr
    import uploaders.instagram_upload as igu

    video = _mk_video(tmp_path, {
        "title": "Título corto",
        "description": "Gancho.\n\n#uno #dos",
    })
    monkeypatch.setenv("GITHUB_TOKEN", "x")
    monkeypatch.setattr(daily_post, "_ig_creds",
                        lambda ctx: {"user_id": "u1", "access_token": "tok"})
    monkeypatch.setattr(daily_post, "_refresh_ig_token", lambda st, ctx: None)
    monkeypatch.setattr(daily_post, "_ensure_video", lambda part, ctx, series: video)
    monkeypatch.setattr(ghr, "upload", lambda v: "https://host/v.mp4")
    llamadas = {}

    def fake_publish_reel(url, caption, ig_user_id, access_token):
        llamadas.update(url=url, caption=caption)
        return "media1"

    monkeypatch.setattr(igu, "publish_reel", fake_publish_reel)

    import types
    st = {"instagram": {"next_part": 1, "posted": []},
          "youtube": {"next_part": 2, "posted": []}}
    ctx = {"name": "faceless", "ig_creds": None}
    series = types.SimpleNamespace(PARTS={1: {}})
    daily_post.do_instagram(st, ctx, series)

    assert llamadas["caption"] == "Título corto\n\nGancho.\n\n#uno #dos"
    assert st["instagram"]["next_part"] == 2
    assert st["instagram"]["posted"][0]["media_id"] == "media1"
