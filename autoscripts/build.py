"""Orquesta la generación de episodios de faceless: generate -> validar -> dedup -> judge ->
guardar approved. Ensambla los datos crudos al formato segments de series_data. 429 de Groq ->
QuotaExhausted (el autobuild lo marca QUOTA y reanuda cuando la cuota vuelve)."""
from __future__ import annotations

import sys

from reddit_pipeline.rewrite import build_client, model_name
from autoscripts import db, generate, judge, narrativa, topics
from autobuild.errors import QuotaExhausted

MIN_DATOS = 4    # 4 datos cortos ≈ 35-40s: en Shorts más corto = más % visto; el dedup estricto deja menos
MAX_DATOS = 5    # 5 datos cortos ≈ 45-50s. Con 6 datos de 2-3 frases salían 1:10+ y retenían la mitad.

_NARRATIVE = set(narrativa.MODULE)   # {"historia", "misterios"}: relato narrado, no lista de datos


# Re-gancho al final del 1er dato: es justo donde se caía la retención (seg 5-11, paso del dato 1
# al 2). Rotan para que no sea siempre la misma muletilla.
REGANCHOS = (
    "Pero esperá al último, que es todavía más raro.",
    "Y el último de la lista es el más loco de todos.",
    "Quedate hasta el final, que el último te va a sorprender.",
    "Y eso no es nada al lado del último.",
)


# Micro-gancho (análisis vidIQ: datos en fila sin transición cansan en el tramo 0:20-0:30). UNO solo,
# antes del 3er dato (el mismo que lleva el golpe de ritmo en el render): con el re-gancho del dato 1
# son 2 ganchos, en los dos puntos de caída fuerte. Uno antes de cada dato satura (feedback usuario).
MICRO_MEDIO = (
    "Pero esperá, que este es todavía más loco.",
    "Y ahora prestá atención a este.",
    "Pero este es el que más me sorprendió.",
    "Ojo con este, que parece mentira.",
)
# Ya no se usan (eran el 3er gancho, antes del último dato); quedan para limpiar episodios viejos.
MICRO_ULTIMO = (
    "Y ahora sí, el último que te prometí.",
    "Y el último, el más raro de todos.",
    "Y el que te dije que era el mejor.",
    "Y por último, el más loco.",
)

# NO se usan: "suscribite/seguime" hablado es el anti-patrón §9.12-13 de docs/formula-faceless-viral.md
# (rompe el loop y IG lo excluye como engagement bait; lo vigila tests/test_formula.py). El incentivo a
# suscribirse es el adelanto de la próxima parte (series_data.teaser_for, se agrega al renderizar).
# Quedan solo para limpiar episodios que los tengan.
CIERRES = (
    "Si te voló la cabeza, suscribite, que la próxima parte viene todavía más rara.",
    "Suscribite para no perderte la próxima parte, que tengo datos más locos.",
    "Seguime y suscribite: en la próxima parte hay datos que no vas a creer.",
    "Si querés parecer más inteligente, suscribite, que esto sigue en la próxima parte.",
)


def _pick(opts: tuple, seed: str) -> str:
    import zlib
    return opts[zlib.crc32(seed.encode("utf-8")) % len(opts)]


def reganche_for(seed: str) -> str:
    return _pick(REGANCHOS, seed)


def add_microhooks(segments: list, seed: str) -> list:
    """Micro-gancho antes del 3er dato (con 4+ datos). Idempotente; además limpia del último dato el
    viejo micro-gancho y cualquier "suscribite" hablado (el cierre es el adelanto de la próxima parte,
    que se agrega al renderizar)."""
    facts = [s for s in segments if s.get("kind") == "fact"]
    if len(facts) >= 4 and not any(facts[2]["text"].startswith(m) for m in MICRO_MEDIO):
        facts[2]["text"] = f"{_pick(MICRO_MEDIO, seed + '|m')} {facts[2]['text']}"
    if len(facts) >= 2:
        ult = facts[-1]
        for m in MICRO_ULTIMO:
            if ult["text"].startswith(m + " "):
                ult["text"] = ult["text"][len(m) + 1:]
        for c in CIERRES:
            if ult["text"].endswith(" " + c):
                ult["text"] = ult["text"][: -len(c) - 1]
    return segments


def clean_gancho(g: str) -> str:
    """Gancho usable: una pregunta corta, sin dígitos ni saludo. Si no cumple, vacío (el episodio
    abre directo en el dato, como antes)."""
    import re
    import series_data
    g = re.sub(r"[*_`]+", "", (g or "")).strip().strip("\"'“”«» ")
    n = len(g.split())
    if not g.endswith("?") or not (4 <= n <= 16) or re.search(r"\d", g) or series_data.es_bienvenida(g):
        return ""
    return g if g.startswith("¿") else "¿" + g


