"""Publica un episodio animado (anim3d/out/<ep>/final.mp4) en las plataformas de su canal, FUERA de la fila.

    python -m anim3d.publicar eiffel            (todas las plataformas del canal)
    python -m anim3d.publicar eiffel --only yt  (una sola: yt o ig)

Los episodios animados se hacen a mano y no están en la serie del canal, así que no pasan por daily_post:
se suben directo con los mismos subidores y credenciales. No toca el contador de la fila (el posteo diario
sigue igual). Lo publicado queda anotado en anim3d/out/<ep>/publicado.json y NO se vuelve a subir.
El guion trae lo que se publica: "publicar": {"titulo", "resumen"} (si falta, usa "titulo" y "resumen").
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

import daily_post as dp
from channels_registry import get_channel, load_series
from src.faceless import _slug

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def preparar(episode: str) -> tuple[Path, str, dict, object]:
    """Deja el video listo para los subidores: copia final.mp4 a output/<canal>/<slug>.mp4 con su .json
    (título, descripción del canal con nuestro resumen y la fuente, hashtags). Lo usan publicar() y la cola
    diaria (anim3d/cola.py). Devuelve (video, título, ctx del canal, serie)."""
    guion = json.loads((HERE / "episodes" / episode / "guion.json").read_text(encoding="utf-8"))
    ctx = get_channel(guion["canal"])
    series = load_series(ctx)
    final = HERE / "out" / episode / "final.mp4"
    if not final.exists():
        raise FileNotFoundError(f"Falta {final}: renderizar y correr anim3d.armar antes")
    pub = guion.get("publicar", {})
    titulo = f"{pub.get('titulo') or guion['titulo']} | {ctx['display']}"[:100]
    partes = series.descripcion(0, "@@").split("\n\n")            # mismo bloque del canal, con nuestro resumen
    # fuera el renglón del número de episodio y los que nombran otra parte ("no te pierdas la Parte 1")
    partes = [p for p in partes if "@@" not in p and not re.search(r"\b(Parte|Episodio) \d", p)]
    cuerpo = [partes[0], f"📌 {pub.get('resumen') or guion['resumen']}", *partes[1:]]
    if guion.get("fuente"):
        cuerpo.insert(2, "📚 Fuente: " + guion["fuente"].split(" (")[0])
    # Copia con nombre propio en la carpeta del canal + su .json: de ahí leen título y descripción los subidores.
    video = ROOT / "output" / ctx["engine_channel"] / f"{_slug(pub.get('titulo') or guion['titulo'])}.mp4"
    video.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(final, video)
    video.with_suffix(".json").write_text(json.dumps({"title": titulo, "description": "\n\n".join(cuerpo),
        "hashtags": list(series.KEYWORDS), "language": getattr(series, "LANGUAGE", "es")}, ensure_ascii=False), encoding="utf-8")
    return video, titulo, ctx, series


def publicar(episode: str, only: str | None = None) -> dict:
    video, titulo, ctx, series = preparar(episode)
    guion = json.loads((HERE / "episodes" / episode / "guion.json").read_text(encoding="utf-8"))
    log_file = HERE / "out" / episode / "publicado.json"
    hecho = json.loads(log_file.read_text(encoding="utf-8")) if log_file.exists() else {}

    def anotar(plataforma: str, dato: dict) -> None:
        hecho[plataforma] = {**dato, "date": f"{datetime.now():%Y-%m-%d %H:%M}", "titulo": titulo}
        log_file.write_text(json.dumps(hecho, ensure_ascii=False, indent=2), encoding="utf-8")

    if "yt" in ctx["platforms"] and only in (None, "yt"):
        if "youtube" in hecho:
            print("[YT] ya publicado:", hecho["youtube"])
        else:
            from uploaders.youtube_upload import upload_from_folder
            try:
                vid = upload_from_folder(video, privacy=dp.YT_PRIVACY, token_file=ctx["yt_token"])
                anotar("youtube", {"video_id": vid, "url": f"https://youtube.com/shorts/{vid}"})
                dp._log(ctx, f"[YT] ✅ Episodio animado '{episode}': https://youtube.com/shorts/{vid}")
            except Exception as e:
                print(f"[YT] ⚠️ No se pudo subir: {e}")

    if "ig" in ctx["platforms"] and only in (None, "ig"):
        if "instagram" in hecho:
            print("[IG] ya publicado:", hecho["instagram"])
        else:
            state = dp._load_state()
            try:
                dp._refresh_ig_token(state[guion["canal"]], ctx)
                dp._save_state(state, guion["canal"])
                creds = dp._ig_creds(ctx)
                if not creds:
                    raise RuntimeError("sin credenciales de Instagram para el canal")
                from src.gh_release import upload as gh_upload
                from uploaders.instagram_upload import post_comment, publish_reel
                media_id = publish_reel(gh_upload(video), caption=dp._ig_caption(video),
                                        ig_user_id=creds["user_id"], access_token=creds["access_token"])
                anotar("instagram", {"media_id": media_id})
                dp._log(ctx, f"[IG] ✅ Episodio animado '{episode}': Reel {media_id}")
                if ctx.get("first_comment"):
                    try:
                        post_comment(media_id, ctx["first_comment"], access_token=creds["access_token"])
                    except Exception as e:
                        print(f"[IG] el Reel salió, pero no el primer comentario: {e}")
            except Exception as e:
                print(f"[IG] ⚠️ No se pudo publicar: {e}")
    return hecho


if __name__ == "__main__":
    for _st in (sys.stdout, sys.stderr):
        try:
            _st.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    a = sys.argv[1:]
    print(json.dumps(publicar(a[0], only=a[a.index("--only") + 1] if "--only" in a else None), ensure_ascii=False, indent=2))
