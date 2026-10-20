# Videos satisfactorios en clips de streamers — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el espejo/negro de los clips de streamers por videos satisfactorios horizontales que rotan de un pool, con el layout elegido según si el clip tiene gameplay.

**Architecture:** La detección gameplay la hace el QC Gemini (`streamers/verify.classify_gameplay`) y se guarda en la DB (`has_gameplay`). Un pool rotativo (`streamers/satisfying.py`) entrega 1 o 2 satisfactorios sin repetir. `src/edit.render_short` compone dos layouts nuevos. La wiring vive en `src/pipeline.py` + `streamers/build.py`, gateada por `satisfying: true` en `config/channels.yaml`. Un script re-renderiza el colchón existente.

**Tech Stack:** Python 3.12, SQLite, ffmpeg (filtergraph), yt-dlp, Gemini vision API, pytest.

## Global Constraints

- TDD estricto (RED→GREEN→commit) para toda lógica pura. Lo que depende de ffmpeg/red/Gemini se mockea en los tests y se valida en vivo por frames.
- Scope SOLO streamers (A/B/C). No tocar faceless/historia/misterios/whatonearth: la feature se gatea por `channel.get("satisfying")`.
- Audio de los satisfactorios SIEMPRE muteado (solo se mapea su video). Se conserva `[0:a]` (diálogo) + música.
- Satisfactorios loopean (`-stream_loop -1`) y se cortan con `-shortest`.
- Numeración de inputs ffmpeg: `[0]` = clip fuente; los satisfactorios van PRIMERO en `extra_inputs` ([1], [2]), luego música/wm.
- Pool en `streamers/satisfying/` (gitignoreado). Estado en `streamers/satisfying_state.json`.

---

## File Structure

| Archivo | Responsabilidad |
|---------|-----------------|
| `streamers/db.py` (mod) | columna `has_gameplay` + migración idempotente + `set_gameplay` |
| `streamers/satisfying.py` (new) | pool + `pick_for(channel, n)` con rotación; `source_pool()` |
| `streamers/verify.py` (mod) | `classify_gameplay(video) -> bool|None` |
| `src/edit.py` (mod) | `render_short(..., satisfy_top, satisfy_bottom)` + 2 layouts nuevos |
| `src/pipeline.py` (mod) | elegir satisfactorios + pasar a `render_short` según `has_gameplay` |
| `streamers/build.py` (mod) | clasificar gameplay + guardar `has_gameplay` al aprobar |
| `config/channels.yaml` (mod) | `satisfying: true` en el perfil streamers |
| `streamers/rerender.py` (new) | re-render del colchón aprobado |

---

### Task 1: columna `has_gameplay` en la DB

**Files:**
- Modify: `streamers/db.py`
- Test: `tests/test_streamers_db_gameplay.py`

**Interfaces:**
- Produces: `set_gameplay(conn, seq: int, has_gameplay: bool) -> None`; `add_clip(..., has_gameplay: bool|None = None)`; `_row` incluye `"has_gameplay": bool|None`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_streamers_db_gameplay.py
import streamers.db as db

def test_migracion_agrega_has_gameplay_idempotente(tmp_path):
    p = tmp_path / "b.sqlite"
    conn = db.connect(p); conn.close()
    conn = db.connect(p)                      # 2a vez: no debe explotar
    cols = {r[1] for r in conn.execute("PRAGMA table_info(clips)")}
    assert "has_gameplay" in cols
    conn.close()

def test_set_y_lee_gameplay(tmp_path):
    conn = db.connect(tmp_path / "b.sqlite")
    seq = db.add_clip(conn, title="t", description="d", video_path="v.mp4",
                      streamer="s", clip_id="1", status="approved")
    db.set_gameplay(conn, seq, True)
    row = db.by_status(conn, "approved")[0]
    assert row["has_gameplay"] is True
    conn.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_streamers_db_gameplay.py -q`
Expected: FAIL (`has_gameplay` no en cols / `set_gameplay` no existe).

- [ ] **Step 3: Implement**

En `streamers/db.py`, dentro de `connect()`, tras las migraciones existentes y antes de `conn.commit()`:
```python
    if "has_gameplay" not in cols:                  # migración: ¿el clip tiene gameplay? (layout)
        conn.execute("ALTER TABLE clips ADD COLUMN has_gameplay INTEGER")
