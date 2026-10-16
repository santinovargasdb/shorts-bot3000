"""Excepciones del supervisor de auto-refill."""
from __future__ import annotations


class QuotaExhausted(Exception):
    """La cuota de una API (QC con visión / LLM) se agotó durante la corrida. No es un fallo
    real: el supervisor lo marca como severidad QUOTA y reanuda en la próxima corrida cuando
    la cuota vuelve (no dispara email)."""
