import type { Match } from "./matches";

// FIFA/Coca-Cola Men's World Ranking — June 11, 2026 (last update before the tournament).
// Keyed by the Portuguese team name used in the DB. Lower rank = better.
// Used as the final tiebreaker when all other criteria are equal.
const FIFA_RANK: Record<string, number> = {
  "França":              1,
  "Espanha":             2,
  "Argentina":           3,
  "Inglaterra":          4,
  "Portugal":            5,
  "Brasil":              6,
  "Marrocos":            7,
  "Holanda":             8,
  "Bélgica":             9,
  "Alemanha":            10,
  "Croácia":             11,
  "Colômbia":            13,
  "Senegal":             14,
  "México":              15,
  "Estados Unidos":      16,
  "Uruguai":             17,
  "Japão":               18,
  "Suíça":               19,
  "Irã":                 20,
  "Turquia":             22,
  "Equador":             23,
  "Áustria":             24,
  "Coreia do Sul":       25,
  "Austrália":           27,
  "Argélia":             28,
  "Egito":               29,
  "Canadá":              30,
  "Noruega":             31,
  "Costa do Marfim":     33,
  "Panamá":              34,
  "Suécia":              38,
  "Tchéquia":            40,
  "Paraguai":            41,
  "Escócia":             42,
  "Tunísia":             45,
  "Rep. Dem. Congo":     46,
  "Uzbequistão":         50,
  "Qatar":               56,
  "Iraque":              57,
  "África do Sul":       60,
  "Arábia Saudita":      61,
  "Jordânia":            63,
  "Bósnia-Herzegovina":  64,
  "Cabo Verde":          67,
  "Gana":                73,
  "Curaçao":             82,
  "Haiti":               83,
  "Nova Zelândia":       85,
};

function fifaRank(team: string): number {
  return FIFA_RANK[team] ?? 999;
}

export type Standing = {
  team: string;
  flag: string | null;
  pts: number;
  gd: number;
  gf: number;
  ga: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  group: string;
};

export type GroupStandings = Record<string, Standing[]>;

export type ResolvedTeam = { name: string; flag: string | null };

export type BracketMatch = Match & {
  jNum: number; // 73-104
  home_r: ResolvedTeam;
  away_r: ResolvedTeam;
};

// Compute head-to-head stats among a subset of teams using only the matches between them.
function h2hStats(
  teams: Standing[],
  groupMatches: Match[]
): Map<string, { pts: number; gd: number; gf: number }> {
  const teamSet = new Set(teams.map(t => t.team));
  const stats = new Map<string, { pts: number; gd: number; gf: number }>(
    teams.map(t => [t.team, { pts: 0, gd: 0, gf: 0 }])
  );
  for (const m of groupMatches) {
    if (!m.is_finished || m.home_score === null || m.away_score === null) continue;
    if (!teamSet.has(m.home_team) || !teamSet.has(m.away_team)) continue;
    const h = stats.get(m.home_team)!;
    const a = stats.get(m.away_team)!;
    h.gf += m.home_score; h.gd += m.home_score - m.away_score;
    a.gf += m.away_score; a.gd += m.away_score - m.home_score;
    if (m.home_score > m.away_score) { h.pts += 3; }
    else if (m.away_score > m.home_score) { a.pts += 3; }
    else { h.pts++; a.pts++; }
  }
  return stats;
}

// Step 2: overall gd → gf → FIFA rank (applied when h2h can't separate)
function applyStep2(teams: Standing[]): Standing[] {
  return [...teams].sort(
    (a, b) => b.gd - a.gd || b.gf - a.gf || fifaRank(a.team) - fifaRank(b.team)
  );
}

