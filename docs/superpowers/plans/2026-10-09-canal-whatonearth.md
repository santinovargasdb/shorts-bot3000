# "What On Earth Is This" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el canal en inglés "What On Earth Is This" (montaje de ítems raros con las voces del meme vía TikTok TTS) enchufado al motor multi-canal, lanzando en TikTok + Instagram.

**Architecture:** Pipeline que arma un backlog: Groq genera temas → sourcing legal multi-fuente (Pixabay/Pexels/Wikimedia) con auto-filtro de cobertura → render de montaje → store SQLite por `seq`. Un módulo `series` expone los videos pre-renderizados y `daily_post` los postea vía un hook nuevo. No se tocan los 4 canales existentes.

**Tech Stack:** Python 3.12, SQLite, pytest, Groq (SDK OpenAI), requests, Pixabay/Pexels/Wikimedia REST, TikTok TTS proxy, FFmpeg, PIL.

## Global Constraints

- Presupuesto $0: solo free tiers. Fuente de clips sin key (ej. Pexels) → se saltea, no rompe.
- Idioma del contenido: **inglés** (voces y textos).
- Repo público: secretos solo en `.env`/`secrets/`. No hardcodear keys.
- Pipeline automático 100% legal (stock + CC con atribución). El "rip" manual queda fuera de este plan.
- Plataformas: `("ig", "tt")`. No tocar faceless/historia/misterios/soyelmalo.
- Voces: pregunta `en_us_006`, respuesta `en_us_001` (TikTok TTS).
- N ítems por video: 6.
- Trailer de commits: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Tests: pytest, import directo desde root, correr con `python -m pytest`.

---

### Task 1: Voz vía TikTok TTS (`whatonearth/tts.py`)

**Files:**
- Create: `whatonearth/__init__.py` (vacío)
- Create: `whatonearth/tts.py`
- Test: `tests/test_whatonearth_tts.py`

**Interfaces:**
- Produces: `synth(text: str, voice: str, out_path) -> None` — escribe un mp3 en `out_path`; prueba 2 endpoints; `RuntimeError` si ambos fallan.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_whatonearth_tts.py
import base64
import pytest
from whatonearth import tts


class _Resp:
    def __init__(self, status, payload):
        self.status_code = status
        self._payload = payload
        self.text = str(payload)

    def json(self):
        return self._payload


def test_synth_usa_primer_endpoint(monkeypatch, tmp_path):
    audio = b"ID3fake-mp3-bytes"
    calls = []

    def fake_post(url, json=None, timeout=None, headers=None):
        calls.append(url)
        return _Resp(200, {"data": base64.b64encode(audio).decode()})

    monkeypatch.setattr(tts.requests, "post", fake_post)
    out = tmp_path / "a.mp3"
    tts.synth("hello", "en_us_006", out)
    assert out.read_bytes() == audio
    assert len(calls) == 1  # no necesita fallback


def test_synth_cae_al_fallback(monkeypatch, tmp_path):
    audio = b"second-endpoint-bytes"

    def fake_post(url, json=None, timeout=None, headers=None):
        if "weilnet" in url:
            return _Resp(500, "boom")
        return _Resp(200, {"base64": base64.b64encode(audio).decode()})

    monkeypatch.setattr(tts.requests, "post", fake_post)
    out = tmp_path / "b.mp3"
    tts.synth("hi", "en_us_001", out)
    assert out.read_bytes() == audio


def test_synth_falla_si_todos_caen(monkeypatch, tmp_path):
    monkeypatch.setattr(tts.requests, "post",
                        lambda *a, **k: _Resp(500, "boom"))
    with pytest.raises(RuntimeError):
        tts.synth("x", "en_us_006", tmp_path / "c.mp3")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_whatonearth_tts.py -v`
Expected: FAIL (ModuleNotFoundError: whatonearth.tts).

- [ ] **Step 3: Write minimal implementation**

```python
# whatonearth/__init__.py  (archivo vacío)
```

```python
# whatonearth/tts.py
"""Voces del meme vía TikTok TTS (proxy público gratis, sin login/key)."""
from __future__ import annotations

import base64
from pathlib import Path

import requests

# (url, clave del base64 en la respuesta JSON)
_ENDPOINTS = [
    ("https://tiktok-tts.weilnet.workers.dev/api/generation", "data"),
    ("https://gesserit.co/api/tiktok-tts", "base64"),
]


