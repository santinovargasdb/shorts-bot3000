# tests/test_autoscripts_build.py
import autoscripts.build as B
import autoscripts.db as db


def test_assemble_segments_mete_la_tarjeta_despues_del_primer_dato():
    datos = [{"text": "d1", "imgs": ["a", "b"], "topic": "t1"},
             {"text": "d2", "imgs": ["c", "d"], "topic": "t2"}]
    segs = B.assemble_segments(datos)
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
    return [{"text": f"dato {prefix}{i} sin numeros.", "imgs": ["x", "y"], "topic": f"{prefix}{i}"}
            for i in range(n)]


def _wire(monkeypatch, *, judge_ok=True):
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.topics, "used_topics", lambda ch: set())
    monkeypatch.setattr(B.generate, "generate_episode",
                        lambda client, model, avoid_topics, n_datos=6:
                        {"pregunta": "¿?", "resumen": "r", "datos": _datos(6)})
    monkeypatch.setattr(B.judge, "judge_episode",
                        lambda client, model, datos: {"ok": judge_ok, "problema": "" if judge_ok else "falso"})


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
