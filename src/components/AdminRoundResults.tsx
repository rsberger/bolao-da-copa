import { createClient } from "@/lib/supabase/server";
import { flagUrl, countryName } from "@/lib/matches";

type Prediction = {
  user_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  profile_name: string | null;
};

type MatchRow = {
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

export async function AdminRoundResults() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, home_score, away_score, match_date, stage, group_name")
    .eq("is_finished", true)
    .order("match_date", { ascending: false });

  if (!matches || matches.length === 0) {
    return <p className="text-slate-500 text-sm">Nenhum jogo finalizado ainda.</p>;
  }

  const matchIds = matches.map((m) => m.id);

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, user_id, home_score, away_score, points, profiles(name)")
    .in("match_id", matchIds);

  // Group predictions by match
  const predByMatch: Record<string, Prediction[]> = {};
  for (const p of predictions ?? []) {
    const pred: Prediction = {
      user_id: p.user_id,
      home_score: p.home_score,
      away_score: p.away_score,
      points: p.points,
      profile_name: (p as any).profiles?.name ?? null,
    };
    if (!predByMatch[p.match_id]) predByMatch[p.match_id] = [];
    predByMatch[p.match_id].push(pred);
  }

  // Sort predictions per match by points desc
  for (const key of Object.keys(predByMatch)) {
    predByMatch[key].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }

  const rows: MatchRow[] = matches.map((m) => ({
    ...m,
    home_score: m.home_score ?? 0,
    away_score: m.away_score ?? 0,
    predictions: predByMatch[m.id] ?? [],
  }));

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

  return (
    <div className="space-y-4">
      {rows.map((m) => {
        const homeFlag = flagUrl(m.home_flag);
        const awayFlag = flagUrl(m.away_flag);
        const homeName = teamLabel(m.home_flag, m.home_team);
        const awayName = teamLabel(m.away_flag, m.away_team);

        return (
          <div key={m.id} className="bg-slate-700/50 rounded-xl overflow-hidden">
            {/* Match header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-700">
              <div className="flex items-center gap-2 text-sm">
                {m.group_name && <span className="text-slate-400 text-xs">Grupo {m.group_name}</span>}
                <span className="text-slate-400 text-xs">{m.stage}</span>
              </div>
              <span className="text-slate-400 text-xs">
                {new Date(m.match_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
              </span>
            </div>

            {/* Score row */}
            <div className="flex items-center justify-center gap-4 py-4 px-4">
              <div className="flex items-center gap-2 justify-end flex-1">
                {homeFlag && <img src={homeFlag} alt="" className="w-6 h-auto" />}
                <span className="text-white font-semibold text-sm">{homeName}</span>
              </div>
              <div className="text-2xl font-bold text-white tabular-nums">
                {m.home_score} – {m.away_score}
              </div>
              <div className="flex items-center gap-2 flex-1">
                {awayFlag && <img src={awayFlag} alt="" className="w-6 h-auto" />}
                <span className="text-white font-semibold text-sm">{awayName}</span>
              </div>
            </div>

            {/* Predictions */}
            {m.predictions.length === 0 ? (
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
                  {m.predictions.map((p, i) => (
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
        );
      })}
    </div>
  );
}
