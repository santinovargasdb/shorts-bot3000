"""Arma el video final de un episodio 3D: animación (video.mp4, muda) + voz + música + efectos + subtítulos.

    python -m anim3d.armar alcatraz                      ->  anim3d/out/alcatraz/final.mp4
    python -m anim3d.armar alcatraz --musica otra.mp3 --salida final_b.mp4     (probar otra pista)

Antes: `python -m anim3d.narrar <ep>` (voz y tiempos) y `node capture.mjs --page <ep>.html --out <ep>/video.mp4`
(que además deja sfx.json: los efectos que declaró la escena).

Cómo suena (medido con earshot sobre 6 videos de 5 canales de referencia, 26-nov-2026):
  - TODOS llevan una música de fondo suave bajo la voz (el modelo les da 41-77 % de "música"; a nuestra
    versión sin música, 2 %). Acá va la pista del guion ("musica") unos 15 dB por debajo de la voz.
  - Los efectos son pocos TIPOS, de diseño y grabados: soplido en los cortes, "pop" cuando aparece algo,
    barrido antes de una revelación, golpe en la revelación. Casi nada literal.
  - Volumen general entre -14 y -18 LUFS: se normaliza a -15.
NUNCA sintetizar efectos por código: la primera versión lo hizo (ruido filtrado, senos) y "molestaban".
Los sonidos salen de sfx/cc0 (kit de grabaciones CC0, de la skill sound-effects de barty-bart/motion-graphics)
y de sfx/real (hechos con `earshot make`, modelos aprendidos de grabaciones de dominio público).
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SFX = HERE / "sfx"
MUSIC_BELOW_VOICE = 15.0        # dB que la música queda debajo de la voz (con 17 el usuario no la oía; con 11 y 13, fuerte)
TARGET_LUFS = -15.0

# Qué archivo suena para cada efecto que nombra la escena: (archivos que se van turnando, volumen, recorte en s).
# "*_to" = el sonido TERMINA en ese instante (barrido que sube hasta el golpe).
SOUNDS = {
    "whoosh":   (sorted((SFX / "cc0" / "whoosh").glob("*.ogg")), 0.30, None),
    "pop":      (sorted((SFX / "cc0" / "pop").glob("*.ogg"))[:8], 0.34, None),
    "tap":      (sorted((SFX / "cc0" / "click").glob("*.ogg"))[:5], 0.26, None),
    "clang":    (sorted((SFX / "cc0" / "tick").glob("*.ogg")), 0.20, None),
    "boom":     ([SFX / "cc0" / "impact" / "fs-177242-cinematic-impact.ogg"], 0.55, None),
    "riser":    ([SFX / "cc0" / "kit" / "riser.ogg"], 0.30, None),
    "riser_to": ([SFX / "cc0" / "kit" / "riser.ogg"], 0.32, None),
    "thud":     ([SFX / "real" / "thud.wav"], 0.60, None),
    "drill":    ([SFX / "real" / "drill.wav"], 0.30, None),
    "splash":   ([SFX / "real" / "splash.wav"], 0.65, None),
    "hiss":     ([SFX / "real" / "hiss.wav"], 0.28, 1.8),
    "puff":     ([SFX / "real" / "puff.wav"], 0.30, None),
    "roll":     ([SFX / "real" / "roll.wav"], 0.45, None),
    "step":     ([SFX / "real" / "step.wav"], 0.22, 0.45),
}


def _dur(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def _lufs(path: Path) -> float:
    r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", str(path), "-vn", "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    found = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(found[-1]) if found else -23.0


def armar(episode: str, musica: str | None = None, salida: str = "final.mp4") -> Path:
    out = HERE / "out" / episode
    gpath = HERE / "episodes" / episode / "guion.json"
    guion = json.loads(gpath.read_text(encoding="utf-8")) if gpath.exists() else {}
    voz = (out / "narration.m4a").exists()            # las pruebas de estilo no llevan voz ni subtítulos
    total = _dur(out / ("narration.m4a" if voz else "video.mp4"))
    fonts = out / "_fonts"                           # libass necesita la fuente en una ruta relativa (sin C:\)
    fonts.mkdir(exist_ok=True)
    for ttf in (ROOT / "fonts").glob("*.ttf"):
        if not (fonts / ttf.name).exists():
            shutil.copy2(ttf, fonts / ttf.name)

    inputs = ["-i", "video.mp4"] + (["-i", "narration.m4a"] if voz else ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"])
    filters = ["[0:v]" + ("subtitles=captions.ass:fontsdir=_fonts," if voz else "") + "format=yuv420p[v]"]
    mix, n_in = ["[1:a]"], 2

    track = musica or guion.get("musica")
    if track:
        track = Path(track) if Path(track).is_absolute() else ROOT / track
        gain = ((_lufs(out / "narration.m4a") if voz else -18.0) - MUSIC_BELOW_VOICE) - _lufs(track)
        inputs += ["-stream_loop", "-1", "-i", str(track.resolve())]
        filters.append(f"[{n_in}:a]volume={gain:.1f}dB,afade=t=in:d=0.8,afade=t=out:st={total - 1.2:.2f}:d=1.2[mus]")
        mix.append("[mus]"); n_in += 1

    events = json.loads((out / "sfx.json").read_text(encoding="utf-8")) if (out / "sfx.json").exists() else []
    index: dict[Path, int] = {}
    turn: dict[str, int] = {}
    used, missing = 0, set()
    for t, name, vol in sorted(events):
        files, gain, cut = SOUNDS.get(name, ([], 0, None))
        files = [f for f in files if f.exists()]
        if not files:
            missing.add(name); continue
        f = files[turn.get(name, 0) % len(files)]; turn[name] = turn.get(name, 0) + 1   # se turnan: repetido suena a robot
        if f not in index:
            inputs += ["-i", str(f)]; index[f] = n_in; n_in += 1
        d = min(_dur(f), cut) if cut else _dur(f)
        start = t - d if name.endswith("_to") else t
        ms = max(0, int(start * 1000))
        trim = f"atrim=0:{cut},afade=t=out:st={cut - 0.25:.2f}:d=0.25," if cut else ""
        filters.append(f"[{index[f]}:a]{trim}aformat=sample_rates=44100:channel_layouts=stereo,"
                       f"adelay={ms}|{ms},volume={vol * gain:.3f}[s{used}]")
        mix.append(f"[s{used}]"); used += 1
    filters.append("".join(mix) + f"amix=inputs={len(mix)}:duration=longest:dropout_transition=0:normalize=0,"
                   f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=9[a]")

    (out / "filtro.txt").write_text(";\n".join(filters), encoding="utf-8")       # demasiado largo para la línea de comandos
    cmd = ["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex_script", "filtro.txt", "-map", "[v]", "-map", "[a]",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
           "-r", "30", "-movflags", "+faststart", "-t", f"{total:.3f}", salida]
    subprocess.run(cmd, cwd=str(out), check=True)
    print(f"efectos: {used} ({len(index)} archivos)" + (f" | SIN ARCHIVO: {sorted(missing)}" if missing else "")
          + f" | música: {track.name if track else 'ninguna'} | volumen final {_lufs(out / salida):.1f} LUFS")
    return out / salida


if __name__ == "__main__":
    a = sys.argv[1:]
    opt = lambda flag, default=None: a[a.index(flag) + 1] if flag in a else default
    print(armar(a[0] if a and not a[0].startswith("--") else "alcatraz", musica=opt("--musica"), salida=opt("--salida", "final.mp4")))
