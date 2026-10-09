"""Genera temas sorprendentes (lugares/animales/objetos) con el LLM (Groq)."""
from __future__ import annotations

import json
import re

from reddit_pipeline.rewrite import build_client, model_name

_REQUIRED = ("name", "category", "query", "question_en", "answer_en")

CATEGORIES = ("place", "animal", "object")

_Q_STYLE = {
    "place": "an incredulous question asking WHERE/what place it is — e.g. 'Wait... where on earth is this?' or 'Hold on, what place is this?'",
    "animal": "an incredulous question asking WHAT ANIMAL it is — e.g. 'Hold on, what animal is this?' or 'No way, what creature is this?'",
    "object": "an incredulous question asking WHAT it is — e.g. 'Wait, what on earth is this?' or 'What is this thing?'",
}

PROMPT = """You write content for a viral short-form video channel "What On Earth Is This":
a voice asks an incredulous question and another voice names the thing. Give me {n}
SURPRISING but REAL **{category}s** a general audience would NOT instantly recognize
(weird / rare / stunning — never common ones like dog, beach, apple). They must be
REAL (never fictional, never AI-generated concepts). Avoid these already used: {exclude}.

Return ONLY a JSON array. Each element:
{{"name": "<short English name of the {category}>",
  "category": "{category}",
  "query": "<2-4 word English stock-footage search term for REAL footage of it>",
  "question_en": "<{q_style}>",
  "answer_en": "<the naming line — follow the RULES below>"}}

answer_en RULES (critical):
- Shape: "This is <X>." and nothing more.
- PROPER NOUNS (named places/things, e.g. 'Lake Natron', 'Mount Roraima'): NO article —
  "This is Lake Natron." NEVER "This is a Lake Natron."
- COMMON NOUNS (e.g. 'aye-aye', 'glass frog'): correct a/an —
  "This is an aye-aye." / "This is a glass frog."."""


def parse_topics(raw: str) -> list:
    m = re.search(r"\[.*\]", raw, re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []
    out = []
    for it in data if isinstance(data, list) else []:
        if not isinstance(it, dict):
            continue
        if all(isinstance(it.get(k), str) and it.get(k).strip() for k in _REQUIRED):
            out.append({k: it[k].strip() for k in _REQUIRED})
    return out


def generate_topics(n: int, category: str = "object", exclude=frozenset()) -> list:
    """Genera temas de UNA sola categoría (place|animal|object) para que el video
    quede temático (no mezcla animales con paisajes)."""
    client = build_client()
    model = model_name()
    prompt = PROMPT.format(n=n * 2, category=category,
                           q_style=_Q_STYLE.get(category, _Q_STYLE["object"]),
                           exclude=", ".join(sorted(exclude)) or "none")
    resp = client.chat.completions.create(
        model=model, messages=[{"role": "user", "content": prompt}], temperature=0.9)
    parsed = parse_topics(resp.choices[0].message.content)
    # mantené solo la categoría pedida; si el modelo usó otra etiqueta, no descartes todo
    same = [t for t in parsed if t["category"].lower() == category.lower()]
    return same or parsed
