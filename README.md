# AI Agent in Airport ✈️

A full-stack, multi-agent AI simulation built on a **hyper-realistic airport terminal** — live plane landings, a FIDS departure board, Jason PA announcements, and three AI agents managing real airport operations.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | `http://localhost:5174` |
| Backend API | `http://localhost:8000` |
| API Docs | `http://localhost:8000/docs` |
| Office/Airport Sim | `http://localhost:5174/office` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Airport Sim  │  │  Tasks Page  │  │ Reports/Brief │  │
│  │  (Phaser 3)  │  │  + Schedule  │  │    History    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                           │  Axios API Client             │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTP (localhost:8000)
┌───────────────────────────┼─────────────────────────────┐
│              FastAPI Backend (Python)                    │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐  │
│  │  /tasks  │ │/schedule│ │ /reports │ │ /briefing  │  │
│  └──────────┘ └─────────┘ └──────────┘ └────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │           CrewAI Multi-Agent System              │   │
│  │  Developer Agent · QA Agent · PM Agent          │   │
│  │  Planner · Scheduler · Coach · Personal Crew    │   │
│  └──────────────────────────────────────────────────┘   │
│                    SQLite Database                       │
└─────────────────────────────────────────────────────────┘
```

---

## Airport Simulation

The simulation is built with **Phaser 3** and renders a complete airport terminal with real-time animations and voice narration.

### Visual Scene

| Element | Detail |
|---|---|
| **Sky + Exterior** | Deep navy-to-cerulean gradient, sun glow on horizon, animated cloud layers |
| **Green Field** | Grass strip at end of Runway 27L — where the plane touches down |
| **Runway 27L** | Center dashes, yellow edge lights, threshold markings, blinking runway LEDs |
| **Animated Plane** | Descends from top-right, scales up on approach, lands on the field every 28s |
| **Baggage Cart** | Orange tractor + coloured luggage trolley continuously crossing tarmac |
| **FIDS Board** | 8 live departure flights scrolling every 9s with colour-coded status |
| **Terminal Interior** | Polished tile floor, ceiling lights, gate signs (B7 / A12 / C3), wall clock |
| **Agent Counters** | 3 full check-in counters with monitors, scanners, keyboards, chairs |
| **Departure Lounge** | Airport seating blocks, self-check-in kiosk, café station |
| **Network Rack** | Operations rack with blinking server LEDs |

### Three AI Agents

| Agent | Name | Role | Gate | Colour |
|---|---|---|---|---|
| `gate` | **Alex** | Gate Agent | B7 / A5 / A12 | Blue `#3b82f6` |
| `ops` | **Sam** | Operations Controller | C3 / C8 | Amber `#f59e0b` |
| `service` | **Jordan** | Customer Service Manager | B2 / B11 / D1 | Purple `#a855f7` |

Each agent has **30 work · 15 idle · 9 briefing** airport-specific speech bubbles covering their full operational domain.

**Alex** covers: boarding zones, jetbridge, manifest checks, DGR flags, no-shows, standby upgrades, door closures, passport checks, departure confirmations.

**Sam** covers: runway status (27L/28R), ATC clearances, squawk codes, METAR/ATIS, FOD checks, fuel trucks (FT-01/FT-03), tow tractors (TT-07), ARFF alerts, ILS calibration, pushback coordination, departure sequencing.

**Jordan** covers: seat upgrades, IROPS rebookings, PNR amendments, SSR codes (WCHR/KSML/KSML), unaccompanied minors, visa checks, APIS verification, GDS errors, lounge clearances, meal/hotel vouchers, FQTV upgrades, connection protection, complaint logging.

### Jason — PA Announcer

**Jason** is a dedicated deep-voiced airport PA announcer powered by the Web Speech API. He makes automatic announcements every 25 seconds pulled from `airportData.json`:

- Boarding calls (all zones welcome)
- Final boarding calls (gate closing)
- Delay notifications with new ETDs
- Gate change alerts
- Security reminders
- General terminal information

### Departure Sequence (Run Now)

Pressing **▶ Run Now** triggers a full airport departure sequence:

1. Jason announces the sequence over PA
2. All three agents walk to the briefing area
3. Each agent delivers their shift report (spoken + bubble)
4. Agents return to counters
5. AI processes GitHub + Jira data and generates reports
6. Jason closes the sequence

---

## Airport Data — `airportData.json`

