"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupStandings } from "@/lib/bracket";

type Props = {
  standings: GroupStandings;
  overrides: Record<string, string[]>;
};

export function AdminGroupOverrides({ standings, overrides }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Record<string, string[]>>(overrides);

  const groups = Object.keys(standings).sort();

  async function save(group: string) {
    setSaving(group);
    const ranking = localOverrides[group] ?? null;
    await fetch("/api/admin/group-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, ranking }),
    });
    setSaving(null);
    router.refresh();
  }

  async function clear(group: string) {
    setSaving(group);
    await fetch("/api/admin/group-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group, ranking: null }),
    });
    const next = { ...localOverrides };
    delete next[group];
    setLocalOverrides(next);
    setSaving(null);
    router.refresh();
  }

  function setRank(group: string, rank: number, team: string) {
    const current = localOverrides[group] ?? standings[group]?.map(s => s.team) ?? [];
    const next = [...current];
    // Swap if team is already in another position
    const existingIdx = next.indexOf(team);
    if (existingIdx !== -1 && existingIdx !== rank) {
      next[existingIdx] = next[rank] ?? "";
    }
    next[rank] = team;
    setLocalOverrides({ ...localOverrides, [group]: next });
  }

  if (groups.length === 0) return <p className="text-slate-500 text-sm">Nenhum grupo disponível ainda.</p>;

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-xs">
        Use isto apenas se a classificação oficial da FIFA diferir do cálculo automático (ex: desempate por sorteio ou fair play).
        Limpar o override volta ao cálculo automático.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          const computed = standings[group] ?? [];
          const current = localOverrides[group] ?? computed.map(s => s.team);
          const hasOverride = !!overrides[group];

          return (
            <div key={group} className={`rounded-xl p-4 space-y-2 ${hasOverride ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-slate-700/50"}`}>
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold text-sm">Grupo {group}</span>
                {hasOverride && <span className="text-yellow-400 text-xs font-medium">override ativo</span>}
              </div>

              {[0, 1, 2, 3].map((rank) => (
                <div key={rank} className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs w-4">{rank + 1}º</span>
                  <select
                    value={current[rank] ?? ""}
                    onChange={(e) => setRank(group, rank, e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-500"
                  >
                    {computed.map((s) => (
                      <option key={s.team} value={s.team}>{s.team}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => save(group)}
                  disabled={saving === group}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
                >
                  {saving === group ? "Salvando..." : "Salvar override"}
                </button>
                {hasOverride && (
                  <button
                    onClick={() => clear(group)}
                    disabled={saving === group}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
