import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/utils/apiClient";
import { useAuthStore } from "@/store/authStore";

type Activity = {
  id: number;
  activity_type: string;
  value: number;
  points: number;
  recorded_at: string;
};
type Leader = { rank: number; user_id: number };
const labels: Record<string, string> = {
  running: "Running",
  walking: "Walking",
  cycling: "Cycling",
  swimming: "Swimming",
  gym: "Gym",
  daily_steps: "Daily Steps",
};
const icons: Record<string, string> = {
  running: "🏃",
  walking: "🚶",
  cycling: "🚴",
  swimming: "🏊",
  gym: "🏋",
  daily_steps: "👟",
};
const units: Record<string, string> = {
  running: "km",
  walking: "km",
  cycling: "km",
  swimming: "min",
  gym: "min",
  daily_steps: "steps",
};
const colors = [
  "#ff5b17",
  "#1687e8",
  "#16a765",
  "#a855e6",
  "#ec4899",
  "#eab308",
];

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const ReferenceDashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [axis, setAxis] = useState<"steps" | "distance" | "duration">("steps");
  const [hoveredPreference, setHoveredPreference] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    Promise.all([apiClient.get("/activities"), apiClient.get("/leaderboard")])
      .then(([activityResponse, leaderboardResponse]) => {
        setActivities(activityResponse.data);
        setLeaders(leaderboardResponse.data);
      })
      .catch(() => {});
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayPoints = activities
    .filter((activity) => activity.recorded_at.slice(0, 10) === today)
    .reduce((sum, activity) => sum + activity.points, 0);
  const rank = leaders.find((leader) => leader.user_id === user?.id)?.rank;
  const activeDays = new Set(
    activities.map((activity) => activity.recorded_at.slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const recent = activities
    .slice()
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
    .filter((activity) => activity.recorded_at.slice(0, 10) === selectedDate);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const keyFor = (day: number) =>
    `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const calendarDays = [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  const volumeValue = (activity: Activity) =>
    axis === "steps" && activity.activity_type === "daily_steps"
      ? activity.value
      : axis === "distance" &&
          ["running", "walking", "cycling"].includes(activity.activity_type)
        ? activity.value
        : axis === "duration" &&
            ["swimming", "gym"].includes(activity.activity_type)
          ? activity.value
          : 0;
  const volumeDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: activities
        .filter((activity) => activity.recorded_at.slice(0, 10) === key)
        .reduce((sum, activity) => sum + volumeValue(activity), 0),
    };
  });
  const volumeMax = Math.max(1, ...volumeDays.map((item) => item.value));
  const chartPath = volumeDays
    .map(
      (item, index) =>
        `${index ? "L" : "M"} ${34 + index * 76} ${148 - (item.value / volumeMax) * 108}`,
    )
    .join(" ");
  const preference = useMemo(
    () =>
      Object.keys(labels)
        .map((key) => ({
          key,
          points: activities
            .filter((activity) => activity.activity_type === key)
            .reduce((sum, activity) => sum + activity.points, 0),
        }))
        .filter((item) => item.points),
    [activities],
  );
  const totalPreference = preference.reduce(
    (sum, item) => sum + item.points,
    0,
  );
  let pieOffset = 0;
  const preferenceSegments = preference.map((item, index) => {
    const percent = (item.points / totalPreference) * 100;
    const segment = { ...item, color: colors[index], percent, offset: pieOffset };
    pieOffset += percent;
    return segment;
  });
  const hoveredSegment = preferenceSegments.find((item) => item.key === hoveredPreference);
  const personalBests = Object.keys(labels)
    .map((type) => {
      const matching = activities.filter(
        (activity) => activity.activity_type === type,
      );
      return matching.length
        ? {
            type,
            value: Math.max(...matching.map((activity) => activity.value)),
          }
        : null;
    })
    .filter(Boolean) as { type: string; value: number }[];
  const highDay = activities.reduce<Record<string, number>>(
    (totals, activity) => {
      const key = activity.recorded_at.slice(0, 10);
      totals[key] = (totals[key] || 0) + activity.points;
      return totals;
    },
    {},
  );
  const bestDayPoints = Math.max(0, ...Object.values(highDay));

  return (
    <main className="min-h-screen bg-[#fffaf7] px-4 py-7 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1240px] space-y-4">
        <header className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome, {user?.first_name || "there"}!
            </h1>
            <p className="mt-1 text-base text-slate-500">
              Stay consistent. A healthier, stronger you is in progress.
            </p>
          </div>
          <div className="text-left text-slate-600 md:text-right">
            <p className="font-medium">
              ▣ &nbsp;
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-sm text-slate-500">Make today count!</p>
          </div>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Today's points",
              value: todayPoints.toLocaleString(),
            },
            {
              label: "Global rank",
              value: rank ? `#${rank}` : "—",
            },
            {
              label: "Current streak",
              value: `${streak} day${streak === 1 ? "" : "s"}`,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="flex min-h-28 items-center rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"
            >
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <div className="flex flex-wrap items-baseline gap-3">
                  <b className="text-3xl font-extrabold">{card.value}</b>
                </div>
              </div>
            </div>
          ))}
        </section>
        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Activity this month</h2>
              <div className="flex items-center gap-5 font-semibold">
                <button
                  aria-label="Previous month"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() - 1, 1),
                    )
                  }
                >
                  ‹
                </button>
                <span>
                  {month.toLocaleString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  aria-label="Next month"
                  onClick={() =>
                    setMonth(
                      new Date(month.getFullYear(), month.getMonth() + 1, 1),
                    )
                  }
                >
                  ›
                </button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <b key={day} className="pb-2 text-slate-500">
                  {day}
                </b>
              ))}
              {calendarDays.map((day, index) => {
                if (!day) return <span key={`blank-${index}`} />;
                const key = keyFor(day);
                const isActive = activeDays.has(key);
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`relative flex h-11 items-center justify-center rounded-xl font-medium ${isToday ? "bg-orange-500 text-white" : isActive ? "bg-orange-50 text-orange-600" : ""}`}
                  >
                    {day}
                    {isActive && (
                      <span
                        className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isToday ? "bg-white" : "bg-orange-500"}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <aside className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent activity</h2>
            </div>
            <div className="mt-3 divide-y divide-stone-100">
              {recent.length ? (
                recent.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-xl">
                      {icons[activity.activity_type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b>{labels[activity.activity_type]}</b>
                      <p className="truncate text-xs text-slate-500">
                        {activity.value} {units[activity.activity_type]} ·{" "}
                        {formatDate(activity.recorded_at)}
                      </p>
                    </div>
                    <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600">
                      {activity.points} pts
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-16 text-center text-slate-500">
                  No activity on this date.
                </p>
              )}
            </div>
          </aside>
        </section>
        <section className="grid gap-4 lg:grid-cols-7">
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Activity volume over time</h2>
              <div className="flex overflow-hidden rounded-lg border border-stone-200 text-sm">
                {(["steps", "distance", "duration"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setAxis(option)}
                    className={`px-3 py-2 capitalize ${axis === option ? "bg-orange-500 font-semibold text-white" : "bg-white text-slate-600"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            {activities.length ? (
              <svg
                viewBox="0 0 500 190"
                className="mt-4 w-full"
                role="img"
                aria-label="Activity volume line chart"
              >
                <line x1="34" y1="148" x2="490" y2="148" stroke="#d9dee7" />
                <line x1="34" y1="94" x2="490" y2="94" stroke="#eef0f4" />
                <line x1="34" y1="40" x2="490" y2="40" stroke="#eef0f4" />
                <path
                  d={chartPath}
                  fill="none"
                  stroke="#ff5b17"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {volumeDays.map((item, index) => (
                  <g key={item.key}>
                    <circle
                      cx={34 + index * 76}
                      cy={148 - (item.value / volumeMax) * 108}
                      r="4"
                      fill="#ff5b17"
                    />
                    <text
                      x={34 + index * 76}
                      y="174"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#64748b"
                    >
                      {item.label}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <p className="py-16 text-center text-slate-500">
                No activity recorded yet.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold">Sports preference</h2>
            <div className="mt-5 flex justify-center">
              {preference.length ? (
                <div className="relative w-full max-w-[220px] aspect-square">
                  <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Sports preference pie chart" onMouseLeave={() => setHoveredPreference(null)}>
                    <g transform="rotate(-90 50 50)">
                      {preferenceSegments.map((segment) => (
                        <circle key={segment.key} pathLength="100" cx="50" cy="50" r="39" fill="none" stroke={segment.color} strokeWidth="22" strokeDasharray={`${segment.percent} ${100 - segment.percent}`} strokeDashoffset={-segment.offset} className="cursor-pointer transition-opacity hover:opacity-75" onMouseEnter={() => setHoveredPreference(segment.key)}>
                          <title>{`${labels[segment.key]} ${Math.round(segment.percent)}%`}</title>
                        </circle>
                      ))}
                    </g>
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-[48%] w-[48%] flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                      {hoveredSegment ? <><b className="text-xl leading-none text-slate-900">{Math.round(hoveredSegment.percent)}%</b><span className="mt-1 text-xs text-slate-500">{labels[hoveredSegment.key]}</span></> : <span className="px-2 text-xs text-slate-500">Hover a slice</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-12 text-slate-500">No activity yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-bold">Personal bests</h2>
            <div className="mt-3 divide-y divide-stone-100">
              {personalBests.length ? (
                personalBests.slice(0, 3).map((best) => (
                  <div key={best.type} className="flex items-center gap-3 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-lg">
                      {icons[best.type]}
                    </span>
                    <div>
                      <p className="text-sm text-slate-500">
                        Best {labels[best.type].toLowerCase()}
                      </p>
                      <b>
                        {best.value} {units[best.type]}
                      </b>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-12 text-slate-500">No personal bests yet.</p>
              )}
              {bestDayPoints > 0 && (
                <div className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-lg">
                    🏆
                  </span>
                  <div>
                    <p className="text-sm text-slate-500">
                      Highest points (single day)
                    </p>
                    <b>{bestDayPoints.toLocaleString()}</b>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
