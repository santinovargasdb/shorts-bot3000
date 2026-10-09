"""Genera temas sorprendentes (lugares/animales/objetos) con el LLM (Groq)."""
from __future__ import annotations

import json
import re

from reddit_pipeline.rewrite import build_client, model_name

_REQUIRED = ("name", "category", "query", "question_en", "answer_en")

PROMPT = """You write content for a viral short-form video channel called
"What On Earth Is This": a voice asks "what is this?!" and another names a
surprising thing. Give me {n} SURPRISING but REAL items a general audience
would not instantly recognize. Mix categories: places (strange/beautiful
locations), animals (weird/rare but real), and objects/natural phenomena.
Avoid common ones (dog, beach, apple). Avoid these already used: {exclude}.

Return ONLY a JSON array. Each element:
{{"name": "<short English name>",
  "category": "place|animal|object",
  "query": "<2-4 word English stock-footage search term>",
  "question_en": "<short incredulous question, e.g. 'Hold on, what is this?'>",
  "answer_en": "<'This is a/an <name>.'>"}}"""


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


def generate_topics(n: int, exclude=frozenset()) -> list:
    client = build_client()
    model = model_name()
    prompt = PROMPT.format(n=n * 2, exclude=", ".join(sorted(exclude)) or "none")
    resp = client.chat.completions.create(
        model=model, messages=[{"role": "user", "content": prompt}], temperature=0.9)
    return parse_topics(resp.choices[0].message.content)
