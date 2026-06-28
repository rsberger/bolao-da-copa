"use client";

import { createContext, useContext } from "react";
import type { BracketHalf, BracketMatch, ResolvedTeam } from "@/lib/bracket";
import { parseMatchDate } from "@/lib/matches";

const LocaleCtx = createContext("pt");

type BracketT = {
  bracketTitle: string; bracketFinal: string; bracketThird: string; bracketBest3rd: string;
  teamWinner: string; teamLoser: string; group: string;
  // no functions — reconstruct ordinal client-side from locale
  stageTrintaDois: string; stageOitavas: string; stageQuartas: string; stageSemi: string;
};

const TransCtx = createContext<BracketT | null>(null);

function ordinal(n: string, locale: string): string {
  if (locale === "en") {
    const num = parseInt(n);
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  }
  if (locale === "nl") return `${n}e`;
  return `${n}º`; // pt
}

// Translates Portuguese bracket placeholders (returned by resolve()) into the active locale.
function useBracketName() {
  const t = useContext(TransCtx)!;
  const locale = useContext(LocaleCtx);
  return (name: string): string => {
    if (!t) return name;
    // "1º Grupo A"
    let out = name.replace(/^(\d+)º Grupo ([A-L])$/, (_, n, g) => `${ordinal(n, locale)} ${t.group} ${g}`);
    // "Melhor 3º (ABCDF)"
    out = out.replace(/^Melhor 3º \(([A-L]+)\)$/, `${t.bracketBest3rd} ($1)`);
    // "Vencedor J73" / "Vencedor R16-1" / "Vencedor QF-1" / "Vencedor SF-1" / "Perdedor SF-1"
    out = out.replace(/^(Vencedor|Perdedor) (.+)$/, (_, type, ref) =>
      `${type === "Vencedor" ? t.teamWinner : t.teamLoser} ${ref}`
    );
    return out;
  };
}

type Props = {
  halves: { left: BracketHalf; right: BracketHalf };
  third: BracketMatch | null;
  final: BracketMatch | null;
  locale: string;
  t: BracketT;
};

// Slot height per round. Each round doubles.
const SLOT = 100; // R32 slot height in px

function useFmtDate() {
  const locale = useContext(LocaleCtx);
  const jsLocale = locale === "pt" ? "pt-BR" : locale === "nl" ? "nl-NL" : "en-US";
  return (dateStr: string) => {
    const d = parseMatchDate(dateStr);
    return (
      d.toLocaleDateString(jsLocale, { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) +
      " " +
      d.toLocaleTimeString(jsLocale, { hour: "2-digit", minute: "2-digit", hour12: locale === "en", timeZone: "America/Sao_Paulo" }) +
      " GMT-3"
    );
  };
}

function TeamRow({ team, isWinner }: { team: ResolvedTeam; isWinner?: boolean }) {
  const translateName = useBracketName();
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 text-xs min-w-0 ${isWinner ? "font-bold text-white" : "text-slate-300"}`}>
      {team.flag ? (
        <img
          src={`https://flagcdn.com/w20/${team.flag.toLowerCase()}.png`}
          alt=""
          className="w-4 h-3 object-cover rounded-sm shrink-0"
        />
      ) : (
        <span className="w-4 h-3 bg-slate-600 rounded-sm shrink-0 inline-block" />
      )}
      <span className="truncate leading-tight max-w-[80px]">{translateName(team.name)}</span>
    </div>
  );
}

