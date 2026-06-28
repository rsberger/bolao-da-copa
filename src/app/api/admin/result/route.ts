import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { matchId, homeScore, awayScore, penaltyWinner, penaltyHomeScore, penaltyAwayScore } = await req.json();
  if (!matchId || homeScore == null || awayScore == null)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const admin = createAdminClient();

  const { error } = await admin
    .from("matches")
    .update({ home_score: homeScore, away_score: awayScore, is_finished: true, penalty_winner: penaltyWinner ?? null, penalty_home_score: penaltyHomeScore ?? null, penalty_away_score: penaltyAwayScore ?? null })
    .eq("id", matchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.rpc("calculate_match_points", { p_match_id: matchId });
  await admin.rpc("calculate_champion_points");

  revalidatePath("/jogos");
  revalidatePath("/placar");
  revalidatePath("/chaveamento");

  return NextResponse.json({ ok: true });
}
