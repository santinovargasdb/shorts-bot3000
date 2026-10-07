# Pipeline de guiones de Reddit ("¿Soy el Malo?") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el pipeline que convierte posts de Reddit (inglés) en guiones de drama reescritos en español, filtrados por viralidad y con el género del narrador, guardados en una base SQLite lista para que el motor de video los produzca.

**Architecture:** Paquete nuevo `reddit_pipeline/` con 4 piezas aisladas detrás de una base SQLite de estado: `source.py` (PRAW, API gratis) → `scoring.py` (viral_score + dedup) → `rewrite.py` (LLM compatible-OpenAI que reescribe/traduce/condensa y devuelve JSON estructurado) → `db.py` (estado `sourced→filtered→rewritten`). Un CLM `__main__.py` orquesta los pasos y tiene un `dump` para leer los guiones y validar calidad a mano. **No toca el motor ni el posteo** (eso es el Plan 2).

**Tech Stack:** Python 3.10+, SQLite (stdlib), `praw` (Reddit API), SDK `openai` apuntando a Groq (Llama 3.3 70B) por default, `pytest` para tests. Sin costo (tier gratis de Reddit + LLM gratis).

## Global Constraints

- **Python 3.10+** (sintaxis `list[dict]`, `str | None`, `from __future__ import annotations`).
- **Reescritura, NUNCA verbatim**: el guion es una reescritura propia (parafraseo), con nombres cambiados y usernames fuera. (spec §8)
- **No scraping**: solo la API oficial vía PRAW dentro del tier gratis (OAuth). (spec §8)
- **Guion 110-160 palabras** (≈45-60s a ~150 wpm). (spec §2, §7)
- **Español neutro latino**, hablado y natural. (spec §7)
- **`narrador_genero` ∈ {"M","F"}** por historia (para elegir la voz Jorge/Dalia en el Plan 2). (spec §2)
- **Proveedor LLM intercambiable** vía `LLM_BASE_URL`/`LLM_MODEL` (Groq default, Ollama/OpenRouter cambiando 1 var). (spec §4.3)
- **Credenciales por `.env`** con el patrón del proyecto (`os.environ.setdefault`, ver `src/stock.py:_load_env`). Nunca hardcodear claves.
- **Lane = relaciones + venganza**: subreddits de spec §6.
- **Convención de tests**: `pytest`, `tests/test_*.py`, `tmp_path`/`monkeypatch` (igual que `tests/test_registry.py`).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `reddit_pipeline/__init__.py` | Marca el paquete (vacío). |
| `reddit_pipeline/env.py` | `ROOT` + `load_env()` (lee `.env` sin deps, patrón del proyecto). |
| `reddit_pipeline/constants.py` | Subreddits, umbrales de `viral_score`, largo del guion, ruta de la DB. |
| `reddit_pipeline/db.py` | SQLite: esquema + insert/dedup + transiciones de estado + guardar reescritura. |
| `reddit_pipeline/scoring.py` | `viral_score(post)` + `passes(post)` (filtro de selección). |
| `reddit_pipeline/source.py` | PRAW: `build_reddit()`, `submission_to_dict()`, `fetch_posts()`. |
| `reddit_pipeline/rewrite.py` | Prompt + `parse_rewrite()` + `rewrite_story()` (LLM + validación de largo + retry). |
| `reddit_pipeline/__main__.py` | CLI: `source` / `filter` / `rewrite` / `run` / `dump`. |
| `tests/test_reddit_db.py` | Tests de la capa de datos. |
| `tests/test_reddit_scoring.py` | Tests de `viral_score`. |
| `tests/test_reddit_source.py` | Tests de mapeo/filtrado de posts (PRAW mockeado). |
| `tests/test_reddit_rewrite.py` | Tests de parseo/validación/retry (LLM mockeado). |
| `tests/test_reddit_cli.py` | Tests de orquestación (filter real + rewrite mockeado). |
| `requirements.txt` | +`praw`, +`openai`. |
| `.env.example` | +`REDDIT_*`, +`LLM_*`. |
| `.gitignore` | +`reddit_pipeline/stories.sqlite`. |

---

### Task 1: Scaffolding + capa de datos (SQLite)

**Files:**
- Create: `reddit_pipeline/__init__.py`, `reddit_pipeline/env.py`, `reddit_pipeline/constants.py`, `reddit_pipeline/db.py`
- Modify: `requirements.txt`, `.gitignore`
- Test: `tests/test_reddit_db.py`

