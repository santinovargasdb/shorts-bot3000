# Grounding de autoscripts (historia/misterios) con Wikipedia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que historia/misterios generen relatos pegados a los hechos reales de Wikipedia (en vez de inventar), subiendo el yield del ~0-10% actual.

**Architecture:** Por intento: el LLM propone un sujeto → se trae el resumen de Wikipedia (es→en) → el LLM escribe el relato usando SOLO esos hechos → validación → el juez verifica contra la MISMA fuente. Reusa la infra de Wikipedia de `src/stock.py`.

**Tech Stack:** Python 3.12, `requests`, faster-whisper (no se toca), Groq vía `reddit_pipeline.rewrite` (cliente compat-OpenAI con rotación de claves), pytest.

## Global Constraints

- Entorno **Windows + PowerShell 5.1**. Correr Python con `$env:PYTHONIOENCODING='utf-8'` antes.
- Tests con `pytest` (sin red: mockear `requests`/`_chat`).
- Comentarios en **español rioplatense**, al nivel del código existente.
- **No** subir secretos ni leer el `.env`.
- Commits terminan con: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Spec: `docs/superpowers/specs/2026-10-30-grounding-autoscripts-design.md`.

---

## File Structure

- **Create** `src/wiki_facts.py` — trae el resumen (intro) de Wikipedia como texto plano (es→en). Única responsabilidad: fuente de hechos.
- **Create** `tests/test_wiki_facts.py` — tests de `wiki_facts` con `requests` mockeado.
- **Modify** `autoscripts/narrativa.py` — agrega `SUBJECT_HINT`, `propose_subject`, y vuelve `generate_story` grounded (orquesta propose→fetch→genera, devuelve `(story, source)`). Nuevo bloque `{source}` + `REGLA DURA 5` en `_PROMPT`.
- **Modify** `tests/test_autoscripts_narrativa.py` — tests de `propose_subject` + `generate_story` grounded (actualiza el test viejo de generate_story).
- **Modify** `autoscripts/judge.py` — `judge_story` acepta `source=""` y lo mete en el prompt.
- **Modify** `tests/test_autoscripts_judge.py` — test de que la fuente entra en el prompt del juez.
- **Modify** `autoscripts/build.py` — `_build_narrative` pasa `hint` a generate_story y `source` al juez.
- **Modify** `tests/test_autoscripts_build.py` (o nuevo) — test de que el wiring pasa la fuente al juez.

---

### Task 1: `src/wiki_facts.py` — resumen de Wikipedia

**Files:**
- Create: `src/wiki_facts.py`
- Test: `tests/test_wiki_facts.py`

**Interfaces:**
- Produces: `fetch_summary(subject: str, lang: str = "es", max_chars: int = 2000) -> str | None` (resumen intro en texto plano, es→en fallback, None si no hay artículo); `_extract_from_response(data: dict) -> str | None`; `_pace()`; módulo-level `requests`, `_CACHE: dict`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_wiki_facts.py
"""wiki_facts: trae el resumen (intro) de Wikipedia para grounding, es->en fallback, con cache."""
import src.wiki_facts as W


class _Resp:
    def __init__(self, json_data, status=200):
        self._j, self.status_code = json_data, status
    def json(self):
        return self._j
    def raise_for_status(self):
        if self.status_code >= 400:
            import requests
            raise requests.HTTPError()


def _page(extract):
    return {"query": {"pages": {"123": {"extract": extract}}}}


def test_extract_from_response_toma_el_extract():
    assert W._extract_from_response(_page("Hola mundo.")) == "Hola mundo."


def test_extract_from_response_vacio_es_none():
    assert W._extract_from_response(_page("")) is None
    assert W._extract_from_response({}) is None


def test_fetch_summary_es_ok(monkeypatch):
    W._CACHE.clear()
    calls = []
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get",
                        lambda url, params=None, timeout=None, headers=None:
                        (calls.append(url), _Resp(_page("Hecho real en espanol.")))[1])
    assert W.fetch_summary("Mary Celeste") == "Hecho real en espanol."
    assert "es.wikipedia.org" in calls[0]


