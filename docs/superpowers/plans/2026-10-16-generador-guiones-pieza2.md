# Generador de guiones LLM (Pieza 2, piloto faceless) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un generador LLM que escribe episodios nuevos de faceless (datos de cultura general) en el JSON exacto de `series_data`, con dedup de temas y un juez factual que reemplaza el QA humano, de modo que faceless se auto-rellene (Pieza 1) de verdad.

**Architecture:** Paquete nuevo `autoscripts/` (espejo de `reddit_pipeline/`), reusando el cliente Groq de `reddit_pipeline.rewrite`. `build` orquesta: generate (LLM) → validar esquema (gratis) → dedup de temas → judge (LLM fact-check) → guardar `approved` en sqlite. `series_data` mergea los aprobados (seq>45) sin tocar los 45 hardcodeados. El autobuild lo dispara por `refill_script`.

**Tech Stack:** Python 3 (stdlib: sqlite3, json, re, importlib) + el SDK `openai` (ya usado por reddit_pipeline, apuntando a Groq). pytest con el LLM mockeado.

## Global Constraints

- Reusa la Groq key de `.env` vía `reddit_pipeline.rewrite.build_client()` + `model_name()`; NUNCA hardcodear keys.
- Piloto SOLO faceless. historia/misterios siguen dando `SKIP` en el autobuild (no implementar).
- NO tocar los 45 episodios hardcodeados de `series_data.PARTS` ni `daily_post.py`.
- Los generados se keyean con **seq > max(PARTS hardcodeado)** (46+); keys contiguas (sin huecos) para que `daily_post.next_part` no se trabe.
- El episodio generado debe tener el JSON EXACTO de `series_data`: `{pregunta, resumen, segments:[{kind:"fact",text,imgs:[t1,t2]}, {kind:"title",text:TITULO_PANTALLA}, ...]}`. Números SIEMPRE en palabras (regex rechaza dígitos sueltos en `text`).
- Juez: **ante la duda, RECHAZAR**. Aprueba el episodio solo si TODOS los datos pasan.
- Groq 429 → levantar `autobuild.errors.QuotaExhausted` (severidad QUOTA en el supervisor; reusa la Pieza 1).
- Solo `approved` entra al merge; nada publica (fail-safe).

## File Structure

- Create `autoscripts/__init__.py`
- Create `autoscripts/db.py` — sqlite store por canal + `approved_episodes` + `used_topics_db`
- Create `autoscripts/topics.py` — temas de los hardcodeados + `dedup`
- Create `autoscripts/generate.py` — prompt + `parse_episode` + `validate_schema`
- Create `autoscripts/judge.py` — prompt + `parse_verdict`
- Create `autoscripts/build.py` — orquestación + `assemble_segments` + `build` + CLI + detección de 429
- Modify `series_data.py` — append `_merge_generados()`
- Modify `autobuild/refillers.py` — `refill_script` dispatch de faceless
- Modify `autobuild/config.py` — tunear la entrada `faceless`
- Tests: `tests/test_autoscripts_db.py`, `tests/test_autoscripts_topics.py`, `tests/test_autoscripts_generate.py`, `tests/test_autoscripts_judge.py`, `tests/test_autoscripts_build.py`, `tests/test_series_data_merge.py`, y update `tests/test_autobuild_refillers.py`.

---

### Task 1: Store sqlite (`autoscripts/db.py`)

**Files:**
- Create: `autoscripts/__init__.py`
- Create: `autoscripts/db.py`
- Test: `tests/test_autoscripts_db.py`

**Interfaces:**
- Produces:
  - `autoscripts.db.connect(path) -> sqlite3.Connection`
  - `autoscripts.db.DB_PATH(channel: str) -> pathlib.Path` (= ROOT/autoscripts/{channel}.sqlite)
  - `autoscripts.db.add_episode(conn, *, episode: dict, topic_keys: list[str], status="pending", qc_note="") -> int`
  - `autoscripts.db.by_status(conn, status: str) -> list[dict]` (cada dict: seq, episode(dict), topic_keys(list), status, qc_note)
  - `autoscripts.db.set_status(conn, seq: int, status: str) -> None`
  - `autoscripts.db.approved_episodes(channel: str) -> list[dict]` (episodios dict en orden de seq; [] si no hay DB)
  - `autoscripts.db.used_topics_db(channel: str) -> set[str]` (topic_keys de approved)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autoscripts_db.py
