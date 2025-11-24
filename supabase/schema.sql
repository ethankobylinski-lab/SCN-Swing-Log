-- Supabase schema and row-level security configuration for the HitJournal app.
-- Run this script inside the Supabase SQL editor.

-- 0. General rules & Extensions
create extension if not exists "pgcrypto";

-- Shared trigger function for updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Roles and users
-- 1.1 public.users (Profile)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
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

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

-- 2. Teams and membership
-- 2.1 Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season_year integer not null,
  coach_id uuid not null references public.users(id), -- Head Coach
  primary_color text not null default '#000000',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teams_coach_id on public.teams(coach_id);
create index if not exists idx_teams_created_by on public.teams(created_by);

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams
for each row execute function public.touch_updated_at();

-- 2.2 Team members
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('Player','HeadCoach','AssistantCoach')),
  status text not null default 'active' check (status in ('active','invited','removed')),
  added_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- CLEAN SLATE: Delete all existing data to avoid constraint conflicts
truncate table public.session_feedback cascade;
truncate table public.sessions cascade;
truncate table public.personal_goals cascade;
truncate table public.team_goals cascade;
truncate table public.assignments cascade;
truncate table public.drills cascade;
truncate table public.join_codes cascade;
truncate table public.team_members cascade;
truncate table public.teams cascade;

-- Update check constraint for existing tables
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check check (role in ('Player','HeadCoach','AssistantCoach'));

create index if not exists idx_team_members_user_active on public.team_members(user_id) where status = 'active';
create index if not exists idx_team_members_team_role_active on public.team_members(team_id, role) where status = 'active';
-- Enforce at most one head coach per team
create unique index if not exists idx_team_members_one_head_coach on public.team_members(team_id) where role = 'HeadCoach' and status = 'active';

drop trigger if exists trg_team_members_updated_at on public.team_members;
create trigger trg_team_members_updated_at
before update on public.team_members
for each row execute function public.touch_updated_at();

-- 3. Drills, assignments, sessions, goals
-- 3.1 Drills
create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_id uuid references public.users(id),
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

create index if not exists idx_drills_team_id on public.drills(team_id);
create index if not exists idx_drills_coach_id on public.drills(coach_id);

drop trigger if exists trg_drills_updated_at on public.drills;
create trigger trg_drills_updated_at
before update on public.drills
for each row execute function public.touch_updated_at();

-- 3.2 Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  drill_id uuid references public.drills(id) on delete set null,
  player_ids uuid[] not null default '{}'::uuid[],
  is_recurring boolean not null default false,
  recurring_days text[] not null default '{}'::text[],
  due_date date,
  assigned_date date not null,
  coach_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assignments_team_id on public.assignments(team_id);
create index if not exists idx_assignments_due_date on public.assignments(due_date);
create index if not exists idx_assignments_coach_id on public.assignments(coach_id);

drop trigger if exists trg_assignments_updated_at on public.assignments;
create trigger trg_assignments_updated_at
before update on public.assignments
for each row execute function public.touch_updated_at();

-- 3.3 Sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid not null references public.users(id) on delete cascade,
  drill_id uuid references public.drills(id) on delete set null,
  name text not null,
  date timestamptz not null,
  type text,
  sets jsonb not null default '[]'::jsonb,
  feedback text,
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_edited_by uuid references public.users(id),
  logged_by uuid references public.users(id)
);

create index if not exists idx_sessions_team_id on public.sessions(team_id);
create index if not exists idx_sessions_player_id on public.sessions(player_id);
create index if not exists idx_sessions_date on public.sessions(date);
create index if not exists idx_sessions_drill_id on public.sessions(drill_id);

drop trigger if exists trg_sessions_updated_at on public.sessions;
create trigger trg_sessions_updated_at
before update on public.sessions
for each row execute function public.touch_updated_at();

-- 3.4 Session feedback
create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_id uuid not null references public.users(id),
  reaction text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_feedback_session_id on public.session_feedback(session_id);
create index if not exists idx_session_feedback_team_id on public.session_feedback(team_id);
create index if not exists idx_session_feedback_coach_id on public.session_feedback(coach_id);

