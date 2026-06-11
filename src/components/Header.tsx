"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/context";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, Calendar, BarChart3, Shield, ListOrdered, Trophy } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { AuthModal } from "@/components/AuthModal";

type OnlineUser = { user_id: string; name: string; avatar_url: string | null };

export function Header({ locale }: { locale: string }) {
  const t = useT();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", data.user.id)
          .single()
          .then(({ data: p }) => setIsAdmin(p?.is_admin ?? false));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Presence tracking
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase.channel("online-users");

    const syncPresence = () => {
      const state = channel.presenceState<OnlineUser>();
      const users = Object.values(state).flat();
      // Deduplicate by user_id (multiple tabs)
      const seen = new Set<string>();
      setOnlineUsers(users.filter((u) => seen.has(u.user_id) ? false : seen.add(u.user_id)));
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name: user.user_metadata?.name ?? user.email ?? "?",
            avatar_url: user.user_metadata?.avatar_url ?? null,
          });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg">
          ⚽ <span className="hidden sm:inline">{t.appName}</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <Link href="/jogos" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-sm">
            <Calendar size={15} /> {t.navMatches}
          </Link>
          <Link href="/resultados" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-sm">
            <ListOrdered size={15} /> {t.navResults}
          </Link>
          <Link href="/placar" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-sm">
            <BarChart3 size={15} /> {t.navRanking}
          </Link>
          <Link href="/chaveamento" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-sm">
            <Trophy size={15} /> {t.navBracket}
          </Link>
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-sm">
              <Shield size={15} /> {t.navAdmin}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher current={locale} />
          {/* Online presence indicator */}
          {onlineUsers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 group relative">
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 4).map((u) => (
                  <div key={u.user_id} className="w-6 h-6 rounded-full ring-2 ring-slate-800 overflow-hidden bg-slate-600 flex items-center justify-center shrink-0">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                      : <span className="text-white text-xs font-bold">{u.name[0].toUpperCase()}</span>}
                  </div>
                ))}
              </div>
              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                {onlineUsers.length === 1 ? t.onlineOne : t.onlineMany(onlineUsers.length)}
              </span>
              {/* Tooltip */}
              <div className="absolute top-full right-0 mt-2 bg-slate-700 border border-slate-600 rounded-xl p-3 shadow-xl hidden group-hover:block min-w-max z-50">
                <div className="space-y-2">
                  {onlineUsers.map((u) => (
                    <div key={u.user_id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-600 flex items-center justify-center shrink-0">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                          : <span className="text-white text-xs font-bold">{u.name[0].toUpperCase()}</span>}
                      </div>
                      <span className={`${u.user_id === user?.id ? "text-green-300 font-semibold" : "text-slate-200"}`}>
                        {u.name.split(" ")[0]}{u.user_id === user?.id ? " (você)" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              {user.user_metadata?.avatar_url && (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-slate-300 hidden sm:inline">
                {user.user_metadata?.name ?? user.email}
              </span>
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title={t.signOut}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <LogIn size={15} />
              <span>{t.signIn}</span>
            </button>
          )}
          {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

          <button
            className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="space-y-1">
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
              <span className="block w-5 h-0.5 bg-current" />
            </div>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden bg-slate-800 border-t border-slate-700 px-4 py-2 flex flex-col gap-1">
          <Link href="/jogos" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">
            <Calendar size={15} /> {t.navMatches}
          </Link>
          <Link href="/resultados" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">
            <ListOrdered size={15} /> {t.navResults}
          </Link>
          <Link href="/placar" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">
            <BarChart3 size={15} /> {t.navRanking}
          </Link>
          <Link href="/chaveamento" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">
            <Trophy size={15} /> {t.navBracket}
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700">
              <Shield size={15} /> {t.navAdmin}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