// Sort a group of teams that are already equal on overall points,
// applying FIFA tiebreaker rules recursively.
//
// Step 1 (applied to the full tied bucket, then recursed on sub-buckets):
//   h2h pts → h2h gd → h2h gf
// If a sub-group is still fully tied after step 1, move to step 2.
// If step 1 separates some teams, recurse on the remaining tied sub-groups
// (re-computing h2h with only those teams, per FIFA rules).
function resolveTied(teams: Standing[], groupMatches: Match[]): Standing[] {
  if (teams.length <= 1) return teams;

  const h2h = h2hStats(teams, groupMatches);

  const sorted = [...teams].sort((a, b) => {
    const ha = h2h.get(a.team)!;
    const hb = h2h.get(b.team)!;
    return hb.pts - ha.pts || hb.gd - ha.gd || hb.gf - ha.gf;
  });

  const result: Standing[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    const ha = h2h.get(sorted[i].team)!;
    while (j < sorted.length) {
      const hb = h2h.get(sorted[j].team)!;
      if (hb.pts !== ha.pts || hb.gd !== ha.gd || hb.gf !== ha.gf) break;
      j++;
    }
    const bucket = sorted.slice(i, j);
    if (bucket.length > 1) {
      if (bucket.length === teams.length) {
        // All teams still tied on every h2h criterion — move to step 2
        result.push(...applyStep2(bucket));
      } else {
        // Some teams broke away; recurse on this sub-group with fresh h2h
        result.push(...resolveTied(bucket, groupMatches));
      }
    } else {
      result.push(...bucket);
    }
    i = j;
  }
  return result;
}

export function calcGroupStandings(matches: Match[]): GroupStandings {
  const groups: Record<string, Map<string, Standing>> = {};
  const groupMatches: Record<string, Match[]> = {};

  for (const m of matches) {
    if (m.stage !== "Grupos" || !m.group_name) continue;
    const g = m.group_name;
    if (!groups[g]) { groups[g] = new Map(); groupMatches[g] = []; }
    const map = groups[g];
    if (!map.has(m.home_team)) map.set(m.home_team, { team: m.home_team, flag: m.home_flag, pts: 0, gd: 0, gf: 0, ga: 0, played: 0, won: 0, drawn: 0, lost: 0, group: g });
    if (!map.has(m.away_team)) map.set(m.away_team, { team: m.away_team, flag: m.away_flag, pts: 0, gd: 0, gf: 0, ga: 0, played: 0, won: 0, drawn: 0, lost: 0, group: g });
    groupMatches[g].push(m);

    if (!m.is_finished || m.home_score === null || m.away_score === null) continue;
    const home = map.get(m.home_team)!;
    const away = map.get(m.away_team)!;
    home.played++; away.played++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;
    if (m.home_score > m.away_score) { home.pts += 3; home.won++; away.lost++; }
    else if (m.away_score > m.home_score) { away.pts += 3; away.won++; home.lost++; }
    else { home.pts++; home.drawn++; away.pts++; away.drawn++; }
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;
  }

  const result: GroupStandings = {};
  for (const [g, map] of Object.entries(groups)) {
    const teams = Array.from(map.values());
    const gm = groupMatches[g];

    // First sort by overall pts; then resolve ties within each equal-pts bucket
    teams.sort((a, b) => b.pts - a.pts);

    const sorted: Standing[] = [];
    let i = 0;
    while (i < teams.length) {
      let j = i + 1;
      while (j < teams.length && teams[j].pts === teams[i].pts) j++;
      const bucket = teams.slice(i, j);
      sorted.push(...(bucket.length > 1 ? resolveTied(bucket, gm) : bucket));
      i = j;
    }
    result[g] = sorted;
  }
  return result;
}

export function calcBest3rds(standings: GroupStandings): Standing[] {
  const thirds: Standing[] = [];
  for (const st of Object.values(standings)) {
    if (st.length >= 3) thirds.push(st[2]);
  }
  // Best 8 thirds: pts → overall GD → overall GF → alpha (no h2h, different groups)
  return thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || fifaRank(a.team) - fifaRank(b.team));
}

function getWinner(m: Match): ResolvedTeam | null {
  if (!m.is_finished || m.home_score === null || m.away_score === null) return null;
  if (m.home_score > m.away_score) return { name: m.home_team, flag: m.home_flag };
  if (m.away_score > m.home_score) return { name: m.away_team, flag: m.away_flag };
  return null;
}

function getLoser(m: Match): ResolvedTeam | null {
  const w = getWinner(m);
  if (!w) return null;
  return w.name === m.home_team
    ? { name: m.away_team, flag: m.away_flag }
    : { name: m.home_team, flag: m.home_flag };
}

