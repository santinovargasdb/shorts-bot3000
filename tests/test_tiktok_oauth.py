# tests/test_tiktok_oauth.py
import hashlib
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


def test_pkce_challenge_es_sha256_hex():
    # TikTok usa SHA256 en HEX (no base64url); debe ser 64 chars hex.
    verifier = "abc123-_.~ABC"
    challenge = tt._pkce_challenge(verifier)
    assert challenge == hashlib.sha256(verifier.encode("ascii")).hexdigest()
    assert len(challenge) == 64
    assert all(c in "0123456789abcdef" for c in challenge)


def test_pkce_verifier_longitud_valida():
    # El code_verifier debe entrar en el rango 43-128 que exige TikTok.
    v = tt._pkce_verifier()
    assert 43 <= len(v) <= 128


def test_auth_url_incluye_pkce_cuando_hay_challenge(monkeypatch):
    monkeypatch.setenv("TIKTOK_CLIENT_KEY", "ckey-test")
    url = tt.auth_url(redirect_uri="http://localhost:5555/callback/",
                      state="est4do", code_challenge="ch4llenge")
    q = parse_qs(urlparse(url).query)
    assert q["code_challenge"] == ["ch4llenge"]
    assert q["code_challenge_method"] == ["S256"]


def test_auth_url_sin_pkce_no_agrega_challenge(monkeypatch):
    monkeypatch.setenv("TIKTOK_CLIENT_KEY", "ckey-test")
    url = tt.auth_url(redirect_uri="http://localhost:5555/callback/", state="est4do")
    q = parse_qs(urlparse(url).query)
    assert "code_challenge" not in q
    assert "code_challenge_method" not in q


def test_get_token_usa_token_file_por_canal(tmp_path):
    # Multi-canal: _get_token lee del token_file dado (no del global).
    import json
    import time
    tf = tmp_path / "tiktok_token.json"
    tf.write_text(json.dumps({"access_token": "TOK-historia",
                              "obtained_at": int(time.time()), "expires_in": 86400}),
                  encoding="utf-8")
    assert tt._get_token(token_file=tf) == "TOK-historia"
