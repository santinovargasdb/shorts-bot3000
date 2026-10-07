"""CLI del pipeline de Reddit ('¿Soy el Malo?').

Uso:
  python -m reddit_pipeline source        # trae posts nuevos a la DB
  python -m reddit_pipeline filter         # calcula viral_score y marca filtered/rejected
  python -m reddit_pipeline rewrite [N]    # reescribe hasta N historias filtered (default 5)
  python -m reddit_pipeline run [N]        # source + filter + rewrite
  python -m reddit_pipeline dump [N]       # imprime los guiones rewritten para validar calidad
"""
from __future__ import annotations

import sys

from . import db, arctic, scoring, rewrite
from .constants import DB_PATH, SUBREDDITS


def cmd_source(db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    try:
        posts = arctic.fetch_posts_arctic(SUBREDDITS)
        nuevos = sum(db.insert_story(conn, p) for p in posts)
        print(f"[source] {len(posts)} traidos de Arctic Shift, {nuevos} nuevos (dedup).")
    finally:
        conn.close()


def cmd_filter(db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    try:
        pend = db.get_by_status(conn, "sourced")
        ok = 0
        for p in pend:
            s = scoring.viral_score(p)
            db.save_viral_score(conn, p["id"], s, "filtered" if s > 0 else "rejected")
            ok += s > 0
        print(f"[filter] {len(pend)} evaluados, {ok} pasaron.")
    finally:
        conn.close()


def cmd_rewrite(n: int, db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    try:
        client, model = rewrite.build_client(), rewrite.model_name()
        hechos = 0
        for p in db.get_by_status(conn, "filtered")[:n]:
            try:
                rw = rewrite.rewrite_story(p, client, model)
                db.save_rewrite(conn, p["id"], rw)
                hechos += 1
                print(f"  [ok] {p['id']} ({rw['narrador_genero']}) {rw['titulo']}")
            except Exception as e:
                print(f"  [skip] {p['id']}: {e}")
        print(f"[rewrite] {hechos} reescritas.")
    finally:
        conn.close()


def cmd_dump(n: int, db_path=DB_PATH) -> None:
    conn = db.connect(db_path)
    try:
        for p in db.get_by_status(conn, "rewritten")[:n]:
            print("=" * 60)
            print(f"{p['titulo_es']}  [{p['narrador_genero']}]  "
                  f"(r/{p['subreddit']}, score {p['score']})")
            print("-" * 60)
            print(p["guion"])
            print(f"\n[veredicto] {p['veredicto']}\n[cierre] {p['cierre']}")
    finally:
        conn.close()


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else "run"
    try:
        n = int(argv[2]) if len(argv) > 2 else 5
    except ValueError:
        print("N debe ser un entero (ej: python -m reddit_pipeline rewrite 5)")
        return 1
    if cmd == "source":
        cmd_source()
    elif cmd == "filter":
        cmd_filter()
    elif cmd == "rewrite":
        cmd_rewrite(n)
    elif cmd == "dump":
        cmd_dump(n)
    elif cmd == "run":
        cmd_source()
        cmd_filter()
        cmd_rewrite(n)
    else:
        print(f"Comando desconocido: {cmd}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
