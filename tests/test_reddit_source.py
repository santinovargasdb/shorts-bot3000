import types
import reddit_pipeline.source as source


def _sub(**kw):
    base = dict(id="x1", subreddit="pettyrevenge", title="t", selftext="body",
                score=500, upvote_ratio=0.95, num_comments=10,
                created_utc=1700000000.0, stickied=False, over_18=False, is_self=True)
    base.update(kw)
    return types.SimpleNamespace(**base)


class _FakeSubreddit:
    def __init__(self, subs):
        self._subs = subs

    def top(self, time_filter="month", limit=50):
        return list(self._subs)


class _FakeReddit:
    def __init__(self, mapping):
        self._m = mapping

    def subreddit(self, name):
        return _FakeSubreddit(self._m.get(name, []))


def test_mapea_campos():
    d = source.submission_to_dict(_sub(id="abc", score=777))
    assert d["id"] == "abc"
    assert d["score"] == 777
    assert set(d) == {"id", "subreddit", "title", "body", "score",
                      "ratio", "num_comments", "created_utc"}


def test_filtra_stickied_nsfw_y_no_self():
    reddit = _FakeReddit({"pettyrevenge": [
        _sub(id="ok"),
        _sub(id="pin", stickied=True),
        _sub(id="nsfw", over_18=True),
        _sub(id="link", is_self=False)]})
    got = source.fetch_posts(reddit, ["pettyrevenge"], limit=10)
    assert [g["id"] for g in got] == ["ok"]
