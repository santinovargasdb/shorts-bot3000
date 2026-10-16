# Auto-refill infinito del backlog (Pieza 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un supervisor nocturno que mide el colchón (runway) de cada canal y lo rellena hasta un objetivo usando los generadores que ya existen, con alertas por email solo ante problemas — sin tocar el camino de posteo.

**Architecture:** Paquete nuevo `autobuild/` orquestado por una tarea del Programador a las 03:00. `runway.py` mide (función pura, relee el backlog fresco); `refillers.py` envuelve los generadores existentes (`streamers.build`, `whatonearth.build`, `reddit_pipeline`) tras una interfaz uniforme; `supervisor.py` corre el loop umbral→objetivo midiendo yield real con topes anti-runaway y lock; `alert.py` manda un email digest por Gmail SMTP solo si hubo problema. `daily_post.py` NO se toca.

**Tech Stack:** Python 3 (stdlib: sqlite3, smtplib, json, importlib, dataclasses, pathlib). pytest para tests. Reusa `reddit_pipeline.env.load_env` para cargar `.env`.

## Global Constraints

- Todo gratis/DIY, $0 (stdlib + APIs free tier ya configuradas).
- `daily_post.py` NO se modifica (posteo y generación 100% desacoplados).
- Secretos (app-password de Gmail) van en `.env` (ya gitignoreado); NUNCA hardcodeados ni commiteados.
- El supervisor SOLO agrega episodios que los generadores ya marcaron `approved`; nunca publica (fail-safe).
- Objetivo por defecto: `target_days = 14`, `critical_days = 2`, `posts_per_day = 2`.
- Registro de la tarea del Programador: `New-ScheduledTaskAction` + `Set-ScheduledTask` (campos `Execute`/`WorkingDirectory` estructurados), NUNCA `schtasks /tr` (pierde comillas con el espacio de "yt short").
- Mapeo de plataformas: `{"yt":"youtube","ig":"instagram","tt":"tiktok"}` (el registry usa códigos cortos; `automation_state.json` usa nombres largos).
- La medición de backlog SIEMPRE relee la fuente fresca (`importlib.reload` del módulo de serie), nunca el `PARTS` cacheado al importar.

## Refinamientos sobre el spec (consistentes con su intención)

1. **Runway gap-safe:** `parts_ahead = cantidad de partes aprobadas con key >= next_part` (no `max(PARTS) - next_part`), porque los `seq` de clips tienen huecos (aprobados + rechazados comparten el autoincrement).
2. **Opt-in = pertenecer a `REFILL`** (no `platforms != ()`). Así streamers_a/b/c se rellenan aunque todavía tengan `platforms=()` (su `next_part` default = 1 → todo cuenta como no posteado). Es lo que se busca: tener el colchón listo antes de crear las cuentas.
3. **`gen="whatonearth"`** distinto de `"clips"` (usa `build_video`, que arma 1 video por llamada, no `build_backlog`).
4. Config suma `critical_days` y `batch` (tamaño de tanda por tipo de generador).

## File Structure

- Create `autobuild/__init__.py` — paquete vacío.
- Create `autobuild/config.py` — tabla `REFILL`, `PLATFORM_MAP`, constantes.
- Create `autobuild/runway.py` — `next_part`, `available_parts`, `parts_ahead`, `runway_days`.
- Create `autobuild/refillers.py` — `REFILLERS` dict + funciones por tipo.
- Create `autobuild/alert.py` — `any_problem`, `render_digest`, `send_email`.
- Create `autobuild/supervisor.py` — `Result`, `refill_channel`, lock, `main` (CLI).
- Create `run_autobuild.bat` — wrapper para el Programador.
- Create `tests/test_autobuild_runway.py`
- Create `tests/test_autobuild_refillers.py`
- Create `tests/test_autobuild_alert.py`
- Create `tests/test_autobuild_supervisor.py`

---

### Task 1: Config module

**Files:**
- Create: `autobuild/__init__.py`
- Create: `autobuild/config.py`
- Test: `tests/test_autobuild_refillers.py` (compartido; acá solo se valida la forma de `REFILL`)

**Interfaces:**
- Produces: `autobuild.config.REFILL: dict[str, dict]` con claves por canal; cada valor tiene `target_days:int, critical_days:int, posts_per_day:int, yield:float, max_attempts:int, batch:int, gen:str`. `autobuild.config.PLATFORM_MAP: dict[str,str]`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autobuild_refillers.py
from autobuild.config import REFILL, PLATFORM_MAP


