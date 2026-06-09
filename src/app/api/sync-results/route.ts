import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Mapeamento dos nomes em inglês (football-data.org) para português (nosso banco)
const TEAM_MAP: Record<string, string> = {
  "Mexico": "México",
  "South Africa": "África do Sul",
  "Korea Republic": "Coreia do Sul",
  "Czechia": "Tchéquia",
  "Czech Republic": "Tchéquia",
  "Canada": "Canadá",
  "Switzerland": "Suíça",
  "Qatar": "Qatar",
  "Bosnia and Herzegovina": "Bósnia-Herzegovina",
  "Brazil": "Brasil",
  "Morocco": "Marrocos",
  "Haiti": "Haiti",
  "Scotland": "Escócia",
  "United States": "Estados Unidos",
  "USA": "Estados Unidos",
  "Paraguay": "Paraguai",
  "Australia": "Austrália",
  "Türkiye": "Turquia",
  "Turkey": "Turquia",
  "Germany": "Alemanha",
  "Curaçao": "Curaçao",
  "Curacao": "Curaçao",
  "Ivory Coast": "Costa do Marfim",
  "Côte d'Ivoire": "Costa do Marfim",
  "Ecuador": "Equador",
  "Netherlands": "Holanda",
  "Japan": "Japão",
  "Sweden": "Suécia",
  "Tunisia": "Tunísia",
  "Belgium": "Bélgica",
  "Egypt": "Egito",
  "Iran": "Irã",
  "New Zealand": "Nova Zelândia",
  "Spain": "Espanha",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arábia Saudita",
  "Uruguay": "Uruguai",
  "France": "França",
  "Senegal": "Senegal",
  "Iraq": "Iraque",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argélia",
  "Austria": "Áustria",
  "Jordan": "Jordânia",
  "Portugal": "Portugal",
  "DR Congo": "Rep. Dem. Congo",
  "Congo DR": "Rep. Dem. Congo",
  "Democratic Republic of Congo": "Rep. Dem. Congo",
  "Uzbekistan": "Uzbequistão",
  "Colombia": "Colômbia",
  "England": "Inglaterra",
  "Croatia": "Croácia",
  "Ghana": "Gana",
  "Panama": "Panamá",
};

function normalize(name: string): string {
  return TEAM_MAP[name] ?? name;
}

export async function GET(request: Request) {
  // Protege o endpoint com um secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiToken = process.env.FOOTBALL_API_TOKEN;
    if (!apiToken) throw new Error("FOOTBALL_API_TOKEN não configurado");

    // Busca jogos finalizados da Copa do Mundo 2026
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED",
      { headers: { "X-Auth-Token": apiToken } }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const finishedMatches: {
      homeTeam: { name: string };
      awayTeam: { name: string };
      score: { fullTime: { home: number; away: number } };
      utcDate: string;
    }[] = data.matches ?? [];

    if (finishedMatches.length === 0) {
      return NextResponse.json({ message: "Nenhum jogo finalizado ainda.", updated: 0 });
    }

    const supabase = createAdminClient();

    // Busca jogos não finalizados no nosso banco
    const { data: dbMatches } = await supabase
      .from("matches")
      .select("id, home_team, away_team, match_date")
      .eq("is_finished", false);

    if (!dbMatches || dbMatches.length === 0) {
      return NextResponse.json({ message: "Todos os jogos já estão finalizados.", updated: 0 });
    }

    let updated = 0;

    for (const apiMatch of finishedMatches) {
      const homeTeam = normalize(apiMatch.homeTeam.name);
      const awayTeam = normalize(apiMatch.awayTeam.name);
      const homeScore = apiMatch.score.fullTime.home;
      const awayScore = apiMatch.score.fullTime.away;

      if (homeScore === null || awayScore === null) continue;

      // Encontra o jogo correspondente no banco pelo nome dos times
      const dbMatch = dbMatches.find(
        (m) =>
          m.home_team === homeTeam && m.away_team === awayTeam
      );

      if (!dbMatch) continue;

      // Atualiza o resultado
      await supabase
        .from("matches")
        .update({ home_score: homeScore, away_score: awayScore, is_finished: true })
        .eq("id", dbMatch.id);

      // Calcula pontos dos palpites
      await supabase.rpc("calculate_match_points", { p_match_id: dbMatch.id });

      updated++;
    }

    return NextResponse.json({
      message: `Sincronização concluída.`,
      updated,
      total_finished_from_api: finishedMatches.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
