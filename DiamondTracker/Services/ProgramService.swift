import Foundation
import Supabase

class ProgramService {
    static let shared = ProgramService()
    private let apiClient = APIClient.shared
    
    private init() {}
    
    // Note: Programs may be stored differently in your backend
    // This is a placeholder - adjust based on your actual schema
    func getPrograms(teamId: String, playerId: String? = nil) async throws -> [Program] {
        // If programs are stored in a separate table, query it here
        // For now, this is a placeholder that would need to match your schema
        // You might need to query assignments and group them as "programs"
        return []
    }
}

