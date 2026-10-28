# 🎬 Motor de Shorts automáticos — 100% gratis / local

Motor casero que arma **Shorts verticales (9:16) con subtítulos** y los publica
solo en **YouTube e Instagram**. Un solo motor de render sirve a varios canales
configurables, cada uno con su propio estilo y agenda.

Stack **100% gratis y local**: `FFmpeg` para el render, `faster-whisper` para el
timing de los subtítulos, `edge-tts` para la voz y las **APIs oficiales** de las
plataformas para publicar. Sin servicios pagos por video.

> Usá siempre contenido propio o sobre el que tengas los derechos correspondientes.

---

## 🚀 Instalación

Requiere Python, FFmpeg y git ya instalados. Después:

```bash
pip install -r requirements.txt
```

## 🧩 Cómo está organizado

- `channels_registry.py` — registro de canales: cada canal declara su estilo, su
  generador de contenido, su música y en qué plataformas publica.
- `config/channels.yaml` — perfiles del motor de render por canal (reencuadre,
  subtítulos, tipografía, posición).
- `src/` — motor de render: pasa a 9:16, arma los subtítulos karaoke y quema todo.
- `autobuild/` — rellena solo el backlog de cada canal hasta un objetivo fijo.
- `daily_post.py` — publica la siguiente pieza de cada plataforma y lleva el estado.
- `uploaders/` — subida a YouTube e Instagram vía API oficial.
- `secrets/`, `input/`, `output/` — credenciales y archivos (ignorados por git).

## 🎥 Uso

```bash
# Publicar la siguiente pieza de un canal
python daily_post.py --channel <canal>

# Rellenar el backlog (todos los canales, o uno con --channel <canal>)
python -m autobuild.supervisor --force
```

Cada pieza se arma con su `.json` de metadatos (título, descripción y hashtags)
y sale lista para publicar.

## ⚙️ Configuración

Cada canal se ajusta **sin tocar código**: en `channels_registry.py` (plataformas,
estilo, música) y en `config/channels.yaml` (reencuadre, subtítulos, modelo de
transcripción). Agregar un canal nuevo es sumar una entrada ahí.

## 📅 Automatización

Corre solo con el **Programador de tareas de Windows**: una tarea por canal dispara
el posteo en horarios fijos y otra corre el auto-refill del backlog. Un healthcheck
diario avisa por mail si un canal deja de publicar.

## ✅ Estado

Motor funcionando de punta a punta: armado de piezas, render 9:16 con subtítulos y
publicación programada. La única parte manual es crear las cuentas y hacer el OAuth
una vez por canal.
