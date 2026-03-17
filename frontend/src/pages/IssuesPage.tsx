import { useEffect, useState } from 'react'
import { fetchIssues, type IssueResponse } from '../api/client'

const PRIORITY_COLOR: Record<string, string> = {
  High:    'text-red-400',
  Medium:  'text-yellow-400',
  Low:     'text-green-400',
}

export function IssuesPage() {
  const [issues, setIssues]   = useState<IssueResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus]   = useState('')

  const load = () =>
    fetchIssues(status ? { status } : {}).then(setIssues).finally(() => setLoading(false))

  useEffect(() => { load() }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const statuses = ['', ...Array.from(new Set(issues.map(i => i.status).filter(Boolean)))]

  return (
    <div className="p-5 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Issues</h1>
        <p className="text-slate-400 text-sm mt-0.5">Jira issues from agent runs</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s ?? 'all'} onClick={() => setStatus(s ?? '')}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              status === (s ?? '')
                ? 'bg-purple-700 border-purple-500 text-white'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : issues.length === 0 ? (
        <div className="text-slate-600 text-sm text-center py-12">No issues yet. Run the agents to fetch Jira issues.</div>
      ) : (
        <div className="space-y-2">
          {issues.map(i => (
            <div key={i.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <code className="text-blue-400 text-xs bg-slate-900 px-2 py-0.5 rounded">{i.jira_key}</code>
                {i.issue_type && <span className="text-slate-500 text-xs">{i.issue_type}</span>}
                {i.status && <span className="text-slate-400 text-xs border border-slate-600 rounded px-1.5 py-0.5">{i.status}</span>}
                {i.priority && (
                  <span className={`text-xs font-medium ${PRIORITY_COLOR[i.priority] || 'text-slate-400'}`}>
                    {i.priority}
                  </span>
                )}
                {i.assignee && <span className="text-slate-500 text-xs">{i.assignee}</span>}
                {i.updated_at && <span className="text-slate-600 text-xs">{new Date(i.updated_at).toLocaleDateString()}</span>}
              </div>
              <div className="text-white text-sm">{i.summary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
