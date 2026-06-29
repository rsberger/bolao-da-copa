"use client";

import Image from "next/image";
import { Trophy, Crosshair, Target, Flame, TrendingUp, Zap } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/context";
import { RivalDuel } from "@/components/RivalDuel";
import { flagUrl, countryName } from "@/lib/matches";

type Leader = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  total_points: number;
  exact_scores: number;
  correct_diffs: number;
  correct_winners: number;
  total_hits: number;
  total_predictions: number;
};

type RoundLeader = { id: string; name: string | null; avatar_url: string | null; points: number };
type RoundMatchBreakdown = { matchId: string; label: string; predByUser: Record<string, { home: number; away: number; pts: number }> };
type ChampionPick = { user_id: string; team: string; team_flag: string | null; name: string | null; avatar_url: string | null };

type Props = {
  leaders: Leader[];
  currentUserId: string | null;
  roundLeaders: RoundLeader[];
  roundMatchCount: number;
  roundMatchBreakdown?: RoundMatchBreakdown[];
  championPicks: ChampionPick[];
  myChampionPick: { team: string; team_flag: string | null } | null;
  missingMatchCount: number;
  missingChampion: boolean;
  finishedPredsById: Record<string, number>;
  geloUserIds: string[];
  zebraCountById: Record<string, number>;
};

