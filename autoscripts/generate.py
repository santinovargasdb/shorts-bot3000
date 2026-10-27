"""Genera UN episodio de faceless (datos de cultura general) con el LLM (Groq). Devuelve datos
'crudos' ({text, imgs, topic}); build.py los ensambla al formato segments de series_data."""
from __future__ import annotations

import json
import re

from reddit_pipeline.rewrite import _chat  # cliente compat-OpenAI (reuso)

_PROMPT = """Sos guionista del canal "Datos para parecer inteligente" (shorts de cultura general en
ESPAÑOL NEUTRO). Escribís con la MISMA calidad y estilo que estos episodios REALES del canal (son tu
estándar de oro: igualá su tono, su largo por dato, su precisión y su naturalidad hablada):

{examples}

Ahora escribí UNO NUEVO (otros temas). Devolvé SOLO un objeto JSON con claves exactas:
"pregunta", "resumen", "datos".

- "datos": lista de {n} datos curiosos, VERDADEROS y VERIFICABLES. Cada dato = objeto con:
  - "text": el dato CON CONTEXTO (el por qué/cómo), 2-3 frases, hablado y natural, como en los
    ejemplos. NÚMEROS SIEMPRE EN PALABRAS (ej. "tres corazones", no "3"). Nada de dígitos.
  - "imgs": EXACTAMENTE 2 términos de búsqueda en inglés. Las imágenes salen de WIKIPEDIA, así que
    cada término debe nombrar un SUJETO con artículo propio: un ser vivo ("Octopus", "Koala"), un
    lugar ("Eiffel Tower"), una persona, o un objeto/fenómeno con nombre ("Lightning", "Saturn").
    NADA de escenas genéricas ("octopus underwater", "stars night sky") — Wikipedia no las encuentra.
    Si el dato no tiene un sujeto con nombre propio, usá el sujeto principal del dato (el "topic").
  - "topic": 2-4 palabras que nombran el sujeto del dato.
- "pregunta": una pregunta corta a comentarios.
- "resumen": UNA línea que lista los datos, para la descripción.

REGLA DURA 1 (exactitud): NO exageres cantidades ni uses superlativos no verificables. PROHIBIDO
inventar cifras impactantes ("millones de...", "miles de toneladas", "el más X del mundo") a menos que
sea un hecho EXACTO y comprobable. Si no sabés el número preciso, NO pongas número: contá el dato sin
la cifra. Preferí cantidades conservadoras y chequeables. Un verificador estricto RECHAZA el episodio
ENTERO si UN solo dato está exagerado, es un mito o es dudoso — así que jugá a lo seguro en cada dato.

REGLA DURA 2 (novedad): los datos MÁS famosos ya están usados. Evitá los clásicos obvios (pulpo de
sangre azul, miel que no caduca, Torre Eiffel que crece, plátano radiactivo, etc.) y estos temas ya
usados: {avoid}. Elegí datos MENOS conocidos, sorprendentes pero igual de ciertos. Dame bastantes
(apuntá a {n}) para tener de dónde elegir.

Devolvé SOLO el JSON del episodio nuevo."""

_REQUIRED = ("pregunta", "resumen", "datos")


def _fewshot(k: int = 2) -> str:
    """Arma el bloque de ejemplos (few-shot) con los episodios hardcodeados reales (el estándar de
    oro escrito a mano), en el MISMO formato de salida que el modelo debe producir."""
    import series_data
    ejemplos = []
    for key in sorted(kk for kk in series_data.PARTS if kk <= 45)[:k]:
        part = series_data.PARTS[key]
        datos = [{"text": s["text"], "imgs": s.get("imgs", []), "topic": (s.get("imgs") or [""])[0]}
                 for s in part.get("segments", []) if s.get("kind") == "fact"]
        ejemplos.append(json.dumps(
            {"pregunta": part.get("pregunta", "¿Qué dato sabés vos?"),
             "resumen": part.get("resumen", ""), "datos": datos}, ensure_ascii=False))
    return "\n\n".join(ejemplos)


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


def generate_episode(client, model, avoid_topics: list, n_datos: int = 10) -> dict:
    prompt = _PROMPT.format(n=n_datos, examples=_fewshot(),
                            avoid="; ".join(sorted(avoid_topics)[:60]) or "(ninguno)")
    ep = parse_episode(_chat(client, model, prompt))
    validate_schema(ep)
    return ep
