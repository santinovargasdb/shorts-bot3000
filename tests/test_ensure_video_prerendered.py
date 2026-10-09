# tests/test_ensure_video_prerendered.py
from pathlib import Path
import types

import daily_post


def test_usa_video_prerenderizado():
    # Un series que expone video_path_for -> _ensure_video devuelve ESE path tal cual,
    # sin tocar generate ni calcular rutas de output.
    serie = types.SimpleNamespace(video_path_for=lambda p: "C:/x/woe_0001.mp4")
    out = daily_post._ensure_video(1, {"engine_channel": "whatonearth"}, serie)
    assert out == Path("C:/x/woe_0001.mp4")
