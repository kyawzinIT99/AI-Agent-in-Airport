import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchReport, type ReportDetail as RD } from '../api/client'

export function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<RD | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pm' | 'dev' | 'qa' | 'commits' | 'issues'>('pm')

  useEffect(() => {
    if (id) fetchReport(Number(id)).then(setReport).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-5 text-slate-500 text-sm">Loading…</div>
  if (!report)  return <div className="p-5 text-red-400 text-sm">Report not found.</div>

  const TABS = [
    { key: 'pm',      label: '📊 PM'        },
    { key: 'dev',     label: '🛠 Developer'  },
    { key: 'qa',      label: '🧪 QA'         },
    { key: 'commits', label: `🔨 Commits (${report.commits.length})`  },
    { key: 'issues',  label: `🐛 Issues (${report.issues.length})`    },
  ] as const

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/reports" className="text-slate-400 hover:text-white text-sm">← Reports</Link>
        <div>
          <h1 className="text-xl font-bold text-white">Report #{report.id}</h1>
          <div className="text-slate-400 text-xs">{new Date(report.run_date).toLocaleString()} · {report.status}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-purple-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        {tab === 'pm' && (
          <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {report.pm_summary || 'No PM report.'}
          </pre>
        )}
        {tab === 'dev' && (
          <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {report.developer_summary || 'No developer report.'}
          </pre>
        )}
        {tab === 'qa' && (
          <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {report.qa_summary || 'No QA report.'}
          </pre>
        )}
        {tab === 'commits' && (
          report.commits.length === 0 ? (
            <div className="text-slate-500 text-sm">No commits.</div>
          ) : (
            <div className="space-y-2">
              {report.commits.map(c => (
                <div key={c.id} className="border-b border-slate-700 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <code className="text-purple-400 text-xs">{c.sha}</code>
                    <span className="text-slate-400 text-xs">{c.author}</span>
                    {c.committed_at && <span className="text-slate-600 text-xs">{new Date(c.committed_at).toLocaleString()}</span>}
                  </div>
                  <div className="text-white text-sm mt-0.5">{c.message}</div>
                </div>
              ))}
            </div>
          )
        )}
        {tab === 'issues' && (
          report.issues.length === 0 ? (
            <div className="text-slate-500 text-sm">No issues.</div>
          ) : (
            <div className="space-y-2">
              {report.issues.map(i => (
                <div key={i.id} className="border-b border-slate-700 pb-2 last:border-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-blue-400 text-xs">{i.jira_key}</code>
                    <span className="text-slate-400 text-xs">{i.issue_type}</span>
                    <span className="text-slate-400 text-xs">{i.status}</span>
                    <span className="text-slate-500 text-xs">{i.priority}</span>
                    {i.assignee && <span className="text-slate-500 text-xs">{i.assignee}</span>}
                  </div>
                  <div className="text-white text-sm mt-0.5">{i.summary}</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {report.error_message && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
          {report.error_message}
        </div>
      )}
    </div>
  )
}
