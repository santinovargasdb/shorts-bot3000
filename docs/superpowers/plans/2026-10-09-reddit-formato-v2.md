# Rediseño del formato «¿Soy el Malo?» v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los videos de Reddit desarrollen el drama (más largos, con arco), con título cliffhanger y foco pareja/familia, y refrescar el backlog para que el formato nuevo salga ya.

**Architecture:** Cambios de config/contenido en el pipeline existente (`reddit_pipeline/`, `series_reddit.py`, `config/channels.yaml`) + un helper de DB para revertir el backlog no posteado + una operación de refresco (re-source → re-filter → re-rewrite) que respeta la seq 1 ya posteada.

**Tech Stack:** Python 3.10+, SQLite, SDK `openai` (Groq), `pytest`.

## Global Constraints

- **Largo del guion: 210-320 palabras** (≈90-120s a ~150 wpm). (spec §3.1)
- **`titulo` = CLIFFHANGER** (teasea y corta; NO spoilea el final). (spec §3.2, §3.3)
- **Foco pareja/familia/suegra** (traición, infidelidad, familia tóxica). (spec §2, §3.4)
- **Reescritura, NUNCA verbatim**; nombres cambiados, sin usernames. (spec heredado)
- **Español neutro latino**, hablado y natural.
- **No tocar la seq 1** (ya posteada: reel de IG + borrador de TikTok). (spec §3.5)
- **Tests:** `pytest`, convención `tests/test_reddit_*` / `tests/test_series_reddit.py`.

---

### Task 1: `title_for` sin sufijo de marca (el cliffhanger es el gancho puro)

**Files:**
- Modify: `series_reddit.py` (función `title_for`)
- Test: `tests/test_series_reddit.py`

**Interfaces:**
- Produces: `series_reddit.title_for(part:int) -> str` = el cliffhanger tal cual (sin "| ¿Soy el Malo?").

- [ ] **Step 1: Actualizar el test (falla)**

En `tests/test_series_reddit.py`, reemplazar `test_title_for_usa_el_titulo_de_parts`:
```python
def test_title_for_es_el_cliffhanger_sin_sufijo(monkeypatch):
    monkeypatch.setattr(sr, "PARTS", sr.build_parts(ROWS))
    assert sr.title_for(1) == "Mi ex tóxica"          # el titulo tal cual
    assert "¿Soy el Malo?" not in sr.title_for(1)      # sin sufijo de marca
```

- [ ] **Step 2: Correr el test (falla)**

Run: `python -m pytest tests/test_series_reddit.py::test_title_for_es_el_cliffhanger_sin_sufijo -v`
Expected: FAIL (hoy devuelve "Mi ex tóxica | ¿Soy el Malo?").

- [ ] **Step 3: Implementar**

En `series_reddit.py`, cambiar `title_for`:
```python
def title_for(part: int) -> str:
    """El cliffhanger de la historia (título de YT/IG/TikTok y tarjeta en pantalla)."""
    return PARTS[part]["titulo"]
```

- [ ] **Step 4: Correr el test (pasa)**

Run: `python -m pytest tests/test_series_reddit.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add series_reddit.py tests/test_series_reddit.py
git commit -m "feat(reddit): title_for = cliffhanger puro (sin sufijo de marca)"
```

---

### Task 2: Constantes — largo 210-320 + keywords de pareja/familia

**Files:**
- Modify: `reddit_pipeline/constants.py`
- Test: `tests/test_reddit_scoring.py`, `tests/test_reddit_rewrite.py`

**Interfaces:**
- Produces: `GUION_MIN_WORDS=210`, `GUION_MAX_WORDS=320`; `HOOK_KEYWORDS` ampliado con términos de pareja/familia.

- [ ] **Step 1: Test de scoring para keyword de pareja/familia (falla)**

En `tests/test_reddit_scoring.py`, agregar:
```python
def test_bonus_por_keyword_de_familia():
    sin = sc.viral_score(_post(title="una historia cualquiera"))
    con = sc.viral_score(_post(title="my husband cheated with my sister"))
    assert con > sin > 0
```

- [ ] **Step 2: Correr (falla)**

Run: `python -m pytest tests/test_reddit_scoring.py::test_bonus_por_keyword_de_familia -v`
Expected: FAIL ("husband"/"sister" aún no dan bonus).

