# Diseño: canal "¿Soy el Malo?" — drama de Reddit (Fase 2)

**Fecha:** 2026-10-07
**Estado:** diseño aprobado en brainstorming; pendiente de revisión del usuario → plan de implementación.
**Autor:** Santino + Claude

---

## 1. Objetivo

Lanzar una **sub-marca faceless** de historias de Reddit narradas (drama de relaciones + venganza)
en español, reusando el motor existente (voz IA + gameplay + subtítulos karaoke + auto-posteo),
agregándole un **pipeline de sourcing + reescritura con IA** que convierte posts de Reddit en
guiones originales en español. Es la "Fase 2" del ROADMAP.

**Métrica de éxito (realista):** crecer la cuenta (sobre todo TikTok) con contenido que **no caiga
en el flag de "contenido inauténtico"**; las views son tracción, no ingreso. Monetización real =
sponsors / producto propio / embudo (ver §9).

---

## 2. Decisiones de diseño (tomadas en brainstorming)

| # | Decisión | Elección | Por qué |
|---|---|---|---|
| 1 | **Ángulo/lane** | Drama de **relaciones + venganza** (infidelidad, familia/suegras, karma), ancla "¿soy el malo?" | Máxima resonancia hispana + payoff satisfactorio; menos saturado que AITA puro; motor de comentarios. |
| 2 | **Marca** | **Sub-marca "¿Soy el Malo?"** emparentada con "En 60 Segundos" | Identidad propia para el drama sin diluir la marca informativa; reusa sistema de diseño + link hub. |
| 3 | **Capa de transformación** | Reescritura + **voz-marca** + **veredicto/pregunta** propio | Es lo no-negociable contra el flag "inauténtico" y rompe el techo del TTS puro. Barato y automatizable. |
| 4 | **Fuente** | **Reddit EN ahora** (API gratis), fuentes hispanas después | No existe subreddit grande en español; el material viral nace en inglés. EN es estructurado y escalable. |
| 5 | **Duración** | **45-60s por default** (hasta ~75s si la historia lo pide) | Espacio para el arco (setup→conflicto→giro→veredicto) manteniendo alta completación. |
| 6 | **Voz** | **es-MX según género del narrador**: Jorge (M) / Dalia (F) | Autenticidad (la voz coincide con quien cuenta) + variación entre videos + voces que ya gustan. |

---

## 3. Hallazgos de mercado que fundamentan el diseño

Investigación con 6 agentes en paralelo + verificación adversarial (2026). Reglas duras **[VERIFICADO]**:

- **El eje de rentabilidad NO es el subgénero, es la TRANSFORMACIÓN.** YouTube renombró su política a
  "contenido inauténtico" (15-jul-2025) y nombró explícitamente "historias narrativas con solo
  diferencias superficiales". Desmoneta el Reddit-crudo + TTS verbatim + gameplay plano repetido.
  Caso real: **UnderSparked (246K subs, voz humana) desmonetizado**. Pero la IA/faceless **no está
  prohibida** — el test es *valor original por video*. Prueba viva: "Am I the Jerk?" tiene 1,2M subs.
- **Copyright:** el autor del post retiene el copyright; la licencia de Reddit **no se transfiere** al canal.
  Leer verbatim = riesgo de DMCA + strike. Reescribir + quitar usernames + comentario propio = defensa.
- **Reddit prohíbe scraping masivo** para uso comercial (Public Content Policy). → usar API oficial
  dentro del tier gratis (OAuth, 100 req/min = **US$0**), no scrapear.
- **Mercado español:** demanda masiva, sin dominador, **saturado de bots genéricos**. Techo ES ~300-780K
  (vs 1M+ en inglés). Hueco por **calidad** y **sub-nicho**. **Instagram Reels en español subexplotado**.
- **Monetización:** Shorts RPM ~$0.01-0.05/1k views; español/LATAM 5-15x menos → **1M views ≈ $10-30**.
  TikTok Creator Rewards **no en Argentina**. Dinero real = sponsors + producto propio + embudo.
  Hispanos de EEUU/España pagan CPM 5-10x → optimizar SEO/temas para arrastrarlos.