// Manual overrides: keyed by group letter, value is [1st, 2nd, 3rd, 4th] team names.
// When set, these take precedence over computed standings for that group.
export type GroupOverrides = Record<string, string[]>;

// Exported so sync.ts can resolve placeholder team names for knockout matches.
export function buildResolver(allMatches: Match[], overrides: GroupOverrides = {}, thirdsOverride: string[] | null = null): (placeholder: string) => ResolvedTeam {
  const byDate = (a: Match, b: Match) =>
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime();

  const r32raw = allMatches.filter(m => m.stage === "Trinta e dois").sort(byDate);
  const r16raw = allMatches.filter(m => m.stage === "Oitavas").sort(byDate);
  const qfraw  = allMatches.filter(m => m.stage === "Quartas").sort(byDate);
  const sfraw  = allMatches.filter(m => m.stage === "Semi").sort(byDate);

  // FIFA 2026 assigns game numbers by bracket position, not by match date.
  // Mapping: FIFA game# → date-sort index among the 16 R32 matches.
  const R32_FIFA_TO_IDX: Record<number, number> = {
    73:0, 74:2, 75:3, 76:1, 77:5, 78:4, 79:6, 80:7,
    81:9, 82:8, 83:11, 84:10, 85:12, 86:14, 87:15, 88:13,
  };
  // R16: M90 is played earlier (07/04 14:00) than M89 (07/04 18:00)
  // but FIFA bracket numbering puts M89 on top (left side, first).
  const R16_FIFA_TO_IDX: Record<number, number> = {
    89:1, 90:0, 91:2, 92:3, 93:4, 94:5, 95:6, 96:7,
  };
  // Unified map of ALL knockout round FIFA game# → Match, so that
  // "Vencedor J89", "Vencedor J97", etc. placeholders resolve correctly.
  const jMap = new Map<number, Match>([
    ...Object.entries(R32_FIFA_TO_IDX).map(([k, v]) => [parseInt(k), r32raw[v]] as [number, Match]),
    ...Object.entries(R16_FIFA_TO_IDX).map(([k, v]) => [parseInt(k), r16raw[v]] as [number, Match]),
    ...qfraw.map((m, i) => [97 + i, m] as [number, Match]),
    ...sfraw.map((m, i) => [101 + i, m] as [number, Match]),
  ]);
  const r32map = new Map<number, Match>(
    Object.entries(R32_FIFA_TO_IDX).map(([fifa, idx]) => [parseInt(fifa), r32raw[idx]])
  );
  const r16map = new Map<number, Match>(
    Object.entries(R16_FIFA_TO_IDX).map(([fifa, idx]) => [parseInt(fifa), r16raw[idx]])
  );
  const qfmap  = new Map(qfraw.map((m, i)  => [97 + i, m]));
  const sfmap  = new Map(sfraw.map((m, i)  => [101 + i, m]));

  const standings = calcGroupStandings(allMatches);
  const best3rds  = calcBest3rds(standings);

  const groupMatchCount: Record<string, number> = {};
  const groupFinishedCount: Record<string, number> = {};
  for (const m of allMatches) {
    if (m.stage !== "Grupos" || !m.group_name) continue;
    groupMatchCount[m.group_name] = (groupMatchCount[m.group_name] ?? 0) + 1;
    if (m.is_finished) groupFinishedCount[m.group_name] = (groupFinishedCount[m.group_name] ?? 0) + 1;
  }
  const isGroupDecided = (g: string) => (groupFinishedCount[g] ?? 0) >= 6;

  // Pre-compute "Melhor 3º" slot assignments once across all knockout matches.
  // Without this, each slot resolves independently and the same team can appear
  // in multiple slots when their group is in several allowed sets.
  const thirdsSlotAssignments = new Map<string, ResolvedTeam>();
  if (Object.keys(groupMatchCount).every(g => isGroupDecided(g))) {
    const thirdsRanked = thirdsOverride && thirdsOverride.length >= 8
      ? thirdsOverride
          .map(name => best3rds.find(s => s.team === name))
          .filter((s): s is Standing => s !== undefined)
      : best3rds.slice(0, 8);

    // Collect all unique "Melhor 3º (XXXX)" placeholder strings from knockout matches
    const koTeams = allMatches
      .filter(m => m.stage !== "Grupos")
      .flatMap(m => [m.home_team, m.away_team]);
    const thirdSlots = [...new Set(koTeams.filter(t => /^Melhor 3º \([A-L]+\)$/.test(t)))];

    // Greedy assignment: for each slot in occurrence order, assign the
    // highest-ranked still-available third whose group is in the allowed set.
    const usedGroups = new Set<string>();
    for (const slot of thirdSlots) {
      const am = slot.match(/\(([A-L]+)\)/);
      if (!am) continue;
      const allowed = new Set(am[1].split(""));
      const team = thirdsRanked.find(s => allowed.has(s.group) && !usedGroups.has(s.group));
      if (team) {
        thirdsSlotAssignments.set(slot, { name: team.team, flag: team.flag });
        usedGroups.add(team.group);
      }
    }
  }

  // Helper: get the Standing for a group+rank, checking overrides first
  function getGroupTeam(g: string, rank: number): ResolvedTeam | null {
    if (overrides[g] && overrides[g][rank] !== undefined) {
      const name = overrides[g][rank];
      // Find the flag from standings
      const st = standings[g];
      const entry = st?.find(s => s.team === name);
      return { name, flag: entry?.flag ?? null };
    }
    if (isGroupDecided(g)) {
      const st = standings[g];
      if (st?.[rank]) return { name: st[rank].team, flag: st[rank].flag };
    }
    return null;
  }

  return function resolve(placeholder: string): ResolvedTeam {
    let m = placeholder.match(/^([12])º Grupo ([A-L])$/);
    if (m) {
      const rank = parseInt(m[1]) - 1;
      const g = m[2];
      const team = getGroupTeam(g, rank);
      return team ?? { name: placeholder, flag: null };
    }

    m = placeholder.match(/^Melhor 3º \(([A-L]+)\)$/);
    if (m) {
      const pre = thirdsSlotAssignments.get(placeholder);
      if (pre) return pre;
      return { name: placeholder, flag: null };
    }

    m = placeholder.match(/^Vencedor J(\d+)$/);
    if (m) {
      const match = jMap.get(parseInt(m[1]));
      if (!match) return { name: placeholder, flag: null };
      const w = getWinner(match);
      return w ?? { name: placeholder, flag: null };
    }

    m = placeholder.match(/^Vencedor R16-(\d+)$/);
    if (m) {
      const match = r16map.get(88 + parseInt(m[1]));
      if (!match) return { name: placeholder, flag: null };
      const w = getWinner(match);
      return w ?? { name: placeholder, flag: null };
    }

    m = placeholder.match(/^Vencedor QF-(\d+)$/);
    if (m) {
      const match = qfmap.get(96 + parseInt(m[1]));
      if (!match) return { name: placeholder, flag: null };
      const w = getWinner(match);
      return w ?? { name: placeholder, flag: null };
    }

    m = placeholder.match(/^(Vencedor|Perdedor) SF-(\d+)$/);
    if (m) {
      const match = sfmap.get(100 + parseInt(m[2]));
      if (!match) return { name: placeholder, flag: null };
      const fn = m[1] === "Vencedor" ? getWinner : getLoser;
      const r = fn(match);
      return r ?? { name: placeholder, flag: null };
    }

    // Not a placeholder — look up flag from computed standings
    for (const st of Object.values(standings)) {
      const found = st.find(s => s.team === placeholder);
      if (found) return { name: placeholder, flag: found.flag };
    }
    return { name: placeholder, flag: null };
  };
}

