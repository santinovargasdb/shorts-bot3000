"""Supervisor del auto-refill: por canal mide el runway y rellena hasta el objetivo
usando los generadores existentes, midiendo yield real, con topes anti-runaway."""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil

from autobuild.errors import QuotaExhausted


@dataclass
class Result:
    channel: str
    parts_before: int
    parts_after: int
    added: int
    severity: str          # OK | WARN | CRITICAL | ERROR | SKIP | QUOTA
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
    except QuotaExhausted as e:
        cur = measure(channel)                       # re-medir: captura lo recuperado antes del corte
        return Result(channel, before, cur, max(cur - before, 0), "QUOTA", str(e))
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


# --- CLI / orquestación (Task 6) -----------------------------------------
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from autobuild import alert, refillers, runway
from autobuild.config import REFILL

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "autobuild" / ".lock"
LOG = ROOT / "autobuild.log"
_LOCK_TTL = 21600   # 6h: coincide con la cadencia 4x/día; un lock más viejo = huérfano (crash)


def acquire_lock(force: bool = False) -> bool:
    if LOCK.exists() and not force:
        if time.time() - LOCK.stat().st_mtime < _LOCK_TTL:
            return False
    LOCK.write_text(str(os.getpid()), encoding="utf-8")
    return True


def release_lock() -> None:
    try:
        LOCK.unlink()
    except FileNotFoundError:
        pass


def _log(msg: str) -> None:
    line = f"[{datetime.now():%Y-%m-%d %H:%M}] {msg}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def _plan_line(channel: str, cfg: dict) -> str:
    ahead = runway.parts_ahead(channel)
    target = int(cfg["target_days"] * cfg["posts_per_day"])
    deficit = max(target - ahead, 0)
    est = 0 if deficit == 0 else int(deficit / max(cfg["yield"], 0.01))
    return (f"{channel:13} runway={ahead} partes ({ahead/cfg['posts_per_day']:.1f}d)  "
            f"objetivo={target}  déficit={deficit}  intentos≈{est}  gen={cfg['gen']}")


def run(channels: list[str], dry_run: bool = False) -> list[Result]:
    results: list[Result] = []
    for ch in channels:
        cfg = REFILL[ch]
        if dry_run:
            _log("DRY " + _plan_line(ch, cfg))
            continue
        refiller = refillers.REFILLERS[cfg["gen"]]
        if cfg["gen"] == "clips":       # juego del momento primero, aunque el colchón esté lleno
            try:
                refillers.topup_tiktok(ch, cfg["batch"])
                refillers.topup_priority(ch, cfg["batch"])
            except Exception as e:
                _log(f"{ch:13} carril prioritario falló ({type(e).__name__}: {e}); sigo con el refill")
        r = refill_channel(ch, cfg, measure=lambda c: runway.parts_ahead(c),
                           refiller=refiller)
        _log(f"{r.channel:13} {r.parts_before}->{r.parts_after} (+{r.added})  "
             f"{r.severity}: {r.note}")
        results.append(r)
    return results


def tiktok_only() -> list[str]:
    """Canales de clips que están FUERA del refill común pero igual sacan de TikTok (streamers_b:
    sus streamers no rinden, lo único nuevo que recibe son los clips virales)."""
    from streamers import config as scfg
    return [ch for ch, c in scfg.CHANNELS.items() if c.get("tiktok") and ch not in REFILL]


def run_tiktok_only(channels: list[str], dry_run: bool = False) -> None:
    for ch in channels:
        if dry_run:
            _log(f"DRY {ch:13} solo TikTok  prioritarios={runway.priority_pending(ch)}")
            continue
        try:
            antes = runway.priority_pending(ch)
            refillers.topup_tiktok(ch, _CLIPS_BATCH)
            _log(f"{ch:13} tiktok: prioritarios {antes}->{runway.priority_pending(ch)}")
        except Exception as e:
            _log(f"{ch:13} tiktok falló ({type(e).__name__}: {e})")


_CLIPS_BATCH = 5    # mismo lote que los canales de clips del REFILL


def main(argv: list[str]) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    from reddit_pipeline.env import load_env
    load_env()

    dry = "--dry-run" in argv
    force = "--force" in argv
    channels = list(REFILL)
    extra = tiktok_only()
    if "--channel" in argv:
        only = argv[argv.index("--channel") + 1]
        extra = [c for c in extra if c == only]
        channels = [] if extra else [only]

    if not dry and not acquire_lock(force):
        _log("otra corrida de autobuild está activa (lock fresco). Abortando. Usá --force.")
        return 1
    try:
        _log(f"=== autobuild start (dry={dry}) canales={channels + extra} ===")
        run_tiktok_only(extra, dry_run=dry)     # rápido (no renderiza): antes que el refill largo
        results = run(channels, dry_run=dry)
        if not dry and alert.any_problem(results):
            subject, body = alert.render_digest(results)
            alert.send_email(subject, body)
            _log(f"alerta enviada: {subject}")
        _log("=== autobuild done ===")
    finally:
        if not dry:
            release_lock()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
