from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Issue
from backend.schemas import IssueResponse

router = APIRouter(tags=["issues"])


@router.get("/issues", response_model=list[IssueResponse])
def get_issues(
    report_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Issue).order_by(Issue.updated_at.desc())
    if report_id is not None:
        query = query.filter(Issue.report_id == report_id)
    if status:
        query = query.filter(Issue.status == status)
    if priority:
        query = query.filter(Issue.priority == priority)
    return query.limit(limit).all()
