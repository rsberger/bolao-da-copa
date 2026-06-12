import { NextResponse } from "next/server";
import { syncResults } from "@/lib/sync";
import { createAdminClient } from "@/lib/supabase/admin";

async function log(startedAt: string, updatedMatches: number, totalApi: number, error: string | null, trigger: string) {
  try {
    const supabase = createAdminClient();
    await supabase.from("sync_logs").insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      updated_matches: updatedMatches,
      total_finished_api: totalApi,
      trigger,
      error,
    });
  } catch { /* table may not exist yet */ }
}

// Called by Vercel Cron every 30 min. Also callable manually via GET with ?trigger=manual.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const querySecret = new URL(request.url).searchParams.get("secret");
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const trigger = new URL(request.url).searchParams.get("trigger") ?? "cron";
  const startedAt = new Date().toISOString();

  try {
    const result = await syncResults();
    await log(startedAt, result.updated, result.total_finished_from_api, null, trigger);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await log(startedAt, 0, 0, message, trigger);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
