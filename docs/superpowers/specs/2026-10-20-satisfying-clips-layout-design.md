# Diseño: videos satisfactorios en los clips de streamers

**Fecha:** 2026-10-20 · **Autor:** usuario + Claude · **Tier:** riesgoso (streamers A/B/C)

## Objetivo

Reemplazar en los clips de streamers:
1. El **espejo** (en clips SIN gameplay, el panel del medio duplica la cara → se ve redundante).
2. La **banda negra de abajo** (desperdiciada) en los clips CON gameplay.

…por **videos satisfactorios horizontales** (slime, vidrios rompiéndose, cortes satisfactorios)
que rotan de un pool, para subir el engagement/retención. Aplica a los **3 canales** (A Hispanos,
B Argentina, C IRL). El zoom-punch + whoosh ya se sacaron (commit `1fe64b3`).

## Contexto actual

`src/edit.py:render_short` tiene dos ramas:
- `layout=="gaming" and face_box` → 2 paneles: cara arriba (620) / gameplay medio (608) / **negro abajo** (~684).
  Hace `split=3` del MISMO clip, por eso en clips sin gameplay real el medio duplica la cara (= "espejo").
- else → facecam-only (crop 9:16) o blur.

La detección gameplay-vs-no es por tamaño de cara (`gaming_face_frac 0.18`) y **falla** (ej. Clips
Argentina #1, sin gameplay, salió con espejo). Los clips son pre-renderizados; el backlog vive en
`streamers/backlog_{a,b,c}.sqlite` (columnas: seq, title, description, video_path, streamer, clip_id,
views, status, qc_note, created_utc).

## Diseño

### Dos layouts, elegidos por `has_gameplay`

**CON gameplay** (se mantiene el formato aprobado, solo cambia el fondo de abajo):
```
cara del streamer   y=0     h=620
gameplay            y=628   h=608
SATISFACTORIO       y=1236  h=684   ← reemplaza el negro (1 video, abajo)
```

**SIN gameplay** (3 franjas parejas, reemplaza el espejo):
```
SATISFACTORIO A     y=0     h=640
clip del streamer   y=640   h=640
SATISFACTORIO B     y=1280  h=640   ← distinto del de arriba
```

Los satisfactorios se escalan a 1080 de ancho con `force_original_aspect_ratio=increase` + crop a la
altura de su franja (llenan sin barras). El clip del medio (SIN gameplay) idem (crop leve de 16:9 a 640).
Audio de los satisfactorios **MUTEADO**; se conserva el audio del clip (diálogo) + la música del canal.
Si el satisfactorio es más corto que el clip, loopea (`stream_loop`/`loop`). Subtítulos (karaoke) quedan
sobre el contenido principal (gameplay/clip del medio); se ajusta `margin_v` por layout si hace falta.

### Pool de satisfactorios

- **~30 clips horizontales** en `streamers/satisfying/` (gitignoreado, media). Nombres `sat_0001.mp4`…
- Fuente: prioridad **stock libre** (Pixabay/Pexels video API — ya hay `PIXABAY_API_KEY`: slime,
  satisfying, oddly satisfying), y **yt-dlp** para lo que falte (vidrios rompiéndose "no copyright").
  Cada clip queda como segmento 1080p de ~20-40s. Riesgo copyright: menor con stock; los de yt-dlp
  suman algo de riesgo pero es el tier riesgoso.
- **Rotación con estado** (`streamers/satisfying_state.json`, por canal):
  - Arriba ≠ abajo dentro del mismo video.
  - Un satisfactorio no se repite respecto al video ANTERIOR del mismo canal (ni top ni bottom).

### Detección de gameplay

- `streamers/verify.py` (QC con visión Gemini, que ya mira cada clip) devuelve además
  `has_gameplay: bool`. Para clips nuevos es gratis (el QC ya corre). Nueva función
  `classify_gameplay(video_path) -> bool` para re-clasificar clips ya renderizados (re-render del backlog).
- `streamers/db.py`: columna nueva `has_gameplay INTEGER` (migración idempotente, default NULL/0).
  Se setea al aprobar (en `build`) y en el re-render.

### Re-render del colchón (~24 aprobados)

Script `streamers/rerender.py` (función `rerender_approved(channel)`):
por cada clip `approved`: re-descarga la fuente por `clip_id`+`streamer` (reusa `streamers/sourcing`),
`classify_gameplay`, elige satisfactorios (rotación), re-renderiza con el layout nuevo, **pisa** el
`video_path` y guarda `has_gameplay`. No re-QC de aprobación (ya están aprobados). Loguea los que fallen
(clip caído, etc.) sin abortar. CLI: `python -m streamers.rerender streamers_a`.

## Componentes (aislados)

| Módulo | Responsabilidad | Interfaz |
|--------|-----------------|----------|
| `streamers/satisfying.py` | Pool + rotación | `pick_for(channel, n) -> list[Path]` (n distintos, no repiten vs video anterior del canal); `source_pool(target=30)` (baja/arma el pool) |
| `streamers/verify.py` | +gameplay | `classify_gameplay(video) -> bool`; `verify_*` devuelven `has_gameplay` |
| `streamers/db.py` | +columna | migración `has_gameplay`; `set_gameplay(conn, seq, bool)` |
| `src/edit.py` | 2 layouts nuevos | `render_short(..., satisfy_top=None, satisfy_bottom=None)` + rama por `has_gameplay`/`face_box` |
| `src/pipeline.py` | elegir + pasar satisfactorios | pasa `satisfy_top/bottom` y `has_gameplay` a `render_short` |
| `streamers/rerender.py` | re-render del backlog | `rerender_approved(channel)` + CLI |

## Testing

- `satisfying.pick_for`: rotación (no repite vs estado anterior; top≠bottom) con pool y estado fake.
- `db`: la migración agrega `has_gameplay` y es idempotente; `set_gameplay` persiste.
- `verify.classify_gameplay`: parseo del campo `has_gameplay` de la respuesta Gemini (mock).
- `edit.render_short`: el filtergraph incluye los inputs de satisfactorio y el overlay en la franja
  correcta según el caso (verificación del grafo, no del pixel). Validación visual final por frames.
- No romper los otros canales (faceless/historia/etc. no tocan `render_short` con satisfactorios).

## Fuera de alcance / riesgos

- No se toca whatonearth ni el tier seguro.
- Copyright de los satisfactorios de yt-dlp (riesgo asumido en el tier riesgoso; se prioriza stock libre).
- Cuota Gemini del re-render (~24 clasificaciones; baratas, pero cuentan).
- Si un clip del backlog ya no está disponible para re-descarga, ese queda sin re-renderizar (se loguea).
