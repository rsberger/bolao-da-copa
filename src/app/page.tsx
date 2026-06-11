import Link from "next/link";
import { Trophy, Calendar, BarChart3, LogIn } from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";

export default async function Home() {
  const locale = await getLocale();
  const t = translations[locale];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-8">
      <div>
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-4xl font-bold text-white mb-2">{t.appName}</h1>
        <p className="text-slate-400 text-lg">{t.appTagline}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <Link href="/jogos" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-5 flex flex-col items-center gap-2 transition-colors group">
          <Calendar className="text-green-400 group-hover:scale-110 transition-transform" size={32} />
          <h2 className="font-semibold text-white">{t.navMatches}</h2>
          <p className="text-slate-400 text-sm">{t.homeMatchesDesc}</p>
        </Link>
        <Link href="/resultados" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-5 flex flex-col items-center gap-2 transition-colors group">
          <Trophy className="text-yellow-400 group-hover:scale-110 transition-transform" size={32} />
          <h2 className="font-semibold text-white">{t.homeScoring}</h2>
          <p className="text-slate-400 text-sm">{t.homeScoringDesc}</p>
        </Link>
        <Link href="/placar" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-5 flex flex-col items-center gap-2 transition-colors group">
          <BarChart3 className="text-blue-400 group-hover:scale-110 transition-transform" size={32} />
          <h2 className="font-semibold text-white">{t.navRanking}</h2>
          <p className="text-slate-400 text-sm">{t.homeRankingDesc}</p>
        </Link>
      </div>

      <p className="text-slate-500 text-sm flex items-center gap-1">
        <LogIn size={14} />
        {t.homeLoginPrompt}
      </p>
    </div>
  );
}
