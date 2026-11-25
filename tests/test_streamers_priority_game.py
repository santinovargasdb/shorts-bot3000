"""Juego del momento (lanzamiento de GTA VI): sus clips se sourcean antes que el resto y saltean
la fila del backlog al postear, sin perder el orden de los clips comunes."""
import json
import types
from datetime import date

import autobuild.runway as rw
import daily_post
import streamers.build as B
from streamers import config as scfg, db, sourcing

PG = {"names": ("grand theft auto vi",), "tag": "GTA 6", "period": "7d", "until": "2026-12-15"}


def _series(keys, prio=()):
    return types.SimpleNamespace(PARTS={k: {"priority": k in prio} for k in keys})


# ---------- config ----------

def test_juego_prioritario_vigente_hasta_la_fecha_inclusive():
    cfg = {"priority_game": PG}
    assert scfg.priority_game(cfg, date(2026, 12, 15)) is PG
    assert scfg.priority_game(cfg, date(2026, 12, 16)) is None


def test_canal_sin_juego_prioritario():
    assert scfg.priority_game({}) is None


# ---------- sourcing ----------

def test_list_twitch_game_filtra_por_juego(monkeypatch):
    def nodo(i, juego):
        return {"node": {"id": str(i), "title": f"t{i}", "viewCount": 10, "durationSeconds": 20,
                         "url": f"https://www.twitch.tv/x/clip/{i}", "game": {"name": juego}}}
    payload = {"data": {"user": {"clips": {"edges": [
        nodo(1, "Grand Theft Auto VI"), nodo(2, "Grand Theft Auto V"), nodo(3, "Just Chatting"),
        {"node": {"id": "4", "title": "sin juego", "url": "u", "game": None}}]}}}}

    class Resp:
        def read(self):
            return json.dumps(payload).encode()

    monkeypatch.setattr("urllib.request.urlopen", lambda *a, **k: Resp())
    clips = sourcing.list_clips("x", "7d", games=PG["names"])
    assert [c["id"] for c in clips] == ["1"]           # GTA V no es GTA VI
    assert clips[0]["platform"] == "twitch" and clips[0]["duration"] == 20.0


def test_list_twitch_game_sin_red_devuelve_vacio(monkeypatch):
    def caido(*a, **k):
        raise OSError("sin red")
    monkeypatch.setattr("urllib.request.urlopen", caido)
    assert sourcing.list_clips("x", "7d", games=PG["names"]) == []


def _clip(i, streamer, views, title="jugada"):
    return {"id": i, "views": views, "duration": 20.0, "title": title, "url": "u",
            "streamer": streamer, "platform": "twitch", "title_score": 0.5}


def test_juego_prioritario_elige_el_mejor_entre_todos_los_streamers(monkeypatch, tmp_path):
    por_streamer = {"alexby11": [_clip("a", "alexby11", 15), _clip("b", "alexby11", 900)],
                    "illojuan": [_clip("c", "illojuan", 65000), _clip("d", "illojuan", 30000),
                                 _clip("e", "illojuan", 90000, "illojuan - Highlight eed4fb Part 06")]}
    monkeypatch.setattr(sourcing, "list_clips", lambda name, *a, **k: por_streamer.get(name, []))
    monkeypatch.setattr(sourcing, "score_titles", lambda *a, **k: None)
    vistos = []
    monkeypatch.setattr(sourcing, "_first_valid",
                        lambda ordered, *a: vistos.extend(c["id"] for c in ordered))
    sourcing.best_game_clip([("alexby11", "twitch"), ("illojuan", "twitch"), ("ibai", "twitch")],
                            tmp_path, used_ids={"d"}, games=PG["names"], min_views=500, verbose=False)
    # por views entre todos; afuera el ya usado, el de 15 views y el de título autogenerado
    assert vistos == ["c", "b"]


# ---------- build ----------

def test_titulo_que_ya_nombra_el_juego_no_lo_repite():
    assert B.make_title({"title": "gta 6 borrado", "streamer": "x", "tag": "GTA 6"}).startswith(
        "GTA 6 borrado ")


def test_titulo_y_hashtag_llevan_el_juego():
    clip = {"title": "se cae del puente", "streamer": "ibai", "tag": "GTA 6"}
    assert B.make_title(clip).startswith("GTA 6: se cae del puente")
    assert "#gta6 " in B.make_description(clip)
    assert not B.make_title({"title": "x", "streamer": "ibai"}).startswith("GTA")


def _cfg(tmp_path, **extra):
    return {"streamers": ["ibai", "knekro"], "db": tmp_path / "b.sqlite", "content": "gameplay",
            "language": "es", **extra}


