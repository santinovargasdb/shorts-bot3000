# "What On Earth Is This" — Diseño del canal

**Fecha:** 2026-10-09
**Estado:** aprobado por el usuario (pendiente review del spec escrito)

## Goal

Nuevo canal de Shorts **en inglés**, estilo meme "what kind of fruit is this": cada video es un montaje de ~6 ítems sorprendentes (lugares, animales, objetos raros) donde una voz incrédula pregunta "what is this?!" y otra voz los nombra, con el nombre en un cartel en pantalla. Se enchufa al motor multi-canal existente sin tocar los 4 canales actuales. Lanza en **TikTok + Instagram**, 2 posteos/día (YouTube se suma después, vía 2º proyecto de Google Cloud).

## Tech Stack

- Python 3.12, SQLite, pytest (TDD).
- Groq LLM (SDK OpenAI-compatible, modelo `openai/gpt-oss-120b`) para generar temas — gratis.
- Clips de stock/CC vía APIs REST: **Pixabay** (key ya existe), **Wikimedia Commons** (sin key), **Pexels** (opcional, key free del usuario).
- **TikTok TTS** vía proxy público gratis (sin login/key) para las voces del meme.
- FFmpeg (montaje + framing + concat), PIL (cartel del nombre).
- Uploaders existentes de Instagram + TikTok.

## Global Constraints

- **Presupuesto $0**: solo free tiers. Si una fuente de clips requiere key y no está, se saltea esa fuente (no rompe).
- **Idioma del contenido: inglés** (voz y textos). Motivo: la voz del meme solo "funciona" en su idioma nativo; el formato es casi todo visual.
- **Repo público**: todo secreto va en `.env` / `secrets/` (gitignored). Escanear antes de cada push.
- **Legalidad del sourcing (híbrido)**: el pipeline automático usa SOLO clips legales (stock Pixabay/Pexels + Creative Commons/dominio público Wikimedia), con atribución. El "rip puntual" de clips ajenos queda como herramienta **manual aparte, solo TikTok/IG**, fuera del pipeline automático y fuera de este spec.
- Plataformas iniciales: `("ig", "tt")`. YouTube se agrega luego (no en este spec).
- Trailer de commits: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Windows; no romper los 4 canales existentes (faceless/historia/misterios/soyelmalo).

## Identidad del canal

- Nombre: **What On Earth Is This**. Handle objetivo: `@whatonearthisthis` (o variante disponible al crear cuentas).
- Secrets por canal en `secrets/whatonearth/` (instagram.json, tiktok_token.json). Se crean al hacer OAuth (fuera de este spec; igual que soyelmalo).

## Formato del video (lo aprobado en los prototipos)

