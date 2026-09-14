import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/utils/apiClient";

type Activity = {
  id: number;
  user_name: string;
  activity_type: string;
  value: number;
  points: number;
  recorded_at: string;
};

type Overview = {
  total_users: number;
  total_activities: number;
  active_users: number;
  growth: { date: string; users: number }[];
  recent_activities: Activity[];
};

const labels: Record<string, string> = {
  running: "Running", walking: "Walking", cycling: "Cycling",
  swimming: "Swimming", gym: "Gym", daily_steps: "Daily steps",
};
const units: Record<string, string> = {
  running: "km", walking: "km", cycling: "km", swimming: "min", gym: "min", daily_steps: "steps",
};

const shortDate = (date: string) => new Date(date).toLocaleDateString(undefined, {
  month: "short", day: "numeric", year: "numeric",
});

export const AdminDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    apiClient.get<Overview>("/admin/overview").then((response) => setOverview(response.data)).catch(() => {});
  }, []);

  const chart = useMemo(() => {
    const data = overview?.growth ?? [];
    const max = Math.max(1, ...data.map((item) => item.users));
    return data.map((item, index) => ({
      ...item,
      x: 46 + index * 70,
      y: 158 - (item.users / max) * 112,
      label: new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));
  }, [overview]);
  const line = chart.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

  return (
    <main className="min-h-screen bg-[#fffaf7] px-4 py-7 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <header><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome, Admin!</h1></header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Total users", overview?.total_users ?? 0, "Users"],
            ["Total activities", overview?.total_activities ?? 0, "Activity"],
            ["Active users", overview?.active_users ?? 0, "Active in the last 7 days"],
          ].map(([label, value, hint]) => (
            <article key={String(label)} className="min-h-32 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
              <div><p className="text-base text-slate-500">{label}</p><p className="mt-1 text-3xl font-extrabold">{Number(value).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <article className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">User growth</h2><span className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-slate-600">Last 7 days</span></div>
            <svg viewBox="0 0 500 205" className="mt-4 w-full" role="img" aria-label="User growth over the last seven days">
              {[46, 102, 158].map((y) => <line key={y} x1="46" y1={y} x2="466" y2={y} stroke="#edf0f3" />)}
              <line x1="46" y1="158" x2="466" y2="158" stroke="#cfd7e1" />
              {line && <path d={`${line} L 466 158 L 46 158 Z`} fill="#ff5b17" opacity="0.10" />}
              {line && <path d={line} fill="none" stroke="#ff5b17" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
              {chart.map((point) => <g key={point.date}><circle cx={point.x} cy={point.y} r="4.5" fill="#ff5b17" /><text x={point.x} y="182" textAnchor="middle" fontSize="11" fill="#64748b">{point.label}</text></g>)}
              <text x="15" y="112" transform="rotate(-90 15 112)" fontSize="12" fill="#64748b">Total users</text>
            </svg>
          </article>
          <article className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Recent activities</h2><Link to="/admin/activities" className="text-sm font-semibold text-orange-600 hover:text-orange-700">View All</Link></div>
            <div className="mt-3 divide-y divide-stone-100">
              {overview?.recent_activities.length ? overview.recent_activities.map((activity) => <div key={activity.id} className="flex items-center gap-3 py-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-orange-600">{labels[activity.activity_type]?.slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><b className="block truncate text-sm">{activity.user_name}</b><p className="truncate text-xs text-slate-500">{labels[activity.activity_type]} · {activity.value} {units[activity.activity_type]} · {activity.points} points</p></div><time className="shrink-0 text-xs text-slate-500">{shortDate(activity.recorded_at)}</time></div>) : <p className="py-16 text-center text-slate-500">No activity recorded yet.</p>}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};
