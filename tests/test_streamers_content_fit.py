"""Guard de contenido: un clip de GAMEPLAY no debe aprobarse en el canal IRL (y viceversa).
Cierra el agujero por el que seq 10 (knekro, has_gameplay=1) se aprobó en Clips IRL."""
from streamers import db
from streamers.build import content_mismatch, resolve_pending


def test_irl_rechaza_gameplay():
    assert content_mismatch("irl", True) is True


def test_irl_acepta_charla():
    assert content_mismatch("irl", False) is False


def test_gameplay_rechaza_charla():
    assert content_mismatch("gameplay", False) is True


def test_gameplay_acepta_gameplay():
    assert content_mismatch("gameplay", True) is False


def test_desconocido_no_rechaza():
    # has_gameplay None (QC no pudo clasificar) -> no rechazar, que lo decida el QC/manual
    assert content_mismatch("irl", None) is False
    assert content_mismatch("gameplay", None) is False


def test_resolve_pending_rechaza_gameplay_en_irl(tmp_path):
    """Un pending marcado gameplay en streamers_c (irl) -> resolve_pending lo rechaza
    SIN llamar al QC de visión (el guard corta antes de verify_clip)."""
    conn = db.connect(tmp_path / "t.sqlite")
    seq = db.add_clip(conn, title="t", description="d", video_path="noexiste.mp4",
                      streamer="knekro", clip_id="c1", status="pending", has_gameplay=True)
    aprobados = resolve_pending("streamers_c", conn=conn, verbose=False)
    estado = {r["seq"]: r["status"] for r in db.all_clips(conn)}
    assert estado[seq] == "rejected"
    assert aprobados == 0