def test_fetch_summary_cae_a_ingles(monkeypatch):
    W._CACHE.clear()
    urls = []
    def fake_get(url, params=None, timeout=None, headers=None):
        urls.append(url)
        extract = "" if "es.wikipedia" in url else "Real fact in English."
        return _Resp(_page(extract))
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get", fake_get)
    assert W.fetch_summary("Obscure subject") == "Real fact in English."
    assert any("en.wikipedia.org" in u for u in urls)


def test_fetch_summary_sin_articulo_es_none(monkeypatch):
    W._CACHE.clear()
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get", lambda *a, **k: _Resp(_page("")))
    assert W.fetch_summary("Nada de nada") is None


def test_fetch_summary_capea_a_max_chars(monkeypatch):
    W._CACHE.clear()
    monkeypatch.setattr(W, "_pace", lambda: None)
    monkeypatch.setattr(W.requests, "get", lambda *a, **k: _Resp(_page("x" * 5000)))
    assert len(W.fetch_summary("Largo", max_chars=100)) == 100
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_wiki_facts.py -q`
Expected: FAIL (ModuleNotFoundError: no module named src.wiki_facts / AttributeError).

- [ ] **Step 3: Write minimal implementation**

```python
# src/wiki_facts.py
"""Trae el resumen (intro) de un articulo de Wikipedia como texto plano, para GROUNDING de los
relatos de historia/misterios: el LLM escribe sobre hechos reales en vez de inventar. Reusa el
mismo trato de Wikipedia que src/stock.py (User-Agent, pacing anti-429, reintentos, cache)."""
from __future__ import annotations

import time

import requests

_UA = {"User-Agent": "shorts-bot/1.0 (https://github.com/santinovargasdb/shorts-bot3000)"}
_API = "https://{lang}.wikipedia.org/w/api.php"
_MIN_INTERVAL = 0.4          # seg minimos entre pedidos (cortesia anti-429)
_last_req = [0.0]
_CACHE: dict = {}            # subject -> resumen (o None)


def _pace() -> None:
    elapsed = time.monotonic() - _last_req[0]
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_req[0] = time.monotonic()


def _extract_from_response(data: dict) -> str | None:
    """Texto del intro (prop=extracts) de la 1a pagina, o None si vacio."""
    pages = (data or {}).get("query", {}).get("pages", {})
    for pg in pages.values():
        extract = (pg.get("extract") or "").strip()
        if extract:
            return extract
    return None


def _fetch_one(subject: str, lang: str) -> str | None:
    """Pide el intro de Wikipedia en UN idioma. None si no hay articulo/extract o si falla."""
    params = {"action": "query", "format": "json", "prop": "extracts",
              "exintro": 1, "explaintext": 1, "redirects": 1,
              "generator": "search", "gsrsearch": subject, "gsrlimit": 1}
    url = _API.format(lang=lang)
    for attempt in range(4):
        try:
            _pace()
            r = requests.get(url, params=params, timeout=30, headers=_UA)
            if r.status_code == 429:
                time.sleep(2.0 * (attempt + 1)); continue
            r.raise_for_status()
            return _extract_from_response(r.json())
        except requests.RequestException:
            time.sleep(1.0 * (attempt + 1))
    return None


def fetch_summary(subject: str, lang: str = "es", max_chars: int = 2000) -> str | None:
    """Resumen (intro) de Wikipedia para `subject`, texto plano capeado a `max_chars`. Prueba
    `lang` (es por defecto) y cae a ingles. None si no hay articulo en ninguno. Cachea el resultado."""
    subject = (subject or "").strip()
    if not subject:
        return None
    if subject in _CACHE:
        return _CACHE[subject]
    result = _fetch_one(subject, lang)
    if not result and lang != "en":
        result = _fetch_one(subject, "en")
    if result:
        result = result[:max_chars].strip()
    _CACHE[subject] = result
    return result
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_wiki_facts.py -q`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add src/wiki_facts.py tests/test_wiki_facts.py
git commit -m "feat(autoscripts): wiki_facts trae el resumen de Wikipedia (es->en) para grounding"
```

---

### Task 2: `narrativa.propose_subject` + `SUBJECT_HINT`

**Files:**
- Modify: `autoscripts/narrativa.py` (agregar `SUBJECT_HINT`, `_PROMPT_SUBJECT`, `propose_subject`)
- Test: `tests/test_autoscripts_narrativa.py` (agregar tests)