- **Producción:** el stack ganador = exactamente el motor actual. Diferenciadores: gancho in-media-res
  <3s, voz ~150 wpm, karaoke 1-palabra-resaltada, 45-60s con >70% de completación, cierre que invita
  al rewatch. Gameplay con **audio a 0**. Música lo-fi muy baja o nada (YT da bonus de audio original
  a canales <50K con voz propia).

---

## 4. Arquitectura del pipeline

Cuatro piezas chicas y testeables, más una base de datos de estado. Las dos primeras son nuevas;
las dos últimas reusan el motor existente.

```
 reddit_source.py      story_filter.py        rewrite.py            motor actual
 ───────────────       ───────────────        ─────────────         (faceless.py)
 PRAW + OAuth gratis → viral_score + dedup  → LLM (reescribe/   → voz (Jorge/Dalia) +
 top(week/month)       (SQLite)               traduce/condensa    gameplay + karaoke
 de N subreddits                              + veredicto)        → daily_post.py
       │                      │                     │                    │
       └──────────────────────┴─────────── stories.sqlite ──────────────┘
         estado: sourced → filtered → rewritten → produced → posted
```

### 4.1 `reddit_source.py` — sourcing
- **PRAW** (`pip install praw`), app tipo "script", OAuth. Rate-limit automático (respeta headers).
- Recorre los subreddits (ver §6) con `top(time_filter="week"|"month")`.
- Guarda cada post en `stories.sqlite`: `id, subreddit, title, body, score, ratio, num_comments,
  created_utc, over18, flair, status='sourced'`.
- Filtra de entrada: `is_self=True`, `not stickied`, `not over_18`.
- *(Opcional / futuro: Arctic Shift — API REST gratis sin auth, ~2.500M posts — para backlog histórico.)*

### 4.2 `story_filter.py` — selección
- `viral_score(post)`: descarta si `score < 300` o `ratio < 0.90` o largo fuera de 150-1500 palabras;
  bonus si el título tiene keywords de gancho (`aita`, `am i`, `update`, `tifu`, `revenge`, `cheat`...).
  Ordena el backlog por score.
- **Dedup por `post.id`**: nunca se produce dos veces la misma historia.
- Marca `status='filtered'` las que pasan.

### 4.3 `rewrite.py` — reescritura + traducción + transformación
- Proveedor LLM gratis, SDK compatible-OpenAI para poder cambiar: **Groq (Llama 3.3 70B)** principal,
  **Ollama local (Qwen 2.5 7B)** de fallback sin límites, Gemini Flash como alternativa por mejor español.
- Devuelve **JSON estructurado**:
  ```json
  {
    "guion": "<110-160 palabras, español natural, in media res, nombres cambiados>",
    "narrador_genero": "M" | "F",
    "titulo": "<título corto/gancho para la tarjeta en pantalla y el caption>",
    "veredicto": "<1 línea de opinión/encuadre propio>",
    "cierre": "¿Vos qué hubieras hecho? 👇"
  }
  ```
- Valida el largo en código; si se pasa, re-pide "acortá a N palabras sin perder el giro".
- `narrador_genero` decide la voz (Jorge/Dalia) en la producción. Marca `status='rewritten'`.
- El prompt vive en §7.

### 4.4 Producción + posteo (reuso)
- Nuevo canal en `channels_registry.py` y `config/channels.yaml` (ver §5).
- **Dos adaptaciones en la integración** (el resto del motor se reusa tal cual):
  1. **Fuente del guion dinámica:** el canal toma la próxima historia `rewritten` de `stories.sqlite`
     (no de un `series.PARTS` estático). `channels_registry.load_series` / `daily_post` deben contemplar
     canales con `series=None` + `source`.
  2. **Voz por historia:** Jorge si `narrador_genero=="M"`, Dalia si `"F"`, en vez de un `tts_voice` fijo.
- Gameplay de fondo, karaoke, SFX, mezcla, render y subida a YT/IG/TikTok (`daily_post.py`) se reusan
  sin cambios estructurales.

---

## 5. Configuración del canal

