"""Revisión/aprobación de candidatos de streamers (tu 'visto bueno' antes de postear).

Flujo:
  python -m streamers.build streamers_a 5          # arma 5 candidatos PENDIENTES
  python -m streamers.review streamers_a           # lista los pendientes
  python -m streamers.review streamers_a open      # abre todos en el reproductor
  python -m streamers.review streamers_a reject 12 14   # rechaza esos (borra el mp4)
  python -m streamers.review streamers_a approve        # aprueba el resto (o: approve 11 13)

Solo los APROBADOS entran al backlog que postea daily_post.
"""
from __future__ import annotations

import os
import sys

from streamers import config as scfg, db


def _conn(ch):
    return db.connect(scfg.get(ch)["db"])


def list_pending(ch: str) -> None:
    pend = db.by_status(_conn(ch), "pending")
    if not pend:
        print(f"[{ch}] no hay candidatos pendientes.")
        return
    print(f"\n[{ch}] {len(pend)} candidato(s) PENDIENTE(S):\n")
    for c in pend:
        print(f"  seq {c['seq']:>3} | {c['streamer']:<12} | views {c['views']:>6} | {c['title'][:45]}")
        print(f"          {c['video_path']}")
    print("\nMiralos y después:")
    print(f"  python -m streamers.review {ch} open           # abrir todos")
    print(f"  python -m streamers.review {ch} reject 12 14    # rechazar esos seq")
    print(f"  python -m streamers.review {ch} approve         # aprobar el resto")


def open_pending(ch: str) -> None:
    for c in db.by_status(_conn(ch), "pending"):
        try:
            os.startfile(c["video_path"])          # Windows: abre en el reproductor default
        except Exception as e:
            print("no pude abrir", c["video_path"], e)


def reject(ch: str, seqs: set) -> None:
    conn = _conn(ch)
    from pathlib import Path
    for c in db.by_status(conn, "pending"):
        if c["seq"] in seqs:
            Path(c["video_path"]).unlink(missing_ok=True)
            db.set_status(conn, c["seq"], "rejected")
            print(f"[{ch}] rechazado seq {c['seq']}: {c['title'][:40]}")


def approve(ch: str, seqs: set | None) -> None:
    conn = _conn(ch)
    pend = db.by_status(conn, "pending")
    target = [c for c in pend if (not seqs or c["seq"] in seqs)]
    for c in target:
        db.set_status(conn, c["seq"], "approved")
        print(f"[{ch}] APROBADO seq {c['seq']}: {c['title'][:40]}")
    print(f"[{ch}] {len(target)} aprobado(s). Quedan {len(db.by_status(conn, 'pending'))} pendientes.")


def main() -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    if len(sys.argv) < 2 or sys.argv[1] not in scfg.CHANNELS:
        print(f"Uso: python -m streamers.review <{'|'.join(scfg.CHANNELS)}> "
              "[open | reject <seq...> | approve [seq...]]")
        return 1
    ch = sys.argv[1]
    cmd = sys.argv[2] if len(sys.argv) > 2 else "list"
    seqs = {int(x) for x in sys.argv[3:] if x.lstrip("-").isdigit()}
    if cmd == "list":
        list_pending(ch)
    elif cmd == "open":
        open_pending(ch)
    elif cmd == "reject":
        reject(ch, seqs)
    elif cmd == "approve":
        approve(ch, seqs or None)
    else:
        print("comando desconocido:", cmd)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
