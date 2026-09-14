import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/utils/apiClient";
import { useAuthStore } from "@/store/authStore";

type Row = {
  rank: number;
  user_id: number;
  first_name: string;
  last_name: string;
  points: number;
};
type Point = { date: string; rank: number };

const medalStyle: Record<number, string> = {
  1: "bg-amber-400 text-white",
  2: "bg-slate-400 text-white",
  3: "bg-orange-700 text-white",
};

export const ReferenceLeaderboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [rows, setRows] = useState<Row[]>([]);
  const [trend, setTrend] = useState<Point[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setRows((await apiClient.get("/leaderboard")).data);
      } catch {}
      try {
        setTrend((await apiClient.get("/leaderboard/trend")).data);
      } catch {}
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const chart = useMemo(() => {
    if (!trend.length) return null;
    const points = trend.slice(-7);
    const width = 540;
    const height = 230;
    const pad = { left: 62, right: 38, top: 18, bottom: 38 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const largestRank = Math.max(5, ...points.map((point) => point.rank));
    const x = (index: number) =>
      pad.left + (index * chartWidth) / Math.max(1, points.length - 1);
    const y = (rank: number) =>
      pad.top + ((rank - 1) * chartHeight) / Math.max(1, largestRank - 1);
    return {
      width,
      height,
      pad,
      points,
      largestRank,
      x,
      y,
      path: points
        .map(
          (point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point.rank)}`,
        )
        .join(" "),
      gridRanks: Array.from(
        { length: Math.min(largestRank, 5) },
        (_, index) => index + 1,
      ),
    };
  }, [trend]);

  return (
    <main className="min-h-screen bg-[#fffaf7] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-5 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-2xl">
            🏆
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            Global Leaderboard
          </h1>
        </header>
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="min-h-[380px] rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-[52px_1fr_auto] border-b border-stone-100 px-3 pb-3 text-base font-bold text-slate-500">
              <span>#</span>
              <span>Name</span>
              <span>Points</span>
            </div>
            <div className="divide-y divide-stone-100">
              {rows.length ? (
                rows.map((row) => (
                  <div
                    key={row.user_id}
                    className={`grid grid-cols-[52px_1fr_auto] items-center px-3 py-3 ${row.user_id === user?.id ? "bg-orange-50/70" : ""}`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${medalStyle[row.rank] || "bg-slate-100 text-slate-600"}`}
                    >
                      {row.rank}
                    </span>
                    <b className="text-base text-slate-950">
                      {row.first_name} {row.last_name}
                    </b>
                    <span
                      className={`text-lg font-bold ${row.rank === 1 ? "text-orange-500" : "text-slate-900"}`}
                    >
                      {row.points.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-24 text-center text-slate-500">
                  No activity logged yet.
                </p>
              )}
            </div>
          </div>
          <div className="min-h-[380px] rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <header>
              <h2 className="text-2xl font-extrabold text-slate-950">
                Ranking trend
              </h2>
            </header>
            {chart ? (
              <svg
                className="mt-4 h-auto w-full max-w-[640px]"
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                preserveAspectRatio="xMinYMid meet"
                role="img"
                aria-label="Your rank over time"
              >
                <defs>
                  <linearGradient id="rank-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ff5b17" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#ff5b17" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chart.gridRanks.map((rank) => (
                  <g key={rank}>
                    <line
                      x1={chart.pad.left}
                      y1={chart.y(rank)}
                      x2={chart.width - chart.pad.right}
                      y2={chart.y(rank)}
                      stroke="#e7ebf0"
                    />
                    <text
                      x={chart.pad.left - 12}
                      y={chart.y(rank) + 4}
                      textAnchor="end"
                      fontSize="12"
                      fontWeight="600"
                      fill="#475569"
                    >
                      #{rank}
                    </text>
                  </g>
                ))}
                {chart.points.map((point, index) => (
                  <line
                    key={point.date}
                    x1={chart.x(index)}
                    y1={chart.pad.top}
                    x2={chart.x(index)}
                    y2={chart.height - chart.pad.bottom}
                    stroke="#eef0f4"
                  />
                ))}
                <path
                  d={`${chart.path} L ${chart.x(chart.points.length - 1)} ${chart.height - chart.pad.bottom} L ${chart.x(0)} ${chart.height - chart.pad.bottom} Z`}
                  fill="url(#rank-area)"
                />
                <path
                  d={chart.path}
                  fill="none"
                  stroke="#ff5b17"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {chart.points.map((point, index) => (
                  <g key={point.date}>
                    <circle
                      cx={chart.x(index)}
                      cy={chart.y(point.rank)}
                      r="4.5"
                      fill="#ff5b17"
                    >
                      <title>{`${point.date}: rank ${point.rank}`}</title>
                    </circle>
                    <text
                      x={chart.x(index)}
                      y={chart.height - 12}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#475569"
                    >
                      {new Date(`${point.date}T00:00:00`).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <p className="py-32 text-center text-slate-500">
                Log activity to build your ranking trend.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
