-- Helper functions and triggers for the HitJournal Supabase project.
-- Run this after deploying the schema to ensure all procedural logic is in place.

begin;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Updated-at triggers --------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_users_updated_at') then
    create trigger trg_users_updated_at
    before update on public.users
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_teams_updated_at') then
    create trigger trg_teams_updated_at
    before update on public.teams
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_team_members_updated_at') then
    create trigger trg_team_members_updated_at
    before update on public.team_members
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_drills_updated_at') then
    create trigger trg_drills_updated_at
    before update on public.drills
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_assignments_updated_at') then
    create trigger trg_assignments_updated_at
    before update on public.assignments
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_sessions_updated_at') then
    create trigger trg_sessions_updated_at
    before update on public.sessions
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_personal_goals_updated_at') then
    create trigger trg_personal_goals_updated_at
    before update on public.personal_goals
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_team_goals_updated_at') then
    create trigger trg_team_goals_updated_at
    before update on public.team_goals
    for each row execute function public.touch_updated_at();
  end if;
end $$;


do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_join_codes_updated_at') then
    create trigger trg_join_codes_updated_at
    before update on public.join_codes
    for each row execute function public.touch_updated_at();
  end if;
end $$;

-- Join-code helpers ----------------------------------------------------------
create or replace function public.generate_join_code()
returns text
language sql
immutable
set search_path = public
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

create or replace function public.generate_unique_join_code()
returns text
language plpgsql
security definer
set search_path = public
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
set search_path = public
as $$
declare
  normalized_role text;
  new_code text;
begin
  if target_team is null then
    return;
  end if;

  normalized_role := lower(trim(coalesce(target_role, '')));
  if normalized_role not in ('player','coach') then
    raise exception 'invalid role % for join code', target_role;
  end if;

  if exists (
    select 1 from public.join_codes
    where team_id = target_team and role = normalized_role
  ) then
    return;
  end if;

  loop
    new_code := public.generate_unique_join_code();
    begin
      insert into public.join_codes (code, team_id, role, created_by)
      values (new_code, target_team, normalized_role, creator);
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;
end;
$$;

create or replace function public.create_team_join_codes()
returns trigger
language plpgsql
security definer
set search_path = public
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
create trigger trg_teams_create_join_codes
after insert on public.teams
for each row execute function public.create_team_join_codes();

-- Membership helpers ---------------------------------------------------------
create or replace function public.refresh_user_membership_arrays(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  player_ids uuid[] := '{}'::uuid[];
  coach_ids uuid[] := '{}'::uuid[];
begin
  if target_user is null then
    return;
  end if;

  select
    coalesce(array_agg(tm.team_id order by tm.created_at)
      filter (where tm.role = 'Player' and tm.status = 'active'), '{}'::uuid[]),
    coalesce(array_agg(tm.team_id order by tm.created_at)
      filter (where tm.role = 'Coach' and tm.status = 'active'), '{}'::uuid[])
  into player_ids, coach_ids
  from public.team_members tm
  where tm.user_id = target_user;

  update public.users
  set team_ids = coalesce(player_ids, '{}'::uuid[]),
      coach_team_ids = coalesce(coach_ids, '{}'::uuid[])
  where id = target_user;
end;
$$;

create or replace function public.handle_team_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.set_team_owner()
returns trigger
language plpgsql
security definer
set search_path = public
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

  if new.created_by is null then
    new.created_by := new.coach_id;
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
set search_path = public
as $$
begin
  if new.coach_id is not null then
    insert into public.team_members (team_id, user_id, role, status, added_by)
    values (new.id, new.coach_id, 'Coach', 'active', coalesce(auth.uid(), new.created_by, new.coach_id))
    on conflict (team_id, user_id) do update
      set role = excluded.role,
          status = 'active',
          updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_teams_seed_membership on public.teams;
create trigger trg_teams_seed_membership
after insert on public.teams
for each row execute function public.seed_team_owner_membership();

-- Access helper functions ----------------------------------------------------
create or replace function public.array_overlap(a anyarray, b anyarray)
returns boolean
language sql
immutable
set search_path = public
as $$ select coalesce(a && b, false); $$;

create or replace function public.current_profile()
returns public.users
language sql
security definer
set search_path = public
as $$ select users.* from public.users where id = auth.uid(); $$;

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
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.team_members tm
    where tm.team_id = team and tm.user_id = auth.uid() and tm.status = 'active'
  );