**Interfaces:**
- Produces:
  - `reddit_pipeline.env.ROOT: Path`, `reddit_pipeline.env.load_env() -> None`
  - `reddit_pipeline.constants`: `DB_PATH: Path`, `SUBREDDITS: list[str]`, `MIN_SCORE/MIN_RATIO/MIN_WORDS/MAX_WORDS: num`, `HOOK_KEYWORDS: list[str]`, `GUION_MIN_WORDS=110`, `GUION_MAX_WORDS=160`
  - `reddit_pipeline.db`: `connect(db_path)->Connection`, `insert_story(conn, post)->bool`, `story_exists(conn, id)->bool`, `get_by_status(conn, status)->list[dict]`, `set_status(conn, id, status)->None`, `save_viral_score(conn, id, score, status)->None`, `save_rewrite(conn, id, rw)->None`
  - Un `post` dict tiene: `id, subreddit, title, body, score, ratio, num_comments, created_utc`.
  - Un `rw` dict tiene: `guion, narrador_genero, titulo, veredicto, cierre`.

- [ ] **Step 1: Crear el paquete y el helper de entorno**

Create `reddit_pipeline/__init__.py` (vacío):
```python
```

Create `reddit_pipeline/env.py`:
```python
"""Utilidades de entorno para el pipeline de Reddit."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> None:
    """Carga variables desde .env (KEY=VALUE) si existe, sin dependencias extra.
    Mismo patrón que src/stock.py:_load_env."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())
```

Create `reddit_pipeline/constants.py`:
```python
"""Constantes del pipeline de Reddit ('¿Soy el Malo?')."""
from __future__ import annotations

from .env import ROOT

DB_PATH = ROOT / "reddit_pipeline" / "stories.sqlite"

# Lane relaciones + venganza (spec §6)
SUBREDDITS = [
    "survivinginfidelity",
    "relationship_advice",
    "AmItheAsshole",
    "pettyrevenge",
    "ProRevenge",
    "MaliciousCompliance",
    "EntitledParents",
]

# Umbrales duros del viral_score (spec §4.2)
MIN_SCORE = 300
MIN_RATIO = 0.90
MIN_WORDS = 150
MAX_WORDS = 1500
HOOK_KEYWORDS = ["aita", "am i", "update", "tifu", "revenge", "cheat", "affair", "ex "]

# Largo del guion reescrito (≈45-60s a ~150 wpm) (spec §2, §7)
GUION_MIN_WORDS = 110
GUION_MAX_WORDS = 160
```

- [ ] **Step 2: Escribir el test de la capa de datos (falla)**

