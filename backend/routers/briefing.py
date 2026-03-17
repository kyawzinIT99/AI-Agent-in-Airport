import threading
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from backend.database import get_db
from backend.models_personal import Briefing

router = APIRouter(tags=["briefing"])


class BriefingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    briefing_date: date
    status: str
    planner_output: str | None = None
    scheduler_output: str | None = None
    coach_output: str | None = None
    combined_output: str | None = None
    error_message: str | None = None


def _run_briefing_background(briefing_id: int):
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        briefing = db.query(Briefing).filter(Briefing.id == briefing_id).first()
        if not briefing:
            return

        # Gather tasks and schedule for today
        from backend.models_personal import PersonalTask, ScheduleEntry
        today = date.today()
        tasks = db.query(PersonalTask).all()
        entries = db.query(ScheduleEntry).filter(ScheduleEntry.date == today).all()

        tasks_text = "\n".join(
            f"- [{t.priority}] {t.title} ({t.status})" for t in tasks
        ) or "No tasks."
        schedule_text = "\n".join(
            f"- {e.start_time or '?'} {e.title}" for e in entries
        ) or "No schedule entries for today."

        # Simple rule-based briefing (no LLM dependency for basic use)
        pending = [t for t in tasks if t.status in ("todo", "in_progress")]
        high = [t for t in pending if t.priority == "high"]

        planner = (
            f"## Daily Plan\n\n"
            f"You have **{len(pending)}** open tasks"
            + (f", including **{len(high)} high priority**" if high else "")
            + ".\n\n"
            + tasks_text
        )
        scheduler = (
            f"## Schedule\n\n"
            f"Today's entries:\n\n" + schedule_text
        )
        coach = (
            "## Focus\n\n"
            + (
                f"Top priority: **{high[0].title}**. Stay focused." if high
                else "No high-priority tasks — great time to clear your backlog."
            )
        )
        combined = f"{planner}\n\n{scheduler}\n\n{coach}"

        briefing.planner_output = planner
        briefing.scheduler_output = scheduler
        briefing.coach_output = coach
        briefing.combined_output = combined
        briefing.status = "completed"
        db.commit()
    except Exception as e:
        db2 = __import__("backend.database", fromlist=["SessionLocal"]).SessionLocal()
        b = db2.query(Briefing).filter(Briefing.id == briefing_id).first()
        if b:
            b.status = "failed"
            b.error_message = str(e)
            db2.commit()
        db2.close()
    finally:
        db.close()


@router.get("/briefing/latest", response_model=BriefingResponse)
def latest_briefing(db: Session = Depends(get_db)):
    b = (
        db.query(Briefing)
        .filter(Briefing.status == "completed")
        .order_by(Briefing.briefing_date.desc())
        .first()
    )
    if not b:
        raise HTTPException(status_code=404, detail="No briefings yet")
    return b


@router.get("/briefing", response_model=list[BriefingResponse])
def list_briefings(db: Session = Depends(get_db)):
    return db.query(Briefing).order_by(Briefing.briefing_date.desc()).all()


@router.post("/briefing/run", response_model=BriefingResponse)
def run_briefing(db: Session = Depends(get_db)):
    today = date.today()
    briefing = Briefing(briefing_date=today, status="running")
    db.add(briefing)
    db.commit()
    db.refresh(briefing)
    t = threading.Thread(target=_run_briefing_background, args=(briefing.id,), daemon=True)
    t.start()
    return briefing


@router.get("/briefing/status/{briefing_id}", response_model=BriefingResponse)
def briefing_status(briefing_id: int, db: Session = Depends(get_db)):
    b = db.query(Briefing).filter(Briefing.id == briefing_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Not found")
    return b
