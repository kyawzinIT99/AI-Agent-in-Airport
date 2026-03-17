import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchReports, type ReportSummary } from '../api/client'

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-green-400',
  running:   'text-yellow-400',
  failed:    'text-red-400',
  pending:   'text-slate-400',
}

export function ReportsHistory() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports().then(setReports).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-5 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-0.5">{reports.length} agent run{reports.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : reports.length === 0 ? (
        <div className="text-slate-600 text-sm text-center py-12">
          No reports yet. Click <Link to="/office" className="text-purple-400">▶ Run Now</Link> in the Airport Sim to generate one.
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <Link key={r.id} to={`/reports/${r.id}`}
              className="block bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 rounded-xl p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs">#{r.id}</span>
                  <span className={`text-sm font-medium ${STATUS_COLOR[r.status] || 'text-slate-400'}`}>
                    {r.status}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {new Date(r.run_date).toLocaleString()}
                  </span>
                </div>
                <span className="text-slate-500 text-xs">→</span>
              </div>
              {r.pm_summary && (
                <p className="text-slate-400 text-sm mt-2 line-clamp-2">{r.pm_summary}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
