# tests/test_ig_first_comment.py
import json
import types

import daily_post
import src.gh_release as ghr
import uploaders.instagram_upload as igu
from channels_registry import CHANNELS


def _setup_ig(tmp_path, monkeypatch, first_comment):
    video = tmp_path / "parte-1.mp4"
    video.write_bytes(b"\x00")
    video.with_suffix(".json").write_text(
        json.dumps({"title": "T", "description": "Gancho.\n\n#uno"}), encoding="utf-8")
    monkeypatch.setenv("GITHUB_TOKEN", "x")
    monkeypatch.setattr(daily_post, "_ig_creds",
                        lambda ctx: {"user_id": "u1", "access_token": "tok"})
    monkeypatch.setattr(daily_post, "_refresh_ig_token", lambda st, ctx: None)
    monkeypatch.setattr(daily_post, "_ensure_video", lambda part, ctx, series: video)
    monkeypatch.setattr(ghr, "upload", lambda v: "https://host/v.mp4")
    monkeypatch.setattr(igu, "publish_reel", lambda url, caption, ig_user_id, access_token: "media1")
    st = {"instagram": {"next_part": 1, "posted": []},
          "youtube": {"next_part": 2, "posted": []}}
    ctx = {"name": "faceless", "ig_creds": None}
    if first_comment is not None:
        ctx["first_comment"] = first_comment
    series = types.SimpleNamespace(PARTS={1: {}})
    return st, ctx, series


def test_do_instagram_postea_primer_comentario(tmp_path, monkeypatch):
    st, ctx, series = _setup_ig(tmp_path, monkeypatch, "¿Cuál no conocías? 👇")
    llamadas = {}

    def fake_comment(media_id, message, access_token=None):
        llamadas.update(media_id=media_id, message=message, token=access_token)
        return "c1"

    monkeypatch.setattr(igu, "post_comment", fake_comment)
    daily_post.do_instagram(st, ctx, series)

    assert llamadas == {"media_id": "media1", "message": "¿Cuál no conocías? 👇",
                        "token": "tok"}


def test_primer_comentario_no_bloquea_si_falla(tmp_path, monkeypatch):
    st, ctx, series = _setup_ig(tmp_path, monkeypatch, "¿Cuál no conocías? 👇")
    monkeypatch.setattr(igu, "post_comment",
                        lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("sin permiso")))
    daily_post.do_instagram(st, ctx, series)

    # El Reel quedó publicado y el contador avanzó aunque el comentario falló.
    assert st["instagram"]["next_part"] == 2
    assert st["instagram"]["posted"][0]["media_id"] == "media1"


def test_sin_first_comment_no_comenta(tmp_path, monkeypatch):
    st, ctx, series = _setup_ig(tmp_path, monkeypatch, None)
    monkeypatch.setattr(igu, "post_comment",
                        lambda *a, **kw: (_ for _ in ()).throw(AssertionError("no debería comentar")))
    daily_post.do_instagram(st, ctx, series)
    assert st["instagram"]["next_part"] == 2


def test_post_comment_pega_al_endpoint_de_comments(monkeypatch):
    capturado = {}

    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"id": "c9"}

    def fake_post(url, data, timeout):
        capturado.update(url=url, data=data)
        return _Resp()

    monkeypatch.setattr(igu.requests, "post", fake_post)
    cid = igu.post_comment("media7", "Hola 👇", access_token="tok")
    assert cid == "c9"
    assert capturado["url"].endswith("/media7/comments")
    assert capturado["data"] == {"message": "Hola 👇", "access_token": "tok"}


def test_todos_los_canales_tienen_first_comment():
    for nombre, canal in CHANNELS.items():
        assert canal.get("first_comment"), f"al canal {nombre} le falta first_comment"
