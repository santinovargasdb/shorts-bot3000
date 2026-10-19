"""Genera branding (ícono/pfp, watermark, banner YT) para los canales del tier riesgoso,
con estilo coherente y la fuente de la marca (Montserrat). Config-driven: cambiá BRANDS y
re-corré. Render a 2x y downscale = bordes suaves.  Uso: python -m branding.make_assets"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "fonts"
OUT = ROOT / "branding"
S = 2  # supersampling

# Paleta y textos por canal. c1->c2 = gradiente; accent = color del símbolo/detalle.
BRANDS = {
    "whatonearth": {
        "big": "?!", "name": "WHAT ON\nEARTH", "tag": "SATISFYING · WEIRD · NATURE",
        "c1": (22, 170, 150), "c2": (8, 48, 60), "accent": (255, 216, 92), "symbol": "q",
        "handle": "@what.onearthisthat",
    },
    "streamers_a": {
        # Rayo (no "play": rojo+play = calco del logo de YouTube) + acento amarillo = más energía.
        "big": "CLIPS", "name": "HISPANOS", "tag": "LOS MEJORES MOMENTOS",
        "c1": (230, 30, 46), "c2": (40, 6, 12), "accent": (255, 211, 64), "symbol": "bolt",
        "handle": "@clipshispanos",
    },
    "streamers_b": {
        "big": "CLIPS", "name": "ARGENTINA", "tag": "CLIPS DE STREAMERS AR",
        "c1": (108, 194, 234), "c2": (14, 36, 66), "accent": (255, 255, 255), "symbol": "play",
        "handle": "@clipsargentina",
    },
    "streamers_c": {
        "big": "CLIPS", "name": "IRL", "tag": "STREAMERS ESPAÑOLES · CHARLAS",
        "c1": (233, 128, 28), "c2": (46, 14, 8), "accent": (255, 212, 66), "symbol": "mic",
        "handle": "@clipsirl",
    },
}


def _font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def _gradient(w: int, h: int, c1, c2) -> Image.Image:
    """Gradiente diagonal c1(arriba-izq) -> c2(abajo-der)."""
    base = Image.new("RGB", (w, h), c1)
    top = Image.new("RGB", (w, h), c2)
    mask = Image.new("L", (w, h))
    md = mask.load()
    for y in range(h):
        for x in range(0, w, 4):
            v = int(255 * ((x / w) + (y / h)) / 2)
            for dx in range(4):
                if x + dx < w:
                    md[x + dx, y] = v
    base.paste(top, (0, 0), mask)
    return base


def _vignette(img: Image.Image, strength: float = 0.55) -> Image.Image:
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([-w * 0.25, -h * 0.25, w * 1.25, h * 1.25], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(w // 8))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    return Image.composite(img, Image.blend(img, dark, strength), mask)


def _text(d: ImageDraw.ImageDraw, xy, text, font, fill, anchor="mm", shadow=True, sw=6):
    x, y = xy
    if shadow:
        for dx, dy in ((sw, sw),):
            d.multiline_text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 120),
                             anchor=anchor, align="center", spacing=-10)
    d.multiline_text((x, y), text, font=font, fill=fill, anchor=anchor, align="center", spacing=-10)


def _symbol(d: ImageDraw.ImageDraw, kind: str, cx, cy, r, color, font_big):
    """Símbolo del nicho dentro de un círculo BLANCO sólido (contrasta con el gradiente).
    `color` = color del símbolo (color de marca, para que resalte sobre el blanco)."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    if kind == "play":                                   # triángulo de play
        s = r * 0.6
        d.polygon([(cx - s * 0.45, cy - s * 0.82), (cx - s * 0.45, cy + s * 0.82),
                   (cx + s * 1.0, cy)], fill=color)
    elif kind == "mic":                                  # micrófono de estudio (charla/IRL)
        _mic(d, cx, cy, r * 0.72, color)
    elif kind == "bolt":                                 # rayo (gameplay hype, no es play=YT)
        _bolt(d, cx, cy, r * 0.62, color)
    else:                                                # "?!" (whatonearth)
        _text(d, (cx, cy), "?!", font_big, color, shadow=False)