drop trigger if exists trg_session_feedback_updated_at on public.session_feedback;
create trigger trg_session_feedback_updated_at
before update on public.session_feedback
for each row execute function public.touch_updated_at();

-- 3.5 Personal goals
create table if not exists public.personal_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
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
  created_by_user_id uuid references public.users(id),
  created_by_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personal_goals_player_id on public.personal_goals(player_id);
create index if not exists idx_personal_goals_team_id on public.personal_goals(team_id);
create index if not exists idx_personal_goals_created_by on public.personal_goals(created_by_user_id);

drop trigger if exists trg_personal_goals_updated_at on public.personal_goals;
create trigger trg_personal_goals_updated_at
before update on public.personal_goals
for each row execute function public.touch_updated_at();

-- 3.6 Team goals
create table if not exists public.team_goals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  description text not null,
  metric text not null,
  target_value numeric not null,
  start_date date not null,
  target_date date not null,
  status text not null,
  drill_type text,
  target_zones text[] not null default '{}'::text[],
  pitch_types text[] not null default '{}'::text[],
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_goals_team_id on public.team_goals(team_id);

drop trigger if exists trg_team_goals_updated_at on public.team_goals;
create trigger trg_team_goals_updated_at
before update on public.team_goals
for each row execute function public.touch_updated_at();

