import { createClient } from "@/lib/supabase/server";
import { RankingDashboard } from "@/components/RankingDashboard";

export const revalidate = 60;

export default async function PlacarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: leaders } = await supabase
    .from("leaderboard")
    .select("*")
    .order("total_points", { ascending: false })
    .order("exact_scores", { ascending: false })
    .order("correct_winners", { ascending: false })
    .order("total_predictions", { ascending: false })
    .order("name", { ascending: true });

  // Round ranking: all finished matches on the same Brazil day (GMT-3) as the most recent finished match
  const { data: lastFinished } = await supabase
    .from("matches")
    .select("match_date")
    .eq("is_finished", true)
    .order("match_date", { ascending: false })
    .limit(1)
    .single();

  // Convert most recent match to Brazil time (UTC-3) to get the local calendar day
  const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
  const brazilDay = lastFinished?.match_date
    ? new Date(new Date(lastFinished.match_date).getTime() - BRT_OFFSET_MS).toISOString().substring(0, 10)
    : null; // "YYYY-MM-DD" in Brazil time

  // Brazil day boundaries expressed in UTC: day starts at 03:00 UTC, ends at next day 02:59:59 UTC
  const dayStartUTC = brazilDay ? `${brazilDay}T03:00:00+00:00` : null;
  const dayEndUTC   = brazilDay
    ? new Date(new Date(`${brazilDay}T03:00:00+00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: recentMatches } = dayStartUTC && dayEndUTC ? await supabase
    .from("matches")
    .select("id, home_team, away_team")
    .eq("is_finished", true)
    .gte("match_date", dayStartUTC)
    .lt("match_date", dayEndUTC) : { data: [] };

  let roundLeaders: { id: string; name: string | null; avatar_url: string | null; points: number }[] = [];
  let roundMatchBreakdown: { matchId: string; label: string; pointsByUser: Record<string, number> }[] = [];
  if (recentMatches && recentMatches.length > 0) {
    const { data: recentPreds } = await supabase
      .from("predictions")
      .select("user_id, match_id, points")
      .in("match_id", recentMatches.map((m) => m.id));

    const pointsMap = new Map<string, number>();
    const perMatchMap = new Map<string, Record<string, number>>();
    for (const m of recentMatches) perMatchMap.set(m.id, {});
    for (const p of recentPreds ?? []) {
      pointsMap.set(p.user_id, (pointsMap.get(p.user_id) ?? 0) + (p.points ?? 0));
      if (perMatchMap.has(p.match_id)) perMatchMap.get(p.match_id)![p.user_id] = p.points ?? 0;
    }

    roundMatchBreakdown = recentMatches.map((m) => ({
      matchId: m.id,
      label: `${m.home_team.split(" ")[0]} × ${m.away_team.split(" ")[0]}`,
      pointsByUser: perMatchMap.get(m.id) ?? {},
    }));

    roundLeaders = (leaders ?? [])
      .map((l) => ({ id: l.id, name: l.name, avatar_url: l.avatar_url, points: pointsMap.get(l.id) ?? 0 }))
      .sort((a, b) => b.points - a.points);
  }

  // Finished predictions count per user (for accurate badge calculation)
  const { data: finishedPredRows } = await supabase
    .from("predictions")
    .select("user_id")
    .not("points", "is", null);

  // Gelo na Veia: users who predicted 0×0 in a match that ended 0×0
  const { data: zeroMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("home_score", 0)
    .eq("away_score", 0)
    .eq("is_finished", true);

  const zeroMatchIds = (zeroMatches ?? []).map((m) => m.id);
  let geloUserIds: string[] = [];
  if (zeroMatchIds.length > 0) {
    const { data: geloPreds } = await supabase
      .from("predictions")
      .select("user_id")
      .in("match_id", zeroMatchIds)
      .eq("home_score", 0)
      .eq("away_score", 0);
    geloUserIds = [...new Set((geloPreds ?? []).map((p) => p.user_id))];
  }

  const finishedPredsById: Record<string, number> = {};
  for (const row of finishedPredRows ?? []) {
    finishedPredsById[row.user_id] = (finishedPredsById[row.user_id] ?? 0) + 1;
  }

  // Zebra badge: predicted the winning team in a match where <30% of players did
  const { data: finishedMatchesForZebra } = await supabase
    .from("matches")
    .select("id, home_score, away_score")
    .eq("is_finished", true)
    .not("home_score", "is", null);

  const finishedMatchIds = (finishedMatchesForZebra ?? []).map((m) => m.id);
  const zebraCountById: Record<string, number> = {};

  if (finishedMatchIds.length > 0) {
    const { data: allFinishedPreds } = await supabase
      .from("predictions")
      .select("user_id, match_id, home_score, away_score")
      .in("match_id", finishedMatchIds);

    for (const match of finishedMatchesForZebra ?? []) {
      const outcome = match.home_score > match.away_score ? "home"
        : match.away_score > match.home_score ? "away" : "draw";
      const matchPreds = (allFinishedPreds ?? []).filter((p) => p.match_id === match.id);
      if (matchPreds.length === 0) continue;
      const correct = matchPreds.filter((p) => {
        const o = p.home_score > p.away_score ? "home" : p.away_score > p.home_score ? "away" : "draw";
        return o === outcome;
      });
      if (correct.length / matchPreds.length < 0.30) {
        for (const p of correct) {
          zebraCountById[p.user_id] = (zebraCountById[p.user_id] ?? 0) + 1;
        }
      }
    }
  }

  // Missing predictions alert
  let missingMatchCount = 0;
  let missingChampion = false;
  if (user) {
    const now = new Date().toISOString();
    const { data: upcoming } = await supabase
      .from("matches")
      .select("id")
      .eq("is_finished", false)
      .gt("match_date", now);
    const { data: userPreds } = await supabase
      .from("predictions")
      .select("match_id")
      .eq("user_id", user.id);
    const predictedIds = new Set((userPreds ?? []).map((p) => p.match_id));
    missingMatchCount = (upcoming ?? []).filter((m) => !predictedIds.has(m.id)).length;
  }

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
    if (user && !myChampionPick) missingChampion = true;
  } catch { /* table may not exist yet */ }

  return (
    <RankingDashboard
      leaders={leaders ?? []}
      currentUserId={user?.id ?? null}
      roundLeaders={roundLeaders}
      roundMatchCount={recentMatches?.length ?? 0}
      roundMatchBreakdown={roundMatchBreakdown}
      championPicks={championPicks}
      myChampionPick={myChampionPick}
      missingMatchCount={missingMatchCount}
      missingChampion={missingChampion}
      finishedPredsById={finishedPredsById}
      geloUserIds={geloUserIds}
      zebraCountById={zebraCountById}
    />
  );
}
