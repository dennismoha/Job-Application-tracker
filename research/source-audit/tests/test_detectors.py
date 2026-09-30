from scripts.detectors import inspect_html, recommend_mode


def test_jobposting_json_ld_and_subjects():
    html = '''
    <html><head><title>Math Teacher</title>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Mathematics Teacher"}</script>
    </head><body><h1>Mathematics Teacher</h1><p>Current vacancies</p><a>Apply now</a></body></html>
    '''
    signals = inspect_html("https://example.com/jobs/1", html)
    assert signals.jobposting_json_ld_count == 1
    assert "mathematics" in signals.subject_terms_present
    assert signals.application_link_hint is True
    mode, _ = recommend_mode(200, signals, "MANUAL_BATCH")
    assert mode == "AUTO"


def test_challenge_is_restricted():
    html = "<html><body>Verify you are human - CAPTCHA</body></html>"
    signals = inspect_html("https://example.com", html)
    mode, _ = recommend_mode(200, signals, "AUTO")
    assert signals.captcha_or_challenge_hint is True
    assert mode == "RESTRICTED"


def test_login_source_becomes_account():
    html = "<html><body><h1>Candidate Login</h1><p>Sign in to apply</p></body></html>"
    signals = inspect_html("https://example.com", html)
    mode, _ = recommend_mode(200, signals, "AUTO")
    assert mode == "ACCOUNT"
