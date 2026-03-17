import { useEffect, useState } from 'react'
import { getTasks, createTask, updateTask, deleteTask, type Task, type TaskCreate } from '../api/personalClient'

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES   = ['todo', 'in_progress', 'blocked', 'done']
const CATEGORIES = ['work', 'personal', 'health', 'learning', 'other']

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-red-400 border-red-800',
  medium: 'text-yellow-400 border-yellow-800',
  low: 'text-green-400 border-green-800',
}

const STATUS_COLOR: Record<string, string> = {
  todo:        'bg-slate-700 text-slate-300',
  in_progress: 'bg-blue-900/60 text-blue-300',
  blocked:     'bg-red-900/60 text-red-300',
  done:        'bg-green-900/60 text-green-300',
}

export function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<TaskCreate>({ title: '', priority: 'medium', category: 'work', status: 'todo' })
  const [filterStatus, setFilterStatus] = useState('')

  const load = () => getTasks(filterStatus ? { status: filterStatus } : {}).then(setTasks).finally(() => setLoading(false))

  useEffect(() => { load() }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTask(form)
    setForm({ title: '', priority: 'medium', category: 'work', status: 'todo' })
    setShowForm(false)
    load()
  }

  const cycleStatus = async (task: Task) => {
    const next = STATUSES[(STATUSES.indexOf(task.status) + 1) % STATUSES.length]
    await updateTask(task.id, { status: next })
    load()
  }

  const remove = async (id: number) => {
    await deleteTask(id)
    load()
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400 text-sm mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          + New Task
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              filterStatus === s
                ? 'bg-purple-700 border-purple-500 text-white'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-3">
          <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            placeholder="Task title"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
          <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Priority', key: 'priority', opts: PRIORITIES },
              { label: 'Category', key: 'category', opts: CATEGORIES },
              { label: 'Status',   key: 'status',   opts: STATUSES   },
            ].map(f => (
              <select key={f.key} value={(form as unknown as Record<string, string>)[f.key]}
                onChange={e => setForm({...form, [f.key]: e.target.value})}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm">
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            <input type="date" value={form.due_date || ''} onChange={e => setForm({...form, due_date: e.target.value})}
              className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="text-slate-600 text-sm text-center py-12">No tasks yet. Create one above.</div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-white font-medium text-sm ${task.status === 'done' ? 'line-through text-slate-500' : ''}`}>
                    {task.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority] || ''}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status] || ''}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="text-slate-500 text-xs">{task.category}</span>
                  {task.due_date && <span className="text-slate-500 text-xs">due {task.due_date}</span>}
                </div>
                {task.description && <p className="text-slate-400 text-xs mt-1">{task.description}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => cycleStatus(task)}
                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 rounded px-2 py-1">
                  →
                </button>
                <button onClick={() => remove(task.id)}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900 rounded px-2 py-1">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
