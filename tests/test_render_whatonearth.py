# tests/test_render_whatonearth.py
import shutil
import subprocess
from pathlib import Path

import pytest

import render_whatonearth as rw

pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="requiere ffmpeg")


def _clip(path: Path, color="red", secs=2):
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                    f"color=c={color}:s=640x360:d={secs}", "-pix_fmt", "yuv420p", str(path)],
                   check=True, capture_output=True)


def test_name_card_crea_png(tmp_path):
    out = tmp_path / "card.png"
    rw.name_card("PANGOLIN", out)
    assert out.exists() and out.stat().st_size > 0


def test_render_produce_video(tmp_path, monkeypatch):
    # TTS falso: genera un mp3 de silencio real para no pegarle a la red
    def fake_synth(text, voice, out):
        subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                        "anullsrc=r=24000:cl=mono", "-t", "1", "-q:a", "9", str(out)],
                       check=True, capture_output=True)

    monkeypatch.setattr(rw.tts, "synth", fake_synth)
    clip = tmp_path / "c.mp4"; _clip(clip)
    out = tmp_path / "video.mp4"
    res = rw.render([{"name": "PANGOLIN", "question_en": "What is this?",
                      "answer_en": "This is a pangolin.", "clip_path": clip}],
                    out, tmp_path / "work")
    assert Path(res).exists()
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                "format=duration", "-of", "default=nw=1:nk=1", str(res)],
                               capture_output=True, text=True).stdout.strip())
    assert dur > 0
