"""Título descriptivo para los clips del juego del momento.

El título del clip de Twitch lo pone un viewer apurado ("yeu", "TREVOR?", "toma gato") y no
dice qué pasa. Los shorts del juego que funcionan describen el momento ("Trevor Phillips en la
radio de GTA 6"). Acá un LLM arma ese título desde lo que se dice en el clip; si no hay de
dónde sacarlo, devuelve None y se usa el título de siempre.
"""
from __future__ import annotations

import re

MAX_LEN = 70
_EMOJI = re.compile("[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0000FE0F\U0000200D]")

_PROMPT = (
    "Sos editor de un canal de YouTube Shorts de clips de {tag} en español.\n"
    "Escribí el TÍTULO de este clip. Reglas:\n"
    "- Describí en concreto LO QUE PASA EN EL JUEGO (el momento, el personaje, el lugar, el bug, "
    "el secreto). Que alguien que no vio el clip entienda qué va a ver.\n"
    "- Tiene que incluir literalmente \"{tag}\".\n"
    "- Máximo 60 caracteres. Español neutro. Sin emojis, sin hashtags, sin comillas.\n"
    "- NO inventes nada que no esté en lo que se ve, en el título original o en lo que se dice. Nada de "
    "clickbait vacío (\"no vas a creer\", \"increíble\").\n"
    "- Podés nombrar al streamer solo si suma.\n"
    "- \"Lo que se ve\" son pocas imágenes sueltas: sirve para el lugar y los personajes, pero NO "
    "le atribuyas el hecho (el bug, el choque) a un objeto concreto salvo que esté claro. Ante la "
    "duda, quedate con lo que dice el streamer.\n"
    "- Si con esta información no se entiende qué pasa en el juego, respondé solo: NO\n\n"
    "Streamer: {streamer}\n"
    "Título original del clip: {clip_title}\n"
    "Lo que se ve en el juego: {seen}\n"
    "Lo que se dice en el clip: {transcript}\n\n"
    "Respondé SOLO el título (o NO)."
)


def clean_title(raw: str | None, tag: str) -> str | None:
    """Normaliza y valida la respuesta del LLM. None si no sirve como título."""
    t = (raw or "").strip().splitlines()[0] if (raw or "").strip() else ""
    t = _EMOJI.sub("", t)
    t = re.sub(r"#\w+", "", t)
    t = t.strip(" \"'“”«».").strip()
    t = re.sub(r"\s+", " ", t)
    if not t or t.upper() == "NO" or len(t) < 12 or len(t) > MAX_LEN:
        return None
    if not re.search(re.escape(tag), t, re.IGNORECASE):
        return None
    return t


def game_title(clip_title: str, transcript: str, tag: str, streamer: str = "",
               seen: str = "") -> str | None:
    """Título descriptivo vía LLM (Groq). `seen` = lo que el QC con visión vio en el juego.
    None ante cualquier problema: el build no depende de esto."""
    if not (seen or "").strip() and len((transcript or "").split()) < 6:
        return None                              # ni imagen ni habla: no hay de dónde describir
    try:
        from reddit_pipeline.rewrite import build_client, model_name
        r = build_client().chat.completions.create(
            model=model_name(), temperature=0.3, max_tokens=400,
            messages=[{"role": "user", "content": _PROMPT.format(
                tag=tag, streamer=streamer or "?", clip_title=(clip_title or "")[:100],
                seen=(seen or "(sin dato)")[:300],
                transcript=(transcript or "(nada)")[:700])}])
        return clean_title(r.choices[0].message.content, tag)
    except Exception:
        return None
