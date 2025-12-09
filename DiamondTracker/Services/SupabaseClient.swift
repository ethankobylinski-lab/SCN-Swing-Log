import Foundation
import Supabase

class APIClient {
    static let shared = APIClient()
    
    let supabase: SupabaseClient
    
    private init() {
        let url = URL(string: AppConfig.supabaseURL)!
        let key = AppConfig.supabaseAnonKey
        
        self.supabase = SupabaseClient(supabaseURL: url, supabaseKey: key)
    }
}

