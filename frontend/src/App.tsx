import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { OfficePage } from './pages/OfficePage'
import { Dashboard } from './pages/Dashboard'
import { TasksPage } from './pages/TasksPage'
import { SchedulePage } from './pages/SchedulePage'
import { BriefingPage } from './pages/BriefingPage'
import { ReportsHistory } from './pages/ReportsHistory'
import { ReportDetail } from './pages/ReportDetail'
import { CommitsPage } from './pages/CommitsPage'
import { IssuesPage } from './pages/IssuesPage'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-purple-700/60 text-white'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        {/* Nav */}
        <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1 flex-wrap">
            <NavLink to="/" className="text-white font-bold text-sm mr-3">
              ✈️ AI Agent Airport
            </NavLink>
            <NavItem to="/office"   label="Airport Sim" />
            <NavItem to="/tasks"    label="Tasks" />
            <NavItem to="/schedule" label="Schedule" />
            <NavItem to="/briefing" label="Briefing" />
            <NavItem to="/reports"  label="Reports" />
            <NavItem to="/commits"  label="Commits" />
            <NavItem to="/issues"   label="Issues" />
          </div>
        </nav>

        {/* Pages */}
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/office"     element={<OfficePage />} />
            <Route path="/tasks"      element={<TasksPage />} />
            <Route path="/schedule"   element={<SchedulePage />} />
            <Route path="/briefing"   element={<BriefingPage />} />
            <Route path="/reports"    element={<ReportsHistory />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
            <Route path="/commits"    element={<CommitsPage />} />
            <Route path="/issues"     element={<IssuesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
