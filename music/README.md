# Música por nicho (fórmula §5)

El motor soporta **carpeta por canal**: si `music` en `channels_registry.py` apunta a
una carpeta, `_resolve_music` elige una pista de ahí. Para migrar del Kevin MacLeod
único ("suena a documental 2015") a música por nicho:

1. Bajá 2-3 pistas CC por carpeta (SIN cadencia final — el loop no debe "terminar"):
   - `music/phonk/` → **datos/curiosidades**: phonk suave / lo-fi. Pixabay Music
     (buscar "phonk", "lofi beat") o YouTube Audio Library (Hip-Hop).
   - `music/dark_ambient/` → **misterios**: drones graves, piano minimalista.
     Pixabay ("dark ambient", "suspense"), Fesliyan ("mysterious"), YT Audio Library
     (Cinematic > Dark). Referencia del género: Øneheart "Snowfall".
   - `music/cinematic/` → **historia**: cinematic suave. Pixabay ("cinematic
     emotional"), YT Audio Library (Cinematic).
2. Por CADA pista agregá su crédito si la licencia lo pide (CC-BY):
   `music/<carpeta>/<nombre>.credit.txt` (mismo formato que los existentes).
   Pixabay Content License no exige atribución; CC-BY sí.
3. Apuntá el canal a la carpeta en `channels_registry.py`, ej.:
   `"music": "music/dark_ambient"` — y listo, sin tocar más código.

> Los tracks comerciales trending (Memory Reboot, Snowfall, After Dark, Experience)
> NUNCA van acá: se agregan desde la app de IG/TikTok a volumen bajo sobre el video
> ya publicado con música CC (ver docs/formula-faceless-viral.md §5).
