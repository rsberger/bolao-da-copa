import { createClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/MatchCard";
import { groupMatchesByStage } from "@/lib/matches";

export const revalidate = 60;

export default async function JogosPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  const { data: predictions } = user
    ? await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
    : { data: [] };

  const predictionMap = new Map(
    (predictions ?? []).map((p) => [p.match_id, p])
  );

  const grouped = groupMatchesByStage(matches ?? []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Jogos</h1>
        {!user && (
          <p className="text-slate-400 text-sm">
            Faça login para enviar palpites
          </p>
        )}
      </div>

      {Object.entries(grouped).map(([stage, stageMatches]) => (
        <section key={stage}>
          <h2 className="text-lg font-semibold text-slate-300 mb-3 border-b border-slate-700 pb-2">
            {stage}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {stageMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionMap.get(match.id) ?? null}
                userId={user?.id ?? null}
              />
            ))}
          </div>
        </section>
      ))}

      {(!matches || matches.length === 0) && (
        <div className="text-center text-slate-500 py-16">
          Nenhum jogo cadastrado ainda.
        </div>
      )}
    </div>
  );
}
