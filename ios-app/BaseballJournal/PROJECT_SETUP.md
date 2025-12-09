# BaseballJournal iOS App - Project Setup Guide

This guide will help you set up the BaseballJournal iOS app from scratch.

## Prerequisites

- macOS with Xcode 14.0 or later
- iOS 16.0+ deployment target
- A Supabase account and project
- Git (to clone the repo)

## Step 1: Clone the Repository

```bash
git clone <REPO_URL>
cd <REPO_ROOT>
```

## Step 2: Create Xcode Project

1. **Open Xcode** and create a new project:
   - Choose **File → New → Project**
   - Select **iOS → App**
   - Configure:
     - **Product Name**: `BaseballJournal`
     - **Interface**: `SwiftUI`
     - **Language**: `Swift`
     - **Storage**: None (we use Supabase)
     - **Minimum Deployment**: `iOS 16.0`
   - Choose a location and create the project

2. **Close Xcode** (we'll reopen it after adding files)

## Step 3: Add Project Files

1. **Navigate to the iOS app directory**:
   ```bash
   cd ios-app/BaseballJournal
   ```

2. **In Xcode**, open your newly created `BaseballJournal.xcodeproj`

3. **Create folder structure** in Xcode (right-click project → New Group):
   - `Config/`
   - `Models/`
   - `Services/`
   - `ViewModels/`
   - `Views/`
     - `Player/`
     - `Coach/`
     - `Recording/`
   - `Components/`
     - `DesignSystem/`
   - `Utils/`
   - `Tests/`

4. **Add all Swift files** from `ios-app/BaseballJournal/` to their respective folders:
   - Drag files from Finder into Xcode
   - Make sure **all files are added to the `BaseballJournal` target**
   - Ensure `BaseballJournalApp.swift` is at the root level

5. **Verify entry point**:
   - Select `BaseballJournalApp.swift` in Xcode
   - In File Inspector, ensure "Target Membership" includes `BaseballJournal`
   - Verify it has the `@main` attribute

## Step 4: Add Supabase Swift Package

1. In Xcode, select your project in the navigator
2. Select your project target (`BaseballJournal`)
3. Go to the **Package Dependencies** tab
4. Click the **+** button
5. Enter the Supabase Swift package URL:
   ```
   https://github.com/supabase/supabase-swift
   ```
6. Select **Up to Next Major Version** and choose the latest version (2.0.0 or newer)
7. Click **Add Package**
8. When prompted, add the **Supabase** product to your **BaseballJournal** target

## Step 5: Configure Supabase Credentials

1. **Get your Supabase credentials**:
   - Open your Supabase dashboard: https://app.supabase.com
   - Select your project
   - Go to **Settings → API**
   - Copy:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon/public key** (the `anon` key, not the `service_role` key)

2. **Update `Config/SupabaseConfig.swift`**:
   ```swift
   enum SupabaseConfig {
       static let url = URL(string: "https://YOUR_PROJECT_ID.supabase.co")!
       static let anonKey = "YOUR_SUPABASE_ANON_KEY"
   }
   ```
   Replace:
   - `YOUR_PROJECT_ID` with your actual project ID (from the URL)
   - `YOUR_SUPABASE_ANON_KEY` with your actual anon key

## Step 6: Verify Database Schema

The app expects the following tables in your Supabase database (these should already exist if you're using the web app):

- `users` - User profiles with role (player/coach)
- `teams` - Team information
- `sessions` - Hitting sessions
- `pitch_sessions` - Pitching sessions
- `pitch_records` - Individual pitch records
- `personal_goals` - Player goals
- `team_goals` - Team goals
- `drills` - Drill definitions
- `assignments` - Drill/program assignments

**Note**: If these tables don't exist, you'll need to create them. The schema should match what your web app uses. Check your Supabase SQL migrations or the web app's database schema.

## Step 7: Configure Row Level Security (RLS)

Ensure your Supabase database has appropriate RLS policies:

1. **Users table**: Users should be able to read their own profile
2. **Sessions**: Players can read/write their own sessions
3. **Teams**: Users can read teams they belong to
4. **Goals**: Players can read their own goals

**For testing**, you can temporarily disable RLS, but **re-enable it before production**.

## Step 8: Build and Run

1. **Select a simulator** or connected device in Xcode
2. **Build** (⌘B) to check for compilation errors
3. **Fix any issues**:
   - Missing imports? Add them
   - Type errors? Check Supabase SDK version compatibility
   - Missing files? Ensure all files are added to target
4. **Run** (⌘R) to launch the app

## Step 9: Test the App

1. **Login**:
   - Use an existing account from your web app
   - Or create a new account (if signup is enabled)

2. **Test Player Flow**:
   - Dashboard should show weekly summary
   - Hitting tab should show analytics and journal
   - Pitching tab should show analytics and journal
   - Try recording a hitting session
   - Try recording a pitching session
   - Verify sessions appear in journals

3. **Test Coach Flow** (if you have a coach account):
   - Coach Dashboard should show team metrics
   - Players tab should list team players
   - Teams tab should show team info

4. **Verify Data Sync**:
   - Record a session in the iOS app
   - Check that it appears in the web app
   - Record a session in the web app
   - Check that it appears in the iOS app

## Troubleshooting

### Build Errors

**"No such module 'Supabase'"**:
- Verify Supabase package is added in Package Dependencies
- Clean build folder (⌘ShiftK) and rebuild
- Check that Supabase product is added to target

**"Cannot find type 'SupabaseClient'"**:
- Check Supabase package version (should be 2.0.0+)
- Verify import statements: `import Supabase`

**Type errors in services**:
- Check that all services use `SupabaseClientProvider.shared.client`
- Verify models conform to `Codable` with correct `CodingKeys`

### Runtime Errors

**"Failed to load notes" or "Failed to authenticate"**:
- Check Supabase credentials in `SupabaseConfig.swift`
- Verify Supabase project is active
- Check network connection
- Review Supabase logs in dashboard

**"RLS policy violation"**:
- Check Row Level Security policies in Supabase
- Verify user has correct role/permissions
- Temporarily disable RLS for testing (not for production)

**Sessions not appearing**:
- Check that sessions are being saved (check Supabase logs)
- Verify RLS policies allow reads
- Check that user ID matches between app and database

### API Compatibility Issues

If you encounter Supabase SDK API differences, see `SUPABASE_API_FIXES.md` for:
- Query builder syntax adjustments
- Insert/update method fixes
- RPC call format adjustments

## Project Structure

```
ios-app/BaseballJournal/
├── BaseballJournalApp.swift      # App entry point (@main)
├── Config/
│   └── SupabaseConfig.swift      # Supabase credentials
├── Services/
│   ├── SupabaseClientProvider.swift  # Supabase client wrapper
│   ├── AuthService.swift         # Authentication
│   ├── SessionService.swift      # Hitting/pitching sessions
│   ├── TeamService.swift         # Team data
│   ├── GoalService.swift         # Goals
│   ├── DrillService.swift        # Drills
│   └── ProgramService.swift      # Programs
├── Models/
│   ├── User.swift                # User, Team, PlayerProfile
│   ├── Session.swift             # Hitting sessions
│   ├── PitchSession.swift        # Pitching sessions
│   ├── Goal.swift                # Goals
│   ├── Drill.swift               # Drills
│   └── SupabaseSessionPayload.swift  # Helper for JSONB encoding
├── ViewModels/
│   ├── AppSessionViewModel.swift # Global auth state
│   ├── PlayerDashboardViewModel.swift
│   ├── PlayerHittingViewModel.swift
│   ├── PlayerPitchingViewModel.swift
│   ├── HittingRecordingViewModel.swift
│   ├── PitchingRecordingViewModel.swift
│   └── CoachDashboardViewModel.swift
├── Views/
│   ├── RootView.swift            # Root navigation
│   ├── LoginView.swift           # Authentication
│   ├── ProfileView.swift         # User profile
│   ├── PlayerTabView.swift       # Player tab container
│   ├── CoachTabView.swift        # Coach tab container
│   ├── Player/
│   │   ├── PlayerDashboardView.swift
│   │   ├── PlayerHittingView.swift
│   │   └── PlayerPitchingView.swift
│   ├── Coach/
│   │   ├── CoachDashboardView.swift
│   │   ├── CoachPlayersView.swift
│   │   └── CoachTeamsView.swift
│   ├── Recording/
│   │   ├── HittingRecordingView.swift
│   │   └── PitchingRecordingView.swift
│   ├── SessionDetailView.swift
│   └── PitchSessionDetailView.swift
├── Components/
│   ├── DesignSystem/
│   │   ├── Colors.swift          # Color theme
│   │   ├── Buttons.swift         # Button components
│   │   ├── Cards.swift           # Card components
│   │   └── EmptyState.swift      # Empty state component
│   └── StrikeZoneView.swift      # Strike zone visualization
├── Utils/
│   └── AnalyticsHelpers.swift    # Analytics calculations
├── Tests/
│   └── BaseballJournalSupabaseTests.swift
├── Info.plist                    # App configuration
└── PROJECT_SETUP.md              # This file
```

## Next Steps

After setup:

1. **Test thoroughly** with real data
2. **Review** `FINAL_CHECKLIST.md` for verification steps
3. **Check** `SUPABASE_API_FIXES.md` if you encounter API issues
4. **Customize** UI/UX as needed
5. **Add features** based on your roadmap

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Swift SDK**: https://github.com/supabase/supabase-swift
- **SwiftUI Docs**: https://developer.apple.com/documentation/swiftui

