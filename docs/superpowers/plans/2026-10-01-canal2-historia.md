# Canal 2 "Historia en 60 Segundos" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lanzar el canal "Historia en 60 Segundos" (1 historia narrada por episodio, YouTube + Instagram) generalizando la automatización a multi-canal vía registro de canales.

**Architecture:** Un `channels_registry.py` declara por canal: módulo de guiones, perfil del motor, música, secretos y plataformas. `daily_post.py` recibe `--channel` y opera sobre el estado namespaceado por canal (migración automática). El generador existente `src.curiosidades.generate()` se reusa tal cual: una historia = segmentos `fact` encadenados (gancho → momentos → remate), sin tarjeta de título.

**Tech Stack:** Python 3.12, ffmpeg, edge-tts, faster-whisper, Pixabay (stock), YouTube Data API v3, Instagram API (graph.instagram.com), pytest 8.

## Global Constraints

- **El canal 1 no cambia su comportamiento**: sus rutas de secretos (`secrets/token.json`, `.env`) y su tarea programada quedan como están; `python daily_post.py` sin argumentos sigue operando el canal 1.
- Guiones en español neutro con voseo suave ("seguime"); **números escritos en palabras** ("mil novecientos setenta y cuatro") — el TTS los lee mejor.
- Duración hablada objetivo por episodio: **45-58 segundos** (test: 100-165 palabras).
- Todo gratis: música CC-BY con crédito en la descripción (patrón `music/*.credit.txt`).
- Windows: rutas con `Path`, scripts `.bat` con `PYTHONIOENCODING=utf-8`.
- Commits frecuentes, mensajes en español, terminar con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Tests con pytest en `tests/` (correr con `python -m pytest tests/ -v` desde la raíz).

---

### Task 1: `title_for` en `series_data.py`

Mover el título del episodio del canal 1 desde `daily_post._title` al módulo de la serie, para que cada serie sea dueña de sus títulos (interfaz común de los módulos de serie).

**Files:**
- Modify: `series_data.py` (agregar función al final)
- Test: `tests/test_series_data.py` (nuevo; crear también `tests/__init__.py` vacío)

**Interfaces:**
- Produces: `series_data.title_for(part: int) -> str` — Task 6 la consume; `series_historia.title_for` (Task 4) replica la firma.

- [ ] **Step 1: Escribir el test que falla**

```python
# tests/test_series_data.py
import series_data


def test_title_for():
    assert series_data.title_for(3) == "Datos para parecer inteligente pt. 3"
```

- [ ] **Step 2: Verificar que falla**

Run: `python -m pytest tests/test_series_data.py -v`
Expected: FAIL con `AttributeError: module 'series_data' has no attribute 'title_for'`

- [ ] **Step 3: Implementar**

Al final de `series_data.py`:

```python
def title_for(part: int) -> str:
    """Título del episodio (interfaz común de los módulos de serie)."""
    return f"Datos para parecer inteligente pt. {part}"
```

- [ ] **Step 4: Verificar que pasa**

Run: `python -m pytest tests/test_series_data.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add series_data.py tests/__init__.py tests/test_series_data.py
git commit -m "series_data: title_for como interfaz común de las series"
```

---

### Task 2: `token_file` parametrizable en `uploaders/youtube_upload.py`

El canal 2 usa el token OAuth del canal de marca (`secrets/historia/token.json`); el módulo hoy tiene `TOKEN` fijo.

**Files:**
- Modify: `uploaders/youtube_upload.py`
- Test: `tests/test_youtube_upload.py`

**Interfaces:**
- Produces: `_resolve_token(token_file: str | Path | None) -> Path`; `_get_service(token_file=None)`; `upload(..., token_file=None)`; `upload_from_folder(clip_path, privacy="private", token_file=None)`. Task 6 llama `upload_from_folder(video, privacy=..., token_file=ctx["yt_token"] o None)`.

- [ ] **Step 1: Escribir el test que falla**

```python
# tests/test_youtube_upload.py
from pathlib import Path

from uploaders.youtube_upload import TOKEN, _resolve_token


def test_resolve_token_default():
    assert _resolve_token(None) == TOKEN


def test_resolve_token_custom():
    p = _resolve_token("secrets/historia/token.json")
    assert isinstance(p, Path)
    assert p.as_posix().endswith("secrets/historia/token.json")
    assert p.is_absolute()
```

- [ ] **Step 2: Verificar que falla**

Run: `python -m pytest tests/test_youtube_upload.py -v`
Expected: FAIL con `ImportError: cannot import name '_resolve_token'`

- [ ] **Step 3: Implementar**

En `uploaders/youtube_upload.py`, debajo de `SCOPES`:

```python
def _resolve_token(token_file: str | Path | None) -> Path:
    """Ruta del token OAuth: la del canal (relativa a la raíz) o la legacy."""
    if token_file is None:
        return TOKEN
    p = Path(token_file)
    return p if p.is_absolute() else ROOT / p
```

Cambiar las firmas y usos (el cuerpo de `_get_service` solo cambia `TOKEN` → `tok` y crea el directorio del token):

```python
def _get_service(token_file: str | Path | None = None):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    tok = _resolve_token(token_file)
    creds = None
    if tok.exists():
        creds = Credentials.from_authorized_user_file(str(tok), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CLIENT_SECRET.exists():
                raise FileNotFoundError(
                    f"Falta {CLIENT_SECRET}. Seguí setup_youtube_auth.md."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
            creds = flow.run_local_server(port=0)
        tok.parent.mkdir(parents=True, exist_ok=True)
        tok.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)
```

En `upload(...)`: agregar parámetro final `token_file: str | Path | None = None` y cambiar `service = _get_service()` → `service = _get_service(token_file)`.

En `upload_from_folder(...)`: firma `def upload_from_folder(clip_path: Path | str, privacy: str = "private", token_file: str | Path | None = None) -> str:` y el return pasa a `return upload(clip_path, title, description, tags, privacy=privacy, token_file=token_file)`.

- [ ] **Step 4: Verificar que pasa (y que el módulo sigue importando)**