function MatchCard({ match, highlight }: { match: BracketMatch | null; highlight?: boolean }) {
  const fmtDate = useFmtDate();
  const border = highlight ? "border-amber-500/60" : "border-slate-600";

  if (!match) {
    return (
      <div className={`bg-slate-800 border ${border} rounded-lg overflow-hidden w-40`}>
        {[0, 1].map((i) => (
          <div key={i} className={`flex px-2 py-1 text-xs text-slate-600 ${i ? "border-t border-slate-700" : ""}`}>
            <span className="w-4 h-3 bg-slate-700 rounded-sm inline-block mr-1.5 shrink-0" />—
          </div>
        ))}
      </div>
    );
  }

  const fin = match.is_finished && match.home_score !== null && match.away_score !== null;
  const pen = fin && match.penalty_winner != null;
  const hasPenScore = pen && match.penalty_home_score != null && match.penalty_away_score != null;
  const homeWin = fin && (match.home_score! > match.away_score! || match.penalty_winner === 'home');
  const awayWin = fin && (match.away_score! > match.home_score! || match.penalty_winner === 'away');

  return (
    <div className={`bg-slate-800 border ${border} rounded-lg overflow-hidden w-40`}>
      <div className={`flex items-center justify-between ${homeWin ? "bg-slate-700" : ""}`}>
        <TeamRow team={match.home_r} isWinner={homeWin} />
        {fin && (
          <div className="flex items-center shrink-0">
            <span className={`px-2 text-xs font-bold ${homeWin ? "text-white" : "text-slate-400"}`}>{match.home_score}</span>
            {hasPenScore && (
              <span className={`pr-2 text-xs font-bold border-l border-slate-600 pl-1.5 ${match.penalty_winner === 'home' ? "text-yellow-400" : "text-slate-500"}`}>
                {match.penalty_home_score}
              </span>
            )}
          </div>
        )}
      </div>
      <div className={`border-t border-slate-700 flex items-center justify-between ${awayWin ? "bg-slate-700" : ""}`}>
        <TeamRow team={match.away_r} isWinner={awayWin} />
        {fin && (
          <div className="flex items-center shrink-0">
            <span className={`px-2 text-xs font-bold ${awayWin ? "text-white" : "text-slate-400"}`}>{match.away_score}</span>
            {hasPenScore && (
              <span className={`pr-2 text-xs font-bold border-l border-slate-600 pl-1.5 ${match.penalty_winner === 'away' ? "text-yellow-400" : "text-slate-500"}`}>
                {match.penalty_away_score}
              </span>
            )}
          </div>
        )}
      </div>
      {pen && !hasPenScore && (
        <div className="border-t border-slate-700 px-2 py-0.5 text-[10px] text-yellow-500 font-medium text-center">pen.</div>
      )}
      <div className="border-t border-slate-700 px-2 py-0.5 text-[10px] text-slate-500 text-center">
        J{match.jNum} · {fmtDate(match.match_date)}
      </div>
    </div>
  );
}

// A single match slot centered within `slotH` pixels total height.
// Also draws bracket lines on the side depending on `linePos`.
function Slot({
  match,
  slotH,
  lineLeft,
  lineRight,
  highlight,
}: {
  match: BracketMatch | null;
  slotH: number;
  lineLeft?: "stub" | "bracket-top" | "bracket-bot";
  lineRight?: "stub" | "bracket-top" | "bracket-bot";
  highlight?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ height: slotH, width: "10rem" }}>
      {/* Card, vertically centered */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
        <MatchCard match={match} highlight={highlight} />
      </div>
    </div>
  );
}