import autoscripts.db as db


def test_add_and_by_status(tmp_path):
    conn = db.connect(tmp_path / "faceless.sqlite")
    ep = {"pregunta": "¿?", "resumen": "r", "segments": [{"kind": "fact", "text": "t", "imgs": ["a", "b"]}]}
    seq = db.add_episode(conn, episode=ep, topic_keys=["tema uno"], status="approved")
    assert seq == 1
    rows = db.by_status(conn, "approved")
    assert len(rows) == 1
    assert rows[0]["episode"] == ep and rows[0]["topic_keys"] == ["tema uno"]


def test_set_status_and_used_topics(tmp_path, monkeypatch):
    path = tmp_path / "faceless.sqlite"
    monkeypatch.setattr(db, "DB_PATH", lambda ch: path)
    conn = db.connect(path)
    db.add_episode(conn, episode={"x": 1}, topic_keys=["t1", "t2"], status="approved")
    s = db.add_episode(conn, episode={"x": 2}, topic_keys=["t3"], status="pending")
    db.set_status(conn, s, "rejected")
    conn.close()
    assert db.used_topics_db("faceless") == {"t1", "t2"}        # solo approved
    assert [e["x"] for e in db.approved_episodes("faceless")] == [1]


def test_approved_episodes_sin_db_devuelve_vacio(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "nope.sqlite")
    assert db.approved_episodes("faceless") == []
    assert db.used_topics_db("faceless") == set()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autoscripts_db.py -v`
Expected: FAIL `ModuleNotFoundError: No module named 'autoscripts'`

- [ ] **Step 3: Write minimal implementation**

```python
# autoscripts/__init__.py
# Generador LLM de guiones (Pieza 2, piloto faceless). Ver docs/.../2026-10-16-generador-guiones-pieza2-design.md
```

```python
# autoscripts/db.py
"""Store sqlite de episodios generados por canal: autoscripts/<canal>.sqlite. Guarda el episodio
como JSON + sus topic_keys (para dedup). Solo 'approved' se mergea en la serie."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS episodes (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_json TEXT NOT NULL,
    topic_keys TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    qc_note TEXT,
    created_utc TEXT
);
"""


def DB_PATH(channel: str) -> Path:
    return ROOT / "autoscripts" / f"{channel}.sqlite"


def connect(path) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    conn.commit()
    return conn


def add_episode(conn, *, episode: dict, topic_keys: list, status: str = "pending",
                qc_note: str = "") -> int:
    cur = conn.execute(
        "INSERT INTO episodes (episode_json, topic_keys, status, qc_note, created_utc) "
        "VALUES (?, ?, ?, ?, datetime('now'))",
        (json.dumps(episode, ensure_ascii=False), json.dumps(topic_keys, ensure_ascii=False),
         status, qc_note))
    conn.commit()
    return int(cur.lastrowid)


def _row(r) -> dict:
    return {"seq": r["seq"], "episode": json.loads(r["episode_json"]),
            "topic_keys": json.loads(r["topic_keys"]), "status": r["status"],
            "qc_note": r["qc_note"]}


def by_status(conn, status: str) -> list:
    return [_row(r) for r in conn.execute(
        "SELECT * FROM episodes WHERE status = ? ORDER BY seq ASC", (status,))]


def set_status(conn, seq: int, status: str) -> None:
    conn.execute("UPDATE episodes SET status = ? WHERE seq = ?", (status, seq))
    conn.commit()


def approved_episodes(channel: str) -> list:
    path = DB_PATH(channel)
    if not path.exists():
        return []
    conn = connect(path)
    try:
        return [r["episode"] for r in by_status(conn, "approved")]
    finally:
        conn.close()


def used_topics_db(channel: str) -> set:
    path = DB_PATH(channel)
    if not path.exists():
        return set()
    conn = connect(path)
    try:
        out = set()
        for r in by_status(conn, "approved"):
            out.update(r["topic_keys"])
        return out
    finally:
        conn.close()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autoscripts_db.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add autoscripts/__init__.py autoscripts/db.py tests/test_autoscripts_db.py
