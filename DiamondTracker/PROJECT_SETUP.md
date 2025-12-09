# Diamond Tracker iOS - Project Setup Guide

## Creating the Xcode Project

1. **Open Xcode** and create a new project:
   - Choose "iOS" → "App"
   - Product Name: `DiamondTracker`
   - Interface: `SwiftUI`
   - Language: `Swift`
   - Minimum Deployment: `iOS 16.0`

2. **Add Supabase Swift Package**:
   - In Xcode: File → Add Packages...
   - Enter URL: `https://github.com/supabase/supabase-swift`
   - Version: Latest (2.0.0 or newer)
   - Add to target: `DiamondTracker`

3. **Organize Project Structure**:
   
   Create the following folder structure in Xcode (right-click project → New Group):
   
   ```
   DiamondTracker/
   ├── Models/
   ├── Services/
   ├── ViewModels/
   ├── Views/
   │   ├── Player/
   │   └── Coach/
   ├── Components/
   │   └── DesignSystem/
   └── Utils/
   ```

4. **Add Files**:
   - Copy all the Swift files from this directory into their respective folders
   - Make sure all files are added to the `DiamondTracker` target

5. **Configure Info.plist**:
   - Add your Supabase URL and anon key (see README.md)

6. **Update App Entry Point**:
   - Ensure `DiamondTrackerApp.swift` is set as the app entry point
   - The `@main` attribute should be on `DiamondTrackerApp`

## Build Settings

- **iOS Deployment Target**: 16.0
- **Swift Language Version**: Swift 5.7
- **Build System**: New Build System

## Testing

1. Build the project (⌘B) to check for compilation errors
2. Run on simulator or device (⌘R)
3. Test login flow with valid Supabase credentials

## Troubleshooting

### Supabase SDK Issues
- Ensure you're using the latest version of the Supabase Swift SDK
- Check that the package is properly linked in Build Phases

### Compilation Errors
- Verify all files are added to the correct target
- Check that import statements match your package structure
- Ensure iOS 16+ APIs are only used on iOS 16+ targets

### Authentication Issues
- Verify Supabase URL and anon key in Info.plist
- Check that your Supabase project has the correct RLS policies
- Ensure email/password auth is enabled in Supabase dashboard

