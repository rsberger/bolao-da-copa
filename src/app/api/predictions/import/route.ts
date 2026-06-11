import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

type ImportRow = {
  match_id: string;
  "Gols Mandante": number | string;
  "Gols Visitante": number | string;
  Mandante?: string;
  Visitante?: string;
  "Data/Hora (UTC)"?: string;
};

export type ImportResult = {
  home_team: string;
  away_team: string;
  status: "saved" | "updated" | "skipped" | "error";
  reason?: string;
  home_score?: number;
  away_score?: number;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let rows: ImportRow[];
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets["Palpites"];
    if (!ws) return NextResponse.json({ error: "Sheet 'Palpites' not found" }, { status: 400 });
    rows = XLSX.utils.sheet_to_json<ImportRow>(ws);
  } catch {
    return NextResponse.json({ error: "Could not parse file" }, { status: 400 });
  }

  // Load all valid match IDs with their dates
  const matchIds = rows.map((r) => r.match_id).filter(Boolean);
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, match_date")
    .in("id", matchIds);

  const matchMap = Object.fromEntries((matches ?? []).map((m) => [m.id, m]));

  // Existing predictions
  const { data: existingPreds } = await supabase
    .from("predictions")
    .select("id, match_id")
    .eq("user_id", user.id)
    .in("match_id", matchIds);

  const predMap = Object.fromEntries((existingPreds ?? []).map((p) => [p.match_id, p.id]));

  const results: ImportResult[] = [];
  const now = new Date();

  for (const row of rows) {
    const match = matchMap[row.match_id];
    const homeTeam = row.Mandante ?? match?.home_team ?? "?";
    const awayTeam = row.Visitante ?? match?.away_team ?? "?";

    if (!match) {
      results.push({ home_team: homeTeam, away_team: awayTeam, status: "error", reason: "Jogo não encontrado" });
      continue;
    }

    // Skip if blank
    if (row["Gols Mandante"] === "" || row["Gols Visitante"] === "" ||
        row["Gols Mandante"] === null || row["Gols Visitante"] === null ||
        row["Gols Mandante"] === undefined || row["Gols Visitante"] === undefined) {
      continue;
    }

    // Match already started
    if (new Date(match.match_date) <= now) {
      results.push({ home_team: match.home_team, away_team: match.away_team, status: "skipped", reason: "Jogo já iniciou" });
      continue;
    }

    // Validate scores
    const hs = Number(row["Gols Mandante"]);
    const as_ = Number(row["Gols Visitante"]);
    if (!Number.isInteger(hs) || !Number.isInteger(as_) || hs < 0 || as_ < 0 || hs > 20 || as_ > 20) {
      results.push({ home_team: match.home_team, away_team: match.away_team, status: "error", reason: `Valor inválido: "${row["Gols Mandante"]}" × "${row["Gols Visitante"]}"` });
      continue;
    }

    const payload = { user_id: user.id, match_id: match.id, home_score: hs, away_score: as_ };
    const existingId = predMap[match.id];

    if (existingId) {
      const { error } = await supabase.from("predictions").update(payload).eq("id", existingId);
      if (error) {
        results.push({ home_team: match.home_team, away_team: match.away_team, status: "error", reason: error.message });
      } else {
        results.push({ home_team: match.home_team, away_team: match.away_team, status: "updated", home_score: hs, away_score: as_ });
      }
    } else {
      const { error } = await supabase.from("predictions").insert(payload);
      if (error) {
        results.push({ home_team: match.home_team, away_team: match.away_team, status: "error", reason: error.message });
      } else {
        results.push({ home_team: match.home_team, away_team: match.away_team, status: "saved", home_score: hs, away_score: as_ });
      }
    }
  }

  const saved = results.filter((r) => r.status === "saved").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ results, summary: { saved, updated, skipped, errors } });
}