Run: `python -m pytest tests/test_youtube_upload.py -v && python -c "import uploaders.youtube_upload; print('OK')"`
Expected: 2 PASS + `OK`

- [ ] **Step 5: Commit**

```bash
git add uploaders/youtube_upload.py tests/test_youtube_upload.py
git commit -m "youtube_upload: token OAuth parametrizable por canal"
```

---

### Task 3: Crédito de música por pista

Hoy `_music_credit()` lee el global `music/CREDITS.txt` (crédito de la pista del canal 1). Con dos pistas, cada una necesita su crédito.

**Files:**
- Modify: `src/multidato.py:55-57` (función `_music_credit`)
- Modify: `src/curiosidades.py:234` (llamada `credit = _music_credit()`)
- Test: `tests/test_music_credit.py`

**Interfaces:**
- Produces: `_music_credit(track: Path | None = None) -> str` — si existe `music/<stem>.credit.txt` lo usa; si no, cae al legacy `music/CREDITS.txt`. `src/multidato.py:176` (`credit = _music_credit()`) sigue siendo válido por el default.

- [ ] **Step 1: Escribir el test que falla**

```python
# tests/test_music_credit.py
from pathlib import Path

from src.multidato import MUSIC_DIR, _music_credit


def test_credito_por_pista(tmp_path, monkeypatch):
    # El crédito específico de la pista gana sobre el global
    cred = MUSIC_DIR / "pista_test.credit.txt"
    cred.write_text("'Pista Test' Autor CC-BY", encoding="utf-8")
    try:
        texto = _music_credit(MUSIC_DIR / "pista_test.mp3")
        assert texto == "'Pista Test' Autor CC-BY"
    finally:
        cred.unlink()


def test_credito_legacy_sin_archivo_especifico():
    # Sin <stem>.credit.txt cae al CREDITS.txt global (comportamiento actual)
    assert _music_credit(MUSIC_DIR / "no_existe.mp3") == _music_credit()
```

- [ ] **Step 2: Verificar que falla**

Run: `python -m pytest tests/test_music_credit.py -v`
Expected: FAIL con `TypeError: _music_credit() takes 0 positional arguments but 1 was given`

- [ ] **Step 3: Implementar**

En `src/multidato.py` reemplazar la función:

```python
def _music_credit(track: Path | None = None) -> str:
    """Crédito de la música: el de la pista (music/<stem>.credit.txt) si existe,
    si no el global music/CREDITS.txt (pista original del canal 1)."""
    if track is not None:
        per_track = MUSIC_DIR / f"{Path(track).stem}.credit.txt"
        if per_track.exists():
            return per_track.read_text(encoding="utf-8").strip()
    f = MUSIC_DIR / "CREDITS.txt"
    return f.read_text(encoding="utf-8").strip() if f.exists() else ""
```

En `src/curiosidades.py` línea 234: `credit = _music_credit()` → `credit = _music_credit(track)`.

- [ ] **Step 4: Verificar que pasa**

Run: `python -m pytest tests/test_music_credit.py -v && python -c "import src.curiosidades; print('OK')"`
Expected: 2 PASS + `OK`

- [ ] **Step 5: Commit**

```bash
git add src/multidato.py src/curiosidades.py tests/test_music_credit.py
git commit -m "Crédito de música por pista (cada canal con la suya)"
```

---

### Task 4: `series_historia.py` — backlog de 10 historias

El módulo de guiones del canal 2, con la misma interfaz que `series_data`.

**Files:**
- Create: `series_historia.py`
- Test: `tests/test_series_historia.py`

**Interfaces:**
- Consumes: `series_data.BACKGROUNDS` (lista de fondos; se reusa).
- Produces: `HISTORIAS: dict[int, dict]`, `PARTS = HISTORIAS` (alias de interfaz), `KEYWORDS: list[str]`, `title_for(part) -> str`, `descripcion(parte, resumen) -> str`, `background_for(part) -> str`. Mismo contrato que `series_data` — Task 6 los usa vía el registro.

- [ ] **Step 1: Escribir el test que falla**

```python
# tests/test_series_historia.py
import series_historia as sh


def test_diez_historias():
    assert set(sh.HISTORIAS) == set(range(1, 11))
    assert sh.PARTS is sh.HISTORIAS


def test_estructura_episodios():
    for n, ep in sh.HISTORIAS.items():
        assert ep["titulo"], f"ep {n} sin título"
        assert ep["resumen"], f"ep {n} sin resumen"
        segs = ep["segments"]
        assert 4 <= len(segs) <= 7, f"ep {n}: {len(segs)} segmentos"
        for s in segs:
            assert s["kind"] == "fact"
            assert s["text"].strip()
            assert s["imgs"], f"ep {n}: momento sin imágenes"
        palabras = sum(len(s["text"].split()) for s in segs)
        assert 100 <= palabras <= 165, f"ep {n}: {palabras} palabras (45-58s)"


def test_interfaz_serie():
    assert sh.HISTORIAS[1]["titulo"] in sh.title_for(1)
    assert "Historia en 60 Segundos" in sh.title_for(1)
    assert sh.background_for(1).startswith("backgrounds/")
    assert sh.KEYWORDS
    assert "1" in sh.descripcion(1, "resumen de prueba") or "historia" in sh.descripcion(1, "resumen de prueba").lower()


def test_remate_invita_a_seguir():
    for n, ep in sh.HISTORIAS.items():
        assert "eguime" in ep["segments"][-1]["text"], f"ep {n} sin CTA de seguir"
```

- [ ] **Step 2: Verificar que falla**

Run: `python -m pytest tests/test_series_historia.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'series_historia'`

- [ ] **Step 3: Implementar el módulo**

Crear `series_historia.py`. Estructura y los 2 primeros episodios COMPLETOS (los episodios 3-10 se escriben en el Step 4 siguiendo exactamente este molde):