**Interfaces:**
- Consumes: `narrativa._chat` (ya existe, de reddit_pipeline.rewrite).
- Produces: `SUBJECT_HINT: dict[str,str]` (claves "historia","misterios"); `propose_subject(client, model, hint: str, avoid_subjects: list) -> str` (nombre del sujeto, 1 linea).

- [ ] **Step 1: Write the failing test** (agregar al final de `tests/test_autoscripts_narrativa.py`)

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_narrativa.py -k "propose_subject or subject_hint" -q`
Expected: FAIL (AttributeError: module has no attribute 'SUBJECT_HINT'/'propose_subject').

- [ ] **Step 3: Write minimal implementation** (agregar en `autoscripts/narrativa.py`, después del dict `INSTR`)

```python
# Pista corta del tipo de SUJETO a proponer para el grounding (paso 1: antes de traer los hechos).
SUBJECT_HINT = {
    "historia": "El sujeto es un hecho, personaje o episodio HISTORICO real y asombroso.",
    "misterios": ("El sujeto es un MISTERIO o caso real: una desaparicion, un enigma sin resolver, "
                  "un fenomeno inexplicable."),
}

_PROMPT_SUBJECT = """Sos el editor de un canal de shorts narrativos. {hint}

Proponé UN solo sujeto REAL y bien documentado para el proximo episodio: un nombre propio que tenga
articulo en Wikipedia (una persona, un hecho, un caso, un lugar). Ni los cuatro o cinco de siempre,
ni algo tan oscuro que no haya info. NO repitas estos ya usados: {avoid}.

Respondé SOLO el nombre del sujeto, en una sola linea, sin comillas ni explicacion."""


def propose_subject(client, model, hint: str, avoid_subjects: list) -> str:
    """Paso 1 del grounding: el LLM propone un sujeto (nombre propio) para buscar en Wikipedia."""
    prompt = _PROMPT_SUBJECT.format(
        hint=hint, avoid="; ".join(sorted(avoid_subjects)[:60]) or "(ninguno)")
    raw = _chat(client, model, prompt)
    for line in (raw or "").splitlines():
        s = line.strip().strip('"\'').lstrip("-*0123456789. ").strip()
        if s:
            return s[:80]
    raise ValueError("propose_subject: respuesta vacia")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_narrativa.py -k "propose_subject or subject_hint" -q`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add autoscripts/narrativa.py tests/test_autoscripts_narrativa.py
git commit -m "feat(autoscripts): propose_subject + SUBJECT_HINT (paso 1 del grounding)"
```

---

### Task 3: `narrativa.generate_story` grounded

**Files:**
- Modify: `autoscripts/narrativa.py` (agregar bloque `{source}` + `REGLA DURA 5` a `_PROMPT`; reescribir `generate_story`)
- Test: `tests/test_autoscripts_narrativa.py` (nuevos tests + actualizar el viejo `test_generate_story_mete_fewshot_y_avoid_en_el_prompt`)

**Interfaces:**
- Consumes: `propose_subject` (Task 2), `src.wiki_facts.fetch_summary` (Task 1), `_fewshot`, `parse_story`, `validate_story`, `is_duplicate`, `_PROMPT`.
- Produces: `generate_story(client, model, series_module, instr, avoid_subjects, n_segs=5, hint="", max_subject_tries=3) -> tuple[dict, str]` (devuelve `(story, source)`; `raise RuntimeError` si no encuentra sujeto con articulo).

- [ ] **Step 1: Write the failing test** — reemplazar el test viejo `test_generate_story_mete_fewshot_y_avoid_en_el_prompt` por estos (en `tests/test_autoscripts_narrativa.py`):

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_narrativa.py -k "generate_story" -q`
Expected: FAIL (generate_story todavia devuelve dict, no tupla; no llama a propose_subject/fetch_summary).

- [ ] **Step 3: Write minimal implementation**

Primero, en `autoscripts/narrativa.py`, en `_PROMPT`: (a) agregar el bloque de fuente justo despues de la linea `{instr}`, y (b) agregar `REGLA DURA 5` justo despues de `REGLA DURA 4`.

(a) Reemplazar:
```
{instr}