// Connector column: draws vertical bracket lines + horizontal stubs
// between a source column (slotH each) and target column (slotH*2 each).
// `count` = number of source slots = 2 * number of target slots.
function ConnectorCol({
  count,
  srcSlotH,
  side,
}: {
  count: number; // number of source items
  srcSlotH: number;
  side: "left" | "right";
}) {
  const tgtSlotH = srcSlotH * 2;
  const pairs = count / 2;
  const totalH = count * srcSlotH;

  // For each pair we draw:
  // - a vertical line from midpoint of slot[2i] to midpoint of slot[2i+1]
  // - a horizontal stub from the midpoint to the target side
  const lines = [];
  for (let i = 0; i < pairs; i++) {
    const topMid = (2 * i) * srcSlotH + srcSlotH / 2;
    const botMid = (2 * i + 1) * srcSlotH + srcSlotH / 2;
    const midY = (topMid + botMid) / 2;
    lines.push({ topMid, botMid, midY });
  }

  const W = 14;

  return (
    <svg
      width={W}
      height={totalH}
      className="shrink-0"
      style={{ overflow: "visible" }}
    >
      {lines.map(({ topMid, botMid, midY }, i) => (
        <g key={i}>
          {/* Vertical bracket line */}
          <line x1={W / 2} y1={topMid} x2={W / 2} y2={botMid} stroke="#475569" strokeWidth="1" />
          {/* Horizontal stub to next column */}
          {side === "left" ? (
            <line x1={W / 2} y1={midY} x2={W} y2={midY} stroke="#475569" strokeWidth="1" />
          ) : (
            <line x1={W / 2} y1={midY} x2={0} y2={midY} stroke="#475569" strokeWidth="1" />
          )}
          {/* Horizontal stubs from source items */}
          {side === "left" ? (
            <>
              <line x1={0} y1={topMid} x2={W / 2} y2={topMid} stroke="#475569" strokeWidth="1" />
              <line x1={0} y1={botMid} x2={W / 2} y2={botMid} stroke="#475569" strokeWidth="1" />
            </>
          ) : (
            <>
              <line x1={W / 2} y1={topMid} x2={W} y2={topMid} stroke="#475569" strokeWidth="1" />
              <line x1={W / 2} y1={botMid} x2={W} y2={botMid} stroke="#475569" strokeWidth="1" />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

// Render a bracket column: an array of matches each centered in slotH slots
function RoundCol({
  matches,
  slotH,
  highlight,
}: {
  matches: (BracketMatch | null)[];
  slotH: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col shrink-0">
      {matches.map((m, i) => (
        <Slot key={i} match={m} slotH={slotH} highlight={highlight} />
      ))}
    </div>
  );
}

function LeftBracket({ half }: { half: BracketHalf }) {
  const r32 = half.r32;  // 8 matches, slotH = SLOT
  const r16 = half.r16;  // 4 matches, slotH = SLOT*2
  const qf  = half.qf;   // 2 matches, slotH = SLOT*4
  const sf  = half.sf;   // 1 match,   slotH = SLOT*8

  return (
    <div className="flex items-start">
      <RoundCol matches={r32} slotH={SLOT} />
      <ConnectorCol count={8} srcSlotH={SLOT} side="left" />
      <RoundCol matches={r16} slotH={SLOT * 2} />
      <ConnectorCol count={4} srcSlotH={SLOT * 2} side="left" />
      <RoundCol matches={qf} slotH={SLOT * 4} />
      <ConnectorCol count={2} srcSlotH={SLOT * 4} side="left" />
      <RoundCol matches={[sf]} slotH={SLOT * 8} />
    </div>
  );
}

function RightBracket({ half }: { half: BracketHalf }) {
  const r32 = half.r32;
  const r16 = half.r16;
  const qf  = half.qf;
  const sf  = half.sf;

  return (
    <div className="flex items-start">
      <RoundCol matches={[sf]} slotH={SLOT * 8} />
      <ConnectorCol count={2} srcSlotH={SLOT * 4} side="right" />
      <RoundCol matches={qf} slotH={SLOT * 4} />
      <ConnectorCol count={4} srcSlotH={SLOT * 2} side="right" />
      <RoundCol matches={r16} slotH={SLOT * 2} />
      <ConnectorCol count={8} srcSlotH={SLOT} side="right" />
      <RoundCol matches={r32} slotH={SLOT} />
    </div>
  );
}

export function BracketView({ halves, third, final, locale, t }: Props) {
  const totalH = SLOT * 8;

  return (
    <TransCtx.Provider value={t}>
    <LocaleCtx.Provider value={locale}>
    <div className="p-4 md:p-8 overflow-x-auto min-h-screen bg-slate-900">
      <h1 className="text-white font-bold text-xl mb-8 text-center">
        {t.bracketTitle}
      </h1>
      <div className="flex items-start justify-start gap-2 min-w-max mx-auto">
        <LeftBracket half={halves.left} />

        {/* Center: Final + 3rd */}
        <div
          className="flex flex-col items-center justify-center gap-6 shrink-0"
          style={{ height: totalH, width: "10rem" }}
        >
          <div className="text-center">
            <div className="text-amber-400 text-xs font-bold mb-1.5 uppercase tracking-wide">
              {t.bracketFinal}
            </div>
            <MatchCard match={final} highlight />
          </div>
          <div className="text-center">
            <div className="text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              {t.bracketThird}
            </div>
            <MatchCard match={third} />
          </div>
        </div>

        <RightBracket half={halves.right} />
      </div>
    </div>
    </LocaleCtx.Provider>
    </TransCtx.Provider>
  );
}
