"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";
import { X, LogIn, Mail, Eye, EyeOff } from "lucide-react";

type Mode = "signin" | "signup" | "done" | "reset_sent";

type Props = {
  onClose: () => void;
};

export function AuthModal({ onClose }: Props) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, name } },
      });
      if (err) {
        setError(err.message.includes("already") ? t.authErrorEmailExists : t.authError);
      } else {
        setMode("done");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(t.authErrorEmail);
      } else {
        onClose();
      }
    }
    setLoading(false);
  }

  async function sendReset() {
    if (!email) { setError(t.authEmail + " ?"); return; }
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback`,
    });
    setMode("reset_sent");
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>

        {/* Done state */}
        {mode === "done" || mode === "reset_sent" ? (
          <div className="text-center space-y-3 py-4">
            <div className="text-4xl">📧</div>
            <h2 className="text-xl font-bold text-white">
              {mode === "done" ? t.authCheckEmail : t.authResetSent}
            </h2>
            <p className="text-slate-400 text-sm">
              {mode === "done" ? t.authCheckEmailDesc : t.authResetSent}
            </p>
            <button onClick={onClose} className="mt-2 text-slate-500 hover:text-white text-sm transition-colors">
              {t.signOut /* "Fechar" / "Close" */} ✕
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-white">
                {mode === "signin" ? t.authSignIn : t.authSignUp}
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">{t.appTagline.split("!")[0]}</p>
            </div>

            {/* Google */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
              </svg>
              {t.authContinueGoogle}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs uppercase tracking-wider">{t.authOrDivider}</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Email form */}
            <form onSubmit={submitEmail} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t.authName}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.authNamePlaceholder}
                    required
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 placeholder:text-slate-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.authEmail}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.authPassword}</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? t.authPasswordMin : "••••••"}
                    required
                    minLength={6}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-green-500 placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                <LogIn size={15} />
                {loading ? "..." : mode === "signin" ? t.authSignIn : t.authSignUp}
              </button>
            </form>

            {/* Toggle sign in / sign up */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                className="hover:text-white transition-colors"
              >
                {mode === "signin" ? t.authNoAccount : t.authAlreadyHave}
              </button>
              {mode === "signin" && (
                <button
                  onClick={sendReset}
                  disabled={loading}
                  className="flex items-center gap-1 hover:text-white transition-colors disabled:opacity-50"
                >
                  <Mail size={11} /> {t.authForgotPassword}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
