# BaseballJournal iOS App - Final Checklist

Use this checklist to verify the app is ready for use.

## Initial Setup

- [ ] Repository cloned successfully
- [ ] Xcode project created (BaseballJournal, SwiftUI, iOS 16+)
- [ ] All Swift files added to project and target
- [ ] Supabase Swift package added via SPM
- [ ] Supabase credentials configured in `Config/SupabaseConfig.swift`
- [ ] App builds with no errors (⌘B)

## Supabase Integration

- [ ] Supabase URL is correct (not placeholder)
- [ ] Supabase anon key is correct (not placeholder)
- [ ] Database tables exist (users, sessions, pitch_sessions, etc.)
- [ ] RLS policies configured (or temporarily disabled for testing)
- [ ] Authentication works (login/signup)

## Authentication & Navigation

- [ ] Player login shows Player TabView (Dashboard, Hitting, Pitching, Profile)
- [ ] Coach login shows Coach TabView (Dashboard, Players, Teams)
- [ ] Role isolation works (players can't see coach tabs, vice versa)
- [ ] Sign out works correctly
- [ ] Session persistence works (app remembers login after restart)

## Player Experience - Dashboard

- [ ] Dashboard loads and shows welcome message
- [ ] Weekly summary cards show correct counts
- [ ] Active goals display (if any)
- [ ] Quick action buttons visible ("Start Hitting Session", "Start Pitching Session")
- [ ] Navigation to Hitting/Pitching tabs works

## Player Experience - Hitting Tab

- [ ] Active hitting goals display
- [ ] Summary cards show metrics (Execution %, Hard-Hit %, etc.)
- [ ] Performance trends chart displays (if data exists)
- [ ] Strike zone grid displays
- [ ] Hitting journal list shows sessions
- [ ] Session detail view works when tapping a session
- [ ] "Start Session" button opens recording view

## Player Experience - Hitting Recording

- [ ] Recording view opens from Hitting tab
- [ ] Can enter session name
- [ ] Can select drill type
- [ ] Can add sets with reps, executed, hard hits, strikeouts
- [ ] Live metrics update (execution %, total reps)
- [ ] Can add notes
- [ ] "Save Session" button works
- [ ] Session saves to Supabase successfully
- [ ] Success confirmation appears
- [ ] After save, journal and dashboard refresh
- [ ] Error handling works (shows error if save fails)

## Player Experience - Pitching Tab

- [ ] Active pitching goals display
- [ ] Summary cards show metrics (Strike %, Accuracy %, etc.)
- [ ] Performance trends chart displays (if data exists)
- [ ] Strike zone grid displays
- [ ] Pitching journal list shows sessions
- [ ] Session detail view works when tapping a session
- [ ] "Start Session" button opens recording view

## Player Experience - Pitching Recording

- [ ] Recording view opens from Pitching tab
- [ ] Can enter session name
- [ ] Can select session type (Bullpen, Flat Ground, etc.)
- [ ] Can record pitches (Strike/Ball buttons)
- [ ] Live count updates (balls, strikes)
- [ ] Can add notes
- [ ] "End Session" button works
- [ ] Session finalizes and saves to Supabase successfully
- [ ] Success confirmation appears
- [ ] After save, journal and dashboard refresh
- [ ] Error handling works (shows error if save fails)

## Coach Experience - Dashboard

- [ ] Coach Dashboard loads
- [ ] Team overview displays
- [ ] Team goals display (if any)
- [ ] Player summary shows correct counts

## Coach Experience - Players Tab

- [ ] Players list loads
- [ ] Shows players on coach's team(s)
- [ ] Tapping a player opens detail view
- [ ] Player detail shows hitting & pitching summaries
- [ ] Recent sessions display (read-only)
- [ ] Strike zone snapshots display (if available)

## Coach Experience - Teams Tab

- [ ] Teams list loads
- [ ] Team info displays (name, season, etc.)
- [ ] Join code displays (if applicable)
- [ ] Team goals/programs display (read-only)

## Data Synchronization

- [ ] Session recorded in iOS app appears in web app
- [ ] Session recorded in web app appears in iOS app
- [ ] Goals set in web app appear in iOS app
- [ ] Goals set in iOS app appear in web app
- [ ] User profile changes sync between platforms

## Visual Consistency

- [ ] All buttons use design system components (Primary, Secondary, Ghost)
- [ ] All stat cards use StatCard component
- [ ] All section containers use SectionCard
- [ ] Colors are consistent (primary blue, backgrounds, text colors)
- [ ] Typography is consistent (titles, headlines, body text)
- [ ] Spacing is consistent (padding: 12, 16, 24)
- [ ] All tappable rows are NavigationLink with chevrons
- [ ] Empty states appear when appropriate
- [ ] Loading states appear during async operations

## Error Handling

- [ ] Network errors show user-friendly messages
- [ ] Validation errors prevent invalid submissions
- [ ] Loading states prevent double-submission
- [ ] Empty states appear when no data
- [ ] Error messages are clear and actionable

## Performance

- [ ] App launches quickly
- [ ] Data loads without excessive delay
- [ ] Recording flows are responsive
- [ ] Charts render smoothly
- [ ] No memory leaks (check with Instruments if possible)

## Testing Scenarios

- [ ] Test with slow network (simulate in Xcode)
- [ ] Test with no network (verify error handling)
- [ ] Test with invalid credentials (verify error message)
- [ ] Test recording multiple sessions in a row
- [ ] Test switching between Player and Coach accounts
- [ ] Test on different iOS versions (16.0, 16.1, 17.0+)
- [ ] Test on different device sizes (iPhone SE, iPhone 14 Pro Max, iPad)

## Known Limitations

- [ ] Programs feature is placeholder (needs backend schema confirmation)
- [ ] Offline support not implemented (requires network)
- [ ] Pitch recording is simplified (basic strike/ball tracking)
- [ ] Some Supabase SDK syntax may need adjustment (see SUPABASE_API_FIXES.md)

## Documentation

- [ ] PROJECT_SETUP.md is complete and accurate
- [ ] FINAL_CHECKLIST.md (this file) is reviewed
- [ ] SUPABASE_API_FIXES.md is up to date (if needed)
- [ ] README.md provides overview

## Production Readiness

- [ ] All placeholder credentials replaced
- [ ] RLS policies enabled and tested
- [ ] Error handling is comprehensive
- [ ] User experience is polished
- [ ] App is ready for App Store submission (if applicable)

## Next Steps

After completing this checklist:

1. **Test with real users** (if possible)
2. **Gather feedback** on UI/UX
3. **Iterate** on recording flows based on usage
4. **Add missing features** based on priorities
5. **Monitor** Supabase logs for errors
6. **Optimize** performance based on usage patterns