```python
"""Guiones de la serie 'Historia en 60 Segundos' (canal 2).

Cada episodio es UNA historia narrada: gancho (intriga en 2 frases) ->
momentos del relato (cada uno con sus imágenes) -> remate con CTA.
Números SIEMPRE en palabras (el TTS los lee mejor). 100-165 palabras.
"""

from series_data import BACKGROUNDS

KEYWORDS = [
    "shorts", "historia", "historias reales", "datos históricos", "sabias que",
    "historia en 60 segundos", "curiosidades históricas", "cultura general",
    "aprender historia", "relatos", "viral",
]


def title_for(part: int) -> str:
    """Título propio por episodio (mejor búsqueda que 'pt. N')."""
    return f"{HISTORIAS[part]['titulo']} | Historia en 60 Segundos"


def descripcion(parte: int, resumen: str) -> str:
    return (
        "🏛️ Historias reales que parecen inventadas, contadas en un minuto.\n\n"
        f"📌 Episodio {parte}: {resumen}.\n\n"
        "💡 Seguime para una historia nueva cada día: la historia también se "
        "puede aprender en 60 segundos.\n\n"
        "historia, historias reales, datos históricos, curiosidades históricas, "
        "sabías que, cultura general, aprender historia.\n\n"
        "#shorts #historia #historiasreales #sabiasque #culturageneral #datoshistoricos"
    )


def background_for(part: int) -> str:
    """Mismo set de fondos rotativos que el canal 1 (desfasado una posición
    para que el mismo número de episodio no repita fondo entre canales)."""
    return BACKGROUNDS[part % len(BACKGROUNDS)]


def _m(text, *imgs):
    return {"kind": "fact", "text": text, "imgs": list(imgs)}


HISTORIAS = {
    1: {
        "titulo": "El soldado que peleó 29 años una guerra terminada",
        "resumen": ("Hiroo Onoda, el oficial japonés que siguió combatiendo en una isla "
                    "de Filipinas hasta mil novecientos setenta y cuatro"),
        "segments": [
            _m("Este soldado siguió peleando una guerra que había terminado veintinueve años antes. Y cuando por fin se rindió, lo hizo con honores.",
               "soldier jungle", "ww2 soldier"),
            _m("Hiroo Onoda era un oficial japonés destinado a una isla de Filipinas en mil novecientos cuarenta y cuatro. Su orden fue clara: resistir hasta que lo releven.",
               "philippines island jungle", "pacific war"),
            _m("Cuando Japón se rindió, Onoda no lo creyó: pensó que los panfletos tirados desde los aviones eran una trampa del enemigo.",
               "old airplane sky", "vintage leaflets"),
            _m("Vivió veintinueve años escondido en la selva: comía cocos y bananas, robaba arroz y seguía la guerra por su cuenta.",
               "jungle survival", "tropical jungle hut"),
            _m("En mil novecientos setenta y cuatro, su antiguo comandante viajó a la isla y le dio la orden de deponer las armas. Recién ahí entregó su espada, intacta. Seguime para más historias así.",
               "katana sword", "japan ceremony"),
        ],
    },
    2: {
        "titulo": "La plaga del baile que mató de agotamiento",
        "resumen": ("la plaga de baile de Estrasburgo de mil quinientos dieciocho, cuando "
                    "cientos de personas bailaron sin poder parar"),
        "segments": [
            _m("En mil quinientos dieciocho, una mujer empezó a bailar en plena calle. No paró en seis días. Y a la semana, bailaban con ella más de treinta personas.",
               "medieval dance painting", "medieval town"),
            _m("Pasó en Estrasburgo. Frau Troffea bailaba sin música y sin descanso, hasta desmayarse. Al despertar, seguía bailando con los pies destrozados.",
               "strasbourg old town", "medieval street"),
            _m("Las autoridades pensaron que la cura era más baile: contrataron músicos y armaron un escenario. Fue peor: llegaron a ser cuatrocientos, y varios murieron de agotamiento.",
               "medieval musicians", "medieval festival painting"),
            _m("Los historiadores creen que fue histeria colectiva: la ciudad venía de hambrunas y pestes, y el estrés extremo estalló en forma de baile imparable.",
               "medieval plague painting", "old manuscript"),
            _m("Recién pararon cuando los llevaron a rezar a un santuario en la montaña. Es uno de los misterios más raros de la historia, y nunca se resolvió del todo. Seguime para más historias así.",
               "mountain chapel", "candles church"),
        ],
    },
}
```

- [ ] **Step 4: Escribir los episodios 3 a 10 con el MISMO molde** (mismos campos, 4-7 momentos `_m(...)`, 100-165 palabras, números en palabras, remate con "Seguime para más historias así."). Temas (verificar los datos de cada uno antes de escribir; si alguno no se sostiene, reemplazarlo por otra historia real verificable):
  - 3: "La guerra más corta de la historia" (Anglo-Zanzíbar, treinta y ocho minutos, mil ochocientos noventa y seis)
  - 4: "El hombre que nunca se llenaba" (Tarrare, el soldado francés con hambre insaciable)
  - 5: "La ola de melaza que inundó una ciudad" (Boston, mil novecientos diecinueve)
  - 6: "El hombre que vivió 18 años en un aeropuerto" (Mehran Karimi Nasseri, Charles de Gaulle)
  - 7: "El soldado que salvó al mundo con un 'no'" (Stanislav Petrov, mil novecientos ochenta y tres)
  - 8: "La epidemia de risa que cerró escuelas" (Tanganica, mil novecientos sesenta y dos)
  - 9: "El caballo que casi llega a cónsul" (Incitato, el caballo de Calígula)
  - 10: "El emperador que le declaró la guerra al mar" (Calígula y las conchas marinas — si las fuentes no alcanzan, usar: "La ciudad que lleva cien años incendiada", Centralia)

- [ ] **Step 5: Verificar que pasa**

Run: `python -m pytest tests/test_series_historia.py -v`
Expected: 4 PASS

- [ ] **Step 6: Commit**

```bash
git add series_historia.py tests/test_series_historia.py
git commit -m "series_historia: backlog de 10 historias del canal 2"
```

---

### Task 5: `channels_registry.py` + perfil `historia` en `config/channels.yaml`

