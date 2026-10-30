import json

import pytest

import autoscripts.narrativa as N

# Episodio narrativo válido: 5 momentos, números en palabras, pregunta que cierra con "?",
# sin CTA hablada en el remate, ~120 palabras (dentro de 100-165).
_STORY = {
    "pregunta": "¿Suerte o maldición?",
    "titulo": "El hombre que sobrevivió a dos naufragios en la misma semana",
    "resumen": ("un marinero que en apenas siete días sobrevivió al hundimiento de dos "
                "barcos distintos y siguió navegando toda su vida"),
    "topic": "marinero dos naufragios",
    "segments": [
        {"text": ("Este marinero sobrevivió a dos naufragios distintos en una sola semana, y "
                  "aun así volvió a embarcarse sin dudarlo un solo instante."),
         "imgs": ["old sailing ship storm", "sinking ship ocean"]},
        {"text": ("Trabajaba en barcos de carga a comienzos del siglo veinte, cuando cruzar el "
                  "océano todavía era una tarea peligrosa y llena de tormentas inesperadas."),
         "imgs": ["cargo ship vintage", "rough sea waves"]},
        {"text": ("El primer barco se hundió de noche tras chocar contra unas rocas, y él logró "
                  "aferrarse a un bote hasta que lo rescataron al amanecer, exhausto y helado."),
         "imgs": ["lifeboat night rescue", "rocky coast shipwreck"]},
        {"text": ("Pocos días después se embarcó de nuevo, y una tormenta brutal volvió a mandar "
                  "esa nave al fondo del mar frente a toda la tripulación aterrada."),
         "imgs": ["ocean storm ship", "sailors on deck"]},
        {"text": ("Sobrevivió otra vez y trabajó en el mar durante décadas más, como si el agua "
                  "simplemente se negara a quedarse con él de una buena vez."),
         "imgs": ["old sailor portrait", "calm sea horizon"]},
    ],
}


def _fake_module(parts):
    import types
    return types.SimpleNamespace(PARTS=parts)


# ---------- parse_story ----------

def test_parse_story_extrae_json_con_fences():
    raw = "```json\n" + json.dumps(_STORY, ensure_ascii=False) + "\n```"
    st = N.parse_story(raw)
    assert st["titulo"].startswith("El hombre")
    assert len(st["segments"]) == 5


def test_parse_story_falla_si_faltan_claves():
    with pytest.raises(ValueError):
        N.parse_story(json.dumps({"titulo": "x"}))


# ---------- validate_story ----------

def test_validate_story_ok():
    N.validate_story(_STORY)   # no levanta


def test_validate_story_rechaza_digitos_en_texto_hablado():
    bad = json.loads(json.dumps(_STORY))
    bad["segments"][0]["text"] = "Sobrevivió a 2 naufragios en 7 dias seguidos sin ayuda alguna."
    with pytest.raises(ValueError):
        N.validate_story(bad)


def test_validate_story_permite_digitos_en_titulo():
    ok = json.loads(json.dumps(_STORY))
    ok["titulo"] = "El hombre que sobrevivió a 2 naufragios"   # dígitos en título = OK (va en pantalla)
    N.validate_story(ok)


def test_validate_story_exige_pregunta_con_signo():
    bad = json.loads(json.dumps(_STORY))
    bad["pregunta"] = "Suerte o maldicion"
    with pytest.raises(ValueError):
        N.validate_story(bad)


def test_validate_story_rechaza_cta_hablada_en_remate():
    bad = json.loads(json.dumps(_STORY))
    bad["segments"][-1]["text"] = "Seguime para una historia nueva cada dia y no te pierdas ninguna."
    with pytest.raises(ValueError):
        N.validate_story(bad)


def test_validate_story_exige_dos_imagenes_por_momento():
    bad = json.loads(json.dumps(_STORY))
    bad["segments"][0]["imgs"] = ["solo una"]
    with pytest.raises(ValueError):
        N.validate_story(bad)


def test_validate_story_rechaza_largo_fuera_de_rango():
    bad = json.loads(json.dumps(_STORY))
    bad["segments"] = [{"text": "Muy corto.", "imgs": ["a", "b"]} for _ in range(5)]
    with pytest.raises(ValueError):
        N.validate_story(bad)


def test_validate_story_rechaza_apertura_con_anio_hablado():
    # §2/§9.7 in-medias-res: nunca abrir con el año (caso real: el SS Waratah que se coló).
    bad = json.loads(json.dumps(_STORY))
    bad["segments"][0]["text"] = ("En julio de mil novecientos nueve, este enorme barco zarpó del "
                                  "puerto y jamás se volvió a saber nada de su tripulación.")
    with pytest.raises(ValueError):
        N.validate_story(bad)


def test_validate_story_rechaza_apertura_en_el_anio():
    bad = json.loads(json.dumps(_STORY))
    bad["segments"][0]["text"] = ("En el año en que todo cambió, un enorme barco zarpó del puerto "
                                  "para nunca jamás regresar con toda su tripulación a bordo.")
    with pytest.raises(ValueError):
        N.validate_story(bad)


def test_validate_story_acepta_apertura_in_medias_res():
    # El gancho/anomalía primero (sin fecha) sigue pasando: es el fixture _STORY tal cual.
    N.validate_story(_STORY)   # no levanta


def test_misterios_instr_prioriza_documentables_no_oscuros():
    # El yield de misterios se trababa porque la consigna pedía "casos MENOS conocidos"
    # (maximiza la alucinación del LLM). Ahora prioriza casos DOCUMENTABLES.
    instr = N.INSTR["misterios"].lower()
    assert "menos conocidos" not in instr
    assert "document" in instr


