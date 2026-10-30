# Grounding de autoscripts (historia/misterios) con Wikipedia

## Contexto / problema

`historia` y `misterios` generan **relatos de hechos/casos REALES** con un LLM gratis (Groq,
`gpt-oss-120b`). Sin fuentes, el modelo **alucina datos específicos** (fechas, nombres, cifras,
eventos) y el juez factual —estricto, y bien— los rechaza. Yield medido el 30-oct-2026:
**historia 0/10, misterios 0/10**, con presupuesto de tokens disponible (vía la rotación de claves
Groq, commit `b90be1f`). O sea: la rotación resolvió el cuello de **tokens**, pero NO el de **yield**.

Los backlogs curados (partes hardcodeadas en `series_historia`/`series_misterios`) se van agotando y
el auto-refill no las repone. Dos tweaks de prompt (documentables, no-arrancar-con-fecha) ya se
confirmaron insuficientes. El fix de fondo es **grounding**: traer los hechos reales ANTES de generar.

## Objetivo

Subir el yield de generación de historia/misterios dándole al LLM los **hechos reales del caso
(de Wikipedia)** para que no invente, y **verificando el relato contra esa misma fuente**.

## Diseño

### Flujo (por intento, dentro de `_build_narrative`)

1. **`propose_subject`** (LLM, llamada corta): propone un sujeto del canal (historia = hecho/persona
   histórica real; misterios = desaparición/enigma real), evitando los ya usados.
2. **`fetch_summary`** (Wikipedia): resumen (intro) del artículo en **español**; si no existe, cae a
   **inglés**. **Sin artículo → se descarta el sujeto y se prueba otro** (nunca genera sin fuente).
3. **`generate_story` grounded** (LLM): escribe el relato (mismo formato de salida de ahora) con la
   regla dura *"usá SOLO lo que dice la fuente; no agregues ninguna fecha/cifra/nombre/evento que no
   esté en ella"*.
4. **`validate_story`** (existente): estructura, sin dígitos, arranque in-medias-res, largo, sin CTA.
5. **`judge_story(story, source)`** (LLM, grounded): el juez factual recibe el **mismo resumen** y
   verifica el relato **contra la fuente**, no contra su propia memoria → más consistente.
6. Aprobado → `db.add_episode(status="approved")`; rechazado → `rejected` con `qc_note`.

### Componentes

- **`src/wiki_facts.py`** (nuevo, chico): `fetch_summary(subject: str, lang="es", max_chars=2000)
  -> str | None`. API `action=query&prop=extracts&exintro=1&explaintext=1&generator=search&
  gsrsearch=<subject>&gsrlimit=1&redirects=1` en es.wikipedia, fallback en.wikipedia. Reusa el
  User-Agent, el pacing anti-429 (`_wiki_pace`), los reintentos y el cache de `src/stock.py`.
  Devuelve el texto plano del intro (capeado a `max_chars`) o `None`.
- **`autoscripts/narrativa.py`**:
  - `_PROMPT_SUBJECT` + `propose_subject(client, model, channel, avoid_subjects) -> str`: devuelve
    SOLO el nombre del sujeto.
  - `_PROMPT` gana un bloque `{source}` + la regla "usá solo la fuente".
  - `generate_story(...)` orquesta: `propose_subject` → `fetch_summary` → (si hay fuente) prompt
    grounded → `parse_story` → `validate_story` → devuelve `(story, source)`. Sin fuente tras unos
    pocos sujetos → `raise` (el loop de build lo cuenta como intento fallido).
- **`autoscripts/judge.py`**: `judge_story(client, model, story, instr, source="")` mete la fuente
  en `_PROMPT_STORY`.
- **`autoscripts/build.py`** (`_build_narrative`): `st, source = narrativa.generate_story(...)`;
  `verdict = judge.judge_story(client, model, st, judge_instr, source=source)`.

### Manejo de errores

- Sin artículo de Wikipedia → se descarta el sujeto; `propose_subject`/`generate_story` prueba unos
  pocos antes de rendirse. **Nunca genera sin fuente.**
- Fetch 429/red → reintentos (como `stock.py`); si falla del todo → se trata como sin-fuente.
- JSON malo del LLM → `parse_story` levanta `ValueError` → el loop de build ya lo cuenta como
  intento fallido.

### Alcance

- **historia y misterios** (mismo flujo; `INSTR`/`JUDGE_INSTR` ya son por canal).
- **faceless NO** (otro generador, de datos sueltos; su yield es aceptable). Se podría groundear
  después si hace falta.
- **No cambia:** `series_*`, el posteo, el render, las reglas de estructura de `validate_story`, ni
  el few-shot (que sigue usándose para el ESTILO; los HECHOS ahora vienen de Wikipedia).

### Tests

- `tests/test_wiki_facts.py`: `fetch_summary` con `requests` mockeado (es OK / es vacío → en /
  ninguno → None; capea a `max_chars`).
- `tests/test_autoscripts_grounding.py`: `propose_subject` parsea el sujeto (mock `_chat`);
  `generate_story` llama a `fetch_summary` y mete la fuente en el prompt del relato; sin fuente →
  raise/skip; `judge_story` mete la fuente en su prompt.
- Yield: **empírico** — `python -m autoscripts.build misterios 10` / `historia 10` después.

## Verificación end-to-end

1. Tests unitarios en verde.
2. `python -m autoscripts.build historia 10` y `misterios 10` → comparar yield contra el **0/10** de
   hoy (esperado: bastante más alto).
3. Revisar 1-2 episodios aprobados a mano (relato fiel a la fuente + cumple la fórmula).