$$;

create or replace function public.coach_can_manage_team(team uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.team_members tm
    where tm.team_id = team
      and tm.user_id = auth.uid()
      and tm.role = 'Coach'
      and tm.status = 'active'
  )
  or exists(select 1 from public.teams t where t.id = team and t.coach_id = auth.uid());
$$;

create or replace function public.is_head_coach(team uuid)
returns boolean
language sql
security definer
set search_path = public
as $$ select exists(select 1 from public.teams where id = team and coach_id = auth.uid()); $$;

create or replace function public.coach_can_view_user(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.team_members coach
    join public.team_members teammate on teammate.team_id = coach.team_id
    where coach.user_id = auth.uid()
      and coach.role = 'Coach'
      and coach.status = 'active'
      and teammate.user_id = target_user
      and teammate.status = 'active'
  );
$$;

create or replace function public.head_coach_can_manage_user(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.teams t
    join public.team_members tm on tm.team_id = t.id
    where t.coach_id = auth.uid()
      and tm.user_id = target_user
      and tm.status = 'active'
  );
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

  select t.* into resolved_team
  from public.join_codes jc
  join public.teams t on t.id = jc.team_id
  where upper(jc.code) = normalized
    and jc.role = resolved_role
  limit 1;

  return resolved_team;
end;
$$;

create or replace function public.create_team(team_name text, team_season_year integer, team_primary_color text default null)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_team public.teams%rowtype;
begin
  perform set_config('statement_timeout', '60000', true);

  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  if not is_coach() then
    raise exception 'only coaches can create teams';
  end if;

  insert into public.teams (name, season_year, primary_color, coach_id, created_by)
  values (
    team_name,
    team_season_year,
    coalesce(nullif(trim(team_primary_color), ''), '#000000'),
    current_user_id,
    current_user_id
  )
  returning * into new_team;

  insert into public.team_members (team_id, user_id, role, status, added_by)
  values (new_team.id, current_user_id, 'Coach', 'active', current_user_id)
  on conflict (team_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        updated_at = now();

  perform public.refresh_user_membership_arrays(current_user_id);
  return new_team;
end;
$$;

create or replace function public.join_team_with_code(join_code text, join_role text default null)
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
  coach_team_ids uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := upper(trim(coalesce(join_code, '')));
  normalized_role text := lower(coalesce(join_role, 'player'));
  team_record public.teams%rowtype;
  membership_role text;
  joined_user public.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if normalized_code = '' then
    raise exception 'join code required';
  end if;

  if normalized_role not in ('player', 'coach') then
    raise exception 'invalid role %', join_role;
  end if;

  select * into team_record
  from public.join_codes jc
  join public.teams t on t.id = jc.team_id
  where upper(jc.code) = normalized_code
    and jc.role = normalized_role
  limit 1;

  if team_record.id is null then
    raise exception 'invalid join code';
  end if;

  select * into joined_user from public.users where id = auth.uid();
  if joined_user.id is null then
    raise exception 'profile required';
  end if;

  if normalized_role = 'coach' and joined_user.role <> 'Coach' then
    raise exception 'only coaches can join as coaches';
  elsif normalized_role = 'player' and joined_user.role <> 'Player' then
    raise exception 'only players can join as players';
  end if;

  membership_role := case normalized_role when 'coach' then 'Coach' else 'Player' end;

  insert into public.team_members (team_id, user_id, role, status, added_by)
  values (team_record.id, joined_user.id, membership_role, 'active', joined_user.id)
  on conflict (team_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        updated_at = now();

  perform public.refresh_user_membership_arrays(joined_user.id);
  select * into joined_user from public.users where id = joined_user.id;

  return query
    select
      team_record.id,
      team_record.name,
      team_record.season_year,
      team_record.coach_id,
      team_record.primary_color,
      team_record.created_at,
      team_record.updated_at,
      team_record.created_by,
      coalesce(joined_user.team_ids, '{}'::uuid[]),
      coalesce(joined_user.coach_team_ids, '{}'::uuid[]);
end;
$$;

commit;
