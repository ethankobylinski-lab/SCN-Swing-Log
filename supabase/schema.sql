-- Supabase schema and row-level security configuration for the HitJournal app.
-- Run this script inside the Supabase SQL editor or as a migration after creating a new project.

-- Enable extensions required for UUID generation and crypto helpers.
create extension if not exists "pgcrypto";

-- Utility function to keep updated_at in sync.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core tables -----------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone_number text,
  name text not null default '',
  role text not null check (role in ('Coach', 'Player')),
  team_ids uuid[] not null default '{}'::uuid[],
  coach_team_ids uuid[] not null default '{}'::uuid[],
  is_new boolean not null default true,
  preferences jsonb not null default '{}'::jsonb,
  profile jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_users_updated_at') then
    create trigger trg_users_updated_at
    before update on public.users
    for each row execute function public.touch_updated_at();
  end if;
end $$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season_year integer not null,
  coach_id uuid references public.users (id),
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id)
);

alter table public.teams
  add column if not exists created_by uuid references public.users (id);

alter table public.teams
  drop column if exists logo_url;

alter table public.teams
  drop column if exists primary_color;

alter table public.teams
  drop column if exists join_code_player;

alter table public.teams
  drop column if exists join_code_coach;

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

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_drills_updated_at') then
    create trigger trg_drills_updated_at
    before update on public.drills
    for each row execute function public.touch_updated_at();
  end if;
end $$;

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

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_assignments_updated_at') then
    create trigger trg_assignments_updated_at
    before update on public.assignments
    for each row execute function public.touch_updated_at();
  end if;
end $$;

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

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_sessions_updated_at') then
    create trigger trg_sessions_updated_at
    before update on public.sessions
    for each row execute function public.touch_updated_at();
  end if;
end $$;

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

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_personal_goals_updated_at') then
    create trigger trg_personal_goals_updated_at
    before update on public.personal_goals
    for each row execute function public.touch_updated_at();
  end if;
end $$;

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

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_team_goals_updated_at') then
    create trigger trg_team_goals_updated_at
    before update on public.team_goals
    for each row execute function public.touch_updated_at();
  end if;
end $$;

