"""La sincronización 'IG/TikTok esperan a YouTube' debe aplicar SOLO si el canal
tiene YouTube activo (yt en platforms). Un canal sin YT (ej. soyelmalo mientras la
cuota de YT no alcanza) debe postear a IG/TikTok sin esperar un YT que nunca avanza.
Los canales con yt NO cambian de comportamiento."""
import json
import types

import daily_post
import src.gh_release as ghr
import uploaders.instagram_upload as igu
import uploaders.tiktok_upload as ttu


def _video(tmp_path):
    v = tmp_path / "p1.mp4"
    v.write_bytes(b"\x00")
    v.with_suffix(".json").write_text(
        json.dumps({"title": "T", "description": "g.\n\n#x"}), encoding="utf-8")
    return v


# ───────────────────────── Instagram ─────────────────────────
def _setup_ig(tmp_path, monkeypatch, platforms):
    v = _video(tmp_path)
    monkeypatch.setenv("GITHUB_TOKEN", "x")
    monkeypatch.setattr(daily_post, "_ig_creds", lambda ctx: {"user_id": "u", "access_token": "t"})
    monkeypatch.setattr(daily_post, "_refresh_ig_token", lambda st, ctx: None)
    monkeypatch.setattr(daily_post, "_ensure_video", lambda part, ctx, series: v)
    monkeypatch.setattr(ghr, "upload", lambda vid: "https://h/v.mp4")
    rec = {}
    monkeypatch.setattr(igu, "publish_reel",
                        lambda url, caption, ig_user_id, access_token: rec.setdefault("id", "m1"))
    monkeypatch.setattr(igu, "post_comment", lambda *a, **k: "c1")
    st = {"instagram": {"next_part": 1, "posted": []}, "youtube": {"next_part": 1, "posted": []}}
    ctx = {"name": "c", "ig_creds": None, "platforms": platforms, "first_comment": "q"}
    series = types.SimpleNamespace(PARTS={1: {}})
    return st, ctx, series, rec


def test_ig_sin_yt_no_espera(tmp_path, monkeypatch):
    st, ctx, series, rec = _setup_ig(tmp_path, monkeypatch, ("ig", "tt"))
    daily_post.do_instagram(st, ctx, series)
    assert rec.get("id") == "m1"                 # posteó aunque youtube.next_part == 1
    assert st["instagram"]["next_part"] == 2


def test_ig_con_yt_sigue_esperando(tmp_path, monkeypatch):
    st, ctx, series, rec = _setup_ig(tmp_path, monkeypatch, ("yt", "ig", "tt"))
    daily_post.do_instagram(st, ctx, series)
    assert rec.get("id") is None                 # NO posteó: espera a YT (1 >= 1)
    assert st["instagram"]["next_part"] == 1


# ───────────────────────── TikTok ─────────────────────────
def _setup_tt(tmp_path, monkeypatch, platforms):
    v = _video(tmp_path)
    tok = tmp_path / "tt.json"
    tok.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(daily_post, "_ensure_video", lambda part, ctx, series: v)
    monkeypatch.setattr(daily_post, "_tt_wait_status", lambda *a, **k: None)
    monkeypatch.setattr(ttu, "creator_info",
                        lambda token_file=None: {"data": {"privacy_level_options": ["SELF_ONLY"]}})
    rec = {}
    monkeypatch.setattr(ttu, "publish_direct",
                        lambda video, title, privacy_level, token_file=None: rec.setdefault("id", "pid"))
    monkeypatch.setattr(ttu, "upload_draft", lambda video, token_file=None: rec.setdefault("id", "draft"))
    st = {"tiktok": {"next_part": 1, "posted": []}, "youtube": {"next_part": 1, "posted": []}}
    ctx = {"name": "c", "tt_token": str(tok), "platforms": platforms}
    series = types.SimpleNamespace(PARTS={1: {}})
    return st, ctx, series, rec


def test_tt_sin_yt_no_espera(tmp_path, monkeypatch):
    st, ctx, series, rec = _setup_tt(tmp_path, monkeypatch, ("ig", "tt"))
    daily_post.do_tiktok(st, ctx, series)
    assert rec.get("id") is not None             # subió (directo o borrador)
    assert st["tiktok"]["next_part"] == 2


def test_tt_con_yt_sigue_esperando(tmp_path, monkeypatch):
    st, ctx, series, rec = _setup_tt(tmp_path, monkeypatch, ("yt", "ig", "tt"))
    daily_post.do_tiktok(st, ctx, series)
    assert rec.get("id") is None                 # NO subió: espera a YT
    assert st["tiktok"]["next_part"] == 1
