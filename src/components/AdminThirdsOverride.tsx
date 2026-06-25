"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { flagUrl, countryName } from "@/lib/matches";
import type { Standing } from "@/lib/bracket";

type Props = {
  allThirds: Standing[];        // computed ranking of all 12 thirds
  override: string[] | null;    // current saved override (8 team names) or null
};

export function AdminThirdsOverride({ allThirds, override }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Local state: ordered list of 8 team names
  const [ranking, setRanking] = useState<string[]>(
    override ?? allThirds.slice(0, 8).map(s => s.team)
  );

  async function save() {
    setSaving(true);
    await fetch("/api/admin/thirds-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranking }),
    });
    setSaving(false);
    router.refresh();
  }

  async function clear() {
    setSaving(true);
    await fetch("/api/admin/thirds-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranking: null }),
    });
    setRanking(allThirds.slice(0, 8).map(s => s.team));
    setSaving(false);
    router.refresh();
  }

  function setRank(pos: number, team: string) {
    const next = [...ranking];
    const existing = next.indexOf(team);
    if (existing !== -1 && existing !== pos) next[existing] = next[pos];
    next[pos] = team;
    setRanking(next);
  }

  const teamOptions = allThirds.map(s => s.team);

  if (allThirds.length === 0) {
    return <p className="text-slate-500 text-sm">Nenhum 3º colocado disponível ainda.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-xs">
        Use isto apenas se a FIFA publicar uma classificação dos 3ºs diferente do cálculo automático.
        Define a ordem dos 8 que avançam. Limpar volta ao automático.
      </p>

      {override && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <span className="text-yellow-400 text-xs font-medium">Override ativo — a classificação abaixo substitui o cálculo automático</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[0,1,2,3,4,5,6,7].map((pos) => {
          const teamName = ranking[pos] ?? "";
          const st = allThirds.find(s => s.team === teamName);
          return (
            <div key={pos} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
              <span className="text-slate-400 text-xs w-5 shrink-0">{pos + 1}º</span>
              {st && flagUrl(st.flag) && (
                <img src={flagUrl(st.flag)!} alt="" className="w-6 h-4 object-cover rounded-sm shrink-0" />
              )}
              <select
                value={teamName}
                onChange={(e) => setRank(pos, e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-500"
              >
                {teamOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {st && (
                <span className="text-slate-500 text-xs shrink-0 hidden sm:block">
                  {st.pts}pts {st.gd > 0 ? `+${st.gd}` : st.gd}gd
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? "Salvando..." : "Salvar override"}
        </button>
        {override && (
          <button
            onClick={clear}
            disabled={saving}
            className="bg-slate-600 hover:bg-slate-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            Limpar (voltar ao automático)
          </button>
        )}
      </div>
    </div>
  );
}
