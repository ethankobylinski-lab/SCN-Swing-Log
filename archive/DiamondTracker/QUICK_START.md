# Quick Start Guide

## 1. Add Supabase Credentials

Open `Info.plist` and replace:
- `YOUR_SUPABASE_URL` with your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `YOUR_SUPABASE_ANON_KEY` with your Supabase anon/public key

Alternatively, you can set these in `Config.swift` directly (not recommended for production).

## 2. Add Supabase Swift Package

In Xcode:
1. File → Add Packages...
2. Enter: `https://github.com/supabase/supabase-swift`
3. Select version: Latest (2.0.0 or newer)
4. Add to target: `DiamondTracker`

## 3. Build

1. Open `DiamondTracker.xcodeproj` in Xcode
2. Select your target device/simulator
3. Build (⌘B)

## 4. Run

1. Run (⌘R)
2. Test login with existing account
3. Test recording a hitting session
4. Test recording a pitching session

## Troubleshooting

### Build Errors

- **Missing Supabase package**: Add via Swift Package Manager
- **Type errors**: Check that all models conform to Codable
- **Import errors**: Ensure `import Supabase` is present

### Runtime Errors

- **Auth fails**: Check Supabase URL and key in Info.plist
- **Data not loading**: Check RLS policies in Supabase dashboard
- **Insert fails**: Check that JSON encoding matches backend schema

### API Compatibility

If you see Supabase SDK API errors, see `SUPABASE_API_FIXES.md` for:
- Query builder syntax adjustments
- Insert/update method fixes
- RPC call format adjustments

## What's Ready

✅ All models match backend schema
✅ All services use proper Supabase SDK patterns
✅ Recording flows fully wired
✅ Error handling in place
✅ Role-based navigation
✅ Visual consistency

## What May Need Adjustment

⚠️ Supabase SDK API calls (based on your SDK version)
⚠️ JSON encoding for nested structures (sets, pitchGoals)
⚠️ Array query syntax (`.contains()`, `.in()`)

See `SUPABASE_API_FIXES.md` for detailed fixes.

