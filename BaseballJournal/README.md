# BaseballJournal

A production-ready iOS app starter with Supabase integration for tracking baseball performance data.

## Features

- ✅ Supabase integration with Swift SDK
- ✅ Clean SwiftUI architecture
- ✅ Example CRUD operations (Notes table)
- ✅ Error handling and loading states
- ✅ Unit tests
- ✅ Ready to extend with hitting, pitching, goals, drills, etc.

## Quick Start

1. **Create Xcode Project**: Create a new SwiftUI iOS app named `BaseballJournal`
2. **Add Files**: Drop in all Swift files from this repository
3. **Add Supabase Package**: Add via Swift Package Manager
4. **Configure**: Replace placeholders in `Config/SupabaseConfig.swift`
5. **Create Table**: Run the SQL in `PROJECT_SETUP.md` to create the `notes` table
6. **Build & Run**: Press ⌘R in Xcode

See `PROJECT_SETUP.md` for detailed setup instructions.

## Project Structure

```
BaseballJournal/
├── BaseballJournalApp.swift      # App entry point
├── Config/
│   └── SupabaseConfig.swift      # Supabase configuration
├── Services/
│   └── SupabaseClientProvider.swift  # Supabase client wrapper
├── Models/
│   └── Note.swift                 # Example data model
├── Views/
│   └── HomeView.swift             # Main UI
├── ViewModels/
│   └── HomeViewModel.swift        # Business logic
└── Tests/
    └── BaseballJournalSupabaseTests.swift  # Unit tests
```

## Requirements

- iOS 16.0+
- Xcode 14.0+
- Swift 5.7+
- Supabase account and project

## Configuration

Edit `Config/SupabaseConfig.swift`:

```swift
static let url = URL(string: "https://YOUR_PROJECT_ID.supabase.co")!
static let anonKey = "YOUR_SUPABASE_ANON_KEY"
```

## Database Setup

Create the `notes` table in your Supabase project:

```sql
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

See `PROJECT_SETUP.md` for complete SQL including RLS policies.

## Architecture

- **MVVM Pattern**: ViewModels handle business logic and state
- **Singleton Services**: `SupabaseClientProvider` provides shared Supabase client
- **SwiftUI**: Modern declarative UI framework
- **Async/Await**: All network operations use Swift concurrency

## Extending the App

This starter provides:

1. **Supabase Integration**: Ready-to-use client wrapper
2. **Example Model**: `Note` model with Codable conformance
3. **Example ViewModel**: `HomeViewModel` with load/create operations
4. **Example View**: `HomeView` with loading, error, and empty states

To add new features:

1. Create models in `Models/` (e.g., `HittingSession.swift`, `PitchSession.swift`)
2. Add ViewModels in `ViewModels/` for business logic
3. Create Views in `Views/` for UI
4. Use `SupabaseClientProvider.shared.client` for database operations

## Testing

Run tests with ⌘U. Tests verify:
- Configuration placeholders
- Client initialization
- Model encoding/decoding

## License

This is a starter template. Use as needed for your project.

