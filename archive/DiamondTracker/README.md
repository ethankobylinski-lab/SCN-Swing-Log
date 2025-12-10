# Diamond Tracker iOS App

Native iOS app built with SwiftUI that connects to the existing Diamond Tracker Supabase backend.

## 🚀 Quick Start

1. **Add Supabase Credentials** (see `QUICK_START.md`)
2. **Add Supabase Swift Package** in Xcode
3. **Build and Run**

See `QUICK_START.md` for detailed setup instructions.

## ✨ Features

### Player Experience
- **Dashboard**: Weekly summary, active goals, quick actions
- **Hitting Tab**: Analytics, performance charts, strike zone, journal
- **Pitching Tab**: Analytics, performance charts, journal
- **Profile Tab**: User settings

### Coach Experience
- **Dashboard**: Team overview, goals, player summary
- **Players Tab**: Player list and detail views
- **Teams Tab**: Team management

### Recording Flows
- **Hitting**: Set-by-set recording with reps, executed, hard hits, strikeouts
- **Pitching**: Pitch-by-pitch recording with strike/ball tracking

## 📁 Project Structure

```
DiamondTracker/
├── Models/              # Data models (User, Session, Goal, etc.)
├── Services/            # API services (Auth, Session, Team, etc.)
├── ViewModels/          # ViewModels for all screens
├── Views/               # SwiftUI views
│   ├── Player/         # Player-specific views
│   ├── Coach/          # Coach-specific views
│   └── Recording/      # Recording flow views
├── Components/          # Reusable UI components
└── Utils/              # Helpers and utilities
```

## 🔧 Setup

### Prerequisites
- Xcode 14+ (iOS 16+)
- Swift 5.7+
- Supabase account and project

### Configuration

1. **Add Supabase Package**:
   - File → Add Packages...
   - URL: `https://github.com/supabase/supabase-swift`
   - Version: Latest

2. **Configure Credentials**:
   - Open `Info.plist`
   - Replace `YOUR_SUPABASE_URL` with your project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

3. **Build**:
   - Open project in Xcode
   - Build (⌘B)
   - Run (⌘R)

## 📚 Documentation

- `QUICK_START.md` - Setup and first run
- `PROJECT_SETUP.md` - Detailed project setup
- `SUPABASE_API_FIXES.md` - API compatibility troubleshooting
- `FINAL_CHECKLIST.md` - Testing checklist
- `BUILD_READY.md` - Build readiness status

## ⚠️ Important Notes

### Supabase API Compatibility

The code uses proper Swift types and Codable, but the Supabase Swift SDK API may differ slightly. If you encounter build or runtime errors:

1. Check `SUPABASE_API_FIXES.md` for common issues
2. Verify your Supabase Swift SDK version
3. Adjust query/insert syntax as needed

### Known Limitations

- Programs: Placeholder implementation
- Offline: Not implemented (requires network)
- Pitch Recording: Simplified version

## 🎯 Status

✅ **Ready for Build**: All code is structured and ready
✅ **Recording Flows**: Fully implemented and wired
✅ **Design System**: Complete and consistent
✅ **Role Isolation**: Enforced in navigation
⚠️ **API Testing**: Needs real Supabase credentials and testing

## 🔗 Backend Integration

The app connects to the same Supabase backend as the web app:
- Same authentication system
- Same database tables
- Same data models
- Real-time data sync

All data logged in the iOS app appears on the website and vice versa.

## 📝 Next Steps

1. Add Supabase credentials
2. Build in Xcode
3. Fix any SDK-specific API issues
4. Test recording flows
5. Iterate based on feedback
