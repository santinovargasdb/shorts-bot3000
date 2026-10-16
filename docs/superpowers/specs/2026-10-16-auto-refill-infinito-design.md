# Auto-refill infinito del backlog — Diseño (Pieza 1)

**Fecha:** 2026-10-16
**Estado:** Aprobado, listo para plan de implementación
**Alcance de este spec:** Pieza 1 (el loop infinito sobre los generadores que YA existen).
La Pieza 2 (generador de guiones LLM para faceless/historia/misterios) va en un spec aparte.

## Problema

Hoy el backlog de cada canal se rellena **a mano**: el usuario corre `build` / `rewrite`
cuando se acuerda y vigila que no se vacíe. Funciona, pero depende de que esté atento.
Se busca que el colchón se recargue solo —"infinito"— sin intervención, con una red de
seguridad que avise cuando algo se trabe.

## Decisiones tomadas (brainstorming 2026-10-16)

1. **Alcance:** todos los canales. Pero "generar episodios" son 3 mecanismos distintos:
   - **Clips** (streamers a/b/c, whatonearth): `build` = yt-dlp + render + QC visión Gemini.
     Fuente infinita (Twitch/YT), QC automático. **Ya existe.**
   - **Reddit** (soyelmalo): `reddit_pipeline rewrite` = Arctic Shift + LLM. **Ya existe.**
   - **Guiones a mano** (faceless, historia, misterios): `PARTS` es un dict Python escrito
     a mano (45/40/40). **No existe generador** → Pieza 2.
2. **QA al sacar al humano:** full-infinito con **juez LLM** (sin cola de aprobación humana).
   Riesgo residual documentado abajo.
3. **Trigger:** umbral → rellenar a un objetivo (default **14 días** de colchón por canal).
   Auto-regulado: ni se vacía ni sobre-produce.
4. **Alertas:** email (Gmail SMTP + app-password), digest **solo ante problemas**.
5. **Arquitectura:** supervisor nocturno standalone (Enfoque A). `daily_post.py` NO se toca.

## Descomposición en 2 piezas

- **Pieza 1 (este spec):** el esqueleto del loop infinito sobre los generadores existentes.
  Deja verdaderamente infinitos a **clips (a/b/c, whatonearth) + soyelmalo** (5 de 8 canales).
- **Pieza 2 (spec futuro):** generador LLM de datos/historias/misterios nuevos, sin repetir
  los existentes, con juez factual y store/adaptador propio. Es el subsistema más riesgoso
  (donde puede colarse un dato falso) y se diseña con foco propio.

En la Pieza 1, faceless/historia/misterios entran al `REFILL` con `gen="script"` apuntando a
un **placeholder** que no genera y reporta "generador pendiente". Así el loop ya los contempla
sin romperse y la Pieza 2 solo tiene que implementar ese generador.

## Arquitectura

Paquete nuevo `autobuild/` (mismo estilo que `streamers/` y `reddit_pipeline/`):

```
autobuild/
  supervisor.py    # el loop: recorre canales, mide runway, rellena al objetivo, junta el reporte
  runway.py        # runway_days(channel): PARTS + next_part -> días de colchón (función pura)
  refillers.py     # registry canal -> refill(channel, n) envolviendo los generadores existentes
  config.py        # tabla REFILL: por canal target_days, posts_per_day, yield, max_attempts, gen
  alert.py         # email vía Gmail SMTP (app-password); se dispara SOLO ante problemas
run_autobuild.bat  # wrapper para el Programador de tareas (03:00)
```

### Responsabilidad única por módulo

- **`runway.py`** — una función pura. Dado un canal, carga su serie vía
  `channels_registry.load_series`, toma `max(PARTS)` y el `next_part` más adelantado entre las
  plataformas activas, devuelve días de colchón. No genera ni escribe → testeable con state falso.
- **`refillers.py`** — registry canal → generador existente, detrás de una interfaz uniforme
  `refill(channel, n_needed) -> n_aprobados_agregados`:
  - clips a/b/c → `streamers.build.build_backlog`
  - whatonearth → su build (`series_whatonearth` / pipeline whatonearth)
  - soyelmalo → `reddit_pipeline` rewrite
  - faceless/historia/misterios → placeholder (`gen="script"`), reporta "pendiente" (Pieza 2)
- **`supervisor.py`** — el cerebro: por cada canal con `platforms != ()` y entrada en `REFILL`,
  si `runway_days < target`, llama al refiller en tandas midiendo aprobados reales hasta volver
  al objetivo o agotar `max_attempts`; acumula el reporte de salud; si hubo problemas, llama a
  `alert.send()`.
- **`alert.py`** — manda email solo si hay algo que reportar. Nunca spamea en el caso feliz.
  Jamás rompe el loop (traga errores de SMTP y los loguea).

### Flujo de datos

