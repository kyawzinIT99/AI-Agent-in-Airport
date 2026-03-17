import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

export interface Task {
  id: number
  title: string
  description?: string
  priority: string
  category: string
  status: string
  due_date?: string
  estimated_minutes?: number
  notes?: string
}

export interface TaskCreate {
  title: string
  description?: string
  priority?: string
  category?: string
  status?: string
  due_date?: string
  estimated_minutes?: number
  notes?: string
}

export interface ScheduleEntry {
  id: number
  title: string
  date: string
  start_time?: string
  end_time?: string
  category: string
  notes?: string
  recurring: boolean
  task_id?: number
}

export interface ScheduleCreate {
  title: string
  date: string
  start_time?: string
  end_time?: string
  category?: string
  notes?: string
  recurring?: boolean
  task_id?: number
}

export interface Briefing {
  id: number
  briefing_date: string
  status: string
  planner_output?: string
  scheduler_output?: string
  coach_output?: string
  combined_output?: string
  error_message?: string
}

export const getTasks = (params?: { status?: string; category?: string; priority?: string }): Promise<Task[]> =>
  api.get('/tasks', { params }).then(r => r.data)

export const createTask = (body: TaskCreate): Promise<Task> =>
  api.post('/tasks', body).then(r => r.data)

export const updateTask = (id: number, body: Partial<TaskCreate & { status: string }>): Promise<Task> =>
  api.patch(`/tasks/${id}`, body).then(r => r.data)

export const deleteTask = (id: number): Promise<void> =>
  api.delete(`/tasks/${id}`).then(r => r.data)

export const getSchedule = (params?: { date_from?: string; date_to?: string }): Promise<ScheduleEntry[]> =>
  api.get('/schedule', { params }).then(r => r.data)

export const createScheduleEntry = (body: ScheduleCreate): Promise<ScheduleEntry> =>
  api.post('/schedule', body).then(r => r.data)

export const deleteScheduleEntry = (id: number): Promise<void> =>
  api.delete(`/schedule/${id}`).then(r => r.data)

export const getLatestBriefing = (): Promise<Briefing> =>
  api.get('/briefing/latest').then(r => r.data)

export const runBriefing = (): Promise<Briefing> =>
  api.post('/briefing/run').then(r => r.data)
