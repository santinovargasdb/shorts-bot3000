"""El QC de Gemini a veces devuelve el objeto JSON envuelto en una lista ([{...}]) en vez de
un dict. _coerce_qc normaliza a dict (o None) para que _check no crashee con 'list'.get."""
from streamers.verify import _coerce_qc


def test_dict_pasa_igual():
    assert _coerce_qc({"ok": True, "problema": ""}) == {"ok": True, "problema": ""}


def test_lista_devuelve_primer_dict():
    assert _coerce_qc([{"ok": False, "problema": "chat"}]) == {"ok": False, "problema": "chat"}


def test_lista_vacia_es_none():
    assert _coerce_qc([]) is None


def test_basura_es_none():
    assert _coerce_qc("nope") is None
    assert _coerce_qc(None) is None