def synth(text: str, voice: str, out_path) -> None:
    """Genera TTS de TikTok y lo escribe como mp3 en out_path.
    Prueba los endpoints en orden; RuntimeError si todos fallan."""
    for url, key in _ENDPOINTS:
        try:
            r = requests.post(url, json={"text": text, "voice": voice},
                              timeout=30, headers={"Content-Type": "application/json"})
            if r.status_code != 200:
                continue
            b64 = r.json().get(key)
            if not b64:
                continue
            Path(out_path).write_bytes(base64.b64decode(b64))
            return
        except Exception:
            continue
    raise RuntimeError(f"TikTok TTS falló para: {text!r}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_whatonearth_tts.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add whatonearth/__init__.py whatonearth/tts.py tests/test_whatonearth_tts.py
git commit -m "feat(whatonearth): TTS del meme vía TikTok (proxy gratis, con fallback)"
```

---

### Task 2: Backlog SQLite (`whatonearth/db.py`)

**Files:**
- Create: `whatonearth/db.py`
- Test: `tests/test_whatonearth_db.py`

**Interfaces:**
- Produces:
  - `connect(path=DB_PATH) -> sqlite3.Connection`
  - `init(conn) -> None`
  - `add_video(conn, *, title: str, description: str, video_path: str, items: list) -> int` (devuelve el `seq` asignado)
  - `all_videos(conn) -> list[dict]` (orden por seq asc)
  - `video_by_seq(conn, seq: int) -> dict | None`
  - cada dict: `{seq, title, description, video_path, items, created_utc}` (`items` ya deserializado de JSON)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_whatonearth_db.py
from whatonearth import db


def _conn():
    c = db.connect(":memory:")
    db.init(c)
    return c


def test_add_asigna_seq_monotonico():
    c = _conn()
    s1 = db.add_video(c, title="A", description="d1", video_path="a.mp4", items=[{"name": "X"}])
    s2 = db.add_video(c, title="B", description="d2", video_path="b.mp4", items=[{"name": "Y"}])
    assert s1 == 1 and s2 == 2


def test_video_by_seq_deserializa_items():
    c = _conn()
    seq = db.add_video(c, title="T", description="d", video_path="v.mp4",
                       items=[{"name": "Pangolin"}, {"name": "Capybara"}])
    row = db.video_by_seq(c, seq)
    assert row["title"] == "T"
    assert row["items"][0]["name"] == "Pangolin"
    assert row["video_path"] == "v.mp4"


def test_all_videos_ordenado():
    c = _conn()
    db.add_video(c, title="A", description="d", video_path="a.mp4", items=[])
    db.add_video(c, title="B", description="d", video_path="b.mp4", items=[])
    seqs = [v["seq"] for v in db.all_videos(c)]
    assert seqs == [1, 2]


def test_video_by_seq_inexistente():
    c = _conn()
    assert db.video_by_seq(c, 99) is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_whatonearth_db.py -v`
Expected: FAIL (ModuleNotFoundError: whatonearth.db).

- [ ] **Step 3: Write minimal implementation**

```python
# whatonearth/db.py
"""Backlog de videos de What On Earth (SQLite). seq monótono = nº de parte estable."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "whatonearth" / "videos.sqlite"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    video_path TEXT NOT NULL,
    items_json TEXT NOT NULL,
    created_utc TEXT
);
"""


def connect(path=DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def init(conn) -> None:
    conn.executescript(_SCHEMA)
    conn.commit()


def add_video(conn, *, title: str, description: str, video_path: str, items: list) -> int:
    cur = conn.execute(
        "INSERT INTO videos (title, description, video_path, items_json, created_utc) "
        "VALUES (?, ?, ?, ?, datetime('now'))",
        (title, description, video_path, json.dumps(items, ensure_ascii=False)),
    )
    conn.commit()
    return int(cur.lastrowid)


def _row(r) -> dict:
    return {
        "seq": r["seq"], "title": r["title"], "description": r["description"],
        "video_path": r["video_path"], "items": json.loads(r["items_json"]),
        "created_utc": r["created_utc"],
    }


def all_videos(conn) -> list:
    return [_row(r) for r in conn.execute("SELECT * FROM videos ORDER BY seq ASC")]


def video_by_seq(conn, seq: int):
    r = conn.execute("SELECT * FROM videos WHERE seq = ?", (seq,)).fetchone()
    return _row(r) if r else None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_whatonearth_db.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add whatonearth/db.py tests/test_whatonearth_db.py
git commit -m "feat(whatonearth): backlog SQLite con seq monótono"
```

---

### Task 3: Generación de temas con Groq (`whatonearth/topics.py`)

**Files:**
- Create: `whatonearth/topics.py`
- Test: `tests/test_whatonearth_topics.py`

**Interfaces:**
- Consumes: `reddit_pipeline.rewrite.build_client()` (cliente OpenAI/Groq ya existente).
- Produces:
  - `parse_topics(raw: str) -> list[dict]` — parsea el JSON del LLM; cada ítem válido tiene `name, category, query, question_en, answer_en` (strings no vacíos); descarta los inválidos.
  - `generate_topics(n: int, exclude=frozenset()) -> list[dict]` — pide al LLM ~`n*2` candidatos y devuelve los parseados (para que sourcing descarte algunos).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_whatonearth_topics.py
from whatonearth import topics


def test_parse_topics_extrae_validos():
    raw = '''Here you go:
    [
      {"name":"Pangolin","category":"animal","query":"pangolin",
       "question_en":"What kind of animal is this?","answer_en":"This is a pangolin."},
      {"name":"","category":"animal","query":"x","question_en":"q","answer_en":"a"}
    ]'''
    out = topics.parse_topics(raw)
    assert len(out) == 1
    assert out[0]["name"] == "Pangolin"
    assert out[0]["query"] == "pangolin"


def test_parse_topics_json_roto_devuelve_vacio():
    assert topics.parse_topics("no json here") == []


def test_generate_topics_usa_cliente(monkeypatch):
    fake_json = ('[{"name":"Axolotl","category":"animal","query":"axolotl",'
                 '"question_en":"What is this?","answer_en":"This is an axolotl."}]')

    class _Msg:
        content = fake_json

    class _Choice:
        message = _Msg()

    class _Resp:
        choices = [_Choice()]

    class _Client:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return _Resp()

    monkeypatch.setattr(topics, "build_client", lambda: _Client())
    out = topics.generate_topics(1)
    assert out[0]["name"] == "Axolotl"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_whatonearth_topics.py -v`
Expected: FAIL (ModuleNotFoundError: whatonearth.topics).

- [ ] **Step 3: Write minimal implementation**

```python
# whatonearth/topics.py
"""Genera temas sorprendentes (lugares/animales/objetos) con el LLM (Groq)."""
from __future__ import annotations

import json
import os
import re

from reddit_pipeline.rewrite import build_client

_REQUIRED = ("name", "category", "query", "question_en", "answer_en")

PROMPT = """You write content for a viral short-form video channel called
"What On Earth Is This": a voice asks "what is this?!" and another names a
surprising thing. Give me {n} SURPRISING but REAL items a general audience
would not instantly recognize. Mix categories: places (strange/beautiful
locations), animals (weird/rare but real), and objects/natural phenomena.
Avoid common ones (dog, beach, apple). Avoid these already used: {exclude}.

Return ONLY a JSON array. Each element:
{{"name": "<short English name>",
  "category": "place|animal|object",
  "query": "<2-4 word English stock-footage search term>",
  "question_en": "<short incredulous question, e.g. 'Hold on, what is this?'>",
  "answer_en": "<'This is a/an <name>.'>"}}"""


def parse_topics(raw: str) -> list:
    m = re.search(r"\[.*\]", raw, re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []
    out = []
    for it in data if isinstance(data, list) else []:
        if not isinstance(it, dict):
            continue
        if all(isinstance(it.get(k), str) and it.get(k).strip() for k in _REQUIRED):
            out.append({k: it[k].strip() for k in _REQUIRED})
    return out


def generate_topics(n: int, exclude=frozenset()) -> list:
    client = build_client()
    model = os.environ.get("LLM_MODEL", "openai/gpt-oss-120b")
    prompt = PROMPT.format(n=n * 2, exclude=", ".join(sorted(exclude)) or "none")
    resp = client.chat.completions.create(
        model=model, messages=[{"role": "user", "content": prompt}], temperature=0.9)
    return parse_topics(resp.choices[0].message.content)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_whatonearth_topics.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add whatonearth/topics.py tests/test_whatonearth_topics.py
git commit -m "feat(whatonearth): generación de temas con LLM + parseo robusto"
```

---

### Task 4: Ranking + fuente Pixabay (`whatonearth/sourcing.py`)

**Files:**
- Create: `whatonearth/sourcing.py`
- Test: `tests/test_whatonearth_sourcing.py`

**Interfaces:**
- Produces:
  - `rank(cands: list[dict], query: str) -> dict | None` — elige el mejor candidato **relevante (tag match > 0) y HD (height >= 1080)**; `None` si ninguno.
  - `search_pixabay(query: str) -> list[dict]` — candidatos normalizados.
  - `find_clip(query: str, workdir) -> dict | None` — baja el mejor clip; devuelve `{local_path, source, author, license, source_url}` o `None`.
  - candidato normalizado: `{url, height, width, duration, tags, downloads, author, source_url, source, license}`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_whatonearth_sourcing.py
from whatonearth import sourcing


def _cand(h, tags, dl=0, dur=5):
    return {"url": f"http://x/{h}.mp4", "height": h, "width": h * 16 // 9,
            "duration": dur, "tags": tags, "downloads": dl, "author": "a",
            "source_url": "http://x", "source": "pixabay", "license": "Pixabay"}


def test_rank_elige_relevante_hd():
    cands = [
        _cand(2160, "dragon, fantasy, mythical"),      # HD pero irrelevante
        _cand(1080, "pangolin, wildlife, animal", 50),  # relevante + HD
        _cand(480, "pangolin, closeup"),                # relevante pero baja res
    ]
    best = sourcing.rank(cands, "pangolin")
    assert best["height"] == 1080


def test_rank_descarta_todo_irrelevante():
    assert sourcing.rank([_cand(2160, "tractor, farm")], "passion fruit") is None


def test_rank_descarta_sin_hd():
    assert sourcing.rank([_cand(480, "pangolin")], "pangolin") is None


def test_find_clip_baja_el_mejor(monkeypatch, tmp_path):
    monkeypatch.setattr(sourcing, "search_pixabay",
                        lambda q: [_cand(1080, "pangolin, animal", 10)])
    monkeypatch.setattr(sourcing, "search_pexels", lambda q: [])
    monkeypatch.setattr(sourcing, "search_wikimedia", lambda q: [])
    monkeypatch.setattr(sourcing, "_download", lambda url, out: out.write_bytes(b"MP4"))
    res = sourcing.find_clip("pangolin", tmp_path)
    assert res["source"] == "pixabay"
    assert res["local_path"].exists()


def test_find_clip_sin_resultados(monkeypatch, tmp_path):
    monkeypatch.setattr(sourcing, "search_pixabay", lambda q: [])
    monkeypatch.setattr(sourcing, "search_pexels", lambda q: [])
    monkeypatch.setattr(sourcing, "search_wikimedia", lambda q: [])
    assert sourcing.find_clip("durian", tmp_path) is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_whatonearth_sourcing.py -v`
Expected: FAIL (ModuleNotFoundError: whatonearth.sourcing).

- [ ] **Step 3: Write minimal implementation**

```python
# whatonearth/sourcing.py
"""Busca el mejor clip LEGAL por tema: Pixabay -> Pexels -> Wikimedia.
Rankea por relevancia (tags) + resolución; solo relevantes HD. (Pexels/Wikimedia
se agregan en Task 5; acá quedan como stubs para que find_clip ya los ordene.)"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

from reddit_pipeline.env import load_env

_UA = {"User-Agent": "Mozilla/5.0 (whatonearth bot)"}


def _terms(query: str) -> set:
    return {t for t in query.lower().replace("-", " ").split() if len(t) > 2}


def rank(cands: list, query: str):
    """Mejor candidato relevante (tag match>0) y HD (>=1080), o None."""
    terms = _terms(query)

    def score(c):
        tags = set(str(c.get("tags", "")).lower().replace(",", " ").split())
        tag_hit = len(terms & tags)
        dur_ok = 1 if 3 <= c.get("duration", 0) <= 40 else 0
        return (tag_hit, dur_ok, c.get("height", 0), c.get("downloads", 0))

    viables = [c for c in cands
               if c.get("height", 0) >= 1080 and (_terms(query) & set(
                   str(c.get("tags", "")).lower().replace(",", " ").split()))]
    if not viables:
        return None
    return max(viables, key=score)


def search_pixabay(query: str) -> list:
    load_env()
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return []
    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode(
        {"key": key, "q": query, "per_page": 60, "safesearch": "true", "order": "popular"})
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=_UA), timeout=30))
    except Exception:
        return []
    out = []
    for h in d.get("hits", []):
        vids = h.get("videos", {})
        streams = [v for k in ("large", "medium", "small") for v in [vids.get(k)]
                   if v and v.get("url")]
        pick = next((v for v in sorted(streams, key=lambda v: v.get("height", 0))
                     if v.get("height", 0) >= 1080), None)
        if not pick:
            continue
        out.append({"url": pick["url"], "height": pick.get("height", 0),
                    "width": pick.get("width", 0), "duration": h.get("duration", 0),
                    "tags": h.get("tags", ""), "downloads": h.get("downloads", 0),
                    "author": h.get("user", ""), "source_url": h.get("pageURL", ""),
                    "source": "pixabay", "license": "Pixabay Content License"})
    return out


def search_pexels(query: str) -> list:   # implementado en Task 5
    return []


def search_wikimedia(query: str) -> list:   # implementado en Task 5
    return []


def _download(url: str, out: Path) -> None:
    out.write_bytes(urllib.request.urlopen(
        urllib.request.Request(url, headers=_UA), timeout=180).read())


def find_clip(query: str, workdir):
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    for search in (search_pixabay, search_pexels, search_wikimedia):
        best = rank(search(query), query)
        if not best:
            continue
        safe = "".join(ch for ch in query if ch.isalnum() or ch == " ").strip().replace(" ", "_")
        out = workdir / f"{best['source']}_{safe}.mp4"
        try:
            _download(best["url"], out)
        except Exception:
            continue
        return {"local_path": out, "source": best["source"], "author": best.get("author", ""),
                "license": best.get("license", ""), "source_url": best.get("source_url", "")}
    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_whatonearth_sourcing.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add whatonearth/sourcing.py tests/test_whatonearth_sourcing.py
git commit -m "feat(whatonearth): sourcing con ranking (relevancia+HD) y fuente Pixabay"
```

---

### Task 5: Fuentes Wikimedia + Pexels (`whatonearth/sourcing.py`)

**Files:**
- Modify: `whatonearth/sourcing.py` (reemplaza los stubs `search_pexels` y `search_wikimedia`)
- Test: `tests/test_whatonearth_sourcing_sources.py`

**Interfaces:**
- Consumes/Produces: mismas firmas `search_pexels(query) -> list`, `search_wikimedia(query) -> list` (candidatos normalizados como en Task 4). `search_pexels` devuelve `[]` si no hay `PEXELS_API_KEY`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_whatonearth_sourcing_sources.py
from whatonearth import sourcing


def test_pexels_sin_key_devuelve_vacio(monkeypatch):
    monkeypatch.delenv("PEXELS_API_KEY", raising=False)
    assert sourcing.search_pexels("pangolin") == []


def test_pexels_normaliza(monkeypatch):
    monkeypatch.setenv("PEXELS_API_KEY", "k")
    payload = {"videos": [{
        "url": "https://www.pexels.com/video/123/", "duration": 8,
        "user": {"name": "Jane"}, "tags": ["pangolin"],
        "video_files": [
            {"link": "http://x/hd.mp4", "height": 1080, "width": 1920},
            {"link": "http://x/sd.mp4", "height": 480, "width": 854}],
    }]}

    class _R:
        status_code = 200
        def json(self):
            return payload

    monkeypatch.setattr(sourcing.requests, "get", lambda *a, **k: _R())
    cands = sourcing.search_pexels("pangolin")
    assert cands and cands[0]["height"] == 1080
    assert cands[0]["source"] == "pexels"
    assert cands[0]["author"] == "Jane"


def test_wikimedia_normaliza(monkeypatch):
    payload = {"query": {"pages": {"1": {
        "title": "File:Pangolin.webm",
        "imageinfo": [{"url": "http://commons/pangolin.webm", "width": 1920,
                       "height": 1080, "extmetadata": {
                           "Artist": {"value": "Bob"},
                           "LicenseShortName": {"value": "CC BY-SA 4.0"}},
                       "descriptionurl": "http://commons/page"}],
    }}}}

    class _R:
        status_code = 200
        def json(self):
            return payload

    monkeypatch.setattr(sourcing.requests, "get", lambda *a, **k: _R())
    cands = sourcing.search_wikimedia("pangolin")
    assert cands and cands[0]["source"] == "wikimedia"
    assert cands[0]["license"].startswith("CC")
    assert cands[0]["tags"]  # usa el título como tags para el ranking
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_whatonearth_sourcing_sources.py -v`
Expected: FAIL (search_pexels/search_wikimedia devuelven `[]` sin mirar los mocks → asserts fallan).

- [ ] **Step 3: Write minimal implementation**

Add `import requests` al tope de `whatonearth/sourcing.py` (junto a los otros imports) y reemplazá los dos stubs por:

```python
def search_pexels(query: str) -> list:
    load_env()
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return []
    try:
        r = requests.get("https://api.pexels.com/videos/search",
                         headers={"Authorization": key},
                         params={"query": query, "per_page": 30, "size": "medium"}, timeout=30)
        if r.status_code != 200:
            return []
        data = r.json()
    except Exception:
        return []
    out = []
    for v in data.get("videos", []):
        files = [f for f in v.get("video_files", []) if f.get("link")]
        pick = next((f for f in sorted(files, key=lambda f: f.get("height", 0))
                     if f.get("height", 0) >= 1080), None)
        if not pick:
            continue
        out.append({"url": pick["link"], "height": pick.get("height", 0),
                    "width": pick.get("width", 0), "duration": v.get("duration", 0),
                    "tags": " ".join(v.get("tags", [])) or query,
                    "downloads": 0, "author": v.get("user", {}).get("name", ""),
                    "source_url": v.get("url", ""), "source": "pexels",
                    "license": "Pexels License"})
    return out


def search_wikimedia(query: str) -> list:
    try:
        r = requests.get("https://commons.wikimedia.org/w/api.php", headers=_UA, params={
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": f"filetype:video {query}", "gsrlimit": 20, "gsrnamespace": 6,
            "prop": "imageinfo", "iiprop": "url|size|extmetadata",
        }, timeout=30)
        if r.status_code != 200:
            return []
        pages = r.json().get("query", {}).get("pages", {})
    except Exception:
        return []
    out = []
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        if not info.get("url") or info.get("height", 0) < 1080:
            continue
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        out.append({"url": info["url"], "height": info.get("height", 0),
                    "width": info.get("width", 0), "duration": 10,
                    "tags": p.get("title", "").replace("File:", "").replace("_", " ") + " " + query,
                    "downloads": 0, "author": meta.get("Artist", {}).get("value", "")[:80],
                    "source_url": info.get("descriptionurl", ""), "source": "wikimedia",
                    "license": lic or "CC"})
    return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_whatonearth_sourcing_sources.py tests/test_whatonearth_sourcing.py -v`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add whatonearth/sourcing.py tests/test_whatonearth_sourcing_sources.py
git commit -m "feat(whatonearth): fuentes Pexels (si hay key) + Wikimedia Commons (CC)"
```

---

### Task 6: Renderer del montaje (`render_whatonearth.py`)

**Files:**
- Create: `render_whatonearth.py`
- Test: `tests/test_render_whatonearth.py`

**Interfaces:**
- Consumes: `whatonearth.tts.synth`.
- Produces:
  - `name_card(name: str, out_path) -> None` — PNG del cartel.
  - `render(items: list[dict], out_path, workdir) -> Path` — ítem: `{name, question_en, answer_en, clip_path}`. Genera voces, arma segmentos, concatena. Requiere `ffmpeg`/`ffprobe` en PATH.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_render_whatonearth.py
import shutil
import subprocess
from pathlib import Path

import pytest

import render_whatonearth as rw

pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="requiere ffmpeg")


def _clip(path: Path, color="red", secs=2):
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                    f"color=c={color}:s=640x360:d={secs}", "-pix_fmt", "yuv420p", str(path)],
                   check=True, capture_output=True)