Escribí UNO NUEVO.
```
por:
```
{instr}

HECHOS REALES DEL CASO (de Wikipedia, es tu UNICA fuente de verdad; el sujeto ya esta decidido, es el de la fuente):
\"\"\"{source}\"\"\"

Escribí UNO NUEVO.
```

(b) Reemplazar (el final del bloque de REGLA DURA 4):
```
relato, jamás en la primera frase.

El relato completo
```
por:
```
relato, jamás en la primera frase.

REGLA DURA 5 (grounding): escribí el relato usando SOLO lo que dicen los HECHOS de arriba. NO agregues
ninguna fecha, cifra, nombre o evento que no este en esa fuente. Si la fuente no da un dato, conta el
relato sin el; jamas lo inventes.

El relato completo
```

Después, reescribir `generate_story`:
```python
def generate_story(client, model, series_module, instr: str, avoid_subjects: list,
                   n_segs: int = 5, hint: str = "", max_subject_tries: int = 3) -> tuple[dict, str]:
    """Grounded: propone un sujeto, trae sus hechos de Wikipedia y escribe el relato pegado a ellos.
    Devuelve (story, source). RuntimeError si no encuentra un sujeto con articulo tras varios intentos."""
    from src.wiki_facts import fetch_summary
    used = set(avoid_subjects)
    for _ in range(max_subject_tries):
        subject = propose_subject(client, model, hint, avoid_subjects)
        if is_duplicate(subject, used):
            continue
        source = fetch_summary(subject)
        if not source:
            continue                       # sin articulo -> probar otro sujeto
        prompt = _PROMPT.format(examples=_fewshot(series_module), instr=instr, n=n_segs,
                                avoid="; ".join(sorted(avoid_subjects)[:60]) or "(ninguno)",
                                source=source)
        st = parse_story(_chat(client, model, prompt))
        validate_story(st)
        return st, source
    raise RuntimeError("no se encontro un sujeto con articulo de Wikipedia")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_narrativa.py -q`
Expected: PASS (todos los de narrativa, incluidos los nuevos de generate_story).

- [ ] **Step 5: Commit**

```bash
git add autoscripts/narrativa.py tests/test_autoscripts_narrativa.py
git commit -m "feat(autoscripts): generate_story grounded (propone sujeto -> Wikipedia -> relato pegado a la fuente)"
```

---

### Task 4: `judge.judge_story` grounded

**Files:**
- Modify: `autoscripts/judge.py` (agregar `source=""` a `judge_story`, meterla en `_PROMPT_STORY`)
- Test: `tests/test_autoscripts_judge.py` (agregar tests)

**Interfaces:**
- Produces: `judge_story(client, model, story: dict, instr: str, source: str = "") -> dict` (igual que antes pero mete la fuente en el prompt si viene).

- [ ] **Step 1: Write the failing test** (agregar a `tests/test_autoscripts_judge.py`)

```python
def test_judge_story_mete_la_fuente(monkeypatch):
    import autoscripts.judge as J
    visto = {}
    def fake(c, m, p):
        visto["p"] = p
        return '{"ok": true, "problema": ""}'
    monkeypatch.setattr(J, "_chat", fake)
    story = {"titulo": "T", "segments": [{"text": "algo"}]}
    J.judge_story(object(), "m", story, "instr del juez", source="FUENTE_123")
    assert "FUENTE_123" in visto["p"]


def test_judge_story_sin_fuente_sigue_andando(monkeypatch):
    import autoscripts.judge as J
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"ok": false, "problema": "mal"}')
    story = {"titulo": "T", "segments": [{"text": "algo"}]}
    v = J.judge_story(object(), "m", story, "instr")       # sin source (backward-compat)
    assert v["ok"] is False and v["problema"] == "mal"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_judge.py -k "fuente or sigue_andando" -q`
Expected: FAIL (`judge_story` no acepta `source` / no mete la fuente).

- [ ] **Step 3: Write minimal implementation** — en `autoscripts/judge.py`, reemplazar `_PROMPT_STORY` y `judge_story`:

```python
_PROMPT_STORY = """Sos un verificador ESTRICTO y escéptico. Te paso un relato que va a publicarse
como verdad. {instr}
{source_block}
Ante la MÍNIMA duda, ok=false (es peor publicar algo falso que descartar un episodio).

Título: {titulo}
Relato:
{relato}

Respondé SOLO JSON: {{"ok": true/false, "problema": "qué falla y por qué, o vacío"}}"""


