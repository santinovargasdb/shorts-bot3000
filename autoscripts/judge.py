"""Juez factual (2ª pasada LLM, adversarial). Verifica que TODOS los datos de un episodio sean
ciertos. Sesgo: ante la duda, rechazar. Reemplaza el QA humano del canal."""
from __future__ import annotations

import json

from reddit_pipeline.rewrite import _chat

_PROMPT = """Sos un verificador de datos ESTRICTO y escéptico. Tu trabajo es ENCONTRAR el dato
falso o engañoso. Te paso una lista de datos de cultura general que van a publicarse como verdad.

Decí si TODOS son verificablemente CIERTOS y no engañosos. Si UNO SOLO es falso, exagerado, un mito,
o dudoso -> ok=false. Ante la MÍNIMA duda, ok=false (es peor publicar algo falso que descartar).

Datos:
{datos}

Respondé SOLO JSON: {{"ok": true/false, "problema": "cuál dato falla y por qué, o vacío"}}"""


def parse_verdict(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No se encontró JSON del juez: {raw[:120]!r}")
    data = json.loads(text[start:end + 1])
    return {"ok": bool(data.get("ok")), "problema": str(data.get("problema", ""))}


def judge_episode(client, model, datos: list) -> dict:
    listado = "\n".join(f"- {d['text']}" for d in datos)
    return parse_verdict(_chat(client, model, _PROMPT.format(datos=listado)))
