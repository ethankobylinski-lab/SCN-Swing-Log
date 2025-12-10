-- Atomic pitch recording RPC function
-- Ensures that pitch insertion and count update happen as a single transaction

CREATE OR REPLACE FUNCTION public.record_pitch_atomic(
  p_session_id uuid,
  p_index integer,
  p_batter_side text,
  p_balls_before integer,
  p_strikes_before integer,
  p_runners_on jsonb,
  p_outs integer,
  p_pitch_type_id uuid,
  p_target_zone text,
  p_target_x_norm numeric DEFAULT NULL,
  p_target_y_norm numeric DEFAULT NULL,
  p_actual_zone text DEFAULT NULL,
  p_actual_x_norm numeric DEFAULT NULL,
  p_actual_y_norm numeric DEFAULT NULL,
  p_velocity_mph numeric DEFAULT NULL,
  p_outcome text DEFAULT NULL,
  p_in_play_quality text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_pitch_id uuid;
  session_pitcher_id uuid;
BEGIN
  -- Verify session exists and belongs to current user
  SELECT pitcher_id INTO session_pitcher_id
  FROM public.pitch_sessions
  WHERE id = p_session_id;

  IF session_pitcher_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF session_pitcher_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert the pitch record
  INSERT INTO public.pitch_records (
    session_id,
    index,
    batter_side,
    balls_before,
    strikes_before,
    runners_on,
    outs,
    pitch_type_id,
    target_zone,
    target_x_norm,
    target_y_norm,
    actual_zone,
    actual_x_norm,
    actual_y_norm,
    velocity_mph,
    outcome,
    in_play_quality
  ) VALUES (
    p_session_id,
    p_index,
    p_batter_side,
    p_balls_before,
    p_strikes_before,
    p_runners_on,
    p_outs,
    p_pitch_type_id,
    p_target_zone,
    p_target_x_norm,
    p_target_y_norm,
    p_actual_zone,
    p_actual_x_norm,
    p_actual_y_norm,
    p_velocity_mph,
    p_outcome,
    p_in_play_quality
  )
  RETURNING id INTO new_pitch_id;

  -- Update total pitch count atomically
  UPDATE public.pitch_sessions
  SET total_pitches = p_index,
      updated_at = now()
  WHERE id = p_session_id;

  -- Return success with pitch ID
  RETURN jsonb_build_object(
    'success', true,
    'pitch_id', new_pitch_id,
    'session_id', p_session_id,
    'total_pitches', p_index
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE NOTICE 'Error in record_pitch_atomic: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.record_pitch_atomic TO authenticated;

COMMENT ON FUNCTION public.record_pitch_atomic IS 
  'Atomically records a pitch and updates session pitch count. Ensures data consistency.';