- [ ] **Step 3: Actualizar `constants.py`**

Reemplazar las constantes de largo y keywords:
```python
# Largo del guion reescrito (≈90-120s a ~150 wpm; el drama respira) (spec v2 §3.1)
GUION_MIN_WORDS = 210
GUION_MAX_WORDS = 320

# Gancho: keywords que suben el viral_score. Fuerte en pareja/familia/suegra (spec v2 §3.4)
HOOK_KEYWORDS = [
    "aita", "am i", "update", "tifu", "revenge",
    "cheat", "cheated", "affair", "ex ", "ex-",
    "husband", "wife", "boyfriend", "girlfriend", "fiance",
    "mother-in-law", "in-law", "mil ", "sister", "mom",
    "divorce", "wedding", "family",
]
```

- [ ] **Step 4: Ajustar los tests de largo de `rewrite`**

El largo validado ahora es 210-320, así que `VALID` (120 palabras) ya no pasa. En
`tests/test_reddit_rewrite.py`, cambiar el guion de `VALID` y el test del reintento:
```python
VALID = {"guion": " ".join(["palabra"] * 250), "narrador_genero": "M",
         "titulo": "Mi ex", "veredicto": "se pasó", "cierre": "¿vos qué harías?"}
```
y en `test_rewrite_ok_sin_retry`:
```python
    assert rw.word_count(out["guion"]) == 250
```
y en `test_rewrite_reintenta_si_largo` el guion "largo" debe superar 320:
```python
    largo = {**VALID, "guion": " ".join(["x"] * 500)}
    ...
    assert 210 <= rw.word_count(out["guion"]) <= 320
```

- [ ] **Step 5: Correr toda la suite de reddit (pasa)**

Run: `python -m pytest tests/test_reddit_scoring.py tests/test_reddit_rewrite.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add reddit_pipeline/constants.py tests/test_reddit_scoring.py tests/test_reddit_rewrite.py
git commit -m "feat(reddit): guion 210-320 palabras + keywords de pareja/familia"
```

---

### Task 3: Nuevo prompt de reescritura (arco completo + título cliffhanger)

**Files:**
- Modify: `reddit_pipeline/rewrite.py` (constante `PROMPT`)

**Interfaces:**
- Consumes: `GUION_MIN_WORDS`, `GUION_MAX_WORDS` (vía `PROMPT.format(min=, max=, story=)`, ya existente).
- Produces: `PROMPT` nuevo. Las claves del JSON no cambian (`guion, narrador_genero, titulo, veredicto, cierre`), así que `parse_rewrite` y sus tests no se tocan.

> Nota: el prompt es contenido para el LLM; no hay test unitario nuevo (se valida por juicio humano en Task 6). Solo hay que confirmar que la suite sigue verde (parse/retry no dependen del texto del prompt).

- [ ] **Step 1: Reemplazar `PROMPT` en `reddit_pipeline/rewrite.py`**

```python
PROMPT = """Sos guionista de shorts narrados de DRAMA REAL de Reddit, en ESPAÑOL NEUTRO LATINO.
Te paso una historia de Reddit en inglés. Devolvé SOLO un objeto JSON con estas claves exactas:
"guion", "narrador_genero", "titulo", "veredicto", "cierre".

Objetivo: que el espectador se ENGANCHE con el conflicto y llegue hasta el final.
Priorizá el drama de PAREJA / FAMILIA / SUEGRA (traición, infidelidad, familia tóxica) si la historia lo permite.

REGLAS del "guion" ({min}-{max} palabras, ~90-120s a 150 wpm — CONTÁ las palabras):
1. GANCHO (bucle abierto): la 1ª frase planta la injusticia o el momento más fuerte, pero SIN revelar cómo termina. Que dé ganas de saber qué pasó. Nada de "Hola" ni "esta historia trata de".
2. SETUP: presentá a quien narra y al villano (pareja, suegra, familiar), la relación y lo que está en juego. Dale varias frases para que el espectador entienda por qué duele y SE INDIGNE. No lo apures.
3. ESCALADA: mostrá cómo el conflicto empeora, paso a paso. Subí la tensión. Este es el cuerpo del video.
4. GIRO: el momento en que se da vuelta la situación (la víctima reacciona, se descubre la verdad, llega el karma).
5. PAYOFF: el desenlace, con peso y AL FINAL. Que se sienta satisfactorio; no lo cortes de golpe.
6. Español natural y hablado, como contándole un bombazo a un amigo. Cambiá los nombres propios por nombres neutros. Quitá usernames y datos identificables.

"narrador_genero": "M" si quien narra en primera persona es hombre, "F" si es mujer.
"titulo": un CLIFFHANGER que teasea y CORTA justo antes del desenlace, para que tengan que ver el video. Terminá en suspenso (ej: "...pero lo que hizo después me dejó sin palabras" / "...y cuando abrí la puerta, entendí todo"). NUNCA reveles el final en el título.
"veredicto": 1 línea con tu opinión/encuadre (la capa de comentario original).
"cierre": una pregunta a comentarios; por default "¿Vos qué hubieras hecho? 👇".

HISTORIA:
\"\"\"{story}\"\"\""""
```