```
Programador (03:00) -> run_autobuild.bat -> supervisor
  por canal: runway.runway_days() -> si < target: refillers.refill() en tandas
    -> generador existente escribe approved en su backlog sqlite
    -> supervisor recalcula parts_ahead (antes/después)
  -> arma digest -> alert.send() SOLO si hubo problemas -> escribe autobuild.log
```

El camino de posteo (`daily_post.py`) **no se toca**. Generación pesada (whisper/render/LLM) y
posteo quedan 100% desacoplados.

## El loop de control

### Fórmula de runway (`runway.py`)

```
parts_ahead  = max(PARTS)  -  max(next_part de cada plataforma activa)
runway_days  = parts_ahead / posts_per_day
```

Se usa la plataforma **más adelantada** (la que se queda sin material primero) como borde
conservador. `posts_per_day` = corridas diarias del canal (hoy 2), configurable.

Casos borde que el cálculo debe manejar: backlog vacío (`parts_ahead <= 0` → runway 0), canal
sin plataformas activas (se saltea), última parte ya posteada, `next_part` distinto por plataforma.

**Importante (corrección):** `runway.py` y el loop de relleno deben medir el backlog **releyendo
la fuente fresca** (el sqlite vía `load_parts` / query directa) en cada medición, NO el atributo
`series.PARTS` que los adaptadores cachean al importar (`PARTS = load_parts(...)` corre una sola
vez). Si el supervisor midiera contra ese dict cacheado, nunca vería los `approved` que acaba de
generar dentro de la misma corrida y el loop de medición real no cerraría.

### El relleno (`supervisor.py`)

Para clips el `build` recibe **intentos**, no aprobados, y el yield es bajo (medido 2026-10-16:
streamers_a 11 intentos → 3 aprobados ≈ 27%). Por eso:

```
deficit   = target_days * posts_per_day  -  parts_ahead
intentos  = ceil(deficit / yield_estimado[canal])     # ~0.3 clips, ~0.8 reddit
```

**Loop de medición real (no a ciegas):** el supervisor llama al refiller en tandas y recalcula
`parts_ahead` después de cada tanda (comparando backlog antes/después). Sigue hasta
`parts_ahead >= objetivo` **o** hasta agotar `max_attempts[canal]` esa noche. Se autoajusta al
yield real sin sobre-producir.

### Topes de seguridad (anti-runaway)

- `max_attempts` por canal por noche (ej. clips 25) → no quema disco ni API si una fuente se seca.
- Tope global de intentos por corrida → respeta rate de Groq (8000 tok/min) y free tier de Gemini.
- **Lock file** → si una corrida nocturna se pasa de 24h, la siguiente no arranca encima.

### Fail-safe (la red)

El supervisor **solo agrega episodios que los generadores ya marcaron `approved`** (QC visión
Gemini para clips, juez LLM para reddit). Nunca publica ni toca `daily_post`. En el peor caso
—fuente seca, API caída, nada aprueba— el único efecto es que **el colchón deja de crecer**, y
eso dispara el email. Jamás entra basura al backlog de publicación.

## Manejo de fallos y alertas

### Qué cuenta como "problema" (lo único que dispara email)

| Severidad | Condición | Ejemplo |
|-----------|-----------|---------|
| CRÍTICO | runway quedó < ~2 días tras intentar rellenar | la fuente se secó, el canal está por quedarse sin material |
| WARN | no llegó al objetivo pero sigue con colchón | pidió 28, juntó 9 (yield bajo esa noche) |
| ERROR | el generador tiró excepción / API caída / falta key | Groq 429, token vencido, `GEMINI_API_KEY` ausente |

Noche sin problemas (todos >= objetivo) → **no se manda nada**. Cero ruido.

### Un email por noche (digest)

El supervisor junta todo el reporte y, si hubo al menos un problema, manda **un** mail. El asunto
codifica la peor severidad. El cuerpo lleva los números crudos (runway antes/después, intentos,
aprobados) para diagnosticar sin entrar a la PC.

```
Asunto:  [ShortsBot] 🔴 2 canales con problema · 16-10 03:14
Cuerpo:
  Canal         Runway antes -> después   Aprobados +   Estado
  whatonearth   3.5d -> 14.0d             +21           OK
  streamers_a   1.5d -> 3.0d              +3            WARN: yield bajo (23 intentos, 3 ok)
  streamers_b   0.0d -> 0.0d              +0            ERROR: fuente Kick rinde 0 — revisar fuente
  (faceless/historia/misterios: generador pendiente — Pieza 2)
```

### Config de Gmail (`alert.py`)

SMTP SSL `smtp.gmail.com:465` con `smtplib`. Credenciales **nunca** hardcodeadas ni commiteadas;
van en `.env` (ya gitignoreado):

