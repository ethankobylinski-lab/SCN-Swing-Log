# BaseballJournal Project Setup

This guide will help you set up the BaseballJournal iOS app with Supabase integration.

## Prerequisites

- Xcode 14.0 or later
- iOS 16.0+ deployment target
- A Supabase account and project

## Step 1: Create Xcode Project

1. Open Xcode
2. Select **File → New → Project**
3. Choose **iOS → App**
4. Configure:
   - **Product Name**: `BaseballJournal`
   - **Interface**: SwiftUI
   - **Language**: Swift
   - **Storage**: None (we'll use Supabase)
   - **Minimum Deployment**: iOS 16.0
5. Choose a location and create the project

## Step 2: Add Project Files

1. In Xcode, create the following folder structure in your project navigator:
   - `Config/`
   - `Services/`
   - `Models/`
   - `Views/`
   - `ViewModels/`
   - `Tests/`

2. Add all the Swift files from this repository to their respective folders:
   - `BaseballJournalApp.swift` → Root level
   - `Config/SupabaseConfig.swift` → Config folder
   - `Services/SupabaseClientProvider.swift` → Services folder
   - `Models/Note.swift` → Models folder
   - `Views/HomeView.swift` → Views folder
   - `ViewModels/HomeViewModel.swift` → ViewModels folder
   - `Tests/BaseballJournalSupabaseTests.swift` → Tests folder (make sure it's added to the test target)

3. **Important**: Make sure `BaseballJournalApp.swift` is set as the entry point:
   - Select the file in Xcode
   - In the File Inspector, ensure "Target Membership" includes your main app target

## Step 3: Add Supabase Swift SDK

1. In Xcode, select your project in the navigator
2. Select your project target
3. Go to the **Package Dependencies** tab
4. Click the **+** button
5. Enter the Supabase Swift package URL:
   ```
   https://github.com/supabase/supabase-swift
   ```
6. Select **Up to Next Major Version** and choose the latest version (2.0.0 or newer)
7. Click **Add Package**
8. When prompted, add the **Supabase** product to your **BaseballJournal** target

## Step 4: Configure Supabase Credentials

1. Open `Config/SupabaseConfig.swift`
2. Replace the placeholders:
   ```swift
   static let url = URL(string: "https://YOUR_PROJECT_ID.supabase.co")!
   ```
   Replace `YOUR_PROJECT_ID` with your actual Supabase project ID (found in your Supabase dashboard under Settings → API)
   
   ```swift
   static let anonKey = "YOUR_SUPABASE_ANON_KEY"
   ```
   Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon/public key (found in the same Settings → API section)

## Step 5: Create the Notes Table in Supabase

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Run the following SQL to create the `notes` table:

```sql
-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
-- Adjust this policy based on your security requirements
CREATE POLICY "Allow all operations for authenticated users"
ON notes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Optional: Create an index for faster queries
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC);
```

**Note**: The policy above allows all authenticated users to read/write all notes. For production, you'll want to restrict this based on user ownership or team membership.

## Step 6: Configure Authentication (Optional for Testing)

If you want to test with authentication:

1. In Supabase dashboard, go to **Authentication → Policies**
2. For the `notes` table, you can temporarily disable RLS for testing:
   ```sql
   ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
   ```
   **Warning**: Only do this for development/testing. Re-enable RLS before production.

Or create a more permissive policy for development:
```sql
CREATE POLICY "Allow all for development"
ON notes
FOR ALL
USING (true)
WITH CHECK (true);
```

## Step 7: Build and Run

1. In Xcode, select a simulator or connected device
2. Press **⌘B** to build
3. If you see any errors:
   - Verify Supabase package is added correctly
   - Check that all files are added to the target
   - Ensure credentials are replaced (not still placeholders)
4. Press **⌘R** to run

## Step 8: Test the App

Once running, you should be able to:

1. **See loading state**: When the app first loads, you'll see a progress indicator
2. **View empty state**: If no notes exist, you'll see "No notes yet"
3. **Add a note**: 
   - Enter text in the "Enter note title" field
   - Tap "Add" or press return
   - The note should appear in the list
4. **View notes**: Notes are displayed with title and creation date
5. **Pull to refresh**: Pull down on the list to reload notes from Supabase

## Troubleshooting

### Build Errors

- **"No such module 'Supabase'"**: 
  - Verify the Supabase package is added in Package Dependencies
  - Clean build folder (⌘ShiftK) and rebuild
  
- **"Cannot find type 'SupabaseClient'"**:
  - Check that the Supabase package version is compatible
  - Verify import statements are correct

### Runtime Errors

- **"Failed to load notes"**:
  - Check Supabase credentials are correct
  - Verify the `notes` table exists in your database
  - Check RLS policies allow your operations
  - Check Supabase logs in the dashboard

- **"Network error"**:
  - Verify your Supabase project URL is correct
  - Check your internet connection
  - Verify the Supabase project is active

### Testing

Run the test suite:
1. Press **⌘U** to run tests
2. The tests verify:
   - Config placeholders are present (remind you to replace them)
   - Client provider initializes
   - Note model encoding/decoding works

## Next Steps

Now that you have a working starter:

1. **Add Authentication**: Implement Supabase Auth for user login
2. **Expand Models**: Add models for hitting sessions, pitching sessions, goals, etc.
3. **Add More Views**: Create views for different features
4. **Implement Business Logic**: Add ViewModels for each feature
5. **Add Navigation**: Set up proper navigation flow
6. **Style the UI**: Customize colors, fonts, and layout

## Project Structure

```
BaseballJournal/
├── BaseballJournalApp.swift      # App entry point
├── Config/
│   └── SupabaseConfig.swift      # Supabase credentials
├── Services/
│   └── SupabaseClientProvider.swift  # Supabase client wrapper
├── Models/
│   └── Note.swift                 # Example model
├── Views/
│   └── HomeView.swift             # Main UI
├── ViewModels/
│   └── HomeViewModel.swift        # Business logic
└── Tests/
    └── BaseballJournalSupabaseTests.swift  # Unit tests
```

## Resources

- [Supabase Swift SDK Documentation](https://github.com/supabase/supabase-swift)
- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Documentation](https://supabase.com/docs)

