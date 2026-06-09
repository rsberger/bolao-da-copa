"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { flagUrl, formatMatchDate, isPredictionLocked } from "@/lib/matches";
import type { Match, Prediction } from "@/lib/matches";
import { Lock, CheckCircle, Clock } from "lucide-react";

type Props = {
  match: Match;
  prediction: Prediction | null;
  userId: string | null;
};

export function MatchCard({ match, prediction: initialPrediction, userId }: Props) {
  const [prediction, setPrediction] = useState(initialPrediction);
  const [home, setHome] = useState(String(initialPrediction?.home_score ?? ""));
  const [away, setAway] = useState(String(initialPrediction?.away_score ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const locked = isPredictionLocked(match);
  const canPredict = !!userId && !locked;

  async function savePrediction() {
    if (!userId || home === "" || away === "") return;
    setSaving(true);

    const supabase = createClient();
    const payload = {
      user_id: userId,
      match_id: match.id,
      home_score: parseInt(home),
      away_score: parseInt(away),
    };

    if (prediction) {
      await supabase.from("predictions").update(payload).eq("id", prediction.id);
    } else {
      const { data } = await supabase.from("predictions").insert(payload).select().single();
      if (data) setPrediction(data);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const resultLabel = match.is_finished
    ? `${match.home_score} × ${match.away_score}`
    : null;

  const pointsBadge = match.is_finished && prediction
    ? prediction.points === 10
      ? { label: "+10", color: "bg-green-600" }
      : prediction.points === 5
      ? { label: "+5", color: "bg-blue-600" }
      : { label: "0", color: "bg-slate-600" }
    : null;

  return (
    <div className={`bg-slate-800 rounded-xl p-4 flex flex-col gap-3 border ${
      match.is_finished ? "border-slate-700" : "border-slate-700 hover:border-slate-500 transition-colors"
    }`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {formatMatchDate(match.match_date)}
        </span>
        <span>{match.stage}{match.group_name ? ` · Grupo ${match.group_name}` : ""}</span>
      </div>

      {/* Times e placar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-center">
          <div className="flex justify-center mb-1">
            {flagUrl(match.home_flag)
              ? <img src={flagUrl(match.home_flag)!} alt={match.home_team} className="w-10 h-7 object-cover rounded shadow" />
              : <span className="text-2xl">🏳️</span>}
          </div>
          <div className="font-semibold text-white text-sm mt-1">{match.home_team}</div>
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
          <div className="font-semibold text-white text-sm mt-1">{match.away_team}</div>
        </div>
      </div>

      {/* Palpite */}
      {userId && (
        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500 mb-2 text-center">
            {locked ? "Seu palpite" : "Seu palpite (antes do apito)"}
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
                <><CheckCircle size={14} /> Salvo!</>
              ) : saving ? (
                "Salvando..."
              ) : (
                "Salvar palpite"
              )}
            </button>
          )}

          {locked && !match.is_finished && (
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
              <Lock size={11} /> Palpites encerrados
            </div>
          )}
        </div>
      )}

      {!userId && !match.is_finished && (
        <p className="text-xs text-slate-600 text-center border-t border-slate-700 pt-3">
          Faça login para apostar
        </p>
      )}
    </div>
  );
}