```
En `_row`, agregar al dict:
```python
            "has_gameplay": (None if ("has_gameplay" not in keys or r["has_gameplay"] is None)
                             else bool(r["has_gameplay"])),
```
Nueva función:
```python
def set_gameplay(conn, seq: int, has_gameplay: bool) -> None:
    conn.execute("UPDATE clips SET has_gameplay = ? WHERE seq = ?", (1 if has_gameplay else 0, seq))
    conn.commit()
```
En `add_clip`, agregar parámetro `has_gameplay: bool | None = None` y escribir la columna (incluir `has_gameplay` en el INSERT con `None if has_gameplay is None else int(has_gameplay)`).

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_streamers_db_gameplay.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add streamers/db.py tests/test_streamers_db_gameplay.py
git commit -m "feat(streamers): columna has_gameplay en el backlog + set_gameplay"
```

---

### Task 2: pool satisfactorio con rotación

**Files:**
- Create: `streamers/satisfying.py`
- Test: `tests/test_streamers_satisfying.py`

**Interfaces:**
- Produces: `pick_for(channel: str, n: int, pool_dir: Path | None = None, state_path: Path | None = None) -> list[Path]` — devuelve `n` paths distintos del pool, ninguno usado en la llamada ANTERIOR del mismo canal; actualiza el estado. Si el pool tiene menos de `n`, devuelve los que haya (sin romper).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_streamers_satisfying.py
from pathlib import Path
import streamers.satisfying as S

def _pool(tmp, k):
    d = tmp / "sat"; d.mkdir()
    for i in range(k):
        (d / f"sat_{i:02d}.mp4").write_bytes(b"\x00")
    return d

def test_pick_devuelve_n_distintos(tmp_path):
    pool, st = _pool(tmp_path, 6), tmp_path / "state.json"
    got = S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st)
    assert len(got) == 2 and got[0] != got[1]

def test_no_repite_vs_video_anterior(tmp_path):
    pool, st = _pool(tmp_path, 6), tmp_path / "state.json"
    first = set(S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st))
    second = set(S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st))
    assert first.isdisjoint(second)                 # ni top ni bottom repiten vs el anterior

def test_pool_chico_no_rompe(tmp_path):
    pool, st = _pool(tmp_path, 1), tmp_path / "state.json"
    got = S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st)
    assert len(got) >= 1

