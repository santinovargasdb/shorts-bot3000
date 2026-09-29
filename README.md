# 🎬 Motor de Shorts automáticos (YouTube + Instagram) — 100% gratis / local

Convierte un video fuente en varios **Shorts verticales (9:16) con subtítulos
karaoke** listos para publicar. Un solo motor, **3 canales** configurables.

Stack 100% gratis y local: `yt-dlp` + `faster-whisper` (subtítulos IA) + `FFmpeg`
+ APIs oficiales de YouTube/Instagram. Sin SaaS de pago por video.

---

## ⚠️ Antes de nada: lo legal (esto decide si el canal sobrevive)

Resubir clips **crudos** de streamers/series/películas hace que YouTube:
- te **quite los ingresos** (Content ID reclama el video), o
- te dé **strikes** (3 en 90 días = canal terminado), o
- te **suspenda la monetización del canal entero** (política de "contenido reutilizado").

YouTube **sí permite monetizar** clips/reacciones/compilaciones **si el espectador
nota una diferencia clara** con el original (edición, subtítulos, comentario, contexto).
Ese es exactamente el valor que agrega este motor (reencuadre + subtítulos + gancho).

**Regla práctica por canal:**
| Canal | Fuente | Riesgo |
|---|---|---|
| `streamers` | Streamers con permiso / que permiten clips | Bajo ✅ |
| `peliculas_series` | Cine/TV | **Alto** — solo con edición muy transformadora ⚠️ |
| `faceless` | Contenido propio (guion + voz + stock) | Nulo ✅ |

---

## 🚀 Instalación

Ya tenés Python, FFmpeg, yt-dlp y git. Solo faltan las libs de Python:
```bash
pip install -r requirements.txt
```

## 🎥 Uso

```bash
# Ver los canales configurados
python run.py --list

# Generar shorts desde un archivo local
python run.py --channel streamers --file "input/mi_video.mp4"

# Generar descargando la fuente primero (usá contenido con permiso/derecho)
python run.py --channel streamers --url "https://..."

# Forzar idioma español y mejor modelo de subtítulos (más lento, más preciso)
python run.py --channel streamers --file "input/mi_video.mp4" --model small
```

Los shorts salen en `output/<canal>/`, cada uno con un `.json` de metadatos
(título, descripción y hashtags borrador) generado desde la transcripción.

### Canal FACELESS (contenido original, sin clipar nada ajeno)

Genera un short desde un guion de texto: **voz IA (edge-tts) + fondo animado +
subtítulos karaoke**. Cero costo, cero riesgo de copyright.

```bash
python faceless_run.py --file guiones/pulpos.txt --title "El pulpo tiene 3 corazones"
python faceless_run.py --text "Tu dato corto..." --title "Mi título" --palette 2
```
Voces disponibles en español: `python -m src.tts`. Se elige en `config/channels.yaml`
(`tts_voice`). Guiones en la carpeta `guiones/`.

## ⬆️ Publicar

```bash
# YouTube (privado por defecto; ver setup_youtube_auth.md)
python -m uploaders.youtube_upload "output/streamers/mi_video_clip01.mp4" public

# Instagram Reels (necesita URL pública; ver setup_instagram_auth.md)
python -m uploaders.instagram_upload "https://tu-host.com/clip01.mp4" "caption #shorts"
```

---

## 🎛️ Configuración (`config/channels.yaml`)

Cada canal define su estilo sin tocar código:
- `crop_mode`: `crop` (rellena, recorta laterales — ideal gameplay) o `blur`
  (encaja con fondo borroso — ideal cine 16:9).
- `clips_per_source`: cuántos shorts sacar de cada fuente.
- `caption`: fuente, tamaño, colores del subtítulo karaoke, posición.
- `hook_text`: texto fijo arriba (gancho), ej. `"😱 ESPERÁ AL FINAL"`.
- `whisper_model`: `tiny`/`base`/`small`/`medium` (calidad vs velocidad de subtítulos).

## 🧠 Cómo funciona (`src/`)

1. `highlights.py` — detecta los momentos más intensos por **energía de audio**
   (picos = risas/gritos/reacciones). Gratis, sin IA.
2. `transcribe.py` — **faster-whisper** local saca palabras con tiempos.
3. `subtitles.py` — genera subtítulos `.ass` estilo karaoke (palabra resaltada).
4. `edit.py` — **FFmpeg**: recorta, pasa a 9:16 y quema los subtítulos.
5. `pipeline.py` — orquesta todo y escribe metadatos por clip.

## 📅 Automatización total (siguiente nivel)

Para que corra solo a diario, programá `run.py` + los uploaders con el
**Programador de tareas de Windows** (o un `.bat` diario). Recomendado:
mantené un **paso de aprobación manual** antes de publicar para evitar strikes.

## 📁 Estructura

```
config/channels.yaml     # perfiles de los 3 canales
run.py                   # CLI principal
src/                     # motor (highlights, transcribe, subtitles, edit, pipeline)
uploaders/               # youtube_upload.py, instagram_upload.py
input/  output/          # fuentes y shorts (ignorados por git)
secrets/                 # credenciales OAuth (ignorado por git)
setup_youtube_auth.md    # cómo activar la subida a YouTube
setup_instagram_auth.md  # cómo activar la subida a Instagram
```

## ✅ Estado

Motor verificado funcionando: recorte 9:16, transcripción local y subtítulos
karaoke quemados. Falta solo tu parte manual: crear las cuentas y hacer el
OAuth una vez (guías incluidas).