**Files:**
- Create: `channels_registry.py`
- Modify: `config/channels.yaml` (agregar perfil al final)
- Test: `tests/test_registry.py`

**Interfaces:**
- Consumes: módulos `series_data` y `series_historia` (Task 1 y 4); `src.config.load_channel` (existente).
- Produces: `CHANNELS: dict[str, dict]`, `get_channel(name: str) -> dict` (KeyError con mensaje útil si no existe), `load_series(ctx: dict) -> module`. Claves de cada ctx: `display`, `series`, `engine_channel`, `music`, `yt_token` (str | None = legacy `secrets/token.json`), `ig_creds` (str | None = legacy .env), `platforms` (tuple). Task 6 consume todo esto.

- [ ] **Step 1: Escribir el test que falla**

```python
# tests/test_registry.py
import pytest

import channels_registry as reg


def test_canales_registrados():
    assert set(reg.CHANNELS) == {"faceless", "historia"}


def test_contexto_historia():
    ctx = reg.get_channel("historia")
    assert ctx["display"] == "Historia en 60 Segundos"
    assert ctx["platforms"] == ("yt", "ig")
    assert ctx["yt_token"] == "secrets/historia/token.json"
    assert ctx["ig_creds"] == "secrets/historia/instagram.json"
    assert ctx["music"] == "music/historia_tema.mp3"


def test_contexto_faceless_legacy():
    ctx = reg.get_channel("faceless")
    assert ctx["yt_token"] is None      # usa secrets/token.json (legacy)
    assert ctx["ig_creds"] is None      # usa .env (legacy)
    assert ctx["platforms"] == ("yt", "ig", "tt")


def test_canal_inexistente():
    with pytest.raises(KeyError):
        reg.get_channel("reddit")


def test_series_cargan():
    for name in reg.CHANNELS:
        mod = reg.load_series(reg.get_channel(name))
        for attr in ("PARTS", "KEYWORDS", "title_for", "descripcion", "background_for"):
            assert hasattr(mod, attr), f"{name}: falta {attr}"


def test_perfil_motor_existe():
    from src import config as cfg
    ch = cfg.load_channel("historia")
    assert ch.get("tts_voice", "").startswith("es-")
```

- [ ] **Step 2: Verificar que falla**

Run: `python -m pytest tests/test_registry.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'channels_registry'`

- [ ] **Step 3: Implementar el registro**

```python
# channels_registry.py
"""Registro de canales de la automatización multi-canal.

Cada canal declara su módulo de guiones, su perfil del motor (channels.yaml),
su música, sus secretos y sus plataformas activas. Los canales futuros
(Reddit, streamers) se enchufan agregando una entrada acá + su módulo.
"""
from __future__ import annotations

import importlib

CHANNELS = {
    "faceless": {
        "display": "En 60 Segundos",
        "series": "series_data",
        "engine_channel": "faceless",
        "music": "music/monkeys_spinning_monkeys.mp3",
        "yt_token": None,     # None = secrets/token.json (legacy, no tocar)
        "ig_creds": None,     # None = IG_USER_ID/IG_ACCESS_TOKEN del .env (legacy)
        "platforms": ("yt", "ig", "tt"),
    },
    "historia": {
        "display": "Historia en 60 Segundos",
        "series": "series_historia",
        "engine_channel": "historia",
        "music": "music/historia_tema.mp3",
        "yt_token": "secrets/historia/token.json",
        "ig_creds": "secrets/historia/instagram.json",
        "platforms": ("yt", "ig"),   # TikTok se activa cuando aprueben la app
    },
}


def get_channel(name: str) -> dict:
    if name not in CHANNELS:
        raise KeyError(f"Canal '{name}' no registrado. Opciones: {', '.join(CHANNELS)}")
    return {"name": name, **CHANNELS[name]}


def load_series(ctx: dict):
    """Importa el módulo de guiones del canal (PARTS, KEYWORDS, title_for...)."""
    return importlib.import_module(ctx["series"])
```

Al final de `config/channels.yaml` agregar:

```yaml
# -------------------------------------------------------------------------
# CANAL NUEVO — Historia en 60 Segundos (faceless de datos históricos)
# -------------------------------------------------------------------------
historia:
  display_name: "Historia en 60 Segundos"
  whisper_model: "small"
  crop_mode: "blur"
  clips_per_source: 1
  hook_text: ""
  tts_voice: "es-MX-JorgeNeural"   # provisional: se confirma con muestras (plan Task 7)
  tts_rate: "+4%"                  # relato un toque más pausado que el canal 1
  caption:
    highlight_color: "&H0000A5FF"  # dorado/ámbar para diferenciar el canal
  legal_note: "Contenido propio generado con IA/stock. Sin riesgo de copyright."
```

- [ ] **Step 4: Verificar que pasa**

Run: `python -m pytest tests/test_registry.py -v`
Expected: 6 PASS

- [ ] **Step 5: Commit**

```bash
git add channels_registry.py config/channels.yaml tests/test_registry.py
git commit -m "Registro de canales + perfil del motor para historia"
```

---

### Task 6: Refactor multi-canal de `daily_post.py`

Estado namespaceado por canal (con migración), contexto de canal en todas las funciones, `--channel` en la CLI, credenciales IG por archivo y token de YouTube por canal.

**Files:**
- Modify: `daily_post.py` (reescritura guiada; el archivo completo queda como se muestra abajo)
- Test: `tests/test_daily_post_state.py`

**Interfaces:**
- Consumes: `channels_registry.get_channel/load_series` (Task 5), `series.title_for` (Tasks 1/4), `upload_from_folder(..., token_file=...)` (Task 2).
- Produces: CLI `python daily_post.py [--channel <nombre>] [--only yt|ig|tt] [--dry-run]` (default `faceless`); estado `automation_state.json` con forma `{"<canal>": {"youtube": {...}, "instagram": {...}, "tiktok": {...}}}`; credenciales IG del canal 2 en `secrets/historia/instagram.json` con forma `{"user_id": str, "access_token": str, "token_refreshed": "YYYY-MM-DD"}` (Task 10 crea ese archivo).

