# Supabase Swift SDK API Compatibility Guide

This document helps troubleshoot Supabase Swift SDK API compatibility issues.

## Current Implementation

The app uses the Supabase Swift SDK with the following patterns:

### Client Initialization

```swift
// Config/SupabaseConfig.swift
enum SupabaseConfig {
    static let url = URL(string: "https://YOUR_PROJECT_ID.supabase.co")!
    static let anonKey = "YOUR_SUPABASE_ANON_KEY"
}

// Services/SupabaseClientProvider.swift
final class SupabaseClientProvider {
    static let shared = SupabaseClientProvider()
    let client: SupabaseClient
    
    private init() {
        client = SupabaseClient(
            supabaseURL: SupabaseConfig.url,
            supabaseKey: SupabaseConfig.anonKey
        )
    }
}
```

### Query Pattern

```swift
let response: [Model] = try await client
    .from("table_name")
    .select()
    .eq("column", value: value)
    .order("column", ascending: false)
    .execute()
    .value
```

### Insert Pattern

```swift
let response: Model = try await client
    .from("table_name")
    .insert(payload)
    .select()
    .single()
    .execute()
    .value
```

### Update Pattern

```swift
let response: Model = try await client
    .from("table_name")
    .update(payload)
    .eq("id", value: id)
    .select()
    .single()
    .execute()
    .value
```

### RPC Pattern

```swift
let response: RPCResponse = try await client
    .rpc("function_name", params: params)
    .execute()
    .value
```

## Common Issues & Fixes

### Issue 1: `.value` doesn't exist

**Symptom**: Compiler error "Value of type 'X' has no member 'value'"

**Fix**: Try one of these alternatives:

```swift
// Option 1: Use .get() instead
let response = try await client
    .from("table")
    .select()
    .execute()
    .get()

// Option 2: Use .data property
let response = try await client
    .from("table")
    .select()
    .execute()
    .data

// Option 3: Direct decoding
let response: [Model] = try await client
    .from("table")
    .select()
    .execute()
    .decode([Model].self)
```

### Issue 2: Insert doesn't accept Codable struct

**Symptom**: Compiler error about insert parameter type

**Fix**: Convert to dictionary first:

```swift
let encoder = JSONEncoder()
let data = try encoder.encode(payload)
let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]

let response: Model = try await client
    .from("table")
    .insert(dict)
    .select()
    .single()
    .execute()
    .value
```

### Issue 3: RPC params format incorrect

**Symptom**: RPC call fails or has wrong parameter format

**Fix**: Try different parameter formats:

```swift
// Option 1: Dictionary
let params: [String: Any] = [
    "p_session_id": sessionId,
    "p_index": index
]
let response = try await client
    .rpc("function_name", params: params)
    .execute()

// Option 2: Codable struct (current implementation)
struct RPCParams: Codable { ... }
let params = RPCParams(...)
let response = try await client
    .rpc("function_name", params: params)
    .execute()
    .value

// Option 3: Named parameters
let response = try await client
    .rpc("function_name")
    .execute(["p_session_id": sessionId, "p_index": index])
```

### Issue 4: Array contains query doesn't work

**Symptom**: `.contains()` method not found or doesn't work

**Fix**: Use alternative syntax:

```swift
// Option 1: Use .cs (contains) operator
let response = try await client
    .from("users")
    .select()
    .cs("team_ids", value: teamId)
    .execute()
    .value

// Option 2: Use .overlaps
let response = try await client
    .from("users")
    .select()
    .overlaps("team_ids", value: [teamId])
    .execute()
    .value

// Option 3: Use PostgREST filter
let response = try await client
    .from("users")
    .select()
    .filter("team_ids", operator: .cs, value: teamId)
    .execute()
    .value
```

### Issue 5: `.in()` query doesn't work

**Symptom**: `.in()` method not found

**Fix**: Use alternative syntax:

```swift
// Option 1: Use .in() with array
let response = try await client
    .from("teams")
    .select()
    .in("id", value: teamIds)  // Note: singular "value"
    .execute()
    .value

// Option 2: Use .in() with values parameter
let response = try await client
    .from("teams")
    .select()
    .in("id", values: teamIds)  // Note: plural "values"
    .execute()
    .value

// Option 3: Use filter
let response = try await client
    .from("teams")
    .select()
    .filter("id", operator: .in, value: teamIds)
    .execute()
    .value
```

### Issue 6: JSONB encoding issues

**Symptom**: Sets or pitchGoals not encoding correctly

**Fix**: The app uses `AnyCodable` helper. If issues persist:

```swift
// Option 1: Encode as JSON string
let setsJson = try JSONEncoder().encode(sets)
let setsString = String(data: setsJson, encoding: .utf8)!

struct Payload: Codable {
    let sets: String  // Store as JSON string
}

// Option 2: Use PostgREST JSON casting
let payload: [String: Any] = [
    "sets": try JSONSerialization.jsonObject(with: setsJson)
]
```

### Issue 7: Auth session check fails

**Symptom**: `auth.session` doesn't exist or returns wrong type

**Fix**: Try alternative auth patterns:

```swift
// Option 1: Use currentSession
let session = try await client.auth.currentSession

// Option 2: Use session property (synchronous)
if let session = client.auth.currentSession {
    // Use session
}

// Option 3: Check user instead
let user = try await client.auth.user
```

## Testing Strategy

1. **Start Simple**: Test a basic query first
   ```swift
   let users: [User] = try await client
       .from("users")
       .select()
       .limit(1)
       .execute()
       .value
   ```

2. **Test Insert**: If query works, test insert
   ```swift
   let test: [String: Any] = ["name": "Test"]
   let result = try await client
       .from("users")
       .insert(test)
       .execute()
   ```

3. **Test RPC**: If insert works, test RPC
   ```swift
   let result = try await client
       .rpc("test_function", params: ["param": "value"])
       .execute()
   ```

## Version-Specific Notes

### Supabase Swift SDK 2.0.0+

- Uses `.execute().value` pattern
- Supports Codable structs directly in insert/update
- RPC uses `params:` parameter

### Supabase Swift SDK 1.x

- May use `.get()` instead of `.value`
- May require dictionary format for insert/update
- RPC syntax may differ

## Getting Help

1. **Check Supabase Swift SDK Docs**: https://github.com/supabase/supabase-swift
2. **Check Supabase Docs**: https://supabase.com/docs
3. **Review SDK Source**: Check the actual SDK implementation
4. **Use Xcode Debugger**: Inspect response types at runtime
5. **Check Supabase Logs**: Review API logs in Supabase dashboard

## Recommended Approach

1. **Verify SDK Version**: Check Package.swift or Package Dependencies
2. **Test Incrementally**: Start with simple queries, build up
3. **Use Type Safety**: Leverage Swift's type system with Codable
4. **Handle Errors**: Wrap all calls in do-catch with meaningful messages
5. **Log Everything**: Use print statements to debug API calls

## Current Status

✅ All services use `SupabaseClientProvider.shared.client`
✅ All queries use `.execute().value` pattern
✅ All inserts/updates use Codable structs
✅ JSONB encoding uses `AnyCodable` helper
✅ RPC calls use structured parameter types

If you encounter issues, adjust based on your actual SDK version.