Create `tests/test_reddit_db.py`:
```python
import reddit_pipeline.db as db

SAMPLE = {
    "id": "abc1", "subreddit": "pettyrevenge", "title": "AITA for X",
    "body": "una historia larga", "score": 5000, "ratio": 0.97,
    "num_comments": 320, "created_utc": 1700000000.0,
}


def test_insert_and_dedup(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    assert db.insert_story(conn, SAMPLE) is True
    assert db.insert_story(conn, SAMPLE) is False      # dedup por id
    assert db.story_exists(conn, "abc1") is True
    assert db.story_exists(conn, "nope") is False


def test_status_flow(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, SAMPLE)
    assert [s["id"] for s in db.get_by_status(conn, "sourced")] == ["abc1"]
    db.save_viral_score(conn, "abc1", 1234.5, "filtered")
    assert db.get_by_status(conn, "sourced") == []
    got = db.get_by_status(conn, "filtered")
    assert got[0]["viral_score"] == 1234.5


def test_save_rewrite(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    db.insert_story(conn, SAMPLE)
    db.save_rewrite(conn, "abc1", {
        "guion": "un guion", "narrador_genero": "F",
        "titulo": "Mi ex", "veredicto": "se pasó", "cierre": "¿vos qué harías?"})
    r = db.get_by_status(conn, "rewritten")[0]
    assert r["narrador_genero"] == "F"
    assert r["titulo_es"] == "Mi ex"
    assert r["guion"] == "un guion"
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `python -m pytest tests/test_reddit_db.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'reddit_pipeline.db'`.

- [ ] **Step 4: Implementar `reddit_pipeline/db.py`**

Create `reddit_pipeline/db.py`:
```python
"""Capa de datos del pipeline: SQLite con el estado de cada historia.
Estados: sourced -> filtered -> rewritten -> produced -> posted (o 'rejected')."""
from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS stories (
    id              TEXT PRIMARY KEY,
    subreddit       TEXT,
    title           TEXT,
    body            TEXT,
    score           INTEGER,
    ratio           REAL,
    num_comments    INTEGER,
    created_utc     REAL,
    status          TEXT NOT NULL DEFAULT 'sourced',
    viral_score     REAL,
    guion           TEXT,
    narrador_genero TEXT,
    titulo_es       TEXT,
    veredicto       TEXT,
    cierre          TEXT
);
"""


def connect(db_path: Path | str) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    conn.commit()
    return conn


def insert_story(conn: sqlite3.Connection, post: dict) -> bool:
    """Inserta una historia nueva (status 'sourced'). False si ya existía (dedup por id)."""
    try:
        conn.execute(
            "INSERT INTO stories (id, subreddit, title, body, score, ratio, "
            "num_comments, created_utc, status) VALUES "
            "(:id, :subreddit, :title, :body, :score, :ratio, "
            ":num_comments, :created_utc, 'sourced')",
            post,
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def story_exists(conn: sqlite3.Connection, post_id: str) -> bool:
    cur = conn.execute("SELECT 1 FROM stories WHERE id = ?", (post_id,))
    return cur.fetchone() is not None


def get_by_status(conn: sqlite3.Connection, status: str) -> list[dict]:
    cur = conn.execute(
        "SELECT * FROM stories WHERE status = ? ORDER BY viral_score DESC", (status,))
    return [dict(row) for row in cur.fetchall()]


def set_status(conn: sqlite3.Connection, post_id: str, status: str) -> None:
    conn.execute("UPDATE stories SET status = ? WHERE id = ?", (status, post_id))
    conn.commit()


def save_viral_score(conn: sqlite3.Connection, post_id: str,
                     score: float, status: str) -> None:
    conn.execute("UPDATE stories SET viral_score = ?, status = ? WHERE id = ?",
                 (score, status, post_id))
    conn.commit()


def save_rewrite(conn: sqlite3.Connection, post_id: str, rw: dict) -> None:
    conn.execute(
        "UPDATE stories SET guion = :guion, narrador_genero = :narrador_genero, "
        "titulo_es = :titulo, veredicto = :veredicto, cierre = :cierre, "
        "status = 'rewritten' WHERE id = :id",
        {**rw, "id": post_id},
    )
    conn.commit()
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `python -m pytest tests/test_reddit_db.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Agregar dependencias y gitignore**

Modify `requirements.txt` — agregar al final:
```
# Pipeline de Reddit ("¿Soy el Malo?")
praw>=8.0               # Reddit API (tier gratis, OAuth)
openai>=1.0             # SDK compatible-OpenAI (Groq/Ollama/OpenRouter via base_url)
```

Modify `.gitignore` — agregar al final:
```
# Base de estado del pipeline de Reddit (se regenera)
reddit_pipeline/stories.sqlite
```

- [ ] **Step 7: Commit**

```bash
git add reddit_pipeline/__init__.py reddit_pipeline/env.py reddit_pipeline/constants.py reddit_pipeline/db.py tests/test_reddit_db.py requirements.txt .gitignore
git commit -m "feat(reddit): capa de datos SQLite + scaffolding del pipeline"
```

---

### Task 2: Selección (`viral_score`)

**Files:**
- Create: `reddit_pipeline/scoring.py`
- Test: `tests/test_reddit_scoring.py`

**Interfaces:**
- Consumes: `reddit_pipeline.constants` (MIN_SCORE, MIN_RATIO, MIN_WORDS, MAX_WORDS, HOOK_KEYWORDS)
- Produces: `scoring.viral_score(post: dict) -> float`, `scoring.passes(post: dict) -> bool`, `scoring.word_count(text: str) -> int`

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/test_reddit_scoring.py`:
```python
import reddit_pipeline.scoring as sc


def _post(**kw):
    base = {"title": "una historia", "body": " ".join(["x"] * 300),
            "score": 5000, "ratio": 0.97, "num_comments": 300}
    base.update(kw)
    return base


def test_pasa_historia_fuerte():
    assert sc.viral_score(_post()) > 0
    assert sc.passes(_post()) is True


def test_descarta_pocos_upvotes():
    assert sc.viral_score(_post(score=100)) == 0


def test_descarta_ratio_bajo():
    assert sc.viral_score(_post(ratio=0.7)) == 0


def test_descarta_muy_corta_o_larga():
    assert sc.viral_score(_post(body="corto")) == 0
    assert sc.viral_score(_post(body=" ".join(["x"] * 2000))) == 0


def test_bonus_por_keyword_de_gancho():
    sin = sc.viral_score(_post(title="una historia cualquiera"))
    con = sc.viral_score(_post(title="AITA por esto"))
    assert con > sin > 0
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python -m pytest tests/test_reddit_scoring.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'reddit_pipeline.scoring'`.

- [ ] **Step 3: Implementar `reddit_pipeline/scoring.py`**

Create `reddit_pipeline/scoring.py`:
```python
"""Selección de historias: viral_score + filtro (spec §4.2)."""
from __future__ import annotations

from .constants import MIN_SCORE, MIN_RATIO, MIN_WORDS, MAX_WORDS, HOOK_KEYWORDS


def word_count(text: str) -> int:
    return len((text or "").split())


def viral_score(post: dict) -> float:
    """Puntaje de viralidad. 0.0 si no pasa los umbrales duros."""
    score = post.get("score", 0) or 0
    ratio = post.get("ratio", 0.0) or 0.0
    if score < MIN_SCORE or ratio < MIN_RATIO:
        return 0.0
    wc = word_count(post.get("body", ""))
    if not (MIN_WORDS <= wc <= MAX_WORDS):
        return 0.0
    num_comments = post.get("num_comments", 0) or 0
    title = (post.get("title", "") or "").lower()
    hook = any(k in title for k in HOOK_KEYWORDS)
    engagement = 1 + num_comments / max(score, 1)
    return score * ratio * engagement * (1.3 if hook else 1.0)


def passes(post: dict) -> bool:
    return viral_score(post) > 0
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `python -m pytest tests/test_reddit_scoring.py -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add reddit_pipeline/scoring.py tests/test_reddit_scoring.py
git commit -m "feat(reddit): viral_score + filtro de selección"
```

---

### Task 3: Sourcing (PRAW)

**Files:**
- Create: `reddit_pipeline/source.py`
- Test: `tests/test_reddit_source.py`

**Interfaces:**
- Consumes: `reddit_pipeline.env.load_env`
- Produces:
  - `source.build_reddit() -> praw.Reddit` (usa REDDIT_CLIENT_ID/SECRET/USER_AGENT del env)
  - `source.submission_to_dict(sub) -> dict` (mapea a `id, subreddit, title, body, score, ratio, num_comments, created_utc`)
  - `source.fetch_posts(reddit, subreddits: list[str], limit=50, time_filter="month") -> list[dict]`
    (filtra `is_self=True`, `not stickied`, `not over_18`)

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/test_reddit_source.py`:
```python
import types
import reddit_pipeline.source as source


def _sub(**kw):
    base = dict(id="x1", subreddit="pettyrevenge", title="t", selftext="body",
                score=500, upvote_ratio=0.95, num_comments=10,
                created_utc=1700000000.0, stickied=False, over_18=False, is_self=True)
    base.update(kw)
    return types.SimpleNamespace(**base)


class _FakeSubreddit:
    def __init__(self, subs):
        self._subs = subs

    def top(self, time_filter="month", limit=50):
        return list(self._subs)


class _FakeReddit:
    def __init__(self, mapping):
        self._m = mapping

    def subreddit(self, name):
        return _FakeSubreddit(self._m.get(name, []))


def test_mapea_campos():
    d = source.submission_to_dict(_sub(id="abc", score=777))
    assert d["id"] == "abc"
    assert d["score"] == 777
    assert set(d) == {"id", "subreddit", "title", "body", "score",
                      "ratio", "num_comments", "created_utc"}


def test_filtra_stickied_nsfw_y_no_self():
    reddit = _FakeReddit({"pettyrevenge": [
        _sub(id="ok"),
        _sub(id="pin", stickied=True),
        _sub(id="nsfw", over_18=True),
        _sub(id="link", is_self=False)]})
    got = source.fetch_posts(reddit, ["pettyrevenge"], limit=10)
    assert [g["id"] for g in got] == ["ok"]
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python -m pytest tests/test_reddit_source.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'reddit_pipeline.source'`.

- [ ] **Step 3: Implementar `reddit_pipeline/source.py`**

Create `reddit_pipeline/source.py`:
```python
"""Sourcing de historias desde Reddit con PRAW (API oficial, tier gratis, solo lectura)."""
from __future__ import annotations

import os

from .env import load_env


def build_reddit():
    """Crea el cliente PRAW desde el .env (app tipo 'script')."""
    load_env()
    import praw  # import tardío: los tests de mapeo/filtrado no necesitan praw instalado
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        user_agent=os.environ.get("REDDIT_USER_AGENT", "soyelmalo/0.1 by u/anon"),
    )


def submission_to_dict(sub) -> dict:
    """Mapea un submission de PRAW al dict que usa el pipeline."""
    return {
        "id": sub.id,
        "subreddit": str(sub.subreddit),
        "title": sub.title,
        "body": sub.selftext,
        "score": int(sub.score),
        "ratio": float(sub.upvote_ratio),
        "num_comments": int(sub.num_comments),
        "created_utc": float(sub.created_utc),
    }


def fetch_posts(reddit, subreddits: list[str], limit: int = 50,
                time_filter: str = "month") -> list[dict]:
    """Trae posts de texto, no fijados, no NSFW, de cada subreddit (top)."""
    out: list[dict] = []
    for name in subreddits:
        for sub in reddit.subreddit(name).top(time_filter=time_filter, limit=limit):
            if getattr(sub, "stickied", False) or getattr(sub, "over_18", False):
                continue
            if not getattr(sub, "is_self", False):
                continue
            out.append(submission_to_dict(sub))
    return out
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `python -m pytest tests/test_reddit_source.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add reddit_pipeline/source.py tests/test_reddit_source.py
git commit -m "feat(reddit): sourcing con PRAW (mapeo + filtros)"
```

---

### Task 4: Reescritura con LLM

**Files:**
- Create: `reddit_pipeline/rewrite.py`
- Test: `tests/test_reddit_rewrite.py`

**Interfaces:**
- Consumes: `reddit_pipeline.env.load_env`, `reddit_pipeline.constants` (GUION_MIN_WORDS, GUION_MAX_WORDS)
- Produces:
  - `rewrite.PROMPT: str`, `rewrite.REQUIRED_KEYS: tuple`
  - `rewrite.word_count(text) -> int`
  - `rewrite.build_client()` (OpenAI SDK apuntando a Groq por default)
  - `rewrite.model_name() -> str`
  - `rewrite.parse_rewrite(raw: str) -> dict` (valida claves + genero; lanza ValueError)
  - `rewrite.rewrite_story(post, client, model, min_words=110, max_words=160, max_retries=2) -> dict`
    (devuelve `{guion, narrador_genero, titulo, veredicto, cierre}`)

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/test_reddit_rewrite.py`:
```python
import json
import pytest
import reddit_pipeline.rewrite as rw

VALID = {"guion": " ".join(["palabra"] * 120), "narrador_genero": "M",
         "titulo": "Mi ex", "veredicto": "se pasó", "cierre": "¿vos qué harías?"}


class _FakeClient:
    """Cliente LLM falso: devuelve respuestas en cola. Imita client.chat.completions.create."""
    def __init__(self, responses):
        self._r = list(responses)
        self.chat = self
        self.completions = self

    def create(self, **kw):
        content = self._r.pop(0)
        msg = type("M", (), {"content": content})()
        choice = type("C", (), {"message": msg})()
        return type("R", (), {"choices": [choice]})()


def test_parse_json_plano():
    assert rw.parse_rewrite(json.dumps(VALID))["narrador_genero"] == "M"


def test_parse_con_fences():
    raw = "```json\n" + json.dumps(VALID) + "\n```"
    assert rw.parse_rewrite(raw)["titulo"] == "Mi ex"


def test_parse_falta_clave():
    bad = {k: v for k, v in VALID.items() if k != "cierre"}
    with pytest.raises(ValueError):
        rw.parse_rewrite(json.dumps(bad))


def test_parse_genero_invalido():
    with pytest.raises(ValueError):
        rw.parse_rewrite(json.dumps({**VALID, "narrador_genero": "X"}))


def test_rewrite_ok_sin_retry():
    client = _FakeClient([json.dumps(VALID)])
    out = rw.rewrite_story({"body": "x"}, client, "m")
    assert rw.word_count(out["guion"]) == 120


def test_rewrite_reintenta_si_largo():
    largo = {**VALID, "guion": " ".join(["x"] * 400)}
    client = _FakeClient([json.dumps(largo), json.dumps(VALID)])
    out = rw.rewrite_story({"body": "x"}, client, "m", max_retries=2)
    assert 110 <= rw.word_count(out["guion"]) <= 160
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python -m pytest tests/test_reddit_rewrite.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'reddit_pipeline.rewrite'`.

- [ ] **Step 3: Implementar `reddit_pipeline/rewrite.py`**

Create `reddit_pipeline/rewrite.py`:
```python
"""Reescritura + traducción + transformación de historias con un LLM (spec §4.3, §7)."""
from __future__ import annotations

import json
import os

from .env import load_env
from .constants import GUION_MIN_WORDS, GUION_MAX_WORDS

PROMPT = """Sos guionista de shorts narrados en ESPAÑOL NEUTRO LATINO.
Te paso una historia de Reddit en inglés. Devolvé SOLO un objeto JSON con estas claves exactas:
"guion", "narrador_genero", "titulo", "veredicto", "cierre".