def test_name_card_crea_png(tmp_path):
    out = tmp_path / "card.png"
    rw.name_card("PANGOLIN", out)
    assert out.exists() and out.stat().st_size > 0


def test_render_produce_video(tmp_path, monkeypatch):
    # TTS falso: genera un mp3 de silencio real para no pegarle a la red
    def fake_synth(text, voice, out):
        subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                        "anullsrc=r=24000:cl=mono", "-t", "1", "-q:a", "9", str(out)],
                       check=True, capture_output=True)

    monkeypatch.setattr(rw.tts, "synth", fake_synth)
    clip = tmp_path / "c.mp4"; _clip(clip)
    out = tmp_path / "video.mp4"
    res = rw.render([{"name": "PANGOLIN", "question_en": "What is this?",
                      "answer_en": "This is a pangolin.", "clip_path": clip}],
                    out, tmp_path / "work")
    assert Path(res).exists()
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                "format=duration", "-of", "default=nw=1:nk=1", str(res)],
                               capture_output=True, text=True).stdout.strip())
    assert dur > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_render_whatonearth.py -v`
Expected: FAIL (ModuleNotFoundError: render_whatonearth).

- [ ] **Step 3: Write minimal implementation**

```python
# render_whatonearth.py
"""Renderer del montaje de 'What On Earth Is This': por cada ítem, clip entero
sobre fondo desenfocado + voz pregunta/respuesta (TikTok TTS) + cartel del nombre."""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from whatonearth import tts

