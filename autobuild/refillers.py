"""Envuelve los generadores existentes tras una interfaz uniforme (channel, n) -> None.
Imports perezosos (dentro de cada fn) para que importar autobuild sea liviano y para
que los tests puedan monkeypatchear los módulos subyacentes."""
from __future__ import annotations


def refill_clips(channel: str, n: int) -> None:
    # Consciente de cuota: (1) recupera 'pending' ya renderizados con re-QC barato (sin
    # re-render); (2) si queda cuota, renderiza nuevos; (3) si la cuota de Gemini se agotó,
    # levanta QuotaExhausted -> el supervisor lo marca QUOTA y reanuda cuando la cuota vuelva.
    from streamers import verify
    from streamers.build import build_backlog, resolve_pending
    from autobuild.errors import QuotaExhausted
    verify.reset_quota()
    resolve_pending(channel)
    if not verify.QUOTA_HIT:
        build_backlog(channel, n)
    if verify.QUOTA_HIT:
        raise QuotaExhausted(f"{channel}: cuota de Gemini agotada")


def refill_whatonearth(channel: str, n: int) -> None:
    from whatonearth.build import build_video
    for _ in range(n):
        build_video()


def refill_reddit(channel: str, n: int) -> None:
    from reddit_pipeline.__main__ import cmd_rewrite
    cmd_rewrite(n)


# faceless = lista de datos; historia/misterios = relato narrado. Todos por autoscripts.build.build.
_SCRIPT_GENERATORS = {"faceless", "historia", "misterios"}


def refill_script(channel: str, n: int) -> None:
    if channel not in _SCRIPT_GENERATORS:
        raise NotImplementedError(f"generador de guiones de {channel} pendiente (Pieza 2.x)")
    from autoscripts.build import build
    build(channel, n)               # puede levantar autobuild.errors.QuotaExhausted (Groq 429)


REFILLERS = {
    "clips": refill_clips,
    "whatonearth": refill_whatonearth,
    "reddit": refill_reddit,
    "script": refill_script,
}
