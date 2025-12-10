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
