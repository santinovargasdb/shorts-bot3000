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
"tema", "titulo", "gancho", "pregunta", "resumen", "datos".

FORMATO (lo que rinde en el nicho, medido con vidIQ): UN TEMA por episodio, no datos sueltos.
Todos los datos giran alrededor del mismo tema concreto (ej. "animales que hacen trampa",
"cosas que hace tu cuerpo sin que te des cuenta", "lugares de la Tierra que parecen de otro
planeta", "inventos que salieron de un error", "récords absurdos de la historia"). Así quien vio
el primero se queda por el siguiente. Esta vez el tema tiene que ser de la familia: {familia}.
El tema NO puede repetir estos títulos ya usados: {titulos}.

- "tema": el tema del episodio, 3-8 palabras.
- "gancho": la PRIMERA frase que se narra: una PREGUNTA corta (seis a catorce palabras) sobre el
  primer dato que abre una intriga SIN responderla, para que tengan que quedarse a escuchar la
  respuesta (ej. "¿Por qué los flamencos son rosas si nacen grises?", "¿Qué animal puede
  correr sobre el agua?"). El primer dato es la respuesta y arranca respondiendo directo, SIN
  repetir las palabras de la pregunta. Nada de "hola" ni "sabías que" vacío.
  Sin dígitos.
- "titulo": título-gancho para YouTube/TikTok, de 30 a 60 caracteres, que PROMETE algo concreto y
  abre curiosidad (ej. "Animales que hacen trampa para sobrevivir", "Tu cuerpo hace esto mientras
  dormís"). Sin "pt.", sin hashtags, sin comillas, sin cantidad de datos ("10 cosas...").
- "datos": lista de {n} datos curiosos, VERDADEROS y VERIFICABLES, todos del tema. El PRIMERO es
  el más impactante (es el gancho: la gente decide en dos segundos si se queda). Cada dato = objeto con:
  - "text": el dato con su por qué/cómo en UNA o DOS frases cortas, como máximo {max_palabras}
    palabras, hablado y natural. Arrancá directo en lo sorprendente, sin rodeos. NÚMEROS SIEMPRE
    EN PALABRAS (ej. "tres corazones", no "3"). Nada de dígitos. Que NO arranquen todos igual
    (variá la entrada: una cifra, una comparación, un "parece X pero es Y", una consecuencia), así
    el que mira no puede predecir el próximo. Usá el NOMBRE COMÚN en español
    (se narra en voz alta): nada de nombres científicos en latín ni nombres en inglés en el texto,
    y nada de formato (asteriscos, comillas raras). El nombre científico va solo en "imgs".
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
Cada dato tiene que estar en el artículo de Wikipedia de su sujeto: un hecho de enciclopedia que
sorprende al público, NO una interpretación propia ni un mecanismo inventado para que suene mejor.
{fuentes}
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


MAX_PALABRAS_DATO = 32    # ~10s de voz: el corte de retención está en el paso del dato 1 al 2

# Familias de tema que más crecen en búsquedas en español con poca competencia (vidIQ, nov-2026:
# cuerpo humano +131%, espacio/universo +120-135%, animales, científicas, historia). Se rota una por
# llamada: dejado libre, el modelo elegía siempre "cuerpo humano" y ahí alucinaba más.
FAMILIAS = (
    "animales (comportamientos, cuerpos o récords sorprendentes)",
    "espacio y universo (planetas, estrellas, misiones espaciales)",
    "cuerpo humano (cosas raras que hace o puede hacer el cuerpo; NO definiciones de órganos)",
    "historia (hechos reales absurdos o poco conocidos, con fecha exacta)",
    "lugares de la Tierra (geografía, fenómenos naturales, sitios raros)",
    "ciencia cotidiana (por qué pasan cosas de todos los días; NO inventos accidentales, ya usado)",
    "plantas, hongos y océanos",
)


def palabras(d: dict) -> int:
    return len(d.get("text", "").split())


_PROMPT_SUJETOS = """Sos guionista de un canal de shorts de curiosidades en español. Elegí UN tema
concreto de la familia: {familia}. El tema NO puede repetir estos títulos ya usados: {titulos}.
Proponé {n} SUJETOS para ese tema: cada uno es el TÍTULO EXACTO de un artículo de la Wikipedia en
INGLÉS (ej. "Fennec fox", "Olympus Mons", "Emu War"), cuyo dato SORPRENDENTE esté en el PRIMER
PÁRRAFO del artículo (es lo único que se va a leer). Nada de conceptos de manual (órganos, procesos,
definiciones): sujetos con algo que haga decir "¿en serio?". Nada de estos sujetos ya usados: {avoid}.

Respondé SOLO JSON: {{"tema": "...", "sujetos": ["...", "..."]}}"""


def _grounding(client, model, familia: str, avoid: str, titulos: str, extra: dict) -> str:
    """Paso 1 del modo con fuente: el LLM elige tema + sujetos, se baja el intro de Wikipedia de cada
    uno y se arma el bloque FUENTES para que el guion se escriba SOLO desde ahí (de memoria el modelo
    inventaba un dato de cada cinco y ni el doble juez alcanzaba). '' si no se pudo (modo de antes)."""
    try:
        raw = _chat(client, model, _PROMPT_SUJETOS.format(familia=familia, titulos=titulos,
                                                          avoid=avoid, n=9),
                    temperature=0.7, **extra)
        text = (raw or "").strip()
        data = json.loads(text[text.find("{"):text.rfind("}") + 1])
        tema, sujetos = str(data.get("tema", "")).strip(), data.get("sujetos") or []
    except Exception:
        return ""
    if not tema or not isinstance(sujetos, list):
        return ""
    from src.wiki_facts import fetch_summary
    bloques = []
    for s in sujetos[:10]:
        try:
            src = fetch_summary(str(s), lang="en", max_chars=1200)
        except Exception:
            src = None
        if src:
            bloques.append(f'- SUJETO: {s}\n  FUENTE: """{src}"""')
    if len(bloques) < 5:
        return ""
    return (f"\nMODO CON FUENTE. El tema del episodio es: {tema}. Escribí UN dato por sujeto de esta "
            f"lista, SOLO con lo que dice su FUENTE (nada que la fuente no diga; si una fuente no tiene "
            f"nada sorprendente, salteá ese sujeto). En cada dato, imgs[0] es el SUJETO tal cual está "
            f"escrito acá.\n" + "\n".join(bloques) + "\n")


def generate_episode(client, model, avoid_topics: list, n_datos: int = 10,
                     avoid_titles: list | None = None, familia: str | None = None) -> dict:
    import random
    familia = familia or random.choice(FAMILIAS)
    avoid = "; ".join(sorted(avoid_topics)[:400]) or "(ninguno)"   # antes [:60]: el LLM no veía casi nada de lo usado
    titulos = "; ".join((avoid_titles or [])[-40:]) or "(ninguno)"
    # gpt-oss razona antes de responder y ese razonamiento gasta el cupo de tokens: con 10 datos la
    # salida llegaba vacía o cortada a la mitad (JSON roto). Más cupo + razonamiento bajo.
    extra = {"max_tokens": 8000}
    if "gpt-oss" in str(model):
        extra["reasoning_effort"] = "low"
    fuentes = _grounding(client, model, familia, avoid, titulos, extra)
    prompt = _PROMPT.format(n=n_datos, examples=_fewshot(), max_palabras=MAX_PALABRAS_DATO,
                            familia=familia, avoid=avoid, titulos=titulos, fuentes=fuentes)
    for intento in range(3):       # el modelo a veces devuelve JSON roto o vacío -> reintentar
        try:
            ep = parse_episode(_chat(client, model, prompt, temperature=0.6, **extra))
            break
        except (ValueError, json.JSONDecodeError):
            if intento == 2:
                raise
    # Un dato con dígitos (el TTS los lee mal) se descarta solo; antes tiraba el episodio entero.
    if isinstance(ep.get("datos"), list):
        for d in ep["datos"]:
            if isinstance(d.get("text"), str):   # markdown (*nombre*) iría a la voz y al subtítulo
                d["text"] = re.sub(r"[*_`]+", "", d["text"]).strip()
        ep["datos"] = [d for d in ep["datos"] if not re.search(r"\d", str(d.get("text", "")))]
    validate_schema(ep)
    return ep
