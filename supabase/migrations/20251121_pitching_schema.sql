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