REGLAS del "guion":
1. Largo {min}-{max} palabras (aprox 45-60s a 150 wpm). Conta las palabras.
2. ABRI IN MEDIA RES: primera frase = el momento de maxima tension. Nada de "Hola"/"esta historia trata de".
3. REESCRIBI con tus palabras, NO traduzcas literal. Cambia los nombres propios por nombres neutros.
   Quita usernames y datos identificables.
4. Condensa: solo setup minimo -> conflicto -> giro -> remate. Corta relleno y digresiones.
5. Espanol natural y hablado (como contas una anecdota a un amigo), frases cortas.
"narrador_genero": "M" si quien narra en primera persona es hombre, "F" si es mujer.
"titulo": gancho corto para la tarjeta en pantalla y el caption.
"veredicto": 1 linea con tu opinion/encuadre (la capa de comentario original).
"cierre": una pregunta a comentarios; por default "¿Vos qué hubieras hecho? 👇".

HISTORIA:
\"\"\"{story}\"\"\""""

REQUIRED_KEYS = ("guion", "narrador_genero", "titulo", "veredicto", "cierre")


def word_count(text: str) -> int:
    return len((text or "").split())


def build_client():
    """Cliente LLM compatible-OpenAI (Groq por default; cambia LLM_BASE_URL/MODEL para otro)."""
    load_env()
    from openai import OpenAI
    return OpenAI(
        api_key=os.environ["LLM_API_KEY"],
        base_url=os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1"),
    )


