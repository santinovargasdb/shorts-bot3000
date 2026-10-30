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
"titulo": un CLIFFHANGER que teasea y CORTA justo antes del desenlace, para que tengan que ver el video. NUNCA reveles el final. PROHIBIDO el cliché "me dejó sin palabras / helada / en shock / sin aliento" y cualquier variante de "me dejó": es un cliché quemado, NO lo uses. VARIÁ el estilo entre historias usando recursos distintos, por ejemplo: una pregunta ("...¿y sabés qué hizo mi suegra?"), una revelación parcial ("...hasta que vi el último mensaje"), una amenaza ("...y juró que me arrepentiría"), un número/tiempo ("...3 días después todo se derrumbó"), o un giro inesperado ("...pero el abogado resultó ser mi hermano"). El corte debe generar intriga, nunca resolver.
"veredicto": 1 línea con tu opinión/encuadre (la capa de comentario original).
"cierre": una pregunta a comentarios; por default "¿Vos qué hubieras hecho? 👇".

HISTORIA:
\"\"\"{story}\"\"\""""

REQUIRED_KEYS = ("guion", "narrador_genero", "titulo", "veredicto", "cierre")


def word_count(text: str) -> int:
    return len((text or "").split())


def _llm_keys() -> list[str]:
    """Todas las claves del LLM en orden, sin repetir. Coma-separadas en LLM_API_KEY y/o
    LLM_API_KEY_2 (cada cuenta de Groq tiene su PROPIO presupuesto diario de tokens; varias claves
    de la MISMA cuenta comparten el mismo tope y no suman)."""
    load_env()
    raw: list[str] = []
    for var in ("LLM_API_KEY", "LLM_API_KEY_2"):
        raw += os.environ.get(var, "").split(",")
    keys, seen = [], set()
    for k in (x.strip() for x in raw):
        if k and k not in seen:
            seen.add(k)
            keys.append(k)
    return keys


def _is_rate_limit(exc: Exception) -> bool:
    s = str(exc).lower()
    return (getattr(exc, "status_code", None) == 429
            or "429" in s or "rate limit" in s or "rate_limit" in s or "quota" in s)


class _RotatingCompletions:
    """Rota entre las claves: usa la actual hasta que da 429 (cuota diaria agotada), ahí salta a la
    siguiente y se queda ahí. Solo re-lanza el 429 cuando TODAS están sin cuota. Un error que NO es
    de cuota se re-lanza sin rotar."""
    def __init__(self, clients):
        self._clients = clients
        self._i = 0

    def create(self, **kwargs):
        last = None
        for _ in range(len(self._clients)):
            try:
                return self._clients[self._i].chat.completions.create(**kwargs)
            except Exception as e:
                if not _is_rate_limit(e):
                    raise
                last = e
                self._i = (self._i + 1) % len(self._clients)   # próxima clave (para ésta y las que sigan)
        raise last


class _RotatingChat:
    def __init__(self, completions):
        self.completions = completions


class _RotatingClient:
    """Imita el cliente OpenAI (client.chat.completions.create) pero rotando claves por debajo."""
    def __init__(self, clients):
        self.chat = _RotatingChat(_RotatingCompletions(clients))


def build_client():
    """Cliente LLM compat-OpenAI (Groq por default; cambia LLM_BASE_URL/MODEL para otro). Si hay
    varias claves (LLM_API_KEY / LLM_API_KEY_2, coma-separadas = cuentas distintas de Groq), ROTA:
    cae a la siguiente cuando una agota su cuota diaria de tokens (429)."""
    load_env()
    from openai import OpenAI
    base_url = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    keys = _llm_keys()
    if not keys:
        raise KeyError("LLM_API_KEY")          # mismo comportamiento que antes si no hay clave
    clients = [OpenAI(api_key=k, base_url=base_url) for k in keys]
    return clients[0] if len(clients) == 1 else _RotatingClient(clients)


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
