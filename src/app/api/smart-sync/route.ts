import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncResults } from "@/lib/sync";

// Called every minute by cron-job.org.
// Only triggers a full sync when a match is in its expected finishing window
// (between 95 min and 150 min after kickoff — covers extra time + penalties).
// Outside that window returns immediately without calling the football API.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const querySecret = new URL(request.url).searchParams.get("secret");
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const minAgo95  = new Date(now.getTime() -  95 * 60 * 1000).toISOString();
  const minAgo150 = new Date(now.getTime() - 150 * 60 * 1000).toISOString();

  const supabase = createAdminClient();
  const { data: endingMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team")
    .eq("is_finished", false)
    .lte("match_date", minAgo95)   // started at least 95 min ago
    .gte("match_date", minAgo150); // started at most 150 min ago

  if (!endingMatches || endingMatches.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no matches in finishing window" });
  }

  // One or more matches should be ending — do full sync
  const result = await syncResults();

  if (result.updated > 0) {
    revalidatePath("/jogos");
    revalidatePath("/placar");
  }

  return NextResponse.json({ ...result, matches_in_window: endingMatches.map(m => `${m.home_team} x ${m.away_team}`) });
}
