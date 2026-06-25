import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncResults } from "@/lib/sync";

// Called every minute by cron-job.org.
// Activates at kickoff + 95 min and keeps polling every minute until the match is updated
// (is_finished=true). Once updated, the match leaves the query and calls skip again.
// No upper time bound — runs until the hit, regardless of extra time or penalties.
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
  const minAgo95 = new Date(now.getTime() - 95 * 60 * 1000).toISOString();

  const supabase = createAdminClient();
  const { data: endingMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team")
    .eq("is_finished", false)
    .lte("match_date", minAgo95); // started at least 95 min ago — no upper bound

  if (!endingMatches || endingMatches.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no matches in finishing window" });
  }

  // One or more matches should be ending — do full sync
  const result = await syncResults();

  if (result.updated > 0) {
    revalidatePath("/jogos");
    revalidatePath("/placar");
    revalidatePath("/chaveamento");
  }

  return NextResponse.json({ ...result, matches_in_window: endingMatches.map(m => `${m.home_team} x ${m.away_team}`) });
}
