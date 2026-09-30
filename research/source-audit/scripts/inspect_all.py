from __future__ import annotations

import argparse
import csv
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx

from detectors import inspect_html, recommend_mode


DEFAULT_HEADERS = {
    "User-Agent": "UAE-Teaching-Source-Audit/0.1 (+personal research; conservative access)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.8",
}


def read_sources(path: Path, batch_only: bool) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if batch_only:
        rows = [row for row in rows if row.get("audit_batch") == "1"]
    return rows


def robots_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/robots.txt"


def parse_robots(text: str) -> dict[str, object]:
    lines = [line.strip() for line in text.splitlines() if line.strip() and not line.lstrip().startswith("#")]
    applies = False
    disallow_root = False
    rules: list[str] = []
    for line in lines:
        lower = line.lower()
        if lower.startswith("user-agent:"):
            applies = line.split(":", 1)[1].strip() == "*"
        elif applies and lower.startswith("disallow:"):
            value = line.split(":", 1)[1].strip()
            rules.append(value)
            if value == "/":
                disallow_root = True
    return {"rules_for_star": rules[:50], "disallow_root_hint": disallow_root}


def fetch_robots(client: httpx.Client, url: str, cache: dict[str, dict[str, object]]) -> dict[str, object]:
    rurl = robots_url(url)
    host = urlparse(rurl).netloc
    if host in cache:
        return cache[host]
    result: dict[str, object] = {
        "url": rurl,
        "present": False,
        "status_code": None,
        "disallow_root_hint": False,
        "rules_for_star": [],
    }
    try:
        resp = client.get(rurl, headers=DEFAULT_HEADERS, timeout=12)
        result["status_code"] = resp.status_code
        if resp.status_code == 200 and "text" in resp.headers.get("content-type", "text/plain"):
            result["present"] = True
            result.update(parse_robots(resp.text))
    except Exception as exc:
        result["error"] = type(exc).__name__
    cache[host] = result
    return result


def inspect_source(client: httpx.Client, row: dict[str, str], robots_cache: dict[str, dict[str, object]], check_robots: bool) -> dict[str, object]:
    started = time.perf_counter()
    result: dict[str, object] = {
        "source_id": row["id"],
        "name": row["name"],
        "source_type": row["source_type"],
        "requested_url": row["url"],
        "subjects": row["subjects"].split("|"),
        "initial_mode": row["initial_mode"],
        "priority": row["priority"],
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }

    if check_robots:
        result["robots"] = fetch_robots(client, row["url"], robots_cache)

    try:
        resp = client.get(row["url"], headers=DEFAULT_HEADERS, timeout=20)
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        result.update({
            "http_status": resp.status_code,
            "final_url": str(resp.url),
            "redirect_count": len(resp.history),
            "response_time_ms": elapsed_ms,
            "content_type": resp.headers.get("content-type"),
        })

        content_type = (resp.headers.get("content-type") or "").lower()
        html_like = "html" in content_type or resp.text.lstrip().lower().startswith(("<!doctype html", "<html"))
        signals = inspect_html(str(resp.url), resp.text) if html_like else None
        if signals:
            result["signals"] = signals.__dict__

        mode, reason = recommend_mode(resp.status_code, signals, row["initial_mode"])
        result["recommended_mode"] = mode
        result["recommendation_reason"] = reason

        robot_info = result.get("robots") or {}
        if isinstance(robot_info, dict) and robot_info.get("disallow_root_hint"):
            result["recommended_mode"] = "MANUAL_BATCH"
            result["recommendation_reason"] = "robots.txt has a broad Disallow: / hint for User-agent: *; review manually before automation."

        result["needs_ai_review"] = True
    except Exception as exc:
        result.update({
            "http_status": None,
            "error": type(exc).__name__,
            "error_message": str(exc)[:300],
            "response_time_ms": round((time.perf_counter() - started) * 1000),
            "recommended_mode": "MANUAL_BATCH",
            "recommendation_reason": "Request failed; do not assume the source has no jobs. Review manually.",
            "needs_ai_review": True,
        })
    return result


def write_csv(results: list[dict[str, object]], path: Path) -> None:
    fields = [
        "source_id", "name", "source_type", "http_status", "final_url", "response_time_ms",
        "recommended_mode", "initial_mode", "ats_provider", "jobposting_json_ld_count",
        "javascript_heavy_hint", "login_wall_hint", "captcha_or_challenge_hint",
        "email_alert_hint", "recruiter_email_hint", "subject_terms_present", "recommendation_reason",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for item in results:
            signals = item.get("signals") or {}
            writer.writerow({
                "source_id": item.get("source_id"),
                "name": item.get("name"),
                "source_type": item.get("source_type"),
                "http_status": item.get("http_status"),
                "final_url": item.get("final_url"),
                "response_time_ms": item.get("response_time_ms"),
                "recommended_mode": item.get("recommended_mode"),
                "initial_mode": item.get("initial_mode"),
                "ats_provider": signals.get("ats_provider"),
                "jobposting_json_ld_count": signals.get("jobposting_json_ld_count"),
                "javascript_heavy_hint": signals.get("javascript_heavy_hint"),
                "login_wall_hint": signals.get("login_wall_hint"),
                "captcha_or_challenge_hint": signals.get("captcha_or_challenge_hint"),
                "email_alert_hint": signals.get("email_alert_hint"),
                "recruiter_email_hint": signals.get("recruiter_email_hint"),
                "subject_terms_present": "|".join(signals.get("subject_terms_present") or []),
                "recommendation_reason": item.get("recommendation_reason"),
            })


def main() -> None:
    parser = argparse.ArgumentParser(description="Conservative reconnaissance audit for teaching-job sources")
    parser.add_argument("--sources", default="sources.csv")
    parser.add_argument("--all", action="store_true", help="Audit all registry rows instead of only audit_batch=1")
    parser.add_argument("--delay", type=float, default=4.0, help="Seconds to wait between source requests")
    parser.add_argument("--no-robots", action="store_true", help="Skip robots.txt checks")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--output-dir", default="results")
    args = parser.parse_args()

    source_path = Path(args.sources)
    rows = read_sources(source_path, batch_only=not args.all)
    if args.limit:
        rows = rows[: args.limit]

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    results: list[dict[str, object]] = []
    robots_cache: dict[str, dict[str, object]] = {}

    with httpx.Client(follow_redirects=True) as client:
        for index, row in enumerate(rows, start=1):
            print(f"[{index}/{len(rows)}] {row['name']}")
            result = inspect_source(client, row, robots_cache, check_robots=not args.no_robots)
            results.append(result)
            print(f"  status={result.get('http_status')} mode={result.get('recommended_mode')}")
            if index < len(rows):
                time.sleep(max(0.0, args.delay))

    json_path = output_dir / f"audit-{stamp}.json"
    csv_path = output_dir / f"audit-{stamp}.csv"
    json_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    write_csv(results, csv_path)
    print(f"\nWrote {json_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
