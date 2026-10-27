from streamers.allowlist import approved_for

_FIXTURE = {
    "ibai": {"platform": "twitch", "tier": "streamers_a", "status": "approved",
             "evidence": "x", "vetted": "2026-10-27", "notes": ""},
    "xqc":  {"platform": "kick", "tier": "streamers_a", "status": "rejected",
             "evidence": "y", "vetted": "2026-10-27", "notes": "musica/DMCA"},
    "davooxeneize": {"platform": "kick", "tier": "streamers_b", "status": "approved",
                     "evidence": "z", "vetted": "2026-10-27", "notes": ""},
    "kaicenat": {"platform": "twitch", "tier": "streamers_c", "status": "approved",
                 "evidence": "w", "vetted": "2026-10-27", "notes": ""},
}

def test_filtra_por_tier_y_status():
    assert approved_for("streamers_a", _FIXTURE) == [("ibai", "twitch")]

def test_excluye_rejected():
    assert all(h != "xqc" for h, _ in approved_for("streamers_a", _FIXTURE))

def test_otros_tiers():
    assert approved_for("streamers_b", _FIXTURE) == [("davooxeneize", "kick")]
    assert approved_for("streamers_c", _FIXTURE) == [("kaicenat", "twitch")]

def test_tier_vacio():
    assert approved_for("streamers_zzz", _FIXTURE) == []

def test_preserva_orden():
    led = {
        "bbb": {"platform": "twitch", "tier": "t", "status": "approved",
                "evidence": "", "vetted": "", "notes": ""},
        "aaa": {"platform": "twitch", "tier": "t", "status": "approved",
                "evidence": "", "vetted": "", "notes": ""},
    }
    assert approved_for("t", led) == [("bbb", "twitch"), ("aaa", "twitch")]
