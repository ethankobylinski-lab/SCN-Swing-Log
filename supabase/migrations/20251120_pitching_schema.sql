-- 20251120_pitching_schema.sql

-- 1. Team Settings
create table if not exists public.team_settings (
  team_id uuid primary key references public.teams(id) on delete cascade,
  rest_requirement_per_pitch numeric not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_team_settings_updated_at on public.team_settings;
create trigger trg_team_settings_updated_at
before update on public.team_settings
for each row execute function public.touch_updated_at();

-- 2. Pitch Types
create table if not exists public.pitch_types (
  id uuid primary key default gen_random_uuid(),
  pitcher_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  code text not null,
  color_hex text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pitch_types_pitcher_id on public.pitch_types(pitcher_id);

drop trigger if exists trg_pitch_types_updated_at on public.pitch_types;
create trigger trg_pitch_types_updated_at
before update on public.pitch_types
for each row execute function public.touch_updated_at();

-- 3. Pitch Sessions
create table if not exists public.pitch_sessions (
  id uuid primary key default gen_random_uuid(),
  pitcher_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  catcher_id uuid references public.users(id),
  session_name text not null,
  session_type text not null check (session_type in ('command', 'velo', 'mix', 'recovery', 'flat', 'live')),
  game_situation_enabled boolean not null default false,
  pitch_goals jsonb not null default '[]'::jsonb,
  total_pitches integer not null default 0,
  session_start_time timestamptz not null default now(),
  session_end_time timestamptz,
  rest_hours_required numeric,
  rest_end_time timestamptz,
  analytics jsonb, -- Computed analytics stored on finalization
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pitch_sessions_pitcher_id on public.pitch_sessions(pitcher_id);
create index if not exists idx_pitch_sessions_team_id on public.pitch_sessions(team_id);
create index if not exists idx_pitch_sessions_date on public.pitch_sessions(session_start_time);

drop trigger if exists trg_pitch_sessions_updated_at on public.pitch_sessions;
create trigger trg_pitch_sessions_updated_at
before update on public.pitch_sessions
for each row execute function public.touch_updated_at();

-- 4. Pitch Records
create table if not exists public.pitch_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  index integer not null,
  batter_side text not null check (batter_side in ('L', 'R')),
  balls_before integer not null,
  strikes_before integer not null,
  runners_on jsonb not null default '{"on1b": false, "on2b": false, "on3b": false}'::jsonb,
  outs integer not null check (outs in (0, 1, 2)),
  pitch_type_id uuid not null references public.pitch_types(id),
  target_zone text not null,
  target_x_norm numeric,
  target_y_norm numeric,
  actual_zone text not null,
  actual_x_norm numeric,
  actual_y_norm numeric,
  velocity_mph numeric,
  outcome text not null,
  in_play_quality text check (in_play_quality in ('weak', 'medium', 'hard')),
  created_at timestamptz not null default now()
);

create index if not exists idx_pitch_records_session_id on public.pitch_records(session_id);

-- 5. RLS Policies

-- Enable RLS
alter table public.team_settings enable row level security;
alter table public.pitch_types enable row level security;
alter table public.pitch_sessions enable row level security;
alter table public.pitch_records enable row level security;

-- Team Settings Policies
-- Coaches can view and edit settings for their teams
create policy "Coaches can view team settings" on public.team_settings
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_settings.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('HeadCoach', 'AssistantCoach')
      and tm.status = 'active'
    )
  );

create policy "Coaches can update team settings" on public.team_settings
  for update using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_settings.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('HeadCoach', 'AssistantCoach')
      and tm.status = 'active'
    )
  );

-- Players can view settings for their teams (to see rest requirements)
create policy "Players can view team settings" on public.team_settings
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_settings.team_id
      and tm.user_id = auth.uid()
      and tm.role = 'Player'
      and tm.status = 'active'
    )
  );

-- Pitch Types Policies
-- Users can view/edit their own pitch types
create policy "Users can manage their own pitch types" on public.pitch_types
  for all using (pitcher_id = auth.uid());

-- Coaches can view pitch types of players on their teams
create policy "Coaches can view players pitch types" on public.pitch_types
  for select using (
    exists (
      select 1 from public.team_members coach_tm
      join public.team_members player_tm on player_tm.team_id = coach_tm.team_id
      where coach_tm.user_id = auth.uid()
      and coach_tm.role in ('HeadCoach', 'AssistantCoach')
      and coach_tm.status = 'active'
      and player_tm.user_id = pitch_types.pitcher_id
      and player_tm.status = 'active'
    )
  );

-- Pitch Sessions Policies
-- Users can manage their own sessions
create policy "Users can manage their own pitch sessions" on public.pitch_sessions
  for all using (pitcher_id = auth.uid());

-- Coaches can view sessions of players on their teams
create policy "Coaches can view players pitch sessions" on public.pitch_sessions
  for select using (
    exists (
      select 1 from public.team_members coach_tm
      join public.team_members player_tm on player_tm.team_id = coach_tm.team_id
      where coach_tm.user_id = auth.uid()
      and coach_tm.role in ('HeadCoach', 'AssistantCoach')
      and coach_tm.status = 'active'
      and player_tm.user_id = pitch_sessions.pitcher_id
      and player_tm.status = 'active'
    )
  );

-- Pitch Records Policies
-- Users can manage their own pitch records (via session ownership)
create policy "Users can manage their own pitch records" on public.pitch_records
  for all using (
    exists (
      select 1 from public.pitch_sessions ps
      where ps.id = pitch_records.session_id
      and ps.pitcher_id = auth.uid()
    )
  );

-- Coaches can view pitch records of players on their teams
create policy "Coaches can view players pitch records" on public.pitch_records
  for select using (
    exists (
      select 1 from public.pitch_sessions ps
      join public.team_members player_tm on player_tm.user_id = ps.pitcher_id
      join public.team_members coach_tm on coach_tm.team_id = player_tm.team_id
      where ps.id = pitch_records.session_id
      and coach_tm.user_id = auth.uid()
      and coach_tm.role in ('HeadCoach', 'AssistantCoach')
      and coach_tm.status = 'active'
      and player_tm.status = 'active'
    )
  );
