-- Updated scoring: 10 exact / 7 correct winner + correct goal diff / 5 correct winner / 0 wrong
create or replace function public.calculate_match_points(p_match_id uuid)
returns void as $$
declare
  v_home integer;
  v_away integer;
  rec record;
  v_points integer;
begin
  select home_score, away_score into v_home, v_away
  from public.matches where id = p_match_id and is_finished = true;

  if not found then return; end if;

  for rec in
    select id, home_score, away_score from public.predictions
    where match_id = p_match_id
  loop
    if rec.home_score = v_home and rec.away_score = v_away then
      -- Exact score
      v_points := 10;
    elsif
      (rec.home_score > rec.away_score and v_home > v_away) or
      (rec.home_score < rec.away_score and v_home < v_away) or
      (rec.home_score = rec.away_score and v_home = v_away)
    then
      -- Correct winner/draw: check if goal difference also matches
      if (rec.home_score - rec.away_score) = (v_home - v_away) then
        v_points := 7;
      else
        v_points := 5;
      end if;
    else
      v_points := 0;
    end if;

    update public.predictions set points = v_points, updated_at = now()
    where id = rec.id;
  end loop;
end;
$$ language plpgsql security definer;
