import { useEffect, useState } from 'react'
import { getLatestBriefing, runBriefing, type Briefing } from '../api/personalClient'

export function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)

  const load = () =>
    getLatestBriefing()
      .then(setBriefing)
      .catch(() => setBriefing(null))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleRun = async () => {
    setRunning(true)
    const b = await runBriefing()
    const poll = setInterval(async () => {
      const fresh = await getLatestBriefing().catch(() => null)
      if (fresh && (fresh.status === 'completed' || fresh.status === 'failed')) {
        clearInterval(poll)
        setBriefing(fresh)
        setRunning(false)
      } else if (b.id) {
        // still waiting
      }
    }, 2000)
    // safety timeout
    setTimeout(() => { clearInterval(poll); setRunning(false); load() }, 30000)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Briefing</h1>
          <p className="text-slate-400 text-sm mt-0.5">Personalised daily briefing from your tasks + schedule</p>
        </div>
        <button onClick={handleRun} disabled={running}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2 ${
            running
              ? 'bg-purple-900/40 border-purple-700 text-purple-300 cursor-not-allowed'
              : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-700'
          }`}>
          {running
            ? <><span className="w-3.5 h-3.5 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />Generating…</>
            : '🤖 Generate Briefing'}
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : !briefing ? (
        <div className="text-slate-600 text-sm text-center py-12">
          No briefings yet. Click Generate to create your first one.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-slate-400 text-xs">
            {briefing.briefing_date} ·{' '}
            <span className={briefing.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
              {briefing.status}
            </span>
          </div>

          {[
            { label: '📋 Planner', content: briefing.planner_output,   color: 'border-blue-800'   },
            { label: '📅 Scheduler', content: briefing.scheduler_output, color: 'border-amber-800'  },
            { label: '💡 Coach',   content: briefing.coach_output,     color: 'border-purple-800' },
          ].filter(s => s.content).map(s => (
            <div key={s.label} className={`bg-slate-800/60 border ${s.color} rounded-xl p-5`}>
              <div className="text-white font-semibold mb-3">{s.label}</div>
              <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {s.content}
              </pre>
            </div>
          ))}

          {briefing.error_message && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
              {briefing.error_message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
