create table public.champion_predictions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  team text not null,
  team_flag text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.champion_predictions enable row level security;

create policy "Todos veem previsões de campeão" on public.champion_predictions
  for select using (true);

create policy "Usuário insere própria previsão" on public.champion_predictions
  for insert with check (auth.uid() = user_id);

create policy "Usuário atualiza própria previsão" on public.champion_predictions
  for update using (auth.uid() = user_id);
