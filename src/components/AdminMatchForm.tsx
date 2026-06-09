"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const STAGES = ["Grupos", "Oitavas", "Quartas", "Semi", "Final"];
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function AdminMatchForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    home_team: "",
    away_team: "",
    home_flag: "",
    away_flag: "",
    match_date: "",
    stage: "Grupos",
    group_name: "A",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      ...form,
      group_name: form.stage === "Grupos" ? form.group_name : null,
    };

    const { error: err } = await supabase.from("matches").insert(payload);
    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      setForm({ home_team: "", away_team: "", home_flag: "", away_flag: "", match_date: "", stage: "Grupos", group_name: "A" });
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Time da casa</label>
        <input required value={form.home_team} onChange={(e) => set("home_team", e.target.value)}
          className="input" placeholder="Brasil" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Bandeira (ISO 2 letras)</label>
        <input value={form.home_flag} onChange={(e) => set("home_flag", e.target.value.toUpperCase())}
          maxLength={2} className="input" placeholder="BR" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Time visitante</label>
        <input required value={form.away_team} onChange={(e) => set("away_team", e.target.value)}
          className="input" placeholder="Argentina" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Bandeira visitante (ISO)</label>
        <input value={form.away_flag} onChange={(e) => set("away_flag", e.target.value.toUpperCase())}
          maxLength={2} className="input" placeholder="AR" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Data e hora</label>
        <input required type="datetime-local" value={form.match_date}
          onChange={(e) => set("match_date", e.target.value)} className="input" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Fase</label>
        <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className="input">
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {form.stage === "Grupos" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Grupo</label>
          <select value={form.group_name} onChange={(e) => set("group_name", e.target.value)} className="input">
            {GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      )}

      {error && <p className="sm:col-span-2 text-red-400 text-sm">{error}</p>}

      <div className="sm:col-span-2">
        <button type="submit" disabled={saving}
          className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? "Salvando..." : "Adicionar jogo"}
        </button>
      </div>

      <style jsx>{`
        .input {
          background: rgb(51 65 85);
          border: 1px solid rgb(71 85 105);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          color: white;
          outline: none;
          width: 100%;
        }
        .input:focus {
          border-color: rgb(34 197 94);
        }
      `}</style>
    </form>
  );
}
