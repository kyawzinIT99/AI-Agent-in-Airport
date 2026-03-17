import { useEffect, useState } from 'react'
import { getSchedule, createScheduleEntry, deleteScheduleEntry, type ScheduleEntry, type ScheduleCreate } from '../api/personalClient'

export function SchedulePage() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(today)
  const [form, setForm] = useState<ScheduleCreate>({ title: '', date: today, category: 'work' })

  const load = () =>
    getSchedule({ date_from: dateFrom })
      .then(setEntries)
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [dateFrom]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createScheduleEntry(form)
    setShowForm(false)
    setForm({ title: '', date: today, category: 'work' })
    load()
  }

  const remove = async (id: number) => {
    await deleteScheduleEntry(id)
    load()
  }

  const grouped = entries.reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
    acc[e.date] = acc[e.date] || []
    acc[e.date].push(e)
    return acc
  }, {})

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="text-slate-400 text-sm mt-0.5">Time-blocked calendar</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          + Add Entry
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2">
        <label className="text-slate-400 text-sm">From:</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm" />
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-3">
          <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            placeholder="Event title"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="time" value={form.start_time || ''} onChange={e => setForm({...form, start_time: e.target.value})}
              placeholder="Start"
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="time" value={form.end_time || ''} onChange={e => setForm({...form, end_time: e.target.value})}
              placeholder="End"
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm">
              {['work', 'meeting', 'personal', 'health', 'learning'].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          </div>
          <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})}
            placeholder="Notes (optional)" rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-slate-600 text-sm text-center py-12">No entries from this date.</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).sort().map(([date, dayEntries]) => (
            <div key={date}>
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                {new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div className="space-y-2">
                {dayEntries.map(e => (
                  <div key={e.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-16 text-xs text-slate-400 shrink-0 pt-0.5">
                      {e.start_time || '—'}
                      {e.end_time && <><br/>{e.end_time}</>}
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{e.title}</div>
                      <div className="text-slate-500 text-xs">{e.category}</div>
                      {e.notes && <div className="text-slate-400 text-xs mt-1">{e.notes}</div>}
                    </div>
                    <button onClick={() => remove(e.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
