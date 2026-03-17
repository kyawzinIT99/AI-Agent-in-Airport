from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Time, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base


class PersonalTask(Base):
    __tablename__ = "personal_tasks"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    priority = Column(String, default="medium")
    category = Column(String, default="personal")
    status = Column(String, default="todo")
    due_date = Column(Date)
    estimated_minutes = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    schedule_entries = relationship("ScheduleEntry", back_populates="task")


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    category = Column(String, default="personal")
    notes = Column(Text)
    recurring = Column(Boolean, default=False)
    task_id = Column(Integer, ForeignKey("personal_tasks.id"))

    task = relationship("PersonalTask", back_populates="schedule_entries")


class Briefing(Base):
    __tablename__ = "briefings"

    id = Column(Integer, primary_key=True)
    briefing_date = Column(Date, nullable=False)
    status = Column(String, default="pending")
    planner_output = Column(Text)
    scheduler_output = Column(Text)
    coach_output = Column(Text)
    combined_output = Column(Text)
    error_message = Column(Text)
