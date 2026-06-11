"use client";

import { useState, useMemo, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { savePredictionAction } from "@/app/actions";
import { MatchCard } from "@/components/MatchCard";
import { flagUrl, formatMatchDate, STAGE_ORDER, LOCALE_MAP, parseMatchDate } from "@/lib/matches";
import { useT } from "@/lib/i18n/context";
import type { Match, Prediction } from "@/lib/matches";
import { LayoutGrid, Globe, Clock, ListOrdered, AlignJustify } from "lucide-react";
import { translateTeamName, countryName } from "@/lib/matches";
import { useLocale } from "@/lib/i18n/context";

type View = "grupo" | "pais" | "data" | "rodada";

function MatchRow({ match, prediction: initialPrediction, userId }: { match: Match; prediction: Prediction | null; userId: string | null }) {
  const t = useT();
  const locale = useLocale();
  const [prediction, setPrediction] = useState(initialPrediction);
  const [home, setHome] = useState(String(initialPrediction?.home_score ?? ""));
  const [away, setAway] = useState(String(initialPrediction?.away_score ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(() => parseMatchDate(match.match_date) <= new Date());

  useEffect(() => {
    setPrediction(initialPrediction);
    setHome(String(initialPrediction?.home_score ?? ""));
    setAway(String(initialPrediction?.away_score ?? ""));
  }, [initialPrediction?.id, initialPrediction?.home_score, initialPrediction?.away_score]);

  useEffect(() => {
    if (locked) return;
    const ms = parseMatchDate(match.match_date).getTime() - Date.now();
    if (ms <= 0) { setLocked(true); return; }
    const MAX_TIMEOUT = 2_147_483_647;
    if (ms > MAX_TIMEOUT) return;
    const timer = setTimeout(() => setLocked(true), ms);
    return () => clearTimeout(timer);
  }, [match.match_date, locked]);

  const canPredict = !!userId && !locked;
  const hasPred = prediction !== null;

  async function save() {
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
    "Grupos": t.stageGrupos, "Trinta e dois": t.stageTrintaDois,
    "Oitavas": t.stageOitavas, "Quartas": t.stageQuartas,
    "Semi": t.stageSemi, "Terceiro": t.stageTerceiro, "Final": t.stageFinal,
  };
  const stageLabel = stageMap[match.stage] ?? match.stage;
  const homeTeam = match.home_flag
    ? (countryName(match.home_flag, locale) ?? match.home_team)
    : translateTeamName(match.home_team, t);
  const awayTeam = match.away_flag
    ? (countryName(match.away_flag, locale) ?? match.away_team)
    : translateTeamName(match.away_team, t);
  const leftBorderColor = match.is_finished ? "border-l-green-600" : (hasPred || saved) ? "border-l-blue-500" : "border-l-pink-500";

  return (
    <div className={`flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border-l-4 ${leftBorderColor}`}>
      {/* Home */}
      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
        <span className="text-white text-xs font-medium truncate text-right hidden sm:block">{homeTeam}</span>
        {flagUrl(match.home_flag)
          ? <img src={flagUrl(match.home_flag)!} alt={homeTeam} className="w-6 h-4 object-cover rounded-sm shrink-0" />
          : <span className="text-sm shrink-0">🏳️</span>}
      </div>

      {/* Centre: result or prediction inputs */}
      <div className="shrink-0 flex items-center gap-1 justify-center">
        {match.is_finished ? (
          <span className="font-bold text-white text-sm tabular-nums w-14 text-center">
            {match.home_score}–{match.away_score}
          </span>
        ) : canPredict ? (
          <>
            <input
              type="number" min={0} max={20} value={home}
              onChange={(e) => { setHome(e.target.value); setSaved(false); }}
              className="w-9 text-center text-sm font-bold rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-green-500 py-0.5"
            />
            <span className="text-slate-500 text-xs">–</span>
            <input
              type="number" min={0} max={20} value={away}
              onChange={(e) => { setAway(e.target.value); setSaved(false); }}
              className="w-9 text-center text-sm font-bold rounded bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-green-500 py-0.5"
            />
          </>
        ) : hasPred ? (
          <span className="text-blue-400 text-sm tabular-nums font-mono w-14 text-center">
            {prediction.home_score}–{prediction.away_score}
          </span>
        ) : (
          <span className="text-slate-600 text-sm w-14 text-center">?–?</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {flagUrl(match.away_flag)
          ? <img src={flagUrl(match.away_flag)!} alt={awayTeam} className="w-6 h-4 object-cover rounded-sm shrink-0" />
          : <span className="text-sm shrink-0">🏳️</span>}
        <span className="text-white text-xs font-medium truncate hidden sm:block">{awayTeam}</span>
      </div>

      {/* Action / meta */}
      <div className="shrink-0 flex items-center gap-1.5 ml-1">
        <span className="text-slate-600 text-xs hidden md:block truncate max-w-[100px]">
          {stageLabel}{match.group_name ? ` · ${t.group} ${match.group_name}` : ""}
        </span>
        {canPredict && (
          <button
            onClick={save}
            disabled={saving || home === "" || away === ""}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white whitespace-nowrap"
          >
            {saved ? <><CheckCircle size={12} /> {t.saved}</> : saving ? t.saving : t.savePrediction}
          </button>
        )}
        {!canPredict && match.is_finished && prediction && prediction.points > 0 && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${prediction.points >= 5 ? "bg-green-600" : "bg-blue-600"} text-white`}>
            +{prediction.points}
          </span>
        )}
      </div>
    </div>
  );
}

type Props = {
  matches: Match[];
  predictionMap: Record<string, Prediction>;
  userId: string | null;
};

export function MatchesView({ matches, predictionMap, userId }: Props) {
  const t = useT();
  const locale = useLocale();
  const [view, setView] = useState<View>("grupo");
  const [compact, setCompact] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  function stageLabel(stage: string): string {
    const map: Record<string, string> = {
      "Trinta e dois": t.stageTrintaDois,
      "Oitavas":       t.stageOitavas,
      "Quartas":       t.stageQuartas,
      "Semi":          t.stageSemi,
      "Terceiro":      t.stageTerceiro,
      "Final":         t.stageFinal,
    };
    return map[stage] ?? stage;
  }

  const byGroup = useMemo(() => {
    // Group stage: one section per group (A, B, ...)
    const groupMap = new Map<string, Match[]>();
    // Knockout stages: one section per stage in order
    const knockoutMap = new Map<string, Match[]>();
    for (const m of matches) {
      if (m.stage === "Grupos" && m.group_name) {
        const key = `${t.group} ${m.group_name}`;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(m);
      } else if (m.stage !== "Grupos") {
        const key = stageLabel(m.stage);
        if (!knockoutMap.has(key)) knockoutMap.set(key, []);
        knockoutMap.get(key)!.push(m);
      }
    }
    const groups = Array.from(groupMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    const knockouts = STAGE_ORDER
      .filter((s) => s !== "Grupos")
      .map((s) => [stageLabel(s), knockoutMap.get(stageLabel(s)) ?? []] as [string, Match[]])
      .filter(([, ms]) => ms.length > 0);
    return [...groups, ...knockouts];
  }, [matches, t]);

  // key = ISO code, value = { displayName, flag, matches }
  const countries = useMemo(() => {
    const map = new Map<string, { displayName: string; flag: string; matches: Match[] }>();
    for (const m of matches) {
      for (const [, flag] of [[m.home_team, m.home_flag], [m.away_team, m.away_flag]] as [string, string | null][]) {
        if (!flag) continue;
        if (!map.has(flag)) {
          const name = countryName(flag, locale) ?? flag;
          map.set(flag, { displayName: name, flag, matches: [] });
        }
        map.get(flag)!.matches.push(m);
      }
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => a.displayName.localeCompare(b.displayName));
  }, [matches, locale]);

  const countryMatches = useMemo(() => {
    if (!selectedCountry) return [];
    return countries.find(([iso]) => iso === selectedCountry)?.[1].matches ?? [];
  }, [selectedCountry, countries]);

  const byDate = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) => parseMatchDate(a.match_date).getTime() - parseMatchDate(b.match_date).getTime()
    );
    const map = new Map<string, Match[]>();
    for (const m of sorted) {
      const day = parseMatchDate(m.match_date).toLocaleDateString(LOCALE_MAP[locale] ?? "pt-BR", {
        weekday: "long", day: "2-digit", month: "long",
      });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    }
    return Array.from(map.entries());
  }, [matches]);

  const byRound = useMemo(() => {
    // Group stage rounds 1-3
    const groupMatches = new Map<string, Match[]>();
    for (const m of matches) {
      if (m.stage !== "Grupos" || !m.group_name) continue;
      if (!groupMatches.has(m.group_name)) groupMatches.set(m.group_name, []);
      groupMatches.get(m.group_name)!.push(m);
    }
    const groupRounds: Match[][] = [[], [], []];
    for (const groupMs of groupMatches.values()) {
      const sorted = [...groupMs].sort((a, b) => parseMatchDate(a.match_date).getTime() - parseMatchDate(b.match_date).getTime());
      sorted.forEach((m, i) => { groupRounds[i < 2 ? 0 : i < 4 ? 1 : 2].push(m); });
    }
    for (const r of groupRounds) r.sort((a, b) => parseMatchDate(a.match_date).getTime() - parseMatchDate(b.match_date).getTime());

    // Knockout rounds in stage order
    const knockoutStages = STAGE_ORDER.filter((s) => s !== "Grupos");
    const knockoutRounds: { label: string; matches: Match[] }[] = knockoutStages.map((s) => ({
      label: stageLabel(s),
      matches: matches.filter((m) => m.stage === s).sort((a, b) => parseMatchDate(a.match_date).getTime() - parseMatchDate(b.match_date).getTime()),
    })).filter((r) => r.matches.length > 0);

    return { groupRounds, knockoutRounds };
  }, [matches]);

  const tabs: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "grupo",  label: t.viewByGroup,   icon: <LayoutGrid size={15} /> },
    { key: "pais",   label: t.viewByCountry, icon: <Globe size={15} /> },
    { key: "data",   label: t.viewByDate,    icon: <Clock size={15} /> },
    { key: "rodada", label: t.viewByRound,   icon: <ListOrdered size={15} /> },
  ];

  function renderMatches(ms: Match[]) {
    if (compact) {
      return (
        <div className="flex flex-col gap-1">
          {ms.map((m) => (
            <MatchRow key={m.id} match={m} prediction={predictionMap[m.id] ?? null} userId={userId} />
          ))}
        </div>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {ms.map((m) => (
          <MatchCard key={m.id} match={m} prediction={predictionMap[m.id] ?? null} userId={userId} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-800 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setView(tab.key); setSelectedCountry(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === tab.key
                  ? "bg-green-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCompact((c) => !c)}
          title={t.viewCompact}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
            compact
              ? "bg-slate-700 border-slate-500 text-white"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
          }`}
        >
          <AlignJustify size={15} /> {t.viewCompact}
        </button>
      </div>

      {view === "grupo" && (
        <div className="space-y-8">
          {byGroup.map(([label, groupMatches]) => (
            <section key={label}>
              <h2 className="text-lg font-semibold text-slate-300 mb-3 border-b border-slate-700 pb-2">{label}</h2>
              {renderMatches(groupMatches)}
            </section>
          ))}
        </div>
      )}

      {view === "pais" && (
        <div className="space-y-6">
          {!selectedCountry ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {countries.map(([iso, { displayName, flag }]) => (
                <button
                  key={iso}
                  onClick={() => setSelectedCountry(iso)}
                  className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 rounded-xl px-4 py-3 transition-colors text-left"
                >
                  <img src={flagUrl(flag)!} alt={displayName} className="w-8 h-6 object-cover rounded shrink-0" />
                  <span className="text-white text-sm font-medium truncate">{displayName}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedCountry(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                {t.backToCountries}
              </button>
              {(() => {
                const entry = countries.find(([iso]) => iso === selectedCountry);
                return (
                  <div className="flex items-center gap-3 mb-2">
                    <img src={flagUrl(selectedCountry)!} alt={entry?.[1].displayName} className="w-10 h-7 object-cover rounded shadow" />
                    <h2 className="text-xl font-bold text-white">{entry?.[1].displayName}</h2>
                  </div>
                );
              })()}
              {renderMatches(countryMatches)}
            </div>
          )}
        </div>
      )}

      {view === "rodada" && (
        <div className="space-y-8">
          {byRound.groupRounds.map((roundMatches, i) => roundMatches.length === 0 ? null : (
            <section key={i}>
              <h2 className="text-lg font-semibold text-slate-300 mb-3 border-b border-slate-700 pb-2">
                {t.round} {i + 1}
                <span className="ml-2 text-sm font-normal text-slate-500" suppressHydrationWarning>
                  {parseMatchDate(roundMatches[0].match_date).toLocaleDateString(LOCALE_MAP[locale] ?? "pt-BR", { day: "2-digit", month: "2-digit" })}
                  {roundMatches.length > 1 && " – " + parseMatchDate(roundMatches[roundMatches.length - 1].match_date).toLocaleDateString(LOCALE_MAP[locale] ?? "pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </h2>
              {renderMatches(roundMatches)}
            </section>
          ))}
          {byRound.knockoutRounds.map(({ label, matches: km }) => (
            <section key={label}>
              <h2 className="text-lg font-semibold text-slate-300 mb-3 border-b border-slate-700 pb-2">
                {label}
                <span className="ml-2 text-sm font-normal text-slate-500" suppressHydrationWarning>
                  {parseMatchDate(km[0].match_date).toLocaleDateString(LOCALE_MAP[locale] ?? "pt-BR", { day: "2-digit", month: "2-digit" })}
                  {km.length > 1 && " – " + parseMatchDate(km[km.length - 1].match_date).toLocaleDateString(LOCALE_MAP[locale] ?? "pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </h2>
              {renderMatches(km)}
            </section>
          ))}
        </div>
      )}

      {view === "data" && (
        <div className="space-y-8">
          {byDate.map(([day, dayMatches]) => (
            <section key={day}>
              <h2 className="text-lg font-semibold text-slate-300 mb-3 border-b border-slate-700 pb-2 capitalize">{day}</h2>
              {renderMatches(dayMatches)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