- [ ] **Step 1: Escribir el test de migración que falla**

```python
# tests/test_daily_post_state.py
import json

import daily_post


def test_migra_estado_plano_a_por_canal(tmp_path, monkeypatch):
    # Formato actual (plano, solo canal 1) -> {"faceless": {...}, "historia": {...}}
    legacy = {
        "youtube": {"next_part": 4, "posted": [{"part": 3}]},
        "instagram": {"next_part": 3, "posted": [], "token_refreshed": "2026-09-30"},
        "tiktok": {"next_part": 2, "posted": []},
    }
    f = tmp_path / "automation_state.json"
    f.write_text(json.dumps(legacy), encoding="utf-8")
    monkeypatch.setattr(daily_post, "STATE", f)

    s = daily_post._load_state()
    assert s["faceless"]["youtube"]["next_part"] == 4
    assert s["faceless"]["instagram"]["token_refreshed"] == "2026-09-30"
    assert s["historia"]["youtube"]["next_part"] == 1
    assert s["historia"]["instagram"]["next_part"] == 1


def test_estado_nuevo_pasa_intacto(tmp_path, monkeypatch):
    nuevo = {"faceless": {"youtube": {"next_part": 7, "posted": []}},
             "historia": {"youtube": {"next_part": 2, "posted": []}}}
    f = tmp_path / "automation_state.json"
    f.write_text(json.dumps(nuevo), encoding="utf-8")
    monkeypatch.setattr(daily_post, "STATE", f)

    s = daily_post._load_state()
    assert s["faceless"]["youtube"]["next_part"] == 7
    assert s["historia"]["youtube"]["next_part"] == 2
    # Las plataformas faltantes se completan con el default
    assert s["historia"]["instagram"]["next_part"] == 1


def test_estado_vacio(tmp_path, monkeypatch):
    monkeypatch.setattr(daily_post, "STATE", tmp_path / "no_existe.json")
    s = daily_post._load_state()
    for canal in ("faceless", "historia"):
        for plat in ("youtube", "instagram", "tiktok"):
            assert s[canal][plat]["next_part"] == 1
```

- [ ] **Step 2: Verificar que falla**

Run: `python -m pytest tests/test_daily_post_state.py -v`
Expected: FAIL (KeyError `'faceless'` — el formato actual es plano)

- [ ] **Step 3: Reescribir `daily_post.py`**

Contenido completo del archivo nuevo:

