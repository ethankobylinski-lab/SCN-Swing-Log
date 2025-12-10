import Foundation

/// Supabase configuration that reads from Info.plist
/// Values are injected via Secrets.xcconfig → Build Settings → Info.plist
enum SupabaseConfig {
    static let url: URL = {
        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              !urlString.isEmpty,
              let url = URL(string: urlString) else {
            fatalError("SUPABASE_URL not configured in Info.plist. Please set up Secrets.xcconfig.")
        }
        return url
    }()
    
    static let anonKey: String = {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              !key.isEmpty else {
            fatalError("SUPABASE_ANON_KEY not configured in Info.plist. Please set up Secrets.xcconfig.")
        }
        return key
    }()
}
