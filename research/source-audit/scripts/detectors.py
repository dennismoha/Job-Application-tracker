from __future__ import annotations

import json
import re
from dataclasses import dataclass
from urllib.parse import urlparse

from bs4 import BeautifulSoup


ATS_HOSTS = {
    "greenhouse": ("greenhouse.io", "boards.greenhouse.io"),
    "lever": ("lever.co", "jobs.lever.co"),
    "ashby": ("ashbyhq.com", "jobs.ashbyhq.com"),
    "workable": ("workable.com", "apply.workable.com"),
    "smartrecruiters": ("smartrecruiters.com",),
    "workday": ("myworkdayjobs.com", "workdayjobs.com"),
    "recruitee": ("recruitee.com",),
    "personio": ("personio.com", "jobs.personio.de"),
    "schoolrecruiter": ("schoolrecruiter.com",),
    "sabis": ("careers.sabis.net",),
}

CHALLENGE_MARKERS = (
    "captcha",
    "cf-chl-",
    "cloudflare ray id",
    "verify you are human",
    "checking your browser",
    "access denied",
    "unusual traffic",
    "bot detection",
    "security check",
)

LOGIN_MARKERS = (
    "applicant login",
    "candidate login",
    "sign in to apply",
    "log in to apply",
    "member login",
    "create an account to apply",
)

ALERT_MARKERS = (
    "job alert",
    "job alerts",
    "email alert",
    "email alerts",
    "notify me",
    "create alert",
    "subscribe",
)

APPLY_MARKERS = (
    "apply now",
    "apply for this job",
    "submit application",
    "application form",
    "apply here",
)

JOB_TERMS = (
    "vacancies",
    "vacancy",
    "current openings",
    "available jobs",
    "job title",
    "careers",
)

SUBJECT_TERMS = {
    "mathematics": ("mathematics", "math teacher", "maths teacher", "math teacher"),
    "chemistry": ("chemistry", "chemistry teacher"),
    "science": ("science teacher", "general science", "stem teacher", "middle school science"),
    "homeroom": ("homeroom", "home room", "classroom teacher", "primary teacher", "elementary teacher", "class teacher"),
}


@dataclass
class PageSignals:
    title: str | None
    visible_text_chars: int
    script_count: int
    json_ld_count: int
    jobposting_json_ld_count: int
    rss_or_atom_links: list[str]
    ats_provider: str | None
    javascript_heavy_hint: bool
    login_wall_hint: bool
    captcha_or_challenge_hint: bool
    job_terms_present: list[str]
    subject_terms_present: list[str]
    application_link_hint: bool
    email_alert_hint: bool
    recruiter_email_hint: bool


def _contains_any(text: str, markers: tuple[str, ...]) -> bool:
    text = text.lower()
    return any(marker in text for marker in markers)


def detect_ats(url: str, html: str) -> str | None:
    haystack = f"{url}\n{html[:200000]}".lower()
    host = urlparse(url).netloc.lower()
    for provider, fingerprints in ATS_HOSTS.items():
        if any(fp in host or fp in haystack for fp in fingerprints):
            return provider
    return None


def inspect_html(url: str, html: str) -> PageSignals:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else None

    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.extract()
    visible_text = " ".join(soup.stripped_strings)
    text_lower = visible_text.lower()

    soup_full = BeautifulSoup(html, "html.parser")
    scripts = soup_full.find_all("script")

    json_ld_count = 0
    jobposting_count = 0
    for script in soup_full.find_all("script", attrs={"type": re.compile(r"application/ld\+json", re.I)}):
        payload = script.string or script.get_text(strip=True)
        if not payload:
            continue
        json_ld_count += 1
        try:
            data = json.loads(payload)
        except Exception:
            if "JobPosting" in payload:
                jobposting_count += 1
            continue

        stack = data if isinstance(data, list) else [data]
        for item in stack:
            if isinstance(item, dict):
                typ = item.get("@type")
                if typ == "JobPosting" or (isinstance(typ, list) and "JobPosting" in typ):
                    jobposting_count += 1

    feeds: list[str] = []
    for link in soup_full.find_all("link"):
        rel = " ".join(link.get("rel", [])) if isinstance(link.get("rel"), list) else str(link.get("rel", ""))
        typ = str(link.get("type", ""))
        if "alternate" in rel.lower() and typ.lower() in {"application/rss+xml", "application/atom+xml"}:
            href = link.get("href")
            if href:
                feeds.append(str(href))

    subject_hits = [
        subject for subject, markers in SUBJECT_TERMS.items() if any(marker in text_lower for marker in markers)
    ]
    job_hits = [term for term in JOB_TERMS if term in text_lower]

    email_pattern = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
    emails = email_pattern.findall(visible_text)
    recruiter_email_hint = any(
        prefix in email.lower()
        for email in emails
        for prefix in ("career", "jobs", "recruit", "hr@", "talent")
    )

    js_heavy = False
    if len(visible_text) < 900 and len(scripts) >= 12:
        js_heavy = True
    if _contains_any(html, ("__next_data__", "webpack", "ng-version", "id=\"app\"", "id=\"root\"")) and len(visible_text) < 1800:
        js_heavy = True

    return PageSignals(
        title=title,
        visible_text_chars=len(visible_text),
        script_count=len(scripts),
        json_ld_count=json_ld_count,
        jobposting_json_ld_count=jobposting_count,
        rss_or_atom_links=feeds,
        ats_provider=detect_ats(url, html),
        javascript_heavy_hint=js_heavy,
        login_wall_hint=_contains_any(text_lower, LOGIN_MARKERS),
        captcha_or_challenge_hint=_contains_any(html.lower(), CHALLENGE_MARKERS),
        job_terms_present=job_hits,
        subject_terms_present=subject_hits,
        application_link_hint=_contains_any(text_lower, APPLY_MARKERS),
        email_alert_hint=_contains_any(text_lower, ALERT_MARKERS),
        recruiter_email_hint=recruiter_email_hint,
    )


def recommend_mode(status_code: int | None, signals: PageSignals | None, initial_mode: str) -> tuple[str, str]:
    if status_code in {401, 403, 429}:
        return "RESTRICTED", f"HTTP {status_code}; avoid recurring automated access until manually reviewed."
    if signals is None:
        return "MANUAL_BATCH", "No parseable HTML result; manual review required."
    if signals.captcha_or_challenge_hint:
        return "RESTRICTED", "Challenge/CAPTCHA indicators found; do not attempt bypass."
    if signals.login_wall_hint and not signals.job_terms_present:
        return "ACCOUNT", "Account/login signals dominate the public page."
    if signals.email_alert_hint and signals.javascript_heavy_hint:
        return "EMAIL", "Email alerts detected and page appears JS-heavy."
    if signals.ats_provider or signals.jobposting_json_ld_count > 0:
        return "AUTO", "Known structured source or JobPosting JSON-LD detected."
    if signals.job_terms_present and signals.visible_text_chars >= 900 and not signals.javascript_heavy_hint:
        return "AUTO", "Public job/career content is visible in ordinary HTML."
    if signals.recruiter_email_hint:
        return "EMAIL", "Recruitment email detected; email route may be more reliable."
    return initial_mode.split("+")[0], "No strong override; retain the registry's initial mode pending manual review."
