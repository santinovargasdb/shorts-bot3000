"""Guard de cara para canales facecam/IRL: un clip SIN cara estable (aventura outdoor, cámara
lejos, logo tapando la cara) no entra en el formato 'solo cara' y el render cae a un fallback
feo (clip apretado entre franjas de slime). Se rechaza en el build en vez de postearlo.
Cierra el agujero por el que seq 16 (kaicenat, 'MAX WIN'... no, 'IM GAY') se posteó roto."""
from streamers.build import facecam_needs_face


def test_irl_sin_cara_rechaza():
    assert facecam_needs_face("irl", None, face_found=False) is True


def test_irl_con_cara_pasa():
    assert facecam_needs_face("irl", "facecam", face_found=True) is False


def test_layout_facecam_sin_cara_rechaza():
    # El layout_override 'facecam' (canal C) también dispara el guard, aunque el content no sea 'irl'.
    assert facecam_needs_face("gameplay", "facecam", face_found=False) is True


def test_gameplay_sin_cara_no_aplica():
    # Canal de gameplay sin facecam: el guard de cara NO aplica (ese formato no necesita cara).
    assert facecam_needs_face("gameplay", None, face_found=False) is False
