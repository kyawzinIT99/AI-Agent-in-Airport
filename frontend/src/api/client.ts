import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

export interface ReportSummary {
  id: number
  run_date: string
  status: string
  pm_summary?: string
}

export interface CommitResponse {
  id: number
  sha: string
  author: string
  message: string
  url?: string
  committed_at?: string
}

export interface IssueResponse {
  id: number
  jira_key: string
  summary: string
  status?: string
  assignee?: string
  priority?: string
  issue_type?: string
  updated_at?: string
}

export interface ReportDetail extends ReportSummary {
  developer_summary?: string
  qa_summary?: string
  combined_output?: string
  error_message?: string
  created_at?: string
  commits: CommitResponse[]
  issues: IssueResponse[]
}

export interface RunResponse {
  status: string
  report_id: number
  message: string
}

export interface RunStatusResponse {
  report_id: number
  status: string
  error_message?: string
}

export const fetchReports = (): Promise<ReportSummary[]> =>
  api.get('/reports').then(r => r.data)

export const fetchLatestReport = (): Promise<ReportDetail> =>
  api.get('/reports/latest').then(r => r.data)

export const fetchReport = (id: number): Promise<ReportDetail> =>
  api.get(`/reports/${id}`).then(r => r.data)

export const fetchCommits = (params?: { report_id?: number; limit?: number }): Promise<CommitResponse[]> =>
  api.get('/commits', { params }).then(r => r.data)

export const fetchIssues = (params?: { report_id?: number; status?: string; priority?: string }): Promise<IssueResponse[]> =>
  api.get('/issues', { params }).then(r => r.data)

export const triggerRun = (): Promise<RunResponse> =>
  api.post('/run/now').then(r => r.data)

export const fetchRunStatus = (id: number): Promise<RunStatusResponse> =>
  api.get(`/run/status/${id}`).then(r => r.data)
