# Supabase Swift SDK API Fixes

## Important: API Compatibility Notes

The Supabase Swift SDK API may differ from what's implemented. You'll need to adjust these methods based on the actual SDK version you're using.

### SessionService.createHittingSession

**Current Implementation:**
```swift
let payload: [String: Any] = [...]
let response: Session = try await apiClient.supabase
    .from("sessions")
    .insert(payload)
    .select()
    .single()
    .execute()
    .value
```

**Potential Fixes:**

1. **If `insert` doesn't accept `[String: Any]`:**
   - Convert payload to proper Codable struct
   - Or use `JSONEncoder` to convert to Data first

2. **If `.value` doesn't exist:**
   - Try `.get()` or `.data` instead
   - Check SDK documentation for response handling

3. **If JSON encoding is needed:**
```swift
let encoder = JSONEncoder()
let setsData = try encoder.encode(sets)
let setsJson = try JSONSerialization.jsonObject(with: setsData) as? [[String: Any]]

let payload: [String: Any] = [
    "player_id": playerId,
    "team_id": teamId as Any,
    "drill_id": drillId as Any,
    "name": name,
    "sets": setsJson,  // Use JSON array
    ...
]
```

### SessionService.recordPitch (RPC Call)

**Current Implementation:**
```swift
let result = try await apiClient.supabase
    .rpc("record_pitch_atomic", params: [...])
    .execute()
```

**Potential Fixes:**

1. **If RPC params format is different:**
```swift
// Try this format:
let result = try await apiClient.supabase
    .rpc("record_pitch_atomic")
    .execute(["p_session_id": sessionId, ...])
```

2. **If RPC returns different structure:**
   - Check return type - might need to decode JSON response
   - May need to use `.value` or `.data` to extract result

### Query Builder Methods

**Current:**
```swift
.eq("id", value: id)
.contains("team_ids", value: [teamId])
```

**If these don't work, try:**
```swift
.eq("id", value: id)  // May need different syntax
// Or
.filter("id", operator: .eq, value: id)
```

### Authentication

**Current:**
```swift
try await apiClient.supabase.auth.signIn(email: email, password: password)
```

**If this doesn't work:**
```swift
// May need:
let response = try await apiClient.supabase.auth.signIn(
    email: email,
    password: password
)
// Then extract session from response
```

## Testing Strategy

1. **Start with a simple query:**
```swift
let response: [User] = try await apiClient.supabase
    .from("users")
    .select()
    .limit(1)
    .execute()
    .value
```

2. **If that works, test insert:**
```swift
let testPayload = ["name": "Test", "player_id": "test-id"]
let response = try await apiClient.supabase
    .from("sessions")
    .insert(testPayload)
    .execute()
```

3. **Then test RPC:**
```swift
let result = try await apiClient.supabase
    .rpc("test_function", params: ["param1": "value1"])
    .execute()
```

## Common Issues

1. **Type Mismatches:**
   - Supabase may return snake_case, but models use camelCase
   - Ensure CodingKeys are correct
   - Check that optional types match (String? vs String)

2. **JSON Encoding:**
   - Arrays and nested objects need proper JSON encoding
   - Use `JSONEncoder` for Codable types
   - Use `JSONSerialization` for dictionaries

3. **Error Handling:**
   - Wrap all Supabase calls in do-catch
   - Log errors for debugging
   - Show user-friendly error messages

## Recommended Approach

1. Check Supabase Swift SDK documentation for your version
2. Start with simple queries and build up
3. Test each service method individually
4. Use Xcode's debugger to inspect response types
5. Adjust based on actual SDK behavior

