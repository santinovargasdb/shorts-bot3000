import reddit_pipeline.scoring as sc


def _post(**kw):
    base = {"title": "una historia", "body": " ".join(["x"] * 300),
            "score": 5000, "ratio": 0.97, "num_comments": 300}
    base.update(kw)
    return base


def test_pasa_historia_fuerte():
    assert sc.viral_score(_post()) > 0
    assert sc.passes(_post()) is True


def test_descarta_pocos_upvotes():
    assert sc.viral_score(_post(score=100)) == 0


def test_descarta_ratio_bajo():
    assert sc.viral_score(_post(ratio=0.7)) == 0


def test_descarta_muy_corta_o_larga():
    assert sc.viral_score(_post(body="corto")) == 0
    assert sc.viral_score(_post(body=" ".join(["x"] * 2000))) == 0


def test_bonus_por_keyword_de_gancho():
    sin = sc.viral_score(_post(title="una historia cualquiera"))
    con = sc.viral_score(_post(title="AITA por esto"))
    assert con > sin > 0


def test_bonus_por_keyword_de_familia():
    sin = sc.viral_score(_post(title="una historia cualquiera"))
    con = sc.viral_score(_post(title="my husband wants a divorce"))
    assert con > sin > 0


def test_familia_pesa_mas_que_gancho_generico():
    fam = sc.viral_score(_post(title="my husband wants a divorce"))
    hook = sc.viral_score(_post(title="AITA for this"))
    base = sc.viral_score(_post(title="una historia cualquiera"))
    assert fam > hook > base
