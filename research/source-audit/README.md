# UAE Teaching Source Audit

A conservative reconnaissance tool for evaluating UAE teaching-job sources before designing the full job-intelligence system.

The registry focuses on Mathematics (M), Chemistry (C), Science (S), and Homeroom/Primary (H).

## What is included

- `sources.csv` — 46-source master registry; 20 rows are marked as the first audit batch.
- `checklist.yaml` — objective and interpretive checks plus acquisition-mode definitions.
- `scripts/detectors.py` — ATS, JSON-LD, JS-heavy, login, challenge, email-alert, application and subject detectors.
- `scripts/inspect_all.py` — sequential web checker with a conservative delay and robots.txt cache.
- `ai_review_prompt.md` — second-stage prompt for interpreting the Python output without inventing evidence.
- `tests/test_detectors.py` — basic detector tests.

## Safety / access philosophy

This project does **not** try to bypass CAPTCHA, authentication, anti-bot protection, rate limiting, or other access controls. If a source resists automation, that is useful research data: classify it as EMAIL, ACCOUNT, MANUAL_BATCH, SEARCH_ONLY, or RESTRICTED instead.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# .venv\\Scripts\\activate       # Windows PowerShell
pip install -r requirements.txt
```

## First run: only the 20-source representative batch

Run from the project root:

```bash
python scripts/inspect_all.py --sources sources.csv --output-dir results
```

The default is deliberately slow: one source at a time with a 4-second delay.

For an even gentler first smoke test:

```bash
python scripts/inspect_all.py --sources sources.csv --limit 5 --delay 8
```

## Audit all 46 later

```bash
python scripts/inspect_all.py --sources sources.csv --all --delay 5 --output-dir results
```

## Output

Each run produces both JSON and CSV. The JSON retains detailed evidence; the CSV is a compact review sheet.

Key fields include:

- HTTP status and final URL
- redirects and response time
- ATS fingerprint
- JSON-LD and `JobPosting`
- RSS/Atom hints
- JS-heavy hint
- login-wall hint
- CAPTCHA/challenge hint
- email-alert hint
- recruiter-email hint
- subject terms found
- recommended acquisition mode

## Recommended workflow

1. Run 5 sources as a smoke test.
2. Inspect the output and manually verify any RESTRICTED/MANUAL_BATCH result.
3. Run the 20-source batch.
4. Repeat on another day to measure reliability rather than one-time reachability.
5. Give the resulting JSON to the AI review prompt.
6. Only after two or three runs should the source modes be treated as design inputs for the production architecture.

## Important interpretation rule

A source returning zero jobs, a blank page, a timeout, or a failed request does **not** mean the source has no vacancies. It means the acquisition method needs review.
