import { createClient } from "@/lib/supabase/server";
import { BracketView } from "@/components/BracketView";
import { buildBracket, getBracketHalves } from "@/lib/bracket";
import { getLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import type { Match } from "@/lib/matches";

export const revalidate = 60;

export default async function ChaveamentoPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = translations[locale];

  const { data } = await supabase
    .from("matches")
    .select("id,home_team,away_team,home_flag,away_flag,match_date,stage,group_name,home_score,away_score,is_finished")
    .order("match_date", { ascending: true });

  const matches = (data ?? []) as Match[];

  const [{ data: overrideRows }, { data: thirdsRow }] = await Promise.all([
    supabase.from("group_overrides").select("group_name, ranking"),
    supabase.from("thirds_override").select("ranking").eq("id", 1).maybeSingle(),
  ]);
  const overrides: Record<string, string[]> = {};
  for (const row of overrideRows ?? []) overrides[row.group_name] = row.ranking;
  const thirdsOverride: string[] | null = thirdsRow?.ranking ?? null;

  const bracket = buildBracket(matches, overrides, thirdsOverride);
  const halves = getBracketHalves(bracket);

  return (
    <main className="min-h-screen bg-slate-900">
      <BracketView
        halves={halves}
        third={bracket.third}
        final={bracket.final}
        locale={locale}
        t={{
          bracketTitle: t.bracketTitle,
          bracketFinal: t.bracketFinal,
          bracketThird: t.bracketThird,
          bracketBest3rd: t.bracketBest3rd,
          teamWinner: t.teamWinner,
          teamLoser: t.teamLoser,
          group: t.group,
          stageTrintaDois: t.stageTrintaDois,
          stageOitavas: t.stageOitavas,
          stageQuartas: t.stageQuartas,
          stageSemi: t.stageSemi,
        }}
      />
    </main>
  );
}
