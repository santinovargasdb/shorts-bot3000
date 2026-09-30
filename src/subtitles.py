"""Genera un archivo .ass de subtítulos estilo "karaoke" (palabra resaltada).

Muestra 1-4 palabras a la vez, grandes y centradas, resaltando en color la
palabra que se está diciendo. Es el estilo que retiene atención en Shorts.

Todo se calcula sobre un lienzo de target_width x target_height (px reales).
"""
from __future__ import annotations

from pathlib import Path

from .transcribe import Word


def _fmt_time(t: float) -> str:
    """Segundos -> H:MM:SS.cc (formato ASS)."""
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _wrap(text: str, max_chars: int = 16) -> str:
    """Parte un texto en líneas (\\N de ASS) por palabras, ~max_chars por línea."""
    out, line = [], ""
    for word in text.split():
        if line and len(line) + 1 + len(word) > max_chars:
            out.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    if line:
        out.append(line)
    return "\\N".join(out)


def _group_words(words: list[Word], max_words: int, max_chars: int,
                 boundaries: list[float] | None = None) -> list[list[Word]]:
    """Agrupa palabras en líneas cortas (por nº de palabras o longitud).
    `boundaries`: tiempos de inicio de cada segmento; ningún renglón cruza un
    límite (evita mezclar el final de un dato con el inicio del siguiente)."""
    import bisect

    def seg_of(t: float) -> int:
        return bisect.bisect_right(boundaries, t + 1e-3) if boundaries else 0

    groups: list[list[Word]] = []
    current: list[Word] = []
    char_count = 0
    cur_seg = None
    for w in words:
        wlen = len(w.text) + 1
        wseg = seg_of(w.start)
        cross = bool(current) and boundaries is not None and wseg != cur_seg
        if current and (cross or len(current) >= max_words or char_count + wlen > max_chars):
            groups.append(current)
            current, char_count = [], 0
        if not current:
            cur_seg = wseg
        current.append(w)
        char_count += wlen
    if current:
        groups.append(current)
    return groups


def build_ass(
    words: list[Word],
    out_path: Path | str,
    caption: dict,
    target_width: int,
    target_height: int,
    offset: float = 0.0,
    max_words: int = 3,
    max_chars: int = 18,
    hook_text: str = "",
    clip_duration: float | None = None,
    center_title: str = "",
    center_start: float = 0.0,
    center_end: float = 0.0,
    boundaries: list[float] | None = None,
) -> Path:
    """Escribe el .ass. `offset` resta el tiempo de inicio del clip. `hook_text`
    pinta un texto fijo arriba todo el clip. `center_title` pinta un título
    grande al centro entre [center_start, center_end] (para el momento del título)."""
    out_path = Path(out_path)
    font = caption.get("font", "Arial Black")
    size = int(caption.get("font_size", 90))
    primary = caption.get("primary_color", "&H00FFFFFF")
    highlight = caption.get("highlight_color", "&H0000F0FF")
    outline = caption.get("outline", 3)
    shadow = caption.get("shadow", 1)
    margin_v = caption.get("margin_v", 260)
    uppercase = caption.get("uppercase", True)
    hook_size = int(size * 0.62)   # más chico para que el título entre y pueda envolver
    title_size = int(size * 1.15)  # título grande centrado (momento del título)

    # Estilos: Cap (abajo-centro) y Hook (arriba-centro). Colores se pisan inline.
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {target_width}
PlayResY: {target_height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{size},{primary},&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,{outline},{shadow},2,60,60,{margin_v},1
Style: Hook,{font},{hook_size},{primary},&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,{outline},{shadow},8,60,60,180,1
Style: Titulo,{font},{title_size},{highlight},&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,{outline+3},{shadow},5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = [header]

    # Gancho fijo arriba durante todo el clip
    if hook_text and clip_duration and clip_duration > 0:
        htxt = (hook_text.upper() if uppercase else hook_text)
        htxt = htxt.replace("{", "(").replace("}", ")")
        htxt = _wrap(htxt, max_chars=16)   # parte el título en varias líneas
        lines.append(
            f"Dialogue: 0,{_fmt_time(0)},{_fmt_time(clip_duration)},Hook,,0,0,0,,{htxt}\n"
        )

    # Título grande centrado durante su ventana (momento del título)
    if center_title and center_end > center_start:
        ttxt = (center_title.upper() if uppercase else center_title)
        ttxt = ttxt.replace("{", "(").replace("}", ")")
        ttxt = _wrap(ttxt, max_chars=14)
        lines.append(
            f"Dialogue: 0,{_fmt_time(center_start)},{_fmt_time(center_end)},Titulo,,0,0,0,,{ttxt}\n"
        )

    groups = _group_words(words, max_words, max_chars, boundaries=boundaries)

    for gi, group in enumerate(groups):
        # Fin del grupo: hasta el arranque del siguiente grupo (línea persistente)
        group_end = (
            groups[gi + 1][0].start if gi + 1 < len(groups) else group[-1].end + 0.4
        )
        for wi, w in enumerate(group):
            start = w.start - offset
            end = (group[wi + 1].start if wi + 1 < len(group) else group_end) - offset
            if end <= start:
                end = start + 0.15
            if end <= 0:
                continue
            start = max(0.0, start)

            # Reconstruye la línea; la palabra activa va en highlight_color
            parts = []
            for j, gw in enumerate(group):
                token = gw.text.upper() if uppercase else gw.text
                token = token.replace("{", "(").replace("}", ")")  # proteger llaves ASS
                if j == wi:
                    parts.append(f"{{\\c{highlight}}}{token}{{\\c{primary}}}")
                else:
                    parts.append(token)
            text = " ".join(parts)
            lines.append(
                f"Dialogue: 0,{_fmt_time(start)},{_fmt_time(end)},Cap,,0,0,0,,{text}\n"
            )

    out_path.write_text("".join(lines), encoding="utf-8")
    return out_path
