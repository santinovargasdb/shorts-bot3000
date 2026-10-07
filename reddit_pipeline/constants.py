"""Constantes del pipeline de Reddit ('¿Soy el Malo?')."""
from __future__ import annotations

from .env import ROOT

DB_PATH = ROOT / "reddit_pipeline" / "stories.sqlite"

# Lane relaciones + venganza (spec §6)
SUBREDDITS = [
    # Venganza / karma / compliance (mejor yield vía archivo: poco "removed")
    "pettyrevenge",
    "ProRevenge",
    "MaliciousCompliance",
    "EntitledParents",
    # Confesional / relaciones (TrueOffMyChest borra menos que AITA/relationship_advice)
    "TrueOffMyChest",
    "relationship_advice",
    "AmItheAsshole",
]

# Umbrales duros del viral_score (spec §4.2)
MIN_SCORE = 300
MIN_RATIO = 0.90
MIN_WORDS = 150
MAX_WORDS = 1500
HOOK_KEYWORDS = ["aita", "am i", "update", "tifu", "revenge", "cheat", "affair", "ex "]

# Largo del guion reescrito (≈45-60s a ~150 wpm) (spec §2, §7)
GUION_MIN_WORDS = 110
GUION_MAX_WORDS = 160
