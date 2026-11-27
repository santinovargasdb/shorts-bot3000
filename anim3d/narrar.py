"""Voz + tiempos + subtítulos de un episodio 3D. La animación se arma DESPUÉS, sobre estos
tiempos: cada frase del guion es un "paso" de la escena y dura lo que dura su audio.

    python -m anim3d.narrar alcatraz

Lee anim3d/episodes/<ep>/guion.json y deja en anim3d/out/<ep>/:
  narration.m4a   la voz completa (voz del canal; velocidad = "rate" del guion o la del canal)
  timing.json     inicio/fin de cada frase y de cada palabra (lo lee la escena)
  captions.ass    subtítulos de UNA palabra, blancos, al medio (como los canales de referencia)

Ritmo (medido contra @hastaquefuncione3d el 26-nov-2026: 3,3 palabras/s, pausa máxima 0,6 s):
la voz de edge-tts deja más de un segundo en cada punto, así que acá toda pausa se recorta a
MAX_GAP. Sin eso el primer episodio quedó en 2,66 palabras/s y "muy pausado".
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from src import config as cfg
from src.subtitles import build_ass
from src.transcribe import Word

HERE = Path(__file__).resolve().parent
MAX_GAP = 0.36          # ninguna pausa dentro de una frase dura más que esto
PAUSE = 0.16            # aire entre una frase y la siguiente
CAPTION = {"font": "Montserrat Black", "font_size": 84, "margin_v": 720, "outline": 6, "shadow": 2,
           "uppercase": False, "highlight_color": "&H00FFFFFF"}


def _dur(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def _synth_words(text: str, mp3: Path, voice: str, rate: str) -> list[Word]:
    """Como src.tts.synthesize pero pidiendo los tiempos por PALABRA: las versiones nuevas de
    edge-tts dan tiempos por oración salvo que se pida boundary='WordBoundary' (sin eso el
    subtítulo salía vacío). El resto del motor no lo nota porque alinea con Whisper."""
    import asyncio
    import edge_tts

    async def run() -> list[Word]:
        try:
            com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
        except TypeError:                           # edge-tts viejo: ya da palabras por defecto
            com = edge_tts.Communicate(text, voice, rate=rate)
        ws: list[Word] = []
        with open(mp3, "wb") as f:
            async for chunk in com.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    s = chunk["offset"] / 1e7
                    ws.append(Word(start=s, end=s + chunk["duration"] / 1e7, text=chunk["text"]))
        return ws
    return asyncio.run(run())


def tighten(words: list[Word], max_gap: float = MAX_GAP) -> tuple[list[tuple[float, float]], list[Word]]:
    """Qué tramos del audio se conservan y dónde queda cada palabra después de recortar las
    pausas largas (se deja max_gap/2 de aire a cada lado del corte)."""
    keep, out, cut = [], [], 0.0
    seg_start = max(0.0, words[0].start - 0.04)
    offset = seg_start                              # cuánto audio se quitó antes de la palabra actual
    for i, w in enumerate(words):
        out.append(Word(start=w.start - offset, end=w.end - offset, text=w.text))
        nxt = words[i + 1] if i + 1 < len(words) else None
        if nxt and nxt.start - w.end > max_gap:
            a, b = w.end + max_gap / 2, nxt.start - max_gap / 2
            keep.append((seg_start, a)); seg_start = b; offset += b - a
    keep.append((seg_start, words[-1].end + 0.06))
    return keep, out


def narrar(episode: str) -> dict:
    guion = json.loads((HERE / "episodes" / episode / "guion.json").read_text(encoding="utf-8"))
    channel = cfg.load_channel(guion["canal"])
    rate = guion.get("rate") or channel["tts_rate"]
    out = HERE / "out" / episode
    out.mkdir(parents=True, exist_ok=True)

    frases, words, wavs, t = [], [], [], 0.0
    for i, text in enumerate(guion["frases"]):
        mp3 = out / f"f{i:02d}.mp3"
        raw = _synth_words(text, mp3, voice=channel["tts_voice"], rate=rate)
        if not raw:
            raise RuntimeError(f"edge-tts no devolvió tiempos de palabra para la frase {i + 1}")
        keep, ws = tighten(raw)
        sel = "+".join(f"between(t\\,{a:.3f}\\,{b:.3f})" for a, b in keep)
        wav = out / f"f{i:02d}.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-af",
                        f"aselect='{sel}',asetpts=N/SR/TB,apad=pad_dur={PAUSE}", "-ar", "44100", "-ac", "2", str(wav)], check=True)
        d = _dur(wav)
        frases.append({"start": round(t, 3), "end": round(t + d, 3), "text": text})
        words += [Word(start=t + w.start, end=t + w.end, text=w.text) for w in ws]
        wavs.append(wav)
        t += d

    (out / "alist.txt").write_text("".join(f"file '{w.name}'\n" for w in wavs), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", "alist.txt",
                    "-c:a", "aac", "-b:a", "160k", "narration.m4a"], cwd=str(out), check=True)
    duration = _dur(out / "narration.m4a")

    # Una palabra por vez, con mayúscula inicial (el guion va en minúsculas salvo nombres).
    shown = [Word(start=w.start, end=w.end, text=w.text[:1].upper() + w.text[1:]) for w in words]
    build_ass(shown, out / "captions.ass", caption={**channel["caption"], **CAPTION, **guion.get("caption", {})},
              target_width=1080, target_height=1920, clip_duration=duration, max_words=1,
              boundaries=[f["start"] for f in frases])

    timing = {"duration": round(duration, 3), "frases": frases,
              "words": [{"start": round(w.start, 3), "end": round(w.end, 3), "text": w.text} for w in words]}
    (out / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    for f in [*out.glob("f*.mp3"), *wavs, out / "alist.txt"]:
        f.unlink(missing_ok=True)
    return timing


if __name__ == "__main__":
    for _st in (sys.stdout, sys.stderr):
        try:
            _st.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    tm = narrar(sys.argv[1] if len(sys.argv) > 1 else "alcatraz")
    for i, f in enumerate(tm["frases"], 1):
        print(f"{i:2}. {f['start']:6.2f} -> {f['end']:6.2f}  ({f['end'] - f['start']:.1f}s)  {f['text'][:60]}")
    ws = tm["words"]
    gaps = [b["start"] - a["end"] for a, b in zip(ws, ws[1:])]
    print(f"total: {tm['duration']:.1f}s | {len(ws)} palabras = {len(ws) / tm['duration']:.2f} palabras/s | pausa máxima {max(gaps):.2f}s")
