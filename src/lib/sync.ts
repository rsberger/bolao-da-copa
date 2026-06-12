import { createAdminClient } from "@/lib/supabase/admin";
import { buildResolver } from "@/lib/bracket";

const TEAM_MAP: Record<string, string> = {
  "Mexico": "México", "South Africa": "África do Sul", "Korea Republic": "Coreia do Sul",
  "Czechia": "Tchéquia", "Czech Republic": "Tchéquia", "Canada": "Canadá",
  "Switzerland": "Suíça", "Qatar": "Qatar", "Bosnia and Herzegovina": "Bósnia-Herzegovina",
  "Brazil": "Brasil", "Morocco": "Marrocos", "Haiti": "Haiti", "Scotland": "Escócia",
  "United States": "Estados Unidos", "USA": "Estados Unidos", "Paraguay": "Paraguai",
  "Australia": "Austrália", "Türkiye": "Turquia", "Turkey": "Turquia",
  "Germany": "Alemanha", "Curaçao": "Curaçao", "Curacao": "Curaçao",
  "Ivory Coast": "Costa do Marfim", "Côte d'Ivoire": "Costa do Marfim", "Ecuador": "Equador",
  "Netherlands": "Holanda", "Japan": "Japão", "Sweden": "Suécia", "Tunisia": "Tunísia",
  "Belgium": "Bélgica", "Egypt": "Egito", "Iran": "Irã", "New Zealand": "Nova Zelândia",
  "Spain": "Espanha", "Cape Verde": "Cabo Verde", "Saudi Arabia": "Arábia Saudita",
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
    .select("id, home_team, away_team, home_flag, away_flag, home_score, away_score, is_finished, stage, group_name, match_date");

  const resolve = buildResolver(allDbMatches ?? []);

  // Build lookups: unfinished and finished matches with resolved placeholder names
  const allResolved = (allDbMatches ?? []).map(m => ({
    id: m.id,
    rHome: resolve(m.home_team).name,
    rAway: resolve(m.away_team).name,
    is_finished: m.is_finished,
    home_score: m.home_score,
    away_score: m.away_score,
  }));

  let updated = 0;

  for (const apiMatch of finishedMatches) {
    const homeTeam = TEAM_MAP[apiMatch.homeTeam.name] ?? apiMatch.homeTeam.name;
    const awayTeam = TEAM_MAP[apiMatch.awayTeam.name] ?? apiMatch.awayTeam.name;
    const homeScore = apiMatch.score.fullTime.home;
    const awayScore = apiMatch.score.fullTime.away;

    if (homeScore === null || awayScore === null) continue;

    const dbMatch = allResolved.find(
      (m) => m.rHome === homeTeam && m.rAway === awayTeam
    );
    if (!dbMatch) continue;

    // Skip if already finished with the correct score
    if (dbMatch.is_finished && dbMatch.home_score === homeScore && dbMatch.away_score === awayScore) continue;

    await supabase
      .from("matches")
      .update({ home_score: homeScore, away_score: awayScore, is_finished: true })
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
