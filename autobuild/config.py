"""Config declarativa del auto-refill. Un canal sin entrada en REFILL no se
auto-rellena (opt-in explícito). Ver docs/.../2026-10-16-auto-refill-infinito-design.md."""
from __future__ import annotations

PLATFORM_MAP = {"yt": "youtube", "ig": "instagram", "tt": "tiktok"}

# gen: "clips" -> streamers.build.build_backlog | "whatonearth" -> whatonearth.build.build_video
#      "reddit" -> reddit_pipeline cmd_rewrite | "script" -> autoscripts.build.build
#      (faceless = lista de datos; historia/misterios = relato narrado, mismo generador LLM)
_CLIPS = {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
          "yield": 0.27, "max_attempts": 25, "batch": 5, "gen": "clips"}

REFILL: dict[str, dict] = {
    "streamers_a": dict(_CLIPS),
    "streamers_b": dict(_CLIPS),
    "streamers_c": dict(_CLIPS),
    "whatonearth": {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                    "yield": 0.40, "max_attempts": 25, "batch": 3, "gen": "whatonearth"},
    "soyelmalo":   {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                    "yield": 0.80, "max_attempts": 20, "batch": 3, "gen": "reddit"},
    # Guiones por LLM (Pieza 2 + 2.x): faceless genera datos; historia/misterios, relatos narrados.
    "faceless":  {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                  "yield": 0.6, "max_attempts": 15, "batch": 3, "gen": "script"},
    "historia":  {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                  "yield": 1.0, "max_attempts": 5, "batch": 1, "gen": "script"},
    "misterios": {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                  "yield": 1.0, "max_attempts": 5, "batch": 1, "gen": "script"},
}
