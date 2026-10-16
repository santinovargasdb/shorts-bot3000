import types
import autobuild.alert as al


def _r(channel, before, after, added, severity, note=""):
    return types.SimpleNamespace(channel=channel, parts_before=before,
                                 parts_after=after, added=added,
                                 severity=severity, note=note)


def test_any_problem_true_si_hay_warn_critical_o_error():
    assert al.any_problem([_r("a", 1, 1, 0, "WARN")]) is True
    assert al.any_problem([_r("a", 28, 28, 0, "OK"),
                           _r("b", 0, 0, 0, "SKIP")]) is False


def test_render_digest_incluye_cada_canal_y_peor_severidad():
    subject, body = al.render_digest([
        _r("whatonearth", 7, 28, 21, "OK"),
        _r("streamers_b", 0, 0, 0, "ERROR", "fuente seca"),
    ])
    assert "ERROR" in subject
    assert "whatonearth" in body and "streamers_b" in body
    assert "fuente seca" in body


def test_send_email_devuelve_false_si_faltan_creds(monkeypatch):
    for k in ("AUTOBUILD_SMTP_USER", "AUTOBUILD_SMTP_PASS", "AUTOBUILD_ALERT_TO"):
        monkeypatch.delenv(k, raising=False)
    assert al.send_email("s", "b") is False


def test_send_email_traga_error_de_smtp(monkeypatch):
    monkeypatch.setenv("AUTOBUILD_SMTP_USER", "u@gmail.com")
    monkeypatch.setenv("AUTOBUILD_SMTP_PASS", "x")
    monkeypatch.setenv("AUTOBUILD_ALERT_TO", "to@gmail.com")

    class Boom:
        def __init__(self, *a, **k): raise OSError("smtp caído")
    monkeypatch.setattr(al.smtplib, "SMTP_SSL", Boom)
    assert al.send_email("s", "b") is False   # no levanta
