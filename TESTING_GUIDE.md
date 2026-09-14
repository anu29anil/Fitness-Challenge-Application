# Testing Guide

Start the backend and frontend using [QUICK_START.md](QUICK_START.md). Use a fresh browser session or log out before authentication tests.

## Registration and login

1. Register a user with a unique username, email, and full name.
2. Verify the successful registration response includes a unique `userId` in the `USR001` format.
3. Verify that duplicate username, email, or first-and-last-name registrations are rejected.
4. Log in and verify redirect to `/dashboard`.
5. Log out and verify protected routes redirect to `/login`.

## Record Activity

1. Open **Record Activity** from the left sidebar.
2. Verify the dropdown has Running, Walking, Cycling, Swimming, Gym, and Daily Steps.
3. Verify the metric label changes to km, minutes, or steps as appropriate.
4. Log an activity for today and a past date.
5. Verify flooring: 1.55 km walking gives 77 points; 1.9 gym minutes gives 5 points; 399 steps gives 3 points.

## Dashboard

1. Verify Today’s Points includes today’s logged activity.
2. Verify Global Rank appears once the user has activity.
3. Log activity on consecutive dates including today; verify Current Streak changes correctly.
4. Verify active calendar days show a check mark.
5. Change month/year using calendar arrows and select a date. Confirm the right-side Activity History lists only that date’s activities.
6. Change the Activity Volume selector between Steps, Distance, and Duration; verify the line chart updates.
7. Verify the Sports Preference pie chart shows only activity types with data.

## Leaderboard

1. Register/log in as two users in separate browser sessions.
2. Record activity for each user.
3. Confirm cumulative points and rank ordering on the global leaderboard.
4. Confirm the leaderboard updates within 15 seconds after a user logs activity.
5. Confirm the personal ranking-trend chart displays saved activity dates and ranks.

## Build check

## Administrator workspace

1. On a fresh setup, set `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` in `backend/.env` before starting the backend. Do not create this account through public Sign Up.
2. Log in as the provisioned account and verify it redirects to `/admin/dashboard`.
3. Confirm the dashboard shows total users, total activities, active users, user growth, and recent activity.
4. Select **View All** in Recent activities and confirm it opens `/admin/activities` with all clients' entries.
5. Check **Users** and **Leaderboard** from the administrator sidebar.
6. Log in as a regular client and confirm `/admin/dashboard` redirects to `/dashboard` and direct admin API requests receive `403 Forbidden`.

```powershell
cd frontend
npm run build
```

The build should finish without errors.
