"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Match } from "@/lib/matches";
import { flagUrl } from "@/lib/matches";

type Props = { matches: Match[] };

export function AdminResultForm({ matches }: Props) {
  const router = useRouter();
  const [matchId, setMatchId] = useState(() => matches.filter((m) => !m.is_finished)[0]?.id ?? "");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [penaltyWinner, setPenaltyWinner] = useState<"home" | "away" | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const unfinished = matches.filter((m) => !m.is_finished);
  const selectedMatch = unfinished.find((m) => m.id === matchId);
  const isKnockout = selectedMatch?.stage !== "Grupos";
  const isDraw = home !== "" && away !== "" && parseInt(home) === parseInt(away);
  const needsPenalty = isKnockout && isDraw;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch) return;
    const penLabel = needsPenalty && penaltyWinner
      ? ` (pen. ${penaltyWinner === "home" ? selectedMatch.home_team : selectedMatch.away_team})`
      : "";
    const confirmed = window.confirm(
      `Confirmar resultado:\n${selectedMatch.home_team} ${home} × ${away} ${selectedMatch.away_team}${penLabel}`
    );
    if (!confirmed) return;
    if (needsPenalty && !penaltyWinner) { setError("Selecione quem venceu nos pênaltis."); return; }
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/admin/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore: parseInt(home), awayScore: parseInt(away), penaltyWinner: needsPenalty ? penaltyWinner || null : null }),
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
          {unfinished.map((m) => {
            const d = new Date(m.match_date);
            const label = d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            return (
              <option key={m.id} value={m.id}>
                {label} — {m.home_team} × {m.away_team}
              </option>
            );
          })}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          required type="number" min={0} value={home}
          onChange={(e) => { setHome(e.target.value); setPenaltyWinner(""); }}
          placeholder="0"
          className="w-16 text-center text-xl font-bold bg-slate-700 border border-slate-600 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
        />
        <span className="text-slate-400 font-bold text-xl">×</span>
        <input
          required type="number" min={0} value={away}
          onChange={(e) => { setAway(e.target.value); setPenaltyWinner(""); }}
          placeholder="0"
          className="w-16 text-center text-xl font-bold bg-slate-700 border border-slate-600 rounded-lg p-2 text-white focus:outline-none focus:border-green-500"
        />
      </div>

      {needsPenalty && selectedMatch && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-yellow-400 font-medium">Vencedor nos pênaltis</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPenaltyWinner("home")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${penaltyWinner === "home" ? "bg-green-600 border-green-500 text-white" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"}`}>
              {selectedMatch.home_team}
            </button>
            <button type="button" onClick={() => setPenaltyWinner("away")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${penaltyWinner === "away" ? "bg-green-600 border-green-500 text-white" : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400"}`}>
              {selectedMatch.away_team}
            </button>
          </div>
        </div>
      )}

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
