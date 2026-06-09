-- Habilita extensão para UUIDs
create extension if not exists "uuid-ossp";

-- Tabela de perfis (sincronizada com auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuários veem todos os perfis" on public.profiles
  for select using (true);

create policy "Usuário atualiza próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- Trigger: cria perfil automaticamente ao registrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tabela de jogos
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  home_team text not null,
  away_team text not null,
  home_flag text,           -- código ISO do país (ex: 'BR', 'AR')
  away_flag text,
  match_date timestamptz not null,
  stage text not null default 'Grupos',  -- Grupos, Oitavas, Quartas, Semi, Final
  group_name text,          -- 'A', 'B', ... (só para fase de grupos)
  home_score integer,       -- null até o jogo terminar
  away_score integer,
  is_finished boolean default false,
  created_at timestamptz default now()
);

alter table public.matches enable row level security;

create policy "Todos veem jogos" on public.matches
  for select using (true);

create policy "Apenas admins inserem/editam jogos" on public.matches
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Tabela de palpites
create table public.predictions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  home_score integer not null,
  away_score integer not null,
  points integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;

create policy "Usuários veem todos os palpites" on public.predictions
  for select using (true);

create policy "Usuário insere próprio palpite" on public.predictions
  for insert with check (auth.uid() = user_id);

create policy "Usuário atualiza próprio palpite" on public.predictions
  for update using (auth.uid() = user_id);

-- View: placar geral
create or replace view public.leaderboard as
select
  p.id,
  p.name,
  p.avatar_url,
  p.email,
  coalesce(sum(pr.points), 0) as total_points,
  count(pr.id) filter (where pr.points = 10) as exact_scores,
  count(pr.id) filter (where pr.points = 5) as correct_winners,
  count(pr.id) filter (where pr.points > 0) as total_hits,
  count(pr.id) as total_predictions
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.name, p.avatar_url, p.email
order by total_points desc, exact_scores desc;

-- Função para calcular e salvar pontuação de um jogo encerrado
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
    -- Placar exato
    if rec.home_score = v_home and rec.away_score = v_away then
      v_points := 10;
    -- Vencedor correto (ou empate correto)
    elsif
      (rec.home_score > rec.away_score and v_home > v_away) or
      (rec.home_score < rec.away_score and v_home < v_away) or
      (rec.home_score = rec.away_score and v_home = v_away)
    then
      v_points := 5;
    else
      v_points := 0;
    end if;

    update public.predictions set points = v_points, updated_at = now()
    where id = rec.id;
  end loop;
end;
$$ language plpgsql security definer;
