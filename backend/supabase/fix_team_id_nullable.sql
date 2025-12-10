-- Allow sessions to have no team_id
ALTER TABLE public.sessions ALTER COLUMN team_id DROP NOT NULL;

-- Update RLS policies for sessions to allow access without team_id
DROP POLICY IF EXISTS "Players and coaches can read sessions" ON public.sessions;
CREATE POLICY "Players and coaches can read sessions" ON public.sessions 
FOR SELECT USING (
    player_id = auth.uid() 
    OR (team_id IS NOT NULL AND public.coach_can_manage_team(team_id))
);

DROP POLICY IF EXISTS "Players can create their own sessions" ON public.sessions;
CREATE POLICY "Players can create their own sessions" ON public.sessions 
FOR INSERT WITH CHECK (
    player_id = auth.uid()
);
