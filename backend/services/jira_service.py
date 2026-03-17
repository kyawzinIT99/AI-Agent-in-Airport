from datetime import datetime, timedelta, timezone
from typing import Any
import logging
import requests
from requests.auth import HTTPBasicAuth
from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_PLACEHOLDER = "your-domain.atlassian.net"


def _is_configured() -> bool:
    return (
        settings.jira_server.strip() != _PLACEHOLDER
        and settings.jira_api_token.strip() != ""
        and settings.jira_email.strip() != ""
    )


def _auth() -> HTTPBasicAuth:
    return HTTPBasicAuth(settings.jira_email, settings.jira_api_token)


def _headers() -> dict:
    return {"Accept": "application/json"}


def fetch_recent_issues(since_hours: int = 24) -> list[dict[str, Any]]:
    if not _is_configured():
        logger.warning("Jira not configured (placeholder domain) — skipping issue fetch.")
        return []

    since = (datetime.now(timezone.utc) - timedelta(hours=since_hours)).strftime("%Y-%m-%d")
    jql = (
        f'project = "{settings.jira_project_key}" '
        f'AND updated >= "{since}" ORDER BY updated DESC'
    )
    url = f"https://{settings.jira_server}/rest/api/3/search"
    issues = []

    try:
        start = 0
        while True:
            resp = requests.get(
                url,
                params={
                    "jql": jql,
                    "fields": "summary,status,assignee,priority,issuetype,updated",
                    "startAt": start,
                    "maxResults": 50,
                },
                headers=_headers(),
                auth=_auth(),
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            for item in data.get("issues", []):
                f = item["fields"]
                issues.append({
                    "jira_key": item["key"],
                    "summary": f.get("summary", ""),
                    "status": (f.get("status") or {}).get("name", "Unknown"),
                    "assignee": (
                        (f.get("assignee") or {}).get("displayName", "Unassigned")
                    ),
                    "priority": (f.get("priority") or {}).get("name", "N/A"),
                    "issue_type": (f.get("issuetype") or {}).get("name", "Unknown"),
                    "updated_at": f.get("updated", ""),
                })
            if start + 50 >= data.get("total", 0):
                break
            start += 50
    except Exception as e:
        logger.warning(f"Jira fetch failed: {e}")

    return issues


def format_issues_for_llm(issues: list[dict]) -> str:
    if not issues:
        return "No Jira issues updated in the last 24 hours (or Jira not configured)."
    lines = [
        f"- [{i['jira_key']}] ({i['issue_type']}) {i['summary']} "
        f"| Status: {i['status']} | Assignee: {i['assignee']} | Priority: {i['priority']}"
        for i in issues
    ]
    return f"Recent Jira issues ({len(issues)} total):\n" + "\n".join(lines)