def test_refill_table_shape():
    assert set(PLATFORM_MAP) == {"yt", "ig", "tt"}
    required = {"target_days", "critical_days", "posts_per_day", "yield",
                "max_attempts", "batch", "gen"}
    for channel, cfg in REFILL.items():
        assert required <= set(cfg), f"{channel} le faltan claves"
        assert cfg["gen"] in {"clips", "whatonearth", "reddit", "script"}
    # Los 3 streamers + whatonearth + soyelmalo + los 3 de guiones (placeholder)
    assert {"streamers_a", "streamers_b", "streamers_c", "whatonearth",
            "soyelmalo", "faceless", "historia", "misterios"} <= set(REFILL)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autobuild_refillers.py::test_refill_table_shape -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'autobuild'`

- [ ] **Step 3: Write minimal implementation**

```python
# autobuild/__init__.py
# Paquete del supervisor de auto-refill del backlog (Pieza 1).
```

```python
# autobuild/config.py
"""Config declarativa del auto-refill. Un canal sin entrada en REFILL no se
auto-rellena (opt-in explícito). Ver docs/.../2026-10-16-auto-refill-infinito-design.md."""
from __future__ import annotations

PLATFORM_MAP = {"yt": "youtube", "ig": "instagram", "tt": "tiktok"}

# gen: "clips" -> streamers.build.build_backlog | "whatonearth" -> whatonearth.build.build_video
#      "reddit" -> reddit_pipeline cmd_rewrite | "script" -> placeholder (Pieza 2)
_CLIPS = {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
          "yield": 0.27, "max_attempts": 25, "batch": 5, "gen": "clips"}

