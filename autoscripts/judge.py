"""Juez factual (2ª pasada LLM, adversarial). Verifica que TODOS los datos de un episodio sean
ciertos. Sesgo: ante la duda, rechazar. Reemplaza el QA humano del canal."""
from __future__ import annotations

import json
import re
import unicodedata

from reddit_pipeline.rewrite import _chat

_PROMPT = """Sos un verificador de datos ESTRICTO y escéptico. Tu trabajo es ENCONTRAR el dato
falso o engañoso. Te paso una lista de datos de cultura general que van a publicarse como verdad.

Decí si TODOS son verificablemente CIERTOS y no engañosos. Si UNO SOLO es falso, exagerado, un mito,
o dudoso -> ok=false. Ante la MÍNIMA duda, ok=false (es peor publicar algo falso que descartar).

Revisá UNO POR UNO, en especial (errores reales que ya se colaron):
- FECHAS y CIFRAS: recalculá cada año, duración y número (ej. "un año en Mercurio dura ciento
  ochenta y siete días" es FALSO: dura ochenta y ocho; "Cheliábinsk en dos mil quince" es FALSO: fue
  en dos mil trece). Si no estás SEGURO del número exacto -> ok=false.
- CONTRADICCIONES dentro del mismo dato ("varias horas... hasta dos horas").
- IDIOMA: el texto se narra en español. Un nombre común en INGLÉS ("pistol shrimp", "lyrebird",
  "icefish") o un género mal puesto ("el musaraña", "el sepía") -> ok=false.
- Frases que no tienen sentido literal ("produce tanta baba que llena su propio cuerpo") -> ok=false.

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


_PROMPT_EACH = _PROMPT.split("Respondé SOLO JSON")[0] + """Los datos vienen NUMERADOS. Marcá TODOS los
que fallen (falso, exagerado, mito, dudoso, en inglés o sin sentido). Los demás se publican.

Aparte, en "aburridos" marcá los datos CIERTOS pero que no sorprenden a nadie: una definición de
manual ("el riñón filtra la sangre", "la fóvea da la visión nítida") o algo que casi todos ya saben.
El canal es de curiosidades: un dato aburrido también se descarta.

Respondé SOLO JSON: {{"falsos": [números], "aburridos": [números], "problema": "por qué, breve"}}"""


def judge_datos(client, model, datos: list, sources: list | None = None) -> dict:
    """Como judge_episode pero dato por dato: devuelve los índices (0-based) que fallan, así un solo
    dato inventado no tira el episodio entero (con temas acotados casi siempre se colaba uno).
    `sources` (opcional, alineado con datos): intro de Wikipedia del sujeto de cada dato. El juez
    de memoria dejó pasar "Armillaria: doscientos metros cuadrados" (son ~novecientas hectáreas)."""
    import json as _json
    items = []
    for i, d in enumerate(datos):
        item = f"{i + 1}. {d['text']}"
        src = (sources[i] if sources and i < len(sources) else None)
        if src:
            item += f'\n   FUENTE (Wikipedia): """{src}"""'
        items.append(item)
    listado = "\n".join(items)
    if sources and any(sources):
        listado += ("\n\nSi un dato trae FUENTE: falla si la contradice, si da una cifra, fecha o "
                    "récord que la fuente no respalda, o si cuenta un ORIGEN/HISTORIA distinta a la de "
                    "la fuente. Si la fuente no menciona el hecho central y no estás SEGURO de que es "
                    "cierto tal cual está escrito, falla. Un dato obvio que no sorprende a nadie "
                    "(\"el parpadeo protege el ojo\") también falla: el canal es de curiosidades.")
    raw = _chat(client, model, _PROMPT_EACH.format(datos=listado))
    text = (raw or "").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No se encontró JSON del juez: {raw[:120]!r}")
    data = _json.loads(text[start:end + 1])
    falsos = set()
    for n in list(data.get("falsos") or []) + list(data.get("aburridos") or []):
        try:
            falsos.add(int(n) - 1)
        except (TypeError, ValueError):
            # respuesta ambigua -> ante la duda se descarta todo (sesgo del juez: rechazar)
            return {"falsos": set(range(len(datos))), "problema": str(data.get("problema", ""))}
    return {"falsos": falsos, "problema": str(data.get("problema", ""))}


_PROMPT_STORY = """Sos un verificador ESTRICTO y escéptico. Te paso un relato que va a publicarse
como verdad. {instr}

Ante la MÍNIMA duda, ok=false (es peor publicar algo falso que descartar un episodio).

Título: {titulo}
Relato:
{relato}

