import { createClient } from "@/lib/supabase/server";
import { Trophy, Target, Crosshair } from "lucide-react";
import Image from "next/image";

export const revalidate = 60;

export default async function PlacarPage() {
  const supabase = await createClient();

  const { data: leaders } = await supabase
    .from("leaderboard")
    .select("*");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Trophy className="text-yellow-400" size={28} />
        Ranking
      </h1>

      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
          <span>#</span>
          <span>Jogador</span>
          <span className="text-center hidden sm:block">Palpites</span>
          <span className="text-center hidden sm:block">Exatos</span>
          <span className="text-right font-bold">Pts</span>
        </div>

        {(leaders ?? []).map((player, i) => (
          <div
            key={player.id}
            className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-4 items-center border-b border-slate-700/50 last:border-0 ${
              i === 0 ? "bg-yellow-500/10" : i === 1 ? "bg-slate-500/10" : i === 2 ? "bg-orange-700/10" : ""
            }`}
          >
            <span className={`text-lg font-bold w-6 text-center ${
              i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-600"
            }`}>
              {i + 1}
            </span>

            <div className="flex items-center gap-3 min-w-0">
              {player.avatar_url ? (
                <Image
                  src={player.avatar_url}
                  alt={player.name ?? ""}
                  width={36}
                  height={36}
                  className="rounded-full shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {(player.name ?? player.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <span className="text-white font-medium truncate">
                {player.name ?? player.email}
              </span>
            </div>

            <span className="text-slate-400 text-sm text-center hidden sm:block">
              {player.total_predictions}
            </span>

            <div className="hidden sm:flex items-center gap-1 justify-center text-green-400 text-sm">
              <Crosshair size={14} />
              {player.exact_scores}
            </div>

            <span className="text-right font-bold text-lg text-white">
              {player.total_points}
            </span>
          </div>
        ))}

        {(!leaders || leaders.length === 0) && (
          <div className="text-center text-slate-500 py-12">
            Nenhum palpite enviado ainda.
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300 mb-2">Sistema de pontuação</p>
        <div className="flex items-center gap-2"><Target size={14} className="text-green-400" /> Placar exato — <strong className="text-white">10 pontos</strong></div>
        <div className="flex items-center gap-2"><Target size={14} className="text-blue-400" /> Vencedor/empate correto — <strong className="text-white">5 pontos</strong></div>
        <div className="flex items-center gap-2"><Target size={14} className="text-slate-500" /> Errou — <strong className="text-white">0 pontos</strong></div>
      </div>
    </div>
  );
}
