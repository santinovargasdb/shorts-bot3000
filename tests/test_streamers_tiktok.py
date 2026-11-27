"""Clips de TikTok como fuente: filtro por juego/vistas/fecha y alta en el backlog."""
from streamers import build as B, config as scfg, db, tiktok as T

TT = {"accounts": ["oni"], "keywords": ("gta6", "gta 6"), "tag": "GTA 6",
      "min_views": 100_000, "max_age_days": 14, "auto_approve": True}
NOW = 1_800_000_000


def _clip(i, views=500_000, title="robo perfecto #gta6", age_days=1, dur=30.0):
    return {"id": f"tt_{i}", "views": views, "likes": 0, "duration": dur,
            "ts": NOW - age_days * 86400, "title": title,
            "url": f"https://www.tiktok.com/@oni/video/{i}", "streamer": "oni", "platform": "tiktok"}


def test_nombra_el_juego_con_o_sin_espacio():
    assert T.is_game("love this game #GTA6 #fyp", TT["keywords"])
    assert T.is_game("GTA 6 heist", TT["keywords"])
    assert not T.is_game("this season went by #fortnite", TT["keywords"])


def test_pick_filtra_y_ordena_por_vistas():
    clips = [_clip(1, views=200_000), _clip(2, views=900_000),
             _clip(3, views=5_000),                              # no es viral
             _clip(4, title="clip de #fortnite"),                # otro juego
             _clip(5, age_days=40),                              # viejo
             _clip(6, dur=400),                                  # no entra en un Short
             _clip(7, views=2_000_000)]                          # ya usado
    assert [c["id"] for c in T.pick(clips, TT, used_ids={"tt_7"}, now=NOW)] == ["tt_2", "tt_1"]


def test_los_dos_canales_de_gameplay_sacan_de_tiktok():
    assert scfg.get("streamers_a")["tiktok"]["tag"] == "GTA 6"
    assert scfg.get("streamers_b")["tiktok"] is scfg.get("streamers_a")["tiktok"]


def test_build_lo_deja_prioritario_con_credito_al_autor(monkeypatch, tmp_path):
    cfg = {"db": tmp_path / "b.sqlite", "language": "en", "tiktok": TT}
    monkeypatch.setattr(T.scfg, "get", lambda _: cfg)
    monkeypatch.setattr(T, "used_everywhere", lambda: set())
    monkeypatch.setattr(T, "load_data", lambda: {"accounts": ["oni"], "queue": []})
    monkeypatch.setattr(T, "list_account", lambda account: [_clip(9, title="perfect heist #gta6 #fyp")])
    monkeypatch.setattr(T.time, "time", lambda: NOW)
    monkeypatch.setattr(T, "download", lambda clip, out: True)
    monkeypatch.setattr(T, "normalize", lambda src, dst, wm=None: None)

    seq = T.build_clip("streamers_x", verbose=False)

    row = db.all_clips(db.connect(cfg["db"]))[0]
    assert row["seq"] == seq and row["status"] == "approved" and row["priority"]
    assert row["variant"] == "tiktok" and row["clip_id"] == "tt_9"
    assert row["title"].startswith("GTA 6: perfect heist")          # sin los hashtags del autor
    assert row["description"].splitlines()[-1].endswith("resubido de oni — tiktok.com/@oni")
    assert T.build_clip("streamers_x", verbose=False) is None       # no se repite


def test_la_cola_de_links_va_primero_y_trae_su_titulo(monkeypatch, tmp_path):
    cfg = {"db": tmp_path / "b.sqlite", "language": "es", "tiktok": TT}
    cola = [{"url": "https://www.tiktok.com/@a/video/111", "views": 5, "titulo": "GTA 6: chico"},
            {"url": "https://www.tiktok.com/@b.c/video/222", "views": 9, "titulo": "GTA 6: el más visto"},
            {"url": "no es un link"}]
    monkeypatch.setattr(T.scfg, "get", lambda _: cfg)
    monkeypatch.setattr(T, "used_everywhere", lambda: set())
    monkeypatch.setattr(T, "load_data", lambda: {"accounts": ["oni"], "queue": cola})
    monkeypatch.setattr(T, "list_account", lambda account: 1 / 0)   # con cola no se listan cuentas
    monkeypatch.setattr(T, "download", lambda clip, out: True)
    monkeypatch.setattr(T, "normalize", lambda src, dst, wm=None: None)

    assert [c["id"] for c in T.queued({"tt_111"})] == ["tt_222"]
    T.build_clip("streamers_x", verbose=False)

    row = db.all_clips(db.connect(cfg["db"]))[0]
    assert row["clip_id"] == "tt_222" and row["streamer"] == "b.c"
    assert row["title"].startswith("GTA 6: el más visto ")
    assert row["description"].splitlines()[-1].endswith("tiktok.com/@b.c")
