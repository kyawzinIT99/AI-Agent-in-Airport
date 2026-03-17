from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CommitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sha: str
    author: str
    message: str
    url: Optional[str] = None
    committed_at: Optional[datetime] = None


class IssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    jira_key: str
    summary: str
    status: Optional[str] = None
    assignee: Optional[str] = None
    priority: Optional[str] = None
    issue_type: Optional[str] = None
    updated_at: Optional[datetime] = None


class ReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_date: datetime
    status: str
    pm_summary: Optional[str] = None


class ReportDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_date: datetime
    status: str
    developer_summary: Optional[str] = None
    qa_summary: Optional[str] = None
    pm_summary: Optional[str] = None
    combined_output: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    commits: list[CommitResponse] = []
    issues: list[IssueResponse] = []


class RunResponse(BaseModel):
    status: str
    report_id: int
    message: str


class RunStatusResponse(BaseModel):
    report_id: int
    status: str
    error_message: Optional[str] = None
