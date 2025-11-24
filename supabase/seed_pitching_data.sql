-- Seed data for Pitching Analytics
-- Run this in the Supabase SQL Editor to populate sample data

-- 1. Get the first player ID (you can replace this with a specific UUID if known)
DO $$
DECLARE
    v_player_id uuid;
    v_team_id uuid;
    v_session_id uuid;
    v_pitch_type_id uuid;
BEGIN
    -- Get a player
    SELECT id INTO v_player_id FROM auth.users WHERE role = 'Player' LIMIT 1;
    
    -- Get a team for that player
    SELECT team_id INTO v_team_id FROM public.team_members WHERE user_id = v_player_id LIMIT 1;

    IF v_player_id IS NULL OR v_team_id IS NULL THEN
        RAISE NOTICE 'No player or team found to seed data for.';
        RETURN;
    END IF;

    -- 2. Create a Pitch Type (Fastball)
    -- Check if exists first
    SELECT id INTO v_pitch_type_id FROM public.pitch_types WHERE pitcher_id = v_player_id AND code = 'FB' LIMIT 1;
    
    IF v_pitch_type_id IS NULL THEN
        INSERT INTO public.pitch_types (pitcher_id, name, code, color_hex)
        VALUES (v_player_id, 'Fastball', 'FB', '#ef4444')
        RETURNING id INTO v_pitch_type_id;
    END IF;

    -- 3. Create a Pitch Session (Yesterday)
    INSERT INTO public.pitch_sessions (
        pitcher_id, 
        team_id, 
        session_name, 
        session_type, 
        total_pitches, 
        session_start_time, 
        session_end_time,
        rest_hours_required,
        rest_end_time
    )
    VALUES (
        v_player_id,
        v_team_id,
        'Bullpen Session',
        'mix',
        15,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day' + INTERVAL '30 minutes',
        15.0, -- 1 hour per pitch rule
        NOW() - INTERVAL '1 day' + INTERVAL '15 hours'
    )
    RETURNING id INTO v_session_id;

    -- 4. Create Pitch Records
    -- Pitch 1: Strike
    INSERT INTO public.pitch_records (session_id, index, batter_side, balls_before, strikes_before, outs, pitch_type_id, target_zone, actual_zone, outcome, velocity_mph)
    VALUES (v_session_id, 0, 'R', 0, 0, 0, v_pitch_type_id, '5', '5', 'StrikeCalled', 92.5);

    -- Pitch 2: Ball
    INSERT INTO public.pitch_records (session_id, index, batter_side, balls_before, strikes_before, outs, pitch_type_id, target_zone, actual_zone, outcome, velocity_mph)
    VALUES (v_session_id, 1, 'R', 0, 1, 0, v_pitch_type_id, '5', '12', 'Ball', 93.0);

    -- Pitch 3: Hit
    INSERT INTO public.pitch_records (session_id, index, batter_side, balls_before, strikes_before, outs, pitch_type_id, target_zone, actual_zone, outcome, velocity_mph, in_play_quality)
    VALUES (v_session_id, 2, 'R', 1, 1, 0, v_pitch_type_id, '5', '5', 'InPlay', 91.8, 'hard');

    RAISE NOTICE 'Seeded pitching data for player %', v_player_id;
END $$;
