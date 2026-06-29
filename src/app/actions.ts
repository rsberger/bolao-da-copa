"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function savePredictionAction(
  matchId: string,
  homeScore: number,
  awayScore: number,
  predictedPenaltyWinner?: 'home' | 'away' | null
): Promise<{ predictionId: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { predictionId: null, error: "not authenticated" };

  const payload = {
    user_id: user.id,
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore,
    predicted_penalty_winner: homeScore === awayScore ? (predictedPenaltyWinner ?? null) : null,
  };

  // Check if prediction already exists
  const { data: existing } = await supabase
    .from("predictions")
    .select("id")
    .eq("user_id", user.id)
    .eq("match_id", matchId)
    .single();

  let predictionId: string | null = null;

  if (existing) {
    const { error } = await supabase
      .from("predictions")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { predictionId: null, error: error.message };
    predictionId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("predictions")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { predictionId: null, error: error.message };
    predictionId = data?.id ?? null;
  }

  revalidatePath("/jogos");
  revalidatePath("/placar");

  return { predictionId, error: null };
}
