-- Row-level security policies for HitJournal Supabase tables.
-- Apply this after running the schema and trigger scripts.

begin;

alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.drills enable row level security;
alter table public.assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.personal_goals enable row level security;
alter table public.team_goals enable row level security;
alter table public.join_codes enable row level security;

-- Users ----------------------------------------------------------------------
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

-- Teams ----------------------------------------------------------------------
drop policy if exists "Team members can read team data" on public.teams;
create policy "Team members can read team data"
on public.teams
for select
using (has_team_membership(id) or coach_id = auth.uid());

drop policy if exists "Coaches can create teams" on public.teams;
create policy "Coaches can create teams"
on public.teams
for insert
with check (
  auth.uid() is not null
  and coalesce(coach_id, auth.uid()) = auth.uid()
  and coalesce(created_by, auth.uid()) = auth.uid()
);

drop policy if exists "Head coaches can update their team" on public.teams;
create policy "Head coaches can update their team"
on public.teams
for update
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

drop policy if exists "Head coaches can delete their team" on public.teams;
create policy "Head coaches can delete their team"
on public.teams
for delete
using (coach_id = auth.uid());

-- Team members ---------------------------------------------------------------
drop policy if exists "Members can view memberships" on public.team_members;
create policy "Members can view memberships"
on public.team_members
for select
using (
  user_id = auth.uid()
  or coach_can_manage_team(team_id)
);

drop policy if exists "Coaches can add memberships" on public.team_members;
create policy "Coaches can add memberships"
on public.team_members
for insert
with check (coach_can_manage_team(team_id));

drop policy if exists "Coaches can manage memberships" on public.team_members;
create policy "Coaches can manage memberships"
on public.team_members
for update
using (coach_can_manage_team(team_id))
with check (coach_can_manage_team(team_id));

drop policy if exists "Coaches can remove memberships" on public.team_members;
create policy "Coaches can remove memberships"
on public.team_members
for delete
using (coach_can_manage_team(team_id));

drop policy if exists "Members can leave teams" on public.team_members;
create policy "Members can leave teams"
on public.team_members
for delete
using (user_id = auth.uid());

-- Drills ---------------------------------------------------------------------
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

-- Assignments ----------------------------------------------------------------
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

-- Sessions -------------------------------------------------------------------
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

-- Personal goals -------------------------------------------------------------
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

-- Team goals -----------------------------------------------------------------
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

-- Join codes -----------------------------------------------------------------
drop policy if exists "Head coaches can view join codes" on public.join_codes;
create policy "Head coaches can view join codes"
on public.join_codes
for select
using (coach_can_manage_team(team_id));

commit;
