-- 1. Add points column to champion_predictions
alter table public.champion_predictions
  add column if not exists points integer not null default 0;

-- 2. Function: award 50 pts to everyone who predicted the correct champion
--    Call this after the Final match is marked as finished.
create or replace function public.calculate_champion_points()
returns void as $$
declare
  v_winner text;
  v_home_score integer;
  v_away_score integer;
  v_home_team text;
  v_away_team text;
begin
  -- Find the Final match result
  select home_team, away_team, home_score, away_score
  into v_home_team, v_away_team, v_home_score, v_away_score
  from public.matches
  where stage = 'Final' and is_finished = true
  limit 1;

  if not found then return; end if;

  -- Determine winner (no draws in finals — if somehow tied, skip)
  if v_home_score > v_away_score then
    v_winner := v_home_team;
  elsif v_away_score > v_home_score then
    v_winner := v_away_team;
  else
    return;
  end if;

  -- Award 50 pts to correct predictions, 0 to the rest
  update public.champion_predictions
  set points = case when team = v_winner then 50 else 0 end;
end;
$$ language plpgsql security definer;

-- 3. Update leaderboard view to include champion prediction points
create or replace view public.leaderboard as
select
  p.id,
  p.name,
  p.avatar_url,
  p.email,
  coalesce(sum(pr.points), 0)
    + coalesce((select cp.points from public.champion_predictions cp where cp.user_id = p.id), 0)
    as total_points,
  count(pr.id) filter (where pr.points = 10) as exact_scores,
  count(pr.id) filter (where pr.points = 5)  as correct_winners,
  count(pr.id) filter (where pr.points > 0)  as total_hits,
  count(pr.id) as total_predictions
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.name, p.avatar_url, p.email
order by total_points desc, exact_scores desc;
