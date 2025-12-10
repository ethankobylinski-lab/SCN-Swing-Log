-- Clean up old pitching sessions from sessions table
-- This migration removes pitching data that was incorrectly stored in the hitting sessions table
-- After this migration, all pitching data should use the dedicated pitch_sessions table

-- Delete sessions with type = 'pitching'
DELETE FROM public.sessions WHERE type = 'pitching';

-- Note: This is safe to run multiple times (idempotent)
-- Going forward, pitching sessions will only be created in pitch_sessions table
