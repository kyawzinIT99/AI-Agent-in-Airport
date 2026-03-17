import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLatestReport, fetchReports, type ReportSummary } from '../api/client'
import { getTasks, type Task } from '../api/personalClient'

export function Dashboard() {
  const [report, setReport]   = useState<{ pm_summary?: string; run_date?: string; status?: string } | null>(null)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchLatestReport().catch(() => null),
      fetchReports().catch(() => []),
      getTasks().catch(() => []),
    ]).then(([r, rs, ts]) => {
      setReport(r)
      setReports(rs)
      setTasks(ts)
      setLoading(false)
    })
  }, [])

  const done     = tasks.filter(t => t.status === 'done').length
  const active   = tasks.filter(t => t.status !== 'done').length
  const high     = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length

  return (
    <div className="p-5 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">AI Agent Airport — overview</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Tasks',    value: active,         color: 'text-blue-400' },
          { label: 'High Priority',   value: high,           color: 'text-red-400'  },
          { label: 'Completed',       value: done,           color: 'text-green-400'},
          { label: 'Agent Reports',   value: reports.length, color: 'text-purple-400'},
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{loading ? '…' : s.value}</div>
            <div className="text-slate-400 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { to: '/office',   icon: '✈️',  label: 'Airport Simulation', desc: 'Live Phaser 3 airport' },
          { to: '/tasks',    icon: '✅',  label: 'Tasks',              desc: 'Manage your tasks'     },
          { to: '/schedule', icon: '📅',  label: 'Schedule',           desc: 'Today\'s calendar'     },
          { to: '/briefing', icon: '🤖',  label: 'AI Briefing',        desc: 'Daily AI briefing'     },
          { to: '/reports',  icon: '📊',  label: 'Reports',            desc: 'Agent run history'     },
          { to: '/commits',  icon: '🔨',  label: 'Commits',            desc: 'GitHub commit log'     },
        ].map(l => (
          <Link key={l.to} to={l.to}
            className="bg-slate-800/60 border border-slate-700 hover:border-purple-500/50 rounded-xl p-4 transition-colors group">
            <div className="text-2xl mb-1">{l.icon}</div>
            <div className="text-white text-sm font-semibold group-hover:text-purple-300">{l.label}</div>
            <div className="text-slate-500 text-xs">{l.desc}</div>
          </Link>
        ))}
      </div>

      {/* Latest report */}
      {report && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Latest Report</h2>
            <Link to="/reports" className="text-purple-400 text-xs hover:text-purple-300">View all →</Link>
          </div>
          <div className="text-slate-400 text-xs mb-3">
            {report.run_date ? new Date(report.run_date).toLocaleString() : ''} ·{' '}
            <span className={report.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
              {report.status}
            </span>
          </div>
          {report.pm_summary && (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
              {report.pm_summary}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