VOICE_Q = "en_us_006"   # pregunta (Serious male)
VOICE_A = "en_us_001"   # respuesta (Jessie)
_FONT = "C:/Windows/Fonts/seguisb.ttf"


def _run(cmd, cwd):
    r = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg:\n" + r.stderr[-1400:])


def _dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "default=nw=1:nk=1", str(p)],
                                capture_output=True, text=True).stdout.strip())


def name_card(name: str, out_path) -> None:
    pad_x, h = 56, 150
    f = ImageFont.truetype(_FONT, 80)
    tw = ImageDraw.Draw(Image.new("RGBA", (10, 10))).textlength(name, font=f)
    W = int(tw + pad_x * 2)
    img = Image.new("RGBA", (W, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W - 1, h - 1], radius=36, fill=(255, 255, 255, 240))
    d.rounded_rectangle([0, 0, W - 1, h - 1], radius=36, outline=(255, 196, 0, 255), width=6)
    d.text((W / 2, h / 2), name, font=f, fill=(20, 20, 24, 255), anchor="mm")
    img.save(out_path)


def render(items: list, out_path, workdir) -> Path:
    work = Path(workdir)
    work.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
          "-t", "0.3", "-q:a", "9", "sil.mp3"], work)
    segs = []
    for i, it in enumerate(items):
        tts.synth(it["question_en"], VOICE_Q, work / f"q{i}.mp3")
        tts.synth(it["answer_en"], VOICE_A, work / f"a{i}.mp3")
        (work / f"al{i}.txt").write_text(
            f"file 'q{i}.mp3'\nfile 'sil.mp3'\nfile 'a{i}.mp3'\n", encoding="utf-8")
        _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", f"al{i}.txt",
              "-c:a", "aac", f"au{i}.m4a"], work)
        adur, qdur = _dur(work / f"au{i}.m4a"), _dur(work / f"q{i}.mp3")
        name_card(it["name"], work / f"name{i}.png")
        clip = Path(it["clip_path"]).resolve()
        vf = ("[0:v]split=2[b][f];"
              "[b]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
              "boxblur=26:1,eq=brightness=-0.06[bg];"
              "[f]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
              "[bg][fg]overlay=(W-w)/2:(H-h)/2[base];"
              f"[base][1:v]overlay=x=(W-w)/2:y=1500:enable='gte(t,{qdur:.2f})'[v]")
        _run(["ffmpeg", "-y", "-stream_loop", "-1", "-t", f"{adur + 0.3:.2f}", "-i", str(clip),
              "-i", f"name{i}.png", "-i", f"au{i}.m4a", "-filter_complex", vf,
              "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-preset", "veryfast",
              "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-r", "30",
              "-t", f"{adur + 0.3:.2f}", f"seg{i}.mp4"], work)
        segs.append(f"seg{i}.mp4")
    (work / "concat.txt").write_text("".join(f"file '{s}'\n" for s in segs), encoding="utf-8")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "concat.txt",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
          "-c:a", "aac", str(out_path.resolve())], work)
    return out_path
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_render_whatonearth.py -v`
Expected: PASS (2 passed; se saltea si no hay ffmpeg).

- [ ] **Step 5: Commit**

```bash
git add render_whatonearth.py tests/test_render_whatonearth.py
git commit -m "feat(whatonearth): renderer del montaje (framing + cartel + voces)"
```

---

### Task 7: Orquestador de build (`whatonearth/build.py`)

**Files:**
- Create: `whatonearth/build.py`
- Test: `tests/test_whatonearth_build.py`

**Interfaces:**
- Consumes: `topics.generate_topics`, `sourcing.find_clip`, `render_whatonearth.render`, `db`.
- Produces:
  - `make_title(items) -> str`
  - `make_description(items) -> str` (1ª línea = hook; atribuciones CC; línea de hashtags; disclaimer)
  - `collect_items(n, workdir, *, _gen=..., _find=...) -> list[dict]` — junta `n` ítems con clip (repone los que se caen; tope de rondas).
  - `build_video(n=6, out_dir=..., conn=None) -> int | None` — arma 1 video y lo inserta en el backlog; devuelve seq o None.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_whatonearth_build.py
from whatonearth import build


def test_make_description_formato():
    items = [{"name": "Pangolin", "source": "wikimedia", "author": "Bob",
              "license": "CC BY-SA 4.0", "source_url": "http://c/x"}]
    desc = build.make_description(items)
    lines = desc.splitlines()
    assert lines[0].strip()                 # hook en 1ª línea
    assert any("#" in ln for ln in lines)   # hashtags
    assert "Bob" in desc and "CC BY-SA 4.0" in desc   # atribución CC
    assert "DM" in desc or "dm" in desc.lower()        # disclaimer de cortesía


def test_collect_items_repone_caidos():
    # 2 temas dan clip, 1 no; pedimos 2 -> debe reponer con una 2da ronda
    temas = iter([
        [{"name": "A", "category": "animal", "query": "a", "question_en": "q", "answer_en": "a"},
         {"name": "B", "category": "place", "query": "b", "question_en": "q", "answer_en": "a"}],
        [{"name": "C", "category": "object", "query": "c", "question_en": "q", "answer_en": "a"}],
    ])
    found = {"a": {"local_path": "a.mp4", "source": "pixabay", "author": "", "license": "", "source_url": ""},
             "b": None,  # B se cae
             "c": {"local_path": "c.mp4", "source": "pixabay", "author": "", "license": "", "source_url": ""}}

    items = build.collect_items(
        2, "work",
        _gen=lambda n, exclude: next(temas),
        _find=lambda q, wd: found.get(q))
    assert [it["name"] for it in items] == ["A", "C"]


def test_collect_items_corta_tras_tope():
    # nunca hay clips -> no cuelga, devuelve menos de n
    items = build.collect_items(
        3, "work",
        _gen=lambda n, exclude: [{"name": "Z", "category": "x", "query": "z",
                                  "question_en": "q", "answer_en": "a"}],
        _find=lambda q, wd: None, max_rounds=3)
    assert items == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_whatonearth_build.py -v`
