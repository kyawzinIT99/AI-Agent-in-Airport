from datetime import datetime, timedelta, timezone
from typing import Any
import logging
import httpx
from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

GITHUB_API = "https://api.github.com"


def _headers() -> dict:
    return {
        "Authorization": f"token {settings.github_token}",
        "Accept": "application/vnd.github.v3+json",
    }


def fetch_recent_commits(since_hours: int = 24) -> list[dict[str, Any]]:
    if not settings.github_token.strip() or not settings.github_repo.strip():
        logger.warning("GitHub token or repo not configured — skipping.")
        return []

    since = (datetime.now(timezone.utc) - timedelta(hours=since_hours)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    owner, repo = settings.github_repo.split("/", 1)
    url = f"{GITHUB_API}/repos/{owner}/{repo}/commits"
    commits = []

    try:
        with httpx.Client(headers=_headers(), timeout=15) as client:
            params = {"since": since, "per_page": 100}
            while url:
                resp = client.get(url, params=params)
                if resp.status_code == 404:
                    logger.warning(f"GitHub repo '{settings.github_repo}' not found (404).")
                    return []
                resp.raise_for_status()
                for item in resp.json():
                    commits.append({
                        "sha": item["sha"][:7],
                        "author": item["commit"]["author"].get("name", "unknown"),
                        "message": item["commit"]["message"].split("\n")[0],
                        "url": item.get("html_url", ""),
                        "committed_at": item["commit"]["author"].get("date", ""),
                    })
                # Follow pagination
                link = resp.headers.get("Link", "")
                url = None
                if 'rel="next"' in link:
                    for part in link.split(","):
                        if 'rel="next"' in part:
                            url = part.split("<>")[0].strip().strip("<>")
                            break
                params = {}
    except Exception as e:
        logger.warning(f"GitHub fetch failed: {e}")

    return commits


def format_commits_for_llm(commits: list[dict]) -> str:
    if not commits:
        return "No commits in the last 24 hours."
    lines = [f"- [{c['sha']}] {c['author']}: {c['message']}" for c in commits]
    return f"Recent commits ({len(commits)} total):\n" + "\n".join(lines)
