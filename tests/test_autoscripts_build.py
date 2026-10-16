# tests/test_autoscripts_build.py
import autoscripts.build as B
import autoscripts.db as db


def test_assemble_segments_mete_la_tarjeta_despues_del_primer_dato():
    datos = [{"text": "d1", "imgs": ["a", "b"], "topic": "t1"},
             {"text": "d2", "imgs": ["c", "d"], "topic": "t2"}]
    segs = B.assemble_segments(datos)
    assert segs[0] == {"kind": "fact", "text": "d1", "imgs": ["a", "b"]}
    assert segs[1]["kind"] == "title"
    assert segs[2]["kind"] == "fact" and segs[2]["text"] == "d2"


def _datos(n, prefix="t"):
    return [{"text": f"dato {prefix}{i} sin numeros.", "imgs": ["x", "y"], "topic": f"{prefix}{i}"}
            for i in range(n)]


def _wire(monkeypatch, *, judge_ok=True):
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.topics, "used_topics", lambda ch: set())
    monkeypatch.setattr(B.generate, "generate_episode",
                        lambda client, model, avoid_topics, n_datos=6:
                        {"pregunta": "¿?", "resumen": "r", "datos": _datos(6)})
    monkeypatch.setattr(B.judge, "judge_episode",
                        lambda client, model, datos: {"ok": judge_ok, "problema": "" if judge_ok else "falso"})


def test_build_aprueba_y_guarda(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=True)
    made = B.build("faceless", n=1)
    assert made == 1
    assert len(db.approved_episodes("faceless")) == 1
    ep = db.approved_episodes("faceless")[0]
    assert any(s["kind"] == "title" for s in ep["segments"])      # ensamblado OK


def test_build_rechaza_si_el_juez_dice_no(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    _wire(monkeypatch, judge_ok=False)
    made = B.build("faceless", n=1)
    assert made == 0
    assert db.approved_episodes("faceless") == []


def test_build_429_levanta_quota_exhausted(tmp_path, monkeypatch):
    from autobuild.errors import QuotaExhausted
    monkeypatch.setattr(db, "DB_PATH", lambda ch: tmp_path / "faceless.sqlite")
    monkeypatch.setattr(B, "build_client", lambda: object())
    monkeypatch.setattr(B, "model_name", lambda: "m")
    monkeypatch.setattr(B.topics, "used_topics", lambda ch: set())

    def boom(*a, **k):
        raise RuntimeError("Error code: 429 - rate limit exceeded")
    monkeypatch.setattr(B.generate, "generate_episode", boom)
    import pytest
    with pytest.raises(QuotaExhausted):
        B.build("faceless", n=1)
