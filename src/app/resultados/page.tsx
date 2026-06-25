import { createClient } from "@/lib/supabase/server";
import { flagUrl, formatMatchDate, countryName } from "@/lib/matches";
import { getLocale } from "@/lib/i18n/server";
import { translations, type T } from "@/lib/i18n/translations";
import type { Match } from "@/lib/matches";
import { calcGroupStandings, calcBest3rds } from "@/lib/bracket";

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

  for (const m of matches) {
    if (!map.has(m.home_team)) map.set(m.home_team, { team: m.home_team, flag: m.home_flag, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
    if (!map.has(m.away_team)) map.set(m.away_team, { team: m.away_team, flag: m.away_flag, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
  }

  for (const m of matches) {
    if (!m.is_finished || m.home_score === null || m.away_score === null) continue;
    const home = map.get(m.home_team)!;
    const away = map.get(m.away_team)!;

    home.played++; away.played++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;

    if (m.home_score > m.away_score) {
      home.won++; home.points += 3; away.lost++;
    } else if (m.home_score < m.away_score) {
      away.won++; away.points += 3; home.lost++;
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

type Result = "W" | "D" | "L";

function lastResults(team: string, matches: Match[]): Result[] {
  return matches
    .filter((m) => m.is_finished && (m.home_team === team || m.away_team === team))
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    .slice(-5)
    .map((m): Result => {
      if (m.home_score === null || m.away_score === null) return "D";
      const isHome = m.home_team === team;
      const scored = isHome ? m.home_score : m.away_score;
      const conceded = isHome ? m.away_score : m.home_score;
      return scored > conceded ? "W" : scored < conceded ? "L" : "D";
    });
}

function ResultDot({ r }: { r: Result }) {
  if (r === "W") return (
    <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,5 4,7.5 8,3" />
      </svg>
    </span>
  );
  if (r === "L") return (
    <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="3" x2="7" y2="7" /><line x1="7" y1="3" x2="3" y2="7" />
      </svg>
    </span>
  );
  return (
    <span className="w-4 h-4 rounded-full bg-slate-500 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="2.5" y1="5" x2="7.5" y2="5" />
      </svg>
    </span>
  );
}

function GroupSection({ group, matches, t, locale }: { group: string; matches: Match[]; t: T; locale: string }) {
  const standings = calcStandings(matches);
  const finished = matches.filter((m) => m.is_finished);
  const upcoming = matches.filter((m) => !m.is_finished);

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-700/50 flex items-center justify-between">
        <h2 className="font-bold text-white">{t.group} {group}</h2>
        <span className="text-xs text-slate-400">{t.matchesCount(finished.length, matches.length)}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
              <th className="text-left px-3 py-2 w-6">#</th>
              <th className="text-left px-3 py-2">{t.colTeam}</th>
              <th className="px-2 py-2 text-center">{t.colPlayed}</th>
              <th className="px-2 py-2 text-center">{t.colWon}</th>
              <th className="px-2 py-2 text-center">{t.colDrawn}</th>
              <th className="px-2 py-2 text-center hidden sm:table-cell">{t.colLost}</th>
              <th className="px-2 py-2 text-center">{t.colGF}</th>
              <th className="px-2 py-2 text-center hidden sm:table-cell">{t.colGA}</th>
              <th className="px-2 py-2 text-center">{t.colGD}</th>
              <th className="px-3 py-2 text-center font-bold text-white">{t.colPts}</th>
              <th className="px-3 py-2 text-center">{t.bracketLast5}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const last5 = lastResults(s.team, finished);
              return (
              <tr key={s.team} className={`border-b border-slate-700/40 last:border-0 ${i < 2 ? "bg-green-500/5" : ""}`}>
                <td className="px-3 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {flagUrl(s.flag)
                      ? <img src={flagUrl(s.flag)!} alt={s.team} className="w-6 h-4 object-cover rounded-sm shrink-0" />
                      : <span className="w-6 text-center text-xs">🏳️</span>}
                    <span className={`font-medium truncate ${i < 2 ? "text-white" : "text-slate-300"}`}>{countryName(s.flag, locale) ?? s.team}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.played}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.won}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.drawn}</td>
                <td className="px-2 py-2.5 text-center text-slate-400 hidden sm:table-cell">{s.lost}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.gf}</td>
                <td className="px-2 py-2.5 text-center text-slate-400 hidden sm:table-cell">{s.ga}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                <td className="px-3 py-2.5 text-center font-bold text-white">{s.points}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-0.5 justify-center">
                    {last5.map((r, j) => <ResultDot key={j} r={r} />)}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {finished.length > 0 && (
        <div className="border-t border-slate-700 px-4 py-3 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t.sectionResults}</p>
          {finished.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                <span className={`font-medium truncate ${m.home_score! > m.away_score! ? "text-white" : "text-slate-400"}`}>
                  {countryName(m.home_flag, locale) ?? m.home_team}
                </span>
                {flagUrl(m.home_flag) && <img src={flagUrl(m.home_flag)!} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
              </div>
              <div className="shrink-0 font-bold text-white tabular-nums px-2.5 py-0.5 bg-slate-700 rounded text-sm">
                {m.home_score} – {m.away_score}
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {flagUrl(m.away_flag) && <img src={flagUrl(m.away_flag)!} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
                <span className={`font-medium truncate ${m.away_score! > m.home_score! ? "text-white" : "text-slate-400"}`}>
                  {countryName(m.away_flag, locale) ?? m.away_team}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={`px-4 py-3 space-y-2 ${finished.length > 0 ? "border-t border-slate-700" : ""}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t.sectionUpcoming}</p>
          {upcoming.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                <span className="text-slate-300 font-medium truncate">{countryName(m.home_flag, locale) ?? m.home_team}</span>
                {flagUrl(m.home_flag) && <img src={flagUrl(m.home_flag)!} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
              </div>
              <div className="shrink-0 text-xs text-slate-500 text-center w-24">
                {formatMatchDate(m.match_date, locale)}
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {flagUrl(m.away_flag) && <img src={flagUrl(m.away_flag)!} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
                <span className="text-slate-300 font-medium truncate">{countryName(m.away_flag, locale) ?? m.away_team}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ResultadosPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = translations[locale];

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("stage", "Grupos")
    .order("match_date", { ascending: true });

  const groupMap = new Map<string, Match[]>();
  for (const m of matches ?? []) {
    if (!m.group_name) continue;
    if (!groupMap.has(m.group_name)) groupMap.set(m.group_name, []);
    groupMap.get(m.group_name)!.push(m);
  }

  const groups = Array.from(groupMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  // Best 8 thirds table
  const groupStandings = calcGroupStandings((matches ?? []) as Match[]);
  const allThirds = calcBest3rds(groupStandings);
  const groupMatchCount: Record<string, number> = {};
  const groupFinishedCount: Record<string, number> = {};
  for (const m of matches ?? []) {
    if (!m.group_name) continue;
    groupMatchCount[m.group_name] = (groupMatchCount[m.group_name] ?? 0) + 1;
    if (m.is_finished) groupFinishedCount[m.group_name] = (groupFinishedCount[m.group_name] ?? 0) + 1;
  }
  const groupsDone = Object.keys(groupMatchCount).filter(g => (groupFinishedCount[g] ?? 0) >= 6).length;
  const anyGroupStarted = allThirds.some(s => s.played > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t.resultsTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.resultsSubtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map(([group, groupMatches]) => (
          <GroupSection key={group} group={group} matches={groupMatches} t={t} locale={locale} />
        ))}
      </div>

      {anyGroupStarted && (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-700/50 flex items-center justify-between">
            <h2 className="font-bold text-white">{t.best8ThirdsTitle}</h2>
            <span className="text-xs text-slate-400">
              {groupsDone < 12 ? t.best8ThirdsGroups(groupsDone) : t.best8ThirdsAllDone}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                  <th className="text-left px-3 py-2 w-6">#</th>
                  <th className="text-left px-3 py-2">{t.colTeam}</th>
                  <th className="px-2 py-2 text-center text-slate-400">{t.best8ThirdsGrp}</th>
                  <th className="px-2 py-2 text-center">{t.colPlayed}</th>
                  <th className="px-2 py-2 text-center">{t.colGF}</th>
                  <th className="px-2 py-2 text-center hidden sm:table-cell">{t.colGA}</th>
                  <th className="px-2 py-2 text-center">{t.colGD}</th>
                  <th className="px-3 py-2 text-center font-bold text-white">{t.colPts}</th>
                </tr>
              </thead>
              <tbody>
                {allThirds.map((s, i) => {
                  const qualifies = i < 8;
                  const isLast = i === thirdsWithData.length - 1;
                  const onBubble = i === 7 || (i < 8 && thirdsWithData[8]?.pts === s.pts);
                  return (
                    <tr key={s.team} className={`border-b border-slate-700/40 last:border-0 ${qualifies ? "bg-green-500/5" : ""} ${i === 7 && !isLast ? "border-b-2 border-green-600/50" : ""}`}>
                      <td className="px-3 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {flagUrl(s.flag)
                            ? <img src={flagUrl(s.flag)!} alt={s.team} className="w-6 h-4 object-cover rounded-sm shrink-0" />
                            : <span className="w-6 text-center text-xs">🏳️</span>}
                          <span className={`font-medium truncate ${qualifies ? "text-white" : "text-slate-400"}`}>
                            {countryName(s.flag, locale) ?? s.team}
                          </span>
                          {qualifies && <span className="text-green-400 text-xs shrink-0">✓</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-slate-500 text-xs font-mono">{s.group}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{s.played}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{s.gf}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400 hidden sm:table-cell">{s.ga}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-white">{s.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {groupsDone < 12 && (
            <p className="text-xs text-slate-500 px-4 py-3 border-t border-slate-700">
              {t.best8ThirdsFooter}
            </p>
          )}
        </div>
      )}

      {groups.length === 0 && (
        <div className="text-center text-slate-500 py-16">{t.rankingNoData}</div>
      )}
    </div>
  );
}
