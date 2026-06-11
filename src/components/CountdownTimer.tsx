"use client";

import { useEffect, useState } from "react";
import { Clock, Radio } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/context";
import { countryName, translateTeamName, parseMatchDate } from "@/lib/matches";

type MatchInfo = {
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
};

type Props = { unfinishedMatches: MatchInfo[] };

function diffMs(target: Date) {
  return target.getTime() - Date.now();
}

function fmtCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function label(flag: string | null, team: string, locale: string, t: ReturnType<typeof useT>) {
  return flag ? (countryName(flag, locale) ?? team) : translateTeamName(team, t);
}

export function CountdownTimer({ unfinishedMatches }: Props) {
  const t = useT();
  const locale = useLocale();
  // clientNow starts null so server render and first hydration match (no live section),
  // then gets set to real time after mount — avoids React hydration mismatch.
  const [clientNow, setClientNow] = useState<number | null>(null);

  useEffect(() => {
    setClientNow(Date.now());
    const id = setInterval(() => setClientNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const now = clientNow ?? 0; // 0 → no match is "live" during SSR

  // Live: kickoff time has passed but match not yet finished
  const live = unfinishedMatches.filter((m) => parseMatchDate(m.matchDate).getTime() <= now);

  // Upcoming: only those starting after now
  const upcoming = unfinishedMatches.filter((m) => parseMatchDate(m.matchDate).getTime() > now);

  // Group upcoming by kickoff — show only the earliest slot
  const nextKickoff = upcoming[0]?.matchDate ?? null;
  const next = nextKickoff ? upcoming.filter((m) => m.matchDate === nextKickoff) : [];

  if (live.length === 0 && next.length === 0) return null;

  const nextTarget = next[0] ? parseMatchDate(next[0].matchDate) : null;
  const msLeft = nextTarget ? diffMs(nextTarget) : 0;
  const countdown = msLeft > 0 ? fmtCountdown(msLeft) : null;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex flex-col gap-3">
      {/* Live matches */}
      {live.map((m, i) => (
        <div key={i} className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-red-400 shrink-0 animate-pulse" />
            <span className="text-sm font-medium text-red-400">{t.countdownLive}:</span>
            <span className="text-white font-semibold">
              {label(m.homeFlag, m.homeTeam, locale, t)} × {label(m.awayFlag, m.awayTeam, locale, t)}
            </span>
          </div>
          <span className="text-red-400 font-semibold text-sm animate-pulse">{t.countdownStarted}</span>
        </div>
      ))}

      {live.length > 0 && next.length > 0 && (
        <div className="border-t border-slate-700" />
      )}

      {/* Next matches — all with same kickoff */}
      {next.map((m, i) => (
        <div key={i} className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock size={16} className="text-green-400 shrink-0" />
            <span className="text-sm font-medium">{t.countdownTitle}:</span>
            <span className="text-white font-semibold">
              {label(m.homeFlag, m.homeTeam, locale, t)} × {label(m.awayFlag, m.awayTeam, locale, t)}
            </span>
          </div>
          {/* Countdown once, shared for all matches in this slot */}
          {i === 0 && (
            countdown ? (
              <div className="flex items-center gap-1 font-mono text-white">
                {countdown.d > 0 && (
                  <><span className="text-xl font-bold">{countdown.d}</span>
                  <span className="text-slate-500 text-sm mr-2">{t.countdownDays}</span></>
                )}
                <span className="text-xl font-bold">{pad(countdown.h)}</span>
                <span className="text-slate-500 text-sm">:</span>
                <span className="text-xl font-bold">{pad(countdown.m)}</span>
                <span className="text-slate-500 text-sm">:</span>
                <span className="text-xl font-bold text-green-400">{pad(countdown.s)}</span>
              </div>
            ) : (
              <span className="text-green-400 font-semibold text-sm animate-pulse">{t.countdownStarted}</span>
            )
          )}
        </div>
      ))}
    </div>
  );
}
