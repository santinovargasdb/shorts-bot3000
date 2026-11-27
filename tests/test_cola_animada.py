# tests/test_cola_animada.py
# Episodios animados aprobados (anim3d/cola.py): salen antes que la fila normal sin moverla.
import json
import types
from pathlib import Path

import daily_post
from anim3d import cola


def _serie(n=5):
    return types.SimpleNamespace(PARTS={k: {"titulo": f"t{k}", "segments": []} for k in range(1, n + 1)})


def test_ensure_video_usa_el_mp4_del_animado():
    serie = _serie()
    serie.PARTS[9001] = {"priority": True, "video": "C:/x/animado.mp4"}
    assert daily_post._ensure_video(9001, {"engine_channel": "historia"}, serie) == Path("C:/x/animado.mp4")


def test_inyectar_agrega_partes_prioritarias(tmp_path, monkeypatch):
    video = tmp_path / "a.mp4"; video.write_bytes(b"x")
    aprob = tmp_path / "aprobados.json"
    aprob.write_text(json.dumps({"historia": [
        {"ep": "a", "parte": 9001, "video": str(video), "titulo": "A"},
        {"ep": "b", "parte": 9002, "video": str(tmp_path / "falta.mp4"), "titulo": "B"},   # sin video: no se ofrece
    ]}), encoding="utf-8")
    monkeypatch.setattr(cola, "APROBADOS", aprob)
    serie = _serie()
    assert cola.inyectar(serie, "historia") == 1
    assert serie.PARTS[9001]["priority"] and 9002 not in serie.PARTS
    assert cola.inyectar(_serie(), "misterios") == 0


def test_animado_sale_primero_y_no_mueve_la_fila(tmp_path, monkeypatch):
    video = tmp_path / "a.mp4"; video.write_bytes(b"x")
    aprob = tmp_path / "aprobados.json"
    aprob.write_text(json.dumps({"historia": [{"ep": "a", "parte": 9001, "video": str(video), "titulo": "A"}]}), encoding="utf-8")
    monkeypatch.setattr(cola, "APROBADOS", aprob)
    serie = _serie()
    cola.inyectar(serie, "historia")
    assert daily_post._next_available_part(3, serie, []) == 9001                       # sale antes que la parte 3
    assert daily_post._advance(3, 9001, serie) == 3                                    # la fila no se mueve
    assert daily_post._next_available_part(3, serie, [{"part": 9001}]) == 3            # ya subido: vuelve la fila