```
AUTOBUILD_SMTP_USER=nofaceshortvids@gmail.com     # remitente (reusa una cuenta del proyecto)
AUTOBUILD_SMTP_PASS=<app-password de 16 dígitos>   # requiere 2FA activo en esa cuenta
AUTOBUILD_ALERT_TO=prensa.smata@gmail.com          # destino
```

Gmail exige **app-password** (no la clave normal) y 2FA activo en la cuenta remitente. Si el envío
falla, se loguea en `autobuild.log` y el supervisor **no se cae** por eso.

### Config por canal (`autobuild/config.py`)

Tabla declarativa, un único lugar para tunear sin tocar lógica:

```python
REFILL = {
  "streamers_a":  {"target_days": 14, "posts_per_day": 2, "yield": 0.27, "max_attempts": 25, "gen": "clips"},
  "streamers_b":  {"target_days": 14, "posts_per_day": 2, "yield": 0.27, "max_attempts": 25, "gen": "clips"},
  "streamers_c":  {"target_days": 14, "posts_per_day": 2, "yield": 0.27, "max_attempts": 25, "gen": "clips"},
  "whatonearth":  {"target_days": 14, "posts_per_day": 2, "yield": 0.40, "max_attempts": 25, "gen": "clips"},
  "soyelmalo":    {"target_days": 14, "posts_per_day": 2, "yield": 0.80, "max_attempts": 20, "gen": "reddit"},
  # faceless/historia/misterios: gen="script" -> placeholder hasta Pieza 2
}
```

Un canal sin entrada en `REFILL` no se auto-rellena (opt-in explícito).

## Scheduling, logging, CLI

- **Tarea** "ShortsBot AutoBuild" a las **03:00** diaria → `run_autobuild.bat`. 03:00 porque no
  hay posteo a esa hora (posteo 11:30–21:00) → sin contención de CPU ni choque de locks.
  Registro con `New-ScheduledTaskAction` + `Set-ScheduledTask` (campos `Execute` +
  `WorkingDirectory` estructurados), NO `schtasks /tr` (pierde comillas con el espacio de
  "yt short" y falla en silencio — lección ya vivida en el proyecto). La PC debe estar prendida.
- **Logging:** `autobuild.log` (append), header por corrida + una línea por canal + digest final.
  Mismo estilo que `automation.log`.
- **CLI (`autobuild.supervisor`):**
  - `python -m autobuild.supervisor` → todos los canales del `REFILL`
  - `--channel streamers_a` → uno solo
  - `--dry-run` → imprime qué haría (runway + déficit + intentos) sin generar nada
  - `--force` → ignora el lock

## Testing (TDD, pytest en `tests/`)

Los tests **mockean los generadores** (nada de yt-dlp/whisper/LLM reales) → corren en segundos:

- `runway_days()` con state + PARTS sintéticos: backlog vacío, una plataforma más adelantada,
  canal sin plataformas activas, última parte ya posteada.
- Loop de control con refiller falso de yield fijo: itera hasta el objetivo, **para en
  `max_attempts`**, cuenta de déficit/intentos correcta, recalcula aprobados reales.
- Clasificación de severidad (crítico/warn/error) y render del cuerpo del email; que **solo mande
  mail si hubo problema**; que el alerter **trague** un error de SMTP sin romper el loop.
- Lock file (no arranca si ya hay corrida); opt-in del `REFILL` (canal sin entrada se saltea).

## Rollout seguro (3 pasos)

1. `--dry-run` contra el state real → confirmar que los runway calculados coinciden con la
   realidad (sin efectos).
2. Una corrida manual real mirando `autobuild.log` (y que llegue —o no— el mail de prueba).
3. Recién ahí registrar la tarea de las 03:00.

## Riesgos y consideraciones

- **Riesgo residual del full-infinito:** aun con juez LLM, un dato/clip malo podría pasar el QC.
  El diseño lo mitiga (solo `approved` entra; fail-safe no publica basura) pero no lo elimina.
  Aceptado explícitamente por el usuario. La Pieza 2 (guiones factuales) es donde más pesa.
- **streamers_b (Kick) rinde ~0** en las pruebas: el auto-refill lo va a marcar WARN/ERROR cada
  noche hasta que se arregle la fuente (volver a Twitch o ajustar handles). Es la señal esperada,
  no un bug del supervisor.
- **PC prendida a las 03:00:** misma dependencia que las tareas actuales. Si está apagada, la
  tarea corre en el próximo arranque (configurable) o se saltea esa noche.
- **Generar NO consume cuota de YouTube** (eso es el posteo). El auto-refill no afecta el techo
  de cuota de YT; solo llena backlog.

## Fuera de alcance (Pieza 1)

- Generador de guiones LLM para faceless/historia/misterios (Pieza 2).
- Cola de aprobación humana (descartada: se eligió full-infinito).
- Alertas por Telegram/Windows (se eligió email).
- Tocar el camino de posteo (`daily_post.py`).
