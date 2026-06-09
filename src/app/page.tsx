import Link from "next/link";
import { Trophy, Calendar, BarChart3, LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-8">
      <div>
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-4xl font-bold text-white mb-2">Bolão da Copa</h1>
        <p className="text-slate-400 text-lg">
          Faça seus palpites, acumule pontos e dispute com seus amigos!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <div className="bg-slate-800 rounded-xl p-5 flex flex-col items-center gap-2">
          <Calendar className="text-green-400" size={32} />
          <h2 className="font-semibold text-white">Jogos</h2>
          <p className="text-slate-400 text-sm">Veja os jogos e envie seus palpites</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 flex flex-col items-center gap-2">
          <Trophy className="text-yellow-400" size={32} />
          <h2 className="font-semibold text-white">Pontuação</h2>
          <p className="text-slate-400 text-sm">Placar exato: 10pts · Vencedor: 5pts</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 flex flex-col items-center gap-2">
          <BarChart3 className="text-blue-400" size={32} />
          <h2 className="font-semibold text-white">Ranking</h2>
          <p className="text-slate-400 text-sm">Acompanhe a classificação em tempo real</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/jogos"
          className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Calendar size={18} />
          Ver jogos
        </Link>
        <Link
          href="/placar"
          className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <BarChart3 size={18} />
          Ranking
        </Link>
      </div>

      <p className="text-slate-500 text-sm flex items-center gap-1">
        <LogIn size={14} />
        Faça login com Google para participar
      </p>
    </div>
  );
}
