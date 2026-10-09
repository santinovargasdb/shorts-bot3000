from whatonearth import db


def _conn():
    c = db.connect(":memory:")
    db.init(c)
    return c


def test_add_asigna_seq_monotonico():
    c = _conn()
    s1 = db.add_video(c, title="A", description="d1", video_path="a.mp4", items=[{"name": "X"}])
    s2 = db.add_video(c, title="B", description="d2", video_path="b.mp4", items=[{"name": "Y"}])
    assert s1 == 1 and s2 == 2


def test_video_by_seq_deserializa_items():
    c = _conn()
    seq = db.add_video(c, title="T", description="d", video_path="v.mp4",
                       items=[{"name": "Pangolin"}, {"name": "Capybara"}])
    row = db.video_by_seq(c, seq)
    assert row["title"] == "T"
    assert row["items"][0]["name"] == "Pangolin"
    assert row["video_path"] == "v.mp4"


def test_all_videos_ordenado():
    c = _conn()
    db.add_video(c, title="A", description="d", video_path="a.mp4", items=[])
    db.add_video(c, title="B", description="d", video_path="b.mp4", items=[])
    seqs = [v["seq"] for v in db.all_videos(c)]
    assert seqs == [1, 2]


def test_video_by_seq_inexistente():
    c = _conn()
    assert db.video_by_seq(c, 99) is None
