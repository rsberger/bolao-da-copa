"use client";

import { useState } from "react";
import { Trophy, CheckCircle, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { flagUrl, countryName } from "@/lib/matches";
import { useT, useLocale } from "@/lib/i18n/context";

type Team = { name: string; flag: string | null };
type ChampionPrediction = { user_id: string; team: string; team_flag: string | null; name: string | null; avatar_url: string | null };

type Props = {
  userId: string | null;
  myName: string | null;
  myAvatar: string | null;
  teams: Team[];
  myPick: { team: string; team_flag: string | null } | null;
  allPicks: ChampionPrediction[];
  locked: boolean;
};

export function ChampionPicker({ userId, myName, myAvatar, teams, myPick: initialPick, allPicks, locked }: Props) {
  const t = useT();
  const locale = useLocale();
  const teamLabel = (flag: string | null, name: string) => (flag ? (countryName(flag, locale) ?? name) : name);
  const [pick, setPick] = useState(initialPick);
  const [selected, setSelected] = useState(initialPick?.team ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [picks, setPicks] = useState(allPicks);

  async function save() {
    if (!userId || !selected || locked) return;
    setSaving(true);
    setSaveError("");
    const found = teams.find((tm) => tm.name === selected);
    const supabase = createClient();
    const payload = { user_id: userId, team: selected, team_flag: found?.flag ?? null };
    const { error } = await supabase
      .from("champion_predictions")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    const newPick = { team: selected, team_flag: found?.flag ?? null };
    setPick(newPick);
    // Optimistically update the picks list shown below
    setPicks((prev) => [
      ...prev.filter((p) => p.user_id !== userId),
      { user_id: userId!, team: selected, team_flag: found?.flag ?? null, name: myName, avatar_url: myAvatar },
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Group picks by team for display
  const byTeam = new Map<string, ChampionPrediction[]>();
  for (const p of picks) {
    if (!byTeam.has(p.team)) byTeam.set(p.team, []);
    byTeam.get(p.team)!.push(p);
  }
  const teamGroups = Array.from(byTeam.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="bg-slate-800 border border-yellow-500/30 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700">
        <h2 className="text-white font-bold text-base">{t.championTitle}</h2>
        <p className="text-slate-400 text-xs mt-0.5">{t.championDesc}</p>
      </div>

      <div className="px-5 py-4 flex gap-6">
        {/* Left: my pick */}
        <div className="flex-1 min-w-0 space-y-2">
          {userId && (
            <>
              <p className="text-slate-400 text-xs uppercase tracking-wide">{t.championYourPick}</p>
              {locked ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Lock size={13} />
                  {pick ? (
                    <div className="flex items-center gap-2">
                      {flagUrl(pick.team_flag) && <img src={flagUrl(pick.team_flag)!} alt={pick.team} className="w-7 h-5 object-cover rounded-sm" />}
                      <span className="text-white font-semibold">{teamLabel(pick.team_flag, pick.team)}</span>
                    </div>
                  ) : (
                    <span>{t.championLocked}</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {selected && (() => { const f = teams.find((tm) => tm.name === selected)?.flag ?? null; return flagUrl(f) ? <img src={flagUrl(f)!} alt={selected} className="w-6 h-4 object-cover rounded-sm shrink-0" /> : null; })()}
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                      className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-yellow-500"
                    >
                      <option value="" className="bg-slate-700">{t.championSelect}</option>
                      {teams
                        .map((team) => ({ ...team, label: teamLabel(team.flag, team.name) }))
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .map((team) => (
                          <option key={team.name} value={team.name} className="bg-slate-700">{team.label}</option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={save}
                    disabled={!selected || saving}
                    className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 text-sm font-bold px-4 py-1.5 rounded-lg transition-colors"
                  >
                    {saved ? <><CheckCircle size={13} /> {t.championSaved}</> :
                     saving ? t.championSaving :
                     pick ? t.championChange : t.championPick}
                  </button>
                </div>
              )}
              {saveError && (
                <p className="text-red-400 text-xs mt-1">{saveError}</p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
