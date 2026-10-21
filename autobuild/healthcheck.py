"""Chequeo diario de salud: ¿algún canal dejó de subir a alguna plataforma?

Lee automation_state.json + channels_registry y detecta, por canal × plataforma declarada,
hace cuánto fue el último posteo. Si pasa el umbral (silencio) -> alerta por mail. Agnóstico
a la causa (token vencido, API caída, PC apagada, backlog vacío): detecta el SÍNTOMA y suma
pistas locales (sin llamar a ninguna API). Reusa autobuild.alert.send_email.

  python -m autobuild.healthcheck            # corre el chequeo, manda mail si corresponde

Nunca levanta: todo best-effort + log, igual que el resto de la automatización.
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "automation_state.json"

STALE_HOURS = 30          # >30h sin postear (saltó un día entero de 2 posteos) = problema
HEARTBEAT_WEEKDAY = 0     # lunes: manda un "todo OK" aunque no haya problema (confirma que vive)

_PLAT = {"yt": "youtube", "ig": "instagram", "tt": "tiktok"}
_FMT = "%Y-%m-%d %H:%M"


@dataclass
class Status:
    canal: str
    plataforma: str
    last_dt: datetime | None
    horas: float | None
    estado: str          # "OK" | "STALE" | "NEVER"


def monitored_pairs(channels: dict) -> list[tuple[str, str]]:
    """Pares (canal, plataforma-del-estado) que SE deben vigilar: expande `platforms` de cada
    canal y mapea yt/ig/tt -> youtube/instagram/tiktok. Lo no declarado no se vigila."""
    pairs = []
    for canal, cfg in channels.items():
        for p in cfg.get("platforms", ()):
            if p in _PLAT:
                pairs.append((canal, _PLAT[p]))
    return pairs


def last_post_dt(state: dict, canal: str, plataforma: str) -> datetime | None:
    """Fecha del último posteo (máx `date` de `posted`), o None si nunca posteó / falta la clave."""
    posted = state.get(canal, {}).get(plataforma, {}).get("posted", []) or []
    dates = []
    for p in posted:
        d = p.get("date") if isinstance(p, dict) else None
        if not d:
            continue
        try:
            dates.append(datetime.strptime(d, _FMT))
        except ValueError:
            continue
    return max(dates) if dates else None


def classify(state: dict, pairs: list[tuple[str, str]], now: datetime,
             stale_hours: float = STALE_HOURS) -> list[Status]:
    """OK (último ≤ umbral) | STALE (posteó pero el último fue hace > umbral) | NEVER (nunca)."""
    out = []
    for canal, plat in pairs:
        last = last_post_dt(state, canal, plat)
        if last is None:
            out.append(Status(canal, plat, None, None, "NEVER"))
            continue
        horas = (now - last).total_seconds() / 3600
        out.append(Status(canal, plat, last, horas, "STALE" if horas > stale_hours else "OK"))
    return out


def hint_for(plataforma: str, *, yt_token_age_days: float | None = None,
             ig_token_age_days: float | None = None, backlog_empty: bool = False) -> str:
    """Pista local (sin APIs) de por qué un canal caído dejó de subir. Prioriza lo más específico."""
    if plataforma == "youtube" and yt_token_age_days is not None and yt_token_age_days > 7:
        return "token de YouTube con >7 días -> probablemente vencido: reautorizá (reauth_youtube.bat)."
    if plataforma == "instagram" and ig_token_age_days is not None and ig_token_age_days > 55:
        return "token de IG con >55 días -> cerca de vencer: debería renovarse solo, revisá."
    if backlog_empty:
        return "sin material en el backlog -> esperá el refill o buildeá más partes."
    return "revisá el log de daily_post del canal (token/API/PC)."


def should_email(statuses: list[Status], now: datetime,
                 heartbeat_weekday: int = HEARTBEAT_WEEKDAY) -> str | None:
    """'problema' si hay algún STALE; si no, 'ok' el día del heartbeat; si no, None (no manda)."""
    if any(s.estado == "STALE" for s in statuses):
        return "problema"
    if now.weekday() == heartbeat_weekday:
        return "ok"
    return None


def render(statuses: list[Status], modo: str, now: datetime,
           hints: dict | None = None) -> tuple[str, str]:
    """(subject, body) del mail. modo: 'problema' | 'ok'."""
    hints = hints or {}
    stale = [s for s in statuses if s.estado == "STALE"]
    never = [s for s in statuses if s.estado == "NEVER"]
    ok = [s for s in statuses if s.estado == "OK"]
    stamp = now.strftime("%d-%m %H:%M")
    if modo == "problema":
        subject = f"[ShortsBot][Salud] 🔴 {len(stale)} canal(es) caído(s) · {stamp}"
    else:
        subject = f"[ShortsBot][Salud] ✅ todo OK · {stamp}"

    lines: list[str] = []
    if stale:
        lines.append(f"🔴 DEJARON DE SUBIR (sin postear hace > {STALE_HOURS}h):")
        for s in stale:
            cuando = f"último {s.last_dt:%d-%m %H:%M} (hace {s.horas:.0f}h)" if s.last_dt else "sin registro"
            lines.append(f"  - {s.canal} / {s.plataforma}: {cuando}")
            hint = hints.get((s.canal, s.plataforma))
            if hint:
                lines.append(f"      -> {hint}")
        lines.append("")
    lines.append("✅ OK: " + (", ".join(f"{s.canal}/{s.plataforma}" for s in ok) or "ninguno"))
    if never:
        lines.append("⚪ nunca posteó (¿recién activado?): "
                     + ", ".join(f"{s.canal}/{s.plataforma}" for s in never))
    return subject, "\n".join(lines)


# ─── glue de I/O (no unit-testeado: usa reloj/disco/SMTP reales, todo best-effort) ──────────

def _load_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _yt_token_age_days(ctx: dict, now: datetime) -> float | None:
    try:
        p = ROOT / (ctx.get("yt_token") or "secrets/token.json")
        if not p.exists():
            return None
        return (now - datetime.fromtimestamp(p.stat().st_mtime)).total_seconds() / 86400
    except Exception:
        return None


def _ig_token_age_days(state: dict, canal: str, now: datetime) -> float | None:
    try:
        tr = state.get(canal, {}).get("instagram", {}).get("token_refreshed")
        if not tr:
            return None
        return (now - datetime.strptime(tr, "%Y-%m-%d")).total_seconds() / 86400
    except Exception:
        return None


def _backlog_empty(ctx: dict, state: dict, canal: str, plataforma: str) -> bool:
    try:
        import importlib
        series = importlib.import_module(ctx["series"])
        nxt = int(state.get(canal, {}).get(plataforma, {}).get("next_part", 1))
        return not [k for k in series.PARTS if k >= nxt]
    except Exception:
        return False


def main() -> int:
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    try:
        from reddit_pipeline.env import load_env
        load_env()
    except Exception:
        pass

    from channels_registry import CHANNELS, get_channel

    dry = "--dry-run" in sys.argv
    state = _load_state()
    now = datetime.now()
    statuses = classify(state, monitored_pairs(CHANNELS), now, STALE_HOURS)
    modo = should_email(statuses, now, HEARTBEAT_WEEKDAY)

    hints: dict = {}
    for s in statuses:
        if s.estado != "STALE":
            continue
        try:
            ctx = get_channel(s.canal)
        except Exception:
            continue
        hints[(s.canal, s.plataforma)] = hint_for(
            s.plataforma,
            yt_token_age_days=_yt_token_age_days(ctx, now) if s.plataforma == "youtube" else None,
            ig_token_age_days=_ig_token_age_days(state, s.canal, now) if s.plataforma == "instagram" else None,
            backlog_empty=_backlog_empty(ctx, state, s.canal, s.plataforma),
        )

    n_stale = sum(1 for s in statuses if s.estado == "STALE")
    print(f"[healthcheck] {now:%Y-%m-%d %H:%M} · {len(statuses)} pares · {n_stale} caído(s) · modo={modo}",
          flush=True)
    for s in statuses:
        if s.estado == "STALE":
            print(f"[healthcheck]   🔴 {s.canal}/{s.plataforma}: hace {s.horas:.0f}h", flush=True)

    if dry:
        subject, body = render(statuses, modo or "ok", now, hints)
        print(f"[healthcheck] DRY-RUN (no manda mail). modo={modo}. El mail sería:\n", flush=True)
        print(subject + "\n\n" + body, flush=True)
        return 0

    if modo:
        subject, body = render(statuses, modo, now, hints)
        try:
            from autobuild.alert import send_email
            sent = send_email(subject, body)
            print(f"[healthcheck] mail '{modo}': {'enviado' if sent else 'NO enviado (ver arriba)'}",
                  flush=True)
        except Exception as e:
            print(f"[healthcheck] no se pudo mandar el mail: {e}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
