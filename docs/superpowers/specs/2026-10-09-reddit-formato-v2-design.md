# Rediseño del formato «¿Soy el Malo?» v2 — drama que respira

**Fecha:** 2026-10-09
**Estado:** diseño aprobado por el usuario → pendiente de plan de implementación.
**Autor:** Santino + Claude

---

## 1. Problema (detectado mirando los videos a mano)

El formato v1 (spec 2026-10-07) definió guiones de **110-160 palabras (45-60s)**. En la
práctica el drama **no funciona**: el problema y el desenlace quedan pegados, no hay tiempo
para que el espectador se enganche con el conflicto antes del payoff. Además el **título
spoilea el final** ("Puntualidad mortal: la venganza de 30 minutos").

Benchmark: **Señorita Reddit** (88.8k subs, AITA en español, mismo concepto "¿quién es el
villano?"). Lo que hace mejor, verificado en sus títulos reales:
1. **El título es un CLIFFHANGER**, no un spoiler: corta en "…pero…" / "…porque el dueño
   era…" → abre un bucle de curiosidad. (Ej: "En mi noche de bodas vi cómo mi suegro
   golpeaba a mi suegra. Corrí a salvarla, pero solo…")
2. **Historias largas y desarrolladas** (1-3 min): dan tiempo a indignarse con el villano.
3. **Drama de pareja/familia/suegra** extremo y específico (máxima resonancia hispana).
4. **Arco víctima → villano → escalada → giro ("pero") → payoff satisfactorio al final.**

## 2. Decisiones (tomadas en brainstorming)

| # | Decisión | Elección |
|---|---|---|
| 1 | Formato | **Video único más largo ahora**; multi-parte con cliffhanger = **Fase 2** (futuro). |
| 2 | Contenido | **Lean fuerte en pareja/familia/suegra** (infidelidad, traición, suegras). |
| 3 | Alcance | **Refrescar el backlog**: las nuevas salen con formato nuevo YA; lo ya posteado (seq 1: reel de IG + borrador de TikTok) no se toca (el usuario publica ese borrador a mano). |

## 3. Cambios de diseño

### 3.1 Largo (`reddit_pipeline/constants.py`)
- `GUION_MIN_WORDS`: 110 → **210**
- `GUION_MAX_WORDS`: 160 → **320**
  (≈90-120s a ~150 wpm; el drama respira.)
- `config/channels.yaml` perfil `soyelmalo`: `short_max_seconds` 75 → **130**; `tts_rate`
  `+15%` → **+8%** (más pausado, con peso dramático).

### 3.2 Prompt de reescritura (`reddit_pipeline/rewrite.py`) — el corazón
Reemplazar el prompt que "condensa al mínimo" por uno que exige el **arco completo con tiempo**:
- **Gancho (bucle abierto):** 1ª frase planta el conflicto/la injusticia SIN revelar el final.
- **Setup:** presenta víctima + villano (pareja/suegra/familia), la relación y lo que está en
  juego, para que el espectador *se indigne*.
- **Escalada:** el villano la hace peor; sube la tensión.
- **Giro:** el momento donde se da vuelta la tortilla.
- **Payoff:** desenlace/venganza/justicia **al final y con peso**, nunca apurado.
- Español neutro latino, hablado, natural. 210-320 palabras.
- Encuadrar hacia **drama de pareja/familia** cuando la historia lo permita.

El JSON de salida mantiene las 5 claves (`guion`, `narrador_genero`, `titulo`, `veredicto`,
`cierre`) pero **`titulo` ahora es un CLIFFHANGER** (teasea y corta, estilo Señorita Reddit;
no spoilea el final).

### 3.3 Título cliffhanger (`series_reddit.py`)
- `titulo` (cliffhanger) → título de **YouTube/IG/TikTok** (vía `title_for`) y **caption**.
- `title_for` deja de pegar el sufijo "| ¿Soy el Malo?" (el cliffhanger es el gancho; la marca
  ya es la cuenta). Se evalúa en implementación si la tarjeta en pantalla usa el cliffhanger
  completo (puede ir a 2-3 líneas, aceptable en el género) o una versión corta; se decide con
  un frame de prueba.

### 3.4 Foco de contenido (`reddit_pipeline/constants.py` / `scoring.py`)
- Ampliar `HOOK_KEYWORDS` con términos de pareja/familia (cheat, affair, husband, wife,
  mother-in-law, mil, divorce, ex, wedding, in-law…) para que el `viral_score` favorezca ese
  drama.
- El sourcing ya cubre los subreddits de relaciones (survivinginfidelity, relationship_advice,
  AITA, EntitledParents); al re-sourcing se priorizan esos.

### 3.5 Refresco del backlog (datos, no código)
- Revertir las historias reescritas **no posteadas** (seq ≥ 2) al pool `filtered` (limpiar
  `guion`/`seq`), **conservando seq 1** (ya posteada).
- Re-sourcing + re-filtrado con el nuevo peso → re-reescritura de las top con el prompt nuevo
  → obtienen seq 2, 3, 4… (siguiendo desde `MAX(seq)=1`).
- **Borrar los mp4 ya renderizados no posteados** (`output/soyelmalo/` seq 2-4) para que
  `daily_post` los regenere con los guiones nuevos.
- Contadores de soyelmalo quedan en `next_part=2` (IG y TikTok) → la próxima publicación es
  una historia de **formato nuevo**.

## 4. Verificación
- Tests del pipeline verdes (ajustar los de largo/prompt: `tests/test_reddit_*`).
- Re-generar 2-3 guiones nuevos y leerlos a mano: ¿arco desarrollado, gancho que abre bucle,
  título cliffhanger, drama de pareja/familia, 210-320 palabras? (juicio humano, spec §criterio).
- Renderizar 1 video nuevo y revisar por frames (tarjeta/hook, largo ~90-120s, pacing).

## 5. Fuera de alcance (Fase 2 / YAGNI)
- **Multi-parte con cliffhanger** (parte 1 corta + parte 2 resuelve): requiere partir la
  historia + postear la parte 2 sincronizada. Futuro.
- Re-hacer los 3 videos ya renderizados/posteados (seq 1 queda tal cual).
- Branding/cuentas (ya hechos).
