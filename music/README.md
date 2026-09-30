# Música de fondo (volumen bajo)

Dejá acá tus pistas (`.mp3`, `.m4a`, `.wav`). El generador faceless mezcla una
debajo de la narración a volumen bajo (~12%) para que no quede vacío.

Uso:
```bash
python faceless_run.py --file guiones/venus.txt --title "..." \
  --bg backgrounds/minecraft_parkour.mp4 --music music/lofi_chill.mp3
# O dejá varias acá y se elige una automáticamente.
```

## De dónde sacar música libre de copyright
- **Pixabay Music** — https://pixabay.com/music/ (CC0, sin atribución)
- **YouTube Audio Library** — https://studio.youtube.com (biblioteca gratis)
- **Incompetech** (Kevin MacLeod) — CC-BY (requiere atribución en la descripción)
- Canales "No Copyright Music" (revisá los términos de cada uno)

Bajar audio de un video con yt-dlp (cliente android evita el throttling):
```bash
yt-dlp --extractor-args "youtube:player_client=android" -f "ba/18" \
  -x --audio-format mp3 --download-sections "*60-102" \
  -o "music/mi_track.%(ext)s" "URL_DEL_VIDEO"
```

> Los archivos de audio de esta carpeta están en `.gitignore` (no se suben al repo).
