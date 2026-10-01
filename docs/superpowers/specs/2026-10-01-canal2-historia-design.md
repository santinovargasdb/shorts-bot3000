# Canal 2 "Historia en 60 Segundos" + refactor multi-canal — Diseño

Fecha: 2026-10-01 · Estado: aprobado por el usuario (diseño conversado en sesión)

## Objetivo

Lanzar el segundo canal de la escala multi-nicho (**Historia en 60 Segundos**,
datos históricos narrados) reutilizando el motor existente, y de paso
generalizar la automatización para que los canales 3 y 4 del roadmap se
enchufen sin duplicar código.

## Decisiones tomadas (con el usuario)

| Tema | Decisión |
|---|---|
| Nombre | **Historia en 60 Segundos** (marca hermana de "En 60 Segundos") |
| Formato | **1 historia narrada por episodio** (~50s): gancho 3-5s → relato continuo ~40s → remate |
| Visual | Look del canal 1: gameplay de fondo rotativo + tarjetas de imágenes arriba (Y=210, 620px) + karaoke |
| Voz | **Masculina grave** (candidatas: es-MX-JorgeNeural / es-ES-AlvaroNeural / es-AR-TomasNeural; el usuario elige por muestras) |
| Música | Pista CC-BY épica/misteriosa distinta a la del canal 1 (2-3 candidatas de Kevin MacLeod; crédito en descripción) |
| Plataformas | **YouTube + Instagram desde el día 1**; TikTok desactivado hasta que aprueben la app |
| Títulos | Título propio por episodio (mejor búsqueda que "pt. N") |
| Arquitectura | **Opción B: registro de canales** (generalizar, no duplicar) |
| Horarios | Canal 1: 11:30/18:30 (sin cambios) · Canal 2: **12:30/19:30** (escalonado) |

## Arquitectura

### 1. `channels_registry.py` (nuevo)

Diccionario `CHANNELS` donde cada canal declara:

- `display`: nombre visible ("Historia en 60 Segundos")
- `series_module`: módulo de guiones (`series_data` | `series_historia`)
- `generator`: función generadora (`curiosidades` | `historia`)
- `out_dir`: carpeta de salida (`output/faceless` | `output/historia`)
- `secrets_dir`: secretos del canal (`secrets` | `secrets/historia`)
- `tts_voice`, `music`, fondos
- `platforms`: plataformas activas (`faceless`: yt+ig+tiktok · `historia`: yt+ig)

El canal 1 (`faceless`) apunta a sus rutas actuales: **cero cambios en lo que
ya corre**. Canales futuros = una entrada más + su módulo de contenido.

### 2. Contenido del canal 2

- **`series_historia.py`**: backlog de historias. Por episodio: `titulo`,
  `gancho`, `relato` (texto continuo con marcas de momento para el cambio de
  imagen), `imagenes` (búsquedas Pixabay por momento, dedup por id),
  `resumen` (para la descripción), keywords propias del canal.
  Primeras 10 historias escritas en la implementación (QA: hermana del usuario).
- **`src/historia.py`**: variante de `src/curiosidades.py` que recibe un relato
  continuo en vez de 5 datos. Reusa: TTS con `_tighten` (recorte de silencios),
  tiempos por Whisper, karaoke que no cruza límites de momento, tarjetas arriba
  con animación + whoosh (vol 0.4, lead 0.12s), gameplay rotativo por episodio
  (~85s por fondo), mezcla de música. Lo nuevo: segmentar el relato en
  "momentos" y mapear cada uno a su(s) imagen(es).

### 3. Estado y secretos por canal

- `automation_state.json` agrupado por canal:
  `{"faceless": {"youtube": {...}, "instagram": {...}, "tiktok": {...}},
    "historia": {"youtube": {...}, "instagram": {...}}}`.
  `_load_state()` migra el formato actual automáticamente en la primera
  corrida (mismo patrón de migración que ya existe).
- Secretos: canal 1 queda en `secrets/` (sin tocar). Canal 2 en
  `secrets/historia/`: `token.json` (YouTube del canal de marca) e
  `instagram.json` (`{user_id, token}` de la cuenta IG nueva). Todo gitignored
  (la regla `secrets/` ya cubre el subdirectorio).

### 4. Automatización

- `daily_post.py --channel <nombre>`; sin argumento = canal 1 (compatibilidad
  con la tarea actual). Logs con prefijo de canal: `[historia][YT] ...`.
- Tarea de Windows nueva **"ShortsBot Daily Historia"** → `run_daily_historia.bat`
  a las 12:30 y 19:30.
- Sincronización IG-no-se-adelanta-a-YT igual que el canal 1, por canal.
- Cuota de YouTube Data API compartida (mismo proyecto Cloud): 4 subidas/día
  ≈ 6.400 de 10.000 unidades diarias — alcanza.

### 5. Cuentas (pasos manuales del usuario)

1. **YouTube**: canal de marca en la misma cuenta Google → OAuth del uploader
   eligiendo el canal de marca → `secrets/historia/token.json` → verificar en
   youtube.com/verify.
2. **Instagram**: cuenta nueva Profesional/Creador (ej. @historia.en60segundos)
   → agregarla a la app de Meta existente (Instagram Login) → token de larga
   duración → `secrets/historia/instagram.json`. La renovación semanal de
   token se replica para esta cuenta.
3. Elegir voz (muestras) y música (candidatas) antes del primer episodio.

### 6. Errores, pruebas y arranque

- Mismo contrato que hoy: fallo de una plataforma → log + no avanza el
  contador + reintento en la próxima corrida; plataformas independientes.
- Secuencia de validación: `--channel historia --dry-run` (genera ep. 1 sin
  publicar) → revisión del usuario y QA → primer upload **privado** en YT →
  OK → activar tarea programada con backlog de 10.
- El canal 1 no cambia su comportamiento en ningún paso; única modificación
  compartida es la reorganización (migrada) del JSON de estado.

## Fuera de alcance

- TikTok del canal 2 (se activa cuando aprueben la app; solo flag en registro).
- Facebook (pendiente declarado aparte en el roadmap).
- Canales 3 y 4 (Reddit, streamers): solo se les deja la puerta (registro).
- Unificar los secretos del canal 1 en `secrets/faceless/` (queda para después;
  hoy prima no tocar lo que funciona).

## Criterio de éxito

`daily_post.py --channel historia` publica el episodio del día en el canal de
YouTube "Historia en 60 Segundos" y en la cuenta IG nueva, con su propio
contador, sin afectar en nada la corrida diaria del canal 1.
