"""Helpers puros del render de whatonearth (sin ffmpeg): la lista de audio por ítem (con/sin
dato) y el filtro de video (con/sin banda satisfactoria abajo)."""
import render_whatonearth as rw


def test_audio_files_sin_dato():
    # pregunta -> gap de suspenso -> respuesta (como siempre)
    assert rw._audio_files(0, has_fact=False) == ["q0.mp3", "gap.mp3", "a0.mp3"]


def test_audio_files_con_dato():
    # ...y después de la respuesta, un gap corto + el dato que llena el silencio
    assert rw._audio_files(2, has_fact=True) == [
        "q2.mp3", "gap.mp3", "a2.mp3", "gapf.mp3", "f2.mp3"]


def test_vf_sin_satisfying_no_tiene_banda():
    vf = rw._vf("smart", satisfy=False)
    assert "[2:v]" not in vf and "overlay=0:1120" not in vf


def test_vf_con_satisfying_agrega_banda_abajo():
    # La banda satisfactoria entra como 3er input [2:v] y se superpone en la zona muerta (y=1120).
    vf = rw._vf("smart", satisfy=True)
    assert "[2:v]" in vf and "overlay=0:1120" in vf