-- 4. Join codes
create table if not exists public.join_codes (
  code text primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  role text not null default 'player' check (role in ('player','coach')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint join_codes_team_role_key unique (team_id, role),
  constraint join_codes_code_upper check (code = upper(code))
);

drop trigger if exists trg_join_codes_updated_at on public.join_codes;
create trigger trg_join_codes_updated_at
before update on public.join_codes
for each row execute function public.touch_updated_at();

-- Join Code Helpers
create or replace function public.generate_join_code()
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

create or replace function public.generate_unique_join_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  candidate text;
begin
  loop
    candidate := public.generate_join_code();
    exit when not exists (select 1 from public.join_codes where code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.ensure_team_join_code(target_team uuid, target_role text, creator uuid default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_role text;
  new_code text;
begin
  if target_team is null then return; end if;
  normalized_role := lower(trim(coalesce(target_role, '')));
  
  if normalized_role not in ('player','coach') then
    raise exception 'invalid role % for join code', target_role;
  end if;

  if exists (select 1 from public.join_codes where team_id = target_team and role = normalized_role) then
    return;
  end if;

  -- Temporarily disable RLS for this function to allow insert
  perform set_config('request.jwt.claim.sub', creator::text, true);
  
  loop
    new_code := upper(public.generate_unique_join_code());
    begin
      insert into public.join_codes (code, team_id, role, created_by)
      values (new_code, target_team, normalized_role, creator);
      exit;
    exception
      when unique_violation then continue;
    end;
  end loop;
end;
$$;

create or replace function public.create_team_join_codes()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  creator uuid := coalesce(auth.uid(), new.created_by, new.coach_id);
begin
  perform public.ensure_team_join_code(new.id, 'player', creator);
  perform public.ensure_team_join_code(new.id, 'coach', creator);
  return new;
end;
$$;

drop trigger if exists trg_teams_create_join_codes on public.teams;
-- TEMPORARILY DISABLED - This trigger is causing timeouts
-- create trigger trg_teams_create_join_codes
-- after insert on public.teams
-- for each row execute function public.create_team_join_codes();

-- 5. Helper functions for security
create or replace function public.current_profile()
returns public.users
language sql
security definer
set search_path = public, extensions
as $$
  select * from public.users where id = auth.uid();
$$;

create or replace function public.is_coach()
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  profile public.users;
begin
  select * into profile from public.users where id = auth.uid();
  if profile.id is null then return false; end if;
  return profile.role = 'Coach';
end;
$$;

create or replace function public.has_team_membership(team uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists(
    select 1 from public.team_members tm
    where tm.team_id = team
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

create or replace function public.is_head_coach(team uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists(select 1 from public.teams where id = team and coach_id = auth.uid());
$$;

create or replace function public.coach_can_manage_team(team uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists(
    select 1 from public.team_members tm
    where tm.team_id = team
      and tm.user_id = auth.uid()
      and tm.role in ('HeadCoach','AssistantCoach')
      and tm.status = 'active'
  );
$$;

create or replace function public.coach_can_view_user(target_user uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists(
    select 1
    from public.team_members coach
    join public.team_members teammate on teammate.team_id = coach.team_id
    where coach.user_id = auth.uid()
      and coach.role in ('HeadCoach','AssistantCoach')
      and coach.status = 'active'
      and teammate.user_id = target_user
      and teammate.status = 'active'
  );
$$;

create or replace function public.head_coach_can_manage_user(target_user uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists(
    select 1
    from public.teams t
    join public.team_members teammate on teammate.team_id = t.id
    where t.coach_id = auth.uid()
      and teammate.user_id = target_user
      and teammate.status = 'active'
  );
$$;

create or replace function public.refresh_user_membership_arrays(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p_ids uuid[];
  c_ids uuid[];
begin
  if target_user is null then return; end if;

  select
    coalesce(array_agg(tm.team_id) filter (where tm.role = 'Player' and tm.status = 'active'), '{}'::uuid[]),
    coalesce(array_agg(tm.team_id) filter (where tm.role in ('HeadCoach','AssistantCoach') and tm.status = 'active'), '{}'::uuid[])
  into p_ids, c_ids
  from public.team_members tm
  where tm.user_id = target_user;

  update public.users
  set team_ids = p_ids, coach_team_ids = c_ids
  where id = target_user;
end;
$$;

create or replace function public.handle_team_member_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  affected_user uuid;
begin
  if tg_op = 'DELETE' then
    affected_user := old.user_id;
  else
    affected_user := new.user_id;
  end if;
  perform public.refresh_user_membership_arrays(affected_user);
  return null;
end;
$$;

drop trigger if exists trg_team_members_sync on public.team_members;
create trigger trg_team_members_sync
after insert or update or delete on public.team_members
for each row execute function public.handle_team_member_change();

-- One-time seed (idempotent-ish)
-- ONE-TIME MIGRATION BLOCK (COMMENTED OUT - Only needed for initial migration)
-- If you're applying this schema to a fresh database, you can uncomment this block
-- to seed team_members from existing teams.coach_id data
/*
do $$
begin
  -- Seed HeadCoach from teams if missing
  insert into public.team_members (team_id, user_id, role, status, added_by)
  select id, coach_id, 'HeadCoach', 'active', coach_id
  from public.teams
  where coach_id is not null
  on conflict (team_id, user_id) do nothing;
  
  -- Refresh all users
  perform public.refresh_user_membership_arrays(id) from public.users;
end;
$$;
*/

-- 6. Team ownership and seeding membership
create or replace function public.set_team_owner()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  actor uuid := auth.uid();
begin
  if new.created_by is null then
    new.created_by := coalesce(actor, new.coach_id);
  end if;
  if new.coach_id is null then
    new.coach_id := coalesce(actor, new.created_by);
  end if;
  if new.coach_id is null then
    raise exception 'coach_id is required when creating a team';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_teams_set_owner on public.teams;
create trigger trg_teams_set_owner
before insert on public.teams
for each row execute function public.set_team_owner();

create or replace function public.seed_team_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.coach_id is not null then
    insert into public.team_members (team_id, user_id, role, status, added_by)
    values (new.id, new.coach_id, 'HeadCoach', 'active', coalesce(auth.uid(), new.created_by, new.coach_id))
    on conflict (team_id, user_id) do update
      set role = 'HeadCoach', status = 'active', updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_teams_seed_membership on public.teams;
-- TEMPORARILY DISABLED - This trigger is causing timeouts
-- create trigger trg_teams_seed_membership
-- after insert on public.teams
-- for each row execute function public.seed_team_owner_membership();

-- 7. RPC functions
-- 7.1 create_team (SIMPLIFIED - NO HELPER FUNCTIONS)
create or replace function public.create_team(team_name text, team_season_year integer, team_primary_color text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_team_row public.teams;
  p_code text;
  c_code text;
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Insert team
  insert into public.teams (name, season_year, primary_color, coach_id, created_by)
  values (
    team_name,
    team_season_year,
    coalesce(nullif(trim(team_primary_color), ''), '#000000'),
    current_user_id,
    current_user_id
  )
  returning * into new_team_row;

  -- Create HeadCoach membership (since we disabled the trigger)
  insert into public.team_members (team_id, user_id, role, status, added_by)
  values (new_team_row.id, current_user_id, 'HeadCoach', 'active', current_user_id)
  on conflict (team_id, user_id) do nothing;

  -- Generate simple random codes directly (no helper functions)
  p_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  c_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  
  -- Insert join codes directly
  insert into public.join_codes (code, team_id, role, created_by)
  values (p_code, new_team_row.id, 'player', current_user_id);
  
  insert into public.join_codes (code, team_id, role, created_by)
  values (c_code, new_team_row.id, 'coach', current_user_id);

  return jsonb_build_object(
    'team', row_to_json(new_team_row),
    'codes', jsonb_build_object(
      'player', p_code,
      'coach', c_code
    )
  );
end;
$$;

-- 7.2 join_team_with_code
-- 7.2 join_team_with_code
-- Drop existing function first to allow return type changes
drop function if exists public.join_team_with_code(text, text);
drop function if exists public.join_team_with_code(text);

create or replace function public.join_team_with_code(p_join_code text, p_join_as text default null)
returns table (
  id uuid,
  name text,
  season_year integer,
  coach_id uuid,
  primary_color text,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  player_team_ids uuid[],
  coach_team_ids uuid[],
  membership_role text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_code text;
  target_role text;
  target_team_id uuid;
  user_role text;
  final_role text;
  user_rec public.users;
begin
  normalized_code := upper(trim(p_join_code));
  if normalized_code = '' then raise exception 'Code required'; end if;
  
  target_role := lower(coalesce(p_join_as, 'player'));
  if target_role not in ('player','coach') then raise exception 'Invalid join_as role'; end if;

  -- Find team
  select team_id into target_team_id
  from public.join_codes
  where code = normalized_code and role = target_role;

  if target_team_id is null then
    raise exception 'Invalid join code';
  end if;

  -- Check user profile
  select * into user_rec from public.users u where u.id = auth.uid();
  if user_rec.id is null then raise exception 'User profile not found'; end if;

  if target_role = 'coach' and user_rec.role <> 'Coach' then
    raise exception 'Only users with Coach role can join as coach';
  end if;
  if target_role = 'player' and user_rec.role <> 'Player' then
    raise exception 'Only users with Player role can join as player';
  end if;

  -- Determine membership role
  if target_role = 'player' then
    final_role := 'Player';
  else
    -- If joining as coach, check if HeadCoach exists
    if not exists (select 1 from public.team_members where team_id = target_team_id and role = 'HeadCoach' and status = 'active') then
      final_role := 'HeadCoach';
    else
      final_role := 'AssistantCoach';
    end if;
  end if;

  -- Upsert membership
  insert into public.team_members (team_id, user_id, role, status, added_by)
  values (target_team_id, auth.uid(), final_role, 'active', auth.uid())
  on conflict (team_id, user_id) do update
    set role = final_role, status = 'active', updated_at = now();

  perform public.refresh_user_membership_arrays(auth.uid());

  return query
  select
    t.id as id, t.name, t.season_year, t.coach_id, t.primary_color, t.created_at, t.updated_at, t.created_by,
    u.team_ids, u.coach_team_ids,
    final_role as membership_role
  from public.teams t
  cross join public.users u
  where t.id = target_team_id and u.id = auth.uid();
end;
$$;

-- 7.3 leave_team
create or replace function public.leave_team(team_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.team_members
  set status = 'removed', updated_at = now()
  where team_id = leave_team.team_id and user_id = auth.uid();
  
  perform public.refresh_user_membership_arrays(auth.uid());
end;
$$;

-- 7.4 list_my_teams
create or replace function public.list_my_teams()
returns table (
  team_id uuid,
  team_name text,
  season_year integer,
  coach_id uuid,
  primary_color text,
  membership_role text,
  team_created_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    t.id, t.name, t.season_year, t.coach_id, t.primary_color,
    tm.role as membership_role,
    t.created_at
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
    and tm.status = 'active';
$$;

-- 7.5 promote_or_demote_coach
create or replace function public.promote_or_demote_coach(team_id uuid, target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new_role not in ('HeadCoach','AssistantCoach') then
    raise exception 'Invalid role';
  end if;

  -- Check auth user is HeadCoach
  if not exists (select 1 from public.teams where id = promote_or_demote_coach.team_id and coach_id = auth.uid()) then
    raise exception 'Only Head Coach can promote/demote';
  end if;

  -- Check target is active coach
  if not exists (select 1 from public.team_members where team_id = promote_or_demote_coach.team_id and user_id = target_user and role in ('HeadCoach','AssistantCoach') and status = 'active') then
    raise exception 'Target user is not an active coach on this team';
  end if;

  if new_role = 'HeadCoach' then
    -- Demote current (me)
    update public.team_members set role = 'AssistantCoach', updated_at = now()
    where team_id = promote_or_demote_coach.team_id and user_id = auth.uid();
    
    -- Promote target
    update public.team_members set role = 'HeadCoach', updated_at = now()
    where team_id = promote_or_demote_coach.team_id and user_id = target_user;
    
    -- Update team pointer
    update public.teams set coach_id = target_user, updated_at = now()
    where id = promote_or_demote_coach.team_id;
  else
    -- Just set target to Assistant
    update public.team_members set role = 'AssistantCoach', updated_at = now()
    where team_id = promote_or_demote_coach.team_id and user_id = target_user;
  end if;
  
  perform public.refresh_user_membership_arrays(auth.uid());
  perform public.refresh_user_membership_arrays(target_user);
end;
$$;

-- 8. Row-Level Security (RLS)
-- Drop all existing policies first to avoid conflicts
do $$ 
declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname 
    from pg_policies 
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.drills enable row level security;
alter table public.assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.session_feedback enable row level security;
alter table public.personal_goals enable row level security;
alter table public.team_goals enable row level security;
alter table public.join_codes enable row level security;

-- 8.1 Users
create policy "Users can select themselves" on public.users for select using (id = auth.uid());
create policy "Coaches can view their team members" on public.users for select using (public.coach_can_view_user(id));
create policy "Users can insert themselves" on public.users for insert with check (id = auth.uid());
create policy "Users can update themselves" on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Head coaches can manage coaches they added" on public.users for update using (id = auth.uid() or public.head_coach_can_manage_user(id)) with check (id = auth.uid() or public.head_coach_can_manage_user(id));

-- 8.2 Teams
create policy "Team members can read team data" on public.teams for select using (public.has_team_membership(id) or coach_id = auth.uid());
create policy "Coaches can create teams" on public.teams for insert with check (auth.uid() is not null and coalesce(coach_id, auth.uid()) = auth.uid() and coalesce(created_by, auth.uid()) = auth.uid());
create policy "Head coaches can update their team" on public.teams for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "Head coaches can delete their team" on public.teams for delete using (coach_id = auth.uid());

-- 8.3 Team members
create policy "Members can view memberships" on public.team_members for select using (user_id = auth.uid() or public.coach_can_manage_team(team_id));
create policy "Coaches can add memberships" on public.team_members for insert with check (public.coach_can_manage_team(team_id));
create policy "Coaches can manage memberships" on public.team_members for update using (public.coach_can_manage_team(team_id)) with check (public.coach_can_manage_team(team_id));
create policy "Coaches can remove memberships" on public.team_members for delete using (public.coach_can_manage_team(team_id));
create policy "Members can leave teams" on public.team_members for delete using (user_id = auth.uid());

-- 8.4 Drills
create policy "Team members can read drills" on public.drills for select using (public.has_team_membership(team_id));
create policy "Coaches can manage drills" on public.drills for all using (public.coach_can_manage_team(team_id)) with check (public.coach_can_manage_team(team_id));

-- 8.5 Assignments
create policy "Team members can read assignments" on public.assignments for select using (public.has_team_membership(team_id));
create policy "Coaches can manage assignments" on public.assignments for all using (public.coach_can_manage_team(team_id)) with check (public.coach_can_manage_team(team_id));

-- 8.6 Sessions
create policy "Players and coaches can read sessions" on public.sessions for select using (player_id = auth.uid() or (team_id is not null and public.coach_can_manage_team(team_id)));
create policy "Players can create their own sessions" on public.sessions for insert with check (player_id = auth.uid());
create policy "Players can update their own sessions" on public.sessions for update using (player_id = auth.uid()) with check (player_id = auth.uid());
create policy "Players can delete their sessions" on public.sessions for delete using (player_id = auth.uid());

-- 8.7 Session feedback
create policy "Team members can read feedback" on public.session_feedback for select using (public.has_team_membership(team_id));
create policy "Only coaches can add feedback" on public.session_feedback for insert with check (public.coach_can_manage_team(team_id));
create policy "Coaches can manage their own feedback" on public.session_feedback for update using (coach_id = auth.uid() and public.coach_can_manage_team(team_id)) with check (coach_id = auth.uid() and public.coach_can_manage_team(team_id));
create policy "Coaches can delete their own feedback" on public.session_feedback for delete using (coach_id = auth.uid() and public.coach_can_manage_team(team_id));

-- 8.8 Personal goals
create policy "Personal goals visible to player and coaches" on public.personal_goals for select using (player_id = auth.uid() or public.coach_can_manage_team(team_id));
create policy "Players manage their own personal goals" on public.personal_goals for all using (player_id = auth.uid()) with check (player_id = auth.uid());

-- 8.9 Team goals
create policy "Team goals visible to members" on public.team_goals for select using (public.has_team_membership(team_id));
create policy "Coaches manage team goals" on public.team_goals for all using (public.coach_can_manage_team(team_id)) with check (public.coach_can_manage_team(team_id));

-- 8.10 Join codes
create policy "Anyone can lookup join codes" on public.join_codes for select using (true);
create policy "Coaches can view join codes" on public.join_codes for select using (public.coach_can_manage_team(team_id));
create policy "System can create join codes" on public.join_codes for insert with check (created_by is not null or public.coach_can_manage_team(team_id));

-- 9. Grants
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all functions in schema public to authenticated;
-- 10. Pitching Module

-- 10.1 Pitch Types
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

-- 10.2 Team Settings
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

-- 10.3 Pitch Sessions
create table if not exists public.pitch_sessions (
  id uuid primary key default gen_random_uuid(),
  pitcher_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  catcher_id uuid references public.users(id) on delete set null,
  session_name text not null,
  session_type text not null,
  game_situation_enabled boolean not null default false,
  pitch_goals jsonb not null default '[]'::jsonb,
  total_pitches integer not null default 0,
  session_start_time timestamptz not null default now(),
  session_end_time timestamptz,
  rest_hours_required numeric,
  rest_end_time timestamptz,
  analytics jsonb,
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

-- 10.4 Pitch Records
create table if not exists public.pitch_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  index integer not null,
  batter_side text not null,
  balls_before integer not null,
  strikes_before integer not null,
  runners_on jsonb not null default '{"on1b": false, "on2b": false, "on3b": false}'::jsonb,
  outs integer not null,
  pitch_type_id uuid not null references public.pitch_types(id),
  target_zone text not null,
  target_x_norm numeric,
  target_y_norm numeric,
  actual_zone text not null,
  actual_x_norm numeric,
  actual_y_norm numeric,
  velocity_mph numeric,
  outcome text not null,
  in_play_quality text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pitch_records_session_id on public.pitch_records(session_id);

-- 10.5 RLS for Pitching

-- Pitch Types
alter table public.pitch_types enable row level security;
create policy "Pitchers can view their own pitch types" on public.pitch_types for select using (pitcher_id = auth.uid());
create policy "Coaches can view pitch types of their players" on public.pitch_types for select using (
  exists (
    select 1 from public.team_members tm
    where tm.user_id = public.pitch_types.pitcher_id
    and public.coach_can_manage_team(tm.team_id)
  )
);
create policy "Pitchers can manage their own pitch types" on public.pitch_types for all using (pitcher_id = auth.uid()) with check (pitcher_id = auth.uid());

-- Team Settings
alter table public.team_settings enable row level security;
create policy "Team members can view settings" on public.team_settings for select using (public.has_team_membership(team_id));
create policy "Coaches can manage settings" on public.team_settings for all using (public.coach_can_manage_team(team_id)) with check (public.coach_can_manage_team(team_id));

-- Pitch Sessions
alter table public.pitch_sessions enable row level security;
create policy "Pitchers can view their own sessions" on public.pitch_sessions for select using (pitcher_id = auth.uid());
create policy "Coaches can view team sessions" on public.pitch_sessions for select using (public.coach_can_manage_team(team_id));
create policy "Pitchers can insert their own sessions" on public.pitch_sessions for insert with check (pitcher_id = auth.uid());
create policy "Pitchers can update their own sessions" on public.pitch_sessions for update using (pitcher_id = auth.uid());
create policy "Pitchers can delete their own sessions" on public.pitch_sessions for delete using (pitcher_id = auth.uid());

-- Pitch Records
alter table public.pitch_records enable row level security;
create policy "Users can view records for visible sessions" on public.pitch_records for select using (
  exists (
    select 1 from public.pitch_sessions s
    where s.id = public.pitch_records.session_id
    and (s.pitcher_id = auth.uid() or public.coach_can_manage_team(s.team_id))
  )
);
create policy "Pitchers can insert records" on public.pitch_records for insert with check (
  exists (
    select 1 from public.pitch_sessions s
    where s.id = public.pitch_records.session_id
    and s.pitcher_id = auth.uid()
  )
);
create policy "Pitchers can update records" on public.pitch_records for update using (
  exists (
    select 1 from public.pitch_sessions s
    where s.id = public.pitch_records.session_id
    and s.pitcher_id = auth.uid()
  )
);
create policy "Pitchers can delete records" on public.pitch_records for delete using (
  exists (
    select 1 from public.pitch_sessions s
    where s.id = public.pitch_records.session_id
    and s.pitcher_id = auth.uid()
  )
);

-- 10.6 RPC: record_pitch_atomic
drop function if exists public.record_pitch_atomic(uuid,integer,text,integer,integer,jsonb,integer,uuid,text,numeric,numeric,text,numeric,numeric,numeric,text,text);

create or replace function public.record_pitch_atomic(
  p_session_id uuid,
  p_index integer,
  p_batter_side text,
  p_balls_before integer,
  p_strikes_before integer,
  p_runners_on jsonb,
  p_outs integer,
  p_pitch_type_id uuid,
  p_target_zone text,
  p_target_x_norm numeric,
  p_target_y_norm numeric,
  p_actual_zone text,
  p_actual_x_norm numeric,
  p_actual_y_norm numeric,
  p_velocity_mph numeric,
  p_outcome text,
  p_in_play_quality text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pitcher_id uuid;
  v_new_record_id uuid;
begin
  -- Verify session ownership
  select pitcher_id into v_pitcher_id
  from public.pitch_sessions
  where id = p_session_id;

  if v_pitcher_id is null then
    return jsonb_build_object('success', false, 'error', 'Session not found');
  end if;

  if v_pitcher_id != auth.uid() then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  -- Insert pitch record
  insert into public.pitch_records (
    session_id, index, batter_side, balls_before, strikes_before, runners_on, outs,
    pitch_type_id, target_zone, target_x_norm, target_y_norm,
    actual_zone, actual_x_norm, actual_y_norm, velocity_mph, outcome, in_play_quality
  ) values (
    p_session_id, p_index, p_batter_side, p_balls_before, p_strikes_before, p_runners_on, p_outs,
    p_pitch_type_id, p_target_zone, p_target_x_norm, p_target_y_norm,
    p_actual_zone, p_actual_x_norm, p_actual_y_norm, p_velocity_mph, p_outcome, p_in_play_quality
  ) returning id into v_new_record_id;

  -- Update session total pitches
  update public.pitch_sessions
  set total_pitches = total_pitches + 1,
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object('success', true, 'id', v_new_record_id);
end;
$$;
-- Fix RLS policies for pitching to allow coaches to manage sessions

-- 1. Pitch Sessions
-- Drop existing restrictive policies
drop policy if exists "Pitchers can insert their own sessions" on public.pitch_sessions;
drop policy if exists "Pitchers can update their own sessions" on public.pitch_sessions;
drop policy if exists "Pitchers can delete their own sessions" on public.pitch_sessions;
drop policy if exists "Coaches can view team sessions" on public.pitch_sessions;

-- Add comprehensive policies
create policy "Pitchers can manage their own sessions" on public.pitch_sessions
  for all
  using (pitcher_id = auth.uid())
  with check (pitcher_id = auth.uid());

create policy "Coaches can manage team sessions" on public.pitch_sessions
  for all
  using (public.coach_can_manage_team(team_id))
  with check (public.coach_can_manage_team(team_id));

-- 2. Pitch Records
-- Drop existing restrictive policies
drop policy if exists "Pitchers can insert records" on public.pitch_records;
drop policy if exists "Pitchers can update records" on public.pitch_records;
drop policy if exists "Pitchers can delete records" on public.pitch_records;

-- Add comprehensive policies
create policy "Pitchers can manage records" on public.pitch_records
  for all
  using (
    exists (
      select 1 from public.pitch_sessions s
      where s.id = public.pitch_records.session_id
      and s.pitcher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.pitch_sessions s
      where s.id = public.pitch_records.session_id
      and s.pitcher_id = auth.uid()
    )
  );

create policy "Coaches can manage records" on public.pitch_records
  for all
  using (
    exists (
      select 1 from public.pitch_sessions s
      where s.id = public.pitch_records.session_id
      and public.coach_can_manage_team(s.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.pitch_sessions s
      where s.id = public.pitch_records.session_id
      and public.coach_can_manage_team(s.team_id)
    )
  );

-- 3. Update RPC to allow coaches
create or replace function public.record_pitch_atomic(
  p_session_id uuid,
  p_index integer,
  p_batter_side text,
  p_balls_before integer,
  p_strikes_before integer,
  p_runners_on jsonb,
  p_outs integer,
  p_pitch_type_id uuid,
  p_target_zone text,
  p_target_x_norm numeric,
  p_target_y_norm numeric,
  p_actual_zone text,
  p_actual_x_norm numeric,
  p_actual_y_norm numeric,
  p_velocity_mph numeric,
  p_outcome text,
  p_in_play_quality text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pitcher_id uuid;
  v_team_id uuid;
  v_new_record_id uuid;
begin
  -- Verify session ownership or coach access
  select pitcher_id, team_id into v_pitcher_id, v_team_id
  from public.pitch_sessions
  where id = p_session_id;

  if v_pitcher_id is null then
    return jsonb_build_object('success', false, 'error', 'Session not found');
  end if;

  -- Check if user is the pitcher OR a coach of the team
  if v_pitcher_id != auth.uid() and not public.coach_can_manage_team(v_team_id) then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  -- Insert pitch record
  insert into public.pitch_records (
    session_id, index, batter_side, balls_before, strikes_before, runners_on, outs,
    pitch_type_id, target_zone, target_x_norm, target_y_norm,
    actual_zone, actual_x_norm, actual_y_norm, velocity_mph, outcome, in_play_quality
  ) values (
    p_session_id, p_index, p_batter_side, p_balls_before, p_strikes_before, p_runners_on, p_outs,
    p_pitch_type_id, p_target_zone, p_target_x_norm, p_target_y_norm,
    p_actual_zone, p_actual_x_norm, p_actual_y_norm, p_velocity_mph, p_outcome, p_in_play_quality
  ) returning id into v_new_record_id;

  -- Update session total pitches
  update public.pitch_sessions
  set total_pitches = total_pitches + 1,
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object('success', true, 'id', v_new_record_id);
end;
$$;