def _bolt(d, cx, cy, s, color):
    """Rayo (lightning) estilizado centrado en (cx,cy), alto ~2s. Energía > triángulo de play."""
    pts = [(cx - 0.15 * s, cy - 1.0 * s), (cx + 0.55 * s, cy - 1.0 * s),
           (cx + 0.02 * s, cy - 0.08 * s), (cx + 0.42 * s, cy - 0.08 * s),
           (cx - 0.35 * s, cy + 1.0 * s), (cx + 0.05 * s, cy + 0.12 * s),
           (cx - 0.40 * s, cy + 0.12 * s)]
    d.polygon(pts, fill=color)


def _mic(d, cx, cy, s, color):
    """Micrófono de estudio LIMPIO: cápsula vertical alargada (con grilla) + horquilla en U + pie.
    Cápsula más alta que ancha para que lea como micrófono y no como una pelota/carita."""
    lw = max(5, int(s * 0.14))
    cw = s * 0.40                                        # media-anchura de la cápsula (angosta)
    cap_top, cap_bot = cy - s * 1.05, cy + s * 0.18
    d.rounded_rectangle([cx - cw, cap_top, cx + cw, cap_bot], radius=cw, fill=color)
    # grilla: 3 líneas finas del color de fondo, para que lea "micrófono"
    # (se dibujan con el color del borde = transparente-ish via el fondo; usamos líneas delgadas)
    for frac in (0.30, 0.50, 0.70):
        gy = cap_top + (cap_bot - cap_top) * frac
        d.line([(cx - cw * 0.7, gy), (cx + cw * 0.7, gy)], fill=(0, 0, 0, 70), width=max(2, int(s * 0.05)))
    yr = s * 0.72                                        # horquilla en U abrazando la base de la cápsula
    d.arc([cx - yr, cy - s * 0.30, cx + yr, cy + s * 0.80], 20, 160, fill=color, width=lw)
    d.line([(cx, cy + s * 0.62), (cx, cy + s * 1.12)], fill=color, width=lw)   # pie (vástago)
    d.line([(cx - s * 0.55, cy + s * 1.12), (cx + s * 0.55, cy + s * 1.12)], fill=color, width=lw)  # base


def _burst(img, cx, cy, r, color, n=16):
    """Estallido de rayos radiales (pinwheel) DETRÁS del símbolo: suma emoción/energía.
    Se compone con alpha sobre la imagen RGBA."""
    import math
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for i in range(n):
        a0 = i * (2 * math.pi / n)
        a1 = (i + 0.45) * (2 * math.pi / n)
        ld.polygon([(cx, cy), (cx + r * math.cos(a0), cy + r * math.sin(a0)),
                    (cx + r * math.cos(a1), cy + r * math.sin(a1))], fill=color)
    img.alpha_composite(layer)


def _glyph(d, kind, cx, cy, s, color):
    """Dibuja SOLO el símbolo del canal (sin círculo de fondo), para la watermark-badge."""
    if kind == "play":
        d.polygon([(cx - s * 0.42, cy - s * 0.78), (cx - s * 0.42, cy + s * 0.78),
                   (cx + s * 0.95, cy)], fill=color)
    elif kind == "mic":
        _mic(d, cx, cy, s * 0.82, color)
    elif kind == "bolt":
        _bolt(d, cx, cy, s * 0.82, color)
    else:                                                # "?!" (whatonearth)
        _text(d, (cx, cy), "?!", _font("Montserrat-BlackItalic.ttf", int(s * 1.4)), color, shadow=False)


