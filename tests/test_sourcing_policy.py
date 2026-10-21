"""Política de multi-persona por tipo de canal. En IRL, varias personas en UN solo stream es
contenido BUENO (ahí salen más clips) -> no se filtra por cantidad de caras; solo el QC filtra
NSFW. En gameplay, una grilla watch-party (multi-stream) sí se descarta."""
from streamers.sourcing import SPIKE_MIN, spike_floor, watchparty_matters


def test_gameplay_filtra_watchparty():
    assert watchparty_matters("gameplay") is True


def test_irl_no_filtra_por_caras():
    assert watchparty_matters("irl") is False


def test_default_filtra():
    assert watchparty_matters("any") is True


def test_spike_floor_gameplay_exige_pico():
    # gameplay: el pico de audio = hype, se mantiene el gate normal
    assert spike_floor("gameplay") == SPIKE_MIN


def test_spike_floor_irl_mas_bajo():
    # IRL/charla: hablar tranquilo no hace pico -> gate mínimo (solo mata silencio real)
    assert spike_floor("irl") < SPIKE_MIN
