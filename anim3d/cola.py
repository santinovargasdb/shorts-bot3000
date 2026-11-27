"""Cola de episodios animados APROBADOS por el usuario: el posteo diario (daily_post) los sube primero,
saltando la fila normal del canal, en los mismos horarios de siempre (uno por turno).

    python -m anim3d.cola agregar caja monalisa cerdo ...   prepara los videos y los pone en la cola
    python -m anim3d.cola ver                               qué hay en la cola y qué ya salió

Cómo encaja: cada episodio aprobado se suma a la serie del canal como una parte "prioritaria" con número
fijo (9001, 9002...: nunca choca con la fila normal). La lógica de prioridad de daily_post ya existe (la usan
los clips del juego del momento): una parte prioritaria sin postear sale antes que la fila, y el contador de
la fila no se mueve, así que al terminarse los animados el canal sigue exactamente donde estaba.
Cada parte lleva `video` (el mp4 ya armado con su .json): daily_post lo sube tal cual, sin renderizar nada.
Solo se inyecta en daily_post (no en el auto-refill), para no mezclar estos episodios con los generados.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
APROBADOS = HERE / "aprobados.json"        # {canal: [{"ep", "parte", "video", "titulo", "aprobado"}]}
BASE = 9000


def _leer() -> dict:
    return json.loads(APROBADOS.read_text(encoding="utf-8")) if APROBADOS.exists() else {}


def inyectar(series, canal: str) -> int:
    """Suma a series.PARTS los animados aprobados del canal como partes prioritarias. Devuelve cuántas."""
    n = 0
    for item in _leer().get(canal, []):
        video = ROOT / item["video"]
        if not video.exists():                  # sin video no se ofrece: la fila normal sigue
            continue
        series.PARTS[item["parte"]] = {"titulo": item["titulo"], "resumen": item.get("resumen", ""),
                                       "priority": True, "video": str(video), "anim3d": item["ep"]}
        n += 1
    return n


def agregar(eps: list[str]) -> dict:
    from anim3d.publicar import preparar
    datos = _leer()
    usados = {i["parte"] for lista in datos.values() for i in lista}
    for ep in eps:
        guion = json.loads((HERE / "episodes" / ep / "guion.json").read_text(encoding="utf-8"))
        lista = datos.setdefault(guion["canal"], [])
        if any(i["ep"] == ep for i in lista):
            print(f"{ep}: ya estaba en la cola"); continue
        video, titulo, _, _ = preparar(ep)
        parte = BASE + 1
        while parte in usados:
            parte += 1
        usados.add(parte)
        lista.append({"ep": ep, "parte": parte, "video": video.relative_to(ROOT).as_posix(), "titulo": titulo,
                      "resumen": (guion.get("publicar") or {}).get("resumen", ""), "aprobado": f"{datetime.now():%Y-%m-%d}"})
        print(f"{ep}: en la cola de {guion['canal']} como parte {parte} -> {titulo}")
    APROBADOS.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    return datos


def ver() -> None:
    estado = json.loads((ROOT / "automation_state.json").read_text(encoding="utf-8"))
    for canal, lista in _leer().items():
        print(f"== {canal}")
        for i in lista:
            hecho = [p for p, st in estado.get(canal, {}).items() if isinstance(st, dict)
                     and any(x.get("part") == i["parte"] for x in st.get("posted", []))]
            print(f"  {i['parte']} {i['ep']:<11} {'subido a ' + ', '.join(hecho) if hecho else 'pendiente'} | {i['titulo']}")


if __name__ == "__main__":
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    a = sys.argv[1:]
    if a and a[0] == "agregar":
        agregar(a[1:])
    else:
        ver()
