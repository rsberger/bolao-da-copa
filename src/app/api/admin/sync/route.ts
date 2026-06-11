import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncResults } from "@/lib/sync";

async function log(startedAt: string, updatedMatches: number, totalApi: number, error: string | null) {
  try {
    const supabase = createAdminClient();
    await supabase.from("sync_logs").insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      updated_matches: updatedMatches,
      total_finished_api: totalApi,
      trigger: "manual",
      error,
    });
  } catch { /* table may not exist yet */ }
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const startedAt = new Date().toISOString();
  try {
    const result = await syncResults();
    await log(startedAt, result.updated, result.total_finished_from_api, null);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await log(startedAt, 0, 0, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
