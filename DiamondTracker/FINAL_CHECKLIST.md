# Final Production Checklist

## Build & Compilation

- [x] Project structure is complete
- [x] All imports are correct
- [x] All file references are organized
- [ ] **TODO**: Build in Xcode and fix any SDK-specific issues
- [ ] **TODO**: Verify Supabase package is added

## Supabase Integration

- [x] Info.plist has placeholder keys (YOUR_SUPABASE_URL, YOUR_SUPABASE_ANON_KEY)
- [x] Config.swift provides fallback values
- [x] All services use Codable payloads
- [x] JSON encoding for nested structures (sets, pitchGoals)
- [ ] **TODO**: Add Supabase Swift package in Xcode
- [ ] **TODO**: Replace placeholders with real credentials
- [ ] **TODO**: Test authentication flow (login/signup)
- [ ] **TODO**: Test data fetching (sessions, goals, teams)
- [ ] **TODO**: Test data creation (recording sessions)
- [ ] **TODO**: Fix any API compatibility issues (see SUPABASE_API_FIXES.md)

## Recording Flows

- [x] HittingRecordingViewModel calls SessionService.createHittingSession
- [x] PitchingRecordingViewModel calls SessionService.createPitchSession
- [x] Both flows have error handling
- [x] Both flows trigger data refresh on success
- [x] UI prevents double-submission (loading states)
- [ ] **TODO**: Test hitting recording flow end-to-end
- [ ] **TODO**: Test pitching recording flow end-to-end
- [ ] **TODO**: Verify sessions appear in journals after save

## Navigation & Role Isolation

- [x] Single source of truth: AuthService as @EnvironmentObject
- [x] MainTabView enforces role-based navigation
- [x] Player flow: Auth → Player TabView (Dashboard, Hitting, Pitching, Profile)
- [x] Coach flow: Auth → Coach TabView (Dashboard, Players, Teams)
- [x] All NavigationLinks use proper destination types
- [x] Sheet presentations configured for recording views
- [ ] **TODO**: Test role isolation with real accounts

## Data Display

- [ ] Dashboard shows correct weekly summary
- [ ] Hitting tab shows all analytics correctly
- [ ] Pitching tab shows all analytics correctly
- [ ] Goals display correctly
- [ ] Session detail views work
- [ ] Coach player views work

## Error Handling

- [ ] Network errors show user-friendly messages
- [ ] Validation errors prevent invalid submissions
- [ ] Loading states are shown during async operations
- [ ] Empty states appear when appropriate

## Visual Polish

- [x] All buttons use PrimaryButton, SecondaryButton, GhostButton
- [x] All stat cards use StatCard component
- [x] All section containers use SectionCard
- [x] Colors defined in Colors.swift extension
- [x] Typography uses system fonts with consistent hierarchy
- [x] Spacing is consistent (padding: 12, 16, 24)
- [x] Shadows and corners match design system (radius: 12-16)
- [x] All tappable rows are NavigationLink with chevrons

## Testing

- [ ] Test on iOS 16+ simulator
- [ ] Test on physical device (if possible)
- [ ] Test with real Supabase backend
- [ ] Test recording flows multiple times
- [ ] Test with slow network (simulate)
- [ ] Test error scenarios (invalid login, network failure)

## Documentation

- [ ] README.md is updated with setup instructions
- [ ] PROJECT_SETUP.md has correct steps
- [ ] API_NOTES.md documents any API differences
- [ ] SUPABASE_API_FIXES.md has troubleshooting guide

## Known Issues & Limitations

1. **Supabase API Compatibility**: 
   - Code uses proper Codable types, but SDK syntax may vary
   - See `SUPABASE_API_FIXES.md` for potential adjustments
   - JSON encoding for nested structures (sets, pitchGoals) may need tweaking

2. **Pitch Recording**: 
   - Simplified version - basic strike/ball tracking
   - Full game situation tracking can be added later
   - RPC call for `record_pitch_atomic` may need parameter format adjustment

3. **Programs**: 
   - Placeholder implementation in ProgramService
   - Needs backend schema confirmation
   - Can be enhanced once schema is confirmed

4. **Offline Support**: 
   - Not implemented - sessions require network connection
   - Can be added with local caching in future version

5. **Array Queries**:
   - `.contains()` and `.in()` syntax may need adjustment based on SDK version
   - See `SUPABASE_API_FIXES.md` for alternatives

## Next Steps After Build

1. Test with real Supabase project
2. Adjust API calls based on actual SDK behavior
3. Test recording flows thoroughly
4. Get user feedback on UI/UX
5. Iterate on recording experience
6. Add any missing features based on priorities

