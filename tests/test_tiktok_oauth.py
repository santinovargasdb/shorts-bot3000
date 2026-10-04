# tests/test_tiktok_oauth.py
from urllib.parse import parse_qs, urlparse

import pytest

import uploaders.tiktok_upload as tt


def test_parse_callback_devuelve_code():
    code = tt._parse_callback("/callback/?code=abc123&state=est4do", "est4do")
    assert code == "abc123"


def test_parse_callback_rechaza_state_invalido():
    with pytest.raises(RuntimeError, match="state"):
        tt._parse_callback("/callback/?code=abc123&state=otro", "est4do")


def test_parse_callback_error_de_tiktok():
    with pytest.raises(RuntimeError, match="denied"):
        tt._parse_callback(
            "/callback/?error=access_denied&error_description=denied&state=est4do",
            "est4do")


def test_parse_callback_sin_code():
    with pytest.raises(RuntimeError, match="code"):
        tt._parse_callback("/callback/?state=est4do", "est4do")


def test_auth_url_acepta_redirect_y_state_propios(monkeypatch):
    monkeypatch.setenv("TIKTOK_CLIENT_KEY", "ckey-test")
    url = tt.auth_url(redirect_uri="http://localhost:5555/callback/", state="est4do")
    q = parse_qs(urlparse(url).query)
    assert q["client_key"] == ["ckey-test"]
    assert q["redirect_uri"] == ["http://localhost:5555/callback/"]
    assert q["state"] == ["est4do"]
    assert q["response_type"] == ["code"]
