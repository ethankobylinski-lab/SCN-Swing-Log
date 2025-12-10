-- Add orientation tracking fields to users table
-- Migration: Add orientation_completed and orientation_progress columns

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS orientation_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS orientation_progress JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.orientation_completed IS 'Whether user has completed the orientation tour';
COMMENT ON COLUMN users.orientation_progress IS 'Detailed orientation progress tracking (JSON object)';

-- Update RLS policies to allow users to update their own orientation fields
-- Note: Existing user update policies should already cover this, but verify if needed
