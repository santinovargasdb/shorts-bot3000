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


# ---------- generate_story ----------

def test_generate_story_mete_fewshot_y_avoid_en_el_prompt(monkeypatch):
    visto = {}

    def fake_chat(c, m, prompt):
        visto["p"] = prompt
        return json.dumps(_STORY, ensure_ascii=False)

    monkeypatch.setattr(N, "_fewshot", lambda mod, k=2: "EJEMPLO_NARRATIVO_XYZ")
    monkeypatch.setattr(N, "_chat", fake_chat)
    mod = _fake_module({1: _STORY})
    st = N.generate_story(client=object(), model="m", series_module=mod,
                          instr="instrucciones de historia", avoid_subjects=["mary celeste"])
    assert st["topic"] == "marinero dos naufragios"
    assert "EJEMPLO_NARRATIVO_XYZ" in visto["p"]
    assert "mary celeste" in visto["p"].lower()
    assert "instrucciones de historia" in visto["p"]