```python
#!/usr/bin/env python
"""Job diario multi-canal: publica la próxima parte del canal en sus plataformas.

Cada canal (ver channels_registry.py) y cada plataforma llevan su propio
contador, así una no bloquea a la otra. Genera el video si no existe.
Pensado para el Programador de tareas de Windows (run_daily*.bat).

  python daily_post.py                       # canal 1 (faceless) — compatibilidad
  python daily_post.py --channel historia    # canal 2
  python daily_post.py --channel historia --dry-run
  python daily_post.py --only yt             # o --only ig / --only tt
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from channels_registry import CHANNELS, get_channel, load_series

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "automation_state.json"

# ─── Configuración ───────────────────────────────────────────────
YT_PRIVACY = "public"     # "public" (auto viral) | "unlisted" | "private"
# ─────────────────────────────────────────────────────────────────

_PLATAFORMAS = ("youtube", "instagram", "tiktok")


def _log(ctx: dict, msg: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M}][{ctx['name']}] {msg}", flush=True)


def _default_channel_state() -> dict:
    return {p: {"next_part": 1, "posted": []} for p in _PLATAFORMAS}


def _load_state() -> dict:
    s = {name: _default_channel_state() for name in CHANNELS}
    if STATE.exists():
        old = json.loads(STATE.read_text(encoding="utf-8"))
        if "youtube" in old:                 # formato plano viejo = canal 1
            old = {"faceless": old}
        if "next_part" in old:               # formato prehistórico (solo YT)
            old = {"faceless": {"youtube": old}}
        for canal, plats in old.items():
            s.setdefault(canal, _default_channel_state())
            for plat, v in plats.items():
                s[canal].setdefault(plat, {"next_part": 1, "posted": []}).update(v)
    return s


def _save_state(s: dict) -> None:
    STATE.write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding="utf-8")


def _ensure_video(part: int, ctx: dict, series) -> Path:
    """Devuelve el mp4 de la parte, generándolo si no existe."""
    from src.curiosidades import generate
    from src.faceless import _slug

    title = series.title_for(part)
    video = ROOT / "output" / ctx["engine_channel"] / f"{_slug(title)}.mp4"
    if not video.exists():
        _log(ctx, f"Generando parte {part}...")
        generate(series.PARTS[part]["segments"],
                 channel_name=ctx["engine_channel"],
                 background=series.background_for(part),
                 music=ctx["music"],
                 title_meta=title,
                 description=series.descripcion(part, series.PARTS[part]["resumen"]),
                 hashtags=series.KEYWORDS,
                 verbose=False)
    return video


def _caption(video: Path) -> str:
    meta = video.with_suffix(".json")
    if meta.exists():
        return json.loads(meta.read_text(encoding="utf-8")).get("description", video.stem)
    return video.stem


def do_youtube(st: dict, ctx: dict, series) -> None:
    part = st["youtube"]["next_part"]
    if part not in series.PARTS:
        _log(ctx, f"[YT] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part, ctx, series)
    from uploaders.youtube_upload import upload_from_folder
    _log(ctx, f"[YT] Subiendo parte {part} ({YT_PRIVACY})...")
    try:
        vid = upload_from_folder(video, privacy=YT_PRIVACY, token_file=ctx["yt_token"])
    except Exception as e:
        _log(ctx, f"[YT] ⚠️  No se pudo subir (reintenta la próxima): {e}")
        return
    st["youtube"]["next_part"] = part + 1
    st["youtube"]["posted"].append({"part": part, "video_id": vid, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(ctx, f"[YT] ✅ Parte {part}: https://youtube.com/shorts/{vid}")


def _ig_creds(ctx: dict) -> dict | None:
    """{'user_id','access_token'} del canal, o None si no está configurado."""
    if ctx["ig_creds"] is None:              # canal 1: variables del .env (legacy)
        if not all(os.environ.get(k) or _in_env(k) for k in ("IG_USER_ID", "IG_ACCESS_TOKEN")):
            return None
        from src.gh_release import _load_env
        _load_env()
        return {"user_id": os.environ["IG_USER_ID"],
                "access_token": os.environ["IG_ACCESS_TOKEN"]}
    f = ROOT / ctx["ig_creds"]
    if not f.exists():
        return None
    return json.loads(f.read_text(encoding="utf-8"))


def _refresh_ig_token_env(st: dict) -> None:
    """Renovación semanal del token del canal 1 (vive en .env). Sin cambios."""
    import re

    import requests
    last = st["instagram"].get("token_refreshed", "")
    if last and (datetime.now() - datetime.strptime(last, "%Y-%m-%d")).days < 7:
        return
    env_path = ROOT / ".env"
    txt = env_path.read_text(encoding="utf-8")
    m = re.search(r"^IG_ACCESS_TOKEN=(.+)$", txt, re.M)
    if not m:
        return
    try:
        r = requests.get("https://graph.instagram.com/refresh_access_token",
                         params={"grant_type": "ig_refresh_token",
                                 "access_token": m.group(1).strip()}, timeout=60)
        data = r.json()
        if "access_token" in data:
            txt = re.sub(r"^IG_ACCESS_TOKEN=.+$", f"IG_ACCESS_TOKEN={data['access_token']}",
                         txt, flags=re.M)
            env_path.write_text(txt, encoding="utf-8")
            os.environ["IG_ACCESS_TOKEN"] = data["access_token"]
            st["instagram"]["token_refreshed"] = f"{datetime.now():%Y-%m-%d}"
            print(f"[IG] Token renovado (+{round(data.get('expires_in', 0) / 86400)} días).")
        else:
            print(f"[IG] ⚠️  No se pudo renovar el token: {data}")
    except Exception as e:
        print(f"[IG] ⚠️  Error renovando token (sigo igual): {e}")


def _refresh_ig_token(st: dict, ctx: dict) -> None:
    """Renueva el token de IG del canal (vence a los 60 días) una vez por semana."""
    if ctx["ig_creds"] is None:
        _refresh_ig_token_env(st)
        return
    import requests
    f = ROOT / ctx["ig_creds"]
    if not f.exists():
        return
    d = json.loads(f.read_text(encoding="utf-8"))
    last = d.get("token_refreshed", "")
    if last and (datetime.now() - datetime.strptime(last, "%Y-%m-%d")).days < 7:
        return
    try:
        r = requests.get("https://graph.instagram.com/refresh_access_token",
                         params={"grant_type": "ig_refresh_token",
                                 "access_token": d["access_token"]}, timeout=60)
        data = r.json()
        if "access_token" in data:
            d["access_token"] = data["access_token"]
            d["token_refreshed"] = f"{datetime.now():%Y-%m-%d}"
            f.write_text(json.dumps(d, indent=2), encoding="utf-8")
            _log(ctx, f"[IG] Token renovado (+{round(data.get('expires_in', 0) / 86400)} días).")
        else:
            _log(ctx, f"[IG] ⚠️  No se pudo renovar el token: {data}")
    except Exception as e:
        _log(ctx, f"[IG] ⚠️  Error renovando token (sigo igual): {e}")


def do_instagram(st: dict, ctx: dict, series) -> None:
    if not (os.environ.get("GITHUB_TOKEN") or _in_env("GITHUB_TOKEN")):
        _log(ctx, "[IG] Falta GITHUB_TOKEN en .env (hosting del mp4), lo salteo.")
        return
    creds = _ig_creds(ctx)
    if not creds:
        _log(ctx, "[IG] No configurado (sin credenciales), lo salteo.")
        return
    _refresh_ig_token(st, ctx)
    creds = _ig_creds(ctx)   # releer por si el refresh cambió el token
    part = st["instagram"]["next_part"]
    if part >= st["youtube"]["next_part"]:
        _log(ctx, f"[IG] pt.{part} espera a que YouTube publique primero (sincronización). Salteo.")
        return
    if part not in series.PARTS:
        _log(ctx, f"[IG] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part, ctx, series)
    try:
        from src.gh_release import upload as gh_upload
        from uploaders.instagram_upload import publish_reel
        _log(ctx, f"[IG] Parte {part}: subiendo mp4 a hosting...")
        url = gh_upload(video)
        _log(ctx, "[IG] Publicando Reel...")
        media_id = publish_reel(url, caption=_caption(video),
                                ig_user_id=creds["user_id"],
                                access_token=creds["access_token"])
    except Exception as e:
        _log(ctx, f"[IG] ⚠️  No se pudo publicar (reintenta la próxima): {e}")
        return
    st["instagram"]["next_part"] = part + 1
    st["instagram"]["posted"].append({"part": part, "media_id": media_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(ctx, f"[IG] ✅ Parte {part}: Reel {media_id}")


def do_tiktok(st: dict, ctx: dict, series) -> None:
    """Sube la próxima parte a los BORRADORES de TikTok (solo canales con 'tt';
    el token sigue siendo el global de secrets/ hasta que aprueben la app)."""
    from uploaders.tiktok_upload import TOKEN_FILE
    if not TOKEN_FILE.exists():
        _log(ctx, "[TT] No configurado (sin token), lo salteo.")
        return
    part = st["tiktok"]["next_part"]
    if part >= st["youtube"]["next_part"]:
        _log(ctx, f"[TT] pt.{part} espera a que YouTube publique primero (sincronización). Salteo.")
        return
    if part not in series.PARTS:
        _log(ctx, f"[TT] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part, ctx, series)
    try:
        from uploaders.tiktok_upload import upload_draft
        _log(ctx, f"[TT] Subiendo parte {part} a borradores...")
        publish_id = upload_draft(video)
    except Exception as e:
        _log(ctx, f"[TT] ⚠️  No se pudo subir (reintenta la próxima): {e}")
        return
    st["tiktok"]["next_part"] = part + 1
    st["tiktok"]["posted"].append({"part": part, "publish_id": publish_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(ctx, f"[TT] ✅ Parte {part} en borradores de TikTok (publicala desde la app).")


def _in_env(key: str) -> bool:
    env = ROOT / ".env"
    if not env.exists():
        return False
    return any(line.strip().startswith(f"{key}=") for line in env.read_text(encoding="utf-8").splitlines())


def main() -> int:
    channel = "faceless"
    if "--channel" in sys.argv:
        channel = sys.argv[sys.argv.index("--channel") + 1]
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    dry = "--dry-run" in sys.argv

    ctx = get_channel(channel)
    series = load_series(ctx)
    state = _load_state()
    st = state[channel]

    if dry:
        yt, ig = st["youtube"]["next_part"], st["instagram"]["next_part"]
        _log(ctx, f"[DRY-RUN] Próxima en YouTube: pt.{yt} · en Instagram: pt.{ig}. No publica.")
        for p in {yt, ig}:
            if p in series.PARTS:
                _ensure_video(p, ctx, series)
        return 0

    if "yt" in ctx["platforms"] and only in (None, "yt"):
        do_youtube(st, ctx, series)
    if "ig" in ctx["platforms"] and only in (None, "ig"):
        do_instagram(st, ctx, series)
    if "tt" in ctx["platforms"] and only in (None, "tt"):
        do_tiktok(st, ctx, series)
    _save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Verificar tests + regresión del canal 1**

Run: `python -m pytest tests/ -v`
Expected: todos PASS

Run: `python daily_post.py --dry-run`
Expected: línea `[faceless] [DRY-RUN] Próxima en YouTube: pt.<N> · en Instagram: pt.<M>. No publica.` con los MISMOS números que tenía `automation_state.json` antes del refactor (verificar contra el archivo previo). El archivo NO debe cambiar de números, solo de forma, tras la próxima corrida real.

- [ ] **Step 5: Commit**

```bash
git add daily_post.py tests/test_daily_post_state.py
git commit -m "daily_post multi-canal: --channel, estado por canal y credenciales por canal"
```

---

### Task 7: Muestras de voz + música del canal 2 (decisión del usuario)

**Files:**
- Modify: `config/channels.yaml` (línea `tts_voice` del perfil `historia`, si el usuario elige otra voz)
- Create: `music/historia_tema.mp3` + `music/historia_tema.credit.txt` (gitignored el mp3 por `*.mp3`; el .txt SÍ se commitea)

**Interfaces:**
- Consumes: `src.tts.synthesize(text, out_path, voice, rate)` (existente).
- Produces: voz definitiva en el perfil `historia` del yaml; pista en `music/historia_tema.mp3` (el nombre es el que el registro ya referencia).

- [ ] **Step 1: Generar 3 muestras de voz** (texto = gancho del ep. 1):

```bash
python -c "
from pathlib import Path
from src.tts import synthesize
texto = 'Este soldado siguió peleando una guerra que había terminado veintinueve años antes. Y cuando por fin se rindió, lo hizo con honores.'
for v in ('es-MX-JorgeNeural', 'es-ES-AlvaroNeural', 'es-AR-TomasNeural'):
    synthesize(texto, Path(f'output/voz_{v.split(\"-\")[2]}.mp3'), voice=v, rate='+4%')
    print('OK', v)
