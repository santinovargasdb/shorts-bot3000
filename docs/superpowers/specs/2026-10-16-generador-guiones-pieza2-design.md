# Generador de guiones LLM (Pieza 2) — Diseño · piloto faceless

**Fecha:** 2026-10-16
**Estado:** Aprobado, listo para plan de implementación
**Alcance de este spec:** PILOTO del canal `faceless` únicamente. historia/misterios reusan el
patrón en specs posteriores.

## Problema

faceless/historia/misterios publican episodios de un `PARTS` **escrito a mano** (dict Python,
45/40/40 entradas). Sin generador, su colchón no es "infinito": el auto-refill (Pieza 1) los deja
en `SKIP` (`refill_script` → `NotImplementedError`). La Pieza 2 construye el generador LLM que
escribe episodios nuevos, con juez factual que reemplaza el QA humano (la hermana del usuario),
para que faceless también se auto-rellene de verdad.

Ver [[autobuild-refill-infinito]] (Pieza 1), [[proyecto-shorts-automaticos]].

## Decisiones (brainstorming 2026-10-16)

- **Piloto faceless primero** (datos sueltos, cada uno verificable, bajo riesgo). historia/misterios
  (relatos, mayor riesgo factual) se clonan después, reusando casi todo.
- **QA = full-infinito con juez LLM** (sin cola de aprobación humana; decidido en la Pieza 1).
- **Reusa la Groq key** ya en `.env` (`LLM_API_KEY`, modelo `openai/gpt-oss-120b` vía
  `reddit_pipeline.rewrite.build_client`/`model_name`, o lectura directa del env).
- **Sesgo del juez: ante la duda, RECHAZAR** (un dato falso es peor que un colchón más flaco).

## Arquitectura

Paquete nuevo `autoscripts/` (espejo de `reddit_pipeline/`):

```
autoscripts/
  db.py          # sqlite autoscripts/faceless.sqlite: seq, status, episode_json, topic_keys, created
  generate.py    # LLM -> 1 episodio en el JSON EXACTO de series_data
  judge.py       # 2º LLM fact-checker (adversarial, estricto) por dato
  topics.py      # dedup: temas usados (hardcodeados + generados) -> filtra repetidos
  build.py       # orquesta generate->schema->dedup->judge->store. CLI: python -m autoscripts.build faceless N
```

### Esquema de episodio (lo que el generador DEBE producir)

Igual a `series_data.PARTS[n]`:

```python
{
  "pregunta": "¿Qué dato sabés vos?",
  "resumen": "<una línea que lista los ~5 datos, para la descripción>",
  "segments": [
    {"kind": "fact", "text": "<dato con contexto (por qué/cómo), números EN PALABRAS>",
     "imgs": ["<término pixabay 1>", "<término pixabay 2>"]},
    {"kind": "title", "text": "Datos para parecer más inteligente."},   # la tarjeta _T
    {"kind": "fact", "text": "...", "imgs": ["...", "..."]},
    ... (~5 datos "fact" + 1 "title")
  ],
  "topic_keys": ["<tema corto por dato, p.ej. 'pulpo sangre azul'>", ...]   # para dedup (no lo usa el render)
}
```

`topic_keys` se guarda en la DB para dedup pero no es parte del render; `series_data` lo ignora al
mergear (solo usa pregunta/resumen/segments). La tarjeta `_T` usa `series_data.TITULO_PANTALLA`.

### Encastre con series_data (merge)

Al final de `series_data.py`:

```python
def _load_generados() -> dict:
    """Episodios generados y aprobados (seq > 45), leídos frescos del store de autoscripts."""
    try:
        from autoscripts import db as _adb
        return _adb.approved_parts("faceless")   # {seq: {pregunta, resumen, segments}}
    except Exception:
        return {}

PARTS.update(_load_generados())
```

- Los generados arrancan en **seq > max(hardcodeados)** (46+), así nunca pisan los 45 curados.
- `importlib.reload` (que el runway de Pieza 1 ya usa) re-corre esto → ve los nuevos al instante.
- `daily_post` y el formato quedan idénticos: mismo JSON → `curiosidades.generate` renderiza igual.
- Los 45 hardcodeados NO se tocan.

### Flujo de datos

```
autobuild (gen="script", faceless) -> autoscripts.build("faceless", n)
  -> generate (LLM, 1 episodio)
  -> validar esquema (determinístico, gratis)   [malformado -> rejected]
  -> topics.dedup (descarta datos con tema ya usado)   [<5 datos -> rejected]
  -> judge (LLM fact-check por dato)   [algún dato dudoso -> rejected]
  -> approved -> sqlite -> series_data lo mergea -> daily_post lo postea
```

