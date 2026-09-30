# Efectos de sonido

`pop.wav` suena cada vez que aparece una imagen (formato curiosidades).
Podés reemplazarlo por otro `.wav`/`.mp3` (whoosh, ding, etc.) y ajustar el
volumen en `src/curiosidades.py` (filtro `[pop] volume=0.7`).

Regenerar el pop por defecto:
```bash
ffmpeg -y -f lavfi -i "aevalsrc='0.8*sin(2*PI*820*t)*exp(-t*22)':d=0.25:s=44100:c=stereo" \
  -c:a pcm_s16le sfx/pop.wav
```
