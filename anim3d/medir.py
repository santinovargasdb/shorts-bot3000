"""Mide el ritmo de un video: cortes, cuánto cambia la imagen, cuánto queda quieta y los silencios.

    python -m anim3d.medir video1.mp4 [video2.mp4 ...]

Referencia (@WeirdLittleFactsydk, 26-nov-2026): cortes fuertes 2 en 41 s, un cambio cada 1,9 s,
movimiento 18,4, quieto 0 %. Episodio aprobado (Torre Eiffel v4, medido el 27-nov): 8 cortes, cambio cada 3,3 s,
movimiento 9,3, quieto 0 %. (Los 1 corte / 1,2 s / 10,5 que se citaron antes eran de la v3 CON cortinillas, que disfrazaban los cortes.)
"""
from __future__ import annotations

import re
import subprocess
import sys


def _run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def _dur(p):
    return float(_run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).stdout.strip())


def _cuts(p, thr):
    r = _run(["ffmpeg", "-v", "info", "-i", p, "-an", "-vf", f"scale=270:-1,select='gt(scene,{thr})',showinfo", "-f", "null", "-"])
    return [float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]


def _motion(p):
    """Promedio de diferencia entre cuadros consecutivos (0-255), a 10 fps y chico."""
    r = _run(["ffmpeg", "-v", "info", "-i", p, "-an", "-vf",
              "fps=10,scale=135:-1,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"])
    vals = [float(m) for m in re.findall(r"YAVG=([0-9.]+)", r.stderr)]
    still = sum(1 for v in vals if v < 0.6) / max(len(vals), 1)        # cuadros casi idénticos al anterior
    return sum(vals) / max(len(vals), 1), still


def _silences(p, db=-32, d=0.35):
    r = _run(["ffmpeg", "-v", "info", "-i", p, "-vn", "-af", f"silencedetect=noise={db}dB:d={d}", "-f", "null", "-"])
    ds = [float(m) for m in re.findall(r"silence_duration: ([0-9.]+)", r.stderr)]
    return len(ds), sum(ds)


def medir(p: str) -> dict:
    d = _dur(p)
    hard, soft = _cuts(p, 0.30), _cuts(p, 0.10)
    mo, still = _motion(p)
    ns, ts = _silences(p)
    return {"duracion": round(d, 1), "cortes_fuertes": len(hard), "cambio_cada_s": round(d / max(len(soft), 1), 1),
            "movimiento": round(mo, 2), "quieto_pct": round(still * 100, 1), "silencios": ns, "silencio_total_s": round(ts, 1)}


def linea(p: str, m: dict) -> str:
    name = p.replace("\\", "/").split("/")[-1]
    return (f"{name:24} dur {m['duracion']:5.1f}s | cortes fuertes {m['cortes_fuertes']:3} | cambio cada {m['cambio_cada_s']:4.1f}s"
            f" | movimiento {m['movimiento']:5.2f} | quieto {m['quieto_pct']:4.1f}% | silencios>0.35s: {m['silencios']}")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(linea(p, medir(p)))
