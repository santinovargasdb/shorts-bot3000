"""Envuelve los generadores existentes tras una interfaz uniforme (channel, n) -> None.
Imports perezosos (dentro de cada fn) para que importar autobuild sea liviano y para
que los tests puedan monkeypatchear los módulos subyacentes."""
from __future__ import annotations


def refill_clips(channel: str, n: int) -> None:
    from streamers.build import build_backlog
    build_backlog(channel, n)


def refill_whatonearth(channel: str, n: int) -> None:
    from whatonearth.build import build_video
    for _ in range(n):
        build_video()


def refill_reddit(channel: str, n: int) -> None:
    from reddit_pipeline.__main__ import cmd_rewrite
    cmd_rewrite(n)


def refill_script(channel: str, n: int) -> None:
    raise NotImplementedError("generador de guiones pendiente (Pieza 2)")


REFILLERS = {
    "clips": refill_clips,
    "whatonearth": refill_whatonearth,
    "reddit": refill_reddit,
    "script": refill_script,
}
