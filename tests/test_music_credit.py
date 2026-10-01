from pathlib import Path

from src.multidato import MUSIC_DIR, _music_credit


def test_credito_por_pista(tmp_path, monkeypatch):
    # El crédito específico de la pista gana sobre el global
    cred = MUSIC_DIR / "pista_test.credit.txt"
    cred.write_text("'Pista Test' Autor CC-BY", encoding="utf-8")
    try:
        texto = _music_credit(MUSIC_DIR / "pista_test.mp3")
        assert texto == "'Pista Test' Autor CC-BY"
    finally:
        cred.unlink()


def test_credito_legacy_sin_archivo_especifico():
    # Sin <stem>.credit.txt cae al CREDITS.txt global (comportamiento actual)
    assert _music_credit(MUSIC_DIR / "no_existe.mp3") == _music_credit()