**`channels_registry.py`** — nueva entrada:
```python
"soyelmalo": {
    "display": "¿Soy el Malo?",
    "series": None,                  # NO usa series estáticas: guiones dinámicos del pipeline
    "source": "reddit_drama",        # módulo de sourcing+rewrite
    "engine_channel": "soyelmalo",
    "music": None,                    # sin música (voz propia = bonus de audio original en YT)
    "yt_token": "secrets/soyelmalo/token.json",
    "ig_creds": "secrets/soyelmalo/instagram.json",
    "tt_token": "secrets/soyelmalo/tiktok_token.json",
    "platforms": ("yt", "ig", "tt"),
    "first_comment": "¿Vos qué hubieras hecho? 👇",
    "sfx_style": "drama",            # pop en el cambio de palabra; riser en el giro
},
```

**`config/channels.yaml`** — nuevo perfil:
```yaml
soyelmalo:
  display_name: "¿Soy el Malo?"
  crop_mode: "crop"                  # gameplay vertical a pantalla completa
  clips_per_source: 1
  hook_text: ""
  tts_voice: "es-MX-DaliaNeural"     # DEFAULT; el pipeline la pisa por historia (Jorge/Dalia)
  tts_rate: "+12%"                    # drama ágil (~150 wpm); ajustable con muestras
  short_max_seconds: 75               # permite hasta ~75s (default 45-60)
  caption:
    highlight_color: "&H0000F0FF"    # amarillo (el highlight ganador verificado)
  legal_note: "Reescritura original de historias de Reddit. Ver checklist anti-strike en la spec."
```

