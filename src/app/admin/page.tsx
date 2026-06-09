import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminMatchForm } from "@/components/AdminMatchForm";
import { AdminResultForm } from "@/components/AdminResultForm";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Painel Admin</h1>

      <section className="bg-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Adicionar jogo</h2>
        <AdminMatchForm />
      </section>

      <section className="bg-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Lançar resultado</h2>
        {matches && matches.length > 0 ? (
          <AdminResultForm matches={matches} />
        ) : (
          <p className="text-slate-500">Nenhum jogo cadastrado.</p>
        )}
      </section>
    </div>
  );
}
