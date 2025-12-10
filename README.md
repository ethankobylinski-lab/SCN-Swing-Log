# SCN HitJournal Monorepo

A unified monorepo containing the baseball/softball training journal application with:
- **Web app** - React/Vite frontend for coaches and players
- **iOS app** - SwiftUI mobile app (BaseballJournal)
- **Backend** - Supabase database, migrations, and edge functions

## Repository Structure

```
SCN-Swing-Log/
├── apps/
│   ├── web/                    # React/Vite web application
│   │   ├── components/         # React components
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Utility functions
│   │   ├── App.tsx             # Main app component
│   │   ├── supabaseClient.ts   # Supabase client setup
│   │   └── package.json        # Web dependencies
│   │
│   └── baseballjournal-ios/    # iOS SwiftUI application
│       ├── Config/             # Configuration (SupabaseConfig, DesignSystem)
│       ├── Models/             # Data models
│       ├── ViewModels/         # View models
│       ├── Views/              # SwiftUI views
│       └── Services/           # API services
│
├── backend/
│   ├── supabase/               # Supabase configuration
│   │   ├── migrations/         # Database migrations
│   │   └── schema.sql          # Full database schema
│   ├── functions/              # Firebase Cloud Functions (legacy)
│   └── firebase/               # Firebase configuration (legacy)
│
├── shared/
│   └── types/                  # Shared type definitions (future)
│
├── archive/                    # Archived/legacy projects
│   ├── ios-app/
│   ├── DiamondTracker/
│   └── scn-swing-log/
│
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- **Web**: Node.js 18+ and npm
- **iOS**: Xcode 15+ with iOS 17 SDK
- **Backend**: Supabase CLI (optional, for local development)

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## Web App

### Running the Web App

```bash
cd apps/web
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Building for Production

```bash
cd apps/web
npm run build
npm run preview  # Preview the production build
```

---

## iOS App (BaseballJournal)

### Setup

1. **Create Xcode Project**: Open Xcode and create a new SwiftUI iOS app:
   - Name: `BaseballJournal`
   - Target iOS: 17.0+
   - Save it in `apps/baseballjournal-ios/`

2. **Add Source Files**: Add all existing Swift files from `apps/baseballjournal-ios/` to the project:
   - `Config/` - Configuration files
   - `Models/` - Data models
   - `ViewModels/` - View models
   - `Views/` - SwiftUI views
   - `Services/` - API services

3. **Configure Supabase Credentials**:
   
   a. Copy the secrets template:
   ```bash
   cp apps/baseballjournal-ios/Config/Secrets.xcconfig.example \
      apps/baseballjournal-ios/Config/Secrets.xcconfig
   ```
   
   b. Edit `Secrets.xcconfig` with your real Supabase credentials.
   
   c. In Xcode, go to your target's Build Settings and add `Secrets.xcconfig` to your configurations.
   
   d. Add to Info.plist:
   ```xml
   <key>SUPABASE_URL</key>
   <string>$(SUPABASE_URL)</string>
   <key>SUPABASE_ANON_KEY</key>
   <string>$(SUPABASE_ANON_KEY)</string>
   ```

4. **Add Supabase Swift Package**:
   - File → Add Package Dependencies
   - URL: `https://github.com/supabase/supabase-swift`
   - Add `Supabase` library to your target

### Building

Press `⌘B` to build or `⌘R` to run in the simulator.

---

## Backend

### Supabase

The Supabase configuration is in `backend/supabase/`:

- `schema.sql` - Complete database schema
- `migrations/` - Incremental migrations
- `supabase_rls_policies.sql` - Row-level security policies
- `supabase_triggers_functions.sql` - Database functions and triggers

### Applying Migrations

```bash
cd backend/supabase
supabase db push  # Push schema to remote
# Or apply individual migrations via Supabase dashboard
```

### Firebase (Legacy)

Firebase configuration is preserved in `backend/firebase/` but Supabase is the primary backend.

---

## Development Workflow

### Both Web and iOS Share:
- Same Supabase project and database
- Same authentication system
- Same data models (conceptually)

### Environment Variables

| Variable | Web (Vite) | iOS |
|----------|-----------|-----|
| Supabase URL | `VITE_SUPABASE_URL` | `Secrets.xcconfig` → Info.plist |
| Supabase Key | `VITE_SUPABASE_ANON_KEY` | `Secrets.xcconfig` → Info.plist |

---

## Archived Projects

The `archive/` folder contains legacy projects that are no longer active:

- `ios-app/` - Earlier iOS app attempt
- `DiamondTracker/` - Previous iOS app version
- `scn-swing-log/` - Separate Vite project

These are preserved for reference but not part of active development.
