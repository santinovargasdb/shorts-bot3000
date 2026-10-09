"""Arma un video completo y lo deja en el backlog: temas -> clips legales -> render."""
from __future__ import annotations

import json
from pathlib import Path

from whatonearth import db, sourcing, topics
import render_whatonearth

N_ITEMS = 6
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "whatonearth"

_HASHTAGS = ("#shorts #whatisthis #satisfying #nature #animals #travel "
             "#didyouknow #fyp #viral #foryou")
_DISCLAIMER = "Clips via Pixabay/Pexels/Wikimedia Commons. If a clip is yours, DM us for credit or removal."


def make_title(items: list) -> str:
    head = items[0]["name"] if items else "this"
    return f"What on earth is this?! \U0001F92F ({head} and more)"


def make_description(items: list) -> str:
    hook = "Wait... what on earth are these?! Can you name them all? \U0001F440"
    attribs = []
    for it in items:
        if it.get("source") in ("wikimedia",) and (it.get("author") or it.get("license")):
            attribs.append(f"- {it['name']}: {it.get('author','?')} / {it.get('license','')} ({it.get('source_url','')})")
    attrib_block = ("\n".join(attribs) + "\n\n") if attribs else ""
    return f"{hook}\n\n{attrib_block}{_HASHTAGS}\n\n{_DISCLAIMER}"


def collect_items(n: int, workdir, *, _gen=None, _find=None, max_rounds: int = 4) -> list:
    gen = _gen or (lambda count, exclude: topics.generate_topics(count, exclude))
    find = _find or (lambda q, wd: sourcing.find_clip(q, wd))
    items, used = [], set()
    rounds = 0
    while len(items) < n and rounds < max_rounds:
        rounds += 1
        for t in gen(n - len(items), used):
            used.add(t["name"])
            clip = find(t["query"], workdir)
            if not clip:
                continue
            items.append({**t, **clip, "clip_path": clip["local_path"]})
            if len(items) >= n:
                break
    return items[:n]


def build_video(n: int = N_ITEMS, out_dir=OUT_DIR, conn=None) -> int | None:
    out_dir = Path(out_dir)
    work = out_dir / ".work"
    items = collect_items(n, work)
    if len(items) < n:
        print(f"[whatonearth] solo {len(items)}/{n} ítems con clip; no se postea.")
        return None
    own = conn or db.connect()
    if conn is None:
        db.init(own)
    seq = (max([v["seq"] for v in db.all_videos(own)], default=0)) + 1
    video_path = out_dir / f"woe_{seq:04d}.mp4"
    render_whatonearth.render(items, video_path, work)
    meta_items = [{"name": it["name"], "source": it.get("source"), "author": it.get("author"),
                   "license": it.get("license"), "source_url": it.get("source_url")} for it in items]
    title = make_title(items)
    description = make_description(meta_items)
    video_path.with_suffix(".json").write_text(
        json.dumps({"title": title, "description": description}, ensure_ascii=False),
        encoding="utf-8")
    real_seq = db.add_video(own, title=title, description=description,
                            video_path=str(video_path), items=meta_items)
    print(f"[whatonearth] video seq {real_seq} -> {video_path}")
    return real_seq
