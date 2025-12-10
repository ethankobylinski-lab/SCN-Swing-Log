import Foundation
import Supabase

class DrillService {
    static let shared = DrillService()
    private let client = SupabaseClientProvider.shared.client
    
    private init() {}
    
    func getDrills(teamId: String) async throws -> [Drill] {
        let response: [Drill] = try await client
            .from("drills")
            .select()
            .eq("team_id", value: teamId)
            .execute()
            .value
        
        return response
    }
    
    func getAssignments(teamId: String, playerId: String? = nil) async throws -> [DrillAssignment] {
        var query = client
            .from("assignments")
            .select()
            .eq("team_id", value: teamId)
        
        if let playerId = playerId {
            // Query assignments where player_ids array contains playerId
            // Note: Supabase array contains syntax may vary - adjust if needed
            query = query.contains("player_ids", value: playerId)
        }
        
        let response: [DrillAssignment] = try await query
            .execute()
            .value
        
        return response
    }
}

