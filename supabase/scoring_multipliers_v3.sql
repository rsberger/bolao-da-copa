-- ============================================================
-- Scoring with updated stage multipliers + penalty winner rules
-- Stages: Grupos(×1), Trinta e dois(×2), Oitavas(×3),
--         Quartas(×4), Semi(×5), Terceiro(×5), Final(×6)
-- Base: exact=5, diff=3, winner=2, miss=0
--
-- Penalty rules:
-- 1. If user predicted a winning team outright, the match drew in
--    regular time, and that same team won on penalties, it counts
--    as a correct winner (2×mult) — same as a normal correct winner.
-- 2. If user predicted a draw AND correctly picked which team
--    advances on penalties, they get a +2×mult bonus on top of
--    whatever draw points they already earned (exact/diff).
-- ============================================================

create or replace function public.calculate_match_points(p_match_id uuid)
returns void as $$
declare
  v_home          integer;
  v_away          integer;
  v_stage         text;
  v_mult          integer;
  v_pen_winner    text;
  rec             record;
  v_points        integer;
  v_rtype         text;
  v_pred_winner   text; -- 'home' | 'away' | 'draw'
begin
  select home_score, away_score, stage, penalty_winner
    into v_home, v_away, v_stage, v_pen_winner
  from public.matches
  where id = p_match_id and is_finished = true;

  if not found then return; end if;

  v_mult := case
    when v_stage ilike 'Final'        then 6
    when v_stage ilike 'Semi%'        then 5
    when v_stage ilike 'Terceiro%'    then 5
    when v_stage ilike 'Quartas%'     then 4
    when v_stage ilike 'Oitavas%'     then 3
    when v_stage ilike 'Trinta%'      then 2
    when v_stage ilike 'Dezess%'      then 2
    else 1  -- Grupos
  end;

  for rec in
    select id, home_score, away_score, predicted_penalty_winner
    from public.predictions
    where match_id = p_match_id
  loop
    -- What did the user predict: home win, away win, or draw?
    v_pred_winner := case
      when rec.home_score > rec.away_score then 'home'
      when rec.home_score < rec.away_score then 'away'
      else 'draw'
    end;

    if rec.home_score = v_home and rec.away_score = v_away then
      v_rtype  := 'exact';
      v_points := 5 * v_mult;
    elsif
      (rec.home_score > rec.away_score and v_home > v_away) or
      (rec.home_score < rec.away_score and v_home < v_away) or
      (rec.home_score = rec.away_score and v_home = v_away)
    then
      if (rec.home_score - rec.away_score) = (v_home - v_away) then
        v_rtype  := 'diff';
        v_points := 3 * v_mult;
      else
        v_rtype  := 'winner';
        v_points := 2 * v_mult;
      end if;
    elsif
      -- Predicted a team to win outright, game drew in regular time,
      -- and that same team advanced on penalties.
      v_home = v_away
      and v_pred_winner in ('home', 'away')
      and v_pen_winner = v_pred_winner
    then
      v_rtype  := 'winner';
      v_points := 2 * v_mult;
    else
      v_rtype  := 'miss';
      v_points := 0;
    end if;

    -- Bonus: predicted a draw AND correctly picked the penalty winner
    if v_pred_winner = 'draw'
       and v_home = v_away
       and rec.predicted_penalty_winner is not null
       and rec.predicted_penalty_winner = v_pen_winner
    then
      v_points := v_points + 2 * v_mult;
    end if;

    update public.predictions
      set points = v_points, result_type = v_rtype, updated_at = now()
    where id = rec.id;
  end loop;
end;
$$ language plpgsql security definer;
