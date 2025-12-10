-- Add status column to pitch_sessions
ALTER TABLE public.pitch_sessions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress' 
CHECK (status IN ('in_progress', 'completed', 'emergency_review', 'discarded'));

-- Backfill existing sessions to 'completed'
UPDATE public.pitch_sessions 
SET status = 'completed' 
WHERE status = 'in_progress' AND created_at < NOW();

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_pitch_sessions_status ON public.pitch_sessions(status);