def model_name() -> str:
    load_env()
    return os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile")


def parse_rewrite(raw: str) -> dict:
    """Extrae y valida el JSON del LLM. Lanza ValueError si falta algo o el genero es invalido."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"No se encontro JSON en la respuesta: {raw[:120]!r}")
    data = json.loads(text[start:end + 1])
    missing = [k for k in REQUIRED_KEYS if k not in data]
    if missing:
        raise ValueError(f"Faltan claves en el JSON: {missing}")
    if data["narrador_genero"] not in ("M", "F"):
        raise ValueError(f"narrador_genero invalido: {data['narrador_genero']!r}")
    return data


def _chat(client, model: str, prompt: str) -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
    )
    return resp.choices[0].message.content


def rewrite_story(post: dict, client, model: str,
                  min_words: int = GUION_MIN_WORDS, max_words: int = GUION_MAX_WORDS,
                  max_retries: int = 2) -> dict:
    """Reescribe una historia a un guion en espanol validado por largo."""
    prompt = PROMPT.format(min=min_words, max=max_words, story=post["body"])
    data = parse_rewrite(_chat(client, model, prompt))
    for _ in range(max_retries):
        wc = word_count(data["guion"])
        if min_words <= wc <= max_words:
            break
        ajuste = "Acorta" if wc > max_words else "Alarga"
        fix = (f"{ajuste} SOLO el campo \"guion\" a {min_words}-{max_words} palabras sin perder "
               f"el giro. Manten las demas claves igual. Devolve el MISMO objeto JSON completo:\n"
               f"{json.dumps(data, ensure_ascii=False)}")
        data = parse_rewrite(_chat(client, model, fix))
    return data
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `python -m pytest tests/test_reddit_rewrite.py -v`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add reddit_pipeline/rewrite.py tests/test_reddit_rewrite.py
git commit -m "feat(reddit): reescritura con LLM (prompt + parseo + validacion de largo)"
```

---

### Task 5: CLI de orquestación + verificación de punta a punta

**Files:**
- Create: `reddit_pipeline/__main__.py`
- Modify: `.env.example`
- Test: `tests/test_reddit_cli.py`

**Interfaces:**
- Consumes: `reddit_pipeline.db`, `reddit_pipeline.source`, `reddit_pipeline.scoring`, `reddit_pipeline.rewrite`, `reddit_pipeline.constants` (DB_PATH, SUBREDDITS)
- Produces:
  - `main.cmd_source(db_path=DB_PATH)`, `main.cmd_filter(db_path=DB_PATH)`,
    `main.cmd_rewrite(n, db_path=DB_PATH)`, `main.cmd_dump(n, db_path=DB_PATH)`,
    `main.main(argv) -> int`

- [ ] **Step 1: Escribir el test (falla)**

Create `tests/test_reddit_cli.py`:
```python
import reddit_pipeline.db as db
import reddit_pipeline.__main__ as cli


def _mk(conn, pid, **kw):
    base = {"id": pid, "subreddit": "x", "title": "AITA", "body": " ".join(["w"] * 300),
            "score": 5000, "ratio": 0.97, "num_comments": 300, "created_utc": 1.0}
    base.update(kw)
    db.insert_story(conn, base)


def test_cmd_filter_marca_estados(tmp_path):
    p = tmp_path / "s.sqlite"
    conn = db.connect(p)
    _mk(conn, "good")
    _mk(conn, "bad", title="t", body="corto", score=10, ratio=0.5, num_comments=0)
    conn.close()
    cli.cmd_filter(db_path=p)
    conn = db.connect(p)
    assert [s["id"] for s in db.get_by_status(conn, "filtered")] == ["good"]
    assert [s["id"] for s in db.get_by_status(conn, "rejected")] == ["bad"]


def test_cmd_rewrite_guarda(tmp_path, monkeypatch):
    p = tmp_path / "s.sqlite"
    conn = db.connect(p)
    _mk(conn, "good")
    db.save_viral_score(conn, "good", 10.0, "filtered")
    conn.close()
    monkeypatch.setattr(cli.rewrite, "build_client", lambda: object())
    monkeypatch.setattr(cli.rewrite, "model_name", lambda: "m")
    monkeypatch.setattr(cli.rewrite, "rewrite_story",
                        lambda post, client, model: {
                            "guion": "g", "narrador_genero": "M",
                            "titulo": "T", "veredicto": "v", "cierre": "c"})
    cli.cmd_rewrite(5, db_path=p)
    conn = db.connect(p)
    r = db.get_by_status(conn, "rewritten")
    assert r and r[0]["narrador_genero"] == "M"
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `python -m pytest tests/test_reddit_cli.py -v`
Expected: FAIL con `ModuleNotFoundError` / `AttributeError` (no existe `__main__`).

- [ ] **Step 3: Implementar `reddit_pipeline/__main__.py`**

Create `reddit_pipeline/__main__.py`:
```python
"""CLI del pipeline de Reddit ('¿Soy el Malo?').

