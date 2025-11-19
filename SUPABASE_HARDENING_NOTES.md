# Supabase Hardening Notes

## What the Lints Flagged
- **Missing write metadata**: `public.teams` lacked an `updated_at` column/trigger so concurrent updates and auditing were impossible.
- **Membership drift**: team ownership relied on clients updating `users.team_ids`, so foreign-key backed membership tables were bypassed and RLS helpers could desync.
- **Slow scans**: frequently filtered columns (`team_id`, `player_id`, `created_at`, etc.) had no indexes which surfaced as sequential-scan and timeout warnings.
- **Join flow gaps**: direct client writes to `users` bypassed server-side checks, risking RLS violations during join/leave/remove coach flows.

## What Changed
1. **Schema + Performance (supabase/supabase_migration_fix.sql)**
   - Ensured every core table exists with the expected columns (including `teams.updated_at`).
   - Added the canonical `team_members` table with FK-backed memberships and backfilled data from legacy arrays.
   - Created btree indexes for every FK/lookup column flagged by Supabase (teams, drills, assignments, sessions, personal_goals, team_goals).
2. **Triggers & Functions (supabase/supabase_triggers_functions.sql)**
   - Standardized `touch_updated_at` triggers for all tables.
   - Hardened join-code helpers plus new `seed_team_owner_membership` trigger so every team insert automatically provisions the coach membership.
   - Centralized membership syncing via `refresh_user_membership_arrays` and secured `create_team` / `join_team_with_code` RPCs.
3. **RLS Policies (supabase/supabase_rls_policies.sql)**
   - Enabled RLS on all tables and rewrote policies to depend on the `team_members` table + helper functions (no more broad `auth.role = 'authenticated'` checks).
4. **Client Alignment (contexts/DataContext.tsx)**
   - Staff removal now deletes from `public.team_members`, eliminating the fragile `coach_team_ids` manipulation.
   - All join/leave/create flows already rely on the RPCs and server triggers, so the frontend simply updates state from the canonical arrays the database returns.

## How to Apply
1. **Run the migration file** inside the Supabase SQL editor (or `psql`):
   ```sql
   \i supabase/supabase_migration_fix.sql
   ```
2. **Load the procedural logic**:
   ```sql
   \i supabase/supabase_triggers_functions.sql
   ```
3. **Reapply the RLS policies**:
   ```sql
   \i supabase/supabase_rls_policies.sql
   ```
4. Deploy the updated frontend so the new membership flows are used everywhere.

## Operational Notes
- Existing memberships are preserved—the migration backfills from the legacy arrays and from `teams.coach_id`.
- Joining/leaving teams now goes exclusively through the database RPCs, so permissions stay consistent even if the client is modified.
- Index additions significantly reduce sequential scans on the largest tables; if Supabase still reports slow queries, verify that the client always filters by indexed columns and that `EXPLAIN` shows index usage.