"
```

Expected: 3 mp3 en `output/`. **GATE: el usuario escucha y elige.** Actualizar `tts_voice` en el perfil `historia` de `config/channels.yaml` con la elegida y borrar las muestras.

- [ ] **Step 2: Bajar 3 candidatas de música CC-BY** (Kevin MacLeod, incompetech.com — tono épico/misterioso: "Ossuary 6 - Air", "Ominous", "Teller of the Tales"; si un link falla, buscar el mp3 en el sitio y usar otra pista del mismo tono). Guardarlas como `output/musica_1.mp3`, `output/musica_2.mp3`, `output/musica_3.mp3`. **GATE: el usuario elige.**

- [ ] **Step 3: Instalar la elegida**

```bash
mv output/musica_<elegida>.mp3 music/historia_tema.mp3
```

Crear `music/historia_tema.credit.txt` con el crédito EXACTO de la pista elegida, formato:

```
"<Título de la pista>" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

Borrar las candidatas no elegidas de `output/`.

- [ ] **Step 4: Verificar**

Run: `python -c "from src.multidato import _music_credit; from pathlib import Path; c=_music_credit(Path('music/historia_tema.mp3')); print(c); assert 'Kevin MacLeod' in c"`
Expected: imprime el crédito de la pista nueva (no el de Monkeys Spinning Monkeys).

- [ ] **Step 5: Commit**

```bash
git add config/channels.yaml music/historia_tema.credit.txt
git commit -m "Canal historia: voz elegida y crédito de la música CC-BY"
```

---

### Task 8: Automatización programada del canal 2

**Files:**
- Create: `run_daily_historia.bat`
- Modify: `.gitignore` (línea `automation.log` → `automation*.log`)
- Modify: `ROADMAP.md` (sección multi-nicho: canal 2 en marcha)

**Interfaces:**
- Consumes: CLI `daily_post.py --channel historia` (Task 6).

- [ ] **Step 1: Crear `run_daily_historia.bat`**

```bat
@echo off
REM Job diario del canal Historia en 60 Segundos (Programador de tareas).
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel historia >> automation_historia.log 2>&1
```

- [ ] **Step 2: En `.gitignore` reemplazar la línea `automation.log` por `automation*.log`**

- [ ] **Step 3: Registrar las 2 tareas programadas (12:30 y 19:30, escalonadas respecto del canal 1)**

```powershell
schtasks /create /tn "ShortsBot Historia 1230" /tr "\"C:\Users\accsoc\Desktop\yt short\run_daily_historia.bat\"" /sc daily /st 12:30
schtasks /create /tn "ShortsBot Historia 1930" /tr "\"C:\Users\accsoc\Desktop\yt short\run_daily_historia.bat\"" /sc daily /st 19:30
```