function Avatar({ player, size = 40 }: { player: Leader; size?: number }) {
  const initials = (player.name ?? player.email ?? "?")[0].toUpperCase();
  if (player.avatar_url) {
    return (
      <Image src={player.avatar_url} alt={player.name ?? ""} width={size} height={size}
        className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full bg-slate-600 flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

function displayName(p: Leader) { return p.name ?? p.email ?? "?"; }
function firstName(p: Leader) { return (p.name ?? p.email ?? "?").split(" ")[0]; }

type Badge = { emoji: string; label: string; desc: string; color: string; tier?: typeof TIERS[number] };

function sniperTier(exacts: number): typeof TIERS[number] {
  if (exacts >= 20) return TIERS[3]; // Diamante
  if (exacts >= 10) return TIERS[2]; // Ouro
  if (exacts >= 5)  return TIERS[1]; // Prata
  return TIERS[0];                   // Bronze
}

function onFireTier(finishedPreds: number): typeof TIERS[number] {
  if (finishedPreds >= 10) return TIERS[3];
  if (finishedPreds >= 6)  return TIERS[2];
  if (finishedPreds >= 3)  return TIERS[1];
  return TIERS[0];
}

function zebraTier(count: number): typeof TIERS[number] {
  if (count >= 10) return TIERS[3];
  if (count >= 6)  return TIERS[2];
  if (count >= 3)  return TIERS[1];
  return TIERS[0];
}

function computeRelampago(leaders: Leader[], roundLeaders: RoundLeader[]): string | null {
  if (roundLeaders.length === 0) return null;
  const roundMap = new Map(roundLeaders.map((r) => [r.id, r.points]));

  // Pre-round score = total_points minus this round's points
  const preRound = leaders.map((l) => ({
    id: l.id,
    pre: Number(l.total_points) - (roundMap.get(l.id) ?? 0),
  }));

  // Sort pre-round to get previous rank (desc)
  const sorted = [...preRound].sort((a, b) => b.pre - a.pre);
  const prevRankMap = new Map(sorted.map((p, i) => [p.id, i + 1]));

  // Current rank map
  const currRankMap = new Map(leaders.map((l, i) => [l.id, i + 1]));

  let bestDelta = 0;
  let bestId: string | null = null;
  for (const l of leaders) {
    const prev = prevRankMap.get(l.id) ?? 0;
    const curr = currRankMap.get(l.id) ?? 0;
    const delta = prev - curr; // positive = climbed
    if (delta > bestDelta) { bestDelta = delta; bestId = l.id; }
  }
  return bestDelta >= 2 ? bestId : null; // at least 2 positions gained
}

function useBadges(
  leaders: Leader[],
  roundLeaders: RoundLeader[],
  finishedPredsById: Record<string, number>,
  geloUserIds: string[],
  zebraCountById: Record<string, number>,
) {
  const t = useT();
  const maxPreds = Math.max(...leaders.map((l) => Number(l.total_predictions)));
  const lastPlayerId = leaders[leaders.length - 1]?.id;
  const geloSet = new Set(geloUserIds);
  const relampago = computeRelampago(leaders, roundLeaders);

  const leaderRoundPts = roundLeaders.find((r) => r.id === leaders[0]?.id)?.points ?? 0;
  const cacadoresSet = new Set(
    leaderRoundPts > 0
      ? roundLeaders.filter((r) => r.id !== leaders[0]?.id && r.points > leaderRoundPts).map((r) => r.id)
      : []
  );

  return (player: Leader, rank: number): Badge[] => {
    const badges: Badge[] = [];
    const preds = Number(player.total_predictions);
    const hits = Number(player.total_hits);
    const exacts = Number(player.exact_scores);
    const finishedPreds = finishedPredsById[player.id] ?? 0;
    const accuracyOnFinished = finishedPreds > 0 ? hits / finishedPreds : 0;
    const isLast = player.id === lastPlayerId;

    if (rank === 1 && preds > 0)                             badges.push({ emoji: "🏆", label: t.badgeLeader,    desc: t.badgeLeaderDesc,    color: "bg-yellow-500/20 text-yellow-300" });
    if (isLast)                                              badges.push({ emoji: "🏮", label: t.badgeLantern,   desc: t.badgeLanternDesc,   color: "bg-red-500/20 text-red-400" });
    if (exacts >= 1)                                         badges.push({ emoji: "🎯", label: t.badgeSniper,    desc: t.badgeSniperDesc,    color: "bg-green-500/20 text-green-300", tier: sniperTier(exacts) });
    if (accuracyOnFinished >= 0.7 && finishedPreds >= 3)     badges.push({ emoji: "🔥", label: t.badgeOnFire,   desc: t.badgeOnFireDesc,    color: "bg-orange-500/20 text-orange-300", tier: onFireTier(finishedPreds) });
    if (preds === maxPreds && preds > 0)                     badges.push({ emoji: "📊", label: t.badgeDedicated, desc: t.badgeDedicatedDesc, color: "bg-blue-500/20 text-blue-300" });
    if (geloSet.has(player.id))                              badges.push({ emoji: "🧊", label: t.badgeGelo,      desc: t.badgeGeloDesc,      color: "bg-cyan-500/20 text-cyan-300" });
    if (player.id === relampago)                             badges.push({ emoji: "⚡", label: t.badgeRelampago, desc: t.badgeRelampaoDesc,  color: "bg-yellow-500/20 text-yellow-200" });
    if (cacadoresSet.has(player.id))                        badges.push({ emoji: "🦁", label: t.badgeCacador,   desc: t.badgeCacadorDesc,   color: "bg-amber-500/20 text-amber-300" });
    const zebraCount = zebraCountById[player.id] ?? 0;
    if (zebraCount >= 1)                                    badges.push({ emoji: "🦓", label: t.badgeZebraLabel, desc: t.badgeZebraDesc,     color: "bg-teal-500/20 text-teal-300", tier: zebraTier(zebraCount) });
    return badges;
  };
}

function PlayerTitle({ rank, total, hasPredictions, t }: {
  rank: number; total: number; hasPredictions: boolean;
  t: ReturnType<typeof useT>;
}) {
  if (!hasPredictions) return null;
  const cfg =
    rank === 1 ? { label: t.titleFirst,  color: "text-yellow-400" } :
    rank === 2 ? { label: t.titleSecond, color: "text-slate-300"  } :
    rank === 3 ? { label: t.titleThird,  color: "text-orange-400" } :
    rank === total ? { label: t.titleLast, color: "text-red-400"  } :
    { label: t.titleMid, color: "text-slate-500" };
  return <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function ProgressBar({ me, above, t }: { me: Leader; above: Leader; t: ReturnType<typeof useT> }) {
  const gap = above.total_points - me.total_points;
  if (gap <= 0) return null;
  // Progress = how much of the gap has been "closed" relative to a 30-pt window
  const window = Math.max(above.total_points, 30);
  const pct = Math.max(5, Math.round((me.total_points / window) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{gap} pts {t.progressLabel} <span className="text-white font-medium">{firstName(above)}</span></span>
        <span className="text-slate-500">{me.total_points} / {above.total_points}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const TIERS = [
  { key: "bronze",   ring: "border-amber-600",  text: "text-amber-600",  bg: "bg-amber-600/10"  },
  { key: "prata",    ring: "border-slate-400",  text: "text-slate-400",  bg: "bg-slate-400/10"  },
  { key: "ouro",     ring: "border-yellow-400", text: "text-yellow-400", bg: "bg-yellow-400/10" },
  { key: "diamante", ring: "border-blue-400",   text: "text-blue-400",   bg: "bg-blue-400/10"   },
];

function BadgeIcon({ icon, tier }: { icon: string; tier: typeof TIERS[number] | null }) {
  const ring = tier ? `border-2 ${tier.ring}` : "border-2 border-slate-700";
  return (
    <div className={`w-10 h-10 rounded-full ${ring} flex items-center justify-center text-lg`}>
      {icon}
    </div>
  );
}

function InlineBadge({ b }: { b: Badge }) {
  if (b.tier) {
    return (
      <span title={`${b.label}: ${b.desc}`}
        className={`w-6 h-6 rounded-full border-2 ${b.tier.ring} flex items-center justify-center text-sm leading-none`}>
        {b.emoji}
      </span>
    );
  }
  return (
    <span title={`${b.label}: ${b.desc}`}
      className={`text-xs px-1.5 py-0 rounded-full leading-5 inline-flex items-center gap-0.5 ${b.color}`}>
      {b.emoji}
    </span>
  );
}

function TieredBadgeCard({ icon, label, desc, thresholds }: {
  icon: string; label: string; desc: string;
  thresholds: [number, number, number, number];
}) {
  const t = useT();
  const tierLabels = [t.tierBronze, t.tierPrata, t.tierOuro, t.tierDiamante];
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <BadgeIcon icon={icon} tier={TIERS[3]} />
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-slate-400 text-xs">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {TIERS.map((tier, i) => (
          <div key={tier.key} className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full border-2 ${tier.ring} flex items-center justify-center text-base`}>
              {icon}
            </div>
            <span className={`text-xs font-bold ${tier.text}`}>{thresholds[i]}×</span>
            <span className="text-slate-500 text-xs uppercase tracking-wide">{tierLabels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TieredBadgesPanel() {
  const t = useT();
  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">
        {t.badgesPanelDesc}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <TieredBadgeCard icon="🎯" label={t.badgeNaMoscaLabel} desc={t.badgeNaMoscaDesc} thresholds={[1, 5, 10, 20]} />
        <TieredBadgeCard icon="🔥" label={t.badgeFogoLabel}    desc={t.badgeFogoDesc}    thresholds={[1, 3, 6, 10]} />
        <TieredBadgeCard icon="🦓" label={t.badgeZebraLabel}   desc={t.badgeZebraDesc}   thresholds={[1, 3, 6, 10]} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-slate-300 text-sm font-medium mt-0.5">{label}</div>
      {sub && <div className="text-slate-500 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

export function RankingDashboard({ leaders, currentUserId, roundLeaders, roundMatchCount, roundMatchBreakdown, championPicks, myChampionPick, missingMatchCount, missingChampion, finishedPredsById, geloUserIds, zebraCountById }: Props) {
  const t = useT();
  const locale = useLocale();
  const getBadges = useBadges(leaders, roundLeaders, finishedPredsById, geloUserIds, zebraCountById);

  const hasData = leaders.length > 0 && leaders.some((l) => l.total_predictions > 0);

  // Compute tie-aware ranks: players with equal points+exacts share the same rank
  const ranks: number[] = [];
  for (let i = 0; i < leaders.length; i++) {
    if (i === 0) { ranks.push(1); continue; }
    const prev = leaders[i - 1];
    const curr = leaders[i];
    const sameScore =
      Number(curr.total_points)      === Number(prev.total_points) &&
      Number(curr.exact_scores)      === Number(prev.exact_scores) &&
      Number(curr.correct_diffs)     === Number(prev.correct_diffs) &&
      Number(curr.correct_winners)   === Number(prev.correct_winners) &&
      Number(curr.total_predictions) === Number(prev.total_predictions);
    ranks.push(sameScore ? ranks[i - 1] : i + 1);
  }

  const me = leaders.find((l) => l.id === currentUserId);
  const myIdx = leaders.findIndex((l) => l.id === currentUserId);
  const myRank = myIdx >= 0 ? ranks[myIdx] : null;
  const above = myIdx > 0 ? leaders[myIdx - 1] : null;
  const below = myIdx >= 0 && myIdx < leaders.length - 1 ? leaders[myIdx + 1] : null;

  // Podium: top distinct rank players (all tied-1st shown together)
  const topRankValue = ranks[0] ?? 1;
  const podiumPlayers = leaders.filter((_, i) => ranks[i] <= 3);
  const allTiedAtTop = podiumPlayers.length > 1 && podiumPlayers.every((_, i) =>
    Number(podiumPlayers[i].total_points) === Number(podiumPlayers[0].total_points)
  );

  const totalPredictions = leaders.reduce((s, l) => s + Number(l.total_predictions), 0);
  const totalExact = leaders.reduce((s, l) => s + Number(l.exact_scores), 0);
  const bestExact = [...leaders].sort((a, b) => Number(b.exact_scores) - Number(a.exact_scores))[0];
  const mostPredictions = [...leaders].sort((a, b) => Number(b.total_predictions) - Number(a.total_predictions))[0];
  const bestAccuracy = [...leaders]
    .filter((l) => Number(l.total_predictions) >= 3)
    .sort((a, b) => (Number(b.total_hits) / Number(b.total_predictions)) - (Number(a.total_hits) / Number(a.total_predictions)))[0];

  const playersWithPreds = leaders.filter((l) => Number(l.total_predictions) > 0).length;

  // Provocations
  const provocations: { text: string; color: string; icon: React.ReactNode }[] = [];
  if (hasData) {
    const leader = leaders[0];
    if (!me) {
      provocations.push({ text: t.provVisitorLeader(firstName(leader), leader.total_points), color: "text-yellow-400", icon: <Flame size={16} /> });
      if (leaders.length > 1) {
        const gap = leaders[0].total_points - leaders[1].total_points;
        provocations.push({
          text: gap > 0 ? t.provVisitorChase(firstName(leaders[1]), gap) : t.provVisitorTied(firstName(leaders[0]), firstName(leaders[1])),
          color: "text-blue-400", icon: <TrendingUp size={16} />,
        });
      }
    } else if (myIdx === 0) {
      provocations.push({
        text: below ? t.provLeaderWithChaser(firstName(below), me.total_points - below.total_points) : t.provLeaderAlone,
        color: "text-yellow-400", icon: <Trophy size={16} />,
      });
      if (me.total_predictions === 0)
        provocations.push({ text: t.provLeaderNoPredictions, color: "text-orange-400", icon: <Zap size={16} /> });
    } else {
      const gapAbove = above!.total_points - me.total_points;
      provocations.push({
        text: gapAbove === 0 ? t.provTiedAbove(firstName(above!)) : t.provCloseAbove(gapAbove, firstName(above!)),
        color: "text-green-400", icon: <TrendingUp size={16} />,
      });
      if (below) {
        const gapBelow = me.total_points - below.total_points;
        provocations.push({
          text: gapBelow === 0 ? t.provChaserTied(firstName(below)) : t.provChaserClose(firstName(below), gapBelow),
          color: gapBelow <= 3 ? "text-red-400" : "text-slate-400", icon: <Flame size={16} />,
        });
      }
      const leaderGap = leader.total_points - me.total_points;
      if (leaderGap > 0)
        provocations.push({ text: t.provLeaderGap(firstName(leader), leaderGap), color: "text-slate-400", icon: <Target size={16} /> });
    }
  }

  const showAlert = currentUserId && (missingMatchCount > 0 || missingChampion);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Trophy className="text-yellow-400" size={28} /> {t.rankingTitle}
      </h1>

      {/* Missing predictions alert */}
      {showAlert && (
        <div className="bg-orange-500/10 border border-orange-500/40 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-orange-300 font-semibold text-sm">{t.alertMissingTitle}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {missingMatchCount > 0 && (
                <span className="text-slate-300 text-xs">⚽ {t.alertMissingMatches(missingMatchCount)}</span>
              )}
              {missingChampion && (
                <span className="text-slate-300 text-xs">🏆 {t.alertMissingChampion}</span>
              )}
            </div>
          </div>
          <a href="/jogos" className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            {t.alertMissingCta}
          </a>
        </div>
      )}

      {/* Champion votes by country */}
      {championPicks.length > 0 && (() => {
        const byTeam = new Map<string, { flag: string | null; count: number }>();
        for (const p of championPicks) {
          const existing = byTeam.get(p.team);
          if (existing) existing.count++;
          else byTeam.set(p.team, { flag: p.team_flag, count: 1 });
        }
        const sorted = Array.from(byTeam.entries()).sort((a, b) => b[1].count - a[1].count);
        return (
          <div className="bg-slate-800 border border-yellow-500/20 rounded-xl px-5 py-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-3">🏆 {t.championPicksTitle}</p>
            <div className="flex flex-wrap gap-2">
              {sorted.map(([team, { flag, count }]) => (
                <div key={team} className="flex items-center gap-2 bg-slate-700/60 rounded-lg px-3 py-1.5">
                  {flagUrl(flag) && (
                    <img src={flagUrl(flag)!} alt={team} className="w-6 h-4 object-cover rounded-sm shrink-0" />
                  )}
                  <span className="text-white text-sm font-medium">{countryName(flag, locale) ?? team}</span>
                  <span className="text-slate-400 text-xs font-semibold">{count}×</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Provocations */}
      {provocations.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-2">
          {provocations.map((m, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm ${m.color}`}>
              <span className="mt-0.5 shrink-0">{m.icon}</span>
              <span>{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* My card with progress bar */}
      {me && myRank && myRank > 1 && (
        <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-slate-400 w-10 text-center">#{myRank}</div>
            <Avatar player={me} size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{t.youLabel} — {displayName(me)}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <PlayerTitle rank={myRank} total={playersWithPreds} hasPredictions={me.total_predictions > 0} t={t} />
                {getBadges(me, myRank).map((b) => (
                  <span key={b.label} title={b.desc} className={`text-xs px-1.5 py-0.5 rounded-full ${b.color}`}>
                    {b.emoji} {b.label}
                  </span>
                ))}

              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-white">{me.total_points}</div>
              <div className="text-slate-500 text-xs">pts</div>
            </div>
          </div>
          {above && <ProgressBar me={me} above={above} t={t} />}
        </div>
      )}

      {/* Rival duel */}
      {me && myRank && above && (
        <RivalDuel
          me={me}
          rival={above}
          myRank={myRank}
          rivalRank={ranks[leaders.indexOf(above)]}
        />
      )}

      {/* Round mini-ranking */}
      {roundLeaders.length > 0 && (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">{t.roundRankingTitle}</h2>
            <span className="text-slate-500 text-xs">{t.roundRankingDesc(roundMatchCount)}</span>
          </div>
          {/* Per-match header if breakdown available */}
          {roundMatchBreakdown && roundMatchBreakdown.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-700/60">
              <span className="w-5 shrink-0" />
              <span className="w-7 shrink-0" />
              <span className="flex-1" />
              <div className="flex gap-2 items-center">
                {roundMatchBreakdown.map((m) => (
                  <span key={m.matchId} className="text-slate-500 text-[10px] w-10 text-center truncate" title={m.label}>{m.label}</span>
                ))}
                <span className="text-slate-500 text-[10px] w-12 text-right">{t.roundRankingPts}</span>
              </div>
            </div>
          )}
          {roundLeaders.map((player, i) => {
            const isMe = player.id === currentUserId;
            const initials = (player.name ?? "?")[0].toUpperCase();
            return (
              <div key={player.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-700/40 last:border-0 ${isMe ? "bg-green-500/10" : ""}`}>
                <span className={`text-sm font-bold w-5 text-center shrink-0 ${i === 0 ? "text-yellow-400" : "text-slate-600"}`}>{i + 1}</span>
                <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-600 flex items-center justify-center shrink-0">
                  {player.avatar_url
                    ? <img src={player.avatar_url} alt={player.name ?? ""} className="w-full h-full object-cover" />
                    : <span className="text-white text-xs font-bold">{initials}</span>}
                </div>
                <span className={`flex-1 text-sm font-medium ${isMe ? "text-green-300" : "text-slate-300"}`}>
                  {(player.name ?? "?").split(" ")[0]}{isMe ? ` ${t.youIndicator}` : ""}
                </span>
                <div className="flex gap-2 items-center">
                  {roundMatchBreakdown && roundMatchBreakdown.map((m) => {
                    const pred = m.predByUser[player.id];
                    const color = pred == null ? "text-slate-600" : pred.pts > 0 ? "text-green-400" : "text-slate-400";
                    return (
                      <span key={m.matchId} className={`text-xs w-10 text-center tabular-nums ${color}`}>
                        {pred == null ? "—" : `${pred.home}-${pred.away}`}
                      </span>
                    );
                  })}
                  <span className={`font-bold text-sm w-12 text-right tabular-nums ${i === 0 ? "text-yellow-400" : "text-white"}`}>
                    +{player.points}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Podium */}
      {podiumPlayers.length > 0 && (
        allTiedAtTop ? (
          <div className="bg-slate-800 border border-yellow-500/30 rounded-xl p-5 text-center space-y-3">
            <div className="text-3xl">🏆</div>
            <p className="text-yellow-400 font-bold text-lg">{t.tiedFirst}</p>
            <p className="text-slate-400 text-sm">{t.tiedAt(podiumPlayers.length, podiumPlayers[0].total_points)}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {podiumPlayers.map((player) => {
                const isMe = player.id === currentUserId;
                return (
                  <div key={player.id} className={`flex flex-col items-center gap-1 ${isMe ? "ring-2 ring-green-500 rounded-xl p-1" : ""}`}>
                    <Avatar player={player} size={40} />
                    <span className={`text-xs font-medium ${isMe ? "text-green-400" : "text-slate-300"}`}>
                      {firstName(player)}{isMe ? ` (${t.youLabel.toLowerCase()})` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-center gap-3">
            {podiumPlayers.map((player, podiumIdx) => {
              const rank = ranks[leaders.indexOf(player)];
              const isMe = player.id === currentUserId;
              const heights = ["h-36", "h-28", "h-24"];
              const colors = ["text-yellow-400", "text-slate-300", "text-orange-400"];
              const bgColors = ["bg-yellow-500/20", "bg-slate-600/30", "bg-orange-600/20"];
              const medals = ["🥇", "🥈", "🥉"];
              const colorIdx = Math.min(podiumIdx, 2);
              const badges = getBadges(player, rank);
              return (
                <div key={player.id} className={`flex-1 flex flex-col items-center gap-1.5 ${isMe ? "ring-2 ring-green-500 rounded-xl p-1" : ""}`}>
                  <Avatar player={player} size={rank === 1 ? 52 : 40} />
                  <p className={`text-xs font-semibold text-center truncate w-full px-1 ${isMe ? "text-green-400" : "text-slate-300"}`}>
                    {firstName(player)}{isMe ? ` (${t.youLabel.toLowerCase()})` : ""}
                  </p>
                  {badges.length > 0 && (
                    <div className="flex gap-1 flex-wrap justify-center">
                      {badges.slice(0, 2).map((b) => (
                        <InlineBadge key={b.label} b={b} />
                      ))}
                    </div>
                  )}
                  <div className={`text-lg font-bold ${colors[colorIdx]}`}>{player.total_points} pts</div>
                  <div className={`w-full ${heights[colorIdx]} ${bgColors[colorIdx]} rounded-t-lg flex items-center justify-center text-2xl`}>
                    {medals[colorIdx]}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Full ranking table */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
          <span>#</span>
          <span>{t.colTeam}</span>
          <span className="text-center hidden sm:block" title={t.statTotalPredictions}>🎯</span>
          <span className="text-center hidden sm:block" title={t.statExactScores}>⭐</span>
          <span className="text-right font-bold">Pts</span>
        </div>

        {leaders.map((player, i) => {
          const isMe = player.id === currentUserId;
          const rank = ranks[i];
          const isTied = leaders.filter((_, j) => ranks[j] === rank).length > 1;
          const badges = getBadges(player, rank);
          return (
            <div key={player.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center border-b border-slate-700/40 last:border-0 ${
                isMe ? "bg-green-500/10 border-l-2 border-l-green-500" : ""
              } ${i === 0 ? "bg-yellow-500/5" : ""}`}
            >
              <span className={`text-sm font-bold w-8 text-center ${
                rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-300" : rank === 3 ? "text-orange-400" : "text-slate-600"
              }`}>{isTied ? t.rankTied(rank) : rank}</span>

              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar player={player} size={32} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-medium text-sm ${isMe ? "text-green-300" : "text-white"}`}>
                      {displayName(player)}{isMe ? ` ${t.youIndicator}` : ""}
                    </span>
                    {badges.map((b) => (
                      <span key={b.label} className="hidden sm:inline-flex">
                        <InlineBadge b={b} />
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PlayerTitle rank={rank} total={playersWithPreds} hasPredictions={Number(player.total_predictions) > 0} t={t} />
                    {Number(player.total_predictions) === 0 && (
                      <span className="text-xs text-slate-600">{t.noPredictions}</span>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-slate-400 text-sm text-center hidden sm:block">{player.total_predictions}</span>
              <span className="text-green-400 text-sm text-center hidden sm:block">{player.exact_scores}</span>
              <span className={`text-right font-bold text-lg ${isMe ? "text-green-300" : "text-white"}`}>
                {player.total_points}
              </span>
            </div>
          );
        })}

        {leaders.length === 0 && (
          <div className="text-center text-slate-500 py-12">{t.rankingNoData}</div>
        )}
      </div>

      {/* Stats */}
      {hasData && (
        <div className="space-y-3">
          <h2 className="text-slate-400 text-sm uppercase tracking-wide font-medium">{t.statsTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label={t.statTotalPredictions} value={totalPredictions} color="text-blue-400" />
            <StatCard label={t.statExactScores} value={totalExact} sub={t.statExactScoresSub} color="text-green-400" />
            <StatCard
              label={t.statExactKing}
              value={Number(bestExact?.exact_scores) > 0 ? firstName(bestExact) : "—"}
              sub={Number(bestExact?.exact_scores) > 0 ? t.exactHits(Number(bestExact.exact_scores)) : t.statNobodyYet}
              color="text-yellow-400"
            />
            {bestAccuracy ? (
              <StatCard
                label={t.roundMvpTitle}
                value={firstName(bestAccuracy)}
                sub={`${Math.round((Number(bestAccuracy.total_hits) / Number(bestAccuracy.total_predictions)) * 100)}% ${t.roundMvpDesc.toLowerCase()}`}
                color="text-orange-400"
              />
            ) : (
              <StatCard label={t.statMostDedicated}
                value={Number(mostPredictions?.total_predictions) > 0 ? firstName(mostPredictions) : "—"}
                sub={Number(mostPredictions?.total_predictions) > 0 ? t.predictions(Number(mostPredictions.total_predictions)) : t.statNobodyYet}
                color="text-purple-400"
              />
            )}
          </div>
        </div>
      )}

      {/* Achievement badges legend */}
      {(() => {
        const allBadges = [
          { emoji: "🏆", label: t.badgeLeader,    desc: t.badgeLeaderDesc,    color: "bg-yellow-500/20 text-yellow-300" },
          { emoji: "📊", label: t.badgeDedicated, desc: t.badgeDedicatedDesc, color: "bg-blue-500/20 text-blue-300" },
          { emoji: "🏮", label: t.badgeLantern,   desc: t.badgeLanternDesc,   color: "bg-red-500/20 text-red-400" },
          { emoji: "🧊", label: t.badgeGelo,      desc: t.badgeGeloDesc,      color: "bg-cyan-500/20 text-cyan-300" },
          { emoji: "⚡", label: t.badgeRelampago, desc: t.badgeRelampaoDesc,  color: "bg-yellow-500/20 text-yellow-200" },
          { emoji: "🦁", label: t.badgeCacador,   desc: t.badgeCacadorDesc,   color: "bg-amber-500/20 text-amber-300" },
        ];
        return (
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">{t.badgesPanelTitle}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {allBadges.map((b) => (
                <div key={b.label} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${b.color}`}>
                  <span className="text-xl shrink-0">{b.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{b.label}</p>
                    <p className="text-xs opacity-80">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tiered badges */}
      <TieredBadgesPanel />

      {/* Scoring system */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-5 text-sm">
        <p className="font-bold text-slate-200 uppercase tracking-wide text-xs">{t.scoringTitle}</p>

        {/* Base score cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { pts: 5,  label: t.scoringExact,  color: "text-green-400" },
            { pts: 3,  label: t.scoringDiff,   color: "text-blue-300" },
            { pts: 2,  label: t.scoringWinner, color: "text-purple-400" },
            { pts: 0,  label: t.scoringMiss,   color: "text-slate-500" },
          ].map(({ pts, label, color }) => (
            <div key={label} className="bg-slate-700/60 rounded-xl p-3 text-center space-y-1">
              <div className={`text-2xl font-bold ${color}`}>{pts}</div>
              <div className="text-slate-400 text-xs uppercase tracking-wide">pts</div>
              <div className="text-slate-300 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Penalty winner note */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
          <span className="text-yellow-400 font-bold text-lg shrink-0">2</span>
          <div>
            <div className="text-yellow-300 text-xs font-semibold">{t.scoringPenWinner}</div>
            <div className="text-slate-500 text-xs">{t.scoringPenWinnerPts}</div>
          </div>
        </div>

        {/* Multipliers */}
        <div className="space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">{t.scoringMultTitle}</p>
          <p className="text-slate-500 text-xs">{t.scoringMultDesc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: t.scoringMultFinal,   mult: 5, exact: 25, diff: 15, winner: 10 },
              { label: t.scoringMultSemi,    mult: 4, exact: 20, diff: 12, winner: 8  },
              { label: t.scoringMultQuartas, mult: 3, exact: 15, diff: 9,  winner: 6  },
              { label: t.scoringMultOitavas, mult: 2, exact: 10, diff: 6,  winner: 4  },
              { label: t.scoringMultGrupos,  mult: 1, exact: 5,  diff: 3,  winner: 2  },
            ].map(({ label, mult, exact, diff, winner }) => (
              <div key={label} className="bg-slate-700/40 border border-slate-700 rounded-xl p-3 flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-200 text-sm">{label}</div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <div className="flex justify-between gap-4"><span>{t.scoringExact}</span><span className="text-green-400 font-semibold">{exact} pts</span></div>
                    <div className="flex justify-between gap-4"><span>{t.scoringDiff}</span><span className="text-blue-300 font-semibold">{diff} pts</span></div>
                    <div className="flex justify-between gap-4"><span>{t.scoringWinner}</span><span className="text-purple-400 font-semibold">{winner} pts</span></div>
                  </div>
                </div>
                <span className="text-yellow-400 font-bold text-sm shrink-0">×{mult}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tiebreakers */}
        <div className="space-y-2 border-t border-slate-700 pt-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">{t.tiebreakerTitle}</p>
          {[t.tiebreaker1, t.tiebreaker2, t.tiebreaker3, t.tiebreaker4].map((text, i) => (
            <div key={i} className="flex items-center gap-3 text-xs text-slate-400">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Champion bonus */}
        <div className="flex items-center gap-2 border-t border-slate-700 pt-4">
          <Trophy size={14} className="text-yellow-400 shrink-0" />
          <span className="text-slate-400">{t.scoringChampion} —</span>
          <strong className="text-yellow-400">{t.scoringChampionPts}</strong>
        </div>
      </div>
    </div>
  );
}
