"""Reescritura + traducción + transformación de historias con un LLM (spec §4.3, §7)."""
from __future__ import annotations

import json
import os

from .env import load_env
from .constants import GUION_MIN_WORDS, GUION_MAX_WORDS

PROMPT = """Sos guionista de shorts narrados de DRAMA REAL de Reddit, en ESPAÑOL NEUTRO LATINO.
Te paso una historia de Reddit en inglés. Devolvé SOLO un objeto JSON con estas claves exactas:
"guion", "narrador_genero", "titulo", "veredicto", "cierre".

Objetivo: que el espectador se ENGANCHE con el conflicto y llegue hasta el final.
Priorizá el drama de PAREJA / FAMILIA / SUEGRA (traición, infidelidad, familia tóxica) si la historia lo permite.

REGLAS del "guion" ({min}-{max} palabras, ~90-120s a 150 wpm — CONTÁ las palabras):
1. GANCHO (bucle abierto): la 1ª frase planta la injusticia o el momento más fuerte, pero SIN revelar cómo termina. Que dé ganas de saber qué pasó. Nada de "Hola" ni "esta historia trata de".
2. SETUP: presentá a quien narra y al villano (pareja, suegra, familiar), la relación y lo que está en juego. Dale varias frases para que el espectador entienda por qué duele y SE INDIGNE. No lo apures.
3. ESCALADA: mostrá cómo el conflicto empeora, paso a paso. Subí la tensión. Este es el cuerpo del video.
4. GIRO: el momento en que se da vuelta la situación (la víctima reacciona, se descubre la verdad, llega el karma).
5. PAYOFF: el desenlace, con peso y AL FINAL. Que se sienta satisfactorio; no lo cortes de golpe. El GUION SIEMPRE resuelve y entrega el desenlace completo; NUNCA lo cortes ni dejes la historia a medias (el suspenso va SOLO en el "titulo").
6. Español natural y hablado, como contándole un bombazo a un amigo. Cambiá los nombres propios por nombres neutros. Quitá usernames y datos identificables.

"narrador_genero": "M" si quien narra en primera persona es hombre, "F" si es mujer.
"titulo": un CLIFFHANGER que teasea y CORTA justo antes del desenlace, para que tengan que ver el video. Terminá en suspenso (ej: "...pero lo que hizo después me dejó sin palabras" / "...y cuando abrí la puerta, entendí todo"). NUNCA reveles el final en el título. VARIÁ la forma del cliffhanger entre historias; NO uses siempre la misma frase (evitá repetir "me dejó sin palabras").
"veredicto": 1 línea con tu opinión/encuadre (la capa de comentario original).
"cierre": una pregunta a comentarios; por default "¿Vos qué hubieras hecho? 👇".

HISTORIA:
\"\"\"{story}\"\"\""""

REQUIRED_KEYS = ("guion", "narrador_genero", "titulo", "veredicto", "cierre")


def word_count(text: str) -> int:
    return len((text or "").split())


def build_client():
    """Cliente LLM compatible-OpenAI (Groq por default; cambia LLM_BASE_URL/MODEL para otro)."""
    load_env()
    from openai import OpenAI
    return OpenAI(
        api_key=os.environ["LLM_API_KEY"],
        base_url=os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1"),
    )


def model_name() -> str:
    load_env()
    return os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile")


def parse_rewrite(raw: str) -> dict:
    """Extrae y valida el JSON del LLM. Lanza ValueError si falta algo o el genero es invalido."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No se encontro JSON en la respuesta: {raw[:120]!r}")
    data = json.loads(text[start:end + 1])
    missing = [k for k in REQUIRED_KEYS if k not in data]
    if missing:
        raise ValueError(f"Faltan claves en el JSON: {missing}")
    if data["narrador_genero"] not in ("M", "F"):
        raise ValueError(f"narrador_genero invalido: {data['narrador_genero']!r}")
    return data


def _chat(client, model: str, prompt: str) -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
    )
    return resp.choices[0].message.content


def rewrite_story(post: dict, client, model: str,
                  min_words: int = GUION_MIN_WORDS, max_words: int = GUION_MAX_WORDS,
                  max_retries: int = 2) -> dict:
    """Reescribe una historia a un guion en espanol validado por largo."""
    prompt = PROMPT.format(min=min_words, max=max_words, story=post["body"])
    data = parse_rewrite(_chat(client, model, prompt))
    for _ in range(max_retries):
        wc = word_count(data["guion"])
        if min_words <= wc <= max_words:
            break
        ajuste = "Acorta" if wc > max_words else "Alarga"
        fix = (f"{ajuste} SOLO el campo \"guion\" a {min_words}-{max_words} palabras sin perder "
               f"el giro. Manten las demas claves igual. Devolve el MISMO objeto JSON completo:\n"
               f"{json.dumps(data, ensure_ascii=False)}")
        data = parse_rewrite(_chat(client, model, fix))
    if not (min_words <= word_count(data["guion"]) <= max_words):
        raise ValueError(
            f"El guion no entro en {min_words}-{max_words} palabras tras {max_retries} "
            f"reintentos ({word_count(data['guion'])} palabras).")
    return data
