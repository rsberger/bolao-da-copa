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
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
};

const STAGE_ORDER = ["Grupos", "Oitavas", "Quartas", "Semi", "Final"];

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

export function flagUrl(code: string | null): string | null {
  if (!code || code.length !== 2) return null;
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export function formatMatchDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function isPredictionLocked(match: Match): boolean {
  return new Date(match.match_date) <= new Date();
}
