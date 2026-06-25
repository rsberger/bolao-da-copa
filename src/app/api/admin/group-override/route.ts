import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { group, ranking } = await req.json();
  // ranking: string[] of 4 team names in order, or null to clear
  if (!group || !/^[A-L]$/.test(group)) return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });

  const admin = createAdminClient();

  if (!ranking || ranking.length === 0) {
    await admin.from("group_overrides").delete().eq("group_name", group);
  } else {
    await admin.from("group_overrides").upsert({ group_name: group, ranking }, { onConflict: "group_name" });
  }

  revalidatePath("/chaveamento");
  revalidatePath("/jogos");

  return NextResponse.json({ ok: true });
}
