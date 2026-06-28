export type Match = {
  id: string;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  match_date: string;
  stage: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  penalty_winner: 'home' | 'away' | null;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
};

export const STAGE_ORDER = [
  "Grupos", "Trinta e dois", "Oitavas", "Quartas", "Semi", "Terceiro", "Final",
];

export const STAGE_LABELS: Record<string, string> = {
  "Trinta e dois": "Décima-sextas de Final",
  "Oitavas":       "Oitavas de Final",
  "Quartas":       "Quartas de Final",
  "Semi":          "Semifinais",
  "Terceiro":      "Terceiro Lugar",
  "Final":         "Final",
};

export const STAGE_MULT: Record<string, number> = {
  "Grupos":        1,
  "Trinta e dois": 2,
  "Oitavas":       2,
  "Quartas":       3,
  "Semi":          4,
  "Terceiro":      4,
  "Final":         5,
};

export function groupMatchesByStage(matches: Match[]): Record<string, Match[]> {
  const grouped: Record<string, Match[]> = {};

  for (const match of matches) {
    const label =
      match.stage === "Grupos" && match.group_name
        ? `Grupo ${match.group_name}`
        : match.stage;
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(match);
  }

  // Ordena as chaves seguindo a ordem das fases
  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => {
      const stageA = STAGE_ORDER.findIndex((s) => a.startsWith(s));
      const stageB = STAGE_ORDER.findIndex((s) => b.startsWith(s));
      if (stageA !== stageB) return stageA - stageB;
      return a.localeCompare(b);
    })
  );
}

// Subdivision codes that Intl.DisplayNames can't resolve — map manually.
const SUBDIVISION_NAMES: Record<string, Record<string, string>> = {
  "gb-eng": { pt: "Inglaterra", en: "England", nl: "Engeland" },
  "gb-sct": { pt: "Escócia",    en: "Scotland", nl: "Schotland" },
  "gb-wls": { pt: "País de Gales", en: "Wales", nl: "Wales" },
};

export function countryName(isoCode: string | null, locale: string): string | null {
  if (!isoCode) return null;
  const sub = SUBDIVISION_NAMES[isoCode.toLowerCase()];
  if (sub) return sub[locale] ?? sub["en"] ?? null;
  if (isoCode.length !== 2) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(isoCode.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

export function flagUrl(code: string | null): string | null {
  if (!code) return null;
  // Accept both 2-letter ISO codes and subdivision codes like "gb-eng", "gb-sct"
  if (code.length !== 2 && !/^[a-z]{2}-[a-z]{2,3}$/i.test(code)) return null;
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export const LOCALE_MAP: Record<string, string> = { pt: "pt-BR", en: "en-US", nl: "nl-NL" };

/** Supabase returns timestamps without 'Z'; append it so JS treats them as UTC. */
export function parseMatchDate(dateStr: string): Date {
  // Normalise: replace space separator with T
  const s = dateStr.replace(" ", "T");
  // Already has timezone info (Z, +HH:MM, +HH, -HH:MM, -HH)
  if (/Z|[+-]\d{2}(:\d{2})?$/.test(s)) return new Date(s);
  // No timezone — treat as UTC
  return new Date(s + "Z");
}

export function formatMatchDate(dateStr: string, locale = "pt"): string {
  return (
    parseMatchDate(dateStr).toLocaleString(LOCALE_MAP[locale] ?? "pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: locale === "en",
      timeZone: "America/Sao_Paulo",
    }) + " GMT-3"
  );
}

type TeamNameT = {
  teamWinner: string; teamLoser: string;
  teamOrdinal: (n: string) => string;
  group: string;
  stageTrintaDois: string; stageOitavas: string;
  stageQuartas: string; stageSemi: string;
};

/** Translates Portuguese placeholder team names (stored in DB) to the current locale. */
export function translateTeamName(name: string, t: TeamNameT): string {
  if (!name) return name;
  const stageMap: Record<string, string> = {
    "R32":     t.stageTrintaDois,
    "Oitavas": t.stageOitavas,
    "Quartas": t.stageQuartas,
    "Semi":    t.stageSemi,
  };
  // "Vencedor Semi (1)" / "Perdedor Semi (1)"
  let out = name.replace(
    /^(Vencedor|Perdedor) (R32|Oitavas|Quartas|Semi) \((\d+)\)$/,
    (_, type, stage, n) =>
      `${type === "Vencedor" ? t.teamWinner : t.teamLoser} ${stageMap[stage] ?? stage} (${n})`
  );
  // "1º Grupo A"
  out = out.replace(/^(\d+)º Grupo ([A-Z])$/, (_, n, g) => `${t.teamOrdinal(n)} ${t.group} ${g}`);
  return out;
}

export function isPredictionLocked(match: Match): boolean {
  return parseMatchDate(match.match_date) <= new Date();
}
