"""Política de multi-persona por tipo de canal. En IRL, varias personas en UN solo stream es
contenido BUENO (ahí salen más clips) -> no se filtra por cantidad de caras; solo el QC filtra
NSFW. En gameplay, una grilla watch-party (multi-stream) sí se descarta."""
from streamers.sourcing import watchparty_matters


def test_gameplay_filtra_watchparty():
    assert watchparty_matters("gameplay") is True


def test_irl_no_filtra_por_caras():
    assert watchparty_matters("irl") is False


def test_default_filtra():
    assert watchparty_matters("any") is True
