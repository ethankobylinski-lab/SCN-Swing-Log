-- Pitch Simulation System
-- Allows coaches to create scripted pitch sequences and assign them to pitchers

-- 1. Simulation Templates (Reusable pitch programs)
create table if not exists public.pitch_simulation_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.users(id),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sim_templates_team on public.pitch_simulation_templates(team_id);
create index if not exists idx_sim_templates_active on public.pitch_simulation_templates(team_id, is_active);

drop trigger if exists trg_sim_templates_updated_at on public.pitch_simulation_templates;
create trigger trg_sim_templates_updated_at
before update on public.pitch_simulation_templates
for each row execute function public.touch_updated_at();

-- 2. Simulation Steps (Ordered pitch instructions within a template)
create table if not exists public.pitch_simulation_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.pitch_simulation_templates(id) on delete cascade,
  order_index integer not null,
  pitch_type_id uuid not null references public.pitch_types(id),
  intended_zone text not null, -- ZoneId ('Z11', 'Z22', etc.)
  created_at timestamptz not null default now(),
  
  constraint unique_template_order unique (template_id, order_index)
);

create index if not exists idx_sim_steps_template on public.pitch_simulation_steps(template_id, order_index);

-- 3. Simulation Assignments (Links templates to pitchers with scheduling)
create table if not exists public.pitch_simulation_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.pitch_simulation_templates(id) on delete cascade,
  pitcher_id uuid references public.users(id) on delete cascade, -- null = team-wide
  team_id uuid not null references public.teams(id) on delete cascade,
  is_recurring boolean not null default false,
  recurring_days text[], -- ['Mon', 'Wed', 'Fri'] or empty
  due_date date, -- for one-time assignments
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sim_assignments_pitcher on public.pitch_simulation_assignments(pitcher_id);
create index if not exists idx_sim_assignments_team on public.pitch_simulation_assignments(team_id);
create index if not exists idx_sim_assignments_template on public.pitch_simulation_assignments(template_id);
create index if not exists idx_sim_assignments_due on public.pitch_simulation_assignments(due_date) where due_date is not null;

drop trigger if exists trg_sim_assignments_updated_at on public.pitch_simulation_assignments;
create trigger trg_sim_assignments_updated_at
before update on public.pitch_simulation_assignments
for each row execute function public.touch_updated_at();

-- 4. Simulation Runs (Instance of pitcher executing a template)
create table if not exists public.pitch_simulation_runs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.pitch_simulation_templates(id),
  pitcher_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_step_index integer not null default 0,
  total_steps integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_runs_pitcher on public.pitch_simulation_runs(pitcher_id);
create index if not exists idx_sim_runs_template on public.pitch_simulation_runs(template_id);
create index if not exists idx_sim_runs_active on public.pitch_simulation_runs(pitcher_id) where completed_at is null;

-- 5. Simulation Run Pitches (Links actual pitch records to simulation steps)
create table if not exists public.pitch_simulation_run_pitches (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.pitch_simulation_runs(id) on delete cascade,
  step_id uuid not null references public.pitch_simulation_steps(id),
  pitch_record_id uuid not null references public.pitch_records(id) on delete cascade,
  is_strike boolean not null,
  hit_intended_zone boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sim_run_pitches_run on public.pitch_simulation_run_pitches(run_id);
create index if not exists idx_sim_run_pitches_step on public.pitch_simulation_run_pitches(step_id);

-- 6. RLS Policies

-- Templates
alter table public.pitch_simulation_templates enable row level security;

create policy "Coaches can manage templates for their teams"
  on public.pitch_simulation_templates for all
  using (public.coach_can_manage_team(team_id))
  with check (public.coach_can_manage_team(team_id));

create policy "Pitchers can view templates assigned to them"
  on public.pitch_simulation_templates for select
  using (
    exists (
      select 1 from public.pitch_simulation_assignments a
      where a.template_id = pitch_simulation_templates.id
      and (a.pitcher_id = auth.uid() or a.pitcher_id is null)
      and a.is_active = true
      and a.team_id in (
        select team_id from public.team_members
        where user_id = auth.uid() and status = 'active'
      )
    )
  );

-- Steps
alter table public.pitch_simulation_steps enable row level security;

create policy "Coaches can manage steps for their templates"
  on public.pitch_simulation_steps for all
  using (
    exists (
      select 1 from public.pitch_simulation_templates t
      where t.id = pitch_simulation_steps.template_id
      and public.coach_can_manage_team(t.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.pitch_simulation_templates t
      where t.id = pitch_simulation_steps.template_id
      and public.coach_can_manage_team(t.team_id)
    )
  );

create policy "Pitchers can view steps for assigned templates"
  on public.pitch_simulation_steps for select
  using (
    exists (
      select 1 from public.pitch_simulation_templates t
      join public.pitch_simulation_assignments a on a.template_id = t.id
      where t.id = pitch_simulation_steps.template_id
      and (a.pitcher_id = auth.uid() or a.pitcher_id is null)
      and a.is_active = true
    )
  );

-- Assignments
alter table public.pitch_simulation_assignments enable row level security;

create policy "Coaches can manage assignments for their teams"
  on public.pitch_simulation_assignments for all
  using (public.coach_can_manage_team(team_id))
  with check (public.coach_can_manage_team(team_id));

create policy "Pitchers can view their assignments"
  on public.pitch_simulation_assignments for select
  using (
    pitcher_id = auth.uid()
    or (pitcher_id is null and public.has_team_membership(team_id))
  );

-- Runs
alter table public.pitch_simulation_runs enable row level security;

create policy "Pitchers can manage their own runs"
  on public.pitch_simulation_runs for all
  using (pitcher_id = auth.uid())
  with check (pitcher_id = auth.uid());

create policy "Coaches can view runs for their teams"
  on public.pitch_simulation_runs for select
  using (public.coach_can_manage_team(team_id));

-- Run Pitches
alter table public.pitch_simulation_run_pitches enable row level security;

create policy "Users can view run pitches for accessible runs"
  on public.pitch_simulation_run_pitches for select
  using (
    exists (
      select 1 from public.pitch_simulation_runs r
      where r.id = pitch_simulation_run_pitches.run_id
      and (r.pitcher_id = auth.uid() or public.coach_can_manage_team(r.team_id))
    )
  );

create policy "Pitchers can insert run pitches for their runs"
  on public.pitch_simulation_run_pitches for insert
  with check (
    exists (
      select 1 from public.pitch_simulation_runs r
      where r.id = pitch_simulation_run_pitches.run_id
      and r.pitcher_id = auth.uid()
    )
  );
