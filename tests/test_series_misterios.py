import series_misterios as sm


def test_episodios_contiguos():
    # Numeración contigua desde 1 (sin huecos) y al menos 10 episodios.
    assert set(sm.MISTERIOS) == set(range(1, len(sm.MISTERIOS) + 1))
    assert len(sm.MISTERIOS) >= 10
    assert sm.PARTS is sm.MISTERIOS


def test_estructura_episodios():
    for n, ep in sm.MISTERIOS.items():
        assert ep["titulo"], f"ep {n} sin título"
        assert ep["resumen"], f"ep {n} sin resumen"
        segs = ep["segments"]
        assert 4 <= len(segs) <= 7, f"ep {n}: {len(segs)} segmentos"
        for s in segs:
            assert s["kind"] == "fact"
            assert s["text"].strip()
            assert s["imgs"], f"ep {n}: momento sin imágenes"
            assert len(s["imgs"]) >= 2, f"ep {n}: momento con menos de 2 imágenes"
        palabras = sum(len(s["text"].split()) for s in segs)
        assert 100 <= palabras <= 165, f"ep {n}: {palabras} palabras (fuera de 100-165)"


def test_interfaz_serie():
    assert sm.MISTERIOS[1]["titulo"] in sm.title_for(1)
    assert "Misterios en 60 Segundos" in sm.title_for(1)
    assert sm.background_for(1).startswith("backgrounds/")
    assert sm.KEYWORDS
    desc = sm.descripcion(1, "resumen de prueba")
    assert "1" in desc or "misterio" in desc.lower()


def test_remate_sin_cta_hablada():
    # Invertido el 2026-10-05 (fórmula §7/§9): el "Seguime..." hablado rompe el
    # loop y roza engagement bait; el cierre ahora es la pregunta binaria en pantalla.
    for n, ep in sm.MISTERIOS.items():
        assert "eguime" not in ep["segments"][-1]["text"], f"ep {n} con CTA hablada"
        assert ep["pregunta"].strip().endswith("?"), f"ep {n} sin pregunta de remate"