git commit -m "feat(autoscripts): store sqlite de episodios generados por canal"
```

---

### Task 2: Dedup de temas (`autoscripts/topics.py`)

**Files:**
- Create: `autoscripts/topics.py`
- Test: `tests/test_autoscripts_topics.py`

**Interfaces:**
- Consumes: `autoscripts.db.used_topics_db`; `series_data.PARTS`.
- Produces:
  - `autoscripts.topics.norm(s: str) -> str` (lower + strip + colapsa espacios)
  - `autoscripts.topics.hardcoded_topics() -> set[str]` (temas de los 45 de faceless, derivados del 1er img de cada fact)
  - `autoscripts.topics.used_topics(channel: str) -> set[str]` (hardcoded ∪ used_topics_db)
  - `autoscripts.topics.dedup(datos: list[dict], used: set[str]) -> list[dict]` (descarta datos con `norm(topic)` en used)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autoscripts_topics.py
import autoscripts.topics as T


def test_norm():
    assert T.norm("  Pulpo  Sangre  Azul ") == "pulpo sangre azul"


def test_dedup_descarta_temas_usados():
    datos = [{"text": "a", "imgs": ["x", "y"], "topic": "Tema Nuevo"},
             {"text": "b", "imgs": ["p", "q"], "topic": "Pulpo Sangre Azul"}]
    used = {"pulpo sangre azul"}
    out = T.dedup(datos, used)
    assert len(out) == 1 and out[0]["topic"] == "Tema Nuevo"


def test_hardcoded_topics_incluye_de_los_45(monkeypatch):
    import series_data
    # un PART de prueba con un fact cuyo 1er img es "octopus"
    monkeypatch.setattr(series_data, "PARTS", {
        1: {"segments": [{"kind": "fact", "text": "t", "imgs": ["octopus", "x"]},
                         {"kind": "title", "text": "T"}]}})
    assert "octopus" in T.hardcoded_topics()


def test_used_topics_une_hardcoded_y_db(monkeypatch):
    import autoscripts.db as db
    monkeypatch.setattr(T, "hardcoded_topics", lambda: {"octopus"})
    monkeypatch.setattr(db, "used_topics_db", lambda ch: {"tema db"})
    assert T.used_topics("faceless") == {"octopus", "tema db"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autoscripts_topics.py -v`
Expected: FAIL `ModuleNotFoundError: No module named 'autoscripts.topics'`

- [ ] **Step 3: Write minimal implementation**

```python
# autoscripts/topics.py
"""Dedup de temas: evita que el generador repita datos ya cubiertos (hardcodeados o generados).
El tema de un dato generado viene en su campo 'topic'; el de los hardcodeados se deriva del
primer término de imagen de cada fact (proxy razonable del sujeto)."""
from __future__ import annotations

import re


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def hardcoded_topics() -> set:
    import series_data
    out = set()
    for part in series_data.PARTS.values():
        for seg in part.get("segments", []):
            if seg.get("kind") == "fact" and seg.get("imgs"):
                out.add(norm(seg["imgs"][0]))
    return out


def used_topics(channel: str) -> set:
    from autoscripts import db
    return hardcoded_topics() | db.used_topics_db(channel)


def dedup(datos: list, used: set) -> list:
    return [d for d in datos if norm(d.get("topic", "")) not in used]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autoscripts_topics.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add autoscripts/topics.py tests/test_autoscripts_topics.py
git commit -m "feat(autoscripts): dedup de temas (hardcodeados + generados)"
```

---

### Task 3: Generador LLM (`autoscripts/generate.py`)

**Files:**
- Create: `autoscripts/generate.py`
- Test: `tests/test_autoscripts_generate.py`