def judge_story(client, model, story: dict, instr: str, source: str = "") -> dict:
    relato = "\n".join(f"- {s['text']}" for s in story.get("segments", []))
    source_block = ""
    if source:
        source_block = ('\nVerificá el relato CONTRA esta fuente (los hechos reales del caso): rechazá '
                        'lo que la contradiga o lo que agregue datos que no esten en ella.\n'
                        f'"""{source}"""\n')
    prompt = _PROMPT_STORY.format(instr=instr, source_block=source_block,
                                  titulo=story.get("titulo", ""), relato=relato)
    return parse_verdict(_chat(client, model, prompt))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_judge.py -q`
Expected: PASS (todos los del juez).

- [ ] **Step 5: Commit**

```bash
git add autoscripts/judge.py tests/test_autoscripts_judge.py
git commit -m "feat(autoscripts): el juez verifica el relato contra la fuente de Wikipedia (grounding)"
```

---

### Task 5: Wiring en `build._build_narrative`

**Files:**
- Modify: `autoscripts/build.py` (`_build_narrative`: pasar `hint` a generate_story y `source` al juez)
- Test: `tests/test_autoscripts_build.py` (agregar test del wiring)

**Interfaces:**
- Consumes: `narrativa.generate_story` (devuelve `(st, source)`), `narrativa.SUBJECT_HINT`, `judge.judge_story(..., source=...)`.

- [ ] **Step 1: Write the failing test** (agregar a `tests/test_autoscripts_build.py`)

```python
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
    assert cap["source"] == "FUENTE_Q"      # la fuente llego al juez
```

- [ ] **Step 2: Run test to verify it fails**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_build.py -k "pasa_la_fuente" -q`
Expected: FAIL (`_build_narrative` todavia llama generate_story esperando un dict y no pasa source al juez).

- [ ] **Step 3: Write minimal implementation** — en `autoscripts/build.py`, dentro de `_build_narrative`, reemplazar:

```python
    instr, judge_instr = narrativa.INSTR[channel], narrativa.JUDGE_INSTR[channel]
    client, model = build_client(), model_name()
    made = 0
    for _ in range(n):
        used = narrativa.used_subjects(channel, series_module)
        try:
            st = narrativa.generate_story(client, model, series_module, instr, sorted(used))
            if narrativa.is_duplicate(st["topic"], used):
                print(f"[{channel}] descartado: sujeto repetido ({st['topic']})")
                continue
            verdict = judge.judge_story(client, model, st, judge_instr)
```

por:

```python
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest tests/test_autoscripts_build.py -q`
Expected: PASS.

- [ ] **Step 5: Run the full suite + commit**

Run: `$env:PYTHONIOENCODING='utf-8'; python -m pytest -q -p no:cacheprovider`
Expected: all green.

```bash
git add autoscripts/build.py tests/test_autoscripts_build.py
git commit -m "feat(autoscripts): _build_narrative cablea el grounding (hint + source al juez)"
git push origin main
```

---

### Task 6: Verificación end-to-end (empírica, no TDD)

**Files:** ninguno (solo correr).

- [ ] **Step 1: Correr builds reales y medir yield**

Run:
```powershell
$env:PYTHONIOENCODING='utf-8'
python -m autoscripts.build historia 10
python -m autoscripts.build misterios 10
```
Expected: yield **bastante mayor** que el 0/10 de hoy (el relato ahora sale de hechos de Wikipedia). El cuello de tokens lo cubre la rotacion de claves (no deberia haber 429 si hay presupuesto).

- [ ] **Step 2: Revisar 1-2 aprobados a mano**

Mirar en `autoscripts/<canal>.sqlite` (tabla `episodes`, status='approved') que el relato sea fiel a la fuente y arranque in-medias-res. Si el yield sigue bajo o hay un patron de rechazo nuevo, abrir systematic-debugging antes de seguir tocando.

- [ ] **Step 3: Anotar el resultado en memoria** (`autoscripts-judge-gap.md`): yield con grounding vs sin grounding.
