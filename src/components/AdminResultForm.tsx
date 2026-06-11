"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Match } from "@/lib/matches";
import { flagUrl } from "@/lib/matches";

type Props = { matches: Match[] };

export function AdminResultForm({ matches }: Props) {
  const router = useRouter();
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const unfinished = matches.filter((m) => !m.is_finished);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/admin/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore: parseInt(home), awayScore: parseInt(away) }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro desconhecido");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess("Resultado salvo e pontos calculados!");
    setHome("");
    setAway("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Jogo</label>
        <select
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
        >
          {unfinished.map((m) => (
            <option key={m.id} value={m.id}>
              {m.home_team} × {m.away_team}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          required type="number" min={0} value={home}
          onChange={(e) => setHome(e.target.value)}
          placeholder="0"
          className="w-16 text-center text-xl font-bold bg-slate-700 border border-slate-600 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
        />
        <span className="text-slate-400 font-bold text-xl">×</span>
        <input
          required type="number" min={0} value={away}
          onChange={(e) => setAway(e.target.value)}
          placeholder="0"
          className="w-16 text-center text-xl font-bold bg-slate-700 border border-slate-600 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}
      {unfinished.length === 0 && <p className="text-slate-500 text-sm">Todos os jogos já têm resultado.</p>}

      <button
        type="submit"
        disabled={saving || unfinished.length === 0}
        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50 transition-colors w-fit"
      >
        {saving ? "Salvando..." : "Salvar resultado"}
      </button>
    </form>
  );
}
