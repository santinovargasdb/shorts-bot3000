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

# Gancho: keywords que suben el viral_score. Fuerte en pareja/familia/suegra (spec v2 §3.4)
HOOK_KEYWORDS = [
    "aita", "am i", "update", "tifu", "revenge",
    "cheat", "cheated", "affair", "ex ", "ex-",
    "husband", "wife", "boyfriend", "girlfriend", "fiance",
    "mother-in-law", "in-law", "mil ", "sister", "mom",
    "divorce", "wedding", "family",
]

# Largo del guion reescrito (≈90-120s a ~150 wpm; el drama respira) (spec v2 §3.1)
GUION_MIN_WORDS = 210
GUION_MAX_WORDS = 320
