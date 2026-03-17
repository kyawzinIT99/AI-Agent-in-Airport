from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    run_date = Column(DateTime, default=datetime.utcnow)
    developer_summary = Column(Text)
    qa_summary = Column(Text)
    pm_summary = Column(Text)
    combined_output = Column(Text)
    status = Column(String(20), default="pending")
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    commits = relationship("Commit", back_populates="report", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="report", cascade="all, delete-orphan")
    agent_logs = relationship("AgentLog", back_populates="report", cascade="all, delete-orphan")


class Commit(Base):
    __tablename__ = "commits"

    id = Column(Integer, primary_key=True)
    sha = Column(String(25))
    author = Column(String(40))
    message = Column(Text)
    url = Column(String(100))
    committed_at = Column(DateTime)
    report_id = Column(Integer, ForeignKey("reports.id"))

    report = relationship("Report", back_populates="commits")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True)
    jira_key = Column(String(39))
    summary = Column(Text)
    status = Column(String(50))
    assignee = Column(String(100))
    priority = Column(String(20))
    issue_type = Column(String(20))
    updated_at = Column(DateTime)
    report_id = Column(Integer, ForeignKey("reports.id"))

    report = relationship("Report", back_populates="issues")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    agent_role = Column(String(50))
    raw_output = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="agent_logs")
