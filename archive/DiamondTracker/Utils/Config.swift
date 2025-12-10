import Foundation

struct AppConfig {
    static var supabaseURL: String {
        // Replace with your Supabase project URL
        // Example: "https://your-project.supabase.co"
        if let url = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String, !url.isEmpty {
            return url
        }
        return "YOUR_SUPABASE_URL"
    }
    
    static var supabaseAnonKey: String {
        // Replace with your Supabase anon/public key
        if let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String, !key.isEmpty {
            return key
        }
        return "YOUR_SUPABASE_ANON_KEY"
    }
}

