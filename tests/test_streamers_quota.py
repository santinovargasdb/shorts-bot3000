"""Tests de la lógica de cuota de clips: re-QC de pendientes (resolve_pending) y la
detección de cuota de Gemini (verify._gemini marca QUOTA_HIT en 429)."""
import io
import urllib.error

import streamers.build as build
import streamers.verify as verify
from streamers import db


def _add_pending(conn, name, tmp_path, clip_id, *, con_mp4=True):
    vp = tmp_path / f"{name}.mp4"
    if con_mp4:
        vp.write_bytes(b"MP4")
    db.add_clip(conn, title=name, description="d", video_path=str(vp),
                streamer="s", clip_id=clip_id, status="pending")


def test_resolve_pending_reclasifica_sin_rerender(tmp_path, monkeypatch):
    conn = db.connect(tmp_path / "bk.sqlite")
    _add_pending(conn, "a", tmp_path, "id_a")
    _add_pending(conn, "b", tmp_path, "id_b")
    _add_pending(conn, "c", tmp_path, "id_c")
    verdict = {"a.mp4": True, "b.mp4": False, "c.mp4": True}   # b se rechaza
    monkeypatch.setattr(verify, "QUOTA_HIT", False)
    monkeypatch.setattr(verify, "verify_clip",
                        lambda p, verbose=True: {"ok": verdict[p.name], "problema": ""})
    n = build.resolve_pending("streamers_a", conn=conn)
    assert n == 2                                         # a y c aprobados
    assert len(db.by_status(conn, "approved")) == 2
    assert len(db.by_status(conn, "rejected")) == 1
    assert len(db.by_status(conn, "pending")) == 0


def test_resolve_pending_descarta_si_falta_el_mp4(tmp_path, monkeypatch):
    conn = db.connect(tmp_path / "bk.sqlite")
    _add_pending(conn, "gone", tmp_path, "id_gone", con_mp4=False)   # sin archivo
    monkeypatch.setattr(verify, "QUOTA_HIT", False)
    monkeypatch.setattr(verify, "verify_clip",
                        lambda p, verbose=True: (_ for _ in ()).throw(AssertionError("no llamar")))
    n = build.resolve_pending("streamers_a", conn=conn)
    assert n == 0
    assert len(db.by_status(conn, "rejected")) == 1      # el mp4 ausente -> rejected, sin QC


def test_resolve_pending_frena_si_no_hay_cuota(tmp_path, monkeypatch):
    conn = db.connect(tmp_path / "bk.sqlite")
    for i in range(3):
        _add_pending(conn, f"v{i}", tmp_path, f"id{i}")
    monkeypatch.setattr(verify, "QUOTA_HIT", True)        # cuota ya agotada
    monkeypatch.setattr(verify, "verify_clip",
                        lambda p, verbose=True: (_ for _ in ()).throw(AssertionError("no QC sin cuota")))
    n = build.resolve_pending("streamers_a", conn=conn)
    assert n == 0
    assert len(db.by_status(conn, "pending")) == 3       # quedan pending para la próxima


def test_gemini_marca_quota_hit_en_429(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setattr(verify, "QUOTA_HIT", False)
    monkeypatch.setattr(verify.time, "sleep", lambda s: None)   # no dormir en el test

    def raise_429(*a, **k):
        raise urllib.error.HTTPError("u", 429, "rate limit", {}, io.BytesIO(b""))
    monkeypatch.setattr(verify.urllib.request, "urlopen", raise_429)
    out = verify._gemini("prompt", [], verbose=False)
    assert out is None and verify.QUOTA_HIT is True


def test_gemini_no_marca_quota_en_503(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setattr(verify, "QUOTA_HIT", False)
    monkeypatch.setattr(verify.time, "sleep", lambda s: None)

    def raise_503(*a, **k):
        raise urllib.error.HTTPError("u", 503, "overloaded", {}, io.BytesIO(b""))
    monkeypatch.setattr(verify.urllib.request, "urlopen", raise_503)
    out = verify._gemini("prompt", [], verbose=False)
    assert out is None and verify.QUOTA_HIT is False          # 503 = sobrecarga, NO cuota