def test_canales_independientes(tmp_path):
    pool, st = _pool(tmp_path, 6), tmp_path / "state.json"
    S.pick_for("streamers_a", 2, pool_dir=pool, state_path=st)
    got_b = S.pick_for("streamers_b", 2, pool_dir=pool, state_path=st)   # otro canal, sin restricción previa
    assert len(got_b) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_streamers_satisfying.py -q`
Expected: FAIL (módulo/`pick_for` no existe).

- [ ] **Step 3: Implement**

```python
# streamers/satisfying.py
"""Pool de videos satisfactorios horizontales + rotación. pick_for entrega n clips distintos,
sin repetir respecto a la llamada anterior del mismo canal (estado en satisfying_state.json)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POOL_DIR = ROOT / "streamers" / "satisfying"
STATE_PATH = ROOT / "streamers" / "satisfying_state.json"


def _load(state_path: Path) -> dict:
    try:
        return json.loads(state_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def pick_for(channel: str, n: int, pool_dir: Path | None = None,
             state_path: Path | None = None) -> list[Path]:
    pool_dir = Path(pool_dir or POOL_DIR)
    state_path = Path(state_path or STATE_PATH)
    pool = sorted(pool_dir.glob("*.mp4"))
    if not pool:
        return []
    state = _load(state_path)
    prev = set(state.get(channel, []))                 # nombres usados en el video anterior
    candidatos = [p for p in pool if p.name not in prev] or pool  # si no alcanzan, reusa el pool
    # elegir n distintos de forma estable (rotando por índice guardado)
    start = int(state.get(f"{channel}__cursor", 0)) % len(candidatos)
    picked: list[Path] = []
    i = start
    while len(picked) < min(n, len(pool)) and candidatos:
        cand = candidatos[i % len(candidatos)]
        if cand not in picked:
            picked.append(cand)
        i += 1
        if i - start > 2 * len(candidatos):            # corta si no hay más distintos
            break
    state[channel] = [p.name for p in picked]
    state[f"{channel}__cursor"] = start + len(picked)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    return picked
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_streamers_satisfying.py -q`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add streamers/satisfying.py tests/test_streamers_satisfying.py
git commit -m "feat(streamers): pool satisfactorio con rotacion sin repetir"
```

---

### Task 3: clasificación de gameplay (Gemini)

**Files:**
- Modify: `streamers/verify.py`
- Test: `tests/test_streamers_classify_gameplay.py`

**Interfaces:**
- Produces: `classify_gameplay(video_path, verbose: bool = True) -> bool | None` — True si hay videojuego en pantalla, False si es solo cara/charla, None si no hay key/QC no disponible.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_streamers_classify_gameplay.py
import streamers.verify as V

def test_classify_true(monkeypatch, tmp_path):
    monkeypatch.setattr(V, "_frames", lambda v, n=3: ["f.jpg"])
    monkeypatch.setattr(V, "_gemini", lambda p, f, verbose=True: {"gameplay": True})
    assert V.classify_gameplay(tmp_path / "v.mp4") is True

def test_classify_false(monkeypatch, tmp_path):
    monkeypatch.setattr(V, "_frames", lambda v, n=3: ["f.jpg"])
    monkeypatch.setattr(V, "_gemini", lambda p, f, verbose=True: {"gameplay": False})
    assert V.classify_gameplay(tmp_path / "v.mp4") is False

def test_classify_sin_qc_devuelve_none(monkeypatch, tmp_path):
    monkeypatch.setattr(V, "_frames", lambda v, n=3: ["f.jpg"])
    monkeypatch.setattr(V, "_gemini", lambda p, f, verbose=True: None)
    assert V.classify_gameplay(tmp_path / "v.mp4") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_streamers_classify_gameplay.py -q`
Expected: FAIL (`classify_gameplay` no existe).

- [ ] **Step 3: Implement**

En `streamers/verify.py`, agregar:
```python
_GAMEPLAY_PROMPT = (
    "Mirá estos frames de un clip de un streamer. ¿Hay un VIDEOJUEGO en pantalla (el streamer "
    "está jugando, se ve gameplay), o es SOLO el streamer hablando/IRL sin juego?\n"
    'Respondé SOLO JSON: {"gameplay": true/false}')

def classify_gameplay(video_path, verbose: bool = True) -> bool | None:
    """True si hay gameplay en pantalla, False si es solo cara/charla, None si el QC no está."""
    frames = _frames(video_path)
    if not frames:
        return None
    v = _gemini(_GAMEPLAY_PROMPT, frames, verbose)
    if v is None:
        return None
    return bool(v.get("gameplay"))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_streamers_classify_gameplay.py -q`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add streamers/verify.py tests/test_streamers_classify_gameplay.py
git commit -m "feat(streamers): classify_gameplay con vision Gemini"
```

---

### Task 4: layouts con satisfactorios en render_short

**Files:**
- Modify: `src/edit.py`
- Test: `tests/test_edit_satisfying_layout.py`

**Interfaces:**
- Consumes: nada de tasks previas (toma paths).
- Produces: `render_short(..., satisfy_top: Path|str|None = None, satisfy_bottom: Path|str|None = None)`. Helper testeable `_layout_graph(layout, face_box, width, height, punch, grade, subs, sat_top_idx, sat_bot_idx) -> str` que arma el `vfc`.

Reglas de selección (en `render_short`):
- `satisfy_top` y `satisfy_bottom` presentes → layout 3 franjas (640/640/640): `[st]` top, clip medio, `[sb]` bottom.
- solo `satisfy_bottom` + `face_box` → layout gaming (cara 620 / gameplay 608 / `[sb]` 684 abajo).
- ninguno → comportamiento actual (sin cambios).

Los satisfactorios se agregan a `extra_inputs` ANTES de música/wm, con `-stream_loop -1`, y sus índices se pasan al grafo.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_edit_satisfying_layout.py
import src.edit as E

def test_layout_tres_franjas_usa_ambos_satisfactorios():
    g = E._layout_graph(layout="", face_box=None, width=1080, height=1920,
                        punch="", grade="", subs="subtitles=x.ass", sat_top_idx=1, sat_bot_idx=2)
    assert "[1:v]" in g and "[2:v]" in g            # top y bottom
    assert "overlay=0:640" in g and "overlay=0:1280" in g

def test_layout_gaming_usa_satisfactorio_abajo():
    g = E._layout_graph(layout="gaming", face_box=(10, 10, 100, 100), width=1080, height=1920,
                        punch="", grade="", subs="subtitles=x.ass", sat_top_idx=None, sat_bot_idx=1)
    assert "[1:v]" in g                              # satisfactorio abajo
    assert "overlay=0:1236" in g                     # reemplaza el negro
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_edit_satisfying_layout.py -q`
Expected: FAIL (`_layout_graph` no existe).

- [ ] **Step 3: Implement**

En `src/edit.py` agregar el helper `_layout_graph` que genera el `vfc` para los casos nuevos (y delega al actual si no hay satisfactorios). Grafos concretos:

Gaming + satisfactorio abajo (sat_bot_idx = i):
```python
    fx, fy, fw_, fh_ = [int(v) for v in face_box]
    FACE_H, GAME_H, GAME_Y = 620, 608, 628
    face = (f"crop={fw_}:{fh_}:{fx}:{fy},scale=1080:{FACE_H}:force_original_aspect_ratio=increase,"
            f"crop=1080:{FACE_H},unsharp=5:5:0.8:5:5:0.0,setsar=1")
    game = f"scale=1080:{GAME_H}:force_original_aspect_ratio=increase,crop=1080:{GAME_H},setsar=1"
    sat = f"scale=1080:684:force_original_aspect_ratio=increase,crop=1080:684,setsar=1"
    post = f"{grade}," if grade else ""
    vfc = ";".join([
        "[0:v]split=3[fa][gb][bc]",
        f"[fa]{face}[face]", f"[gb]{game}[game]",
        "[bc]scale=1080:1920,drawbox=0:0:1080:1920:color=black:t=fill,setsar=1[bg]",
        f"[{sat_bot_idx}:v]{sat}[sat]",
        "[bg][face]overlay=0:0[t1]",
        f"[t1][game]overlay=0:{GAME_Y}[t2]",
        "[t2][sat]overlay=0:1236:shortest=1[comp]",
        f"[comp]{post}{subs}[v]",
    ])
```
3 franjas (sat_top_idx = i, sat_bot_idx = j):
```python
    band = "scale=1080:640:force_original_aspect_ratio=increase,crop=1080:640,setsar=1"
    post = f"{grade}," if grade else ""
    vfc = ";".join([
        "[0:v]split=2[cl][bc]",
        f"[cl]{band}[clip]",
        "[bc]scale=1080:1920,drawbox=0:0:1080:1920:color=black:t=fill,setsar=1[bg]",
        f"[{sat_top_idx}:v]{band}[st]",
        f"[{sat_bot_idx}:v]{band}[sb]",
        "[bg][st]overlay=0:0[t1]",
        "[t1][clip]overlay=0:640[t2]",
        "[t2][sb]overlay=0:1280:shortest=1[comp]",
        f"[comp]{post}{subs}[v]",
    ])
```
En `render_short`: antes de construir `vfc`, si hay satisfactorios, agregarlos a `extra_inputs` con `-stream_loop -1 -i <path>` y reservar sus índices (empezando en 1), luego llamar a `_layout_graph` con esos índices; el `idx` para música/wm arranca después. Si no hay satisfactorios, usar el `vfc` actual (refactor: mover el bloque actual lines 92-128 adentro de `_layout_graph` como caso default).

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_edit_satisfying_layout.py -q`
Expected: PASS (2 passed).

- [ ] **Step 5: Validación visual (manual, no bloquea el commit)**

Renderizar un clip de prueba con cada layout y mirar frames (`ffmpeg -ss ... -frames:v 1`). Confirmar: satisfactorio arriba/abajo visible, sin barras, subs legibles.

- [ ] **Step 6: Commit**

```bash
git add src/edit.py tests/test_edit_satisfying_layout.py
git commit -m "feat(edit): layouts con satisfactorios (3 franjas / gaming+abajo)"
```

---

### Task 5: wiring en pipeline + build

**Files:**
- Modify: `src/pipeline.py`, `streamers/build.py`, `config/channels.yaml`
- Test: `tests/test_pipeline_satisfying.py`

**Interfaces:**
- Consumes: `satisfying.pick_for`, `verify.classify_gameplay`, `render_short(..., satisfy_top, satisfy_bottom)`, `db.set_gameplay`.

- [ ] **Step 1: Write the failing test** (pipeline elige satisfactorios según has_gameplay)

```python
# tests/test_pipeline_satisfying.py
import types
import src.pipeline as P

def test_elige_dos_satisfactorios_si_no_hay_gameplay(monkeypatch):
    calls = {}
    monkeypatch.setattr(P, "_satisfy_args", None, raising=False)
    got = P._satisfy_for_channel({"satisfying": True, "name": "streamers_a"},
                                 has_gameplay=False,
                                 picker=lambda ch, n: [f"a{n}", f"b{n}"][:n])
    assert got == ("a2", "b2") or (got[0] and got[1])   # top y bottom

def test_un_satisfactorio_si_gameplay(monkeypatch):
    got = P._satisfy_for_channel({"satisfying": True, "name": "streamers_a"},
                                 has_gameplay=True,
                                 picker=lambda ch, n: ["x"][:n])
    assert got[0] is None and got[1] == "x"             # solo abajo

def test_sin_satisfying_no_toca(monkeypatch):
    got = P._satisfy_for_channel({"satisfying": False}, has_gameplay=False, picker=None)
    assert got == (None, None)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_pipeline_satisfying.py -q`
Expected: FAIL (`_satisfy_for_channel` no existe).

- [ ] **Step 3: Implement**

En `src/pipeline.py` agregar el helper puro:
```python
def _satisfy_for_channel(channel, has_gameplay, picker):
    """Devuelve (satisfy_top, satisfy_bottom). Con gameplay: solo abajo (1). Sin gameplay: 2."""
    if not channel.get("satisfying"):
        return (None, None)
    ch = channel.get("name", "")
    if has_gameplay:
        got = picker(ch, 1)
        return (None, got[0] if got else None)
    got = picker(ch, 2)
    top = got[0] if len(got) > 0 else None
    bot = got[1] if len(got) > 1 else None
    return (top, bot)
```
En el loop de render (línea ~200): antes de `render_short`, si `channel.get("satisfying")`:
```python
    from streamers.verify import classify_gameplay
    from streamers.satisfying import pick_for
    has_gp = channel.get("_has_gameplay")                 # lo setea build.py; si None, clasifica
    if has_gp is None:
        has_gp = classify_gameplay(source) or False
    sat_top, sat_bot = _satisfy_for_channel(channel, has_gp, pick_for)
```
y pasar `satisfy_top=sat_top, satisfy_bottom=sat_bot` a `render_short`. (Requiere que `channel` tenga `"name"`; propagarlo desde build/registry.)

En `streamers/build.py`: tras `verify_source` aprobar un clip, clasificar `has_gameplay = classify_gameplay(raw_clip)` y guardarlo con `db.set_gameplay(conn, seq, has_gameplay)` al hacer `add_clip`/aprobar. (Leer build.py para el punto exacto.)

En `config/channels.yaml`, perfil `streamers`, agregar:
```yaml
  satisfying: true    # arma el layout con videos satisfactorios (ver streamers/satisfying.py)
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest tests/test_pipeline_satisfying.py -q` → PASS.
Run: `python -m pytest -q` → 252+ passed, sin regresiones.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline.py streamers/build.py config/channels.yaml tests/test_pipeline_satisfying.py
git commit -m "feat(streamers): wiring de satisfactorios en pipeline+build segun has_gameplay"
```

---

### Task 6: sourcing del pool (~30 satisfactorios)

**Files:**
- Modify: `streamers/satisfying.py` (agregar `source_pool`)
- (Tarea de DATOS: hace red; se valida corriéndola, no por unit test.)

- [ ] **Step 1: Implementar `source_pool(target=30, pool_dir=POOL_DIR)`**

Baja clips horizontales satisfactorios y los guarda como `sat_0001.mp4`…: 
- **Pixabay/Pexels video API** (reusar `PIXABAY_API_KEY`; Pexels necesita su key) para queries: "slime", "satisfying", "oddly satisfying", "paint mixing", "kinetic sand". Descargar los mp4 landscape, recortar a ~20-40s (`ffmpeg -t 30`), escalar a 1080 de ancho.
- **yt-dlp** para lo que falte (ej. "glass breaking satisfying no copyright"), cortando segmentos.
Dedup por nombre; cortar al llegar a `target`.

- [ ] **Step 2: Correr y verificar**

Run: `python -c "from streamers.satisfying import source_pool; print(source_pool(30))"`
Expected: ~30 .mp4 en `streamers/satisfying/`. Mirar 3-4 a ojo (que sean horizontales y satisfactorios).

- [ ] **Step 3: gitignore + commit del código**

Agregar `streamers/satisfying/` y `streamers/satisfying_state.json` a `.gitignore`.
```bash
git add streamers/satisfying.py .gitignore
git commit -m "feat(streamers): source_pool para bajar el pool satisfactorio"
```

---

### Task 7: re-render del colchón

**Files:**
- Create: `streamers/rerender.py`
- Test: `tests/test_streamers_rerender.py` (lógica de orquestación, mockeando descarga/render)

**Interfaces:**
- Consumes: `db.by_status`, `db.set_gameplay`, `classify_gameplay`, `pick_for`, el sourcing (`streamers/sourcing`), `render_short`/pipeline.
- Produces: `rerender_approved(channel: str) -> int` (cuántos re-renderizó).

- [ ] **Step 1: Write the failing test**

```python
# tests/test_streamers_rerender.py
import types
import streamers.rerender as R

def test_rerender_itera_aprobados_y_cuenta(monkeypatch, tmp_path):
    aprobados = [{"seq": 1, "clip_id": "11", "streamer": "ibai", "video_path": str(tmp_path/"a.mp4")},
                 {"seq": 2, "clip_id": "22", "streamer": "auron", "video_path": str(tmp_path/"b.mp4")}]
    monkeypatch.setattr(R, "_approved", lambda ch: aprobados)
    monkeypatch.setattr(R, "_rerender_one", lambda ch, clip: True)   # mock del trabajo pesado
    assert R.rerender_approved("streamers_a") == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_streamers_rerender.py -q`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implement**

`streamers/rerender.py` con `rerender_approved(channel)` que:
1. `_approved(channel)` = `db.by_status(conn, "approved")`.
2. Por cada clip: `_rerender_one(channel, clip)` que re-descarga la fuente por `clip_id`+`streamer` (reusar `streamers/sourcing`), `classify_gameplay`, elige satisfactorios, re-renderiza (llamando al pipeline/`render_short` con el layout nuevo, sin zoom/whoosh porque la config ya está en false), PISA `clip["video_path"]`, y `db.set_gameplay(conn, seq, has_gameplay)`. try/except por clip (loguear y seguir).
3. Devuelve la cuenta de éxitos.
CLI `if __name__ == "__main__": rerender_approved(sys.argv[1])`.

- [ ] **Step 4: Run tests** → PASS.

- [ ] **Step 5: Correr de verdad (uno por canal, mirar un video)**

Run: `python -m streamers.rerender streamers_c` (el más chico primero). Mirar 1-2 mp4 resultantes por frames: layout nuevo, sin zoom/whoosh, satisfactorios OK. Después `streamers_a` y `streamers_b`.

- [ ] **Step 6: Commit**

```bash
git add streamers/rerender.py tests/test_streamers_rerender.py
git commit -m "feat(streamers): re-render del colchon con el layout nuevo"
```

---

## Self-Review

- **Cobertura del spec:** layouts (T4) ✓, pool+rotación (T2) ✓, gameplay Gemini (T3) ✓, columna db (T1) ✓, wiring (T5) ✓, sourcing (T6) ✓, re-render (T7) ✓, zoom/whoosh (ya hecho, commit 1fe64b3) ✓, gitignore pool (T6) ✓.
- **Placeholders:** el código pesado de T6/T7 (red/ffmpeg) se describe con pasos concretos + se valida corriéndolo; los unit tests cubren la orquestación. Es lo máximo sin iterar en vivo con ffmpeg.
- **Consistencia de tipos:** `pick_for(channel, n)` usado igual en T2/T5/T7; `classify_gameplay(video)->bool|None` igual en T3/T5/T7; `set_gameplay(conn, seq, bool)` igual en T1/T5/T7; `satisfy_top/bottom` params igual en T4/T5/T7.
- **Orden:** T1→T2→T3→T4→T5→T6→T7 (deps respetadas; T6 antes de correr T5/T7 en vivo).
