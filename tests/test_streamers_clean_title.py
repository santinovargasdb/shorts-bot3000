"""Los títulos de los clips vienen crudos de Twitch/Kick (@menciones, #hashtags cortados,
ALL-CAPS). clean_title los deja presentables para YouTube sin matar el 'hype' de los cortos."""
from streamers.series import clean_title


def test_saca_menciones_y_hashtags():
    assert clean_title("ibai farmea @RocketLeague #EpicPartner aura 😂🎮") == "ibai farmea aura 😂🎮"


def test_allcaps_largo_pasa_a_sentence_case():
    assert clean_title("DROPS ACTIVOS PROBAMOS LA NUEVA TEMPORADA DE ROCKET LEAGUE 😂") == \
        "Drops activos probamos la nueva temporada de rocket league 😂"


def test_allcaps_corto_se_mantiene_hype():
    assert clean_title("WTF JAJA XD 😂🎮") == "WTF JAJA XD 😂🎮"
    assert clean_title("FOG/NO FOG 😂🎮") == "FOG/NO FOG 😂🎮"


def test_titulo_normal_no_se_toca():
    assert clean_title("Te dejó solo Cobrix 😂🎮") == "Te dejó solo Cobrix 😂🎮"


def test_colapsa_espacios_y_trim():
    assert clean_title("  Rob tira   a maramamor   🤣 ") == "Rob tira a maramamor 🤣"


def test_si_queda_vacio_cae_al_crudo():
    assert clean_title("#solo #tags") == "#solo #tags"


def test_el_caso_real_de_rocket_league():
    raw = "DROPS ACTIVOS PROBAMOS LA NUEVA TEMPORADA EN @RocketLeague #EpicPartner #RocketL 😂🎮"
    out = clean_title(raw)
    assert "@" not in out and "#" not in out
    assert out.startswith("Drops activos")          # all-caps largo normalizado
