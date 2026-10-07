import reddit_pipeline.arctic as arctic


class _Resp:
    def __init__(self, payload, status=200):
        self._p, self.status_code = payload, status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._p


class _Session:
    """Session HTTP falsa: devuelve _Resp de una cola, o siempre el mismo."""
    def __init__(self, resp=None, queue=None):
        self._resp = resp
        self._queue = list(queue) if queue is not None else None
        self.calls = []

    def get(self, url, params=None, timeout=None):
        self.calls.append(params)
        return self._queue.pop(0) if self._queue is not None else self._resp


def _post(**kw):
    base = dict(id="x1", subreddit="pettyrevenge", title="t",
                selftext="una historia con cuerpo", score=500,
                num_comments=10, created_utc=1700000000.0, over_18=False)
    base.update(kw)
    return base


def test_arctic_to_dict_mapea():
    d = arctic.arctic_to_dict(_post(id="abc", score="700"))
    assert d["id"] == "abc"
    assert d["body"] == "una historia con cuerpo"
    assert d["score"] == 700 and isinstance(d["score"], int)
    assert d["ratio"] == 1.0            # Arctic Shift no trae upvote_ratio
    assert set(d) == {"id", "subreddit", "title", "body", "score",
                      "ratio", "num_comments", "created_utc"}


def test_is_text_post_filtra():
    assert arctic._is_text_post(_post()) is True
    assert arctic._is_text_post(_post(selftext="[removed]")) is False
    assert arctic._is_text_post(_post(selftext="[deleted]")) is False
    assert arctic._is_text_post(_post(selftext="")) is False
    assert arctic._is_text_post(_post(over_18=True)) is False
    assert arctic._is_text_post(_post(title="[ Removed by moderator ]")) is False


def test_fetch_posts_arctic_lista_plana():
    sess = _Session(resp=_Resp([_post(id="ok"), _post(id="rm", selftext="[deleted]")]))
    got = arctic.fetch_posts_arctic(["pettyrevenge"], session=sess, pause=0)
    assert [g["id"] for g in got] == ["ok"]


def test_fetch_posts_arctic_wrapper_data():
    sess = _Session(resp=_Resp({"data": [_post(id="w1")]}))
    got = arctic.fetch_posts_arctic(["AmItheAsshole"], session=sess, pause=0)
    assert [g["id"] for g in got] == ["w1"]
    assert sess.calls[0]["subreddit"] == "AmItheAsshole"
    assert "fields" in sess.calls[0] and "before" in sess.calls[0]


def test_fetch_posts_arctic_reintenta_en_timeout():
    # 422 "Timeout" primero, 200 con data después -> reintenta y trae el post
    sess = _Session(queue=[_Resp({"data": None, "error": "Timeout"}, status=422),
                           _Resp({"data": [_post(id="r1")]}, status=200)])
    got = arctic.fetch_posts_arctic(["pettyrevenge"], session=sess, pause=0,
                                    retries=2, backoff=0)
    assert [g["id"] for g in got] == ["r1"]
    assert len(sess.calls) == 2          # reintentó una vez


def test_fetch_posts_arctic_sub_que_falla_no_corta_el_resto():
    class _Boom(_Session):
        def get(self, url, params=None, timeout=None):
            self.calls.append(params)
            raise RuntimeError("red caída")
    sess = _Boom()
    got = arctic.fetch_posts_arctic(["a", "b"], session=sess, pause=0, retries=0)
    assert got == []                     # no explota; devuelve lo que pudo (nada)
    assert len(sess.calls) == 2          # intentó los dos subreddits