- [ ] **Step 2: Correr toda la suite de reescritura (pasa sin cambios)**

Run: `python -m pytest tests/test_reddit_rewrite.py -v`
Expected: PASS (parse/validación/retry no dependen del texto del prompt).

- [ ] **Step 3: Commit**
```bash
git add reddit_pipeline/rewrite.py
git commit -m "feat(reddit): prompt con arco completo (gancho→setup→escalada→giro→payoff) + titulo cliffhanger"
```

---

### Task 4: Perfil del motor para el largo nuevo (`config/channels.yaml`)

**Files:**
- Modify: `config/channels.yaml` (perfil `soyelmalo`)

- [ ] **Step 1: Ajustar el perfil `soyelmalo`**

Cambiar dos líneas del perfil `soyelmalo`:
```yaml
  tts_rate: "+8%"                    # más pausado, con peso dramático (antes +15%)
  short_max_seconds: 130             # permite ~90-120s (antes 75)
```

- [ ] **Step 2: Verificar que el perfil carga**

Run: `python -c "from src import config as cfg; c=cfg.load_channel('soyelmalo'); print(c['tts_rate'], c['short_max_seconds'])"`
Expected: `+8% 130`

- [ ] **Step 3: Commit**
```bash
git add config/channels.yaml
git commit -m "feat(reddit): soyelmalo tts_rate +8% + short_max_seconds 130 (drama largo y pausado)"
```

---

### Task 5: Helper de DB para revertir el backlog no posteado

**Files:**
- Modify: `reddit_pipeline/db.py`
- Test: `tests/test_reddit_db.py`

**Interfaces:**
- Produces: `db.revert_to_filtered(conn, min_seq:int) -> int` — devuelve las historias con `seq >= min_seq` al pool `filtered` (limpia guion/género/título/veredicto/cierre/seq, conserva viral_score). Devuelve cuántas revirtió. Las de `seq < min_seq` NO se tocan.

- [ ] **Step 1: Test (falla)**

En `tests/test_reddit_db.py`, agregar:
```python
def test_revert_to_filtered_conserva_las_posteadas(tmp_path):
    conn = db.connect(tmp_path / "s.sqlite")
    for pid in ("a", "b", "c"):
        db.insert_story(conn, {**SAMPLE, "id": pid})
    for pid in ("a", "b", "c"):                 # seq 1, 2, 3
        db.save_rewrite(conn, pid, _rw(titulo=pid))
    n = db.revert_to_filtered(conn, min_seq=2)   # conserva seq 1 (a), revierte b, c
    assert n == 2
    seqs = {r["id"]: r["seq"] for r in db.rewritten_by_seq(conn)}
    assert seqs == {"a": 1}                       # solo queda la seq 1
    filtradas = {s["id"] for s in db.get_by_status(conn, "filtered")}
    assert filtradas == {"b", "c"}
```

- [ ] **Step 2: Correr (falla)**

Run: `python -m pytest tests/test_reddit_db.py::test_revert_to_filtered_conserva_las_posteadas -v`
Expected: FAIL (`AttributeError: ... 'revert_to_filtered'`).

- [ ] **Step 3: Implementar en `reddit_pipeline/db.py`**

