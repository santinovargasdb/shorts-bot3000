"""Formato 'curiosidades' sobre GAMEPLAY:

- Gameplay (Minecraft parkour) de fondo TODO el tiempo.
- Por cada dato, una IMAGEN aparece en el CENTRO (tipo tarjeta) SOLO mientras se
  narra ese dato, sin tapar del todo el parkour. Al aparecer suena un 'pop'.
- Flujo: dato más interesante (con imagen) -> título hablado (grande, centrado)
  -> resto de datos con sus imágenes.
- Subtítulos karaoke abajo + música de fondo baja.

Ver curiosidades_run.py para el uso.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from . import config as cfg
from . import stock
from .faceless import OUTPUT_DIR, _resolve_music, _slug
from .multidato import _audio_dur, _music_credit
from .subtitles import build_ass
from .transcribe import transcribe_words
from .tts import synthesize

ROOT = Path(__file__).resolve().parent.parent


def _tighten(audio: Path) -> Path:
    """Acorta las pausas largas de la voz (los puntos meten ~1s de silencio) a
    ~0.2s para que el guion fluya como oración corrida (feedback de audiencia).
    También recorta el silencio inicial. Mantiene la entonación natural."""
    out = audio.with_name(audio.stem + "_t.m4a")
    af = ("silenceremove=start_periods=1:start_duration=0:start_threshold=-45dB:"
          "stop_periods=-1:stop_duration=0.30:stop_threshold=-40dB:stop_silence=0.20")
    subprocess.run(["ffmpeg", "-y", "-i", str(audio), "-af", af,
                    "-c:a", "aac", "-b:a", "160k", str(out)],
                   capture_output=True, text=True, check=True)
    return out


def _card(img: Path, out: Path, size: int = 620) -> Path:
    """Imagen -> cuadro centrado (sin marco), recortado a tamaño."""
    s = size
    vf = f"scale={s}:{s}:force_original_aspect_ratio=increase,crop={s}:{s},setsar=1"
    subprocess.run(["ffmpeg", "-y", "-i", str(img), "-vf", vf, "-frames:v", "1", str(out)],
                   capture_output=True, text=True, check=True)
    return out


def generate(
    segments: list[dict],
    channel_name: str = "faceless",
    background: str = "backgrounds/minecraft_parkour.mp4",
    music: str = "music/monkeys_spinning_monkeys.mp3",
    sfx: str = "sfx/whoosh.wav",
    title_meta: str | None = None,
    description: str | None = None,
    hashtags: list[str] | None = None,
    verbose: bool = True,
) -> Path:
    """segments: lista ordenada de
         {'kind': 'fact',  'text': frase, 'img': término}   -> imagen + pop
         {'kind': 'title', 'text': 'Cosas que no sabías'}   -> título grande
       El primer 'fact' debería ser el dato más interesante (gancho)."""
    channel = cfg.load_channel(channel_name)
    w, h = int(channel["target_width"]), int(channel["target_height"])
    voice = channel.get("tts_voice", "es-MX-DaliaNeural")
    rate = channel.get("tts_rate", "+8%")

    slug = _slug(title_meta or segments[0]["text"])
    out_dir = OUTPUT_DIR / channel_name
    work = out_dir / ".work" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)

    # 1) Voz por segmento + tiempos (duración exacta) + tarjetas de imagen
    audio_files: list[Path] = []
    segs: list[dict] = []
    t = 0.0
    for i, seg in enumerate(segments):
        a_raw = work / f"a_{i:02d}.mp3"
        synthesize(seg["text"], a_raw, voice=voice, rate=rate)
        a = _tighten(a_raw)          # pausas de puntos ~1s -> ~0.2s (fluidez)
        d = _audio_dur(a)
        audio_files.append(a)
        info = {"kind": seg["kind"], "start": t, "end": t + d}
        if seg["kind"] == "fact":
            # 2 imágenes DISTINTAS por dato, ambas de la query principal (más
            # relevante). Se descartan por id para no repetir; las otras queries
            # son solo respaldo si la principal no tiene resultados.
            queries = seg.get("imgs") or ([seg["img"]] if seg.get("img") else [])
            cards, used_ids = [], set()
            for j in range(2):
                res = None
                for q in queries:
                    try:
                        res = stock.download_image(q, work / f"img_{i:02d}_{j}.jpg", exclude_ids=used_ids)
                    except Exception as e:
                        print(f"  ⚠️  imagen '{q}': {e}")
                    if res:
                        break
                if res:
                    path, iid = res
                    used_ids.add(iid)
                    cards.append(_card(path, work / f"card_{i:02d}_{j}.png"))
            if cards:
                info["cards"] = cards
            if verbose:
                print(f"[curiosidades] Dato {i}: {queries} -> {len(cards)} img ({d:.1f}s)")
        else:
            info["title_text"] = seg["text"]
            if verbose:
                print(f"[curiosidades] Título: '{seg['text']}' ({d:.1f}s)")
        segs.append(info)
        t += d

    # 2) Narración concatenada
    alist = work / "alist.txt"
    alist.write_text("".join(f"file '{p.name}'\n" for p in audio_files), encoding="utf-8")
    narration = work / "narration.m4a"
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", alist.name,
                    "-c:a", "aac", "-b:a", "160k", narration.name],
                   cwd=str(work), capture_output=True, text=True, check=True)
    duration = _audio_dur(narration)

    # 3) Subtítulos karaoke + título grande centrado en su ventana
    lang = voice.split("-")[0] if "-" in voice else channel.get("language")
    if verbose:
        print(f"[curiosidades] Transcribiendo ({duration:.1f}s)...")
    words = transcribe_words(narration, model_size=channel["whisper_model"], language=lang)
    title_seg = next((s for s in segs if s["kind"] == "title"), None)
    ass = work / "captions.ass"
    build_ass(words, ass, caption=channel["caption"], target_width=w, target_height=h,
              offset=0.0, hook_text="", clip_duration=duration,
              center_title=(title_seg["title_text"] if title_seg else ""),
              center_start=(title_seg["start"] if title_seg else 0.0),
              center_end=(title_seg["end"] if title_seg else 0.0),
              boundaries=[s["start"] for s in segs])

    # 4) Eventos de imagen: cada dato reparte su ventana entre sus 1-2 imágenes
    #    (más dinámico; whoosh + animación en cada una).
    events = []
    for s in segs:
        cards = s.get("cards")
        if not cards:
            continue
        n = len(cards)
        seg_dur = s["end"] - s["start"]
        for j, card in enumerate(cards):
            events.append({
                "card": card,
                "start": s["start"] + j * seg_dur / n,
                "end": s["start"] + (j + 1) * seg_dur / n,
            })
    track = _resolve_music(music, 0)

    cmd = ["ffmpeg", "-y",
           "-stream_loop", "-1", "-t", f"{duration:.3f}", "-i", str(Path(background).resolve())]
    for ev in events:
        cmd += ["-loop", "1", "-framerate", "30", "-t", f"{duration:.3f}", "-i", str(ev["card"].resolve())]
    narr_i = 1 + len(events)
    cmd += ["-i", str(narration.resolve())]
    music_i = narr_i + 1
    cmd += ["-stream_loop", "-1", "-i", str(Path(track).resolve())] if track else []
    pop_i = music_i + 1 if track else narr_i + 1
    cmd += ["-i", str(Path(sfx).resolve())]

    # Video: fondo + overlays con animación corta de entrada/salida (deslizar+fundir)
    AD, OFF = 0.18, 70   # duración de la animación (s) y desplazamiento (px)
    Y_TOP = 210          # imagen arriba-centrada: no tapa el gameplay del centro
    vparts = [f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
              f"setsar=1,eq=brightness=-0.12:saturation=1.1[bg]"]
    # Preparar cada tarjeta: alpha + fundido de entrada/salida en su ventana
    for k, ev in enumerate(events):
        s, e2 = ev["start"], ev["end"] - AD
        vparts.append(
            f"[{k + 1}:v]format=yuva420p,fade=t=in:st={s:.3f}:d={AD}:alpha=1,"
            f"fade=t=out:st={e2:.3f}:d={AD}:alpha=1[c{k}]")
    # Encadenar overlays: se desliza hacia arriba al entrar y al salir (comillas
    # simples protegen las comas de las expresiones)
    prev = "bg"
    for k, ev in enumerate(events):
        s, e, e2 = ev["start"], ev["end"], ev["end"] - AD
        yexpr = (f"'{Y_TOP} + {OFF}*(1-min(1,max(0,(t-{s:.3f})/{AD}))) "
                 f"- {OFF}*min(1,max(0,(t-{e2:.3f})/{AD}))'")
        vparts.append(
            f"[{prev}][c{k}]overlay=x=(W-w)/2:y={yexpr}:"
            f"enable='between(t,{s:.3f},{e:.3f})'[o{k}]")
        prev = f"o{k}"
    vparts.append(f"[{prev}]subtitles={ass.name}[v]")

    # Audio: voz + música baja + whoosh en cada aparición de imagen
    F = len(events)
    LEAD = 0.12   # el whoosh arranca un poco antes de la imagen (sensación de transición)
    aparts = [f"[{narr_i}:a]volume=1.0[voz]"]
    mix = ["[voz]"]
    if track:
        aparts.append(f"[{music_i}:a]volume=0.16[mus]")
        mix.append("[mus]")
    if F:
        # whoosh en cada aparición de imagen (volumen bajo, no debe tapar la voz)
        aparts.append(f"[{pop_i}:a]volume=0.4,asplit={F}" + "".join(f"[ps{j}]" for j in range(F)))
        for j, ev in enumerate(events):
            ms = max(0, int((ev["start"] - LEAD) * 1000))
            aparts.append(f"[ps{j}]adelay={ms}|{ms}[pd{j}]")
            mix.append(f"[pd{j}]")
    aparts.append("".join(mix) + f"amix=inputs={len(mix)}:duration=first:normalize=0,alimiter=limit=0.95[a]")

    filter_complex = ";".join(vparts + aparts)
    out_name = f"{slug}.mp4"
    cmd += ["-filter_complex", filter_complex, "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-r", "30", "-t", f"{duration:.3f}",
            "-movflags", "+faststart", out_name]

    if verbose:
        print(f"[curiosidades] Componiendo (fondo: {Path(background).name}, "
              f"música: {track.name if track else 'no'}, pops: {F})...")
    r = subprocess.run(cmd, cwd=str(work), capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg falló:\n{r.stderr[-2500:]}")
    final = out_dir / out_name
    shutil.move(str(work / out_name), str(final))

    # 5) Metadatos (+ crédito música)
    tags = hashtags or ["#shorts", "#curiosidades", "#datoscuriosos", "#sabiasque", "#viral"]
    if description:
        desc = description
    else:
        facts_txt = " ".join(s["text"] for s in segments if s["kind"] == "fact")
        desc = facts_txt[:350] + "\n\n" + " ".join(tags)
    credit = _music_credit(track)
    if credit:
        desc += "\n\n" + credit
    (out_dir / f"{slug}.json").write_text(
        json.dumps({"title": (title_meta or "Curiosidades")[:100], "description": desc,
                    "hashtags": tags}, ensure_ascii=False, indent=2), encoding="utf-8")
    if verbose:
        print(f"[curiosidades] ✅ {final}")
    return final