- Vertical 1080×1920, ~30 s, **N=6 ítems** por video (configurable).
- Por ítem, en orden:
  1. **Clip de fondo**: el ítem se ve **entero** (`scale ... force_original_aspect_ratio=decrease`) sobre una copia del mismo clip **ampliada+recortada y desenfocada** que llena el 9:16 (`increase,crop=1080:1920,boxblur=26:1,eq=brightness=-0.06`). Nada cortado.
  2. **Voz pregunta** (incrédula) suena desde t=0.
  3. **Voz respuesta** (nombra el ítem) suena tras ~0.3 s de silencio.
  4. **Cartel del nombre**: pill blanca (alpha ~240) con borde naranja (#FFC400, 6px), texto Segoe UI Semibold 80px gris oscuro, centrado horizontal, a `y=1500`. Aparece cuando arranca la respuesta (`enable='gte(t, qdur)'`).
- Los 6 segmentos se concatenan. CRF 21, 30 fps, aac.
- El nombre en cartel es el backstop de comprensión (aunque la voz tenga acento, se lee).

## Voces (resuelto, gratis)

- **Pregunta**: TikTok TTS `en_us_006` (male "Serious").
- **Respuesta**: TikTok TTS `en_us_001` ("Jessie", aguda).
- Generación vía proxy público: `POST https://tiktok-tts.weilnet.workers.dev/api/generation` con `{text, voice}` → JSON `{data: <base64 mp3>}`; **fallback** `POST https://gesserit.co/api/tiktok-tts` → `{base64: ...}`. Si ambos fallan para una frase, el ítem se descarta y se repone.

## Pipeline de contenido (construye el backlog)

Módulo `whatonearth/` con tres piezas + un store:

### a) `whatonearth/topics.py` — generación de temas (Groq)
- Prompt pide un lote de ítems candidatos sorprendentes, variados por categoría (**places** = columna vertebral, **animals** curados, **objects** raros), evitando repetir lo ya usado.
- Devuelve lista de `{name, category, query, question_en, answer_en}`:
  - `query`: término de búsqueda en inglés para stock (ej. "pangolin", "salar de uyuni").
  - `question_en`: pregunta incrédula (ej. "Hold on, what kind of animal is this?").
  - `answer_en`: respuesta que nombra (ej. "This is a pangolin.").
- Salida validada contra schema (reintenta si el modelo no cumple). Backoff ante rate-limit (8000 tok/min free).

### b) `whatonearth/sourcing.py` — clip legal por ítem
- Función `find_clip(query) -> ClipResult | None` que prueba fuentes **en orden**: Pixabay → Pexels (si hay key) → Wikimedia Commons.
- Cada fuente: busca, rankea candidatos por **(relevancia de tags/título con el query, duración razonable 3–40 s, resolución)**, elige el mejor **con alto ≥ 1080p y relevancia > 0**.
- `ClipResult`: `{local_path, source, author, license, source_url}` (atribución para la descripción).
- Si ninguna fuente da clip relevante HD → devuelve `None` (el ítem se descarta).
- Fuente faltante de key (Pexels) → se saltea sin romper. Lanzamiento con Pixabay + Wikimedia.

### c) `whatonearth/build.py` — arma un video y lo deja en backlog
- Pide temas al LLM, pasa cada uno por `find_clip`, **acumula hasta juntar N=6 ítems con clip** (repone con más temas si algunos se caen; tope de reintentos para no colgarse — si no junta N, loggea y aborta ese build sin postear).
- Llama a `render_whatonearth.render(items) -> video_path`.
- Genera `title` (hook en inglés) y `description` (resumen + **atribuciones de los clips CC** + hashtags + disclaimer de cortesía "If a clip is yours, DM for credit/removal").
- Inserta en el store con `seq` estable (append-only, como el pipeline de Reddit).

### Store: `whatonearth/videos.sqlite`
- Tabla `videos(seq INTEGER PK, title, description, video_path, items_json, created_utc)`.
- `seq` monótono: el contador `next_part` de daily_post nunca re-apunta a otro video.

## Renderer: `render_whatonearth.py`
- `render(items, out_path)`: por ítem genera voces (TikTok TTS), arma el segmento con el filter_complex del formato, concatena los N, devuelve el mp4.
- `name_card(name) -> PNG` con el estilo del cartel.
- Reusa los parámetros exactos de los prototipos aprobados.

## Integración con el motor existente

### `series_whatonearth.py` (interfaz `series`)
- `PARTS: dict[int, dict]` cargado desde `videos.sqlite`; cada part (seq) = `{titulo, video_path, descripcion, ...}`.
- `title_for(part)`, `descripcion(parte, resumen)`, `KEYWORDS`.
- Expone el video **ya renderizado** (no renderiza en tiempo de post).

### Hook en `daily_post.py`
- En `_ensure_video`: si el módulo `series` define un atributo de "video pre-renderizado" (ej. `video_path_for(part)`), daily_post **usa ese archivo** en vez de llamar a `curiosidades.generate`. Si no, comportamiento actual intacto.
- Los 4 canales existentes no definen ese atributo → cero cambios de comportamiento para ellos.

### `channels_registry.py`
- Entrada `whatonearth`: `display="What On Earth Is This"`, `series="series_whatonearth"`, `platforms=("ig","tt")`, `ig_creds="secrets/whatonearth/instagram.json"`, `tt_token="secrets/whatonearth/tiktok_token.json"`, `first_comment` en inglés.

## Manejo de errores
- Ítem sin clip legal → descartar y reponer con otro tema (log).
- No se junta N ítems tras K reintentos → abortar ese build (no postear video incompleto).
- Proxy TTS falla en los 2 endpoints → descartar ítem y reponer.
- Groq rate-limit → backoff exponencial.
- Fuente de clips con key ausente → saltear fuente.

## Testing (TDD)
- `topics`: parseo/validación de schema del lote del LLM (con payload mockeado).
- `sourcing`: ranking y filtro (relevancia + resolución) con respuestas de API mockeadas; que descarte no-relevantes y sin-HD; atribución poblada.
- `build`: lógica de "juntar N reponiendo caídos" y seq monótono (con `find_clip`/render mockeados).
- `descripcion`/atribución: formato (resumen 1º, atribuciones CC, hashtags, disclaimer).
- `daily_post` hook: usa video pre-renderizado cuando el series lo expone; cae al default cuando no.
- `channels_registry`: entrada válida y cargable.
- Render: validación a nivel integración (1 ítem → mp4 con duración > 0), no unit del filter_complex.

## Fuera de alcance (este spec)
- YouTube (y el 2º proyecto de Google Cloud) — se suma luego.
- Herramienta manual de "rip puntual" TT/IG.
- Canal 2 "dramas de frutas con IA" (parkeado: requiere video-gen de pago).
- Creación de cuentas/OAuth (operativo, igual que soyelmalo).
