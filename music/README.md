# Música por nicho (fórmula §5)

El motor soporta **carpeta por canal**: si `music` en `channels_registry.py` apunta a
una carpeta, `_resolve_music` elige una pista de ahí y `curiosidades.generate` **rota
por episodio** (índice determinístico por slug). YA CABLEADO (2026-10-05): faceless→
`music/lofi`, historia→`music/cinematic`, misterios→`music/dark_ambient`, con pistas
de Mixkit (licencia free, sin atribución). Para sumar/cambiar pistas:

1. Bajá 2-3 pistas CC por carpeta (SIN cadencia final — el loop no debe "terminar"):
   - `music/lofi/` → **datos/curiosidades**: lo-fi / chill (el phonk "duro" no pega
     con datos educativos). Pixabay Music ("lofi beat", "chill") o Mixkit.
   - `music/dark_ambient/` → **misterios**: drones graves, piano minimalista.
     Pixabay ("dark ambient", "suspense"), Fesliyan ("mysterious"), YT Audio Library
     (Cinematic > Dark). Referencia del género: Øneheart "Snowfall".
   - `music/cinematic/` → **historia**: cinematic suave. Pixabay ("cinematic
     emotional"), YT Audio Library (Cinematic).
2. Por CADA pista agregá su crédito SOLO si la licencia lo pide (CC-BY):
   `music/<carpeta>/<nombre>.credit.txt` al lado del archivo (`_music_credit` lo
   busca ahí y en la raíz). Mixkit/Pixabay Content License NO exigen atribución →
   sin `.credit.txt` la pista sale sin crédito (no hereda el CREDITS.txt global);
   CC-BY sí lo exige.
3. Apuntá el canal a la carpeta en `channels_registry.py`, ej.:
   `"music": "music/dark_ambient"` — y listo, sin tocar más código.

> Los tracks comerciales trending (Memory Reboot, Snowfall, After Dark, Experience)
> NUNCA van acá: se agregan desde la app de IG/TikTok a volumen bajo sobre el video
> ya publicado con música CC (ver docs/formula-faceless-viral.md §5).
