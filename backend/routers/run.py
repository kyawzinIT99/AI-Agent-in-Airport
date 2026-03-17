import threading
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db, SessionLocal
from backend.models import Report
from backend.schemas import RunResponse, RunStatusResponse
from backend.services import report_service

router = APIRouter(tags=["run"])

_active_runs: set[int] = set()


def _run_in_background(report_id: int):
    """Run report_service in a thread (report row already created)."""
    try:
        report_service.run_and_persist_with_id(report_id)
    finally:
        _active_runs.discard(report_id)


@router.post("/run/now", response_model=RunResponse)
def trigger_run(db: Session = Depends(get_db)):
    report = Report(status="running")
    db.add(report)
    db.commit()
    db.refresh(report)
    _active_runs.add(report.id)
    t = threading.Thread(target=_run_in_background, args=(report.id,), daemon=True)
    t.start()
    return RunResponse(
        status="started",
        report_id=report.id,
        message=f"Agent crew started. Poll /api/run/status/{report.id} for progress.",
    )


@router.get("/run/status/{report_id}", response_model=RunStatusResponse)
def run_status(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return RunStatusResponse(
        report_id=report.id,
        status=report.status,
        error_message=report.error_message,
    )
