"use client";

import Image from "next/image";
import { Swords } from "lucide-react";
import { useT } from "@/lib/i18n/context";

type Player = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  total_points: number;
  exact_scores: number;
};

type Props = { me: Player; rival: Player; myRank: number; rivalRank: number };

function Avatar({ player, size = 44 }: { player: Player; size?: number }) {
  const initials = (player.name ?? player.email ?? "?")[0].toUpperCase();
  if (player.avatar_url) {
    return <Image src={player.avatar_url} alt={player.name ?? ""} width={size} height={size}
      className="rounded-full object-cover ring-2 ring-slate-600" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-slate-600 ring-2 ring-slate-500 flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

function name(p: Player) { return (p.name ?? p.email ?? "?").split(" ")[0]; }

export function RivalDuel({ me, rival, myRank, rivalRank }: Props) {
  const t = useT();
  const gap = Math.abs(me.total_points - rival.total_points);
  const rivalIsAbove = rivalRank < myRank;

  const desc = gap === 0
    ? t.rivalTied(name(rival))
    : rivalIsAbove
      ? t.rivalAhead(name(rival), gap)
      : t.rivalBehind(name(rival), gap);

  const myPct  = me.total_points + rival.total_points === 0 ? 50
    : Math.round((me.total_points / (me.total_points + rival.total_points)) * 100);
  const rivPct = 100 - myPct;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide font-medium">
        <Swords size={13} /> {t.rivalTitle}
      </div>

      <div className="flex items-center gap-3">
        {/* Me */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <Avatar player={me} size={44} />
          <span className="text-green-300 text-xs font-semibold">{name(me)}</span>
          <span className="text-white font-bold text-lg">{me.total_points}</span>
          <span className="text-slate-500 text-xs">#{myRank}</span>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-slate-400 font-bold text-sm">VS</span>
          <span className={`text-xs font-medium text-center max-w-[120px] ${gap === 0 ? "text-yellow-400" : rivalIsAbove ? "text-red-400" : "text-green-400"}`}>
            {desc}
          </span>
        </div>

        {/* Rival */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <Avatar player={rival} size={44} />
          <span className="text-slate-300 text-xs font-semibold">{name(rival)}</span>
          <span className="text-white font-bold text-lg">{rival.total_points}</span>
          <span className="text-slate-500 text-xs">#{rivalRank}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
        <div className="bg-green-500 transition-all rounded-l-full" style={{ width: `${myPct}%` }} />
        <div className="bg-slate-500 transition-all rounded-r-full" style={{ width: `${rivPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{myPct}%</span>
        <span>{rivPct}%</span>
      </div>
    </div>
  );
}
