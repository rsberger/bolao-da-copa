"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, CheckCircle, AlertCircle, SkipForward, RefreshCw, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { ImportResult } from "@/app/api/predictions/import/route";

type Summary = { saved: number; updated: number; skipped: number; errors: number };

export function BatchPredictions({ userId }: { userId: string | null }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fileError, setFileError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!userId) return null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileError("");
    setResults(null);
    setSummary(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/predictions/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setFileError(data.error ?? "Erro desconhecido"); return; }
      setResults(data.results);
      setSummary(data.summary);
      router.refresh();
    } catch {
      setFileError("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function reset() {
    setResults(null);
    setSummary(null);
    setFileError("");
  }

  const statusIcon = (s: ImportResult["status"]) => {
    if (s === "saved")   return <CheckCircle size={14} className="text-green-400 shrink-0" />;
    if (s === "updated") return <RefreshCw   size={14} className="text-blue-400  shrink-0" />;
    if (s === "skipped") return <SkipForward size={14} className="text-slate-400 shrink-0" />;
    return <AlertCircle size={14} className="text-red-400 shrink-0" />;
  };

  const statusLabel: Record<ImportResult["status"], string> = {
    saved:   t.batchStatusSaved,
    updated: t.batchStatusUpdated,
    skipped: t.batchStatusSkipped,
    error:   t.batchStatusError,
  };

  const statusColor: Record<ImportResult["status"], string> = {
    saved:   "text-green-400",
    updated: "text-blue-400",
    skipped: "text-slate-400",
    error:   "text-red-400",
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Upload size={15} /> {t.batchButton}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">{t.batchTitle}</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  {t.batchStep1}
                </div>
                <p className="text-slate-400 text-sm ml-8">{t.batchStep1Desc}</p>
                <div className="ml-8">
                  <a
                    href="/api/predictions/template"
                    download
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download size={15} /> {t.batchDownload}
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  {t.batchStep2}
                </div>
                <ul className="ml-8 text-slate-400 text-sm space-y-0.5 list-disc list-inside">
                  <li>{t.batchStep2Li1} <strong className="text-slate-300">Home Goals</strong> / <strong className="text-slate-300">Away Goals</strong></li>
                  <li>{t.batchStep2Li2}</li>
                  <li>{t.batchStep2Li3}</li>
                  <li>{t.batchStep2Li4}</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  {t.batchStep3}
                </div>
                <div className="ml-8">
                  {!results ? (
                    <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      uploading ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}>
                      <Upload size={15} />
                      {uploading ? t.batchUploading : t.batchUpload}
                      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                  ) : (
                    <button onClick={reset} className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                      <RefreshCw size={14} /> {t.batchUploadAnother}
                    </button>
                  )}

                  {fileError && (
                    <p className="mt-2 text-red-400 text-sm flex items-center gap-1">
                      <AlertCircle size={13} /> {fileError}
                    </p>
                  )}
                </div>
              </div>

              {/* Results */}
              {summary && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {summary.saved   > 0 && <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">{t.batchSaved(summary.saved)}</span>}
                    {summary.updated > 0 && <span className="px-3 py-1 rounded-full bg-blue-500/20  text-blue-400  text-sm font-medium">{t.batchUpdated(summary.updated)}</span>}
                    {summary.skipped > 0 && <span className="px-3 py-1 rounded-full bg-slate-600/40  text-slate-400 text-sm font-medium">{t.batchSkipped(summary.skipped)}</span>}
                    {summary.errors  > 0 && <span className="px-3 py-1 rounded-full bg-red-500/20   text-red-400   text-sm font-medium">{t.batchErrors(summary.errors)}</span>}
                  </div>

                  {results && results.length > 0 && (
                    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-4 py-2 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
                        <span>Home</span>
                        <span>Away</span>
                        <span className="text-center">Score</span>
                        <span className="text-right">Status</span>
                      </div>
                      {results.map((r, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-4 py-2.5 items-center border-b border-slate-800 last:border-0 text-sm">
                          <span className="text-slate-300 truncate">{r.home_team}</span>
                          <span className="text-slate-300 truncate">{r.away_team}</span>
                          <span className="text-slate-400 text-center tabular-nums">
                            {r.home_score !== undefined ? `${r.home_score} × ${r.away_score}` : "—"}
                          </span>
                          <div className="flex items-center justify-end gap-1">
                            {statusIcon(r.status)}
                            <span className={`text-xs font-medium ${statusColor[r.status]}`}>{statusLabel[r.status]}</span>
                            {r.reason && <span className="text-slate-500 text-xs ml-1" title={r.reason}>ⓘ</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {results?.length === 0 && (
                    <p className="text-slate-500 text-sm">{t.batchNoRows}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
