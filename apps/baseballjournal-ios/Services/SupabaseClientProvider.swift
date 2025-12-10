import Foundation
import Supabase

/// Singleton provider for Supabase client access
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