Expected: FAIL (ModuleNotFoundError: whatonearth.build).

- [ ] **Step 3: Write minimal implementation**

```python
# whatonearth/build.py
"""Arma un video completo y lo deja en el backlog: temas -> clips legales -> render."""
from __future__ import annotations

from pathlib import Path

from whatonearth import db, sourcing, topics
import render_whatonearth

N_ITEMS = 6
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "whatonearth"

_HASHTAGS = ("#shorts #whatisthis #satisfying #nature #animals #travel "
             "#didyouknow #fyp #viral #foryou")
_DISCLAIMER = "Clips via Pixabay/Pexels/Wikimedia Commons. If a clip is yours, DM us for credit or removal."


def make_title(items: list) -> str:
    head = items[0]["name"] if items else "this"
    return f"What on earth is this?! \U0001F92F ({head} and more)"


def make_description(items: list) -> str:
    hook = "Wait... what on earth are these?! Can you name them all? \U0001F440"
    attribs = []
    for it in items:
        if it.get("source") in ("wikimedia",) and (it.get("author") or it.get("license")):
            attribs.append(f"- {it['name']}: {it.get('author','?')} / {it.get('license','')} ({it.get('source_url','')})")
    attrib_block = ("\n".join(attribs) + "\n\n") if attribs else ""
    return f"{hook}\n\n{attrib_block}{_HASHTAGS}\n\n{_DISCLAIMER}"


def collect_items(n: int, workdir, *, _gen=None, _find=None, max_rounds: int = 4) -> list:
    gen = _gen or (lambda count, exclude: topics.generate_topics(count, exclude))
    find = _find or (lambda q, wd: sourcing.find_clip(q, wd))
    items, used = [], set()
    rounds = 0
    while len(items) < n and rounds < max_rounds:
        rounds += 1
        for t in gen(n - len(items), used):
            used.add(t["name"])
            clip = find(t["query"], workdir)
            if not clip:
                continue
            items.append({**t, **clip, "clip_path": clip["local_path"]})
            if len(items) >= n:
                break
    return items[:n]


def build_video(n: int = N_ITEMS, out_dir=OUT_DIR, conn=None) -> int | None:
    out_dir = Path(out_dir)
    work = out_dir / ".work"
    items = collect_items(n, work)
    if len(items) < n:
        print(f"[whatonearth] solo {len(items)}/{n} ítems con clip; no se postea.")
        return None
    own = conn or db.connect()
    if conn is None:
        db.init(own)
    seq = (max([v["seq"] for v in db.all_videos(own)], default=0)) + 1
    video_path = out_dir / f"woe_{seq:04d}.mp4"
    render_whatonearth.render(items, video_path, work)
    meta_items = [{"name": it["name"], "source": it.get("source"), "author": it.get("author"),
                   "license": it.get("license"), "source_url": it.get("source_url")} for it in items]
    real_seq = db.add_video(own, title=make_title(items), description=make_description(meta_items),
                            video_path=str(video_path), items=meta_items)
    print(f"[whatonearth] video seq {real_seq} -> {video_path}")
    return real_seq
```

