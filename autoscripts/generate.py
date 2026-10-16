"""Genera UN episodio de faceless (datos de cultura general) con el LLM (Groq). Devuelve datos
'crudos' ({text, imgs, topic}); build.py los ensambla al formato segments de series_data."""
from __future__ import annotations

import json
import re

from reddit_pipeline.rewrite import _chat  # cliente compat-OpenAI (reuso)

_PROMPT = """Sos guionista del canal "Datos para parecer inteligente" (shorts de cultura general en
ESPAÑOL NEUTRO). Devolvé SOLO un objeto JSON con claves exactas: "pregunta", "resumen", "datos".

- "datos": una lista de {n} datos curiosos, verdaderos y verificables. Cada dato es un objeto con:
  - "text": el dato CON CONTEXTO (por qué/cómo), 2-3 frases, hablado y natural. NÚMEROS SIEMPRE EN
    PALABRAS (ej. "tres corazones", no "3"). Nada de dígitos.
  - "imgs": EXACTAMENTE 2 términos de búsqueda en inglés para Pixabay (ej. ["octopus","octopus underwater"]).
  - "topic": 2-4 palabras que nombran el sujeto del dato (ej. "pulpo sangre azul").
- "pregunta": una pregunta corta a comentarios (ej. "¿Qué dato sabés vos?").
- "resumen": UNA línea que lista los datos, para la descripción.

NO repitas estos temas ya usados: {avoid}

Datos ciertos y comprobables; si no estás seguro de uno, poné otro. Devolvé SOLO el JSON."""

_REQUIRED = ("pregunta", "resumen", "datos")


def parse_episode(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No se encontró JSON: {raw[:120]!r}")
    data = json.loads(text[start:end + 1])
    missing = [k for k in _REQUIRED if k not in data]
    if missing:
        raise ValueError(f"Faltan claves: {missing}")
    return data


def validate_schema(ep: dict) -> None:
    datos = ep.get("datos")
    if not isinstance(datos, list) or not datos:
        raise ValueError("datos vacío o no es lista")
    for d in datos:
        if not d.get("text") or not isinstance(d.get("imgs"), list) or len(d["imgs"]) != 2:
            raise ValueError(f"dato mal formado: {d}")
        if not d.get("topic"):
            raise ValueError(f"dato sin topic: {d}")
        if re.search(r"\d", d["text"]):          # números en palabras (el TTS lee mal los dígitos)
            raise ValueError(f"dato con dígitos sueltos: {d['text'][:60]!r}")


def generate_episode(client, model, avoid_topics: list, n_datos: int = 6) -> dict:
    prompt = _PROMPT.format(n=n_datos, avoid="; ".join(sorted(avoid_topics)[:60]) or "(ninguno)")
    ep = parse_episode(_chat(client, model, prompt))
    validate_schema(ep)
    return ep
