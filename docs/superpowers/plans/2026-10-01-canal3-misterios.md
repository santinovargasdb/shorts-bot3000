# Canal 3 "Misterios en 60 Segundos" — Plan (adenda al plan del canal 2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Mismo patrón que el canal 2 (plan `2026-10-01-canal2-historia.md`); la arquitectura multi-canal ya existe — este plan solo enchufa un canal nuevo.

**Goal:** Canal 3 "Misterios en 60 Segundos": 1 misterio real narrado por episodio, mismo motor y formato que Historia.

**Decisiones del usuario:** nicho misterios (elegido); voz y música con gate de muestras (candidatas: voces es-AR-TomasNeural / es-CO-GonzaloNeural / es-AR-ElenaNeural; música dark de Kevin MacLeod). Las CUENTAS de todos los canales se crean en un batch final (decisión del usuario), así que acá no hay OAuth ni uploads.

## Global Constraints

Las mismas del plan canal 2 (español con voseo, números en palabras en texto hablado, 100-165 palabras, CTA final, CC-BY con crédito, commits en español + trailer). CTA de este canal: "Seguime para más misterios así." Historias REALES y verificables; si un caso es leyenda sin sustento, narrarlo explícitamente como leyenda o sustituirlo. No difamar personas vivas.

---

### Task M1: `series_misterios.py` + tests

**Files:** Create `series_misterios.py`, `tests/test_series_misterios.py`.

**Interfaces:** mismo contrato que `series_historia` (leerlo como EJEMPLAR de estructura y estilo): `MISTERIOS: dict[int, dict]`, `PARTS = MISTERIOS`, `KEYWORDS`, `title_for(part) -> f"{titulo} | Misterios en 60 Segundos"`, `descripcion(parte, resumen)`, `background_for(part) = BACKGROUNDS[(part + 1) % len(BACKGROUNDS)]` (desfasado 2 del canal 1), `_m(text, *imgs)`.

Tests: espejo de `tests/test_series_historia.py` con el módulo/CTA cambiados (10 episodios, 4-7 momentos, 100-165 palabras, 2 imgs por momento, CTA "eguime" presente).

Temas (verificar datos; sustituir los flojos por otro misterio real famoso, anotándolo):
1. El Mary Celeste (barco intacto, tripulación desaparecida, 1872)
2. La señal Wow! (radioseñal de 1977 jamás repetida)
3. El paso Dyatlov (9 excursionistas, 1959 — narrar con respeto, hipótesis actuales)
4. D.B. Cooper (secuestró un avión, saltó con el dinero, jamás apareció)
5. El manuscrito Voynich (el libro que nadie puede leer)
6. El hombre de Somerton / Tamam Shud (1948)
7. El faro de Eilean Mor (3 fareros desaparecidos, 1900)
8. Kryptos (la escultura de la CIA sin descifrar)
9. La lluvia de carne de Kentucky (1876)
10. El MV Joyita (barco encontrado sin tripulación, 1955)

Commit: "series_misterios: backlog de 10 misterios del canal 3".

### Task M2: registro + perfil + bat

**Files:** Modify `channels_registry.py` (entrada `misterios`), `config/channels.yaml` (perfil), `tests/test_registry.py` (set esperado ahora incluye `misterios` + test de contexto), `ROADMAP.md` (canal 3 EN MARCHA; Reddit fase 2 explícito; nota de cuota YT: 3 canales a 2/día llenan el cupo diario de la API). Create `run_daily_misterios.bat` (como el de historia, `--channel misterios`, log `automation_misterios.log`, horarios futuros 13:30/20:30).

Registry `misterios`: display "Misterios en 60 Segundos", series "series_misterios", engine_channel "misterios", music "music/misterios_tema.mp3", yt_token "secrets/misterios/token.json", ig_creds "secrets/misterios/instagram.json", platforms ("yt", "ig").

Perfil yaml `misterios`: whisper small, crop blur, clips 1, tts_voice provisional "es-AR-TomasNeural", tts_rate "+2%" (más pausado, clima de misterio), caption.highlight_color "&H00E22B8A" (violeta), legal_note contenido propio.

Commit: "Canal misterios: registro, perfil del motor y bat (horarios 13:30/20:30)".

### Task M3: voz y música (GATE usuario)

Muestras de voz (texto = gancho del misterio 1) con es-AR-TomasNeural, es-CO-GonzaloNeural, es-AR-ElenaNeural a +2%. Música: 3 candidatas dark de Kevin MacLeod (p.ej. "Long Note Two", "Dark Times", "House of Leaves"; sustituir si 404). Usuario elige → `music/misterios_tema.mp3` + `music/misterios_tema.credit.txt` + tts_voice definitivo en yaml. Commit.

### Task M4: episodio 1 + QA (GATE usuario)

`python daily_post.py --channel misterios --dry-run` → mp4 en `output/misterios/`, 1080x1920, duración 43-58s, crédito correcto en el .json. QA del usuario; ajustes → regenerar.

### Batch final (todos los canales, tarea aparte ya existente)

Cuentas YT (canales de marca) + IG + tokens para historia Y misterios en una sola sesión guiada; schtasks de ambos; primer upload privado de cada uno.
