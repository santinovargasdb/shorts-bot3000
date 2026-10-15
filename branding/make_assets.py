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
        "big": "CLIPS", "name": "HISPANOS", "tag": "LOS MEJORES MOMENTOS",
        "c1": (214, 36, 46), "c2": (26, 10, 12), "accent": (255, 255, 255), "symbol": "play",
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
    elif kind == "mic":                                  # micrófono simple
        mw, mh = r * 0.5, r * 0.78
        d.rounded_rectangle([cx - mw / 2, cy - mh, cx + mw / 2, cy + mh * 0.25],
                            radius=mw / 2, fill=color)
        d.arc([cx - mw, cy - mh * 0.2, cx + mw, cy + mh * 0.9], 20, 160, fill=color, width=max(5, r // 16))
        d.line([(cx, cy + mh * 0.6), (cx, cy + mh)], fill=color, width=max(5, r // 16))
        d.line([(cx - mw * 0.7, cy + mh), (cx + mw * 0.7, cy + mh)], fill=color, width=max(5, r // 16))
    else:                                                # "?!" (whatonearth)
        _text(d, (cx, cy), "?!", font_big, color, shadow=False)


def make_icon(key: str, b: dict) -> Path:
    w = 1080 * S
    img = _vignette(_gradient(w, w, b["c1"], b["c2"]), 0.5).convert("RGBA")
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
    """Watermark transparente (handle) para overlay en los videos. Blanco semi + sombra."""
    w, h = 900 * S, 200 * S
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    _text(d, (w // 2, h // 2), b["handle"], _font("Montserrat-BlackItalic.ttf", int(h * 0.5)),
          (255, 255, 255, 230), sw=5)
    img = img.resize((900, 200), Image.LANCZOS)
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
        make_watermark(key, b)
        make_banner(key, b)
        print(f"[branding] {key}: icon + watermark + banner -> branding/{key}/")
