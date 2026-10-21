# Healthcheck / alerta "¿algún canal dejó de subir?" — Diseño

**Fecha:** 2026-10-21
**Objetivo:** Todos los días a las 22:30, revisar automáticamente si algún canal dejó de
subir a alguna de sus plataformas (YouTube / Instagram / TikTok) por la razón que sea
(token vencido, API de Meta caída, TikTok, PC apagada, backlog vacío, etc.) y mandar un
mail de aviso a `santinovargasdb@gmail.com`.

## Enfoque

**Chequeo por "silencio" + pistas locales (agnóstico a la causa).** No sondea las APIs:
lee el estado de posteo y detecta el *síntoma* (hace cuánto que un canal no sube). Eso
cae igual ante cualquier causa. A cada ítem caído le agrega una *pista* calculada
localmente (sin llamar a ninguna API) para orientar el diagnóstico.

Motivo: un sondeo activo (pegarle a cada API) daría falsos positivos por cortes
transitorios y gastaría cuota; el síntoma "no posteó" es la señal verdadera de que algo
hay que mirar.

## Fuentes de datos (ya existen)

- `automation_state.json` → `{canal: {plataforma: {next_part, posted: [{part, date, ...}]}}}`.
  El `date` de cada posteo es `"YYYY-MM-DD HH:MM"`. El último post de un canal×plataforma =
  el `date` máximo de su `posted`.
- `channels_registry.CHANNELS[canal]["platforms"]` → tupla con `"yt"|"ig"|"tt"` = a qué
  plataformas *debería* subir ese canal. Mapeo a las claves del estado:
  `yt→youtube`, `ig→instagram`, `tt→tiktok`. Solo se monitorean los pares declarados
  (ej. `soyelmalo` tiene `("ig","tt")` → su YouTube NO se chequea).

## Componentes

### `autobuild/healthcheck.py` (nuevo)

Funciones puras (reciben `now` y el `state` como parámetros → testeables sin reloj ni disco):

- `monitored_pairs(channels) -> list[(canal, plataforma)]`
  Deriva los pares a vigilar desde `CHANNELS` (expande `platforms`, mapea yt/ig/tt).

- `last_post_dt(state, canal, plataforma) -> datetime | None`
  Fecha del último posteo (máx `date` de `posted`), o `None` si nunca posteó / falta la clave.

- `classify(state, pairs, now, stale_hours=30) -> list[Status]`
  Por cada par devuelve un `Status(canal, plataforma, last_dt, horas, estado)` donde
  `estado ∈ {"OK","STALE","NEVER"}`:
  - `OK`: último post hace ≤ `stale_hours`.
  - `STALE`: posteó antes pero el último fue hace > `stale_hours` → **problema**.
  - `NEVER`: declarado pero `posted` vacío → nota informativa (no dispara mail por sí solo:
    puede ser una plataforma recién activada, ej. whatonearth/TikTok).

- `hint_for(ctx, estado) -> str` (best-effort, SIN llamar APIs; nunca crashea)
  Pistas locales para los `STALE`:
  - token de YT (`ctx["yt_token"]` o `secrets/token.json`) con mtime > 7 días → "token de
    YouTube quizá vencido → reautorizar".
  - IG: `token_refreshed` del estado > 55 días, o falta el `ig_creds` → "token de IG por
    vencer/ausente".
  - backlog sin material (no hay parte aprobada ≥ `next_part`) → "sin material en el backlog".
  - si nada aplica → "revisá el log de daily_post del canal".

- `should_email(statuses, now, heartbeat_weekday=0) -> ("problema"|"ok"|None)`
  - hay algún `STALE` → `"problema"`.
  - no hay `STALE` y `now.weekday()==heartbeat_weekday` (lunes) → `"ok"` (heartbeat semanal).
  - si no → `None` (no manda, solo loguea).

- `render(statuses, modo) -> (subject, body)`
  Subject: `"[ShortsBot][Salud] 🔴 N caído(s) · dd-mm HH:MM"` o
  `"[ShortsBot][Salud] ✅ todo OK · dd-mm HH:MM"`.
  Body: tabla canal/plataforma · último post · hace cuánto · estado · pista.

- `main()`: carga `.env` (como alert.py), lee estado + CHANNELS, `now=datetime.now()`,
  clasifica, decide, y si corresponde manda con `autobuild.alert.send_email`. Nunca levanta
  (todo en try/except + log), igual que el resto de la automatización.

### `run_healthcheck.bat` (nuevo)

Igual que `run_daily*.bat` / `run_autobuild.bat`: activa el entorno y corre
`python -m autobuild.healthcheck`, logueando a un archivo local.

### Tarea programada de Windows

"ShortsBot Healthcheck", diaria a las **22:30**, corriendo `run_healthcheck.bat`
(interactiva/limitada, como las demás). Se registra con `schtasks`/PowerShell.

## Config (constantes)

- `STALE_HOURS = 30`
- `HEARTBEAT_WEEKDAY = 0` (lunes)
- Recipiente/SMTP: reusa `AUTOBUILD_SMTP_USER/PASS/ALERT_TO` del `.env` (ya configurados y
  probados; `ALERT_TO = santinovargasdb@gmail.com`).

## Manejo de errores

- Todo el `main` es best-effort: si falla el parseo de una fecha, se trata el par como
  "muy viejo" (STALE) en vez de romper. Si falla el SMTP, `send_email` ya loguea y
  devuelve `False` sin levantar.
- Las pistas (`hint_for`) van en try/except: una pista que falle nunca tira abajo el aviso.

## Testing (TDD)

Tests con `state` y `now` inyectados (deterministas, sin reloj ni red):
1. `monitored_pairs`: expande `platforms` y mapea yt/ig/tt; excluye plataformas no declaradas.
2. `last_post_dt`: toma el máximo `date`; `None` si `posted` vacío o falta la clave.
3. `classify`: último hace 31h → STALE; 29h → OK; `posted` vacío → NEVER.
4. `should_email`: con STALE → "problema"; sin STALE en lunes → "ok"; sin STALE otro día → None.
5. `render`: el subject refleja el modo y la cantidad de caídos.

## Fuera de alcance (YAGNI)

- Sondeo activo de las APIs.
- Auto-reparación (reautorizar tokens solo). El aviso avisa; la acción la hace el humano.
- Dashboard / histórico. Solo el mail.
