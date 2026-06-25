export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminSyncButton } from "@/components/AdminSyncButton";
import { AdminResultForm } from "@/components/AdminResultForm";
import { AdminRoundResults } from "@/components/AdminRoundResults";
import { AdminGroupOverrides } from "@/components/AdminGroupOverrides";
import { AdminThirdsOverride } from "@/components/AdminThirdsOverride";
import { calcGroupStandings, calcBest3rds } from "@/lib/bracket";
import { getLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { Calendar, Users } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const locale = await getLocale();
  const t = translations[locale];

  const [{ count: totalMatches }, { count: finishedMatches }, { count: totalUsers }, { count: totalPredictions }] =
    await Promise.all([
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("is_finished", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("predictions").select("*", { count: "exact", head: true }),
    ]);

  const { data: lastUpdated } = await supabase
    .from("matches")
    .select("updated_at")
    .eq("is_finished", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const { data: allMatches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  // Group overrides
  const { data: overrideRows } = await createAdminClient().from("group_overrides").select("group_name, ranking");
  const groupOverrides: Record<string, string[]> = {};
  for (const row of overrideRows ?? []) groupOverrides[row.group_name] = row.ranking;
  const groupStandings = calcGroupStandings((allMatches ?? []) as any);
  const allThirds = calcBest3rds(groupStandings);
  const { data: thirdsRow } = await createAdminClient().from("thirds_override").select("ranking").eq("id", 1).maybeSingle();
  const thirdsOverride: string[] | null = thirdsRow?.ranking ?? null;

  // Data for AdminRoundResults dropdown
  const { data: finishedMatchesRaw } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_flag, away_flag, home_score, away_score, match_date, stage, group_name")
    .eq("is_finished", true)
    .order("match_date", { ascending: false });

  const finishedMatchIds = (finishedMatchesRaw ?? []).map((m) => m.id);
  const { data: roundPredictions } = finishedMatchIds.length > 0
    ? await supabase
        .from("predictions")
        .select("match_id, user_id, home_score, away_score, points, profiles(name)")
        .in("match_id", finishedMatchIds)
    : { data: [] };

  const predByMatch: Record<string, { user_id: string; home_score: number; away_score: number; points: number | null; profile_name: string | null }[]> = {};
  for (const p of roundPredictions ?? []) {
    if (!predByMatch[p.match_id]) predByMatch[p.match_id] = [];
    predByMatch[p.match_id].push({
      user_id: p.user_id,
      home_score: p.home_score,
      away_score: p.away_score,
      points: p.points,
      profile_name: (p as any).profiles?.name ?? null,
    });
  }
  for (const key of Object.keys(predByMatch)) {
    predByMatch[key].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }

  const roundResultsRows = (finishedMatchesRaw ?? []).map((m) => ({
    ...m,
    home_score: m.home_score ?? 0,
    away_score: m.away_score ?? 0,
    predictions: predByMatch[m.id] ?? [],
  }));

  const { data: syncLogs } = await createAdminClient()
    .from("sync_logs")
    .select("started_at, finished_at, updated_matches, total_finished_api, trigger, error")
    .order("started_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">{t.adminTitle}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white">{totalMatches ?? 0}</div>
          <div className="text-slate-400 text-sm mt-1 flex items-center justify-center gap-1">
            <Calendar size={13} /> {t.adminTotalMatches}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{finishedMatches ?? 0}</div>
          <div className="text-slate-400 text-sm mt-1">{t.adminFinishedMatches}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{totalUsers ?? 0}</div>
          <div className="text-slate-400 text-sm mt-1 flex items-center justify-center gap-1">
            <Users size={13} /> {t.adminParticipants}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{totalPredictions ?? 0}</div>
          <div className="text-slate-400 text-sm mt-1">{t.adminPredictions}</div>
        </div>
      </div>

      <section className="bg-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Resultados vs Palpites</h2>
        <AdminRoundResults matches={roundResultsRows} />
      </section>

      <section className="bg-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Classificação dos grupos</h2>
          <p className="text-slate-400 text-sm mt-1">Override manual caso a FIFA publique uma classificação diferente do cálculo automático.</p>
        </div>
        <AdminGroupOverrides standings={groupStandings} overrides={groupOverrides} />
      </section>

      <section className="bg-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Melhores 3ºs — override manual</h2>
          <p className="text-slate-400 text-sm mt-1">Override caso a FIFA publique uma classificação dos 3ºs colocados diferente do cálculo automático.</p>
        </div>
        <AdminThirdsOverride allThirds={allThirds} override={thirdsOverride} />
      </section>

      <section className="bg-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Inserir resultado manualmente</h2>
          <p className="text-slate-400 text-sm mt-1">Use quando o sync automático não retornar dados da API.</p>
        </div>
        <AdminResultForm matches={allMatches ?? []} />
      </section>

      <section className="bg-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{t.adminSyncTitle}</h2>
          <p className="text-slate-400 text-sm mt-1">{t.adminSyncDesc}</p>
        </div>
        <AdminSyncButton lastSyncAt={lastUpdated?.updated_at ?? null} />

        {syncLogs && syncLogs.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Histórico de sincronização</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {syncLogs.map((log, i) => (
                <div key={i} className={`flex items-center gap-3 text-xs px-3 py-2 rounded-lg ${log.error ? "bg-red-500/10" : "bg-slate-700/50"}`}>
                  <span className={`shrink-0 font-mono ${log.error ? "text-red-400" : "text-green-400"}`}>
                    {log.error ? "✗" : "✓"}
                  </span>
                  <span className="text-slate-400 shrink-0">
                    {new Date(log.started_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} GMT-3
                  </span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${log.trigger === "cron" ? "bg-blue-500/20 text-blue-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                    {log.trigger}
                  </span>
                  {log.error ? (
                    <span className="text-red-400 truncate">{log.error}</span>
                  ) : (
                    <span className="text-slate-300">
                      {log.updated_matches} atualizado{log.updated_matches !== 1 ? "s" : ""} / {log.total_finished_api} finalizados na API
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(!syncLogs || syncLogs.length === 0) && (
          <p className="text-slate-500 text-xs mt-2">Nenhum log ainda — crie a tabela <code className="bg-slate-700 px-1 rounded">sync_logs</code> no Supabase.</p>
        )}
      </section>
    </div>
  );
}
