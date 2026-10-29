"""Genera UN episodio NARRATIVO (historia/misterios) con el LLM (Groq). A diferencia de faceless
(lista de datos sueltos), acá cada episodio es UN relato: gancho -> momentos -> remate. Devuelve el
episodio en el formato EXACTO de series_historia/series_misterios: {pregunta, titulo, resumen, topic,
segments:[{text, imgs}]}. build.py lo ensambla (agrega kind='fact') y lo guarda si el juez aprueba."""
from __future__ import annotations

import json
import re

from reddit_pipeline.rewrite import _chat  # cliente compat-OpenAI (reuso, igual que generate.py)

# Canal -> módulo de serie + instrucciones de estilo (generador) + consignas del juez.
MODULE = {"historia": "series_historia", "misterios": "series_misterios"}

INSTR = {
    "historia": (
        "Es una HISTORIA REAL (un hecho verídico y verificable del pasado: un personaje, un suceso, "
        "un episodio asombroso pero cierto). Narrala con arco: un gancho intrigante en las primeras "
        "frases, después los momentos del relato en orden, y un remate que cierra con un dato que deja "
        "pensando. NO inventes nombres, fechas ni cifras; si no sabés un número exacto, contá el hecho "
        "sin el número. Preferí historias MENOS trilladas, no las cuatro o cinco de siempre."
    ),
    "misterios": (
        "Es un MISTERIO o caso REAL (una desaparición, un enigma sin resolver, un fenómeno inexplicable). "
        "Narralo con arco: gancho de intriga, desarrollo del caso, y un remate que deja la pregunta abierta. "
        "REGLA CLAVE: si el caso es una leyenda o algo no confirmado, narralo COMO leyenda ('se cuenta', "
        "'según la leyenda', 'no hay registros oficiales que lo confirmen'); las explicaciones posibles van "
        "SIEMPRE como teorías ('se cree', 'la hipótesis más aceptada'), nunca como hechos probados. El caso "
        "en sí tiene que ser real y verificable. Preferí casos MENOS conocidos."
    ),
}

JUDGE_INSTR = {
    "historia": (
        "Es una historia presentada como HECHO HISTÓRICO real. Rechazá (ok=false) si algún dato es falso, "
        "inventado, exagerado, un mito disfrazado de hecho, o si nombres/fechas/cifras son dudosos."
    ),
    "misterios": (
        "Es un caso de misterio. Rechazá (ok=false) si: el caso no es real; una leyenda o algo no confirmado "
        "se afirma como verdad literal en vez de narrarse como leyenda/hipótesis; o si una explicación teórica "
        "se presenta como hecho probado. También rechazá si algún dato verificable (lugar, fecha, nombre) es falso."
    ),
}

_REQUIRED = ("pregunta", "titulo", "resumen", "topic", "segments")

MIN_WORDS, MAX_WORDS = 100, 165
MIN_SEGS, MAX_SEGS = 4, 7

_PROMPT = """Sos guionista del canal de shorts narrativos (ESPAÑOL NEUTRO). Escribís con la MISMA
calidad y estilo que estos episodios REALES del canal (son tu estándar de oro: igualá su tono, su
estructura de relato, su precisión histórica y su naturalidad hablada):

{examples}

{instr}

Escribí UNO NUEVO. Devolvé SOLO un objeto JSON con claves exactas: "pregunta", "titulo", "resumen",
"topic", "segments".

- "titulo": título gancho del episodio (puede incluir dígitos; va en pantalla, no se narra).
- "pregunta": una pregunta corta y binaria para el remate en pantalla. DEBE terminar en signo de pregunta.
- "resumen": UNA línea que resume el caso, para la descripción.
- "topic": dos a cuatro palabras que nombran el SUJETO del relato (ej. "Mary Celeste", "Hiroo Onoda").
- "segments": EXACTAMENTE {n} momentos del relato, en orden. Cada momento = objeto con:
  - "text": 1-2 frases habladas, naturales. NÚMEROS SIEMPRE EN PALABRAS en el texto hablado
    (ej. "mil novecientos setenta y cuatro", NUNCA "1974"). Nada de dígitos en el texto.
  - "imgs": EXACTAMENTE 2 términos de búsqueda en inglés. Las imágenes salen de WIKIPEDIA, así que
    cada término debe nombrar un SUJETO con artículo propio: una persona ("Benito Juarez"), un lugar
    ("Tenochtitlan"), o un hecho/cosa con nombre ("Execution of Emperor Maximilian", "Caravel"). NADA
    de escenas genéricas ("old man in desert", "firing squad") — Wikipedia no las encuentra. Si el
    momento no tiene un sujeto con nombre propio, usá el sujeto principal del relato (el "topic").

REGLA DURA 1 (exactitud): NO inventes ni exageres. Un verificador estricto RECHAZA el episodio ENTERO
si UN solo dato es falso, exagerado o dudoso. Jugá a lo seguro: contá solo lo comprobable.

REGLA DURA 2 (remate): el ÚLTIMO momento NO lleva llamado a la acción hablado (nada de "Seguime",
"suscribite", etc.); cierra con el relato mismo. El cierre a cámara es la "pregunta" en pantalla.

REGLA DURA 3 (novedad): evitá estos sujetos ya usados: {avoid}. Elegí uno distinto.

El relato completo (sumando los momentos) debe tener entre cien y ciento sesenta y cinco palabras.
Devolvé SOLO el JSON del episodio nuevo."""


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def parse_story(raw: str) -> dict:
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