Expected: `Correcto: se creó la tarea programada "ShortsBot Historia 1230".` (y 1930).
**NOTA:** registrarlas recién cuando el episodio 1 esté validado (Task 9) y las cuentas conectadas (Task 10) — si se crean antes, la corrida solo logueará "No configurado, lo salteo", lo cual es inofensivo pero ensucia el log.

- [ ] **Step 4: Actualizar `ROADMAP.md`** — en la sección "🚀 Escala multi-nicho", reemplazar la línea del canal 2 por:

```markdown
- Canal 2 **"Historia en 60 Segundos"** (historia narrada/episodio): EN MARCHA —
  registro multi-canal + `series_historia` (ep. 1-10) listos; horarios 12:30/19:30.
  Spec: docs/superpowers/specs/2026-10-01-canal2-historia-design.md
```

- [ ] **Step 5: Verificar y commitear**

Run: `schtasks /query /tn "ShortsBot Historia 1230"` (si ya se registró)
Expected: la tarea listada con su horario.

```bash
git add run_daily_historia.bat .gitignore ROADMAP.md
git commit -m "Automatización del canal historia: bat + horarios escalonados 12:30/19:30"
```

---

### Task 9: Generar el episodio 1 y validar (GATE de calidad)

**Files:**
- (Genera `output/historia/<slug>.mp4` + `.json` — gitignored)

**Interfaces:**
- Consumes: todo lo anterior (registro, serie, perfil, voz, música).

- [ ] **Step 1: Dry-run del canal 2 (genera sin publicar)**

Run: `python daily_post.py --channel historia --dry-run`
Expected: `[historia] [DRY-RUN] Próxima en YouTube: pt.1 · en Instagram: pt.1. No publica.` y al terminar existe `output/historia/el_soldado_que_pele_29_a_os_una_guerra_terminada_historia_en_60_segundos.mp4` (el slug exacto puede variar; verificar con `ls output/historia/`).

- [ ] **Step 2: Control técnico del mp4**

Run: `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 output/historia/*.mp4`
Expected: duración entre 45 y 58 segundos. Verificar visualmente: imágenes arriba sin tapar el gameplay, karaoke sincronizado, música audible pero baja, crédito correcto en el `.json` (campo description menciona la pista nueva, NO Monkeys Spinning Monkeys).

- [ ] **Step 3: GATE — revisión del usuario (y su hermana, QA de contenido).** Ajustes de guion/estilo se hacen en `series_historia.py` y se regenera (borrar el mp4 y repetir Step 1). No avanzar a Task 10 sin el visto bueno.

- [ ] **Step 4: Commit (si hubo ajustes de guion)**

```bash
git add series_historia.py
git commit -m "Ajustes de guion del ep.1 tras QA"
```

---

### Task 10: Cuentas y primer upload (GATE del usuario)

**Files:**
- Create (fuera de git): `secrets/historia/token.json` (OAuth YT del canal de marca), `secrets/historia/instagram.json`

**Interfaces:**
- Consumes: `_get_service(token_file=...)` (Task 2). Produce las credenciales que `daily_post --channel historia` usa en producción.

- [ ] **Step 1: USUARIO — crear el canal de marca de YouTube**: youtube.com → foto de perfil → Configuración → "Crear canal nuevo" → nombre **Historia en 60 Segundos**. Mismo flujo que ya hizo para el canal 1.

- [ ] **Step 2: OAuth del canal de marca** (abre el navegador; ELEGIR la identidad "Historia en 60 Segundos" en la pantalla de Google):

```bash
python -c "from uploaders.youtube_upload import _get_service; _get_service(token_file='secrets/historia/token.json'); print('token OK')"
```

Expected: navegador → elegir el canal de marca → `token OK` y existe `secrets/historia/token.json`.

- [ ] **Step 3: USUARIO — verificar el canal** en youtube.com/verify (sube el cupo diario de subidas). Hacerlo el mismo día: tarda ~24h en aplicar del todo.

- [ ] **Step 4: USUARIO — cuenta de Instagram nueva** (@historia.en60segundos o similar), pasarla a Profesional/Creador, agregarla a la app de Meta existente (Instagram Login, igual que @en60segundos.47) y generar token de larga duración. Crear `secrets/historia/instagram.json`:

```json
{
  "user_id": "<IG user id de la cuenta nueva>",
  "access_token": "<token de larga duración>",
  "token_refreshed": "<fecha de hoy YYYY-MM-DD>"
}
```

- [ ] **Step 5: Verificar el token de IG**

```bash
python -c "
import json, requests
d = json.load(open('secrets/historia/instagram.json'))
r = requests.get('https://graph.instagram.com/v21.0/me',
                 params={'fields': 'user_id,username', 'access_token': d['access_token']}, timeout=30).json()
print(r); assert 'username' in r
"
```

Expected: imprime el username de la cuenta nueva.

- [ ] **Step 6: Primer upload REAL en privado** (prueba de punta a punta sin exponer el video):

```bash
python -c "
from uploaders.youtube_upload import upload_from_folder
from pathlib import Path
video = sorted(Path('output/historia').glob('*.mp4'))[0]
vid = upload_from_folder(video, privacy='private', token_file='secrets/historia/token.json')
print('https://youtube.com/watch?v=' + vid)
"
```

Expected: el video aparece en YouTube Studio DEL CANAL DE MARCA (no en "En 60 Segundos"), en privado. **GATE: el usuario confirma canal correcto y se ve bien.** Borrar el video privado después.

- [ ] **Step 7: Activar producción** — registrar las tareas de Task 8 Step 3 (si no se hizo) y dejar que la corrida de las 12:30 publique el ep. 1 en público. Tras la primera corrida real, revisar `automation_historia.log` y el nuevo `automation_state.json`.

- [ ] **Step 8: Commit final + actualizar memoria del proyecto**

```bash
git add -A && git status   # revisar que no haya secretos staged (secrets/ está gitignored)
git commit -m "Canal 2 Historia en 60 Segundos operativo (YT + IG, 12:30/19:30)"
```