> Nota: `collect_items` acepta `_gen`/`_find` inyectables SOLO para test (DI); en producción usa los defaults reales.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_whatonearth_build.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add whatonearth/build.py tests/test_whatonearth_build.py
git commit -m "feat(whatonearth): orquestador build (temas->clips->render->backlog)"
```

---

### Task 8: Adaptador `series` (`series_whatonearth.py`)

**Files:**
- Create: `series_whatonearth.py`
- Test: `tests/test_series_whatonearth.py`

**Interfaces:**
- Consumes: `whatonearth.db`.
- Produces (interfaz `series` + extra):
  - `PARTS: dict[int, dict]` (cada part = `{titulo, video_path, descripcion, resumen}`)
  - `title_for(part) -> str`, `descripcion(parte, resumen) -> str`, `background_for(part) -> str` (stub), `KEYWORDS: list[str]`
  - `video_path_for(part) -> str` (ruta del mp4 pre-renderizado; el hook de daily_post lo usa)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_series_whatonearth.py
import importlib

from whatonearth import db


def _seed(tmp_path, monkeypatch):
    dbfile = tmp_path / "videos.sqlite"
    c = db.connect(dbfile); db.init(c)
    db.add_video(c, title="What on earth is this?! (Pangolin and more)",
                 description="hook\n\n#shorts", video_path=str(tmp_path / "woe_0001.mp4"),
                 items=[{"name": "Pangolin"}])
    c.close()
    monkeypatch.setattr(db, "DB_PATH", dbfile)
    import series_whatonearth
    return importlib.reload(series_whatonearth)


def test_interfaz_series(tmp_path, monkeypatch):
    s = _seed(tmp_path, monkeypatch)
    for attr in ("PARTS", "KEYWORDS", "title_for", "descripcion", "background_for"):
        assert hasattr(s, attr)


def test_partes_y_video_path(tmp_path, monkeypatch):
    s = _seed(tmp_path, monkeypatch)
    assert 1 in s.PARTS
    assert s.title_for(1).startswith("What on earth")
    assert s.video_path_for(1).endswith("woe_0001.mp4")
    assert "#shorts" in s.descripcion(1, "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_series_whatonearth.py -v`