Uso:
  python -m reddit_pipeline source        # trae posts nuevos a la DB
  python -m reddit_pipeline filter         # calcula viral_score y marca filtered/rejected
  python -m reddit_pipeline rewrite [N]    # reescribe hasta N historias filtered (default 5)
  python -m reddit_pipeline run [N]        # source + filter + rewrite
  python -m reddit_pipeline dump [N]       # imprime los guiones rewritten para validar calidad
"""
from __future__ import annotations

import sys

from . import db, source, scoring, rewrite
from .constants import DB_PATH, SUBREDDITS


def cmd_source(db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    reddit = source.build_reddit()
    posts = source.fetch_posts(reddit, SUBREDDITS)
    nuevos = sum(db.insert_story(conn, p) for p in posts)
    print(f"[source] {len(posts)} traidos, {nuevos} nuevos (dedup).")


def cmd_filter(db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    pend = db.get_by_status(conn, "sourced")
    ok = 0
    for p in pend:
        s = scoring.viral_score(p)
        db.save_viral_score(conn, p["id"], s, "filtered" if s > 0 else "rejected")
        ok += s > 0
    print(f"[filter] {len(pend)} evaluados, {ok} pasaron.")


def cmd_rewrite(n: int, db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    client, model = rewrite.build_client(), rewrite.model_name()
    hechos = 0
    for p in db.get_by_status(conn, "filtered")[:n]:
        try:
            rw = rewrite.rewrite_story(p, client, model)
            db.save_rewrite(conn, p["id"], rw)
            hechos += 1
            print(f"  [ok] {p['id']} ({rw['narrador_genero']}) {rw['titulo']}")
        except Exception as e:
            print(f"  [skip] {p['id']}: {e}")
    print(f"[rewrite] {hechos} reescritas.")


def cmd_dump(n: int, db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    for p in db.get_by_status(conn, "rewritten")[:n]:
        print("=" * 60)
        print(f"{p['titulo_es']}  [{p['narrador_genero']}]  "
              f"(r/{p['subreddit']}, score {p['score']})")
        print("-" * 60)
        print(p["guion"])
        print(f"\n[veredicto] {p['veredicto']}\n[cierre] {p['cierre']}")


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else "run"
    n = int(argv[2]) if len(argv) > 2 else 5
    if cmd == "source":
        cmd_source()
    elif cmd == "filter":
        cmd_filter()
    elif cmd == "rewrite":
        cmd_rewrite(n)
    elif cmd == "dump":
        cmd_dump(n)
    elif cmd == "run":
        cmd_source()
        cmd_filter()
        cmd_rewrite(n)
    else:
        print(f"Comando desconocido: {cmd}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `python -m pytest tests/test_reddit_cli.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Correr toda la suite (no romper nada existente)**

Run: `python -m pytest -q`
Expected: PASS — los 5 archivos nuevos (`test_reddit_*`) verdes y los tests previos del repo sin cambios.

- [ ] **Step 6: Documentar las credenciales en `.env.example`**

Modify `.env.example` — agregar al final:
```
# --- Pipeline de Reddit ("¿Soy el Malo?") ---
# App de Reddit tipo "script": https://www.reddit.com/prefs/apps  (gratis)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=soyelmalo/0.1 by u/tu_usuario
# LLM para reescritura (Groq gratis por default): https://console.groq.com/keys
LLM_API_KEY=
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

- [ ] **Step 7: Commit**

```bash
git add reddit_pipeline/__main__.py tests/test_reddit_cli.py .env.example
git commit -m "feat(reddit): CLI source/filter/rewrite/dump + .env.example"
```

- [ ] **Step 8: Verificación manual de punta a punta (requiere claves reales)**

> Esto NO es automatizable (pega la API real de Reddit + LLM). Es el criterio de "validar calidad a mano" de la spec §10.

1. Crear la app de Reddit (tipo *script*) en https://www.reddit.com/prefs/apps y una API key gratis de Groq; completar `.env` con `REDDIT_*` y `LLM_*`.
2. Instalar deps: `pip install -r requirements.txt`.
3. Correr: `python -m reddit_pipeline run 5`
4. Leer los guiones: `python -m reddit_pipeline dump 5`
5. **Criterio de aceptación (juicio humano):** los 5 guiones están en español natural, 110-160 palabras, abren in media res, tienen nombres cambiados (no usernames), el `narrador_genero` coincide con quien narra, y el veredicto/cierre suenan propios (no traducción robótica). Si la calidad no convence → iterar el `PROMPT` en `rewrite.py` (no hace falta tocar el resto).

---

## Nota de alcance

Este plan entrega el **pipeline de guiones** (Fase 2, parte 1). **Queda para el Plan 2** (render/integración, spec §4.4 y §5): entrada en `channels_registry.py` + `config/channels.yaml`, override de voz por historia (Jorge/Dalia), fuente de guion dinámica en `daily_post` (leer de `stories.sqlite` en vez de `series.PARTS`), uso de `src/faceless.generate` con fondo de gameplay, tarjeta del post + pantalla de veredicto, y render de 3-5 videos de prueba. También quedan afuera (spec §10, §12): branding/logo, creación de cuentas, fuentes hispanas, posteo diario automático.
