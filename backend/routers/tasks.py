from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from backend.database import get_db
from backend.models_personal import PersonalTask

router = APIRouter(tags=["personal-tasks"])


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    category: str = "personal"
    status: str = "todo"
    due_date: Optional[date] = None
    estimated_minutes: Optional[int] = None
    notes: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    estimated_minutes: Optional[int] = None
    notes: Optional[str] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    priority: str
    category: str
    status: str
    due_date: Optional[date] = None
    estimated_minutes: Optional[int] = None
    notes: Optional[str] = None


@router.get("/tasks", response_model=list[TaskResponse])
def list_tasks(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(PersonalTask)
    if status:
        query = query.filter(PersonalTask.status == status)
    if category:
        query = query.filter(PersonalTask.category == category)
    if priority:
        query = query.filter(PersonalTask.priority == priority)
    return query.all()


@router.post("/tasks", response_model=TaskResponse)
def create_task(body: TaskCreate, db: Session = Depends(get_db)):
    task = PersonalTask(**body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, body: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(PersonalTask).filter(PersonalTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"status": "deleted"}