**Interfaces:**
- Consumes: `reddit_pipeline.rewrite.build_client`, `model_name`, `_chat` (cliente Groq, compat-OpenAI).
- Produces:
  - `autoscripts.generate.parse_episode(raw: str) -> dict` (extrae el JSON del LLM; claves: pregunta, resumen, datos)
  - `autoscripts.generate.validate_schema(ep: dict) -> None` (lanza ValueError si está mal; chequea datos, imgs, y dígitos sueltos)
  - `autoscripts.generate.generate_episode(client, model, avoid_topics: list[str], n_datos: int = 6) -> dict` (llama al LLM y devuelve `{pregunta, resumen, datos:[{text, imgs:[t1,t2], topic}]}` ya parseado+validado)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autoscripts_generate.py
import pytest
import autoscripts.generate as g

_OK = {
    "pregunta": "¿Qué dato sabés vos?",
    "resumen": "cinco datos curiosos",
    "datos": [
        {"text": "El pulpo tiene tres corazones y sangre azul por el cobre.", "imgs": ["octopus", "octopus underwater"], "topic": "pulpo sangre azul"},
        {"text": "La miel nunca se echa a perder: casi no tiene agua.", "imgs": ["honey", "honeycomb"], "topic": "miel no caduca"},
    ],
}


def test_parse_episode_extrae_json_con_fences():
    raw = "```json\n" + __import__("json").dumps(_OK, ensure_ascii=False) + "\n```"
    ep = g.parse_episode(raw)
    assert ep["pregunta"].startswith("¿") and len(ep["datos"]) == 2


def test_validate_schema_ok():
    g.validate_schema(_OK)   # no levanta


def test_validate_schema_rechaza_digitos_sueltos():
    bad = {"pregunta": "¿?", "resumen": "r",
           "datos": [{"text": "El pulpo tiene 3 corazones.", "imgs": ["a", "b"], "topic": "pulpo"}]}
    with pytest.raises(ValueError):
        g.validate_schema(bad)


def test_validate_schema_rechaza_imgs_incompletas():
    bad = {"pregunta": "¿?", "resumen": "r",
           "datos": [{"text": "texto sin numeros.", "imgs": ["solo uno"], "topic": "x"}]}
    with pytest.raises(ValueError):
        g.validate_schema(bad)


def test_generate_episode_usa_el_cliente(monkeypatch):
    import json
    monkeypatch.setattr(g, "_chat", lambda client, model, prompt: json.dumps(_OK, ensure_ascii=False))
    ep = g.generate_episode(client=object(), model="m", avoid_topics=["algo"])
    assert ep["datos"][0]["topic"] == "pulpo sangre azul"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autoscripts_generate.py -v`
Expected: FAIL `ModuleNotFoundError: No module named 'autoscripts.generate'`

- [ ] **Step 3: Write minimal implementation**

```python
# autoscripts/generate.py
"""Genera UN episodio de faceless (datos de cultura general) con el LLM (Groq). Devuelve datos
'crudos' ({text, imgs, topic}); build.py los ensambla al formato segments de series_data."""
from __future__ import annotations

import json
import re

from reddit_pipeline.rewrite import _chat  # cliente compat-OpenAI (reuso)

_PROMPT = """Sos guionista del canal "Datos para parecer inteligente" (shorts de cultura general en
ESPAÑOL NEUTRO). Devolvé SOLO un objeto JSON con claves exactas: "pregunta", "resumen", "datos".

- "datos": una lista de {n} datos curiosos, verdaderos y verificables. Cada dato es un objeto con:
  - "text": el dato CON CONTEXTO (por qué/cómo), 2-3 frases, hablado y natural. NÚMEROS SIEMPRE EN
    PALABRAS (ej. "tres corazones", no "3"). Nada de dígitos.
  - "imgs": EXACTAMENTE 2 términos de búsqueda en inglés para Pixabay (ej. ["octopus","octopus underwater"]).
  - "topic": 2-4 palabras que nombran el sujeto del dato (ej. "pulpo sangre azul").
- "pregunta": una pregunta corta a comentarios (ej. "¿Qué dato sabés vos?").
- "resumen": UNA línea que lista los datos, para la descripción.

NO repitas estos temas ya usados: {avoid}

Datos ciertos y comprobables; si no estás seguro de uno, poné otro. Devolvé SOLO el JSON."""

_REQUIRED = ("pregunta", "resumen", "datos")


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


