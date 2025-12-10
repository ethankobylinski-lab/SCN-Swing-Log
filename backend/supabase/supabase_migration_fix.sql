-- Supabase hardening migration for HitJournal.
-- This script normalizes the schema, ensures required columns exist,
-- and adds the indexes flagged by the performance lints.

begin;

create extension if not exists "pgcrypto";

-- Core tables ----------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone_number text,
  name text not null default '',
  role text not null check (role in ('Coach','Player')),
  team_ids uuid[] not null default '{}'::uuid[],
  coach_team_ids uuid[] not null default '{}'::uuid[],
  is_new boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  profile jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season_year integer not null,
  coach_id uuid not null references public.users (id),
  primary_color text not null default '#000000',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users (id)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (role in ('Coach','Player')),
  status text not null default 'active' check (status in ('active','invited','removed')),
  added_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  coach_id uuid references public.users (id),
  name text not null,
  description text not null,
  target_zones text[] not null,
  pitch_types text[] not null,
  count_situation text not null,
  base_runners text[] not null,
  outs smallint not null,
  goal_type text not null,
  goal_target_value numeric not null,
  reps_per_set integer not null,
  sets integer not null,
  drill_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  drill_id uuid references public.drills (id) on delete set null,
  player_ids uuid[] not null default '{}'::uuid[],
  is_recurring boolean not null default false,
  recurring_days text[] not null default '{}'::text[],
  due_date date,
  assigned_date date not null,
  coach_id uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.users (id) on delete cascade,
  drill_id uuid references public.drills (id) on delete set null,
  name text not null,
  date timestamptz not null,
  type text,
  sets jsonb not null default '[]'::jsonb,
  feedback text,
  reflection text,
  coach_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_edited_by uuid references public.users (id),
  logged_by uuid references public.users (id)
);

create table if not exists public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.users (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  metric text not null,
  target_value numeric not null,
  start_date date not null,
  target_date date not null,
  status text not null,
  drill_type text,
  target_zones text[] not null default '{}'::text[],
  pitch_types text[] not null default '{}'::text[],
  reflection text,
  min_reps integer,
  created_by_user_id uuid references public.users (id),
  created_by_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_goals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  description text not null,
  metric text not null,
  target_value numeric not null,
  start_date date not null,
  target_date date not null,
  status text not null,
  drill_type text,
  target_zones text[] not null default '{}'::text[],
  pitch_types text[] not null default '{}'::text[],
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.join_codes (
  code text primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  role text not null,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint join_codes_role_check check (role in ('player','coach')),
  constraint join_codes_code_upper check (code = upper(code)),
  constraint join_codes_team_role_key unique (team_id, role)
);

-- Indexes flagged by the Supabase lint report --------------------------------
create index if not exists idx_teams_coach_id on public.teams (coach_id);
create index if not exists idx_teams_created_by on public.teams (created_by);
create index if not exists idx_team_members_user_active on public.team_members (user_id) where status = 'active';
create index if not exists idx_team_members_team_role_active on public.team_members (team_id, role) where status = 'active';
create index if not exists idx_drills_team_id on public.drills (team_id);
create index if not exists idx_drills_coach_id on public.drills (coach_id);
create index if not exists idx_assignments_team_id on public.assignments (team_id);
create index if not exists idx_assignments_due_date on public.assignments (due_date);
create index if not exists idx_assignments_coach_id on public.assignments (coach_id);
create index if not exists idx_sessions_team_id on public.sessions (team_id);
create index if not exists idx_sessions_player_id on public.sessions (player_id);
create index if not exists idx_sessions_date on public.sessions (date);
create index if not exists idx_sessions_drill_id on public.sessions (drill_id);
create index if not exists idx_personal_goals_player_id on public.personal_goals (player_id);
create index if not exists idx_personal_goals_team_id on public.personal_goals (team_id);
create index if not exists idx_personal_goals_created_by on public.personal_goals (created_by_user_id);
create index if not exists idx_team_goals_team_id on public.team_goals (team_id);

-- Backfill membership rows for legacy profiles so RLS helpers can trust team_members.
insert into public.team_members (team_id, user_id, role, status, added_by)
select distinct unnest(u.team_ids), u.id, 'Player', 'active', u.id
from public.users u
where array_length(u.team_ids, 1) > 0
on conflict (team_id, user_id) do update set status = 'active';

insert into public.team_members (team_id, user_id, role, status, added_by)
select distinct unnest(u.coach_team_ids), u.id, 'Coach', 'active', u.id
from public.users u
where array_length(u.coach_team_ids, 1) > 0
on conflict (team_id, user_id) do update set status = 'active';

insert into public.team_members (team_id, user_id, role, status, added_by)
select t.id, t.coach_id, 'Coach', 'active', coalesce(t.created_by, t.coach_id)
from public.teams t
where t.coach_id is not null
on conflict (team_id, user_id) do update set status = 'active';

commit;
