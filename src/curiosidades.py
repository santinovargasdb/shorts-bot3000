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
import random
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
    sfx_style: str = "datos",
    question: str | None = None,
    voice: str | None = None,
    rate: str | None = None,
    intro_card: str | Path | None = None,
    intro_card_seconds: float = 4.0,
    verbose: bool = True,
) -> Path:
    """segments: lista ordenada de
         {'kind': 'fact',  'text': frase, 'img': término}   -> imagen + pop
         {'kind': 'title', 'text': 'Cosas que no sabías'}   -> tarjeta visual (sin voz)
       El primer 'fact' debería ser el dato más interesante (gancho).
       sfx_style: 'datos' (whoosh entre datos + pop en el swap de imagen),
                  'misterios' (riser con cima en el último segmento + corte de música),
                  'historia' (boom en el giro = inicio del último segmento).
       question: pregunta binaria del remate, fija en pantalla los últimos segundos."""
    channel = cfg.load_channel(channel_name)
    w, h = int(channel["target_width"]), int(channel["target_height"])
    voice = voice or channel.get("tts_voice", "es-MX-DaliaNeural")
    rate = rate or channel.get("tts_rate", "+8%")

    slug = _slug(title_meta or segments[0]["text"])
    out_dir = OUTPUT_DIR / channel_name
    work = out_dir / ".work" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)

    # 1) Voz por segmento + tiempos (duración exacta) + tarjetas de imagen.
    #    El título NO se sintetiza (fórmula §2/§9.1: quemaba ~3s de audio en la
    #    zona crítica); queda solo como tarjeta visual sobre el primer dato.
    audio_files: list[Path] = []
    segs: list[dict] = []
    title_text = ""
    t = 0.0
    for i, seg in enumerate(segments):
        if seg["kind"] == "title":
            title_text = seg["text"]
            if verbose:
                print(f"[curiosidades] Título (solo tarjeta visual): '{seg['text']}'")
            continue
        a_raw = work / f"a_{i:02d}.mp3"
        synthesize(seg["text"], a_raw, voice=voice, rate=rate)
        a = _tighten(a_raw)          # pausas de puntos ~1s -> ~0.2s (fluidez)
        d = _audio_dur(a)
        audio_files.append(a)
        info = {"kind": "fact", "start": t, "end": t + d}
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
    first = segs[0] if segs else None
    ass = work / "captions.ass"
    build_ass(words, ass, caption=channel["caption"], target_width=w, target_height=h,
              offset=0.0, hook_text="", clip_duration=duration,
              center_title=(title_text if first else ""),
              center_start=(first["start"] + 0.15 if first and title_text else 0.0),
              center_end=(min(first["end"], first["start"] + 3.2) if first and title_text else 0.0),
              boundaries=[s["start"] for s in segs],
              question_text=question or "",
              question_start=max(0.0, duration - 4.5))

    # 4) Eventos de imagen: cada dato reparte su ventana entre sus 1-2 imágenes.
    #    El corte entre las 2 es aleatorio (40-65%, semilla por slug): si el
    #    cambio visual cae siempre en el mismo punto, el cerebro lo predice (§4).
    rng = random.Random(slug)
    events = []
    for s in segs:
        cards = s.get("cards")
        if not cards:
            continue
        n = len(cards)
        seg_dur = s["end"] - s["start"]
        if n == 2:
            frac = 0.40 + rng.random() * 0.25
            cortes = [s["start"], s["start"] + seg_dur * frac, s["end"]]
        else:
            cortes = [s["start"] + j * seg_dur / n for j in range(n)] + [s["end"]]
        for j, card in enumerate(cards):
            events.append({"card": card, "start": cortes[j], "end": cortes[j + 1],
                           "first": j == 0})
    # Índice determinístico por episodio: si `music` es una carpeta de nicho,
    # rota entre sus pistas (semilla propia para no tocar el stream de `rng`).
    track = _resolve_music(music, random.Random(slug + "|music").randrange(10_000))

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

    # SFX por estilo de canal (fórmula §5): pop en el swap de imagen (datos),
    # riser con cima en el último segmento + corte de música (misterios),
    # boom en el giro (historia). Cada golpe: (delay_s, volumen).
    SFX_VOL = 0.18   # feedback 2026-10-04: a 0.4 tapaba la voz, "re alto"
    LEAD = 0.12      # el sfx arranca un poco antes de la imagen (sensación de transición)
    extras: dict[Path, list[tuple[float, float]]] = {}
    dip: tuple[float, float] | None = None
    sfx_dir = ROOT / "sfx"
    if segs:
        ultimo = segs[-1]["start"]
        if sfx_style == "datos":
            for ev in events:
                if not ev["first"]:
                    extras.setdefault(sfx_dir / "pop.wav", []).append(
                        (max(0.0, ev["start"] - LEAD), SFX_VOL))
        elif sfx_style == "misterios" and len(segs) > 1:
            extras.setdefault(sfx_dir / "riser.wav", []).append(
                (max(0.0, ultimo - 2.85), 0.30))
            # corte a silencio: la música se apaga 400ms justo antes del remate
            dip = (max(0.0, ultimo - 0.45), max(0.0, ultimo - 0.05))
        elif sfx_style == "historia" and len(segs) > 1:
            extras.setdefault(sfx_dir / "boom.wav", []).append((ultimo, 0.35))
    # Sonido viral al aparecer la tarjeta de Reddit (swoosh en t=0).
    if intro_card:
        extras.setdefault(sfx_dir / "whoosh.wav", []).append((0.0, 0.3))
    extras = {p: hits for p, hits in extras.items() if p.exists()}
    for p in extras:
        cmd += ["-i", str(p.resolve())]
    # Tarjeta de post de Reddit: input de video extra (último) para el overlay de apertura.
    card_i = None
    if intro_card:
        card_i = pop_i + len(extras) + 1
        cmd += ["-loop", "1", "-framerate", "30",
                "-t", f"{min(intro_card_seconds + 0.5, duration):.3f}",
                "-i", str(Path(intro_card).resolve())]

    # Video: fondo + overlays con animación corta de entrada/salida (deslizar+fundir)
    AD, OFF = 0.18, 70   # duración de la animación (s) y desplazamiento (px)
    Y_TOP = 210          # imagen arriba-centrada: no tapa el gameplay del centro
    vparts = [f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
              f"setsar=1,eq=brightness=-0.12:saturation=1.1[bg]"]
    # Preparar cada tarjeta: Ken Burns sutil (zoom 1.0->1.08 durante su ventana,
    # §4: cambio visual continuo) + alpha + fundido de entrada/salida
    for k, ev in enumerate(events):
        s, e2 = ev["start"], ev["end"] - AD
        dur_ev = max(0.3, ev["end"] - ev["start"])
        vparts.append(
            f"[{k + 1}:v]zoompan=z='1+0.08*max(0,min(1,(on/30.0-{s:.3f})/{dur_ev:.3f}))':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:fps=30:s=620x620,"
            f"format=yuva420p,fade=t=in:st={s:.3f}:d={AD}:alpha=1,"
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
    vlabel = "v"
    # Overlay de la tarjeta de Reddit en la apertura: arriba, se desvanece al final.
    if intro_card and card_i is not None:
        st = max(0.1, intro_card_seconds - 0.5)
        vparts.append(f"[{card_i}:v]format=yuva420p,fade=t=out:st={st:.2f}:d=0.5:alpha=1[rc]")
        vparts.append(f"[v][rc]overlay=x=(W-w)/2:y=160:enable='lte(t,{intro_card_seconds:.2f})'[vo]")
        vlabel = "vo"

    # Audio: voz + música baja + whoosh en las transiciones + SFX del estilo.
    # En 'datos' el whoosh marca solo el cambio de dato (la 2ª imagen lleva pop).
    whoosh_evs = [ev for ev in events if ev["first"]] if sfx_style == "datos" else events
    Fw = len(whoosh_evs)
    aparts = [f"[{narr_i}:a]volume=1.0[voz]"]
    mix = ["[voz]"]
    if track:
        if dip:
            da, db = dip
            aparts.append(f"[{music_i}:a]volume='if(between(t,{da:.3f},{db:.3f}),0,0.16)':eval=frame[mus]")
        else:
            aparts.append(f"[{music_i}:a]volume=0.16[mus]")
        mix.append("[mus]")
    if Fw:
        aparts.append(f"[{pop_i}:a]volume={SFX_VOL},asplit={Fw}" + "".join(f"[ps{j}]" for j in range(Fw)))
        for j, ev in enumerate(whoosh_evs):
            ms = max(0, int((ev["start"] - LEAD) * 1000))
            aparts.append(f"[ps{j}]adelay={ms}|{ms}[pd{j}]")
            mix.append(f"[pd{j}]")
    for k, hits in enumerate(extras.values()):
        idx = pop_i + 1 + k
        if len(hits) == 1:
            d, vol = hits[0]
            ms = int(d * 1000)
            aparts.append(f"[{idx}:a]volume={vol},adelay={ms}|{ms}[ex{k}_0]")
            mix.append(f"[ex{k}_0]")
        else:
            aparts.append(f"[{idx}:a]asplit={len(hits)}" + "".join(f"[exs{k}_{j}]" for j in range(len(hits))))
            for j, (d, vol) in enumerate(hits):
                ms = int(d * 1000)
                aparts.append(f"[exs{k}_{j}]volume={vol},adelay={ms}|{ms}[ex{k}_{j}]")
                mix.append(f"[ex{k}_{j}]")
    # Mezcla final a -14 LUFS / -1.5 dBTP (§5: la normalización real de YouTube)
    aparts.append("".join(mix) + f"amix=inputs={len(mix)}:duration=first:normalize=0,"
                  "loudnorm=I=-14:TP=-1.5:LRA=11[a]")

    filter_complex = ";".join(vparts + aparts)
    out_name = f"{slug}.mp4"
    cmd += ["-filter_complex", filter_complex, "-map", f"[{vlabel}]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-r", "30", "-t", f"{duration:.3f}",
            "-movflags", "+faststart", out_name]

    if verbose:
        print(f"[curiosidades] Componiendo (fondo: {Path(background).name}, "
              f"música: {track.name if track else 'no'}, tarjetas: {len(events)}, "
              f"sfx: {sfx_style})...")
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
