# tests/test_autoscripts_build.py
import autoscripts.build as B
import autoscripts.db as db


def test_assemble_segments_mete_la_tarjeta_despues_del_primer_dato():
    datos = [{"text": "d1", "imgs": ["a", "b"], "topic": "t1"},
             {"text": "d2", "imgs": ["c", "d"], "topic": "t2"}]
    segs = B.assemble_segments(datos)   # 2 datos: sin re-gancho ni micro-gancho
    assert segs[0] == {"kind": "fact", "text": "d1", "imgs": ["a", "b"]}
    assert segs[1]["kind"] == "title"
    assert segs[2]["kind"] == "fact" and segs[2]["text"] == "d2"


def test_assemble_segments_rechaza_primer_dato_bienvenida():
    # §1: el guion generado por el LLM debe abrir en el hook; si el primer dato
    # es un saludo/anuncio de tema, se aborta en vez de renderizar un video muerto.
    import pytest
    datos = [{"text": "Hola chicos, bienvenidos al canal.", "imgs": ["a", "b"], "topic": "t1"},
             {"text": "d2", "imgs": ["c", "d"], "topic": "t2"}]
    with pytest.raises(ValueError):
        B.assemble_segments(datos)


def _datos(n, prefix="t"):
    return [{"text": f"dato {prefix}{i} sin numeros.", "imgs": [f"img{prefix}{i}", "y"], "topic": f"{prefix}{i}"}
            for i in range(n)]


def _wire(monkeypatch, *, judge_ok=True):
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.topics, "used_topics", lambda ch: set())
    monkeypatch.setattr(B, "_sources", lambda datos: [None] * len(datos))
    monkeypatch.setattr(B.generate, "generate_episode",
                        lambda client, model, avoid_topics, n_datos=6, avoid_titles=None:
                        {"pregunta": "¿?", "resumen": "r", "datos": _datos(6)})
    monkeypatch.setattr(B.judge, "judge_datos",
                        lambda client, model, datos, **k: {"falsos": set() if judge_ok else set(range(len(datos))),
                                                      "problema": "" if judge_ok else "falso"})


def test_build_descarta_solo_los_datos_falsos(tmp_path, monkeypatch):
    # un dato inventado ya no tira el episodio: se saca ese y siguen los verificados
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    llamadas = []

    def juez(c, m, datos, **k):
        llamadas.append(len(datos))
        return {"falsos": {0} if len(llamadas) == 1 else set(), "problema": "d0 falso"}
    monkeypatch.setattr(B.judge, "judge_datos", juez)
    assert B.build("faceless", n=1) == 1
    facts = [s["text"] for s in db.approved_episodes("faceless")[0]["segments"] if s["kind"] == "fact"]
    assert not any("dato t0 sin numeros." in f for f in facts) and len(facts) == B.MAX_DATOS
    assert llamadas == [6, 5]                       # 2ª pasada solo sobre los que sobrevivieron