REFILL: dict[str, dict] = {
    "streamers_a": dict(_CLIPS),
    "streamers_b": dict(_CLIPS),
    "streamers_c": dict(_CLIPS),
    "whatonearth": {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                    "yield": 0.40, "max_attempts": 25, "batch": 3, "gen": "whatonearth"},
    "soyelmalo":   {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                    "yield": 0.80, "max_attempts": 20, "batch": 3, "gen": "reddit"},
    # Guiones a mano: placeholder hasta la Pieza 2 (generador LLM). Entran al loop
    # pero su refiller levanta NotImplementedError -> se reportan como SKIP, no rompen.
    "faceless":  {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                  "yield": 1.0, "max_attempts": 5, "batch": 1, "gen": "script"},
    "historia":  {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                  "yield": 1.0, "max_attempts": 5, "batch": 1, "gen": "script"},
    "misterios": {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
                  "yield": 1.0, "max_attempts": 5, "batch": 1, "gen": "script"},
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autobuild_refillers.py::test_refill_table_shape -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add autobuild/__init__.py autobuild/config.py tests/test_autobuild_refillers.py
git commit -m "feat(autobuild): config REFILL por canal + mapeo de plataformas"
```

---

### Task 2: Runway computation

**Files:**
- Create: `autobuild/runway.py`
- Test: `tests/test_autobuild_runway.py`

**Interfaces:**
- Consumes: `autobuild.config.REFILL`, `autobuild.config.PLATFORM_MAP`; `channels_registry.get_channel(name) -> dict` (tiene `platforms: tuple`, `series: str`).
- Produces:
  - `autobuild.runway.next_part(channel: str, state_path=STATE) -> int`
  - `autobuild.runway.available_parts(channel: str) -> set[int]`
  - `autobuild.runway.parts_ahead(channel: str, state_path=STATE) -> int`
  - `autobuild.runway.runway_days(channel: str, state_path=STATE) -> float`
  - `autobuild.runway.STATE: Path` (= ROOT/automation_state.json)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autobuild_runway.py
import json
import autobuild.runway as rw


def test_next_part_defaults_to_1_when_no_state(tmp_path):
    missing = tmp_path / "nope.json"
    assert rw.next_part("faceless", missing) == 1


def test_next_part_is_max_over_active_platforms(tmp_path):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({
        "faceless": {"youtube": {"next_part": 24}, "instagram": {"next_part": 23},
                     "tiktok": {"next_part": 26}}
    }), encoding="utf-8")
    # faceless activa yt+ig+tt -> el más adelantado es tiktok=26
    assert rw.next_part("faceless", state) == 26


def test_parts_ahead_counts_only_keys_at_or_after_next_part(tmp_path, monkeypatch):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({"streamers_a": {}}), encoding="utf-8")
    # streamers_a: platforms=() -> next_part=1; aprobados con huecos {8,9,11}
    monkeypatch.setattr(rw, "available_parts", lambda ch: {8, 9, 11})
    assert rw.parts_ahead("streamers_a", state) == 3


def test_parts_ahead_respects_posted_position(tmp_path, monkeypatch):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({
        "faceless": {"youtube": {"next_part": 24}, "instagram": {"next_part": 24},
                     "tiktok": {"next_part": 24}}
    }), encoding="utf-8")
    monkeypatch.setattr(rw, "available_parts", lambda ch: set(range(1, 46)))  # 1..45
    assert rw.parts_ahead("faceless", state) == 22   # 24..45 inclusive


def test_runway_days_divides_by_posts_per_day(tmp_path, monkeypatch):
    state = tmp_path / "state.json"
    state.write_text(json.dumps({"faceless": {"youtube": {"next_part": 24},
                     "instagram": {"next_part": 24}, "tiktok": {"next_part": 24}}}),
                     encoding="utf-8")
    monkeypatch.setattr(rw, "available_parts", lambda ch: set(range(1, 46)))
    assert rw.runway_days("faceless", state) == 11.0   # 22 / 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autobuild_runway.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'autobuild.runway'`

- [ ] **Step 3: Write minimal implementation**

```python
# autobuild/runway.py
"""Mide el colchón (runway) de un canal. Funciones puras: leen automation_state.json
y el PARTS FRESCO del módulo de serie (importlib.reload), no escriben nada."""
from __future__ import annotations

import importlib
import json
from pathlib import Path

from channels_registry import get_channel
from autobuild.config import PLATFORM_MAP, REFILL

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "automation_state.json"


def next_part(channel: str, state_path=STATE) -> int:
    """next_part más adelantado entre las plataformas activas del canal (default 1)."""
    ch = get_channel(channel)
    plats = [PLATFORM_MAP[p] for p in ch["platforms"] if p in PLATFORM_MAP]
    state_path = Path(state_path)
    if not plats or not state_path.exists():
        return 1
    data = json.loads(state_path.read_text(encoding="utf-8"))
    cstate = data.get(channel, {})
    vals = [int(cstate.get(p, {}).get("next_part", 1)) for p in plats]
    return max(vals) if vals else 1


def available_parts(channel: str) -> set[int]:
    """Set FRESCO de las keys de PARTS (episodios listos/aprobados). Relee la fuente:
    recarga el módulo de serie para no ver el PARTS cacheado al importar."""
    ch = get_channel(channel)
    mod = importlib.import_module(ch["series"])
    mod = importlib.reload(mod)
    return set(getattr(mod, "PARTS", {}).keys())


def parts_ahead(channel: str, state_path=STATE) -> int:
    """Cantidad de episodios listos con key >= next_part (gap-safe)."""
    nextp = next_part(channel, state_path)
    return sum(1 for p in available_parts(channel) if p >= nextp)


def runway_days(channel: str, state_path=STATE) -> float:
    ppd = REFILL[channel]["posts_per_day"]
    return parts_ahead(channel, state_path) / ppd
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autobuild_runway.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add autobuild/runway.py tests/test_autobuild_runway.py
git commit -m "feat(autobuild): cálculo de runway gap-safe (parts_ahead >= next_part)"
```

---

### Task 3: Refillers (envoltorio de los generadores existentes)

**Files:**
- Create: `autobuild/refillers.py`
- Test: `tests/test_autobuild_refillers.py` (se agrega a lo de Task 1)

**Interfaces:**
- Consumes: `streamers.build.build_backlog(channel_key, n)`, `whatonearth.build.build_video()`, `reddit_pipeline.__main__.cmd_rewrite(n)`.
- Produces: `autobuild.refillers.REFILLERS: dict[str, callable]` donde cada callable tiene firma `(channel: str, n: int) -> None`. `refill_script` levanta `NotImplementedError`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autobuild_refillers.py  (agregar al final)
import pytest
import autobuild.refillers as rf


def test_refill_clips_llama_build_backlog(monkeypatch):
    calls = []
    monkeypatch.setattr("streamers.build.build_backlog",
                        lambda ch, n: calls.append((ch, n)))
    rf.REFILLERS["clips"]("streamers_a", 5)
    assert calls == [("streamers_a", 5)]


def test_refill_whatonearth_llama_build_video_n_veces(monkeypatch):
    calls = []
    monkeypatch.setattr("whatonearth.build.build_video",
                        lambda: calls.append(1) or 1)
    rf.REFILLERS["whatonearth"]("whatonearth", 3)
    assert len(calls) == 3


def test_refill_reddit_llama_cmd_rewrite(monkeypatch):
    calls = []
    monkeypatch.setattr("reddit_pipeline.__main__.cmd_rewrite",
                        lambda n: calls.append(n))
    rf.REFILLERS["reddit"]("soyelmalo", 3)
    assert calls == [3]


def test_refill_script_levanta_not_implemented():
    with pytest.raises(NotImplementedError):
        rf.REFILLERS["script"]("faceless", 1)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autobuild_refillers.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'autobuild.refillers'`

- [ ] **Step 3: Write minimal implementation**

```python
# autobuild/refillers.py
"""Envuelve los generadores existentes tras una interfaz uniforme (channel, n) -> None.
Imports perezosos (dentro de cada fn) para que importar autobuild sea liviano y para
que los tests puedan monkeypatchear los módulos subyacentes."""
from __future__ import annotations


def refill_clips(channel: str, n: int) -> None:
    from streamers.build import build_backlog
    build_backlog(channel, n)


def refill_whatonearth(channel: str, n: int) -> None:
    from whatonearth.build import build_video
    for _ in range(n):
        build_video()


def refill_reddit(channel: str, n: int) -> None:
    from reddit_pipeline.__main__ import cmd_rewrite
    cmd_rewrite(n)


def refill_script(channel: str, n: int) -> None:
    raise NotImplementedError("generador de guiones pendiente (Pieza 2)")


REFILLERS = {
    "clips": refill_clips,
    "whatonearth": refill_whatonearth,
    "reddit": refill_reddit,
    "script": refill_script,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autobuild_refillers.py -v`
Expected: PASS (5 passed, contando el de Task 1)

- [ ] **Step 5: Commit**

```bash
git add autobuild/refillers.py tests/test_autobuild_refillers.py
git commit -m "feat(autobuild): refillers que envuelven los generadores existentes"
```

---

### Task 4: Alert module (clasificación + digest + email)

**Files:**
- Create: `autobuild/alert.py`
- Test: `tests/test_autobuild_alert.py`

**Interfaces:**
- Consumes: `autobuild.supervisor.Result` (definido en Task 5). Para evitar el import circular, `alert.py` NO importa `supervisor`; opera sobre objetos con atributos `channel, parts_before, parts_after, added, severity, note`. Los tests usan un stub con esos atributos.
- Produces:
  - `autobuild.alert.PROBLEM: set[str]` = `{"WARN","CRITICAL","ERROR"}`
  - `autobuild.alert.any_problem(results: list) -> bool`
  - `autobuild.alert.render_digest(results: list) -> tuple[str, str]` (subject, body)
  - `autobuild.alert.send_email(subject: str, body: str) -> bool` (True si se envió; False si faltan creds o SMTP falló — nunca levanta)

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autobuild_alert.py
import types
import autobuild.alert as al


def _r(channel, before, after, added, severity, note=""):
    return types.SimpleNamespace(channel=channel, parts_before=before,
                                 parts_after=after, added=added,
                                 severity=severity, note=note)


def test_any_problem_true_si_hay_warn_critical_o_error():
    assert al.any_problem([_r("a", 1, 1, 0, "WARN")]) is True
    assert al.any_problem([_r("a", 28, 28, 0, "OK"),
                           _r("b", 0, 0, 0, "SKIP")]) is False


def test_render_digest_incluye_cada_canal_y_peor_severidad():
    subject, body = al.render_digest([
        _r("whatonearth", 7, 28, 21, "OK"),
        _r("streamers_b", 0, 0, 0, "ERROR", "fuente seca"),
    ])
    assert "ERROR" in subject
    assert "whatonearth" in body and "streamers_b" in body
    assert "fuente seca" in body


def test_send_email_devuelve_false_si_faltan_creds(monkeypatch):
    for k in ("AUTOBUILD_SMTP_USER", "AUTOBUILD_SMTP_PASS", "AUTOBUILD_ALERT_TO"):
        monkeypatch.delenv(k, raising=False)
    assert al.send_email("s", "b") is False


def test_send_email_traga_error_de_smtp(monkeypatch):
    monkeypatch.setenv("AUTOBUILD_SMTP_USER", "u@gmail.com")
    monkeypatch.setenv("AUTOBUILD_SMTP_PASS", "x")
    monkeypatch.setenv("AUTOBUILD_ALERT_TO", "to@gmail.com")

    class Boom:
        def __init__(self, *a, **k): raise OSError("smtp caído")
    monkeypatch.setattr(al.smtplib, "SMTP_SSL", Boom)
    assert al.send_email("s", "b") is False   # no levanta
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autobuild_alert.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'autobuild.alert'`

- [ ] **Step 3: Write minimal implementation**

```python
# autobuild/alert.py
"""Reporte de salud del auto-refill. Manda UN email digest por Gmail SMTP solo si hubo
problema. Nunca levanta: si falla el envío o faltan creds, loguea y devuelve False."""
from __future__ import annotations

import os
import smtplib
from datetime import datetime
from email.message import EmailMessage

PROBLEM = {"WARN", "CRITICAL", "ERROR"}
_SEV_ICON = {"OK": "✅", "SKIP": "⏭️", "WARN": "🟠", "CRITICAL": "🔴", "ERROR": "🔴"}
_SEV_ORDER = ["ERROR", "CRITICAL", "WARN", "SKIP", "OK"]


def any_problem(results: list) -> bool:
    return any(r.severity in PROBLEM for r in results)


def _worst(results: list) -> str:
    present = {r.severity for r in results}
    for sev in _SEV_ORDER:
        if sev in present:
            return sev
    return "OK"


def render_digest(results: list) -> tuple[str, str]:
    from autobuild.config import REFILL
    worst = _worst(results)
    n_prob = sum(1 for r in results if r.severity in PROBLEM)
    stamp = datetime.now().strftime("%d-%m %H:%M")
    subject = f"[ShortsBot] {_SEV_ICON.get(worst,'')} {worst} · {n_prob} con problema · {stamp}"
    lines = ["Canal         Runway (partes)   +Aprob   Estado",
             "-" * 60]
    for r in results:
        ppd = REFILL.get(r.channel, {}).get("posts_per_day", 2)
        d_before = r.parts_before / ppd
        d_after = r.parts_after / ppd
        icon = _SEV_ICON.get(r.severity, "")
        lines.append(f"{r.channel:13} {r.parts_before:>3}->{r.parts_after:<3} "
                     f"({d_before:.1f}d->{d_after:.1f}d)  +{r.added:<4} "
                     f"{icon} {r.severity}: {r.note}")
    return subject, "\n".join(lines)


def send_email(subject: str, body: str) -> bool:
    user = os.environ.get("AUTOBUILD_SMTP_USER")
    pwd = os.environ.get("AUTOBUILD_SMTP_PASS")
    to = os.environ.get("AUTOBUILD_ALERT_TO")
    if not (user and pwd and to):
        print("[autobuild] alerta no enviada: faltan AUTOBUILD_SMTP_USER/PASS/ALERT_TO en .env")
        return False
    try:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = user, to, subject
        msg.set_content(body)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(user, pwd)
            s.send_message(msg)
        return True
    except Exception as e:                       # jamás rompe el loop del supervisor
        print(f"[autobuild] alerta no enviada (SMTP): {e}")
        return False
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autobuild_alert.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add autobuild/alert.py tests/test_autobuild_alert.py
git commit -m "feat(autobuild): alertas por email (digest solo ante problemas)"
```

---

### Task 5: Supervisor — loop de control por canal

**Files:**
- Create: `autobuild/supervisor.py` (solo `Result` + `refill_channel` en esta task; `main`/lock en Task 6)
- Test: `tests/test_autobuild_supervisor.py`

**Interfaces:**
- Consumes: `cfg: dict` (una entrada de `REFILL`); `measure: callable(channel) -> int` (parts_ahead); `refiller: callable(channel, n) -> None`.
- Produces:
  - `autobuild.supervisor.Result` (dataclass: `channel:str, parts_before:int, parts_after:int, added:int, severity:str, note:str`)
  - `autobuild.supervisor.refill_channel(channel: str, cfg: dict, measure, refiller) -> Result`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autobuild_supervisor.py
import autobuild.supervisor as sup

CFG = {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
       "max_attempts": 25, "batch": 5}   # objetivo = 28 partes; crítico <= 4


def _measure_from(seq):
    """measure() que devuelve el próximo valor de una lista en cada llamada."""
    it = iter(seq)
    last = {"v": 0}
    def measure(_ch):
        try:
            last["v"] = next(it)
        except StopIteration:
            pass
        return last["v"]
    return measure


def test_no_refill_si_ya_esta_sobre_objetivo():
    calls = []
    r = sup.refill_channel("faceless", CFG,
                           measure=lambda ch: 30,          # 30 >= 28
                           refiller=lambda ch, n: calls.append(n))
    assert r.severity == "OK" and r.added == 0 and calls == []


def test_rellena_hasta_el_objetivo_y_para():
    calls = []
    # before=10, cada tanda suma ~6 -> 16, 22, 28 -> para en 28
    measure = _measure_from([10, 16, 22, 28])
    r = sup.refill_channel("streamers_a", CFG, measure,
                           refiller=lambda ch, n: calls.append(n))
    assert r.parts_after == 28 and r.severity == "OK"
    assert len(calls) == 3                     # paró apenas llegó


def test_para_en_max_attempts():
    calls = []
    cfg = {**CFG, "max_attempts": 10, "batch": 5}   # 2 tandas de 5 = 10 intentos
    measure = _measure_from([0, 1, 2, 2, 2])        # progresa poco
    r = sup.refill_channel("streamers_b", cfg, measure,
                           refiller=lambda ch, n: calls.append(n))
    assert sum(calls) <= 10
    assert r.severity in {"WARN", "CRITICAL"}


def test_para_tras_dos_tandas_sin_progreso():
    calls = []
    measure = _measure_from([0, 0, 0])              # nunca sube
    r = sup.refill_channel("streamers_b", CFG, measure,
                           refiller=lambda ch, n: calls.append(n))
    assert len(calls) == 2                           # cortó por "dry"
    assert r.severity == "CRITICAL"                  # 0 partes <= crítico(4)


def test_excepcion_del_refiller_es_ERROR():
    def boom(ch, n): raise RuntimeError("groq 429")
    r = sup.refill_channel("soyelmalo", CFG, measure=lambda ch: 5, refiller=boom)
    assert r.severity == "ERROR" and "groq 429" in r.note


def test_not_implemented_es_SKIP():
    def ni(ch, n): raise NotImplementedError("pendiente Pieza 2")
    r = sup.refill_channel("faceless", CFG, measure=lambda ch: 0, refiller=ni)
    assert r.severity == "SKIP"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autobuild_supervisor.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'autobuild.supervisor'`

- [ ] **Step 3: Write minimal implementation**

```python
# autobuild/supervisor.py
"""Supervisor del auto-refill: por canal mide el runway y rellena hasta el objetivo
usando los generadores existentes, midiendo yield real, con topes anti-runaway."""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil


@dataclass
class Result:
    channel: str
    parts_before: int
    parts_after: int
    added: int
    severity: str          # OK | WARN | CRITICAL | ERROR | SKIP
    note: str


def refill_channel(channel: str, cfg: dict, measure, refiller) -> Result:
    """measure(channel)->parts_ahead; refiller(channel,n)->None. Rellena en tandas de
    cfg['batch'] hasta llegar al objetivo (target_days*posts_per_day), agotar
    max_attempts, o dos tandas seguidas sin progreso (fuente seca)."""
    ppd = cfg["posts_per_day"]
    target = ceil(cfg["target_days"] * ppd)
    critical = ceil(cfg["critical_days"] * ppd)
    batch = cfg["batch"]

    before = measure(channel)
    if before >= target:
        return Result(channel, before, before, 0, "OK", f"colchón OK ({before}/{target})")

    attempts_left = cfg["max_attempts"]
    cur = before
    dry = 0
    try:
        while cur < target and attempts_left > 0 and dry < 2:
            n = min(batch, attempts_left)
            refiller(channel, n)
            attempts_left -= n
            new = measure(channel)
            dry = dry + 1 if new <= cur else 0
            cur = new
    except NotImplementedError as e:
        return Result(channel, before, before, 0, "SKIP", str(e))
    except Exception as e:
        return Result(channel, before, cur, max(cur - before, 0), "ERROR",
                      f"{type(e).__name__}: {e}")

    added = cur - before
    if cur >= target:
        sev, note = "OK", f"llegó al objetivo ({cur}/{target})"
    elif cur <= critical:
        sev, note = "CRITICAL", f"runway crítico ({cur}/{target}); fuente seca o API caída"
    else:
        sev, note = "WARN", f"no llegó al objetivo ({cur}/{target}); yield bajo esta corrida"
    return Result(channel, before, cur, added, sev, note)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autobuild_supervisor.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
git add autobuild/supervisor.py tests/test_autobuild_supervisor.py
git commit -m "feat(autobuild): loop de control por canal (umbral->objetivo, anti-runaway)"
```

---

### Task 6: Supervisor — CLI, lock y wiring

**Files:**
- Modify: `autobuild/supervisor.py` (agregar lock + `main` + `_plan_line` al final)
- Test: `tests/test_autobuild_supervisor.py` (agregar)

**Interfaces:**
- Consumes: `autobuild.config.REFILL`, `autobuild.runway.parts_ahead`, `autobuild.refillers.REFILLERS`, `autobuild.alert`, `reddit_pipeline.env.load_env`.
- Produces:
  - `autobuild.supervisor.acquire_lock(force: bool=False) -> bool`
  - `autobuild.supervisor.release_lock() -> None`
  - `autobuild.supervisor.run(channels: list[str], dry_run: bool=False) -> list[Result]`
  - `autobuild.supervisor.main(argv: list[str]) -> int`
  - `autobuild.supervisor.LOCK: Path`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_autobuild_supervisor.py  (agregar al final)
import autobuild.supervisor as sup
import autobuild.refillers as rf


def test_lock_impide_doble_corrida(tmp_path, monkeypatch):
    monkeypatch.setattr(sup, "LOCK", tmp_path / ".lock")
    assert sup.acquire_lock() is True
    assert sup.acquire_lock() is False          # ya tomado y fresco
    sup.release_lock()
    assert sup.acquire_lock() is True


def test_force_ignora_el_lock(tmp_path, monkeypatch):
    monkeypatch.setattr(sup, "LOCK", tmp_path / ".lock")
    sup.acquire_lock()
    assert sup.acquire_lock(force=True) is True


def test_run_dry_run_no_llama_refillers(monkeypatch):
    llamado = []
    monkeypatch.setitem(rf.REFILLERS, "clips",
                        lambda ch, n: llamado.append((ch, n)))
    monkeypatch.setattr(sup.runway, "parts_ahead", lambda ch, *a, **k: 3)
    results = sup.run(["streamers_a"], dry_run=True)
    assert llamado == []                         # dry-run no genera
    assert results == []                         # dry-run no produce Result


def test_run_real_usa_refiller_del_gen(monkeypatch):
    # streamers_a es gen="clips"; que llegue al objetivo en una tanda
    seq = iter([3, 28])
    monkeypatch.setattr(sup.runway, "parts_ahead", lambda ch, *a, **k: next(seq))
    monkeypatch.setitem(rf.REFILLERS, "clips", lambda ch, n: None)
    results = sup.run(["streamers_a"], dry_run=False)
    assert len(results) == 1 and results[0].severity == "OK"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_autobuild_supervisor.py -k "lock or dry_run or real" -v`
Expected: FAIL con `AttributeError: module 'autobuild.supervisor' has no attribute 'LOCK'`

- [ ] **Step 3: Write minimal implementation**

Agregar al final de `autobuild/supervisor.py`:

```python
# --- CLI / orquestación (Task 6) -----------------------------------------
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from autobuild import alert, refillers, runway
from autobuild.config import REFILL

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "autobuild" / ".lock"
LOG = ROOT / "autobuild.log"
_LOCK_TTL = 86400   # 24h: si el lock es más viejo, se considera huérfano


def acquire_lock(force: bool = False) -> bool:
    if LOCK.exists() and not force:
        if time.time() - LOCK.stat().st_mtime < _LOCK_TTL:
            return False
    LOCK.write_text(str(os.getpid()), encoding="utf-8")
    return True


def release_lock() -> None:
    try:
        LOCK.unlink()
    except FileNotFoundError:
        pass


def _log(msg: str) -> None:
    line = f"[{datetime.now():%Y-%m-%d %H:%M}] {msg}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def _plan_line(channel: str, cfg: dict) -> str:
    ahead = runway.parts_ahead(channel)
    target = int(cfg["target_days"] * cfg["posts_per_day"])
    deficit = max(target - ahead, 0)
    est = 0 if deficit == 0 else int(deficit / max(cfg["yield"], 0.01))
    return (f"{channel:13} runway={ahead} partes ({ahead/cfg['posts_per_day']:.1f}d)  "
            f"objetivo={target}  déficit={deficit}  intentos≈{est}  gen={cfg['gen']}")


def run(channels: list[str], dry_run: bool = False) -> list[Result]:
    results: list[Result] = []
    for ch in channels:
        cfg = REFILL[ch]
        if dry_run:
            _log("DRY " + _plan_line(ch, cfg))
            continue
        refiller = refillers.REFILLERS[cfg["gen"]]
        r = refill_channel(ch, cfg, measure=lambda c: runway.parts_ahead(c),
                           refiller=refiller)
        _log(f"{r.channel:13} {r.parts_before}->{r.parts_after} (+{r.added})  "
             f"{r.severity}: {r.note}")
        results.append(r)
    return results


def main(argv: list[str]) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    from reddit_pipeline.env import load_env
    load_env()

    dry = "--dry-run" in argv
    force = "--force" in argv
    channels = list(REFILL)
    if "--channel" in argv:
        i = argv.index("--channel")
        channels = [argv[i + 1]]

    if not dry and not acquire_lock(force):
        _log("otra corrida de autobuild está activa (lock fresco). Abortando. Usá --force.")
        return 1
    try:
        _log(f"=== autobuild start (dry={dry}) canales={channels} ===")
        results = run(channels, dry_run=dry)
        if not dry and alert.any_problem(results):
            subject, body = alert.render_digest(results)
            alert.send_email(subject, body)
            _log(f"alerta enviada: {subject}")
        _log("=== autobuild done ===")
    finally:
        if not dry:
            release_lock()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_autobuild_supervisor.py -v`
Expected: PASS (10 passed)

- [ ] **Step 5: Commit**

```bash
git add autobuild/supervisor.py tests/test_autobuild_supervisor.py
git commit -m "feat(autobuild): CLI del supervisor con lock, dry-run y wiring de alertas"
```

---

### Task 7: Wrapper .bat, env de ejemplo, scheduling y rollout

**Files:**
- Create: `run_autobuild.bat`
- Modify: `.gitignore` (verificar que `autobuild/.lock` y `autobuild.log` queden ignorados)
- Test: smoke manual (`--dry-run`) — no hay test automatizado nuevo; el deliverable es el wrapper + la tarea registrada.

**Interfaces:**
- Consumes: `python -m autobuild.supervisor`.

- [ ] **Step 1: Crear el wrapper `.bat`**

```bat
@echo off
REM Auto-refill nocturno del backlog (lo llama el Programador de tareas, 03:00).
REM Ver docs/superpowers/plans/2026-10-16-auto-refill-infinito.md
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python -m autobuild.supervisor >> automation_autobuild.log 2>&1
```

- [ ] **Step 2: Asegurar que lock y logs no se commiteen**

Agregar a `.gitignore` (si no están ya):

```
autobuild/.lock
autobuild.log
automation_autobuild.log
```

Run: `git check-ignore autobuild/.lock autobuild.log automation_autobuild.log`
Expected: imprime las 3 rutas (= ignoradas).

- [ ] **Step 3: Documentar las variables de `.env` (no commitear valores)**

Agregar estas líneas a `.env` a mano (ya gitignoreado), con el app-password real de Gmail:

```
AUTOBUILD_SMTP_USER=nofaceshortvids@gmail.com
AUTOBUILD_SMTP_PASS=<app-password de 16 dígitos — requiere 2FA activo>
AUTOBUILD_ALERT_TO=prensa.smata@gmail.com
```

- [ ] **Step 4: Smoke test en seco (sin generar nada)**

Run: `python -m autobuild.supervisor --dry-run`
Expected: una línea `DRY <canal> runway=... objetivo=28 déficit=... intentos≈... gen=...` por cada canal de `REFILL`, y ninguna generación. Confirmar que los `runway` coinciden con la realidad (comparar con los `next_part` de `automation_state.json`).

- [ ] **Step 5: Correr toda la suite**

Run: `python -m pytest tests/test_autobuild_*.py -v`
Expected: PASS (todas).

- [ ] **Step 6: Registrar la tarea del Programador (PowerShell, cmdlets — NO schtasks /tr)**

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\accsoc\Desktop\yt short\run_autobuild.bat" -WorkingDirectory "C:\Users\accsoc\Desktop\yt short"
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
Register-ScheduledTask -TaskName "ShortsBot AutoBuild" -Action $action -Trigger $trigger -Description "Auto-refill nocturno del backlog (Pieza 1)"
```

Verificar: `Get-ScheduledTask -TaskName "ShortsBot AutoBuild" | Select TaskName, State` → State `Ready`, y revisar "Tarea que se ejecutará" apunta al `.bat` con la ruta correcta.

- [ ] **Step 7: Commit**

```bash
git add run_autobuild.bat .gitignore
git commit -m "feat(autobuild): wrapper .bat + gitignore de lock/log (scheduling 03:00)"
```

---

## Self-Review (hecho al terminar de escribir el plan)

**1. Cobertura del spec:**
- Arquitectura `autobuild/` (supervisor/runway/refillers/config/alert) → Tasks 1-6. ✅
- Runway umbral→objetivo midiendo yield real → Task 5. ✅
- Topes anti-runaway (max_attempts, global vía batch, no-progreso) + lock → Tasks 5-6. ✅
  - Nota: el "tope global de intentos por corrida" del spec se materializa como `max_attempts` por canal + batch chico (Groq-friendly en reddit batch=3); no hay un contador global único, que sería YAGNI dado el cap por canal. Aceptable.
- Fail-safe (solo agrega approved; nunca publica) → garantizado porque los refillers solo llaman a los generadores existentes (que marcan status) y nada acá toca daily_post. ✅
- Email digest solo ante problemas, Gmail SMTP, creds en .env → Task 4 + Task 7. ✅
- Config por canal declarativa → Task 1. ✅
- Scheduling 03:00 con cmdlets, logging, dry-run, CLI → Tasks 6-7. ✅
- faceless/historia/misterios placeholder (Pieza 2) → `refill_script` NotImplementedError = SKIP (Task 3/5). ✅

**2. Placeholder scan:** sin TBD/TODO; todo el código está completo y es ejecutable.

**3. Type consistency:** `Result` (channel, parts_before, parts_after, added, severity, note) se usa igual en supervisor, alert y tests. `measure -> int` y `refiller(channel, n) -> None` consistentes entre Tasks 3/5/6. `REFILLERS[cfg["gen"]]` con gen ∈ {clips,whatonearth,reddit,script} coincide con `config.REFILL`. ✅

## Riesgos / notas para quien implemente

- `importlib.reload` en `available_parts` re-ejecuta el top-level del módulo de serie; es intencional (releer el backlog). Si algún módulo de serie tuviera side effects pesados al importar, evaluar leer el sqlite directo. Hoy son livianos.
- streamers_a/b/c tienen `platforms=()` → `next_part=1`, así que el supervisor los va a rellenar hasta 28 partes aun sin cuentas. Con yield ~0.27 y `max_attempts=25`/noche, tardarán varias noches y emitirán WARN mientras tanto (esperado). Si se prefiere no gastar en ellos hasta crear las cuentas, bajarles `target_days` o sacarlos de `REFILL` temporalmente.
- reddit (`cmd_rewrite`) consume el pool `filtered` existente (~100). Cuando se agote, el detector de "sin progreso" cortará y mandará WARN; ahí correr `python -m reddit_pipeline run` para re-sourcear (automatizar el source/filter queda para una iteración futura).
- La PC debe estar prendida a las 03:00 (misma dependencia que las tareas actuales).
- **Fuera de alcance (Pieza 2):** el generador LLM de guiones para faceless/historia/misterios.
