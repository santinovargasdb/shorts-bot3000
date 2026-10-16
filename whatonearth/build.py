"""Arma un video completo y lo deja en el backlog: temas -> clips legales -> render."""
from __future__ import annotations

import json
from pathlib import Path

from whatonearth import db, sourcing, sourcing_ytdlp, topics
import render_whatonearth

N_ITEMS = 6
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "whatonearth"
MUSIC = ROOT / "music" / "monkeys_spinning_monkeys.mp3"   # bed quirky estilo meme
CATEGORIES = ("place", "animal", "object")

_HASHTAGS = ("#shorts #whatisthis #satisfying #nature #animals #travel "
             "#didyouknow #fyp #viral #foryou")
_DISCLAIMER = "Clips belong to their respective creators. If a clip is yours, DM us for credit or removal."
_TITLE = {"place": "What place on earth is this?!",
          "animal": "What animal on earth is this?!",
          "object": "What on earth is this?!"}


def make_title(items: list, category: str = "object") -> str:
    head = items[0]["name"] if items else "this"
    return f"{_TITLE.get(category, _TITLE['object'])} \U0001F92F ({head} and more)"


def make_description(items: list) -> str:
    hook = "Wait... what on earth are these?! Can you name them all? \U0001F440"
    attribs = []
    for it in items:
        if it.get("author"):
            lic = f" — {it['license']}" if it.get("license") else ""
            attribs.append(f"- {it['name']}: {it['author']} ({it.get('source_url','')}){lic}")
    attrib_block = ("\n".join(attribs) + "\n\n") if attribs else ""
    return f"{hook}\n\n{attrib_block}{_HASHTAGS}\n\n{_DISCLAIMER}"


def collect_items(n: int, workdir, category: str = "object", *, _gen=None, _find=None,
                  max_rounds: int = 4) -> list:
    gen = _gen or (lambda count, cat, exclude: topics.generate_topics(count, cat, exclude))
    find = _find or (lambda q, wd: sourcing_ytdlp.find_clip(q, wd))
    items, used = [], set()
    rounds = 0
    while len(items) < n and rounds < max_rounds:
        rounds += 1
        for t in gen(n - len(items), category, used):
            used.add(t["name"])
            clip = find(t["query"], workdir)
            if not clip:
                continue
            # Lugares = nombres propios: sin artículo ("This is Lake Natron.", no "a Lake Natron").
            if category == "place":
                t = {**t, "answer_en": f"This is {t['name']}."}
            items.append({**t, **clip, "clip_path": clip["local_path"]})
            if len(items) >= n:
                break
    return items[:n]


def build_video(n: int = N_ITEMS, out_dir=OUT_DIR, conn=None, category: str | None = None) -> int | None:
    out_dir = Path(out_dir)
    work = out_dir / ".work"
    own = conn or db.connect()
    if conn is None:
        db.init(own)
    existing = db.all_videos(own)
    # Un video = UNA categoría; rotá entre place/animal/object por el nº de videos ya hechos.
    if category is None:
        category = CATEGORIES[len(existing) % len(CATEGORIES)]
    items = collect_items(n, work, category)
    if len(items) < n:
        print(f"[whatonearth] solo {len(items)}/{n} ítems ({category}) con clip; no se postea.")
        return None
    seq = (max([v["seq"] for v in existing], default=0)) + 1
    video_path = out_dir / f"woe_{seq:04d}.mp4"
    render_whatonearth.render(items, video_path, work, music=str(MUSIC))
    meta_items = [{"name": it["name"], "source": it.get("source"), "author": it.get("author"),
                   "license": it.get("license"), "source_url": it.get("source_url")} for it in items]
    title = make_title(items, category)
    description = make_description(meta_items)
    video_path.with_suffix(".json").write_text(
        json.dumps({"title": title, "description": description}, ensure_ascii=False),
        encoding="utf-8")
    real_seq = db.add_video(own, title=title, description=description,
                            video_path=str(video_path), items=meta_items)
    print(f"[whatonearth] video seq {real_seq} -> {video_path}")
    return real_seq
