from pathlib import Path

from uploaders.youtube_upload import TOKEN, _resolve_token


def test_resolve_token_default():
    assert _resolve_token(None) == TOKEN


def test_resolve_token_custom():
    p = _resolve_token("secrets/historia/token.json")
    assert isinstance(p, Path)
    assert p.as_posix().endswith("secrets/historia/token.json")
    assert p.is_absolute()
