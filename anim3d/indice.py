"""Arma la página de revisión de un lote: revision/<lote>/index.html con todos los videos para mirarlos uno por uno.

    python -m anim3d.indice

Lee de cada episodio el guion (título, fuente, publicar) y el estado del render (archivo, duración, medición).
Las notas para revisar (datos dudosos y defectos conocidos) están abajo, en NOTAS.
"""
from __future__ import annotations

import html
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
LOTE = ROOT / "revision" / "27-nov"
CANALES = [("historia", "Historia en 60 Segundos"), ("misterios", "Misterios en 60 Segundos"), ("faceless", "En 60 Segundos")]
CARPETA = {"historia": "historia", "misterios": "misterios", "faceless": "en60seg"}

# Lo que conviene mirar en cada uno (sale de los informes de producción). Corto y concreto.
NOTAS = {
    "caja": ["El saludo al salir de la caja (\"¿Cómo están, caballeros?\") viene del recuerdo de un testigo; otras fuentes dicen \"All right, sir\".",
             "Henry se ve chiquito dentro de la caja: licencia de caricatura."],
    "monalisa": ["Que se la llevó bajo el blusón está discutido entre fuentes: el guion dice \"según la versión más contada\".",
                 "Hacia 37,5 s la cabeza de Peruggia queda cortada abajo; el cuadro bajo el blusón se ve tosco."],
    "cerdo": ["La orden de \"no disparar primero\" sale de una sola fuente (Forces News).",
              "\"Decide el káiser\" simplifica: él delegó en una comisión que falló en 1872."],
    "vermeer": ["Cuántos cuadros dio Göring varía (137 o 200): dice \"más de cien\".",
                "Los testigos mirándolo pintar están en el mismo taller: licencia visual."],
    "fantasma": ["Es el de ritmo más bajo del lote (movimiento 8,7; el aprobado de la Torre Eiffel tiene 9,3).",
                 "La vista por binoculares es una máscara oscura: fijate si te gusta."],
    "mascara": ["La orden de matarlo si hablaba sale de una paráfrasis de Wikipedia, no de la carta original.",
                "Voltaire y Dumas aparecen con un \"puf\" de caricatura."],
    "oakisland": ["Lo legendario (la polea, los troncos cada 3 m, la piedra) va marcado como \"según los relatos\".",
                  "Es nocturno: la imagen cambia cada 3,1 s, más lento que el resto."],
    "piedras": ["El hielo y las piedras se mueven mucho más rápido que en la realidad (unos metros por minuto): es un acelerado.",
                "La piedra que se mueve mientras el turista no mira es un chiste, no algo documentado."],
    "kaspar": ["El ataque se insinúa, no se muestra.",
               "En la celda Kaspar se ve casi parado en vez de sentado."],
    "boveda": ["Es un relato con fuentes flojas: el guion lo dice al final (\"casi no hay papeles de la época\")."],
    "ventanas": ["Retocado: el cierre ahora es \"Desde entonces, ninguna tiene esquinas.\" (antes le hablaba al que mira).",
                 "Matiz respetado: la grieta del avión real nació en una ventanita del techo, no en las de pasajeros."],
    "pezarquero": ["Alcance prudente: \"unos dos metros\" (algunas fuentes dicen hasta 3).",
                   "En algunos planos abiertos la mosca se ve chica."],
    "cajanegra": ["Cifras en la versión prudente (fuego media hora, baliza 30 días); normas más nuevas piden más.",
                  "Los textos de la caja están en inglés, como en los aparatos reales."],
    "nutrias": ["Ojo: tomarse de las patas es poco común en la naturaleza (lo común son las algas). El guion dice \"algunas\", pero el título lo vende como general.",
                "Retocado: se sacó un corte brusco a los 26 s."],
    "hielo": ["\"Los lagos se congelan de arriba hacia abajo\" es una simplificación correcta para el video.",
              "El marco del +9 % se dibuja más grande de lo real."],
}

