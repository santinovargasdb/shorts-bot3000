# Pautas para producir un episodio animado (estilo aprobado el 26-nov-2026)

El episodio modelo es **la Torre Eiffel**: `anim3d/eiffel.js` + `anim3d/episodes/eiffel/guion.json`. El usuario lo
aprobó ("perfecto, este me gustó bastante") después de varias rondas de correcciones. Todo lo de abajo sale de esas
correcciones: no son sugerencias, son lo que el usuario pidió. Leé `eiffel.js` entero antes de escribir tu escena.

Referencia visual: el canal **@WeirdLittleFactsydk** (shorts en español de 5-10 M de vistas). Personajes de
caricatura con contorno grueso, fondos con textura, sombras largas, cámara siempre en movimiento.

## Qué NO hacer (cada punto fue una queja concreta del usuario)

- **Nada de cortinillas ni transiciones que tapen la pantalla** ("molestan y son al pedo"). Cambio de lugar = corte directo.
- **Nada de cortes secos dentro del mismo lugar**: ahí se usa el zoom de un tirón (toma sin `cut`) o el viaje (`glide`).
- **Ojos de rayita como ojo normal** ("todos parecen chinos"). La librería ya lo resuelve: el gesto `neutral` usa ojo
  redondo con pupila. Usá `sly`/`angry` (entrecerrado) solo cuando el personaje desconfía, trama o se enoja.
- **Bocas o caras "cortadas" o manchas negras**: no escales ni muevas a mano las piezas de la cara; todo sale de `mood`.
- **Elementos que se pisan** (personaje delante de un objeto que le tapa media cara, un objeto atravesando a otro,
  dos personajes encimados, un cartel tapando una cara). Separá a los personajes al menos 0,6 m y revisalo en los cuadros.
- **Escenas pobres** ("la torre quedó poco detallada"): el objeto clave de la historia tiene que tener detalle
  (como la torre con enrejado, plataformas y bandera). Nada de fondos de un color liso.
- **Cosas quietas**: ningún plano sin movimiento. Personajes duros = mal.
- **Música de Kevin MacLeod**: prohibida en cualquier video.
- **Sonidos fabricados por código** (senos, ruido): prohibidos; armar.py usa grabaciones.
- **Narración en segunda persona** ("vos hacés..."): NO. Tercera persona, con dinamismo.

## Guion (`anim3d/episodes/<ep>/guion.json`)

```json
{
  "canal": "historia" | "misterios" | "faceless",
  "orden": 1,
  "titulo": "título interno corto",
  "resumen": "una línea, en minúsculas, con números en palabras",
  "pregunta": "¿pregunta del cierre?",
  "fuente": "URL1 ; URL2 (leídas el 27-nov-2026)",
  "rate": "+14%",
  "caption": { "margin_v": 250 },
  "musica": "music/explicativo/numbers_temporex_instrumental.mp3",
  "publicar": { "titulo": "Gancho con UNA palabra en MAYÚSCULAS… y remate", "resumen": "2 frases para la descripción, con cifras en dígitos" },
  "frases": ["...", "..."]
}
```

