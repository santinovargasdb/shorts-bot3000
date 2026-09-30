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

**Zona gris (se usa mucho, riesgo bajo-medio):**
- Gameplay de Subway Surfers / Minecraft / GTA: son juegos con copyright y esos
  clips suelen estar rippeados de otros creadores. Buscá packs "no copyright
  gameplay" / "copyright free parkour" si vas por esta vía.

> Los archivos de video de esta carpeta están en `.gitignore` (no se suben al repo).
