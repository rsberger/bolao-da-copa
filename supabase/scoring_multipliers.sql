-- ============================================================
-- Scoring with stage multipliers
-- Stages: Grupos(×1), Trinta e dois(×2), Oitavas(×2),
--         Quartas(×3), Semi(×4), Terceiro(×4), Final(×5)
-- Base: exact=5, diff=3, winner=2, miss=0
-- ============================================================

-- 1. Add result_type column to predictions
alter table public.predictions
  add column if not exists result_type text not null default 'miss';

-- 2. Updated scoring function
create or replace function public.calculate_match_points(p_match_id uuid)
returns void as $$
declare
  v_home      integer;
  v_away      integer;
  v_stage     text;
  v_mult      integer;
  rec         record;
  v_points    integer;
  v_rtype     text;
begin
  select home_score, away_score, stage
    into v_home, v_away, v_stage
  from public.matches
  where id = p_match_id and is_finished = true;

  if not found then return; end if;

  v_mult := case
    when v_stage ilike 'Final'        then 5
    when v_stage ilike 'Semi%'        then 4
    when v_stage ilike 'Terceiro%'    then 4
    when v_stage ilike 'Quartas%'     then 3
    when v_stage ilike 'Oitavas%'     then 2
    when v_stage ilike 'Trinta%'      then 2
    when v_stage ilike 'Dezess%'      then 2
    else 1  -- Grupos
  end;

  for rec in
    select id, home_score, away_score
    from public.predictions
    where match_id = p_match_id
  loop
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
    else
      v_rtype  := 'miss';
      v_points := 0;
    end if;

    update public.predictions
      set points = v_points, result_type = v_rtype, updated_at = now()
    where id = rec.id;
  end loop;
end;
$$ language plpgsql security definer;

-- 3. Updated leaderboard view (tiebreakers: exact > diff > winner > predictions)
create or replace view public.leaderboard as
select
  p.id,
  p.name,
  p.avatar_url,
  p.email,
  coalesce(sum(pr.points), 0)
    + coalesce((select cp.points from public.champion_predictions cp where cp.user_id = p.id), 0)
    as total_points,
  count(pr.id) filter (where pr.result_type = 'exact')  as exact_scores,
  count(pr.id) filter (where pr.result_type = 'diff')   as correct_diffs,
  count(pr.id) filter (where pr.result_type = 'winner') as correct_winners,
  count(pr.id) filter (where pr.points > 0)             as total_hits,
  count(pr.id) as total_predictions
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.name, p.avatar_url, p.email
order by
  total_points     desc,
  exact_scores     desc,
  correct_diffs    desc,
  correct_winners  desc,
  total_predictions desc,
  p.name           asc;