def test_prompt_pide_arranque_sin_fecha():
    # El modelo generaba aperturas con fecha (el guard de validate_story las rechaza, pero gasta
    # intentos/tokens). El prompt ahora le pide explícitamente arrancar en la anomalía, no en la fecha.
    assert "REGLA DURA 4" in N._PROMPT


# ---------- few-shot ----------

def test_fewshot_usa_los_episodios_reales_del_modulo():
    mod = _fake_module({
        1: {"pregunta": "¿p?", "titulo": "Un titulo real", "resumen": "r",
            "segments": [{"kind": "fact", "text": "Momento narrado real.", "imgs": ["img uno", "img dos"]}]},
    })
    fs = N._fewshot(mod, k=1)
    assert "Un titulo real" in fs and "Momento narrado real" in fs


# ---------- dedup por sujeto ----------

def test_hardcoded_subjects_saca_los_titulos():
    mod = _fake_module({1: {"titulo": "El Mary Celeste navegaba solo", "segments": []},
                        2: {"titulo": "La señal Wow del espacio", "segments": []}})
    subs = N.hardcoded_subjects(mod)
    assert "el mary celeste navegaba solo" in subs


def test_is_duplicate_detecta_sujeto_ya_usado():
    used = {"el mary celeste: el barco que navegaba solo"}
    assert N.is_duplicate("Mary Celeste", used) is True
    assert N.is_duplicate("La plaga del baile de Estrasburgo", used) is False


# ---------- generate_story (grounded) ----------

def test_generate_story_grounded_usa_la_fuente(monkeypatch):
    import src.wiki_facts as W
    monkeypatch.setattr(N, "propose_subject", lambda c, m, h, a: "Mary Celeste")
    monkeypatch.setattr(W, "fetch_summary", lambda subj, **k: "FUENTE_REAL_XYZ")
    monkeypatch.setattr(N, "_fewshot", lambda mod, k=2: "EJEMPLO_NARRATIVO")
    visto = {}
    def fake_chat(c, m, prompt):
        visto["p"] = prompt
        return json.dumps(_STORY, ensure_ascii=False)
    monkeypatch.setattr(N, "_chat", fake_chat)
    mod = _fake_module({1: _STORY})
    st, source = N.generate_story(object(), "m", mod, "instrucciones", ["mary x"], hint="h")
    assert source == "FUENTE_REAL_XYZ"
    assert "FUENTE_REAL_XYZ" in visto["p"]          # la fuente entro al prompt del relato
    assert "EJEMPLO_NARRATIVO" in visto["p"]        # sigue el few-shot (estilo)
    assert st["topic"] == "marinero dos naufragios"


def test_generate_story_sin_articulo_levanta(monkeypatch):
    import src.wiki_facts as W
    monkeypatch.setattr(N, "propose_subject", lambda c, m, h, a: "Nada De Nada")
    monkeypatch.setattr(W, "fetch_summary", lambda subj, **k: None)
    mod = _fake_module({1: _STORY})
    with pytest.raises(RuntimeError):
        N.generate_story(object(), "m", mod, "instr", [], hint="h", max_subject_tries=2)


def test_generate_story_no_requema_sujeto_descartado(monkeypatch):
    # Review finding: si el LLM repropone un sujeto ya descartado (sin articulo), NO hay que
    # volver a buscarlo en Wikipedia ni quemar el intento; se acumula en los evitados.
    import src.wiki_facts as W
    propuestas = iter(["Repetido", "Repetido", "Bueno"])
    monkeypatch.setattr(N, "propose_subject", lambda c, m, h, avoid: next(propuestas))
    fetched = []
    def fake_fetch(subj, **k):
        fetched.append(subj)
        return None if subj == "Repetido" else "FUENTE"
    monkeypatch.setattr(W, "fetch_summary", fake_fetch)
    monkeypatch.setattr(N, "_fewshot", lambda mod, k=2: "EJ")
    monkeypatch.setattr(N, "_chat", lambda c, m, p: json.dumps(_STORY, ensure_ascii=False))
    mod = _fake_module({1: _STORY})
    st, source = N.generate_story(object(), "m", mod, "instr", [], hint="h", max_subject_tries=3)
    assert source == "FUENTE"
    assert fetched.count("Repetido") == 1   # no se re-busco el sujeto ya descartado


# ---------- propose_subject (grounding) ----------

def test_subject_hint_existe_para_ambos():
    assert "historia" in N.SUBJECT_HINT and "misterios" in N.SUBJECT_HINT


def test_propose_subject_toma_la_primera_linea(monkeypatch):
    monkeypatch.setattr(N, "_chat", lambda c, m, p: '  "SS Waratah"  \n')
    assert N.propose_subject(object(), "m", "hint", ["x"]) == "SS Waratah"


def test_propose_subject_saca_bullets(monkeypatch):
    monkeypatch.setattr(N, "_chat", lambda c, m, p: "- Hiroo Onoda")
    assert N.propose_subject(object(), "m", "hint", []) == "Hiroo Onoda"


def test_propose_subject_mete_hint_y_avoid_en_el_prompt(monkeypatch):
    visto = {}
    def fake(c, m, p):
        visto["p"] = p
        return "Tema X"
    monkeypatch.setattr(N, "_chat", fake)
    N.propose_subject(object(), "m", "HINT_ABC", ["mary celeste"])
    assert "HINT_ABC" in visto["p"] and "mary celeste" in visto["p"].lower()
