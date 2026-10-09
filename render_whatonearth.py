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
_FONT = "C:/Windows/Fonts/seguisb.ttf"


def _run(cmd, cwd):
    r = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg:\n" + r.stderr[-1400:])


def _dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True).stdout.strip())


def name_card(name: str, out_path) -> None:
    pad_x, h = 56, 150
    f = ImageFont.truetype(_FONT, 80)
    tw = ImageDraw.Draw(Image.new("RGBA", (10, 10))).textlength(name, font=f)
    W = int(tw + pad_x * 2)
    img = Image.new("RGBA", (W, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W - 1, h - 1], radius=36, fill=(255, 255, 255, 240))
    d.rounded_rectangle([0, 0, W - 1, h - 1], radius=36, outline=(255, 196, 0, 255), width=6)
    d.text((W / 2, h / 2), name, font=f, fill=(20, 20, 24, 255), anchor="mm")
    img.save(out_path)


def render(items: list, out_path, workdir) -> Path:
    work = Path(workdir)
    work.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
          "-t", "0.3", "-q:a", "9", "sil.mp3"], work)
    segs = []
    for i, it in enumerate(items):
        tts.synth(it["question_en"], VOICE_Q, work / f"q{i}.mp3")
        tts.synth(it["answer_en"], VOICE_A, work / f"a{i}.mp3")
        (work / f"al{i}.txt").write_text(
            f"file 'q{i}.mp3'\nfile 'sil.mp3'\nfile 'a{i}.mp3'\n", encoding="utf-8")
        _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"al{i}.txt",
              "-c:a", "aac", f"au{i}.m4a"], work)
        adur, qdur = _dur(work / f"au{i}.m4a"), _dur(work / f"q{i}.mp3")
        name_card(it["name"], work / f"name{i}.png")
        clip = Path(it["clip_path"]).resolve()
        vf = ("[0:v]split=2[b][f];"
              "[b]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
              "boxblur=26:1,eq=brightness=-0.06[bg];"
              "[f]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
              "[bg][fg]overlay=(W-w)/2:(H-h)/2[base];"
              f"[base][1:v]overlay=x=(W-w)/2:y=1500:enable='gte(t,{qdur:.2f})'[v]")
        _run(["ffmpeg", "-y", "-stream_loop", "-1", "-t", f"{adur + 0.3:.2f}", "-i", str(clip),
              "-i", f"name{i}.png", "-i", f"au{i}.m4a", "-filter_complex", vf,
              "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-preset", "veryfast",
              "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-r", "30",
              "-t", f"{adur + 0.3:.2f}", f"seg{i}.mp4"], work)
        segs.append(f"seg{i}.mp4")
    (work / "concat.txt").write_text("".join(f"file '{s}'\n" for s in segs), encoding="utf-8")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "concat.txt",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
          "-c:a", "aac", str(out_path.resolve())], work)
    return out_path
