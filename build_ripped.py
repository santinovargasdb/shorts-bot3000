"""Ensamblado MANUAL de videos 'What On Earth Is This' con footage RIPEADO
(clips reales que VOS elegís/conseguís). SOLO para TikTok/IG, posteo a mano.

NO entra al pipeline automático (daily_post) ni a YouTube: deja el mp4 + un
caption.txt en output/whatonearth_ripped/ para que lo subas vos. Cada clip lleva
su crédito en el caption + disclaimer de cortesía. El disclaimer NO da protección
legal: la responsabilidad del origen de los clips es tuya.

Uso:
  1) Poné tus clips en una carpeta y escribí un manifest JSON (ver
     whatonearth/ripped_manifest_example.json). Por ítem: name, clip (ruta
     relativa al manifest), credit (crédito del autor/fuente), y opcional
     question/answer para override.
  2) python build_ripped.py mi_manifest.json
  3) Te deja output/whatonearth_ripped/ripped_NNN.mp4 + .caption.txt
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import render_whatonearth

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "whatonearth_ripped"

# Preguntas con variedad (se rotan por índice) y adaptadas a la categoría.
_Q = {
    "place": ["Wait... where on earth is this?", "Hold on, what place is this?",
              "No way... where is this?", "What place is this?!",
              "Okay, where on earth is this?", "And this place?"],
    "animal": ["Hold on, what animal is this?", "No way, what is this creature?",
               "Wait, what animal is this?", "What is this thing?!",
               "And what animal is this?", "Okay... what is this one?"],
    "object": ["Wait, what on earth is this?", "Hold on, what is this?",
               "No way... what is this thing?", "What is this?!",
               "And what is this?", "Okay, what is this one?"],
}
_TITLE = {"place": "What place on earth is this?!",
          "animal": "What animal on earth is this?!",
          "object": "What on earth is this?!"}
_HASHTAGS = ("#shorts #whatisthis #satisfying #nature #animals #travel "
             "#didyouknow #fyp #viral #foryou")


def manifest_to_items(man: dict, base_dir) -> tuple[str, list]:
    """Mapea el manifest del usuario a los ítems que consume el renderer."""
    category = man.get("category", "object")
    qpool = _Q.get(category, _Q["object"])
    base = Path(base_dir)
    items = []
    for i, it in enumerate(man["items"]):
        items.append({
            "name": it["name"],
            "question_en": it.get("question") or qpool[i % len(qpool)],
            "answer_en": it.get("answer") or f"This is {it['name']}.",
            "clip_path": str((base / it["clip"]).resolve()),
            "credit": it.get("credit", "(uncredited)"),
        })
    return category, items


def build_caption(category: str, items: list) -> str:
    """Caption para pegar al subir a mano: título + gancho + hashtags + créditos + disclaimer."""
    head = items[0]["name"] if items else "this"
    title = f"{_TITLE.get(category, _TITLE['object'])} \U0001F92F ({head} and more)"
    hook = "Wait... what on earth are these?! Can you name them all? \U0001F440"
    credits = "\n".join(f"- {it['name']}: {it.get('credit', '(uncredited)')}" for it in items)
    return (f"{title}\n\n{hook}\n\n{_HASHTAGS}\n\n"
            f"Credits:\n{credits}\n\n"
            "If a clip is yours, DM us for credit or removal.")


def main(manifest_path: str) -> Path:
    mp = Path(manifest_path)
    man = json.loads(mp.read_text(encoding="utf-8"))
    category, items = manifest_to_items(man, mp.parent)
    OUT.mkdir(parents=True, exist_ok=True)
    n = len(list(OUT.glob("ripped_*.mp4"))) + 1
    out_mp4 = OUT / f"ripped_{n:03d}.mp4"
    render_whatonearth.render(items, out_mp4, OUT / ".work")
    caption = build_caption(category, items)
    out_mp4.with_suffix(".caption.txt").write_text(caption, encoding="utf-8")
    print("VIDEO  ->", out_mp4)
    print("CAPTION->", out_mp4.with_suffix(".caption.txt"))
    print("\n--- CAPTION (pegá esto al subir a mano a TikTok/IG) ---\n")
    print(caption)
    return out_mp4


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "manifest.json")
