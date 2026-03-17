from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from backend.database import get_db
from backend.models_personal import ScheduleEntry

router = APIRouter(tags=["schedule"])


class EntryCreate(BaseModel):
    title: str
    date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: str = "personal"
    notes: Optional[str] = None
    recurring: bool = False
    task_id: Optional[int] = None


class EntryUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    recurring: Optional[bool] = None


class EntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    category: str
    notes: Optional[str] = None
    recurring: bool = False
    task_id: Optional[int] = None


@router.get("/schedule", response_model=list[EntryResponse])
def list_entries(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ScheduleEntry)
    if date_from:
        query = query.filter(ScheduleEntry.date >= date_from)
    if date_to:
        query = query.filter(ScheduleEntry.date <= date_to)
    return query.order_by(ScheduleEntry.date, ScheduleEntry.start_time).all()


@router.post("/schedule", response_model=EntryResponse)
def create_entry(body: EntryCreate, db: Session = Depends(get_db)):
    entry = ScheduleEntry(**body.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/schedule/{entry_id}", response_model=EntryResponse)
def update_entry(entry_id: int, body: EntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(ScheduleEntry).filter(ScheduleEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/schedule/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(ScheduleEntry).filter(ScheduleEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"status": "deleted"}