def test_build_segunda_pasada_tambien_descarta(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    n = {"c": 0}

    def juez(c, m, datos, **k):
        n["c"] += 1
        return {"falsos": set() if n["c"] == 1 else {0, 1, 2}, "problema": "2ª pasada"}
    monkeypatch.setattr(B.judge, "judge_datos", juez)
    assert B.build("faceless", n=1) == 0            # quedan 3 < MIN_DATOS


def test_build_rechaza_si_quedan_menos_del_minimo(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    monkeypatch.setattr(B.judge, "judge_datos", lambda c, m, datos, **k: {"falsos": {0, 1, 2}, "problema": "x"})
    assert B.build("faceless", n=1) == 0


def test_clean_title_saca_la_cantidad():
    assert B._clean_title("10 cosas que tu cuerpo hace sin avisarte") == "Cosas que tu cuerpo hace sin avisarte"


def test_build_aprueba_y_guarda(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    made = B.build("faceless", n=1)
    assert made == 1
    assert len(db.approved_episodes("faceless")) == 1
    ep = db.approved_episodes("faceless")[0]
    assert any(s["kind"] == "title" for s in ep["segments"])      # ensamblado OK


def test_build_rechaza_si_el_juez_dice_no(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=False)
    made = B.build("faceless", n=1)
    assert made == 0
    assert db.approved_episodes("faceless") == []


def test_build_429_levanta_quota_exhausted(tmp_path, monkeypatch):
    from autobuild.errors import QuotaExhausted
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.topics, "used_topics", lambda ch: set())
    monkeypatch.setattr(B, "_sources", lambda datos: [None] * len(datos))

    def boom(*a, **k):
        raise RuntimeError("Error code: 429 - rate limit exceeded")
    monkeypatch.setattr(B.generate, "generate_episode", boom)
    import pytest
    with pytest.raises(QuotaExhausted):
        B.build("faceless", n=1)


# ---------- flujo narrativo (historia / misterios) ----------

_NARR = {"pregunta": "¿Suerte o no?", "titulo": "Un título gancho", "resumen": "resumen",
         "topic": "sujeto unico",
         "segments": [{"text": "Momento uno del relato.", "imgs": ["a", "b"]},
                      {"text": "Momento dos del relato.", "imgs": ["c", "d"]}]}


def test_assemble_story_pasa_a_formato_serie():
    ep = B.assemble_story(_NARR)
    assert ep["titulo"] == "Un título gancho"
    assert ep["resumen"] == "resumen"
    assert "topic" not in ep                                   # el topic no va al episodio de la serie
    assert all(s["kind"] == "fact" for s in ep["segments"])    # momentos narrativos
    assert not any(s["kind"] == "title" for s in ep["segments"])  # SIN tarjeta de título (no es faceless)
    assert ep["segments"][0] == {"kind": "fact", "text": "Momento uno del relato.", "imgs": ["a", "b"]}


def test_assemble_story_rechaza_apertura_bienvenida():
    # §1: el relato generado también debe abrir en el hook, no con un saludo.
    import pytest
    bad = dict(_NARR, segments=[{"text": "Hola, en este video les cuento una historia.", "imgs": ["a", "b"]},
                                {"text": "Momento dos.", "imgs": ["c", "d"]}])
    with pytest.raises(ValueError):
        B.assemble_story(bad)


def _wire_narr(monkeypatch, *, story=None, judge_ok=True, used=None):
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.narrativa, "used_subjects", lambda ch, mod: (used if used is not None else set()))
    monkeypatch.setattr(B.narrativa, "generate_story",
                        lambda client, model, series_module, instr, avoid_subjects, n_segs=5, hint="":
                        ((story if story is not None else _NARR), "FUENTE_MOCK"))
    monkeypatch.setattr(B.judge, "judge_story",
                        lambda client, model, st, instr, source="": {"ok": judge_ok, "problema": "" if judge_ok else "falso"})


def test_build_narrative_aprueba_y_guarda(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / f"{ch}.sqlite")
    _wire_narr(monkeypatch, judge_ok=True)
    made = B.build("historia", n=1)
    assert made == 1
    eps = db.approved_episodes("historia")
    assert len(eps) == 1
    assert eps[0]["titulo"] == "Un título gancho"
    assert all(s["kind"] == "fact" for s in eps[0]["segments"])


def test_build_narrative_rechaza_si_el_juez_dice_no(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / f"{ch}.sqlite")
    _wire_narr(monkeypatch, judge_ok=False)
    assert B.build("misterios", n=1) == 0
    assert db.approved_episodes("misterios") == []


def test_build_narrative_descarta_sujeto_repetido(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / f"{ch}.sqlite")
    _wire_narr(monkeypatch, judge_ok=True, used={"sujeto unico"})   # el topic ya está usado
    assert B.build("historia", n=1) == 0
    assert db.approved_episodes("historia") == []


def test_build_narrative_429_levanta_quota_exhausted(tmp_path, monkeypatch):
    from autobuild.errors import QuotaExhausted
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / f"{ch}.sqlite")
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.narrativa, "used_subjects", lambda ch, mod: set())

    def boom(*a, **k):
        raise RuntimeError("Error code: 429 - rate limit exceeded")
    monkeypatch.setattr(B.narrativa, "generate_story", boom)
    import pytest
    with pytest.raises(QuotaExhausted):
        B.build("misterios", n=1)


def test_build_narrative_pasa_la_fuente_al_juez(monkeypatch, tmp_path):
    import autoscripts.build as B
    story = {"pregunta": "¿x?", "titulo": "T", "resumen": "r", "topic": "Tema",
             "segments": [{"text": "Momento uno.", "imgs": ["a", "b"]}]}
    cap = {}
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.narrativa, "used_subjects", lambda ch, mod: set())
    monkeypatch.setattr(B.narrativa, "is_duplicate", lambda t, u: False)
    monkeypatch.setattr(B.narrativa, "generate_story",
                        lambda *a, **k: (story, "FUENTE_Q"))
    monkeypatch.setattr(B, "assemble_story", lambda st: {"pregunta": "¿x?", "titulo": "T",
                        "resumen": "r", "segments": [{"kind": "fact", "text": "Momento uno.",
                        "imgs": ["a", "b"]}]})
    def fake_judge(c, m, st, instr, source=""):
        cap["source"] = source
        return {"ok": False, "problema": "test"}
    monkeypatch.setattr(B.judge, "judge_story", fake_judge)
    import types
    monkeypatch.setattr(B.db, "connect", lambda p: types.SimpleNamespace(close=lambda: None))
    monkeypatch.setattr(B.db, "DB_PATH", lambda ch: tmp_path / "x.sqlite")
    monkeypatch.setattr(B.db, "add_episode", lambda *a, **k: 1)
    B._build_narrative("misterios", 1)
    assert cap["source"] == "FUENTE_Q"      # la fuente llegó al juez


