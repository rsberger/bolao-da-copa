import { createAdminClient } from "@/lib/supabase/admin";
import { buildResolver } from "@/lib/bracket";

const TEAM_MAP: Record<string, string> = {
  "Mexico": "México", "South Africa": "África do Sul", "Korea Republic": "Coreia do Sul", "South Korea": "Coreia do Sul",
  "Czechia": "Tchéquia", "Czech Republic": "Tchéquia", "Canada": "Canadá",
  "Switzerland": "Suíça", "Qatar": "Qatar", "Bosnia and Herzegovina": "Bósnia-Herzegovina", "Bosnia-Herzegovina": "Bósnia-Herzegovina",
  "Brazil": "Brasil", "Morocco": "Marrocos", "Haiti": "Haiti", "Scotland": "Escócia",
  "United States": "Estados Unidos", "USA": "Estados Unidos", "Paraguay": "Paraguai",
  "Australia": "Austrália", "Türkiye": "Turquia", "Turkey": "Turquia",
  "Germany": "Alemanha", "Curaçao": "Curaçao", "Curacao": "Curaçao",
  "Ivory Coast": "Costa do Marfim", "Côte d'Ivoire": "Costa do Marfim", "Ecuador": "Equador",
  "Netherlands": "Holanda", "Japan": "Japão", "Sweden": "Suécia", "Tunisia": "Tunísia",
  "Belgium": "Bélgica", "Egypt": "Egito", "Iran": "Irã", "New Zealand": "Nova Zelândia",
  "Spain": "Espanha", "Cape Verde": "Cabo Verde", "Cape Verde Islands": "Cabo Verde", "Saudi Arabia": "Arábia Saudita",
  "Uruguay": "Uruguai", "France": "França", "Senegal": "Senegal", "Iraq": "Iraque",
  "Norway": "Noruega", "Argentina": "Argentina", "Algeria": "Argélia", "Austria": "Áustria",
  "Jordan": "Jordânia", "Portugal": "Portugal", "DR Congo": "Rep. Dem. Congo",
  "Congo DR": "Rep. Dem. Congo", "Democratic Republic of Congo": "Rep. Dem. Congo",
  "Uzbekistan": "Uzbequistão", "Colombia": "Colômbia", "England": "Inglaterra",
  "Croatia": "Croácia", "Ghana": "Gana", "Panama": "Panamá",
};

export type SyncResult = {
  updated: number;
  total_finished_from_api: number;
  synced_at: string;
  error?: string;
};

export async function syncResults(): Promise<SyncResult> {
  const apiToken = process.env.FOOTBALL_API_TOKEN;
  if (!apiToken) throw new Error("FOOTBALL_API_TOKEN não configurado");

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED",
    { headers: { "X-Auth-Token": apiToken }, cache: "no-store" }
  );

  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const finishedMatches = data.matches ?? [];

  const supabase = createAdminClient();

  // Fetch ALL matches so buildResolver can compute group standings + bracket state
  const { data: allDbMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, home_score, away_score, is_finished, stage, group_name, match_date, penalty_winner");

  const resolve = buildResolver(allDbMatches ?? []);

  // Build lookups: unfinished and finished matches with resolved placeholder names
  const allResolved = (allDbMatches ?? []).map(m => ({
    id: m.id,
    rHome: resolve(m.home_team).name,
    rAway: resolve(m.away_team).name,
    is_finished: m.is_finished,
    home_score: m.home_score,
    away_score: m.away_score,
    penalty_winner: m.penalty_winner,
  }));

  let updated = 0;

  for (const apiMatch of finishedMatches) {
    const homeTeam = TEAM_MAP[apiMatch.homeTeam.name] ?? apiMatch.homeTeam.name;
    const awayTeam = TEAM_MAP[apiMatch.awayTeam.name] ?? apiMatch.awayTeam.name;
    // For penalty shootout matches, prefer regularTime score over fullTime
    // (some API responses put the penalty tally in fullTime)
    const isPenaltyMatch = apiMatch.score.duration === "PENALTY_SHOOTOUT";
    const regularTime = apiMatch.score.regularTime ?? apiMatch.score.extraTime ?? null;
    const homeScore = isPenaltyMatch && regularTime?.home != null
      ? regularTime.home
      : apiMatch.score.fullTime.home;
    const awayScore = isPenaltyMatch && regularTime?.away != null
      ? regularTime.away
      : apiMatch.score.fullTime.away;

    if (homeScore === null || awayScore === null) continue;

    const dbMatch = allResolved.find(
      (m) => (m.rHome === homeTeam && m.rAway === awayTeam) ||
             (m.rHome === awayTeam && m.rAway === homeTeam)
    );
    if (!dbMatch) continue;

    // If teams are stored in reverse order relative to the API, swap scores
    const swapped = dbMatch.rHome === awayTeam;
    const dbHomeScore = swapped ? awayScore : homeScore;
    const dbAwayScore = swapped ? homeScore : awayScore;

    // Penalty winner + shootout score.
    // Only trust the API's penalty data once it has actually resolved a winner —
    // some responses report duration: PENALTY_SHOOTOUT with penalties 0-0 and
    // winner: null before the shootout is finalized, which must not overwrite
    // real data (manual or previously synced).
    let penaltyWinner: 'home' | 'away' | null = null;
    let penaltyHomeScore: number | null = null;
    let penaltyAwayScore: number | null = null;
    if (apiMatch.score.duration === "PENALTY_SHOOTOUT") {
      const apiWinner = apiMatch.score.winner;
      if (apiWinner === "HOME_TEAM") penaltyWinner = swapped ? 'away' : 'home';
      else if (apiWinner === "AWAY_TEAM") penaltyWinner = swapped ? 'home' : 'away';

      if (penaltyWinner !== null) {
        const ph = apiMatch.score.penalties?.home ?? null;
        const pa = apiMatch.score.penalties?.away ?? null;
        penaltyHomeScore = swapped ? pa : ph;
        penaltyAwayScore = swapped ? ph : pa;
      }
    }

    // If API has no penalty data but DB already has it, preserve the DB penalty data
    const keepExistingPenalty = penaltyWinner === null && dbMatch.penalty_winner != null;
    const effectivePenaltyWinner = keepExistingPenalty ? dbMatch.penalty_winner : penaltyWinner;

    if (dbMatch.is_finished && dbMatch.home_score === dbHomeScore && dbMatch.away_score === dbAwayScore && dbMatch.penalty_winner === effectivePenaltyWinner) continue;

    const updatePayload: Record<string, unknown> = { home_score: dbHomeScore, away_score: dbAwayScore, is_finished: true };
    if (!keepExistingPenalty) {
      updatePayload.penalty_winner = penaltyWinner;
      updatePayload.penalty_home_score = penaltyHomeScore;
      updatePayload.penalty_away_score = penaltyAwayScore;
    }

    await supabase
      .from("matches")
      .update(updatePayload)
      .eq("id", dbMatch.id);

    await supabase.rpc("calculate_match_points", { p_match_id: dbMatch.id });
    updated++;
  }

  // Always recalculate champion points — no-op until the Final is finished
  await supabase.rpc("calculate_champion_points");

  return {
    updated,
    total_finished_from_api: finishedMatches.length,
    synced_at: new Date().toISOString(),
  };
}
