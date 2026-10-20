"""Orquestador: un video fuente + un canal -> varios Shorts listos para subir.

Pasos:
  1) Detecta momentos destacados por energía de audio (gratis).
  2) Transcribe el video una sola vez (faster-whisper, local).
  3) Por cada clip: subtítulos karaoke + render vertical 9:16.
  4) Escribe metadatos (título/descr/hashtags borrador) junto a cada short.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from . import config as cfg
from .edit import render_short
from .highlights import Clip, find_highlights
from .subtitles import build_ass
from .transcribe import Word, transcribe_words

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output"
MUSIC_STREAMERS = ROOT / "music" / "streamers"


# Pools de música firma: mood -> (archivo en music/streamers/, segundo de arranque).
MUSIC = {
    "emotivo": ("emotiva.mp3", 0.0),
    "epico": ("epica.mp3", 30.0),     # ALLBA: arranca en el drop épico (~0:30)
    "gracioso": ("graciosa.mp3", 0.0),
}


def _satisfy_for_channel(channel, use_gaming, picker):
    """(satisfy_top, satisfy_bottom). `use_gaming` = va el layout gaming (cara+gameplay) → 1
    satisfactorio ABAJO. Si no (sin cara, o IRL) → 3 franjas → 2 satisfactorios (arriba+abajo)."""
    if not channel.get("satisfying"):
        return (None, None)
    ch = channel.get("name", "")
    if use_gaming:
        got = picker(ch, 1)
        return (None, got[0] if got else None)
    got = picker(ch, 2)
    return (got[0] if len(got) > 0 else None, got[1] if len(got) > 1 else None)


def _classify_mood(transcript: str) -> str:
    """'emotivo' | 'epico' | 'gracioso' según el transcript, vía LLM (Groq). Default epico."""
    try:
        from reddit_pipeline.rewrite import build_client, model_name
        client = build_client()
        prompt = (
            "Clasificá el MOOD de este clip de streamer en UNA sola palabra:\n"
            "- 'emotivo': triste, sentido, wholesome, conmovedor.\n"
            "- 'epico': hype, epico, con aura, jugada/momento fuerte, serio-intenso.\n"
            "- 'gracioso': chistoso, meme, fail, divertido.\n"
            "Responde SOLO una de esas tres palabras, nada mas.\n\n"
            f"Transcript:\n{transcript[:1500]}"
        )
        r = client.chat.completions.create(
            model=model_name(), temperature=0, max_tokens=4,
            messages=[{"role": "user", "content": prompt}])
        ans = (r.choices[0].message.content or "").strip().lower()
        if "emot" in ans:
            return "emotivo"
        if "grac" in ans:
            return "gracioso"
        return "epico"   # default (incluye 'epico'/'épico' y cualquier respuesta rara)
    except Exception:
        return "epico"


def _words_in(words: list[Word], start: float, end: float) -> list[Word]:
    return [w for w in words if w.start >= start - 0.3 and w.start < end]


def _draft_metadata(channel: dict, clip_words: list[Word], idx: int) -> dict:
    """Título/descr/hashtags borrador a partir del transcript (sin API)."""
    transcript = " ".join(w.text for w in clip_words).strip()
    words_only = transcript.split()
    title = " ".join(words_only[:8]) if words_only else channel["display_name"]
    title = title[:90] + (" 🔥" if len(title) < 88 else "")
    tags = ["#shorts", "#viral", "#fyp"]
    if channel["_name"] == "streamers":
        tags += ["#clips", "#twitch", "#gaming"]
    elif channel["_name"] == "peliculas_series":
        tags += ["#pelicula", "#serie", "#escena"]
    else:
        tags += ["#curiosidades", "#datos", "#sabiasque"]
    return {
        "title": title,
        "description": (transcript[:400] + "\n\n" + " ".join(tags)).strip(),
        "hashtags": tags,
        "clip_index": idx,
    }


def process_source(
    source: Path | str,
    channel_name: str,
    verbose: bool = True,
    overrides: dict | None = None,
) -> list[Path]:
    """Genera todos los shorts de un video fuente para un canal. Devuelve rutas.

    `overrides` pisa claves de la config del canal (ej. {'whisper_model': 'tiny'})."""
    source = Path(source).resolve()
    channel = cfg.load_channel(channel_name)
    if overrides:
        channel.update(overrides)
    if verbose:
        print(f"[{channel_name}] Fuente: {source.name}")
        if channel.get("legal_note"):
            print(f"[{channel_name}] ⚠️  {channel['legal_note']}")

    out_dir = OUTPUT_DIR / channel_name
    work_dir = out_dir / ".work" / source.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    # 1) Momentos destacados
    clips: list[Clip] = find_highlights(
        source,
        n_clips=int(channel["clips_per_source"]),
        min_len=float(channel["short_min_seconds"]),
        max_len=float(channel["short_max_seconds"]),
    )
    if verbose:
        print(f"[{channel_name}] {len(clips)} momento(s) detectado(s).")

    # 2) Transcripción (una vez para todo el video)
    if verbose:
        print(f"[{channel_name}] Transcribiendo (Whisper '{channel['whisper_model']}')...")
    words = transcribe_words(
        source,
        model_size=channel["whisper_model"],
        language=channel.get("language"),
    )

    # 2b) Música firma por MOOD (solo canales con music_mood): emotivo/epico/gracioso.
    music, music_start = "", 0.0
    if channel.get("music_mood"):
        mood = _classify_mood(" ".join(w.text for w in words))
        fname, music_start = MUSIC.get(mood, MUSIC["epico"])
        track = MUSIC_STREAMERS / fname
        if not track.exists():            # fallback a épica (la que siempre está)
            fname, music_start = MUSIC["epico"]
            track = MUSIC_STREAMERS / fname
        music = str(track) if track.exists() else ""
        if verbose:
            tag = (track.name + (f" (desde {music_start:.0f}s)" if music_start else "")) if music else "sin música"
            print(f"[{channel_name}] Mood: {mood} -> {tag}")

    # 2c) Layout según el clip (solo canales con face_crop). Auto-detecta:
    #   - GAMING (hay gameplay detrás: la cara es un box chico) -> 2 paneles (cara/juego/negro).
    #   - IRL/sin gameplay (la cara llena el cuadro) -> facecam-only 9:16 (formato que ya va bien,
    #     el del nicho inglés). El umbral es la fracción ancho-de-cara / ancho-de-fuente.
    crop_rect = None
    face_box = None
    layout = ""
    caption = channel["caption"]
    if channel.get("face_crop"):
        from .facecrop import detect_face, facecam_crop
        fb = detect_face(source)
        if fb:
            cx, cy, fw, fh, W, H = fb
            lay = channel.get("layout", "")
            frac = (fw / W) if W else 1.0
            gaming = (lay == "gaming") or (
                lay == "auto" and frac < float(channel.get("gaming_face_frac", 0.18)))
            if gaming:
                layout = "gaming"
                # Box de la facecam estimado desde la cara (YuNet da la cara "tight"; la cam
                # es ~4x el ancho de la cara). Multiplicadores altos = menos upscale del panel
                # superior y más cabeza+hombros (no una cara recortada y blanda).
                cam_w = min(W, fw * 4.0)
                cam_h = min(H, fh * 3.2)
                cam_x = max(0, min(cx - cam_w / 2, W - cam_w))
                cam_y = max(0, min(cy - cam_h * 0.5, H - cam_h))
                face_box = (int(cam_x), int(cam_y), int(cam_w), int(cam_h))
                caption = {**channel["caption"],
                           "margin_v": int(channel.get("caption_margin_gaming", 560))}
            else:
                crop_rect = facecam_crop(cx, cy, fh, W, H)
                caption = {**channel["caption"],
                           "margin_v": int(channel.get("caption_margin_facecam", 660))}
        if verbose:
            if layout == "gaming":
                print(f"[{channel_name}] Layout: GAMING 2-paneles (box cara {face_box})")
            elif crop_rect:
                print(f"[{channel_name}] Layout: facecam-only {crop_rect}")
            else:
                print(f"[{channel_name}] Layout: sin cara estable -> crop/blur normal")

    # 3) Render por clip
    outputs: list[Path] = []
    for i, clip in enumerate(clips, 1):
        clip_words = _words_in(words, clip.start, clip.end)
        ass_path = work_dir / f"clip{i:02d}.ass"
        build_ass(
            clip_words,
            ass_path,
            caption=caption,
            target_width=int(channel["target_width"]),
            target_height=int(channel["target_height"]),
            offset=clip.start,
            hook_text=channel.get("hook_text", "") or "",
            clip_duration=clip.duration,
        )
        tmp_out = f"{source.stem}_clip{i:02d}.mp4"
        if verbose:
            print(f"[{channel_name}] Render {i}/{len(clips)}  ({clip.start:.0f}s → {clip.end:.0f}s)...")
        if channel.get("satisfying"):
            from streamers.verify import classify_gameplay
            from streamers.satisfying import pick_for
            has_gp = channel.get("_has_gameplay")
            if has_gp is None:
                has_gp = classify_gameplay(source) or False
            # Layout gaming (cara/juego/satisfactorio abajo) SOLO si hay gameplay Y cara detectada.
            # Sin cara (aunque sea gameplay) o IRL -> 3 franjas (satisfactorio/clip/satisfactorio).
            use_gaming = bool(has_gp and face_box)
            sat_top, sat_bot = _satisfy_for_channel(channel, use_gaming, pick_for)
        else:
            sat_top = sat_bot = None
        rendered = render_short(
            source=source,
            start=clip.start,
            duration=clip.duration,
            ass_file=ass_path,
            out_file=Path(tmp_out),
            crop_mode=channel["crop_mode"],
            width=int(channel["target_width"]),
            height=int(channel["target_height"]),
            grade=channel.get("grade", ""),
            music=music,
            music_start=music_start,
            crop_rect=crop_rect,
            fonts_dir=(ROOT / "fonts"),
            zoom_punch=bool(channel.get("zoom_punch")),
            punch_interval=float(channel.get("punch_interval", 2.5)),
            sfx_whoosh=(ROOT / "sfx" / "whoosh.wav") if channel.get("sfx_cut") else None,
            sfx_vol=float(channel.get("sfx_vol", 0.3)),
            layout=layout,
            face_box=face_box,
            crf=int(channel.get("crf", 20)),
            watermark=channel.get("watermark"),
            satisfy_top=sat_top,
            satisfy_bottom=sat_bot,
        )
        final = out_dir / tmp_out
        shutil.move(str(rendered), str(final))
        outputs.append(final)

        # 4) Metadatos borrador
        meta = _draft_metadata(channel, clip_words, i)
        (out_dir / f"{source.stem}_clip{i:02d}.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    if verbose:
        print(f"[{channel_name}] ✅ {len(outputs)} short(s) en {out_dir}")
    return outputs