def _magnifier(d, cx, cy, r, color, lw):
    """Lupa: aro (lente) + mango hacia abajo-derecha. Para el pfp de whatonearth."""
    import math
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=lw)
    a = math.radians(48)
    x1, y1 = cx + (r - lw * 0.2) * math.cos(a), cy + (r - lw * 0.2) * math.sin(a)
    x2, y2 = cx + (r * 2.05) * math.cos(a), cy + (r * 2.05) * math.sin(a)
    hw = int(lw * 1.5)
    d.line([(x1, y1), (x2, y2)], fill=color, width=hw)
    d.ellipse([x2 - hw // 2, y2 - hw // 2, x2 + hw // 2, y2 + hw // 2], fill=color)
    d.ellipse([x1 - hw // 2, y1 - hw // 2, x1 + hw // 2, y1 + hw // 2], fill=color)


def _make_globe(r: int):
    """Globo terráqueo estilizado (océano + continentes + grilla), recortado a círculo.
    Devuelve (imagen RGBA, centro)."""
    import math

    pad = max(4, r // 18)
    size = 2 * r + 2 * pad
    g = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    c = size // 2
    ocean, land, grid = (41, 128, 185, 255), (93, 184, 122, 255), (255, 255, 255, 80)
    gd.ellipse([c - r, c - r, c + r, c + r], fill=ocean)
    for bx, by, bw, bh in [(-0.5, -0.38, 0.52, 0.5), (0.12, 0.0, 0.55, 0.62),
                           (-0.12, 0.42, 0.46, 0.42), (0.12, -0.55, 0.4, 0.32)]:
        gd.ellipse([c + r * bx, c + r * by, c + r * (bx + bw), c + r * (by + bh)], fill=land)
    for dy in (-0.55, -0.2, 0.2, 0.55):                  # paralelos
        yy = c + r * dy
        hw = r * math.sqrt(max(0.0, 1 - dy * dy))
        gd.line([(c - hw, yy), (c + hw, yy)], fill=grid, width=max(2, r // 32))
    for sx in (0.42, 0.82):                              # meridianos
        gd.ellipse([c - r * sx, c - r, c + r * sx, c + r], outline=grid, width=max(2, r // 32))
    gd.line([(c, c - r), (c, c + r)], fill=grid, width=max(2, r // 32))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([c - r, c - r, c + r, c + r], fill=255)
    g = Image.composite(g, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask)
    ImageDraw.Draw(g).ellipse([c - r, c - r, c + r, c + r], outline=(255, 255, 255, 215),
                              width=max(3, r // 22))
    return g, c


def make_pfp(key: str, b: dict) -> Path:
    """Foto de perfil TIKTOK/IG-friendly: SOLO elemento visual (sin texto), grande y
    centrado para que lea bien en el recorte CIRCULAR."""
    w = 1080 * S
    img = _vignette(_gradient(w, w, b["c1"], b["c2"]), 0.42).convert("RGBA")
    d = ImageDraw.Draw(img)
    cx = cy = w // 2
    white = (255, 255, 255, 255)
    if b["symbol"] != "q":                               # estallido de energía detrás del símbolo
        _burst(img, cx, cy, int(w * 0.36), (*b["accent"][:3], 70))
        d = ImageDraw.Draw(img)
    if b["symbol"] == "q":                               # whatonearth -> globo + signos "?"
        gr = int(w * 0.235)
        globe, gc = _make_globe(gr)
        img.alpha_composite(globe, (cx - gc, cy - gc))
        d = ImageDraw.Draw(img)
        _text(d, (int(cx + gr * 1.05), int(cy - gr * 0.95)), "?",
              _font("Montserrat-BlackItalic.ttf", int(w * 0.2)), b["accent"], sw=6)
        _text(d, (int(cx - gr * 1.05), int(cy - gr * 0.45)), "?",
              _font("Montserrat-BlackItalic.ttf", int(w * 0.12)), b["accent"], sw=4)
        _text(d, (int(cx + gr * 0.5), int(cy + gr * 1.1)), "?",
              _font("Montserrat-BlackItalic.ttf", int(w * 0.1)), b["accent"], sw=4)
    elif b["symbol"] == "play":                          # streamers gameplay
        s = int(w * 0.2)
        d.polygon([(cx - s * 0.45, cy - s * 0.82), (cx - s * 0.45, cy + s * 0.82),
                   (cx + s * 1.0, cy)], fill=white)
    elif b["symbol"] == "mic":                           # streamers IRL (micrófono de estudio)
        _mic(d, cx, cy, int(w * 0.17), white)
    elif b["symbol"] == "bolt":                          # streamers gameplay (hype, no YT)
        _bolt(d, cx, cy, int(w * 0.24), b["accent"] if b["accent"] != (255, 255, 255) else white)
    img = img.resize((1080, 1080), Image.LANCZOS)
    p = OUT / key / "pfp.png"
    p.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(p)
    return p


def make_icon(key: str, b: dict) -> Path:
    w = 1080 * S
    img = _vignette(_gradient(w, w, b["c1"], b["c2"]), 0.5).convert("RGBA")
    d = ImageDraw.Draw(img)
    if b["symbol"] != "q":                               # estallido de energía detrás del símbolo
        _burst(img, w // 2, int(w * 0.36), int(w * 0.27), (*b["accent"][:3], 70))
        d = ImageDraw.Draw(img)
    # color del símbolo: el accent si no es blanco (invisible sobre el círculo), si no el de marca
    sym = b["accent"] if b["accent"] != (255, 255, 255) else b["c1"]
    _symbol(d, b["symbol"], w // 2, int(w * 0.36), int(w * 0.17), sym, _font("Montserrat-BlackItalic.ttf", int(w * 0.16)))
    # nombre grande
    big = b["name"] if b["symbol"] != "q" else b["name"]
    _text(d, (w // 2, int(w * 0.68)), b["big"] if b["symbol"] != "q" else b["name"],
          _font("Montserrat-BlackItalic.ttf", int(w * 0.14)), (255, 255, 255))
    # sub-nombre / región
    sub = big if b["symbol"] != "q" else b["tag"]
    if b["symbol"] != "q":
        _text(d, (w // 2, int(w * 0.80)), b["name"], _font("Montserrat-Bold.ttf", int(w * 0.075)), b["accent"], sw=4)
    img = img.resize((1080, 1080), Image.LANCZOS)
    p = OUT / key / "icon.png"
    p.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(p)
    return p


def make_watermark(key: str, b: dict) -> Path:
    """Watermark COMPACTA = badge circular con el símbolo del canal (estilo de la watermark
    'anterior' de soyelmalo), NO una banda larga de texto. Transparente fuera del círculo,
    con estallido de energía y aro blanco. Cuadrada (1:1) para que no salga alargada."""
    w = 480 * S
    base = _vignette(_gradient(w, w, b["c1"], b["c2"]), 0.3).convert("RGBA")
    cx = cy = w // 2
    r = int(w * 0.47)
    mask = Image.new("L", (w, w), 0)
    ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    img = Image.composite(base, Image.new("RGBA", (w, w), (0, 0, 0, 0)), mask)
    _burst(img, cx, cy, int(r * 0.9), (255, 255, 255, 60))     # energía
    d = ImageDraw.Draw(img)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 235), width=int(w * 0.03))
    _glyph(d, b["symbol"], cx, cy, int(r * 0.52), (255, 255, 255, 255))
    img = img.resize((480, 480), Image.LANCZOS)
    p = OUT / key / "watermark.png"
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p)
    return p


def make_banner(key: str, b: dict) -> Path:
    """Banner YT 2560x1440 (zona segura central 1546x423). Símbolo + texto como grupo
    centrado, midiendo el ancho del texto para que NO se pisen."""
    w, h = 2560, 1440
    img = _vignette(_gradient(w, h, b["c1"], b["c2"]), 0.45).convert("RGBA")
    d = ImageDraw.Draw(img)
    cy = h // 2
    sym = b["accent"] if b["accent"] != (255, 255, 255) else b["c1"]
    name = (b["big"] + " " + b["name"]).replace("\n", " ") if b["symbol"] != "q" else b["name"].replace("\n", " ")
    # achicar la fuente si el nombre es muy largo
    fs = 150
    font = _font("Montserrat-BlackItalic.ttf", fs)
    while d.textlength(name, font=font) > 1500 and fs > 70:
        fs -= 8
        font = _font("Montserrat-BlackItalic.ttf", fs)
    tw = d.textlength(name, font=font)
    r, gap = 140, 80
    x0 = (w - (2 * r + gap + tw)) // 2             # centra el grupo (símbolo+texto)
    _symbol(d, b["symbol"], int(x0 + r), cy, r, sym, _font("Montserrat-BlackItalic.ttf", r))
    tx = x0 + 2 * r + gap
    _text(d, (tx, cy - 34), name, font, (255, 255, 255), anchor="lm")
    _text(d, (tx + 6, cy + 74), b["tag"], _font("Montserrat-Bold.ttf", 50), b["accent"], anchor="lm", sw=3)
    p = OUT / key / "banner.png"
    p.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(p)
    return p


if __name__ == "__main__":
    for key, b in BRANDS.items():
        make_icon(key, b)
        make_pfp(key, b)
        make_watermark(key, b)
        make_banner(key, b)
        print(f"[branding] {key}: icon + pfp + watermark + banner -> branding/{key}/")