Respondé SOLO JSON: {{"ok": true/false, "problema": "qué falla y por qué, o vacío"}}"""

_PROMPT_STORY_FUENTE = """Sos un verificador ESTRICTO. Te paso un relato que va a publicarse como verdad
y su FUENTE (los hechos reales del caso; puede estar en otro idioma). {instr}

La fuente MANDA sobre lo que recuerdes: un dato que está en ella es válido aunque no lo conozcas o
recuerdes otra cosa. NO objetes nada de memoria. Listá SOLO estos problemas:
- "contradice": el relato dice lo OPUESTO a la fuente. En "fuente" copiá la cita TEXTUAL de la fuente.
- "sin_respaldo": el relato da un dato concreto (nombre, fecha, cifra o hecho) que NO está en la fuente.
  En "dato" poné ese nombre o cifra (las cifras en dígitos).
- "leyenda": el relato cuenta como hecho comprobado una leyenda, un rumor, una teoría o algo que la
  fuente no da por confirmado. Una leyenda narrada como leyenda ("se cuenta", "se cree") está bien.
El tono del relato y las frases sin datos no son un problema.

FUENTE:
\"\"\"{source}\"\"\"

Título: {titulo}
Relato:
{relato}

Respondé SOLO JSON (listas vacías si no hay problemas): {{"contradice": [{{"relato": "...", "fuente": "..."}}],
"sin_respaldo": [{{"relato": "...", "dato": "..."}}], "leyenda": [{{"relato": "...", "motivo": "..."}}]}}"""


def _plano(s: str) -> str:
    """Texto comparable: sin acentos ni mayúsculas, guiones como espacios, sin separadores de miles."""
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"(?<=\d)[,.\s](?=\d{3}\b)", "", s)
    return re.sub(r"\s+", " ", re.sub(r"[-‐-―]", " ", s)).strip().lower()


def _marcas(dato: str) -> list:
    """Lo comprobable de un dato: cifras y palabras con mayúscula (nombres propios)."""
    tokens = re.findall(r"\d+|[^\W\d_]{3,}", re.sub(r"(?<=\d)[,.\s](?=\d{3}\b)", "", dato or ""))
    return [_plano(t) for t in tokens if t[0].isdigit() or t[0].isupper()]


def _objeciones_validas(data: dict, source: str) -> list:
    """Las objeciones que sobreviven a la fuente. El juez invoca su memoria aunque se le pida que no
    (Deffaudis "no existe" estando en la fuente), así que lo comprueba el código y no el prompt."""
    fuente = _plano(source)
    palabras = set(re.findall(r"\d+|[^\W\d_]+", fuente))
    validas = []
    for o in data["contradice"]:
        cita = _plano(o.get("fuente", ""))
        if cita and cita in fuente:              # sin cita textual es memoria disfrazada de fuente
            validas.append(f"contradice la fuente: {o.get('relato', '')} (fuente: {o.get('fuente', '')})")
    for o in data["sin_respaldo"]:
        marcas = _marcas(o.get("dato", ""))
        if not marcas or sum(m in palabras for m in marcas) * 2 < len(marcas):   # mayoría = está en la fuente
            validas.append(f"sin respaldo en la fuente: {o.get('dato', '')} ({o.get('relato', '')})")
    for o in data["leyenda"]:
        validas.append(f"leyenda contada como hecho: {o.get('relato', '')} ({o.get('motivo', '')})")
    return validas


def _parse_objeciones(raw: str) -> dict:
    text = raw or ""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No se encontró JSON del juez: {text[:120]!r}")
    data = json.loads(text[start:end + 1])
    if not all(isinstance(data.get(k), list) for k in ("contradice", "sin_respaldo", "leyenda")):
        raise ValueError(f"Respuesta del juez sin las listas pedidas: {text[:120]!r}")
    return data


def judge_story(client, model, story: dict, instr: str, source: str = "") -> dict:
    """Verifica el relato narrativo. Si viene `source` (texto de Wikipedia) coteja contra esa fuente, a
    temperatura 0 (a 0.8 el mismo relato salía aprobado o rechazado según la corrida) y descartando por
    código las objeciones que la fuente desmiente. Sin source, juzga de memoria como antes."""
    relato = "\n".join(f"- {s['text']}" for s in story.get("segments", []))
    titulo = story.get("titulo", "")
    if not source:
        return parse_verdict(_chat(client, model, _PROMPT_STORY.format(instr=instr, titulo=titulo, relato=relato)))
    prompt = _PROMPT_STORY_FUENTE.format(instr=instr, source=source, titulo=titulo, relato=relato)
    validas = _objeciones_validas(_parse_objeciones(_chat(client, model, prompt, temperature=0)), source)
    return {"ok": not validas, "problema": " | ".join(validas)}
