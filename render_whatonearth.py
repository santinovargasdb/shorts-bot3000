# render_whatonearth.py
"""Renderer del montaje de 'What On Earth Is This': por cada ítem, clip entero
sobre fondo desenfocado + voz pregunta/respuesta (TikTok TTS) + cartel del nombre."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from whatonearth import tts

VOICE_Q = "en_us_006"   # pregunta (Serious male)
VOICE_A = "en_us_001"   # respuesta (Jessie)
SPEED = 1.3             # acelera las voces (TikTok TTS viene lento)
GAP = 1.3               # silencio de SUSPENSO entre pregunta y respuesta
HOLD = 4.0              # segundos de clip DESPUÉS de la respuesta, si NO hay dato (dejar respirar)
GAP_FACT = 0.5          # gap corto entre la respuesta y el dato
TAIL_FACT = 1.5         # cola DESPUÉS del dato (reemplaza el silencio largo del HOLD)
MUSIC_VOL = 0.12        # volumen del bed de música (bajo, debajo de la voz)
CLIP_H = 1000           # alto del clip en modo 'smart' (entre 608=fit y 1920=fill): zoom medio
CLIP_Y = 120            # margen superior del clip: lo deja ARRIBA de la UI de TikTok (like/cuenta)
_FONT = "C:/Windows/Fonts/ariblk.ttf"   # Arial Black (bold, para el cartel)


def _clean_tts(text: str) -> str:
    """Saca puntuación que el TTS de TikTok LEE en voz alta ('...' -> 'dot dot dot')."""
    t = (text or "").replace("…", ", ").replace("...", ", ").replace("..", ", ")
    t = t.replace("—", ", ").replace(" - ", ", ")
    while ", ," in t:
        t = t.replace(", ,", ", ")
    while "  " in t:
        t = t.replace("  ", " ")
    return t.strip().strip(",").strip()


def _run(cmd, cwd):
    r = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg:\n" + r.stderr[-1400:])


def _dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", str(p)], capture_output=True, text=True)
    out = r.stdout.strip()
    if r.returncode != 0 or not out:
        raise RuntimeError(f"ffprobe no pudo leer duración de {p}: {r.stderr.strip()[:200]}")
    return float(out)


def _audio_files(i: int, has_fact: bool) -> list[str]:
    """Orden de los audios de UN ítem: pregunta -> gap de suspenso -> respuesta, y si hay dato,
    un gap corto + el dato (que llena el silencio que antes quedaba después del nombre)."""
    files = [f"q{i}.mp3", "gap.mp3", f"a{i}.mp3"]
    if has_fact:
        files += ["gapf.mp3", f"f{i}.mp3"]
    return files


def _vf(frame: str = "smart", satisfy: bool = False) -> str:
    """Filtro de video por ítem. 'smart' = clip anclado arriba sobre fondo borroso; con
    `satisfy` se agrega un 3er input [2:v] (clip satisfactorio) en la banda muerta de abajo."""
    if frame == "smart":
        base = ("[0:v]split=2[b][f];"
                "[b]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=26:1,eq=brightness=-0.05[bg];"
                f"[f]scale=1080:{CLIP_H}:force_original_aspect_ratio=increase,crop=1080:{CLIP_H}[fg];")
        if satisfy:
            sat_y = CLIP_Y + CLIP_H            # justo debajo del clip (1120)
            band_h = 1920 - sat_y             # banda muerta hasta abajo (800)
            return (base +
                    f"[2:v]scale=1080:{band_h}:force_original_aspect_ratio=increase,"
                    f"crop=1080:{band_h},setsar=1[sat];"
                    f"[bg][fg]overlay=(W-w)/2:{CLIP_Y}[tmp];"
                    f"[tmp][sat]overlay=0:{sat_y},setsar=1[v]")
        return base + f"[bg][fg]overlay=(W-w)/2:{CLIP_Y},setsar=1[v]"
    if frame == "fit":                         # clip ENTERO sobre fondo desenfocado (bandas difusas)
        return ("[0:v]split=2[b][f];"
                "[b]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                "boxblur=26:1,eq=brightness=-0.06[bg];"
                "[f]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
                "[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]")
    return ("[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"   # fill: llena el 9:16
            "crop=1080:1920,setsar=1[v]")


def name_card(name: str, out_path) -> None:
    """Cartel limpio estilo TikTok/CapCut: negrita blanca MAYÚSCULA con contorno
    negro grueso + sombra suave. Sin píldora."""
    name = name.upper()
    stroke = 12
    f = ImageFont.truetype(_FONT, 92)
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    bbox = probe.textbbox((0, 0), name, font=f, stroke_width=stroke)
    pad = 24
    W = (bbox[2] - bbox[0]) + pad * 2
    H = (bbox[3] - bbox[1]) + pad * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H / 2
    d.text((cx + 4, cy + 6), name, font=f, anchor="mm",
           fill=(0, 0, 0, 110), stroke_width=stroke, stroke_fill=(0, 0, 0, 110))  # sombra
    d.text((cx, cy), name, font=f, anchor="mm",
           fill=(255, 255, 255, 255), stroke_width=stroke, stroke_fill=(0, 0, 0, 255))
    img.save(out_path)


def credit_card(author: str, out_path) -> None:
    """Crédito mínimo y discreto para la esquina sup. derecha (cortesía; NO da
    protección legal real). Sin autor -> PNG transparente (invisible)."""
    text = ("via " + author).strip() if author else ""
    if not text:
        Image.new("RGBA", (2, 2), (0, 0, 0, 0)).save(out_path)
        return
    f = ImageFont.truetype(_FONT, 30)
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    bbox = probe.textbbox((0, 0), text, font=f, stroke_width=2)
    padx, pady = 14, 8
    W = (bbox[2] - bbox[0]) + padx * 2
    H = (bbox[3] - bbox[1]) + pady * 2
    img = Image.new("RGBA", (W, H), (0, 0, 0, 90))      # caja semitransparente
    d = ImageDraw.Draw(img)
    d.text((padx - bbox[0], pady - bbox[1]), text, font=f,
           fill=(255, 255, 255, 190), stroke_width=2, stroke_fill=(0, 0, 0, 160))
    img.save(out_path)


def render(items: list, out_path, workdir, music=None, frame="smart", satisfy=False) -> Path:
    """frame='fill' = el clip llena el 9:16 (sin bandas, pero zoomea horizontales);
    'fit' = clip entero sobre fondo desenfocado (sin zoom, con bandas difusas);
    'smart' = clip anclado arriba sobre fondo borroso. satisfy=True rellena la banda muerta
    de abajo (solo en 'smart') con clips del pool satisfactorio compartido."""
    work = Path(workdir)
    work.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
          "-t", f"{GAP}", "-q:a", "9", "gap.mp3"], work)
    _run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
          "-t", f"{GAP_FACT}", "-q:a", "9", "gapf.mp3"], work)
    sats = []
    if satisfy and frame == "smart":
        try:
            from streamers.satisfying import pick_for
            sats = pick_for("whatonearth", len(items))   # si el pool está vacío -> [] -> fallback blur
        except Exception:
            sats = []
    segs = []
    for i, it in enumerate(items):
        # TTS crudo y luego acelerado (atempo); todo lo de abajo usa los acelerados.
        tts.synth(_clean_tts(it["question_en"]), VOICE_Q, work / f"q{i}_raw.mp3")
        tts.synth(_clean_tts(it["answer_en"]), VOICE_A, work / f"a{i}_raw.mp3")
        raws = [(f"q{i}_raw.mp3", f"q{i}.mp3"), (f"a{i}_raw.mp3", f"a{i}.mp3")]
        fact = (it.get("fact_en") or "").strip()      # dato opcional que llena el silencio
        has_fact = bool(fact)
        if has_fact:
            tts.synth(_clean_tts(fact), VOICE_A, work / f"f{i}_raw.mp3")
            raws.append((f"f{i}_raw.mp3", f"f{i}.mp3"))
        for raw, fin in raws:
            _run(["ffmpeg", "-y", "-i", raw, "-filter:a", f"atempo={SPEED}",
                  "-c:a", "libmp3lame", "-q:a", "4", fin], work)
        files = _audio_files(i, has_fact)
        (work / f"al{i}.txt").write_text(
            "".join(f"file '{f}'\n" for f in files), encoding="utf-8")
        _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"al{i}.txt",
              "-c:a", "aac", f"au{i}.m4a"], work)
        adur = _dur(work / f"au{i}.m4a")
        seg_dur = adur + (TAIL_FACT if has_fact else HOLD)
        clip = Path(it["clip_path"]).resolve()
        # El ítem se nombra SOLO por voz (sin cartel en pantalla, a pedido del usuario).
        sat = sats[i % len(sats)] if sats else None
        use_sat = sat is not None
        vf = _vf(frame, satisfy=use_sat)
        cmd = ["ffmpeg", "-y", "-stream_loop", "-1", "-t", f"{seg_dur:.2f}", "-i", str(clip),
               "-i", f"au{i}.m4a"]
        if use_sat:                                   # 3er input: clip satisfactorio (ignoramos su audio)
            cmd += ["-stream_loop", "-1", "-t", f"{seg_dur:.2f}", "-i", str(Path(sat).resolve())]
        cmd += ["-filter_complex", vf,
                "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium",
                "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-r", "30",
                "-t", f"{seg_dur:.2f}", f"seg{i}.mp4"]
        _run(cmd, work)
        segs.append(f"seg{i}.mp4")
    (work / "concat.txt").write_text("".join(f"file '{s}'\n" for s in segs), encoding="utf-8")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # Video: se COPIA (los segmentos ya están en medium/crf18 -> sin doble-encode).
    # Audio: si hay música, la mezclamos bajita debajo de la voz (sin aire muerto).
    if music and Path(music).exists():
        _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "concat.txt",
              "-stream_loop", "-1", "-i", str(Path(music).resolve()),
              "-filter_complex",
              f"[1:a]volume={MUSIC_VOL}[m];"
              "[0:a][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]",
              "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest",
              str(out_path.resolve())], work)
    else:
        _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "concat.txt",
              "-c:v", "copy", "-c:a", "aac", str(out_path.resolve())], work)
    return out_path
