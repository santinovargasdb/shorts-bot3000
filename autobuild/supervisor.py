"""Supervisor del auto-refill: por canal mide el runway y rellena hasta el objetivo
usando los generadores existentes, midiendo yield real, con topes anti-runaway."""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil


@dataclass
class Result:
    channel: str
    parts_before: int
    parts_after: int
    added: int
    severity: str          # OK | WARN | CRITICAL | ERROR | SKIP
    note: str


def refill_channel(channel: str, cfg: dict, measure, refiller) -> Result:
    """measure(channel)->parts_ahead; refiller(channel,n)->None. Rellena en tandas de
    cfg['batch'] hasta llegar al objetivo (target_days*posts_per_day), agotar
    max_attempts, o dos tandas seguidas sin progreso (fuente seca)."""
    ppd = cfg["posts_per_day"]
    target = ceil(cfg["target_days"] * ppd)
    critical = ceil(cfg["critical_days"] * ppd)
    batch = cfg["batch"]

    before = measure(channel)
    if before >= target:
        return Result(channel, before, before, 0, "OK", f"colchón OK ({before}/{target})")

    attempts_left = cfg["max_attempts"]
    cur = before
    dry = 0
    try:
        while cur < target and attempts_left > 0 and dry < 2:
            n = min(batch, attempts_left)
            refiller(channel, n)
            attempts_left -= n
            new = measure(channel)
            dry = dry + 1 if new <= cur else 0
            cur = new
    except NotImplementedError as e:
        return Result(channel, before, before, 0, "SKIP", str(e))
    except Exception as e:
        return Result(channel, before, cur, max(cur - before, 0), "ERROR",
                      f"{type(e).__name__}: {e}")

    added = cur - before
    if cur >= target:
        sev, note = "OK", f"llegó al objetivo ({cur}/{target})"
    elif cur <= critical:
        sev, note = "CRITICAL", f"runway crítico ({cur}/{target}); fuente seca o API caída"
    else:
        sev, note = "WARN", f"no llegó al objetivo ({cur}/{target}); yield bajo esta corrida"
    return Result(channel, before, cur, added, sev, note)