def validate_story(st: dict) -> None:
    for k in ("titulo", "resumen", "topic"):
        if not str(st.get(k, "")).strip():
            raise ValueError(f"'{k}' vacío")
    if not str(st.get("pregunta", "")).strip().endswith("?"):
        raise ValueError("'pregunta' no termina en signo de pregunta")
    segs = st.get("segments")
    if not isinstance(segs, list) or not (MIN_SEGS <= len(segs) <= MAX_SEGS):
        raise ValueError(f"segments debe tener entre {MIN_SEGS} y {MAX_SEGS} momentos")
    for s in segs:
        if not str(s.get("text", "")).strip():
            raise ValueError("momento sin texto")
        if not isinstance(s.get("imgs"), list) or len(s["imgs"]) != 2:
            raise ValueError(f"momento sin exactamente 2 imágenes: {s.get('imgs')}")
        if re.search(r"\d", s["text"]):          # el texto hablado lleva números en palabras
            raise ValueError(f"momento con dígitos en el texto: {s['text'][:60]!r}")
    if "eguime" in segs[-1]["text"]:              # sin CTA hablada en el remate (fórmula §7/§9)
        raise ValueError("el remate tiene un llamado a la acción hablado")
    # §2/§9.7 in-medias-res: NUNCA abrir con la fecha; la anomalía/gancho va primero. El judge
    # factual no mira el formato, así que este guard determinista lo corta en generación (mismo
    # criterio que tests/test_formula.py::test_aperturas_in_medias_res).
    primera = segs[0]["text"]
    if (primera.startswith(("En el año", "En el siglo", "En 19", "En 20"))
            or " mil " in f" {primera[:70].lower()}"):
        raise ValueError(f"abre con fecha/año (viola in-medias-res §2/§9.7): {primera[:50]!r}")
    palabras = sum(len(s["text"].split()) for s in segs)
    if not (MIN_WORDS <= palabras <= MAX_WORDS):
        raise ValueError(f"{palabras} palabras (fuera de {MIN_WORDS}-{MAX_WORDS})")


def _subject_of(ep: dict) -> str:
    """Sujeto corto de un episodio hardcodeado para el ejemplo (no hay campo 'topic' a mano)."""
    base = (ep.get("resumen") or ep.get("titulo") or "").split(",")[0]
    return " ".join(base.split()[:8])


def _fewshot(series_module, k: int = 2) -> str:
    """Bloque few-shot con los episodios hardcodeados reales (estándar de oro), serializados en el
    MISMO formato de salida que el modelo debe producir."""
    parts = getattr(series_module, "PARTS", {})
    ejemplos = []
    for key in sorted(parts)[:k]:
        ep = parts[key]
        segs = [{"text": s["text"], "imgs": list(s.get("imgs", []))}
                for s in ep.get("segments", [])]
        ejemplos.append(json.dumps(
            {"pregunta": ep.get("pregunta", "¿?"), "titulo": ep.get("titulo", ""),
             "resumen": ep.get("resumen", ""), "topic": _subject_of(ep), "segments": segs},
            ensure_ascii=False))
    return "\n\n".join(ejemplos)


def hardcoded_subjects(series_module) -> set:
    return {norm(ep["titulo"]) for ep in getattr(series_module, "PARTS", {}).values()
            if ep.get("titulo")}


def used_subjects(channel: str, series_module) -> set:
    from autoscripts import db
    return hardcoded_subjects(series_module) | db.used_topics_db(channel)


def is_duplicate(topic: str, used: set) -> bool:
    t = norm(topic)
    if not t:
        return True
    return any(t in u or u in t for u in used)


def generate_story(client, model, series_module, instr: str, avoid_subjects: list,
                   n_segs: int = 5) -> dict:
    prompt = _PROMPT.format(examples=_fewshot(series_module), instr=instr, n=n_segs,
                            avoid="; ".join(sorted(avoid_subjects)[:60]) or "(ninguno)")
    st = parse_story(_chat(client, model, prompt))
    validate_story(st)
    return st
