"""Sourcing de clips de streamers vía yt-dlp (tier riesgoso aislado: TikTok/IG, infra propia).

Clave del canal = que el clip VAYA A PEGAR: un momento puntual disfrutable, no un rato
con muchas vistas donde no pasa nada. Combina 4 señales automáticas:

  1. Es un CLIP de Twitch, no un VOD -> ya es un humano marcando ese momento (curado).
  2. Pico de ENERGÍA de audio: risa/grito/hype. Si el audio es plano -> se descarta.
  3. LLM puntúa el TÍTULO: gracioso/épico/reacción vs genérico/aburrido.
  4. Views + duración ideal (corto) como peso de popularidad / formato.

Baja SIEMPRE en HD (1080p) -> la facecam queda nítida (ver [[tier-riesgoso-canales-clips]]).
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

_YTDLP = ["yt-dlp", "--no-warnings"]
_SEP = "|@|"
_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
       "Chrome/125.0 Safari/537.36")
LIST_LIMIT = 30          # clips a listar por streamer
TRY_TOP = 6              # candidatos a bajar+validar antes de rendirse
SPIKE_MIN = 1.25         # gate LENIENT: solo descarta audio muerto/plano. El juez de "momento
                         # interesante" es el LLM del título + views (no el audio).
DUR_MIN, DUR_MAX = 8.0, 60.0


def _run(cmd, timeout):
    return subprocess.run(cmd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)


def _s(t: str) -> str:
    """Título seguro para imprimir en consola Windows (cp1252)."""
    return (t or "")[:50].encode("ascii", "replace").decode()


def _list_twitch(streamer: str, period: str, limit: int) -> list[dict]:
    """Clips de Twitch vía yt-dlp (flat). `url` = página del clip (la baja yt-dlp)."""
    url = f"https://www.twitch.tv/{streamer}/clips?range={period}"
    fmt = _SEP.join(["%(id)s", "%(view_count)s", "%(duration)s", "%(title)s", "%(url)s"])
    try:
        r = _run([*_YTDLP, url, "--flat-playlist", "--playlist-end", str(limit), "--print", fmt], 150)
    except Exception:
        return []
    out = []
    for line in r.stdout.splitlines():
        parts = line.strip().split(_SEP)
        if len(parts) != 5:
            continue
        vid, views, dur, title, u = parts
        try:
            views = int(views)
        except ValueError:
            views = 0
        try:
            dur = float(dur)
        except ValueError:
            dur = 0.0
        if not vid or not u:
            continue
        out.append({"id": vid, "views": views, "duration": dur, "title": title, "url": u,
                    "streamer": streamer, "platform": "twitch", "title_score": 0.5})
    return out


def _kick_time(period: str) -> str:
    return {"7d": "week", "30d": "month", "90d": "month"}.get(period, "all")


def _list_kick(streamer: str, period: str, limit: int) -> list[dict]:
    """Clips de Kick vía su API JSON (muchos AR grandes se mudaron a Kick). `url` = m3u8
    (lo baja ffmpeg). Cloudflare deja pasar con User-Agent de navegador."""
    import urllib.request
    api = f"https://kick.com/api/v2/channels/{streamer}/clips?sort=view&time={_kick_time(period)}"
    try:
        req = urllib.request.Request(api, headers={"User-Agent": _UA})
        data = json.loads(urllib.request.urlopen(req, timeout=30).read())
    except Exception:
        return []
    out = []
    for c in (data.get("clips") or [])[:limit]:
        cid, m3u8 = str(c.get("id") or ""), c.get("clip_url") or ""
        if not cid or not m3u8:
            continue
        out.append({"id": cid, "views": int(c.get("views") or 0),
                    "duration": float(c.get("duration") or 0), "title": c.get("title") or "",
                    "url": m3u8, "streamer": streamer, "platform": "kick", "title_score": 0.5})
    return out


def list_clips(streamer: str, period: str = "30d", limit: int = LIST_LIMIT,
               platform: str = "twitch") -> list[dict]:
    """Top clips (por views) del streamer. platform: 'twitch' (yt-dlp) | 'kick' (API)."""
    return (_list_kick if platform == "kick" else _list_twitch)(streamer, period, limit)


def _extract_json(text: str) -> str:
    text = (text or "").strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    return m.group(0) if m else "{}"


_OK_SCORE = 0.65   # título que pasa el filtro (neutro-bueno); rankea por views/audio/duración


def score_titles(clips: list[dict], want: str = "gameplay", max_llm: int = 20) -> None:
    """El LLM NO puntúa calidad fina (los títulos de Twitch son crípticos: 'JAJAJA', 'guan
    yar'). Lo usa como FILTRO BINARIO: marca los que hay que SALTEAR (compilación, evento
    multi-streamer/watch-party, basura). Los saltea -> 0.0; el resto -> neutro-bueno."""
    top = clips[:max_llm]
    if not top:
        return
    try:
        from reddit_pipeline.rewrite import build_client, model_name
        client = build_client()
        listing = "\n".join(f"{i}. {c['title']!r}" for i, c in enumerate(top))
        foco = ("de GAMEPLAY (momentos de JUEGO: jugada, fail, grito jugando)" if want == "gameplay"
                else "de IRL/CHARLA (el streamer hablando a cámara, anécdotas, reacciones)"
                if want == "irl" else "de UN streamer")
        extra = ("- claramente CHARLA/REACCIÓN/IRL sin juego ('hablando de', 'opina sobre', "
                 "'reacciona a', 'entrevista', 'just chatting', 'contando');\n"
                 if want == "gameplay" else "")
        prompt = (
            f"Canal de clips {foco} para TikTok. Decime qué títulos hay que SALTEAR porque NO sirven:\n"
            "- recopilación/resumen/'histórico'/'lo mejor'/'top';\n"
            "- evento MULTI-STREAMER o watch-party (velada, 'todos', 'squad', among us con "
            "muchos jugadores);\n"
            f"{extra}"
            "- basura sin sentido ('a', 'asd', 'ggg').\n"
            "El resto NO se saltea (sirve aunque el título sea una risa o un chiste interno). "
            "Ante la duda, NO saltear. Respondé SOLO JSON con los índices a saltear:\n"
            '{"skip":[2,7]}\n\n' + listing)
        try:
            r = client.chat.completions.create(
                model=model_name(), temperature=0, max_tokens=1500, reasoning_effort="low",
                messages=[{"role": "user", "content": prompt}])
        except TypeError:                      # cliente sin soporte de reasoning_effort
            r = client.chat.completions.create(
                model=model_name(), temperature=0, max_tokens=1500,
                messages=[{"role": "user", "content": prompt}])
        data = json.loads(_extract_json(r.choices[0].message.content))
        skip = {int(i) for i in data.get("skip", []) if isinstance(i, (int, float))}
        for i, c in enumerate(top):
            c["title_score"] = 0.0 if i in skip else _OK_SCORE
    except Exception:
        pass   # sin LLM: todos quedan en 0.5 (neutro) y rankea por views/duración/audio


def _dur_fit(d: float) -> float:
    if 12 <= d <= 45:
        return 1.0
    if 8 <= d < 12 or 45 < d <= 60:
        return 0.6
    return 0.2


def rank(clips: list[dict]) -> list[dict]:
    """Excluye los que el LLM flageó (compilación/watch-party/basura: title_score 0.0) y
    ordena el resto por views (señal buena en CLIPS curados) + duración corta. El filtro de
    'no pasa nada' lo dan: curación de clip + LLM + pico de audio (gate al bajar)."""
    import math
    usable = [c for c in clips
              if DUR_MIN <= c["duration"] <= DUR_MAX and c.get("title_score", _OK_SCORE) > 0.0]
    if not usable:
        return []
    maxv = max((c["views"] for c in usable), default=1) or 1
    for c in usable:
        c["score"] = 0.65 * math.sqrt(c["views"] / maxv) + 0.35 * _dur_fit(c["duration"])
    return sorted(usable, key=lambda c: c["score"], reverse=True)


def download_hd(clip: dict, out: Path) -> bool:
    """Baja el clip en HD hasta 1080p (facecam nítida). True si OK. Kick = ffmpeg desde
    el m3u8; Twitch = yt-dlp desde la página del clip."""
    out = Path(out)
    for f in out.parent.glob(out.stem + ".*"):
        f.unlink(missing_ok=True)
    if clip.get("platform") == "kick":
        cmd = ["ffmpeg", "-y", "-user_agent", _UA, "-i", clip["url"], "-c", "copy",
               "-bsf:a", "aac_adtstoasc", str(out)]
    else:
        cmd = [*_YTDLP, clip["url"], "-S", "res:1080,fps,vbr,ext:mp4:m4a",
               "--merge-output-format", "mp4", "-o", str(out)]
    try:
        _run(cmd, 300)
    except Exception:
        return False
    return out.exists() and out.stat().st_size > 50_000


def audio_spike(path: Path) -> float:
    """Ratio (percentil 90 / mediana) de energía de audio. Alto = hay un momento
    (risa/grito/hype); ~1 = plano (no pasa nada). Reusa el RMS de find_highlights."""
    try:
        from src.highlights import _load_audio_rms
        import numpy as np
        rms, _ = _load_audio_rms(Path(path), window=0.5)
        if rms.size < 4:
            return 0.0
        base = float(np.median(rms))
        if base < 1e-4:                       # casi silencio de fondo -> usar media
            base = float(np.mean(rms)) or 1e-4
        return float(np.percentile(rms, 90) / base)
    except Exception:
        return 99.0                            # si no se puede medir, no bloquear


def is_watchparty(path, min_faces: int = 4, samples: int = 12) -> bool:
    """True si el clip es multi-cámara (grilla de streamers, tipo watch-party de Among Us):
    muchas caras estables = NO es un momento puntual de un streamer -> se descarta."""
    try:
        from src.facecrop import face_clusters
        clusters, _, _ = face_clusters(path, samples)
        stable = [c for c in clusters if c["n"] >= max(3, int(samples * 0.4))]
        return len(stable) >= min_faces
    except Exception:
        return False


def best_clip(streamer: str, workdir, used_ids=None, period: str = "30d",
              want: str = "gameplay", platform: str = "twitch",
              verbose: bool = True) -> dict | None:
    """Devuelve el mejor clip del streamer (listo en disco) que: no se usó, baja en HD y
    TIENE un pico de audio (algo pasa). dict con local_path/title/url/... o None."""
    used_ids = used_ids or set()
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)

    clips = [c for c in list_clips(streamer, period, platform=platform) if c["id"] not in used_ids]
    if not clips:
        if verbose:
            print(f"[streamers] {streamer}: sin clips nuevos en {period}")
        return None
    score_titles(clips, want=want)
    ordered = rank(clips)
    if verbose:
        print(f"[streamers] {streamer}: {len(ordered)} candidatos rankeados")

    out = workdir / f"tw_{streamer}.mp4"
    for cand in ordered[:TRY_TOP]:
        if not download_hd(cand, out):
            continue
        spike = audio_spike(out)
        if spike < SPIKE_MIN:                  # audio muerto/plano -> siguiente
            if verbose:
                print(f"[streamers]   descartado (audio plano {spike:.2f}): {_s(cand['title'])!r}")
            out.unlink(missing_ok=True)
            continue
        if is_watchparty(out):                 # grilla multi-cam -> no es momento puntual
            if verbose:
                print(f"[streamers]   descartado (watch-party/multi-cam): {_s(cand['title'])!r}")
            out.unlink(missing_ok=True)
            continue
        from streamers.verify import verify_source   # QC con visión del clip CRUDO (pre-render)
        src = verify_source(out, want=want, verbose=verbose)
        if src["ok"] is False:                 # NSFW / subs quemados / grilla / chat -> no renderizar
            if verbose:
                print(f"[streamers]   descartado (QC fuente: {src['problema'][:40]}): {_s(cand['title'])!r}")
            out.unlink(missing_ok=True)
            continue
        if verbose:
            print(f"[streamers]   ELEGIDO (spike {spike:.2f}, views {cand['views']}, "
                  f"score {cand['score']:.2f}): {_s(cand['title'])!r}")
        return {"local_path": out, "id": cand["id"], "title": cand["title"],
                "url": cand["url"], "streamer": streamer, "views": cand["views"]}
    if verbose:
        print(f"[streamers] {streamer}: ningún candidato pasó la validación")
    return None
