# Quick Start

## Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

The API starts at `http://localhost:8000`. Data persists in `backend/fitness.db`.

## Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## App flow

1. Create a unique account and log in.
2. Use **Record Activity** to add Running, Walking, Cycling, Swimming, Gym, or Daily Steps for a date.
3. Check **Dashboard** for points, rank, streak, calendar/history, activity volume, and sports preference.
4. Check **Leaderboard** for global points/ranks and your ranking trend.

## Administrator workspace

Before the first backend start on a new deployment, set
`INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` in `backend/.env`.
The backend creates this account directly with a password hash and role
`admin`; it is never created through public Sign Up. Public registration always
creates a `client` account. Sign in with the provisioned account to open the
administrator dashboard, where **View All** in Recent activities opens the
complete client Activity History page.

## Points

- Running: 100/km; Walking: 50/km; Cycling: 25/km.
- Swimming: 15 per completed minute; Gym: 5 per completed minute.
- Daily Steps: 1 per completed 100 steps.
- Partial points, minutes, and step blocks are floored.
