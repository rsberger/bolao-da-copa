"use client";

import { useState, useEffect } from "react";
import { flagUrl, formatMatchDate, isPredictionLocked, translateTeamName, countryName, parseMatchDate } from "@/lib/matches";
import { savePredictionAction } from "@/app/actions";
import { useT, useLocale } from "@/lib/i18n/context";
import type { Match, Prediction } from "@/lib/matches";
import { Lock, CheckCircle, Clock } from "lucide-react";

type Props = {
  match: Match;
  prediction: Prediction | null;
  userId: string | null;
};

export function MatchCard({ match, prediction: initialPrediction, userId }: Props) {
  const t = useT();
  const locale = useLocale();
  const [prediction, setPrediction] = useState(initialPrediction);
  const [home, setHome] = useState(String(initialPrediction?.home_score ?? ""));
  const [away, setAway] = useState(String(initialPrediction?.away_score ?? ""));

  useEffect(() => {
    setPrediction(initialPrediction);
    setHome(String(initialPrediction?.home_score ?? ""));
    setAway(String(initialPrediction?.away_score ?? ""));
  }, [initialPrediction?.id, initialPrediction?.home_score, initialPrediction?.away_score]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [locked, setLocked] = useState(() => isPredictionLocked(match));

  useEffect(() => {
    if (locked) return;
    const ms = parseMatchDate(match.match_date).getTime() - Date.now();
    if (ms <= 0) { setLocked(true); return; }
    // setTimeout max is ~24.8 days; skip timer for far-future matches
    const MAX_TIMEOUT = 2_147_483_647;
    if (ms > MAX_TIMEOUT) return;
    const timer = setTimeout(() => setLocked(true), ms);
    return () => clearTimeout(timer);
  }, [match.match_date, locked]);

  const canPredict = !!userId && !locked;

  async function savePrediction() {
    if (!userId || home === "" || away === "") return;
    setSaving(true);
    const { predictionId, error } = await savePredictionAction(match.id, parseInt(home), parseInt(away));
    if (!error && predictionId && !prediction) {
      setPrediction({ id: predictionId, user_id: userId, match_id: match.id, home_score: parseInt(home), away_score: parseInt(away), points: 0 });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const stageMap: Record<string, string> = {
    "Grupos":        t.stageGrupos,
    "Trinta e dois": t.stageTrintaDois,
    "Oitavas":       t.stageOitavas,
    "Quartas":       t.stageQuartas,
    "Semi":          t.stageSemi,
    "Terceiro":      t.stageTerceiro,
    "Final":         t.stageFinal,
  };
  const stageLabel = stageMap[match.stage] ?? match.stage;
  const homeTeam = match.home_flag
    ? (countryName(match.home_flag, locale) ?? match.home_team)
    : translateTeamName(match.home_team, t);
  const awayTeam = match.away_flag
    ? (countryName(match.away_flag, locale) ?? match.away_team)
    : translateTeamName(match.away_team, t);

  const resultLabel = match.is_finished
    ? `${match.home_score} × ${match.away_score}`
    : null;

  const pointsBadge = match.is_finished && prediction
    ? prediction.points > 0
      ? { label: `+${prediction.points}`, color: prediction.points >= 5 ? "bg-green-600" : "bg-blue-600" }
      : { label: "0", color: "bg-slate-600" }
    : null;

  return (
    <div className={`bg-slate-800 rounded-xl p-4 flex flex-col gap-3 border ${
      match.is_finished ? "border-slate-700" : "border-slate-700 hover:border-slate-500 transition-colors"
    }`}>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1" suppressHydrationWarning>
          <Clock size={11} />
          <span suppressHydrationWarning>{formatMatchDate(match.match_date, locale)}</span>
        </span>
        <span>{stageLabel}{match.group_name ? ` · ${t.group} ${match.group_name}` : ""}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center">
          <div className="flex justify-center mb-1">
            {flagUrl(match.home_flag)
              ? <img src={flagUrl(match.home_flag)!} alt={match.home_team} className="w-10 h-7 object-cover rounded shadow" />
              : <span className="text-2xl">🏳️</span>}
          </div>
          <div className="font-semibold text-white text-sm mt-1">{homeTeam}</div>
        </div>

        <div className="text-center shrink-0">
          {resultLabel ? (
            <div className="text-2xl font-bold text-white tabular-nums">{resultLabel}</div>
          ) : (
            <div className="text-slate-600 font-bold text-xl">×</div>
          )}
          {pointsBadge && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pointsBadge.color}`}>
              {pointsBadge.label}
            </span>
          )}
        </div>

        <div className="flex-1 text-center">
          <div className="flex justify-center mb-1">
            {flagUrl(match.away_flag)
              ? <img src={flagUrl(match.away_flag)!} alt={match.away_team} className="w-10 h-7 object-cover rounded shadow" />
              : <span className="text-2xl">🏳️</span>}
          </div>
          <div className="font-semibold text-white text-sm mt-1">{awayTeam}</div>
        </div>
      </div>

      {userId && (
        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500 mb-2 text-center">
            {locked ? t.yourPrediction : t.yourPredictionOpen}
          </p>
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              min={0}
              max={20}
              value={home}
              onChange={(e) => setHome(e.target.value)}
              disabled={!canPredict}
              className="w-14 text-center text-lg font-bold rounded-lg p-2 bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-green-500 disabled:opacity-50"
            />
            <span className="text-slate-400 font-bold">×</span>
            <input
              type="number"
              min={0}
              max={20}
              value={away}
              onChange={(e) => setAway(e.target.value)}
              disabled={!canPredict}
              className="w-14 text-center text-lg font-bold rounded-lg p-2 bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-green-500 disabled:opacity-50"
            />
          </div>

          {canPredict && (
            <button
              onClick={savePrediction}
              disabled={saving || home === "" || away === ""}
              className="mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white flex items-center justify-center gap-2"
            >
              {saved ? (
                <><CheckCircle size={14} /> {t.saved}</>
              ) : saving ? (
                t.saving
              ) : (
                t.savePrediction
              )}
            </button>
          )}

          {locked && !match.is_finished && (
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
              <Lock size={11} /> {t.predictionsClosed}
            </div>
          )}
        </div>
      )}

      {!userId && !match.is_finished && (
        <p className="text-xs text-slate-600 text-center border-t border-slate-700 pt-3">
          {t.loginToPredict}
        </p>
      )}
    </div>
  );
}
