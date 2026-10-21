"""Un canal puede mezclar streamers de Twitch y Kick: cada streamer declara su plataforma
como ('nombre', 'plataforma'), o un string suelto que usa la plataforma por defecto del canal."""
from streamers.build import _name_platform


def test_string_usa_la_plataforma_default():
    assert _name_platform("kaicenat", "twitch") == ("kaicenat", "twitch")


def test_tupla_usa_su_propia_plataforma():
    assert _name_platform(("adinross", "kick"), "twitch") == ("adinross", "kick")


def test_lista_tambien_sirve():
    assert _name_platform(["jackdoherty", "kick"], "twitch") == ("jackdoherty", "kick")
