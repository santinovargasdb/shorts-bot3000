"""Detección de la cara del streamer en el clip, para dos usos:

1. `facecam_crop`  -> recorte vertical 9:16 centrado en la cara (clips IRL/sin gameplay:
   el formato "solo cara" que funciona para charla/just-chatting y el nicho inglés).
2. layout gaming   -> `detect_face` da centro+tamaño de la cara; el pipeline arma un box
   de la facecam para el panel superior (cara arriba / gameplay al medio / negro abajo).

Usa FaceDetectorYN (DNN YuNet) de OpenCV 5. `detect_face` devuelve la cara ESTABLE
(cluster más frecuente) como (cx, cy, fw, fh, W, H) en px de la fuente, o None."""
from __future__ import annotations

import statistics as st
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "models" / "face_yunet.onnx"
MODEL_URL = ("https://github.com/opencv/opencv_zoo/raw/main/models/"
             "face_detection_yunet/face_detection_yunet_2023mar.onnx")


def _ensure_model() -> Path | None:
    if MODEL.exists():
        return MODEL
    try:
        import urllib.request
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL)
        return MODEL if MODEL.exists() else None
    except Exception:
        return None


def _collect(video_path, samples: int):
    """Detecta caras en `samples` frames. Devuelve (dets, W, H) o None."""
    import cv2

    model = _ensure_model()
    if not model:
        return None
    cap = cv2.VideoCapture(str(video_path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if W == 0 or H == 0:
        cap.release()
        return None
    det = cv2.FaceDetectorYN.create(str(model), "", (W, H), 0.6, 0.3, 50)

    dets: list[tuple[int, int, int, int]] = []
    n = max(samples, 1)
    for i in range(n):
        if total:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * (i + 0.5) / n))
        ok, frame = cap.read()
        if not ok:
            continue
        det.setInputSize((frame.shape[1], frame.shape[0]))
        try:
            _, faces = det.detect(frame)
        except Exception:
            faces = None
        if faces is None:
            continue
        for f in faces:
            x, y, w, h = f[:4]
            if w >= W / 22 and h >= H / 22:        # descartar caras diminutas (del juego)
                dets.append((int(x), int(y), int(w), int(h)))
    cap.release()
    return (dets, W, H)


def face_clusters(video_path, samples: int = 12):
    """Caras ESTABLES (cluster por celda 10x10) ordenadas por frecuencia:
    ([{cx,cy,fw,fh,n}, ...], W, H). Sirve para la cara principal (la 1ª) Y para CONTAR
    cuántas caras hay (muchas = watch-party / grilla multi-cam)."""
    from collections import defaultdict

    r = _collect(video_path, samples)
    if not r:
        return ([], 0, 0)
    dets, W, H = r
    if not dets:
        return ([], W, H)

    def cell(b):
        return (int((b[0] + b[2] / 2) / (W / 10)), int((b[1] + b[3] / 2) / (H / 10)))

    groups: dict = defaultdict(list)
    for b in dets:
        groups[cell(b)].append(b)
    out = [{"cx": st.median(b[0] + b[2] / 2 for b in cl),
            "cy": st.median(b[1] + b[3] / 2 for b in cl),
            "fw": st.median(b[2] for b in cl),
            "fh": st.median(b[3] for b in cl),
            "n": len(cl)} for cl in groups.values()]
    out.sort(key=lambda c: c["n"], reverse=True)
    return (out, W, H)


def detect_face(video_path, samples: int = 16):
    """(cx, cy, fw, fh, W, H) de la cara estable PRINCIPAL del streamer, o None."""
    clusters, W, H = face_clusters(video_path, samples)
    if not clusters or clusters[0]["n"] < 2:
        return None
    c = clusters[0]
    return (c["cx"], c["cy"], c["fw"], c["fh"], W, H)


def facecam_crop(cx: float, cy: float, fh: float, W: int, H: int,
                 target_ar: float = 9 / 16, face_zoom: float = 3.0,
                 face_at: float = 0.46) -> tuple[int, int, int, int]:
    """Recorte 9:16 centrado en la cara (cabeza + hombros + aire). `face_zoom`: alto del
    recorte = face_zoom * alto de la cara. `face_at`: posición vertical de la cara (0.46)."""
    crop_h = min(H, fh * face_zoom)
    crop_w = crop_h * target_ar
    if crop_w > W:                                 # no entra el 9:16 -> limitar por ancho
        crop_w, crop_h = float(W), W / target_ar
    x = max(0, min(cx - crop_w / 2, W - crop_w))
    y = max(0, min(cy - crop_h * face_at, H - crop_h))
    return (int(x), int(y), int(crop_w), int(crop_h))


def detect_facecam(video_path, samples: int = 16, target_ar: float = 9 / 16,
                   face_zoom: float = 3.0, face_at: float = 0.46):
    """Atajo: detecta la cara y devuelve directo el recorte 9:16 (o None)."""
    r = detect_face(video_path, samples)
    if not r:
        return None
    cx, cy, fw, fh, W, H = r
    return facecam_crop(cx, cy, fh, W, H, target_ar, face_zoom, face_at)
