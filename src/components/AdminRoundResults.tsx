"use client";

import { useState } from "react";
import { flagUrl, countryName } from "@/lib/matches";

type Prediction = {
  user_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  profile_name: string | null;
};

export type MatchRow = {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  home_score: number;
  away_score: number;
  match_date: string;
  stage: string;
  group_name: string | null;
  predictions: Prediction[];
};

export function AdminRoundResults({ matches }: { matches: MatchRow[] }) {
  const [selectedId, setSelectedId] = useState(matches[0]?.id ?? "");

  if (matches.length === 0) {
    return <p className="text-slate-500 text-sm">Nenhum jogo finalizado ainda.</p>;
  }

  const match = matches.find((m) => m.id === selectedId) ?? matches[0];

  function teamLabel(flag: string | null, name: string) {
    return flag ? (countryName(flag, "pt") ?? name) : name;
  }

  function pointsBadge(pts: number | null) {
    if (pts === null) return <span className="text-slate-500">—</span>;
    const color =
      pts >= 7 ? "bg-green-500/20 text-green-300" :
      pts >= 3 ? "bg-yellow-500/20 text-yellow-300" :
      pts > 0  ? "bg-blue-500/20 text-blue-300" :
                 "bg-slate-700 text-slate-400";
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{pts} pt{pts !== 1 ? "s" : ""}</span>;
  }

  const homeFlag = flagUrl(match.home_flag);
  const awayFlag = flagUrl(match.away_flag);
  const homeName = teamLabel(match.home_flag, match.home_team);
  const awayName = teamLabel(match.away_flag, match.away_team);

  return (
    <div className="space-y-4">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 w-full"
      >
        {matches.map((m) => {
          const d = new Date(m.match_date).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit", month: "2-digit",
            hour: "2-digit", minute: "2-digit",
          });
          const home = teamLabel(m.home_flag, m.home_team);
          const away = teamLabel(m.away_flag, m.away_team);
          return (
            <option key={m.id} value={m.id}>
              {d} — {home} {m.home_score}×{m.away_score} {away}
            </option>
          );
        })}
      </select>

      <div className="bg-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {match.group_name && <span>Grupo {match.group_name}</span>}
            <span>{match.stage}</span>
          </div>
          <span className="text-slate-400 text-xs">
            {new Date(match.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 py-4 px-4">
          <div className="flex items-center gap-2 justify-end flex-1">
            {homeFlag && <img src={homeFlag} alt="" className="w-6 h-auto" />}
            <span className="text-white font-semibold text-sm">{homeName}</span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {match.home_score} – {match.away_score}
          </div>
          <div className="flex items-center gap-2 flex-1">
            {awayFlag && <img src={awayFlag} alt="" className="w-6 h-auto" />}
            <span className="text-white font-semibold text-sm">{awayName}</span>
          </div>
        </div>

        {match.predictions.length === 0 ? (
          <p className="text-slate-500 text-xs px-4 pb-3">Nenhum palpite para este jogo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs border-t border-slate-600">
                <th className="text-left px-4 py-2">Jogador</th>
                <th className="text-center px-2 py-2">Palpite</th>
                <th className="text-right px-4 py-2">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {match.predictions.map((p, i) => (
                <tr key={i} className="border-t border-slate-600/50">
                  <td className="px-4 py-2 text-slate-200">{p.profile_name ?? "—"}</td>
                  <td className="px-2 py-2 text-center font-mono text-white">
                    {p.home_score} – {p.away_score}
                  </td>
                  <td className="px-4 py-2 text-right">{pointsBadge(p.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
