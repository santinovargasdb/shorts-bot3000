from pathlib import Path

import src.multidato
from src.multidato import _music_credit


def test_credito_por_pista(tmp_path, monkeypatch):
    # El crédito específico de la pista gana sobre el global
    monkeypatch.setattr(src.multidato, "MUSIC_DIR", tmp_path)

    cred = tmp_path / "pista_test.credit.txt"
    cred.write_text("'Pista Test' Autor CC-BY", encoding="utf-8")

    texto = _music_credit(tmp_path / "pista_test.mp3")
    assert texto == "'Pista Test' Autor CC-BY"


def test_credito_legacy_sin_archivo_especifico(tmp_path, monkeypatch):
    # Sin <stem>.credit.txt cae al CREDITS.txt global (comportamiento actual)
    monkeypatch.setattr(src.multidato, "MUSIC_DIR", tmp_path)

    # Crear CREDITS.txt con contenido conocido
    credits_file = tmp_path / "CREDITS.txt"
    credits_file.write_text("Música: 'Default Track' por Artista CC-BY", encoding="utf-8")

    # El fallback debe ser exactamente el contenido del CREDITS.txt
    result = _music_credit(tmp_path / "no_existe.mp3")
    assert result == "Música: 'Default Track' por Artista CC-BY"
