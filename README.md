# Neogov Fitness Activity Tracker

A full-stack activity tracker built with React, TypeScript, FastAPI, and SQLite. Users log daily fitness activity, earn points, view personal progress, and compare cumulative scores globally.

## Features

- JWT registration/login; duplicate username, email, and full-name prevention.
- Every account receives a database-enforced unique public user ID such as `USR001`.
- Split-screen login and responsive authenticated layout.
- Record Running, Walking, Cycling, Swimming, Gym, or Daily Steps for any date.
- Consistent point conversion using required floor rules.
- Personal dashboard: today's points, global rank, streak, calendar/history, volume line chart, and preference pie chart.
- Global cumulative leaderboard that refreshes every 15 seconds.
- Personal rank-over-time line chart.
- Role-protected administrator workspace with client totals, user growth,
  user records, global rankings, and all-client activity history.
- Persistent local SQLite data in `backend/fitness.db`.

## Activity scoring

| Activity | Metric | Points |
| --- | --- | --- |
| Running | km | 100/km; fractional points floor |
| Walking | km | 50/km; fractional points floor |
| Cycling | km | 25/km; fractional points floor |
| Swimming | completed minutes | 15/minute |
| Gym | completed minutes | 5/minute |
| Daily Steps | completed blocks of 100 steps | 1/block |

## Pages

- `/dashboard` — personal dashboard
- `/record-activity` — activity entry
- `/leaderboard` — global rankings and personal rank trend

## Current API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me`
- `POST /api/activities`, `GET /api/activities`
- `GET /api/leaderboard`, `GET /api/leaderboard/trend`
- `GET /api/admin/overview`, `GET /api/admin/users`, `GET /api/admin/activities` (administrator only)

## Administrator access

Before the first backend start on a new deployment, set
`INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` in `backend/.env`.
The backend provisions this account with role `admin` and stores only a bcrypt
password hash. Public registration accepts no role field and always creates a
`client` account. Administrator endpoints validate the database role on the API,
not just the frontend route.

## Run locally

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.