All simulation data is stored in [`frontend/src/office/airportData.json`](frontend/src/office/airportData.json) and driven into the scene at runtime. Edit this file to change any airport data without touching TypeScript.

### Data Sections

| Section | Contents |
|---|---|
| `terminal` | Airport name, IATA/ICAO codes, runways, elevation |
| `weather` | Live METAR, wind, visibility, altimeter, ATIS code |
| `flights[]` | 8 departures — aircraft type, registration, crew names, fuel load, cargo, passengers |
| `arrivals[]` | 5 incoming flights with baggage belt assignments |
| `gates[]` | 8 gates — jetbridge, accessibility, assigned agent, flight |
| `agents[]` | 3 agents — name, role, badge ID, shift, certifications, full chat scripts |
| `pa_scripts[]` | 10 Jason announcements — boarding, delays, gate changes, security, general |
| `services.lounges` | Admiral's Club, United Club, Traveller's Retreat — capacity, occupancy, amenities |
| `services.dining` | 6 restaurants/cafés with live wait times |
| `services.shops` | 6 retail outlets across concourses |
| `services.ground_transport` | BART, rideshare, taxi, rental car, hotel shuttle, airport express |
| `services.special_services` | PRM, UM escort, VIP meet & greet, pets, lost & found, medical, currency exchange |
| `services.security` | 5 checkpoints with live wait times (TSA PreCheck, CLEAR, Standard, International) |
| `services.baggage` | 3 active baggage belts with delivery status |
| `ground_ops` | Fuel trucks, ground crew teams, tow tractors, catering by flight |
| `stats` | Daily totals — flights, passengers, on-time %, revenue, gates active |

### Sample Flight Record

```json
{
  "flight_num": "AA 1234",
  "airline": "American Airlines",
  "aircraft": "Boeing 737-800",
  "registration": "N432AA",
  "destination": "New York JFK",
  "scheduled_departure": "14:25",
  "gate": "B7",
  "status": "BOARDING",
  "passengers": 162,
  "seats_total": 175,
  "checked_bags": 148,
  "fuel_loaded_kg": 14200,
  "captain": "Capt. Rodriguez",
  "first_officer": "F/O Chen",
  "cabin_crew": 4
}
```

---

## Backend Workflow

### Routers

| Route | Function |
|---|---|
| `GET /api/tasks` | List personal tasks (filter by status / category / priority) |
| `POST /api/tasks` | Create a new task |
| `PATCH /api/tasks/{id}` | Update task status, priority, notes |
| `DELETE /api/tasks/{id}` | Remove a task |
| `GET /api/schedule` | List schedule entries (filter by date range) |
| `POST /api/schedule` | Create schedule entry |
| `GET /api/reports` | List all AI-generated reports |
| `GET /api/reports/latest` | Fetch the most recent completed report |
| `POST /api/run/now` | Trigger a new agent run immediately |
| `GET /api/run/status/{id}` | Poll run completion status |
| `POST /api/briefing/run` | Run personal briefing (tasks + schedule) |
| `GET /api/briefing/latest` | Get latest personal briefing |

### Agent System (CrewAI)

| Agent | Input | Output |
|---|---|---|
| **Developer Agent** | GitHub commits (last 24h) | Code changes summary, risk flags, follow-ups |
| **QA Agent** | Jira issues | Open bugs, regressions, coverage gaps, quality risk score |
| **PM Agent** | GitHub + Jira combined | Sprint health, blockers, delivery confidence (0–10), next 24h priority |
| **Planner Agent** | Personal tasks | Prioritised daily plan |
| **Scheduler Agent** | Calendar entries | Schedule analysis, meeting load, focus time suggestions |
| **Coach Agent** | Tasks + schedule | Motivational briefing, habit nudges, one key focus |

### Scheduler

A background APScheduler job runs the full agent crew automatically at a configurable interval. Manual trigger available via `POST /api/run/now`.

---

## Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Stats overview, latest report summary, quick actions |
| Airport Simulation | `/office` | Live Phaser 3 airport with agents, plane, FIDS, Jason PA |
| Tasks | `/tasks` | Personal task manager (CRUD, status, priority, category) |
| Schedule | `/schedule` | Daily calendar with time-blocked entries |
| Briefing | `/briefing` | AI-generated personal daily briefing |
| Reports | `/reports` | History of all agent run reports |
| Report Detail | `/reports/:id` | Full developer + QA + PM report with commits and issues |
| Commits | `/commits` | GitHub commit log |
| Issues | `/issues` | Jira issue tracker |

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/kyawzinIT99/AI-Agent-in-Airport.git
cd AI-Agent-in-Airport
```

### 2. Backend

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp .env.example .env             # Fill in API keys
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5174/office
```