```python
def revert_to_filtered(conn: sqlite3.Connection, min_seq: int) -> int:
    """Devuelve las historias con seq >= min_seq al pool 'filtered' (limpia la
    reescritura y el seq; conserva viral_score). Las de seq < min_seq (ya posteadas)
    no se tocan. Útil para refrescar el backlog con un formato nuevo. Devuelve cuántas."""
    cur = conn.execute(
        "UPDATE stories SET status='filtered', guion=NULL, narrador_genero=NULL, "
        "titulo_es=NULL, veredicto=NULL, cierre=NULL, seq=NULL "
        "WHERE seq IS NOT NULL AND seq >= ?", (min_seq,))
    conn.commit()
    return cur.rowcount
```

- [ ] **Step 4: Correr (pasa)**

Run: `python -m pytest tests/test_reddit_db.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add reddit_pipeline/db.py tests/test_reddit_db.py
git commit -m "feat(reddit): db.revert_to_filtered para refrescar el backlog sin tocar lo posteado"
```

---

### Task 6: Refresco del backlog + verificación (operación, no TDD)

**Files:**
- Datos: `reddit_pipeline/stories.sqlite` (gitignored), `output/soyelmalo/` (gitignored)

> Requiere la Groq key (ya en `.env`). No es automatizable como test — es la operación de refresco + validación por juicio humano (spec §4).

- [ ] **Step 1: Suite completa verde antes de tocar datos**

Run: `python -m pytest -q`
Expected: PASS (todo).

- [ ] **Step 2: Revertir el backlog no posteado (conservar seq 1)**

```bash
python -c "import reddit_pipeline.db as db; from reddit_pipeline.constants import DB_PATH; c=db.connect(DB_PATH); print('revertidas:', db.revert_to_filtered(c, 2)); c.close()"
```
Expected: imprime las ~14 revertidas (seq 2-15).

- [ ] **Step 3: Re-source + re-filter (trae historias de pareja/familia, scoreadas con las keywords nuevas)**

```bash
python -m reddit_pipeline source
python -m reddit_pipeline filter
```

- [ ] **Step 4: Re-reescribir con el prompt nuevo (quedan seq 2, 3, 4…)**

```bash
python -m reddit_pipeline rewrite 15
```

- [ ] **Step 5: Borrar los videos viejos no posteados (para que se regeneren con los guiones nuevos)**

Borrar todo `output/soyelmalo/*.mp4` y `*.json` EXCEPTO el de la seq 1 ya posteada
(`puntualidad_mortal_la_venganza_de_30_min.*`):
```bash
cd output/soyelmalo && find . -maxdepth 1 -type f \( -name '*.mp4' -o -name '*.json' \) \
  ! -name 'puntualidad_mortal_la_venganza_de_30_min.*' -delete && cd ../..
```

- [ ] **Step 6: Leer los guiones nuevos (JUICIO HUMANO — criterio de aceptación)**

```bash
python -m reddit_pipeline dump 5
```
Criterio: 210-320 palabras, gancho que abre bucle, arco desarrollado (setup→escalada→giro→payoff), **título cliffhanger** (no spoilea), drama de pareja/familia. Si no convence → iterar el `PROMPT` (Task 3) y re-reescribir.

- [ ] **Step 7: Renderizar 1 video nuevo y revisar por frames**

```bash
PYTHONIOENCODING=utf-8 python -c "import daily_post, series_reddit; from channels_registry import get_channel; print(daily_post._ensure_video(2, get_channel('soyelmalo'), series_reddit))"
```
Revisar un frame del inicio (tarjeta/hook) y la duración (~90-120s). Si la tarjeta del título queda muy cargada por el cliffhanger largo, ajustar el tamaño/posición en el render (decisión abierta del spec §3.3).

- [ ] **Step 8: Confirmar contadores (la próxima publicación es formato nuevo)**

```bash
python -c "import json; d=json.load(open('automation_state.json',encoding='utf-8'))['soyelmalo']; print('IG', d['instagram']['next_part'], 'TT', d['tiktok']['next_part'])"
```
Expected: `IG 2 TT 2` (la próxima parte = seq 2 = formato nuevo). Si no, dejar en 2.

---

## Nota de alcance

Entrega la **Fase 1** (video único largo + cliffhanger + foco familia + backlog refrescado).
**Fase 2 (futuro):** multi-parte con cliffhanger (partir la historia + postear la parte 2).
