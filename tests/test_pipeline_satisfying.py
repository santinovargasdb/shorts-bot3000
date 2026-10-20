import src.pipeline as P


def test_elige_dos_satisfactorios_si_no_hay_gameplay():
    got = P._satisfy_for_channel({"satisfying": True, "name": "streamers_a"},
                                 use_gaming=False, picker=lambda ch, n: ["a", "b"][:n])
    assert got[0] == "a" and got[1] == "b"


def test_un_satisfactorio_si_gameplay():
    got = P._satisfy_for_channel({"satisfying": True, "name": "streamers_a"},
                                 use_gaming=True, picker=lambda ch, n: ["x"][:n])
    assert got[0] is None and got[1] == "x"


def test_sin_satisfying_no_toca():
    got = P._satisfy_for_channel({"satisfying": False}, use_gaming=False, picker=None)
    assert got == (None, None)
