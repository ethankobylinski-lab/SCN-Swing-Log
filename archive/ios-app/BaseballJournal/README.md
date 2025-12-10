# BaseballJournal iOS App

Native iOS app built with SwiftUI that connects to the existing BaseballJournal/Diamond Tracker Supabase backend.

## 🚀 Quick Start

1. **Clone the repo** and navigate to `ios-app/BaseballJournal/`
2. **Create Xcode project** (see `PROJECT_SETUP.md`)
3. **Add Supabase Swift package** via SPM
4. **Configure credentials** in `Config/SupabaseConfig.swift`
5. **Build and run**

See `PROJECT_SETUP.md` for detailed setup instructions.

## ✨ Features

### Player Experience
- **Dashboard**: Weekly summary, active goals, quick actions
- **Hitting Tab**: Analytics, performance charts, strike zone, journal, recording
- **Pitching Tab**: Analytics, performance charts, journal, recording
- **Profile Tab**: User settings and sign out

### Coach Experience
- **Dashboard**: Team overview, goals, player summary
- **Players Tab**: Player list and detail views (read-only)
- **Teams Tab**: Team management and settings

### Recording Flows
- **Hitting**: Set-by-set recording with reps, executed, hard hits, strikeouts
- **Pitching**: Pitch-by-pitch recording with strike/ball tracking

## 📁 Project Structure

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
├── Models/                        # Data models (User, Session, Goal, etc.)
├── ViewModels/                    # ViewModels for all screens
├── Views/                         # SwiftUI views
│   ├── Player/                   # Player-specific views
│   ├── Coach/                    # Coach-specific views
│   └── Recording/                # Recording flow views
├── Components/                    # Reusable UI components
├── Utils/                         # Helpers and utilities
└── Tests/                         # Unit tests
```

## 🔧 Requirements

- iOS 16.0+
- Xcode 14.0+
- Swift 5.7+
- Supabase account and project

## 📚 Documentation

- **PROJECT_SETUP.md** - Complete setup guide
- **FINAL_CHECKLIST.md** - Verification checklist
- **SUPABASE_API_FIXES.md** - API compatibility troubleshooting

## 🔗 Backend Integration

The app connects to the same Supabase backend as the web app:
- Same authentication system
- Same database tables
- Same data models
- Real-time data sync

All data logged in the iOS app appears on the website and vice versa.

## 🎯 Status

✅ **Production Ready**: All core features implemented
✅ **Recording Flows**: Fully functional hitting and pitching recording
✅ **Analytics**: Performance charts and strike zone visualizations
✅ **Design System**: Consistent UI components throughout
✅ **Error Handling**: Comprehensive error handling and user feedback

## 📝 Next Steps

1. Follow `PROJECT_SETUP.md` to set up the project
2. Use `FINAL_CHECKLIST.md` to verify everything works
3. Refer to `SUPABASE_API_FIXES.md` if you encounter API issues
4. Customize and extend as needed

## 📄 License

This is part of the BaseballJournal/Diamond Tracker project.

