"""Orquesta la generación de episodios de faceless: generate -> validar -> dedup -> judge ->
guardar approved. Ensambla los datos crudos al formato segments de series_data. 429 de Groq ->
QuotaExhausted (el autobuild lo marca QUOTA y reanuda cuando la cuota vuelve)."""
from __future__ import annotations

import sys

from reddit_pipeline.rewrite import build_client, model_name
from autoscripts import db, generate, judge, narrativa, topics
from autobuild.errors import QuotaExhausted

MIN_DATOS = 5

_NARRATIVE = set(narrativa.MODULE)   # {"historia", "misterios"}: relato narrado, no lista de datos


def assemble_segments(datos: list) -> list:
    import series_data
    segs = [{"kind": "fact", "text": datos[0]["text"], "imgs": list(datos[0]["imgs"])}]
    segs.append({"kind": "title", "text": series_data.TITULO_PANTALLA})
    for d in datos[1:]:
        segs.append({"kind": "fact", "text": d["text"], "imgs": list(d["imgs"])})
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
            ep = generate.generate_episode(client, model, avoid_topics=sorted(used))
            datos = topics.dedup(ep["datos"], used)
            if len(datos) < MIN_DATOS:
                print(f"[{channel}] descartado: {len(datos)}<{MIN_DATOS} datos nuevos tras dedup")
                continue
            datos = datos[:MIN_DATOS + 1]
            verdict = judge.judge_episode(client, model, datos)
        except QuotaExhausted:
            raise
        except Exception as e:
            if _is_quota(e):
                raise QuotaExhausted(f"{channel}: cuota de Groq agotada")
            print(f"[{channel}] intento falló: {type(e).__name__}: {e}")
            continue
        conn = db.connect(db.DB_PATH(channel))
        episode = {"pregunta": ep["pregunta"], "resumen": ep["resumen"],
                   "segments": assemble_segments(datos)}
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
