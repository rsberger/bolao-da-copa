import { createClient } from "@/lib/supabase/server";
import { MatchesView } from "@/components/MatchesView";
import { BatchPredictions } from "@/components/BatchPredictions";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ChampionPicker } from "@/components/ChampionPicker";
import { getLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";

export const revalidate = 60;

export default async function JogosPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = translations[locale];

  const { data: { user } } = await supabase.auth.getUser();

  const { data: myProfile } = user
    ? await supabase.from("profiles").select("name, avatar_url").eq("id", user.id).single()
    : { data: null };

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  const { data: predictions } = user
    ? await supabase.from("predictions").select("*").eq("user_id", user.id)
    : { data: [] };

  const predictionMap = Object.fromEntries(
    (predictions ?? []).map((p) => [p.match_id, p])
  );

  // Pass all unfinished matches to CountdownTimer — client filters live vs upcoming in real time
  const unfinishedMatches = (matches ?? []).filter((m) => !m.is_finished);
  const nextMatch = unfinishedMatches.find((m) => new Date(m.match_date) > new Date()) ?? null;

  // Champion lock: first knockout match (any stage other than Grupos)
  const firstKnockoutMatch = (matches ?? []).find((m) => m.stage !== "Grupos");
  const championLocked = firstKnockoutMatch ? new Date(firstKnockoutMatch.match_date) <= new Date() : false;

  // Teams for champion picker — only real teams (have a flag/ISO code)
  const teamFlagMap = new Map<string, string>(); // iso -> Portuguese name (stored in DB)
  for (const m of matches ?? []) {
    if (m.home_flag && !teamFlagMap.has(m.home_flag)) teamFlagMap.set(m.home_flag, m.home_team);
    if (m.away_flag && !teamFlagMap.has(m.away_flag)) teamFlagMap.set(m.away_flag, m.away_team);
  }
  const teams = Array.from(teamFlagMap.entries())
    .map(([flag, name]) => ({ name, flag }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Champion predictions
  let championPicks: { user_id: string; team: string; team_flag: string | null; name: string | null; avatar_url: string | null }[] = [];
  let myChampionPick: { team: string; team_flag: string | null } | null = null;
  try {
    const { data: picks } = await supabase
      .from("champion_predictions")
      .select("user_id, team, team_flag, profiles(name, avatar_url)");

    championPicks = (picks ?? []).map((p: any) => ({
      user_id: p.user_id,
      team: p.team,
      team_flag: p.team_flag,
      name: p.profiles?.name ?? null,
      avatar_url: p.profiles?.avatar_url ?? null,
    }));

    if (user) {
      const mine = championPicks.find((p) => p.user_id === user.id);
      if (mine) myChampionPick = { team: mine.team, team_flag: mine.team_flag };
    }
  } catch { /* table may not exist yet */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-white">{t.matchesTitle}</h1>
        {!user && <p className="text-slate-400 text-sm">{t.matchesLoginPrompt}</p>}
      </div>

      {unfinishedMatches.length > 0 && (
        <CountdownTimer
          unfinishedMatches={unfinishedMatches.map((m) => ({
            matchDate: m.match_date,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            homeFlag: m.home_flag ?? null,
            awayFlag: m.away_flag ?? null,
          }))}
        />
      )}

      <ChampionPicker
        userId={user?.id ?? null}
        myName={myProfile?.name ?? null}
        myAvatar={myProfile?.avatar_url ?? null}
        teams={teams}
        myPick={myChampionPick}
        allPicks={championPicks}
        locked={championLocked}
      />

      {user && (
        <div className="bg-green-600/10 border border-green-500/30 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-green-300 font-semibold text-sm">{t.batchBannerTitle}</p>
            <p className="text-slate-400 text-xs mt-0.5">{t.batchBannerDesc}</p>
          </div>
          <BatchPredictions userId={user.id} />
        </div>
      )}

      <MatchesView
        matches={matches ?? []}
        predictionMap={predictionMap}
        userId={user?.id ?? null}
      />
    </div>
  );
}
