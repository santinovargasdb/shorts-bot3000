from whatonearth import sourcing


def _cand(h, tags, dl=0, dur=5):
    return {"url": f"http://x/{h}.mp4", "height": h, "width": h * 16 // 9,
            "duration": dur, "tags": tags, "downloads": dl, "author": "a",
            "source_url": "http://x", "source": "pixabay", "license": "Pixabay"}


def test_rank_elige_relevante_hd():
    cands = [
        _cand(2160, "dragon, fantasy, mythical"),      # HD pero irrelevante
        _cand(1080, "pangolin, wildlife, animal", 50),  # relevante + HD
        _cand(480, "pangolin, closeup"),                # relevante pero baja res
    ]
    best = sourcing.rank(cands, "pangolin")
    assert best["height"] == 1080


def test_rank_descarta_todo_irrelevante():
    assert sourcing.rank([_cand(2160, "tractor, farm")], "passion fruit") is None


def test_rank_descarta_sin_hd():
    assert sourcing.rank([_cand(480, "pangolin")], "pangolin") is None


def test_find_clip_baja_el_mejor(monkeypatch, tmp_path):
    monkeypatch.setattr(sourcing, "search_pixabay",
                        lambda q: [_cand(1080, "pangolin, animal", 10)])
    monkeypatch.setattr(sourcing, "search_pexels", lambda q: [])
    monkeypatch.setattr(sourcing, "search_wikimedia", lambda q: [])
    monkeypatch.setattr(sourcing, "_download", lambda url, out: out.write_bytes(b"MP4"))
    res = sourcing.find_clip("pangolin", tmp_path)
    assert res["source"] == "pixabay"
    assert res["local_path"].exists()


def test_find_clip_sin_resultados(monkeypatch, tmp_path):
    monkeypatch.setattr(sourcing, "search_pixabay", lambda q: [])
    monkeypatch.setattr(sourcing, "search_pexels", lambda q: [])
    monkeypatch.setattr(sourcing, "search_wikimedia", lambda q: [])
    assert sourcing.find_clip("durian", tmp_path) is None


def test_rank_excluye_ia():
    # un clip relevante+HD pero etiquetado IA se descarta; gana el real
    cands = [
        _cand(2160, "axolotl, ai generated, salamander"),
        _cand(1080, "axolotl, wildlife, animal", 10),
    ]
    best = sourcing.rank(cands, "axolotl")
    assert best is not None and best["height"] == 1080


def test_rank_solo_ia_devuelve_none():
    assert sourcing.rank([_cand(2160, "pangolin, ai generated")], "pangolin") is None
