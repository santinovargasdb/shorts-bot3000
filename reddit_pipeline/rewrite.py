"""Reescritura + traducción + transformación de historias con un LLM (spec §4.3, §7)."""
from __future__ import annotations

import json
import os

from .env import load_env
from .constants import GUION_MIN_WORDS, GUION_MAX_WORDS

PROMPT = """Sos guionista de shorts narrados en ESPAÑOL NEUTRO LATINO.
Te paso una historia de Reddit en inglés. Devolvé SOLO un objeto JSON con estas claves exactas:
"guion", "narrador_genero", "titulo", "veredicto", "cierre".

REGLAS del "guion":
1. Largo {min}-{max} palabras (aprox 45-60s a 150 wpm). Conta las palabras.
2. ABRI IN MEDIA RES: primera frase = el momento de maxima tension. Nada de "Hola"/"esta historia trata de".
3. REESCRIBI con tus palabras, NO traduzcas literal. Cambia los nombres propios por nombres neutros.
   Quita usernames y datos identificables.
4. Condensa: solo setup minimo -> conflicto -> giro -> remate. Corta relleno y digresiones.
5. Espanol natural y hablado (como contas una anecdota a un amigo), frases cortas.
"narrador_genero": "M" si quien narra en primera persona es hombre, "F" si es mujer.
"titulo": gancho corto para la tarjeta en pantalla y el caption.
"veredicto": 1 linea con tu opinion/encuadre (la capa de comentario original).
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
