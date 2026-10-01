import series_historia as sh


def test_diez_historias():
    assert set(sh.HISTORIAS) == set(range(1, 11))
    assert sh.PARTS is sh.HISTORIAS


def test_estructura_episodios():
    for n, ep in sh.HISTORIAS.items():
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
        assert 100 <= palabras <= 165, f"ep {n}: {palabras} palabras (45-58s)"


def test_interfaz_serie():
    assert sh.HISTORIAS[1]["titulo"] in sh.title_for(1)
    assert "Historia en 60 Segundos" in sh.title_for(1)
    assert sh.background_for(1).startswith("backgrounds/")
    assert sh.KEYWORDS
    assert "1" in sh.descripcion(1, "resumen de prueba") or "historia" in sh.descripcion(1, "resumen de prueba").lower()


def test_remate_invita_a_seguir():
    for n, ep in sh.HISTORIAS.items():
        assert "eguime" in ep["segments"][-1]["text"], f"ep {n} sin CTA de seguir"
