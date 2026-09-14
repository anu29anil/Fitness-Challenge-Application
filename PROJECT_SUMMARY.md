# Project Summary

## Product

Neogov Fitness Activity Tracker is a React + FastAPI web app for recording fitness activities, assigning points, displaying a personal dashboard, and ranking users globally.

## Current architecture

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Zustand, Axios.
- **Backend:** FastAPI, SQLAlchemy, python-jose, Passlib/bcrypt.
- **Storage:** persistent SQLite database at `backend/fitness.db`.
- **Authentication:** JWT bearer token, stored in local storage.
- **Account identifiers:** internal numeric IDs plus a unique public `userId` formatted as `USR001`.

## Current pages

| Route | Purpose |
| --- | --- |
| `/login` | Split-screen login page |
| `/register` | Account creation |
| `/dashboard` | Personal points, rank, streak, calendar/history, activity-volume chart, and preference chart |
| `/record-activity` | Activity type, matching metric, and activity-date entry |
| `/leaderboard` | Global cumulative ranks and personal rank trend |
| `/admin/dashboard` | Protected administrator overview of client data |
| `/admin/users` | Registered users with activity and points totals |
| `/admin/leaderboard` | Global client rankings for administration |
| `/admin/activities` | All client activity records |

## Activity and scoring

| Activity | Metric | Points |
| --- | --- | --- |
| Running | distance in km | 100/km, floor fractional points |
| Walking | distance in km | 50/km, floor fractional points |
| Cycling | distance in km | 25/km, floor fractional points |
| Swimming | completed minutes | 15/minute |
| Gym | completed minutes | 5/minute |
| Daily Steps | completed 100-step blocks | 1/block |

## Dashboard behavior

- Current streak counts consecutive days ending today with activity.
- Calendar marks active dates and supports month navigation and date selection.
- The volume chart supports steps, distance, and duration.
- The preference pie chart only shows recorded activity types.

## Ranking behavior

- Every valid saved activity contributes to a user’s cumulative points.
- The global leaderboard refreshes in the client every 15 seconds.
- The rank-trend endpoint derives a user’s historical cumulative rank from saved activity dates.

## Active API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `POST /api/activities`
- `GET /api/activities`
- `GET /api/leaderboard`
- `GET /api/leaderboard/trend`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/activities`

## Administrator behavior

- Initial administrator credentials are supplied as deployment environment variables; the backend creates the account with a bcrypt password hash and role `admin`.
- Public registration always creates role `client`; the registration request has no role input.
- Administrator endpoints validate the database role on the API before returning aggregate user data and return `403 Forbidden` to clients.
- The administrator dashboard's Recent activities **View All** link opens the complete all-client Activity History page.

The active data model contains only users, workouts, registration-name reservations, and activity-submission reservations.