**Color de marca** (logo/banner/sección del link hub): **carmesí** (#E23A4E aprox.) — distinto del
teal (datos) / dorado (historia) / violeta (misterios). El *highlight* de subtítulos queda en amarillo
(el que mejor rinde); el carmesí es la identidad visual de la marca, no del karaoke.

---

## 6. Subreddits fuente (lane relaciones + venganza)

| Subreddit | Aporta |
|---|---|
| r/survivinginfidelity, r/relationship_advice | Infidelidad / traición (núcleo del lane, alta resonancia hispana) |
| r/AmItheAsshole (AITA) | Dilema moral binario → ancla "¿soy el malo?" + motor de comentarios |
| r/pettyrevenge, r/ProRevenge, r/MaliciousCompliance | Venganza / karma con payoff satisfactorio |
| r/EntitledParents | Familia tóxica / suegras-villanas (conecta fuerte en LATAM) |

Evitar por ahora: r/nosleep y ficción (copyright más sensible, requiere permiso del autor).

---

## 7. Anatomía del video (formato)

1. **0-1,5s:** gameplay ya en movimiento + **tarjeta del post en pantalla** + primera palabra de la voz.
   Gancho **in media res** (el momento más fuerte primero, sin "hola").
2. **Cuerpo (45-60s):** historia reescrita y condensada, voz a ~150 wpm (Jorge/Dalia según narrador),
   subtítulos karaoke sin pausas, 1 palabra resaltada en amarillo.
3. **Cierre:** veredicto/encuadre propio de 1 línea + **"¿vos qué hubieras hecho? 👇"** → comentarios + rewatch.
- **Fondo:** gameplay con **audio a 0**, loop vertical. Rotar entre fondos/aperturas para no clonar plantilla.
- **Audio:** SFX "pop" en el cambio de palabra; sin música con copyright (voz propia = bonus de audio original).
- **Series:** historia **completa** por default; parte 1/2 solo si no entra en ~75s *y* se publica la parte 2
  dentro de 24-48h.

### Prompt de reescritura (borrador)
```
Sos guionista de shorts narrados en ESPAÑOL NEUTRO LATINO.
Te paso una historia de Reddit en inglés. Devolvé SOLO un JSON con estas claves:
guion, narrador_genero ("M"/"F"), titulo, veredicto, cierre.

REGLAS del "guion":
1. Largo 110-160 palabras (≈45-60s a 150 wpm). Contá las palabras.
2. ABRÍ IN MEDIA RES: primera frase = el momento de máxima tensión. Nada de "Hola"/"esta historia trata de".
3. REESCRIBÍ con tus palabras, NO traduzcas literal. Cambiá nombres propios por nombres neutros.
   Quitá usernames y datos identificables.
4. Condensá: solo setup mínimo → conflicto → giro → remate. Cortá relleno y digresiones.
5. Español natural y hablado (como contás una anécdota a un amigo), frases cortas.
"narrador_genero": el género de quien narra en primera persona (para elegir la voz).
"titulo": gancho corto para la tarjeta en pantalla y el caption.
"veredicto": 1 línea de tu opinión/encuadre (la capa de "comentario original").
"cierre": una pregunta a comentarios, por default "¿Vos qué hubieras hecho? 👇".

HISTORIA:
"""{texto_del_post}"""
```

---

## 8. Legal / anti-strike (integrado, no opcional)

- [ ] **Reescribir siempre** (nunca TTS verbatim) + **quitar usernames/datos**.
- [ ] **No scrapear**: API oficial dentro del tier gratis.
- [ ] **Capa de comentario original** (veredicto/encuadre) en cada video.
- [ ] **Voz-marca consistente** + **disclosure AIGC en TikTok** (voz IA realista).
- [ ] **Variar** fondo/apertura/estructura entre videos (anti "plantilla intercambiable").
- [ ] **Sin watermarks ajenos**; **no repostear el mismo asset idéntico** cross-plataforma.
- [ ] IG: no acumular 10+ posts no originales/30 días (al reescribir + comentar, cuentan como originales).
- ⚠️ **Riesgo abierto:** el gameplay de fondo es ajeno (no se grabará propio). Es el mayor vector de
  riesgo que queda (alcance IG + posible Content ID). Mitigación parcial: metraje genuinamente libre /
  sin watermark, y la fuerte capa de transformación (voz + reescritura + veredicto).

---

## 9. Monetización (expectativa honesta)

- Views = **tracción, no ingreso** (1M views en español ≈ $10-30).
- Vías reales, por orden: **sponsors/brand deals** (se cobran por paquete, esquivan el RPM LATAM),
  **producto propio** (incl. vender el propio sistema de automatización), **embudo** a long-form/otra
  plataforma, afiliados selectivos.
- Priorizar crecimiento de **TikTok** (brand deals; Rewards no está en AR).
- SEO/temas pensados para arrastrar hispanos de **EEUU/España** (RPM 5-10x). Cobro por Payoneer/Wise.

---

## 10. Alcance de la primera entrega (MVP)

**Incluye:**
1. `reddit_source.py` + `story_filter.py` + `stories.sqlite` (sourcing y selección).
2. `rewrite.py` con el prompt y validación de largo (Groq principal, fallback Ollama).
3. Canal nuevo en `channels_registry.py` + `config/channels.yaml`.
4. Las dos adaptaciones del motor: fuente del guion dinámica (desde `stories.sqlite`) + voz por historia
   (Jorge/Dalia según `narrador_genero`).
5. **Renderizar 3-5 videos de prueba** con el motor actual para **validar calidad a mano**.
6. Tests para las piezas nuevas (viral_score, parseo del JSON de reescritura, registro del canal).

**NO incluye (todavía):** fuentes hispanas, Arctic Shift, el posteo diario automático (se activa
recién tras validar calidad), branding visual final (logo/banner/sección del hub), creación de cuentas.

**Del lado del usuario:** crear app de Reddit (API key gratis), crear cuentas YT/IG/TikTok de la
sub-marca (como con historia/misterios). Claude guía ambos pasos.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Flag "contenido inauténtico" (desmonetización) | Reescritura + voz-marca + veredicto + variación (la capa #3). |
| Gameplay ajeno (Content ID / alcance IG) | Metraje libre/sin watermark + fuerte transformación. Riesgo residual aceptado. |
| Calidad de reescritura del LLM gratis | Validar 3-5 muestras a mano antes de automatizar; prompt iterable; fallback de proveedor. |
| Rumores "muerte de la API Reddit 2026" | No confirmados (SEO). Plan B listo: Arctic Shift. No reorganizar por eso. |
| Monetización baja por views | Diseñar para sponsors/producto/embudo desde el inicio; TikTok primero. |

---

## 12. Fuera de alcance (YAGNI)

- Grabar gameplay propio (el usuario no lo hará).
- Fuentes hispanas nativas (Fase posterior).
- LIVE / farming / cualquier cosa que viole ToS.
- Traducción literal (siempre reescritura).
