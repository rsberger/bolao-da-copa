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

  // Last 16 finished matches for round ranking
  const { data: recentMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team")
    .eq("is_finished", true)
    .order("match_date", { ascending: false })
    .limit(16);

  let roundLeaders: { id: string; name: string | null; avatar_url: string | null; points: number }[] = [];
  if (recentMatches && recentMatches.length > 0) {
    const { data: recentPreds } = await supabase
      .from("predictions")
      .select("user_id, points")
      .in("match_id", recentMatches.map((m) => m.id));

    const pointsMap = new Map<string, number>();
    for (const p of recentPreds ?? []) {
      pointsMap.set(p.user_id, (pointsMap.get(p.user_id) ?? 0) + (p.points ?? 0));
    }

    roundLeaders = (leaders ?? [])
      .filter((l) => pointsMap.has(l.id))
      .map((l) => ({ id: l.id, name: l.name, avatar_url: l.avatar_url, points: pointsMap.get(l.id) ?? 0 }))
      .sort((a, b) => b.points - a.points);
  }

  // Finished predictions count per user (for accurate badge calculation)
  const { data: finishedPredRows } = await supabase
    .from("predictions")
    .select("user_id")
    .not("points", "is", null);

  const finishedPredsById: Record<string, number> = {};
  for (const row of finishedPredRows ?? []) {
    finishedPredsById[row.user_id] = (finishedPredsById[row.user_id] ?? 0) + 1;
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
      championPicks={championPicks}
      myChampionPick={myChampionPick}
      missingMatchCount={missingMatchCount}
      missingChampion={missingChampion}
      finishedPredsById={finishedPredsById}
    />
  );
}
