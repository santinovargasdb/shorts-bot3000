"""Reporte de salud del auto-refill. Manda UN email digest por Gmail SMTP solo si hubo
problema. Nunca levanta: si falla el envío o faltan creds, loguea y devuelve False."""
from __future__ import annotations

import os
import smtplib
from datetime import datetime
from email.message import EmailMessage

# Solo ERROR dispara email (fallo real que necesita a un humano: key/token vencido, crash).
# QUOTA (sin cuota, reanuda solo) y WARN/CRITICAL (colchón en llenado) se LOGUEAN, no se
# emailean: con 4 corridas/día emailearlos sería spam, y se resuelven solos.
EMAIL_ON = {"ERROR"}
_NONHEALTHY = {"ERROR", "CRITICAL", "QUOTA", "WARN"}
_SEV_ICON = {"OK": "✅", "SKIP": "⏭️", "QUOTA": "⏳", "WARN": "🟠", "CRITICAL": "🔴", "ERROR": "🔴"}
_SEV_ORDER = ["ERROR", "CRITICAL", "QUOTA", "WARN", "SKIP", "OK"]


def any_problem(results: list) -> bool:
    """¿Hay que emailear? Solo ante ERROR real (lo demás se loguea)."""
    return any(r.severity in EMAIL_ON for r in results)


def _worst(results: list) -> str:
    present = {r.severity for r in results}
    for sev in _SEV_ORDER:
        if sev in present:
            return sev
    return "OK"


def render_digest(results: list) -> tuple[str, str]:
    from autobuild.config import REFILL
    worst = _worst(results)
    n_prob = sum(1 for r in results if r.severity in _NONHEALTHY)
    stamp = datetime.now().strftime("%d-%m %H:%M")
    subject = f"[ShortsBot] {_SEV_ICON.get(worst,'')} {worst} · {n_prob} con problema · {stamp}"
    lines = ["Canal         Runway (partes)   +Aprob   Estado",
             "-" * 60]
    for r in results:
        ppd = REFILL.get(r.channel, {}).get("posts_per_day", 2)
        d_before = r.parts_before / ppd
        d_after = r.parts_after / ppd
        icon = _SEV_ICON.get(r.severity, "")
        lines.append(f"{r.channel:13} {r.parts_before:>3}->{r.parts_after:<3} "
                     f"({d_before:.1f}d->{d_after:.1f}d)  +{r.added:<4} "
                     f"{icon} {r.severity}: {r.note}")
    return subject, "\n".join(lines)


def send_email(subject: str, body: str) -> bool:
    user = os.environ.get("AUTOBUILD_SMTP_USER")
    pwd = os.environ.get("AUTOBUILD_SMTP_PASS")
    to = os.environ.get("AUTOBUILD_ALERT_TO")
    if not (user and pwd and to):
        print("[autobuild] alerta no enviada: faltan AUTOBUILD_SMTP_USER/PASS/ALERT_TO en .env")
        return False
    try:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = user, to, subject
        msg.set_content(body)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(user, pwd)
            s.send_message(msg)
        return True
    except Exception as e:                       # jamás rompe el loop del supervisor
        print(f"[autobuild] alerta no enviada (SMTP): {e}")
        return False
