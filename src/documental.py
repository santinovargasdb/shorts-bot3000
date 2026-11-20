"""Layout 'documental' (misterios): la FOTO REAL del caso llena la pantalla.

Reemplaza el gameplay de relleno + tarjeta chica por el formato de los canales de misterio
que rompen el techo de views (sondeo 12-nov-2026, ref. MundoCreepy):

- Titular fijo arriba todo el video + marca del canal.
- La imagen del caso a todo el ancho, sobre su propia copia desenfocada y oscurecida.
- Ken Burns lento y fundido entre imágenes; si un momento no tiene imagen, queda la anterior.
- Subtítulo karaoke debajo de la imagen (igual que antes).

Lo usa src/curiosidades.generate cuando el canal declara `layout: documental` en channels.yaml.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from . import stock

SS = 1.5            # las placas se arman a 1.5x: el Ken Burns sale más suave (menos salto de píxel)
WIN_TOP = 400       # ventana de la imagen (px sobre 1080x1920): debajo del titular (3 renglones)...
WIN_H = 720         # ...y arriba del karaoke (margin_v 700 -> texto en y≈1125-1220)
FADE = 0.35         # fundido de entrada de cada imagen (s)
ZOOM = 0.07         # recorrido del Ken Burns
MAX_POR_MOMENTO = 2


def headline_lines(text: str, max_chars: int = 18) -> list[str]:
    """Parte el titular en renglones de ~max_chars (por palabras)."""
    out, line = [], ""
    for word in text.split():
        if line and len(line) + 1 + len(word) > max_chars:
            out.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    if line:
        out.append(line)
    return out


def plan_images(queries_por_momento: list[list[str]], fetch=None,
                max_por_momento: int = MAX_POR_MOMENTO) -> list[list[dict]]:
    """Reparte las imágenes de los artículos entre los momentos del relato, sin repetir mientras
    queden nuevas. Cuando un momento ya no tiene ninguna sin usar, vuelve a la menos reciente
    (distinta de la que está en pantalla) para que igual haya cambio visual; si no hay ninguna,
    el momento queda vacío y el render mantiene la anterior.
    `fetch(query) -> [{id, url, ...}]` (por defecto stock.article_images)."""
    fetch = fetch or stock.article_images
    usadas: list[str] = []          # ids en orden de uso (la última es la que está en pantalla)
    plan: list[list[dict]] = []
    for queries in queries_por_momento:
        cands: list[dict] = []
        for q in queries:
            try:
                imgs = fetch(q)
            except Exception as e:
                print(f"  ⚠️  imágenes de '{q}': {e}")
                imgs = []
            for im in imgs:
                if im["id"] not in {c["id"] for c in cands}:
                    cands.append(im)
        nuevas = [c for c in cands if c["id"] not in usadas][:max_por_momento]
        if not nuevas and cands:
            en_pantalla = usadas[-1] if usadas else None
            repetibles = [c for c in cands if c["id"] != en_pantalla]
            repetibles.sort(key=lambda c: usadas.index(c["id"]) if c["id"] in usadas else -1)
            nuevas = repetibles[:1]
        for c in nuevas:
            if c["id"] in usadas:
                usadas.remove(c["id"])
            usadas.append(c["id"])
        plan.append(nuevas)
    return plan


def make_plate(img: Path, out: Path, w: int = 1080, h: int = 1920) -> Path:
    """Imagen -> placa de cuadro completo: la foto llenando la ventana (siempre la misma caja, a
    todo el ancho), sobre su propia copia desenfocada y oscurecida. Lo que sobra se recorta
    (en vertical con sesgo hacia arriba: las caras suelen estar en el tercio superior)."""
    W, H = int(w * SS), int(h * SS)
    top, win = int(WIN_TOP * SS), int(WIN_H * SS)
    fc = (f"[0:v]split[a][b];"
          f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
          f"boxblur=24:4,eq=brightness=-0.30:saturation=0.55,setsar=1[bg];"
          f"[b]scale={W}:{win}:force_original_aspect_ratio=increase:flags=lanczos,"
          f"crop={W}:{win}:(iw-{W})/2:(ih-{win})*0.3,"
          f"eq=contrast=1.06:saturation=0.85:brightness=-0.02,setsar=1[fg];"
          f"[bg][fg]overlay=0:{top}[p]")
    r = subprocess.run(["ffmpeg", "-y", "-i", str(img), "-filter_complex", fc, "-map", "[p]",
                        "-frames:v", "1", "-q:v", "2", str(out)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"no se pudo armar la placa de {img.name}:\n{r.stderr[-800:]}")
    return out


def download_plan(plan: list[list[dict]], work: Path, w: int, h: int) -> tuple[list[list[Path]], list[str]]:
    """Baja las imágenes del plan y arma sus placas. Devuelve (placas por momento, créditos).
    Una imagen que no baja o no se puede componer se saltea (el momento queda con menos)."""
    hechas: dict[str, Path] = {}
    creditos: list[str] = []
    placas: list[list[Path]] = []
    for i, imgs in enumerate(plan):
        fila = []
        for j, im in enumerate(imgs):
            if im["id"] not in hechas:
                raw = work / f"img_{i:02d}_{j}.jpg"
                plate = work / f"plate_{i:02d}_{j}.jpg"
                try:
                    stock._wiki_pace()
                    if not (stock._download_url(im["url"], raw, headers=stock._WIKI_UA)
                            and stock._is_raster_image(raw)):
                        continue
                    make_plate(raw, plate, w, h)
                except Exception as e:
                    print(f"  ⚠️  imagen '{im.get('title', im['id'])}': {e}")
                    continue
                hechas[im["id"]] = plate
                if im.get("credit"):
                    creditos.append(im["credit"])
            fila.append(hechas[im["id"]])
        placas.append(fila)
    return placas, creditos


def hold_events(events: list[dict], duration: float) -> list[dict]:
    """Cada imagen queda en pantalla hasta que entra la siguiente (los momentos sin imagen no
    dejan el fondo pelado) y la primera arranca en t=0 (el primer cuadro nunca es fondo vacío).
    Agrega `dur_in`: cuánto dura su input (hasta que la siguiente terminó de fundirse)."""
    evs = sorted(events, key=lambda e: e["start"])
    for k, ev in enumerate(evs):
        if k == 0:
            ev["start"] = 0.0
        ev["end"] = evs[k + 1]["start"] if k + 1 < len(evs) else duration
        ev["dur_in"] = (ev["end"] - ev["start"]) + (FADE + 0.1 if k + 1 < len(evs) else 0.0)
    return evs


def video_filters(events: list[dict], w: int, h: int, ass_name: str) -> list[str]:
    """Partes del filter_complex de video: fondo oscuro + placas con Ken Burns y fundido +
    viñeta + subtítulos. Deja el resultado en [v]. El input 0 es el fondo; la placa k, el k+1."""
    parts = [f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,"
             f"boxblur=10:2,eq=brightness=-0.35:saturation=0.25[bg]"]
    prev = "bg"
    for k, ev in enumerate(events):
        n = max(1, int(round(ev["dur_in"] * 30)))
        # alterna acercar / alejar para que dos imágenes seguidas no se muevan igual
        z = f"1+{ZOOM}*on/{n}" if k % 2 == 0 else f"{1 + ZOOM}-{ZOOM}*on/{n}"
        fade = f",fade=t=in:st=0:d={FADE}:alpha=1" if k > 0 else ""
        parts.append(
            f"[{k + 1}:v]zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d=1:fps=30:s={w}x{h},format=yuva420p{fade},"
            f"setpts=PTS+{ev['start']:.3f}/TB[c{k}]")
        parts.append(f"[{prev}][c{k}]overlay=0:0[o{k}]")
        prev = f"o{k}"
    parts.append(f"[{prev}]vignette=PI/4.5,subtitles={ass_name}[v]")
    return parts
