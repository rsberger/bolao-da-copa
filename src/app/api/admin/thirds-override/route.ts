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

  const { ranking } = await req.json();
  const admin = createAdminClient();

  if (!ranking || ranking.length === 0) {
    await admin.from("thirds_override").delete().eq("id", 1);
  } else {
    await admin.from("thirds_override").upsert({ id: 1, ranking }, { onConflict: "id" });
  }

  revalidatePath("/chaveamento");
  revalidatePath("/resultados");

  return NextResponse.json({ ok: true });
}
