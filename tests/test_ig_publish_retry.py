"""publish_reel no debe abortar ante un ERROR transitorio del status del
contenedor (Meta a veces parpadea ERROR durante el procesamiento y luego llega a
FINISHED). Debe seguir sondeando y fallar solo si el ERROR persiste."""
import pytest

import uploaders.instagram_upload as igu


class _Resp:
    def __init__(self, data):
        self._d = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._d


def test_publish_reel_tolera_error_transitorio(monkeypatch):
    posts = iter([_Resp({"id": "cont1"}), _Resp({"id": "media1"})])   # crear + publicar
    monkeypatch.setattr(igu.requests, "post", lambda *a, **k: next(posts))
    # status: IN_PROGRESS -> ERROR (parpadeo) -> IN_PROGRESS -> FINISHED
    gets = iter([_Resp({"status_code": "IN_PROGRESS"}), _Resp({"status_code": "ERROR"}),
                 _Resp({"status_code": "IN_PROGRESS"}), _Resp({"status_code": "FINISHED"})])
    monkeypatch.setattr(igu.requests, "get", lambda *a, **k: next(gets))
    monkeypatch.setattr(igu.time, "sleep", lambda s: None)
    assert igu.publish_reel("http://x/v.mp4", caption="c",
                            ig_user_id="u", access_token="t") == "media1"


def test_publish_reel_falla_si_error_persiste(monkeypatch):
    monkeypatch.setattr(igu.requests, "post", lambda *a, **k: _Resp({"id": "cont1"}))
    monkeypatch.setattr(igu.requests, "get", lambda *a, **k: _Resp({"status_code": "ERROR"}))
    monkeypatch.setattr(igu.time, "sleep", lambda s: None)
    with pytest.raises(RuntimeError):
        igu.publish_reel("http://x/v.mp4", ig_user_id="u", access_token="t")