### 4. Environment Variables (`.env`)

```env
# AI (required — powers the CrewAI agents)
OPENAI_API_KEY=sk-...

# GitHub (optional — for commit reports)
GITHUB_TOKEN=ghp_...
GITHUB_REPO=owner/repo

# Jira (optional — for issue reports)
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=...
JIRA_PROJECT_KEY=PROJ
```

> Reports still run without GitHub/Jira keys — agents report "no activity in last 24h" until real integrations are configured.

---

## VS Code Setup

This repo ships with a pre-configured `.vscode/` folder so testers can be up and running in one click.

### Recommended Extensions

Install all recommended extensions when VS Code prompts you, or install manually:

| Extension | Purpose |
|---|---|
| Python + Pylance | Backend IntelliSense, type checking |
| Ruff | Python linting + formatting |
| Tailwind CSS IntelliSense | Class name autocomplete |
| ESLint + Prettier | TypeScript / React linting |
| Auto Rename Tag | HTML/JSX tag sync |

Or install all at once:

```bash
code --install-extension ms-python.python \
     --install-extension charliermarsh.ruff \
     --install-extension bradlc.vscode-tailwindcss \
     --install-extension dbaeumer.vscode-eslint \
     --install-extension esbenp.prettier-vscode
```

### One-Click Launch (Full Stack)

1. Open the project root in VS Code: `code .`
2. Press `F5` → select **Full Stack (Backend + Frontend)**
3. Both servers start automatically in the integrated terminal
4. Open `http://localhost:5174/office`

Or launch individually:
- **Backend only** → `F5` → *Backend — FastAPI (uvicorn)*
- **Frontend only** → `F5` → *Frontend — Vite Dev Server*

### Python Interpreter

VS Code will auto-detect `.venv` as the Python interpreter. If not:

1. `Ctrl+Shift+P` → *Python: Select Interpreter*
2. Choose `./.venv/bin/python`

---

## Voice System

All speech uses the **Web Speech API** (no API key needed, runs in-browser).

| Voice Profile | Character | Pitch | Rate |
|---|---|---|---|
| `jason` | PA Announcer | 0.70 | 0.82 |
| `narrator` | System narrator | 1.05 | 0.92 |
| `gate` | Alex (Gate Agent) | 1.10 | 1.05 |
| `ops` | Sam (Operations) | 1.30 | 1.00 |
| `service` | Jordan (Customer Service) | 0.95 | 0.95 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Phaser 3 |
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| AI Agents | CrewAI, Anthropic Claude |
| Voice | Web Speech API (SpeechSynthesis) |
| Scheduler | APScheduler |
| HTTP Client | Axios |

---

## Project Structure

```
AI-Agent-in-Airport/
├── backend/
│   ├── agents/          # CrewAI agent definitions
│   │   ├── crew.py      # Developer + QA + PM agents
│   │   ├── personal_crew.py  # Planner + Scheduler + Coach
│   │   └── ...
│   ├── routers/         # FastAPI route handlers
│   ├── services/        # GitHub, Jira, report services
│   ├── tools/           # GitHub + Jira tool wrappers
│   ├── main.py          # App entry point + CORS
│   ├── models.py        # SQLAlchemy ORM models
│   └── schemas.py       # Pydantic response schemas
├── frontend/
│   ├── src/
│   │   ├── office/
│   │   │   ├── OfficeScene.ts   # Full airport Phaser 3 scene
│   │   │   ├── airportData.json # All airport mock data
│   │   │   └── voice.ts         # Web Speech API voice engine
│   │   ├── pages/
│   │   │   ├── OfficePage.tsx   # Airport simulation page
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TasksPage.tsx
│   │   │   ├── SchedulePage.tsx
│   │   │   ├── BriefingPage.tsx
│   │   │   └── ReportsHistory.tsx
│   │   ├── api/
│   │   │   ├── client.ts        # Reports/commits/issues API
│   │   │   └── personalClient.ts # Tasks/schedule/briefing API
│   │   └── components/
│   └── package.json
├── database/
│   └── agentoffice.db
├── .env.example
└── README.md
```

---

## License

MIT — see [LICENSE](LICENSE)