def test_build_busca_primero_el_juego_prioritario(monkeypatch, tmp_path):
    cfg = _cfg(tmp_path, priority_game=PG)
    monkeypatch.setattr(B.scfg, "get", lambda _: cfg)
    monkeypatch.setattr(B.scfg, "priority_game", lambda c, today=None: c.get("priority_game"))
    pedidos = []

    def best_game_clip(streamers, work, **k):
        pedidos.append((streamers, k["games"], k["period"]))
        return {"id": "g1", "title": "persecucion", "streamer": "knekro", "views": 5,
                "local_path": str(tmp_path / "c.mp4")}

    monkeypatch.setattr(B.sourcing, "best_game_clip", best_game_clip)
    monkeypatch.setattr(B.sourcing, "best_clip", lambda *a, **k: pedidos.append("comun"))
    monkeypatch.setattr("streamers.verify.classify_gameplay", lambda *a, **k: True)
    monkeypatch.setattr("src.transcribe.detect_language", lambda *a, **k: None)
    out = tmp_path / "render.mp4"
    out.write_bytes(b"\x00")
    monkeypatch.setattr(B, "process_source", lambda *a, **k: [out])
    monkeypatch.setattr(B, "ROOT", tmp_path)
    monkeypatch.setattr("streamers.verify.verify_clip", lambda *a, **k: {"ok": True})

    seq = B.build_clip("streamers_a", verbose=False)
    clip = next(c for c in db.all_clips(db.connect(cfg["db"])) if c["seq"] == seq)
    assert clip["priority"] is True and clip["status"] == "approved"
    assert clip["title"].startswith("GTA 6: ")
    # pidió el juego (clips de 7d) a todos los streamers juntos y no cayó a los clips comunes
    assert pedidos == [([("ibai", "twitch"), ("knekro", "twitch")], PG["names"], "7d")]


def test_only_priority_no_cae_a_clips_comunes(monkeypatch, tmp_path):
    cfg = _cfg(tmp_path, priority_game=PG)
    monkeypatch.setattr(B.scfg, "get", lambda _: cfg)
    monkeypatch.setattr(B.scfg, "priority_game", lambda c, today=None: c.get("priority_game"))
    pedidos = []
    monkeypatch.setattr(B.sourcing, "best_game_clip",
                        lambda streamers, work, **k: pedidos.append(k["games"]))
    monkeypatch.setattr(B.sourcing, "best_clip", lambda *a, **k: pedidos.append("comun"))
    assert B.build_clip("streamers_a", verbose=False, only_priority=True) is None
    assert pedidos == [PG["names"]]                    # nunca pidió clips sin filtro de juego


def test_db_guarda_priority_y_migra_db_vieja(tmp_path):
    conn = db.connect(tmp_path / "b.sqlite")
    a = db.add_clip(conn, title="t", description="d", video_path="v", streamer="s", clip_id="1")
    b = db.add_clip(conn, title="t", description="d", video_path="v", streamer="s", clip_id="2",
                    priority=True)
    por_seq = {c["seq"]: c["priority"] for c in db.all_clips(db.connect(tmp_path / "b.sqlite"))}
    assert por_seq == {a: False, b: True}


# ---------- posteo ----------

def test_prioritaria_sale_antes_que_la_fila():
    assert daily_post._next_available_part(83, _series([83, 84, 150], prio=[150])) == 150


def test_prioritaria_ya_posteada_vuelve_a_la_fila_y_no_se_repostea():
    s = _series([83, 84, 150], prio=[150])
    assert daily_post._next_available_part(83, s, [{"part": 150}]) == 83
    assert daily_post._next_available_part(150, s, [{"part": 150}]) is None


def test_prioritaria_no_mueve_el_contador():
    s = _series([83, 84, 150], prio=[150])
    assert daily_post._advance(83, 150, s) == 83
    assert daily_post._advance(83, 84, s) == 85


# ---------- runway ----------

def test_colchon_no_cuenta_prioritarias_ya_posteadas(tmp_path, monkeypatch):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({"streamers_c": {
        "youtube": {"next_part": 83, "posted": [{"part": 82}, {"part": 150}]},
        "instagram": {"next_part": 83, "posted": [{"part": 82}, {"part": 150}]}}}), encoding="utf-8")
    monkeypatch.setattr(rw, "available_parts", lambda ch: {83, 84, 150})
    assert rw.parts_ahead("streamers_c", state) == 2


def test_titulo_de_puro_signo_cae_al_generico():
    from streamers.build import make_title
    assert make_title({"title": ".", "tag": "GTA 6"}) == "GTA 6: Momentazo 😂🎮"
    assert make_title({"title": "???"}) == "Momentazo 😂🎮"
    assert make_title({"title": "ah"}) == "ah 😂🎮"
