import { createClient } from "@/lib/supabase/server";
import { groupMatchesByStage } from "@/lib/matches";
import type { Match } from "@/lib/matches";
import { flagUrl } from "@/lib/matches";

export const revalidate = 60;

type Standing = {
  team: string;
  flag: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

function calcStandings(matches: Match[]): Standing[] {
  const map = new Map<string, Standing>();

  function get(team: string, flag: string | null): Standing {
    if (!map.has(team)) {
      map.set(team, { team, flag, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
    }
    return map.get(team)!;
  }

  for (const m of matches) {
    if (!m.is_finished || m.home_score === null || m.away_score === null) continue;
    const home = get(m.home_team, m.home_flag);
    const away = get(m.away_team, m.away_flag);

    home.played++; away.played++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;

    if (m.home_score > m.away_score) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (m.home_score < m.away_score) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.drawn++; home.points++;
      away.drawn++; away.points++;
    }

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
  }

  return Array.from(map.values()).sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf
  );
}

function StandingsTable({ group, matches }: { group: string; matches: Match[] }) {
  const standings = calcStandings(matches);
  const finished = matches.filter((m) => m.is_finished);

  if (standings.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-700/50 flex items-center justify-between">
        <h2 className="font-bold text-white">Grupo {group}</h2>
        <span className="text-xs text-slate-400">{finished.length}/{matches.length} jogos</span>
      </div>

      {/* Tabela de classificação */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
              <th className="text-left px-4 py-2 w-8">#</th>
              <th className="text-left px-4 py-2">Seleção</th>
              <th className="px-2 py-2 text-center">J</th>
              <th className="px-2 py-2 text-center">V</th>
              <th className="px-2 py-2 text-center">E</th>
              <th className="px-2 py-2 text-center">D</th>
              <th className="px-2 py-2 text-center">GP</th>
              <th className="px-2 py-2 text-center">GC</th>
              <th className="px-2 py-2 text-center">SG</th>
              <th className="px-3 py-2 text-center font-bold text-white">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team} className={`border-b border-slate-700/50 last:border-0 ${i < 2 ? "bg-green-500/5" : ""}`}>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {flagUrl(s.flag)
                      ? <img src={flagUrl(s.flag)!} alt={s.team} className="w-6 h-4 object-cover rounded-sm shrink-0" />
                      : <span className="w-6 text-center">🏳️</span>}
                    <span className={`font-medium ${i < 2 ? "text-white" : "text-slate-300"}`}>{s.team}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.played}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.won}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.drawn}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.lost}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.gf}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.ga}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                <td className="px-3 py-2.5 text-center font-bold text-white">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resultados do grupo */}
      {finished.length > 0 && (
        <div className="border-t border-slate-700 px-4 py-3 space-y-2">
          <p className="text-xs text-slate-500 uppercase mb-2">Resultados</p>
          {finished.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 justify-end">
                <span className={`font-medium ${m.home_score! > m.away_score! ? "text-white" : "text-slate-400"}`}>
                  {m.home_team}
                </span>
                {flagUrl(m.home_flag) && (
                  <img src={flagUrl(m.home_flag)!} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                )}
              </div>
              <div className="mx-3 font-bold text-white tabular-nums text-base px-3 py-0.5 bg-slate-700 rounded">
                {m.home_score} – {m.away_score}
              </div>
              <div className="flex items-center gap-2 flex-1">
                {flagUrl(m.away_flag) && (
                  <img src={flagUrl(m.away_flag)!} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                )}
                <span className={`font-medium ${m.away_score! > m.home_score! ? "text-white" : "text-slate-400"}`}>
                  {m.away_team}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {finished.length === 0 && (
        <p className="text-slate-600 text-sm text-center py-3">Nenhum jogo finalizado ainda</p>
      )}
    </div>
  );
}

export default async function ResultadosPage() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("stage", "Grupos")
    .order("match_date", { ascending: true });

  const grouped = groupMatchesByStage(matches ?? []);

  const groups = Object.entries(grouped)
    .filter(([label]) => label.startsWith("Grupo ") && label.length === 7)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Resultados & Classificação</h1>
        <p className="text-slate-400 text-sm mt-1">
          Top 2 de cada grupo + 8 melhores terceiros avançam
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map(([label, groupMatches]) => (
          <StandingsTable
            key={label}
            group={label.replace("Grupo ", "")}
            matches={groupMatches}
          />
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center text-slate-500 py-16">
          Nenhum jogo cadastrado ainda.
        </div>
      )}
    </div>
  );
}
