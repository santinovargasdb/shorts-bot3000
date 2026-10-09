"""Tarjeta de post de Reddit (modo claro, estilo screenshot del MOBILE) para la
APERTURA de los videos de '¿Soy el Malo?'. Devuelve un PNG transparente (tarjeta
blanca redondeada + sombra) que el motor superpone arriba los primeros segundos y
después desvanece. Avatar = Snoo de la marca.

Fiel al card real del app de Reddit: header (icono + r/sub · tiempo + botón Unirse +
u/usuario), título en semibold (Segoe UI, no Arial Black), fila de awards, y barra de
acciones en PILLS grises (voto ⬆conteo⬇, comentarios, compartir). Estilizada (no la UI
exacta) para esquivar el trademark.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
_SNOO = ROOT / "branding" / "snoo_source.png"
_INK = (26, 26, 27)
_GRAY = (129, 131, 132)
_WHITE = (255, 255, 255)
_PILL = (237, 239, 241)       # gris de los pills (acciones)
_ORANGE = (255, 69, 0)        # upvote activo
_BLUE = (0, 121, 211)         # botón Unirse (azul Reddit)


def human(n: int) -> str:
    n = int(n or 0)
    return str(n) if n < 1000 else f"{n / 1000:.1f}k".replace(".0k", "k")


def _ff(names, size):
    for n in names:
        p = Path("C:/Windows/Fonts") / n
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def _semibold(s):  # título y subreddit (peso medio, como Reddit)
    return _ff(["seguisb.ttf", "segoeuisb.ttf", "arialbd.ttf"], s)


def _regular(s):   # meta (u/usuario · tiempo)
    return _ff(["segoeui.ttf", "arial.ttf"], s)


def _wrap(draw, text, font, maxw):
    words, lines, cur = (text or "").split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines


def _snoo_avatar(d):
    src = Image.open(_SNOO).convert("RGBA").resize((d, d), Image.LANCZOS)
    mask = Image.new("L", (d, d), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, d, d], fill=255)
    av = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    av.paste(src, (0, 0), mask)
    return av


def render_card(out_path, *, subreddit, title, upvotes, comments,
                username="u/anon", width=980):
    pad = 38
    inner = width - 2 * pad
    f_sub, f_title, f_cnt = _semibold(31), _semibold(47), _semibold(29)
    f_meta, f_join = _regular(27), _semibold(27)
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    tlines = _wrap(probe, title, f_title, inner)
    line_h = int(f_title.size * 1.2)
    av_d = 68
    pill_h = 58
    height = pad + av_d + 26 + len(tlines) * line_h + 16 + pill_h + pad

    card = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, width - 1, height - 1], radius=30, fill=_WHITE)

    # ── header: avatar + r/sub · tiempo + Unirse ; u/usuario debajo
    card.alpha_composite(_snoo_avatar(av_d), (pad, pad))
    tx = pad + av_d + 18
    d.text((tx, pad), f"r/{subreddit}", font=f_sub, fill=_INK)
    subw = d.textlength(f"r/{subreddit}", font=f_sub)
    d.text((tx + subw + 10, pad + 3), "· 7 h", font=f_meta, fill=_GRAY)
    d.text((tx, pad + 36), username, font=f_meta, fill=_GRAY)
    # botón Unirse (pill azul, derecha)
    jtxt = "Unirse"
    jw = int(d.textlength(jtxt, font=f_join)) + 44
    jx = width - pad - jw
    d.rounded_rectangle([jx, pad + 2, jx + jw, pad + 2 + 46], radius=23, fill=_BLUE)
    d.text((jx + 22, pad + 11), jtxt, font=f_join, fill=_WHITE)

    # ── título (semibold)
    y = pad + av_d + 26
    for ln in tlines:
        d.text((pad, y), ln, font=f_title, fill=_INK)
        y += line_h

    # ── barra de acciones en pills grises (ícono + texto centrados, con aire)
    ay = y + 16
    cy = ay + pill_h // 2
    PADX, GAP, TRI = 28, 16, 22
    DARK = (80, 82, 84)

    def _tri(x, up, color):
        if up:
            d.polygon([(x, cy + 9), (x + TRI, cy + 9), (x + TRI / 2, cy - 11)], fill=color)
        else:
            d.polygon([(x, cy - 9), (x + TRI, cy - 9), (x + TRI / 2, cy + 11)], fill=color)

    # pill de votos: ▲ conteo ▼
    up = human(upvotes); upw = int(d.textlength(up, font=f_cnt))
    vw = PADX + TRI + GAP + upw + GAP + TRI + PADX
    d.rounded_rectangle([pad, ay, pad + vw, ay + pill_h], radius=pill_h // 2, fill=_PILL)
    x = pad + PADX
    _tri(x, True, _ORANGE); x += TRI + GAP
    d.text((x, cy), up, font=f_cnt, fill=_ORANGE, anchor="lm"); x += upw + GAP
    _tri(x, False, _GRAY)
    # pill de comentarios: burbuja + conteo
    cx0 = pad + vw + 18
    cm = human(comments); cmw = int(d.textlength(cm, font=f_cnt)); BUB = 30
    cw = PADX + BUB + GAP + cmw + PADX
    d.rounded_rectangle([cx0, ay, cx0 + cw, ay + pill_h], radius=pill_h // 2, fill=_PILL)
    x = cx0 + PADX
    d.rounded_rectangle([x, cy - 14, x + BUB, cy + 4], radius=6, outline=DARK, width=4)
    d.polygon([(x + 7, cy + 4), (x + 17, cy + 4), (x + 7, cy + 15)], fill=DARK)
    d.text((x + BUB + GAP, cy), cm, font=f_cnt, fill=DARK, anchor="lm")
    # pill de compartir: flecha arriba-derecha + texto
    sx0 = cx0 + cw + 18
    shw = int(d.textlength("Compartir", font=f_cnt)); ARR = 24
    sw = PADX + ARR + GAP + shw + PADX
    d.rounded_rectangle([sx0, ay, sx0 + sw, ay + pill_h], radius=pill_h // 2, fill=_PILL)
    x = sx0 + PADX
    d.line([(x, cy + 10), (x + ARR, cy - 10)], fill=DARK, width=5)
    d.line([(x + ARR - 13, cy - 10), (x + ARR, cy - 10)], fill=DARK, width=5)
    d.line([(x + ARR, cy - 10), (x + ARR, cy + 1)], fill=DARK, width=5)
    d.text((x + ARR + GAP, cy), "Compartir", font=f_cnt, fill=DARK, anchor="lm")

    # ── sombra + canvas transparente
    m = 28
    out = Image.new("RGBA", (width + 2 * m, height + 2 * m), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([m, m + 8, m + width, m + 8 + height],
                                         radius=30, fill=(0, 0, 0, 110))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(15)))
    out.alpha_composite(card, (m, m))
    out_path = Path(out_path)
    out.save(out_path)
    return out_path
