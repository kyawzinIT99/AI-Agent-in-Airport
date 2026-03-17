import logging
from datetime import datetime
from sqlalchemy.orm import Session
from backend.models import Report, Commit, Issue, AgentLog
from backend.database import SessionLocal
from backend.services import github_service, jira_service

logger = logging.getLogger(__name__)


def _parse_committed_at(dt_str: str):
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def run_and_persist() -> int:
    """Run the full agent crew and persist results. Returns report_id."""
    db = SessionLocal()
    try:
        report = Report(status="running", run_date=datetime.utcnow())
        db.add(report)
        db.commit()
        db.refresh(report)
        run_and_persist_with_id(report.id)
        return report.id
    finally:
        db.close()


def run_and_persist_with_id(report_id: int):
    """Run crew for a pre-created report row (used by the manual trigger endpoint)."""
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return

        logger.info("Fetching GitHub commits...")
        commits = github_service.fetch_recent_commits()
        commits_text = github_service.format_commits_for_llm(commits)

        logger.info("Fetching Jira issues...")
        issues = jira_service.fetch_recent_issues()
        issues_text = jira_service.format_issues_for_llm(issues)

        logger.info("Running agent crew...")
        from backend.agents.crew import run_crew
        result = run_crew(commits_text=commits_text, issues_text=issues_text)

        # Persist commits
        for c in commits:
            db.add(Commit(
                sha=c.get("sha", ""),
                author=c.get("author", ""),
                message=c.get("message", ""),
                url=c.get("url", ""),
                committed_at=_parse_committed_at(c.get("committed_at", "")),
                report_id=report_id,
            ))

        # Persist issues
        for i in issues:
            committed_at = _parse_committed_at(i.get("updated_at", ""))
            db.add(Issue(
                jira_key=i.get("jira_key", ""),
                summary=i.get("summary", ""),
                status=i.get("status", ""),
                assignee=i.get("assignee", ""),
                priority=i.get("priority", ""),
                issue_type=i.get("issue_type", ""),
                updated_at=committed_at,
                report_id=report_id,
            ))

        # Persist agent outputs
        for role, output in result.get("agent_outputs", {}).items() if isinstance(result.get("agent_outputs"), dict) else []:
            db.add(AgentLog(report_id=report_id, agent_role=role, raw_output=str(output)))

        report.developer_summary = result.get("developer", "")
        report.qa_summary = result.get("qa", "")
        report.pm_summary = result.get("pm", "")
        report.combined_output = result.get("combined", "")
        report.status = "completed"
        db.commit()
        logger.info(f"Report {report_id} completed successfully.")

    except Exception as e:
        logger.error(f"Report {report_id} failed: {e}")
        db = SessionLocal()
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            report.error_message = str(e)
            db.commit()
        db.close()
    finally:
        db.close()


def get_report(db: Session, report_id: int):
    return db.query(Report).filter(Report.id == report_id).first()


def get_latest_report(db: Session):
    return (
        db.query(Report)
        .filter(Report.status == "completed")
        .order_by(Report.run_date.desc())
        .first()
    )


def list_reports(db: Session, page: int = 1, limit: int = 20):
    offset = (page - 1) * limit
    return (
        db.query(Report)
        .order_by(Report.run_date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