def assemble_segments(datos: list, titulo: str = "", gancho: str = "") -> list:
    """El 'title' es el overlay visual de los primeros ~3s (no se narra): si el episodio trae
    título-gancho va ESE (promete qué viene), si no el genérico de la serie. El 1er dato abre con la
    pregunta-gancho (análisis vidIQ: arrancar con la respuesta no deja motivo para quedarse) y,
    con 3+ datos, cierra con un re-gancho hacia el último."""
    import series_data
    primero = datos[0]["text"]
    if gancho:
        primero = f"{gancho} {primero}"
    if len(datos) >= 3:
        primero = f"{primero} {reganche_for(titulo or primero)}"
    segs = [{"kind": "fact", "text": primero, "imgs": list(datos[0]["imgs"])}]
    segs.append({"kind": "title", "text": titulo or series_data.TITULO_PANTALLA})
    for d in datos[1:]:
        segs.append({"kind": "fact", "text": d["text"], "imgs": list(d["imgs"])})
    add_microhooks(segs, titulo or primero)
    series_data.assert_hook_first(segs)   # §1: el short abre EN el hook, sin saludo
    return segs


def assemble_story(st: dict) -> dict:
    """Pasa un relato generado al formato EXACTO de series_historia/series_misterios: momentos como
    segmentos 'fact', SIN tarjeta de título (el relato es continuo). Descarta 'topic' (solo dedup)."""
    import series_data
    segments = [{"kind": "fact", "text": s["text"], "imgs": list(s["imgs"])}
                for s in st["segments"]]
    series_data.assert_hook_first(segments)   # §1: el relato abre EN el hook, sin saludo
    return {"pregunta": st["pregunta"], "titulo": st["titulo"], "resumen": st["resumen"],
            "segments": segments}


def _clean_title(t: str) -> str:
    """Título-gancho usable: sin comillas/hashtags/'pt. N' ni cantidad inicial ("10 cosas..." no
    puede prometer 10 si el juez dejó 4), recortado a 70 caracteres."""
    import re
    t = re.sub(r"#\S+|\bpt\.?\s*\d+", "", (t or "")).strip().strip("\"'“”«» ")
    t = re.sub(r"^\d+\s+", "", t)
    t = t[:1].upper() + t[1:]
    return t[:70].rstrip() if len(t) >= 15 else ""


def _sources(datos: list) -> list:
    """Intro de Wikipedia del sujeto (1er término de imagen) de cada dato, para que el juez coteje.
    None donde no hay artículo o falla la red (el juez juzga ese dato de memoria, como antes)."""
    try:
        from src.wiki_facts import fetch_summary
    except Exception:
        return [None] * len(datos)
    out = []
    for d in datos:
        try:
            out.append(fetch_summary(d["imgs"][0], lang="en", max_chars=900))
        except Exception:
            out.append(None)
    return out


def _used_titles(channel: str) -> list:
    """Títulos ya generados (aprobados Y rechazados), para que el LLM no repita el tema: con solo
    los aprobados volvió tres veces a "inventos por accidente"."""
    from autoscripts import db as _db
    path = _db.DB_PATH(channel)
    if not path.exists():
        return []
    conn = _db.connect(path)
    try:
        eps = [r["episode"] for st in ("approved", "rejected") for r in _db.by_status(conn, st)]
    finally:
        conn.close()
    vistos, out = set(), []
    for e in eps:
        t = e.get("titulo", "")
        if t and t not in vistos:
            vistos.add(t)
            out.append(t)
    return out


def _is_quota(exc: Exception) -> bool:
    s = str(exc).lower()
    return getattr(exc, "status_code", None) == 429 or "429" in s or "rate limit" in s or "quota" in s


def _build_narrative(channel: str, n: int) -> int:
    import importlib
    series_module = importlib.import_module(narrativa.MODULE[channel])
    instr, judge_instr = narrativa.INSTR[channel], narrativa.JUDGE_INSTR[channel]
    hint = narrativa.SUBJECT_HINT[channel]
    client, model = build_client(), model_name()
    made = 0
    for _ in range(n):
        used = narrativa.used_subjects(channel, series_module)
        try:
            st, source = narrativa.generate_story(
                client, model, series_module, instr, sorted(used), hint=hint)
            if narrativa.is_duplicate(st["topic"], used):
                print(f"[{channel}] descartado: sujeto repetido ({st['topic']})")
                continue
            verdict = judge.judge_story(client, model, st, judge_instr, source=source)
        except QuotaExhausted:
            raise
        except Exception as e:
            if _is_quota(e):
                raise QuotaExhausted(f"{channel}: cuota de Groq agotada")
            print(f"[{channel}] intento falló: {type(e).__name__}: {e}")
            continue
        conn = db.connect(db.DB_PATH(channel))
        episode, topic_keys = assemble_story(st), [st["topic"]]
        if verdict["ok"]:
            db.add_episode(conn, episode=episode, topic_keys=topic_keys, status="approved")
            made += 1
            print(f"[{channel}] APROBADO (juez OK)")
        else:
            db.add_episode(conn, episode=episode, topic_keys=topic_keys, status="rejected",
                           qc_note=verdict["problema"])
            print(f"[{channel}] RECHAZADO por el juez: {verdict['problema'][:80]}")
        conn.close()
    return made