CSS = """
:root { --bg:#14111c; --card:#1f1a2b; --ink:#f3eee6; --muted:#b4aac4; --line:#352d47; --acc:#ffd23a; --ok:#59c36a; --warn:#f0a03c; }
@media (prefers-color-scheme: light) { :root { --bg:#f6f2ea; --card:#ffffff; --ink:#1e1428; --muted:#5e5470; --line:#e3dbcd; } }
* { box-sizing: border-box; } body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 28px; margin: 0 0 4px; } .sub { color: var(--muted); margin: 0 0 24px; }
h2 { font-size: 21px; margin: 36px 0 12px; border-bottom: 2px solid var(--acc); padding-bottom: 6px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 18px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
video { width: 100%; aspect-ratio: 9/16; background: #000; display: block; max-height: 560px; }
.body { padding: 12px 14px 16px; } .t { font-weight: 700; font-size: 17px; margin: 0 0 6px; }
.meta { color: var(--muted); font-size: 13px; margin: 0 0 8px; } .meta b { color: var(--ink); }
ul { margin: 6px 0 8px 18px; padding: 0; font-size: 14px; } li { margin: 3px 0; }
.src { font-size: 12px; color: var(--muted); word-break: break-all; } .src a { color: var(--muted); }
code { background: var(--line); padding: 1px 6px; border-radius: 6px; font-size: 13px; }
.pend { color: var(--warn); font-weight: 600; }
"""


def main() -> Path:
    bloques = []
    for canal, nombre in CANALES:
        eps = []
        for g in sorted((HERE / "episodes").glob("*/guion.json")):
            guion = json.loads(g.read_text(encoding="utf-8"))
            ep = g.parent.name
            if guion.get("canal") != canal or ep not in NOTAS:
                continue
            st_p = HERE / "out" / ep / "render_status.json"
            st = json.loads(st_p.read_text(encoding="utf-8")) if st_p.exists() else {}
            eps.append((guion.get("orden", 0), ep, guion, st))
        tarjetas = []
        for orden, ep, guion, st in sorted(eps):
            video = LOTE / CARPETA[canal] / f"{orden}_{ep}.mp4"
            rel = video.relative_to(LOTE).as_posix()
            m = st.get("medicion") or {}
            titulo = (guion.get("publicar") or {}).get("titulo") or guion.get("titulo", ep)
            estado = "" if st.get("estado") == "listo" else f'<p class="pend">Render: {html.escape(st.get("estado", "sin render"))}</p>'
            fuentes = [f.strip().split(" (")[0] for f in str(guion.get("fuente", "")).replace(";", " ; ").split(" ; ") if f.strip()]
            fuentes_html = " · ".join(f'<a href="{html.escape(u)}">{html.escape(u.replace("https://", ""))}</a>' if u.startswith("http") else html.escape(u) for u in fuentes)
            tarjetas.append(f"""
<article class="card">
  <video controls preload="metadata" src="{html.escape(rel)}"></video>
  <div class="body">
    <p class="t">{orden}. {html.escape(titulo)}</p>
    <p class="meta"><b>{m.get('duracion', '?')} s</b> · movimiento {m.get('movimiento', '?')} · cambio cada {m.get('cambio_cada_s', '?')} s · {m.get('cortes_fuertes', '?')} cortes · archivo <code>{html.escape(rel)}</code></p>
    {estado}
    <ul>{''.join(f'<li>{html.escape(n)}</li>' for n in NOTAS[ep])}</ul>
    <p class="src">Fuentes: {fuentes_html}</p>
    <p class="meta">Para publicarlo: <code>python -m anim3d.publicar {ep}</code></p>
  </div>
</article>""")
        bloques.append(f"<h2>{html.escape(nombre)}</h2><div class=\"grid\">{''.join(tarjetas)}</div>")
    pagina = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisión 27-nov</title><style>{CSS}</style></head><body><main>
<h1>Revisión del 27 de noviembre</h1>
<p class="sub">15 episodios animados, 5 por canal. Nada publicado todavía. Referencia del episodio aprobado (Torre Eiffel): movimiento 9,3 · cambio cada 3,3 s · 8 cortes.</p>
{''.join(bloques)}
</main></body></html>"""
    destino = LOTE / "index.html"
    destino.write_text(pagina, encoding="utf-8")
    print(destino)
    return destino


if __name__ == "__main__":
    main()
