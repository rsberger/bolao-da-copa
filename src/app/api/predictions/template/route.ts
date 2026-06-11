import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only future matches
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, match_date, stage, group_name")
    .gt("match_date", new Date().toISOString())
    .order("match_date", { ascending: true });

  // Existing predictions for this user
  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score")
    .eq("user_id", user.id);

  const predMap = Object.fromEntries(
    (predictions ?? []).map((p) => [p.match_id, p])
  );

  const rows = (matches ?? []).map((m) => {
    const dt = new Date(m.match_date);
    const dateStr = dt.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    });
    const pred = predMap[m.id];
    const stage = m.group_name ? `Grupo ${m.group_name}` : m.stage;
    return {
      match_id: m.id,
      "Data/Hora (UTC)": dateStr,
      Fase: stage,
      Mandante: m.home_team,
      Visitante: m.away_team,
      "Gols Mandante": pred?.home_score ?? "",
      "Gols Visitante": pred?.away_score ?? "",
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 36 }, // match_id
    { wch: 18 }, // Data/Hora
    { wch: 14 }, // Fase
    { wch: 22 }, // Mandante
    { wch: 22 }, // Visitante
    { wch: 16 }, // Gols Mandante
    { wch: 16 }, // Gols Visitante
  ];

  // Style header row (grey) and match_id column (hidden via narrow width trick — set to 0)
  ws["!cols"][0] = { wch: 0, hidden: true };

  XLSX.utils.book_append_sheet(wb, ws, "Palpites");

  // Instructions sheet
  const infoRows = [
    { Instrução: "Preencha apenas as colunas 'Gols Mandante' e 'Gols Visitante'." },
    { Instrução: "Use apenas números inteiros (0, 1, 2, ...)." },
    { Instrução: "Não altere nenhuma outra coluna — isso pode causar erros na importação." },
    { Instrução: "Linhas com gols em branco serão ignoradas (palpite existente não é apagado)." },
    { Instrução: "Jogos que já iniciaram serão ignorados mesmo que preenchidos." },
    { Instrução: "Salve o arquivo e faça o upload na página de Jogos." },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(infoRows);
  wsInfo["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Instruções");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="palpites-copa2026.xlsx"`,
    },
  });
}