def test_assemble_segments_usa_el_titulo_gancho_en_el_overlay():
    datos = [{"text": "d1", "imgs": ["a", "b"], "topic": "t1"}]
    assert B.assemble_segments(datos, "Animales tramposos")[1]["text"] == "Animales tramposos"


def test_clean_title():
    assert B._clean_title('"Animales que hacen trampa pt. 3 #shorts"') == "Animales que hacen trampa"
    assert B._clean_title("corto") == ""


def test_build_descarta_datos_largos_y_guarda_titulo(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    largo = {"text": " ".join(["palabra"] * 40), "imgs": ["L", "M"], "topic": "largo"}
    monkeypatch.setattr(B.generate, "generate_episode",
                        lambda *a, **k: {"pregunta": "¿?", "resumen": "r",
                                         "titulo": "Animales que hacen trampa",
                                         "datos": [largo] + _datos(6)})
    assert B.build("faceless", n=1) == 1
    ep = db.approved_episodes("faceless")[0]
    facts = [s for s in ep["segments"] if s["kind"] == "fact"]
    assert len(facts) == B.MAX_DATOS and all("palabra palabra" not in s["text"] for s in facts)
    assert ep["titulo"] == "Animales que hacen trampa"


def test_assemble_segments_abre_con_pregunta_y_reengancha():
    datos = [{"text": f"dato {i}.", "imgs": ["a", "b"], "topic": f"t{i}"} for i in range(4)]
    segs = B.assemble_segments(datos, "Título gancho largo", "¿Por qué pasa esto tan raro?")
    primero = segs[0]["text"]
    assert primero.startswith("¿Por qué pasa esto tan raro? dato 0.")
    assert any(primero.endswith(r) for r in B.REGANCHOS)       # re-gancho donde se caía la retención
    assert segs[2]["text"] == "dato 1."                         # el resto queda igual


def test_clean_gancho():
    assert B.clean_gancho("¿Qué animal puede correr sobre el agua?") == "¿Qué animal puede correr sobre el agua?"
    assert B.clean_gancho("Qué animal corre sobre el agua?").startswith("¿")
    assert B.clean_gancho("Los flamencos son rosas.") == ""          # no es pregunta
    assert B.clean_gancho("¿Sabías que hay 3 corazones?") == ""      # dígitos (el TTS los lee mal)
    assert B.clean_gancho("¿Hola, cómo están todos hoy?") == ""      # saludo = video muerto


def test_build_no_usa_el_gancho_si_el_juez_saco_el_primer_dato(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    monkeypatch.setattr(B.generate, "generate_episode",
                        lambda *a, **k: {"pregunta": "¿?", "resumen": "r", "titulo": "Título de prueba largo",
                                         "gancho": "¿Qué tiene de raro el dato cero?", "datos": _datos(6)})
    monkeypatch.setattr(B.judge, "judge_datos", lambda c, m, datos, **k: {"falsos": {0}, "problema": "x"})
    assert B.build("faceless", n=1) == 1
    primero = db.approved_episodes("faceless")[0]["segments"][0]["text"]
    assert "¿Qué tiene de raro" not in primero


def test_build_usa_el_gancho_si_el_primer_dato_sobrevive(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    monkeypatch.setattr(B.generate, "generate_episode",
                        lambda *a, **k: {"pregunta": "¿?", "resumen": "r", "titulo": "Título de prueba largo",
                                         "gancho": "¿Qué tiene de raro el dato cero?", "datos": _datos(6)})
    assert B.build("faceless", n=1) == 1
    assert db.approved_episodes("faceless")[0]["segments"][0]["text"].startswith("¿Qué tiene de raro")


def test_un_solo_microgancho_y_cierre_de_suscripcion():
    # 2 ganchos en total (re-gancho del dato 1 + micro antes del 3º); uno por dato saturaba
    datos = [{"text": f"dato {i}.", "imgs": ["a", "b"], "topic": f"t{i}"} for i in range(5)]
    facts = [s["text"] for s in B.assemble_segments(datos, "Título de prueba largo") if s["kind"] == "fact"]
    assert any(facts[2] == f"{m} dato 2." for m in B.MICRO_MEDIO)
    assert facts[1] == "dato 1." and facts[3] == "dato 3."
    assert facts[4] == "dato 4."      # sin gancho ni "suscribite" (el adelanto se agrega al renderizar)


def test_add_microhooks_limpia_el_viejo_gancho_y_el_suscribite():
    segs = [{"kind": "fact", "text": f"d{i}"} for i in range(4)]
    segs[-1]["text"] = f"{B.MICRO_ULTIMO[0]} d3 {B.CIERRES[0]}"
    B.add_microhooks(segs, "x")
    assert segs[-1]["text"] == "d3"


def test_microganchos_idempotente():
    segs = [{"kind": "fact", "text": f"d{i}"} for i in range(4)]
    B.add_microhooks(segs, "x")
    antes = [s["text"] for s in segs]
    B.add_microhooks(segs, "x")
    assert [s["text"] for s in segs] == antes