def generate_episode(client, model, avoid_topics: list, n_datos: int = 6) -> dict:
    prompt = _PROMPT.format(n=n_datos, avoid="; ".join(sorted(avoid_topics)[:60]) or "(ninguno)")
    ep = parse_episode(_chat(client, model, prompt))
    validate_schema(ep)
    return ep
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autoscripts_generate.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add autoscripts/generate.py tests/test_autoscripts_generate.py
git commit -m "feat(autoscripts): generador LLM de episodios faceless + validación de esquema"
```

---

### Task 4: Juez factual (`autoscripts/judge.py`)

**Files:**
- Create: `autoscripts/judge.py`
- Test: `tests/test_autoscripts_judge.py`

**Interfaces:**
- Consumes: `reddit_pipeline.rewrite._chat`.
- Produces:
  - `autoscripts.judge.parse_verdict(raw: str) -> dict` (`{ok: bool, problema: str}`)
  - `autoscripts.judge.judge_episode(client, model, datos: list[dict]) -> dict` (`{ok, problema}`; ok=True solo si TODOS los datos son ciertos)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autoscripts_judge.py
import json
import autoscripts.judge as J

_DATOS = [{"text": "El pulpo tiene sangre azul.", "topic": "pulpo"},
          {"text": "La Luna está hecha de queso.", "topic": "luna"}]


def test_parse_verdict():
    assert J.parse_verdict('{"ok": false, "problema": "la Luna no es de queso"}') == \
        {"ok": False, "problema": "la Luna no es de queso"}


def test_judge_rechaza_si_hay_dato_falso(monkeypatch):
    monkeypatch.setattr(J, "_chat",
                        lambda c, m, p: json.dumps({"ok": False, "problema": "Luna de queso es falso"}))
    v = J.judge_episode(object(), "m", _DATOS)
    assert v["ok"] is False and "Luna" in v["problema"]


def test_judge_aprueba_si_todos_ok(monkeypatch):
    monkeypatch.setattr(J, "_chat", lambda c, m, p: '{"ok": true, "problema": ""}')
    assert J.judge_episode(object(), "m", _DATOS)["ok"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autoscripts_judge.py -v`
Expected: FAIL `ModuleNotFoundError: No module named 'autoscripts.judge'`

- [ ] **Step 3: Write minimal implementation**

```python
# autoscripts/judge.py
"""Juez factual (2ª pasada LLM, adversarial). Verifica que TODOS los datos de un episodio sean
ciertos. Sesgo: ante la duda, rechazar. Reemplaza el QA humano del canal."""
from __future__ import annotations

import json

from reddit_pipeline.rewrite import _chat

_PROMPT = """Sos un verificador de datos ESTRICTO y escéptico. Tu trabajo es ENCONTRAR el dato
falso o engañoso. Te paso una lista de datos de cultura general que van a publicarse como verdad.

Decí si TODOS son verificablemente CIERTOS y no engañosos. Si UNO SOLO es falso, exagerado, un mito,
o dudoso -> ok=false. Ante la MÍNIMA duda, ok=false (es peor publicar algo falso que descartar).

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autoscripts_judge.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add autoscripts/judge.py tests/test_autoscripts_judge.py
git commit -m "feat(autoscripts): juez factual adversarial (rechaza si algún dato es dudoso)"
```

---

### Task 5: Orquestación + ensamblado + CLI (`autoscripts/build.py`)

**Files:**
- Create: `autoscripts/build.py`
- Test: `tests/test_autoscripts_build.py`

**Interfaces:**
- Consumes: `autoscripts.db`, `autoscripts.topics`, `autoscripts.generate`, `autoscripts.judge`,
  `reddit_pipeline.rewrite.build_client/model_name`, `series_data.TITULO_PANTALLA`, `autobuild.errors.QuotaExhausted`.