- **Datos reales y verificados.** Cada dato del guion sale de una fuente que LEÍSTE en esta sesión (WebSearch +
  WebFetch; Wikipedia en español o inglés vale, mejor si además hay otra fuente seria). No inventes detalles
  (nombres, cifras, fechas, diálogos). Si algo es leyenda o está discutido, decilo así ("según la leyenda", "nunca se
  supo"). Si no pudiste confirmar un dato, sacalo. NO uses el navegador Playwright (lo comparten varios agentes).
- **Estructura**: primera frase = gancho fuerte que resume lo increíble (ej. "En 1925, un estafador vendió la Torre
  Eiffel. Y no era suya."). Después pasos cortos encadenados con "pero… así que…", cada frase una acción que se
  pueda dibujar. Cierre con remate y la `pregunta`.
- **Tercera persona**, frases cortas, verbos en presente, tono de contar algo increíble a un amigo.
- **Números en palabras** en `frases` (la voz los lee mejor): "mil novecientos once", "veintisiete horas". En carteles
  y en `publicar` van en dígitos.
- **Largo**: historia y misterios 45-58 s (unas 150-180 palabras). En 60 Segundos (`faceless`) 30-42 s (unas 95-130
  palabras), UN solo dato curioso explicado paso a paso, al estilo ZackDFilms.
- Comprobá el largo con `python -m anim3d.narrar <ep>` (dice segundos y palabras/s; apuntá a 3,1-3,5 palabras/s).

## Escena (`anim3d/<ep>.html` + `anim3d/<ep>.js`)

- HTML: copiá `anim3d/plantilla.html` como `<ep>.html` y cambiá `/EPISODIO.js` por `/<ep>.js`. Para misterios podés
  oscurecer la viñeta (`#post`).
- JS: usá `lib/scene.js` (leé su comentario de arriba). Esqueleto:

```js
import * as THREE from 'three';
import { setup, PI, V, lerp, prog, lin, win, back, settle, hop, popIn, go, moodAt, alive, talk, blinkAt, breathe, makeToon, flat, outlined } from '/lib/scene.js';
import { block } from '/lib/toon.js';
import { tex, surface, picture, facade, painting, windowPic, tree, lamp, hills } from '/lib/decor.js';
const k = await setup('<ep>');                       // misterios: setup('<ep>', { sky: [[0,'#1b2140'],[1,'#4a3a6a']], light: { ambient: 1.3, sun: 1.6 } })
const { scene, c, at, END, sfx, tag, BIG } = k;
// decorados lado a lado en x (0, 40, 80, 120...), personajes, objetos
k.shots([...]);
k.run(t => { /* posar todo en el instante t */ });
```

- **Piezas disponibles**
  - `makeToon({ shirt, skin, hair, hat: { type: 'fedora'|'boater'|'bowler'|'top'|'kepi', color, band }, mustache, detail: ['collar','tie','buttons','apron','stripes','badge','belt'], trim })`
    → `.root` (agregar a la escena), `.head`, `.hand(0|1, vec)`, `.headTop(vec)`, `.pose({...})`.
    Pose: `x, y, z, face (giro), walk, phase, stride, squash, lean, crouch, bob, handL/handR (Vector3 del mundo), wL/wR (0..1), look (Vector3), tilt, mood, mood2, mix, blink`.
    Gestos: `neutral, happy, surprised, angry, worried, effort, sly`. Usá `moodAt(t, [[t0,'neutral'],[t1,'surprised']])`.
  - `lib/decor.js`: `tex.bricks|tiles|planks|stripes|grass|cobble(opciones, repX, repY)` + `surface(...)` (recibe
    sombra), `facade`, `painting`, `windowPic`, `picture` (dibujo libre en canvas), `tree`, `lamp`, `hills`.
  - `lib/scene.js` (en `k`): `plane, stroke, poly, sign, glyph + glyphAt, wheel, cloud, tree, birds, walker, puffs, tag, sfx, shots, run, follow`.
  - `block(parent, color, x0,x1, y0,y1, z0,z1)` de `lib/toon.js`: caja con contorno (muebles, edificios, cajas).
  - Animales u objetos que no existan: armalos con esferas/cápsulas/cilindros `flat(color)` + `outlined(...)`, con
    cara simple (dos ojos blancos con pupila), igual de cuidados que los personajes.
- **Cámara (`k.shots`)**: una toma nueva cada 1,5-3 s. Dentro de un lugar: tomas sin `cut` (zoom de un tirón,
  acercando a la acción) y `glide` para seguir a alguien. `cut: true` SOLO al cambiar de decorado. Planos cerrados de
  cara en los momentos de reacción. Los personajes que hablan miran a cámara o a 3/4 (los `look` llevan z ≈ 2,6 hacia
  la cámara); nunca de perfil puro mientras pasa algo importante.
- **Movimiento constante** (lo que más acercó al estilo de referencia):
  - gente de fondo con `k.walker(...)` en los lugares con gente; `k.cloud`, `k.tree`, `k.birds` en exteriores;
  - partículas en los momentos clave: monedas que llueven, destellos (`glyph('✦')`), signos `? ! ✓` sobre cabezas,
    gotas de sudor, líneas de velocidad, polvo (`k.puffs`) al arrancar o caer algo;
  - TODOS los personajes posados con `alive(pose, t, k)`; el que "habla" gesticula con `talk(...)`; reacciones con
    `hop`, `settle` (aplastar y rebotar), cambios de gesto con `moodAt`;
  - los objetos aparecen con `popIn`/`back` (rebote), nunca de golpe.
- **Carteles (`k.tag`)**: grandes y amarillos (`big: true, off: BIG`) para la fecha/lugar del gancho, cifras y remates;
  chicos con flecha (`at: () => vector`) para nombrar personajes y objetos. Uno nuevo cada pocos segundos, sin tapar caras.
- **Subtítulos**: los pone armar.py abajo (`margin_v: 250`). No pongas nada importante en la franja inferior (y > 1600 px).
- **Sonido (`k.sfx(t, nombre, vol)`)**: ya salen solos el soplido de cada toma y el pop de cada cartel. Agregá pocos
  tipos: `riser_to` (sube y TERMINA en el instante) + `boom` en cada revelación; `thud` cuando algo cae o golpea; `tap`
  para clics; literales (`drill, splash, hiss, puff, roll, clang`) solo en 1-3 momentos clave. Nada de pasos repetidos.
  Disponibles: whoosh, pop, tap, clang, boom, riser, riser_to, thud, drill, splash, hiss, puff, roll, step.
- La música y el volumen los pone armar.py (Numbers instrumental, 15 dB bajo la voz, -15 LUFS). No los toques.

## Comandos (PowerShell, desde la raíz `C:\Users\accsoc\Desktop\yt short`; antes `$env:PYTHONIOENCODING='utf-8'`)

1. `python -m anim3d.narrar <ep>` → voz, tiempos y subtítulos en `anim3d/out/<ep>/` (se puede repetir si cambiás frases).
2. `python -m anim3d.render <ep> stills 1 3.5 6 ...` → cuadros sueltos en `anim3d/out/<ep>/hoja.jpg` (máx. 12 tiempos
   por hoja; usá `--cols 6`). Espera su turno si otro episodio está sacando cuadros. MIRÁ la hoja con Read y corregí.
   Si la página tira error, sale en la salida del comando.
3. `python -m anim3d.render <ep> full` → encola el render completo (tarda ~6 s por segundo de video + la espera de
   la cola) y vuelve enseguida. Después `python -m anim3d.render <ep> wait` (bloquea hasta ~9 min; si dice que no
   terminó, correlo de nuevo). Al terminar deja el video en `revision/27-nov/<canal>/`, la medición de ritmo y
   `anim3d/out/<ep>/hoja_final.jpg` (12 cuadros del video final, con subtítulos): miralo.

## Control de calidad antes de dar el episodio por terminado

- Al menos DOS rondas de cuadros (12+ tiempos repartidos por todo el episodio) revisadas y corregidas antes del render.
- Medición del render final: igual o mejor que el Eiffel aprobado (movimiento 9,3, quieto 0 %, cambio cada 3,3 s,
  8 cortes en 53 s; medido el 27-nov) y apuntando a la referencia (movimiento 18, cambio cada 1,9 s, 2 cortes): `movimiento` ≥ 9,
  `quieto_pct` < 1, `cambio_cada_s` ≤ 2,5, `cortes_fuertes` ≤ 8 por minuto. Si no llega, sumá movimiento y volvé a renderizar (máximo 2 renders
  completos por episodio: la cola es compartida).
- En `hoja_final.jpg`: caras visibles y legibles, nada encimado, carteles legibles, el objeto clave con detalle.

## Prohibido

No publicar nada, no commitear, no tocar `daily_post.py`, `automation_state.json`, tareas programadas, `.env`,
`secrets/`, ni los archivos de `anim3d/lib/` (los usan los demás episodios a la vez: si necesitás algo, hacelo dentro
de tu `<ep>.js`). No toques episodios de otros. No uses Playwright.
