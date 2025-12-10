# Supabase Swift SDK API Notes

## Important: API Compatibility

The Supabase Swift SDK API may differ slightly from what's implemented. You may need to adjust the following:

### Query Builder Syntax

The current implementation uses:
```swift
apiClient.supabase
    .from("table")
    .select()
    .eq("column", value: value)
    .execute()
    .value
```

If this doesn't work, try:
```swift
// Alternative syntax
let response = try await apiClient.supabase
    .database
    .from("table")
    .select()
    .eq("column", value: value)
    .execute()
    .value
```

### Authentication

The auth API might be:
```swift
// Current
try await apiClient.supabase.auth.signIn(email: email, password: password)

// Alternative
try await apiClient.supabase.auth.signIn(email: email, password: password, redirectTo: nil)
```

### Session Management

Check the actual Supabase Swift SDK documentation for:
- `auth.session` vs `auth.currentSession`
- Session refresh handling
- Token storage

## Database Schema Mapping

The app expects these table structures (matching the web app):

- `users` - User profiles with role field
- `sessions` - Hitting sessions
- `pitch_sessions` - Pitching sessions  
- `personal_goals` - Player goals
- `team_goals` - Team goals
- `teams` - Team information

All field names use snake_case in the database but camelCase in Swift models (handled by CodingKeys).

## Testing Queries

Test your Supabase connection with a simple query first:

```swift
let response: [User] = try await apiClient.supabase
    .from("users")
    .select()
    .limit(1)
    .execute()
    .value
```

If this works, the connection is good and you can debug individual queries.

