import autobuild.supervisor as sup

CFG = {"target_days": 14, "critical_days": 2, "posts_per_day": 2,
       "max_attempts": 25, "batch": 5}   # objetivo = 28 partes; crítico <= 4


def _measure_from(seq):
    """measure() que devuelve el próximo valor de una lista en cada llamada."""
    it = iter(seq)
    last = {"v": 0}
    def measure(_ch):
        try:
            last["v"] = next(it)
        except StopIteration:
            pass
        return last["v"]
    return measure


def test_no_refill_si_ya_esta_sobre_objetivo():
    calls = []
    r = sup.refill_channel("faceless", CFG,
                           measure=lambda ch: 30,          # 30 >= 28
                           refiller=lambda ch, n: calls.append(n))
    assert r.severity == "OK" and r.added == 0 and calls == []


def test_rellena_hasta_el_objetivo_y_para():
    calls = []
    # before=10, cada tanda suma ~6 -> 16, 22, 28 -> para en 28
    measure = _measure_from([10, 16, 22, 28])
    r = sup.refill_channel("streamers_a", CFG, measure,
                           refiller=lambda ch, n: calls.append(n))
    assert r.parts_after == 28 and r.severity == "OK"
    assert len(calls) == 3                     # paró apenas llegó


def test_para_en_max_attempts():
    calls = []
    cfg = {**CFG, "max_attempts": 10, "batch": 5}   # 2 tandas de 5 = 10 intentos
    measure = _measure_from([0, 1, 2, 2, 2])        # progresa poco
    r = sup.refill_channel("streamers_b", cfg, measure,
                           refiller=lambda ch, n: calls.append(n))
    assert sum(calls) <= 10
    assert r.severity in {"WARN", "CRITICAL"}


def test_para_tras_dos_tandas_sin_progreso():
    calls = []
    measure = _measure_from([0, 0, 0])              # nunca sube
    r = sup.refill_channel("streamers_b", CFG, measure,
                           refiller=lambda ch, n: calls.append(n))
    assert len(calls) == 2                           # cortó por "dry"
    assert r.severity == "CRITICAL"                  # 0 partes <= crítico(4)


def test_excepcion_del_refiller_es_ERROR():
    def boom(ch, n): raise RuntimeError("groq 429")
    r = sup.refill_channel("soyelmalo", CFG, measure=lambda ch: 5, refiller=boom)
    assert r.severity == "ERROR" and "groq 429" in r.note


def test_not_implemented_es_SKIP():
    def ni(ch, n): raise NotImplementedError("pendiente Pieza 2")
    r = sup.refill_channel("faceless", CFG, measure=lambda ch: 0, refiller=ni)
    assert r.severity == "SKIP"


def test_quota_exhausted_es_QUOTA_y_remide_lo_recuperado():
    from autobuild.errors import QuotaExhausted
    def boom(ch, n): raise QuotaExhausted("sin cuota de Gemini")
    # before=2 (bajo objetivo) -> entra al loop -> refiller levanta QuotaExhausted ->
    # el handler re-mide (5) para capturar lo recuperado por resolve_pending antes del corte.
    seq = _measure_from([2, 5])
    r = sup.refill_channel("streamers_a", CFG, measure=seq, refiller=boom)
    assert r.severity == "QUOTA" and r.added == 3 and "sin cuota" in r.note


import autobuild.refillers as rf


def test_lock_impide_doble_corrida(tmp_path, monkeypatch):
    monkeypatch.setattr(sup, "LOCK", tmp_path / ".lock")
    assert sup.acquire_lock() is True
    assert sup.acquire_lock() is False          # ya tomado y fresco
    sup.release_lock()
    assert sup.acquire_lock() is True


def test_force_ignora_el_lock(tmp_path, monkeypatch):
    monkeypatch.setattr(sup, "LOCK", tmp_path / ".lock")
    sup.acquire_lock()
    assert sup.acquire_lock(force=True) is True


def test_run_dry_run_no_llama_refillers(monkeypatch):
    llamado = []
    monkeypatch.setitem(rf.REFILLERS, "clips",
                        lambda ch, n: llamado.append((ch, n)))
    monkeypatch.setattr(sup.runway, "parts_ahead", lambda ch, *a, **k: 3)
    results = sup.run(["streamers_a"], dry_run=True)
    assert llamado == []                         # dry-run no genera
    assert results == []                         # dry-run no produce Result


def test_run_real_usa_refiller_del_gen(monkeypatch):
    # streamers_a es gen="clips"; que llegue al objetivo en una tanda
    seq = iter([3, 28])
    monkeypatch.setattr(sup.runway, "parts_ahead", lambda ch, *a, **k: next(seq))
    monkeypatch.setitem(rf.REFILLERS, "clips", lambda ch, n: None)
    results = sup.run(["streamers_a"], dry_run=False)
    assert len(results) == 1 and results[0].severity == "OK"