create table if not exists public.join_codes (
  code text primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  role text not null check (role in ('player','coach')),
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_join_codes_updated_at') then
    create trigger trg_join_codes_updated_at
    before update on public.join_codes
    for each row execute function public.touch_updated_at();
  end if;
end $$;

-- Helper functions ------------------------------------------------------------

create or replace function public.array_overlap(a anyarray, b anyarray)
returns boolean
language sql
immutable
as $$
  select coalesce(a && b, false);
$$;

create or replace function public.current_profile()
returns public.users
language sql
security definer
set search_path = public
as $$
  select users.* from public.users where id = auth.uid();
$$;

create or replace function public.is_coach()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.users;
begin
  select * into profile from public.users where id = auth.uid();
  if profile.id is null then
    return false;
  end if;
  return trim(lower(coalesce(profile.role, ''))) = 'coach';
end;
$$;

create or replace function public.has_team_membership(team uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.users;
begin
  if team is null then
    return false;
  end if;

  select * into profile from public.users where id = auth.uid();
  if profile.id is null then
    return false;
  end if;

  return team = any(coalesce(profile.team_ids, '{}'::uuid[]))
    or team = any(coalesce(profile.coach_team_ids, '{}'::uuid[]));
end;
$$;

create or replace function public.coach_can_manage_team(team uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.users;
begin
  if team is null then
    return false;
  end if;

  select * into profile from public.users where id = auth.uid();
  if profile.id is null or profile.role <> 'Coach' then
    return false;
  end if;

  return team = any(coalesce(profile.coach_team_ids, '{}'::uuid[]))
    or exists(select 1 from public.teams t where t.id = team and t.coach_id = profile.id);
end;
$$;

create or replace function public.is_head_coach(team uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.teams where id = team and coach_id = auth.uid());
$$;

create or replace function public.coach_can_view_user(target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  coach_profile public.users;
  target_profile public.users;
begin
  select * into coach_profile from public.users where id = auth.uid();
  if coach_profile.id is null or coach_profile.role <> 'Coach' then
    return false;
  end if;

  select * into target_profile from public.users where id = target_user;
  if target_profile.id is null then
    return false;
  end if;

  return array_overlap(coach_profile.team_ids, target_profile.team_ids)
    or array_overlap(coach_profile.team_ids, target_profile.coach_team_ids)
    or array_overlap(coach_profile.coach_team_ids, target_profile.team_ids)
    or array_overlap(coach_profile.coach_team_ids, target_profile.coach_team_ids);
end;
$$;

create or replace function public.head_coach_can_manage_user(target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  coach_id uuid := auth.uid();
  target_profile public.users;
begin
  if coach_id is null or target_user is null then
    return false;
  end if;

  select * into target_profile from public.users where id = target_user;
  if target_profile.id is null then
    return false;
  end if;

  return exists(
    select 1
    from public.teams t
    where t.coach_id = coach_id
      and (
        t.id = any(coalesce(target_profile.team_ids, '{}'::uuid[]))
        or t.id = any(coalesce(target_profile.coach_team_ids, '{}'::uuid[]))
      )
  );
end;
$$;

create or replace function public.resolve_join_code(join_role text, join_code text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  resolved_role text;
  resolved_team public.teams%rowtype;
begin
  normalized := upper(trim(coalesce(join_code, '')));
  if normalized = '' then
    raise exception 'join code required';
  end if;

  resolved_role := lower(coalesce(join_role, 'player'));
  if resolved_role not in ('player','coach') then
    raise exception 'invalid role';
  end if;

  select t.*
  into resolved_team
  from public.join_codes jc
  join public.teams t on t.id = jc.team_id
  where upper(jc.code) = normalized
    and lower(jc.role) = resolved_role
  limit 1;

  return resolved_team;
end;
$$;

-- Automatically set coach ownership metadata for new teams
create or replace function public.set_team_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.coach_id is null then
    new.coach_id := auth.uid();
  end if;

  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_teams_set_owner on public.teams;

create trigger trg_teams_set_owner
before insert on public.teams
for each row
execute function public.set_team_owner();

-- RPC helper to create teams through Supabase client safely
create or replace function public.create_team(team_name text, team_season_year integer)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  new_team public.teams%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not is_coach() then
    raise exception 'only coaches can create teams';
  end if;

  insert into public.teams (name, season_year, coach_id, created_by)
  values (team_name, team_season_year, auth.uid(), auth.uid())
  returning * into new_team;

  return new_team;
end;
$$;

grant execute on function public.resolve_join_code(text, text) to authenticated;
grant execute on function public.has_team_membership(uuid) to authenticated;
grant execute on function public.is_head_coach(uuid) to authenticated;
grant execute on function public.coach_can_manage_team(uuid) to authenticated;
grant execute on function public.coach_can_view_user(uuid) to authenticated;
grant execute on function public.is_coach() to authenticated;
grant execute on function public.head_coach_can_manage_user(uuid) to authenticated;
grant execute on function public.create_team(text, integer) to authenticated;

-- Row level security ----------------------------------------------------------

alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.drills enable row level security;
alter table public.assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.personal_goals enable row level security;
alter table public.team_goals enable row level security;
alter table public.join_codes enable row level security;

-- Users
drop policy if exists "Users can select themselves" on public.users;
create policy "Users can select themselves"
on public.users
for select
using (id = auth.uid());

drop policy if exists "Coaches can view their team members" on public.users;
create policy "Coaches can view their team members"
on public.users
for select
using (coach_can_view_user(id));

drop policy if exists "Users can insert themselves" on public.users;
create policy "Users can insert themselves"
on public.users
for insert
with check (id = auth.uid());

drop policy if exists "Users can update themselves" on public.users;
create policy "Users can update themselves"
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Head coaches can manage coaches they added" on public.users;
create policy "Head coaches can manage coaches they added"
on public.users
for update
using (id = auth.uid() or head_coach_can_manage_user(id))
with check (id = auth.uid() or head_coach_can_manage_user(id));

-- Teams
drop policy if exists "Team members can read team data" on public.teams;
create policy "Team members can read team data"
on public.teams
for select
using (has_team_membership(id) or is_head_coach(id));

drop policy if exists "Users can create teams" on public.teams;
drop policy if exists "Users can create teams they own" on public.teams;
drop policy if exists "Coaches can create teams they own" on public.teams;
drop policy if exists "Coaches can create teams" on public.teams;
create policy "Coaches can create teams"
on public.teams
for insert
with check (
  auth.uid() is not null
  and auth.uid() = coach_id
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and trim(lower(coalesce(u.role, ''))) = 'coach'
  )
);

drop policy if exists "Head coaches can update their team" on public.teams;
create policy "Head coaches can update their team"
on public.teams
for update
using (is_head_coach(id))
with check (is_head_coach(id));

drop policy if exists "Head coaches can delete their team" on public.teams;
create policy "Head coaches can delete their team"
on public.teams
for delete
using (is_head_coach(id));

-- Drills
drop policy if exists "Team members can read drills" on public.drills;
create policy "Team members can read drills"
on public.drills
for select
using (has_team_membership(team_id));

drop policy if exists "Coaches can manage drills" on public.drills;
create policy "Coaches can manage drills"
on public.drills
for all
using (coach_can_manage_team(team_id))
with check (coach_can_manage_team(team_id));

-- Assignments
drop policy if exists "Team members can read assignments" on public.assignments;
create policy "Team members can read assignments"
on public.assignments
for select
using (has_team_membership(team_id));

drop policy if exists "Coaches can manage assignments" on public.assignments;
create policy "Coaches can manage assignments"
on public.assignments
for all
using (coach_can_manage_team(team_id))
with check (coach_can_manage_team(team_id));

-- Sessions
drop policy if exists "Players and coaches can read sessions" on public.sessions;
create policy "Players and coaches can read sessions"
on public.sessions
for select
using (
  player_id = auth.uid()
  or coach_can_manage_team(team_id)
);

drop policy if exists "Players can create their own sessions" on public.sessions;
create policy "Players can create their own sessions"
on public.sessions
for insert
with check (
  player_id = auth.uid()
  and has_team_membership(team_id)
);

drop policy if exists "Players can update/delete their own sessions" on public.sessions;
create policy "Players can update/delete their own sessions"
on public.sessions
for update
using (player_id = auth.uid())
with check (player_id = auth.uid());

drop policy if exists "Coaches can update team sessions" on public.sessions;
create policy "Coaches can update team sessions"
on public.sessions
for update
using (coach_can_manage_team(team_id))
with check (coach_can_manage_team(team_id));

drop policy if exists "Players can delete their sessions" on public.sessions;
create policy "Players can delete their sessions"
on public.sessions
for delete
using (player_id = auth.uid());

-- Personal goals
drop policy if exists "Players and coaches can read personal goals" on public.personal_goals;
create policy "Players and coaches can read personal goals"
on public.personal_goals
for select
using (
  player_id = auth.uid()
  or coach_can_manage_team(team_id)
);

drop policy if exists "Players and coaches can create personal goals" on public.personal_goals;
create policy "Players and coaches can create personal goals"
on public.personal_goals
for insert
with check (
  player_id = auth.uid()
  or coach_can_manage_team(team_id)
);

drop policy if exists "Players and coaches can manage personal goals" on public.personal_goals;
create policy "Players and coaches can manage personal goals"
on public.personal_goals
for update
using (
  player_id = auth.uid()
  or coach_can_manage_team(team_id)
)
with check (
  player_id = auth.uid()
  or coach_can_manage_team(team_id)
);

drop policy if exists "Players and coaches can delete personal goals" on public.personal_goals;
create policy "Players and coaches can delete personal goals"
on public.personal_goals
for delete
using (
  player_id = auth.uid()
  or coach_can_manage_team(team_id)
);

-- Team goals
drop policy if exists "Team members can read team goals" on public.team_goals;
create policy "Team members can read team goals"
on public.team_goals
for select
using (has_team_membership(team_id));

drop policy if exists "Coaches can manage team goals" on public.team_goals;
create policy "Coaches can manage team goals"
on public.team_goals
for all
using (coach_can_manage_team(team_id))
with check (coach_can_manage_team(team_id));

-- Join codes
drop policy if exists "Head coaches can manage join codes" on public.join_codes;
create policy "Head coaches can manage join codes"
on public.join_codes
for all
using (coach_can_manage_team(team_id))
with check (coach_can_manage_team(team_id));

-- Grant table permissions
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all functions in schema public to authenticated;
