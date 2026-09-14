import React, { useEffect, useState } from "react";
import { apiClient } from "@/utils/apiClient";

type Leader = { rank: number; user_id: number; first_name: string; last_name: string; username: string; points: number };

export const AdminLeaderboardPage: React.FC = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  useEffect(() => { apiClient.get<Leader[]>("/leaderboard").then((response) => setLeaders(response.data)).catch(() => {}); }, []);
  return <main className="min-h-screen bg-[#fffaf7] px-4 py-7 text-slate-900 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1000px]"><header><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Global leaderboard</h1><p className="mt-1 text-slate-500">Current client rankings based on all recorded activity points.</p></header><section className="mt-6 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm"><table className="w-full text-left"><thead className="border-b border-stone-100 bg-stone-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-4">Rank</th><th className="px-6 py-4">Client</th><th className="px-6 py-4 text-right">Points</th></tr></thead><tbody className="divide-y divide-stone-100">{leaders.map((leader) => <tr key={leader.user_id}><td className="px-6 py-5"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-600">{leader.rank}</span></td><td className="px-6 py-5"><b>{leader.first_name} {leader.last_name}</b><p className="mt-1 text-xs text-slate-500">@{leader.username}</p></td><td className="px-6 py-5 text-right text-lg font-extrabold text-orange-600">{leader.points.toLocaleString()}</td></tr>)}{!leaders.length && <tr><td colSpan={3} className="px-6 py-16 text-center text-slate-500">No leaderboard entries yet.</td></tr>}</tbody></table></section></div></main>;
};
