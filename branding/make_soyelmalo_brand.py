"""Branding de '¿Soy el Malo?' v2: cronómetro de la familia 'En 60 Segundos' pero
con el MARCIANITO DE REDDIT REAL (Snoo) adentro, en naranja Reddit.
El Snoo se extrae de Downloads/images.png (chroma-key del fondo naranja) y se
compone dentro de la cara del reloj. Avatar / banner / watermark a Descargas.
Render a 2x y downscale para bordes suaves.

Uso:
  python make_soyelmalo_brand_v2.py snoo    # solo extrae el Snoo (debug)
  python make_soyelmalo_brand_v2.py         # genera los 3 assets
"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

SP = Path(__file__).resolve().parent
OUT = Path(r"C:\Users\accsoc\Downloads")          # los assets finales van a Descargas
SNOO_SRC = SP / "snoo_source.png"                 # el Snoo de Reddit (gitignoreado; marca)
BLACK = "C:/Windows/Fonts/ariblk.ttf"
BOLD = "C:/Windows/Fonts/arialbd.ttf"

ACCENT = (255, 69, 0)       # #FF4500 naranja Reddit
ACCENT2 = (255, 158, 110)   # naranja claro (ticks)
FACE = (24, 14, 10)         # cara del reloj (oscuro cálido)
WHITE = (247, 248, 250)
INK = (20, 12, 8)


def f(path, size):
    return ImageFont.truetype(path, size)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# ---------------------------------------------------------------- Snoo real
def extract_snoo() -> Image.Image:
    """Snoo BLANCO sobre transparente, recortado. Del logo naranja de Reddit:
    el fondo naranja (y los ojos/sonrisa, también naranjas) se vuelven
    transparentes; el cuerpo blanco queda opaco. El matte sale del canal AZUL
    (naranja B≈0, blanco B≈250), limitado a la caja del cuadrado naranja para
    no capturar el margen blanco de la imagen."""
    src = Image.open(SNOO_SRC).convert("RGB")
    r, g, b = src.split()
    # máscara del cuadrado naranja: R alto, G medio-bajo, B bajo
    mr = r.point(lambda v: 255 if v > 170 else 0)
    mg = g.point(lambda v: 255 if v < 150 else 0)
    mb = b.point(lambda v: 255 if v < 100 else 0)
    orange = ImageChops.multiply(ImageChops.multiply(mr, mg), mb)
    bbox = orange.getbbox()
    if bbox is None:
        raise RuntimeError("No encontré el cuadrado naranja en images.png")
    # sin pad: la caja naranja ya contiene la antena; sumar margen metería el
    # borde blanco de la imagen (que después se cuela como un marco tenue).
    crop = src.crop(bbox)
    _, _, cb = crop.split()
    # alpha desde el canal azul (matte suave): <45 -> 0, >175 -> 255
    alpha = cb.point(lambda v: 0 if v < 45 else (255 if v > 175 else int((v - 45) / 130 * 255)))
    # El cuadrado de Reddit es REDONDEADO: las 4 esquinas de la caja son margen
    # blanco de la imagen (B alto -> se colarían como un recuadro blanco). Las
    # recorto con una máscara de rectángulo redondeado (un poco inset + radio
    # generoso; lo que clippea de más son esquinas naranjas = ya transparentes).
    w, h = crop.size
    inset = int(0.03 * min(w, h))      # come el borde anti-aliased del cuadrado
    corner = Image.new("L", crop.size, 0)
    ImageDraw.Draw(corner).rounded_rectangle(
        [inset, inset, w - 1 - inset, h - 1 - inset],
        radius=int(0.23 * min(w, h)), fill=255)
    alpha = ImageChops.multiply(alpha, corner)
    snoo = Image.new("RGBA", crop.size, WHITE + (0,))
    snoo.putalpha(alpha)
    return snoo.crop(snoo.getbbox())      # recorte final ajustado al Snoo


SNOO = extract_snoo()


def fit_snoo(target_h: int) -> Image.Image:
    scale = target_h / SNOO.height
    return SNOO.resize((max(1, int(SNOO.width * scale)), target_h), Image.LANCZOS)


# ---------------------------------------------------------------- cronómetro
def draw_face(d, cx, cy, r):
    # botones laterales
    for ang in (-1, 1):
        d.rounded_rectangle([cx + ang * int(r * 0.92) - int(r * 0.09), cy - int(r * 0.80),
                             cx + ang * int(r * 0.92) + int(r * 0.09), cy - int(r * 0.52)],
                            radius=int(r * 0.07), fill=ACCENT)
    # corona superior (botón de arriba del cronómetro)
    d.rounded_rectangle([cx - int(r * 0.11), cy - int(r * 1.04),
                         cx + int(r * 0.11), cy - int(r * 0.80)],
                        radius=int(r * 0.08), fill=ACCENT)
    # anillo exterior naranja
    sw = max(8, int(r * 0.11))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ACCENT, width=sw)
    ri = r - sw
    # cara oscura
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=FACE)
    # ticks
    for k in range(12):
        a = math.radians(k * 30 - 90)
        d.line([cx + ri * 0.87 * math.cos(a), cy + ri * 0.87 * math.sin(a),
                cx + ri * 0.97 * math.cos(a), cy + ri * 0.97 * math.sin(a)],
               fill=ACCENT2, width=max(2, int(r * 0.028)))
    return ri


def icon_image(size, r):
    """Cronómetro con el Snoo real adentro, transparente, a 2x -> downscale."""
    S = size * 2
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = S // 2, int(S * 0.54)
    R = r * 2
    ri = draw_face(d, cx, cy, R)
    # Snoo dentro de la cara: alto ~1.5*ri para que entre con ears+antena.
    snoo = fit_snoo(int(ri * 1.52))
    # centrado horizontal; un toque abajo para dejar aire a la antena arriba.
    px = cx - snoo.width // 2
    py = cy + int(ri * 0.16) - snoo.height // 2
    img.alpha_composite(snoo, (px, py))
    return img.resize((size, size), Image.LANCZOS)


# ---------------------------------------------------------------- AVATAR
def make_avatar():
    S = 1024
    img = Image.new("RGB", (S, S))
    d = ImageDraw.Draw(img)
    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp((26, 13, 8), (64, 26, 12), y / S))
    for rr, al in ((470, 10), (380, 16)):
        d.ellipse([S // 2 - rr, S // 2 - rr, S // 2 + rr, S // 2 + rr],
                  outline=lerp((64, 26, 12), ACCENT, al / 100), width=5)
    icon = icon_image(760, 300)
    img.paste(icon, (S // 2 - 380, S // 2 - 380), icon)
    dest = OUT / "soyelmalo_avatar.png"
    img.save(dest)
    print(f"[OK] {dest.name}")


# ---------------------------------------------------------------- WATERMARK
def make_watermark():
    icon = icon_image(150, 60)
    sh = Image.new("RGBA", (150, 150), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    ds.ellipse([20, 28, 130, 140], fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    sh.alpha_composite(icon)
    dest = OUT / "watermark_soyelmalo.png"
    sh.save(dest)
    print(f"[OK] {dest.name}")


# ---------------------------------------------------------------- BANNER
def tw(draw, text, font, spacing=0):
    if spacing == 0:
        return draw.textlength(text, font=font)
    return sum(draw.textlength(c, font=font) for c in text) + spacing * (len(text) - 1)


def draw_tracked(draw, x, y, text, font, fill, spacing):
    for c in text:
        draw.text((x, y), c, font=font, fill=fill)
        x += draw.textlength(c, font=font) + spacing


def make_banner():
    W, H = 2560, 1440
    CX, CY = W // 2, H // 2
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp((22, 11, 6), (58, 24, 11), y / H))

    name = "¿SOY EL MALO?"
    tag = "Historias de Reddit que no vas a creer"
    cad = "HISTORIAS NUEVAS CADA DÍA"
    namef, tagf, cadf = f(BLACK, 115), f(BOLD, 44), f(BOLD, 32)
    TRACK = 2
    nh = 115

    name_w = tw(d, name, namef, spacing=TRACK)
    cad_w = tw(d, cad, cadf, spacing=3) + 64
    text_w = max(name_w, tw(d, tag, tagf), cad_w)

    # alturas reales de cada línea (ascender+descender) para espaciar sin encimar
    na, nd = namef.getmetrics(); name_h = na + nd
    ta, td = tagf.getmetrics(); tag_h = ta + td
    UL_H, PILL_H = 11, 60
    G1, G2, G3 = 22, 34, 34        # gaps: nombre→underline, underline→tag, tag→pildora
    block_h = name_h + G1 + UL_H + G2 + tag_h + G3 + PILL_H

    R = 155
    ICON = 460
    icon_half = int(R * 1.15)
    gap = 100
    group_w = 2 * icon_half + gap + text_w
    start_x = int(CX - group_w / 2)
    icon_cx = start_x + icon_half
    text_x = start_x + 2 * icon_half + gap
    ty = int(CY - block_h / 2)

    for rr, al in ((245, 13), (192, 19)):
        d.ellipse([icon_cx - rr, CY - rr, icon_cx + rr, CY + rr],
                  outline=lerp((58, 24, 11), ACCENT, al / 100), width=4)

    icon = icon_image(ICON, R)
    img.paste(icon, (icon_cx - ICON // 2, int(CY - ICON * 0.54)), icon)

    y = ty
    draw_tracked(d, text_x, y, name, namef, (255, 255, 255), TRACK)
    y += name_h + G1
    d.rounded_rectangle([text_x, y, text_x + int(name_w * 0.40), y + UL_H], radius=5, fill=ACCENT)
    y += UL_H + G2
    d.text((text_x, y), tag, font=tagf, fill=(226, 208, 198))
    y += tag_h + G3
    pill_w = tw(d, cad, cadf, spacing=3) + 64
    d.rounded_rectangle([text_x, y, text_x + int(pill_w), y + PILL_H], radius=PILL_H // 2, fill=ACCENT)
    draw_tracked(d, text_x + 32, y + (PILL_H - cadf.size) // 2 - 2, cad, cadf, INK, 3)

    dest = OUT / "banner_soyelmalo.png"
    img.save(dest)
    print(f"[OK] {dest.name}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "snoo":
        # debug: Snoo recortado sobre cuadros, para revisar el matte
        chk = Image.new("RGBA", SNOO.size, (0, 0, 0, 0))
        dd = ImageDraw.Draw(chk)
        cs = 24
        for yy in range(0, SNOO.height, cs):
            for xx in range(0, SNOO.width, cs):
                if ((xx // cs) + (yy // cs)) % 2:
                    dd.rectangle([xx, yy, xx + cs, yy + cs], fill=(90, 90, 90, 255))
        chk.alpha_composite(SNOO)
        p = SP / "snoo_check.png"
        chk.convert("RGB").save(p)
        print(f"[debug] Snoo recortado -> {p}  (size {SNOO.size})")
    else:
        make_avatar()
        make_watermark()
        make_banner()
        print("\nListo. Todo en Descargas.")
