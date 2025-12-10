-- Diagnostic queries to run in Supabase SQL Editor
-- Run these to debug the join code issue

-- 1. Check if join codes exist for any teams
SELECT 
    jc.code,
    jc.role,
    jc.team_id,
    t.name as team_name,
    t.season_year
FROM public.join_codes jc
LEFT JOIN public.teams t ON t.id = jc.team_id
ORDER BY jc.created_at DESC;

-- 2. Check RLS policies on join_codes table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'join_codes';

-- 3. Test if you can select from join_codes as current user
-- (Replace 'YOUR_CODE_HERE' with an actual code from query #1)
SELECT * FROM public.join_codes WHERE code = 'YOUR_CODE_HERE';

-- 4. Check if the function exists with correct signature
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'join_team_with_code';