### Wiring al autobuild

Hoy `autobuild/refillers.refill_script` levanta `NotImplementedError` para los 3 canales de guiones.
Se cambia a un **registry de generadores implementados**:

```python
_SCRIPT_GENERATORS = {"faceless"}   # historia/misterios se suman al implementarse

def refill_script(channel, n):
    if channel not in _SCRIPT_GENERATORS:
        raise NotImplementedError(f"generador de guiones de {channel} pendiente")
    from autoscripts.build import build as _build
    _build(channel, n)              # puede levantar autobuild.errors.QuotaExhausted (Groq 429)
```

`historia`/`misterios` siguen dando `SKIP`. `faceless` entra al loop infinito. faceless hoy tiene
runway ~19 partes (9.5d) < objetivo 28 → el autobuild generará ~9 episodios apenas corra.

### Consistencia con la cuota (Groq)

`generate`/`judge` detectan HTTP 429 de Groq y levantan `autobuild.errors.QuotaExhausted` → el
supervisor lo marca severidad **QUOTA** (misma plomería de la Pieza 1: reanuda cuando la cuota vuelve,
no dispara email).

## Control de calidad (en capas, de lo más barato a lo más caro)

### 1. Chequeo determinístico (gratis, primero)

Valida la forma antes de gastar el juez: esquema correcto (pregunta/resumen/segments), ~5 datos
`fact` + 1 `title`, 2 `imgs` por dato, y **números en palabras** (regex rechaza dígitos sueltos en
`text` — el TTS los lee mal; los 45 existentes lo respetan). Malformado → `rejected`, sin gastar LLM.

### 2. Dedup de temas (`topics.py`)

El generador etiqueta cada dato con un `topic` corto. Set de usados = temas de los 45 hardcodeados
(derivados de sus `imgs`/`resumen`) + `topic_keys` de todos los generados previos. Al prompt se le
pasan temas a evitar; después un **filtro duro** descarta datos con tema ya usado. Episodio con <5
datos tras filtrar → `rejected`. Evita el problema de datos repetidos.

### 3. Juez factual (LLM independiente, estricto)

Segunda pasada, rol **fact-checker adversarial** ("encontrá el dato falso"), contexto fresco
(call separada, no sabe que lo generó él), temperatura 0. Juzga **cada dato**: ¿verificablemente
cierto y no engañoso? Aprueba el episodio **solo si TODOS pasan**; **un dato dudoso → rechaza el
episodio entero**. Sesgo: ante la duda, rechazar. Piloto = un juez; si la calidad lo pide, se puede
subir a votación 2-de-3 después (YAGNI ahora).

### 4. Fail-safe

Solo `approved` entra al merge; `rejected` se loguea con motivo. Nada publica (daily_post intacto).
Si no aprueba nada (juez estricto / temas agotados) → el colchón no crece (dry-stop del autobuild,
logueado, sin email). **Riesgo residual:** un dato falso que pase los dos LLM. Aceptado
explícitamente con el full-infinito; es el motivo por el que faceless (datos simples/verificables)
es el piloto y no historia/misterios.

## Config del autobuild (faceless)

Ajustar la entrada `faceless` en `autobuild/config.py`: `gen="script"` (igual), `yield` ≈ 0.6
(tasa de aprobación del juez, estimada), `max_attempts` ≈ 15, `batch` = 3. Autoajusta con el yield real.

## Testing (TDD, LLM mockeado)

- `generate`: con un cliente LLM falso que devuelve un JSON fijo, produce el dict del esquema.
- Validación de esquema: rechaza malformados (falta `title`, dígitos sueltos, <5 datos).
- `topics.dedup`: filtra datos cuyo tema ya está en el set de usados; <5 restantes → rechazo.
- `judge`: episodio con un dato marcado falso → no aprueba; todos ok → aprueba.
- `build`: end-to-end con generate/judge mockeados → approved entra a la DB con seq>45; rejected no.
- Groq 429 (monkeypatch) → `autobuild.errors.QuotaExhausted`.
- Merge: `series_data` (reload) expone los generados aprobados con seq>45, forma válida para
  `curiosidades.generate` (segments con kinds fact/title).
- Store sqlite real en tmp; sin llamadas LLM reales.

## Fuera de alcance (este spec)

- historia/misterios (specs posteriores, reusan el patrón).
- Votación 2-de-3 del juez (YAGNI; se evalúa si la calidad del juez único falla).
- Generación de imágenes propias (se siguen usando términos de búsqueda Pixabay como hoy).
- Tocar los 45 episodios hardcodeados o `daily_post.py`.