def build(channel: str, n: int = 3) -> int:
    if channel in _NARRATIVE:
        return _build_narrative(channel, n)
    client, model = build_client(), model_name()
    made = 0
    for _ in range(n):
        used = topics.used_topics(channel)
        try:
            ep = generate.generate_episode(client, model, avoid_topics=sorted(used),
                                           avoid_titles=_used_titles(channel))
            datos = topics.dedup(ep["datos"], used)
            datos = [d for d in datos if generate.palabras(d) <= generate.MAX_PALABRAS_DATO]
            if len(datos) < MIN_DATOS:
                print(f"[{channel}] descartado: {len(datos)}<{MIN_DATOS} datos nuevos y cortos")
                continue
            # Juez dato por dato: se descartan los que fallan y el episodio sigue si quedan
            # MIN_DATOS verificados (antes un solo dato inventado tiraba el episodio entero).
            datos = datos[:MAX_DATOS + 3]
            # El juez ve la pregunta-gancho pegada al 1er dato: si no corresponde a la respuesta o
            # afirma algo falso ("¿cómo una mancha dio origen al pegamento...?" -> velcro), cae ese
            # dato y con él el gancho.
            primero_original = (ep.get("datos") or [{}])[0]
            g = clean_gancho(ep.get("gancho", ""))
            a_juzgar = [dict(d, text=f"{g} {d['text']}") if (g and d is primero_original) else d
                        for d in datos]
            fuentes = _sources(datos)
            juicio = judge.judge_datos(client, model, a_juzgar, sources=fuentes)
            vivos = [i for i in range(len(datos)) if i not in juicio["falsos"]]
            # 2ª pasada independiente sobre los que sobrevivieron (el juez solo ya dejó pasar
            # "Popsicle en una noche calurosa"; fue en una noche FRÍA).
            if len(vivos) >= MIN_DATOS:
                juicio2 = judge.judge_datos(client, model, [a_juzgar[i] for i in vivos],
                                            sources=[fuentes[i] for i in vivos])
                vivos = [i for k, i in enumerate(vivos) if k not in juicio2["falsos"]]
                juicio["problema"] = (juicio["problema"] + " | " + juicio2["problema"]).strip(" |")
            buenos = [datos[i] for i in vivos]
            if len(buenos) >= MIN_DATOS:
                verdict = {"ok": True, "problema": juicio["problema"]}
                if len(buenos) < len(datos):
                    ep["resumen"] = ", ".join(d["topic"] for d in buenos[:MAX_DATOS])
                datos = buenos[:MAX_DATOS]
            else:
                verdict = {"ok": False, "problema": juicio["problema"]
                           or f"solo {len(buenos)} datos verificados"}
        except QuotaExhausted:
            raise
        except Exception as e:
            if _is_quota(e):
                raise QuotaExhausted(f"{channel}: cuota de Groq agotada")
            print(f"[{channel}] intento falló: {type(e).__name__}: {e}")
            continue
        conn = db.connect(db.DB_PATH(channel))
        titulo = _clean_title(ep.get("titulo", ""))
        # La pregunta-gancho se escribió para el 1er dato ORIGINAL: si el dedup o el juez lo
        # sacaron, respondería a otro dato -> no va.
        primero_original = (ep.get("datos") or [{}])[0]
        gancho = clean_gancho(ep.get("gancho", "")) if datos and datos[0] is primero_original else ""
        episode = {"pregunta": ep["pregunta"], "resumen": ep["resumen"],
                   "segments": assemble_segments(datos, titulo, gancho)}
        if titulo:
            episode["titulo"] = titulo
        topic_keys = [d["topic"] for d in datos]
        if verdict["ok"]:
            db.add_episode(conn, episode=episode, topic_keys=topic_keys, status="approved")
            made += 1
            print(f"[{channel}] APROBADO (juez OK)")
        else:
            db.add_episode(conn, episode=episode, topic_keys=topic_keys, status="rejected",
                           qc_note=verdict["problema"])
            print(f"[{channel}] RECHAZADO por el juez: {verdict['problema'][:80]}")
        conn.close()
    return made


if __name__ == "__main__":
    for _st in (sys.stdout, sys.stderr):
        try:
            _st.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    ch = sys.argv[1] if len(sys.argv) > 1 else "faceless"
    cnt = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    print(f"[{ch}] generados aprobados: {build(ch, cnt)}")