Expected: FAIL (ModuleNotFoundError: series_whatonearth).

- [ ] **Step 3: Write minimal implementation**

```python
# series_whatonearth.py
"""Fuente de 'partes' del canal What On Earth Is This. Cada parte = un video YA
renderizado en el backlog (whatonearth/videos.sqlite). daily_post lo postea tal cual
vía el hook video_path_for (no re-renderiza)."""
from __future__ import annotations

from whatonearth import db

KEYWORDS = [
    "shorts", "what is this", "guess", "satisfying", "nature", "animals",
    "travel", "did you know", "weird", "rare", "viral", "fyp",
]


def _load() -> dict:
    if not db.DB_PATH.exists():
        return {}
    conn = db.connect(db.DB_PATH)   # pasar el atributo actual (monkeypatch-friendly)
    try:
        parts = {}
        for v in db.all_videos(conn):
            parts[v["seq"]] = {
                "titulo": v["title"], "video_path": v["video_path"],
                "descripcion": v["description"], "resumen": v["title"],
            }
        return parts
    finally:
        conn.close()


PARTS: dict = _load()


def title_for(part: int) -> str:
    return PARTS[part]["titulo"]


def descripcion(parte: int, resumen: str) -> str:
    return PARTS[parte]["descripcion"]


def background_for(part: int) -> str:
    # El video está pre-renderizado; este stub existe solo para cumplir la interfaz
    # `series` (daily_post usa video_path_for, no background_for, para este canal).
    return ""


def video_path_for(part: int) -> str:
    return PARTS[part]["video_path"]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_series_whatonearth.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add series_whatonearth.py tests/test_series_whatonearth.py
git commit -m "feat(whatonearth): adaptador series con video_path_for (pre-render)"
```

---

### Task 9: Hook de video pre-renderizado en `daily_post.py`

**Files:**
- Modify: `daily_post.py` (función `_ensure_video`, línea ~81)
- Test: `tests/test_ensure_video_prerendered.py`

