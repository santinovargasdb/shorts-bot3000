# Fondos de video (gameplay / slime / satisfactorios)

Dejá acá tus videos de fondo (`.mp4`, `.mov`, `.webm`). El generador faceless los
usa en loop, recortados a 9:16 y oscurecidos para que se lean los subtítulos.

Uso:
```bash
# Fondo específico:
python faceless_run.py --file guiones/pulpos.txt --title "..." --bg backgrounds/minecraft.mp4
# O dejá varios acá y el generador elige uno (por índice de paleta):
python faceless_run.py --file guiones/pulpos.txt --title "..."
```

## ⚖️ De dónde sacar fondos (importante)

**Limpio y gratis (recomendado)** — libre para uso comercial, sin atribución:
- **Pexels Videos** — https://www.pexels.com/videos/ (buscá "satisfying", "slime", "abstract")
- **Pixabay** — https://pixabay.com/videos/
- **Mixkit** — https://mixkit.co/free-stock-video/
- **Videezy / Coverr** — clips gratis

**Gameplay (Minecraft = el más seguro; Subway = zona gris, bajo riesgo):**
- Buscá packs **"no copyright gameplay"** en YouTube y bajalos con yt-dlp.
  El cliente `android` evita el throttling de YouTube:
```bash
yt-dlp --extractor-args "youtube:player_client=android" -f "bv*[height<=720]/w" \
  --download-sections "*30-120" -o "backgrounds/minecraft_parkour.%(ext)s" "URL"
```
  (No hace falta audio del gameplay: el motor usa la narración + música.)

> Los archivos de video de esta carpeta están en `.gitignore` (no se suben al repo).