export function buildBracket(allMatches: Match[], overrides: GroupOverrides = {}, thirdsOverride: string[] | null = null): {
  r32: BracketMatch[];
  r16: BracketMatch[];
  qf: BracketMatch[];
  sf: BracketMatch[];
  third: BracketMatch | null;
  final: BracketMatch | null;
} {
  const byDate = (a: Match, b: Match) =>
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime();

  const r32raw = allMatches.filter(m => m.stage === "Trinta e dois").sort(byDate);
  const r16raw = allMatches.filter(m => m.stage === "Oitavas").sort(byDate);
  const qfraw  = allMatches.filter(m => m.stage === "Quartas").sort(byDate);
  const sfraw  = allMatches.filter(m => m.stage === "Semi").sort(byDate);
  const thirdraw = allMatches.find(m => m.stage === "Terceiro") ?? null;
  const finalraw = allMatches.find(m => m.stage === "Final") ?? null;

  const resolve = buildResolver(allMatches, overrides, thirdsOverride);

  function enrich(m: Match, jNum: number): BracketMatch {
    return {
      ...m,
      jNum,
      home_r: resolve(m.home_team),
      away_r: resolve(m.away_team),
    };
  }

  return {
    // FIFA game numbers by date-sort index
    r32: r32raw.map((m, i) => enrich(m, [73,76,74,75,78,77,79,80,82,81,84,83,85,88,86,87][i] ?? (73+i))),
    r16: r16raw.map((m, i) => enrich(m, [90,89,91,92,93,94,95,96][i] ?? (89+i))),
    qf:  qfraw.map((m, i)  => enrich(m, 97 + i)),
    sf:  sfraw.map((m, i)  => enrich(m, 101 + i)),
    third: thirdraw ? enrich(thirdraw, 103) : null,
    final: finalraw ? enrich(finalraw, 104) : null,
  };
}