- Produces:
  - `autoscripts.build.assemble_segments(datos: list[dict]) -> list[dict]` (datos crudos → segments con `_T` tras el 1er dato)
  - `autoscripts.build.MIN_DATOS = 5`
  - `autoscripts.build.build(channel: str, n: int = 3) -> int` (genera/juzga/guarda hasta n intentos; devuelve # aprobados; levanta QuotaExhausted en 429 de Groq)

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autoscripts_build.py -v`
Expected: FAIL `ModuleNotFoundError: No module named 'autoscripts.build'`

- [ ] **Step 3: Write minimal implementation**

```python
# autoscripts/build.py
"""Orquesta la generación de episodios de faceless: generate -> validar -> dedup -> judge ->
guardar approved. Ensambla los datos crudos al formato segments de series_data. 429 de Groq ->
QuotaExhausted (el autobuild lo marca QUOTA y reanuda cuando la cuota vuelve)."""
from __future__ import annotations

import sys

from reddit_pipeline.rewrite import build_client, model_name
from autoscripts import db, generate, judge, topics
from autobuild.errors import QuotaExhausted

MIN_DATOS = 5


def assemble_segments(datos: list) -> list:
    import series_data
    segs = [{"kind": "fact", "text": datos[0]["text"], "imgs": list(datos[0]["imgs"])}]
    segs.append({"kind": "title", "text": series_data.TITULO_PANTALLA})
    for d in datos[1:]:
        segs.append({"kind": "fact", "text": d["text"], "imgs": list(d["imgs"])})
    return segs


def _is_quota(exc: Exception) -> bool:
    s = str(exc).lower()
    return getattr(exc, "status_code", None) == 429 or "429" in s or "rate limit" in s or "quota" in s


def build(channel: str, n: int = 3) -> int:
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autoscripts_build.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add autoscripts/build.py tests/test_autoscripts_build.py
git commit -m "feat(autoscripts): orquestación generate->dedup->judge->store + ensamblado + CLI"
```

---

### Task 6: Merge en series_data

**Files:**
- Modify: `series_data.py` (append al final del archivo)
- Test: `tests/test_series_data_merge.py`

**Interfaces:**
- Consumes: `autoscripts.db.approved_episodes`.
- Produces: `series_data.PARTS` incluye los generados aprobados con key `max(hardcodeados)+i`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_series_data_merge.py
import importlib
import autoscripts.db as adb


def test_merge_agrega_generados_con_seq_mayor_a_45(monkeypatch):
    ep = {"pregunta": "¿?", "resumen": "r",
          "segments": [{"kind": "fact", "text": "dato nuevo sin numeros.", "imgs": ["a", "b"]},
                       {"kind": "title", "text": "Datos para parecer más inteligente."}]}
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [ep])
    import series_data
    importlib.reload(series_data)                 # re-corre el merge con el mock
    base = max(k for k in series_data.PARTS if k <= 45)
    assert series_data.PARTS[base + 1] == ep      # generado mergeado tras el último hardcodeado
    assert base == 45 or base >= 1                # hay hardcodeados


def test_merge_no_rompe_sin_generados(monkeypatch):
    monkeypatch.setattr(adb, "approved_episodes", lambda ch: [])
    import series_data
    importlib.reload(series_data)
    assert 1 in series_data.PARTS                 # los hardcodeados siguen
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_series_data_merge.py -v`
Expected: FAIL (el generado no aparece: `series_data` todavía no mergea)

- [ ] **Step 3: Write minimal implementation**

Agregar al FINAL de `series_data.py` (después de `title_for`):

```python
def _merge_generados() -> None:
    """Mergea los episodios generados y aprobados (Pieza 2) sobre los hardcodeados, con keys
    contiguas tras el último hardcodeado (46+). No pisa los 45 curados. Lo relee importlib.reload
    (que usa el runway del auto-refill), así los nuevos aparecen apenas se aprueban."""
    try:
        from autoscripts import db as _adb
        generados = _adb.approved_episodes("faceless")
    except Exception:
        return
    base = max(PARTS)
    for i, ep in enumerate(generados, start=1):
        PARTS[base + i] = ep


_merge_generados()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_series_data_merge.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add series_data.py tests/test_series_data_merge.py
git commit -m "feat(series_data): mergear episodios generados aprobados (seq>45) sin tocar los 45"
```

---

### Task 7: Wiring al autobuild (refill_script faceless + config)

**Files:**
- Modify: `autobuild/refillers.py` (`refill_script`)
- Modify: `autobuild/config.py` (entrada `faceless`)
- Test: `tests/test_autobuild_refillers.py` (agregar)

**Interfaces:**
- Consumes: `autoscripts.build.build`.
- Produces: `refill_script("faceless", n)` corre `autoscripts.build.build`; otros canales → `NotImplementedError`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autobuild_refillers.py  (agregar al final)
def test_refill_script_faceless_corre_autoscripts(monkeypatch):
    import autoscripts.build as ab
    llamado = []
    monkeypatch.setattr(ab, "build", lambda ch, n: llamado.append((ch, n)) or 1)
    rf.REFILLERS["script"]("faceless", 3)
    assert llamado == [("faceless", 3)]


def test_refill_script_historia_sigue_sin_implementar():
    with pytest.raises(NotImplementedError):
        rf.REFILLERS["script"]("historia", 1)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autobuild_refillers.py -k refill_script -v`
Expected: FAIL (hoy `refill_script` levanta NotImplementedError también para faceless)

- [ ] **Step 3: Write minimal implementation**

Reemplazar `refill_script` en `autobuild/refillers.py`:

```python
_SCRIPT_GENERATORS = {"faceless"}   # historia/misterios se suman cuando se implementen (Pieza 2.x)


def refill_script(channel: str, n: int) -> None:
    if channel not in _SCRIPT_GENERATORS:
        raise NotImplementedError(f"generador de guiones de {channel} pendiente (Pieza 2)")
    from autoscripts.build import build
    build(channel, n)               # puede levantar autobuild.errors.QuotaExhausted (Groq 429)
```

Tunear la entrada `faceless` en `autobuild/config.py` (el `gen` sigue siendo `"script"`):

```python
    "faceless":  {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                  "yield": 0.6, "max_attempts": 15, "batch": 3, "gen": "script"},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autobuild_refillers.py -v`
Expected: PASS (todos, incluidos los nuevos)

- [ ] **Step 5: Commit**

```bash
git add autobuild/refillers.py autobuild/config.py tests/test_autobuild_refillers.py
git commit -m "feat(autobuild): refill_script corre el generador de faceless (historia/misterios siguen SKIP)"
```

---

## Self-Review

**1. Cobertura del spec:**
- Paquete autoscripts/ (db/generate/judge/topics/build) → Tasks 1-5. ✅
- Esquema exacto + números en palabras → generate.validate_schema (Task 3). ✅
- Dedup de temas (hardcodeados + generados) → topics (Task 2). ✅
- Juez factual adversarial, rechaza episodio si un dato falla → judge (Task 4) + build (Task 5). ✅
- Ensamblado al formato segments con _T → build.assemble_segments (Task 5). ✅
- Merge seq>45 sin tocar los 45 → series_data (Task 6). ✅
- Wiring refill_script faceless + QUOTA en 429 → build (Task 5) + refillers (Task 7). ✅
- Config faceless tuneada → Task 7. ✅
- Fail-safe (solo approved entra; nada publica) → build guarda approved/rejected; series_data solo lee approved. ✅

**2. Placeholder scan:** sin TBD/TODO; todo el código está completo.

**3. Type consistency:** `episode` dict `{pregunta, resumen, segments}` consistente entre build (produce), db (guarda), series_data (consume). `datos` `{text, imgs[2], topic}` consistente entre generate/topics/judge/build. `approved_episodes -> list[dict]` usado igual en db/series_data. `QuotaExhausted` importado de `autobuild.errors` (existe desde la Pieza 1). `_chat` reusado de reddit_pipeline.rewrite en generate/judge. ✅

## Notas para quien implemente

- `reddit_pipeline.rewrite._chat` usa `temperature=0.8`. Para el juez conviene determinismo, pero el
  piloto reusa `_chat` tal cual (YAGNI); si el juez resulta inconsistente, agregar un `_chat` con
  `temperature=0` en judge.py (no bloqueante).
- `build` abre/cierra la conexión sqlite por episodio aprobado — está bien para el volumen (pocos/corrida).
- El merge de `series_data` corre en import; `importlib.reload` (runway de Pieza 1) lo refresca. Si
  `autoscripts` no está importable, el `try/except` deja los 45 hardcodeados intactos.
- faceless hoy: runway ~19 (9.5d) < objetivo 28 → al correr el autobuild generará ~9 episodios.
```
