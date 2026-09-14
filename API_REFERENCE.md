# API Reference

Base URL: `http://localhost:8000/api`.

Authenticated endpoints require `Authorization: Bearer <token>`.

## Authentication

- `POST /auth/register` — `{ username, email, password, first_name, last_name }`
- `POST /auth/login` — `{ username, password }`; returns an access token.
- `GET /users/me` — returns the authenticated user profile.

Registration rejects an existing username, email, or first-name/last-name pair.

## Activities

- `POST /activities` — `{ activity_type, value, activity_date }`
- `GET /activities` — returns the current user’s saved activities with awarded points.

Accepted activity types: `running`, `walking`, `cycling`, `swimming`, `gym`, `daily_steps`.

## Rankings

- `GET /leaderboard` — global cumulative point rankings.
- `GET /leaderboard/trend` — current user’s historical rank data, shaped as `{ date, rank }`.