// Bracket tree structure for 2026 (hardcoded per FIFA format)
// Left half: SF-1 (J101) ← QF-1 (J97) ← R16-1,2 (J89,J90) ← R32 J73,J75,J74,J77
//                        ← QF-2 (J98) ← R16-5,6 (J93,J94) ← R32 J83,J84,J81,J82
// Right half: SF-2 (J102) ← QF-3 (J99) ← R16-3,4 (J91,J92) ← R32 J76,J78,J79,J80
//                          ← QF-4 (J100) ← R16-7,8 (J95,J96) ← R32 J86,J88,J85,J87

export type BracketHalf = {
  sf: BracketMatch | null;
  qf: [BracketMatch | null, BracketMatch | null];
  r16: [BracketMatch | null, BracketMatch | null, BracketMatch | null, BracketMatch | null];
  // R32 in visual order (top-to-bottom): 4 pairs of 2
  r32: [
    BracketMatch | null, BracketMatch | null, // → r16[0]
    BracketMatch | null, BracketMatch | null, // → r16[1]
    BracketMatch | null, BracketMatch | null, // → r16[2]
    BracketMatch | null, BracketMatch | null, // → r16[3]
  ];
};

export function getBracketHalves(b: ReturnType<typeof buildBracket>): {
  left: BracketHalf;
  right: BracketHalf;
} {
  const r32 = b.r32; // indices 0-15 = J73-J88
  const r16 = b.r16; // indices 0-7  = J89-J96
  const qf  = b.qf;  // indices 0-3  = J97-J100
  const sf  = b.sf;  // indices 0-1  = J101-J102

  const g = (arr: BracketMatch[], i: number) => arr[i] ?? null;

  return {
    left: {
      sf: g(sf, 0),
      qf: [g(qf, 0), g(qf, 1)],
      // R16 visual order (top→bottom): M89(idx1), M90(idx0), M93(idx4), M94(idx5)
      r16: [g(r16, 1), g(r16, 0), g(r16, 4), g(r16, 5)],
      r32: [
        g(r32, 2), g(r32, 5), // M74, M77 → M89
        g(r32, 0), g(r32, 3), // M73, M75 → M90
        g(r32, 11), g(r32, 10), // M83, M84 → M93
        g(r32, 9), g(r32, 8), // M81, M82 → M94
      ],
    },
    right: {
      sf: g(sf, 1),
      qf: [g(qf, 2), g(qf, 3)],
      // R16 visual order (top→bottom): M91(idx2), M92(idx3), M95(idx6), M96(idx7)
      r16: [g(r16, 2), g(r16, 3), g(r16, 6), g(r16, 7)],
      r32: [
        g(r32, 1), g(r32, 4), // M76, M78 → M91
        g(r32, 6), g(r32, 7), // M79, M80 → M92
        g(r32, 14), g(r32, 13), // M86, M88 → M95
        g(r32, 12), g(r32, 15), // M85, M87 → M96
      ],
    },
  };
}
