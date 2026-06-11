"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useT } from "@/lib/i18n/context";

type Props = {
  lastSyncAt: string | null;
};

export function AdminSyncButton({ lastSyncAt }: Props) {
  const t = useT();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ updated: number; synced_at: string } | null>(null);
  const [error, setError] = useState("");

  async function handleSync() {
    setSyncing(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  const displayDate = result?.synced_at ?? lastSyncAt;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? t.adminSyncing : t.adminSyncButton}
        </button>

        {displayDate && (
          <p className="text-slate-400 text-sm">
            {t.adminLastSync}:{" "}
            <span className="text-slate-200">
              {new Date(displayDate).toLocaleString(undefined, {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
                timeZoneName: "short",
              })}
            </span>
          </p>
        )}

        {!displayDate && !result && (
          <p className="text-slate-500 text-sm">{t.adminNoSync}</p>
        )}
      </div>

      {result && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle size={15} />
          {t.adminSyncSuccess(result.updated)}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}
    </div>
  );
}
