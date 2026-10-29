"""Idioma de transcripción POR canal de clips: streamers_c es IRL en INGLÉS, así que debe
transcribir/subtitular en 'en' (no en 'es'). A/B son hispanos -> 'es'. Antes el perfil
'streamers' de channels.yaml forzaba 'es' para los tres, y C salía con subtítulos en español."""
from streamers import config as scfg


def test_streamers_c_transcribe_en_ingles():
    assert scfg.get("streamers_c").get("language") == "en"


def test_streamers_a_b_transcriben_en_espanol():
    assert scfg.get("streamers_a").get("language") == "es"
    assert scfg.get("streamers_b").get("language") == "es"
