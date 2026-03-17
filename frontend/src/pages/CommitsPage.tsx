import { useEffect, useState } from 'react'
import { fetchCommits, type CommitResponse } from '../api/client'

export function CommitsPage() {
  const [commits, setCommits] = useState<CommitResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommits({ limit: 200 }).then(setCommits).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-5 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Commits</h1>
        <p className="text-slate-400 text-sm mt-0.5">GitHub commit log from agent runs</p>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : commits.length === 0 ? (
        <div className="text-slate-600 text-sm text-center py-12">No commits yet. Run the agents to fetch commits.</div>
      ) : (
        <div className="space-y-2">
          {commits.map(c => (
            <div key={c.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <code className="text-purple-400 text-xs bg-slate-900 px-2 py-0.5 rounded">{c.sha}</code>
                <span className="text-slate-400 text-sm">{c.author}</span>
                {c.committed_at && (
                  <span className="text-slate-600 text-xs">{new Date(c.committed_at).toLocaleString()}</span>
                )}
              </div>
              <div className="text-white text-sm mt-2">{c.message}</div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer"
                  className="text-blue-400 text-xs hover:text-blue-300 mt-1 inline-block">
                  View on GitHub →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
