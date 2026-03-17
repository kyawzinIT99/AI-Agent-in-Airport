from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Commit
from backend.schemas import CommitResponse

router = APIRouter(tags=["commits"])


@router.get("/commits", response_model=list[CommitResponse])
def get_commits(
    report_id: int | None = Query(default=None),
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Commit).order_by(Commit.committed_at.desc())
    if report_id is not None:
        query = query.filter(Commit.report_id == report_id)
    return query.limit(limit).all()