**Interfaces:**
- Consumes: un módulo `series` que opcionalmente expone `video_path_for(part) -> str`.
- Produces: `_ensure_video(part, ctx, series)` devuelve `Path(series.video_path_for(part))` sin llamar a `generate` cuando ese atributo existe; comportamiento intacto si no existe.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ensure_video_prerendered.py
from pathlib import Path
import types

import daily_post


def test_usa_video_prerenderizado():
    # Un series que expone video_path_for -> _ensure_video devuelve ESE path tal cual,
    # sin tocar generate ni calcular rutas de output.
    serie = types.SimpleNamespace(video_path_for=lambda p: "C:/x/woe_0001.mp4")
    out = daily_post._ensure_video(1, {"engine_channel": "whatonearth"}, serie)
    assert out == Path("C:/x/woe_0001.mp4")
```

> El camino viejo (sin `video_path_for` → llama a `generate`) ya está cubierto por
> `tests/test_ensure_video_voice.py`; lo corremos en el Step 4 para confirmar que no se rompió.

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_ensure_video_prerendered.py::test_usa_video_prerenderizado -v`
Expected: FAIL (devuelve la ruta vieja `output/.../slug.mp4`, no la pre-renderizada).

- [ ] **Step 3: Write minimal implementation**

En `daily_post.py`, al INICIO de `_ensure_video` (justo después del docstring de la línea 82), agregar:

```python
    # Canales con video PRE-RENDERIZADO (ej. whatonearth) exponen video_path_for:
    # daily_post postea ese mp4 tal cual, sin pasar por curiosidades.generate.
    if hasattr(series, "video_path_for"):
        return Path(series.video_path_for(part))
```

(No cambiar nada más de la función; el resto del cuerpo sigue igual para los 4 canales actuales.)

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_ensure_video_prerendered.py tests/test_ensure_video_voice.py -v`
Expected: PASS (los nuevos + los viejos de _ensure_video siguen verdes).

- [ ] **Step 5: Commit**

```bash
git add daily_post.py tests/test_ensure_video_prerendered.py
git commit -m "feat(daily_post): hook de video pre-renderizado (video_path_for)"
```

---

### Task 10: Registrar el canal (`channels_registry.py`)

**Files:**
- Modify: `channels_registry.py` (dict `CHANNELS`)
- Modify: `tests/test_registry.py` (actualizar el set esperado y agregar el contexto)

**Interfaces:**
- Produces: `channels_registry.CHANNELS["whatonearth"]` con `series="series_whatonearth"`, `platforms=("ig","tt")`, tokens en `secrets/whatonearth/`.

- [ ] **Step 1: Write the failing test**

En `tests/test_registry.py`, actualizar `test_canales_registrados` y agregar un test:

```python
def test_canales_registrados():
    assert set(reg.CHANNELS) == {"faceless", "historia", "misterios", "soyelmalo", "whatonearth"}


def test_contexto_whatonearth():
    ctx = reg.get_channel("whatonearth")
    assert ctx["display"] == "What On Earth Is This"
    assert ctx["series"] == "series_whatonearth"
    assert ctx["platforms"] == ("ig", "tt")
    assert ctx["ig_creds"] == "secrets/whatonearth/instagram.json"
    assert ctx["tt_token"] == "secrets/whatonearth/tiktok_token.json"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_registry.py::test_contexto_whatonearth tests/test_registry.py::test_canales_registrados -v`
Expected: FAIL (KeyError whatonearth / set no coincide).

- [ ] **Step 3: Write minimal implementation**

En `channels_registry.py`, agregar dentro de `CHANNELS` (después de la entrada `soyelmalo`):

```python
    "whatonearth": {
        "display": "What On Earth Is This",
        "series": "series_whatonearth",   # adaptador: lee whatonearth/videos.sqlite (pre-render)
        "engine_channel": "whatonearth",
        "music": "music/lofi",            # no se usa (video pre-renderizado), requerido por el ctx
        "yt_token": "secrets/whatonearth/token.json",
        "ig_creds": "secrets/whatonearth/instagram.json",
        "tt_token": "secrets/whatonearth/tiktok_token.json",
        "platforms": ("ig", "tt"),        # YT se suma luego (2º proyecto Cloud)
        "first_comment": "Could you name them all? \U0001F440 Drop your score below!",
        "sfx_style": "datos",
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_registry.py -v`
Expected: PASS (incluye `test_series_cargan`, que valida que `series_whatonearth` tenga PARTS/KEYWORDS/title_for/descripcion/background_for).

- [ ] **Step 5: Commit**

```bash
git add channels_registry.py tests/test_registry.py
git commit -m "feat(whatonearth): registrar canal en el motor (TikTok + IG)"
```

---

## Verificación final

- [ ] Correr toda la suite: `python -m pytest -q` → todo verde (incluidos los 4 canales existentes).
- [ ] Smoke manual del pipeline (requiere `.env` con `LLM_API_KEY` + `PIXABAY_API_KEY` y red):
  `python -c "from whatonearth.build import build_video; build_video()"` → debe dejar `output/whatonearth/woe_0001.mp4` y una fila en `whatonearth/videos.sqlite`.
- [ ] (Operativo, fuera de tareas) Crear cuentas + OAuth de IG/TikTok → `secrets/whatonearth/`, luego `daily_post` postea.

## Notas de integración / fuera de alcance

- **Backlog**: el build se corre on-demand (o en un `.bat` programado, como los otros canales) para llenar `videos.sqlite`; `daily_post` consume por `seq` con sus contadores enteros por plataforma.
- **Fuera de alcance**: YouTube + 2º proyecto Cloud; herramienta manual de rip TT/IG; canal 2 (dramas IA).
